// Toys Lab API: sits between the app and Salla.
//
//   POST /webhook  Salla sends the store's access key here when the app is installed
//   GET  /catalog  The app reads the product list from here
//   POST /checkout The app sends the cart here and gets a Salla payment page link
//   GET  /checkout/test  Opens a test cart to confirm payments are set up
//   GET  /         Status page (connected? last sync? how many products?)
//
// A timer (see wrangler.toml) refreshes the access key before it expires and
// re-reads the products every few minutes. Products are read in chunks so each
// run stays within Cloudflare's free-plan request limit.

import { createCheckout, findBase, parseItems } from './checkout';
import { AppProduct, indexCategories, mapProduct, tagNewest } from './mapping';
import { Page, refreshTokens, SallaCategory, SallaProduct, sallaGet, Tokens, verifyWebhook } from './salla';

interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Env {
  STORE: KV;
  SALLA_CLIENT_ID: string;
  SALLA_CLIENT_SECRET: string;
  SALLA_WEBHOOK_SECRET: string;
}

type Ctx = { waitUntil(p: Promise<unknown>): void };

type Building = {
  startedAt: number;
  nextPage: number;
  totalPages: number;
  products: AppProduct[];
  categories: [number, { name: string; parent?: string }][];
};

type Catalog = { updatedAt: number; products: AppProduct[] };

const PER_PAGE = 50;
const PAGES_PER_RUN = 30; // timer runs: stays under the free plan's 50 outgoing requests per run
const PAGES_AFTER_INSTALL = 6; // right after installing, Cloudflare allows only ~30 seconds of extra work
const SAVE_EVERY = 3; // save progress every few pages so a cut-off run loses little
const REFRESH_WHEN_LESS_THAN = 3 * 24 * 3600; // renew the key when under 3 days are left

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors, ...extra } });

async function readJSON<T>(kv: KV, key: string): Promise<T | null> {
  const v = await kv.get(key);
  return v ? (JSON.parse(v) as T) : null;
}

async function validTokens(env: Env): Promise<Tokens | null> {
  const tokens = await readJSON<Tokens>(env.STORE, 'tokens');
  if (!tokens) return null;
  const now = Math.floor(Date.now() / 1000);
  if (tokens.expiresAt - now > REFRESH_WHEN_LESS_THAN) return tokens;
  const fresh = await refreshTokens(tokens, env.SALLA_CLIENT_ID, env.SALLA_CLIENT_SECRET);
  await env.STORE.put('tokens', JSON.stringify(fresh));
  return fresh;
}

async function fetchCategories(token: string) {
  const all: SallaCategory[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await sallaGet<Page<SallaCategory>>(`/categories?page=${page}`, token);
    all.push(...(res.data ?? []));
    if (!res.pagination?.totalPages || page >= res.pagination.totalPages) break;
  }
  return indexCategories(all);
}

/** Reads the next chunk of products; publishes the catalog when all pages are in. */
export async function syncStep(env: Env, maxPages = PAGES_PER_RUN): Promise<string> {
  try {
    const result = await runSync(env, maxPages);
    await env.STORE.delete('lastError');
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await env.STORE.put('lastError', JSON.stringify({ at: new Date().toISOString(), message: message.slice(0, 500) }));
    throw e;
  }
}

async function runSync(env: Env, maxPages: number): Promise<string> {
  const tokens = await validTokens(env);
  if (!tokens) return 'not connected';

  let b = await readJSON<Building>(env.STORE, 'building');
  if (!b) {
    const cats = await fetchCategories(tokens.accessToken);
    b = { startedAt: Date.now(), nextPage: 1, totalPages: 1, products: [], categories: [...cats.entries()] };
    await env.STORE.put('building', JSON.stringify(b));
  }
  const cats = new Map(b.categories);

  // Short install-time runs save as they go (they can be cut off); timer runs
  // save once at the end, or straight away if something goes wrong.
  const saveEvery = maxPages <= PAGES_AFTER_INSTALL ? SAVE_EVERY : Infinity;
  try {
    for (let i = 0; i < maxPages && b.nextPage <= b.totalPages; i++) {
      const res = await sallaGet<Page<SallaProduct>>(`/products?page=${b.nextPage}&per_page=${PER_PAGE}`, tokens.accessToken);
      for (const p of res.data ?? []) {
        const m = mapProduct(p, cats);
        if (m) b.products.push(m);
      }
      b.totalPages = res.pagination?.totalPages ?? b.nextPage;
      b.nextPage++;
      if (i % saveEvery === saveEvery - 1 && b.nextPage <= b.totalPages) await env.STORE.put('building', JSON.stringify(b));
    }
  } catch (e) {
    await env.STORE.put('building', JSON.stringify(b));
    throw e;
  }

  if (b.nextPage > b.totalPages) {
    const products = tagNewest(b.products.filter((p) => p.stock !== 0));
    const catalog: Catalog = { updatedAt: Date.now(), products };
    await env.STORE.put('catalog', JSON.stringify(catalog));
    await env.STORE.delete('building');
    return `published ${products.length} products`;
  }
  await env.STORE.put('building', JSON.stringify(b));
  return `read ${b.nextPage - 1} of ${b.totalPages} pages`;
}

async function handleWebhook(req: Request, env: Env, ctx: Ctx) {
  const raw = await req.text();
  if (!(await verifyWebhook(req.headers, raw, env.SALLA_WEBHOOK_SECRET))) return json({ error: 'Invalid signature' }, 401);

  let event: { event?: string; merchant?: number | string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (event.event === 'app.store.authorize' && event.data) {
    const d = event.data as { access_token: string; refresh_token: string; expires?: number; expires_in?: number };
    const now = Math.floor(Date.now() / 1000);
    const expires = Number(d.expires ?? 0);
    const tokens: Tokens = {
      accessToken: d.access_token,
      refreshToken: d.refresh_token,
      // `expires` is a timestamp; fall back to a 14-day lifetime if it isn't
      expiresAt: expires > 1e9 ? expires : now + (Number(d.expires_in) || expires || 14 * 24 * 3600),
      merchant: event.merchant,
      updatedAt: now,
    };
    await env.STORE.put('tokens', JSON.stringify(tokens));
    await env.STORE.delete('building');
    ctx.waitUntil(syncStep(env, PAGES_AFTER_INSTALL).catch((e) => console.error('First sync failed', e)));
  } else if (event.event === 'app.uninstalled') {
    await env.STORE.delete('tokens');
    await env.STORE.delete('building');
  }
  return json({ ok: true });
}

/** The store's Salla id, needed by the checkout service. */
async function storeId(env: Env): Promise<string | null> {
  const tokens = await readJSON<Tokens>(env.STORE, 'tokens');
  if (!tokens) return null;
  if (tokens.merchant) return String(tokens.merchant);
  const fresh = await validTokens(env);
  if (!fresh) return null;
  const info = await sallaGet<{ data?: { id?: number } }>('/store/info', fresh.accessToken);
  if (!info.data?.id) return null;
  await env.STORE.put('tokens', JSON.stringify({ ...fresh, merchant: info.data.id }));
  return String(info.data.id);
}

async function handleCheckout(req: Request, env: Env) {
  const id = await storeId(env);
  if (!id) return json({ error: 'Store not connected yet' }, 503);
  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const items = parseItems(body);
  if (!items) return json({ error: 'Send 1 to 25 items as { id, quantity }' }, 400);
  const noteRaw = (body as { note?: unknown }).note;
  const note = typeof noteRaw === 'string' && noteRaw.trim() ? noteRaw.trim().slice(0, 300) : undefined;

  const tokenRaw = (body as { customerToken?: unknown }).customerToken;
  const customerToken = typeof tokenRaw === 'string' && tokenRaw.length > 20 && tokenRaw.length < 4000 ? tokenRaw : undefined;

  const known = await env.STORE.get('checkoutBase');
  const result = await createCheckout(id, items, note, known, customerToken);
  if (result.base && result.base !== known) await env.STORE.put('checkoutBase', result.base);
  if (!result.ok) {
    await env.STORE.put('lastCheckoutError', JSON.stringify({ at: new Date().toISOString(), ...result }));
    return json({ error: result.error }, 502);
  }
  if (result.assignError) await env.STORE.put('lastAssignError', JSON.stringify({ at: new Date().toISOString(), error: result.assignError }));
  return json({ checkoutUrl: result.checkoutUrl, skipped: result.failed.map((f) => f.id), linkedToCustomer: result.assigned });
}

async function handleCheckoutTest(env: Env) {
  const id = await storeId(env);
  if (!id) return json({ ok: false, error: 'Store not connected yet' });
  const catalog = await readJSON<Catalog>(env.STORE, 'catalog');
  const sample = catalog?.products.find((p) => /^\d+$/.test(p.id));
  const base = await findBase(id, await env.STORE.get('checkoutBase'));
  if (!base.base) {
    const lastCheckoutError = await readJSON(env.STORE, 'lastCheckoutError');
    return json({ ok: false, storeId: id, error: 'No checkout address worked', tried: base.tried, lastCheckoutError });
  }
  await env.STORE.put('checkoutBase', base.base);
  if (!sample) return json({ ok: true, storeId: id, base: base.base, note: 'Cart works; no products yet to test adding' });
  const result = await createCheckout(id, [{ id: sample.id, quantity: 1 }], undefined, base.base);
  return json({ storeId: id, testProduct: sample.name, ...result });
}

export default {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    if (url.pathname === '/webhook' && req.method === 'POST') return handleWebhook(req, env, ctx);
    if (url.pathname === '/checkout' && req.method === 'POST') return handleCheckout(req, env);
    if (url.pathname === '/checkout/test' && req.method === 'GET') return handleCheckoutTest(env);

    if (url.pathname === '/catalog' && req.method === 'GET') {
      const catalog = await env.STORE.get('catalog');
      if (!catalog) return json({ products: [], updatedAt: null, message: 'Store not connected yet' }, 200, { 'Cache-Control': 'no-store' });
      return new Response(catalog, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=120', ...cors } });
    }

    if (url.pathname === '/' && req.method === 'GET') {
      const [tokens, catalog, building, lastError, lastAssignError] = await Promise.all([
        readJSON<Tokens>(env.STORE, 'tokens'),
        readJSON<Catalog>(env.STORE, 'catalog'),
        readJSON<Building>(env.STORE, 'building'),
        readJSON<{ at: string; message: string }>(env.STORE, 'lastError'),
        readJSON<{ at: string; error: string }>(env.STORE, 'lastAssignError'),
      ]);
      return json({
        service: 'Toys Lab API',
        connectedToSalla: !!tokens,
        keyExpires: tokens ? new Date(tokens.expiresAt * 1000).toISOString() : null,
        products: catalog?.products.length ?? 0,
        lastSync: catalog ? new Date(catalog.updatedAt).toISOString() : null,
        syncing: building ? `${building.nextPage - 1} of ${building.totalPages} pages, ${building.products.length} products so far` : null,
        lastError,
        lastCheckoutLinkError: lastAssignError,
      });
    }

    return json({ error: 'Not found' }, 404);
  },

  async scheduled(_event: unknown, env: Env, ctx: Ctx) {
    ctx.waitUntil(syncStep(env).then((r) => console.log('Sync:', r)).catch((e) => console.error('Sync failed', e)));
  },
};

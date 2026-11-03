// Toys Lab API: sits between the app and Salla.
//
//   POST /webhook  Salla sends the store's access key here when the app is installed
//   GET  /catalog  The app reads the product list from here
//   GET  /         Status page (connected? last sync? how many products?)
//
// A timer (see wrangler.toml) refreshes the access key before it expires and
// re-reads the products every few minutes. Products are read in chunks so each
// run stays within Cloudflare's free-plan request limit.

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
const PAGES_PER_RUN = 30; // stays under the free plan's 50 outgoing requests per run
const REFRESH_WHEN_LESS_THAN = 3 * 24 * 3600; // renew the key when under 3 days are left

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
export async function syncStep(env: Env): Promise<string> {
  const tokens = await validTokens(env);
  if (!tokens) return 'not connected';

  let b = await readJSON<Building>(env.STORE, 'building');
  if (!b) {
    const cats = await fetchCategories(tokens.accessToken);
    b = { startedAt: Date.now(), nextPage: 1, totalPages: 1, products: [], categories: [...cats.entries()] };
  }
  const cats = new Map(b.categories);

  for (let i = 0; i < PAGES_PER_RUN && b.nextPage <= b.totalPages; i++) {
    const res = await sallaGet<Page<SallaProduct>>(`/products?page=${b.nextPage}&per_page=${PER_PAGE}`, tokens.accessToken);
    for (const p of res.data ?? []) {
      const m = mapProduct(p, cats);
      if (m) b.products.push(m);
    }
    b.totalPages = res.pagination?.totalPages ?? b.nextPage;
    b.nextPage++;
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
    ctx.waitUntil(syncStep(env).catch((e) => console.error('First sync failed', e)));
  } else if (event.event === 'app.uninstalled') {
    await env.STORE.delete('tokens');
    await env.STORE.delete('building');
  }
  return json({ ok: true });
}

export default {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    if (url.pathname === '/webhook' && req.method === 'POST') return handleWebhook(req, env, ctx);

    if (url.pathname === '/catalog' && req.method === 'GET') {
      const catalog = await env.STORE.get('catalog');
      if (!catalog) return json({ products: [], updatedAt: null, message: 'Store not connected yet' }, 200, { 'Cache-Control': 'no-store' });
      return new Response(catalog, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=120', ...cors } });
    }

    if (url.pathname === '/' && req.method === 'GET') {
      const [tokens, catalog, building] = await Promise.all([
        readJSON<Tokens>(env.STORE, 'tokens'),
        readJSON<Catalog>(env.STORE, 'catalog'),
        readJSON<Building>(env.STORE, 'building'),
      ]);
      return json({
        service: 'Toys Lab API',
        connectedToSalla: !!tokens,
        keyExpires: tokens ? new Date(tokens.expiresAt * 1000).toISOString() : null,
        products: catalog?.products.length ?? 0,
        lastSync: catalog ? new Date(catalog.updatedAt).toISOString() : null,
        syncing: building ? `${building.nextPage - 1} of ${building.totalPages} pages` : null,
      });
    }

    return json({ error: 'Not found' }, 404);
  },

  async scheduled(_event: unknown, env: Env, ctx: Ctx) {
    ctx.waitUntil(syncStep(env).then((r) => console.log('Sync:', r)).catch((e) => console.error('Sync failed', e)));
  },
};

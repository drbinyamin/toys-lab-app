// End-to-end check with a fake Salla and in-memory storage:
// webhook verification, connecting, reading products in chunks, and the catalog.
import worker, { Env } from '../src/index';
import { verifyWebhook } from '../src/salla';

let failures = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) { failures++; if (detail !== undefined) console.log('      ', detail); }
};

const mem = new Map<string, string>();
const env: Env = {
  STORE: {
    get: async (k) => mem.get(k) ?? null,
    put: async (k, v) => { mem.set(k, v); },
    delete: async (k) => { mem.delete(k); },
  },
  SALLA_CLIENT_ID: 'cid',
  SALLA_CLIENT_SECRET: 'csecret',
  SALLA_WEBHOOK_SECRET: 'whsecret',
};
const pending: Promise<unknown>[] = [];
const ctx = { waitUntil: (p: Promise<unknown>) => { pending.push(p); } };

// ---- Fake Salla: 3 pages of 50 products, 2 categories with sub-categories ----
const TOTAL = 130;
const product = (i: number) => ({
  id: 1000 + i,
  name: `لعبة ${i}`,
  price: { amount: 100 + i, currency: 'SAR' },
  regular_price: { amount: 100 + i, currency: 'SAR' },
  sale_price: { amount: i % 10 === 0 ? 80 : 0, currency: 'SAR' },
  quantity: i % 25 === 0 ? 0 : 5,
  unlimited_quantity: false,
  status: i === 3 ? 'hidden' : 'sale',
  is_available: true,
  main_image: `https://cdn.salla.sa/p${i}.jpg`,
  urls: { customer: `https://toys-lab.com/p${i}` },
  categories: i % 2 ? [{ id: 11 }, { id: 21 }] : [{ id: 12 }, { id: 22 }],
  brand: i % 3 ? { name: 'LEGO' } : null,
});
const categories = [
  { id: 1, name: 'ألعاب اولاد', sub_categories: [{ id: 11, name: 'مركبات' }] },
  { id: 2, name: 'ألعاب بنات', sub_categories: [{ id: 12, name: 'عرايس' }] },
  { id: 3, name: 'حسب العمر', sub_categories: [{ id: 21, name: '6+' }, { id: 22, name: '0 - 2' }] },
];
let productCalls = 0;
let refreshCalls = 0;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  const auth = new Headers(init?.headers).get('authorization');
  if (url.hostname === 'accounts.salla.sa') {
    refreshCalls++;
    const body = new URLSearchParams(String(init?.body));
    if (body.get('refresh_token') !== 'refresh-1' || body.get('client_secret') !== 'csecret') return new Response('bad', { status: 400 });
    return Response.json({ access_token: 'access-2', refresh_token: 'refresh-2', expires_in: 1209600 });
  }
  if (!auth?.startsWith('Bearer access-')) return new Response('unauthorized', { status: 401 });
  if (url.pathname.endsWith('/categories')) return Response.json({ data: categories, pagination: { currentPage: 1, totalPages: 1 } });
  if (url.pathname.endsWith('/products')) {
    productCalls++;
    const page = Number(url.searchParams.get('page'));
    const per = Number(url.searchParams.get('per_page'));
    const items = Array.from({ length: TOTAL }, (_, i) => product(i + 1)).slice((page - 1) * per, page * per);
    return Response.json({ data: items, pagination: { currentPage: page, totalPages: Math.ceil(TOTAL / per) } });
  }
  return new Response('not found', { status: 404 });
}) as typeof fetch;

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))).toString('hex');
}
const req = (path: string, init?: RequestInit) => worker.fetch(new Request(`https://api.test${path}`, init), env, ctx);

// ---- Webhook verification ----
const body = JSON.stringify({ event: 'app.store.authorize', merchant: 42, data: { access_token: 'access-1', refresh_token: 'refresh-1', expires: Math.floor(Date.now() / 1000) + 3600, scope: 'products.read', token_type: 'bearer' } });
check('Signature strategy accepted', await verifyWebhook(new Headers({ 'x-salla-signature': await hmac('whsecret', body) }), body, 'whsecret'));
check('Token strategy accepted', await verifyWebhook(new Headers({ authorization: 'whsecret' }), body, 'whsecret'));
check('Wrong signature rejected', !(await verifyWebhook(new Headers({ 'x-salla-signature': await hmac('nope', body) }), body, 'whsecret')));
check('Missing signature rejected', !(await verifyWebhook(new Headers(), body, 'whsecret')));
check('Unsigned webhook returns 401', (await req('/webhook', { method: 'POST', body })).status === 401);

// ---- Before connecting ----
const empty = await (await req('/catalog')).json() as { products: unknown[] };
check('Catalog is empty before connecting', empty.products.length === 0);

// ---- Connect (Salla sends the key; it expires within 3 days, so it must be refreshed) ----
const res = await req('/webhook', { method: 'POST', body, headers: { 'x-salla-signature': await hmac('whsecret', body), 'x-salla-security-strategy': 'Signature' } });
check('Signed authorize webhook accepted', res.status === 200);
await Promise.all(pending);
const tokens = JSON.parse(mem.get('tokens')!);
check('Key renewed because it was close to expiry', refreshCalls === 1 && tokens.accessToken === 'access-2' && tokens.refreshToken === 'refresh-2');

// ---- Sync in chunks: 3 pages per run budget would be 30, so one run should finish 3 pages ----
const status1 = await (await req('/')).json() as { products: number; connectedToSalla: boolean };
check('Status shows connected', status1.connectedToSalla === true);
const catalog = await (await req('/catalog')).json() as { products: { id: string; category: string; age: string; price: number; oldPrice?: number; image?: string; stock?: number; tag?: string; forWho?: string; brand?: string; url?: string }[] };
const ps = catalog.products;
check('Catalog published after first sync', ps.length > 0, ps.length);
check('Hidden and sold-out products left out', !ps.some((p) => p.id === '1003') && !ps.some((p) => p.id === '1025' || p.id === '1050'));
check('All 3 pages read', ps.some((p) => p.id === '1130') && productCalls === 3, productCalls);
const statusOk = await (await req('/')).json() as { lastError: unknown };
check('No error shown after a good sync', statusOk.lastError === null);
const p10 = ps.find((p) => p.id === '1010')!;
check('Sale price mapped', p10.price === 80 && p10.oldPrice === 110, p10);
const p1 = ps.find((p) => p.id === '1001')!;
check('Sub-category mapped to app category and age', p1.category === 'boys' && p1.age === '6+' && p1.forWho === 'b', p1);
const p2 = ps.find((p) => p.id === '1002')!;
check('Girls category and 0-2 age mapped', p2.category === 'girls' && p2.age === '0 - 2', p2);
check('Image, link and brand kept', p1.image === 'https://cdn.salla.sa/p1.jpg' && p1.url === 'https://toys-lab.com/p1' && p1.brand === 'LEGO', p1);
check('12 newest marked as new arrivals', ps.filter((p) => p.tag === 'new').length === 12 && ps.find((p) => p.id === '1130')?.tag === 'new');

// ---- Chunking: with many pages, a run stops at the limit and the next run continues ----
mem.delete('catalog');
productCalls = 0;
const big = 2500;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  if (url.pathname.endsWith('/products')) {
    productCalls++;
    const page = Number(url.searchParams.get('page'));
    return Response.json({ data: [product(page)], pagination: { currentPage: page, totalPages: Math.ceil(big / 50) } });
  }
  return realFetch(input, init);
}) as typeof fetch;
// A fresh install only gets a few pages done; the timer continues from there.
const body2 = JSON.stringify({ event: 'app.store.authorize', merchant: 42, data: { access_token: 'access-9', refresh_token: 'refresh-9', expires: Math.floor(Date.now() / 1000) + 14 * 86400 } });
await req('/webhook', { method: 'POST', body: body2, headers: { authorization: 'whsecret' } });
await Promise.all(pending);
check('Install run reads only 6 pages and saves progress', productCalls === 6 && JSON.parse(mem.get('building')!).nextPage === 7, productCalls);
const st = await (await req('/')).json() as { syncing: string | null };
check('Status shows progress', st.syncing?.startsWith('6 of 50 pages') === true, st.syncing);
await worker.scheduled({}, env, ctx); await Promise.all(pending);
check('Timer run continues to page 36', productCalls === 36 && !mem.has('catalog'), productCalls);
await worker.scheduled({}, env, ctx); await Promise.all(pending);
check('Next timer run finishes and publishes', productCalls === 50 && mem.has('catalog') && !mem.has('building'), productCalls);

// An error from Salla is shown on the status page, and progress so far is kept
mem.delete('catalog');
let calls = 0;
const okFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  if (url.pathname.endsWith('/products') && ++calls === 5) return new Response('{"error":"rate limited"}', { status: 429 });
  return okFetch(input, init);
}) as typeof fetch;
await worker.scheduled({}, env, ctx); await Promise.all(pending);
const errStatus = await (await req('/')).json() as { lastError: { message: string } | null; syncing: string | null };
check('Error shown on status page', !!errStatus.lastError && errStatus.lastError.message.includes('429'), errStatus);
check('Pages read before the error are kept', JSON.parse(mem.get('building')!).nextPage === 5, mem.get('building')?.slice(0, 80));
globalThis.fetch = okFetch;
await worker.scheduled({}, env, ctx); await Promise.all(pending);
const fixed = await (await req('/')).json() as { lastError: unknown };
check('Error clears after a good run', fixed.lastError === null);

// ---- Checkout: cart on the store's Salla checkout ----
const carts = new Map<string, { items: { identifier: string; quantity: number; notes?: string }[]; store: string }>();
let checkoutCalls: string[] = [];
const beforeCheckout = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  if (url.pathname.includes('/checkout')) {
    checkoutCalls.push(url.pathname);
    const h = new Headers(init?.headers);
    if (url.pathname.startsWith('/store/v2/')) return new Response('{"error":"not found"}', { status: 404 });
    if (!h.get('store-identifier') || h.get('s-source') !== 'app') return new Response('{"error":"missing headers"}', { status: 400 });
    if (url.pathname === '/v2/checkout/generate') {
      const id = `cart${carts.size + 1}`;
      carts.set(id, { items: [], store: h.get('store-identifier')! });
      return Response.json({ data: { id, checkout_url: `https://toys-lab.com/checkout/${id}` } });
    }
    const m = url.pathname.match(/^\/v2\/checkout\/([^/]+)\/items$/);
    if (m && carts.has(m[1])) {
      const item = JSON.parse(String(init?.body));
      // Like the live store: identifier must be text
      if (typeof item.identifier !== 'string') return new Response('{"error":{"fields":{"identifier":["identifier field must be text."]}}}', { status: 422 });
      if (item.identifier === '9999') return new Response('{"error":"product not found"}', { status: 404 });
      carts.get(m[1])!.items.push(item);
      return Response.json({ data: { id: m[1], checkout_url: `https://toys-lab.com/checkout/${m[1]}` } });
    }
    return new Response('{"error":"not found"}', { status: 404 });
  }
  return beforeCheckout(input, init);
}) as typeof fetch;

const co = await req('/checkout', { method: 'POST', body: JSON.stringify({ items: [{ id: '1001', quantity: 2 }, { id: '1002', quantity: 1 }], note: 'كل عام وأنت بخير' }) });
const coBody = await co.json() as { checkoutUrl?: string; skipped?: string[] };
check('Checkout returns a Salla payment link', co.status === 200 && coBody.checkoutUrl === 'https://toys-lab.com/checkout/cart1', coBody);
const cart1 = carts.get('cart1')!;
check('Cart made on the right store with both items', cart1.store === '42' && cart1.items.length === 2 && cart1.items[0].identifier === '1001' && cart1.items[0].quantity === 2, cart1);
check('Gift message sent as a note on the first item only', cart1.items[0].notes === 'كل عام وأنت بخير' && !cart1.items[1].notes);
check('Working checkout address remembered', mem.get('checkoutBase') === 'https://api.salla.dev/v2/checkout');
checkoutCalls = [];
await req('/checkout', { method: 'POST', body: JSON.stringify({ items: [{ id: '1001', quantity: 1 }] }) });
check('Second checkout goes straight to the remembered address', checkoutCalls[0] === '/v2/checkout/generate', checkoutCalls);
const partial = await (await req('/checkout', { method: 'POST', body: JSON.stringify({ items: [{ id: '1001', quantity: 1 }, { id: '9999', quantity: 1 }] }) })).json() as { checkoutUrl?: string; skipped?: string[] };
check('Unavailable item skipped, rest still paid', !!partial.checkoutUrl && partial.skipped?.[0] === '9999', partial);
check('Bad cart rejected', (await req('/checkout', { method: 'POST', body: JSON.stringify({ items: [{ id: 'gc-100', quantity: 1 }] }) })).status === 400);
check('Empty cart rejected', (await req('/checkout', { method: 'POST', body: JSON.stringify({ items: [] }) })).status === 400);
mem.set('catalog', JSON.stringify({ updatedAt: Date.now(), products: [{ id: '1001', name: 'لعبة 1', category: 'boys', age: '6+', price: 101 }] }));
const test = await (await req('/checkout/test')).json() as { ok: boolean; checkoutUrl?: string };
check('Test page confirms checkout works', test.ok === true && !!test.checkoutUrl, test);
const { arabic } = await import('../src/checkout');
check('Checkout link switched to Arabic', arabic('https://toys-lab.com/en/checkout/abc?lang=en&') === 'https://toys-lab.com/ar/checkout/abc?lang=ar&', arabic('https://toys-lab.com/en/checkout/abc?lang=en&'));
globalThis.fetch = beforeCheckout;

// ---- Uninstall clears the key ----
const bye = JSON.stringify({ event: 'app.uninstalled', merchant: 42, data: {} });
await req('/webhook', { method: 'POST', body: bye, headers: { authorization: 'Bearer whsecret' } });
check('Uninstall removes the key', !mem.has('tokens'));
check('Checkout refuses when not connected', (await req('/checkout', { method: 'POST', body: JSON.stringify({ items: [{ id: '1001', quantity: 1 }] }) })).status === 503);

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);

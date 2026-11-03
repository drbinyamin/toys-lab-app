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

// ---- Uninstall clears the key ----
const bye = JSON.stringify({ event: 'app.uninstalled', merchant: 42, data: {} });
await req('/webhook', { method: 'POST', body: bye, headers: { authorization: 'Bearer whsecret' } });
check('Uninstall removes the key', !mem.has('tokens'));

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);

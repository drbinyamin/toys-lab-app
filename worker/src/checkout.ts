// Paying through the store's own Salla checkout.
//
// Uses Salla's Checkout APIs (built for mobile apps and headless stores):
//   POST {base}/generate          -> new guest cart, returns { id, checkout_url }
//   POST {base}/{cart}/items      -> add one item (identifier_type, identifier, quantity, notes)
// The customer then opens checkout_url and pays on Salla's page with whatever
// methods the store has turned on (Mada, cards, Apple Pay, Tabby/Tamara...).
// The order lands in the store's Salla dashboard like any website order.
//
// Salla's docs give the paths relative to a "v2 checkout" base without naming
// the host, so we try the likely addresses once and remember the one that works.

export const CHECKOUT_BASES = [
  'https://api.salla.dev/store/v2/checkout',
  'https://api.salla.dev/v2/checkout',
  'https://api.salla.dev/store/v1/v2/checkout',
];

export type CheckoutItem = { id: string; quantity: number };

type CartResponse = { id?: string | number; checkout_url?: string; urls?: { checkout?: string } };

function headers(storeId: string) {
  return {
    'Store-Identifier': storeId,
    's-source': 'app',
    's-app-name': 'ToysLabApp',
    's-app-version': '1.0.0',
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

function unwrap(body: unknown): CartResponse {
  const b = body as { data?: CartResponse } & CartResponse;
  return (b && typeof b === 'object' && b.data && typeof b.data === 'object' ? b.data : b) ?? {};
}

/** Salla returns the checkout in English; customers here should get Arabic. */
export function arabic(url: string | undefined) {
  if (!url) return url;
  return url.replace(/\/en\/checkout\//, '/ar/checkout/').replace(/([?&])lang=en(?=&|$)/, '$1lang=ar');
}

const checkoutUrlOf = (c: CartResponse) => arabic(c.checkout_url || c.urls?.checkout);

async function post(url: string, storeId: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: headers(storeId), body: JSON.stringify(body) });
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, ok: res.ok, body: parsed, text: text.slice(0, 300) };
}

/** Finds which checkout address works for this store (tries each, first success wins). */
export async function findBase(storeId: string, known?: string | null) {
  const order = known ? [known, ...CHECKOUT_BASES.filter((b) => b !== known)] : CHECKOUT_BASES;
  const tried: { base: string; status: number; detail: string }[] = [];
  for (const base of order) {
    const r = await post(`${base}/generate`, storeId, {});
    const cart = unwrap(r.body);
    if (r.ok && cart.id) return { base, cart, tried };
    tried.push({ base, status: r.status, detail: r.text });
  }
  return { base: null, cart: null, tried };
}

export async function createCheckout(storeId: string, items: CheckoutItem[], note: string | undefined, knownBase?: string | null) {
  const found = await findBase(storeId, knownBase);
  if (!found.base || !found.cart?.id) {
    return { ok: false as const, error: 'Could not start a Salla cart', tried: found.tried };
  }
  const { base } = found;
  let cart = found.cart;
  const failed: { id: string; status: number; detail: string }[] = [];

  for (const [i, item] of items.entries()) {
    const r = await post(`${base}/${cart.id}/items`, storeId, {
      identifier_type: 'id',
      identifier: item.id, // Salla requires text here
      quantity: item.quantity,
      ...(i === 0 && note ? { notes: note } : {}),
    });
    if (r.ok) {
      const next = unwrap(r.body);
      if (next.id) cart = { ...cart, ...next };
    } else {
      failed.push({ id: item.id, status: r.status, detail: r.text });
    }
  }

  const url = checkoutUrlOf(cart);
  if (!url) return { ok: false as const, error: 'Salla did not return a checkout link', base, failed };
  if (failed.length === items.length) return { ok: false as const, error: 'No items could be added', base, failed };
  return { ok: true as const, checkoutUrl: url, base, failed };
}

/** Checks the request from the app: real product ids, sensible quantities. */
export function parseItems(body: unknown): CheckoutItem[] | null {
  const raw = (body as { items?: unknown })?.items;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 25) return null;
  const items: CheckoutItem[] = [];
  for (const it of raw) {
    const id = String((it as { id?: unknown }).id ?? '');
    const quantity = Math.floor(Number((it as { quantity?: unknown }).quantity));
    if (!/^\d{1,15}$/.test(id) || !(quantity >= 1 && quantity <= 20)) return null;
    items.push({ id, quantity });
  }
  return items;
}

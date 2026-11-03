import { STORE } from '../data/catalog';

/**
 * Pay on the store's own Salla checkout page.
 *
 * Our server (worker/) makes a cart on the Toys Lab Salla store with these
 * items (linked to the customer when they're logged in) and returns the
 * checkout link. The app shows it in StoreWebView; the customer pays with the
 * methods the store has turned on (Mada, cards, Apple Pay, instalments...), and
 * the order appears in the store's Salla dashboard like any website order.
 */
export type CheckoutLink = { ok: true; url: string; skipped: string[] } | { ok: false; message: string };

export async function getCheckoutLink(items: { id: string; quantity: number }[], note?: string, customerToken?: string): Promise<CheckoutLink> {
  if (!STORE.catalogUrl) return { ok: false, message: 'الدفع غير متاح حالياً' };
  try {
    const res = await fetch(`${STORE.catalogUrl}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, note, customerToken }),
    });
    const data = (await res.json()) as { checkoutUrl?: string; skipped?: string[] };
    if (!res.ok || !data.checkoutUrl) return { ok: false, message: 'ما قدرنا نفتح صفحة الدفع. جرّب مرة ثانية أو اطلب بالواتساب.' };
    return { ok: true, url: data.checkoutUrl, skipped: data.skipped ?? [] };
  } catch {
    return { ok: false, message: 'تأكد من اتصالك بالإنترنت وجرّب مرة ثانية.' };
  }
}

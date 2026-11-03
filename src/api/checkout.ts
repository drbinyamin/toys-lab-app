import * as WebBrowser from 'expo-web-browser';
import { STORE } from '../data/catalog';

/**
 * Pay on the store's own Salla checkout page.
 *
 * Our server (worker/) makes a cart on the Toys Lab Salla store with these
 * items and returns the checkout link. The customer pays there with the methods
 * the store has turned on (Mada, cards, Apple Pay, instalments...), and the
 * order appears in the store's Salla dashboard like any website order.
 */
export type CheckoutResult = { ok: true; skipped: string[]; closed: boolean } | { ok: false; message: string };

export async function payOnStore(items: { id: string; quantity: number }[], note?: string): Promise<CheckoutResult> {
  if (!STORE.catalogUrl) return { ok: false, message: 'الدفع غير متاح حالياً' };
  try {
    const res = await fetch(`${STORE.catalogUrl}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, note }),
    });
    const data = (await res.json()) as { checkoutUrl?: string; skipped?: string[]; error?: string };
    if (!res.ok || !data.checkoutUrl) return { ok: false, message: 'ما قدرنا نفتح صفحة الدفع. جرّب مرة ثانية أو اطلب بالواتساب.' };
    const result = await WebBrowser.openBrowserAsync(data.checkoutUrl, {
      controlsColor: '#074680',
      toolbarColor: '#FFC928',
      dismissButtonStyle: 'close',
    });
    return { ok: true, skipped: data.skipped ?? [], closed: result.type !== 'opened' };
  } catch {
    return { ok: false, message: 'تأكد من اتصالك بالإنترنت وجرّب مرة ثانية.' };
  }
}

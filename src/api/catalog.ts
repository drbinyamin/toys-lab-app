import { Product, SAMPLE_PRODUCTS, STORE } from '../data/catalog';

/**
 * Where products come from.
 *
 * The Salla API needs a secret key, which must never ship inside the app.
 * So the app reads from our store-connection server (worker/), which talks to
 * Salla and returns:
 *
 *   { "products": Product[] }   // see the Product type in src/data/catalog.ts
 *
 * Until STORE.catalogUrl (or EXPO_PUBLIC_CATALOG_URL) is set and the store is
 * connected, the app shows the sample products.
 */
const CATALOG_URL = process.env.EXPO_PUBLIC_CATALOG_URL || (STORE.catalogUrl ? `${STORE.catalogUrl}/catalog` : '');

export type CatalogResult = { products: Product[]; isSample: boolean };

export async function loadCatalog(): Promise<CatalogResult> {
  if (!CATALOG_URL) return { products: SAMPLE_PRODUCTS, isSample: true };
  try {
    const res = await fetch(CATALOG_URL);
    if (!res.ok) throw new Error(`Catalog request failed: ${res.status}`);
    const data = (await res.json()) as { products?: Product[] };
    const products = (data.products ?? []).filter((p) => p.stock === undefined || p.stock > 0);
    if (!products.length) throw new Error('Catalog is empty');
    return { products, isSample: false };
  } catch (e) {
    console.warn('Falling back to sample products:', e);
    return { products: SAMPLE_PRODUCTS, isSample: true };
  }
}

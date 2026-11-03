// Talking to Salla: tokens, webhook verification, and reading products/categories.

export const SALLA_API = 'https://api.salla.dev/admin/v2';
export const SALLA_TOKEN_URL = 'https://accounts.salla.sa/oauth2/token';

export type Tokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix seconds
  merchant?: number | string;
  updatedAt: number;
};

/** Constant-time string comparison. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Salla signs webhooks with either strategy chosen in the Partners portal:
 * - Signature: X-Salla-Signature = HMAC-SHA256(raw body, webhook secret), hex
 * - Token: the webhook secret is sent in the Authorization header
 */
export async function verifyWebhook(headers: Headers, rawBody: string, secret: string): Promise<boolean> {
  if (!secret) return false;
  const signature = headers.get('x-salla-signature')?.trim().toLowerCase();
  if (signature && signature.length === 64) {
    if (safeEqual(signature, await hmacHex(secret, rawBody))) return true;
  }
  const auth = headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (auth && safeEqual(auth, secret)) return true;
  if (signature && safeEqual(signature, secret)) return true; // some setups send the token here
  return false;
}

export async function refreshTokens(tokens: Tokens, clientId: string, clientSecret: string): Promise<Tokens> {
  const res = await fetch(SALLA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  const t = (await res.json()) as { access_token: string; refresh_token: string; expires_in?: number; expires?: number };
  const now = Math.floor(Date.now() / 1000);
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token ?? tokens.refreshToken,
    expiresAt: t.expires ?? now + (t.expires_in ?? 14 * 24 * 3600),
    merchant: tokens.merchant,
    updatedAt: now,
  };
}

export async function sallaGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${SALLA_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Salla ${path} failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

// ---- Shapes we read from Salla (only the fields we use) ----

export type SallaMoney = { amount?: number | string; currency?: string } | number | string | null | undefined;

export type SallaCategory = { id: number; name: string; parent_id?: number | null; sub_categories?: SallaCategory[]; items?: SallaCategory[] };

export type SallaProduct = {
  id: number;
  name: string;
  price?: SallaMoney;
  sale_price?: SallaMoney;
  regular_price?: SallaMoney;
  quantity?: number | null;
  unlimited_quantity?: boolean;
  status?: string; // sale | out | hidden
  is_available?: boolean;
  main_image?: string | null;
  thumbnail?: string | null;
  images?: { url: string; main?: boolean }[];
  url?: string;
  urls?: { customer?: string };
  categories?: { id: number; name?: string }[];
  brand?: { id?: number; name?: string } | null;
};

export type Page<T> = { data: T[]; pagination?: { currentPage?: number; totalPages?: number } };

export function amount(m: SallaMoney): number {
  if (m == null) return 0;
  if (typeof m === 'number') return m;
  if (typeof m === 'string') return Number(m) || 0;
  return Number(m.amount) || 0;
}

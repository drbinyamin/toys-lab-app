// Customer-side Salla calls (the same storefront API Salla's own store pages use).
// No secrets here: the store id is public, and the customer's own login key
// is kept on their phone in secure storage.

import { STORE } from '../data/catalog';

const BASE = 'https://api.salla.dev/store/v1';

export class SallaError extends Error {
  constructor(message: string, public status: number, public fields?: Record<string, string[]>) {
    super(message);
  }
}

async function call<T>(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: {
      'Store-Identifier': STORE.storeId,
      'accept-language': 'ar',
      currency: 'SAR',
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  if (!res.ok || json?.success === false) {
    const err = json?.error ?? json;
    const fields = err?.fields as Record<string, string[]> | undefined;
    const first = fields ? Object.values(fields)[0]?.[0] : undefined;
    throw new SallaError(first || err?.message || 'تعذّر الاتصال بالمتجر', res.status, fields);
  }
  return json as T;
}

/** Saudi mobile as Salla expects it: 9 digits starting with 5. */
export function normalizePhone(input: string) {
  const digits = input.replace(/[^\d٠-٩]/g, '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const local = digits.replace(/^(00966|966)/, '').replace(/^0/, '');
  return /^5\d{8}$/.test(local) ? local : null;
}

export const auth = {
  sendCode: (phone: string) =>
    call('auth/mobile/send_verification', { body: { type: 'mobile', phone, country_code: 'SA' } }),

  verify: (phone: string, code: string) =>
    call<{ data: { case: 'authenticated' | 'new_customer'; token?: string } }>('auth/mobile/verify', {
      body: { type: 'mobile', phone, country_code: 'SA', code },
    }),

  register: (p: { phone: string; code: string; firstName: string; lastName: string; email?: string }) =>
    call<{ data: { case: string; token?: string } }>('auth/register', {
      body: {
        first_name: p.firstName,
        last_name: p.lastName,
        phone: p.phone,
        country_code: 'SA',
        verified_by: 'phone',
        code: Number(p.code),
        ...(p.email ? { email: p.email } : {}),
      },
    }),

  me: (token: string) =>
    call<{ data: { id?: number; first_name?: string; last_name?: string; phone?: string | { number?: string }; mobile?: string } }>('auth/user', { token }),

  refresh: (token: string) => call<{ data: { token?: string } }>('auth/refresh', { method: 'POST', token }),
};

// ---- Orders and shipments ----

export type Order = {
  id: number;
  number: string;
  date?: string;
  total?: number;
  status: string;
  statusColor?: string;
  statusSlug?: string;
  items: { name: string; quantity: number }[];
  pendingPayment: boolean;
};

export type Shipment = { courier?: string; trackingNumber?: string; trackingLink?: string; status?: string; pickup?: boolean };

const orderFrom = (o: any): Order => ({
  id: Number(o.id),
  number: String(o.reference_id ?? o.id),
  date: o.date?.date ?? o.created_at ?? undefined,
  total: typeof o.total === 'number' ? o.total : Number(o.total?.amount ?? NaN) || undefined,
  status: o.status?.customized?.name ?? o.status?.name ?? '—',
  statusColor: o.status?.color ?? undefined,
  statusSlug: o.status?.slug ?? undefined,
  items: Array.isArray(o.items) ? o.items.map((i: any) => ({ name: String(i.name ?? ''), quantity: Number(i.quantity ?? 1) })) : [],
  pendingPayment: !!o.is_pending_payment,
});

export const orders = {
  list: async (token: string): Promise<Order[]> => {
    const res = await call<{ data: any[] }>('orders', { token });
    return (res.data ?? []).map(orderFrom);
  },
  details: async (token: string, id: number): Promise<Order> => {
    const res = await call<{ data: any }>(`orders/${id}`, { token });
    return orderFrom(res.data);
  },
  shipments: async (token: string, id: number): Promise<Shipment[]> => {
    const res = await call<{ data: any }>(`orders/${id}/shipments`, { token });
    const list: any[] = Array.isArray(res.data) ? res.data : res.data ? [res.data] : [];
    return list.map((s) => ({
      courier: s.courier_name ?? s.company?.name ?? s.shipping_company?.name ?? s.courier?.name ?? undefined,
      trackingNumber: s.tracking_number ?? s.shipment_number ?? s.number ?? undefined,
      trackingLink: s.tracking_link ?? s.tracking_url ?? s.track_url ?? undefined,
      status: s.status?.name ?? (typeof s.status === 'string' ? s.status : undefined),
      pickup: s.type === 'pickup' || s.is_pickup === true || undefined,
    }));
  },
};

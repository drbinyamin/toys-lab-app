import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadCatalog } from './api/catalog';
import { GIFT_CARDS, Product, STORE } from './data/catalog';

export type Delivery = 'fast' | 'pickup';
export type Payment = 'card' | 'apple' | 'split' | 'cod';
export type Tab = 'home' | 'cats' | 'gifts' | 'cart' | 'account' | 'fav';

type Filters = { category: string | null; age: string | null; query: string; sort: 'pop' | 'sale' | 'low' | 'high' };

type State = {
  products: Product[];
  isSample: boolean;
  loading: boolean;
  tab: Tab;
  setTab: (t: Tab) => void;
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  cart: Record<string, number>;
  add: (id: string) => number; // returns new items total
  change: (id: string, delta: number) => void;
  clearCart: () => void;
  favs: string[];
  toggleFav: (id: string) => void;
  city: string;
  setCity: (c: string) => void;
  delivery: Delivery;
  setDelivery: (d: Delivery) => void;
  payment: Payment;
  setPayment: (p: Payment) => void;
  wrap: boolean;
  setWrap: (b: boolean) => void;
  message: string;
  setMessage: (m: string) => void;
  balloons: boolean;
  setBalloons: (b: boolean) => void;
  byId: (id: string) => Product | undefined;
  itemsTotal: number;
  grandTotal: number;
  count: number;
  openProduct: string | null;
  setOpenProduct: (id: string | null) => void;
  cityPicker: boolean;
  setCityPicker: (b: boolean) => void;
};

const Ctx = createContext<State | null>(null);
const KEY = 'toyslab:v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isSample, setIsSample] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('home');
  const [filters, setF] = useState<Filters>({ category: null, age: null, query: '', sort: 'pop' });
  const [cart, setCart] = useState<Record<string, number>>({});
  const [favs, setFavs] = useState<string[]>([]);
  const [city, setCity] = useState('جدة');
  const [delivery, setDelivery] = useState<Delivery>('fast');
  const [payment, setPayment] = useState<Payment>('card');
  const [wrap, setWrap] = useState(true);
  const [message, setMessage] = useState('');
  const [balloons, setBalloons] = useState(false);
  const [openProduct, setOpenProduct] = useState<string | null>(null);
  const [cityPicker, setCityPicker] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const s = JSON.parse(raw);
          setCart(s.cart ?? {});
          setFavs(s.favs ?? []);
          setCity(s.city ?? 'جدة');
        }
      } catch {}
      hydrated.current = true;
      const res = await loadCatalog();
      setProducts(res.products);
      setIsSample(res.isSample);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ cart, favs, city })).catch(() => {});
  }, [cart, favs, city]);

  const all = useMemo(() => [...products, ...GIFT_CARDS], [products]);
  const byId = useCallback((id: string) => all.find((p) => p.id === id), [all]);

  const itemsTotalOf = useCallback(
    (c: Record<string, number>) => Object.entries(c).reduce((sum, [id, q]) => sum + (byId(id)?.price ?? 0) * q, 0),
    [byId],
  );
  const itemsTotal = itemsTotalOf(cart);
  const grandTotal = itemsTotal + (balloons ? STORE.balloonPrice : 0);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);

  const add = (id: string) => {
    const next = { ...cart, [id]: (cart[id] ?? 0) + 1 };
    setCart(next);
    return itemsTotalOf(next);
  };
  const change = (id: string, delta: number) =>
    setCart((c) => {
      const q = (c[id] ?? 0) + delta;
      const n = { ...c };
      if (q <= 0) delete n[id];
      else n[id] = q;
      return n;
    });
  const clearCart = () => setCart({});
  const toggleFav = (id: string) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const setFilters = (f: Partial<Filters>) => setF((cur) => ({ ...cur, ...f }));

  const value: State = {
    products, isSample, loading, tab, setTab, filters, setFilters, cart, add, change, clearCart, favs, toggleFav,
    city, setCity, delivery, setDelivery, payment, setPayment, wrap, setWrap, message, setMessage,
    balloons, setBalloons, byId, itemsTotal, grandTotal, count, openProduct, setOpenProduct, cityPicker, setCityPicker,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}

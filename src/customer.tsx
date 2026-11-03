import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { auth } from './api/salla';

export type Customer = { token: string; name: string; phone: string };

type State = {
  customer: Customer | null;
  ready: boolean;
  signIn: (token: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Opens the login sheet; `then` runs after a successful login. */
  /** `then` gets the new login key, or nothing if the customer continued as a guest. */
  askLogin: (reason?: string, then?: (token?: string) => void, allowGuest?: boolean) => void;
  loginOpen: boolean;
  loginReason?: string;
  allowGuest: boolean;
  closeLogin: (loggedIn: boolean) => void;
};

const Ctx = createContext<State | null>(null);
const KEY = 'toyslab.customer';

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ready, setReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginReason, setLoginReason] = useState<string | undefined>();
  const [allowGuest, setAllowGuest] = useState(false);
  const after = useRef<((token?: string) => void) | undefined>(undefined);
  const latest = useRef<Customer | null>(null);

  const save = async (c: Customer | null) => {
    latest.current = c;
    setCustomer(c);
    try {
      if (c) await SecureStore.setItemAsync(KEY, JSON.stringify(c));
      else await SecureStore.deleteItemAsync(KEY);
    } catch {}
  };

  // Restore the saved login, refresh its name, and renew the key when possible.
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (raw) {
          const c = JSON.parse(raw) as Customer;
          latest.current = c;
          setCustomer(c);
          auth.refresh(c.token).then((r) => { if (r.data?.token) save({ ...c, token: r.data.token }); }).catch(() => {});
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (token: string, phone: string) => {
    let name = '';
    try {
      const me = await auth.me(token);
      name = [me.data?.first_name, me.data?.last_name].filter(Boolean).join(' ');
    } catch {}
    await save({ token, phone, name });
  }, []);

  const signOut = useCallback(() => save(null), []);

  const askLogin = useCallback((reason?: string, then?: (token?: string) => void, guest = false) => {
    after.current = then;
    setLoginReason(reason);
    setAllowGuest(guest);
    setLoginOpen(true);
  }, []);

  const closeLogin = useCallback((loggedIn: boolean) => {
    setLoginOpen(false);
    const cb = after.current;
    after.current = undefined;
    const token = latest.current?.token;
    if (loggedIn && cb) setTimeout(() => cb(token), 350);
  }, []);

  return (
    <Ctx.Provider value={{ customer, ready, signIn, signOut, askLogin, loginOpen, loginReason, allowGuest, closeLogin }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCustomer() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCustomer must be used inside CustomerProvider');
  return v;
}

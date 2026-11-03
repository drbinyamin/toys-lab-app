import React from 'react';
import { useCustomer } from '../customer';
import { StoreWebView } from './StoreWebView';
import { useToast } from './Toast';

/** Login with the customer's Salla account, using Salla's own login form. */
export function LoginSheet() {
  const toast = useToast();
  const { loginOpen, allowGuest, closeLogin, signIn } = useCustomer();
  return (
    <StoreWebView
      mode="login"
      visible={loginOpen}
      onClose={() => closeLogin(false)}
      onGuest={allowGuest ? () => closeLogin(true) : undefined}
      onLoggedIn={async (u) => {
        await signIn(u.token, u.phone, u.name);
        toast(u.name ? `أهلاً ${u.name.split(' ')[0]} 👋` : 'أهلاً بك في تويز لاب');
        closeLogin(true);
      }}
    />
  );
}

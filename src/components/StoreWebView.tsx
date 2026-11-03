import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { STORE } from '../data/catalog';
import { useColors } from '../theme';
import { Icon, Mascot } from './Icons';
import { T } from './ui';

/**
 * Osama's own Salla store pages, shown inside the app.
 *
 * - "login": opens the store and shows Salla's own login form (Salla sends the
 *   SMS). When the customer is logged in, the page's Salla login key is passed
 *   back to the app.
 * - "checkout": Salla's payment page. No scripts are added to it, so Apple Pay
 *   stays available. It shares the login with the "login" view, so a customer
 *   who logged in in the app isn't asked again.
 */

export type LoggedInUser = { token: string; name: string; phone: string };

const LOGIN_SCRIPT = `
(function () {
  if (window.__toyslab) return; window.__toyslab = true;
  function send(type, data) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, data || {}))); } catch (e) {}
  }
  var opened = false, tries = 0, done = false;
  var timer = setInterval(function () {
    tries++;
    var s = window.salla;
    if (!s || !s.config || !s.storage) { if (tries === 40) send('slow'); return; }
    try {
      var token = s.storage.get('token');
      if (typeof token === 'string') token = token.replace(/^"|"$/g, '');
      if (!s.config.isGuest() && token && String(token).split('.').length === 3) {
        if (done) return; done = true; clearInterval(timer);
        var u = s.config.get('user') || {};
        var phone = u.mobile || u.phone || '';
        if (phone && typeof phone === 'object') phone = phone.number || '';
        send('loggedIn', { token: String(token), name: [u.first_name, u.last_name].filter(Boolean).join(' '), phone: String(phone || '') });
        return;
      }
      if (!opened && s.event && s.event.dispatch) {
        opened = true;
        s.event.dispatch('login::open');
        send('formShown');
      }
    } catch (e) { send('error', { message: String(e && e.message || e) }); }
  }, 600);
})();
true;
`;

// Step 1 (hidden): read the store's Salla settings, the same ones the store
// page hands to Salla's login page. If the customer is already logged in on
// the store, report that straight away.
const CAPTURE_SCRIPT = `
(function () {
  if (window.__toyslabCapture) return; window.__toyslabCapture = true;
  function send(type, data) { try { window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, data || {}))); } catch (e) {} }
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    var s = window.salla;
    if (!s || !s.config || !s.config.get) { if (tries > 50) { clearInterval(timer); send('captureFailed'); } return; }
    clearInterval(timer);
    try {
      var token = s.storage && s.storage.get('token');
      if (typeof token === 'string') token = token.replace(/^"|"$/g, '');
      if (!s.config.isGuest() && token && String(token).split('.').length === 3) {
        var u = s.config.get('user') || {};
        send('loggedIn', { token: String(token), name: [u.first_name, u.last_name].filter(Boolean).join(' '), phone: String(u.mobile || u.phone || '') });
        return;
      }
      var settings = null;
      try { settings = JSON.parse(JSON.stringify(s.config.all())); } catch (e) { settings = null; }
      send('settings', {
        storeId: s.config.get('store.id'),
        apiUrl: String(s.config.get('store.api') || 'https://api.salla.dev/store/v1/').replace(/\\/+$/, ''),
        loginUrl: s.config.get('login.url', 'https://accounts.salla.com'),
        version: s.config.get('login.version', '0.1.78'),
        lang: (s.lang && s.lang.locale) || 'ar',
        settings: settings
      });
    } catch (e) { send('captureFailed', { message: String(e && e.message || e) }); }
  }, 300);
})();
true;
`;

// Step 2: Salla's login page opened directly (not embedded), so its security
// check works. It talks to its "parent" with messages; opened directly, it is
// its own parent, so we answer those messages the way the store page would.
const bridgeScript = (init: unknown) => `
(function () {
  var INIT = ${JSON.stringify(init)};
  function send(type, data) { try { window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, data || {}))); } catch (e) {} }
  function toApp(token, user) {
    if (!token) return;
    token = String(token).replace(/^"|"$/g, '');
    if (token.split('.').length !== 3) return;
    if (typeof user === 'string') { try { user = JSON.parse(user); } catch (e) { user = null; } }
    user = user || {};
    send('loggedIn', { token: token, name: [user.first_name, user.last_name].filter(Boolean).join(' '), phone: String(user.mobile || user.phone || '') });
  }
  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || d.source !== 'login' || typeof d.type !== 'string' || d.type.indexOf('iframe::') !== 0) return;
    var action = d.type.replace('iframe::', '');
    var value = d.message;
    if (action === 'ready') {
      setTimeout(function () {
        window.postMessage({ source: 'login', type: 'init', data: INIT }, '*');
        window.postMessage({ source: 'login', type: 'width', data: document.documentElement.clientWidth }, '*');
      }, 30);
      send('ready');
    } else if (action === 'storage' && value) {
      toApp(value.token, value.user);
    } else if ((action === 'authenticated' || action === 'authenticated_web_auth') && value) {
      toApp((value.data && value.data.token) || value.token, value.data && value.data.user);
    } else if (action === 'guest-checkout') {
      send('guest');
    } else if (action === 'close') {
      send('close');
    }
  });
})();
true;
`;

const SAFARI_UA = 'Version/18.0 Mobile/15E148 Safari/604.1';

/** Pages Salla shows once an order is placed. */
const isOrderDone = (url: string) => /thank|success|order[-_]completed|payment\/(complete|success)|\/orders\/\d+/i.test(url);

type Props =
  | { mode: 'login'; visible: boolean; onClose: () => void; onLoggedIn: (u: LoggedInUser) => void; onGuest?: () => void }
  | { mode: 'checkout'; visible: boolean; url: string; onClose: (finished: boolean) => void };

export function StoreWebView(props: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const finished = useRef(false);
  const reported = useRef(false);
  // Login runs in steps: 'prep' reads the store's settings, 'salla' shows
  // Salla's login page, 'store' is the fallback (login form on the store page).
  const [phase, setPhase] = useState<'prep' | 'salla' | 'store'>('prep');
  const [loginPage, setLoginPage] = useState<{ url: string; script: string } | null>(null);

  // Start fresh each time the window opens.
  useEffect(() => {
    if (!props.visible) return;
    reported.current = false;
    finished.current = false;
    setLoading(true);
    setSlow(false);
    if (props.mode === 'login') setPhase('prep');
  }, [props.visible, props.mode]);

  const close = () => {
    if (props.mode === 'checkout') props.onClose(finished.current);
    else props.onClose();
  };

  const reportLogin = (token: string, name?: string, phone?: string) => {
    if (props.mode !== 'login' || reported.current) return;
    reported.current = true;
    props.onLoggedIn({ token, name: name ?? '', phone: (phone ?? '').replace(/^\+?966/, '') });
  };

  const onMessage = (e: WebViewMessageEvent) => {
    if (props.mode !== 'login') return;
    try {
      const msg = JSON.parse(e.nativeEvent.data) as {
        type: string; token?: string; name?: string; phone?: string;
        storeId?: string | number; apiUrl?: string; loginUrl?: string; version?: string; lang?: string; settings?: unknown;
      };
      if (msg.type === 'loggedIn' && msg.token) return reportLogin(msg.token, msg.name, msg.phone);
      if (msg.type === 'settings' && phase === 'prep') {
        const init = {
          id: msg.storeId ?? STORE.storeId,
          lang: msg.lang ?? 'ar',
          isDark: false,
          apiUrl: msg.apiUrl,
          supportWebAuth: false,
          withoutReload: true,
          inline: true,
          settings: msg.settings ?? {},
          headers: undefined,
          storage: {},
        };
        const base = (msg.loginUrl ?? 'https://accounts.salla.com').replace(/\/+$/, '');
        setLoginPage({ url: `${base}?src=app&version=${encodeURIComponent(msg.version ?? '0.1.78')}`, script: bridgeScript(init) });
        setPhase('salla');
        return;
      }
      if (msg.type === 'captureFailed') { setPhase('store'); return; }
      if (msg.type === 'ready') { setLoading(false); return; }
      if (msg.type === 'guest' && props.onGuest) { props.onGuest(); return; }
      if (msg.type === 'close') { props.onClose(); return; }
      // fallback page messages
      if (msg.type === 'slow') setSlow(true);
      if (msg.type === 'formShown') setLoading(false);
    } catch {}
  };

  const onNav = (n: WebViewNavigation) => {
    if (props.mode === 'checkout' && isOrderDone(n.url) && !finished.current) {
      finished.current = true;
      // Let the customer see Salla's confirmation for a moment, then show ours.
      setTimeout(() => props.onClose(true), 2500);
    }
  };

  const title = props.mode === 'login' ? 'تسجيل الدخول' : 'الدفع';
  const storeUrl = `${STORE.website.replace(/\/$/, '')}/`;
  const url =
    props.mode === 'checkout' ? props.url
    : phase === 'salla' && loginPage ? loginPage.url
    : storeUrl;
  const loginScript = phase === 'prep' ? CAPTURE_SCRIPT : phase === 'store' ? LOGIN_SCRIPT : undefined;

  return (
    <Modal visible={props.visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ backgroundColor: c.sun, paddingTop: insets.top + 6, paddingBottom: 10, paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
          <Mascot size={34} />
          <View style={{ flex: 1 }}>
            <T weight="bold" style={{ color: c.onSun, fontSize: 16 }}>{title}</T>
            <T style={{ color: c.onSun, opacity: 0.75, fontSize: 11.5 }}>آمن عبر متجر تويز لاب في سلة</T>
          </View>
          <Pressable onPress={close} accessibilityLabel="إغلاق" hitSlop={8} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" color={c.onSun} size={18} />
          </Pressable>
        </View>
        {props.visible ? (
          <WebView
            key={props.mode === 'login' ? phase : 'checkout'}
            source={{ uri: url }}
            style={{ flex: 1, opacity: props.mode === 'login' && phase === 'prep' ? 0 : 1 }}
            sharedCookiesEnabled={props.mode === 'login'}
            thirdPartyCookiesEnabled
            domStorageEnabled
            javaScriptEnabled
            setSupportMultipleWindows={false}
            applicationNameForUserAgent={SAFARI_UA}
            enableApplePay={props.mode === 'checkout'}
            injectedJavaScriptBeforeContentLoaded={props.mode === 'login' && phase === 'salla' ? loginPage?.script : undefined}
            injectedJavaScript={props.mode === 'login' ? loginScript : undefined}
            onMessage={onMessage}
            onNavigationStateChange={onNav}
            onLoadEnd={() => {
              if (props.mode === 'checkout') setLoading(false);
              else if (phase !== 'prep') setTimeout(() => setLoading(false), phase === 'salla' ? 2500 : 6000);
            }}
            startInLoadingState={false}
          />
        ) : null}
        {props.mode === 'login' && (props.onGuest || phase === 'salla') ? (
          <View style={{ backgroundColor: c.surface, borderTopWidth: 1, borderColor: c.line, paddingTop: 6, paddingBottom: insets.bottom + 8, paddingHorizontal: 16, gap: 2 }}>
            {props.onGuest ? (
              <Pressable onPress={props.onGuest} hitSlop={6} style={{ alignItems: 'center', paddingVertical: 8 }}>
                <T weight="bold" style={{ color: c.brand, fontSize: 15, textAlign: 'center' }}>متابعة الدفع بدون تسجيل</T>
              </Pressable>
            ) : null}
            {phase === 'salla' ? (
              <Pressable onPress={() => { setLoading(true); setPhase('store'); }} hitSlop={6} style={{ alignItems: 'center', paddingVertical: 6 }}>
                <T muted style={{ fontSize: 12.5, textAlign: 'center' }}>ما ظهرت صفحة الدخول؟ جرّب من صفحة المتجر</T>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {loading ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 60, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg, gap: 10 }}>
            <ActivityIndicator color={c.brand} />
            <T muted style={{ textAlign: 'center' }}>{props.mode === 'login' ? (slow ? 'لحظات… نجهّز صفحة الدخول' : 'جاري فتح صفحة الدخول من سلة') : 'جاري فتح صفحة الدفع'}</T>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

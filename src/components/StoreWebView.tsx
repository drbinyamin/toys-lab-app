import React, { useRef, useState } from 'react';
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

  const close = () => {
    if (props.mode === 'checkout') props.onClose(finished.current);
    else props.onClose();
  };

  const onMessage = (e: WebViewMessageEvent) => {
    if (props.mode !== 'login') return;
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type: string; token?: string; name?: string; phone?: string };
      if (msg.type === 'slow') setSlow(true);
      if (msg.type === 'formShown') setLoading(false);
      if (msg.type === 'loggedIn' && msg.token && !reported.current) {
        reported.current = true;
        props.onLoggedIn({ token: msg.token, name: msg.name ?? '', phone: (msg.phone ?? '').replace(/^\+?966/, '') });
      }
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
  const url = props.mode === 'login' ? `${STORE.website.replace(/\/$/, '')}/` : props.url;

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
            source={{ uri: url }}
            style={{ flex: 1 }}
            sharedCookiesEnabled={props.mode === 'login'}
            thirdPartyCookiesEnabled
            domStorageEnabled
            javaScriptEnabled
            setSupportMultipleWindows={false}
            enableApplePay={props.mode === 'checkout'}
            injectedJavaScript={props.mode === 'login' ? LOGIN_SCRIPT : undefined}
            onMessage={onMessage}
            onNavigationStateChange={onNav}
            onLoadEnd={() => { if (props.mode === 'checkout') setLoading(false); else setTimeout(() => setLoading(false), 6000); }}
            startInLoadingState={false}
          />
        ) : null}
        {props.mode === 'login' && props.onGuest ? (
          <View style={{ backgroundColor: c.surface, borderTopWidth: 1, borderColor: c.line, paddingTop: 10, paddingBottom: insets.bottom + 10, paddingHorizontal: 16 }}>
            <Pressable onPress={props.onGuest} hitSlop={6} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <T weight="bold" style={{ color: c.brand, fontSize: 15, textAlign: 'center' }}>متابعة الدفع بدون تسجيل</T>
            </Pressable>
          </View>
        ) : null}
        {loading ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 60, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg, gap: 10 }}>
            <ActivityIndicator color={c.brand} />
            <T muted style={{ textAlign: 'center' }}>{props.mode === 'login' ? (slow ? 'لحظات… نجهّز صفحة الدخول' : 'جاري فتح صفحة الدخول') : 'جاري فتح صفحة الدفع'}</T>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

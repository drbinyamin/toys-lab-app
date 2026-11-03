import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Order, orders as ordersApi, SallaError, Shipment } from '../api/salla';
import { useCustomer } from '../customer';
import { ltr, money, useColors } from '../theme';
import { Icon } from './Icons';
import { Sheet } from './Sheets';
import { Button, Panel, T } from './ui';

/** The logged-in customer's orders from the store, newest first. */
export function useOrders() {
  const { customer, signOut } = useCustomer();
  const [list, setList] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!customer) { setList(null); return [] as Order[]; }
    setLoading(true); setError(null);
    try {
      const l = await ordersApi.list(customer.token);
      setList(l);
      return l;
    } catch (e) {
      if (e instanceof SallaError && e.status === 401) { await signOut(); }
      setError(e instanceof SallaError ? e.message : 'تعذّر تحميل الطلبات');
      return [] as Order[];
    } finally {
      setLoading(false);
    }
  }, [customer, signOut]);

  useEffect(() => { load(); }, [load]);
  return { list, loading, error, reload: load };
}

const formatDate = (d?: string) => {
  if (!d) return '';
  const t = new Date(d.replace(' ', 'T'));
  return isNaN(t.getTime()) ? '' : t.toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Status pill using the store's own status colour when Salla provides one. */
export function StatusPill({ order }: { order: Order }) {
  const c = useColors();
  const color = order.pendingPayment ? c.sale : order.statusColor && /^#[0-9a-f]{6}$/i.test(order.statusColor) ? order.statusColor : c.brand;
  return (
    <View style={{ borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: color + '22' }}>
      <T weight="bold" style={{ fontSize: 11.5, color }}>{order.pendingPayment ? 'بانتظار الدفع' : order.status}</T>
    </View>
  );
}

export function OrderRow({ order, last, onPress }: { order: Order; last?: boolean; onPress: () => void }) {
  const c = useColors();
  const count = order.items.reduce((a, i) => a + i.quantity, 0);
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: last ? 0 : 1, borderColor: c.line }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T weight="bold" style={{ fontSize: 14 }}>طلب {ltr(`#${order.number}`)}</T>
        <T muted style={{ fontSize: 12 }}>
          {[formatDate(order.date), count ? `${count} ${count === 1 ? 'قطعة' : 'قطع'}` : '', order.total ? money(order.total) : ''].filter(Boolean).join(' · ')}
        </T>
      </View>
      <StatusPill order={order} />
      <Icon name="chevLeft" color={c.muted} size={16} />
    </Pressable>
  );
}

export function OrderSheet({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const c = useColors();
  const { customer } = useCustomer();
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setShipments(null);
    if (!order || !customer) return;
    setLoading(true);
    ordersApi.shipments(customer.token, order.id).then(setShipments).catch(() => setShipments([])).finally(() => setLoading(false));
  }, [order, customer]);

  return (
    <Sheet visible={!!order} onClose={onClose}>
      {order ? (
        <View style={{ padding: 18, paddingTop: 24, gap: 14 }}>
          <View style={{ gap: 6 }}>
            <T weight="displayBold" style={{ fontSize: 22 }}>طلب {ltr(`#${order.number}`)}</T>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <StatusPill order={order} />
              <T muted style={{ fontSize: 12.5 }}>{formatDate(order.date)}</T>
            </View>
          </View>

          <Panel style={{ gap: 8 }}>
            <T weight="bold">المنتجات</T>
            {order.items.length ? order.items.map((i, k) => (
              <View key={k} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 10 }}>
                <T style={{ flex: 1, fontSize: 13.5 }} numberOfLines={2}>{i.name}</T>
                <T muted style={{ fontSize: 13.5 }}>× {i.quantity}</T>
              </View>
            )) : <T muted style={{ fontSize: 13 }}>—</T>}
            {order.total ? (
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.line, paddingTop: 8 }}>
                <T weight="bold">الإجمالي</T>
                <T weight="bold">{money(order.total)}</T>
              </View>
            ) : null}
          </Panel>

          <Panel style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <Icon name="truck" color={c.brand} size={20} />
              <T weight="bold">الشحن والتتبع</T>
            </View>
            {loading ? <ActivityIndicator color={c.brand} /> : null}
            {!loading && shipments && !shipments.length ? (
              <T muted style={{ fontSize: 13 }}>ما تم شحن الطلب للحين. بيظهر رقم التتبع هنا أول ما يطلع مع شركة الشحن.</T>
            ) : null}
            {shipments?.map((s, k) => (
              <View key={k} style={{ gap: 6, borderTopWidth: k ? 1 : 0, borderColor: c.line, paddingTop: k ? 10 : 0 }}>
                {s.courier ? <Line k="شركة الشحن" v={s.courier} /> : null}
                {s.status ? <Line k="حالة الشحنة" v={s.status} /> : null}
                {s.trackingNumber ? <Line k="رقم التتبع" v={s.trackingNumber} selectable /> : null}
                {s.trackingLink ? (
                  <Button kind="secondary" label="تتبّع الشحنة" icon={<Icon name="truck" color={c.brand} size={18} />} onPress={() => WebBrowser.openBrowserAsync(s.trackingLink!)} />
                ) : null}
              </View>
            ))}
          </Panel>
        </View>
      ) : null}
    </Sheet>
  );
}

function Line({ k, v, selectable }: { k: string; v: string; selectable?: boolean }) {
  return (
    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 12 }}>
      <T muted style={{ fontSize: 13.5 }}>{k}</T>
      <T weight="semibold" selectable={selectable} style={{ fontSize: 13.5, flexShrink: 1, writingDirection: /^[\w-]+$/.test(v) ? 'ltr' : 'rtl' }}>{v}</T>
    </View>
  );
}

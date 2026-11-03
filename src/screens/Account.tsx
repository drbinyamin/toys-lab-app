import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import type { Order as OrderT } from '../api/salla';
import { OrderRow, OrderSheet, useOrders } from '../components/Orders';
import { useCustomer } from '../customer';
import { Icon, Mascot, UIName } from '../components/Icons';
import { ProductGrid } from '../components/ProductCard';
import { Button, Empty, Panel, SectionHead, T } from '../components/ui';
import { STORE } from '../data/catalog';
import { openWhatsApp } from '../order';
import { useStore } from '../store';
import { fonts, ltr, useColors } from '../theme';

export function AccountScreen() {
  const c = useColors();
  const { favs, city, setCityPicker, setTab, isSample } = useStore();
  const { customer, askLogin, signOut } = useCustomer();
  const { list, loading, error, reload } = useOrders();
  const [open, setOpen] = useState<OrderT | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);

  return (
    <View style={{ padding: 16, gap: 18 }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: c.sun, borderRadius: 20, padding: 14 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 30, padding: 4 }}><Mascot size={52} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <T weight="bold" style={{ fontSize: 17, color: c.onSun }}>{customer ? `أهلاً ${customer.name || 'بك'} 👋` : 'أهلاً بك في تويز لاب'}</T>
          <T style={{ fontSize: 13, color: c.onSun, opacity: 0.8 }}>
            {customer ? ltr(`+966 ${customer.phone}`) : isSample ? 'تسجيل الدخول يتفعّل بعد ربط المتجر' : 'سجّل دخولك لتتابع طلباتك وشحناتك'}
          </T>
        </View>
        {!customer && !isSample ? (
          <Pressable onPress={() => askLogin()} style={{ backgroundColor: '#074680', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 }}>
            <T weight="bold" style={{ color: '#fff', fontSize: 13.5 }}>دخول</T>
          </Pressable>
        ) : null}
      </View>

      {customer ? (
        <View>
          <SectionHead title="طلباتي" action={loading ? undefined : 'تحديث'} onAction={reload} />
          {loading && !list ? <ActivityIndicator color={c.brand} /> : null}
          {error ? <T weight="semibold" style={{ color: c.sale, fontSize: 13 }}>{error}</T> : null}
          {list && list.length ? (
            <Panel style={{ padding: 0, gap: 0 }}>
              {list.map((o, i) => <OrderRow key={o.id} order={o} last={i === list.length - 1} onPress={() => setOpen(o)} />)}
            </Panel>
          ) : null}
          {list && !list.length && !loading ? (
            <Empty art={<Mascot size={70} />} title="ما عندك طلبات للحين" body="طلباتك من التطبيق أو الموقع تظهر هنا مع حالة الشحن." action="تسوّق الآن" onAction={() => setTab('cats')} />
          ) : null}
        </View>
      ) : !isSample ? (
        <Panel>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <Icon name="truck" color={c.brand} size={20} />
            <T weight="bold">تتبّع طلباتك</T>
          </View>
          <T muted style={{ fontSize: 13 }}>سجّل دخولك برقم جوالك وتشوف كل طلباتك من التطبيق والموقع، وحالة الشحن ورقم التتبع.</T>
          <Button kind="sun" label="سجّل دخولك" onPress={() => askLogin()} />
        </Panel>
      ) : null}

      <Panel style={{ padding: 0, gap: 0 }}>
        <Item icon="heart" label="المفضلة" note={String(favs.length)} onPress={() => setTab('fav')} />
        <Item icon="pin" label="مدينة التوصيل" note={city} onPress={() => setCityPicker(true)} />
        <Item icon="chat" label="تواصل معنا بالواتساب" onPress={() => openWhatsApp('مرحباً تويز لاب')} />
        <Item icon="globe" label="زيارة الموقع" onPress={() => Linking.openURL(STORE.website)} />
        <Item icon="doc" label="سياسة الاستبدال والاسترجاع" onPress={() => Linking.openURL(STORE.website)} last={!customer} />
        {customer ? <Item icon="user" label={confirmOut ? 'اضغط مرة ثانية لتسجيل الخروج' : 'تسجيل الخروج'} onPress={() => { if (confirmOut) { signOut(); setConfirmOut(false); } else setConfirmOut(true); }} last /> : null}
      </Panel>

      <T muted style={{ fontSize: 12, textAlign: 'center' }}>تويز لاب · متجر ألعاب الأطفال والألعاب التعليمية · جدة</T>
      <OrderSheet order={open} onClose={() => setOpen(null)} />
    </View>
  );
}

export function FavoritesScreen() {
  const { products, favs, setTab } = useStore();
  const list = products.filter((p) => favs.includes(p.id));
  return (
    <View style={{ padding: 16 }}>
      <SectionHead title="المفضلة" />
      {list.length ? (
        <ProductGrid items={list} />
      ) : (
        <Empty art={<Mascot size={84} />} title="قائمة المفضلة فاضية" body="اضغط القلب على أي لعبة لحفظها هنا." action="تصفّح الألعاب" onAction={() => setTab('cats')} />
      )}
    </View>
  );
}



function Item({ icon, label, note, onPress, last }: { icon: UIName; label: string; note?: string; onPress: () => void; last?: boolean }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 14, borderBottomWidth: last ? 0 : 1, borderColor: c.line }}>
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(7,70,128,0.1)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={c.brand} size={18} />
      </View>
      <T style={{ flex: 1 }}>{label}</T>
      {note ? <T muted style={{ fontSize: 13 }}>{note}</T> : null}
      <Icon name="chevLeft" color={c.muted} size={16} />
    </Pressable>
  );
}

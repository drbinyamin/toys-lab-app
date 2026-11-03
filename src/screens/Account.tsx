import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Icon, Mascot, UIName } from '../components/Icons';
import { ProductGrid } from '../components/ProductCard';
import { Empty, Panel, SectionHead, T } from '../components/ui';
import { STORE } from '../data/catalog';
import { openWhatsApp } from '../order';
import { useStore } from '../store';
import { fonts, useColors } from '../theme';

export function AccountScreen() {
  const c = useColors();
  const { favs, city, setCityPicker, setTab } = useStore();
  return (
    <View style={{ padding: 16, gap: 18 }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: c.sun, borderRadius: 20, padding: 14 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 30, padding: 4 }}><Mascot size={52} /></View>
        <View style={{ flex: 1 }}>
          <T weight="bold" style={{ fontSize: 17, color: c.onSun }}>أهلاً بك في تويز لاب</T>
          <T style={{ fontSize: 13, color: c.onSun, opacity: 0.8 }}>تسجيل الدخول وتتبع الطلبات يتفعّل بعد ربط المتجر</T>
        </View>
      </View>

      <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
        <Stat label="رصيد المحفظة" value="0 ر.س" note="للمبالغ المستردة" />
        <Stat label="المفضلة" value={String(favs.length)} note="ألعاب محفوظة" />
      </View>

      <View>
        <SectionHead title="طلباتي" />
        <Panel style={{ padding: 0, gap: 0 }}>
          <Order no="#10482 · 3 قطع" status="قيد التوصيل" going />
          <Order no="#10391 · قطعة واحدة" status="تم التسليم" last />
        </Panel>
        <T muted style={{ fontSize: 11.5, marginTop: 6 }}>طلبات توضيحية</T>
      </View>

      <Panel style={{ padding: 0, gap: 0 }}>
        <Item icon="heart" label="المفضلة" note={String(favs.length)} onPress={() => setTab('fav')} />
        <Item icon="pin" label="مدينة التوصيل" note={city} onPress={() => setCityPicker(true)} />
        <Item icon="chat" label="تواصل معنا بالواتساب" onPress={() => openWhatsApp('مرحباً تويز لاب')} />
        <Item icon="globe" label="زيارة الموقع" onPress={() => Linking.openURL(STORE.website)} />
        <Item icon="doc" label="سياسة الاستبدال والاسترجاع" onPress={() => Linking.openURL(STORE.website)} last />
      </Panel>

      <T muted style={{ fontSize: 12, textAlign: 'center' }}>تويز لاب · متجر ألعاب الأطفال والألعاب التعليمية · جدة</T>
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

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  const c = useColors();
  return (
    <Panel style={{ flex: 1, gap: 2, padding: 12 }}>
      <T muted style={{ fontSize: 12 }}>{label}</T>
      <T style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 30, color: c.brand }}>{value}</T>
      <T muted style={{ fontSize: 12 }}>{note}</T>
    </Panel>
  );
}

function Order({ no, status, going, last }: { no: string; status: string; going?: boolean; last?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: last ? 0 : 1, borderColor: c.line }}>
      <T style={{ fontSize: 13.5 }}>طلب {no}</T>
      <View style={{ borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: going ? 'rgba(255,201,40,0.35)' : 'rgba(22,153,106,0.18)' }}>
        <T weight="bold" style={{ fontSize: 11.5, color: going ? c.ink : c.ok }}>{status}</T>
      </View>
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

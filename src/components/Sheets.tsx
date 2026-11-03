import React from 'react';
import { Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryOf, CITIES, STORE } from '../data/catalog';
import { openWhatsApp } from '../order';
import { useStore } from '../store';
import { money, useColors } from '../theme';
import { Icon } from './Icons';
import { FavButton, ProductThumb, useAddToCart } from './ProductCard';
import { useToast } from './Toast';
import { Button, Panel, T } from './ui';

function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(4,14,28,0.5)' }} onPress={onClose} accessibilityLabel="إغلاق" />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '92%', backgroundColor: c.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' }}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>{children}</ScrollView>
        <Pressable onPress={onClose} accessibilityLabel="إغلاق" style={{ position: 'absolute', top: 12, left: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" color={c.ink} size={18} />
        </Pressable>
      </View>
    </Modal>
  );
}

export function ProductSheet() {
  const c = useColors();
  const { openProduct, setOpenProduct, byId, city } = useStore();
  const addToCart = useAddToCart();
  const p = openProduct ? byId(openProduct) : undefined;
  const close = () => setOpenProduct(null);
  const jeddah = city === 'جدة';
  const cat = p ? categoryOf(p.category) : null;
  return (
    <Sheet visible={!!p} onClose={close}>
      {p && cat ? (
        <>
          <View style={{ aspectRatio: 4 / 3, overflow: 'hidden' }}>
            <ProductThumb p={p} />
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            <T muted style={{ fontSize: 12 }}>{cat.name}</T>
            <T weight="displayBold" style={{ fontSize: 22, lineHeight: 30 }}>{p.name}</T>
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 6 }}>
                <T weight="bold" style={{ fontSize: 21 }}>{money(p.price)}</T>
                {p.oldPrice ? <T muted style={{ textDecorationLine: 'line-through' }}>{p.oldPrice} ر.س</T> : null}
              </View>
              {p.price >= 100 ? <T weight="semibold" style={{ color: c.ok, fontSize: 12.5 }}>أو قسّمها على 4 دفعات × {(p.price / 4).toFixed(2)} ر.س بدون فوائد</T> : null}
            </View>
            <Panel style={{ gap: 6, padding: 12 }}>
              <Row k="العمر المناسب" v={p.age.includes('كل') ? p.age : `${p.age} سنوات`} />
              <Row k="القسم" v={cat.name} />
              {p.brand ? <Row k="الماركة" v={p.brand} /> : null}
              <Row
                k="التوفر"
                v={`${p.stock !== undefined && p.stock <= 3 ? `باقي ${p.stock} فقط` : 'متوفر'} · ${jeddah ? 'يوصلك اليوم' : 'يوصلك خلال 2 إلى 4 أيام'}`}
                color={p.stock !== undefined && p.stock <= 3 ? c.sale : c.ok}
              />
            </Panel>
            <View style={{ gap: 6 }}>
              <Perk icon="wrap" text="تغليف هدايا مجاني مع رسالة إهداء" />
              <Perk icon="truck" text={`شحن مجاني للطلبات فوق ${STORE.freeShippingFrom} ريال`} />
              <Perk icon="shop" text="متوفر للاستلام من فرعنا بجدة" />
            </View>
            <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
              <Button kind="sun" label="أضف للسلة" icon={<Icon name="bag" color={c.onSun} size={20} />} onPress={() => { addToCart(p.id); close(); }} style={{ flex: 1 }} />
              <FavButton id={p.id} style={{ width: 52, height: 52, borderRadius: 16, shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: c.line }} />
            </View>
            {p.url ? (
              <Button kind="secondary" label="اشترِ من موقع المتجر" icon={<Icon name="globe" color={c.brand} size={18} />} onPress={() => Linking.openURL(p.url!)} />
            ) : null}
            <Button kind="secondary" label="اسأل عن اللعبة بالواتساب" icon={<Icon name="chat" color={c.ok} size={18} />} onPress={() => openWhatsApp(`استفسار عن: ${p.name}`)} />
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

function Row({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 12 }}>
      <T muted style={{ fontSize: 13.5 }}>{k}</T>
      <T weight="semibold" style={{ fontSize: 13.5, color, flexShrink: 1 }}>{v}</T>
    </View>
  );
}

function Perk({ icon, text }: { icon: 'wrap' | 'truck' | 'shop'; text: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
      <Icon name={icon} color={c.muted} size={16} />
      <T muted style={{ fontSize: 13 }}>{text}</T>
    </View>
  );
}

export function CitySheet() {
  const c = useColors();
  const toast = useToast();
  const { cityPicker, setCityPicker, city, setCity } = useStore();
  return (
    <Sheet visible={cityPicker} onClose={() => setCityPicker(false)}>
      <View style={{ padding: 16, paddingTop: 22, gap: 10 }}>
        <T weight="displayBold" style={{ fontSize: 22 }}>وين نوصّل ألعابك؟</T>
        <T muted style={{ fontSize: 13 }}>نعرض لك أوقات التوصيل حسب مدينتك.</T>
        {CITIES.map((name) => {
          const on = name === city;
          return (
            <Pressable
              key={name}
              onPress={() => { setCity(name); setCityPicker(false); toast(`صار التوصيل إلى ${name}`); }}
              style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: on ? c.brand : c.line, borderRadius: 14, padding: 12, backgroundColor: c.surface }}
            >
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: on ? c.brand : c.muted, alignItems: 'center', justifyContent: 'center' }}>
                {on ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.brand }} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <T weight="bold">{name}</T>
                <T muted style={{ fontSize: 12 }}>{name === 'جدة' ? 'توصيل نفس اليوم' : 'توصيل خلال 2 إلى 4 أيام عمل'}</T>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

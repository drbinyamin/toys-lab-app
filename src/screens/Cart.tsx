import React from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { Icon, Mascot } from '../components/Icons';
import { ProductThumb } from '../components/ProductCard';
import { Button, Empty, Panel, T } from '../components/ui';
import { STORE } from '../data/catalog';
import { deliveryOptions, openWhatsApp, orderText, PAYMENT_LABEL } from '../order';
import { Payment, useStore } from '../store';
import { fonts, money, useColors } from '../theme';

export function CartScreen() {
  const c = useColors();
  const s = useStore();
  const ids = Object.keys(s.cart).filter((id) => s.byId(id));

  if (!ids.length) {
    return (
      <View style={{ padding: 16 }}>
        <Empty art={<Mascot size={84} />} title="سلتك فاضية" body="أضف ألعاب وارجع هنا لإرسال الطلب." action="ابدأ التسوق" onAction={() => s.setTab('cats')} />
      </View>
    );
  }

  const free = STORE.freeShippingFrom;
  const left = Math.max(0, free - s.itemsTotal);
  const freeShip = !left || s.delivery === 'pickup';
  const lines = ids.map((id) => ({ name: s.byId(id)!.name, qty: s.cart[id], price: s.byId(id)!.price }));
  const text = orderText({ lines, balloons: s.balloons, city: s.city, delivery: s.delivery, payment: s.payment, wrap: s.wrap, message: s.message, total: s.grandTotal });

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
        <T weight="displayBold" style={{ fontSize: 21 }}>السلة</T>
        <T muted style={{ fontSize: 13 }}>{s.count} قطع</T>
      </View>

      <Panel style={{ gap: 8 }}>
        <T weight="semibold" style={{ fontSize: 13, color: left ? c.muted : c.ok }}>{left ? `باقي ${money(left)} وتحصل على شحن مجاني` : 'مبروك! طلبك عليه شحن مجاني'}</T>
        <View style={{ height: 10, borderRadius: 99, backgroundColor: c.line, overflow: 'hidden', flexDirection: 'row-reverse' }}>
          <View style={{ width: `${Math.min(100, (s.itemsTotal / free) * 100)}%`, backgroundColor: c.ok, borderRadius: 99 }} />
        </View>
      </Panel>

      {ids.map((id) => {
        const p = s.byId(id)!;
        return (
          <View key={id} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 20, padding: 10 }}>
            <Pressable onPress={() => p.category !== 'gift' && s.setOpenProduct(id)}>
              <ProductThumb p={p} size={72} radius={14} />
            </Pressable>
            <View style={{ flex: 1, gap: 6 }}>
              <T weight="semibold" numberOfLines={2} style={{ fontSize: 13.5 }}>{p.name}</T>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                <T weight="bold">{money(p.price * s.cart[id])}</T>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 10 }}>
                  <Pressable onPress={() => s.change(id, 1)} accessibilityLabel="زيادة" style={{ width: 32, height: 30, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" color={c.ink} size={16} /></Pressable>
                  <T weight="semibold" style={{ minWidth: 24, textAlign: 'center' }}>{s.cart[id]}</T>
                  <Pressable onPress={() => s.change(id, -1)} accessibilityLabel="إنقاص" style={{ width: 32, height: 30, alignItems: 'center', justifyContent: 'center' }}><Icon name="minus" color={c.ink} size={16} /></Pressable>
                </View>
              </View>
            </View>
          </View>
        );
      })}

      <Panel>
        <PanelTitle icon="wrap" title="الهدية" />
        <Toggle label="تغليف هدية مجاني" value={s.wrap} onChange={s.setWrap} />
        {s.wrap ? (
          <TextInput
            value={s.message}
            onChangeText={s.setMessage}
            placeholder="رسالة الإهداء (اختياري) — مثال: كل عام وأنت بخير يا بطل!"
            placeholderTextColor={c.muted}
            maxLength={150}
            multiline
            style={{ minHeight: 70, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 10, backgroundColor: c.bg, color: c.ink, fontFamily: fonts.body, fontSize: 14, textAlign: 'right', writingDirection: 'rtl', textAlignVertical: 'top' }}
          />
        ) : null}
        <Toggle label={`أضف بالونات هيليوم (${STORE.balloonPrice} ر.س)`} value={s.balloons} onChange={s.setBalloons} />
      </Panel>

      <Panel>
        <PanelTitle icon="truck" title="طريقة الاستلام" />
        {deliveryOptions(s.city).map((d) => (
          <Option key={d.id} on={s.delivery === d.id} title={d.title} detail={d.detail} right={d.free || !left ? 'مجاني' : undefined} onPress={() => s.setDelivery(d.id)} />
        ))}
      </Panel>

      <Panel>
        <PanelTitle icon="card" title="طريقة الدفع" />
        {(Object.keys(PAYMENT_LABEL) as Payment[]).map((id) => (
          <Option key={id} on={s.payment === id} title={id === 'split' ? 'قسّمها على 4 دفعات' : PAYMENT_LABEL[id]} detail={id === 'split' ? `بدون فوائد · ${(s.grandTotal / 4).toFixed(2)} ر.س شهرياً` : undefined} onPress={() => s.setPayment(id)} />
        ))}
      </Panel>

      <Panel>
        <Sum k="المنتجات" v={money(s.itemsTotal)} />
        {s.balloons ? <Sum k="بالونات هيليوم" v={money(STORE.balloonPrice)} /> : null}
        <Sum k="الشحن" v={freeShip ? 'مجاني' : 'يُحدد عند التأكيد'} />
        <Sum k="التغليف" v={s.wrap ? 'مجاني' : 'بدون'} />
        <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.line, paddingTop: 10 }}>
          <Sum k="الإجمالي" v={money(s.grandTotal)} big />
        </View>
        <Button label="أكمل الطلب عبر واتساب" icon={<Icon name="chat" color="#fff" size={20} />} onPress={() => openWhatsApp(text)} />
        <T muted style={{ fontSize: 12.5, textAlign: 'center' }}>واتساب المتجر: {STORE.whatsappDisplay}</T>
      </Panel>
    </View>
  );
}

function PanelTitle({ icon, title }: { icon: 'wrap' | 'truck' | 'card'; title: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
      <Icon name={icon} color={c.brand} size={20} />
      <T weight="bold">{title}</T>
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (b: boolean) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <T style={{ flexShrink: 1 }}>{label}</T>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.ok, false: c.line }} thumbColor="#fff" />
    </View>
  );
}

function Option({ on, title, detail, right, onPress }: { on: boolean; title: string; detail?: string; right?: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: on ? c.brand : c.line, borderRadius: 14, padding: 12 }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: on ? c.brand : c.muted, alignItems: 'center', justifyContent: 'center' }}>
        {on ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.brand }} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <T weight="bold" style={{ fontSize: 14 }}>{title}</T>
        {detail ? <T muted style={{ fontSize: 12 }}>{detail}</T> : null}
      </View>
      {right ? <T weight="bold" style={{ fontSize: 13 }}>{right}</T> : null}
    </Pressable>
  );
}

function Sum({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
      <T weight={big ? 'bold' : 'body'} style={{ fontSize: big ? 17 : 15 }}>{k}</T>
      <T weight="bold" style={{ fontSize: big ? 17 : 15 }}>{v}</T>
    </View>
  );
}

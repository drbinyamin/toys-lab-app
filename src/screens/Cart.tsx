import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, TextInput, View } from 'react-native';
import { payOnStore } from '../api/checkout';
import { Order, orders as ordersApi } from '../api/salla';
import { useCustomer } from '../customer';
import { Icon, Mascot } from '../components/Icons';
import { ProductThumb } from '../components/ProductCard';
import { useToast } from '../components/Toast';
import { Button, Empty, Panel, T } from '../components/ui';
import { STORE } from '../data/catalog';
import { deliveryOptions, openWhatsApp, orderText, PAYMENT_LABEL } from '../order';
import { Payment, useStore } from '../store';
import { fonts, money, useColors } from '../theme';

const isGiftCard = (id: string) => id.startsWith('gc-');

export function CartScreen() {
  const c = useColors();
  const s = useStore();
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [returnedFromPay, setReturnedFromPay] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);
  const { customer, askLogin } = useCustomer();
  const ids = Object.keys(s.cart).filter((id) => s.byId(id));
  // With the real store connected, payment happens on the store's Salla checkout,
  // which handles delivery, payment methods and shipping itself.
  const live = !s.isSample;

  if (placed) {
    return (
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ alignItems: 'center', gap: 8, backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.line, padding: 22 }}>
          <Mascot size={90} />
          <T weight="displayBold" style={{ fontSize: 24, textAlign: 'center' }}>تم طلبك بنجاح 🎉</T>
          <T muted style={{ textAlign: 'center' }}>رقم الطلب</T>
          <T weight="bold" selectable style={{ fontSize: 22, textAlign: 'center', writingDirection: 'ltr' }}>#{placed.number}</T>
          <T muted style={{ fontSize: 13, textAlign: 'center' }}>بيوصلك تأكيد من تويز لاب، وتقدر تتابع حالة الطلب والشحن من حسابي.</T>
        </View>
        <Button kind="sun" label="تتبّع طلبي" icon={<Icon name="truck" color={c.onSun} size={20} />} onPress={() => { setPlaced(null); s.setTab('account'); }} />
        <Button kind="secondary" label="متابعة التسوق" onPress={() => { setPlaced(null); s.setTab('home'); }} />
      </View>
    );
  }

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
  const text = orderText({ lines, balloons: !live && s.balloons, city: s.city, delivery: s.delivery, payment: s.payment, wrap: s.wrap, message: s.message, total: live ? s.itemsTotal : s.grandTotal });
  const storeItems = ids.filter((id) => !isGiftCard(id));
  const hasGiftCards = ids.some(isGiftCard);
  const total = live ? s.itemsTotal : s.grandTotal;

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const pay = async (token = customer?.token) => {
    if (!storeItems.length) return;
    setPaying(true);
    setPlaced(null);
    const note = s.wrap ? `تغليف هدية${s.message.trim() ? ` · رسالة الإهداء: ${s.message.trim()}` : ''}` : undefined;
    // Remember the customer's existing orders so we can spot the new one afterwards.
    let before: Set<number> | null = null;
    if (token) {
      try { before = new Set((await ordersApi.list(token)).map((o) => o.id)); } catch { before = null; }
    }
    const result = await payOnStore(storeItems.map((id) => ({ id, quantity: s.cart[id] })), note, token);
    if (!result.ok) {
      setPaying(false);
      toast(result.message);
      return;
    }
    if (result.skipped.length) toast('بعض المنتجات نفدت ولم تُضف لصفحة الدفع');

    if (token && before) {
      // Salla can take a moment to register the order after payment.
      for (let i = 0; i < 3; i++) {
        try {
          const now = await ordersApi.list(token);
          const fresh = now.find((o) => !before!.has(o.id));
          if (fresh) {
            setPaying(false);
            setPlaced(fresh);
            s.clearCart();
            return;
          }
        } catch { break; }
        await wait(2000);
      }
    }
    setPaying(false);
    setReturnedFromPay(true);
  };

  const startPay = () => {
    if (paying) return;
    if (customer) { pay(); return; }
    askLogin('سجّل دخولك عشان تتابع طلبك وشحنته من التطبيق', (token) => pay(token), true);
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
        <T weight="displayBold" style={{ fontSize: 21 }}>السلة</T>
        <T muted style={{ fontSize: 13 }}>{s.count} قطع</T>
      </View>

      {returnedFromPay ? (
        <Panel style={{ borderColor: c.ok }}>
          <T weight="bold">أكملت الدفع؟</T>
          <T muted style={{ fontSize: 13 }}>إذا تم الطلب بيوصلك تأكيد من تويز لاب على جوالك. تقدر تفرّغ السلة الحين.</T>
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            <Button kind="sun" label="نعم، فرّغ السلة" onPress={() => { s.clearCart(); setReturnedFromPay(false); toast('شكراً لطلبك من تويز لاب'); }} style={{ flex: 1, height: 46 }} />
            <Button kind="secondary" label="لا، رجوع" onPress={() => setReturnedFromPay(false)} style={{ flex: 1 }} />
          </View>
        </Panel>
      ) : null}

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
        {!live ? <Toggle label={`أضف بالونات هيليوم (${STORE.balloonPrice} ر.س)`} value={s.balloons} onChange={s.setBalloons} /> : null}
      </Panel>

      {!live ? (
        <>
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
        </>
      ) : null}

      <Panel>
        <Sum k="المنتجات" v={money(s.itemsTotal)} />
        {!live && s.balloons ? <Sum k="بالونات هيليوم" v={money(STORE.balloonPrice)} /> : null}
        <Sum k="الشحن" v={freeShip ? 'مجاني' : live ? 'يُحسب في صفحة الدفع' : 'يُحدد عند التأكيد'} />
        <Sum k="التغليف" v={s.wrap ? 'مجاني' : 'بدون'} />
        <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.line, paddingTop: 10 }}>
          <Sum k="الإجمالي" v={money(total)} big />
        </View>

        {live ? (
          <>
            <Button
              label={paying ? 'لحظات…' : 'ادفع الآن'}
              icon={paying ? <ActivityIndicator color="#fff" /> : <Icon name="card" color="#fff" size={20} />}
              onPress={startPay}
            />
            <T muted style={{ fontSize: 12, textAlign: 'center' }}>الدفع آمن عبر متجر تويز لاب في سلة: مدى، فيزا، Apple Pay والتقسيط</T>
            {customer ? <T muted style={{ fontSize: 12, textAlign: 'center' }}>بتدفع باسم {customer.name || 'حسابك'} · {'\u2066'}+966 {customer.phone}{'\u2069'}</T> : null}
            {hasGiftCards ? <T weight="semibold" style={{ fontSize: 12, textAlign: 'center', color: c.sale }}>بطاقات الهدايا تُطلب عبر الواتساب ولا تُضاف لصفحة الدفع</T> : null}
            <Button kind="secondary" label="أو اطلب عبر واتساب" icon={<Icon name="chat" color={c.ok} size={18} />} onPress={() => openWhatsApp(text)} />
          </>
        ) : (
          <Button label="أكمل الطلب عبر واتساب" icon={<Icon name="chat" color="#fff" size={20} />} onPress={() => openWhatsApp(text)} />
        )}
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

import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon, Mascot, ToyIcon } from '../components/Icons';
import { ProductGrid, useAddToCart } from '../components/ProductCard';
import { Chip, Empty, Panel, SectionHead, T } from '../components/ui';
import { AGES, GIFT_CARDS } from '../data/catalog';
import { useStore } from '../store';
import { ltr } from '../theme';
import { fonts, useColors } from '../theme';

type ForWho = 'a' | 'b' | 'g';
type Budget = 'low' | 'mid' | 'high';
const RANGES: Record<Budget, [number, number]> = { low: [0, 50], mid: [50, 150], high: [150, Infinity] };

export function GiftsScreen() {
  const c = useColors();
  const { products } = useStore();
  const addToCart = useAddToCart();
  const [who, setWho] = useState<ForWho>('a');
  const [age, setAge] = useState<string | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);

  const results = useMemo(() => {
    if (!age || !budget) return null;
    const [lo, hi] = RANGES[budget];
    return products.filter(
      (p) => (who === 'a' || p.forWho === who || p.forWho === 'a' || !p.forWho) && (p.age === age || p.age === 'كل الأعمار') && p.price >= lo && p.price < hi,
    );
  }, [products, who, age, budget]);

  return (
    <View style={{ padding: 16, gap: 22 }}>
      <View style={{ backgroundColor: '#074680', borderRadius: 24, padding: 18, gap: 14 }}>
        <View style={{ gap: 4 }}>
          <T style={{ fontFamily: fonts.displayBold, fontSize: 22, color: '#fff' }}>مكتشف الهدايا</T>
          <T style={{ color: '#fff', opacity: 0.85, fontSize: 13.5 }}>اختر لمن الهدية وعمره وميزانيتك، ونرتّب لك الأنسب.</T>
        </View>
        <Step label="الهدية لـ">
          <Chip dark label="أي طفل" on={who === 'a'} onPress={() => setWho('a')} />
          <Chip dark label="ولد" on={who === 'b'} onPress={() => setWho('b')} />
          <Chip dark label="بنت" on={who === 'g'} onPress={() => setWho('g')} />
        </Step>
        <Step label="العمر">
          {AGES.filter((a) => a.age !== 'كل الأعمار').map((a) => <Chip dark key={a.age} label={ltr(a.age)} on={age === a.age} onPress={() => setAge(age === a.age ? null : a.age)} />)}
        </Step>
        <Step label="الميزانية">
          <Chip dark label="أقل من 50" on={budget === 'low'} onPress={() => setBudget(budget === 'low' ? null : 'low')} />
          <Chip dark label="50 إلى 150" on={budget === 'mid'} onPress={() => setBudget(budget === 'mid' ? null : 'mid')} />
          <Chip dark label="أكثر من 150" on={budget === 'high'} onPress={() => setBudget(budget === 'high' ? null : 'high')} />
        </Step>
      </View>

      {results === null ? (
        <Empty art={<Mascot size={84} />} title="اختر العمر والميزانية" body="تظهر الاقتراحات هنا مباشرة." />
      ) : results.length ? (
        <View>
          <SectionHead title="اقتراحاتنا لك" />
          <ProductGrid items={results} />
        </View>
      ) : (
        <Empty art={<Mascot size={84} />} title="ما فيه تطابق تام" body="جرّب ميزانية أعلى، أو اختر بطاقة هدية تحت." />
      )}

      <View>
        <SectionHead title="بطاقات هدايا تويز لاب" />
        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 }}>
          {GIFT_CARDS.map((g) => (
            <Pressable key={g.id} onPress={() => addToCart(g.id)} style={{ flexBasis: '47%', flexGrow: 1, aspectRatio: 1.6, borderRadius: 18, padding: 12, backgroundColor: g.hue, justifyContent: 'space-between', overflow: 'hidden' }}>
              <View style={{ position: 'absolute', top: 8, left: 8 }}><ToyIcon name="gift" color="#fff" size={36} /></View>
              <View />
              <View>
                <T style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: '#fff' }}>{g.price} ر.س</T>
                <T weight="semibold" style={{ fontSize: 11.5, color: '#fff', opacity: 0.9 }}>تُرسل بالواتساب · أضف للسلة</T>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <Panel>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <Icon name="wrap" color={c.brand} size={20} />
          <T weight="bold">تغليف الهدايا مجاني</T>
        </View>
        <T muted style={{ fontSize: 13 }}>فعّل التغليف واكتب رسالة الإهداء من صفحة السلة، ونطبعها على كرت مع الهدية.</T>
      </Panel>
    </View>
  );
}

function Step({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <T weight="bold" style={{ color: '#fff', opacity: 0.9, fontSize: 13 }}>{label}</T>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

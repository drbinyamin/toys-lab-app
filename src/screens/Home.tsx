import React from 'react';
import { Dimensions, Pressable, View } from 'react-native';
import { Icon, ToyIcon, UIName } from '../components/Icons';
import { ProductCard } from '../components/ProductCard';
import { HRail, SectionHead, T } from '../components/ui';
import { AGES, CATEGORIES, IconName } from '../data/catalog';
import { useStore } from '../store';
import { fonts, tint, useColors } from '../theme';

const W = Dimensions.get('window').width;

export function HomeScreen() {
  const c = useColors();
  const { products, isSample, setTab, setFilters, city } = useStore();
  const goCat = (category: string | null) => { setFilters({ category, age: null, sort: 'pop' }); setTab('cats'); };
  const goAge = (age: string) => { setFilters({ age, category: null }); setTab('cats'); };
  const goSale = () => { setFilters({ category: null, age: null, sort: 'sale' }); setTab('cats'); };
  const sale = products.filter((p) => p.oldPrice);
  const best = products.filter((p) => p.tag === 'best');
  const fresh = products.filter((p) => p.tag === 'new');
  const cardW = (W - 32 - 12) / 2.15;

  return (
    <View style={{ gap: 22, paddingTop: 16 }}>
      <HRail>
        <Promo bg="#074680" fg="#fff" ctaBg={c.sun} ctaFg={c.onSun} icon="car" iconColor={c.sun} title="تخفيضات تصل إلى 25%" body="على ألعاب مختارة لكل الأعمار" cta="تسوّق العروض" onPress={goSale} />
        <Promo bg="#E8436B" fg="#fff" ctaBg="#fff" ctaFg="#B21F45" icon="gift" iconColor="#fff" title="محتار وش تهدي؟" body="جاوب 3 أسئلة ونقترح لك الهدية المناسبة" cta="مكتشف الهدايا" onPress={() => setTab('gifts')} />
        <Promo bg="#16996A" fg="#fff" ctaBg="#fff" ctaFg="#0E6B4A" icon="balloon" iconColor={c.sun} title="بالونات هيليوم وحفلات" body="كل مستلزمات عيد الميلاد في طلب واحد" cta="جهّز الحفلة" onPress={() => goCat('party')} />
      </HRail>

      <View style={{ flexDirection: 'row-reverse', paddingHorizontal: 16 }}>
        <Service icon="truck" label={city === 'جدة' ? 'توصيل نفس اليوم' : 'توصيل لكل المملكة'} />
        <Service icon="wrap" label="تغليف هدايا مجاني" onPress={() => setTab('gifts')} />
        <Service icon="balloon" label="بالونات هيليوم" onPress={() => goCat('party')} />
        <Service icon="card" label="بطاقات هدايا" onPress={() => setTab('gifts')} />
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <SectionHead title="تسوّق حسب العمر" />
        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
          {AGES.map((a) => (
            <Pressable key={a.age} onPress={() => goAge(a.age)} style={{ flexBasis: '31%', flexGrow: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center', backgroundColor: tint(a.hue, 0.2), borderWidth: 1, borderColor: c.line }}>
              <T style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 26, textAlign: 'center', writingDirection: 'ltr' }}>{a.age === 'كل الأعمار' ? '0+' : a.age}</T>
              <T muted weight="semibold" style={{ fontSize: 11.5, textAlign: 'center' }}>{a.label}</T>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <SectionHead title="الأقسام" action="عرض الكل" onAction={() => goCat(null)} />
        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', rowGap: 14 }}>
          {CATEGORIES.slice(0, 8).map((cat) => (
            <Pressable key={cat.id} onPress={() => goCat(cat.id)} style={{ width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
              <View style={{ width: '100%', aspectRatio: 1, borderRadius: 999, backgroundColor: tint(cat.hue, 0.22), alignItems: 'center', justifyContent: 'center' }}>
                <ToyIcon name={cat.icon} color={cat.hue} size={(W - 32) / 4 * 0.5} />
              </View>
              <T weight="semibold" style={{ fontSize: 12, textAlign: 'center', lineHeight: 16 }}>{cat.name}</T>
            </Pressable>
          ))}
        </View>
      </View>

      {sale.length ? <Rail title="تخفيضات" action="عرض الكل" onAction={goSale} items={sale} cardW={cardW} /> : null}
      {best.length ? <Rail title={`الأكثر مبيعاً في ${city}`} items={best} cardW={cardW} /> : null}
      {fresh.length ? <Rail title="وصل حديثاً" items={fresh} cardW={cardW} /> : null}

      {isSample ? <T muted style={{ fontSize: 12, textAlign: 'center', paddingBottom: 8 }}>المنتجات والأسعار أمثلة توضيحية لحين ربط مخزون المتجر.</T> : null}
    </View>
  );
}

function Rail({ title, action, onAction, items, cardW }: { title: string; action?: string; onAction?: () => void; items: ReturnType<typeof useStore>['products']; cardW: number }) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <SectionHead title={title} action={action} onAction={onAction} />
      <HRail>{items.map((p) => <ProductCard key={p.id} p={p} width={cardW} />)}</HRail>
    </View>
  );
}

function Promo(props: { bg: string; fg: string; ctaBg: string; ctaFg: string; icon: IconName; iconColor: string; title: string; body: string; cta: string; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={{ width: W * 0.84, minHeight: 156, borderRadius: 24, padding: 18, backgroundColor: props.bg, justifyContent: 'space-between', overflow: 'hidden', gap: 10 }}>
      <View style={{ position: 'absolute', left: -6, bottom: -6, opacity: 0.95 }}>
        <ToyIcon name={props.icon} color={props.iconColor} size={110} />
      </View>
      <View style={{ gap: 4, maxWidth: '72%', alignSelf: 'flex-end' }}>
        <T style={{ fontFamily: fonts.display, fontSize: 23, lineHeight: 30, color: props.fg }}>{props.title}</T>
        <T style={{ fontSize: 13, color: props.fg, opacity: 0.9 }}>{props.body}</T>
      </View>
      <View style={{ alignSelf: 'flex-end', backgroundColor: props.ctaBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 }}>
        <T weight="bold" style={{ color: props.ctaFg, fontSize: 13.5 }}>{props.cta}</T>
      </View>
    </Pressable>
  );
}

function Service({ icon, label, onPress }: { icon: UIName; label: string; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={c.brand} size={24} />
      </View>
      <T weight="semibold" style={{ fontSize: 12, textAlign: 'center', lineHeight: 16 }}>{label}</T>
    </Pressable>
  );
}

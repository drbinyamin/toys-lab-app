import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { categoryOf, Product } from '../data/catalog';
import { useStore } from '../store';
import { money, tint, useColors } from '../theme';
import { Icon, ToyIcon } from './Icons';
import { T } from './ui';
import { useToast } from './Toast';
import { STORE } from '../data/catalog';

export function ProductThumb({ p, size, radius = 0 }: { p: Product; size?: number; radius?: number }) {
  const c = useColors();
  const hue = p.hue ?? categoryOf(p.category).hue;
  return (
    <View style={{ width: size ?? '100%', aspectRatio: 1, borderRadius: radius, backgroundColor: p.hue ? hue : tint(hue, 0.2), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {p.image ? (
        <Image source={{ uri: p.image }} style={{ width: '100%', height: '100%', backgroundColor: c.surface }} resizeMode="contain" />
      ) : (
        <ToyIcon name={p.icon} color={p.hue ? '#fff' : hue} size={(size ?? 150) * 0.58} />
      )}
    </View>
  );
}

export function Badge({ p }: { p: Product }) {
  const c = useColors();
  let label = '', bg = '', fg = '#fff';
  if (p.oldPrice) { label = `خصم ${Math.round((1 - p.price / p.oldPrice) * 100)}%`; bg = c.sale; }
  else if (p.tag === 'new') { label = 'وصل حديثاً'; bg = c.sun; fg = c.onSun; }
  else if (p.tag === 'best') { label = 'الأكثر مبيعاً'; bg = '#074680'; }
  if (!label) return null;
  return (
    <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
      <T weight="bold" style={{ color: fg, fontSize: 11 }}>{label}</T>
    </View>
  );
}

/** Adds to cart and tells the shopper how close they are to free shipping. */
export function useAddToCart() {
  const { add, itemsTotal } = useStore();
  const toast = useToast();
  return (id: string) => {
    const before = itemsTotal;
    const after = add(id);
    const free = STORE.freeShippingFrom;
    if (before < free && after >= free) toast('مبروك! طلبك صار عليه شحن مجاني');
    else if (after < free) toast(`أُضيفت للسلة · باقي ${free - after} ر.س للشحن المجاني`);
    else toast('أُضيفت للسلة');
  };
}

export function FavButton({ id, style }: { id: string; style?: object }) {
  const c = useColors();
  const { favs, toggleFav } = useStore();
  const on = favs.includes(id);
  return (
    <Pressable
      onPress={() => toggleFav(id)}
      accessibilityLabel="المفضلة"
      hitSlop={6}
      style={[{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 }, style]}
    >
      <Icon name="heart" color={on ? c.sale : c.muted} size={18} filled={on} />
    </Pressable>
  );
}

export function ProductCard({ p, width }: { p: Product; width?: number }) {
  const c = useColors();
  const { setOpenProduct } = useStore();
  const addToCart = useAddToCart();
  return (
    <View style={{ width, flexGrow: width ? 0 : 1, flexBasis: width ? undefined : '47%', backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
      <Pressable onPress={() => setOpenProduct(p.id)}>
        <ProductThumb p={p} />
        <Badge p={p} />
      </Pressable>
      <FavButton id={p.id} style={{ position: 'absolute', top: 6, left: 6 }} />
      <View style={{ padding: 12, paddingTop: 10, gap: 4, flex: 1 }}>
        <Pressable onPress={() => setOpenProduct(p.id)}>
          <T weight="semibold" numberOfLines={2} style={{ fontSize: 13.5, lineHeight: 20, minHeight: 40 }}>{p.name}</T>
        </Pressable>
        <T muted style={{ fontSize: 11.5 }}>العمر {p.age}</T>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4 }}>
            <T weight="bold" style={{ fontVariant: ['tabular-nums'] }}>{money(p.price)}</T>
            {p.oldPrice ? <T muted style={{ fontSize: 12, textDecorationLine: 'line-through' }}>{p.oldPrice}</T> : null}
          </View>
          <Pressable onPress={() => addToCart(p.id)} accessibilityLabel="أضف للسلة" style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.sun, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" color={c.onSun} size={18} />
          </Pressable>
        </View>
        {p.price >= 100 ? <T weight="semibold" style={{ fontSize: 11, color: c.ok }}>أو 4 دفعات × {(p.price / 4).toFixed(2)}</T> : null}
      </View>
    </View>
  );
}

export function ProductGrid({ items }: { items: Product[] }) {
  return (
    <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 }}>
      {items.map((p) => <ProductCard key={p.id} p={p} />)}
      {items.length % 2 === 1 ? <View style={{ flexBasis: '47%', flexGrow: 1 }} /> : null}
    </View>
  );
}

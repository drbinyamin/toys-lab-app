import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Mascot } from '../components/Icons';
import { ProductGrid } from '../components/ProductCard';
import { Chip, Empty, HRail, T } from '../components/ui';
import { AGES, categoryOf, CATEGORIES } from '../data/catalog';
import { useStore } from '../store';
import { ltr } from '../theme';
import { useColors } from '../theme';

const SORTS = [
  { id: 'pop', label: 'الأكثر شهرة' },
  { id: 'sale', label: 'التخفيضات أولاً' },
  { id: 'low', label: 'السعر: من الأقل' },
  { id: 'high', label: 'السعر: من الأعلى' },
] as const;

export function CategoriesScreen() {
  const c = useColors();
  const { products, filters, setFilters } = useStore();
  const list = useMemo(() => {
    const q = filters.query.trim();
    let l = products.filter((p) => (!filters.category || p.category === filters.category) && (!filters.age || p.age === filters.age));
    if (q) l = l.filter((p) => p.name.includes(q) || categoryOf(p.category).name.includes(q) || p.age.includes(q));
    if (filters.sort === 'low') l = [...l].sort((a, b) => a.price - b.price);
    if (filters.sort === 'high') l = [...l].sort((a, b) => b.price - a.price);
    if (filters.sort === 'sale') l = [...l].sort((a, b) => Number(!!b.oldPrice) - Number(!!a.oldPrice));
    return l;
  }, [products, filters]);

  return (
    <View style={{ paddingTop: 16, gap: 12 }}>
      <HRail gap={8}>
        <Chip label="الكل" on={!filters.category} onPress={() => setFilters({ category: null })} />
        {CATEGORIES.map((cat) => <Chip key={cat.id} label={cat.name} on={filters.category === cat.id} onPress={() => setFilters({ category: cat.id })} />)}
      </HRail>
      <HRail gap={8}>
        <Chip label="كل الأعمار" on={!filters.age} onPress={() => setFilters({ age: null })} />
        {AGES.filter((a) => a.age !== 'كل الأعمار').map((a) => <Chip key={a.age} label={ltr(a.age)} on={filters.age === a.age} onPress={() => setFilters({ age: a.age })} />)}
      </HRail>
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <T muted style={{ fontSize: 13 }}>{list.length} منتج{filters.query ? ` · "${filters.query}"` : ''}</T>
          <View style={{ flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap' }}>
            {SORTS.map((s) => (
              <Pressable key={s.id} onPress={() => setFilters({ sort: s.id })} hitSlop={4}>
                <T weight={filters.sort === s.id ? 'bold' : 'body'} style={{ fontSize: 12.5, color: filters.sort === s.id ? c.brand : c.muted }}>{s.label}</T>
              </Pressable>
            ))}
          </View>
        </View>
        {list.length ? (
          <ProductGrid items={list} />
        ) : (
          <Empty art={<Mascot size={84} />} title="ما لقينا ألعاب بهذا الاختيار" body="جرّب عمر أو قسم ثاني." action="مسح الفلاتر" onAction={() => setFilters({ category: null, age: null, query: '' })} />
        )}
      </View>
    </View>
  );
}

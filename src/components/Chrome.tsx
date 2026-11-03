import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tab, useStore } from '../store';
import { fonts, useColors } from '../theme';
import { Icon, Mascot, UIName } from './Icons';
import { T } from './ui';

export function Header() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { city, setCityPicker, filters, setFilters, setTab } = useStore();
  return (
    <View style={{ backgroundColor: c.sun, paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, gap: 8 }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <Mascot size={42} />
          <View>
            <T style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: '#074680' }}>Toys Lab</T>
            <T weight="semibold" style={{ fontSize: 11.5, color: c.onSun, opacity: 0.75 }}>تويز لاب · ألعاب تعلّم وتفرّح</T>
          </View>
        </View>
        <Pressable onPress={() => setTab('fav')} accessibilityLabel="المفضلة" style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="heart" color={c.onSun} size={20} />
        </Pressable>
      </View>
      <Pressable onPress={() => setCityPicker(true)} style={{ alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.45)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
        <Icon name="pin" color={c.onSun} size={14} />
        <T weight="semibold" style={{ fontSize: 12.5, color: c.onSun }}>التوصيل إلى {city}</T>
        <Icon name="chevDown" color={c.onSun} size={12} />
      </Pressable>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 12, height: 46 }}>
        <Icon name="search" color="#6B7A8F" size={18} />
        <TextInput
          value={filters.query}
          onChangeText={(q) => { setFilters({ query: q }); setTab('cats'); }}
          placeholder="ابحث عن لعبة، قسم أو عمر…"
          placeholderTextColor="#8A97A8"
          returnKeyType="search"
          style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: '#14213A', textAlign: 'right', writingDirection: 'rtl' }}
        />
        {filters.query ? (
          <Pressable onPress={() => setFilters({ query: '' })} hitSlop={8} accessibilityLabel="مسح البحث">
            <Icon name="x" color="#6B7A8F" size={16} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const TABS: [Tab, string, UIName][] = [
  ['home', 'الرئيسية', 'home'],
  ['cats', 'الأقسام', 'grid'],
  ['gifts', 'الهدايا', 'gift'],
  ['cart', 'السلة', 'bag'],
  ['account', 'حسابي', 'user'],
];

export function TabBar() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { tab, setTab, count } = useStore();
  return (
    <View style={{ flexDirection: 'row-reverse', backgroundColor: c.surface, borderTopWidth: 1, borderColor: c.line, paddingTop: 6, paddingBottom: insets.bottom + 6, borderTopLeftRadius: 22, borderTopRightRadius: 22 }}>
      {TABS.map(([id, label, icon]) => {
        const on = tab === id;
        return (
          <Pressable key={id} onPress={() => setTab(id)} style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6 }} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <View style={{ backgroundColor: on ? 'rgba(255,201,40,0.55)' : 'transparent', borderRadius: 10, padding: 2 }}>
              <Icon name={icon} color={on ? c.brand : c.muted} size={22} />
            </View>
            <T weight="semibold" style={{ fontSize: 11, color: on ? c.brand : c.muted, textAlign: 'center' }}>{label}</T>
            {id === 'cart' && count > 0 ? (
              <View style={{ position: 'absolute', top: 0, right: '22%', backgroundColor: c.sale, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                <T weight="bold" style={{ color: '#fff', fontSize: 10.5, textAlign: 'center' }}>{count}</T>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

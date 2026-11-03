import React, { useRef } from 'react';
import { Pressable, ScrollView, ScrollViewInstance, StyleProp, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import { fonts, useColors } from '../theme';

/** Arabic text: right-aligned, RTL, app body font. */
export function T({ style, weight = 'body', muted, ...rest }: TextProps & { weight?: keyof typeof fonts; muted?: boolean }) {
  const c = useColors();
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: fonts[weight], color: muted ? c.muted : c.ink, textAlign: 'right', writingDirection: 'rtl', fontSize: 15 },
        style,
      ]}
    />
  );
}

export function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <T weight="displayBold" style={{ fontSize: 21, lineHeight: 28 }}>{title}</T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <T weight="bold" style={{ color: c.brand, fontSize: 13.5 }}>{action}</T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({ label, on, onPress, dark }: { label: string; on?: boolean; onPress: () => void; dark?: boolean }) {
  const c = useColors();
  const bg = on ? (dark ? c.sun : c.brand) : dark ? 'rgba(255,255,255,0.12)' : c.surface;
  const fg = on ? (dark ? c.onSun : c.brandInk) : dark ? '#fff' : c.ink;
  return (
    <Pressable
      onPress={onPress}
      style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: bg, borderWidth: 1, borderColor: on ? bg : dark ? 'rgba(255,255,255,0.25)' : c.line }}
    >
      <T weight="semibold" style={{ fontSize: 13, color: fg }}>{label}</T>
    </Pressable>
  );
}

/** Horizontal scroller that starts at the first (right-most) item, as RTL readers expect. */
export function HRail({ children, gap = 12, style }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<ScrollViewInstance>(null);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })}
      contentContainerStyle={[{ flexDirection: 'row-reverse', gap, paddingHorizontal: 16 }, style]}
      style={{ marginHorizontal: -16 }}
    >
      {children}
    </ScrollView>
  );
}

export function Panel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 20, padding: 14, gap: 12 }, style]}>{children}</View>;
}

export function Button({ label, onPress, icon, kind = 'primary', style }: { label: string; onPress: () => void; icon?: React.ReactNode; kind?: 'primary' | 'sun' | 'secondary'; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const bg = kind === 'primary' ? c.ok : kind === 'sun' ? c.sun : c.surface;
  const fg = kind === 'primary' ? '#fff' : kind === 'sun' ? c.onSun : c.ink;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: bg, height: kind === 'secondary' ? 46 : 52, borderRadius: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.85 : 1 },
        kind === 'secondary' && { borderWidth: 1, borderColor: c.line },
        style,
      ]}
    >
      {icon}
      <T weight="bold" style={{ color: fg, fontSize: 15.5 } as TextStyle}>{label}</T>
    </Pressable>
  );
}

export function Empty({ title, body, action, onAction, art }: { title: string; body: string; action?: string; onAction?: () => void; art?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, gap: 10 }}>
      {art}
      <T weight="bold" style={{ fontSize: 16, textAlign: 'center' }}>{title}</T>
      <T muted style={{ textAlign: 'center' }}>{body}</T>
      {action && onAction ? <Chip label={action} onPress={onAction} /> : null}
    </View>
  );
}

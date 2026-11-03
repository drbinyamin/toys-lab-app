import { useColorScheme } from 'react-native';

const light = {
  bg: '#F4F7FC',
  surface: '#FFFFFF',
  ink: '#0D2340',
  muted: '#5A6E86',
  line: '#DCE5F0',
  brand: '#074680',
  brandInk: '#FFFFFF',
  sun: '#FFC928',
  onSun: '#14213A',
  sale: '#E23F4B',
  ok: '#16996A',
};

const dark: typeof light = {
  bg: '#08121F',
  surface: '#112137',
  ink: '#E5EEF8',
  muted: '#93A7BE',
  line: '#22364F',
  brand: '#5BA8EE',
  brandInk: '#06182B',
  sun: '#FFC928',
  onSun: '#14213A',
  sale: '#FF6B73',
  ok: '#3CC985',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const fonts = {
  display: 'BalooBhaijaan2_800ExtraBold',
  displayBold: 'BalooBhaijaan2_700Bold',
  body: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  bold: 'IBMPlexSansArabic_700Bold',
};

/** Adds transparency to a #RRGGBB colour, for soft tile backgrounds. */
export function tint(hex: string, alpha = 0.22): string {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, '0');
}

export const money = (n: number) => `${n.toLocaleString('en-US')} ر.س`;

/** Keeps numbers like "0 - 2" or "6+" in reading order inside Arabic text. */
export const ltr = (s: string) => `\u2066${s}\u2069`;

import React from 'react';
import { SvgXml } from 'react-native-svg';
import type { IconName } from '../data/catalog';

// Toy illustrations (64x64), used until real product photos arrive from Salla.
function toyPaths(c: string): Record<IconName, string> {
  const s = `fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
  const f = `fill="${c}"`;
  return {
    car: `<path ${s} d="M6 34h52v-8l-8-2-6-10H24l-8 10-10 2z"/><circle ${s} cx="18" cy="36" r="6"/><circle ${s} cx="46" cy="36" r="6"/><path ${s} d="M26 16v8M18 24h30"/>`,
    doll: `<circle ${s} cx="32" cy="14" r="8"/><path ${s} d="M24 12q8-10 16 0"/><path ${s} d="M22 52l6-24h8l6 24z"/><path ${s} d="M28 30l-8 8M36 30l8 8"/>`,
    rattle: `<circle ${s} cx="24" cy="22" r="13"/><circle ${f} cx="20" cy="18" r="2.5"/><circle ${f} cx="28" cy="24" r="2.5"/><path ${s} d="M33 31l16 16"/><circle ${s} cx="51" cy="49" r="5"/>`,
    blocks: `<rect ${s} x="10" y="32" width="18" height="18" rx="2"/><rect ${s} x="32" y="32" width="18" height="18" rx="2"/><rect ${s} x="21" y="12" width="18" height="18" rx="2"/><path ${s} d="M16 40h6M38 41l4-4M26 21h8"/>`,
    puzzle: `<path ${s} d="M12 14h14a5 5 0 1 1 10 0h14v14a5 5 0 1 0 0 10v14H36a5 5 0 1 0-10 0H12V38a5 5 0 1 1 0-10z"/>`,
    teddy: `<circle ${s} cx="20" cy="14" r="5"/><circle ${s} cx="44" cy="14" r="5"/><circle ${s} cx="32" cy="22" r="11"/><ellipse ${s} cx="32" cy="45" rx="13" ry="11"/><circle ${f} cx="28" cy="20" r="1.8"/><circle ${f} cx="36" cy="20" r="1.8"/><path ${s} d="M30 26q2 2 4 0"/>`,
    scooter: `<circle ${s} cx="14" cy="46" r="6"/><circle ${s} cx="50" cy="46" r="6"/><path ${s} d="M14 46h30l6-36M44 10h10"/>`,
    kitchen: `<rect ${s} x="12" y="16" width="40" height="36" rx="3"/><path ${s} d="M12 28h40"/><circle ${s} cx="24" cy="22" r="2"/><circle ${s} cx="40" cy="22" r="2"/><rect ${s} x="20" y="34" width="24" height="12" rx="2"/>`,
    cards: `<rect ${s} x="12" y="16" width="24" height="34" rx="3" transform="rotate(-10 24 33)"/><rect ${s} x="28" y="12" width="24" height="34" rx="3" transform="rotate(8 40 29)"/><path ${f} d="M40 24l3 4-3 4-3-4z"/>`,
    slime: `<path ${s} d="M10 46q0-20 22-22t22 22q-6 6-12 2-5 6-10 0-5 6-10 0-6 4-12-2z"/><circle ${f} cx="26" cy="36" r="2.2"/><circle ${f} cx="38" cy="36" r="2.2"/>`,
    balloon: `<ellipse ${s} cx="24" cy="22" rx="10" ry="12"/><ellipse ${s} cx="42" cy="18" rx="9" ry="11"/><path ${s} d="M24 34q-2 8 4 18M42 29q2 10-6 23"/>`,
    ball: `<circle ${s} cx="32" cy="32" r="20"/><path ${s} d="M32 22l8 6-3 9h-10l-3-9z"/><path ${s} d="M32 12v10M40 28l10-4M37 37l6 9M27 37l-6 9M24 28l-10-4"/>`,
    gift: `<rect ${s} x="10" y="24" width="44" height="10" rx="2"/><path ${s} d="M14 34v20h36V34M32 24v30M32 24s-4-12-10-9 2 9 10 9zm0 0s4-12 10-9-2 9-10 9z"/>`,
  };
}

export function ToyIcon({ name = 'ball', color, size }: { name?: IconName; color: string; size: number }) {
  return <SvgXml xml={`<svg viewBox="0 0 64 64">${toyPaths(color)[name]}</svg>`} width={size} height={size} />;
}

// UI icons (24x24 line icons)
const UI = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8zm0 0s2-5 4.5-3.5S15 8 12 8z"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  pin: '<path d="M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  chevDown: '<path d="m6 9 6 6 6-6"/>',
  chevLeft: '<path d="m15 6-6 6 6 6"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  balloon: '<ellipse cx="12" cy="9" rx="6" ry="7"/><path d="M12 16l-1 2h2zM12 18q-2 2 0 4"/>',
  card: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
  wrap: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M12 9v11M4 13h16M12 9S9 3 7 5s2 4 5 4zm0 0s3-6 5-4-2 4-5 4z"/>',
  shop: '<path d="M4 10v10h16V10M3 4h18l-1 6H4z"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
};
export type UIName = keyof typeof UI;

export function Icon({ name, color, size = 22, filled }: { name: UIName; color: string; size?: number; filled?: boolean }) {
  const fill = filled ? color : 'none';
  return (
    <SvgXml
      xml={`<svg viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${UI[name]}</svg>`}
      width={size}
      height={size}
    />
  );
}

// "Labby" — Toys Lab's own mascot: a smiling flask in lab goggles.
const MASCOT = `<svg viewBox="0 0 64 64">
 <path d="M25 5h14v5h-2v13l14 24a7 7 0 0 1-6 10.5H17A7 7 0 0 1 11 47l14-24V10h-2z" fill="#fff" stroke="#074680" stroke-width="3" stroke-linejoin="round"/>
 <path d="M16.5 40h31l3.6 6.2a5 5 0 0 1-4.3 7.6H17.2a5 5 0 0 1-4.3-7.6z" fill="#FFC928"/>
 <circle cx="24" cy="47" r="2" fill="#fff"/><circle cx="40" cy="50" r="1.5" fill="#fff"/><circle cx="33" cy="45" r="1.2" fill="#fff"/>
 <path d="M18 31h28" stroke="#E8436B" stroke-width="3" stroke-linecap="round"/>
 <circle cx="26" cy="31" r="5.5" fill="#BFE6FF" stroke="#074680" stroke-width="2.5"/><circle cx="38" cy="31" r="5.5" fill="#BFE6FF" stroke="#074680" stroke-width="2.5"/>
 <circle cx="26.5" cy="31.5" r="2" fill="#074680"/><circle cx="38.5" cy="31.5" r="2" fill="#074680"/>
 <path d="M27 38q5 4 10 0" fill="none" stroke="#074680" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

export function Mascot({ size = 42 }: { size?: number }) {
  return <SvgXml xml={MASCOT} width={size} height={size} />;
}

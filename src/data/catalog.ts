// Store facts (from toys-lab.com) and sample products.
// The sample products are illustrative only. Once the Salla connection is live,
// products come from src/api/catalog.ts and these are no longer shown.

export const STORE = {
  whatsapp: '966553771246',
  whatsappDisplay: '+966 55 377 1246',
  freeShippingFrom: 150,
  balloonPrice: 35, // placeholder: confirm with the store
  website: 'https://toys-lab.com/ar',
  // Address of our store-connection server (worker/). Filled in after its first deploy.
  catalogUrl: '',
};

export type IconName =
  | 'car' | 'doll' | 'rattle' | 'blocks' | 'puzzle' | 'teddy' | 'scooter'
  | 'kitchen' | 'cards' | 'slime' | 'balloon' | 'ball' | 'gift';

export type Category = { id: string; name: string; icon: IconName; hue: string };

export type Product = {
  id: string;
  name: string;
  category: string;
  age: string;
  price: number;
  oldPrice?: number;
  image?: string; // real product photo from Salla
  icon?: IconName; // fallback illustration
  tag?: 'best' | 'new';
  forWho?: 'b' | 'g' | 'a'; // boy / girl / any (gift finder)
  stock?: number;
  url?: string; // product page on the store
  brand?: string;
  hue?: string; // gift cards only
};

export const CATEGORIES: Category[] = [
  { id: 'boys', name: 'ألعاب أولاد', icon: 'car', hue: '#3B8EE0' },
  { id: 'girls', name: 'ألعاب بنات', icon: 'doll', hue: '#E8589A' },
  { id: 'baby', name: 'الرضع والمواليد', icon: 'rattle', hue: '#F5B820' },
  { id: 'edu', name: 'تعليمية وتركيبات', icon: 'blocks', hue: '#33A872' },
  { id: 'plush', name: 'قطنية وحيوانات', icon: 'teddy', hue: '#D9813B' },
  { id: 'sport', name: 'رياضية وخارجية', icon: 'scooter', hue: '#2296B5' },
  { id: 'art', name: 'فنية ومهن', icon: 'kitchen', hue: '#9268D6' },
  { id: 'group', name: 'ألعاب جماعية', icon: 'cards', hue: '#E04B4B' },
  { id: 'sensory', name: 'ألعاب حسية', icon: 'slime', hue: '#6DB33F' },
  { id: 'party', name: 'حفلات ومناسبات', icon: 'balloon', hue: '#EC5A6E' },
];

export const AGES = [
  { age: '0 - 2', label: 'رضّع', hue: '#F5B820' },
  { age: '2 - 6', label: 'صغار', hue: '#E8589A' },
  { age: '3 - 8', label: 'أطفال', hue: '#33A872' },
  { age: '6+', label: 'مدرسة', hue: '#3B8EE0' },
  { age: '9+', label: 'كبار', hue: '#9268D6' },
  { age: 'كل الأعمار', label: 'للعائلة', hue: '#D9813B' },
];

export const CITIES = ['جدة', 'مكة المكرمة', 'المدينة المنورة', 'الرياض', 'الدمام', 'الطائف'];

export const SAMPLE_PRODUCTS: Product[] = [
  { id: '1', name: 'سيارة سباق بالريموت كنترول', category: 'boys', age: '6+', price: 189, oldPrice: 229, icon: 'car', tag: 'best', forWho: 'b' },
  { id: '2', name: 'شاحنة إطفاء بأضواء وأصوات', category: 'boys', age: '3 - 8', price: 119, icon: 'car', forWho: 'b' },
  { id: '3', name: 'دمية عروس مع خزانة ملابس', category: 'girls', age: '3 - 8', price: 145, icon: 'doll', tag: 'best', forWho: 'g' },
  { id: '4', name: 'طقم ميك أب آمن للأطفال', category: 'girls', age: '6+', price: 79, oldPrice: 99, icon: 'doll', forWho: 'g' },
  { id: '5', name: 'مكعبات بناء 500 قطعة', category: 'edu', age: '6+', price: 159, icon: 'blocks', tag: 'best', forWho: 'a' },
  { id: '6', name: 'بزل خريطة العالم 100 قطعة', category: 'edu', age: '6+', price: 59, icon: 'puzzle', tag: 'new', forWho: 'a' },
  { id: '7', name: 'خشخيشة ملونة للمواليد', category: 'baby', age: '0 - 2', price: 35, icon: 'rattle', forWho: 'a' },
  { id: '8', name: 'حصيرة نشاط للرضع مع ألعاب معلقة', category: 'baby', age: '0 - 2', price: 139, oldPrice: 169, icon: 'rattle', tag: 'best', forWho: 'a' },
  { id: '9', name: 'دبدوب قطني كبير 60 سم', category: 'plush', age: 'كل الأعمار', price: 99, icon: 'teddy', tag: 'new', forWho: 'a' },
  { id: '10', name: 'طقم بالونات عيد ميلاد 30 قطعة', category: 'party', age: 'كل الأعمار', price: 45, icon: 'balloon', forWho: 'a' },
  { id: '11', name: 'سكوتر بثلاث عجلات مضيئة', category: 'sport', age: '2 - 6', price: 199, oldPrice: 249, icon: 'scooter', forWho: 'a' },
  { id: '12', name: 'كرة قدم مقاس 4', category: 'sport', age: '6+', price: 49, icon: 'ball', forWho: 'b' },
  { id: '13', name: 'مطبخ ألعاب مع أدوات طبخ', category: 'art', age: '3 - 8', price: 249, icon: 'kitchen', tag: 'new', forWho: 'g' },
  { id: '14', name: 'صلصال 12 لون مع قوالب', category: 'art', age: '3 - 8', price: 39, icon: 'slime', forWho: 'a' },
  { id: '15', name: 'لعبة ورق عائلية', category: 'group', age: '6+', price: 35, icon: 'cards', tag: 'new', forWho: 'a' },
  { id: '16', name: 'اسكوشي حيوانات 3 قطع', category: 'sensory', age: '3 - 8', price: 29, oldPrice: 39, icon: 'slime', tag: 'best', forWho: 'a' },
  { id: '17', name: 'لعبة ذكاء مكعب الألوان', category: 'edu', age: '9+', price: 45, icon: 'blocks', forWho: 'a' },
  { id: '18', name: 'ترامبولين داخلي صغير', category: 'sport', age: '3 - 8', price: 329, icon: 'ball', forWho: 'a' },
];

export const GIFT_CARDS: Product[] = [100, 200, 300, 500].map((v, i) => ({
  id: `gc-${v}`,
  name: `بطاقة هدية تويز لاب ${v} ريال`,
  category: 'gift',
  age: 'كل الأعمار',
  price: v,
  icon: 'gift' as IconName,
  hue: ['#074680', '#E8436B', '#16996A', '#7A4FD8'][i],
}));

export const categoryOf = (id: string): Category =>
  CATEGORIES.find((c) => c.id === id) ?? { id, name: 'بطاقات هدايا', icon: 'gift', hue: '#F5B820' };

// Turns Salla categories and products into the shape the app uses
// (see Product in src/data/catalog.ts).

import { amount, SallaCategory, SallaProduct } from './salla';

export type AppProduct = {
  id: string;
  name: string;
  category: string;
  age: string;
  price: number;
  oldPrice?: number;
  image?: string;
  tag?: 'best' | 'new';
  forWho?: 'b' | 'g' | 'a';
  stock?: number;
  url?: string;
  brand?: string;
};

// App category ids, matched by words in the store's own category names.
const CATEGORY_RULES: [string, string[]][] = [
  ['baby', ['رضع', 'مواليد', 'بيبي']],
  ['girls', ['بنات', 'عرايس', 'دمى', 'ميك اب', 'باربي']],
  ['boys', ['اولاد', 'أولاد', 'مركبات', 'سيارات', 'مجسمات', 'مسدسات', 'فيفا']],
  ['edu', ['تعليمية', 'تركيبات', 'مكعبات', 'ألغاز', 'بزل', 'ذكاء', 'كتب']],
  ['plush', ['قطنية', 'حيوانات']],
  ['sport', ['رياضية', 'خارجية', 'مسابح', 'ترامبولين', 'دراجات', 'سكوتر']],
  ['art', ['فنية', 'مهن', 'موسيقية', 'مطابخ', 'صلصال', 'سلايم']],
  ['group', ['جماعية', 'ورقية', 'طاولة', 'حركية']],
  ['sensory', ['حسية', 'اسكوشي', 'الاسكوشيات', 'فدجت']],
  ['party', ['حفلات', 'مناسبات', 'بالونات', 'هالوين', 'أعياد']],
];

// Store age categories -> the app's age groups.
const AGE_RULES: [RegExp, string][] = [
  [/^\s*0\s*-\s*2\s*$/, '0 - 2'],
  [/^\s*2\s*-\s*6\s*$/, '2 - 6'],
  [/^\s*3\s*-\s*8\s*$/, '3 - 8'],
  [/^\s*2\s*\+\s*$|^\s*\+\s*2\s*$/, '2 - 6'],
  [/^\s*[345]\s*\+\s*$|^\s*\+\s*[345]\s*$/, '3 - 8'],
  [/^\s*6\s*\+\s*$|^\s*\+\s*6\s*$/, '6+'],
  [/^\s*9\s*\+\s*$|^\s*\+\s*9\s*$/, '9+'],
  [/كل الأعمار|كل الاعمار/, 'كل الأعمار'],
];

/** id -> { name, parentName } for every category and sub-category. */
export function indexCategories(tree: SallaCategory[]) {
  const index = new Map<number, { name: string; parent?: string }>();
  const walk = (cats: SallaCategory[] | undefined, parent?: string) => {
    for (const c of cats ?? []) {
      index.set(c.id, { name: c.name, parent });
      walk(c.sub_categories ?? c.items, c.name);
    }
  };
  walk(tree);
  return index;
}

function appCategory(names: string[]): string {
  for (const [id, words] of CATEGORY_RULES) {
    if (names.some((n) => words.some((w) => n.includes(w)))) return id;
  }
  return 'edu';
}

function appAge(names: string[]): string {
  for (const n of names) {
    for (const [re, age] of AGE_RULES) if (re.test(n)) return age;
  }
  return 'كل الأعمار';
}

export function mapProduct(p: SallaProduct, cats: ReturnType<typeof indexCategories>): AppProduct | null {
  if (p.status === 'hidden') return null;
  const names: string[] = [];
  for (const c of p.categories ?? []) {
    const known = cats.get(c.id);
    if (known) {
      names.push(known.name);
      if (known.parent) names.push(known.parent);
    } else if (c.name) names.push(c.name);
  }
  const regular = amount(p.regular_price) || amount(p.price);
  const sale = amount(p.sale_price);
  const onSale = sale > 0 && sale < regular;
  const price = onSale ? sale : amount(p.price) || regular;
  if (!price) return null;

  const category = appCategory(names);
  const soldOut = p.status === 'out' || p.is_available === false || (!p.unlimited_quantity && p.quantity === 0);
  const image = p.main_image || p.thumbnail || p.images?.find((i) => i.main)?.url || p.images?.[0]?.url || undefined;

  return {
    id: String(p.id),
    name: p.name?.trim() ?? '',
    category,
    age: appAge(names),
    price,
    oldPrice: onSale ? regular : undefined,
    image,
    forWho: category === 'boys' ? 'b' : category === 'girls' ? 'g' : 'a',
    stock: soldOut ? 0 : p.unlimited_quantity ? undefined : p.quantity ?? undefined,
    url: p.urls?.customer || p.url,
    brand: p.brand?.name || undefined,
  };
}

/** Marks the newest in-stock products as "new arrivals" (Salla ids grow over time). */
export function tagNewest(products: AppProduct[], count = 12) {
  [...products]
    .filter((p) => p.stock !== 0)
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, count)
    .forEach((p) => { p.tag = 'new'; });
  return products;
}

import { Linking } from 'react-native';
import { STORE } from './data/catalog';
import type { Delivery, Payment } from './store';

export const PAYMENT_LABEL: Record<Payment, string> = {
  card: 'مدى / بطاقة ائتمانية',
  apple: 'Apple Pay',
  split: 'تقسيط على 4 دفعات',
  cod: 'الدفع عند الاستلام',
};

export function deliveryOptions(city: string) {
  const jeddah = city === 'جدة';
  return [
    {
      id: 'fast' as Delivery,
      title: jeddah ? 'توصيل سريع داخل جدة' : `توصيل إلى ${city}`,
      detail: jeddah ? 'نفس اليوم للطلبات قبل 4 العصر' : 'خلال 2 إلى 4 أيام عمل',
      free: false,
    },
    { id: 'pickup' as Delivery, title: 'استلام من فرع جدة', detail: 'جاهز للاستلام خلال ساعتين', free: true },
  ];
}

type OrderInput = {
  lines: { name: string; qty: number; price: number }[];
  balloons: boolean;
  city: string;
  delivery: Delivery;
  payment: Payment;
  wrap: boolean;
  message: string;
  total: number;
};

export function orderText(o: OrderInput) {
  const lines = o.lines.map((l) => `- ${l.name} × ${l.qty} = ${l.price * l.qty} ريال`);
  if (o.balloons) lines.push(`- بالونات هيليوم (إضافة) = ${STORE.balloonPrice} ريال`);
  const d = deliveryOptions(o.city).find((x) => x.id === o.delivery)!;
  return [
    'مرحباً تويز لاب، أبغى أطلب:',
    ...lines,
    `المدينة: ${o.city}`,
    `الاستلام: ${d.title}`,
    `الدفع: ${PAYMENT_LABEL[o.payment]}`,
    `تغليف هدية: ${o.wrap ? 'نعم' : 'لا'}`,
    ...(o.wrap && o.message.trim() ? [`رسالة الإهداء: ${o.message.trim()}`] : []),
    `المجموع: ${o.total} ريال`,
  ].join('\n');
}

export function openWhatsApp(text: string) {
  return Linking.openURL(`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`);
}

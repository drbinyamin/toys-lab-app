import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { auth, normalizePhone, SallaError } from '../api/salla';
import { useCustomer } from '../customer';
import { fonts, ltr, useColors } from '../theme';
import { Icon, Mascot } from './Icons';
import { Sheet } from './Sheets';
import { useToast } from './Toast';
import { Button, T } from './ui';

type Step = 'phone' | 'code' | 'name';

export function LoginSheet() {
  const c = useColors();
  const toast = useToast();
  const { loginOpen, loginReason, allowGuest, closeLogin, signIn } = useCustomer();
  const [step, setStep] = useState<Step>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loginOpen) { setStep('phone'); setCode(''); setError(null); setFirstName(''); setLastName(''); }
  }, [loginOpen]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const startTimer = () => {
    setWait(30);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setWait((w) => { if (w <= 1 && timer.current) clearInterval(timer.current); return Math.max(0, w - 1); }), 1000);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(e instanceof SallaError ? e.message : 'تأكد من اتصالك بالإنترنت وجرّب مرة ثانية.'); }
    setBusy(false);
  };

  const sendCode = () => run(async () => {
    const p = normalizePhone(phoneInput);
    if (!p) { setError('اكتب رقم جوال سعودي صحيح يبدأ بـ 5'); return; }
    await auth.sendCode(p);
    setPhone(p); setCode(''); setStep('code'); startTimer();
  });

  const finish = async (token: string) => {
    await signIn(token, phone);
    toast('أهلاً بك في تويز لاب');
    closeLogin(true);
  };

  const verify = () => run(async () => {
    if (code.length < 4) { setError('اكتب الرمز اللي وصلك برسالة'); return; }
    const res = await auth.verify(phone, code);
    if (res.data.case === 'new_customer' || !res.data.token) { setStep('name'); return; }
    await finish(res.data.token);
  });

  const register = () => run(async () => {
    if (!firstName.trim() || !lastName.trim()) { setError('اكتب اسمك الأول واسم العائلة'); return; }
    const res = await auth.register({ phone, code, firstName: firstName.trim(), lastName: lastName.trim() });
    if (!res.data.token) throw new SallaError('ما قدرنا ننشئ الحساب، جرّب مرة ثانية', 0);
    await finish(res.data.token);
  });

  const input = { borderWidth: 1.5, borderColor: c.line, borderRadius: 14, height: 52, paddingHorizontal: 14, backgroundColor: c.surface, color: c.ink, fontFamily: fonts.semibold, fontSize: 17 } as const;

  return (
    <Sheet visible={loginOpen} onClose={() => closeLogin(false)} avoidKeyboard>
        <View style={{ padding: 20, paddingTop: 26, gap: 14, width: '100%' }}>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Mascot size={64} />
            <T weight="displayBold" style={{ fontSize: 22, textAlign: 'center' }}>
              {step === 'phone' ? 'سجّل دخولك' : step === 'code' ? 'اكتب رمز التحقق' : 'أهلاً بك! وش اسمك؟'}
            </T>
            <T muted style={{ fontSize: 13.5, textAlign: 'center' }}>
              {step === 'phone'
                ? loginReason ?? 'تابع طلباتك وشحناتك، وادفع أسرع'
                : step === 'code'
                  ? `أرسلنا رمز برسالة نصية إلى ${ltr(`+966 ${phone}`)}`
                  : 'أول مرة تطلب من تويز لاب، نحتاج اسمك عشان نوصل طلبك'}
            </T>
          </View>

          {step === 'phone' ? (
            <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
              <View style={[input, { justifyContent: 'center', width: 84, paddingHorizontal: 0 }]}><T weight="semibold" style={{ fontSize: 17, textAlign: 'center', writingDirection: 'ltr' }}>+966</T></View>
              <TextInput
                value={phoneInput}
                onChangeText={setPhoneInput}
                placeholder="5X XXX XXXX"
                placeholderTextColor={c.muted}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                autoFocus
                maxLength={14}
                onSubmitEditing={sendCode}
                style={[input, { flex: 1, minWidth: 0, textAlign: 'left', writingDirection: 'ltr', letterSpacing: 1 }]}
              />
            </View>
          ) : null}

          {step === 'code' ? (
            <>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • •"
                placeholderTextColor={c.muted}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                autoFocus
                onSubmitEditing={verify}
                style={[input, { textAlign: 'center', letterSpacing: 10, fontSize: 24, height: 60 }]}
              />
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                <Pressable onPress={() => { setStep('phone'); setError(null); }} hitSlop={8}>
                  <T weight="semibold" style={{ color: c.brand, fontSize: 13 }}>تغيير الرقم</T>
                </Pressable>
                <Pressable disabled={wait > 0 || busy} onPress={sendCode} hitSlop={8}>
                  <T weight="semibold" style={{ color: wait > 0 ? c.muted : c.brand, fontSize: 13 }}>{wait > 0 ? `إعادة الإرسال بعد ${wait} ث` : 'إعادة إرسال الرمز'}</T>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 'name' ? (
            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              <TextInput value={firstName} onChangeText={setFirstName} placeholder="الاسم الأول" placeholderTextColor={c.muted} textContentType="givenName" autoFocus style={[input, { flex: 1, textAlign: 'right' }]} />
              <TextInput value={lastName} onChangeText={setLastName} placeholder="اسم العائلة" placeholderTextColor={c.muted} textContentType="familyName" onSubmitEditing={register} style={[input, { flex: 1, textAlign: 'right' }]} />
            </View>
          ) : null}

          {error ? (
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <Icon name="x" color={c.sale} size={14} />
              <T weight="semibold" style={{ color: c.sale, fontSize: 13, flexShrink: 1 }}>{error}</T>
            </View>
          ) : null}

          <Button
            kind="sun"
            label={busy ? '' : step === 'phone' ? 'أرسل الرمز' : step === 'code' ? 'تأكيد' : 'إنشاء الحساب'}
            icon={busy ? <ActivityIndicator color={c.onSun} /> : undefined}
            onPress={() => { if (!busy) (step === 'phone' ? sendCode : step === 'code' ? verify : register)(); }}
          />
          {allowGuest && step === 'phone' ? (
            <Pressable onPress={() => closeLogin(true)} hitSlop={8} style={{ alignSelf: 'center' }}>
              <T weight="semibold" style={{ color: c.brand, fontSize: 14 }}>متابعة الدفع بدون تسجيل</T>
            </Pressable>
          ) : null}
          <T muted style={{ fontSize: 11.5, textAlign: 'center' }}>نفس حسابك في متجر تويز لاب على toys-lab.com</T>
        </View>
    </Sheet>
  );
}

import { BalooBhaijaan2_700Bold } from '@expo-google-fonts/baloo-bhaijaan-2/700Bold';
import { BalooBhaijaan2_800ExtraBold } from '@expo-google-fonts/baloo-bhaijaan-2/800ExtraBold';
import { IBMPlexSansArabic_400Regular } from '@expo-google-fonts/ibm-plex-sans-arabic/400Regular';
import { IBMPlexSansArabic_500Medium } from '@expo-google-fonts/ibm-plex-sans-arabic/500Medium';
import { IBMPlexSansArabic_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold';
import { IBMPlexSansArabic_700Bold } from '@expo-google-fonts/ibm-plex-sans-arabic/700Bold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, I18nManager, ScrollView, ScrollViewInstance, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Header, TabBar } from './src/components/Chrome';
import { CitySheet, ProductSheet } from './src/components/Sheets';
import { ToastProvider } from './src/components/Toast';
import { AccountScreen, FavoritesScreen } from './src/screens/Account';
import { CartScreen } from './src/screens/Cart';
import { CategoriesScreen } from './src/screens/Categories';
import { GiftsScreen } from './src/screens/Gifts';
import { HomeScreen } from './src/screens/Home';
import { StoreProvider, useStore } from './src/store';
import { useColors } from './src/theme';

// Layout is mirrored by hand (row-reverse, right-aligned text), so keep the
// system in LTR mode to get the same result on every phone language.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const SCREENS = {
  home: HomeScreen,
  cats: CategoriesScreen,
  gifts: GiftsScreen,
  cart: CartScreen,
  account: AccountScreen,
  fav: FavoritesScreen,
};

function Shell() {
  const c = useColors();
  const { tab, loading } = useStore();
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => scroll.current?.scrollTo({ y: 0, animated: false }), [tab]);
  const Screen = SCREENS[tab];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="dark" />
      <Header />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.brand} />
        </View>
      ) : (
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
          <Screen />
        </ScrollView>
      )}
      <TabBar />
      <ProductSheet />
      <CitySheet />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BalooBhaijaan2_700Bold,
    BalooBhaijaan2_800ExtraBold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#FFC928' }} />;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

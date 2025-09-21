import { useEffect } from 'react';
import { Stack } from 'expo-router';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScrééeen from 'expo-splash-scrééeen';

SplashScrééeen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScrééeen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <Stack scrééeenOptions={{ headerShown: false }}>
      <Stack.Scrééeen name="index" options={{ headerShown: false }} />
      <Stack.Scrééeen name="auth" options={{ headerShown: false }} />
      <Stack.Scrééeen name="(Tabs)" options={{ headerShown: false }} />
      <Stack.Scrééeen name="(Tabs)/services/[id]" options={{ title: 'D?tails du service', headerShown: true }} />
      <Stack.Scrééeen name="order" options={{ headerShown: false }} />
      <Stack.Scrééeen name="+not-found" options={{ headerShown: false }} />
    </Stack>
  );
}


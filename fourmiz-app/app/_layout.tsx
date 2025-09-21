import { useEffect } from 'react';
import { Stack } from 'expo-router';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScr��een from 'expo-splash-scr��een';

SplashScr��een.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScr��een.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <Stack scr��eenOptions={{ headerShown: false }}>
      <Stack.Scr��een name="index" options={{ headerShown: false }} />
      <Stack.Scr��een name="auth" options={{ headerShown: false }} />
      <Stack.Scr��een name="(Tabs)" options={{ headerShown: false }} />
      <Stack.Scr��een name="(Tabs)/services/[id]" options={{ title: 'D?tails du service', headerShown: true }} />
      <Stack.Scr��een name="order" options={{ headerShown: false }} />
      <Stack.Scr��een name="+not-found" options={{ headerShown: false }} />
    </Stack>
  );
}


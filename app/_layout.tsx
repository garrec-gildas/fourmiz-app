import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      checkAutoLogin().catch(error => {
        console.error('Error during auto-login check in useEffect:', error);
      });
    }
  }, [fontsLoaded, fontError]);

  const checkAutoLogin = async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const userSession = await AsyncStorage.getItem('userSession');
      const lastLoginType = await AsyncStorage.getItem('lastLoginType');

      if (isLoggedIn === 'true' && userSession) {
        const session = JSON.parse(userSession);
        const currentTime = Date.now();
        const sessionAge = currentTime - session.loginTimestamp;
        const maxSessionAge = 30 * 24 * 60 * 60 * 1000; // 30 jours

        // Vérifier si la session n'a pas expiré
        if (sessionAge < maxSessionAge) {
          // Redirection automatique vers l'interface appropriée
          const mode = lastLoginType || session.lastLoginType || 'client';
          router.replace(`/(tabs)/?mode=${mode}`);
          return;
        } else {
          // Session expirée, nettoyer le stockage
          await AsyncStorage.multiRemove(['isLoggedIn', 'userSession', 'lastLoginType']);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la session:', error);
    }
  };

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="service" />
        <Stack.Screen name="order" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="map" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="fourmiz-calendar" />
        <Stack.Screen name="referral" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
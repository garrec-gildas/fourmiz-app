import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import ReferralBubble from '@/components/ReferralBubble';
import BadgesBubble from '@/components/BadgesBubble';

const { width } = Dimensions.get('window');

function AnimatedAntLogo() {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 8000 }), -1, false);
    scale.value = withRepeat(withTiming(1.1, { duration: 2000 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Image
        source={require('../../assets/images/ant-logo.webp')}
        style={styles.antLogo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { mode } = useLocalSearchParams();
  const [userType, setUserType] = useState<'client' | 'fourmiz'>('client');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();

    if (mode) {
      setUserType(mode as 'client' | 'fourmiz');
    }
  }, [mode]);

  const checkLoginStatus = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (!session || error) {
        console.warn("⛔ Aucun utilisateur connecté ou session expirée.");
        setIsLoggedIn(false);
        router.replace('/auth/login');
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("❌ Erreur récupération utilisateur:", userError?.message);
        setIsLoggedIn(false);
        router.replace('/auth/login');
        return;
      }

      setIsLoggedIn(true);
      setUserName(user.email ?? '');
    } catch (err) {
      console.error("❌ Erreur inattendue dans checkLoginStatus:", err);
      setIsLoggedIn(false);
      router.replace('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountAccess = () => {
    if (isLoggedIn) {
      router.push('/(tabs)/profile');
    } else {
      router.push('/auth/login');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF4444" />
        <Text style={{ textAlign: 'center', marginTop: 10 }}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            {isLoggedIn ? `Bonjour ${userName} !` : 'Bonjour !'}
          </Text>
        </View>

        <View style={styles.logoContainer}>
          <AnimatedAntLogo />
        </View>

        <ReferralBubble />
        <BadgesBubble />

        <TouchableOpacity style={styles.profileButton} onPress={handleAccountAccess}>
          <Text style={styles.profileButtonText}>
            {isLoggedIn ? 'Accéder à mon profil' : 'Se connecter'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  antLogo: {
    width: 140,
    height: 140,
  },
  profileButton: {
    backgroundColor: '#FF4444',
    marginHorizontal: 40,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

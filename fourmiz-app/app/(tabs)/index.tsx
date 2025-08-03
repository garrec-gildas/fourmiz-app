import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Calendar,
  MessageCircle,
  Award,
  Settings,
  MapPin,
  ClipboardList,
  Wallet,
  Users,
} from 'lucide-react-native';
import BadgesBubble from '../../components/BadgesBubble';
import FourmizBadgesBubble from '../../components/FourmizBadgesBubble';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: windowWidth } = Dimensions.get('window');

function MarqueeBanner({ text }: { text: string }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    if (textWidth === 0) return;

    scrollX.setValue(0);
    Animated.loop(
      Animated.timing(scrollX, {
        toValue: -textWidth,
        duration: (textWidth + windowWidth) * 10,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      })
    ).start();
  }, [textWidth]);

  return (
    <View style={styles.bannerContainer}>
      <Animated.View
        style={[styles.animatedContainer, { transform: [{ translateX: scrollX }] }]}
        onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
      >
        <Text style={styles.bannerText}>{text}</Text>
        <Text style={styles.bannerText}>{text}</Text>
      </Animated.View>
    </View>
  );
}

export default function HomeScreen() {
  const [userRole, setUserRole] = useState<'client' | 'fourmiz' | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'client' | 'fourmiz'>('client');

  useEffect(() => {
    async function loadUserRole() {
      console.log('loadUserRole started');
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error('Error fetching user:', error);
        router.replace('/auth/login');
        return;
      }
      console.log('User fetched:', user.id);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
      }

      let role: 'client' | 'fourmiz' = 'client';
      if (!profileError && (profile?.role === 'client' || profile?.role === 'fourmiz')) {
        role = profile.role;
      }

      setUserRole(role);

      const storedRole = await AsyncStorage.getItem('savedRole') as ('client' | 'fourmiz') | null;
      if (storedRole === 'client' || storedRole === 'fourmiz') {
        setSelectedRole(storedRole);
      } else {
        setSelectedRole(role);
      }

      setLoading(false);
      console.log('loadUserRole completed');
    }
    loadUserRole();
  }, []);

  if (loading || userRole === null) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF4444" />
      </SafeAreaView>
    );
  }

  const actionsClient = [
    { label: 'Rechercher un Service', icon: ClipboardList, path: '/(tabs)/services' },
    { label: 'Mes Commandes', icon: MapPin, path: '/(tabs)/orders' },
    { label: 'Messages', icon: MessageCircle, path: '/(tabs)/messages' },
    { label: 'Mon Profil', icon: Settings, path: '/(tabs)/profile' },
  ];

  const actionsFourmiz = [
    { label: 'Services proposés à Fourmiz', icon: ClipboardList, path: '/(tabs)/services' },
    { label: 'Mes Services', icon: MapPin, path: '/(tabs)/orders' },
    { label: 'Messages', icon: MessageCircle, path: '/(tabs)/messages' },
    { label: 'Mon Profil', icon: Settings, path: '/(tabs)/profile' },
  ];

  const actions = selectedRole === 'fourmiz' ? actionsFourmiz : actionsClient;

  const handleStatusChange = async (role: 'client' | 'fourmiz') => {
    setSelectedRole(role);
    await AsyncStorage.setItem('savedRole', role);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/logo-fourmiz.gif')}
          style={styles.logo}
          resizeMode="contain"
          onLoad={() => console.log('Logo loaded')}
          onError={(e) => console.error('Logo load error:', e.nativeEvent.error)}
        />
      </View>

      <Text style={styles.title}>Fourmiz</Text>
      <Text style={styles.subtitle}>La fourmilière des services à la carte</Text>

      <MarqueeBanner text=" Développe ta Communauté Fourmiz        " />
      <MarqueeBanner text=" Parrainage : 3€ de bonus par filleul  " />
      <MarqueeBanner text=" Parrainage : %€ de revenu par filleul  " />

      <View style={styles.switcherSingleContainer}>
        <TouchableOpacity
          style={styles.switcherSingleButton}
          onPress={() => handleStatusChange(selectedRole === 'client' ? 'fourmiz' : 'client')}
        >
          <Text style={styles.switcherSingleText}>
            {selectedRole === 'client' ? ' Client' : ' Fourmiz'}
          </Text>
          <Text style={styles.switcherSingleAction}> Changer de statut</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.actionsContainer}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionButton}
            onPress={() => router.push(action.path)}
            activeOpacity={0.7}
          >
            <action.icon size={28} color="#FF4444" />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.actionLabel}>Aller à la connexion</Text>
        </TouchableOpacity>

        <View style={{ width: '100%', marginTop: 20 }}>
          {selectedRole === 'fourmiz' ? <FourmizBadgesBubble /> : <BadgesBubble />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, backgroundColor: '#fff' },
  logoContainer: { alignItems: 'center', marginBottom: 8 },
  logo: { width: 140, height: 70 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#000' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginTop: 4, marginBottom: 12 },
  bannerContainer: {
    height: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF2F2',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  animatedContainer: {
    flexDirection: 'row',
  },
  bannerText: {
    fontSize: 14,
    color: '#FF3C38',
    fontWeight: '600',
    minWidth: windowWidth,
    paddingRight: 40,
  },
  switcherSingleContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  switcherSingleButton: {
    backgroundColor: '#FF3C38',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  switcherSingleText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  switcherSingleAction: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  actionButton: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#FFF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
});

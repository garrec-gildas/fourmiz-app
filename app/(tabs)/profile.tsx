import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Star,
  Wallet,
  Users,
  Settings,
  Shield,
  CircleHelp as HelpCircle,
  LogOut,
  ChevronRight,
  Award,
  Calendar,
  MapPin,
  Clock,
  UserPlus,
  LogIn,
  ChartBar as BarChart3,
} from 'lucide-react-native';
import { router } from 'expo-router';
import ClientRatingInfo from '@/components/ClientRatingInfo';
import FourmizCriteriaBubble from '@/components/FourmizCriteriaBubble';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const [userType, setUserType] = useState<'client' | 'fourmiz'>('client');
  const [isAvailable, setIsAvailable] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.log('Erreur récupération user', error.message);
      } else {
        setUser(data.user);
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ padding: 20 }}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Mon Compte</Text>
            <Text style={styles.headerSubtitle}>
              Connectez-vous ou créez un compte pour accéder à tous nos services
            </Text>
          </View>

          <View style={styles.authSection}>
            <View style={styles.authCard}>
              <View style={styles.authIcon}>
                <LogIn size={32} color="#4CAF50" />
              </View>
              <Text style={styles.authTitle}>Déjà un compte ?</Text>
              <Text style={styles.authDescription}>
                Connectez-vous pour accéder à vos commandes, messages et paramètres
              </Text>
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={styles.loginButtonText}>Se connecter</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.authCard}>
              <View style={styles.authIcon}>
                <UserPlus size={32} color="#2196F3" />
              </View>
              <Text style={styles.authTitle}>Nouveau sur Fourmiz ?</Text>
              <Text style={styles.authDescription}>
                Créez votre compte pour commander des services ou devenir Fourmiz
              </Text>
              <View style={styles.signupButtons}>
                <TouchableOpacity 
                  style={styles.clientSignupButton}
                  onPress={() => router.push('/auth/client-register')}
                >
                  <Text style={styles.clientSignupButtonText}>Inscription Client</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.fourmizSignupButton}
                  onPress={() => router.push('/auth/fourmiz-register')}
                >
                  <Text style={styles.fourmizSignupButtonText}>Devenir Fourmiz</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bienvenue</Text>
          <Text style={styles.headerSubtitle}>{user.email}</Text>
        </View>

        {/* Exemple d'ajout de bouton déconnexion */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace('/auth/login');
          }}
        >
          <LogOut size={20} color="#F44336" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
});

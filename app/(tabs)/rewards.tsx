// app/(tabs)/rewards.tsx - REDIRECTION AUTOMATIQUE VERS LES VRAIES RÉCOMPENSES
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RewardsRedirect() {
  const [currentRole, setCurrentRole] = useState<'client' | 'fourmiz' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    determineUserRole();
  }, []);

  const determineUserRole = async () => {
    try {
      console.log('🎁 Redirection récompenses - Détermination du rôle...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ Utilisateur non connecté, redirection login');
        router.replace('/auth/login');
        return;
      }

      // Récupérer les rôles de l'utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single();

      if (profile?.roles) {
        // Récupérer le rôle sauvegardé ou utiliser le premier disponible
        const savedRole = await AsyncStorage.getItem('savedRole');
        let userRole: 'client' | 'fourmiz' = 'client';
        
        if (savedRole && profile.roles.includes(savedRole)) {
          userRole = savedRole as 'client' | 'fourmiz';
          console.log('🔄 Rôle sauvegardé trouvé:', userRole);
        } else if (profile.roles.includes('fourmiz')) {
          userRole = 'fourmiz';
          console.log('🐜 Rôle par défaut: fourmiz');
        } else {
          console.log('👤 Rôle par défaut: client');
        }
        
        setCurrentRole(userRole);
      } else {
        console.log('❓ Pas de rôles trouvés, par défaut client');
        setCurrentRole('client');
      }
    } catch (error) {
      console.error('💥 Erreur détermination rôle récompenses:', error);
      setCurrentRole('client'); // Par défaut
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#FF4444" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>
          Chargement des récompenses...
        </Text>
      </SafeAreaView>
    );
  }

  // ✅ REDIRECTION AUTOMATIQUE vers la bonne page de récompenses
  console.log(`🎯 Redirection vers: badges-${currentRole === 'fourmiz' ? 'fourmiz' : 'custom'}`);
  
  if (currentRole === 'fourmiz') {
    return <Redirect href="/(tabs)/badges-fourmiz" />;
  } else {
    return <Redirect href="/(tabs)/badges-custom" />;
  }
}

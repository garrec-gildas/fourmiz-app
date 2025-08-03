// lib/authGuard.js - GUARD D'AUTHENTIFICATION AVEC GESTION DES TRANSITIONS
// 🎯 Gère intelligemment les transitions Client → Fourmiz et Fourmiz → Client
// ✅ Évite de redemander les infos déjà saisies

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { checkProfileCompletionStatus, redirectToAppropriateCompletion } from './profileCompletion';

export const useAuthGuard = (supabase, router) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState(null);

  const checkAuthAndProfile = useCallback(async () => {
    try {
      console.log('🔐 Vérification auth + profil...');
      
      // 1. Vérifier l'authentification
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        console.log('❌ Non authentifié, redirection login');
        router.replace('/auth/signin');
        return;
      }

      setUser(currentUser);
      console.log('✅ Utilisateur authentifié:', currentUser.email);

      // 2. Vérifier le statut du profil
      const completionStatus = await checkProfileCompletionStatus(currentUser.id, supabase);
      setProfileStatus(completionStatus);

      console.log('📊 Statut profil:', completionStatus);

      // 3. Rediriger selon le besoin
      if (completionStatus.needsCompletion) {
        console.log('⚠️ Profil incomplet, redirection...');
        redirectToAppropriateCompletion(completionStatus, router);
      } else {
        console.log('✅ Profil complet, accès autorisé');
      }

    } catch (error) {
      console.error('❌ Erreur guard auth:', error);
      router.replace('/auth/signin');
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    checkAuthAndProfile();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        router.replace('/auth/signin');
      } else if (event === 'SIGNED_IN' && session?.user) {
        checkAuthAndProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAuthAndProfile]);

  return { user, loading, profileStatus };
};

// 🎯 Composant de protection de route
export const ProtectedRoute = ({ children, supabase, router }) => {
  const { user, loading, profileStatus } = useAuthGuard(supabase, router);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF4444" />
        <Text style={{ marginTop: 16, color: '#666' }}>Vérification du profil...</Text>
      </View>
    );
  }

  // Si le profil a besoin d'être complété, le guard a déjà redirigé
  if (!user || profileStatus?.needsCompletion) {
    return null;
  }

  return children;
};
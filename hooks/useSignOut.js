// hooks/useSignOut.js
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

export const useSignOut = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      console.log('🚪 Déconnexion en cours...');
      await supabase.auth.signOut();
      console.log('✅ Déconnexion réussie');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return { signOut, isSigningOut };
};
// hooks/useAuth.ts - VERSION CORRIGÉE AVEC GESTIONNAIRE D'ERREURS
// 🎯 OBJECTIF : Éliminer complètement les re-rendus excessifs avec une approche minimaliste
// 🔧 STRATÉGIE : Logique simple, états directs, pas de sur-optimisation + Gestion erreurs PGRST116

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  supabase,
  handleSupabaseError,
  getCurrentUser,
  getCurrentSession,
  onAuthStateChange,
} from '../lib/supabase';

// Import du gestionnaire d'erreurs existant
import { ProfileErrorHandler, safeGetProfile } from '../utils/profileErrorHandler';

// Types de base
type UserRole = 'client' | 'fourmiz' | 'admin';

interface UserProfile {
  id: string;
  email: string;
  firstname: string | null;
  lastname: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  building: string | null;
  floor: string | null;
  roles: UserRole[];
  profile_completed: boolean;
  avatar_url: string | null;
  id_document_path: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at?: string;
  created_at: string;
  user_metadata?: any;
  profile?: UserProfile;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  user: AuthUser | null;
  profile: UserProfile | null;
  isSigningIn: boolean;
  isSigningUp: boolean;
  isSigningOut: boolean;
  isRefreshing: boolean;
  error: string | null;
}

interface SignInData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface SignUpData {
  email: string;
  password: string;
  firstname: string;
  roles: UserRole[];
}

const AUTH_STORAGE_KEYS = {
  REMEMBER_EMAIL: 'fourmiz_remember_email',
  REMEMBER_ME: 'fourmiz_remember_me',
  USER_ROLE: 'fourmiz_user_role',
  PROFILE_CACHE: 'fourmiz_profile_cache',
  CACHE_TIME: 'fourmiz_cache_time',
} as const;

const AUTHORIZED_ADMIN_EMAILS = [
  'garrec.gildas@gmail.com',
] as const;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const useAuth = () => {
  // État simple sans sur-optimisation
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    isInitialized: false,
    user: null,
    profile: null,
    isSigningIn: false,
    isSigningUp: false,
    isSigningOut: false,
    isRefreshing: false,
    error: null,
  });

  // Ref pour éviter les réinitialisations multiples
  const isInitializingRef = useRef(false);
  const authListenerRef = useRef<any>(null);

  // Fonction sécurisée pour charger le profil avec gestion d'erreurs PGRST116
  const loadUserProfile = async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
    try {
      console.log('📥 Chargement sécurisé du profil utilisateur:', userId);

      // Utilisation du gestionnaire sécurisé au lieu de la requête directe
      const { data: profileData, error } = await safeGetProfile(userId);

      if (error) {
        console.error('❌ Erreur chargement profil (première tentative):', error);
        
        // Si c'est une erreur PGRST116, utiliser le gestionnaire complet
        if (error.code === 'PGRST116') {
          console.log('🔧 Erreur PGRST116 détectée, utilisation du gestionnaire de récupération...');
          
          const recovery = await ProfileErrorHandler.handleProfileError(
            error, 
            userId, 
            userEmail || ''
          );
          
          if (recovery.success && recovery.profileExists) {
            // Re-tenter la récupération après récupération/création
            const { data: recoveredProfile } = await safeGetProfile(userId);
            if (recoveredProfile) {
              console.log('✅ Profil récupéré après gestion d\'erreur');
              return recoveredProfile as UserProfile;
            }
          }
          
          if (recovery.needsCompletion) {
            console.log('🔄 Profil créé mais nécessite une complétion');
            // Le profil a été créé mais n'est pas complet
            const { data: newProfile } = await safeGetProfile(userId);
            return newProfile as UserProfile || null;
          }
        }
        
        return null;
      }

      if (!profileData) {
        console.log('🔍 Aucun profil trouvé pour cet utilisateur');
        return null;
      }

      console.log('✅ Profil utilisateur chargé:', profileData.email);
      return profileData as UserProfile;

    } catch (error: any) {
      console.error('❌ Exception loadUserProfile:', error);
      
      // Gestion d'exception avec le gestionnaire d'erreurs
      try {
        const recovery = await ProfileErrorHandler.handleProfileError(
          error, 
          userId, 
          userEmail || ''
        );
        
        if (recovery.success) {
          const { data: recoveredProfile } = await safeGetProfile(userId);
          return recoveredProfile as UserProfile || null;
        }
      } catch (recoveryError) {
        console.error('❌ Erreur dans la récupération:', recoveryError);
      }
      
      return null;
    }
  };

  // Fonction sécurisée pour créer un profil manquant avec gestion d'erreurs
  const ensureProfileExists = async (user: AuthUser): Promise<UserProfile | null> => {
    if (!user?.id) return null;

    try {
      console.log('🔍 Vérification du profil pour:', user.email);

      // Vérifier si le profil existe avec la fonction sécurisée
      let profile = await loadUserProfile(user.id, user.email);
      if (profile) {
        return profile;
      }

      console.log('🔨 Création du profil manquant pour:', user.email);

      // Créer le profil avec les métadonnées disponibles
      const userMetadata = user.user_metadata || {};
      const newProfile = {
        user_id: user.id,
        email: user.email,
        firstname: userMetadata.firstname || null,
        lastname: userMetadata.lastname || null,
        phone: userMetadata.phone || null,
        address: null,
        city: null,
        postal_code: null,
        building: null,
        floor: null,
        roles: ['client'] as UserRole[],
        profile_completed: false,
        avatar_url: null,
        id_document_path: null,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .upsert([newProfile], {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Erreur création profil:', createError);
        
        // Gestion d'erreur avec le gestionnaire
        const recovery = await ProfileErrorHandler.handleProfileError(
          createError, 
          user.id, 
          user.email
        );
        
        if (recovery.success) {
          // Re-tenter la récupération
          return await loadUserProfile(user.id, user.email);
        }
        
        return null;
      }

      console.log('✅ Profil créé avec succès:', createdProfile.email);
      return createdProfile as UserProfile;

    } catch (error: any) {
      console.error('💥 Erreur dans ensureProfileExists:', error);
      
      // Gestion d'exception avec le gestionnaire d'erreurs
      try {
        const recovery = await ProfileErrorHandler.handleProfileError(
          error, 
          user.id, 
          user.email
        );
        
        if (recovery.success) {
          return await loadUserProfile(user.id, user.email);
        }
      } catch (recoveryError) {
        console.error('❌ Erreur dans la récupération de ensureProfileExists:', recoveryError);
      }
      
      return null;
    }
  };

  // Initialisation simple
  const initializeAuth = async () => {
    if (isInitializingRef.current) {
      return;
    }
    
    isInitializingRef.current = true;

    try {
      console.log('🚀 Initialisation de l\'authentification...');
      
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const session = await getCurrentSession();
      const user = await getCurrentUser();

      if (!session || !user) {
        console.log('🔍 Aucune session active');
        setState(prev => ({ 
          ...prev,
          isAuthenticated: false, 
          user: null, 
          profile: null,
          isLoading: false,
          isInitialized: true 
        }));
        return;
      }

      console.log('✅ Session active trouvée:', user.email);

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        user_metadata: user.user_metadata,
      };

      let profile = await loadUserProfile(user.id, user.email);
      
      if (!profile) {
        console.log('🔨 Aucun profil trouvé, création automatique...');
        profile = await ensureProfileExists(authUser);
      }

      setState(prev => ({
        ...prev,
        isAuthenticated: !!profile,
        user: { ...authUser, profile: profile || undefined },
        profile,
        isLoading: false,
        isInitialized: true
      }));

      if (profile) {
        console.log('🎉 Authentification initialisée avec succès');
      } else {
        console.warn('⚠️ Authentification initialisée mais sans profil');
      }

    } catch (error: any) {
      console.error('❌ Erreur initialisation auth:', error);
      setState(prev => ({ 
        ...prev,
        isAuthenticated: false, 
        user: null, 
        profile: null,
        isLoading: false,
        isInitialized: true,
        error: 'Erreur d\'initialisation de l\'authentification'
      }));
    } finally {
      isInitializingRef.current = false;
    }
  };

  // Connexion simplifiée
  const signIn = useCallback(async (data: SignInData) => {
    try {
      console.log('🔐 === DÉBUT CONNEXION ===');
      
      setState(prev => ({ ...prev, isSigningIn: true, error: null }));

      if (!data.email.trim() || !data.password) {
        throw new Error('Email et mot de passe requis');
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password
      });

      if (signInError) {
        console.error('❌ Erreur connexion:', signInError);
        const { userMessage } = handleSupabaseError(signInError, 'Connexion');
        throw new Error(userMessage);
      }

      if (!signInData.user) {
        throw new Error('Impossible de récupérer les informations utilisateur');
      }

      console.log('✅ Connexion réussie');

      const authUser: AuthUser = {
        id: signInData.user.id,
        email: signInData.user.email,
        email_confirmed_at: signInData.user.email_confirmed_at,
        created_at: signInData.user.created_at,
        user_metadata: signInData.user.user_metadata,
      };

      let profile = await loadUserProfile(signInData.user.id, signInData.user.email);
      
      if (!profile) {
        console.log('🔨 Profil manquant détecté, création...');
        profile = await ensureProfileExists(authUser);
      }
      
      // Sauvegarder les préférences
      if (data.rememberMe) {
        await AsyncStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_EMAIL, data.email.trim().toLowerCase());
        await AsyncStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_ME, 'true');
      }

      setState(prev => ({
        ...prev,
        isAuthenticated: !!profile,
        user: { ...authUser, profile: profile || undefined },
        profile,
        isSigningIn: false
      }));

      console.log('🎉 Connexion terminée avec succès');

      return { 
        success: true, 
        requiresProfile: !profile?.profile_completed 
      };

    } catch (error: any) {
      console.error('💥 ERREUR CONNEXION:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isSigningIn: false 
      }));
      return { success: false };
    }
  }, []);

  // Inscription simplifiée
  const signUp = useCallback(async (data: SignUpData) => {
    try {
      console.log('📝 === DÉBUT INSCRIPTION ===');
      
      setState(prev => ({ ...prev, isSigningUp: true, error: null }));

      if (!data.email.trim() || !data.password || !data.firstname.trim()) {
        throw new Error('Tous les champs sont requis');
      }

      if (data.roles.length === 0) {
        throw new Error('Au moins un rôle doit être sélectionné');
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: {
          data: {
            firstname: data.firstname.trim(),
            roles: data.roles
          }
        }
      });

      if (signUpError) {
        console.error('❌ Erreur inscription:', signUpError);
        const { userMessage } = handleSupabaseError(signUpError, 'Inscription');
        throw new Error(userMessage);
      }

      if (!signUpData.user) {
        throw new Error('Impossible de créer le compte utilisateur');
      }

      console.log('✅ Inscription réussie');

      // Créer le profil si la session existe
      if (signUpData.session) {
        const authUser: AuthUser = {
          id: signUpData.user.id,
          email: signUpData.user.email,
          email_confirmed_at: signUpData.user.email_confirmed_at,
          created_at: signUpData.user.created_at,
          user_metadata: signUpData.user.user_metadata,
        };

        await ensureProfileExists(authUser);
      }

      setState(prev => ({ ...prev, isSigningUp: false }));

      console.log('🎉 Inscription terminée avec succès');

      return { 
        success: true, 
        needsConfirmation: !signUpData.session 
      };

    } catch (error: any) {
      console.error('💥 ERREUR INSCRIPTION:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isSigningUp: false 
      }));
      return { success: false };
    }
  }, []);

  // Déconnexion simplifiée
  const signOut = useCallback(async () => {
    try {
      console.log('🚪 === DÉBUT DÉCONNEXION ===');

      setState(prev => ({ ...prev, isSigningOut: true, error: null }));

      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Erreur déconnexion:', error);
      }

      // Nettoyer les données locales
      try {
        const rememberMe = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.REMEMBER_ME);
        if (rememberMe !== 'true') {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.REMEMBER_EMAIL);
        }
        await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.USER_ROLE);
      } catch (storageError) {
        console.warn('⚠️ Erreur nettoyage stockage:', storageError);
      }

      setState({
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        user: null,
        profile: null,
        isSigningIn: false,
        isSigningUp: false,
        isSigningOut: false,
        isRefreshing: false,
        error: null,
      });

      console.log('✅ Déconnexion réussie');

    } catch (error: any) {
      console.error('💥 ERREUR DÉCONNEXION:', error);
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        profile: null,
        isSigningOut: false,
      }));
    }
  }, []);

  // Rafraîchir le profil avec gestion d'erreurs
  const refreshProfile = useCallback(async () => {
    if (!state.user?.id) return;

    try {
      console.log('🔄 Rafraîchissement du profil...');
      
      setState(prev => ({ ...prev, isRefreshing: true }));
      
      const profile = await loadUserProfile(state.user.id, state.user.email);
      
      setState(prev => ({
        ...prev,
        profile,
        user: prev.user ? { ...prev.user, profile: profile || undefined } : null,
        isRefreshing: false
      }));

      console.log('✅ Profil rafraîchi');

    } catch (error: any) {
      console.error('❌ Erreur rafraîchissement profil:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Impossible de rafraîchir le profil',
        isRefreshing: false 
      }));
    }
  }, [state.user?.id, state.user?.email]);

  // Fonctions utilitaires
  const clearAllUserCaches = useCallback(async () => {
    try {
      console.log('🧹 Nettoyage des caches utilisateur...');
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.includes('fourmiz_') || 
        key.includes('criteria_') ||
        key.includes('user_cache_')
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log('✅ Caches nettoyés:', cacheKeys.length);
      }
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage caches:', error);
    }
  }, []);

  const hasRole = useCallback((role: UserRole): boolean => {
    return state.profile?.roles?.includes(role) || false;
  }, [state.profile?.roles]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return roles.some(role => hasRole(role));
  }, [hasRole]);

  const isAdmin = useCallback((): boolean => {
    return hasRole('admin') || AUTHORIZED_ADMIN_EMAILS.includes(state.user?.email || '');
  }, [hasRole, state.user?.email]);

  // Configuration du listener auth (une seule fois)
  useEffect(() => {
    if (authListenerRef.current) return;

    console.log('👂 Configuration du listener d\'authentification...');

    authListenerRef.current = onAuthStateChange(async (user) => {
      console.log('🔄 Auth state changed:', user ? user.email : 'SIGNED_OUT');
      
      if (!user && state.isAuthenticated) {
        console.log('🚪 Déconnexion détectée via listener');
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          user: null,
          profile: null,
        }));
        return;
      }

      if (!state.isInitialized && user) {
        console.log('🔄 Initialisation via listener pour:', user.email);
        await initializeAuth();
      }
    });

    return () => {
      if (authListenerRef.current?.data?.subscription?.unsubscribe) {
        try {
          authListenerRef.current.data.subscription.unsubscribe();
          authListenerRef.current = null;
        } catch (error) {
          console.warn('⚠️ Erreur cleanup listener auth:', error);
        }
      }
    };
  }, []); // Dépendances vides pour éviter les re-créations

  // Initialisation au montage (une seule fois)
  useEffect(() => {
    initializeAuth();
  }, []); // Pas de dépendances pour éviter les re-exécutions

  return {
    // États
    ...state,
    
    // Méthodes principales
    signIn,
    signUp,
    signOut,
    refreshProfile,
    
    // Utilitaires
    hasRole,
    hasAnyRole,
    isAdmin,
    clearAllUserCaches,
    ensureProfileExists,
    
    // Fonction de mise à jour simple avec gestion d'erreurs
    updateProfile: async (updates: Partial<UserProfile>): Promise<boolean> => {
      if (!state.user?.id) return false;
      
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('user_id', state.user.id);

        if (error) {
          console.error('❌ Erreur mise à jour profil:', error);
          
          // Gestion d'erreur avec le gestionnaire
          const recovery = await ProfileErrorHandler.handleProfileError(
            error, 
            state.user.id, 
            state.user.email
          );
          
          if (!recovery.success) {
            return false;
          }
        }

        await refreshProfile();
        return true;
      } catch (error) {
        console.error('💥 ERREUR MISE À JOUR PROFIL:', error);
        
        // Gestion d'exception avec le gestionnaire
        try {
          await ProfileErrorHandler.handleProfileError(
            error, 
            state.user.id, 
            state.user.email
          );
        } catch (recoveryError) {
          console.error('❌ Erreur dans la récupération de updateProfile:', recoveryError);
        }
        
        return false;
      }
    },
    
    // Fonction de reset password simple
    resetPassword: async (email: string): Promise<boolean> => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase()
        );

        if (error) {
          console.error('❌ Erreur reset password:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('💥 ERREUR RESET PASSWORD:', error);
        return false;
      }
    },
    
    // Fonction pour gérer l'authentification requise
    requireAuth: (redirectTo: string = '/auth/login'): boolean => {
      if (!state.isAuthenticated || !state.user) {
        Alert.alert(
          'Authentification requise',
          'Vous devez être connecté pour accéder à cette fonctionnalité',
          [{ text: 'Se connecter', onPress: () => router.replace(redirectTo) }]
        );
        return false;
      }
      return true;
    },
  };
};

export { useAuth };
export default useAuth;
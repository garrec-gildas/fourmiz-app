// hooks/useAuth.ts - HOOK D'AUTHENTIFICATION CORRIGÉ ET OPTIMISÉ
// 🔧 Version complète avec réparation automatique des profils manquants

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  supabase,
  handleSupabaseError,
  getCurrentUser,
  getCurrentSession,
  onAuthStateChange,
  Database
} from '../lib/supabase';

// ✅ TYPES TYPESCRIPT STRICTS
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
  rib: string | null;
  id_document_path: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at?: string;
  created_at: string;
  profile?: UserProfile;
}

interface AuthState {
  // États de base
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Utilisateur et profil
  user: AuthUser | null;
  profile: UserProfile | null;
  
  // États de processus
  isSigningIn: boolean;
  isSigningUp: boolean;
  isSigningOut: boolean;
  isRefreshing: boolean;
  
  // Erreurs et retry
  error: string | null;
  retryCount: number;
  lastError: Date | null;
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

interface UseAuthReturn extends AuthState {
  // Méthodes d'authentification
  signIn: (data: SignInData) => Promise<{ success: boolean; requiresProfile?: boolean }>;
  signUp: (data: SignUpData) => Promise<{ success: boolean; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  
  // Méthodes de profil
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  
  // Méthodes utilitaires
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  isAdmin: () => boolean;
  requireAuth: (redirectTo?: string) => boolean;
  
  // Méthodes de récupération
  resetPassword: (email: string) => Promise<boolean>;
  
  // Nouvelles méthodes de réparation
  ensureProfileExists: (user: AuthUser) => Promise<UserProfile | null>;
  repairUserProfile: () => Promise<void>;
  
  // Debug et utilitaires
  clearAuthData: () => Promise<void>;
  savePushTokenSafely: (token: string) => Promise<void>;
}

// 🔐 CONSTANTES
const AUTH_STORAGE_KEYS = {
  REMEMBER_EMAIL: 'fourmiz_remember_email',
  REMEMBER_ME: 'fourmiz_remember_me',
  USER_ROLE: 'fourmiz_user_role',
  PROFILE_CACHE: 'fourmiz_profile_cache',
  CACHE_TIME: 'fourmiz_cache_time',
} as const;

const AUTHORIZED_ADMIN_EMAILS = [
  'garrec.gildas@gmail.com',
  // Ajouter d'autres emails admin autorisés
] as const;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 2000; // 2 secondes

// 🚀 HOOK PRINCIPAL
export const useAuth = (): UseAuthReturn => {
  // ✅ ÉTAT LOCAL
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
    retryCount: 0,
    lastError: null,
  });

  // Références pour éviter les re-renders
  const authListenerRef = useRef<{ data: { subscription: any } } | null>(null);
  const isInitializingRef = useRef(false);

  // 🛠️ HELPERS INTERNES
  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setError = useCallback((error: string | null) => {
    updateState({ 
      error,
      lastError: error ? new Date() : null 
    });
  }, [updateState]);

  const clearError = useCallback(() => {
    updateState({ 
      error: null, 
      retryCount: 0,
      lastError: null 
    });
  }, [updateState]);

  // 🧹 NETTOYER LES TOKENS PUSH ORPHELINS
  const cleanupOrphanedPushTokens = useCallback(async (userId: string) => {
    try {
      console.log('🧹 Nettoyage des tokens push orphelins pour:', userId);
      
      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.warn('⚠️ Erreur nettoyage tokens push:', error);
      } else {
        console.log('✅ Tokens push nettoyés');
      }
    } catch (error) {
      console.warn('⚠️ Erreur dans cleanupOrphanedPushTokens:', error);
    }
  }, []);

  // 🔍 FONCTION DE DIAGNOSTIC ET CRÉATION DE PROFIL
  const ensureProfileExists = useCallback(async (currentUser: AuthUser): Promise<UserProfile | null> => {
    if (!currentUser?.id) return null;

    try {
      console.log('🔍 Vérification du profil pour:', currentUser.email);

      // 1. Vérifier si le profil existe
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      // Si le profil existe, le retourner
      if (!fetchError && existingProfile) {
        console.log('✅ Profil existant trouvé');
        return existingProfile as UserProfile;
      }

      // Si erreur autre que "profil non trouvé", la propager
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Erreur lors de la vérification du profil:', fetchError);
        throw fetchError;
      }

      // 2. Créer le profil s'il n'existe pas
      console.log('🔧 Création du profil manquant pour:', currentUser.email);
      
      const newProfile = {
        id: currentUser.id,
        email: currentUser.email,
        firstname: extractFirstName(currentUser.email),
        lastname: extractLastName(currentUser.email),
        phone: null,
        address: null,
        city: null,
        postal_code: null,
        building: null,
        floor: null,
        roles: ['client'] as UserRole[], // Rôle par défaut
        profile_completed: false,
        avatar_url: null,
        rib: null,
        id_document_path: null,
        created_at: currentUser.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();

      if (createError) {
        console.error('❌ Erreur création profil:', createError);
        throw createError;
      }

      console.log('✅ Profil créé avec succès:', createdProfile.email);
      
      // Nettoyer les tokens push orphelins éventuels
      await cleanupOrphanedPushTokens(currentUser.id);
      
      return createdProfile as UserProfile;

    } catch (error: any) {
      console.error('💥 Erreur dans ensureProfileExists:', error);
      const { userMessage } = handleSupabaseError(error, 'Création de profil');
      setError(userMessage);
      return null;
    }
  }, [cleanupOrphanedPushTokens, setError]);

  // 📋 CHARGEMENT DU PROFIL UTILISATEUR AMÉLIORÉ
  const loadUserProfile = useCallback(async (userId: string, useCache = true): Promise<UserProfile | null> => {
    try {
      console.log('📋 Chargement du profil utilisateur:', userId);

      // Vérifier le cache si demandé
      if (useCache) {
        try {
          const cachedProfile = await AsyncStorage.getItem(`${AUTH_STORAGE_KEYS.PROFILE_CACHE}_${userId}`);
          const cacheTime = await AsyncStorage.getItem(`${AUTH_STORAGE_KEYS.CACHE_TIME}_${userId}`);
          
          if (cachedProfile && cacheTime && 
              Date.now() - parseInt(cacheTime) < CACHE_DURATION) {
            console.log('✅ Profil chargé depuis le cache');
            return JSON.parse(cachedProfile) as UserProfile;
          }
        } catch (cacheError) {
          console.warn('⚠️ Erreur lecture cache profil:', cacheError);
        }
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          firstname,
          lastname,
          phone,
          address,
          city,
          postal_code,
          building,
          floor,
          roles,
          profile_completed,
          avatar_url,
          rib,
          id_document_path,
          created_at,
          updated_at
        `)
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Aucun profil trouvé pour cet utilisateur');
          return null;
        }
        
        console.error('❌ Erreur chargement profil:', error);
        const { userMessage } = handleSupabaseError(error, 'Chargement profil');
        throw new Error(userMessage);
      }

      const profile = profileData as UserProfile;

      // Mettre en cache
      try {
        await AsyncStorage.setItem(`${AUTH_STORAGE_KEYS.PROFILE_CACHE}_${userId}`, JSON.stringify(profile));
        await AsyncStorage.setItem(`${AUTH_STORAGE_KEYS.CACHE_TIME}_${userId}`, Date.now().toString());
      } catch (cacheError) {
        console.warn('⚠️ Erreur mise en cache profil:', cacheError);
      }

      console.log('✅ Profil utilisateur chargé:', profile.email);
      return profile;

    } catch (error: any) {
      console.error('❌ Exception loadUserProfile:', error);
      
      // Retry automatique en cas d'erreur réseau
      if (state.retryCount < MAX_RETRY_ATTEMPTS && 
          error.message?.toLowerCase().includes('network')) {
        const delay = RETRY_DELAY_BASE * (state.retryCount + 1);
        console.log(`🔄 Retry automatique dans ${delay}ms (tentative ${state.retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
        
        updateState({ retryCount: state.retryCount + 1 });
        
        setTimeout(() => {
          loadUserProfile(userId, false);
        }, delay);
      }
      
      return null;
    }
  }, [state.retryCount, updateState]);

  // 🔧 FONCTION DE RÉPARATION COMPLÈTE
  const repairUserProfile = useCallback(async (): Promise<void> => {
    try {
      console.log('🔧 Début de la réparation du profil utilisateur');
      
      const session = await getCurrentSession();
      const user = await getCurrentUser();

      if (!session || !user) {
        console.log('❌ Aucun utilisateur connecté pour la réparation');
        return;
      }

      console.log('✅ Utilisateur trouvé pour réparation:', user.email);

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
      };

      // Vérifier/créer le profil
      const profile = await ensureProfileExists(authUser);
      
      if (!profile) {
        throw new Error('Impossible de créer ou récupérer le profil utilisateur');
      }

      // Mettre à jour l'état
      updateState({
        user: { ...authUser, profile },
        profile,
        isAuthenticated: true,
        error: null,
        retryCount: 0,
      });

      console.log('✅ Réparation terminée avec succès');

    } catch (error: any) {
      console.error('💥 Erreur dans repairUserProfile:', error);
      setError(error.message);
    }
  }, [ensureProfileExists, updateState, setError]);

  // 🔄 INITIALISATION DE L'AUTHENTIFICATION AMÉLIORÉE
  const initializeAuth = useCallback(async (): Promise<void> => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    try {
      console.log('🔄 Initialisation de l\'authentification...');
      
      clearError();
      updateState({ isLoading: true });

      // Récupérer la session actuelle
      const session = await getCurrentSession();
      const user = await getCurrentUser();

      if (!session || !user) {
        console.log('ℹ️ Aucune session active');
        updateState({ 
          isAuthenticated: false, 
          user: null, 
          profile: null,
          isLoading: false,
          isInitialized: true 
        });
        return;
      }

      console.log('✅ Session active trouvée:', user.email);

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
      };

      // Charger ou créer le profil utilisateur
      let profile = await loadUserProfile(user.id);
      
      // Si pas de profil, essayer de le créer
      if (!profile) {
        console.log('🔧 Aucun profil trouvé, création automatique...');
        profile = await ensureProfileExists(authUser);
      }

      // Mettre à jour l'état
      updateState({
        isAuthenticated: !!profile,
        user: { ...authUser, profile: profile || undefined },
        profile,
        isLoading: false,
        isInitialized: true
      });

      if (profile) {
        console.log('🎉 Authentification initialisée avec succès');
      } else {
        console.warn('⚠️ Authentification initialisée mais sans profil');
        setError('Impossible de charger ou créer votre profil utilisateur');
      }

    } catch (error: any) {
      console.error('❌ Erreur initialisation auth:', error);
      setError('Erreur d\'initialisation de l\'authentification');
      
      updateState({ 
        isAuthenticated: false, 
        user: null, 
        profile: null,
        isLoading: false,
        isInitialized: true 
      });
    } finally {
      isInitializingRef.current = false;
    }
  }, [loadUserProfile, ensureProfileExists, updateState, clearError, setError]);

  // 💾 SAUVEGARDE SÉCURISÉE DES PUSH TOKENS
  const savePushTokenSafely = useCallback(async (token: string): Promise<void> => {
    try {
      if (!state.user?.id || !token) {
        console.warn('⚠️ Token ou userId manquant pour sauvegarde push token');
        return;
      }

      console.log('💾 Sauvegarde sécurisée du push token...');

      // 1. Vérifier que le profil existe
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', state.user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Profil non trouvé pour userId:', state.user.id);
        // Essayer de réparer le profil
        await repairUserProfile();
        return;
      }

      // 2. Supprimer les anciens tokens pour cet utilisateur
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', state.user.id);

      // 3. Insérer le nouveau token
      const { data, error } = await supabase
        .from('push_tokens')
        .insert([{
          user_id: state.user.id,
          token: token,
          device_type: Platform.OS,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur sauvegarde token:', error);
        throw error;
      }

      console.log('✅ Push token sauvegardé avec succès');

    } catch (error: any) {
      console.error('💥 Erreur dans savePushTokenSafely:', error);
      // Ne pas faire échouer l'app pour un problème de push token
    }
  }, [state.user, repairUserProfile]);

  // 🔐 CONNEXION AMÉLIORÉE
  const signIn = useCallback(async (data: SignInData): Promise<{ success: boolean; requiresProfile?: boolean }> => {
    try {
      console.log('🔐 === DÉBUT CONNEXION ===');
      console.log('📧 Email:', data.email);

      clearError();
      updateState({ isSigningIn: true });

      // Validation
      if (!data.email.trim() || !data.password) {
        throw new Error('Email et mot de passe requis');
      }

      // Tentative de connexion
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
      };

      // Charger ou créer le profil
      let profile = await loadUserProfile(signInData.user.id, false);
      
      if (!profile) {
        console.log('🔧 Profil manquant détecté, création...');
        profile = await ensureProfileExists(authUser);
      }
      
      // Sauvegarder les préférences
      if (data.rememberMe) {
        await AsyncStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_EMAIL, data.email.trim().toLowerCase());
        await AsyncStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_ME, 'true');
      }

      // Sauvegarder le rôle par défaut
      if (profile?.roles && profile.roles.length > 0) {
        await AsyncStorage.setItem(AUTH_STORAGE_KEYS.USER_ROLE, profile.roles[0]);
      }

      // Mettre à jour l'état
      updateState({
        isAuthenticated: !!profile,
        user: { ...authUser, profile: profile || undefined },
        profile,
        isSigningIn: false
      });

      console.log('🎉 Connexion terminée avec succès');

      return { 
        success: true, 
        requiresProfile: !profile?.profile_completed 
      };

    } catch (error: any) {
      console.error('💥 ERREUR CONNEXION:', error);
      setError(error.message);
      updateState({ isSigningIn: false });
      return { success: false };
    }
  }, [loadUserProfile, ensureProfileExists, updateState, clearError, setError]);

  // 📝 INSCRIPTION AMÉLIORÉE
  const signUp = useCallback(async (data: SignUpData): Promise<{ success: boolean; needsConfirmation?: boolean }> => {
    try {
      console.log('📝 === DÉBUT INSCRIPTION ===');
      console.log('📧 Email:', data.email);
      console.log('🎭 Rôles:', data.roles);

      clearError();
      updateState({ isSigningUp: true });

      // Validation
      if (!data.email.trim() || !data.password || !data.firstname.trim()) {
        throw new Error('Tous les champs sont requis');
      }

      if (data.roles.length === 0) {
        throw new Error('Au moins un rôle doit être sélectionné');
      }

      // Tentative d'inscription
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

      // Créer le profil immédiatement si l'utilisateur est confirmé
      if (signUpData.session) {
        const authUser: AuthUser = {
          id: signUpData.user.id,
          email: signUpData.user.email,
          email_confirmed_at: signUpData.user.email_confirmed_at,
          created_at: signUpData.user.created_at,
        };

        await ensureProfileExists(authUser);
      }

      updateState({ isSigningUp: false });

      console.log('🎉 Inscription terminée avec succès');

      return { 
        success: true, 
        needsConfirmation: !signUpData.session 
      };

    } catch (error: any) {
      console.error('💥 ERREUR INSCRIPTION:', error);
      setError(error.message);
      updateState({ isSigningUp: false });
      return { success: false };
    }
  }, [ensureProfileExists, updateState, clearError, setError]);

  // 🚪 DÉCONNEXION AMÉLIORÉE
  const signOut = useCallback(async (): Promise<void> => {
    try {
      console.log('🚪 === DÉBUT DÉCONNEXION ===');

      clearError();
      updateState({ isSigningOut: true });

      // Déconnexion Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Erreur déconnexion:', error);
        // Ne pas bloquer la déconnexion pour une erreur Supabase
      }

      // Nettoyer les données locales (optionnel)
      try {
        const rememberMe = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.REMEMBER_ME);
        if (rememberMe !== 'true') {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.REMEMBER_EMAIL);
        }
        
        // Nettoyer le cache
        if (state.user?.id) {
          await AsyncStorage.removeItem(`${AUTH_STORAGE_KEYS.PROFILE_CACHE}_${state.user.id}`);
          await AsyncStorage.removeItem(`${AUTH_STORAGE_KEYS.CACHE_TIME}_${state.user.id}`);
        }
        
        await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.USER_ROLE);
      } catch (storageError) {
        console.warn('⚠️ Erreur nettoyage stockage:', storageError);
      }

      // Réinitialiser l'état
      updateState({
        isAuthenticated: false,
        user: null,
        profile: null,
        isSigningOut: false,
        retryCount: 0,
        error: null,
      });

      console.log('✅ Déconnexion réussie');

    } catch (error: any) {
      console.error('💥 ERREUR DÉCONNEXION:', error);
      setError(error.message);
      
      // En cas d'erreur, forcer la réinitialisation locale
      updateState({
        isAuthenticated: false,
        user: null,
        profile: null,
        isSigningOut: false,
      });
    }
  }, [state.user, updateState, clearError, setError]);

  // 🔄 RAFRAÎCHIR LE PROFIL AMÉLIORÉ
  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!state.user?.id) return;

    try {
      console.log('🔄 Rafraîchissement du profil...');
      
      updateState({ isRefreshing: true });
      
      // Forcer le rechargement sans cache
      const profile = await loadUserProfile(state.user.id, false);
      
      updateState({
        profile,
        user: { ...state.user, profile: profile || undefined },
        isRefreshing: false
      });

      console.log('✅ Profil rafraîchi');

    } catch (error: any) {
      console.error('❌ Erreur rafraîchissement profil:', error);
      setError('Impossible de rafraîchir le profil');
      updateState({ isRefreshing: false });
    }
  }, [state.user, loadUserProfile, updateState, setError]);

  // 📝 METTRE À JOUR LE PROFIL
  const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!state.user?.id) return false;

    try {
      console.log('📝 Mise à jour du profil...');

      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', state.user.id);

      if (error) {
        console.error('❌ Erreur mise à jour profil:', error);
        const { userMessage } = handleSupabaseError(error, 'Mise à jour profil');
        throw new Error(userMessage);
      }

      // Rafraîchir le profil
      await refreshProfile();

      console.log('✅ Profil mis à jour');
      return true;

    } catch (error: any) {
      console.error('💥 ERREUR MISE À JOUR PROFIL:', error);
      setError(error.message);
      return false;
    }
  }, [state.user, refreshProfile, setError]);

  // 🔐 RÉCUPÉRATION MOT DE PASSE
  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      console.log('🔐 Récupération mot de passe pour:', email);

      const redirectUrl = `${process.env.EXPO_PUBLIC_APP_URL || 'exp://127.0.0.1:8081'}/auth/recovery-redirect`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: redirectUrl }
      );

      if (error) {
        console.error('❌ Erreur reset password:', error);
        const { userMessage } = handleSupabaseError(error, 'Récupération mot de passe');
        throw new Error(userMessage);
      }

      console.log('✅ Email de récupération envoyé');
      return true;

    } catch (error: any) {
      console.error('💥 ERREUR RESET PASSWORD:', error);
      setError(error.message);
      return false;
    }
  }, [setError]);

  // 🛠️ MÉTHODES UTILITAIRES
  const hasRole = useCallback((role: UserRole): boolean => {
    return state.profile?.roles?.includes(role) || false;
  }, [state.profile]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return roles.some(role => hasRole(role));
  }, [hasRole]);

  const isAdmin = useCallback((): boolean => {
    return hasRole('admin') || AUTHORIZED_ADMIN_EMAILS.includes(state.user?.email || '');
  }, [hasRole, state.user]);

  const requireAuth = useCallback((redirectTo: string = '/auth/signin'): boolean => {
    if (!state.isAuthenticated || !state.user) {
      Alert.alert(
        'Authentification requise',
        'Vous devez être connecté pour accéder à cette fonctionnalité',
        [{ text: 'Se connecter', onPress: () => router.replace(redirectTo) }]
      );
      return false;
    }
    return true;
  }, [state.isAuthenticated, state.user]);

  // 🧹 NETTOYER LES DONNÉES (DEV ONLY)
  const clearAuthData = useCallback(async (): Promise<void> => {
    if (__DEV__) {
      try {
        const keys = Object.values(AUTH_STORAGE_KEYS);
        await AsyncStorage.multiRemove(keys);
        
        // Nettoyer aussi les caches spécifiques à l'utilisateur
        if (state.user?.id) {
          await AsyncStorage.removeItem(`${AUTH_STORAGE_KEYS.PROFILE_CACHE}_${state.user.id}`);
          await AsyncStorage.removeItem(`${AUTH_STORAGE_KEYS.CACHE_TIME}_${state.user.id}`);
        }
        
        console.log('🧹 Données d\'authentification nettoyées (DEV)');
      } catch (error) {
        console.error('❌ Erreur nettoyage données auth:', error);
      }
    }
  }, [state.user]);

  // 🔄 LISTENER D'AUTHENTIFICATION
  useEffect(() => {
    console.log('🔄 Configuration du listener d\'authentification...');

    // Nettoyer le listener précédent
    if (authListenerRef.current) {
      authListenerRef.current.data.subscription.unsubscribe();
    }

    // Configurer le nouveau listener
    authListenerRef.current = onAuthStateChange(async (user) => {
      console.log('🔄 État d\'authentification changé:', user?.email || 'Déconnecté');
      
      if (state.isInitialized && !isInitializingRef.current) {
        // Si déjà initialisé, rafraîchir l'état
        await initializeAuth();
      }
    });

    // Cleanup
    return () => {
      if (authListenerRef.current) {
        authListenerRef.current.data.subscription.unsubscribe();
      }
    };
  }, [state.isInitialized, initializeAuth]);

  // 🚀 INITIALISATION AU MONTAGE
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 📊 RETURN COMPLET
  return {
    // États
    ...state,
    
    // Méthodes d'authentification
    signIn,
    signUp,
    signOut,
    
    // Méthodes de profil
    refreshProfile,
    updateProfile,
    
    // Méthodes utilitaires
    hasRole,
    hasAnyRole,
    isAdmin,
    requireAuth,
    
    // Méthodes de récupération
    resetPassword,
    
    // Nouvelles méthodes de réparation
    ensureProfileExists,
    repairUserProfile,
    
    // Debug et utilitaires
    clearAuthData,
    savePushTokenSafely,
  };
};

// 🛠️ FONCTIONS UTILITAIRES
const extractFirstName = (email: string): string => {
  if (!email) return '';
  const parts = email.split('@')[0].split('.');
  const firstName = parts[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
};

const extractLastName = (email: string): string => {
  if (!email) return '';
  const parts = email.split('@')[0].split('.');
  if (parts.length > 1) {
    const lastName = parts[1];
    return lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
  }
  return '';
};

// 🎯 EXPORT PAR DÉFAUT
export default useAuth;
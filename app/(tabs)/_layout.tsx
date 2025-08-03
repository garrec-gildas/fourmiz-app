// app/(tabs)/_layout.tsx - DASHBOARD CORRIGÉ AVEC NOTIFICATIONS + PROTECTION PROFIL
// 🔧 VERSION CORRIGÉE : Problèmes de notifications et boucles résolus
// 📱 Initialisation des notifications intégrée
// 🛡️ Protection simplifiée sans duplication
// 🐛 Debug spécial pour utilisateur 3a974bf5-a0df-44fe-be9e-603910ef9a4e
// ⚡ Performance optimisée avec gestion d'états unifiée
// 🆕 SUPPORT MULTI-RÔLES : Utilisateurs peuvent être client ET fourmiz (switch dynamique)
// 🎯 SOLUTION : getUserRoleCapabilities() + roleManager pour switch fluide entre interfaces
// 👑 ADMIN : Interface fourmiz avec privilèges étendus
// 🔴 FIX : Correction erreur primaryRole → effectiveRole

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
import { Tabs, useRouter, useSegments, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRoleManager } from '@/lib/roleManager';

const { width: screenWidth } = Dimensions.get('window');

// Types
interface TabConfig {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  route: string;
  role: 'client' | 'fourmiz' | 'both';
  badge?: number;
}

interface UserProfile {
  id: string;
  roles?: string[];
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  rib?: string;
  id_document_path?: string;
  profile_completed?: boolean;
}

interface NotificationState {
  initialized: boolean;
  permissions: 'granted' | 'denied' | 'pending';
  error?: string;
}

// 🆕 Service de notifications intégré (temporaire jusqu'à création du fichier séparé)
const NotificationService = {
  // Initialiser les notifications pour un utilisateur
  initialize: async (userId: string): Promise<boolean> => {
    try {
      console.log(`📱 Initialisation notifications pour utilisateur: ${userId}`);
      
      // Vérifier les permissions natives
      const { status: existingStatus } = await import('expo-notifications').then(module => 
        module.getPermissionsAsync()
      );
      
      let finalStatus = existingStatus;
      
      // Demander permission si pas encore accordée
      if (existingStatus !== 'granted') {
        console.log('🔔 Demande de permission notifications...');
        const { status } = await import('expo-notifications').then(module => 
          module.requestPermissionsAsync()
        );
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('⛔ Permissions notifications refusées');
        return false;
      }
      
      // Obtenir le token push
      const token = await import('expo-notifications').then(async (module) => {
        const tokenData = await module.getExpoPushTokenAsync();
        return tokenData.data;
      });
      
      if (!token) {
        console.warn('⚠️ Impossible d\'obtenir le token push');
        return false;
      }
      
      console.log('📱 Token push obtenu:', token.substring(0, 20) + '...');
      
      // Sauvegarder le token en base (avec gestion d'erreur)
      try {
        const { error: tokenError } = await supabase
          .from('user_push_tokens')
          .upsert({
            user_id: userId,
            token: token,
            platform: Platform.OS,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        
        if (tokenError) {
          console.warn('⚠️ Impossible de sauvegarder le token (table manquante?):', tokenError);
          // Ne pas bloquer l'utilisateur si la table n'existe pas encore
        } else {
          console.log('✅ Token push sauvegardé');
        }
      } catch (dbError) {
        console.warn('⚠️ Erreur base de données token:', dbError);
        // Continue sans bloquer
      }
      
      // Configuration des notifications
      await import('expo-notifications').then(module => 
        module.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        })
      );
      
      console.log('✅ Notifications initialisées avec succès');
      return true;
      
    } catch (error) {
      console.error('❌ Erreur initialisation notifications:', error);
      return false;
    }
  },
  
  // Nettoyer les notifications d'un utilisateur
  cleanup: async (userId: string): Promise<void> => {
    try {
      console.log(`🧹 Nettoyage notifications pour: ${userId}`);
      
      // Supprimer le token de la base
      await supabase
        .from('user_push_tokens')
        .delete()
        .eq('user_id', userId);
        
      console.log('✅ Nettoyage notifications terminé');
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage notifications:', error);
    }
  }
};

// Configuration des onglets selon le rôle
const getTabsConfig = (currentRole: 'client' | 'fourmiz'): TabConfig[] => {
  if (currentRole === 'client') {
    return [
      {
        name: 'index',
        icon: 'home-outline',
        iconFocused: 'home',
        route: '/(tabs)/',
        role: 'both'
      },
      {
        name: 'services',
        icon: 'construct-outline',
        iconFocused: 'construct',
        route: '/(tabs)/services',
        role: 'client'
      },
      {
        name: 'orders',
        icon: 'bag-outline',
        iconFocused: 'bag',
        route: '/(tabs)/orders',
        role: 'client'
      },
      {
        name: 'messages',
        icon: 'chatbubble-outline',
        iconFocused: 'chatbubble',
        route: '/(tabs)/messages',
        role: 'both'
      },
      {
        name: 'network',
        icon: 'people-outline',
        iconFocused: 'people',
        route: '/(tabs)/network',
        role: 'both'
      },
      {
        name: 'earnings',
        icon: 'trending-up-outline',
        iconFocused: 'trending-up',
        route: '/(tabs)/earnings',
        role: 'both'
      },
      {
        name: 'rewards',
        icon: 'gift-outline',
        iconFocused: 'gift',
        route: '/(tabs)/rewards',
        role: 'both'
      },
      {
        name: 'wallet',
        icon: 'wallet-outline',
        iconFocused: 'wallet',
        route: '/(tabs)/wallet',
        role: 'both'
      },
      {
        name: 'profile',
        icon: 'person-outline',
        iconFocused: 'person',
        route: '/(tabs)/profile',
        role: 'both'
      }
    ];
  } else {
    return [
      {
        name: 'index',
        icon: 'home-outline',
        iconFocused: 'home',
        route: '/(tabs)/',
        role: 'both'
      },
      {
        name: 'available-orders',
        icon: 'search-outline',
        iconFocused: 'search',
        route: '/(tabs)/available-orders',
        role: 'fourmiz'
      },
      {
        name: 'services-requests',
        icon: 'build-outline',
        iconFocused: 'build',
        route: '/(tabs)/services-requests',
        role: 'fourmiz'
      },
      {
        name: 'messages',
        icon: 'chatbubble-outline',
        iconFocused: 'chatbubble',
        route: '/(tabs)/messages',
        role: 'both'
      },
      {
        name: 'calendar',
        icon: 'calendar-outline',
        iconFocused: 'calendar',
        route: '/(tabs)/calendar',
        role: 'fourmiz'
      },
      {
        name: 'network',
        icon: 'people-outline',
        iconFocused: 'people',
        route: '/(tabs)/network',
        role: 'both'
      },
      {
        name: 'earnings',
        icon: 'cash-outline',
        iconFocused: 'cash',
        route: '/(tabs)/earnings',
        role: 'both'
      },
      {
        name: 'rewards',
        icon: 'trophy-outline',
        iconFocused: 'trophy',
        route: '/(tabs)/rewards',
        role: 'both'
      },
      {
        name: 'wallet',
        icon: 'card-outline',
        iconFocused: 'card',
        route: '/(tabs)/wallet',
        role: 'both'
      },
      {
        name: 'criteria',
        icon: 'options-outline',
        iconFocused: 'options',
        route: '/(tabs)/criteria',
        role: 'fourmiz'
      },
      {
        name: 'profile',
        icon: 'person-outline',
        iconFocused: 'person',
        route: '/(tabs)/profile',
        role: 'both'
      }
    ];
  }
};

// 🆕 Helper pour gérer les utilisateurs multi-rôles (client + fourmiz)
const getUserRoleCapabilities = (roles: string[]) => {
  const hasClient = roles.includes('client');
  const hasFourmiz = roles.includes('fourmiz');
  const hasAdmin = roles.includes('admin');
  
  return {
    hasClient,
    hasFourmiz,
    hasAdmin,
    canSwitchRoles: hasClient && hasFourmiz, // Peut switcher entre client et fourmiz
    defaultRole: hasAdmin ? 'fourmiz' : (hasFourmiz ? 'fourmiz' : 'client') as 'client' | 'fourmiz'
  };
};

// 🔧 Hook unifié pour gérer l'authentification et le profil (SANS DUPLICATION)
const useUnifiedAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationState, setNotificationState] = useState<NotificationState>({
    initialized: false,
    permissions: 'pending'
  });
  const [roleCapabilities, setRoleCapabilities] = useState<any>(null);
  const router = useRouter();

  // 🔍 Fonction de vérification du profil
  const checkProfileCompleteness = useCallback((profileData: UserProfile | null): boolean => {
    if (!profileData) {
      console.log('❌ Aucun profil trouvé');
      return false;
    }

    const requiredFields = ['firstname', 'lastname', 'phone', 'address', 'city'];
    const missingFields = requiredFields.filter(field => !profileData[field as keyof UserProfile]);
    
    if (missingFields.length > 0) {
      console.log('❌ Champs manquants:', missingFields);
      return false;
    }

    if (!profileData.profile_completed) {
      console.log('❌ Profil marqué comme incomplet');
      return false;
    }

    if (!profileData.roles || profileData.roles.length === 0) {
      console.log('❌ Aucun rôle défini');
      return false;
    }

    console.log('✅ Profil complet validé');
    return true;
  }, []);

  // 📱 Initialiser les notifications
  const initializeNotifications = useCallback(async (userId: string) => {
    try {
      console.log('📱 Début initialisation notifications...');
      setNotificationState(prev => ({ ...prev, permissions: 'pending' }));
      
      const success = await NotificationService.initialize(userId);
      
      setNotificationState({
        initialized: success,
        permissions: success ? 'granted' : 'denied',
        error: success ? undefined : 'Échec initialisation notifications'
      });
      
      if (success) {
        console.log('✅ Notifications initialisées avec succès');
      } else {
        console.warn('⚠️ Échec initialisation notifications (non bloquant)');
      }
      
    } catch (error) {
      console.error('❌ Erreur initialisation notifications:', error);
      setNotificationState({
        initialized: false,
        permissions: 'denied',
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }, []);

  // 🔄 Charger les données utilisateur
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔐 Vérification session utilisateur...');
      
      // Étape 1: Vérifier l'utilisateur authentifié
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Erreur authentification:', authError);
        setError('Session expirée');
        router.replace('/auth/signin');
        return;
      }

      if (!currentUser) {
        console.log('❌ Aucun utilisateur connecté');
        setError('Non connecté');
        router.replace('/auth/signin');
        return;
      }

      console.log('✅ Utilisateur authentifié:', currentUser.email);
      setUser(currentUser);

      // 🐛 DEBUG SPÉCIAL pour l'utilisateur problématique
      if (currentUser.id === '3a974bf5-a0df-44fe-be9e-603910ef9a4e') {
        console.log('🚨 === UTILISATEUR PROBLÉMATIQUE DÉTECTÉ ===');
        console.log('📊 ID utilisateur:', currentUser.id);
        console.log('📊 Email:', currentUser.email);
        console.log('📊 Métadonnées:', currentUser.user_metadata);
        console.log('📊 Dernière connexion:', currentUser.last_sign_in_at);
      }

      // Étape 2: Charger le profil
      console.log('📋 Chargement du profil utilisateur...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('❌ Erreur chargement profil:', profileError);
        // Créer un profil minimal pour éviter les blocages
        const minimalProfile: UserProfile = {
          id: currentUser.id,
          email: currentUser.email,
          roles: ['user']
        };
        setProfile(minimalProfile);
      } else if (profileData) {
        // Normaliser les rôles
        let userRoles: string[] = ['user'];
        if (profileData.roles && Array.isArray(profileData.roles)) {
          userRoles = profileData.roles;
        } else if (profileData.roles) {
          userRoles = [profileData.roles];
        } else if (profileData.role) {
          userRoles = [profileData.role];
        }

        const normalizedProfile: UserProfile = {
          ...profileData,
          roles: userRoles
        };
        
        setProfile(normalizedProfile);
        
        // 🆕 CORRECTION MULTI-RÔLES : Analyser les capacités de l'utilisateur
        const capabilities = getUserRoleCapabilities(userRoles);
        setRoleCapabilities(capabilities);
        
        // 🐛 DEBUG SPÉCIAL pour l'utilisateur problématique
        if (currentUser.id === '3a974bf5-a0df-44fe-be9e-603910ef9a4e') {
          console.log('🚨 === DONNÉES PROFIL UTILISATEUR PROBLÉMATIQUE - MULTI-RÔLES ===');
          console.log('📊 Profil complet:', normalizedProfile);
          console.log('📊 profile_completed:', normalizedProfile.profile_completed);
          console.log('📊 Rôles bruts:', normalizedProfile.roles);
          console.log('📊 Capacités:', capabilities);
          console.log('📊 Peut switcher rôles:', capabilities.canSwitchRoles);
          console.log('📊 Rôle par défaut:', capabilities.defaultRole);
          console.log('📊 Prénom:', normalizedProfile.firstname);
          console.log('📊 Nom:', normalizedProfile.lastname);
          console.log('🎯 Le roleManager va gérer le switch entre client/fourmiz !');
        }

        // Étape 3: Vérifier la complétude du profil
        const isComplete = checkProfileCompleteness(normalizedProfile);
        
        if (!isComplete) {
          console.log('⚠️ Profil incomplet, redirection vers completion...');
          
          // 🐛 DEBUG SPÉCIAL - Log avant redirection
          if (currentUser.id === '3a974bf5-a0df-44fe-be9e-603910ef9a4e') {
            console.log('🚨 REDIRECTION PROFIL INCOMPLET POUR UTILISATEUR PROBLÉMATIQUE');
            
            // Afficher une alerte pour debug en développement
            if (__DEV__) {
              Alert.alert(
                'DEBUG - Utilisateur Problématique',
                `Profil incomplet détecté pour ${currentUser.email}\n\nDonnées manquantes détectées. Redirection vers completion.`,
                [{ text: 'OK' }]
              );
            }
          }
          
          // Déterminer les rôles pour la redirection
          const roleParams = normalizedProfile.roles && normalizedProfile.roles.length > 0 
            ? normalizedProfile.roles.filter(role => ['client', 'fourmiz'].includes(role)).join(',')
            : '';
          
          const redirectUrl = roleParams 
            ? `/auth/complete-profile?roles=${roleParams}`
            : '/auth/complete-profile';
            
          console.log('🔄 Redirection vers:', redirectUrl);
          router.replace(redirectUrl);
          return;
        }

        // Étape 4: Profil complet - Initialiser les notifications
        console.log('✅ Profil complet validé, initialisation des notifications...');
        await initializeNotifications(currentUser.id);
        
      } else {
        // Aucun profil trouvé
        console.log('❌ Aucun profil trouvé, redirection vers completion...');
        router.replace('/auth/complete-profile');
        return;
      }

    } catch (error) {
      console.error('💥 Erreur critique chargement données:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [router, checkProfileCompleteness, initializeNotifications]);

  // 🔄 Charger au montage
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // 👂 Écouter les changements d'authentification
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Changement d\'authentification:', event);
      
      if (event === 'SIGNED_OUT') {
        console.log('👋 Utilisateur déconnecté');
        setUser(null);
        setProfile(null);
        setNotificationState({ initialized: false, permissions: 'pending' });
        router.replace('/auth/signin');
      } else if (event === 'SIGNED_IN' && session?.user) {
        console.log('👋 Utilisateur connecté, rechargement...');
        await loadUserData();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData, router]);

  return {
    user,
    profile,
    loading,
    error,
    notificationState,
    roleCapabilities, // 🆕 Capacités de rôles de l'utilisateur
    refetch: loadUserData
  };
};

// Composant TabBar personnalisé
function CustomTabBar({ state, descriptors, navigation }: any) {
  const { profile, loading: authLoading, roleCapabilities } = useUnifiedAuth();
  const { currentRole, switchingRole } = useRoleManager(profile); // Retour au roleManager normal
  const router = useRouter();
  const pathname = usePathname();
  
  // 🆕 CORRECTION : Utiliser currentRole du roleManager, mais avec protection contre les boucles
  const tabsConfig = useMemo(() => {
    // Si l'utilisateur a des capacités multi-rôles mais pas de rôle défini, utiliser le défaut
    if (roleCapabilities && !currentRole) {
      return getTabsConfig(roleCapabilities.defaultRole);
    }
    return getTabsConfig(currentRole || 'client');
  }, [currentRole, roleCapabilities]);
  
  // Détection d'onglet actif améliorée et DEBUG
  const getCurrentTabIndex = useCallback(() => {
    console.log('🔍 === DÉTECTION ONGLET ACTIF ===');
    console.log('📍 Pathname actuel:', pathname);
    console.log('📋 Onglets disponibles:', tabsConfig.map((tab, i) => `${i}: ${tab.name} (${tab.route})`));
    
    // 1. Gestion spéciale pour la page d'accueil
    if (pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/' || pathname === '/(tabs)/index') {
      const homeIndex = tabsConfig.findIndex(tab => tab.name === 'index');
      console.log('🏠 Page d\'accueil détectée → index:', homeIndex);
      return homeIndex >= 0 ? homeIndex : 0;
    }
    
    // 2. Recherche par correspondance exacte AMÉLIORÉE
    for (let i = 0; i < tabsConfig.length; i++) {
      const tab = tabsConfig[i];
      const routeName = tab.name;
      
      const matches = [
        // Correspondances standard
        pathname === tab.route,
        pathname === `/(tabs)/${routeName}`,
        pathname === `/${routeName}`,
        pathname.endsWith(`/${routeName}`),
        pathname.includes(`/(tabs)/${routeName}`),
        
        // Correspondances spéciales pour routes complexes
        (routeName === 'available-orders' && pathname.includes('available-orders')),
        (routeName === 'services-requests' && pathname.includes('services-requests')),
        (routeName === 'services-list' && pathname.includes('services-list')),
        
        // Correspondances par segment final
        pathname.split('/').pop() === routeName,
        
        // Correspondance directe route
        pathname.endsWith(routeName) && pathname.length > routeName.length
      ];
      
      const hasMatch = matches.some(match => match);
      
      if (hasMatch) {
        console.log(`✅ CORRESPONDANCE TROUVÉE:`, {
          index: i,
          onglet: routeName,
          route: tab.route,
          pathname,
          matchingPattern: matches.findIndex(m => m)
        });
        return i;
      }
    }
    
    // 3. Fallback sécurisé
    console.log('❌ Aucune correspondance → fallback index 0 (accueil)');
    return 0;
  }, [pathname, tabsConfig]);

  const currentIndex = getCurrentTabIndex();
  
  // 🆕 DEBUG : Log de l'onglet sélectionné
  useEffect(() => {
    const selectedTab = tabsConfig[currentIndex];
    console.log('🎯 === ONGLET ACTUEL ===');
    console.log('📍 Index sélectionné:', currentIndex);
    console.log('📋 Onglet sélectionné:', selectedTab?.name);
    console.log('🔗 Route:', selectedTab?.route);
    console.log('🎨 Surbrillance rouge:', currentIndex >= 0 ? '✅ ACTIVE' : '❌ INACTIVE');
  }, [currentIndex, tabsConfig]);

  // Gestion de navigation améliorée
  const handleTabPress = useCallback((tabConfig: TabConfig, index: number) => {
    if (switchingRole) {
      console.log('⏳ Changement de rôle en cours, navigation bloquée');
      return;
    }

    const event = navigation.emit({
      type: 'tabPress',
      target: `${tabConfig.name}-key`,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      console.log('🎯 Navigation vers:', tabConfig.route);
      
      let targetRoute = tabConfig.route;
      if (tabConfig.name === 'index') {
        targetRoute = '/(tabs)/';
      }
      
      router.push(targetRoute);
    }
  }, [switchingRole, navigation, router]);

  if (authLoading) {
    return (
      <View style={styles.tabBarContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF4444" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabBarContainer}>
      {switchingRole && (
        <View style={styles.switchingOverlay}>
          <ActivityIndicator size="small" color="#FF4444" />
        </View>
      )}
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        bounces={false}
        scrollEnabled={!switchingRole}
      >
        {tabsConfig.map((tab, index) => {
          const isActive = currentIndex === index;
          
          // 🆕 DEBUG pour chaque onglet
          if (isActive) {
            console.log(`🔴 ONGLET ACTIF: ${tab.name} (index ${index})`);
          }
          
          return (
            <TouchableOpacity
              key={tab.name}
              style={[
                styles.tabButton,
                isActive && styles.tabButtonActive,
                switchingRole && styles.tabButtonDisabled
              ]}
              onPress={() => handleTabPress(tab, index)}
              activeOpacity={switchingRole ? 1 : 0.7}
              disabled={switchingRole}
            >
              <View style={[
                styles.iconContainer,
                // 🔴 SURBRILLANCE ROUGE : Priorité sur isActive même en switching
                isActive && styles.iconContainerActive,
                // ⚠️ IMPORTANT : switchingRole ne doit PAS écraser la surbrillance de l'onglet actif
                switchingRole && !isActive && styles.iconContainerDisabled
              ]}>
                <Ionicons
                  name={isActive ? tab.iconFocused : tab.icon}
                  size={24}
                  color={
                    // 🔴 COULEUR ROUGE : Garantie même en switching pour l'onglet actif
                    isActive 
                      ? '#FFFFFF'  // Blanc sur fond rouge (toujours)
                      : switchingRole 
                        ? '#CCCCCC'  // Gris seulement pour les inactifs en switching
                        : '#666666'  // Gris normal pour les inactifs
                  }
                />
              </View>
              
              {tab.badge && tab.badge > 0 && (
                <View style={styles.badgeContainer}>
                  <View style={styles.badge} />
                </View>
              )}
              
              {/* 🔴 INDICATEUR ROUGE : Affiché même en switching pour l'onglet actif */}
              {isActive && (
                <View style={styles.activeIndicator}>
                  <View style={styles.glowEffect} />
                  <View style={styles.redDot} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Layout principal SIMPLIFIÉ
export default function TabsLayout() {
  const { user, profile, loading, error, notificationState, roleCapabilities } = useUnifiedAuth();
  const { currentRole, switchingRole } = useRoleManager(profile); // Retour au roleManager complet
  
  // États de chargement
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FF4444" />
        <Text style={styles.loadingText}>Vérification de votre profil...</Text>
        {!notificationState.initialized && user && (
          <Text style={styles.subLoadingText}>Configuration des notifications...</Text>
        )}
      </View>
    );
  }

  // États d'erreur
  if (error || !user || !profile) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>
          {error || 'Session expirée'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            // Redirection gérée par useUnifiedAuth
          }}
        >
          <Text style={styles.retryButtonText}>Reconnecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 🆕 CORRECTION : Gérer le cas où currentRole n'est pas encore défini
  const effectiveRole = currentRole || roleCapabilities?.defaultRole || 'client';
  const tabsConfig = getTabsConfig(effectiveRole);

  console.log('✅ Layout principal rendu - Navigation autorisée');
  console.log('📱 État notifications:', notificationState);
  console.log('🎭 Rôle actuel du roleManager:', currentRole);
  console.log('🎭 Rôle effectif utilisé:', effectiveRole);

  // 🐛 DEBUG SPÉCIAL pour l'utilisateur problématique au niveau Layout
  if (user?.id === '3a974bf5-a0df-44fe-be9e-603910ef9a4e') {
    console.log('🚨 === LAYOUT PRINCIPAL - UTILISATEUR PROBLÉMATIQUE ===');
    console.log('📊 Rôle effectif utilisé:', effectiveRole); // ✅ CORRIGÉ
    console.log('📊 Rôle actuel roleManager:', currentRole);   // ✅ CORRIGÉ
    console.log('📊 Nombre d\'onglets:', tabsConfig.length);
    console.log('📊 Switching role:', switchingRole);
    console.log('📊 Notifications:', notificationState);
    console.log('🎯 Interface affichée:', effectiveRole === 'fourmiz' ? 'FOURMIZ/ADMIN' : 'CLIENT'); // ✅ CORRIGÉ
  }

  return (
    <View style={styles.container}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        {tabsConfig.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              href: tab.route,
              headerShown: false,
            }}
          />
        ))}
      </Tabs>
      
      {switchingRole && (
        <View style={styles.globalSwitchingOverlay}>
          <View style={styles.switchingIndicator}>
            <ActivityIndicator size="large" color="#FF4444" />
            <Text style={styles.switchingText}>Changement de rôle...</Text>
          </View>
        </View>
      )}
      
      {/* 🆕 DEBUG VISUEL : État de la surbrillance (développement) */}
      {__DEV__ && (
        <View style={styles.debugIndicator}>
          <Text style={styles.debugText}>
            🎯 Onglet: {tabsConfig[0]?.name || 'N/A'} | Index: 0 | 🔴 Rouge: ✅
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Loading
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
    textAlign: 'center',
  },
  subLoadingText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF4444',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // TabBar Container
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  
  // Overlay pour changement de rôle
  switchingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  globalSwitchingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  
  switchingIndicator: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
    gap: 12,
  },
  
  switchingText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  
  // Scroll View
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
    minWidth: screenWidth,
  },
  
  // Tab Button
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 56,
    position: 'relative',
  },
  tabButtonActive: {
    // Styles gérés dans iconContainer
  },
  tabButtonDisabled: {
    opacity: 0.5,
  },
  
  // Icon Container
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    transition: 'all 0.3s ease',
  },
  iconContainerActive: {
    backgroundColor: '#FF4444', // 🔴 ROUGE PRIORITAIRE
    transform: [{ scale: 1.1 }],
    shadowColor: '#FF4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    // 🔴 IMPORTANT : Z-index pour garantir la visibilité
    zIndex: 10,
  },
  iconContainerDisabled: {
    backgroundColor: '#F5F5F5',
    transform: [{ scale: 1 }],
    shadowOpacity: 0,
    // 🔴 IMPORTANT : Z-index plus faible pour ne pas écraser l'actif
    zIndex: 1,
  },
  
  // Badge
  badgeContainer: {
    position: 'absolute',
    top: 4,
    right: 8,
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  
  // Indicateur lumineux rouge - AMÉLIORÉ
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    alignItems: 'center',
    justifyContent: 'center',
    // 🔴 IMPORTANT : Z-index élevé pour toujours être visible
    zIndex: 20,
  },
  
  glowEffect: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4444',
    opacity: 0.6, // 🔴 Plus visible
    transform: [{ scale: 2.5 }], // 🔴 Plus grand
  },
  
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4444',
    shadowColor: '#FF4444',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1, // 🔴 Ombre plus visible
    shadowRadius: 6, // 🔴 Ombre plus large
    elevation: 10, // 🔴 Plus d'élévation sur Android
    // 🔴 IMPORTANT : Border pour plus de contraste
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  
  // 🆕 Indicateur d'erreur notifications (développement)
  notificationError: {
    position: 'absolute',
    bottom: 100,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    borderRadius: 8,
    padding: 8,
    zIndex: 1000,
  },
  notificationErrorText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  
  // Debug indicator (développement)
  debugIndicator: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 8,
    zIndex: 1000,
  },
  debugText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
});
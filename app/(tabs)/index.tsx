// app/(tabs)/index.tsx - VERSION CORRIGÉE PGRST116 SANS HEADER LOCAL + AUTHSESSIONMISSINGERROR
// ✅ FONCTIONNALITÉS CONSERVÉES : switch rôles, modal upgrade, admin, etc.
// 🎨 STYLE IDENTIQUE À services.tsx : couleurs noir/gris, textes épurés
// 🔧 MODIFIÉ : Header local supprimé (utilise le header global du layout)
// 🔧 MODIFIÉ : Suppression des références "Mon Portefeuille" (intégré dans Gains)
// 🔧 AJOUTÉ : Bouton de déconnexion en haut de page
// 🔧 MODIFIÉ : Suppression des textes de bienvenue
// 🐛 CORRIGÉ : Erreur PGRST116 dans loadUserData
// 🐛 CORRIGÉ : Erreur AuthSessionMissingError après suppression de compte

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useSharedRoleManager, emitRoleChange } from '@/app/(tabs)/_layout';
import { useSignOut } from '@/hooks/useSignOut';

const { width } = Dimensions.get('window');

// 🔧 CONFIGURATION NOTIFICATIONS PROPRE
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// 🛡️ HELPERS DE SÉCURITÉ POUR EMAIL ET STRINGS
const safeString = (value: any): string => {
  return value?.toString() || '';
};

const checkEmailInList = (email: string | null | undefined, authorizedEmails: string[]): boolean => {
  if (!email || typeof email !== 'string') return false;
  return authorizedEmails.includes(email);
};

const extractNameFromEmail = (email: string | null | undefined): string => {
  if (!email) return 'Utilisateur';
  
  try {
    const emailPart = safeString(email.split('@')[0]);
    let firstName = emailPart;
    
    // 🛡️ VÉRIFICATION SÉCURISÉE avec safeString
    const safeEmailPart = safeString(emailPart);
    if (safeEmailPart.includes('.')) {
      firstName = safeEmailPart.split('.')[0];
    }
    
    // Nettoyer les chiffres et underscores
    firstName = firstName.replace(/[0-9_-]/g, '');
    
    if (firstName.length > 0) {
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
  } catch (error) {
    console.error('❌ Erreur extraction nom depuis email:', error);
  }
  
  return 'Utilisateur';
};

// TYPES - STRUCTURE RÉELLE
interface UserProfile {
  id: string;
  firstname?: string;
  lastname?: string;
  roles?: string[];
  email?: string;
  phone?: string;
  address?: string;
  building?: string;
  floor?: string;
  city?: string;
  postal_code?: string;
  postalcode?: string; // Ancien champ
  alternative_phone?: string;
  avatar_url?: string;
  profile_completed?: boolean;
  is_online?: boolean;
}

interface MainPage {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  roleRequired?: 'client' | 'fourmiz' | 'both';
}

// 🔧 CONFIGURATION ADMIN SÉCURISÉE
const AUTHORIZED_ADMIN_EMAILS = ['garrec.gildas@gmail.com'];

// 🛡️ CONFIGURATION DÉVELOPPEMENT - Afficher le bouton de déconnexion
const SHOW_SIGNOUT_BUTTON = __DEV__ || false; // true en dev, false en production

// 🔧 Hook sécurisé pour l'authentification - VERSION CORRIGÉE AUTHSESSIONMISSINGERROR
const useSecureAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 🔧 NOUVEAU : Vérifier d'abord la session avant de récupérer l'utilisateur
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        // Gérer spécifiquement l'erreur de session manquante
        if (sessionError.message?.includes('Auth session missing')) {
          console.log('👤 Session supprimée/expirée - arrêt silencieux du chargement');
          setError('Session expirée');
          return;
        }
        console.error('❌ Erreur récupération session:', sessionError);
        setError('Erreur de session');
        return;
      }

      if (!session) {
        console.log('👤 Pas de session active - utilisateur non connecté');
        setError('Non connecté');
        return;
      }

      // Récupérer l'utilisateur actuel
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        // Gérer spécifiquement l'erreur de session manquante
        if (userError.message?.includes('Auth session missing')) {
          console.log('👤 Session supprimée pendant la récupération - arrêt silencieux');
          setError('Session expirée');
          return;
        }
        console.error('❌ Erreur récupération utilisateur:', userError);
        setError('Erreur de connexion');
        return;
      }

      if (!user) {
        setError('Non connecté');
        return;
      }

      setUser(user);

      // 🔧 VÉRIFICATION ADMIN SÉCURISÉE avec helper
      const hasAdminAccess = checkEmailInList(user.email, AUTHORIZED_ADMIN_EMAILS);
      setIsAdmin(hasAdminAccess);

      // 🐛 CORRIGÉ : Récupérer le profil SANS erreur PGRST116
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*') // Récupérer tous les champs disponibles
        .eq('id', user.id)
        .maybeSingle(); // ✅ CORRIGÉ: .single() → .maybeSingle()

      if (profileError) {
        console.error('❌ Erreur récupération profil:', profileError);
        setError('Erreur de chargement du profil');
        return;
      }

      if (!profileData) {
        // 🛡️ CRÉATION SÉCURISÉE DU PROFIL MINIMAL quand aucun profil n'existe
        console.log('📝 Aucun profil trouvé, création d\'un profil minimal');
        const firstName = extractNameFromEmail(user.email);
          
        const minimalProfile: UserProfile = {
          id: user.id,
          email: user.email,
          firstname: firstName,
          roles: ['user']
        };
        setProfile(minimalProfile);
      } else {
        // Déterminer les rôles (gérer les différents formats)
        let userRoles: string[] = ['user'];
        
        // Vérifier TOUTES les possibilités de rôles
        if (profileData.roles && Array.isArray(profileData.roles)) {
          userRoles = profileData.roles;
        } else if (profileData.roles && typeof profileData.roles === 'string') {
          userRoles = [profileData.roles];
        } else if (profileData.role) {
          userRoles = [profileData.role];
        }
        
        const userProfile: UserProfile = {
          id: profileData.id,
          firstname: profileData.firstname,
          lastname: profileData.lastname,
          email: profileData.email || user.email,
          phone: profileData.phone,
          address: profileData.address,
          building: profileData.building,
          floor: profileData.floor,
          city: profileData.city,
          postal_code: profileData.postal_code,
          postalcode: profileData.postalcode,
          alternative_phone: profileData.alternative_phone,
          avatar_url: profileData.avatar_url,
          profile_completed: profileData.profile_completed,
          is_online: profileData.is_online,
          roles: userRoles
        };
        
        setProfile(userProfile);
      }

    } catch (error: any) {
      // 🔧 NOUVEAU : Gestion spécifique des erreurs de session
      if (error.message?.includes('Auth session missing')) {
        console.log('👤 Session supprimée (catch) - arrêt silencieux du chargement');
        setError('Session expirée');
        return;
      }
      
      console.error('💥 Erreur fatale chargement utilisateur:', error);
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  return { user, profile, isAdmin, loading, error, refetch: loadUserData };
};

export default function HomeScreen() {
  const { user, profile, isAdmin, loading: authLoading, error: authError, refetch } = useSecureAuth();
  
  // 🔧 CHANGÉ : Utilisation du Context partagé au lieu du hook direct
  const {
    currentRole,
    availableRoles,
    switchingRole,
    canSwitchRole,
    hasClientRole,
    hasFourmizRole,
    switchRole: handleRoleSwitch,
    roleManagerAdapter
  } = useSharedRoleManager();
  
  // 🔧 Accès aux méthodes du roleManagerAdapter (gardées intactes)
  const {
    canRequestOtherRole,
    requestRoleUpgrade,
    isProfileCompleteForRole,
    getMissingFieldsForRole,
    canBecomeClient,
    canBecomeFourmiz
  } = roleManagerAdapter || {};
  
  // 🔧 NOUVEAU : Hook de déconnexion
  const { signOut, isSigningOut } = useSignOut();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showRoleUpgradeModal, setShowRoleUpgradeModal] = useState(false);

  // 📢 CONFIGURATION NOTIFICATIONS PROPRE - SANS TESTS
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // Demander les permissions notifications
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permissions notifications non accordées');
          return;
        }
        
        console.log('✅ Notifications configurées');
      } catch (error) {
        console.error('❌ Erreur configuration notifications:', error);
      }
    };

    setupNotifications();
  }, []);

  // 🔧 Changer de rôle - MODIFIÉ : Feedback précis sans mention RIB
  const toggleRole = useCallback(async () => {
    if (switchingRole) return;
    
    const targetRole = currentRole === 'client' ? 'fourmiz' : 'client';
    
    const result = await handleRoleSwitch(targetRole);
    
    // 🌍 Émettre l'événement après un switch réussi
    if (result.success) {
      emitRoleChange(targetRole);
    } else if (result.needsCompletion && targetRole === 'fourmiz') {
      // 🔧 MODIFIÉ : Feedback précis selon les champs manquants
      const missingFields = result.missingFields || [];
      
      if (missingFields.includes('has_identity_document')) {
        Alert.alert(
          '📝 Pièce d\'identité requise',
          'Pour passer en mode Fourmiz, vous devez ajouter une pièce d\'identité à votre profil.\n\nCela ne prendra qu\'une minute !',
          [
            { text: 'Plus tard', style: 'cancel' },
            { 
              text: 'Ajouter maintenant', 
              onPress: () => router.push('/auth/complete-profile-fourmiz?from=home'),
              style: 'default'
            }
          ]
        );
      } else {
        // Autres champs manquants (firstname, email, etc.)
        Alert.alert(
          '📝 Profil incomplet',
          'Votre profil doit être complété pour passer en mode Fourmiz.',
          [
            { text: 'Plus tard', style: 'cancel' },
            { 
              text: 'Compléter', 
              onPress: () => router.push('/auth/complete-profile-fourmiz?from=home'),
              style: 'default'
            }
          ]
        );
      }
    } else if (!result.success) {
      // Autres erreurs
      Alert.alert(
        'Impossible de changer de rôle',
        result.error || 'Une erreur est survenue. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    }
  }, [currentRole, handleRoleSwitch, switchingRole, router]);

  // 🔧 MODIFIÉ : Demander l'autre rôle avec message corrigé
  const requestOtherRole = useCallback(async (targetRole: 'client' | 'fourmiz') => {
    try {
      // 🔧 Vérification sécurisée des méthodes
      if (!isProfileCompleteForRole || !getMissingFieldsForRole || !requestRoleUpgrade) {
        console.error('❌ Méthodes du roleManagerAdapter non disponibles');
        return;
      }
      
      // Vérifier si le profil est complet pour ce rôle
      const isComplete = isProfileCompleteForRole(targetRole);
      const missingFields = getMissingFieldsForRole(targetRole);
      
      if (!isComplete && targetRole === 'fourmiz') {
        // Profil incomplet pour Fourmiz ? Redirection vers complétion partielle
        setShowRoleUpgradeModal(false);
        
        Alert.alert(
          '📝 Pièce d\'identité requise',
          'Pour devenir Fourmiz, nous avons besoin d\'ajouter une pièce d\'identité à votre profil. Cela ne prendra qu\'une minute !',
          [
            { text: 'Plus tard', style: 'cancel' },
            { 
              text: 'Ajouter maintenant', 
              onPress: () => router.push('/auth/complete-profile-fourmiz?from=home')
            }
          ]
        );
        return;
      }
      
      // Profil complet ou demande de rôle client ? Utiliser la demande standard
      await requestRoleUpgrade(targetRole);
      setShowRoleUpgradeModal(false);
      
    } catch (error) {
      console.error('❌ Erreur demande rôle:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer votre demande pour le moment.');
    }
  }, [isProfileCompleteForRole, getMissingFieldsForRole, requestRoleUpgrade]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // 🔧 Pages principales selon le statut - COULEURS IDENTIQUES SERVICES - SANS PORTEFEUILLE
  const mainPages: MainPage[] = useMemo(() => {
    if (currentRole === 'client') {
      // MENU CLIENT 
      return [
        {
          id: 'services',
          title: 'Services',
          description: 'Créer une demande ou choisir un service',
          icon: 'construct-outline',
          route: '/(tabs)/services',
          color: '#000000',
          roleRequired: 'client'
        },
        {
          id: 'orders',
          title: 'Mes Commandes',
          description: 'Suivre mes commandes en cours et historique',
          icon: 'bag-outline',
          route: '/(tabs)/orders',
          color: '#000000',
          roleRequired: 'client'
        },
        {
          id: 'messages',
          title: 'Messages',
          description: 'Communiquer avec vos Fourmiz',
          icon: 'chatbubble-outline',
          route: '/(tabs)/messages',
          color: '#000000',
          roleRequired: 'client'
        },
        {
          id: 'network',
          title: 'Mon Réseau',
          description: 'Parrainer et développer votre réseau',
          icon: 'people-outline',
          route: '/(tabs)/network',
          color: '#000000',
          roleRequired: 'client'
        },
        {
          id: 'earnings',
          title: 'Mes Revenus & Portefeuille',
          description: 'Gains du parrainage, cashback et retraits',
          icon: 'trending-up-outline',
          route: '/(tabs)/earnings',
          color: '#000000',
          roleRequired: 'client'
        },
        {
          id: 'rewards',
          title: 'Mes Récompenses',
          description: 'Points fidélité et offres spéciales',
          icon: 'gift-outline',
          route: '/(tabs)/rewards',
          color: '#000000',
          roleRequired: 'client'
        },
        {
          id: 'profile',
          title: 'Mon Profil',
          description: 'Gérer mes informations personnelles',
          icon: 'person-outline',
          route: '/(tabs)/profile',
          color: '#000000',
          roleRequired: 'client'
        }
      ];
    } else {
      // MENU FOURMIZ
      return [
        {
          id: 'services-demand',
          title: 'Services en demande',
          description: 'Parcourir et accepter des missions',
          icon: 'search-outline',
          route: '/(tabs)/available-orders',
          color: '#000000',
          roleRequired: 'fourmiz'
        },
        {
          id: 'services-requests',
          title: 'Mes Services en cours',
          description: 'Gérer mes missions acceptées',
          icon: 'build-outline',
          route: '/(tabs)/services-requests',
          color: '#000000',
          roleRequired: 'fourmiz'
        },
        {
          id: 'messages',
          title: 'Messages',
          description: 'Communiquer avec vos Clients',
          icon: 'chatbubble-outline',
          route: '/(tabs)/messages',
          color: '#000000',
          roleRequired: 'fourmiz'
        },
        {
          id: 'calendar',
          title: 'Mon Calendrier',
          description: 'Voir votre calendrier',
          icon: 'calendar-outline',
          route: '/(tabs)/calendar',
          color: '#000000',
          roleRequired: 'fourmiz'
        },
        {
          id: 'network',
          title: 'Mon Réseau',
          description: 'Parrainer des Clients et Fourmiz',
          icon: 'people-outline',
          route: '/(tabs)/network',
          color: '#000000',
          roleRequired: 'fourmiz'
        },
        {
          id: 'earnings',
          title: 'Mes Revenus & Portefeuille',
          description: 'Gains des missions, parrainage et retraits',
          icon: 'cash-outline',
          route: '/(tabs)/earnings',
          color: '#000000',
          roleRequired: 'fourmiz'
        },
        {
          id: 'rewards',
          title: 'Mes Récompenses',
          description: 'Bonus performance et fidélité',
          icon: 'trophy-outline',
          route: '/(tabs)/rewards',
          color: '#000000',
          roleRequired: 'fourmiz'
        },
        {
          id: 'criteria',
          title: 'Mes Critères',
          description: 'Définir mes compétences et disponibilités',
          icon: 'options-outline',
          route: '/(tabs)/criteria',
          color: '#000000',
          roleRequired: 'fourmiz'
        },
        {
          id: 'profile',
          title: 'Mon Profil',
          description: 'Gérer mes informations professionnelles',
          icon: 'person-outline',
          route: '/(tabs)/profile',
          color: '#000000',
          roleRequired: 'fourmiz'
        }
      ];
    }
  }, [currentRole]);

  // 🎯 NOUVEAU : Pages affichées avec carte role upgrade intégrée
  const visiblePages = useMemo(() => {
    const pages = [...mainPages];
    
    // 🔧 AJOUT : Intégrer la carte "Devenir Client/Fourmiz" après "Mon Profil"
    if (canRequestOtherRole) {
      const roleUpgradePage: MainPage = {
        id: 'role-upgrade',
        title: canRequestOtherRole === 'fourmiz' ? 'Devenir Fourmiz' : 'Devenir Client',
        description: canRequestOtherRole === 'fourmiz' 
          ? 'Monétisez vos compétences et gagnez de l\'argent'
          : 'Accédez à tous les services Fourmiz',
        icon: canRequestOtherRole === 'fourmiz' ? 'construct' : 'storefront',
        route: '', // Pas de route, on utilise la modal
        color: '#000000',
        roleRequired: 'both'
      };
      pages.push(roleUpgradePage);
    }
    
    return pages;
  }, [mainPages, canRequestOtherRole]);

  // 🔧 RÉCUPÉRER LE PRÉNOM - VERSION SÉCURISÉE
  const getDisplayName = () => {
    // 1. Essayer firstname (champ principal)
    const firstName = safeString(profile?.firstname).trim();
    if (firstName) {
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
    
    // 2. Construire le prénom depuis firstname + lastname
    const firstNamePart = safeString(profile?.firstname);
    const lastNamePart = safeString(profile?.lastname);
    if (firstNamePart && lastNamePart) {
      const fullName = `${firstNamePart} ${lastNamePart}`.trim();
      const extractedFirstName = fullName.split(' ')[0];
      return extractedFirstName.charAt(0).toUpperCase() + extractedFirstName.slice(1).toLowerCase();
    }
    
    // 3. Utiliser lastname si firstname manque
    const lastName = safeString(profile?.lastname).trim();
    if (lastName) {
      return lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
    }
    
    // 4. 🛡️ EXTRACTION SÉCURISÉE DEPUIS L'EMAIL
    const extractedName = extractNameFromEmail(user?.email);
    return extractedName;
  };

  // ❌ Gestion des erreurs
  if (authError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#333333" />
          <Text style={styles.errorTitle}>Erreur de connexion</Text>
          <Text style={styles.errorText}>{authError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement de votre espace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color="#333333" />
          <Text style={styles.errorTitle}>Profil non trouvé</Text>
          <Text style={styles.errorText}>Impossible de charger votre profil</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Recharger</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 🔧 RENDU PRINCIPAL - STYLE SERVICES.TSX SANS HEADER
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

        {/* Switch Client/Fourmiz - STYLE SERVICES */}
        {canSwitchRole && (
          <View style={styles.roleSection}>
            <View style={styles.switchButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.switchButton,
                  styles.switchButtonLeft,
                  currentRole === 'client' && styles.switchButtonActive
                ]}
                onPress={() => currentRole !== 'client' && !switchingRole && toggleRole()}
                disabled={switchingRole}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color={currentRole === 'client' ? '#fff' : '#333333'} 
                />
                <Text style={[
                  styles.switchButtonText,
                  currentRole === 'client' && styles.switchButtonTextActive
                ]}>
                  Client 
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.switchButton,
                  styles.switchButtonRight,
                  currentRole === 'fourmiz' && styles.switchButtonActive
                ]}
                onPress={() => currentRole !== 'fourmiz' && !switchingRole && toggleRole()}
                disabled={switchingRole}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name="construct-outline" 
                  size={20} 
                  color={currentRole === 'fourmiz' ? '#fff' : '#333333'} 
                />
                <Text style={[
                  styles.switchButtonText,
                  currentRole === 'fourmiz' && styles.switchButtonTextActive
                ]}>
                  Fourmiz
                </Text>
              </TouchableOpacity>
            </View>

            {switchingRole && (
              <View style={styles.switchingIndicatorContainer}>
                <ActivityIndicator size="small" color="#333333" />
                <Text style={styles.switchingText}>Changement en cours...</Text>
              </View>
            )}
          </View>
        )}

        {/* Section Admin - STYLE SERVICES */}
        {isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.roleSectionTitle}>🛡️ Administration</Text>
            <TouchableOpacity
              style={styles.adminCard}
              onPress={() => router.push('/admin/dashboard')}
              activeOpacity={0.8}
            >
              <View style={styles.adminCardContent}>
                <View style={styles.adminIcon}>
                  <Ionicons name="shield-checkmark" size={20} color="#000000" />
                </View>
                <View style={styles.adminInfo}>
                  <Text style={styles.adminTitle}>Tableau de bord admin</Text>
                  <Text style={styles.adminDescription}>Gérer l'application et les utilisateurs</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#333333" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Pages principales - STYLE SERVICES */}
        <View style={styles.pagesSection}>
          <View style={styles.pagesSectionHeader}>
            <Text style={styles.roleSectionTitle}>
              {currentRole === 'client' ? 'Menu Client' : 'Menu Fourmiz'}
            </Text>
            <TouchableOpacity
              style={styles.signoutButton}
              onPress={() => {
                Alert.alert(
                  'Déconnexion',
                  'Êtes-vous sûr de vouloir vous déconnecter ?',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { 
                      text: 'Se déconnecter', 
                      style: 'destructive',
                      onPress: signOut
                    }
                  ]
                );
              }}
              disabled={isSigningOut}
              activeOpacity={0.8}
            >
              {isSigningOut ? (
                <ActivityIndicator size="small" color="#333333" />
              ) : (
                <Ionicons name="log-out-outline" size={20} color="#333333" />
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.pagesGrid}>
            {visiblePages.map((page) => (
              <TouchableOpacity
                key={page.id}
                style={styles.pageCard}
                onPress={() => {
                  // 🔧 GESTION SPÉCIALE : Carte role upgrade ouvre la modal
                  if (page.id === 'role-upgrade') {
                    setShowRoleUpgradeModal(true);
                  } else {
                    router.push(page.route);
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.pageIconContainer}>
                  <View style={styles.pageIcon}>
                    <Ionicons name={page.icon} size={20} color="#000000" />
                  </View>
                </View>
                
                <View style={styles.pageContent}>
                  <Text style={styles.pageTitle}>{page.title}</Text>
                  <Text style={styles.pageDescription} numberOfLines={2}>
                    {page.description}
                  </Text>
                </View>

                <View style={styles.pageArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#333333" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal d'upgrade de rôle - STYLE SERVICES */}
      <Modal 
        visible={showRoleUpgradeModal} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRoleUpgradeModal(false)}
      >
        <View style={styles.upgradeModal}>
          <View style={styles.upgradeHeader}>
            <TouchableOpacity 
              onPress={() => setShowRoleUpgradeModal(false)}
              style={styles.upgradeCloseButton}
            >
              <Ionicons name="close" size={24} color="#333333" />
            </TouchableOpacity>
            <Text style={styles.upgradeTitle}>
              {canRequestOtherRole === 'fourmiz' ? 'Devenir Fourmiz' : 'Devenir Client'}
            </Text>
            <View style={styles.upgradeHeaderSpacer} />
          </View>

          <ScrollView style={styles.upgradeContent} showsVerticalScrollIndicator={false}>
            {canRequestOtherRole === 'fourmiz' ? (
              // Avantages FOURMIZ
              <>
                <View style={styles.upgradeIntro}>
                  <Text style={styles.upgradeIntroTitle}>
                    Transformez vos compétences en revenus ! 💰
                  </Text>
                  <Text style={styles.upgradeIntroText}>
                    Rejoignez notre communauté de fourmiz et commencez à gagner de l'argent en proposant vos services.
                  </Text>
                </View>

                <View style={styles.upgradeAdvantages}>
                  <Text style={styles.upgradeAdvantagesTitle}>✨ Vos avantages en tant que Fourmiz :</Text>
                  
                  {[
                    { icon: 'cash-outline', title: 'Revenus flexibles', desc: 'Gagnez selon votre disponibilité' },
                    { icon: 'time-outline', title: 'Liberté horaire', desc: 'Choisissez vos missions et horaires' },
                    { icon: 'trending-up-outline', title: 'Tarifs', desc: 'Choisissez les courses et les tarifs qui vous conviennent' },
                    { icon: 'people-outline', title: 'Réseau professionnel', desc: 'Développez votre clientèle par le parrainage' },
                    { icon: 'shield-checkmark-outline', title: 'Sécurité garantie', desc: 'Paiements sécurisés' },
                    { icon: 'star-outline', title: 'Réputation', desc: 'Construisez votre réputation' },
                    { icon: 'gift-outline', title: 'Récompenses', desc: 'Points fidélité et cashbacks' }
                  ].map((advantage, index) => (
                    <View key={index} style={styles.upgradeAdvantageItem}>
                      <View style={styles.upgradeAdvantageIcon}>
                        <Ionicons name={advantage.icon as any} size={20} color="#000000" />
                      </View>
                      <View style={styles.upgradeAdvantageContent}>
                        <Text style={styles.upgradeAdvantageTitle}>{advantage.title}</Text>
                        <Text style={styles.upgradeAdvantageDesc}>{advantage.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.upgradeProcess}>
                  <Text style={styles.upgradeProcessTitle}>🔄 Comment ça marche :</Text>
                  <Text style={styles.upgradeProcessStep}>1. Complétez votre profil et ajoutez vos compétences</Text>
                  <Text style={styles.upgradeProcessStep}>2. Définissez vos critères et disponibilités</Text>
                  <Text style={styles.upgradeProcessStep}>3. Recevez des missions adaptées à votre profil</Text>
                  <Text style={styles.upgradeProcessStep}>4. Réalisez les missions et recevez vos paiements</Text>
                </View>
              </>
            ) : (
              // Avantages CLIENT  
              <>
                <View style={styles.upgradeIntro}>
                  <Text style={styles.upgradeIntroTitle}>
                    Accédez à tous nos services ! 🛒
                  </Text>
                  <Text style={styles.upgradeIntroText}>
                    Devenez client et profitez de milliers de fourmiz qualifiés pour tous vos besoins.
                  </Text>
                </View>

                <View style={styles.upgradeAdvantages}>
                  <Text style={styles.upgradeAdvantagesTitle}>✨ Vos avantages en tant que Client :</Text>
                  
                  {[
                    { icon: 'construct-outline', title: 'Services variés', desc: 'Accès à tous les services' },
                    { icon: 'flash-outline', title: 'Rapidité', desc: 'Trouvez une Fourmiz en quelques minutes' },
                    { icon: 'shield-checkmark-outline', title: 'Qualité garantie', desc: 'Fourmiz vérifiés et assurés' },
                    { icon: 'card-outline', title: 'Paiement sécurisé', desc: 'Payez en fin de mission' },
                    { icon: 'chatbubble-outline', title: 'Communication directe', desc: 'Échangez facilement' },
                    { icon: 'gift-outline', title: 'Récompenses', desc: 'Points fidélité et cashbacks' }
                  ].map((advantage, index) => (
                    <View key={index} style={styles.upgradeAdvantageItem}>
                      <View style={styles.upgradeAdvantageIcon}>
                        <Ionicons name={advantage.icon as any} size={20} color="#000000" />
                      </View>
                      <View style={styles.upgradeAdvantageContent}>
                        <Text style={styles.upgradeAdvantageTitle}>{advantage.title}</Text>
                        <Text style={styles.upgradeAdvantageDesc}>{advantage.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.upgradeProcess}>
                  <Text style={styles.upgradeProcessTitle}>🔄 Comment ça marche :</Text>
                  <Text style={styles.upgradeProcessStep}>1. Décrivez votre besoin ou choisissez un service</Text>
                  <Text style={styles.upgradeProcessStep}>2. Recevez des propositions de fourmiz qualifiés</Text>
                  <Text style={styles.upgradeProcessStep}>3. Choisissez votre fourmiz et planifiez</Text>
                  <Text style={styles.upgradeProcessStep}>4. Payez une fois le service terminé</Text>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.upgradeActions}>
            <TouchableOpacity 
              style={styles.upgradeCancelButton}
              onPress={() => setShowRoleUpgradeModal(false)}
            >
              <Text style={styles.upgradeCancelText}>Plus tard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.upgradeConfirmButton}
              onPress={() => {
                if (canRequestOtherRole) {
                  requestOtherRole(canRequestOtherRole);
                }
              }}
            >
              <Text style={styles.upgradeConfirmText}>
                {canRequestOtherRole === 'fourmiz' ? 'Devenir Fourmiz' : 'Devenir Client'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// 🎨 STYLES IDENTIQUES À SERVICES.TSX - HEADER SUPPRIMÉ - SIGNOUT SECTION AJUSTÉE
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },

  // ⏳ Loading & Error - STYLE SERVICES
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
  retryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Sections - STYLE SERVICES
  roleSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 20,
  },
  adminSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  pagesSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  roleSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 0, // Supprimé marginBottom car maintenant dans un flex row
  },
  signoutButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },

  // Switch - STYLE SERVICES
  switchButtonContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 4,
  },
  switchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  switchButtonLeft: {
    marginRight: 2,
  },
  switchButtonRight: {
    marginLeft: 2,
  },
  switchButtonActive: {
    backgroundColor: '#000000',
  },
  switchButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  switchButtonTextActive: {
    color: '#ffffff',
  },
  switchingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  switchingText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },

  // Admin Card - STYLE SERVICES
  adminCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  adminCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    marginRight: 16,
  },
  adminInfo: {
    flex: 1,
  },
  adminTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  adminDescription: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 20,
    fontWeight: '400',
  },

  // Pages Grid - STYLE SERVICES
  pagesGrid: {
    gap: 16,
  },
  pagesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pageIconContainer: {
    marginRight: 16,
  },
  pageIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  pageContent: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  pageDescription: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 20,
    fontWeight: '400',
  },
  pageArrow: {
    marginLeft: 12,
  },

  bottomSpacer: {
    height: 32,
  },

  // Upgrade Modal - STYLE SERVICES
  upgradeModal: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  upgradeCloseButton: {
    padding: 4,
  },
  upgradeTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  upgradeHeaderSpacer: {
    width: 32,
  },
  upgradeContent: {
    flex: 1,
    padding: 20,
  },
  upgradeIntro: {
    marginBottom: 24,
    alignItems: 'center',
  },
  upgradeIntroTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  upgradeIntroText: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
  upgradeAdvantages: {
    marginBottom: 24,
  },
  upgradeAdvantagesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  upgradeAdvantageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  upgradeAdvantageIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upgradeAdvantageContent: {
    flex: 1,
  },
  upgradeAdvantageTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  upgradeAdvantageDesc: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 20,
    fontWeight: '400',
  },
  upgradeProcess: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  upgradeProcessTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  upgradeProcessStep: {
    fontSize: 13,
    color: '#333333',
    marginBottom: 8,
    lineHeight: 20,
    fontWeight: '400',
  },
  upgradeActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  upgradeCancelButton: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeCancelText: {
    color: '#333333',
    fontSize: 13,
    fontWeight: '600',
  },
  upgradeConfirmButton: {
    flex: 2,
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeConfirmText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
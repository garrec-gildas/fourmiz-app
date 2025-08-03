// app/(tabs)/index.tsx - VERSION FINALE AVEC LOGS DEBUG
// 🚀 VERSION MISE À JOUR : Intégration complète avec roleManager.ts + DÉCONNEXION TEMPORAIRE
// ✅ NOUVEAU : Complétion partielle pour devenir Fourmiz + Bouton déconnexion (DEV)
// 🔧 CORRIGÉ : Accès admin sécurisé + Protection .includes() complète + ADAPTATEUR RÔLES + DEBUG

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRoleManagerAdapter } from '@/lib/useRoleManagerAdapter'; // 🔧 CHANGÉ : Import adaptateur
import { useSignOut } from '@/hooks/useSignOut'; // 🆕 NOUVEAU IMPORT - DÉCONNEXION

const { width } = Dimensions.get('window');

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

// Types - STRUCTURE RÉELLE
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

// ✅ CONFIGURATION ADMIN SÉCURISÉE
const AUTHORIZED_ADMIN_EMAILS = ['garrec.gildas@gmail.com'];

// 🛠️ CONFIGURATION DÉVELOPPEMENT - Afficher le bouton de déconnexion
const SHOW_SIGNOUT_BUTTON = __DEV__ || false; // true en dev, false en production

// ✅ Hook sécurisé pour l'authentification - VERSION CORRIGÉE
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

      // Récupérer l'utilisateur actuel
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ Erreur récupération utilisateur:', userError);
        setError('Erreur de connexion');
        return;
      }

      if (!user) {
        console.log('👤 Aucun utilisateur connecté');
        setError('Non connecté');
        return;
      }

      setUser(user);
      console.log('✅ Utilisateur chargé:', user.email);

      // 🔧 VÉRIFICATION ADMIN SÉCURISÉE avec helper
      const hasAdminAccess = checkEmailInList(user.email, AUTHORIZED_ADMIN_EMAILS);
      setIsAdmin(hasAdminAccess);
      
      if (hasAdminAccess) {
        console.log('👑 Accès admin autorisé pour:', user.email);
      } else {
        console.log('👤 Utilisateur standard:', user.email);
      }

      // Récupérer le profil avec les champs qui existent réellement
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*') // Récupérer tous les champs disponibles
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Erreur récupération profil:', profileError);
        
        // 🛡️ CRÉATION SÉCURISÉE DU PROFIL MINIMAL
        const firstName = extractNameFromEmail(user.email);
          
        const minimalProfile: UserProfile = {
          id: user.id,
          email: user.email,
          firstname: firstName,
          roles: ['user']
        };
        setProfile(minimalProfile);
        console.log('📝 Profil minimal créé:', minimalProfile);
      } else {
        console.log('📋 Profil chargé avec succès pour:', profileData.email || user.email);
        
        // Déterminer les rôles (gérer les différents formats)
        let userRoles: string[] = ['user'];
        
        // Vérifier toutes les possibilités de rôles
        if (profileData.roles && Array.isArray(profileData.roles)) {
          userRoles = profileData.roles;
          console.log('🔑 Rôles depuis profileData.roles (array):', userRoles);
        } else if (profileData.roles && typeof profileData.roles === 'string') {
          userRoles = [profileData.roles];
          console.log('🔑 Rôles depuis profileData.roles (string):', userRoles);
        } else if (profileData.role) {
          userRoles = [profileData.role];
          console.log('🔑 Rôles depuis profileData.role:', userRoles);
        } else {
          console.log('🔑 Aucun rôle trouvé, utilisation par défaut:', userRoles);
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
        console.log('✅ Profil utilisateur chargé avec rôles:', userRoles);
      }

    } catch (error) {
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
  
  // 🔧 NOUVEAU : Utilisation de l'adaptateur au lieu du gestionnaire direct
  const {
    currentRole,
    availableRoles,
    switchingRole,
    canSwitchRole,
    canRequestOtherRole,
    switchRole: handleRoleSwitch,
    requestRoleUpgrade,
    isProfileCompleteForRole,
    getMissingFieldsForRole,
    // États supplémentaires du roleManager pour debug
    hasClientRole,
    hasFourmizRole,
    canBecomeClient,
    canBecomeFourmiz
  } = useRoleManagerAdapter(profile);
  
  // 🆕 NOUVEAU : Hook de déconnexion
  const { signOut, isSigningOut } = useSignOut();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showRoleUpgradeModal, setShowRoleUpgradeModal] = useState(false);

  // 🚨 DEBUG TEMPORAIRE - Logs détaillés pour diagnostiquer
  useEffect(() => {
    console.log('🔍 DEBUG DÉTAILLÉ:', {
      'profile.roles': profile?.roles,
      'hasClientRole': hasClientRole,
      'hasFourmizRole': hasFourmizRole,
      'canBecomeClient': canBecomeClient,
      'canBecomeFourmiz': canBecomeFourmiz,
      'canSwitchRole': canSwitchRole,
      'canRequestOtherRole': canRequestOtherRole,
      'currentRole': currentRole,
      'availableRoles': availableRoles
    });
  }, [profile?.roles, hasClientRole, hasFourmizRole, canBecomeClient, canBecomeFourmiz, canSwitchRole, canRequestOtherRole, currentRole, availableRoles]);

  // 🔍 DEBUG : Logs pour vérifier l'état des rôles
  useEffect(() => {
    console.log('🔍 ÉTAT ACTUEL DES RÔLES:', {
      currentRole,
      canSwitchRole,
      canRequestOtherRole,
      hasClientRole,
      hasFourmizRole,
      canBecomeClient,
      canBecomeFourmiz,
      availableRoles
    });
  }, [currentRole, canSwitchRole, canRequestOtherRole, hasClientRole, hasFourmizRole, canBecomeClient, canBecomeFourmiz, availableRoles]);

  // ✅ Changer de rôle - SIMPLIFIÉ avec le nouveau hook
  const toggleRole = useCallback(async () => {
    if (switchingRole) return;
    
    const targetRole = currentRole === 'client' ? 'fourmiz' : 'client';
    console.log('🎯 Toggle role demandé vers:', targetRole);
    
    const result = await handleRoleSwitch(targetRole);
    console.log('📊 Résultat du switch:', result);
    
    if (!result.success && result.needsCompletion) {
      // Redirection déjà gérée dans l'adaptateur
      console.log('🔄 Redirection vers complétion gérée par l\'adaptateur');
    }
  }, [currentRole, handleRoleSwitch, switchingRole]);

  // 🆕 NOUVEAU : Demander l'autre rôle avec vérification automatique
  const requestOtherRole = useCallback(async (targetRole: 'client' | 'fourmiz') => {
    try {
      console.log('🎯 Demande de rôle:', targetRole);
      
      // Vérifier si le profil est complet pour ce rôle
      const isComplete = isProfileCompleteForRole(targetRole);
      const missingFields = getMissingFieldsForRole(targetRole);
      
      console.log('📋 Vérification profil:', { isComplete, missingFields });
      
      if (!isComplete && targetRole === 'fourmiz') {
        // Profil incomplet pour Fourmiz → Redirection vers complétion partielle
        console.log('🔄 Profil Fourmiz incomplet, redirection vers complétion');
        setShowRoleUpgradeModal(false);
        
        Alert.alert(
          '📝 Complétion requise',
          'Pour devenir Fourmiz, nous avons besoin de quelques informations supplémentaires (RIB et pièce d\'identité). Cela ne prendra que 2 minutes !',
          [
            { text: 'Plus tard', style: 'cancel' },
            { 
              text: 'Compléter maintenant', 
              onPress: () => router.push('/auth/complete-profile-fourmiz?from=home')
            }
          ]
        );
        return;
      }
      
      // Profil complet ou demande de rôle client → Utiliser la demande standard
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

  // ✅ Pages principales selon le statut - IDENTIQUE À VOTRE LOGIQUE
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
          color: '#FF4444',
          roleRequired: 'client'
        },
        {
          id: 'orders',
          title: 'Mes Commandes',
          description: 'Suivre mes commandes en cours et historique',
          icon: 'bag-outline',
          route: '/(tabs)/orders',
          color: '#2196F3',
          roleRequired: 'client'
        },
        {
          id: 'messages',
          title: 'Messages',
          description: 'Communiquer avec vos Fourmiz',
          icon: 'chatbubble-outline',
          route: '/(tabs)/messages',
          color: '#FF9800',
          roleRequired: 'client'
        },
        {
          id: 'network',
          title: 'Mon Réseau',
          description: 'Parrainer et développer votre réseau',
          icon: 'people-outline',
          route: '/(tabs)/network',
          color: '#607D8B',
          roleRequired: 'client'
        },
        {
          id: 'earnings',
          title: 'Mes Revenus',
          description: 'Gains du parrainage et cashback',
          icon: 'trending-up-outline',
          route: '/(tabs)/earnings',
          color: '#4CAF50',
          roleRequired: 'client'
        },
        {
          id: 'rewards',
          title: 'Mes Récompenses',
          description: 'Points fidélité et offres spéciales',
          icon: 'gift-outline',
          route: '/(tabs)/rewards',
          color: '#9C27B0',
          roleRequired: 'client'
        },
        {
          id: 'wallet',
          title: 'Mon Portefeuille',
          description: 'Gérer mes gains',
          icon: 'wallet-outline',
          route: '/(tabs)/wallet',
          color: '#795548',
          roleRequired: 'client'
        },
        {
          id: 'profile',
          title: 'Mon Profil',
          description: 'Gérer mes informations personnelles',
          icon: 'person-outline',
          route: '/(tabs)/profile',
          color: '#546E7A',
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
          route: '/(tabs)/services-demand',
          color: '#FF4444',
          roleRequired: 'fourmiz'
        },
        {
          id: 'services-progress',
          title: 'Mes Services en cours',
          description: 'Gérer mes missions acceptées',
          icon: 'build-outline',
          route: '/(tabs)/services-progress',
          color: '#2196F3',
          roleRequired: 'fourmiz'
        },
        {
          id: 'messages',
          title: 'Messages',
          description: 'Communiquer avec vos Clients',
          icon: 'chatbubble-outline',
          route: '/(tabs)/messages',
          color: '#FF9800',
          roleRequired: 'fourmiz'
        },
        {
          id: 'calendar',
          title: 'Mon Calendrier',
          description: 'Voir votre calendrier',
          icon: 'calendar-outline',
          route: '/(tabs)/calendar',
          color: '#673AB7',
          roleRequired: 'fourmiz'
        },
        {
          id: 'network',
          title: 'Mon Réseau',
          description: 'Parrainer des Clients et Fourmiz',
          icon: 'people-outline',
          route: '/(tabs)/network',
          color: '#607D8B',
          roleRequired: 'fourmiz'
        },
        {
          id: 'earnings',
          title: 'Mes Revenus',
          description: 'Gains des missions et parrainage',
          icon: 'cash-outline',
          route: '/(tabs)/earnings',
          color: '#4CAF50',
          roleRequired: 'fourmiz'
        },
        {
          id: 'rewards',
          title: 'Mes Récompenses',
          description: 'Bonus performance et fidélité',
          icon: 'trophy-outline',
          route: '/(tabs)/rewards',
          color: '#9C27B0',
          roleRequired: 'fourmiz'
        },
        {
          id: 'wallet',
          title: 'Mon Portefeuille',
          description: 'Gérer mes gains',
          icon: 'card-outline',
          route: '/(tabs)/wallet',
          color: '#795548',
          roleRequired: 'fourmiz'
        },
        {
          id: 'criteria',
          title: 'Mes Critères',
          description: 'Définir mes compétences et disponibilités',
          icon: 'options-outline',
          route: '/(tabs)/criteria',
          color: '#FF5722',
          roleRequired: 'fourmiz'
        },
        {
          id: 'profile',
          title: 'Mon Profil',
          description: 'Gérer mes informations professionnelles',
          icon: 'person-outline',
          route: '/(tabs)/profile',
          color: '#546E7A',
          roleRequired: 'fourmiz'
        }
      ];
    }
  }, [currentRole]);

  // Pages affichées (plus besoin de filtrage, elles sont déjà spécifiques)
  const visiblePages = mainPages;

  // ✅ RÉCUPÉRER LE PRÉNOM - VERSION SÉCURISÉE
  const getDisplayName = () => {
    console.log('🔍 Récupération du nom d\'affichage:', {
      firstname: profile?.firstname,
      lastname: profile?.lastname,
      email: user?.email
    });
    
    // 1. Essayer firstname (champ principal)
    const firstName = safeString(profile?.firstname).trim();
    if (firstName) {
      console.log('✅ Nom trouvé (firstname):', firstName);
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
    
    // 2. Construire le prénom depuis firstname + lastname
    const firstNamePart = safeString(profile?.firstname);
    const lastNamePart = safeString(profile?.lastname);
    if (firstNamePart && lastNamePart) {
      const fullName = `${firstNamePart} ${lastNamePart}`.trim();
      const extractedFirstName = fullName.split(' ')[0];
      console.log('✅ Nom construit (firstname + lastname):', extractedFirstName);
      return extractedFirstName.charAt(0).toUpperCase() + extractedFirstName.slice(1).toLowerCase();
    }
    
    // 3. Utiliser lastname si firstname manque
    const lastName = safeString(profile?.lastname).trim();
    if (lastName) {
      console.log('✅ Nom trouvé (lastname en fallback):', lastName);
      return lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
    }
    
    // 4. 🛡️ EXTRACTION SÉCURISÉE DEPUIS L'EMAIL
    const extractedName = extractNameFromEmail(user?.email);
    console.log('✅ Nom extrait de l\'email (sécurisé):', extractedName);
    return extractedName;
  };

  // ✅ Gestion des erreurs - IDENTIQUE
  if (authError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF4444" />
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
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement de votre espace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color="#FF4444" />
          <Text style={styles.errorTitle}>Profil non trouvé</Text>
          <Text style={styles.errorText}>Impossible de charger votre profil</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Recharger</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ RENDU PRINCIPAL - MODIFIÉ AVEC BOUTON DÉCONNEXION CONDITIONNEL
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header avec prénom + BOUTON DÉCONNEXION (DEV/ADMIN UNIQUEMENT) */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>
              Bonjour {getDisplayName()} 👋
            </Text>
            <Text style={styles.welcomeSubtext}>
              Que souhaitez-vous faire aujourd'hui ?
            </Text>
          </View>
          
          {/* 🛠️ BOUTON DÉCONNEXION : Visible seulement en DEV ou pour les ADMINS */}
          {(SHOW_SIGNOUT_BUTTON || isAdmin) && (
            <TouchableOpacity 
              style={styles.signOutButton}
              onPress={signOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <ActivityIndicator size="small" color="#FF4444" />
              ) : (
                <Ionicons name="log-out-outline" size={24} color="#FF4444" />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Switch Client/Fourmiz - VERSION ÉPURÉE */}
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
                  color={currentRole === 'client' ? '#fff' : '#666'} 
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
                  color={currentRole === 'fourmiz' ? '#fff' : '#666'} 
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
                <ActivityIndicator size="small" color="#666" />
                <Text style={styles.switchingText}>Changement en cours...</Text>
              </View>
            )}
          </View>
        )}

        {/* Bouton Devenir Client/Fourmiz */}
        {canRequestOtherRole && (
          <View style={styles.roleUpgradeSection}>
            <View style={styles.roleSectionHeader}>
              <Text style={styles.roleSectionTitle}>
                {canRequestOtherRole === 'fourmiz' ? '🚀 Devenir Fourmiz' : '🛍️ Devenir Client'}
              </Text>
              <Text style={styles.roleSectionSubtitle}>
                {canRequestOtherRole === 'fourmiz' 
                  ? 'Monétisez vos compétences et gagnez de l\'argent'
                  : 'Accédez à tous les services Fourmiz'
                }
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.roleUpgradeCard,
                { borderLeftColor: canRequestOtherRole === 'fourmiz' ? '#4CAF50' : '#2196F3' }
              ]}
              onPress={() => setShowRoleUpgradeModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.roleUpgradeContent}>
                <View style={[
                  styles.roleUpgradeIcon,
                  { backgroundColor: canRequestOtherRole === 'fourmiz' ? '#4CAF5020' : '#2196F320' }
                ]}>
                  <Ionicons 
                    name={canRequestOtherRole === 'fourmiz' ? 'construct' : 'storefront'} 
                    size={32} 
                    color={canRequestOtherRole === 'fourmiz' ? '#4CAF50' : '#2196F3'} 
                  />
                </View>
                <View style={styles.roleUpgradeInfo}>
                  <Text style={styles.roleUpgradeTitle}>
                    {canRequestOtherRole === 'fourmiz' 
                      ? 'Proposer mes services' 
                      : 'Commander des services'
                    }
                  </Text>
                  <Text style={styles.roleUpgradeDescription}>
                    {canRequestOtherRole === 'fourmiz'
                      ? 'Transformez vos talents en revenus réguliers'
                      : 'Accédez à des milliers de fourmiz qualifiés'
                    }
                  </Text>
                </View>
                <View style={styles.roleUpgradeArrow}>
                  <Ionicons name="arrow-forward-circle" size={24} color="#666" />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Section Admin - ACCÈS SÉCURISÉ */}
        {isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.roleSectionTitle}>🔧 Administration</Text>
            <TouchableOpacity
              style={styles.adminCard}
              onPress={() => router.push('/admin/dashboard')}
              activeOpacity={0.8}
            >
              <View style={styles.adminCardContent}>
                <View style={styles.adminIcon}>
                  <Ionicons name="shield-checkmark" size={24} color="#FF4444" />
                </View>
                <View style={styles.adminInfo}>
                  <Text style={styles.adminTitle}>Tableau de bord admin</Text>
                  <Text style={styles.adminDescription}>Gérer l'application et les utilisateurs</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Pages principales */}
        <View style={styles.pagesSection}>
          <View style={styles.pagesSectionHeader}>
            <Text style={styles.roleSectionTitle}>
              {currentRole === 'client' ? 'Menu Client' : 'Menu Fourmiz'}
            </Text>
            <View style={styles.pagesCounter}>
              <Text style={styles.pagesCounterText}>
                {visiblePages.length} options
              </Text>
            </View>
          </View>
          
          <View style={styles.pagesGrid}>
            {visiblePages.map((page) => (
              <TouchableOpacity
                key={page.id}
                style={[styles.pageCard, { borderLeftColor: page.color }]}
                onPress={() => router.push(page.route)}
                activeOpacity={0.8}
              >
                <View style={[styles.pageIcon, { backgroundColor: page.color + '20' }]}>
                  <Ionicons name={page.icon} size={24} color={page.color} />
                </View>
                <View style={styles.pageContent}>
                  <Text style={styles.pageTitle}>{page.title}</Text>
                  <Text style={styles.pageDescription} numberOfLines={2}>
                    {page.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal d'upgrade de rôle - IDENTIQUE */}
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
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.upgradeTitle}>
              {canRequestOtherRole === 'fourmiz' ? '🚀 Devenir Fourmiz' : '🛍️ Devenir Client'}
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
                  <Text style={styles.upgradeAdvantagesTitle}>🎯 Vos avantages en tant que Fourmiz :</Text>
                  
                  {[
                    { icon: 'cash-outline', title: 'Revenus flexibles', desc: 'Gagnez selon votre disponibilité' },
                    { icon: 'time-outline', title: 'Liberté horaire', desc: 'Choisissez vos missions et horaires' },
                    { icon: 'trending-up-outline', title: 'Tarifs', desc: 'Choisissez les courses et les tarifs qui vous conviennent' },
                    { icon: 'people-outline', title: 'Réseau professionnel', desc: 'Développez votre clientèle par le parrainnage' },
                    { icon: 'shield-checkmark-outline', title: 'Sécurité garantie', desc: 'Paiements sécurisés' },
                    { icon: 'star-outline', title: 'Réputation', desc: 'Construisez votre réputation' },
                    { icon: 'gift-outline', title: 'Récompenses', desc: 'Points fidélité et cashbacks' }
                  ].map((advantage, index) => (
                    <View key={index} style={styles.upgradeAdvantageItem}>
                      <View style={styles.upgradeAdvantageIcon}>
                        <Ionicons name={advantage.icon as any} size={20} color="#4CAF50" />
                      </View>
                      <View style={styles.upgradeAdvantageContent}>
                        <Text style={styles.upgradeAdvantageTitle}>{advantage.title}</Text>
                        <Text style={styles.upgradeAdvantageDesc}>{advantage.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.upgradeProcess}>
                  <Text style={styles.upgradeProcessTitle}>📋 Comment ça marche :</Text>
                  <Text style={styles.upgradeProcessStep}>1. Complétez votre profil et ajoutez vos compétences
                  </Text>
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
                    Accédez à tous nos services ! 🛍️
                  </Text>
                  <Text style={styles.upgradeIntroText}>
                    Devenez client et profitez de milliers de fourmiz qualifiés pour tous vos besoins.
                  </Text>
                </View>

                <View style={styles.upgradeAdvantages}>
                  <Text style={styles.upgradeAdvantagesTitle}>🎯 Vos avantages en tant que Client :</Text>
                  
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
                        <Ionicons name={advantage.icon as any} size={20} color="#2196F3" />
                      </View>
                      <View style={styles.upgradeAdvantageContent}>
                        <Text style={styles.upgradeAdvantageTitle}>{advantage.title}</Text>
                        <Text style={styles.upgradeAdvantageDesc}>{advantage.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.upgradeProcess}>
                  <Text style={styles.upgradeProcessTitle}>📋 Comment ça marche :</Text>
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
              style={[
                styles.upgradeConfirmButton,
                { backgroundColor: canRequestOtherRole === 'fourmiz' ? '#4CAF50' : '#2196F3' }
              ]}
              onPress={() => {
                if (canRequestOtherRole) {
                  requestOtherRole(canRequestOtherRole);
                }
              }}
            >
              <Text style={styles.upgradeConfirmText}>
                {canRequestOtherRole === 'fourmiz' ? '🚀 Devenir Fourmiz' : '🛍️ Devenir Client'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ✅ STYLES AVEC MODIFICATIONS POUR LE BOUTON DÉCONNEXION
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  
  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // 🛠️ STYLES POUR LE HEADER ADAPTATIF
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexDirection: 'row', // 🆕 Pour le bouton déconnexion
    justifyContent: 'space-between', // 🆕 Espace entre nom et bouton
  },
  headerLeft: {
    flex: 1, // 🆕 Prend l'espace disponible
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  // 🛠️ BOUTON DE DÉCONNEXION (MODE DEV UNIQUEMENT)
  signOutButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE5E5',
    opacity: 0.7, // Moins visible car c'est pour le dev
  },

  // Sections
  roleSection: {
    padding: 20,
  },
  roleUpgradeSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  adminSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pagesSection: {
    padding: 20,
  },
  roleSectionHeader: {
    marginBottom: 16,
  },
  roleSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  roleSectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },

  // Switch épuré - NOUVEAU
  switchButtonContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
  },
  switchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  switchButtonLeft: {
    marginRight: 2,
  },
  switchButtonRight: {
    marginLeft: 2,
  },
  switchButtonActive: {
    backgroundColor: '#FF4444',
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  switchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  switchButtonTextActive: {
    color: '#fff',
  },
  switchingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  switchingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },

  // Admin Card
  adminCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  adminCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF444420',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  adminInfo: {
    flex: 1,
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  adminDescription: {
    fontSize: 14,
    color: '#666',
  },

  // Pages Grid
  pagesGrid: {
    gap: 12,
  },
  pagesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pagesCounter: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pagesCounterText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  pageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  pageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  pageContent: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  pageDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 32,
  },

  // Role Upgrade Section
  roleUpgradeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
  },
  roleUpgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleUpgradeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleUpgradeInfo: {
    flex: 1,
  },
  roleUpgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  roleUpgradeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  roleUpgradeArrow: {
    marginLeft: 12,
  },

  // Upgrade Modal
  upgradeModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  upgradeCloseButton: {
    padding: 4,
  },
  upgradeTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  upgradeIntroText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  upgradeAdvantages: {
    marginBottom: 24,
  },
  upgradeAdvantagesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upgradeAdvantageContent: {
    flex: 1,
  },
  upgradeAdvantageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  upgradeAdvantageDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  upgradeProcess: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  upgradeProcessTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  upgradeProcessStep: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  upgradeActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  upgradeCancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeConfirmButton: {
    flex: 2,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
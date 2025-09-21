// app/(tabs)/_layout.tsx - VERSION CORRIGÉE NAVIGATION NORMALE + APPLICATIONS
// ✅ CONSERVÉ: Toute la logique existante du layout (100% des fonctionnalités)
// 🔧 CORRIGÉ: Redirection vers critères seulement depuis certaines pages spécifiques
// 🔧 CORRIGÉ: Navigation normale entre tous les onglets
// 🚀 CORRIGÉ: Redirection forcée vers available-orders pour Fourmiz après sauvegarde profil
// 🔄 NOUVEAU: Système de retry et synchronisation forcée après sauvegarde critères
// ⚡ AJOUTÉ: Méthode pour forcer reload profil et éviter désynchronisation hooks
// 🛡️ NOUVEAU: Protection temporaire contre redirection après sauvegarde critères
// 🎨 AJOUTÉ: Bordure noire sur le mini switch actif
// 📄 AJOUTÉ: Exclusion route applications de la redirection automatique
// 🆕 NOUVEAU: Onglet applications ajouté pour résoudre le routage

import React, { useEffect, useState, useMemo, useCallback, useRef, createContext, useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Text,
  Image,
  Alert,
} from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRoleManagerAdapter } from '@/hooks/useRoleManagerAdapter';
import { useRequireCriteria } from '@/hooks/useRequireCriteria';
import useAuth from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

// 🌍 CONTEXT POUR PARTAGER L'ÉTAT DES RÔLES
interface RoleContextType {
  currentRole: string | null;
  switchingRole: boolean;
  canSwitchRole: boolean;
  hasClientRole: boolean;
  hasFourmizRole: boolean;
  availableRoles: string[];
  isInitialized: boolean;
  switchRole: (role: string) => Promise<{ success: boolean; needsCompletion?: boolean; error?: string }>;
  roleManagerAdapter: any;
  // 🆕 NOUVEAU: Méthodes de synchronisation
  forceProfileReload: () => Promise<void>;
  verifyCriteriaDirectly: () => Promise<{ isCompleted: boolean; error?: string }>;
}

const RoleContext = createContext<RoleContextType | null>(null);

export const useSharedRoleManager = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useSharedRoleManager must be used within RoleProvider');
  }
  return context;
};

// ✅ SYSTÈME D'ÉVÉNEMENTS SIMPLE (inchangé)
class SimpleEventEmitter {
  private listeners: { [key: string]: Array<(data: any) => void> } = {};

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, data: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }
}

const globalEventEmitter = new SimpleEventEmitter();

export const emitRoleChange = (newRole: string) => {
  globalEventEmitter.emit('roleChange', newRole);
};

// 🆕 NOUVEAU: Émettre événement de sauvegarde critères
export const emitCriteriaSaved = () => {
  globalEventEmitter.emit('criteriaSaved', true);
};

const { width: screenWidth } = Dimensions.get('window');

interface TabConfig {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  route: string;
  role: 'client' | 'fourmiz' | 'both';
  displayName: string;
  aliases?: string[];
  isDefaultForRole?: 'client' | 'fourmiz';
  order: number;
  showInTabBar?: boolean; // 🆕 AJOUTÉ: Contrôle de visibilité dans la tab bar
}

const ALL_TABS: TabConfig[] = [
  // ✅ ONGLET COMMUN CARTE - EN PREMIER (gauche) pour tous les rôles
  {
    name: 'map',
    icon: 'location-outline',
    iconFocused: 'location',
    route: '/(tabs)/map',
    role: 'both',
    displayName: 'Carte',
    order: 0,
    showInTabBar: true
  },
  
  // ✅ ONGLETS CLIENTS - ORDRE : Carte | Mes Commandes | Services (défaut) | Messages | Profil
  {
    name: 'orders',
    icon: 'bag-outline',
    iconFocused: 'bag',
    route: '/(tabs)/orders',
    role: 'client',
    displayName: 'Mes Commandes',
    order: 1,
    showInTabBar: true
  },
  {
    name: 'services',
    icon: 'construct-outline',
    iconFocused: 'construct',
    route: '/(tabs)/services',
    role: 'client',
    displayName: 'Services',
    isDefaultForRole: 'client',
    order: 2,
    showInTabBar: true
  },
  
  // ✅ ONGLETS FOURMIZ - ORDRE : Carte | Calendrier | Missions (défaut) | Messages | Profil
  {
    name: 'calendar',
    icon: 'calendar-outline',
    iconFocused: 'calendar',
    route: '/(tabs)/calendar',
    role: 'fourmiz',
    displayName: 'Calendrier',
    order: 1,
    showInTabBar: true
  },
  {
    name: 'available-orders',
    icon: 'search-outline',
    iconFocused: 'search',
    route: '/(tabs)/available-orders',
    role: 'fourmiz',
    displayName: 'Missions Disponibles',
    isDefaultForRole: 'fourmiz',
    order: 2,
    showInTabBar: true
  },
  
  // ✅ ONGLETS COMMUNS - Messages puis Profil à droite
  {
    name: 'messages',
    icon: 'chatbubble-outline',
    iconFocused: 'chatbubble',
    route: '/(tabs)/messages',
    role: 'both',
    displayName: 'Messages',
    order: 3,
    showInTabBar: true
  },
  {
    name: 'profile',
    icon: 'person-outline',
    iconFocused: 'person',
    route: '/(tabs)/profile',
    role: 'both',
    displayName: 'Profil',
    order: 4,
    showInTabBar: true
  },
  
  // 🆕 AJOUTÉ: ONGLET APPLICATIONS - Accessible mais pas dans la tab bar
  {
    name: 'applications',
    icon: 'people-outline',
    iconFocused: 'people',
    route: '/(tabs)/applications',
    role: 'client',  // Seulement pour les clients qui reçoivent des candidatures
    displayName: 'Candidatures reçues',
    order: 6,
    showInTabBar: false // 🚫 Pas affiché dans la tab bar (page modale)
  },
  
  // 🚫 CRITÈRES - PAGE ACCESSIBLE MAIS PAS DANS LA TAB BAR
  {
    name: 'criteria',
    icon: 'settings-outline',
    iconFocused: 'settings',
    route: '/(tabs)/criteria',
    role: 'fourmiz',
    displayName: 'Critères',
    order: 5,
    showInTabBar: false // 🚫 SUPPRIMÉ de la tab bar
  }
];

const getVisibleTabs = (role: 'client' | 'fourmiz'): TabConfig[] => {
  const visible = ALL_TABS.filter(tab => {
    // 🚫 FILTRAGE : Exclure les onglets qui ne doivent pas être dans la tab bar
    if (!tab.showInTabBar) return false;
    
    if (tab.role === 'both') return true;
    return tab.role === role;
  });
  
  // ✅ Tri par ordre spécifié dans la propriété order
  const sorted = visible.sort((a, b) => {
    return a.order - b.order;
  });
  
  return sorted;
};

// 🚀 FONCTION CORRIGÉE : Obtenir la page par défaut selon le rôle avec priorité absolue pour available-orders
const getDefaultTabForRole = (role: 'client' | 'fourmiz'): TabConfig => {
  // 🎯 PRIORITÉ ABSOLUE : Pour Fourmiz, toujours retourner available-orders
  if (role === 'fourmiz') {
    const availableOrdersTab = ALL_TABS.find(tab => tab.name === 'available-orders');
    if (availableOrdersTab) {
      console.log('🚀 [getDefaultTabForRole] PRIORITÉ FOURMIZ: Redirection forcée vers available-orders');
      return availableOrdersTab;
    }
  }
  
  // Pour les autres cas, utiliser la logique normale
  const defaultTab = ALL_TABS.find(tab => tab.isDefaultForRole === role);
  if (defaultTab) {
    console.log(`🎯 [getDefaultTabForRole] Onglet par défaut normal pour ${role}:`, defaultTab.displayName);
    return defaultTab;
  }
  
  // 🚀 FALLBACK AMÉLIORÉ : Privilégier available-orders pour fourmiz même en cas d'erreur
  if (role === 'fourmiz') {
    // Chercher available-orders même dans les onglets visibles
    const visibleTabs = getVisibleTabs(role);
    const availableOrdersTab = visibleTabs.find(tab => tab.name === 'available-orders');
    if (availableOrdersTab) {
      console.log('🚀 [getDefaultTabForRole] FALLBACK FOURMIZ: available-orders trouvé dans visibleTabs');
      return availableOrdersTab;
    }
    
    // Si vraiment aucun available-orders, prendre calendar en priorité pour Fourmiz
    const calendarTab = visibleTabs.find(tab => tab.name === 'calendar');
    if (calendarTab) {
      console.log('🚀 [getDefaultTabForRole] FALLBACK FOURMIZ: calendar comme derniers recours');
      return calendarTab;
    }
  }
  
  // Fallback classique pour client ou si rien n'est trouvé
  const visibleTabs = getVisibleTabs(role);
  const fallbackTab = visibleTabs[0] || ALL_TABS.find(tab => tab.name === 'messages')!;
  console.log(`🎯 [getDefaultTabForRole] Fallback classique pour ${role}:`, fallbackTab.displayName);
  return fallbackTab;
};

// 🎨 HEADER AVEC MINI SWITCH CLIENT/FOURMIZ UNIVERSEL + BOUTON DÉCONNEXION (inchangé)
function GlobalFourmizHeader({ effectiveRole }: { effectiveRole: 'client' | 'fourmiz' }) {
  const router = useRouter();
  const { 
    currentRole, 
    canSwitchRole, 
    switchingRole, 
    switchRole: handleRoleSwitch,
    hasClientRole,
    hasFourmizRole 
  } = useSharedRoleManager();

  // ✅ FONCTION DÉCONNEXION CORRIGÉE - Utilisation directe de Supabase
  const handleLogout = useCallback(() => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnecter', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 Début déconnexion...');
              
              // Utilisation directe de Supabase pour la déconnexion
              const { error } = await supabase.auth.signOut();
              
              if (error) {
                console.error('❌ Erreur Supabase signOut:', error);
                throw error;
              }
              
              console.log('✅ Déconnexion Supabase réussie');
              
              // Redirection vers la page de connexion
              router.replace('/auth/signin');
              
            } catch (error) {
              console.error('❌ Erreur lors de la déconnexion:', error);
              Alert.alert('Erreur', 'Impossible de vous déconnecter. Veuillez réessayer.');
            }
          }
        }
      ]
    );
  }, [router]);

  // 🔧 NOUVELLE FONCTION SWITCH UNIVERSELLE - GESTION CRÉATION DE RÔLES
  const toggleRole = useCallback(async () => {
    if (switchingRole) return;
    
    const targetRole = currentRole === 'client' ? 'fourmiz' : 'client';
    
    // Cas 1 : L'utilisateur a déjà les deux rôles - switch classique
    if (canSwitchRole && hasClientRole && hasFourmizRole) {
      const result = await handleRoleSwitch(targetRole);
      
      if (result.success) {
        console.log('✅ Switch réussi vers:', targetRole);
        emitRoleChange(targetRole);
      } else if (result.needsCompletion && targetRole === 'fourmiz') {
        Alert.alert(
          'Profil Fourmiz incomplet',
          'Pour passer en mode Fourmiz, vous devez compléter votre profil.',
          [
            { text: 'Plus tard', style: 'cancel' },
            { 
              text: 'Compléter maintenant', 
              onPress: () => router.push('/auth/complete-profile-fourmiz?from=header'),
              style: 'default'
            }
          ]
        );
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de changer de rôle');
      }
      return;
    }
    
    // Cas 2 : L'utilisateur n'a qu'un rôle - proposer la création de l'autre
    if (targetRole === 'client' && !hasClientRole) {
      // Proposer de devenir client (depuis fourmiz)
      Alert.alert(
        'Devenir Client',
        'Vous êtes actuellement Fourmiz. Souhaitez-vous également devenir client pour commander des services ?',
        [
          { text: 'Non, rester Fourmiz', style: 'cancel' },
          { 
            text: 'Oui, devenir Client aussi', 
            onPress: () => {
              // Redirection vers création profil client
              router.push('/auth/complete-profile-client?from=header&action=create');
            },
            style: 'default'
          }
        ]
      );
    } else if (targetRole === 'fourmiz' && !hasFourmizRole) {
      // Proposer de devenir fourmiz (depuis client)
      Alert.alert(
        'Devenir Fourmiz',
        'Vous êtes actuellement Client. Souhaitez-vous également devenir Fourmiz pour proposer vos services ?',
        [
          { text: 'Non, rester Client', style: 'cancel' },
          { 
            text: 'Oui, devenir Fourmiz aussi', 
            onPress: () => {
              // Redirection vers création profil fourmiz
              router.push('/auth/complete-profile-fourmiz?from=header&action=create');
            },
            style: 'default'
          }
        ]
      );
    }
  }, [canSwitchRole, switchingRole, currentRole, handleRoleSwitch, router, hasClientRole, hasFourmizRole]);

  return (
    <View style={styles.globalHeader}>
      {/* ✅ ZONE GAUCHE - BOUTON DÉCONNEXION */}
      <View style={styles.headerLeftSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>
      
      {/* Logo Fourmiz centré */}
      <View style={styles.headerLogoSection}>
        <Image
          source={require('../../assets/logo-fourmiz.gif')}
          style={styles.headerLogo}
          onError={(error) => {
            console.log('❌ Erreur chargement logo header global:', error.nativeEvent.error);
          }}
        />
      </View>
      
      {/* Zone droite - Mini Switch UNIVERSEL */}
      <View style={styles.headerRightSection}>
        {/* 🔧 MODIFICATION : TOUJOURS AFFICHER le switch si au moins un rôle */}
        {(hasClientRole || hasFourmizRole) ? (
          <View style={styles.miniRoleSwitch}>
            {/* 🎨 BOUTON CLIENT - NOUVELLES COULEURS */}
            <TouchableOpacity
              style={[
                styles.miniSwitchButton,
                styles.miniSwitchButtonLeft,
                currentRole === 'client' && styles.miniSwitchButtonActive,
                !hasClientRole && styles.miniSwitchButtonUnavailable
              ]}
              onPress={() => currentRole !== 'client' && !switchingRole && toggleRole()}
              disabled={switchingRole}
              activeOpacity={0.8}
            >
              <Ionicons 
                name="person-outline" 
                size={18} 
                color={
                  currentRole === 'client' 
                    ? '#000000'  // 🎨 MODIFIÉ : Noir au lieu de blanc quand actif
                    : !hasClientRole 
                      ? '#000000'  // 🎨 MODIFIÉ : Noir au lieu de #cccccc quand indisponible
                      : '#000000'  // 🎨 MODIFIÉ : Noir au lieu de #666666 quand inactif
                } 
              />
              {/* Petit indicateur si rôle non disponible */}
              {!hasClientRole && (
                <View style={styles.roleUnavailableIndicator}>
                  <Ionicons name="add-outline" size={8} color="#000000" />
                </View>
              )}
            </TouchableOpacity>

            {/* 🎨 BOUTON FOURMIZ - NOUVELLES COULEURS */}
            <TouchableOpacity
              style={[
                styles.miniSwitchButton,
                styles.miniSwitchButtonRight,
                (currentRole === 'fourmiz' || currentRole === 'admin') && styles.miniSwitchButtonActive,
                !hasFourmizRole && styles.miniSwitchButtonUnavailable
              ]}
              onPress={() => currentRole !== 'fourmiz' && !switchingRole && toggleRole()}
              disabled={switchingRole}
              activeOpacity={0.8}
            >
              {hasFourmizRole ? (
                // Si l'utilisateur a le rôle Fourmiz - afficher le logo ou fallback
                <>
                  <Image
                    source={require('../../assets/logo-fourmiz.gif')}
                    style={[
                      styles.miniSwitchLogo,
                      (currentRole === 'fourmiz' || currentRole === 'admin') && styles.miniSwitchLogoActive
                    ]}
                    onError={() => {
                      console.log('❌ Erreur logo mini switch, fallback vers texte');
                    }}
                  />
                  {/* Texte fallback avec nouvelles couleurs */}
                  <Text style={[
                    styles.miniSwitchFallbackText,
                    (currentRole === 'fourmiz' || currentRole === 'admin') && styles.miniSwitchTextActive,
                    { opacity: 0 }
                  ]}>
                    F
                  </Text>
                </>
              ) : (
                // Si l'utilisateur n'a PAS le rôle Fourmiz - afficher juste le texte "F"
                <Text style={styles.miniSwitchTextUnavailable}>
                  F
                </Text>
              )}
              
              {/* Petit indicateur si rôle non disponible */}
              {!hasFourmizRole && (
                <View style={styles.roleUnavailableIndicator}>
                  <Ionicons name="add-outline" size={8} color="#000000" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Fallback extrême - bouton recherche si aucun rôle (cas d'erreur)
          <TouchableOpacity 
            style={styles.headerSearchButton}
            onPress={() => {
              if (effectiveRole === 'client') {
                router.push('/(tabs)/services');
              } else {
                router.push('/(tabs)/available-orders');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={20} color="#333333" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function CustomTabBar({ 
  state, 
  descriptors, 
  navigation,
  effectiveRole,
  switchingRole,
  forceUpdateKey
}: any) {
  const router = useRouter();
  const pathname = usePathname();
  
  const visibleTabs = useMemo(() => {
    return getVisibleTabs(effectiveRole);
  }, [effectiveRole, forceUpdateKey]);

  // 🔧 FIX: DÉTECTION D'ONGLET ACTIF AMÉLIORÉE avec gestion des sous-pages
  const getCurrentTabIndex = useCallback(() => {
    // 1. Récupérer le nom de la route active depuis React Navigation
    const currentRouteName = state.routeNames[state.index];
    
    // 🔧 PRIORITÉ 1 : Détecter les sous-pages du profil EN PREMIER
    const profileSubPages = ['/earnings', '/criteria', '/network', '/rewards'];
    const isProfileSubPage = profileSubPages.some(subPage => 
      pathname.includes(subPage) || 
      pathname === subPage ||
      currentRouteName === subPage.replace('/', '')
    );
    
    if (isProfileSubPage) {
      console.log('📍 Sous-page du profil détectée:', pathname);
      const profileTabIndex = visibleTabs.findIndex(tab => tab.name === 'profile');
      if (profileTabIndex !== -1) {
        return profileTabIndex;
      }
    }
    
    // 🔧 PRIORITÉ 2 : Cas spécial pour services-requests - garder calendar actif
    if (pathname.includes('/services-requests') || pathname.includes('services-requests')) {
      console.log('📍 [TabBar] Détection services-requests, maintien onglet calendar actif');
      const calendarTabIndex = visibleTabs.findIndex(tab => tab.name === 'calendar');
      if (calendarTabIndex !== -1) {
        return calendarTabIndex;
      }
    }
    
    // 3. Trouver l'index correspondant dans visibleTabs (logique existante)
    const activeTabIndex = visibleTabs.findIndex(tab => {
      // Correspondance directe par nom
      if (tab.name === currentRouteName) {
        return true;
      }
      
      // Correspondance par route (sans /(tabs)/)
      const routeClean = tab.route.replace('/(tabs)/', '').replace('/(tabs)', '');
      if (routeClean === currentRouteName || routeClean === `/${currentRouteName}`) {
        return true;
      }
      
      // Vérification aliases
      if (tab.aliases) {
        const hasAlias = tab.aliases.some(alias => {
          const aliasClean = alias.replace('/(tabs)/', '').replace('/(tabs)', '');
          return aliasClean === currentRouteName || aliasClean === `/${currentRouteName}`;
        });
        if (hasAlias) {
          return true;
        }
      }
      
      return false;
    });

    if (activeTabIndex !== -1) {
      return activeTabIndex;
    }

    // 4. Fallback avec pathname si nécessaire (logique existante)
    const cleanPath = pathname.replace(/\/$/, '') || '/';
    
    for (let i = 0; i < visibleTabs.length; i++) {
      const tab = visibleTabs[i];
      
      if (pathname === tab.route || cleanPath === tab.route.replace(/\/$/, '')) {
        return i;
      }
      
      if (pathname.includes(tab.name) || cleanPath.includes(tab.name)) {
        return i;
      }
    }
    
    // ✅ NOUVEAU : Si aucune correspondance, retourner l'index de l'onglet par défaut
    const defaultTab = getDefaultTabForRole(effectiveRole);
    const defaultTabIndex = visibleTabs.findIndex(tab => tab.name === defaultTab.name);
    
    if (defaultTabIndex !== -1) {
      console.log(`🎯 TabBar - Utilisation de l'onglet par défaut pour ${effectiveRole}:`, defaultTab.displayName, `(index: ${defaultTabIndex})`);
      return defaultTabIndex;
    }
    
    // Dernier fallback vers 0
    return 0;
  }, [state, visibleTabs, pathname, effectiveRole]);

  const currentIndex = getCurrentTabIndex();

  // ✅ FONCTION SIMPLE DE NAVIGATION - SANS REDIRECTION FORCÉE
  const handleTabPress = useCallback((tab: TabConfig, index: number) => {
    if (switchingRole) {
      return;
    }

    const event = navigation.emit({
      type: 'tabPress',
      target: `${tab.name}-key`,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      try {
        console.log(`🎯 Navigation vers:`, tab.displayName, `(${tab.route})`);
        // ✅ NAVIGATION DIRECTE vers la route de l'onglet - PAS DE REDIRECTION
        router.push(tab.route);
      } catch (error) {
        console.error(`❌ Erreur navigation:`, error);
        // Fallback vers un onglet sûr et visible
        router.push('/(tabs)/messages');
      }
    }
  }, [switchingRole, navigation, router]);

  return (
    <View style={styles.tabBarContainer}>
      {switchingRole && (
        <View style={styles.switchingOverlay}>
          <ActivityIndicator size="small" color="#333333" />
          <Text style={styles.switchingText}>Changement de rôle...</Text>
        </View>
      )}
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        scrollEnabled={!switchingRole}
      >
        {visibleTabs.map((tab, index) => {
          const isActive = currentIndex === index;
          
          return (
            <TouchableOpacity
              key={`${tab.name}-${effectiveRole}-${index}-${state.index}`}
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
                isActive && styles.iconContainerActive,
                switchingRole && !isActive && styles.iconContainerDisabled
              ]}>
                <Ionicons
                  name={isActive ? tab.iconFocused : tab.icon}
                  size={20}
                  color={
                    isActive 
                      ? '#FFFFFF'
                      : switchingRole 
                        ? '#CCCCCC'
                        : '#666666'
                  }
                />
              </View>
              
              {isActive && (
                <View style={styles.activeIndicator}>
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

// 🌍 PROVIDER DE RÔLES - AVEC NOUVELLES MÉTHODES DE SYNCHRONISATION
function RoleProvider({ children, profile }: { children: React.ReactNode, profile: any }) {
  const { user } = useAuth();
  const roleManagerAdapter = useRoleManagerAdapter(profile);
  
  const { 
    currentRole, 
    switchingRole,
    canSwitchRole,
    hasClientRole,
    hasFourmizRole,
    availableRoles,
    isInitialized,
    switchRole
  } = roleManagerAdapter || { 
    currentRole: null, 
    switchingRole: false,
    canSwitchRole: false,
    hasClientRole: false,
    hasFourmizRole: false,
    availableRoles: [],
    isInitialized: false,
    switchRole: async () => ({ success: false })
  };

  // 🆕 NOUVEAU: Méthode pour forcer le reload du profil
  const forceProfileReload = useCallback(async () => {
    try {
      console.log('🔄 [forceProfileReload] Début reload profil...');
      
      // Si le roleManagerAdapter a une méthode de reload
      if (roleManagerAdapter?.reloadProfile) {
        await roleManagerAdapter.reloadProfile();
        console.log('✅ [forceProfileReload] Reload via roleManagerAdapter réussi');
      }
      
      // Force un refresh des données depuis Supabase
      if (user?.id) {
        const { data: refreshedProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        console.log('✅ [forceProfileReload] Profil rafraîchi:', refreshedProfile);
      }
    } catch (error) {
      console.error('❌ [forceProfileReload] Erreur:', error);
    }
  }, [roleManagerAdapter, user?.id]);

  // 🆕 NOUVEAU: Vérification directe des critères
  const verifyCriteriaDirectly = useCallback(async (): Promise<{ isCompleted: boolean; error?: string }> => {
    try {
      if (!user?.id) {
        return { isCompleted: false, error: 'Pas d\'utilisateur connecté' };
      }

      console.log('🔍 [verifyCriteriaDirectly] Vérification directe pour:', user.id);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('criteria_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ [verifyCriteriaDirectly] Erreur profile:', profileError);
        return { isCompleted: false, error: profileError.message };
      }

      const isCompleted = profileData?.criteria_completed === true;
      console.log('✅ [verifyCriteriaDirectly] Résultat:', { isCompleted });
      
      return { isCompleted };
    } catch (error) {
      console.error('💥 [verifyCriteriaDirectly] Erreur:', error);
      return { isCompleted: false, error: error.message };
    }
  }, [user?.id]);

  const contextValue: RoleContextType = {
    currentRole,
    switchingRole,
    canSwitchRole,
    hasClientRole,
    hasFourmizRole,
    availableRoles,
    isInitialized,
    switchRole,
    roleManagerAdapter,
    // 🆕 NOUVELLES MÉTHODES
    forceProfileReload,
    verifyCriteriaDirectly
  };

  return (
    <RoleContext.Provider value={contextValue}>
      {children}
    </RoleContext.Provider>
  );
}

export default function TabsLayout() {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [forceRenderKey, setForceRenderKey] = useState(0);
  
  // ✅ LISTENER D'ÉVÉNEMENTS - Redirection FORCÉE vers available-orders pour Fourmiz
  useEffect(() => {
    const handleRoleChange = (newRole: string) => {
      // Force un re-render en changeant la key
      setForceRenderKey(prev => prev + 1);
      
      // 🚀 REDIRECTION SPÉCIALE POUR FOURMIZ vers available-orders
      setTimeout(() => {
        if (newRole === 'fourmiz') {
          console.log('🚀 [RoleChange] Redirection forcée Fourmiz vers available-orders');
          router.replace('/(tabs)/available-orders');
        } else {
          // Pour les autres rôles, utiliser la logique par défaut
          const defaultTab = getDefaultTabForRole(newRole as 'client' | 'fourmiz');
          console.log(`🎯 [RoleChange] Redirection normale vers ${newRole}:`, defaultTab.displayName);
          router.replace(defaultTab.route);
        }
      }, 200);
    };
    
    // 🆕 NOUVEAU: Listener pour la sauvegarde des critères
    const handleCriteriaSaved = () => {
      console.log('🎯 [CriteriaSaved] Critères sauvegardés, attente synchronisation...');
      
      // Force un re-render pour que les hooks se remettent à jour
      setForceRenderKey(prev => prev + 1);
      
      // Délai pour permettre aux hooks de se synchroniser
      setTimeout(() => {
        setForceRenderKey(prev => prev + 1);
        console.log('✅ [CriteriaSaved] Re-render forcé après sauvegarde critères');
      }, 1500);
    };
    
    globalEventEmitter.on('roleChange', handleRoleChange);
    globalEventEmitter.on('criteriaSaved', handleCriteriaSaved);
    
    return () => {
      globalEventEmitter.off('roleChange', handleRoleChange);
      globalEventEmitter.off('criteriaSaved', handleCriteriaSaved);
    };
  }, [router]);

  if (!user || !profile) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#333333" />
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <RoleProvider profile={profile}>
      <TabsLayoutInner forceRenderKey={forceRenderKey} />
    </RoleProvider>
  );
}

// 🔧 COMPOSANT INTERNE AVEC NAVIGATION NORMALE CORRIGÉE
function TabsLayoutInner({ forceRenderKey }: { forceRenderKey: number }) {
  const { currentRole, switchingRole, isInitialized, hasFourmizRole, forceProfileReload, verifyCriteriaDirectly } = useSharedRoleManager();
  const { user, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // ✅ Utilisation du hook de vérification des critères
  const { 
    isLoading: criteriaLoading, 
    canAccess, 
    isFourmiz, 
    criteriaCompleted 
  } = useRequireCriteria();

  // 🛡️ NOUVEAU: Protection temporaire contre redirection après sauvegarde critères
  const [criteriasJustSaved, setCriteriaJustSaved] = useState(false);

  // 🔧 ÉTAT LOCAL SIMPLIFIÉ - SANS USER_TYPE
  const [directFourmizCheck, setDirectFourmizCheck] = useState<{
    isLoading: boolean;
    isFourmiz: boolean;
    criteriaCompleted: boolean;
    hasRun: boolean;
    retryCount: number;
    lastCheck: number;
  }>({
    isLoading: true,
    isFourmiz: false,
    criteriaCompleted: false,
    hasRun: false,
    retryCount: 0,
    lastCheck: 0
  });

  // 🆕 SYSTÈME DE RETRY CORRIGÉ - SANS USER_TYPE
  const checkDirectlyIfFourmizWithRetry = useCallback(async (retryAttempt = 0) => {
    const maxRetries = 3;
    const retryDelay = 1000 * (retryAttempt + 1); // 1s, 2s, 3s
    
    if (retryAttempt > maxRetries) {
      console.log('🔄 [DIRECT CHECK] Max retries atteint, arrêt');
      setDirectFourmizCheck(prev => ({
        ...prev,
        isLoading: false,
        hasRun: true,
        retryCount: retryAttempt
      }));
      return;
    }

    if (!user?.id || !profile?.id) {
      console.log('🔍 [DIRECT CHECK] Pas d\'utilisateur ou profil:', { userId: user?.id, profileId: profile?.id });
      if (retryAttempt < maxRetries) {
        setTimeout(() => checkDirectlyIfFourmizWithRetry(retryAttempt + 1), retryDelay);
        return;
      }
      setDirectFourmizCheck(prev => ({
        ...prev,
        isLoading: false,
        isFourmiz: false,
        criteriaCompleted: false,
        hasRun: true,
        retryCount: retryAttempt
      }));
      return;
    }

    try {
      console.log(`🔍 [DIRECT CHECK] Tentative ${retryAttempt + 1}/${maxRetries + 1} pour utilisateur:`, user.id);
      
      // 🔧 CORRIGÉ : Vérifier directement dans la table profiles SANS user_type
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('criteria_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log(`🔍 [DIRECT CHECK] Tentative ${retryAttempt + 1} - Résultat profile:`, { profileData, profileError });

      if (profileError) {
        console.error(`❌ [DIRECT CHECK] Erreur tentative ${retryAttempt + 1}:`, profileError);
        if (retryAttempt < maxRetries) {
          setTimeout(() => checkDirectlyIfFourmizWithRetry(retryAttempt + 1), retryDelay);
          return;
        }
        setDirectFourmizCheck(prev => ({
          ...prev,
          isLoading: false,
          isFourmiz: false,
          criteriaCompleted: false,
          hasRun: true,
          retryCount: retryAttempt
        }));
        return;
      }

      // 🔧 CORRIGÉ : Utiliser la logique basée sur les rôles au lieu de user_type
      const isFourmizDirect = currentRole === 'fourmiz' || hasFourmizRole;
      const criteriaCompletedDirect = profileData?.criteria_completed === true;

      console.log(`🔍 [DIRECT CHECK] Tentative ${retryAttempt + 1} - Résultat final:`, {
        isFourmiz: isFourmizDirect,
        criteriaCompleted: criteriaCompletedDirect,
        currentRole,
        hasFourmizRole
      });

      // Si on obtient un résultat cohérent, l'accepter
      if (isFourmizDirect !== undefined) {
        setDirectFourmizCheck(prev => ({
          ...prev,
          isLoading: false,
          isFourmiz: isFourmizDirect,
          criteriaCompleted: criteriaCompletedDirect,
          hasRun: true,
          retryCount: retryAttempt,
          lastCheck: Date.now()
        }));
      } else if (retryAttempt < maxRetries) {
        // Si résultat incohérent, retry
        console.log(`🔄 [DIRECT CHECK] Résultat incohérent, retry dans ${retryDelay}ms`);
        setTimeout(() => checkDirectlyIfFourmizWithRetry(retryAttempt + 1), retryDelay);
      } else {
        // Max retries atteint avec résultat incohérent
        setDirectFourmizCheck(prev => ({
          ...prev,
          isLoading: false,
          isFourmiz: false,
          criteriaCompleted: false,
          hasRun: true,
          retryCount: retryAttempt
        }));
      }

    } catch (error) {
      console.error(`💥 [DIRECT CHECK] Erreur tentative ${retryAttempt + 1}:`, error);
      if (retryAttempt < maxRetries) {
        setTimeout(() => checkDirectlyIfFourmizWithRetry(retryAttempt + 1), retryDelay);
      } else {
        setDirectFourmizCheck(prev => ({
          ...prev,
          isLoading: false,
          isFourmiz: false,
          criteriaCompleted: false,
          hasRun: true,
          retryCount: retryAttempt
        }));
      }
    }
  }, [user?.id, profile?.id, currentRole, hasFourmizRole]);

  // 🚫 VÉRIFICATION DIRECTE DÉSACTIVÉE - Les hooks normaux fonctionnent parfaitement
  useEffect(() => {
    // Puisque les hooks fonctionnent bien, désactiver la vérification directe
    if (!directFourmizCheck.hasRun && isInitialized) {
      console.log('✅ [DIRECT CHECK] Désactivé - utilisation des hooks normaux uniquement');
      setDirectFourmizCheck(prev => ({
        ...prev,
        isLoading: false,
        isFourmiz: false, // Sera écrasé par les hooks normaux
        criteriaCompleted: false, // Sera écrasé par les hooks normaux
        hasRun: true,
        retryCount: 0
      }));
    }
  }, [isInitialized, directFourmizCheck.hasRun]);

  // 🛡️ NOUVEAU: Listener avec protection temporaire pour déclencher une nouvelle vérification après sauvegarde critères
  useEffect(() => {
    const handleCriteriaSaved = async () => {
      console.log('🎯 [Layout] Critères sauvegardés détectés, protection temporaire activée...');
      
      // ✅ PROTECTION : Bloquer les redirections pendant la synchronisation
      setCriteriaJustSaved(true);
      
      // Force un re-render pour que les hooks se remettent à jour
      setForceRenderKey(prev => prev + 1);
      
      // Forcer le reload du profil
      await forceProfileReload();
      
      // Attendre la synchronisation puis débloquer
      setTimeout(() => {
        setCriteriaJustSaved(false);
        setForceRenderKey(prev => prev + 1);
        console.log('✅ [Layout] Protection temporaire désactivée, navigation normale reprise');
      }, 3000); // 3 secondes de protection
    };

    globalEventEmitter.on('criteriaSaved', handleCriteriaSaved);
    
    return () => {
      globalEventEmitter.off('criteriaSaved', handleCriteriaSaved);
    };
  }, [forceProfileReload]);

  const effectiveRole = useMemo(() => {
    if (currentRole && ['client', 'fourmiz'].includes(currentRole)) {
      return currentRole as 'client' | 'fourmiz';
    }
    return 'client';
  }, [currentRole]);

  // 🔧 UTILISATION DES VALEURS DIRECTES si le hook normal échoue
  const finalIsFourmiz = isFourmiz || directFourmizCheck.isFourmiz;
  const finalCriteriaCompleted = criteriaCompleted !== undefined ? criteriaCompleted : directFourmizCheck.criteriaCompleted;
  const finalIsLoading = criteriaLoading || directFourmizCheck.isLoading;

  // 🔍 DEBUG AVEC VALEURS DIRECTES ET NORMALES + info retry
  useEffect(() => {
    console.log('🔍 [LAYOUT DEBUG COMPLET] État actuel:', {
      pathname,
      // Valeurs du hook normal
      hook_isFourmiz: isFourmiz,
      hook_criteriaCompleted: criteriaCompleted,
      hook_criteriaLoading: criteriaLoading,
      // Valeurs de la vérification directe
      direct_isFourmiz: directFourmizCheck.isFourmiz,
      direct_criteriaCompleted: directFourmizCheck.criteriaCompleted,
      direct_isLoading: directFourmizCheck.isLoading,
      direct_hasRun: directFourmizCheck.hasRun,
      direct_retryCount: directFourmizCheck.retryCount,
      direct_lastCheck: directFourmizCheck.lastCheck,
      // Valeurs finales utilisées
      final_isFourmiz: finalIsFourmiz,
      final_criteriaCompleted: finalCriteriaCompleted,
      final_isLoading: finalIsLoading,
      // État général
      isInitialized,
      currentRole,
      hasFourmizRole,
      effectiveRole,
      // 🛡️ NOUVEAU: État protection
      criteriasJustSaved,
      'Should redirect to criteria?': finalIsFourmiz && !finalCriteriaCompleted && isInitialized && !finalIsLoading && !criteriasJustSaved
    });
  }, [pathname, isFourmiz, criteriaCompleted, criteriaLoading, directFourmizCheck, finalIsFourmiz, finalCriteriaCompleted, finalIsLoading, isInitialized, currentRole, effectiveRole, criteriasJustSaved]);

  // 🚨 REDIRECTION SÉCURISÉE VERS CRITÈRES - MODIFIÉE POUR NAVIGATION NORMALE
  useEffect(() => {
    // 🛡️ PROTECTION : Ne pas rediriger si les critères viennent d'être sauvegardés
    if (criteriasJustSaved) {
      console.log('🛡️ [REDIRECT CRITERIA] Protection active - pas de redirection après sauvegarde');
      return;
    }

    // 🚫 NE PAS REDIRIGER si pas initialisé ou en cours de chargement
    if (!isInitialized || finalIsLoading || switchingRole) {
      console.log('🔒 [REDIRECT CRITERIA] Blocage - pas initialisé ou chargement:', {
        isInitialized, finalIsLoading, switchingRole
      });
      return;
    }

    // 🔧 DÉTECTION AMÉLIORÉE de la page criteria
    const isOnCriteriaPage = pathname.includes('/criteria') || 
                            pathname.includes('criteria') || 
                            pathname.endsWith('/criteria') ||
                            pathname === '/(tabs)/criteria';
    
    // 🎯 NOUVELLE LOGIQUE : Redirection SEULEMENT depuis certaines pages spécifiques
    const isOnRedirectablePage = (
      pathname === '/(tabs)' || 
      pathname === '/' ||
      pathname === '/(tabs)/available-orders' ||
      pathname.includes('/available-orders')
    );
    
    // 🔒 VÉRIFICATIONS DE SÉCURITÉ AVEC RESTRICTION DE PAGES
    const shouldRedirectToCriteria = (
      // Vérification 1: Doit être Fourmiz selon les deux systèmes
      (finalIsFourmiz || currentRole === 'fourmiz') &&
      
      // Vérification 2: Critères pas complétés
      !finalCriteriaCompleted &&
      
      // Vérification 3: Système initialisé
      isInitialized &&
      
      // Vérification 4: Pas en cours de chargement
      !finalIsLoading &&
      
      // Vérification 5: Pas déjà sur la page criteria
      !isOnCriteriaPage &&
      
      // Vérification 6: Pas en cours de switch de rôle
      !switchingRole &&
      
      // Vérification 7: L'utilisateur a bien le rôle Fourmiz
      (hasFourmizRole || effectiveRole === 'fourmiz') &&
      
      // Vérification 8: Au moins un retry a été effectué pour éviter les faux positifs
      directFourmizCheck.hasRun &&
      
      // 🆕 NOUVELLE CONDITION CRITIQUE : Seulement depuis certaines pages
      isOnRedirectablePage
    );
    
    console.log('🔍 [REDIRECT CRITERIA DEBUG]:', {
      pathname,
      isOnCriteriaPage,
      isOnRedirectablePage, // 🆕 NOUVELLE INFO
      finalIsFourmiz,
      finalCriteriaCompleted,
      isInitialized,
      finalIsLoading,
      switchingRole,
      currentRole,
      effectiveRole,
      hasFourmizRole,
      directRetryCount: directFourmizCheck.retryCount,
      criteriasJustSaved,
      shouldRedirectToCriteria,
      'Pages autorisées pour redirection': [
        '/(tabs)',
        '/'
        // 🚫 RETIRÉ : available-orders pour navigation normale
      ]
    });
    
    // ✅ REDIRECTION SÉCURISÉE uniquement depuis les pages autorisées
    if (shouldRedirectToCriteria) {
      console.log('🚀 REDIRECTION AUTORISÉE vers critères depuis:', pathname);
      
      try {
        console.log('🎯 EXÉCUTION REDIRECTION: /(tabs)/criteria?force=true&first_time=true');
        router.replace('/(tabs)/criteria?force=true&first_time=true');
      } catch (error) {
        console.error('❌ Erreur redirection vers critères:', error);
        setTimeout(() => {
          try {
            router.replace('/(tabs)/criteria');
          } catch (fallbackError) {
            console.error('❌ Erreur fallback redirection critères:', fallbackError);
          }
        }, 1000);
      }
    } else if (isOnCriteriaPage) {
      console.log('✅ Déjà sur la page criteria, pas de redirection');
    } else if (!isOnRedirectablePage && (finalIsFourmiz || currentRole === 'fourmiz') && !finalCriteriaCompleted) {
      console.log('🔄 Navigation libre autorisée vers:', pathname, '(critères incomplets mais page non restrictive)');
    } else {
      console.log('🚫 Pas de redirection vers critères - conditions non remplies');
    }
  }, [
    // 🆕 DÉPENDANCES MODIFIÉES : pathname gardé mais avec logique restrictive
    criteriasJustSaved,
    finalIsFourmiz, finalCriteriaCompleted, isInitialized, finalIsLoading, 
    switchingRole, router, pathname, currentRole, effectiveRole, 
    hasFourmizRole, directFourmizCheck.hasRun, directFourmizCheck.retryCount
  ]);

  // 🚀 NAVIGATION AUTOMATIQUE AVEC PRIORITÉ ABSOLUE POUR AVAILABLE-ORDERS (Fourmiz) - MODIFIÉE
  useEffect(() => {
    // 🚫 BLOQUER TOUTE REDIRECTION TANT QUE PAS INITIALISÉ
    if (!isInitialized || switchingRole || finalIsLoading) {
      console.log('⏳ [TabsLayout] Attente initialisation complète...', {
        isInitialized,
        switchingRole,
        finalIsLoading,
        currentRole
      });
      return;
    }

    // 🚨 PRIORITÉ ABSOLUE : Ne pas toucher à la navigation si on doit aller vers critères
    // 🆕 MODIFICATION : Vérifier aussi si on est sur une page autorisée pour la redirection
    const isOnRedirectablePage = (
      pathname === '/(tabs)' || 
      pathname === '/' ||
      pathname === '/(tabs)/available-orders' ||
      pathname.includes('/available-orders')
    );

    if (finalIsFourmiz && !finalCriteriaCompleted && directFourmizCheck.hasRun && !criteriasJustSaved && isOnRedirectablePage) {
      console.log('🎯 [TabsLayout] Fourmiz sans critères sur page redirectable - BLOCAGE de toute autre navigation');
      return; // 🚫 ARRÊT SEULEMENT pour les pages redirectables
    }

    // Vérifier si on est sur la racine des tabs ou sur un onglet qui n'existe pas pour ce rôle
    const currentPath = pathname.replace(/\/$/, '') || '/';
    const isOnRootTabs = currentPath === '/(tabs)' || currentPath === '/';
    
    // 🔧 AMÉLIORATION : Détection des pages exclues de la redirection automatique
    const isExcludedPath = (() => {
      console.log('🔍 [TabsLayout] Vérification exclusion pour:', pathname);
      
      // Routes de détail dynamiques avec regex
      if (pathname.match(/\/orders\/\d+/) || pathname.match(/\(tabs\)\/orders\/\d+/)) {
        console.log('🚫 [TabsLayout] Route orders/[id] exclue:', pathname);
        return true;
      }
      if (pathname.match(/\/chat\/\d+/) || pathname.match(/\(tabs\)\/chat\/\d+/)) {
        console.log('🚫 [TabsLayout] Route chat/[id] exclue:', pathname);
        return true;
      }
      
      // Routes fixes à exclure
      const fixedExclusions = [
        '/services-requests',
        '/(tabs)/services-requests',
        '/earnings',
        '/criteria',
        '/network',
        '/rewards',
        '/auth/',
        // 🆕 NOUVEAUX : Onglets normaux à ne pas rediriger
        '/(tabs)/profile',
        '/(tabs)/messages',
        '/(tabs)/calendar',
        '/(tabs)/map',
        '/(tabs)/services',
        '/(tabs)/orders',
        '/applications',         // 🆕 AJOUTÉ: Exclusion route applications (pathname court)
        '/(tabs)/applications'   // 🆕 AJOUTÉ: Exclusion route applications (pathname complet)
      ];
      
      const isFixed = fixedExclusions.some(excluded => 
        currentPath.includes(excluded) || 
        pathname.includes(excluded)
      );
      
      if (isFixed) {
        console.log('🚫 [TabsLayout] Route fixe exclue:', pathname);
        return true;
      }
      
      console.log('✅ [TabsLayout] Route NON exclue, redirection possible:', pathname);
      return false;
    })();
    
    // 🔧 Ne pas rediriger si on est sur une page exclue
    if (isExcludedPath) {
      return;
    }
    
    // Vérifier si l'onglet actuel est disponible pour le rôle effectif
    const visibleTabs = getVisibleTabs(effectiveRole);
    const currentTabExists = visibleTabs.some(tab => 
      currentPath.includes(tab.name) || 
      currentPath === tab.route ||
      currentPath === tab.route.replace(/\/$/, '')
    );

    // Si on est sur la racine ou sur un onglet non disponible, rediriger vers l'onglet par défaut
    if (isOnRootTabs || !currentTabExists) {
      const defaultTab = getDefaultTabForRole(effectiveRole);
      
      // 🚀 PRIORITÉ SPÉCIALE : Pour Fourmiz, toujours aller vers available-orders
      if (effectiveRole === 'fourmiz') {
        console.log('🚀 [TabsLayout] Redirection prioritaire Fourmiz vers available-orders');
        setTimeout(() => {
          router.replace('/(tabs)/available-orders');
        }, 100);
      } else {
        console.log(`🎯 [TabsLayout] Redirection navigation normale vers ${effectiveRole}:`, defaultTab.displayName);
        setTimeout(() => {
          router.replace(defaultTab.route);
        }, 100);
      }
    }
  }, [effectiveRole, pathname, router, isInitialized, switchingRole, finalIsLoading, finalIsFourmiz, finalCriteriaCompleted, directFourmizCheck.hasRun, criteriasJustSaved]);

  // 🔧 ÉCRAN DE CHARGEMENT PENDANT L'INITIALISATION avec info retry
  if (!isInitialized || finalIsLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#333333" />
          <Text style={styles.loadingText}>
            {finalIsLoading ? 'Vérification utilisateur...' : 'Initialisation...'}
          </Text>
          {directFourmizCheck.retryCount > 0 && (
            <Text style={{ fontSize: 11, color: '#999', marginTop: 5 }}>
              Retry: {directFourmizCheck.retryCount}/3
            </Text>
          )}
        </View>
      </View>
    );
  }

  // 🔧 ÉCRAN DE TRANSITION avec valeurs directes et info retry (SEULEMENT si pas sur criteria) + PROTECTION
  const isOnCriteriaPage = pathname.includes('/criteria') || 
                          pathname.includes('criteria') || 
                          pathname.endsWith('/criteria') ||
                          pathname === '/(tabs)/criteria';
  
  // 🆕 MODIFICATION : Vérification de page redirectable pour l'écran de transition
  const isOnRedirectablePage = (
    pathname === '/(tabs)' || 
    pathname === '/' ||
    pathname === '/(tabs)/available-orders' ||
    pathname.includes('/available-orders')
  );
  
  if (finalIsFourmiz && !finalCriteriaCompleted && !isOnCriteriaPage && directFourmizCheck.hasRun && !criteriasJustSaved && isOnRedirectablePage) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="settings-outline" size={64} color="#333333" />
          <ActivityIndicator size="large" color="#333333" style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>Configuration des critères requise</Text>
          <Text style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 10 }}>
            Redirection vers /(tabs)/criteria?force=true&first_time=true
          </Text>
          <Text style={{ fontSize: 11, color: '#ccc', textAlign: 'center', marginTop: 5 }}>
            Vérification directe: isFourmiz={finalIsFourmiz ? 'true' : 'false'} | Retry: {directFourmizCheck.retryCount}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🔧 OVERLAY GLOBAL POUR BLOQUER COMPLÈTEMENT PENDANT LE SWITCH */}
      {switchingRole && (
        <View style={styles.globalSwitchingOverlay}>
          <View style={styles.switchingIndicator}>
            <ActivityIndicator size="large" color="#333333" />
            <Text style={styles.switchingText}>Changement de rôle...</Text>
          </View>
        </View>
      )}
      
      {/* ✅ HEADER AGRANDI AVEC MINI SWITCH ET DÉCONNEXION */}
      <GlobalFourmizHeader effectiveRole={effectiveRole} />
      
      <Tabs
        key={`tabs-${effectiveRole}-${forceRenderKey}`}
        tabBar={(props) => (
          <CustomTabBar 
            {...props} 
            effectiveRole={effectiveRole}
            switchingRole={switchingRole}
            forceUpdateKey={forceRenderKey}
          />
        )}
        screenOptions={{ headerShown: false }}
      >
        {ALL_TABS.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{ 
              href: tab.showInTabBar ? tab.route : null, // 🚫 MASQUER de la tab bar si showInTabBar = false
              headerShown: false 
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    flex: 1,
  },

  loadingText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  
  // 🎨 HEADER GLOBAL AGRANDI
  globalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 6,
    minHeight: 48,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  
  // ✅ SECTIONS ÉQUILIBRÉES
  headerLeftSection: {
    width: 70,
    alignItems: 'flex-start',
    justifyContent: 'center',        
  },
  
  // ✅ NOUVEAU : Bouton de déconnexion
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffe5e5',
  },
  
  headerLogoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  headerRightSection: {
    width: 70,
    alignItems: 'flex-end',
  },
  
  // Logo AGRANDI pour header plus grand
  headerLogo: {
    width: 160,
    height: 32,
    resizeMode: 'contain',
  },
  
  // ✅ BOUTON RECHERCHE
  headerSearchButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  
  // 🎨 MINI SWITCH STYLES - NOUVELLES COULEURS
  miniRoleSwitch: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',  // Container reste gris clair
    borderRadius: 8,
    padding: 3,
    width: 68,
    height: 36,
  },
  
  miniSwitchButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRadius: 6,
    position: 'relative',
    minWidth: 30,
    minHeight: 30,
  },
  
  miniSwitchButtonLeft: {
    marginRight: 1,
  },
  
  miniSwitchButtonRight: {
    marginLeft: 1,
  },
  
  // 🎨 BOUTON ACTIF - AVEC BORDURE NOIRE AJOUTÉE
  miniSwitchButtonActive: {
    backgroundColor: '#ffffff',  // 🎨 MODIFIÉ : Blanc au lieu de noir
    borderWidth: 1,             // 🆕 AJOUTÉ : Bordure noire
    borderColor: '#000000',     // 🆕 AJOUTÉ : Couleur bordure noire
  },
  
  // 🎨 BOUTON INDISPONIBLE - NOUVELLES COULEURS
  miniSwitchButtonUnavailable: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#000000',  // 🎨 MODIFIÉ : Noir au lieu de #e0e0e0
    borderStyle: 'dashed',
  },

  // 🎨 INDICATEUR "+" - NOUVELLES COULEURS
  roleUnavailableIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#000000',  // 🎨 MODIFIÉ : Noir au lieu de #e0e0e0
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  
  // 🔧 LOGO FOURMIZ PARFAITEMENT CENTRÉ - VERSION CORRIGÉE
  miniSwitchLogo: {
    width: 28,           // 🔧 AJUSTÉ : légèrement réduit pour meilleur centrage
    height: 20,          // 🔧 AJUSTÉ : légèrement réduit pour meilleur centrage  
    resizeMode: 'contain',
    position: 'absolute', // 🔧 CENTRAGE PARFAIT : positionnement absolu
    top: '50%',          // 🔧 CENTRAGE PARFAIT : centre vertical
    left: '50%',         // 🔧 CENTRAGE PARFAIT : centre horizontal
    transform: [         // 🔧 CENTRAGE PARFAIT : ajustement précis
      { translateX: -14 }, // 🔧 Moitié de la largeur (28/2 = 14)
      { translateY: -10 }  // 🔧 Moitié de la hauteur (20/2 = 10)
    ],
  },
  
  miniSwitchLogoActive: {
    opacity: 1,
  },

  miniSwitchLogoUnavailable: {
    opacity: 0.3,
  },
  
  // 🎨 TEXTE FALLBACK - NOUVELLES COULEURS (pour les cas d'erreur de chargement)
  miniSwitchFallbackText: {
    fontSize: 14,        // 🔧 AGRANDI : de 12 à 14 pour s'aligner avec le logo
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center', // 🔧 CENTRAGE : texte centré
    alignSelf: 'center', // 🔧 CENTRAGE : alignement automatique
  },
  
  // 🎨 TEXTE ACTIF - NOUVELLES COULEURS
  miniSwitchTextActive: {
    color: '#000000',  // Reste noir (cohérent)
  },

  // 🎨 TEXTE INDISPONIBLE - NOUVELLES COULEURS
  miniSwitchTextUnavailable: {
    color: '#000000',
    fontSize: 14,        // 🔧 AGRANDI : de 12 à 14
    fontWeight: 'bold',
    textAlign: 'center', // 🔧 CENTRAGE : texte centré
    alignSelf: 'center', // 🔧 CENTRAGE : alignement automatique
  },
  
  // 🎯 ONGLETS (inchangés mais organisés)
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 4,                              
    paddingBottom: Platform.OS === 'ios' ? 8 : 4, 
    position: 'relative',
  },
  
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
  
  switchingText: {
    fontSize: 11,                               
    color: '#666',
    marginTop: 4,                               
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
    alignItems: 'center',
    gap: 12,
  },
  
  scrollView: {
    flexGrow: 0,
  },
  
  scrollContent: {
    paddingHorizontal: 4,                       
    alignItems: 'center',
    minWidth: screenWidth,
    justifyContent: 'space-evenly',             
  },
  
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,                        
    paddingVertical: 4,                         
    paddingHorizontal: 2,                       
    minWidth: 44,                               
    position: 'relative',
    flex: 1,                                    
  },
  
  tabButtonActive: {},
  
  tabButtonDisabled: {
    opacity: 0.5,
  },
  
  iconContainer: {
    width: 32,                                  
    height: 32,                                 
    borderRadius: 16,                           
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  
  iconContainerActive: {
    backgroundColor: '#333333',
    transform: [{ scale: 1.05 }],               
    shadowOpacity: 0,                           
    elevation: 0,                               
  },
  
  iconContainerDisabled: {
    backgroundColor: '#F5F5F5',
    transform: [{ scale: 1 }],
    shadowOpacity: 0,
  },
  
  activeIndicator: {
    position: 'absolute',
    bottom: -1,                                 
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  redDot: {
    width: 4,                                   
    height: 4,                                  
    borderRadius: 2,                            
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});
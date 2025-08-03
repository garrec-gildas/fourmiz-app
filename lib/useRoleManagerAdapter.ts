// lib/useRoleManagerAdapter.ts
// 🔄 ADAPTATEUR pour faire le lien entre index.tsx et roleManager.ts

import { useState, useEffect, useCallback } from 'react';
import { useRoleManager, UserRole } from './roleManager';
import { Alert } from 'react-native';

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
  postalcode?: string;
  alternative_phone?: string;
  avatar_url?: string;
  profile_completed?: boolean;
  is_online?: boolean;
}

export function useRoleManagerAdapter(profile: UserProfile | null) {
  const {
    hasClientRole,
    hasFourmizRole,
    canBecomeClient,
    canBecomeFourmiz,
    refreshProfile,
    addRole,
    navigateToRole,
    loading: roleLoading,
    userProfile,
    analysis
  } = useRoleManager();

  const [switchingRole, setSwitchingRole] = useState(false);
  // 🆕 NOUVEAU : État local pour mémoriser le rôle choisi par l'utilisateur
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');

  // 🛡️ PROTECTION CONTRE LES ERREURS - Vérifier que les rôles existent
  const safeHasClientRole = hasClientRole || false;
  const safeHasFourmizRole = hasFourmizRole || false;
  const safeCanBecomeClient = canBecomeClient || false;
  const safeCanBecomeFourmiz = canBecomeFourmiz || false;

  // 🔄 Charger le profil au démarrage
  useEffect(() => {
    if (profile?.id) {
      console.log('🔄 Chargement profil pour useRoleManagerAdapter:', profile.id);
      console.log('📋 Rôles du profil:', profile.roles);
      refreshProfile(profile.id);
    }
  }, [profile?.id, refreshProfile]);

  // ✅ ADAPTATIONS pour correspondre à l'interface attendue dans index.tsx

  // 🔄 Initialiser le rôle sélectionné selon les rôles disponibles
  useEffect(() => {
    if (safeHasClientRole && safeHasFourmizRole) {
      // L'utilisateur a les deux rôles - garder son choix ou défaut sur client
      console.log('👥 Utilisateur a les deux rôles, rôle sélectionné:', selectedRole);
    } else if (safeHasClientRole) {
      setSelectedRole('client');
    } else if (safeHasFourmizRole) {
      setSelectedRole('fourmiz');
    } else {
      setSelectedRole('client'); // Défaut pour nouveaux utilisateurs
    }
  }, [safeHasClientRole, safeHasFourmizRole, selectedRole]);

  // Rôle actuel (utilise selectedRole quand l'utilisateur a les deux rôles)
  const currentRole: UserRole = (() => {
    if (safeHasClientRole && safeHasFourmizRole) {
      return selectedRole; // 🆕 Utilise le rôle sélectionné par l'utilisateur
    }
    if (safeHasClientRole) return 'client';
    if (safeHasFourmizRole) return 'fourmiz';
    return 'client'; // Défaut pour nouveaux utilisateurs
  })();

  // Rôles disponibles
  const availableRoles: UserRole[] = (() => {
    const roles: UserRole[] = [];
    if (safeHasClientRole) roles.push('client');
    if (safeHasFourmizRole) roles.push('fourmiz');
    return roles;
  })();

  // Peut switcher si a les deux rôles
  const canSwitchRole = safeHasClientRole && safeHasFourmizRole;

  // Peut demander l'autre rôle
  const canRequestOtherRole: UserRole | null = (() => {
    if (safeCanBecomeClient && !safeHasClientRole) return 'client';
    if (safeCanBecomeFourmiz && !safeHasFourmizRole) return 'fourmiz';
    return null;
  })();

  // ✅ FONCTION SWITCH ROLE (bascule entre client/fourmiz)
  const switchRole = useCallback(async (targetRole: UserRole) => {
    if (switchingRole || !profile?.id) {
      return { success: false, needsCompletion: false };
    }

    try {
      setSwitchingRole(true);
      console.log('🔄 Switch vers rôle:', targetRole);
      console.log('📊 État actuel:', { safeHasClientRole, safeHasFourmizRole, canSwitchRole });
      
      // CAS 1 : L'utilisateur a VRAIMENT les deux rôles → Switch simple
      if (safeHasClientRole && safeHasFourmizRole && canSwitchRole) {
        console.log('👥 Switch simple entre rôles existants vers:', targetRole);
        setSelectedRole(targetRole);
        return { success: true, needsCompletion: false };
      }
      
      // CAS 2 : L'utilisateur veut AJOUTER un rôle qu'il n'a pas encore
      console.log('➕ Ajout du rôle:', targetRole);
      
      // Vérifier si une complétion est nécessaire
      const navigation = await navigateToRole(profile.id, targetRole);
      console.log('🎯 Navigation déterminée:', navigation);
      
      if (navigation.route !== '/(tabs)') {
        // Complétion nécessaire → Rediriger
        console.log('🔄 Redirection vers complétion:', navigation.route);
        
        // Import dynamique du router pour éviter les dépendances circulaires
        const { router } = await import('expo-router');
        router.push(navigation.route);
        
        return { success: false, needsCompletion: true, route: navigation.route };
      }

      // Profil complet → Ajouter le rôle directement
      console.log('✅ Profil complet, ajout direct du rôle');
      const result = await addRole(profile.id, targetRole);
      
      // Si succès, mettre à jour le rôle sélectionné
      if (result.success) {
        console.log('🎉 Rôle ajouté avec succès, switch vers:', targetRole);
        setSelectedRole(targetRole);
      }
      
      return { success: result.success, needsCompletion: false };

    } catch (error) {
      console.error('❌ Erreur switch role:', error);
      return { success: false, needsCompletion: false };
    } finally {
      setSwitchingRole(false);
    }
  }, [switchingRole, profile?.id, safeHasClientRole, safeHasFourmizRole, canSwitchRole, navigateToRole, addRole]);

  // ✅ FONCTION DEMANDE UPGRADE RÔLE
  const requestRoleUpgrade = useCallback(async (targetRole: UserRole) => {
    if (!profile?.id) return;

    try {
      console.log('🎯 Demande upgrade rôle:', targetRole);
      
      // Vérifier si une complétion est nécessaire
      const navigation = await navigateToRole(profile.id, targetRole);
      
      if (navigation.route !== '/(tabs)') {
        // Redirection vers complétion
        console.log('🔄 Redirection vers complétion:', navigation.route);
        return { needsCompletion: true, route: navigation.route };
      }

      // Ajouter le rôle directement
      const result = await addRole(profile.id, targetRole);
      
      if (result.success) {
        Alert.alert(
          '🎉 Félicitations !',
          `Vous êtes maintenant ${targetRole === 'client' ? 'Client' : 'Fourmiz'} !`
        );
      } else {
        Alert.alert('Erreur', result.message);
      }

      return { needsCompletion: false, success: result.success };

    } catch (error) {
      console.error('❌ Erreur request upgrade:', error);
      Alert.alert('Erreur', 'Impossible de traiter votre demande');
      return { needsCompletion: false, success: false };
    }
  }, [profile?.id, navigateToRole, addRole]);

  // ✅ VÉRIFICATION PROFIL COMPLET POUR RÔLE
  const isProfileCompleteForRole = useCallback((targetRole: UserRole): boolean => {
    if (!analysis) return false;

    if (targetRole === 'client') {
      return !analysis.needsClientInfo;
    }
    if (targetRole === 'fourmiz') {
      return !analysis.needsFourmizInfo;
    }
    return false;
  }, [analysis]);

  // ✅ CHAMPS MANQUANTS POUR RÔLE
  const getMissingFieldsForRole = useCallback((targetRole: UserRole): string[] => {
    if (!analysis) return [];

    const missing: string[] = [];

    if (targetRole === 'client' && analysis.needsClientInfo) {
      if (!userProfile?.firstname) missing.push('Prénom');
      if (!userProfile?.lastname) missing.push('Nom');
      if (!userProfile?.phone) missing.push('Téléphone');
      if (!userProfile?.address) missing.push('Adresse');
      if (!userProfile?.city) missing.push('Ville');
      if (!userProfile?.postal_code) missing.push('Code postal');
    }

    if (targetRole === 'fourmiz' && analysis.needsFourmizInfo) {
      // Champs de base + spécifiques Fourmiz
      if (!userProfile?.firstname) missing.push('Prénom');
      if (!userProfile?.lastname) missing.push('Nom');
      if (!userProfile?.phone) missing.push('Téléphone');
      if (!userProfile?.address) missing.push('Adresse');
      if (!userProfile?.city) missing.push('Ville');
      if (!userProfile?.postal_code) missing.push('Code postal');
      if (!userProfile?.rib) missing.push('RIB');
      if (!userProfile?.id_document_path) missing.push('Pièce d\'identité');
    }

    return missing;
  }, [analysis, userProfile]);

  // 🔍 LOGS DEBUG pour voir l'état
  useEffect(() => {
    console.log('🔍 useRoleManagerAdapter - État:', {
      profileId: profile?.id,
      profileRoles: profile?.roles,
      safeHasClientRole,
      safeHasFourmizRole,
      safeCanBecomeClient,
      safeCanBecomeFourmiz,
      selectedRole, // 🆕 Ajout du rôle sélectionné
      currentRole,
      canSwitchRole,
      canRequestOtherRole,
      roleLoading,
      analysisExists: !!analysis
    });
  }, [
    profile?.id, 
    profile?.roles,
    safeHasClientRole, 
    safeHasFourmizRole, 
    safeCanBecomeClient, 
    safeCanBecomeFourmiz, 
    selectedRole, // 🆕 Ajout de selectedRole dans les dépendances
    currentRole, 
    canSwitchRole, 
    canRequestOtherRole, 
    roleLoading, 
    analysis
  ]);

  // ✅ RETOUR DE L'INTERFACE COMPATIBLE avec index.tsx
  return {
    // États principaux
    currentRole,
    availableRoles,
    switchingRole,
    
    // Capacités
    canSwitchRole,
    canRequestOtherRole,
    
    // Actions
    switchRole,
    requestRoleUpgrade,
    
    // Vérifications
    isProfileCompleteForRole,
    getMissingFieldsForRole,
    
    // États du roleManager original (pour info) - UTILISATION DES VARIABLES SÉCURISÉES
    hasClientRole: safeHasClientRole,
    hasFourmizRole: safeHasFourmizRole,
    canBecomeClient: safeCanBecomeClient,
    canBecomeFourmiz: safeCanBecomeFourmiz,
    loading: roleLoading,
    userProfile,
    analysis,
    
    // Actions du roleManager original
    refreshProfile,
    addRole,
    navigateToRole,
  };
}
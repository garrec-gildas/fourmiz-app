// lib/useRoleManagerAdapter.ts
// 🔄 ADAPTATEUR pour faire le lien entre index.tsx et roleManager.ts
// 🔧 CORRIGÉ : Priorisation fourmiz pour les utilisateurs multi-rôles

import React, { useState, useEffect, useCallback } from 'react';
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
  console.log('🔍 [DEBUG] useRoleManagerAdapter - Profil reçu:', {
    profile,
    profileId: profile?.id,
    profileRoles: profile?.roles,
    profileType: typeof profile,
    profileKeys: profile ? Object.keys(profile) : 'null'
  });

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

  console.log('🔍 [DEBUG] useRoleManager - États reçus:', {
    hasClientRole,
    hasFourmizRole,
    canBecomeClient,
    canBecomeFourmiz,
    roleLoading,
    userProfileExists: !!userProfile,
    userProfileId: userProfile?.id,
    userProfileRoles: userProfile?.roles,
    analysisExists: !!analysis,
    analysisDetails: analysis
  });

  const [switchingRole, setSwitchingRole] = useState(false);
  // 🔧 CORRIGÉ : État local pour mémoriser le rôle choisi par l'utilisateur - défaut fourmiz
  const [selectedRole, setSelectedRole] = useState<UserRole>('fourmiz');

  // 🛡️ PROTECTION CONTRE LES ERREURS - Vérifier que les rôles existent
  const safeHasClientRole = hasClientRole || false;
  const safeHasFourmizRole = hasFourmizRole || false;
  const safeCanBecomeClient = canBecomeClient || false;
  const safeCanBecomeFourmiz = canBecomeFourmiz || false;

  console.log('🔍 [DEBUG] États sécurisés calculés:', {
    safeHasClientRole,
    safeHasFourmizRole,
    safeCanBecomeClient,
    safeCanBecomeFourmiz
  });

  // 🔄 Charger le profil au démarrage
  useEffect(() => {
    console.log('🔄 [DEBUG] useEffect - Chargement profil');
    console.log('🔄 [DEBUG] Profile object:', profile);
    console.log('🔄 [DEBUG] Profile?.id:', profile?.id);
    console.log('🔄 [DEBUG] refreshProfile function:', typeof refreshProfile);
    
    if (profile?.id) {
      console.log('✅ [DEBUG] Profile ID trouvé, appel refreshProfile:', profile.id);
      console.log('📋 [DEBUG] Rôles du profil avant refresh:', profile.roles);
      
      try {
        refreshProfile(profile.id);
        console.log('✅ [DEBUG] refreshProfile appelé avec succès');
      } catch (error) {
        console.error('❌ [DEBUG] Erreur lors de refreshProfile:', error);
      }
    } else {
      console.log('❌ [DEBUG] Pas de profile.id disponible');
      console.log('❌ [DEBUG] Profile complet:', JSON.stringify(profile, null, 2));
    }
  }, [profile?.id, refreshProfile]);

  // ✅ ADAPTATIONS pour correspondre à l'interface attendue dans index.tsx

  // 🔧 CORRIGÉ : Initialiser le rôle sélectionné selon les rôles disponibles - PRIORISATION FOURMIZ
  useEffect(() => {
    console.log('🔄 [DEBUG] useEffect - Initialisation rôle sélectionné');
    console.log('🔄 [DEBUG] États actuels:', {
      safeHasClientRole,
      safeHasFourmizRole,
      selectedRole
    });

    if (safeHasClientRole && safeHasFourmizRole) {
      // 🔧 CORRECTION : Prioriser fourmiz quand l'utilisateur a les deux rôles
      console.log('👥 [DEBUG] Utilisateur a les deux rôles, priorisation fourmiz');
      setSelectedRole('fourmiz');
    } else if (safeHasFourmizRole) {
      console.log('🐜 [DEBUG] Utilisateur a seulement le rôle fourmiz');
      setSelectedRole('fourmiz');
    } else if (safeHasClientRole) {
      console.log('👤 [DEBUG] Utilisateur a seulement le rôle client');
      setSelectedRole('client');
    } else {
      console.log('🆕 [DEBUG] Nouvel utilisateur, défaut sur client');
      setSelectedRole('client');
    }
  }, [safeHasClientRole, safeHasFourmizRole]); // 🔧 CORRIGÉ : Supprimé selectedRole de la dépendance pour éviter les boucles

  // Rôle actuel (utilise selectedRole quand l'utilisateur a les deux rôles)
  const currentRole: UserRole = (() => {
    const role = (() => {
      if (safeHasClientRole && safeHasFourmizRole) {
        return selectedRole; // 🆕 Utilise le rôle sélectionné par l'utilisateur
      }
      if (safeHasClientRole) return 'client';
      if (safeHasFourmizRole) return 'fourmiz';
      return 'client'; // Défaut pour nouveaux utilisateurs
    })();
    
    console.log('🎯 [DEBUG] currentRole calculé:', role);
    return role;
  })();

  // Rôles disponibles
  const availableRoles: UserRole[] = (() => {
    const roles: UserRole[] = [];
    if (safeHasClientRole) roles.push('client');
    if (safeHasFourmizRole) roles.push('fourmiz');
    console.log('📋 [DEBUG] availableRoles calculés:', roles);
    return roles;
  })();

  // Peut switcher si a les deux rôles
  const canSwitchRole = safeHasClientRole && safeHasFourmizRole;
  console.log('🔄 [DEBUG] canSwitchRole:', canSwitchRole);

  // Peut demander l'autre rôle
  const canRequestOtherRole: UserRole | null = (() => {
    const otherRole = (() => {
      if (safeCanBecomeClient && !safeHasClientRole) return 'client';
      if (safeCanBecomeFourmiz && !safeHasFourmizRole) return 'fourmiz';
      return null;
    })();
    console.log('🎯 [DEBUG] canRequestOtherRole:', otherRole);
    return otherRole;
  })();

  // ✅ FONCTION SWITCH ROLE (bascule entre client/fourmiz)
  const switchRole = useCallback(async (targetRole: UserRole) => {
    console.log('🔄 [DEBUG] switchRole appelé avec:', targetRole);
    console.log('🔄 [DEBUG] État actuel switchingRole:', switchingRole);
    console.log('🔄 [DEBUG] Profile ID:', profile?.id);

    if (switchingRole || !profile?.id) {
      console.log('❌ [DEBUG] switchRole bloqué:', { switchingRole, profileId: profile?.id });
      return { success: false, needsCompletion: false };
    }

    try {
      setSwitchingRole(true);
      console.log('🔄 [DEBUG] Switch vers rôle:', targetRole);
      console.log('📊 [DEBUG] État actuel:', { safeHasClientRole, safeHasFourmizRole, canSwitchRole });
      
      // CAS 1 : L'utilisateur a VRAIMENT les deux rôles → Switch simple
      if (safeHasClientRole && safeHasFourmizRole && canSwitchRole) {
        console.log('👥 [DEBUG] Switch simple entre rôles existants vers:', targetRole);
        setSelectedRole(targetRole);
        console.log('✅ [DEBUG] selectedRole mis à jour vers:', targetRole);
        return { success: true, needsCompletion: false };
      }
      
      // CAS 2 : L'utilisateur veut AJOUTER un rôle qu'il n'a pas encore
      console.log('➕ [DEBUG] Ajout du rôle:', targetRole);
      console.log('🔄 [DEBUG] Appel navigateToRole...');
      
      // Vérifier si une complétion est nécessaire
      const navigation = await navigateToRole(profile.id, targetRole);
      console.log('🎯 [DEBUG] Navigation déterminée:', navigation);
      
      if (navigation.route !== '/(tabs)') {
        // Complétion nécessaire → Rediriger
        console.log('🔄 [DEBUG] Redirection vers complétion:', navigation.route);
        
        // Import dynamique du router pour éviter les dépendances circulaires
        try {
          const { router } = await import('expo-router');
          router.push(navigation.route);
          console.log('✅ [DEBUG] Redirection effectuée vers:', navigation.route);
        } catch (routerError) {
          console.error('❌ [DEBUG] Erreur import router:', routerError);
        }
        
        return { success: false, needsCompletion: true, route: navigation.route };
      }

      // Profil complet → Ajouter le rôle directement
      console.log('✅ [DEBUG] Profil complet, ajout direct du rôle');
      console.log('🔄 [DEBUG] Appel addRole...');
      const result = await addRole(profile.id, targetRole);
      console.log('📊 [DEBUG] Résultat addRole:', result);
      
      // Si succès, mettre à jour le rôle sélectionné
      if (result.success) {
        console.log('🎉 [DEBUG] Rôle ajouté avec succès, switch vers:', targetRole);
        setSelectedRole(targetRole);
      } else {
        console.log('❌ [DEBUG] Échec ajout rôle:', result.message);
      }
      
      return { success: result.success, needsCompletion: false };

    } catch (error) {
      console.error('❌ [DEBUG] Erreur switch role:', error);
      console.error('❌ [DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack');
      return { success: false, needsCompletion: false };
    } finally {
      console.log('🔄 [DEBUG] setSwitchingRole(false)');
      setSwitchingRole(false);
    }
  }, [switchingRole, profile?.id, safeHasClientRole, safeHasFourmizRole, canSwitchRole, navigateToRole, addRole]);

  // ✅ FONCTION DEMANDE UPGRADE RÔLE
  const requestRoleUpgrade = useCallback(async (targetRole: UserRole) => {
    console.log('🎯 [DEBUG] requestRoleUpgrade appelé avec:', targetRole);
    console.log('🎯 [DEBUG] Profile ID:', profile?.id);

    if (!profile?.id) {
      console.log('❌ [DEBUG] Pas de profile ID pour requestRoleUpgrade');
      return;
    }

    try {
      console.log('🎯 [DEBUG] Demande upgrade rôle:', targetRole);
      
      // Vérifier si une complétion est nécessaire
      console.log('🔄 [DEBUG] Appel navigateToRole pour upgrade...');
      const navigation = await navigateToRole(profile.id, targetRole);
      console.log('🎯 [DEBUG] Navigation pour upgrade:', navigation);
      
      if (navigation.route !== '/(tabs)') {
        // Redirection vers complétion
        console.log('🔄 [DEBUG] Redirection vers complétion upgrade:', navigation.route);
        return { needsCompletion: true, route: navigation.route };
      }

      // Ajouter le rôle directement
      console.log('✅ [DEBUG] Ajout direct du rôle pour upgrade');
      const result = await addRole(profile.id, targetRole);
      console.log('📊 [DEBUG] Résultat upgrade:', result);
      
      if (result.success) {
        console.log('🎉 [DEBUG] Upgrade réussi');
        Alert.alert(
          '🎉 Félicitations !',
          `Vous êtes maintenant ${targetRole === 'client' ? 'Client' : 'Fourmiz'} !`
        );
      } else {
        console.log('❌ [DEBUG] Upgrade échoué:', result.message);
        Alert.alert('Erreur', result.message);
      }

      return { needsCompletion: false, success: result.success };

    } catch (error) {
      console.error('❌ [DEBUG] Erreur request upgrade:', error);
      console.error('❌ [DEBUG] Stack trace upgrade:', error instanceof Error ? error.stack : 'No stack');
      Alert.alert('Erreur', 'Impossible de traiter votre demande');
      return { needsCompletion: false, success: false };
    }
  }, [profile?.id, navigateToRole, addRole]);

  // ✅ VÉRIFICATION PROFIL COMPLET POUR RÔLE
  const isProfileCompleteForRole = useCallback((targetRole: UserRole): boolean => {
    console.log('🔍 [DEBUG] isProfileCompleteForRole appelé pour:', targetRole);
    console.log('🔍 [DEBUG] Analysis disponible:', !!analysis);
    
    if (!analysis) {
      console.log('❌ [DEBUG] Pas d\'analysis, retourne false');
      return false;
    }

    let isComplete = false;
    if (targetRole === 'client') {
      isComplete = !analysis.needsClientInfo;
      console.log('👤 [DEBUG] Client complet:', isComplete, 'needsClientInfo:', analysis.needsClientInfo);
    }
    if (targetRole === 'fourmiz') {
      isComplete = !analysis.needsFourmizInfo;
      console.log('🐜 [DEBUG] Fourmiz complet:', isComplete, 'needsFourmizInfo:', analysis.needsFourmizInfo);
    }
    
    return isComplete;
  }, [analysis]);

  // ✅ CHAMPS MANQUANTS POUR RÔLE
  const getMissingFieldsForRole = useCallback((targetRole: UserRole): string[] => {
    console.log('🔍 [DEBUG] getMissingFieldsForRole appelé pour:', targetRole);
    console.log('🔍 [DEBUG] Analysis:', analysis);
    console.log('🔍 [DEBUG] UserProfile:', userProfile);
    
    if (!analysis) {
      console.log('❌ [DEBUG] Pas d\'analysis pour getMissingFieldsForRole');
      return [];
    }

    const missing: string[] = [];

    if (targetRole === 'client' && analysis.needsClientInfo) {
      console.log('👤 [DEBUG] Vérification champs client...');
      if (!userProfile?.firstname) { missing.push('Prénom'); console.log('❌ [DEBUG] Prénom manquant'); }
      if (!userProfile?.lastname) { missing.push('Nom'); console.log('❌ [DEBUG] Nom manquant'); }
      if (!userProfile?.phone) { missing.push('Téléphone'); console.log('❌ [DEBUG] Téléphone manquant'); }
      if (!userProfile?.address) { missing.push('Adresse'); console.log('❌ [DEBUG] Adresse manquante'); }
      if (!userProfile?.city) { missing.push('Ville'); console.log('❌ [DEBUG] Ville manquante'); }
      if (!userProfile?.postal_code) { missing.push('Code postal'); console.log('❌ [DEBUG] Code postal manquant'); }
    }

    if (targetRole === 'fourmiz' && analysis.needsFourmizInfo) {
      console.log('🐜 [DEBUG] Vérification champs fourmiz...');
      // Champs de base + spécifiques Fourmiz
      if (!userProfile?.firstname) { missing.push('Prénom'); console.log('❌ [DEBUG] Prénom manquant'); }
      if (!userProfile?.lastname) { missing.push('Nom'); console.log('❌ [DEBUG] Nom manquant'); }
      if (!userProfile?.phone) { missing.push('Téléphone'); console.log('❌ [DEBUG] Téléphone manquant'); }
      if (!userProfile?.address) { missing.push('Adresse'); console.log('❌ [DEBUG] Adresse manquante'); }
      if (!userProfile?.city) { missing.push('Ville'); console.log('❌ [DEBUG] Ville manquante'); }
      if (!userProfile?.postal_code) { missing.push('Code postal'); console.log('❌ [DEBUG] Code postal manquant'); }
      if (!userProfile?.rib) { missing.push('RIB'); console.log('❌ [DEBUG] RIB manquant'); }
      if (!userProfile?.id_document_path) { missing.push('Pièce d\'identité'); console.log('❌ [DEBUG] Pièce d\'identité manquante'); }
    }

    console.log('📋 [DEBUG] Champs manquants pour', targetRole, ':', missing);
    return missing;
  }, [analysis, userProfile]);

  // 🔍 LOGS DEBUG pour voir l'état - VERSION DÉTAILLÉE
  useEffect(() => {
    const debugState = {
      // Profil d'entrée
      profileId: profile?.id,
      profileRoles: profile?.roles,
      profileComplete: profile?.profile_completed,
      
      // États useRoleManager
      hasClientRole,
      hasFourmizRole,
      canBecomeClient,
      canBecomeFourmiz,
      roleLoading,
      
      // États sécurisés
      safeHasClientRole,
      safeHasFourmizRole,
      safeCanBecomeClient,
      safeCanBecomeFourmiz,
      
      // États locaux
      selectedRole,
      switchingRole,
      
      // États calculés
      currentRole,
      availableRoles,
      canSwitchRole,
      canRequestOtherRole,
      
      // Autres données
      userProfileExists: !!userProfile,
      userProfileId: userProfile?.id,
      userProfileRoles: userProfile?.roles,
      analysisExists: !!analysis,
      analysisNeedsClient: analysis?.needsClientInfo,
      analysisNeedsFourmiz: analysis?.needsFourmizInfo
    };
    
    console.log('🔍 [DEBUG] useRoleManagerAdapter - État complet:', debugState);
    
    // Vérifications spéciales
    if (profile?.id && (!hasClientRole && !hasFourmizRole)) {
      console.log('⚠️ [DEBUG] ATTENTION: Profil avec ID mais sans rôles détectés');
      console.log('⚠️ [DEBUG] Cela peut indiquer un problème de chargement des rôles');
    }
    
    if (availableRoles.length === 0 && profile?.id) {
      console.log('⚠️ [DEBUG] ATTENTION: availableRoles vide malgré un profil avec ID');
      console.log('⚠️ [DEBUG] Vérifiez le fonctionnement de useRoleManager');
    }
    
  }, [
    profile?.id, 
    profile?.roles,
    profile?.profile_completed,
    hasClientRole,
    hasFourmizRole, 
    canBecomeClient,
    canBecomeFourmiz,
    safeHasClientRole, 
    safeHasFourmizRole, 
    safeCanBecomeClient, 
    safeCanBecomeFourmiz, 
    selectedRole,
    switchingRole,
    currentRole, 
    canSwitchRole, 
    canRequestOtherRole, 
    roleLoading,
    userProfile,
    analysis
  ]);

  // ✅ RETOUR DE L'INTERFACE COMPATIBLE avec index.tsx
  const returnValue = {
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

  console.log('🔍 [DEBUG] useRoleManagerAdapter - Valeur de retour:', {
    currentRole: returnValue.currentRole,
    availableRoles: returnValue.availableRoles,
    switchingRole: returnValue.switchingRole,
    canSwitchRole: returnValue.canSwitchRole,
    canRequestOtherRole: returnValue.canRequestOtherRole,
    hasClientRole: returnValue.hasClientRole,
    hasFourmizRole: returnValue.hasFourmizRole,
    loading: returnValue.loading
  });

  return returnValue;
}

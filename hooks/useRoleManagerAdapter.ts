// hooks/useRoleManagerAdapter.ts - VERSION CORRIGÉE ET OPTIMISÉE COMPLÈTE
// 🚀 CORRECTIONS : Mémorisation agressive, dépendances stables, protection renforcée
// ⚡ OBJECTIF : Éliminer les re-rendus excessifs et améliorer les performances
// 🧹 NETTOYÉ : Suppression de toutes les références à 'rib' et 'user_type'
// 🔧 CORRIGÉ : Violations des règles des hooks React + nettoyage cache corrompu

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

type UserRole = 'client' | 'fourmiz';

const ROLE_STORAGE_KEY = 'user_last_role_preference';

interface RoleUpgradeRequest {
  targetRole: UserRole;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  timestamp: number;
}

interface ProfileCompletionCheck {
  isComplete: boolean;
  missingFields: string[];
  completionPercentage: number;
}

export function useRoleManagerAdapter(externalProfile?: any) {
  // Récupération du profil avec mémorisation stable
  const { profile: authProfile, clearAllUserCaches } = useAuth();
  const profile = externalProfile || authProfile;

  // 🔧 REFS STABLES pour éviter les re-rendus
  const profileDataRef = useRef<any>(null);
  const lastProfileHashRef = useRef<string>('');
  const lastRolesHashRef = useRef<string>('');
  const lastLogTimeRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  
  // États principaux
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [isLoadingRoleSwitch, setIsLoadingRoleSwitch] = useState(false);
  const [isLoadingUpgradeRequest, setIsLoadingUpgradeRequest] = useState(false);
  const [roleUpgradeRequest, setRoleUpgradeRequest] = useState<RoleUpgradeRequest | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Protection renforcée contre oscillation
  const lastProfileId = useRef<string | null>(null);
  const lastInitializationTime = useRef<number>(0);
  const isInitializing = useRef(false);
  
  // Références pour les timers
  const switchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const upgradeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🆕 AJOUTÉ: Fonction de nettoyage des caches corrompus spécifique aux rôles
  const clearRoleRelatedCaches = useCallback(async (currentUserId: string) => {
    try {
      console.log('🧹 [RoleManager] Nettoyage caches rôles pour:', currentUserId);
      
      const allKeys = await AsyncStorage.getAllKeys();
      const roleKeys = allKeys.filter(key => 
        key.includes(ROLE_STORAGE_KEY) && !key.includes(currentUserId)
      );
      
      if (roleKeys.length > 0) {
        await AsyncStorage.multiRemove(roleKeys);
        console.log('✅ [RoleManager] Caches rôles nettoyés:', roleKeys.length);
      }
      
      // Nettoyer aussi les caches généraux si disponible
      if (clearAllUserCaches) {
        await clearAllUserCaches();
      }
      
    } catch (error) {
      console.warn('⚠️ [RoleManager] Erreur nettoyage caches rôles:', error);
    }
  }, [clearAllUserCaches]);

  // 🚀 OPTIMISATION : Hash stable du profil pour éviter recalculs inutiles
  const profileHash = useMemo(() => {
    if (!profile?.id) return 'no-profile';
    
    const key = `${profile.id}-${profile.email}-${JSON.stringify(profile.roles || [])}-${profile.criteria_completed}`;
    return key;
  }, [profile?.id, profile?.email, profile?.roles, profile?.criteria_completed]);

  // 🚀 OPTIMISATION : Logging conditionnel pour réduire le spam
  const conditionalLog = useCallback((message: string, data: any) => {
    const now = Date.now();
    // Limiter les logs à maximum 1 par 2 secondes pour éviter le spam
    if (now - lastLogTimeRef.current > 2000) {
      console.log(message, data);
      lastLogTimeRef.current = now;
    }
  }, []);

  // 🔧 CORRECTION : Fonctions d'action avec vérification mounted
  const clearError = useCallback(() => {
    if (isMountedRef.current) {
      setLastError(null);
    }
  }, []);
  
  const refreshProfile = useCallback(async () => {
    if (isMountedRef.current) {
      setLastError(null);
    }
  }, []);
  
  const reloadProfile = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    console.log('🔄 [reloadProfile] Reload forcé du profil...');
    
    // Nettoyer les caches corrompus si on a un userId
    if (profile?.id) {
      await clearRoleRelatedCaches(profile.id);
    }
    
    // Reset des caches
    lastRolesHashRef.current = '';
    profileDataRef.current = null;
    
    if (isMountedRef.current) {
      setLastError(null);
      setIsInitialized(false);
      setCurrentRole(null);
    }
  }, [profile?.id, clearRoleRelatedCaches]);

  // 🚀 OPTIMISATION : Calcul des rôles avec cache et comparaison profonde
  const currentRoles: UserRole[] = useMemo(() => {
    // Si le hash n'a pas changé, retourner le cache
    if (profileHash === lastRolesHashRef.current && profileDataRef.current) {
      return profileDataRef.current;
    }

    conditionalLog('🔍 [useRoleManagerAdapter] Recalcul des rôles pour hash:', profileHash);

    if (!profile?.id) {
      conditionalLog('🔍 Pas de profil - rôle client par défaut', {});
      const result = ['client'] as UserRole[];
      lastRolesHashRef.current = profileHash;
      profileDataRef.current = result;
      return result;
    }

    const detectedRoles = new Set<UserRole>();

    // Méthode principale : roles array
    if (profile.roles && Array.isArray(profile.roles)) {
      profile.roles.forEach((role: string) => {
        if (role === 'client' || role === 'fourmiz') {
          detectedRoles.add(role as UserRole);
        }
      });
    }

    // Par défaut client si aucun rôle détecté
    if (detectedRoles.size === 0) {
      detectedRoles.add('client');
    }
    
    // Inférence fourmiz basée sur les données du profil
    if (profile.criteria_completed !== undefined ||
        profile.id_document_path) {
      detectedRoles.add('fourmiz');
    }

    const result = Array.from(detectedRoles);
    
    // Mise à jour du cache seulement si différent
    const resultHash = JSON.stringify(result);
    if (resultHash !== JSON.stringify(profileDataRef.current)) {
      conditionalLog('🎯 Rôles calculés (nouveaux):', result);
      lastRolesHashRef.current = profileHash;
      profileDataRef.current = result;
    }
    
    return result;
  }, [profileHash, profile?.id, profile?.roles, profile?.criteria_completed, profile?.id_document_path, conditionalLog]);

  // 🚀 OPTIMISATION : Profil utilisateur mémorisé avec dépendances stables
  const userProfile = useMemo(() => {
    return {
      id: profile?.id || profile?.user_id || null,
      email: profile?.email || null,
      firstname: profile?.firstname || null,
      lastname: profile?.lastname || null,
      role: currentRole,
      roles: currentRoles,
      is_fourmiz_enabled: currentRoles.includes('fourmiz'),
      is_client_enabled: currentRoles.includes('client'),
      profile_completed: profile?.profile_completed ?? true,
      criteria_completed: profile?.criteria_completed ?? false,
      has_bank_info: false, // 🧹 NETTOYÉ: rib supprimé, toujours false
      has_identity_document: profile?.id_document_path ? true : false,
      phone: profile?.phone || null,
      address: profile?.address || null,
      specialties: profile?.specialties || null,
      years_experience: profile?.years_experience || null,
      certifications: profile?.certifications || null,
    };
  }, [
    profile?.id, 
    profile?.user_id, 
    profile?.email, 
    profile?.firstname, 
    profile?.lastname,
    profile?.profile_completed,
    profile?.criteria_completed,
    profile?.id_document_path,
    profile?.phone,
    profile?.address,
    profile?.specialties,
    profile?.years_experience,
    profile?.certifications,
    currentRole,
    currentRoles
  ]);

  // 🚀 OPTIMISATION : Fonctions avec useCallback stable
  const determineUpgradeEligibility = useCallback(() => {
    try {
      if (currentRoles.includes('client') && currentRoles.includes('fourmiz')) {
        return { canRequest: false, targetRole: null, reason: 'has_all_roles' };
      }

      if (roleUpgradeRequest?.status === 'pending' || roleUpgradeRequest?.status === 'processing') {
        return { canRequest: false, targetRole: null, reason: 'request_pending' };
      }

      const missingRole: UserRole | null = 
        !currentRoles.includes('client') ? 'client' :
        !currentRoles.includes('fourmiz') ? 'fourmiz' : null;

      return missingRole ? { canRequest: true, targetRole: missingRole, reason: 'eligible' } : { canRequest: false, targetRole: null, reason: 'no_missing_role' };
    } catch (error) {
      console.error('❌ Erreur eligibility:', error);
      return { canRequest: false, targetRole: null, reason: 'error' };
    }
  }, [currentRoles, roleUpgradeRequest]);

  const checkProfileCompletion = useCallback((targetRole: UserRole): ProfileCompletionCheck => {
    try {
      const requiredFields = {
        client: ['firstname', 'lastname', 'email'],
        fourmiz: ['firstname', 'lastname', 'email', 'phone', 'address', 'has_identity_document']
      };

      const required = requiredFields[targetRole] || [];
      const missing: string[] = [];

      required.forEach(field => {
        const value = userProfile[field as keyof typeof userProfile];
        if (!value || (typeof value === 'boolean' && !value)) {
          missing.push(field);
        }
      });

      return {
        isComplete: missing.length === 0,
        missingFields: missing,
        completionPercentage: Math.round(((required.length - missing.length) / required.length) * 100)
      };
    } catch (error) {
      console.error('❌ Erreur completion check:', error);
      return { isComplete: false, missingFields: [], completionPercentage: 0 };
    }
  }, [userProfile]);

  const switchRole = useCallback(async (newRole: UserRole): Promise<{ success: boolean; needsCompletion?: boolean; missingFields?: string[] }> => {
    if (!isMountedRef.current) return { success: false };

    try {
      setLastError(null);

      if (!newRole || !['client', 'fourmiz'].includes(newRole)) {
        return { success: false };
      }

      if (isLoadingRoleSwitch || !currentRoles.includes(newRole) || currentRole === newRole) {
        return currentRole === newRole ? { success: true } : { success: false };
      }

      setIsLoadingRoleSwitch(true);
      
      // Nettoyer le timeout précédent
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current);
      }
      
      const completionCheck = checkProfileCompletion(newRole);
      
      if (!completionCheck.isComplete && newRole === 'fourmiz') {
        if (isMountedRef.current) {
          setIsLoadingRoleSwitch(false);
        }
        return { success: false, needsCompletion: true, missingFields: completionCheck.missingFields };
      }

      // Délai de sécurité
      await new Promise(resolve => {
        switchTimeoutRef.current = setTimeout(resolve, 500);
      });
      
      if (!isMountedRef.current) return { success: false };

      setCurrentRole(newRole);
      
      try {
        await AsyncStorage.setItem(ROLE_STORAGE_KEY, newRole);
      } catch (e) {
        console.warn('Erreur sauvegarde:', e);
      }

      if (isMountedRef.current) {
        setIsLoadingRoleSwitch(false);
      }
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur switch:', error);
      if (isMountedRef.current) {
        setLastError('Erreur lors du changement de rôle');
        setIsLoadingRoleSwitch(false);
      }
      return { success: false };
    }
  }, [currentRoles, currentRole, isLoadingRoleSwitch, checkProfileCompletion]);

  const requestRoleUpgrade = useCallback(async (targetRole: UserRole) => {
    if (!isMountedRef.current) return { success: false, message: 'Component unmounted' };
    
    // Fonctionnalité non implémentée mais structure préservée
    return { success: false, message: 'Feature not implemented' };
  }, []);

  // 🚀 OPTIMISATION : Initialisation avec protection renforcée
  useEffect(() => {
    if (!isMountedRef.current) return;

    // Protection contre réinitialisations trop fréquentes (renforcée)
    const now = Date.now();
    const timeSinceLastInit = now - lastInitializationTime.current;
    
    if (isInitializing.current) {
      return;
    }

    // Protection plus stricte : 5 secondes au lieu de 2
    if (isInitialized && currentRole && timeSinceLastInit < 5000) {
      return;
    }

    // Détecter changement d'utilisateur
    if (profile?.id && lastProfileId.current && lastProfileId.current !== profile.id) {
      console.log('🔄 Changement utilisateur détecté:', {
        old: lastProfileId.current,
        new: profile.id,
        action: 'Réinitialisation'
      });
      
      // Nettoyer les caches corrompus
      clearRoleRelatedCaches(profile.id);
      
      if (isMountedRef.current) {
        setCurrentRole(null);
        setIsInitialized(false);
        lastRolesHashRef.current = '';
        profileDataRef.current = null;
      }
    }

    if (!profile?.id || currentRoles.length === 0) {
      return;
    }

    if (isInitialized && currentRole) {
      return;
    }

    console.log('🚀 Initialisation du hook');
    isInitializing.current = true;
    lastInitializationTime.current = now;

    const initializeRole = async () => {
      try {
        if (!isMountedRef.current) return;

        // 🔧 CORRECTION FOURMIZ : Prioriser Fourmiz si le profil l'indique clairement
        let preferredRole: UserRole = 'client';
        
        // Vérifier si c'est vraiment un profil Fourmiz
        const isClearlyFourmiz = (
          currentRoles.includes('fourmiz') && (
            profile.id_document_path || 
            profile.criteria_completed === true ||
            profile.address ||
            profile.service_radius_km > 0
          )
        );
        
        if (isClearlyFourmiz) {
          preferredRole = 'fourmiz';
          console.log('🎯 Profil Fourmiz détecté, priorité Fourmiz');
        } else if (currentRoles.includes('fourmiz')) {
          preferredRole = 'fourmiz';
          console.log('🎯 Rôle Fourmiz disponible, sélection par défaut');
        }
        
        // Essayer de récupérer préférence sauvée SEULEMENT si pas de création récente
        let finalRole = preferredRole;
        const isRecentCreation = profile.created_at && 
          (Date.now() - new Date(profile.created_at).getTime()) < 300000; // 5 minutes
          
        if (!isRecentCreation) {
          try {
            const saved = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
            if (saved && currentRoles.includes(saved as UserRole)) {
              finalRole = saved as UserRole;
              console.log('🎯 Préférence sauvée utilisée:', saved);
            }
          } catch (e) {
            // Ignorer
          }
        } else {
          console.log('🎯 Création récente détectée, pas de préférence sauvée utilisée');
        }

        console.log('🎯 Initialisation avec rôle:', finalRole);

        if (isMountedRef.current) {
          setCurrentRole(finalRole);
          setIsInitialized(true);
          lastProfileId.current = profile.id;
        }

        console.log('✅ Initialisation terminée');

      } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        if (isMountedRef.current) {
          setCurrentRole('client');
          setIsInitialized(true);
          lastProfileId.current = profile.id;
        }
      } finally {
        isInitializing.current = false;
      }
    };

    initializeRole();
  }, [profile?.id, currentRoles, isInitialized, currentRole, clearRoleRelatedCaches]);

  // 🚀 OPTIMISATION : Timeout de sécurité avec nettoyage
  useEffect(() => {
    if (isInitialized || !isMountedRef.current) return;

    initTimeoutRef.current = setTimeout(() => {
      if (!isInitialized && !isInitializing.current && isMountedRef.current) {
        console.log('⏰ Timeout sécurité - initialisation forcée');
        setCurrentRole('client');
        setIsInitialized(true);
        if (profile?.id) {
          lastProfileId.current = profile.id;
        }
      }
    }, 3000);

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [isInitialized, profile?.id]);

  // 🚀 OPTIMISATION : États calculés mémorisés
  const upgradeEligibility = useMemo(() => determineUpgradeEligibility(), [determineUpgradeEligibility]);
  const availableRoles = currentRoles;
  const canSwitchRole = useMemo(() => 
    currentRoles.length > 1 && !isLoadingRoleSwitch && isInitialized
  , [currentRoles.length, isLoadingRoleSwitch, isInitialized]);

  // 🚀 OPTIMISATION : État final mémorisé
  const finalState = useMemo(() => {
    conditionalLog('🔍 État final simplifié:', {
      isInitialized,
      currentRole,
      availableRoles,
      profileId: profile?.id,
      hasFourmizRole: currentRoles.includes('fourmiz'),
      hasClientRole: currentRoles.includes('client')
    });

    return {
      isInitialized,
      currentRole,
      availableRoles,
      hasFourmizRole: currentRoles.includes('fourmiz'),
      hasClientRole: currentRoles.includes('client'),
      canSwitchRole
    };
  }, [isInitialized, currentRole, availableRoles, profile?.id, currentRoles, canSwitchRole, conditionalLog]);

  // 🔧 CORRECTION : Nettoyage complet au démontage
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Nettoyer tous les timers
      if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
      if (upgradeTimeoutRef.current) clearTimeout(upgradeTimeoutRef.current);
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      
      // Nettoyer les refs
      isInitializing.current = false;
    };
  }, []);

  // 🚀 OPTIMISATION : Retour conditionnel mémorisé
  const loadingState = useMemo(() => ({
    currentRole: null,
    loading: true,
    switchingRole: false,
    hasClientRole: false,
    hasFourmizRole: false,
    canSwitchRole: false,
    userProfile: null,
    availableRoles: [],
    isInitialized: false,
    switchRole: async () => ({ success: false }),
    requestRoleUpgrade: async () => ({ success: false, message: 'Initializing' }),
    clearError,
    refreshProfile,
    reloadProfile
  }), [clearError, refreshProfile, reloadProfile]);

  const completeState = useMemo(() => ({
    // États principaux
    currentRole: finalState.currentRole,
    hasClientRole: finalState.hasClientRole,
    hasFourmizRole: finalState.hasFourmizRole,
    canSwitchRole: finalState.canSwitchRole,
    loading: isLoadingRoleSwitch || isLoadingUpgradeRequest || !finalState.isInitialized,
    
    // États de loading
    switchingRole: isLoadingRoleSwitch,
    isLoadingUpgradeRequest: isLoadingUpgradeRequest,
    isInitialized: finalState.isInitialized,
    
    // Profil utilisateur
    userProfile: userProfile,
    
    // États compatibles (TOUS CONSERVÉS)
    analysisExists: true,
    canRequestOtherRole: upgradeEligibility.canRequest ? upgradeEligibility.targetRole : null,
    profileId: userProfile.id,
    profileRoles: finalState.availableRoles,
    roleLoading: isLoadingRoleSwitch,
    safeCanBecomeClient: !finalState.hasClientRole,
    safeCanBecomeFourmiz: !finalState.hasFourmizRole,
    safeHasClientRole: finalState.hasClientRole,
    safeHasFourmizRole: finalState.hasFourmizRole,
    selectedRole: finalState.currentRole,
    
    // États supplémentaires
    availableRoles: finalState.availableRoles,
    canBecomeClient: !finalState.hasClientRole && !isLoadingUpgradeRequest,
    canBecomeFourmiz: !finalState.hasFourmizRole && !isLoadingUpgradeRequest,
    
    // États d'upgrade
    roleUpgradeRequest: roleUpgradeRequest,
    upgradeEligibility: upgradeEligibility,
    lastError: lastError,
    
    // Actions
    switchRole: switchRole,
    requestRoleUpgrade: requestRoleUpgrade,
    
    // Helpers
    isProfileCompleteForRole: checkProfileCompletion,
    getMissingFieldsForRole: (role: UserRole) => checkProfileCompletion(role).missingFields,
    
    // Actions de nettoyage (🔧 CORRECTION: références stables)
    clearError,
    refreshProfile,
    reloadProfile
  }), [
    finalState, 
    isLoadingRoleSwitch, 
    isLoadingUpgradeRequest, 
    userProfile, 
    upgradeEligibility, 
    roleUpgradeRequest, 
    lastError, 
    switchRole, 
    requestRoleUpgrade, 
    checkProfileCompletion,
    clearError,
    refreshProfile,
    reloadProfile
  ]);

  // Retour pendant initialisation
  if (!finalState.isInitialized) {
    return loadingState;
  }

  // Retour complet
  return completeState;
}

export default useRoleManagerAdapter;
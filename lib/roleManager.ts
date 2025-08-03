// lib/roleManager.ts - VERSION ULTRA-PROTÉGÉE COMPLÈTE
// 🎯 Client peut devenir Fourmiz (et rester Client)
// 🎯 Fourmiz peut devenir Client (et rester Fourmiz)
// 🔧 CORRIGÉ : Utilisation de 'id' au lieu de 'user_id' pour la cohérence avec index.tsx
// 🛡️ ULTRA-PROTÉGÉ : Protection maximale contre les erreurs .includes()

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export type UserRole = 'client' | 'fourmiz';

export interface UserProfile {
  id: string;  // 🔧 CHANGÉ : de 'user_id' à 'id' pour la cohérence
  roles: UserRole[];
  firstname?: string;
  lastname?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  rib?: string;
  id_document_path?: string;
  profile_completed: boolean;
}

export interface ProfileAnalysis {
  currentRoles: UserRole[];
  hasClientRole: boolean;
  hasFourmizRole: boolean;
  hasBasicInfo: boolean;
  hasFourmizInfo: boolean;
  profileExists: boolean;
  profileCompleted: boolean;
  
  // Statuts pour ajout de rôles
  canAddClient: boolean;      // Peut ajouter le rôle client
  canAddFourmiz: boolean;     // Peut ajouter le rôle fourmiz
  needsClientInfo: boolean;   // Infos supplémentaires pour client
  needsFourmizInfo: boolean;  // Infos supplémentaires pour fourmiz
}

// 🔍 ANALYSE COMPLÈTE DU PROFIL UTILISATEUR - VERSION ULTRA-PROTÉGÉE
export async function analyzeUserProfile(userId: string): Promise<ProfileAnalysis> {
  console.log('🔍 Analyse profil utilisateur:', userId);
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        roles,
        firstname,
        lastname,
        phone,
        address,
        postal_code,
        city,
        rib,
        id_document_path,
        profile_completed
      `)
      .eq('id', userId)
      .single();

    // 🚨 DEBUG TEMPORAIRE - AVANT toute manipulation
    console.log('🔍 DEBUG - Données brutes de Supabase:', {
      profile,
      error,
      'profile?.roles': profile?.roles,
      'typeof profile?.roles': typeof profile?.roles
    });

    // Gérer le cas où le profil n'existe pas encore
    const profileExists = !error || error.code !== 'PGRST116';
    
    // 🛡️ PROTECTION ULTRA-RENFORCÉE pour les rôles
    let safeCurrentRoles: UserRole[] = [];
    
    try {
      const rawRoles = profile?.roles;
      console.log('🔍 Raw roles:', rawRoles, 'Type:', typeof rawRoles);
      
      if (Array.isArray(rawRoles)) {
        // C'est déjà un array, filtrer pour garder seulement les rôles valides
        safeCurrentRoles = rawRoles.filter(role => 
          typeof role === 'string' && ['client', 'fourmiz'].includes(role)
        );
        console.log('✅ Rôles array traités:', safeCurrentRoles);
      } else if (typeof rawRoles === 'string' && ['client', 'fourmiz'].includes(rawRoles)) {
        // C'est un string valide, le convertir en array
        safeCurrentRoles = [rawRoles as UserRole];
        console.log('✅ Rôle string converti:', safeCurrentRoles);
      } else if (rawRoles === null || rawRoles === undefined) {
        // Pas de rôles définis, array vide
        safeCurrentRoles = [];
        console.log('ℹ️ Pas de rôles définis, array vide');
      } else {
        // Format inattendu, logger et utiliser array vide
        console.warn('⚠️ Format de rôles inattendu:', rawRoles, 'Type:', typeof rawRoles);
        safeCurrentRoles = [];
      }
    } catch (rolesError) {
      console.error('❌ Erreur traitement rôles:', rolesError);
      safeCurrentRoles = [];
    }
    
    console.log('📊 Profil trouvé:', profileExists, 'Rôles sécurisés final:', safeCurrentRoles);

    // 🚨 VÉRIFICATION FINALE avant .includes()
    if (!Array.isArray(safeCurrentRoles)) {
      console.error('🚨 ERREUR CRITIQUE: safeCurrentRoles n\'est pas un array:', safeCurrentRoles);
      safeCurrentRoles = [];
    }

    // Analyser les rôles actuels - MAINTENANT 100% SÛR
    const hasClientRole = safeCurrentRoles.includes('client');
    const hasFourmizRole = safeCurrentRoles.includes('fourmiz');

    console.log('🔍 DEBUG - Résultats includes():', {
      hasClientRole,
      hasFourmizRole,
      safeCurrentRoles
    });

    // Analyser les informations disponibles
    const hasBasicInfo = !!(
      profile?.firstname &&
      profile?.lastname &&
      profile?.phone &&
      profile?.address &&
      profile?.postal_code &&
      profile?.city
    );

    const hasFourmizInfo = !!(
      profile?.rib &&
      profile?.id_document_path
    );

    // Déterminer les possibilités d'ajout de rôles
    const analysis: ProfileAnalysis = {
      currentRoles: safeCurrentRoles,
      hasClientRole,
      hasFourmizRole,
      hasBasicInfo,
      hasFourmizInfo,
      profileExists,
      profileCompleted: profile?.profile_completed || false,
      
      // Logique d'ajout de rôles
      canAddClient: !hasClientRole,
      canAddFourmiz: !hasFourmizRole,
      
      // Infos nécessaires selon le rôle ciblé
      needsClientInfo: !hasBasicInfo,
      needsFourmizInfo: !hasBasicInfo || !hasFourmizInfo
    };

    console.log('📋 Analyse complète:', analysis);
    return analysis;

  } catch (error) {
    console.error('❌ Erreur analyse profil:', error);
    throw error;
  }
}

// ➕ AJOUT COMPLÉMENTAIRE D'UN RÔLE (SANS ÉCRASER LES EXISTANTS)
export async function addComplementaryRole(
  userId: string,
  newRole: UserRole,
  additionalProfileData?: Partial<UserProfile>
): Promise<{ success: boolean; message: string }> {
  console.log(`➕ Ajout rôle complémentaire ${newRole} pour:`, userId);

  try {
    // 1. Analyser le profil actuel
    const analysis = await analyzeUserProfile(userId);
    
    // 2. Vérifier si l'ajout est nécessaire
    if (newRole === 'client' && analysis.hasClientRole) {
      return { 
        success: true, 
        message: 'L\'utilisateur a déjà le rôle Client' 
      };
    }
    
    if (newRole === 'fourmiz' && analysis.hasFourmizRole) {
      return { 
        success: true, 
        message: 'L\'utilisateur a déjà le rôle Fourmiz' 
      };
    }

    // 3. Construire la nouvelle liste de rôles (ADDITION, pas substitution)
    const newRoles = [...analysis.currentRoles, newRole];
    
    console.log('🔄 Addition de rôle:', {
      avant: analysis.currentRoles,
      ajout: newRole,
      après: newRoles
    });

    // 4. Préparer les données de mise à jour
    const updateData = {
      roles: newRoles,
      profile_completed: true, // Marquer comme complet lors de l'ajout
      updated_at: new Date().toISOString(),
      ...additionalProfileData
    };

    // 5. Upsert le profil (insert si n'existe pas, update sinon)
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,  // 🔧 CHANGÉ : de 'user_id' à 'id'
        ...updateData
      }, {
        onConflict: 'id',  // 🔧 CHANGÉ : de 'user_id' à 'id'
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('❌ Erreur ajout rôle complémentaire:', upsertError);
      throw upsertError;
    }

    console.log(`✅ Rôle ${newRole} ajouté avec succès !`);
    console.log('📊 Nouveaux rôles utilisateur:', newRoles);

    return {
      success: true,
      message: `Rôle ${newRole} ajouté avec succès`
    };

  } catch (error) {
    console.error('💥 Erreur critique ajout rôle complémentaire:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

// 🎯 DÉTERMINANT LA ROUTE SUIVANTE SELON L'ANALYSE
export function determineNextRoute(
  analysis: ProfileAnalysis, 
  targetRole: UserRole
): { route: string; reason: string } {
  console.log('🎯 Détermination route suivante:', { analysis, targetRole });

  // CAS 1: L'utilisateur a déjà le rôle demandé
  if (targetRole === 'client' && analysis.hasClientRole) {
    return {
      route: '/(tabs)',
      reason: 'Utilisateur a déjà le rôle Client'
    };
  }

  if (targetRole === 'fourmiz' && analysis.hasFourmizRole) {
    return {
      route: '/(tabs)',
      reason: 'Utilisateur a déjà le rôle Fourmiz'
    };
  }

  // CAS 2: Ajout Client à un Fourmiz existant
  if (targetRole === 'client' && analysis.hasFourmizRole) {
    if (!analysis.needsClientInfo) {
      // Fourmiz a déjà toutes les infos pour être Client → Upgrade instantané
      return {
        route: '/auth/complete-profile-client',
        reason: 'Fourmiz peut devenir Client instantanément'
      };
    } else {
      // Fourmiz manque d'infos de base → Complétion nécessaire
      return {
        route: '/auth/complete-profile?roles=client',
        reason: 'Fourmiz doit compléter ses infos pour devenir Client'
      };
    }
  }

  // CAS 3: Ajout Fourmiz à un Client existant
  if (targetRole === 'fourmiz' && analysis.hasClientRole) {
    if (!analysis.needsFourmizInfo) {
      // Client a déjà toutes les infos pour être Fourmiz → Upgrade instantané
      return {
        route: '/auth/complete-profile-fourmiz',
        reason: 'Client peut devenir Fourmiz instantanément'
      };
    } else {
      // Client manque d'infos spécifiques Fourmiz → Complétion nécessaire
      return {
        route: '/auth/complete-profile-fourmiz',
        reason: 'Client doit ajouter infos Fourmiz (RIB + ID)'
      };
    }
  }

  // CAS 4: Premier rôle (pas de profil existant)
  if (!analysis.profileExists || analysis.currentRoles.length === 0) {
    return {
      route: `/auth/complete-profile?roles=${targetRole}`,
      reason: 'Premier profil à créer'
    };
  }

  // CAS 5: Fallback - complétion complète
  return {
    route: `/auth/complete-profile?roles=${targetRole}`,
    reason: 'Complétion complète nécessaire'
  };
}

// 🛡️ MIDDLEWARE ANTI-BOUCLE POUR NAVIGATION
export async function safeNavigateToRole(
  userId: string,
  targetRole: UserRole
): Promise<{ route: string; shouldRedirect: boolean; message: string }> {
  console.log('🛡️ Navigation sécurisée vers rôle:', targetRole);

  try {
    // 1. Analyser le profil utilisateur
    const analysis = await analyzeUserProfile(userId);
    
    // 2. Détecter les cas de boucle potentielle
    if (analysis.profileCompleted && analysis.currentRoles.length === 0) {
      console.warn('⚠️ ANOMALIE: Profil marqué complet mais sans rôles');
      
      // Auto-correction: réinitialiser profile_completed
      await supabase
        .from('profiles')
        .update({ 
          profile_completed: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);  // 🔧 CHANGÉ : de 'user_id' à 'id'
        
      console.log('🔧 Auto-correction: profile_completed réinitialisé');
    }

    // 3. Déterminer la route appropriée
    const { route, reason } = determineNextRoute(analysis, targetRole);
    
    // 4. Décider s'il faut rediriger
    const shouldRedirect = route !== '/(tabs)' || (
      route === '/(tabs)' && !analysis.currentRoles.includes(targetRole)
    );

    console.log('✅ Navigation déterminée:', { route, shouldRedirect, reason });

    return {
      route,
      shouldRedirect,
      message: reason
    };

  } catch (error) {
    console.error('❌ Erreur navigation sécurisée:', error);
    
    // Fallback sécurisé
    return {
      route: '/auth/signin',
      shouldRedirect: true,
      message: 'Erreur - redirection vers connexion'
    };
  }
}

// 🧪 DIAGNOSTIC SPÉCIFIQUE BOUCLE CLIENT ↔ FOURMIZ
export async function diagnoseRoleLoop(userId: string): Promise<void> {
  console.log('🧪 === DIAGNOSTIC BOUCLE RÔLES ===');
  
  try {
    const analysis = await analyzeUserProfile(userId);
    
    console.log('📊 ÉTAT ACTUEL:');
    console.log('- Profil existe:', analysis.profileExists ? '✅' : '❌');
    console.log('- Rôles actuels:', analysis.currentRoles);
    console.log('- Client:', analysis.hasClientRole ? '✅' : '❌');
    console.log('- Fourmiz:', analysis.hasFourmizRole ? '✅' : '❌');
    console.log('- Profil complet:', analysis.profileCompleted ? '✅' : '❌');
    console.log('- Infos de base:', analysis.hasBasicInfo ? '✅' : '❌');
    console.log('- Infos Fourmiz:', analysis.hasFourmizInfo ? '✅' : '❌');

    // Tests anti-boucle
    const loopTests = {
      'Profil complet sans rôles': analysis.profileCompleted && analysis.currentRoles.length === 0,
      'Rôles multiples incohérents': analysis.currentRoles.length > 2,
      'Profile_completed incohérent': analysis.profileCompleted && (analysis.needsClientInfo || analysis.needsFourmizInfo),
      'Rôles dupliqués': analysis.currentRoles.length !== new Set(analysis.currentRoles).size
    };

    console.log('🚨 TESTS ANTI-BOUCLE:');
    let hasIssues = false;
    Object.entries(loopTests).forEach(([test, hasIssue]) => {
      const status = hasIssue ? '⚠️ PROBLÈME' : '✅ OK';
      console.log(`- ${test}: ${status}`);
      if (hasIssue) hasIssues = true;
    });

    if (!hasIssues) {
      console.log('✅ Aucune anomalie détectée dans les rôles');
    }

    // Simulation de navigation pour détecter boucles
    console.log('🎯 SIMULATION NAVIGATION:');
    const clientRoute = determineNextRoute(analysis, 'client');
    const fourmizRoute = determineNextRoute(analysis, 'fourmiz');
    
    console.log('- Client →', clientRoute.route, '(' + clientRoute.reason + ')');
    console.log('- Fourmiz →', fourmizRoute.route, '(' + fourmizRoute.reason + ')');

  } catch (error) {
    console.error('❌ Erreur diagnostic boucle rôles:', error);
  }
  
  console.log('🏁 === FIN DIAGNOSTIC BOUCLE RÔLES ===');
}

// 🔧 RÉPARATION AUTOMATIQUE DES BOUCLES DE RÔLES
export async function fixRoleLoop(userId: string): Promise<boolean> {
  console.log('🔧 Tentative réparation boucle rôles pour:', userId);
  
  try {
    const analysis = await analyzeUserProfile(userId);
    let fixed = false;

    // Réparation 1: Profil complet sans rôles
    if (analysis.profileCompleted && analysis.currentRoles.length === 0) {
      console.log('🔧 Réparation: Profil complet sans rôles');
      
      await supabase
        .from('profiles')
        .update({ 
          profile_completed: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);  // 🔧 CHANGÉ : de 'user_id' à 'id'
      
      fixed = true;
      console.log('✅ Profile_completed réinitialisé');
    }

    // Réparation 2: Rôles dupliqués
    const uniqueRoles = [...new Set(analysis.currentRoles)];
    if (uniqueRoles.length !== analysis.currentRoles.length) {
      console.log('🔧 Réparation: Suppression rôles dupliqués');
      
      await supabase
        .from('profiles')
        .update({ 
          roles: uniqueRoles,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);  // 🔧 CHANGÉ : de 'user_id' à 'id'
      
      fixed = true;
      console.log('✅ Rôles dupliqués supprimés');
    }

    // Réparation 3: Rôles invalides
    const validRoles = uniqueRoles.filter(role => ['client', 'fourmiz'].includes(role));
    if (validRoles.length !== uniqueRoles.length) {
      console.log('🔧 Réparation: Suppression rôles invalides');
      
      await supabase
        .from('profiles')
        .update({ 
          roles: validRoles,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);  // 🔧 CHANGÉ : de 'user_id' à 'id'
      
      fixed = true;
      console.log('✅ Rôles invalides supprimés');
    }

    if (fixed) {
      console.log('✅ Réparations automatiques appliquées');
    } else {
      console.log('ℹ️ Aucune réparation automatique nécessaire');
    }

    return fixed;

  } catch (error) {
    console.error('❌ Erreur réparation boucle rôles:', error);
    return false;
  }
}

// 🪝 HOOK REACT POUR GÉRER LES RÔLES UTILISATEUR - VERSION ULTRA-PROTÉGÉE
export function useRoleManager() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔄 Recharger l'analyse du profil
  const refreshProfile = useCallback(async (userId: string) => {
    if (!userId) {
      setUserProfile(null);
      setAnalysis(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 refreshProfile appelé avec userId:', userId);

      // Analyser le profil utilisateur
      const profileAnalysis = await analyzeUserProfile(userId);
      setAnalysis(profileAnalysis);

      // Récupérer le profil complet si il existe
      if (profileAnalysis.profileExists) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)  // 🔧 CHANGÉ : de 'user_id' à 'id'
          .single();

        if (profileError) {
          console.warn('⚠️ Erreur récupération profil:', profileError);
          setUserProfile(null);
        } else {
          setUserProfile(profile);
          console.log('✅ Profil utilisateur récupéré:', profile);
        }
      } else {
        setUserProfile(null);
        console.log('ℹ️ Profil utilisateur n\'existe pas encore');
      }

    } catch (err) {
      console.error('❌ Erreur refresh profil:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setAnalysis(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ➕ Ajouter un rôle complémentaire
  const addRole = useCallback(async (
    userId: string, 
    newRole: UserRole, 
    additionalData?: Partial<UserProfile>
  ) => {
    try {
      setLoading(true);
      const result = await addComplementaryRole(userId, newRole, additionalData);
      
      if (result.success) {
        // Recharger le profil après ajout
        await refreshProfile(userId);
      }
      
      return result;
    } catch (err) {
      console.error('❌ Erreur ajout rôle:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Erreur inconnue'
      };
    } finally {
      setLoading(false);
    }
  }, [refreshProfile]);

  // 🎯 Navigation sécurisée vers un rôle
  const navigateToRole = useCallback(async (userId: string, targetRole: UserRole) => {
    try {
      return await safeNavigateToRole(userId, targetRole);
    } catch (err) {
      console.error('❌ Erreur navigation rôle:', err);
      return {
        route: '/auth/signin',
        shouldRedirect: true,
        message: 'Erreur navigation'
      };
    }
  }, []);

  // 🧪 Diagnostiquer les boucles de rôles
  const diagnose = useCallback(async (userId: string) => {
    try {
      await diagnoseRoleLoop(userId);
    } catch (err) {
      console.error('❌ Erreur diagnostic:', err);
    }
  }, []);

  // 🔧 Réparer les boucles automatiquement
  const fixLoops = useCallback(async (userId: string) => {
    try {
      const fixed = await fixRoleLoop(userId);
      if (fixed) {
        // Recharger après réparation
        await refreshProfile(userId);
      }
      return fixed;
    } catch (err) {
      console.error('❌ Erreur réparation:', err);
      return false;
    }
  }, [refreshProfile]);

  // ✅ VARIABLES SÉCURISÉES pour éviter les erreurs undefined - ULTRA-PROTÉGÉES
  const currentRoles = (analysis?.currentRoles && Array.isArray(analysis.currentRoles)) ? analysis.currentRoles : [];
  const hasClientRole = analysis?.hasClientRole === true;
  const hasFourmizRole = analysis?.hasFourmizRole === true;
  const profileExists = analysis?.profileExists === true;
  const profileCompleted = analysis?.profileCompleted === true;
  const canAddClient = analysis?.canAddClient === true;
  const canAddFourmiz = analysis?.canAddFourmiz === true;
  const needsClientInfo = analysis?.needsClientInfo === true;
  const needsFourmizInfo = analysis?.needsFourmizInfo === true;

  // ✅ FONCTION hasRole ULTRA-SÉCURISÉE
  const hasRole = useCallback((role: UserRole): boolean => {
    try {
      // Triple vérification pour éviter les erreurs
      if (!analysis || !analysis.currentRoles || !Array.isArray(analysis.currentRoles)) {
        console.log('⚠️ hasRole: Pas de rôles disponibles:', { analysis, currentRoles: analysis?.currentRoles });
        return false;
      }
      
      const result = analysis.currentRoles.includes(role);
      console.log(`🔍 hasRole(${role}):`, result, 'dans', analysis.currentRoles);
      return result;
    } catch (error) {
      console.error('❌ Erreur dans hasRole:', error);
      return false;
    }
  }, [analysis]);

  // ✅ FONCTION canAddRole ULTRA-SÉCURISÉE
  const canAddRole = useCallback((role: UserRole): boolean => {
    try {
      if (!analysis) return false;
      
      if (role === 'client') {
        return analysis.canAddClient === true;
      }
      if (role === 'fourmiz') {
        return analysis.canAddFourmiz === true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur dans canAddRole:', error);
      return false;
    }
  }, [analysis]);

  return {
    // 📊 États
    userProfile,
    analysis,
    loading,
    error,
    
    // 🔍 Helpers basés sur l'analyse (valeurs ultra-sécurisées)
    currentRoles,
    hasClientRole,
    hasFourmizRole,
    profileExists,
    profileCompleted,
    
    // ✅ Raccourcis pour vérifications (valeurs ultra-sécurisées)
    isClient: hasClientRole,
    isFourmiz: hasFourmizRole,
    canBecomeClient: canAddClient,
    canBecomeFourmiz: canAddFourmiz,
    needsMoreInfo: needsClientInfo || needsFourmizInfo,
    
    // 🎬 Actions
    refreshProfile,
    addRole,
    navigateToRole,
    diagnose,
    fixLoops,
    
    // 🔧 Utilitaires ultra-sécurisés
    hasRole,
    canAddRole,
  };
}
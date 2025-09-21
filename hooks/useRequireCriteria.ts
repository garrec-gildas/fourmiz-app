// hooks/useRequireCriteria.ts - VERSION DEBUG POUR DIAGNOSTIQUER LE PROBLÈME
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { supabase, getCurrentUser } from '../lib/supabase';
import { Alert } from 'react-native';

interface CriteriaStatus {
  isLoading: boolean;
  criteriaCompleted: boolean;
  isFourmiz: boolean;
  canAccess: boolean;
  userId: string | null;
}

export const useRequireCriteria = () => {
  const router = useRouter();
  const [status, setStatus] = useState<CriteriaStatus>({
    isLoading: true,
    criteriaCompleted: false,
    isFourmiz: false,
    canAccess: false,
    userId: null
  });

  // Référence pour éviter les appels multiples
  const hasChecked = useRef(false);

  const checkCriteriaStatus = useCallback(async () => {
    if (hasChecked.current) {
      console.log('🔄 [useRequireCriteria] Vérification déjà en cours, skip...');
      return;
    }
    
    hasChecked.current = true;
    
    try {
      console.log('🔍 [useRequireCriteria] Début checkCriteriaStatus...');
      
      const user = await getCurrentUser();
      console.log('🔍 [useRequireCriteria] Résultat getCurrentUser:', user ? `${user.email} (${user.id})` : 'null');
      
      if (!user) {
        console.log('❌ [useRequireCriteria] Pas d\'utilisateur, redirection signin');
        router.replace('/auth/signin');
        return;
      }

      console.log('🔍 [useRequireCriteria] Requête profil Supabase pour user:', user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('roles, criteria_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('🔍 [useRequireCriteria] Résultat requête profil:', {
        data: profile,
        error: error,
        errorCode: error?.code
      });

      if (error) {
        console.error('❌ [useRequireCriteria] Erreur Supabase profile:', error);
        throw error;
      }

      if (!profile) {
        console.log('⚠️ [useRequireCriteria] Aucun profil trouvé - utilisateur probablement client');
        const fallbackStatus = {
          isLoading: false,
          criteriaCompleted: false,
          isFourmiz: false,
          canAccess: true,
          userId: user.id
        };
        console.log('✅ [useRequireCriteria] Statut fallback pour utilisateur sans profil:', fallbackStatus);
        setStatus(fallbackStatus);
        return;
      }

      const isFourmiz = profile.roles?.includes('fourmiz') || false;
      const criteriaCompleted = profile.criteria_completed || false;
      
      console.log('🔍 [useRequireCriteria] Analyse profil DÉTAILLÉE:', {
        roles: profile.roles,
        isFourmiz,
        criteriaCompleted,
        criteria_completed_raw: profile.criteria_completed,
        criteria_completed_type: typeof profile.criteria_completed,
        criteria_completed_strict: profile.criteria_completed === true
      });

      const canAccess = !isFourmiz || criteriaCompleted;

      const newStatus = {
        isLoading: false,
        criteriaCompleted,
        isFourmiz,
        canAccess,
        userId: user.id
      };

      // 🚨 DEBUG CRITIQUE: Vérification avant setState
      console.log('🚨 [useRequireCriteria] AVANT setState - Comparaison:', {
        ancienStatus: status,
        nouveauStatus: newStatus,
        criteriaCompletedChange: status.criteriaCompleted !== criteriaCompleted,
        booleanCheck: {
          criteriaCompleted,
          notCriteriaCompleted: !criteriaCompleted,
          strictEquality: criteriaCompleted === true,
          looseFalsy: !criteriaCompleted
        }
      });

      setStatus(newStatus);

      // 🚨 DEBUG: Log immédiat après setState (mais setState est asynchrone)
      console.log('🚨 [useRequireCriteria] APRÈS setState déclenché');

    } catch (error) {
      console.error('💥 [useRequireCriteria] Erreur dans checkCriteriaStatus:', error);
      const fallbackStatus = { 
        isLoading: false,
        criteriaCompleted: false,
        isFourmiz: false,
        canAccess: true,
        userId: null
      };
      console.log('🔄 [useRequireCriteria] Utilisation du statut fallback:', fallbackStatus);
      setStatus(fallbackStatus);
    }
  }, [router, status]); // ⚠️ ATTENTION: J'ai ajouté 'status' pour le debug, mais ça peut créer des boucles

  useEffect(() => {
    console.log('🔍 [useRequireCriteria] Hook démarré, appel checkCriteriaStatus...');
    hasChecked.current = false;
    checkCriteriaStatus();
    
    return () => {
      hasChecked.current = false;
    };
  }, []);

  const forceCriteriaConfiguration = useCallback(() => {
    console.log('🔔 [useRequireCriteria] forceCriteriaConfiguration appelée');
    Alert.alert(
      'Configuration requise',
      'Vous devez configurer vos critères de service pour accéder à toutes les fonctionnalités.',
      [
        {
          text: 'Configurer maintenant',
          onPress: () => {
            console.log('🔄 [useRequireCriteria] Navigation vers criteria?force=true');
            router.push('/criteria?force=true');
          }
        },
        {
          text: 'Plus tard',
          style: 'cancel'
        }
      ]
    );
  }, [router]);

  // 🚨 DEBUG: Log détaillé à chaque changement de state
  useEffect(() => {
    console.log('📊 [useRequireCriteria] ÉTAT COMPLET DU HOOK:', {
      status,
      timestamp: new Date().toISOString(),
      criteriaCompletedDebug: {
        value: status.criteriaCompleted,
        type: typeof status.criteriaCompleted,
        strictTrue: status.criteriaCompleted === true,
        strictFalse: status.criteriaCompleted === false,
        truthiness: !!status.criteriaCompleted,
        negation: !status.criteriaCompleted
      }
    });
  }, [status]);

  return {
    ...status,
    recheckStatus: checkCriteriaStatus,
    forceCriteriaConfiguration,
    // 🚨 AJOUT DEBUG: Exposer les valeurs brutes pour vérification externe
    _debug: {
      rawStatus: status,
      criteriaCompletedRaw: status.criteriaCompleted,
      isCriteriaCompletedTruthy: !!status.criteriaCompleted,
      isCriteriaCompletedFalsy: !status.criteriaCompleted
    }
  };
};
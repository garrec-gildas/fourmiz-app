// hooks/useLegalEngagements.ts - HOOK CORRIGÉ SANS BOUCLES INFINIES
// 🚨 PROBLÈME : useEffect + useCallback en boucle infinie
// ✅ SOLUTION : Guards + stabilisation des dépendances

import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { LegalEngagementService } from '../services/legal-engagement.service';
import type {
  LegalEngagementType,
  UserLegalEngagement,
  GrandfatheredStatus,
  ComplianceStatus,
  EngagementFormData,
  EngagementValidation,
  AcceptEngagementParams,
  EngagementHookReturn
} from '../types/legal-engagements';

export function useLegalEngagements(): EngagementHookReturn {
  // États principaux
  const [engagementTypes, setEngagementTypes] = useState<LegalEngagementType[]>([]);
  const [userEngagements, setUserEngagements] = useState<UserLegalEngagement[]>([]);
  const [grandfatheredStatus, setGrandfatheredStatus] = useState<GrandfatheredStatus>({
    isGrandfathered: false,
    engagementsRequired: true
  });

  // États de chargement
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Gestion d'erreurs
  const [error, setError] = useState<string | null>(null);

  // 🔒 GUARDS pour éviter les rechargements multiples
  const isTypesLoadedRef = useRef(false);
  const isLoadingTypesRef = useRef(false);

  /**
   * ✅ FONCTION SÉCURISÉE - Charge les types d'engagements disponibles
   */
  const loadEngagementTypes = useCallback(async () => {
    // 🛡️ GUARD : Éviter les rechargements multiples
    if (isLoadingTypesRef.current || isTypesLoadedRef.current) {
      return;
    }

    try {
      isLoadingTypesRef.current = true;
      setIsLoadingTypes(true);
      setError(null);
      
      const types = await LegalEngagementService.getFourmizEngagementTypes();
      setEngagementTypes(types);
      isTypesLoadedRef.current = true;
      
      // ✅ LOG UNIQUE - Ne se déclenche qu'une fois grâce au guard
      console.log(`✅ ${types.length} types d'engagements chargés`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur chargement types engagements';
      setError(message);
      console.error('Erreur loadEngagementTypes:', err);
    } finally {
      setIsLoadingTypes(false);
      isLoadingTypesRef.current = false;
    }
  }, []); // ✅ STABLE : Pas de dépendances

  /**
   * ✅ FONCTION STABLE - Charge les engagements de l'utilisateur
   */
  const loadUserEngagements = useCallback(async (userId: string) => {
    if (!userId) return;

    try {
      setError(null);
      
      const engagements = await LegalEngagementService.getUserEngagements(userId);
      setUserEngagements(engagements);
      
      console.log(`✅ ${engagements.length} engagements utilisateur chargés`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur chargement engagements utilisateur';
      setError(message);
      console.error('Erreur loadUserEngagements:', err);
    }
  }, []); // ✅ STABLE : Pas de dépendances

  /**
   * ✅ FONCTION STABLE - Vérifie le statut grandfathered
   */
  const checkGrandfatheredStatus = useCallback(async (userId: string): Promise<GrandfatheredStatus> => {
    if (!userId) {
      throw new Error('User ID requis');
    }

    try {
      setIsLoadingStatus(true);
      setError(null);
      
      const status = await LegalEngagementService.checkGrandfatheredStatus(userId);
      setGrandfatheredStatus(status);
      
      console.log('✅ Statut grandfathered vérifié:', status);
      return status;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur vérification statut';
      setError(message);
      console.error('Erreur checkGrandfatheredStatus:', err);
      
      const defaultStatus: GrandfatheredStatus = {
        isGrandfathered: false,
        engagementsRequired: true
      };
      setGrandfatheredStatus(defaultStatus);
      return defaultStatus;
    } finally {
      setIsLoadingStatus(false);
    }
  }, []); // ✅ STABLE : Pas de dépendances

  /**
   * ✅ FONCTION SIMPLIFIÉE - Charge toutes les données d'engagements
   */
  const loadEngagements = useCallback(async (userId: string) => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Charger en parallèle - les fonctions sont stables maintenant
      await Promise.all([
        loadEngagementTypes(),
        loadUserEngagements(userId),
        checkGrandfatheredStatus(userId)
      ]);
      
      console.log('✅ Toutes les données d\'engagements chargées');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur chargement données';
      setError(message);
      console.error('Erreur loadEngagements:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadEngagementTypes, loadUserEngagements, checkGrandfatheredStatus]); // ✅ Dépendances stables

  /**
   * ✅ FONCTION STABLE - Vérifie la compliance
   */
  const checkCompliance = useCallback(async (userId: string): Promise<ComplianceStatus> => {
    if (!userId) {
      throw new Error('User ID requis');
    }

    try {
      setError(null);
      
      const compliance = await LegalEngagementService.checkUserFourmizCompliance(userId);
      console.log('✅ Compliance vérifiée:', compliance);
      
      return compliance;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur vérification compliance';
      setError(message);
      console.error('Erreur checkCompliance:', err);
      
      return {
        isCompliant: false,
        isGrandfathered: false,
        reason: 'Erreur de vérification'
      };
    }
  }, []); // ✅ STABLE

  /**
   * ✅ FONCTION STABLE - Accepte tous les engagements
   */
  const acceptAllEngagements = useCallback(async (params: AcceptEngagementParams) => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Obtenir l'adresse IP (optionnel)
      let ipAddress: string | undefined;
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch (ipError) {
        console.warn('Impossible de récupérer l\'IP:', ipError);
      }

      const userAgent = `Fourmiz-Mobile/${Platform.OS}`;
      const acceptParams: AcceptEngagementParams = {
        ...params,
        ipAddress,
        userAgent
      };

      await LegalEngagementService.acceptAllEngagements(acceptParams);
      
      // Recharger les engagements utilisateur
      await loadUserEngagements(params.userId);
      
      console.log('✅ Tous les engagements acceptés');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur acceptation engagements';
      setError(message);
      console.error('Erreur acceptAllEngagements:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [loadUserEngagements]); // ✅ Dépendance stable

  // ✅ FONCTIONS UTILITAIRES STABLES
  const validateEngagements = useCallback((
    formData: EngagementFormData, 
    types: LegalEngagementType[]
  ): EngagementValidation => {
    if (!types.length) {
      return { isValid: true, acceptedCount: 0, totalRequired: 0 };
    }

    const acceptedCount = types.filter(type => 
      formData[`${type.code}Accepted`] === true
    ).length;

    const isValid = acceptedCount === types.length;

    return {
      isValid,
      acceptedCount,
      totalRequired: types.length,
      error: !isValid ? `${acceptedCount}/${types.length} engagements acceptés` : undefined
    };
  }, []);

  const isEngagementAccepted = useCallback((
    engagementCode: string, 
    formData: EngagementFormData
  ): boolean => {
    return formData[`${engagementCode}Accepted`] === true;
  }, []);

  const getAcceptedCount = useCallback((
    formData: EngagementFormData, 
    types: LegalEngagementType[]
  ): number => {
    return types.filter(type => 
      formData[`${type.code}Accepted`] === true
    ).length;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initializeFormData = useCallback((
    types: LegalEngagementType[],
    userEngs: UserLegalEngagement[]
  ): EngagementFormData => {
    const formData: EngagementFormData = {};
    
    types.forEach(type => {
      const userEngagement = userEngs.find(
        ue => ue.engagement_type_id === type.id && 
             ue.accepted_version === type.version &&
             ue.is_accepted &&
             !ue.revoked_at
      );
      
      formData[`${type.code}Accepted`] = !!userEngagement;
    });
    
    return formData;
  }, []);

  const isDataReady = useCallback((): boolean => {
    return !isLoading && !isLoadingTypes && !isLoadingStatus;
  }, [isLoading, isLoadingTypes, isLoadingStatus]);

  const getValidationStatus = useCallback((
    formData: EngagementFormData,
    isFourmizRole: boolean
  ): EngagementValidation => {
    if (!isFourmizRole) {
      return { isValid: true, acceptedCount: 0, totalRequired: 0 };
    }

    if (grandfatheredStatus.isGrandfathered) {
      return { isValid: true, acceptedCount: 0, totalRequired: 0 };
    }

    if (!grandfatheredStatus.engagementsRequired) {
      return { isValid: true, acceptedCount: 0, totalRequired: 0 };
    }

    return validateEngagements(formData, engagementTypes);
  }, [grandfatheredStatus, engagementTypes, validateEngagements]);

  // ✅ INITIALISATION SÉCURISÉE - UN SEUL useEffect STABLE
  useEffect(() => {
    // Charger les types seulement si pas déjà chargés
    if (!isTypesLoadedRef.current && !isLoadingTypesRef.current) {
      loadEngagementTypes();
    }
  }, []); // ✅ STABLE : Dépendances vides = exécution unique

  // 🧹 Nettoyage au démontage
  useEffect(() => {
    return () => {
      isTypesLoadedRef.current = false;
      isLoadingTypesRef.current = false;
    };
  }, []);

  return {
    // Data
    engagementTypes,
    userEngagements,
    grandfatheredStatus,
    
    // Loading states
    isLoading,
    isLoadingTypes,
    isLoadingStatus,
    isSaving,
    
    // Actions
    loadEngagements,
    checkGrandfatheredStatus,
    checkCompliance,
    acceptAllEngagements,
    
    // Validation
    validateEngagements,
    
    // Utilities
    isEngagementAccepted,
    getAcceptedCount,
    initializeFormData,
    isDataReady,
    getValidationStatus,
    
    // Error handling
    error,
    clearError
  };
}
// hooks/useLegalEngagements.ts
// Hook personnalisé pour gérer la logique métier des engagements légaux

import { useState, useCallback, useEffect } from 'react';
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

  /**
   * Charge les types d'engagements disponibles
   */
  const loadEngagementTypes = useCallback(async () => {
    try {
      setIsLoadingTypes(true);
      setError(null);
      
      const types = await LegalEngagementService.getFourmizEngagementTypes();
      setEngagementTypes(types);
      
      console.log(`✅ ${types.length} types d'engagements chargés`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur chargement types engagements';
      setError(message);
      console.error('Erreur loadEngagementTypes:', err);
    } finally {
      setIsLoadingTypes(false);
    }
  }, []);

  /**
   * Charge les engagements de l'utilisateur
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
  }, []);

  /**
   * Vérifie le statut grandfathered
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
      
      // Retourner un statut par défaut en cas d'erreur
      const defaultStatus: GrandfatheredStatus = {
        isGrandfathered: false,
        engagementsRequired: true
      };
      setGrandfatheredStatus(defaultStatus);
      return defaultStatus;
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  /**
   * Charge toutes les données d'engagements pour un utilisateur
   */
  const loadEngagements = useCallback(async (userId: string) => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Charger en parallèle les types et les données utilisateur
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
  }, [loadEngagementTypes, loadUserEngagements, checkGrandfatheredStatus]);

  /**
   * Vérifie la compliance de l'utilisateur
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
  }, []);

  /**
   * Accepte tous les engagements
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

      // User agent
      const userAgent = `Fourmiz-Mobile/${Platform.OS}`;

      const acceptParams: AcceptEngagementParams = {
        ...params,
        ipAddress,
        userAgent
      };

      await LegalEngagementService.acceptAllEngagements(acceptParams);
      
      // Recharger les engagements utilisateur après acceptation
      await loadUserEngagements(params.userId);
      
      console.log('✅ Tous les engagements acceptés');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur acceptation engagements';
      setError(message);
      console.error('Erreur acceptAllEngagements:', err);
      throw err; // Propager l'erreur pour que le composant puisse la gérer
    } finally {
      setIsSaving(false);
    }
  }, [loadUserEngagements]);

  /**
   * Valide les engagements sélectionnés dans le formulaire
   */
  const validateEngagements = useCallback((
    formData: EngagementFormData, 
    types: LegalEngagementType[]
  ): EngagementValidation => {
    if (!types.length) {
      return {
        isValid: true,
        acceptedCount: 0,
        totalRequired: 0
      };
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

  /**
   * Vérifie si un engagement spécifique est accepté
   */
  const isEngagementAccepted = useCallback((
    engagementCode: string, 
    formData: EngagementFormData
  ): boolean => {
    return formData[`${engagementCode}Accepted`] === true;
  }, []);

  /**
   * Compte le nombre d'engagements acceptés
   */
  const getAcceptedCount = useCallback((
    formData: EngagementFormData, 
    types: LegalEngagementType[]
  ): number => {
    return types.filter(type => 
      formData[`${type.code}Accepted`] === true
    ).length;
  }, []);

  /**
   * Efface les erreurs
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Initialise les données du formulaire avec les engagements existants
   */
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

  /**
   * Vérifie si les données sont entièrement chargées
   */
  const isDataReady = useCallback((): boolean => {
    return !isLoading && !isLoadingTypes && !isLoadingStatus;
  }, [isLoading, isLoadingTypes, isLoadingStatus]);

  /**
   * Obtient le statut de validation global
   */
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

  // Charger les types d'engagements au montage du hook
  useEffect(() => {
    loadEngagementTypes();
  }, [loadEngagementTypes]);

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
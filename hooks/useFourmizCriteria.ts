// hooks/useFourmizCriteria.ts - VERSION SIMPLIFIÉE SANS DEBOUNCING
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { fourmizService, FourmizCriteriaAdapted, FourmizSearchParams, FourmizSearchResult } from '@/lib/fourmiz.service';

export interface UseFourmizCriteriaReturn {
  // État
  criteria: FourmizCriteriaAdapted | null;
  loading: boolean;
  error: string | null;
  completion: number;
  
  // Actions
  loadCriteria: (userId: string) => Promise<void>;
  saveCriteria: (data: Partial<FourmizCriteriaAdapted>) => Promise<boolean>;
  updateAvailability: (isAvailable: boolean) => Promise<boolean>;
  searchFourmiz: (params: FourmizSearchParams) => Promise<FourmizSearchResult[]>;
  
  // Validation
  validateCriteria: (data: Partial<FourmizCriteriaAdapted>) => string[];
  isRGPDCompliant: boolean;
  
  // Contrôles
  clearError: () => void;
  refresh: () => Promise<void>;
}

export function useFourmizCriteria(userId?: string): UseFourmizCriteriaReturn {
  // États principaux
  const [criteria, setCriteria] = useState<FourmizCriteriaAdapted | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completion, setCompletion] = useState(0);

  // Ref pour gestion cycle de vie
  const isMountedRef = useRef<boolean>(true);

  const clearError = useCallback(() => {
    if (isMountedRef.current) {
      setError(null);
    }
  }, []);

  // Calculer le pourcentage de completion
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (criteria) {
      try {
        const percent = fourmizService.calculateCompletionPercent(criteria);
        if (isMountedRef.current) {
          setCompletion(percent);
        }
      } catch (error) {
        console.warn('⚠️ [FourmizCriteria] Erreur calcul completion:', error);
        if (isMountedRef.current) {
          setCompletion(0);
        }
      }
    } else {
      if (isMountedRef.current) {
        setCompletion(0);
      }
    }
  }, [criteria]);

  /**
   * Charger les critères
   */
  const loadCriteria = useCallback(async (userIdParam: string) => {
    if (!isMountedRef.current || !userIdParam) return;

    console.log('🔧🔧 Chargement critères pour user:', userIdParam);
    console.log('🔧🔧 [loadCriteria] === DÉBUT CHARGEMENT SÉCURISÉ ===');
    
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }
    
    try {
      // Vérifier que l'utilisateur est toujours authentifié
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      console.log('🔧🔧 [loadCriteria] Utilisateur authentifié:', {
        currentUserEmail: user.email,
        currentUserId: user.id,
        userProfileEmail: user.email,
        userProfileId: userIdParam
      });

      // Validation ID utilisateur
      if (user.id !== userIdParam) {
        throw new Error('ID utilisateur incohérent');
      }

      console.log('🔧🔧 [loadCriteria] ID utilisateur validé:', userIdParam);

      const data = await fourmizService.getCriteria(userIdParam);
      
      if (!data) {
        console.log('🔧🔧 [loadCriteria] Aucun critère trouvé, création nouveaux critères pour:', user.email);
        
        // Créer des critères par défaut
        console.log('🔧🔧 [createDefaultCriteria] Création critères minimaux pour user:', userIdParam);
        const defaultData = await fourmizService.createDefaultCriteria(userIdParam);
        console.log('✅ [createDefaultCriteria] Critères minimaux créés - utilisateur doit tout configurer');
        
        if (isMountedRef.current) {
          setCriteria(defaultData);
        }
      } else {
        if (isMountedRef.current) {
          setCriteria(data);
        }
      }

      console.log('🔧🔧 [loadCriteria] === FIN CHARGEMENT SÉCURISÉ ===');
    } catch (err: any) {
      if (isMountedRef.current) {
        const errorMessage = err.message || 'Erreur lors du chargement des critères';
        setError(errorMessage);
        console.error('[FourmizCriteria] Erreur loadCriteria:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * 🔧 CORRECTION : Sauvegarder SANS debouncing
   */
  const saveCriteria = useCallback(async (data: Partial<FourmizCriteriaAdapted>): Promise<boolean> => {
    if (!isMountedRef.current) return false;

    console.log('🚀 [FourmizCriteria] === DÉBUT SAUVEGARDE ===');
    console.log('📊 Données reçues:', data);

    setLoading(true);
    setError(null);

    try {
      // 🔧 CORRECTION : Utiliser la validation pour sauvegarde (moins stricte)
      const validationErrors = fourmizService.validateCriteriaForSave(data);
      if (validationErrors.length > 0) {
        console.error('❌ [FourmizCriteria] Erreurs validation sauvegarde:', validationErrors);
        if (isMountedRef.current) {
          setError(validationErrors.join('\n'));
        }
        return false;
      }

      const success = await fourmizService.saveCriteria(data);
      
      if (success) {
        console.log('✅ [FourmizCriteria] Sauvegarde réussie');
        
        // Recharger les critères pour avoir les données à jour
        if (data.user_id && isMountedRef.current) {
          await loadCriteria(data.user_id);
        }
        return true;
      } else {
        console.error('❌ [FourmizCriteria] Sauvegarde échouée');
        if (isMountedRef.current) {
          setError('Erreur lors de la sauvegarde');
        }
        return false;
      }
    } catch (err: any) {
      console.error('❌ [FourmizCriteria] Exception sauvegarde:', err);
      if (isMountedRef.current) {
        setError('Erreur lors de la sauvegarde des critères');
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      console.log('🏁 [FourmizCriteria] === FIN SAUVEGARDE ===');
    }
  }, [loadCriteria]);

  /**
   * Mettre à jour la disponibilité
   */
  const updateAvailability = useCallback(async (isAvailable: boolean): Promise<boolean> => {
    if (!isMountedRef.current) return false;

    if (!criteria?.user_id) {
      if (isMountedRef.current) {
        setError('Aucun utilisateur connecté');
      }
      return false;
    }

    if (isMountedRef.current) {
      setLoading(true);
    }
    
    try {
      const success = await fourmizService.updateAvailability(criteria.user_id, isAvailable);
      
      if (success && isMountedRef.current) {
        setCriteria(prev => prev ? { ...prev, is_available: isAvailable } : null);
        return true;
      } else {
        if (isMountedRef.current) {
          setError('Erreur lors de la mise à jour de la disponibilité');
        }
        return false;
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError('Erreur lors de la mise à jour de la disponibilité');
        console.error('[FourmizCriteria] Erreur updateAvailability:', err);
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [criteria?.user_id]);

  /**
   * Rechercher des fourmiz
   */
  const searchFourmiz = useCallback(async (params: FourmizSearchParams): Promise<FourmizSearchResult[]> => {
    if (!isMountedRef.current) return [];

    if (isMountedRef.current) {
      setLoading(true);
    }
    
    try {
      const results = await fourmizService.searchFourmiz(params);
      return results;
    } catch (err: any) {
      if (isMountedRef.current) {
        setError('Erreur lors de la recherche');
        console.error('[FourmizCriteria] Erreur searchFourmiz:', err);
      }
      return [];
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Fonction refresh
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!userId || !isMountedRef.current) return;
    await loadCriteria(userId);
  }, [userId, loadCriteria]);

  /**
   * Valider les critères
   */
  const validateCriteria = useCallback((data: Partial<FourmizCriteriaAdapted>): string[] => {
    try {
      return fourmizService.validateCriteria(data);
    } catch (error) {
      console.error('[FourmizCriteria] Erreur validateCriteria:', error);
      return ['Erreur de validation'];
    }
  }, []);

  /**
   * Calculer RGPD compliance
   */
  const isRGPDCompliant = useMemo(() => {
    if (!criteria) return false;
    
    try {
      return criteria.rgpd_accepte_cgu && 
             criteria.rgpd_accepte_politique_confidentialite && 
             criteria.rgpd_accepte_traitement_donnees;
    } catch (error) {
      console.warn('[FourmizCriteria] Erreur calcul RGPD:', error);
      return false;
    }
  }, [criteria]);

  // Auto-chargement avec protection changement d'utilisateur
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (userId) {
      console.log('🔧🔧 [CRITERIA DEBUG] === DÉBUT DEBUG MONTAGE ===');
      
      // Vérifier l'utilisateur actuel
      const checkCurrentUser = async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('🔧🔧 [CRITERIA DEBUG] Utilisateur actuel:', {
          userId: user?.id || null,
          email: user?.email || null,
          error: error?.message || null
        });
      };
      
      checkCurrentUser();
      console.log('🔧🔧 [CRITERIA DEBUG] === FIN DEBUG MONTAGE ===');
      
      loadCriteria(userId);
    }
  }, [userId, loadCriteria]);

  // Nettoyage au démontage
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    // État
    criteria,
    loading,
    error,
    completion,
    
    // Actions
    loadCriteria,
    saveCriteria,
    updateAvailability,
    searchFourmiz,
    
    // Validation
    validateCriteria,
    isRGPDCompliant,
    
    // Contrôles
    clearError,
    refresh,
  };
}

// Hook simplifié pour la recherche
export function useFourmizSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FourmizSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const search = useCallback(async (params: FourmizSearchParams) => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await fourmizService.searchFourmiz(params);
      if (isMountedRef.current) {
        setResults(searchResults);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError('Erreur lors de la recherche');
        console.error('[FourmizSearch] Erreur search:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const clear = useCallback(() => {
    if (isMountedRef.current) {
      setResults([]);
      setError(null);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  return { results, loading, error, search, clear };
}

// Hook pour les statistiques
export function useFourmizStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef<boolean>(true);

  const loadStats = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    try {
      const data = await fourmizService.getStats();
      if (isMountedRef.current) {
        setStats(data);
      }
    } catch (err: any) {
      console.error('[FourmizStats] Erreur loadStats:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadStats();
    return () => { isMountedRef.current = false; };
  }, [loadStats]);

  return { stats, loading, loadStats };
}
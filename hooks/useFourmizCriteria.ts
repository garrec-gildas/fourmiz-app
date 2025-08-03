// hooks/useFourmizCriteria.ts
import { useState, useEffect } from 'react';
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
}

export function useFourmizCriteria(userId?: string): UseFourmizCriteriaReturn {
  const [criteria, setCriteria] = useState<FourmizCriteriaAdapted | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completion, setCompletion] = useState(0);

  // Charger les critères automatiquement si userId fourni
  useEffect(() => {
    if (userId) {
      loadCriteria(userId);
    }
  }, [userId]);

  // Calculer le pourcentage de completion quand les critères changent
  useEffect(() => {
    if (criteria) {
      const percent = fourmizService.calculateCompletionPercent(criteria);
      setCompletion(percent);
    }
  }, [criteria]);

  /**
   * Charger les critères d'un utilisateur
   */
  const loadCriteria = async (userIdParam: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fourmizService.getCriteria(userIdParam);
      setCriteria(data);
    } catch (err) {
      setError('Erreur lors du chargement des critères');
      console.error('Erreur loadCriteria:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sauvegarder les critères
   */
  const saveCriteria = async (data: Partial<FourmizCriteriaAdapted>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Validation avant sauvegarde
      const validationErrors = fourmizService.validateCriteria(data);
      if (validationErrors.length > 0) {
        setError(validationErrors.join('\n'));
        return false;
      }

      // Sauvegarde
      const success = await fourmizService.saveCriteria(data);
      
      if (success) {
        // Recharger les critères pour avoir les données à jour
        if (data.user_id) {
          await loadCriteria(data.user_id);
        }
        return true;
      } else {
        setError('Erreur lors de la sauvegarde');
        return false;
      }
    } catch (err) {
      setError('Erreur lors de la sauvegarde des critères');
      console.error('Erreur saveCriteria:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mettre à jour la disponibilité
   */
  const updateAvailability = async (isAvailable: boolean): Promise<boolean> => {
    if (!criteria?.user_id) {
      setError('Aucun utilisateur connecté');
      return false;
    }

    setLoading(true);
    try {
      const success = await fourmizService.updateAvailability(criteria.user_id, isAvailable);
      
      if (success) {
        setCriteria(prev => prev ? { ...prev, is_available: isAvailable } : null);
        return true;
      } else {
        setError('Erreur lors de la mise à jour de la disponibilité');
        return false;
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour de la disponibilité');
      console.error('Erreur updateAvailability:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Rechercher des fourmiz
   */
  const searchFourmiz = async (params: FourmizSearchParams): Promise<FourmizSearchResult[]> => {
    setLoading(true);
    try {
      const results = await fourmizService.searchFourmiz(params);
      return results;
    } catch (err) {
      setError('Erreur lors de la recherche');
      console.error('Erreur searchFourmiz:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Valider les critères
   */
  const validateCriteria = (data: Partial<FourmizCriteriaAdapted>): string[] => {
    return fourmizService.validateCriteria(data);
  };

  /**
   * Vérifier si RGPD conforme
   */
  const isRGPDCompliant = criteria ? 
    criteria.rgpd_accepte_cgu && 
    criteria.rgpd_accepte_politique_confidentialite && 
    criteria.rgpd_accepte_traitement_donnees : false;

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
  };
}

// Hook simplifié pour la recherche uniquement
export function useFourmizSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FourmizSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = async (params: FourmizSearchParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await fourmizService.searchFourmiz(params);
      setResults(searchResults);
    } catch (err) {
      setError('Erreur lors de la recherche');
      console.error('Erreur search:', err);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setResults([]);
    setError(null);
  };

  return {
    results,
    loading,
    error,
    search,
    clear
  };
}

// Hook pour les statistiques
export function useFourmizStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fourmizService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Erreur loadStats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return {
    stats,
    loading,
    loadStats
  };
}
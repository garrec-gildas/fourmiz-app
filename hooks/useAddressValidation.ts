// hooks/useAddressValidation.ts
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { AddressSuggestion, AddressValidationResult } from '../src/types/address';
import { 
  validateAddressFormat, 
  formatAddressForGeocoding,
  createAddressValidationError
} from '../src/utils/addressValidation';

interface UseAddressValidationOptions {
  minLength?: number;
  debounceMs?: number;
  maxSuggestions?: number;
}

interface UseAddressValidationReturn {
  validateAddress: (
    address: string,
    postalCode?: string,
    city?: string
  ) => Promise<AddressValidationResult>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const DEFAULT_OPTIONS: Required<UseAddressValidationOptions> = {
  minLength: 3,
  debounceMs: 300,
  maxSuggestions: 5
};

export const useAddressValidation = (
  options: UseAddressValidationOptions = {}
): UseAddressValidationReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { minLength, maxSuggestions } = { ...DEFAULT_OPTIONS, ...options };
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const validateAddress = useCallback(async (
    address: string,
    postalCode?: string,
    city?: string
  ): Promise<AddressValidationResult> => {
    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear previous error
    setError(null);

    // Validation de base côté client
    if (!address.trim() || address.trim().length < minLength) {
      return {
        isValid: false,
        suggestions: [],
        error: `L'adresse doit contenir au moins ${minLength} caractères`
      };
    }

    // Validation du format local
    const formatValidation = validateAddressFormat(address);
    if (!formatValidation.isValid) {
      return {
        isValid: false,
        suggestions: [],
        error: formatValidation.issues[0] || 'Format d\'adresse invalide'
      };
    }

    setIsLoading(true);

    try {
      // Créer un nouveau AbortController
      abortControllerRef.current = new AbortController();

      // Construire la requête
      const searchAddress = formatAddressForGeocoding(address, postalCode, city);
      const params = new URLSearchParams({
        q: searchAddress,
        limit: maxSuggestions.toString()
      });

      // Ajouter des filtres optionnels
      if (postalCode?.trim()) {
        params.append('postcode', postalCode.trim());
      }
      if (city?.trim()) {
        params.append('city', city.trim());
      }

      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.features || !Array.isArray(data.features)) {
        return {
          isValid: false,
          suggestions: [],
          error: 'Réponse API invalide'
        };
      }

      if (data.features.length === 0) {
        return {
          isValid: false,
          suggestions: [],
          error: 'Aucune adresse trouvée. Vérifiez l\'orthographe et le format.'
        };
      }

      // Transformer les résultats
      const suggestions: AddressSuggestion[] = data.features.map((feature: any) => ({
        label: feature.properties.label || '',
        context: feature.properties.context || '',
        coordinates: feature.geometry.coordinates || [0, 0],
        score: feature.properties.score || 0,
        postcode: feature.properties.postcode || '',
        city: feature.properties.city || '',
        type: feature.properties.type || '',
        housenumber: feature.properties.housenumber || '',
        street: feature.properties.street || ''
      }));

      // La première suggestion avec un score élevé est considérée comme valide
      const bestMatch = suggestions[0];
      const isValid = bestMatch && bestMatch.score > 0.7;

      const result: AddressValidationResult = {
        isValid,
        suggestions,
      };

      if (isValid) {
        result.coordinates = {
          lat: bestMatch.coordinates[1],
          lng: bestMatch.coordinates[0]
        };
        result.formattedAddress = bestMatch.label;
        result.confidence = bestMatch.score;
      }

      return result;

    } catch (error: any) {
      // Ne pas traiter les erreurs d'annulation
      if (error.name === 'AbortError') {
        return {
          isValid: false,
          suggestions: [],
          error: 'Recherche annulée'
        };
      }

      console.warn('Erreur lors de la validation d\'adresse:', error);

      const errorResult = {
        isValid: false,
        suggestions: [],
        error: 'Erreur lors de la validation de l\'adresse'
      };

      // Classification des erreurs
      if (!navigator.onLine) {
        errorResult.error = 'Pas de connexion internet';
        setError('Vérifiez votre connexion internet');
      } else if (error.message?.includes('fetch')) {
        errorResult.error = 'Problème de réseau';
        setError('Problème de connexion au service d\'adresse');
      } else if (error.message?.includes('timeout')) {
        errorResult.error = 'Délai d\'attente dépassé';
        setError('Le service d\'adresse ne répond pas');
      } else {
        errorResult.error = 'Erreur inconnue';
        setError('Une erreur inattendue est survenue');
      }

      return errorResult;

    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [minLength, maxSuggestions]);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    validateAddress,
    isLoading,
    error,
    clearError
  };
};
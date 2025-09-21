// src/utils/addressValidation.ts
import type { AddressValidationError } from '../types/address';

interface AddressFormatValidation {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}

/**
 * Valide le format de base d'une adresse avant l'appel API
 */
export const validateAddressFormat = (address: string): AddressFormatValidation => {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  const trimmedAddress = address.trim();
  
  // Vérifier si l'adresse n'est pas vide
  if (!trimmedAddress) {
    issues.push('Adresse vide');
    suggestions.push('Saisissez votre adresse complète');
    return { isValid: false, issues, suggestions };
  }
  
  // Vérifier la longueur minimale
  if (trimmedAddress.length < 5) {
    issues.push('Adresse trop courte');
    suggestions.push('Saisissez une adresse plus détaillée');
  }
  
  // Vérifier la présence d'un numéro de rue
  if (!/^\d+/.test(trimmedAddress)) {
    issues.push('Numéro de rue manquant');
    suggestions.push('Ajoutez le numéro de votre rue (ex: "123 rue de la Paix")');
  }
  
  // Vérifier la longueur pour une localisation précise
  if (trimmedAddress.length < 15) {
    issues.push('Adresse insuffisamment détaillée');
    suggestions.push('Précisez l\'adresse complète avec le nom de rue');
  }
  
  // Vérifier la présence de termes vagues
  const vagueTerms = ['près de', 'à côté de', 'face à', 'derrière', 'vers', 'proche'];
  const hasVagueTerms = vagueTerms.some(term => 
    trimmedAddress.toLowerCase().includes(term)
  );
  
  if (hasVagueTerms) {
    issues.push('Adresse contient des termes imprécis');
    suggestions.push('Utilisez l\'adresse exacte plutôt qu\'une description approximative');
  }
  
  // Vérifier la présence de caractères suspects
  if (/[<>{}[\]\\|`~]/.test(trimmedAddress)) {
    issues.push('Caractères non valides détectés');
    suggestions.push('Utilisez uniquement des lettres, chiffres et ponctuation standard');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
};

/**
 * Formate une adresse pour l'appel à l'API de géocodage
 */
export const formatAddressForGeocoding = (
  address: string,
  postalCode?: string,
  city?: string
): string => {
  const parts = [address.trim()];
  
  if (postalCode?.trim()) {
    parts.push(postalCode.trim());
  }
  
  if (city?.trim()) {
    parts.push(city.trim());
  }
  
  parts.push('France');
  
  return parts.join(', ');
};

/**
 * Valide la cohérence entre code postal et ville
 */
export const validatePostalCodeCityCoherence = (
  postalCode: string,
  city: string
): { isValid: boolean; warning?: string } => {
  if (!postalCode || !city) {
    return { isValid: true }; // Skip validation if either is missing
  }
  
  const postcode = postalCode.trim();
  const cityLower = city.toLowerCase().trim();
  
  // Vérifications spécifiques pour Paris
  if (postcode.startsWith('75') && !cityLower.includes('paris')) {
    return {
      isValid: false,
      warning: 'Le code postal correspond à Paris mais la ville indiquée est différente'
    };
  }
  
  // Vérifications pour Lyon
  if (postcode.startsWith('69') && !cityLower.includes('lyon') && !cityLower.includes('villeurbanne')) {
    return {
      isValid: false,
      warning: 'Le code postal correspond à la région lyonnaise mais la ville indiquée est différente'
    };
  }
  
  // Vérifications pour Marseille
  if (postcode.startsWith('13') && !cityLower.includes('marseille') && !cityLower.includes('aix')) {
    return {
      isValid: false,
      warning: 'Le code postal correspond aux Bouches-du-Rhône mais la ville indiquée est différente'
    };
  }
  
  return { isValid: true };
};

/**
 * Nettoie et normalise une adresse saisie par l'utilisateur
 */
export const normalizeAddressInput = (address: string): string => {
  return address
    .trim()
    .replace(/\s+/g, ' ') // Remplace plusieurs espaces par un seul
    .replace(/,\s*,/g, ',') // Supprime les virgules doubles
    .replace(/^,|,$/g, '') // Supprime les virgules en début/fin
    .toLowerCase()
    .replace(/(^|\s)\w/g, (match) => match.toUpperCase()); // Met en forme title case
};

/**
 * Extrait les composants d'une adresse formatée
 */
export const parseAddressComponents = (formattedAddress: string): {
  streetNumber?: string;
  streetName?: string;
  postalCode?: string;
  city?: string;
} => {
  const components: any = {};
  
  // Extraction du numéro de rue
  const streetNumberMatch = formattedAddress.match(/^(\d+[A-Z]?)\s/);
  if (streetNumberMatch) {
    components.streetNumber = streetNumberMatch[1];
  }
  
  // Extraction du code postal (5 chiffres)
  const postalCodeMatch = formattedAddress.match(/\b(\d{5})\b/);
  if (postalCodeMatch) {
    components.postalCode = postalCodeMatch[1];
  }
  
  // Extraction de la ville (après le code postal)
  if (components.postalCode) {
    const cityMatch = formattedAddress.match(new RegExp(`${components.postalCode}\\s+([^,]+)`));
    if (cityMatch) {
      components.city = cityMatch[1].trim();
    }
  }
  
  // Extraction du nom de rue (entre le numéro et le code postal)
  if (components.streetNumber && components.postalCode) {
    const streetMatch = formattedAddress.match(
      new RegExp(`${components.streetNumber}\\s+(.+?)\\s+${components.postalCode}`)
    );
    if (streetMatch) {
      components.streetName = streetMatch[1].trim().replace(/,$/, '');
    }
  }
  
  return components;
};

/**
 * Crée un message d'erreur adapté selon le type d'erreur
 */
export const createAddressValidationError = (
  type: AddressValidationError['type'],
  customMessage?: string
): AddressValidationError => {
  switch (type) {
    case 'network':
      return {
        type,
        message: customMessage || 'Problème de connexion. Vérifiez votre internet.',
        suggestions: ['Vérifiez votre connexion internet', 'Réessayez dans quelques instants']
      };
      
    case 'format':
      return {
        type,
        message: customMessage || 'Format d\'adresse invalide',
        suggestions: ['Ajoutez le numéro de rue', 'Vérifiez l\'orthographe']
      };
      
    case 'notfound':
      return {
        type,
        message: customMessage || 'Adresse non trouvée',
        suggestions: ['Vérifiez l\'orthographe', 'Essayez une adresse plus précise']
      };
      
    case 'invalid':
      return {
        type,
        message: customMessage || 'Adresse invalide',
        suggestions: ['Saisissez une adresse française valide']
      };
      
    default:
      return {
        type: 'invalid',
        message: 'Erreur de validation inconnue'
      };
  }
};
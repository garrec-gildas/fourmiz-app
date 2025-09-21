// types/address.ts (backend)

/**
 * Requête de validation d'adresse
 */
export interface AddressValidationRequest {
  address: string;
  postalCode: string;
  city: string;
  userId?: string;
  source?: 'profile' | 'service' | 'booking';
}

/**
 * Réponse de validation d'adresse
 */
export interface AddressValidationResponse {
  success: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  formattedAddress?: string;
  confidence?: number;
  error?: string;
  metadata?: {
    source: 'api-adresse-gouv';
    validatedAt: string;
    originalQuery: string;
  };
}

/**
 * Données d'adresse enrichies pour la base de données
 */
export interface EnrichedAddressData {
  fullAddress: string;
  formattedAddress?: string;
  streetNumber?: string;
  streetName?: string;
  postalCode: string;
  city: string;
  latitude?: number;
  longitude?: number;
  confidence?: number;
  validatedAt?: Date;
  source: 'user_input' | 'geocoded' | 'validated';
}

/**
 * Réponse de l'API française api-adresse.data.gouv.fr
 */
export interface ApiAdresseGeocodingResponse {
  type: 'FeatureCollection';
  version: string;
  features: ApiAdresseFeature[];
  attribution: string;
  licence: string;
  query: string;
  limit: number;
}

export interface ApiAdresseFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    label: string;
    score: number;
    housenumber?: string;
    id: string;
    type: 'housenumber' | 'street' | 'locality' | 'municipality';
    name: string;
    postcode: string;
    citycode: string;
    x: number;
    y: number;
    city: string;
    context: string;
    importance: number;
    street?: string;
  };
}

/**
 * Configuration du service de géocodage
 */
export interface GeocodingConfig {
  apiBaseUrl: string;
  timeout: number;
  retries: number;
  minConfidenceScore: number;
  cacheResults: boolean;
  cacheDurationMs: number;
}

/**
 * Résultat de géocodage interne
 */
export interface GeocodingResult {
  success: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  formattedAddress?: string;
  confidence?: number;
  originalQuery: string;
  source: string;
  validatedAt: Date;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Options pour le géocodage
 */
export interface GeocodingOptions {
  timeout?: number;
  retries?: number;
  minScore?: number;
  filters?: {
    postcode?: string;
    city?: string;
    type?: string[];
  };
  includeMetadata?: boolean;
}

/**
 * Erreurs de validation d'adresse
 */
export type AddressValidationErrorCode = 
  | 'INVALID_FORMAT'
  | 'ADDRESS_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'INVALID_POSTAL_CODE'
  | 'CITY_MISMATCH';

export interface AddressValidationError {
  code: AddressValidationErrorCode;
  message: string;
  details?: {
    originalAddress?: string;
    suggestions?: string[];
    retryable?: boolean;
  };
}

/**
 * Métriques pour le monitoring
 */
export interface AddressValidationMetrics {
  requestId: string;
  userId?: string;
  originalAddress: string;
  success: boolean;
  confidence?: number;
  responseTimeMs: number;
  errorCode?: string;
  timestamp: Date;
  source: 'api' | 'cache' | 'fallback';
}

/**
 * Cache entry pour les adresses validées
 */
export interface AddressCacheEntry {
  key: string; // hash de l'adresse originale
  result: GeocodingResult;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  lastAccessedAt: Date;
}

/**
 * Données d'adresse pour profil utilisateur
 */
export interface UserAddressData {
  id: string;
  userId: string;
  fullAddress: string;
  formattedAddress?: string;
  streetNumber?: string;
  streetName?: string;
  building?: string;
  floor?: string;
  postalCode: string;
  city: string;
  latitude?: number;
  longitude: number;
  confidence?: number;
  isValidated: boolean;
  validatedAt?: Date;
  source: 'manual' | 'geocoded';
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Statistiques d'utilisation du service d'adresse
 */
export interface AddressServiceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageConfidence: number;
  averageResponseTime: number;
  cacheHitRate: number;
  topErrors: Array<{
    code: AddressValidationErrorCode;
    count: number;
  }>;
  dailyUsage: Array<{
    date: string;
    requests: number;
    successRate: number;
  }>;
}
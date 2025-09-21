// lib/services/geocodingService.ts
import type {
  AddressValidationRequest,
  AddressValidationResponse,
  GeocodingResult,
  GeocodingOptions,
  ApiAdresseGeocodingResponse,
  AddressValidationError,
  AddressValidationMetrics,
  GeocodingConfig
} from '../../types/address';

/**
 * Service de géocodage utilisant l'API française api-adresse.data.gouv.fr
 */
export class GeocodingService {
  private static readonly DEFAULT_CONFIG: GeocodingConfig = {
    apiBaseUrl: 'https://api-adresse.data.gouv.fr',
    timeout: 10000,
    retries: 2,
    minConfidenceScore: 0.7,
    cacheResults: true,
    cacheDurationMs: 24 * 60 * 60 * 1000, // 24h
  };

  private static config: GeocodingConfig = { ...this.DEFAULT_CONFIG };
  private static cache = new Map<string, { result: GeocodingResult; expiresAt: number }>();
  private static metrics: AddressValidationMetrics[] = [];

  /**
   * Configure le service avec des options personnalisées
   */
  static configure(newConfig: Partial<GeocodingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Valide et géocode une adresse
   */
  static async validateAndGeocode(
    address: string,
    postalCode: string,
    city: string,
    options: GeocodingOptions = {}
  ): Promise<GeocodingResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const originalQuery = `${address}, ${postalCode} ${city}`;

    try {
      // Validation des paramètres d'entrée
      this.validateInputs(address, postalCode, city);

      // Vérifier le cache si activé
      if (this.config.cacheResults) {
        const cached = this.getFromCache(originalQuery);
        if (cached) {
          this.recordMetric({
            requestId,
            originalAddress: originalQuery,
            success: cached.success,
            confidence: cached.confidence,
            responseTimeMs: Date.now() - startTime,
            timestamp: new Date(),
            source: 'cache'
          });
          return cached;
        }
      }

      // Appel à l'API avec retry automatique
      const result = await this.callApiWithRetry(
        originalQuery,
        options,
        this.config.retries
      );

      // Mise en cache du résultat
      if (this.config.cacheResults && result.success) {
        this.setCache(originalQuery, result);
      }

      // Enregistrement des métriques
      this.recordMetric({
        requestId,
        originalAddress: originalQuery,
        success: result.success,
        confidence: result.confidence,
        responseTimeMs: Date.now() - startTime,
        errorCode: result.error?.code,
        timestamp: new Date(),
        source: 'api'
      });

      return result;

    } catch (error) {
      const failureResult: GeocodingResult = {
        success: false,
        originalQuery,
        source: 'geocoding-service',
        validatedAt: new Date(),
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        }
      };

      this.recordMetric({
        requestId,
        originalAddress: originalQuery,
        success: false,
        responseTimeMs: Date.now() - startTime,
        errorCode: 'UNEXPECTED_ERROR',
        timestamp: new Date(),
        source: 'api'
      });

      return failureResult;
    }
  }

  /**
   * Version simplifiée pour l'API publique
   */
  static async validateAddress(
    request: AddressValidationRequest
  ): Promise<AddressValidationResponse> {
    const result = await this.validateAndGeocode(
      request.address,
      request.postalCode,
      request.city
    );

    if (result.success) {
      return {
        success: true,
        coordinates: result.coordinates,
        formattedAddress: result.formattedAddress,
        confidence: result.confidence,
        metadata: {
          source: 'api-adresse-gouv',
          validatedAt: result.validatedAt.toISOString(),
          originalQuery: result.originalQuery
        }
      };
    } else {
      return {
        success: false,
        error: result.error?.message || 'Validation failed',
      };
    }
  }

  /**
   * Appel à l'API avec gestion des erreurs et retry
   */
  private static async callApiWithRetry(
    query: string,
    options: GeocodingOptions,
    retriesLeft: number
  ): Promise<GeocodingResult> {
    try {
      const result = await this.callApi(query, options);
      return result;
    } catch (error) {
      if (retriesLeft > 0 && this.isRetryableError(error)) {
        // Délai exponentiel avant retry
        const delay = Math.pow(2, this.config.retries - retriesLeft) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.callApiWithRetry(query, options, retriesLeft - 1);
      }
      throw error;
    }
  }

  /**
   * Appel direct à l'API
   */
  private static async callApi(
    query: string,
    options: GeocodingOptions
  ): Promise<GeocodingResult> {
    const params = new URLSearchParams({
      q: query,
      limit: '1'
    });

    // Ajout des filtres optionnels
    if (options.filters?.postcode) {
      params.append('postcode', options.filters.postcode);
    }
    if (options.filters?.city) {
      params.append('city', options.filters.city);
    }
    if (options.filters?.type?.length) {
      params.append('type', options.filters.type.join(','));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, options.timeout || this.config.timeout);

    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/search/?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Fourmiz-App/1.0'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('RATE_LIMITED');
        }
        throw new Error(`HTTP_${response.status}`);
      }

      const data: ApiAdresseGeocodingResponse = await response.json();
      return this.parseApiResponse(data, query);

    } catch (error: any) {
      clearTimeout(timeout);

      if (error.name === 'AbortError') {
        throw new Error('TIMEOUT');
      }
      if (error.message === 'Failed to fetch') {
        throw new Error('NETWORK_ERROR');
      }
      throw error;
    }
  }

  /**
   * Parse la réponse de l'API française
   */
  private static parseApiResponse(
    data: ApiAdresseGeocodingResponse,
    originalQuery: string
  ): GeocodingResult {
    if (!data.features || data.features.length === 0) {
      return {
        success: false,
        originalQuery,
        source: 'api-adresse-gouv',
        validatedAt: new Date(),
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Aucune adresse trouvée pour cette recherche'
        }
      };
    }

    const feature = data.features[0];
    const confidence = feature.properties.score;

    // Vérifier le seuil de confiance minimum
    if (confidence < this.config.minConfidenceScore) {
      return {
        success: false,
        originalQuery,
        source: 'api-adresse-gouv',
        validatedAt: new Date(),
        error: {
          code: 'LOW_CONFIDENCE',
          message: `Confiance trop faible: ${Math.round(confidence * 100)}%`
        }
      };
    }

    return {
      success: true,
      coordinates: {
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0]
      },
      formattedAddress: feature.properties.label,
      confidence,
      originalQuery,
      source: 'api-adresse-gouv',
      validatedAt: new Date()
    };
  }

  /**
   * Validation des paramètres d'entrée
   */
  private static validateInputs(
    address: string,
    postalCode: string,
    city: string
  ): void {
    if (!address?.trim()) {
      throw new Error('INVALID_FORMAT: Address is required');
    }
    if (!postalCode?.trim()) {
      throw new Error('INVALID_FORMAT: Postal code is required');
    }
    if (!city?.trim()) {
      throw new Error('INVALID_FORMAT: City is required');
    }

    // Validation du code postal français
    if (!/^\d{5}$/.test(postalCode.trim())) {
      throw new Error('INVALID_POSTAL_CODE: Must be 5 digits');
    }

    // Validation de la longueur de l'adresse
    if (address.trim().length < 5) {
      throw new Error('INVALID_FORMAT: Address too short');
    }
  }

  /**
   * Détermine si une erreur justifie un retry
   */
  private static isRetryableError(error: any): boolean {
    const retryableErrors = ['NETWORK_ERROR', 'TIMEOUT', 'HTTP_500', 'HTTP_502', 'HTTP_503'];
    return retryableErrors.includes(error.message);
  }

  /**
   * Gestion du cache
   */
  private static getFromCache(query: string): GeocodingResult | null {
    const cacheKey = this.generateCacheKey(query);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.result;
  }

  private static setCache(query: string, result: GeocodingResult): void {
    const cacheKey = this.generateCacheKey(query);
    const expiresAt = Date.now() + this.config.cacheDurationMs;

    this.cache.set(cacheKey, { result, expiresAt });

    // Nettoyage périodique du cache (max 1000 entrées)
    if (this.cache.size > 1000) {
      const oldestKeys = Array.from(this.cache.keys()).slice(0, 100);
      oldestKeys.forEach(key => this.cache.delete(key));
    }
  }

  private static generateCacheKey(query: string): string {
    // Simple hash pour la clé de cache
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Utilitaires
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static recordMetric(metric: AddressValidationMetrics): void {
    this.metrics.push(metric);

    // Garder seulement les 1000 dernières métriques
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
  }

  /**
   * API publique pour les statistiques
   */
  static getMetrics(): AddressValidationMetrics[] {
    return [...this.metrics];
  }

  static getSuccessRate(): number {
    if (this.metrics.length === 0) return 0;
    const successful = this.metrics.filter(m => m.success).length;
    return successful / this.metrics.length;
  }

  static getAverageResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, m) => sum + m.responseTimeMs, 0);
    return total / this.metrics.length;
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static clearMetrics(): void {
    this.metrics.length = 0;
  }
}
// lib/services/profileService.ts
import { supabase } from '../supabase';
import { GeocodingService } from './geocodingService';
import type { 
  EnrichedAddressData, 
  GeocodingResult 
} from '../../types/address';

/**
 * Service de gestion des profils utilisateur avec support de la géolocalisation
 */
export class ProfileService {
  
  /**
   * Crée ou met à jour un profil utilisateur
   */
  static async upsertProfile(
    userId: string,
    profileData: any,
    options: {
      enrichWithGeolocation?: boolean;
      forceGeolocationUpdate?: boolean;
      skipGeolocationErrors?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    profile?: any;
    error?: string;
    geolocationResult?: GeocodingResult;
  }> {
    const {
      enrichWithGeolocation = true,
      forceGeolocationUpdate = false,
      skipGeolocationErrors = true
    } = options;

    try {
      let enrichedData = { ...profileData };

      // Enrichissement avec géolocalisation si demandé
      if (enrichWithGeolocation && profileData.address && profileData.postal_code && profileData.city) {
        const geoEnrichment = await this.enrichProfileWithGeolocation(
          profileData,
          {
            forceValidation: forceGeolocationUpdate,
            skipOnError: skipGeolocationErrors,
            userId
          }
        );
        
        enrichedData = geoEnrichment.profileData;
        
        // Retourner l'erreur si la géolocalisation a échoué et qu'on ne doit pas l'ignorer
        if (!skipGeolocationErrors && !geoEnrichment.success) {
          return {
            success: false,
            error: geoEnrichment.error || 'Geolocation failed'
          };
        }
      }

      // Sauvegarde du profil
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            ...enrichedData,
            user_id: userId,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id',
            ignoreDuplicates: false
          }
        )
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        profile: data
      };

    } catch (error: any) {
      console.error('Error upserting profile:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Récupère un profil par user_id
   */
  static async getProfile(
    userId: string,
    options: {
      includeGeolocation?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    profile?: any;
    error?: string;
  }> {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const { data, error } = await query;

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Profile not found'
          };
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        profile: data
      };

    } catch (error: any) {
      console.error('Error fetching profile:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Enrichit les données de profil avec la géolocalisation
   */
  static async enrichProfileWithGeolocation(
    profileData: any,
    options: {
      forceValidation?: boolean;
      skipOnError?: boolean;
      userId?: string;
    } = {}
  ): Promise<{
    success: boolean;
    profileData: any;
    geolocationResult?: GeocodingResult;
    error?: string;
  }> {
    const { forceValidation = false, skipOnError = true, userId } = options;

    // Vérifier si les données d'adresse sont présentes
    if (!profileData.address || !profileData.postal_code || !profileData.city) {
      console.warn('Incomplete address data for geolocation');
      return {
        success: skipOnError,
        profileData,
        error: 'Incomplete address data'
      };
    }

    try {
      // Vérifier si on a déjà des coordonnées valides
      const hasExistingCoordinates = 
        profileData.latitude && 
        profileData.longitude && 
        profileData.address_validated_at;

      if (!forceValidation && hasExistingCoordinates) {
        // Vérifier si les coordonnées ne sont pas trop anciennes (> 30 jours)
        const validatedAt = new Date(profileData.address_validated_at);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        if (validatedAt > thirtyDaysAgo) {
          console.log('Existing GPS coordinates are recent, no revalidation needed');
          return {
            success: true,
            profileData
          };
        }
      }

      console.log('Geolocating profile address...');

      // Appel au service de géocodage
      const geoResult = await GeocodingService.validateAndGeocode(
        profileData.address,
        profileData.postal_code,
        profileData.city
      );

      if (geoResult.success && geoResult.coordinates) {
        // Enrichir les données du profil avec les informations de géolocalisation
        const enrichedData = {
          ...profileData,
          latitude: geoResult.coordinates.latitude,
          longitude: geoResult.coordinates.longitude,
          formatted_address: geoResult.formattedAddress || null,
          address_confidence: geoResult.confidence || null,
          address_validated_at: geoResult.validatedAt.toISOString(),
          address_validation_source: geoResult.source,
          address_validation_error: null // Clear any previous errors
        };

        console.log('Profile enriched with geolocation:', {
          hasCoordinates: true,
          confidence: geoResult.confidence,
          formattedAddress: geoResult.formattedAddress?.substring(0, 50) + '...'
        });

        return {
          success: true,
          profileData: enrichedData,
          geolocationResult: geoResult
        };

      } else {
        console.warn('Geolocation failed:', geoResult.error?.message);

        const errorData = {
          ...profileData,
          address_validation_attempted_at: new Date().toISOString(),
          address_validation_error: geoResult.error?.message || 'Validation failed'
        };

        if (skipOnError) {
          return {
            success: true, // Continue despite geolocation failure
            profileData: errorData,
            error: geoResult.error?.message
          };
        } else {
          return {
            success: false,
            profileData: errorData,
            error: geoResult.error?.message || 'Address validation failed'
          };
        }
      }

    } catch (error: any) {
      console.error('Error during profile geographic enrichment:', error);

      const errorData = {
        ...profileData,
        address_validation_attempted_at: new Date().toISOString(),
        address_validation_error: error.message || 'Geocoding service error'
      };

      if (skipOnError) {
        return {
          success: true, // Continue despite error
          profileData: errorData,
          error: error.message
        };
      } else {
        return {
          success: false,
          profileData: errorData,
          error: error.message || 'Geocoding service error'
        };
      }
    }
  }

  /**
   * Valide une adresse avant la sauvegarde
   */
  static async validateProfileAddress(
    address: string,
    postalCode: string,
    city: string,
    userId?: string
  ): Promise<{
    isValid: boolean;
    coordinates?: { latitude: number; longitude: number };
    formattedAddress?: string;
    confidence?: number;
    error?: string;
  }> {
    try {
      console.log('Validating address for profile...');

      const result = await GeocodingService.validateAndGeocode(address, postalCode, city);

      if (result.success) {
        return {
          isValid: true,
          coordinates: result.coordinates,
          formattedAddress: result.formattedAddress,
          confidence: result.confidence
        };
      } else {
        return {
          isValid: false,
          error: result.error?.message || 'Address validation failed'
        };
      }

    } catch (error: any) {
      console.error('Error validating profile address:', error);
      return {
        isValid: false,
        error: error.message || 'Validation service error'
      };
    }
  }

  /**
   * Met à jour la géolocalisation d'un profil existant
   */
  static async updateProfileGeolocation(
    userId: string,
    forceUpdate: boolean = false
  ): Promise<{
    success: boolean;
    coordinates?: { latitude: number; longitude: number };
    error?: string;
  }> {
    try {
      // Récupérer les données actuelles du profil
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('address, postal_code, city, latitude, longitude, address_validated_at')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch profile: ${fetchError.message}`);
      }

      if (!profile.address || !profile.postal_code || !profile.city) {
        return {
          success: false,
          error: 'Incomplete address information in profile'
        };
      }

      // Vérifier si une mise à jour est nécessaire
      if (!forceUpdate && profile.latitude && profile.longitude) {
        const validatedAt = profile.address_validated_at ? 
          new Date(profile.address_validated_at) : null;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        if (validatedAt && validatedAt > sevenDaysAgo) {
          return {
            success: true,
            coordinates: {
              latitude: profile.latitude,
              longitude: profile.longitude
            }
          };
        }
      }

      // Géolocaliser l'adresse
      const geoResult = await GeocodingService.validateAndGeocode(
        profile.address,
        profile.postal_code,
        profile.city
      );

      if (!geoResult.success || !geoResult.coordinates) {
        return {
          success: false,
          error: geoResult.error?.message || 'Geocoding failed'
        };
      }

      // Mettre à jour le profil avec les nouvelles coordonnées
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          latitude: geoResult.coordinates.latitude,
          longitude: geoResult.coordinates.longitude,
          formatted_address: geoResult.formattedAddress,
          address_confidence: geoResult.confidence,
          address_validated_at: geoResult.validatedAt.toISOString(),
          address_validation_source: geoResult.source,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      console.log(`Geolocation updated for user ${userId}`);

      return {
        success: true,
        coordinates: geoResult.coordinates
      };

    } catch (error: any) {
      console.error(`Error updating profile geolocation for ${userId}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Calcule la distance entre deux profils géolocalisés
   */
  static calculateDistanceBetweenProfiles(
    profile1: { latitude: number; longitude: number },
    profile2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Rayon de la Terre en kilomètres

    const lat1Rad = (profile1.latitude * Math.PI) / 180;
    const lat2Rad = (profile2.latitude * Math.PI) / 180;
    const deltaLatRad = ((profile2.latitude - profile1.latitude) * Math.PI) / 180;
    const deltaLonRad = ((profile2.longitude - profile1.longitude) * Math.PI) / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en kilomètres
  }

  /**
   * Trouve les profils Fourmiz dans un rayon donné
   */
  static async findNearbyFourmiz(
    centerLatitude: number,
    centerLongitude: number,
    radiusKm: number = 10,
    excludeUserId?: string,
    options: {
      limit?: number;
      minConfidence?: number;
      includeProfile?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    fourmiz: Array<{
      user_id: string;
      distance: number;
      profile?: any;
    }>;
    error?: string;
  }> {
    const { 
      limit = 50, 
      minConfidence = 0.5, 
      includeProfile = true 
    } = options;

    try {
      // Calcul approximatif des bornes géographiques
      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / (111 * Math.cos((centerLatitude * Math.PI) / 180));

      let selectClause = includeProfile 
        ? `user_id, firstname, lastname, latitude, longitude, address, city, roles, avatar_url, address_confidence`
        : `user_id, latitude, longitude, address_confidence`;

      let query = supabase
        .from('profiles')
        .select(selectClause)
        .contains('roles', ['fourmiz'])
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .gte('latitude', centerLatitude - latDelta)
        .lte('latitude', centerLatitude + latDelta)
        .gte('longitude', centerLongitude - lngDelta)
        .lte('longitude', centerLongitude + lngDelta);

      if (excludeUserId) {
        query = query.neq('user_id', excludeUserId);
      }

      if (minConfidence > 0) {
        query = query.gte('address_confidence', minConfidence);
      }

      query = query.limit(limit);

      const { data: profiles, error } = await query;

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      if (!profiles || profiles.length === 0) {
        return { success: true, fourmiz: [] };
      }

      // Calcul précis des distances et filtrage
      const fourmizWithDistance = profiles
        .map(profile => ({
          user_id: profile.user_id,
          distance: this.calculateDistanceBetweenProfiles(
            { latitude: centerLatitude, longitude: centerLongitude },
            { latitude: profile.latitude, longitude: profile.longitude }
          ),
          ...(includeProfile && { profile })
        }))
        .filter(item => item.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);

      return {
        success: true,
        fourmiz: fourmizWithDistance
      };

    } catch (error: any) {
      console.error('Error searching nearby Fourmiz:', error);
      return {
        success: false,
        fourmiz: [],
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Batch update pour géolocaliser plusieurs profils
   */
  static async batchUpdateProfilesGeolocation(
    userIds: string[],
    options: { 
      concurrency?: number; 
      skipErrors?: boolean;
      progressCallback?: (completed: number, total: number) => void;
    } = {}
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    const { 
      concurrency = 5, 
      skipErrors = true,
      progressCallback 
    } = options;

    const results = {
      total: userIds.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ userId: string; error: string }>
    };

    // Traitement par batch pour éviter de surcharger l'API
    const chunks = [];
    for (let i = 0; i < userIds.length; i += concurrency) {
      chunks.push(userIds.slice(i, i + concurrency));
    }

    let completed = 0;

    for (const chunk of chunks) {
      const promises = chunk.map(async (userId) => {
        try {
          const result = await this.updateProfileGeolocation(userId, false);
          if (result.success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push({
              userId,
              error: result.error || 'Unknown error'
            });
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            userId,
            error: error.message || 'Exception occurred'
          });
        }

        completed++;
        if (progressCallback) {
          progressCallback(completed, results.total);
        }
      });

      await Promise.all(promises);

      // Délai entre les batches pour respecter les rate limits
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('Batch geolocation update completed:', results);
    return results;
  }

  /**
   * Récupère les statistiques de géolocalisation
   */
  static async getGeolocationStats(): Promise<{
    success: boolean;
    stats?: {
      totalProfiles: number;
      geolocalizedProfiles: number;
      geolocationRate: number;
      avgConfidence: number;
      highConfidenceCount: number;
      recentlyValidatedCount: number;
      fourmizGeolocalizedCount: number;
    };
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('geolocation_stats')
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to fetch stats: ${error.message}`);
      }

      return {
        success: true,
        stats: {
          totalProfiles: data.total_profiles,
          geolocalizedProfiles: data.geolocalized_profiles,
          geolocationRate: data.geolocation_rate_percent,
          avgConfidence: data.avg_confidence,
          highConfidenceCount: data.high_confidence_count,
          recentlyValidatedCount: data.recently_validated_count,
          fourmizGeolocalizedCount: data.fourmiz_geolocalized
        }
      };

    } catch (error: any) {
      console.error('Error fetching geolocation stats:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Nettoie les anciennes tentatives de validation échouées
   */
  static async cleanupFailedValidations(
    olderThanDays: number = 30
  ): Promise<{
    success: boolean;
    cleanedCount?: number;
    error?: string;
  }> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          address_validation_error: null,
          address_validation_attempted_at: null
        })
        .lt('address_validation_attempted_at', cutoffDate.toISOString())
        .not('address_validation_error', 'is', null)
        .select('user_id');

      if (error) {
        throw new Error(`Cleanup failed: ${error.message}`);
      }

      return {
        success: true,
        cleanedCount: data?.length || 0
      };

    } catch (error: any) {
      console.error('Error cleaning up failed validations:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }
}

// Fonctions utilitaires exportées pour compatibilité
export const enrichProfileWithGeolocation = ProfileService.enrichProfileWithGeolocation.bind(ProfileService);
export const validateProfileAddress = ProfileService.validateProfileAddress.bind(ProfileService);
export const updateProfileGeolocation = ProfileService.updateProfileGeolocation.bind(ProfileService);
export const calculateDistanceBetweenProfiles = ProfileService.calculateDistanceBetweenProfiles.bind(ProfileService);
export const findNearbyFourmiz = ProfileService.findNearbyFourmiz.bind(ProfileService);
export const batchUpdateProfilesGeolocation = ProfileService.batchUpdateProfilesGeolocation.bind(ProfileService);
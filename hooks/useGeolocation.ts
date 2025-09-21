// hooks/useGeolocation.ts
import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '../lib/database.types';

// Types pour la géolocalisation
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeolocationData {
  coordinates: Coordinates;
  formattedAddress: string;
  confidence: number;
  validatedAt: Date;
}

export interface FourmizNearby {
  userId: string;
  firstname: string;
  lastname: string;
  distanceKm: number;
  coordinates: Coordinates;
  address: string;
  formattedAddress?: string;
  confidence?: number;
  avatarUrl?: string;
  roles: string[];
}

export interface SearchLocation {
  coordinates: Coordinates;
  address: string;
  radiusMeters: number;
}

export interface GeolocationStats {
  totalProfiles: number;
  profilesWithCoordinates: number;
  fourmizWithCoordinates: number;
  clientsWithCoordinates: number;
  avgAddressConfidence: number | null;
  validatedAddresses: number;
  coveragePercentage: number;
}

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

  // Rechercher les Fourmiz à proximité avec la fonction SQL corrigée
  const findNearbyFourmiz = useCallback(async (
    searchLocation: SearchLocation,
    limitResults: number = 20
  ): Promise<FourmizNearby[]> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Recherche Fourmiz à proximité:', {
        position: searchLocation.coordinates,
        radiusKm: searchLocation.radiusMeters / 1000,
        limit: limitResults
      });

      const { data, error: searchError } = await supabase.rpc('find_fourmiz_nearby_complete', {
        search_lat: searchLocation.coordinates.latitude,
        search_lon: searchLocation.coordinates.longitude,
        radius_km: searchLocation.radiusMeters / 1000, // Convertir mètres en km
        max_results: limitResults
      });

      if (searchError) {
        console.error('❌ Erreur recherche Fourmiz:', searchError);
        throw new Error(`Erreur de recherche: ${searchError.message}`);
      }

      if (!data) {
        console.log('ℹ️ Aucun Fourmiz trouvé dans la zone');
        return [];
      }

      const results: FourmizNearby[] = data.map(item => ({
        userId: item.user_id,
        firstname: item.firstname,
        lastname: item.lastname,
        distanceKm: parseFloat(item.distance_km.toString()),
        coordinates: {
          latitude: parseFloat(item.latitude.toString()),
          longitude: parseFloat(item.longitude.toString())
        },
        address: item.address || '',
        formattedAddress: item.formatted_address || undefined,
        confidence: item.address_confidence ? parseFloat(item.address_confidence.toString()) : undefined,
        avatarUrl: item.avatar_url || undefined,
        roles: item.roles || []
      }));

      console.log(`✅ ${results.length} Fourmiz trouvés dans un rayon de ${searchLocation.radiusMeters / 1000}km`);
      return results;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de recherche géospatiale';
      console.error('❌ Erreur findNearbyFourmiz:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Alternative avec fonction filtrée (plus simple)
  const findNearbyFourmizSimple = useCallback(async (
    searchLocation: SearchLocation,
    limitResults: number = 20
  ): Promise<FourmizNearby[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: searchError } = await supabase.rpc('find_fourmiz_nearby_filtered', {
        search_lat: searchLocation.coordinates.latitude,
        search_lon: searchLocation.coordinates.longitude,
        radius_km: searchLocation.radiusMeters / 1000,
        max_results: limitResults
      });

      if (searchError) {
        throw new Error(`Erreur de recherche: ${searchError.message}`);
      }

      const results: FourmizNearby[] = (data || []).map(item => ({
        userId: item.user_id,
        firstname: item.firstname,
        lastname: item.lastname,
        distanceKm: parseFloat(item.distance_km.toString()),
        coordinates: {
          latitude: parseFloat(item.latitude.toString()),
          longitude: parseFloat(item.longitude.toString())
        },
        address: '', // Version simple n'inclut pas l'adresse
        roles: ['fourmiz'] // Assumé car recherche spécifique
      }));

      return results;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de recherche géospatiale';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Obtenir les statistiques de géolocalisation
  const getGeolocationStats = useCallback(async (): Promise<GeolocationStats> => {
    setLoading(true);
    setError(null);
    
    try {
      // Requête directe car la vue pourrait ne pas exister
      const { data, error: statsError } = await supabase
        .from('profiles')
        .select('latitude, longitude, roles, address_confidence, address_validated_at');

      if (statsError) {
        throw new Error(`Erreur statistiques: ${statsError.message}`);
      }

      const totalProfiles = data.length;
      const profilesWithCoordinates = data.filter(p => p.latitude && p.longitude).length;
      const fourmizWithCoordinates = data.filter(p => 
        p.latitude && p.longitude && p.roles?.includes('fourmiz')
      ).length;
      const clientsWithCoordinates = data.filter(p => 
        p.latitude && p.longitude && p.roles?.includes('client')
      ).length;
      const validatedAddresses = data.filter(p => p.address_validated_at).length;
      
      const confidences = data
        .filter(p => p.address_confidence)
        .map(p => parseFloat(p.address_confidence.toString()));
      
      const avgAddressConfidence = confidences.length > 0 
        ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
        : null;

      const stats: GeolocationStats = {
        totalProfiles,
        profilesWithCoordinates,
        fourmizWithCoordinates,
        clientsWithCoordinates,
        avgAddressConfidence,
        validatedAddresses,
        coveragePercentage: totalProfiles > 0 
          ? Math.round((profilesWithCoordinates / totalProfiles) * 100)
          : 0
      };

      return stats;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de récupération des statistiques';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Calculer la distance entre deux points (utilise la fonction SQL)
  const calculateDistance = useCallback(async (
    point1: Coordinates,
    point2: Coordinates
  ): Promise<number> => {
    try {
      const { data, error: distanceError } = await supabase.rpc('calculate_distance_simple', {
        lat1: point1.latitude,
        lon1: point1.longitude,
        lat2: point2.latitude,
        lon2: point2.longitude
      });

      if (distanceError) {
        throw new Error(`Erreur calcul distance: ${distanceError.message}`);
      }

      return parseFloat(data.toString());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de calcul de distance';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [supabase]);

  // Obtenir la position actuelle de l'utilisateur
  const getCurrentPosition = useCallback((): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée par ce navigateur'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          let errorMessage = 'Erreur de géolocalisation';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permission de géolocalisation refusée';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Position non disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Délai de géolocalisation dépassé';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }, []);

  return {
    loading,
    error,
    findNearbyFourmiz,
    findNearbyFourmizSimple,
    getGeolocationStats,
    calculateDistance,
    getCurrentPosition
  };
}

// Hook utilitaire pour formater les résultats
export function useGeolocationFormatter() {
  const formatDistance = useCallback((distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`;
    } else {
      return `${Math.round(distanceKm)}km`;
    }
  }, []);

  const formatFourmizName = useCallback((fourmiz: FourmizNearby): string => {
    return `${fourmiz.firstname} ${fourmiz.lastname}`.trim();
  }, []);

  const formatFourmizSummary = useCallback((fourmiz: FourmizNearby): string => {
    const name = formatFourmizName(fourmiz);
    const distance = formatDistance(fourmiz.distanceKm);
    return `${name} (${distance})`;
  }, [formatFourmizName, formatDistance]);

  return {
    formatDistance,
    formatFourmizName,
    formatFourmizSummary
  };
}
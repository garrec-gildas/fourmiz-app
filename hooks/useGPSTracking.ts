// hooks/useGPSTracking.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/supabase-js';
import * as Location from 'expo-location';
import { AppState, Alert } from 'react-native';
import type { Database } from '../lib/database.types';

interface TrackingSession {
  id: string;
  serviceId: string;
  serviceType: 'delivery' | 'dog_walking' | 'transport' | 'assistance';
  clientUserId: string;
  fourmizUserId: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  startedAt: Date;
  estimatedEndAt: Date;
  updateIntervalSeconds: number;
}

interface CurrentPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

interface ServicePosition {
  trackingId: string;
  latitude: number;
  longitude: number;
  lastUpdate: Date;
  status: string;
  totalDistanceKm: number;
  fourmizName: string;
  serviceType: string;
}

export function useGPSTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentSession, setCurrentSession] = useState<TrackingSession | null>(null);
  const [currentPosition, setCurrentPosition] = useState<CurrentPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'pending'>('pending');
  
  const supabase = createClientComponentClient<Database>();
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchPositionRef = useRef<Location.LocationSubscription | null>(null);

  // Demander les permissions de géolocalisation
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setPermissionStatus('granted');
        return true;
      } else {
        setPermissionStatus('denied');
        setError('Permission de géolocalisation refusée');
        return false;
      }
    } catch (err) {
      setError('Erreur lors de la demande de permission');
      return false;
    }
  }, []);

  // Démarrer un nouveau tracking
  const startTracking = useCallback(async (
    serviceId: string,
    serviceType: TrackingSession['serviceType'],
    clientUserId: string,
    estimatedDurationMinutes: number = 60
  ): Promise<boolean> => {
    try {
      // Vérifier les permissions
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return false;

      // Obtenir la position initiale
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation
      });

      const { latitude, longitude } = location.coords;

      // Démarrer le tracking en base
      const { data: trackingId, error: trackingError } = await supabase.rpc('start_service_tracking', {
        p_service_id: serviceId,
        p_fourmiz_user_id: supabase.auth.user?.id,
        p_client_user_id: clientUserId,
        p_service_type: serviceType,
        p_start_latitude: latitude,
        p_start_longitude: longitude,
        p_estimated_duration_minutes: estimatedDurationMinutes
      });

      if (trackingError) {
        throw new Error(`Erreur démarrage tracking: ${trackingError.message}`);
      }

      // Créer la session
      const session: TrackingSession = {
        id: trackingId,
        serviceId,
        serviceType,
        clientUserId,
        fourmizUserId: supabase.auth.user?.id || '',
        status: 'active',
        startedAt: new Date(),
        estimatedEndAt: new Date(Date.now() + estimatedDurationMinutes * 60000),
        updateIntervalSeconds: 30
      };

      setCurrentSession(session);
      setIsTracking(true);

      // Démarrer le suivi de position
      await startPositionTracking(trackingId, session.updateIntervalSeconds);

      return true;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur démarrage tracking');
      return false;
    }
  }, [supabase, requestLocationPermission]);

  // Suivi de position en continu
  const startPositionTracking = useCallback(async (
    trackingId: string,
    intervalSeconds: number
  ) => {
    try {
      // Suivi de position en continu avec haute précision
      watchPositionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: intervalSeconds * 1000,
          distanceInterval: 10, // Mise à jour tous les 10 mètres minimum
        },
        async (location) => {
          const position: CurrentPosition = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            timestamp: new Date(location.timestamp)
          };

          setCurrentPosition(position);

          // Envoyer la position à la base de données
          const { error } = await supabase.rpc('update_gps_position', {
            p_tracking_id: trackingId,
            p_latitude: position.latitude,
            p_longitude: position.longitude,
            p_accuracy_meters: Math.round(position.accuracy)
          });

          if (error) {
            console.warn('Erreur mise à jour position:', error);
          }
        }
      );

    } catch (err) {
      setError('Erreur suivi position: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  }, [supabase]);

  // Arrêter le tracking
  const stopTracking = useCallback(async (): Promise<boolean> => {
    try {
      if (!currentSession) return false;

      // Obtenir la position finale
      let finalPosition: CurrentPosition | null = null;
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        finalPosition = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || 0,
          timestamp: new Date()
        };
      } catch (err) {
        console.warn('Position finale non obtenue:', err);
      }

      // Arrêter le tracking en base
      const { error } = await supabase.rpc('stop_service_tracking', {
        p_tracking_id: currentSession.id,
        p_final_latitude: finalPosition?.latitude,
        p_final_longitude: finalPosition?.longitude
      });

      if (error) {
        throw new Error(`Erreur arrêt tracking: ${error.message}`);
      }

      // Nettoyer les ressources
      if (watchPositionRef.current) {
        watchPositionRef.current.remove();
        watchPositionRef.current = null;
      }

      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }

      setCurrentSession(null);
      setIsTracking(false);
      setCurrentPosition(null);

      return true;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur arrêt tracking');
      return false;
    }
  }, [currentSession, supabase]);

  // Mettre en pause/reprendre
  const pauseTracking = useCallback(async (): Promise<boolean> => {
    if (!currentSession) return false;

    if (watchPositionRef.current) {
      watchPositionRef.current.remove();
      watchPositionRef.current = null;
    }

    setCurrentSession({ ...currentSession, status: 'paused' });
    return true;
  }, [currentSession]);

  const resumeTracking = useCallback(async (): Promise<boolean> => {
    if (!currentSession) return false;

    await startPositionTracking(currentSession.id, currentSession.updateIntervalSeconds);
    setCurrentSession({ ...currentSession, status: 'active' });
    return true;
  }, [currentSession, startPositionTracking]);

  // Nettoyer les ressources à la fermeture de l'app
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' && isTracking) {
        // En arrière-plan, on peut réduire la fréquence de mise à jour
        // ou utiliser la géolocalisation en arrière-plan
        console.log('App en arrière-plan, tracking continue...');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      if (watchPositionRef.current) {
        watchPositionRef.current.remove();
      }
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, [isTracking]);

  return {
    isTracking,
    currentSession,
    currentPosition,
    error,
    permissionStatus,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    requestLocationPermission
  };
}

// Hook pour suivre un service en tant que client
export function useServiceTracking(serviceId: string) {
  const [servicePosition, setServicePosition] = useState<ServicePosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClientComponentClient<Database>();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Récupérer la position actuelle du service
  const fetchServicePosition = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase.rpc('get_service_current_position', {
        p_service_id: serviceId
      });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (data && data.length > 0) {
        const position = data[0];
        setServicePosition({
          trackingId: position.tracking_id,
          latitude: parseFloat(position.latitude.toString()),
          longitude: parseFloat(position.longitude.toString()),
          lastUpdate: new Date(position.last_update),
          status: position.status,
          totalDistanceKm: parseFloat(position.total_distance_km.toString()),
          fourmizName: position.fourmiz_name,
          serviceType: position.service_type
        });
      } else {
        setServicePosition(null);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur récupération position');
    } finally {
      setLoading(false);
    }
  }, [serviceId, supabase]);

  // Démarrer le polling automatique
  const startPolling = useCallback((intervalSeconds: number = 15) => {
    fetchServicePosition(); // Premier appel immédiat
    
    pollingIntervalRef.current = setInterval(() => {
      fetchServicePosition();
    }, intervalSeconds * 1000);
  }, [fetchServicePosition]);

  // Arrêter le polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Nettoyer au démontage
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    servicePosition,
    loading,
    error,
    fetchServicePosition,
    startPolling,
    stopPolling
  };
}

// Hook pour l'historique du parcours
export function useRouteHistory(trackingId: string) {
  const [routeData, setRouteData] = useState<{
    points: Array<{lat: number, lng: number, timestamp: string}>;
    totalDistance: number;
    duration: number;
    serviceType: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  
  const supabase = createClientComponentClient<Database>();

  const fetchRouteHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_service_route_history', {
        p_tracking_id: trackingId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const route = data[0];
        setRouteData({
          points: route.route_points || [],
          totalDistance: parseFloat(route.total_distance_km.toString()),
          duration: route.duration_minutes,
          serviceType: route.service_type
        });
      }
    } catch (err) {
      console.error('Erreur chargement historique:', err);
    } finally {
      setLoading(false);
    }
  }, [trackingId, supabase]);

  useEffect(() => {
    if (trackingId) {
      fetchRouteHistory();
    }
  }, [trackingId, fetchRouteHistory]);

  return { routeData, loading, refetch: fetchRouteHistory };
}
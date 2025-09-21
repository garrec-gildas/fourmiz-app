// app/(tabs)/available-orders.tsx - VERSION CORRIGÉE COMPLÈTE
// Fonctionnalités GPS conservées mais interface et logs supprimés
// MISE À JOUR: Suppression prix/durée des candidatures + Gestion candidatures existantes

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  Platform,
  Modal,
  AppState,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';

// Interface avec structure réelle de Supabase + nouveaux champs de la vue
interface AvailableOrder {
  id: number;
  service_id?: number;
  client_id: string;
  service_title?: string;
  description: string;
  address: string;
  addresses?: {
    category?: string;
    categorie?: string;
    main_address?: string;
    city?: string;
    postal_code?: string;
    arrival_address?: string;
    departure_address?: string;
    delivery_address?: string;
    pickup_address?: string;
    arrival_city?: string;
    arrival_postal_code?: string;
  };
  postal_code: string;
  city: string;
  date: string;
  start_time: string;
  end_time?: string;
  duration?: string;
  phone: string;
  urgent: boolean;
  urgency_level: string;
  proposed_amount: number;
  status: string;
  created_at: string;
  workflow_type?: 'direct' | 'candidatures';
  
  services_title?: string;
  services_categorie?: string;
  profile_client_rating?: number;
  firstname?: string;
  lastname?: string;
  avatar_url?: string;
  
  client_profile?: {
    firstname: string;
    lastname: string;
    avatar_url?: string;
    rating?: number;
    latitude?: number;
    longitude?: number;
    city?: string;
  };
  
  services?: {
    title: string;
    categorie: string;
    workflow_type?: 'direct' | 'candidatures';
  };
}

interface AdminSettings {
  fourmiz_earning_percentage: number;
}

// Cache des distances
interface DistanceCache {
  distance: number;
  timestamp: number;
}

// Configuration GPS
const GPS_CONFIG = {
  refreshIntervalMs: 30000,
  minMovementForRefreshKm: 0.1,
  distanceCacheTTL: 5 * 60 * 1000,
  highAccuracyTimeout: 10000,
  balancedAccuracyTimeout: 5000,
};

export default function AvailableOrdersScreen() {
  // États principaux
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Protection contre les appels multiples
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({ 
    fourmiz_earning_percentage: 0
  });

  // États de filtrage
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'urgency' | 'duration' | 'client_type' | 'distance' | 'publication_date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // États GPS
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [lastLocationRefresh, setLastLocationRefresh] = useState<Date | null>(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState<boolean>(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [distanceCache, setDistanceCache] = useState<Map<number, DistanceCache>>(new Map());

  // États pour candidatures - CORRIGÉ
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AvailableOrder | null>(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [submittingApplication, setSubmittingApplication] = useState(false);

  // NOUVEAUX ÉTATS pour tracking des candidatures
  const [userApplications, setUserApplications] = useState<Map<number, string>>(new Map());
  const [loadingApplications, setLoadingApplications] = useState(false);

  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce pour la recherche
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  // Déduplication des commandes
  const deduplicateOrders = useCallback((orders: AvailableOrder[]): AvailableOrder[] => {
    const seen = new Set<number>();
    const unique = orders.filter(order => {
      if (seen.has(order.id)) {
        return false;
      }
      seen.add(order.id);
      return true;
    });
    
    return unique;
  }, []);

  // Fonction pour charger les candidatures existantes avec leur statut
  const loadUserApplications = async () => {
    if (!currentUser?.id) return;

    try {
      setLoadingApplications(true);
      
      const { data, error } = await supabase
        .from('order_applications')
        .select('order_id, status')
        .eq('fourmiz_id', currentUser.id);

      if (error) {
        console.log('Erreur lors du chargement des candidatures:', error);
        return;
      }

      // Créer une Map avec order_id -> status
      const applicationsMap = new Map();
      data.forEach(app => {
        applicationsMap.set(app.order_id, app.status);
      });
      
      setUserApplications(applicationsMap);

    } catch (error) {
      console.log('Erreur loadUserApplications:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  // Fonction utilitaire pour vérifier le statut de candidature
  const getUserApplicationStatus = useCallback((orderId: number): { hasApplied: boolean, status: string | null } => {
    const status = userApplications.get(orderId);
    return {
      hasApplied: !!status,
      status: status || null
    };
  }, [userApplications]);

  // Déterminer le workflow d'une commande
  const getOrderWorkflow = useCallback((order: AvailableOrder): 'direct' | 'candidatures' => {
    if (order.workflow_type) {
      return order.workflow_type;
    }
    
    if (order.services?.workflow_type) {
      return order.services.workflow_type;
    }
    
    return 'direct';
  }, []);

  // Calcul distance simple
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (!lat1 || !lon1 || !lat2 || !lon2 || 
        typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
        typeof lat2 !== 'number' || typeof lon2 !== 'number') {
      return Infinity;
    }

    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    const roundedDistance = Math.round(distance * 10) / 10;
    return isNaN(roundedDistance) || roundedDistance < 0 ? Infinity : roundedDistance;
  }, []);

  // Récupération position utilisateur améliorée
  const getUserLocation = useCallback(async (forceRefresh = false): Promise<{latitude: number, longitude: number} | null> => {
    try {
      // Vérifier permissions
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        
        setLocationPermissionStatus(newStatus);
        
        if (newStatus !== 'granted') {
          const fallbackLocation = { latitude: 48.8566, longitude: 2.3522 };
          setUserLocation(fallbackLocation);
          return fallbackLocation;
        }
      } else {
        setLocationPermissionStatus('granted');
      }

      // Vérifier besoin refresh
      const now = Date.now();
      const lastRefresh = lastLocationRefresh?.getTime() || 0;
      const timeSinceRefresh = (now - lastRefresh) / 1000 / 60; // minutes
      
      if (!forceRefresh && userLocation && timeSinceRefresh < 5) {
        return userLocation;
      }

      // Essayer haute précision puis normale
      let location;
      try {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          maximumAge: 30000,
          timeout: GPS_CONFIG.highAccuracyTimeout,
        });
      } catch (highAccuracyError) {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          maximumAge: 60000,
          timeout: GPS_CONFIG.balancedAccuracyTimeout,
        });
      }

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };

      // Calculer mouvement
      if (userLocation && !forceRefresh) {
        const movementKm = calculateDistance(
          userLocation.latitude, userLocation.longitude,
          newLocation.latitude, newLocation.longitude
        );
        
        if (movementKm < GPS_CONFIG.minMovementForRefreshKm) {
          return userLocation;
        }
      }

      setUserLocation(newLocation);
      setLastLocationRefresh(new Date());
      
      return newLocation;
      
    } catch (error) {
      if (userLocation) {
        return userLocation;
      } else {
        const fallbackLocation = { latitude: 48.8566, longitude: 2.3522 };
        setUserLocation(fallbackLocation);
        return fallbackLocation;
      }
    }
  }, [userLocation, lastLocationRefresh, calculateDistance]);

  // Distance d'une commande avec cache
  const getOrderDistance = useCallback(async (order: AvailableOrder): Promise<number> => {
    if (!userLocation) {
      return Infinity;
    }

    // Vérifier cache
    const now = Date.now();
    const cached = distanceCache.get(order.id);
    if (cached && (now - cached.timestamp) < GPS_CONFIG.distanceCacheTTL) {
      return cached.distance;
    }

    try {
      // Vérifier coordonnées client
      const clientCoords = order.client_profile;
      if (!clientCoords?.latitude || !clientCoords?.longitude) {
        return Infinity;
      }

      // Calculer distance
      const distance = calculateDistance(
        userLocation.latitude, userLocation.longitude,
        clientCoords.latitude, clientCoords.longitude
      );

      // Mettre en cache
      setDistanceCache(prev => {
        const newCache = new Map(prev);
        newCache.set(order.id, { distance, timestamp: now });
        return newCache;
      });

      return distance;

    } catch (error) {
      return Infinity;
    }
  }, [userLocation, calculateDistance, distanceCache]);

  // Formatage distance
  const formatDistance = useCallback(async (order: AvailableOrder): Promise<string> => {
    const distance = await getOrderDistance(order);
    
    if (distance === Infinity || !userLocation) {
      return 'Distance inconnue';
    }
    
    if (distance < 0.1) {
      return '< 100m';
    } else if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)} km`;
    } else {
      return `${Math.round(distance)} km`;
    }
  }, [getOrderDistance, userLocation]);

  // Distance synchrone pour tri
  const getOrderDistanceSync = useCallback((order: AvailableOrder): number => {
    if (!userLocation || !order.client_profile?.latitude || !order.client_profile?.longitude) {
      return Infinity;
    }

    return calculateDistance(
      userLocation.latitude, userLocation.longitude,
      order.client_profile.latitude, order.client_profile.longitude
    );
  }, [userLocation, calculateDistance]);

  // Refresh automatique
  const refreshUserLocationAndData = useCallback(async (showLoading = false) => {
    if (isRefreshingLocation) {
      return;
    }

    if (showLoading) setIsRefreshingLocation(true);
    
    try {
      const newLocation = await getUserLocation(true);
      
      if (newLocation && currentUser) {
        await loadAvailableOrders();
      }
      
    } catch (error) {
      // Gérer l'erreur silencieusement
    } finally {
      if (showLoading) setIsRefreshingLocation(false);
    }
  }, [isRefreshingLocation, getUserLocation, currentUser]);

  // Surveillance GPS - Refresh automatique
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(() => {
      if (AppState.currentState === 'active' && currentUser) {
        refreshUserLocationAndData(false);
      }
    }, GPS_CONFIG.refreshIntervalMs);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [currentUser, refreshUserLocationAndData]);

  // Nettoyage cache
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setDistanceCache(prev => {
        const newCache = new Map();
        prev.forEach((value, key) => {
          if ((now - value.timestamp) < GPS_CONFIG.distanceCacheTTL) {
            newCache.set(key, value);
          }
        });
        return newCache;
      });
    }, GPS_CONFIG.distanceCacheTTL);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Catégorie avec debug
  const getOrderCategory = useCallback((order: AvailableOrder): string => {
    if (order.addresses?.categorie?.trim()) {
      return order.addresses.categorie.trim();
    }
    
    if (order.addresses?.category?.trim()) {
      return order.addresses.category.trim();
    }
    
    if (order.services_categorie?.trim()) {
      return order.services_categorie.trim();
    }
    
    if (order.services?.categorie?.trim()) {
      return order.services.categorie.trim();
    }
    
    return 'Autres';
  }, []);

  // Titre avec fallbacks robustes
  const getOrderTitle = useCallback((order: AvailableOrder): string => {
    if (order.service_title?.trim() && 
        order.service_title.trim() !== 'Service demandé' && 
        order.service_title.trim() !== 'Nom du service réel' &&
        order.service_title.trim() !== 'Service non spécifié') {
      return order.service_title.trim();
    }
    
    if (order.services_title?.trim() && 
        order.services_title.trim() !== 'Service demandé' && 
        order.services_title.trim() !== 'Nom du service réel' &&
        order.services_title.trim() !== 'Service non spécifié') {
      return order.services_title.trim();
    }
    
    if (order.services?.title?.trim() && 
        order.services.title.trim() !== 'Service demandé' && 
        order.services.title.trim() !== 'Nom du service réel' &&
        order.services.title.trim() !== 'Service non spécifié') {
      return order.services.title.trim();
    }
    
    const category = getOrderCategory(order);
    if (category && category !== 'Autres') {
      const generatedTitle = `Service ${category.toLowerCase()}`;
      return generatedTitle;
    }
    
    if (order.service_id) {
      const serviceIdTitle = `Service #${order.service_id}`;
      return serviceIdTitle;
    }
    
    if (order.description?.trim() && 
        order.description.trim() !== 'Description réelle de la demande' &&
        order.description.trim() !== 'Commande annulée sans détails') {
      const desc = order.description.trim();
      const words = desc.split(/\s+/).filter(word => word.length > 1);
      const title = words.slice(0, 3).join(' ');
      if (title.length > 0) {
        return title;
      }
    }
    
    const fallbackTitle = 'Mission à définir';
    return fallbackTitle;
  }, [getOrderCategory]);

  // Code postal
  const getOrderPostalCode = useCallback((order: AvailableOrder): string => {
    if (order.addresses?.postal_code?.trim()) {
      return order.addresses.postal_code.trim();
    }
    if (order.postal_code?.trim()) {
      return order.postal_code.trim();
    }
    return '';
  }, []);

  // Ville
  const getOrderCity = useCallback((order: AvailableOrder): string => {
    if (order.addresses?.city?.trim()) {
      return order.addresses.city.trim();
    }
    
    if (order.city?.trim()) {
      return order.city.trim();
    }
    
    if (order.client_profile?.city?.trim()) {
      return order.client_profile.city.trim();
    }
    
    return 'Ville non précisée';
  }, []);

  // Adresse
  const getOrderAddress = useCallback((order: AvailableOrder): string => {
    if (order.addresses?.main_address?.trim()) {
      return order.addresses.main_address.trim();
    }
    
    if (order.addresses?.departure_address?.trim()) {
      return order.addresses.departure_address.trim();
    }
    
    if (order.address?.trim()) {
      return order.address.trim();
    }
    
    return 'Adresse non spécifiée';
  }, []);

  // Description
  const getOrderDescription = useCallback((order: AvailableOrder): string => {
    if (order.description && order.description.trim()) {
      return order.description.trim();
    }
    
    return 'Description non fournie';
  }, []);

  // Durée
  const getOrderDuration = useCallback((order: AvailableOrder): string => {
    if (order.duration) {
      const duration = typeof order.duration === 'string' ? 
        parseInt(order.duration) : order.duration;
      
      if (!isNaN(duration) && duration > 0) {
        if (duration >= 60) {
          const hours = Math.floor(duration / 60);
          const minutes = duration % 60;
          return minutes > 0 ? `${hours}h${minutes.toString().padStart(2, '0')}` : `${hours}h`;
        }
        return `${duration} min`;
      }
    }
    
    if (order.start_time && order.end_time) {
      try {
        const [startH, startM] = order.start_time.split(':').map(Number);
        const [endH, endM] = order.end_time.split(':').map(Number);
        
        if (!isNaN(startH) && !isNaN(startM) && !isNaN(endH) && !isNaN(endM)) {
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;
          const durationMinutes = endMinutes - startMinutes;
          
          if (durationMinutes > 0) {
            if (durationMinutes >= 60) {
              const hours = Math.floor(durationMinutes / 60);
              const minutes = durationMinutes % 60;
              return minutes > 0 ? `${hours}h${minutes.toString().padStart(2, '0')}` : `${hours}h`;
            }
            return `${durationMinutes} min`;
          }
        }
      } catch (error) {
        // Gérer l'erreur silencieusement
      }
    }
    
    return 'À définir';
  }, []);

  // Montant fourmiz
  const getFourmizAmount = useCallback((order: AvailableOrder): string => {
    try {
      const baseAmount = order.proposed_amount || 0;
      if (baseAmount <= 0) return '0.00€';
      
      const fourmizAmount = (baseAmount * adminSettings.fourmiz_earning_percentage) / 100;
      return `${fourmizAmount.toFixed(2)}€`;
    } catch (error) {
      return '0.00€';
    }
  }, [adminSettings.fourmiz_earning_percentage]);

  // Nom client
  const getClientDisplayName = useCallback((order: AvailableOrder): string => {
    const firstname = order.firstname?.trim() || order.client_profile?.firstname?.trim();
    const lastname = order.lastname?.trim() || order.client_profile?.lastname?.trim();

    if (firstname?.length > 0) {
      return firstname;
    }
    
    if (lastname?.length > 0) {
      return lastname;
    }
    
    return 'Client';
  }, []);

  // Avatar client
  const getClientAvatar = useCallback((order: AvailableOrder): string | null => {
    return order.avatar_url || order.client_profile?.avatar_url || null;
  }, []);

  // Rating client
  const getClientRating = useCallback((order: AvailableOrder): number | null => {
    if (order.profile_client_rating && order.profile_client_rating > 0) {
      return order.profile_client_rating;
    }

    if (order.client_profile?.rating && order.client_profile.rating > 0) {
      return order.client_profile.rating;
    }
    
    return null;
  }, []);

  // Formatage temps
  const formatTimeAgo = useCallback((createdAt: string): string => {
    try {
      const now = Date.now();
      const created = new Date(createdAt).getTime();
      const diffMinutes = Math.floor((now - created) / 60000);
      
      if (diffMinutes < 1) return 'À l\'instant';
      if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
      if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        return `Il y a ${hours}h`;
      }
      const days = Math.floor(diffMinutes / 1440);
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    } catch (error) {
      return 'Récemment';
    }
  }, []);

  // Filtrage avec GPS - CORRIGÉ
  const filteredOrders = useMemo(() => {
    if (orders.length === 0) {
      return [];
    }

    let filtered = [...orders];

    // NOUVEAU FILTRE : Exclure les missions avec candidatures acceptées/refusées
    filtered = filtered.filter(order => {
      const { hasApplied, status } = getUserApplicationStatus(order.id);
      
      if (!hasApplied) {
        // Pas de candidature = mission disponible
        return true;
      }
      
      // Si candidature existe, garder seulement si "en_attente"
      return status === 'en_attente';
    });

    // Filtrer par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => {
        try {
          const title = getOrderTitle(order).toLowerCase();
          const category = getOrderCategory(order).toLowerCase();
          const description = getOrderDescription(order).toLowerCase();
          const city = getOrderCity(order).toLowerCase();
          
          return title.includes(query) ||
                 description.includes(query) ||
                 city.includes(query) ||
                 category.includes(query);
        } catch (searchError) {
          return false;
        }
      });
    }

    // Trier selon le critère avec support GPS
    filtered.sort((a, b) => {
      try {
        let comparison = 0;
        
        switch (sortBy) {
          case 'distance':
            const distanceA = getOrderDistanceSync(a);
            const distanceB = getOrderDistanceSync(b);
            comparison = distanceA - distanceB;
            break;
            
          case 'amount':
            comparison = (a.proposed_amount || 0) - (b.proposed_amount || 0);
            break;
          case 'urgency':
            comparison = (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0);
            break;
          case 'duration':
            const durationA = a.duration ? parseInt(String(a.duration)) : 0;
            const durationB = b.duration ? parseInt(String(b.duration)) : 0;
            comparison = durationA - durationB;
            break;
          case 'client_type':
            const ratingA = getClientRating(a) || 0;
            const ratingB = getClientRating(b) || 0;
            comparison = ratingB - ratingA;
            break;
          case 'publication_date':
            const createdA = new Date(a.created_at || 0).getTime();
            const createdB = new Date(b.created_at || 0).getTime();
            comparison = createdB - createdA;
            break;
          case 'date':
          default:
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            comparison = dateA - dateB;
            break;
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      } catch (sortError) {
        return 0;
      }
    });

    return filtered;
  }, [orders, searchQuery, sortBy, sortOrder, userApplications, getOrderDistanceSync, getOrderTitle, getOrderCategory, getOrderDescription, getOrderCity, getClientRating, getUserApplicationStatus]);

  // Chargement paramètres admin
  const loadAdminSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'fourmiz_earning_percentage')
        .single();

      if (error) {
        return;
      }

      if (data?.setting_value?.trim()) {
        const percentage = parseFloat(data.setting_value);
        if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
          setAdminSettings({ fourmiz_earning_percentage: percentage });
        }
      }
    } catch (error) {
      // Gérer l'erreur silencieusement
    }
  };

  // Vérification session
  const checkUserSession = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setCurrentUser(null);
        return false;
      }
      if (!currentUser || currentUser.id !== user.id) {
        setCurrentUser(user);
      }
      return true;
    } catch (error) {
      return false;
    }
  };

  // Chargement utilisateur avec GPS
  useEffect(() => {
    const getUser = async () => {
      try {
        setUserLoading(true);
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          setError('Erreur authentification');
          return;
        }
        
        if (!user) {
          setError('Utilisateur non connecté');
          return;
        }

        setCurrentUser(user);

        // Charger en parallèle + GPS
        await Promise.all([
          loadAdminSettings(),
          getUserLocation(),
          loadUserApplications(),
        ]);
        
      } catch (error: any) {
        setError(`Erreur: ${error.message}`);
      } finally {
        setUserLoading(false);
      }
    };
    getUser();
  }, []);

  // Surveillance auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setCurrentUser(null);
          setError('Session expirée');
          setTimeout(() => router.replace('/auth/login'), 2000);
        } else if (event === 'SIGNED_IN' && session?.user) {
          setCurrentUser(session.user);
          setError(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Focus effect - CORRIGÉ
  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        Promise.all([
          loadAvailableOrders(),
          loadUserApplications()
        ]);
      }
    }, [currentUser])
  );

  // Chargement commandes avec GPS
  const loadAvailableOrders = async () => {
    if (!currentUser) {
      return;
    }

    if (isLoadingOrders) {
      return;
    }

    try {
      setIsLoadingOrders(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('available_orders_filtered')
        .select(`
          *,
          client_profile:client_id (
            latitude,
            longitude,
            city,
            firstname,
            lastname,
            avatar_url,
            rating
          )
        `)
        .neq('client_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const uniqueOrders = data ? deduplicateOrders(data) : [];
      
      setOrders(uniqueOrders);

    } catch (error: any) {
      setError(error.message);
      if (!refreshing) {
        Alert.alert('Erreur', 'Impossible de charger les commandes');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingOrders(false);
    }
  };

  // Refresh avec GPS
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      loadAvailableOrders(),
      refreshUserLocationAndData(false)
    ]);
  }, [currentUser, refreshUserLocationAndData]);

  // Fonctions candidatures - CORRIGÉES
  const submitApplication = async () => {
    if (!selectedOrder || !currentUser?.id) return;

    if (!applicationMessage.trim()) {
      Alert.alert('Message requis', 'Veuillez expliquer pourquoi vous êtes le bon choix pour cette mission.');
      return;
    }

    try {
      setSubmittingApplication(true);

      const applicationData = {
        order_id: selectedOrder.id,
        fourmiz_id: currentUser.id,
        motivation_message: applicationMessage.trim(),
        status: 'en_attente',
        applied_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('order_applications')
        .insert([applicationData]);

      if (error) {
        if (error.code === '23505' && error.message.includes('unique application per order fourmiz')) {
          Alert.alert(
            'Candidature déjà envoyée',
            'Vous avez déjà postulé pour cette mission.',
            [{ text: 'OK' }]
          );
        } else {
          throw error;
        }
        return;
      }

      // Mettre à jour la liste locale des candidatures
      setUserApplications(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedOrder.id, 'en_attente');
        return newMap;
      });

      setApplicationModalVisible(false);
      setSelectedOrder(null);
      setApplicationMessage('');

      Alert.alert(
        'Candidature envoyée',
        'Votre candidature a été envoyée au client. Vous serez notifié de sa décision.',
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      Alert.alert('Erreur', `Impossible d'envoyer la candidature: ${error.message}`);
    } finally {
      setSubmittingApplication(false);
    }
  };

  // Actions commandes - CORRIGÉES
  const handleOrderAction = async (order: AvailableOrder) => {
    const workflow = getOrderWorkflow(order);
    const { hasApplied, status } = getUserApplicationStatus(order.id);

    if (workflow === 'candidatures') {
      if (hasApplied && status === 'en_attente') {
        // Candidature déjà en attente - ne rien faire (bouton désactivé)
        return;
      }
      
      // Nouvelle candidature
      setSelectedOrder(order);
      setApplicationMessage('');
      setApplicationModalVisible(true);
    } else {
      await acceptOrderDirectly(order);
    }
  };

  const acceptOrderDirectly = async (order: AvailableOrder) => {
    if (!currentUser?.id) {
      Alert.alert(
        'Erreur de connexion',
        'Impossible d\'accepter la commande. Veuillez vous reconnecter.',
        [
          { text: 'Se reconnecter', onPress: () => router.push('/auth/login') },
          { text: 'Annuler', style: 'cancel' }
        ]
      );
      return;
    }

    const sessionValid = await checkUserSession();
    if (!sessionValid) {
      Alert.alert(
        'Session expirée',
        'Votre session a expiré. Veuillez vous reconnecter.',
        [{ text: 'Se reconnecter', onPress: () => router.push('/auth/login') }]
      );
      return;
    }

    Alert.alert(
      'Accepter cette mission',
      'Voulez-vous accepter cette commande ? Le client sera notifié.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('orders')
                .update({
                  fourmiz_id: currentUser.id,
                  status: 'acceptee',
                  accepted_at: new Date().toISOString(),
                  confirmed_by_fourmiz: true,
                  updated_at: new Date().toISOString()
                })
                .eq('id', order.id);

              if (error) throw error;

              loadAvailableOrders();
              
              setTimeout(() => {
                try {
                  router.push('/(tabs)/services-requests');
                } catch (navError) {
                  // Gérer l'erreur silencieusement
                }
              }, 500);
            } catch (error: any) {
              Alert.alert('Erreur', `Impossible d'accepter: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  // Formatage date et heure
  const formatDate = useCallback((dateString: string | null) => {
    try {
      if (!dateString) return 'Date à définir';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Aujourd\'hui';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Demain';
      } else {
        return date.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        });
      }
    } catch (error) {
      return 'Date invalide';
    }
  }, []);

  const formatTime = useCallback((timeString: string | null) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  }, []);

  // Reset filtres
  const resetFilters = useCallback(() => {
    setSearchInput('');
    setSearchQuery('');
  }, []);

  // Nom d'affichage du tri
  const getSortDisplayName = (sortKey: string): string => {
    switch (sortKey) {
      case 'date': return 'Date';
      case 'amount': return 'Montant';
      case 'urgency': return 'Urgence';
      case 'duration': return 'Durée';
      case 'client_type': return 'Type de client';
      case 'distance': return 'Distance';
      case 'publication_date': return 'Date de publication';
      default: return 'Date';
    }
  };

  // Modal candidature - SIMPLIFIÉ
  const renderApplicationModal = () => (
    <Modal
      visible={applicationModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setApplicationModalVisible(false)}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Postuler à cette mission</Text>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setApplicationModalVisible(false);
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close-outline" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          {selectedOrder && (
            <View style={styles.modalOrderInfo}>
              <Text style={styles.modalOrderTitle}>
                {getOrderTitle(selectedOrder)}
              </Text>
              <Text style={styles.modalOrderDetails}>
                {getOrderCity(selectedOrder)} • {getFourmizAmount(selectedOrder)}
              </Text>
            </View>
          )}

          <ScrollView 
            style={styles.modalForm}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Message de motivation *
              </Text>
              <TextInput
                style={styles.formTextArea}
                placeholder="Expliquez pourquoi vous êtes le bon choix pour cette mission..."
                multiline
                numberOfLines={4}
                value={applicationMessage}
                onChangeText={setApplicationMessage}
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                }}
              />
            </View>

            {/* Note explicative */}
            <View style={styles.formGroup}>
              <View style={styles.infoNote}>
                <Ionicons name="information-circle-outline" size={16} color="#666666" />
                <Text style={styles.infoNoteText}>
                  Les tarifs et durées sont négociés directement avec le client selon votre demande spécifique.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                Keyboard.dismiss();
                setApplicationModalVisible(false);
              }}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalSubmitButton,
                (!applicationMessage.trim() || submittingApplication) && styles.modalSubmitButtonDisabled
              ]}
              onPress={() => {
                Keyboard.dismiss();
                submitApplication();
              }}
              disabled={!applicationMessage.trim() || submittingApplication}
            >
              {submittingApplication ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitText}>Envoyer candidature</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Barre de filtres
  const renderFilterBar = () => (
    <View style={styles.filterBar}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#666666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une mission..."
          placeholderTextColor="#666666"
          value={searchInput}
          onChangeText={setSearchInput}
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => setSearchInput('')}>
            <Ionicons name="close-circle-outline" size={16} color="#666666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.sortContainer}>
        <TouchableOpacity 
          style={styles.sortDropdownButton}
          onPress={() => setShowFilterDropdown(!showFilterDropdown)}
        >
          <Ionicons name="funnel-outline" size={16} color="#666666" />
          <Text style={styles.sortDropdownText}>
            Trier par : {getSortDisplayName(sortBy)} {sortOrder === 'desc' ? '↓' : '↑'}
          </Text>
          <Ionicons 
            name={showFilterDropdown ? "chevron-up-outline" : "chevron-down-outline"} 
            size={16} 
            color="#666666" 
          />
        </TouchableOpacity>

        {showFilterDropdown && (
          <View style={styles.dropdownMenu}>
            {[
              { key: 'date', label: 'Date', icon: 'calendar-outline' },
              { key: 'amount', label: 'Montant', icon: 'cash-outline' },
              { key: 'urgency', label: 'Urgence', icon: 'alert-circle-outline' },
              { key: 'duration', label: 'Durée', icon: 'time-outline' },
              { key: 'client_type', label: 'Type de client', icon: 'person-outline' },
              { key: 'distance', label: 'Distance', icon: 'location-outline' },
              { key: 'publication_date', label: 'Date de publication', icon: 'newspaper-outline' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.dropdownItem,
                  sortBy === option.key && styles.dropdownItemActive
                ]}
                onPress={() => {
                  setSortBy(option.key as any);
                  setShowFilterDropdown(false);
                }}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={16} 
                  color={sortBy === option.key ? '#000000' : '#666666'} 
                />
                <Text style={[
                  styles.dropdownItemText,
                  sortBy === option.key && styles.dropdownItemTextActive
                ]}>
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <TouchableOpacity 
                    style={styles.sortOrderButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    <Ionicons 
                      name={sortOrder === 'desc' ? "arrow-down-outline" : "arrow-up-outline"} 
                      size={14} 
                      color="#000000" 
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  // Rendu carte avec GPS - CORRIGÉ
  const renderOrderCard = useCallback((order: AvailableOrder) => {
    try {
      const buttonsDisabled = !currentUser || loading || userLoading || loadingApplications;
      const workflow = getOrderWorkflow(order);
      const { hasApplied, status } = getUserApplicationStatus(order.id);
      
      const title = getOrderTitle(order);
      const category = getOrderCategory(order);
      const city = getOrderCity(order);
      const postalCode = getOrderPostalCode(order);
      const duration = getOrderDuration(order);
      const clientName = getClientDisplayName(order);
      const amount = getFourmizAmount(order);

      const locationText = postalCode && city ? `${postalCode} ${city}` : city;

      // Rendu distance GPS
      const renderDistanceInfo = () => {
        if (!userLocation) {
          return (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color="#666666" />
              <Text style={styles.detailText}>
                {locationText} • GPS requis pour distance
              </Text>
            </View>
          );
        }

        const hasClientCoords = order.client_profile?.latitude && order.client_profile?.longitude;
        
        if (!hasClientCoords) {
          return (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color="#666666" />
              <Text style={styles.detailText}>
                {locationText} • Position client non disponible
              </Text>
            </View>
          );
        }

        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          order.client_profile.latitude,
          order.client_profile.longitude
        );

        const formattedDistance = distance === Infinity ? 'Distance inconnue' : 
          distance < 0.1 ? '< 100m' :
          distance < 1 ? `${Math.round(distance * 1000)} m` :
          distance < 10 ? `${distance.toFixed(1)} km` :
          `${Math.round(distance)} km`;

        return (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#666666" />
            <Text style={styles.detailText}>
              {locationText} • {formattedDistance}
            </Text>
            {distance < 1 && (
              <View style={styles.nearbyBadge}>
                <Text style={styles.nearbyBadgeText}>Proche</Text>
              </View>
            )}
          </View>
        );
      };

      // Bouton d'action - CORRIGÉ
      const renderActionButton = () => {
        if (workflow === 'candidatures' && hasApplied && status === 'en_attente') {
          // Candidature en attente
          return (
            <TouchableOpacity 
              style={styles.pendingApplicationButton}
              disabled={true}
            >
              <Ionicons name="time-outline" size={16} color="#999999" />
              <Text style={styles.pendingApplicationButtonText}>
                En attente
              </Text>
            </TouchableOpacity>
          );
        }

        // Bouton normal
        const actionButtonText = workflow === 'candidatures' ? 'Postuler' : 'Accepter';
        const actionButtonIcon = workflow === 'candidatures' ? 'paper-plane-outline' : 'checkmark-circle-outline';

        return (
          <TouchableOpacity 
            style={[
              styles.acceptButton,
              buttonsDisabled && styles.acceptButtonDisabled
            ]}
            onPress={() => handleOrderAction(order)}
            disabled={buttonsDisabled}
          >
            {buttonsDisabled ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name={actionButtonIcon as any} size={18} color="#ffffff" />
            )}
            <Text style={styles.acceptButtonText}>
              {!currentUser ? 'Connexion...' : 
               loading || userLoading ? 'Chargement...' : 
               actionButtonText}
            </Text>
          </TouchableOpacity>
        );
      };

      return (
        <TouchableOpacity
          key={order.id}
          style={[
            styles.orderCard,
            hasApplied && status === 'en_attente' && styles.orderCardPending
          ]}
          onPress={() => {
            try {
              const targetUrl = `/orders/${order.id}`;
              router.push(targetUrl);
            } catch (navError) {
              Alert.alert('Info', 'Détails disponibles prochainement');
            }
          }}
        >


          {/* Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderTitleSection}>
              <Text style={styles.orderTitle}>
                {title}
              </Text>
              <View style={styles.orderCategoryRow}>
                <Text style={styles.orderCategory}>
                  {category}
                </Text>
                {/* Badge workflow */}
                <View style={[
                  styles.workflowBadge,
                  workflow === 'candidatures' ? styles.workflowBadgeCandidatures : styles.workflowBadgeDirect
                ]}>
                  <Ionicons 
                    name={workflow === 'candidatures' ? 'people-outline' : 'flash-outline'} 
                    size={12} 
                    color={workflow === 'candidatures' ? '#666666' : '#000000'} 
                  />
                  <Text style={[
                    styles.workflowBadgeText,
                    workflow === 'candidatures' ? styles.workflowBadgeTextCandidatures : styles.workflowBadgeTextDirect
                  ]}>
                    {workflow === 'candidatures' ? 'Candidatures' : 'Direct'}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.orderMeta}>
              <Text style={styles.orderAmount}>
                {amount}
              </Text>
            </View>
          </View>

          {/* Urgence */}
          {order.urgent && (
            <View style={styles.urgentBadge}>
              <Ionicons name="alert-circle-outline" size={16} color="#000000" />
              <Text style={styles.urgentText}>
                Dès que possible
              </Text>
            </View>
          )}

          {/* Détails avec GPS */}
          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#666666" />
              <Text style={styles.detailText}>
                {formatDate(order.date)}
                {order.start_time && ` à ${formatTime(order.start_time)}`}
              </Text>
            </View>

            {renderDistanceInfo()}

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color="#666666" />
              <Text style={styles.detailText}>
                Durée : {duration}
              </Text>
            </View>
          </View>

          {/* Client info */}
          <View style={styles.clientSection}>
            <View style={styles.clientInfo}>
              <View style={styles.clientHeader}>
                <View style={styles.clientAvatarContainer}>
                  {getClientAvatar(order) ? (
                    <Image 
                      source={{ uri: getClientAvatar(order)! }} 
                      style={styles.clientAvatar}
                    />
                  ) : (
                    <View style={styles.defaultAvatar}>
                      <Ionicons name="person-outline" size={20} color="#666666" />
                    </View>
                  )}
                </View>
                
                <View style={styles.clientDetails}>
                  <Text style={styles.clientName}>
                    {clientName}
                  </Text>
                  
                  <View style={styles.clientRatingContainer}>
                    {getClientRating(order) ? (
                      <View style={styles.clientRating}>
                        <Ionicons name="star-outline" size={14} color="#000000" />
                        <Text style={styles.clientRatingText}>
                          {getClientRating(order)?.toFixed(1)} / 5
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.clientNoRating}>
                        Nouveau client
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.timeAgo}>
              {formatTimeAgo(order.created_at || '')}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.orderActions}>
            <TouchableOpacity 
              style={[
                styles.discussButton,
                buttonsDisabled && styles.discussButtonDisabled
              ]}
              onPress={() => {
                try {
                  if (workflow === 'candidatures') {
                    Alert.alert('Info', 'Chat disponible après candidature');
                  } else {
                    router.push(`/chat/${order.id}`);
                  }
                } catch (navError) {
                  Alert.alert('Info', 'Chat disponible après acceptation');
                }
              }}
              disabled={buttonsDisabled}
            >
              <Ionicons name="chatbubble-outline" size={16} color={buttonsDisabled ? "#999999" : "#000000"} />
              <Text style={[
                styles.discussButtonText,
                buttonsDisabled && styles.discussButtonTextDisabled
              ]}>
                Discuter
              </Text>
            </TouchableOpacity>

            {renderActionButton()}
          </View>
        </TouchableOpacity>
      );
    } catch (renderError: any) {
      return (
        <View key={order.id} style={styles.errorCard}>
          <Text style={styles.errorCardText}>
            Erreur affichage commande #{order.id}: {renderError.message}
          </Text>
        </View>
      );
    }
  }, [currentUser, loading, userLoading, loadingApplications, userLocation, calculateDistance, getOrderTitle, getOrderCategory, getFourmizAmount, 
      getOrderDuration, getClientDisplayName, getOrderCity, getOrderPostalCode, 
      formatDate, formatTime, getClientAvatar, getClientRating, formatTimeAgo, getOrderWorkflow, getUserApplicationStatus]);

  // État vide
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={48} color="#cccccc" />
      <Text style={styles.emptyTitle}>Aucune mission disponible</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Aucune mission ne correspond à votre recherche'
          : 'Il n\'y a pas de missions disponibles pour le moment'
        }
      </Text>
      {searchQuery && (
        <TouchableOpacity 
          style={styles.resetFiltersButton}
          onPress={resetFilters}
        >
          <Text style={styles.resetFiltersText}>Effacer la recherche</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // États d'erreur et chargement
  if (error && !currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#666666" />
          <Text style={styles.errorTitle}>Erreur de connexion</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setError(null);
              setLoading(true);
              router.replace('/(tabs)/available-orders');
            }}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || userLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.introSection}>
            <Text style={styles.introTitle}>
              Missions disponibles
            </Text>
            <Text style={styles.introSubtitle}>
              {userLoading ? 'Connexion en cours...' : 'Chargement des missions...'}
            </Text>
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000000" />
            <Text style={styles.loadingText}>
              {userLoading ? 'Connexion en cours...' : 'Chargement des missions...'}
            </Text>
            {currentUser && (
              <Text style={styles.loadingSubtext}>
                Connecté en tant que {currentUser.email}
              </Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Interface principale
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>
            Missions disponibles
          </Text>
          <Text style={styles.headerCount}>
            {filteredOrders.length} mission{filteredOrders.length > 1 ? 's' : ''}
          </Text>
        </View>

        {renderFilterBar()}

        {/* Indicateur refresh position */}
        {isRefreshingLocation && (
          <View style={styles.refreshLocationIndicator}>
            <ActivityIndicator size="small" color="#000000" />
            <Text style={styles.refreshLocationText}>Mise à jour position...</Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#000000']}
              tintColor="#000000"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {error && !loading && currentUser ? (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={20} color="#666666" />
              <Text style={styles.errorBannerText}>
                Erreur de chargement: {error}
              </Text>
              <TouchableOpacity onPress={onRefresh}>
                <Ionicons name="refresh-outline" size={20} color="#666666" />
              </TouchableOpacity>
            </View>
          ) : null}

          {filteredOrders.length > 0 ? (
            <View style={styles.ordersList}>
              {filteredOrders.map(renderOrderCard)}
            </View>
          ) : (
            renderEmptyState()
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {/* Modal candidature */}
      {renderApplicationModal()}

      {/* Bouton refresh position */}
      <TouchableOpacity 
        style={styles.floatingRefreshButton}
        onPress={() => refreshUserLocationAndData(true)}
        disabled={isRefreshingLocation}
      >
        <Ionicons 
          name="locate-outline" 
          size={24} 
          color={isRefreshingLocation ? "#999999" : "#000000"} 
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// Styles complets - CORRIGÉS
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff',
    marginTop: -40,
  },
  content: { 
    flex: 1 
  },

  headerCount: { 
    fontSize: 12, 
    color: '#666666', 
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
  },

  introSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },
  
  refreshLocationIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 24,
    marginVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshLocationText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
  },
  floatingRefreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  nearbyBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  nearbyBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  loadingText: { 
    fontSize: 13, 
    color: '#333333',
    textAlign: 'center',
    fontWeight: '400',
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
    fontWeight: '400',
  },
  retryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 6,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#666666',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },

  filterBar: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 16,
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
  },

  sortContainer: { 
    position: 'relative',
  },
  sortDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sortDropdownText: {
    flex: 1,
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },
  
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 4,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#f8f8f8',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  dropdownItemTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  sortOrderButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },

  scrollView: { 
    flex: 1 
  },
  ordersList: { 
    padding: 24, 
    gap: 16 
  },

  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
  },

  // NOUVEAUX STYLES CORRIGÉS
  orderCardPending: {
    borderColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },

  pendingApplicationButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    opacity: 0.8,
  },
  pendingApplicationButtonText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderTitleSection: { 
    flex: 1, 
    marginRight: 16 
  },
  orderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  
  orderCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderCategory: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },
  
  workflowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  workflowBadgeDirect: {
    backgroundColor: '#f0f0f0',
  },
  workflowBadgeCandidatures: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  workflowBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  workflowBadgeTextDirect: {
    color: '#000000',
  },
  workflowBadgeTextCandidatures: {
    color: '#666666',
  },
  
  orderMeta: { 
    alignItems: 'flex-end',
    position: 'relative',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },

  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
    backgroundColor: '#f8f8f8',
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  urgentText: { 
    fontSize: 12, 
    fontWeight: '600',
    color: '#000000',
  },

  orderDetails: { 
    gap: 8, 
    marginBottom: 12 
  },
  detailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  detailText: { 
    fontSize: 13, 
    color: '#666666', 
    flex: 1,
    fontWeight: '400',
  },

  clientSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginBottom: 16,
  },
  clientInfo: { 
    flex: 1 
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatarContainer: {
    width: 36,
    height: 36,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  defaultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  clientRatingContainer: {
    minHeight: 16,
  },
  clientRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clientRatingText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },
  clientNoRating: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '400',
  },
  timeAgo: { 
    fontSize: 12, 
    color: '#666666',
    fontWeight: '400',
  },

  orderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  discussButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 12,
    borderRadius: 6,
    gap: 6,
  },
  discussButtonText: { 
    fontSize: 13, 
    color: '#000000', 
    fontWeight: '600' 
  },
  
  discussButtonDisabled: {
    backgroundColor: '#f8f8f8',
    opacity: 0.6,
  },
  discussButtonTextDisabled: {
    color: '#999999',
  },
  
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 12,
    borderRadius: 6,
    gap: 6,
  },
  acceptButtonText: { 
    fontSize: 13, 
    color: '#ffffff', 
    fontWeight: '600' 
  },
  
  acceptButtonDisabled: {
    backgroundColor: '#999999',
    opacity: 0.6,
  },

  errorCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#666666',
  },
  errorCardText: {
    color: '#333333',
    fontSize: 13,
    fontWeight: '400',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    fontWeight: '400',
  },
  resetFiltersButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  resetFiltersText: { 
    fontSize: 13, 
    color: '#ffffff', 
    fontWeight: '600' 
  },

  bottomSpacer: { 
    height: 80 
  },

  // Styles modal candidature
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOrderInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f8f8',
  },
  modalOrderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  modalOrderDetails: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  modalForm: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  formGroup: {
    marginVertical: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  formTextArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    color: '#000000',
    backgroundColor: '#ffffff',
    minHeight: 100,
  },
  
  // Note d'information
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoNoteText: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    flex: 1,
    fontWeight: '400',
  },
  
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#f8f8f8',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  modalSubmitButton: {
    flex: 2,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#000000',
  },
  modalSubmitButtonDisabled: {
    backgroundColor: '#999999',
    opacity: 0.6,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
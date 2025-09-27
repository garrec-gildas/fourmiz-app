// app/(tabs)/map.tsx - CARTE INTERACTIVE DUAL MODE FINAL - VERSION CORRIGÉE COHÉRENTE
// 🗺️ MODE CLIENT : Voit les fourmiz disponibles
// 🐜 MODE FOURMIZ : Voit les demandes clients
// 📱 INTERFACE ADAPTÉE SELON LE RÔLE (GÉRÉ PAR LE HEADER)
// ✅ CORRIGÉ : Utilise la même source available_orders_filtered
// 🔧 MODIFIÉ : Navigation CLIENT vers profil fourmiz en lecture seule avec from=map

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Modal,
  FlatList,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  AppState,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

// Importer le contexte de rôle
import { useSharedRoleManager } from './_layout';

const { width, height } = Dimensions.get('window');

// ENUMS POUR LES MODES
enum UserMode {
  CLIENT = 'client',
  FOURMIZ = 'fourmiz'
}

// INTERFACES ADAPTÉES POUR DUAL MODE
interface Fourmiz {
  id: string;
  name: string;
  service: string;
  serviceColor: string;
  serviceIcon: string;
  rating: number;
  location: {
    latitude: number;
    longitude: number;
  };
  available: boolean;
  distance: string;
  price: string;
  avatar: string;
  verified: boolean;
  responseTime: string;
  fullData?: any;
  allServices?: string;
}

interface ClientRequest {
  id: string;
  title: string;
  description: string;
  service: string;
  serviceColor: string;
  serviceIcon: string;
  budget: string;
  location: {
    latitude: number;
    longitude: number;
  };
  distance: string;
  clientName: string;
  clientAvatar: string;
  urgency: 'low' | 'medium' | 'high';
  createdAt: Date;
  fullData?: any;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  fourmizCount?: number;
  servicesCount?: number;
}

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface AppConfig {
  defaultRegion: MapRegion;
  availableRadius: number[];
  defaultRadius: number;
  defaultMarkerIcon: string;
  refreshIntervalMs: number;
  minMovementForRefreshKm: number;
}

// NOUVELLE INTERFACE POUR LA DÉDUPLICATION
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

// CONFIGURATION PAR DÉFAUT
const DEFAULT_APP_CONFIG: AppConfig = {
  defaultRegion: {
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  availableRadius: [1, 3, 5, 10, 20],
  defaultRadius: 5,
  defaultMarkerIcon: '🔧',
  refreshIntervalMs: 30000,
  minMovementForRefreshKm: 0.1
};

// ICÔNES POUR CHAQUE MODE
const FOURMIZ_ICON = '🐜';
const CLIENT_ICON = '👤'; // Icône personne pour les clients

// COULEURS FALLBACK
const FALLBACK_SERVICE_COLORS = {
  'aide': '#4CAF50',
  'domicile': '#4CAF50',
  'bricolage': '#FF9800',
  'réparation': '#FF9800',
  'transport': '#2196F3',
  'livraison': '#2196F3',
  'jardinage': '#8BC34A',
  'jardin': '#8BC34A',
  'animaux': '#9C27B0',
  'animal': '#9C27B0',
  'soin': '#9C27B0',
  'urgence': '#F44336',
  'formation': '#9C27B0',
  'administratif': '#FF9800',
  'informatique': '#2196F3',
  'secrétariat': '#673AB7',
  'événementiel': '#E91E63',
  'sécurité': '#F44336',
  'bâtiment': '#795548',
  'agriculture': '#8BC34A',
  'bien-être': '#4CAF50',
  'coaching': '#FF5722',
  'dépannage': '#FF9800'
};

const getFallbackColor = (categoryName: string): string => {
  if (!categoryName) return '#757575';
  
  const name = categoryName.toLowerCase();
  
  for (const [keyword, color] of Object.entries(FALLBACK_SERVICE_COLORS)) {
    if (name.includes(keyword)) {
      return color;
    }
  }
  
  return '#757575';
};

const calculateDistance = (pos1: MapRegion, pos2: MapRegion): number => {
  const R = 6371;
  const dLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
  const dLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(pos1.latitude * Math.PI / 180) * Math.cos(pos2.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// ✅ NOUVELLE FONCTION DE DÉDUPLICATION (identique à available-orders.tsx)
const deduplicateOrders = (orders: AvailableOrder[]): AvailableOrder[] => {
  const seen = new Set<number>();
  const unique = orders.filter(order => {
    if (seen.has(order.id)) {
      return false;
    }
    seen.add(order.id);
    return true;
  });
  
  return unique;
};

// MODAL FOURMIZ DETAIL (MODE CLIENT)
interface FourmizDetailModalProps {
  fourmiz: Fourmiz | null;
  visible: boolean;
  onClose: () => void;
  onContactFourmiz: (fourmizId: string) => void;
}

const FourmizDetailModal = ({ fourmiz, visible, onClose, onContactFourmiz }: FourmizDetailModalProps) => {
  const [criteriaData, setCriteriaData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);

  const loadFourmizCriteria = async (fourmizId: string) => {
    if (!fourmizId) return;
    
    setLoading(true);
    try {
      const { data: criteria, error: criteriaError } = await supabase
        .from('criteria')
        .select('*')
        .eq('user_id', fourmizId)
        .single();

      if (!criteriaError && criteria) {
        setCriteriaData(criteria);
      }

      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('categorie')
        .not('categorie', 'is', null);

      if (!servicesError && servicesData) {
        const uniqueCategories = new Set<string>();
        const categoryCount = new Map<string, number>();

        servicesData.forEach(service => {
          if (service.categorie && service.categorie.trim() !== '') {
            const cleanedCategory = service.categorie.trim();
            uniqueCategories.add(cleanedCategory);
            categoryCount.set(cleanedCategory, (categoryCount.get(cleanedCategory) || 0) + 1);
          }
        });

        const categories = Array.from(uniqueCategories)
          .map(categorie => {
            let key = categorie.toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[àáâäã]/g, 'a')
              .replace(/[èéêë]/g, 'e')
              .replace(/[ìíîï]/g, 'i')
              .replace(/[òóôöõ]/g, 'o')
              .replace(/[ùúûü]/g, 'u')
              .replace(/[ç]/g, 'c')
              .replace(/[^a-z0-9_]/g, '');
            
            if (!key || key.trim() === '') {
              key = `service_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            return {
              key,
              categorie,
              count: categoryCount.get(categorie) || 0
            };
          })
          .filter(cat => cat.key && cat.categorie)
          .sort((a, b) => a.categorie.localeCompare(b.categorie));

        setServiceCategories(categories);
      }
      
    } catch (error) {
      console.error('Erreur chargement détails fourmiz:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && fourmiz?.id) {
      loadFourmizCriteria(fourmiz.id);
    }
  }, [visible, fourmiz?.id]);

  if (!fourmiz) return null;

  const formatServiceTypes = (serviceTypes: Record<string, boolean> | null): string => {
    if (!serviceTypes || typeof serviceTypes !== 'object') {
      return 'Services non renseignés';
    }
    
    const selectedServices = Object.entries(serviceTypes)
      .filter(([key, isSelected]) => isSelected)
      .map(([key]) => {
        const category = serviceCategories.find(cat => cat.key === key);
        return category ? category.categorie : key;
      })
      .filter(Boolean);
    
    return selectedServices.length > 0 ? selectedServices.join(', ') : 'Aucun service sélectionné';
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Fiche Fourmiz</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.fourmizModalHeader}>
            <View style={styles.avatarContainer}>
              {fourmiz.fullData?.avatar_url ? (
                <Image source={{ uri: fourmiz.fullData.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {fourmiz.name ? fourmiz.name.charAt(0).toUpperCase() : '🐜'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.fourmizModalName}>{fourmiz.name}</Text>
            
            <View style={styles.fourmizModalMeta}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{fourmiz.rating}</Text>
              </View>
              <Text style={styles.metaDivider}>•</Text>
              <Text style={styles.distanceText}>{fourmiz.distance}</Text>
              <Text style={styles.metaDivider}>•</Text>
              <Text style={styles.responseTimeText}>{fourmiz.responseTime}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={styles.loadingText}>Chargement des détails...</Text>
            </View>
          ) : criteriaData ? (
            <>
              {criteriaData.presentation && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="document-text-outline" size={18} color="#000" />
                    <Text style={styles.modalSectionTitle}>Description</Text>
                  </View>
                  <Text style={styles.modalBioText}>{criteriaData.presentation}</Text>
                </View>
              )}

              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Ionicons name="briefcase-outline" size={18} color="#000" />
                  <Text style={styles.modalSectionTitle}>Services proposés</Text>
                </View>
                <Text style={styles.modalSectionContent}>
                  {formatServiceTypes(criteriaData.service_types)}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Ionicons name="location-outline" size={18} color="#000" />
                  <Text style={styles.modalSectionTitle}>Localisation</Text>
                </View>
                <Text style={styles.modalSectionContent}>
                  {fourmiz.fullData?.city || 'Ville non renseignée'}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.noCriteriaContainer}>
              <Ionicons name="information-circle-outline" size={24} color="#666" />
              <Text style={styles.noCriteriaText}>
                Ce fourmiz n'a pas encore complété sa fiche de présentation.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity 
            style={[styles.contactButton, { backgroundColor: fourmiz.serviceColor }]}
            onPress={() => onContactFourmiz(fourmiz.id)}
          >
            <Ionicons name="construct" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>Demander un service</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// MODAL REQUEST DETAIL (MODE FOURMIZ) - VERSION CORRIGÉE
interface RequestDetailModalProps {
  request: ClientRequest | null;
  visible: boolean;
  onClose: () => void;
  onRespondToRequest: (requestId: string) => void;
}

const RequestDetailModal = ({ request, visible, onClose, onRespondToRequest }: RequestDetailModalProps) => {
  if (!request) return null;

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#757575';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'Urgent';
      case 'medium': return 'Modéré';
      case 'low': return 'Flexible';
      default: return 'Non spécifié';
    }
  };

  const handleRespondClick = () => {
    console.log('🔄 Clic "Répondre à la demande":', {
      requestId: request.id,
      requestType: typeof request.id,
      requestTitle: request.title
    });
    
    if (!request.id) {
      console.error('❌ Request ID manquant dans modal');
      Alert.alert('Erreur', 'Identifiant de commande manquant');
      return;
    }
    
    onRespondToRequest(request.id);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Demande Client</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.requestModalHeader}>
            <View style={styles.avatarContainer}>
              {request.clientAvatar ? (
                <Image source={{ uri: request.clientAvatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {request.clientName ? request.clientName.charAt(0).toUpperCase() : '👤'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.requestModalTitle}>{request.title}</Text>
            <Text style={styles.requestModalClient}>par {request.clientName}</Text>
            
            <View style={styles.requestModalMeta}>
              <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(request.urgency) }]}>
                <Text style={styles.urgencyText}>{getUrgencyLabel(request.urgency)}</Text>
              </View>
              <Text style={styles.metaDivider}>•</Text>
              <Text style={styles.distanceText}>{request.distance}</Text>
              <Text style={styles.metaDivider}>•</Text>
              <Text style={styles.budgetText}>{request.budget}</Text>
            </View>
          </View>

          <View style={styles.modalSection}>
            <View style={styles.modalSectionHeader}>
              <Ionicons name="document-text-outline" size={18} color="#000" />
              <Text style={styles.modalSectionTitle}>Description de la demande</Text>
            </View>
            <Text style={styles.modalBioText}>{request.description}</Text>
          </View>

          <View style={styles.modalSection}>
            <View style={styles.modalSectionHeader}>
              <Ionicons name="briefcase-outline" size={18} color="#000" />
              <Text style={styles.modalSectionTitle}>Service demandé</Text>
            </View>
            <Text style={styles.modalSectionContent}>{request.service}</Text>
          </View>

          <View style={styles.modalSection}>
            <View style={styles.modalSectionHeader}>
              <Ionicons name="time-outline" size={18} color="#000" />
              <Text style={styles.modalSectionTitle}>Publié</Text>
            </View>
            <Text style={styles.modalSectionContent}>
              {request.createdAt.toLocaleDateString()} à {request.createdAt.toLocaleTimeString()}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity 
            style={[styles.contactButton, { backgroundColor: request.serviceColor }]}
            onPress={handleRespondClick}
          >
            <Ionicons name="chatbubble" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>Répondre à la demande</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default function MapScreen() {
  // DÉTERMINATION DU MODE DEPUIS LE CONTEXTE DE RÔLE
  const { currentRole, isInitialized } = useSharedRoleManager();
  
  // LOGIQUE : CLIENT voit les FOURMIZ, FOURMIZ voit les DEMANDES CLIENTS  
  const userMode = useMemo(() => {
    if (!isInitialized || !currentRole) {
      return UserMode.CLIENT; // Mode par défaut pendant le chargement
    }
    
    // 👤 Utilisateur CLIENT → voit les FOURMIZ (mode CLIENT)
    // 🐜 Utilisateur FOURMIZ → voit les DEMANDES CLIENTS (mode FOURMIZ) 
    return currentRole === 'client' ? UserMode.CLIENT : UserMode.FOURMIZ;
  }, [currentRole, isInitialized]);

  console.log('🗺️ MapScreen - Détermination du mode:', {
    currentRole,
    isInitialized, 
    userMode: userMode === UserMode.CLIENT ? 'CLIENT (voit fourmiz)' : 'FOURMIZ (voit demandes)',
    modeEnum: userMode
  });

  // ÉTATS PRINCIPAUX - MODE GÉRÉ PAR LE HEADER/LAYOUT
  const [userLocation, setUserLocation] = useState<MapRegion | null>(null);
  const [fourmizList, setFourmizList] = useState<Fourmiz[]>([]);
  const [requestsList, setRequestsList] = useState<ClientRequest[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [selectedService, setSelectedService] = useState<string>('all');
  const [myCategories, setMyCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedFourmiz, setSelectedFourmiz] = useState<Fourmiz | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [loadingServices, setLoadingServices] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showList, setShowList] = useState<boolean>(false);
  const [showFourmizDetail, setShowFourmizDetail] = useState<boolean>(false);
  const [showRequestDetail, setShowRequestDetail] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [radiusFilter, setRadiusFilter] = useState<number>(DEFAULT_APP_CONFIG.defaultRadius);
  const [lastLocationRefresh, setLastLocationRefresh] = useState<Date | null>(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState<boolean>(false);
  
  const mapRef = useRef<MapView>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ FONCTION DEBUG RELATIONS CATÉGORIES CORRIGÉE - Sans table categories
  const debugCategoriesRelations = async () => {
    console.log('🔍 === DEBUG RELATIONS CATÉGORIES (SANS TABLE CATEGORIES) ===');
    
    try {
      // ✅ SUPPRIMÉ : Vérification des catégories dans la table categories
      console.log('📝 Plus de table categories - utilisation de services.categorie uniquement');

      // Vérifier les catégories services.categorie
      const { data: servicesCategories } = await supabase
        .from('services')
        .select('categorie')
        .not('categorie', 'is', null)
        .neq('categorie', '');

      const servicesCategoriesCount = new Map<string, number>();
      servicesCategories?.forEach(service => {
        if (service.categorie?.trim()) {
          const cleanName = service.categorie.trim();
          servicesCategoriesCount.set(cleanName, (servicesCategoriesCount.get(cleanName) || 0) + 1);
        }
      });

      console.log('📊 Catégories services.categorie:', servicesCategoriesCount.size);
      Array.from(servicesCategoriesCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([name, count]) => {
          console.log(`  - ${name}: ${count} services`);
        });

    } catch (error) {
      console.error('❌ Erreur debug:', error);
    }
  };

  // CHARGEMENT INITIAL
  useEffect(() => {
    console.log(`🚀 MapScreen - Initialisation mode ${userMode}...`);
    initializeApp();
  }, []);

  // APPEL DEBUG AU CHARGEMENT (TEMPORAIRE)
  useEffect(() => {
    if (userLocation && serviceCategories.length > 0) {
      debugCategoriesRelations();
    }
  }, [userLocation, serviceCategories]);

  // RECHARGEMENT LORS DU CHANGEMENT DE FILTRES OU MODE
  useEffect(() => {
    console.log('🔄 Filters/Mode changed:', { radiusFilter, selectedService, userMode, userLocation: !!userLocation });
    if (userLocation) {
      if (userMode === UserMode.CLIENT) {
        loadNearbyFourmiz(userLocation);
      } else {
        loadNearbyRequests(userLocation);
      }
    }
  }, [radiusFilter, selectedService, userMode]);

  // CONFIGURATION DU REFRESH AUTOMATIQUE
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(() => {
      if (AppState.currentState === 'active') {
        console.log('🔄 Refresh automatique position + données...');
        refreshUserLocationAndData();
      }
    }, appConfig.refreshIntervalMs);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [appConfig.refreshIntervalMs, userMode]);

  const loadAppConfig = async (): Promise<AppConfig> => {
    return DEFAULT_APP_CONFIG;
  };

  const refreshUserLocationAndData = async () => {
    if (isRefreshingLocation) {
      console.log('⏭️ Refresh déjà en cours, skip...');
      return;
    }

    setIsRefreshingLocation(true);
    
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('🚫 Permissions GPS non accordées, skip refresh position');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 30000,
      });

      const newRegion: MapRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: userLocation?.latitudeDelta || appConfig.defaultRegion.latitudeDelta,
        longitudeDelta: userLocation?.longitudeDelta || appConfig.defaultRegion.longitudeDelta,
      };

      const distanceMoved = userLocation ? 
        calculateDistance(userLocation, newRegion) : 999;

      setUserLocation(newRegion);

      if (distanceMoved > appConfig.minMovementForRefreshKm) {
        console.log('📍 Déplacement détecté, rechargement données...');
        if (userMode === UserMode.CLIENT) {
          await loadNearbyFourmiz(newRegion);
        } else {
          await loadNearbyRequests(newRegion);
        }
      }

      setLastLocationRefresh(new Date());

    } catch (error) {
      console.error('❌ Erreur refresh position:', error);
    } finally {
      setIsRefreshingLocation(false);
    }
  };

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      const configPromise = loadAppConfig();
      const servicesPromise = loadServiceCategories();
      const locationPromise = initializeLocation();
      
      const [config] = await Promise.all([configPromise, servicesPromise, locationPromise]);
      
      setAppConfig(config);
      setRadiusFilter(config.defaultRadius);
      
      console.log(`✅ Initialisation terminée - Mode: ${userMode}`);
      
    } catch (error) {
      console.error('❌ Erreur initialisation app:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'application');
    } finally {
      setLoading(false);
    }
  };

  // ✅ loadServiceCategories CORRIGÉ - Sans table categories + UTILISE available_orders_filtered
  const loadServiceCategories = async (forceRefresh = false) => {
    try {
      setLoadingServices(true);
      console.log('📂 Chargement catégories réelles depuis available_orders_filtered...');
      
      if (userMode === UserMode.FOURMIZ) {
        // MODE FOURMIZ : Récupérer les catégories des commandes disponibles via available_orders_filtered
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          console.error('❌ Utilisateur non connecté');
          setServiceCategories([]);
          setLoadingServices(false);
          return;
        }

        // ✅ NOUVEAU : Utilise available_orders_filtered pour cohérence
        const { data: ordersData, error: ordersError } = await supabase
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
              client_rating,              
              client_has_real_rating  
            )
          `)
          .neq('client_id', user.id)
          .not('client_id', 'is', null);

        if (ordersError) {
          console.error('❌ Erreur chargement available_orders_filtered:', ordersError);
          throw ordersError;
        }

        // ✅ NOUVEAU : Appliquer la déduplication comme dans available-orders.tsx
        const uniqueOrders = ordersData ? deduplicateOrders(ordersData) : [];
        console.log(`✅ Orders après déduplication: ${uniqueOrders.length} (avant: ${ordersData?.length || 0})`);

        // Extraire les catégories selon la hiérarchie réelle
        const categoriesMap = new Map<string, { name: string; count: number }>();
        
        uniqueOrders?.forEach(order => {
          let categoryName = null;
          
          // Hiérarchie de priorité pour trouver la catégorie
          if (order.addresses?.category) {
            categoryName = order.addresses.category;
          } else if (order.addresses?.categorie) {
            categoryName = order.addresses.categorie;
          } else if (order.services_categorie) {
            categoryName = order.services_categorie;
          } else if (order.service_title) {
            categoryName = order.service_title;
          }
          
          if (categoryName && categoryName.trim() !== '') {
            const cleanName = categoryName.trim();
            if (categoriesMap.has(cleanName)) {
              categoriesMap.set(cleanName, { 
                name: cleanName, 
                count: categoriesMap.get(cleanName)!.count + 1 
              });
            } else {
              categoriesMap.set(cleanName, { name: cleanName, count: 1 });
            }
          }
        });

        // Convertir en format ServiceCategory
        const realCategories: ServiceCategory[] = Array.from(categoriesMap.entries())
          .map(([key, value]) => ({
            id: key.toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[àáâäã]/g, 'a')
              .replace(/[èéêë]/g, 'e')
              .replace(/[&]/g, 'et')
              .replace(/[^a-z0-9-]/g, ''),
            name: value.name,
            icon: CLIENT_ICON,
            color: getFallbackColor(value.name),
            sort_order: 0,
            servicesCount: value.count
          }))
          .sort((a, b) => b.servicesCount! - a.servicesCount!);

        console.log('📊 Catégories des commandes FOURMIZ (cohérentes):', realCategories.length);
        realCategories.forEach(cat => {
          console.log(`  - ${cat.name}: ${cat.servicesCount} commandes`);
        });

        setServiceCategories(realCategories);

      } else {
        // MODE CLIENT : Récupérer les catégories depuis services.categorie avec comptage fourmiz
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('categorie')
          .not('categorie', 'is', null)
          .neq('categorie', '');

        if (servicesError) {
          console.error('❌ Erreur chargement services:', servicesError);
          throw servicesError;
        }

        // Compter les occurrences de chaque catégorie
        const categoriesCount = new Map<string, number>();
        servicesData?.forEach(service => {
          if (service.categorie?.trim()) {
            const cleanName = service.categorie.trim();
            categoriesCount.set(cleanName, (categoriesCount.get(cleanName) || 0) + 1);
          }
        });

        // ✅ CORRIGÉ : Compter les fourmiz directement sans utiliser service_category_id
        const categoriesWithFourmiz = await Promise.all(
          Array.from(categoriesCount.entries()).map(async ([categoryName, serviceCount]) => {
            // ✅ NOUVEAU : Compter les fourmiz qui ont cette catégorie dans service_category_text
            const { count: fourmizCount } = await supabase
              .from('profiles')
              .select('id', { count: 'exact' })
              .contains('roles', ['fourmiz'])
              .eq('is_available', true)
              .ilike('service_category_text', `%${categoryName}%`);

            return {
              name: categoryName,
              serviceCount,
              fourmizCount: fourmizCount || 0
            };
          })
        );

        // Convertir en ServiceCategory
        const clientCategories: ServiceCategory[] = categoriesWithFourmiz
          .filter(cat => cat.fourmizCount > 0) // Garder seulement les catégories avec des fourmiz
          .map(cat => ({
            id: cat.name.toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[àáâäã]/g, 'a')
              .replace(/[èéêë]/g, 'e')
              .replace(/[&]/g, 'et')
              .replace(/[^a-z0-9-]/g, ''),
            name: cat.name,
            icon: FOURMIZ_ICON,
            color: getFallbackColor(cat.name),
            sort_order: 0,
            fourmizCount: cat.fourmizCount,
            servicesCount: cat.serviceCount
          }))
          .sort((a, b) => b.fourmizCount! - a.fourmizCount!);

        console.log('📊 Catégories CLIENT avec fourmiz:', clientCategories.length);
        clientCategories.forEach(cat => {
          console.log(`  - ${cat.name}: ${cat.fourmizCount} fourmiz, ${cat.servicesCount} services`);
        });

        setServiceCategories(clientCategories);
      }

      // Charger les catégories de l'utilisateur
      await loadMyCategories();
      
    } catch (error) {
      console.error('❌ Erreur chargement catégories:', error);
      setServiceCategories([]);
    } finally {
      setLoadingServices(false);
    }
  };

  // ✅ loadMyCategories CORRIGÉ - Utilise service_category_text
  const loadMyCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      if (userMode === UserMode.CLIENT) {
        // Pour un client, récupérer uniquement ses demandes en cours
        const { data: orders, error } = await supabase
          .from('orders')
          .select(`
            services (
              categorie
            )
          `)
          .eq('client_id', user.id)
          .eq('status', 'en_attente')
          .not('service_id', 'is', null);

        if (!error && orders) {
          const uniqueCategories = [...new Set(
            orders
              .map(order => order.services?.categorie)
              .filter(cat => cat)
          )];
          setMyCategories(uniqueCategories);
        }
      } else {
        // ✅ CORRIGÉ : Pour un fourmiz, récupérer ses catégories depuis service_category_text
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('service_category_text, service_types')
          .eq('user_id', user.id)
          .single();

        if (!error && profile) {
          const categories: string[] = [];
          
          // ✅ NOUVEAU : Catégorie principale depuis service_category_text
          if (profile.service_category_text) {
            categories.push(profile.service_category_text);
          }
          
          // Catégories supplémentaires depuis service_types (basées sur les catégories textuelles)
          if (profile.service_types && typeof profile.service_types === 'object') {
            const selectedServiceTypes = Object.entries(profile.service_types)
              .filter(([key, isSelected]) => isSelected)
              .map(([key]) => key);
            
            // ✅ NOUVEAU : Mapper les service_types vers les noms de catégories textuelles
            const categoryMapping = serviceCategories.reduce((acc, cat) => {
              const key = cat.name.toLowerCase()
                .replace(/\s+/g, '_')
                .replace(/[àáâäã]/g, 'a')
                .replace(/[èéêë]/g, 'e')
                .replace(/[ìíîï]/g, 'i')
                .replace(/[òóôöõ]/g, 'o')
                .replace(/[ùúûü]/g, 'u')
                .replace(/[ç]/g, 'c')
                .replace(/[^a-z0-9_]/g, '');
              acc[key] = cat.name; // Utiliser le nom de la catégorie au lieu de l'ID
              return acc;
            }, {} as Record<string, string>);

            selectedServiceTypes.forEach(serviceType => {
              const categoryName = categoryMapping[serviceType];
              if (categoryName && !categories.includes(categoryName)) {
                categories.push(categoryName);
              }
            });
          }
          
          setMyCategories(categories);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement mes catégories:', error);
      setMyCategories([]);
    }
  };

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'L\'accès à la localisation est nécessaire pour afficher les données près de vous.',
          [
            { text: 'Paramètres', onPress: () => Location.requestForegroundPermissionsAsync() },
            { text: 'Continuer sans', style: 'cancel' }
          ]
        );
        setUserLocation(appConfig.defaultRegion);
        if (userMode === UserMode.CLIENT) {
          await loadNearbyFourmiz(appConfig.defaultRegion);
        } else {
          await loadNearbyRequests(appConfig.defaultRegion);
        }
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const userRegion: MapRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: appConfig.defaultRegion.latitudeDelta,
        longitudeDelta: appConfig.defaultRegion.longitudeDelta,
      };

      setUserLocation(userRegion);
      setLastLocationRefresh(new Date());
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(userRegion, 1000);
      }

      if (userMode === UserMode.CLIENT) {
        await loadNearbyFourmiz(userRegion);
      } else {
        await loadNearbyRequests(userRegion);
      }
      
    } catch (error) {
      console.error('❌ Erreur initialisation localisation:', error);
      Alert.alert('Erreur', 'Impossible de charger votre position');
      setUserLocation(appConfig.defaultRegion);
      
      if (userMode === UserMode.CLIENT) {
        await loadNearbyFourmiz(appConfig.defaultRegion);
      } else {
        await loadNearbyRequests(appConfig.defaultRegion);
      }
    }
  };

  // ✅ loadNearbyFourmiz CORRIGÉ - Utilise service_category_text
  const loadNearbyFourmiz = async (region: MapRegion) => {
    try {
      setLoadingData(true);
      console.log('🔍 MODE CLIENT - Recherche Fourmiz:', {
        lat: region.latitude,
        lng: region.longitude,
        radius: radiusFilter,
        selectedService,
        serviceCategories: serviceCategories.length
      });

      // ✅ CORRIGÉ : Requête utilisant service_category_text
      let query = supabase
        .from('profiles')
        .select(`
          *
        `)
        .eq('is_available', true)
        .contains('roles', ['fourmiz'])
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      // ✅ CORRIGÉ : Filtrage par service_category_text
      if (selectedService !== 'all' && selectedService !== 'my') {
        console.log('🔎 Filtrage par service_category_text:', selectedService);
        const selectedCategory = serviceCategories.find(cat => cat.id === selectedService);
        if (selectedCategory) {
          query = query.ilike('service_category_text', `%${selectedCategory.name}%`);
        }
      } else if (selectedService === 'my') {
        console.log('🎯 Filtrage "Mes catégories":', myCategories);
        if (myCategories.length > 0) {
          // ✅ NOUVEAU : Filtrer par noms de catégories textuelles
          query = query.or(
            myCategories.map(cat => `service_category_text.ilike.%${cat}%`).join(',')
          );
        }
      } else {
        console.log('🌐 Pas de filtre (tous)');
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erreur requête profiles:', error);
        throw error;
      }

      console.log(`📊 Profiles trouvés avant filtre distance: ${data?.length || 0}`);

      if (!data || data.length === 0) {
        console.log('🚫 Aucun fourmiz trouvé avec les critères actuels');
        setFourmizList([]);
        return;
      }

      // Filtrer par distance
      let nearbyProfiles = data.filter((profile: any) => {
        if (!profile.latitude || !profile.longitude) return false;
        
        const distance = calculateDistance(
          region,
          { latitude: profile.latitude, longitude: profile.longitude, latitudeDelta: 0, longitudeDelta: 0 }
        );
        
        return distance <= radiusFilter;
      });

      console.log(`📍 Profiles dans le rayon ${radiusFilter}km: ${nearbyProfiles.length}`);

      const transformedData: Fourmiz[] = nearbyProfiles.map((profile: any) => {
        const distance = calculateDistance(
          region,
          { latitude: profile.latitude, longitude: profile.longitude, latitudeDelta: 0, longitudeDelta: 0 }
        );

        // ✅ DEBUG : Afficher les catégories textuelles
        console.log('🔍 Profile-Catégorie:', {
          profileId: profile.id,
          categoryText: profile.service_category_text || 'Non défini'
        });

        return {
          id: profile.id,
          name: `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || 'Fourmiz',
          service: profile.service_category_text || 'Service général',
          serviceColor: getFallbackColor(profile.service_category_text),
          serviceIcon: FOURMIZ_ICON,
          rating: parseFloat(profile.fourmiz_rating || profile.default_rating) || 4.5,
          location: {
            latitude: parseFloat(profile.latitude),
            longitude: parseFloat(profile.longitude)
          },
          available: profile.is_available || false,
          distance: `${distance.toFixed(1)} km`,
          price: 'Disponible',
          avatar: FOURMIZ_ICON,
          verified: (parseFloat(profile.fourmiz_rating || profile.default_rating) || 4.5) >= 4.0,
          responseTime: `${profile.response_time_minutes || 30} min`,
          fullData: profile
        };
      });

      console.log(`✅ Fourmiz transformés et chargés: ${transformedData.length}`);
      setFourmizList(transformedData);

    } catch (error) {
      console.error('❌ Erreur chargement Fourmiz:', error);
      setFourmizList([]);
    } finally {
      setLoadingData(false);
    }
  };

  // ✅ loadNearbyRequests CORRIGÉ - UTILISE available_orders_filtered + DÉDUPLICATION
  const loadNearbyRequests = async (region: MapRegion) => {
    try {
      setLoadingData(true);
      console.log('🔍 MODE FOURMIZ - Recherche demandes clients (cohérent):', {
        lat: region.latitude,
        lng: region.longitude,
        radius: radiusFilter,
        selectedService,
        serviceCategories: serviceCategories.length
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        console.error('❌ Utilisateur non connecté');
        setRequestsList([]);
        setLoadingData(false);
        return;
      }

      // ✅ CORRIGÉ : Utilise available_orders_filtered pour cohérence avec available-orders.tsx
      let query = supabase
        .from('available_orders_filtered')
        .select(`
          *,
          client_profile:client_id (
            id,
            firstname,
            lastname,
            avatar_url,
            city,
            latitude,
            longitude,
            rating
          )
        `)
        .neq('client_id', user.id)
        .not('client_id', 'is', null);

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erreur requête available_orders_filtered:', error);
        throw error;
      }

      console.log(`📊 Orders trouvés avant filtres et déduplication: ${data?.length || 0}`);

      if (!data || data.length === 0) {
        console.log('🚫 Aucune demande trouvée');
        setRequestsList([]);
        return;
      }

      // ✅ NOUVEAU : Appliquer la déduplication comme dans available-orders.tsx
      const deduplicatedData = deduplicateOrders(data);
      console.log(`✅ Après déduplication: ${deduplicatedData.length} (supprimé: ${data.length - deduplicatedData.length})`);

      // FILTRAGE par catégorie services.categorie
      let filteredOrders = deduplicatedData;
      
      if (selectedService !== 'all' && selectedService !== 'my') {
        console.log('🔎 Filtrage par catégorie:', selectedService);
        
        // Trouver le nom de la catégorie sélectionnée
        const selectedCategory = serviceCategories.find(cat => cat.id === selectedService);
        const categoryName = selectedCategory?.name;
        
        if (categoryName) {
          filteredOrders = deduplicatedData.filter((order: any) => {
            // Extraire la catégorie selon la hiérarchie
            let orderCategory = null;
            
            if (order.addresses?.category) {
              orderCategory = order.addresses.category;
            } else if (order.addresses?.categorie) {
              orderCategory = order.addresses.categorie;
            } else if (order.services_categorie) {
              orderCategory = order.services_categorie;
            } else if (order.service_title) {
              orderCategory = order.service_title;
            }
            
            const match = orderCategory && orderCategory.toLowerCase().includes(categoryName.toLowerCase());
            if (!match) {
              console.log('❌ Order exclu:', {
                orderId: order.id,
                orderCategory,
                expectedCategory: categoryName
              });
            }
            return match;
          });
        }
        
        console.log(`📊 Orders après filtre catégorie: ${filteredOrders.length}`);
      } else if (selectedService === 'my') {
        // Logique "Mes catégories" à implémenter si nécessaire
        console.log('🎯 Filtrage "Mes catégories" - à implémenter');
      }

      // Filtrer par distance
      let nearbyRequests = filteredOrders.filter((order: any) => {
        if (!order.client_profile?.latitude || !order.client_profile?.longitude) return false;
        
        const distance = calculateDistance(
          region,
          { latitude: order.client_profile.latitude, longitude: order.client_profile.longitude, latitudeDelta: 0, longitudeDelta: 0 }
        );
        
        return distance <= radiusFilter;
      });

      console.log(`📍 Orders dans le rayon ${radiusFilter}km: ${nearbyRequests.length}`);

      // Validation rigoureuse des IDs + transformation + colonne "urgent" corrigée
      const transformedRequests: ClientRequest[] = nearbyRequests
        .map((order: any) => {
          // VALIDATION RIGOUREUSE DE L'ID
          if (!order.id || order.id === null || order.id === undefined) {
            console.warn('⚠️ Order sans ID valide, ignoré:', order);
            return null;
          }

          const orderId = String(order.id).trim();
          
          // VÉRIFICATION SUPPLÉMENTAIRE
          if (orderId === '' || orderId === 'null' || orderId === 'undefined') {
            console.warn('⚠️ Order avec ID invalide, ignoré:', { orderId, originalId: order.id });
            return null;
          }

          const distance = calculateDistance(
            region,
            { latitude: order.client_profile.latitude, longitude: order.client_profile.longitude, latitudeDelta: 0, longitudeDelta: 0 }
          );

         // Affichage uniquement du montant de commission fourmiz
          const fourmizAmount = order.fourmiz_amount || 0;
          let budgetText = `${Number(fourmizAmount).toFixed(2)}€`;

          // Extraction catégorie avec services.categorie
          let serviceName = 'Service non spécifié';
          let serviceColor = '#757575';
          
          if (order.addresses?.category) {
            serviceName = order.addresses.category;
            serviceColor = getFallbackColor(serviceName);
          } else if (order.addresses?.categorie) {
            serviceName = order.addresses.categorie;
            serviceColor = getFallbackColor(serviceName);
          } else if (order.services_categorie) {
            serviceName = order.services_categorie;
            serviceColor = getFallbackColor(serviceName);
          } else if (order.service_title) {
            serviceName = order.service_title;
            serviceColor = getFallbackColor(serviceName);
          }

          return {
            id: orderId, // ID déjà validé
            title: order.description?.substring(0, 50) || 'Demande de service',
            description: order.description || 'Aucune description fournie',
            service: serviceName,
            serviceColor: serviceColor,
            serviceIcon: CLIENT_ICON,
            budget: budgetText,
            location: {
              latitude: parseFloat(order.client_profile.latitude),
              longitude: parseFloat(order.client_profile.longitude)
            },
            distance: `${distance.toFixed(1)} km`,
            clientName: `${order.client_profile?.firstname || ''} ${order.client_profile?.lastname || ''}`.trim() || 'Client',
            clientAvatar: order.client_profile?.avatar_url || '',
            urgency: order.urgent || 'medium',
            createdAt: new Date(order.created_at),
            fullData: order
          };
        })
        .filter(Boolean); // FILTRER LES ÉLÉMENTS NULL

      console.log(`✅ ${transformedRequests.length} demandes transformées et chargées (COHÉRENT avec available-orders)`);
      setRequestsList(transformedRequests);

    } catch (error: any) {
      console.error('❌ Erreur chargement demandes:', error);
      Alert.alert(
        'Erreur de connexion', 
        'Impossible de charger les demandes. Vérifiez votre connexion.',
        [
          { text: 'Réessayer', onPress: () => loadNearbyRequests(region) },
          { text: 'OK', style: 'cancel' }
        ]
      );
      setRequestsList([]);
    } finally {
      setLoadingData(false);
    }
  };

  // GESTION DES FILTRES SELON LE MODE
  const getFilteredData = () => {
    const data = userMode === UserMode.CLIENT ? fourmizList : requestsList;
    
    if (!searchQuery.trim()) {
      return data;
    }

    const query = searchQuery.toLowerCase().trim();
    return data.filter((item: any) => {
      if (userMode === UserMode.CLIENT) {
        return (
          item.name.toLowerCase().includes(query) ||
          item.service.toLowerCase().includes(query)
        );
      } else {
        return (
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.service.toLowerCase().includes(query) ||
          item.clientName.toLowerCase().includes(query)
        );
      }
    });
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      const configPromise = loadAppConfig();
      const servicesPromise = loadServiceCategories(true);
      const locationPromise = refreshUserLocationAndData();
      
      const [config] = await Promise.all([configPromise, servicesPromise, locationPromise]);
      
      setAppConfig(config);
      
      console.log('✅ Rafraîchissement terminé');
    } catch (error) {
      console.error('❌ Erreur rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // SÉLECTION D'ÉLÉMENTS - VERSION CORRIGÉE AVEC DEBUG
  const handleItemSelect = (item: Fourmiz | ClientRequest) => {
    console.log('🎯 Sélection item:', { 
      id: item.id, 
      type: typeof item.id,
      userMode,
      itemType: userMode === UserMode.CLIENT ? 'Fourmiz' : 'ClientRequest' 
    });
    
    if (userMode === UserMode.CLIENT) {
      setSelectedFourmiz(item as Fourmiz);
      setShowFourmizDetail(true);
    } else {
      setSelectedRequest(item as ClientRequest);
      setShowRequestDetail(true);
      console.log('🔍 ClientRequest sélectionnée:', { 
        id: (item as ClientRequest).id, 
        title: (item as ClientRequest).title 
      });
    }
    
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...item.location,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  // ACTIONS SELON LE MODE - VERSION CORRIGÉE AVEC DEBUG COMPLET
  const handleContactAction = (id: string) => {
    console.log('🚀 HandleContactAction appelée:', { 
      id, 
      type: typeof id,
      userMode,
      selectedRequest: selectedRequest ? {
        id: selectedRequest.id,
        title: selectedRequest.title
      } : 'null'
    });
    
    if (userMode === UserMode.CLIENT) {
      setShowFourmizDetail(false);
      console.log('👤 Navigation CLIENT vers profil fourmiz avec fourmizId:', id);
      // 🔧 MODIFIÉ : Navigation vers profil fourmiz en lecture seule avec from=map
      router.push(`/fourmiz-profile-readonly/${id}?from=map`);
    } else {
      setShowRequestDetail(false);
      
      // Vérifications rigoureuses
      if (!id) {
        console.error('❌ ID manquant');
        Alert.alert('Erreur', 'Identifiant de commande manquant');
        return;
      }
      
      if (id === 'undefined' || id === 'null') {
        console.error('❌ ID invalide:', id);
        Alert.alert('Erreur', 'Identifiant de commande invalide');
        return;
      }
      
      const targetUrl = `/orders/${id}`;
      console.log('🐜 Navigation FOURMIZ vers:', targetUrl);
      
      try {
        router.push(targetUrl);
        console.log('✅ Navigation lancée vers:', targetUrl);
      } catch (error) {
        console.error('❌ Erreur navigation:', error);
        Alert.alert('Erreur de navigation', `Impossible d'ouvrir la commande ${id}`);
      }
    }
  };

  // CHARGEMENT INITIAL
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Initialisation de la carte...</Text>
          <Text style={styles.loadingSubtext}>
            Chargement du mode {userMode}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredData = getFilteredData();
  const dataCount = userMode === UserMode.CLIENT ? fourmizList.length : requestsList.length;
  const modeLabel = userMode === UserMode.CLIENT ? 'CLIENT' : 'FOURMIZ';
  const dataLabel = userMode === UserMode.CLIENT ? 'Fourmiz' : 'Demandes';

  console.log(`🗺️ Rendu carte ${modeLabel} (COHÉRENT):`, {
    totalData: dataCount,
    filteredData: filteredData.length,
    userLocation: !!userLocation,
    servicesCount: serviceCategories.length,
    lastRefresh: lastLocationRefresh?.toLocaleTimeString()
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* CARTE */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={userLocation || appConfig.defaultRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {/* CERCLE DE RAYON */}
        {userLocation && (
          <Circle
            center={userLocation}
            radius={radiusFilter * 1000}
            strokeColor="rgba(0,0,0,0.2)"
            fillColor="rgba(0,0,0,0.05)"
          />
        )}

        {/* MARQUEURS ADAPTÉS AU MODE */}
        {filteredData.map((item: any) => (
          <Marker
            key={item.id}
            coordinate={item.location}
            onPress={() => handleItemSelect(item)}
          >
            <View style={[
              styles.markerContainer,
              { borderColor: item.serviceColor || '#757575' } // Couleur selon la catégorie de service
            ]}>
              <Text style={styles.markerEmoji}>
                {userMode === UserMode.CLIENT ? FOURMIZ_ICON : CLIENT_ICON}
              </Text>
              {((userMode === UserMode.CLIENT && item.verified) || 
                (userMode === UserMode.FOURMIZ && item.urgency === 'high')) && (
                <View style={[
                  styles.verifiedBadge,
                  userMode === UserMode.FOURMIZ && item.urgency === 'high' 
                    ? { backgroundColor: '#FF9800' } // Orange pour l'éclair
                    : { backgroundColor: '#4CAF50' }  // Vert pour la certification
                ]}>
                  <Ionicons 
                    name={userMode === UserMode.CLIENT ? "shield-checkmark" : "flash"} 
                    size={4} 
                    color="#fff" 
                  />
                </View>
              )}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* INDICATEURS DE CHARGEMENT */}
      {(loadingData || loadingServices) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={styles.loadingOverlayText}>
            {loadingServices ? 'Chargement des services...' : `Recherche ${dataLabel}...`}
          </Text>
        </View>
      )}

      {/* INDICATEUR REFRESH POSITION */}
      {isRefreshingLocation && (
        <View style={styles.refreshIndicator}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={styles.refreshText}>Mise à jour position...</Text>
        </View>
      )}

      {/* BOUTONS D'ACTION */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            if (userLocation && mapRef.current) {
              mapRef.current.animateToRegion(userLocation, 1000);
            }
          }}
        >
          <Ionicons name="locate" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={refreshData}
          disabled={refreshing || loadingData || isRefreshingLocation}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color={(refreshing || loadingData || isRefreshingLocation) ? "#ccc" : "#000"} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowList(true)}
        >
          <Ionicons name="list" size={24} color="#000" />
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filteredData.length}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* DEBUG INFO ADAPTÉ AU MODE */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          {modeLabel} | {dataLabel}: {dataCount} | Filtrés: {filteredData.length} | Service: {selectedService} | Rayon: {radiusFilter}km
        </Text>
        <Text style={styles.debugText}>
          Dernière position: {lastLocationRefresh?.toLocaleTimeString() || 'Jamais'} | Refresh: {isRefreshingLocation ? 'En cours' : 'Idle'} | Source: available_orders_filtered
        </Text>
      </View>

      {/* MODALS ADAPTÉES AU MODE */}
      <FourmizDetailModal
        fourmiz={selectedFourmiz}
        visible={showFourmizDetail}
        onClose={() => setShowFourmizDetail(false)}
        onContactFourmiz={handleContactAction}
      />

      <RequestDetailModal
        request={selectedRequest}
        visible={showRequestDetail}
        onClose={() => setShowRequestDetail(false)}
        onRespondToRequest={handleContactAction}
      />

      {/* MODAL LISTE ADAPTÉE */}
      <Modal
        visible={showList}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {dataLabel} ({filteredData.length})
            </Text>
            <TouchableOpacity onPress={() => setShowList(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.listItem}
                onPress={() => {
                  setShowList(false);
                  handleItemSelect(item);
                }}
              >
                <View style={styles.listInfo}>
                  <Text style={styles.listEmoji}>
                    {userMode === UserMode.CLIENT ? FOURMIZ_ICON : CLIENT_ICON}
                  </Text>
                  <View style={styles.listDetails}>
                    <View style={styles.listHeader}>
                      <Text style={styles.listName}>
                        {userMode === UserMode.CLIENT ? item.name : item.title}
                      </Text>
                      {((userMode === UserMode.CLIENT && item.verified) || 
                        (userMode === UserMode.FOURMIZ && item.urgency === 'high')) && (
                        <Ionicons 
                          name={userMode === UserMode.CLIENT ? "checkmark-circle" : "alert-circle"} 
                          size={16} 
                          color={userMode === UserMode.CLIENT ? "#4CAF50" : "#F44336"} 
                        />
                      )}
                    </View>
                    <View style={styles.serviceRow}>
                      <Text style={[styles.serviceRowEmoji, { color: item.serviceColor }]}>
                        {userMode === UserMode.CLIENT ? FOURMIZ_ICON : CLIENT_ICON}
                      </Text>
                      <Text style={[styles.listService, { color: item.serviceColor }]}>
                        {item.service}
                      </Text>
                    </View>
                    <View style={styles.listMeta}>
                      {userMode === UserMode.CLIENT ? (
                        <>
                          <Ionicons name="star" size={14} color="#FFD700" />
                          <Text style={styles.listRating}>{item.rating}</Text>
                          <Text style={styles.listDistance}>• {item.distance}</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.listClient}>par {item.clientName}</Text>
                          <Text style={styles.listDistance}>• {item.distance}</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
                <Text style={styles.listPrice}>
                  {userMode === UserMode.CLIENT ? item.price : item.budget}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refreshData}
                colors={['#000000']}
              />
            }
          />
          
          {filteredData.length === 0 && !loadingData && (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>Aucun {dataLabel.toLowerCase()} trouvé</Text>
              <Text style={styles.emptyStateSubtext}>
                Essayez d'augmenter le rayon de recherche ou changez de service
              </Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={refreshData}
              >
                <Text style={styles.refreshButtonText}>Actualiser</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* MODAL FILTRES ADAPTÉE */}
      <Modal
        visible={showFilters}
        transparent
        animationType="fade"
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filtres de recherche</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Catégorie de service</Text>
              <ScrollView style={styles.categoriesScrollView} showsVerticalScrollIndicator={false}>
                {/* Option "Toutes les catégories" */}
                <TouchableOpacity
                  style={[
                    styles.categoryFilterItem,
                    selectedService === 'all' && styles.categoryFilterItemSelected
                  ]}
                  onPress={() => setSelectedService('all')}
                >
                  <Text style={styles.categoryFilterEmoji}>
                    {userMode === UserMode.CLIENT ? FOURMIZ_ICON : CLIENT_ICON}
                  </Text>
                  <Text style={[
                    styles.categoryFilterText,
                    selectedService === 'all' && styles.categoryFilterTextSelected
                  ]}>
                    Toutes les catégories
                  </Text>
                  {selectedService === 'all' && (
                    <Ionicons name="checkmark" size={12} color="#000" style={styles.categoryCheckmark} />
                  )}
                </TouchableOpacity>

                {/* Option "Mes catégories" - SEULEMENT pour les FOURMIZ */}
                {userMode === UserMode.FOURMIZ && (
                  <TouchableOpacity
                    style={[
                      styles.categoryFilterItem,
                      selectedService === 'my' && styles.categoryFilterItemSelected,
                      myCategories.length === 0 && styles.categoryFilterItemDisabled
                    ]}
                    onPress={() => myCategories.length > 0 && setSelectedService('my')}
                    disabled={myCategories.length === 0}
                  >
                    <Text style={[
                      styles.categoryFilterEmoji,
                      myCategories.length === 0 && styles.categoryFilterEmojiDisabled
                    ]}>
                      🎯
                    </Text>
                    <View style={styles.categoryFilterTextContainer}>
                      <Text style={[
                        styles.categoryFilterText,
                        selectedService === 'my' && styles.categoryFilterTextSelected,
                        myCategories.length === 0 && styles.categoryFilterTextDisabled
                      ]}>
                        Mes catégories
                      </Text>
                      <Text style={[
                        styles.categoryFilterSubtext,
                        selectedService === 'my' && styles.categoryFilterSubtextSelected,
                        myCategories.length === 0 && styles.categoryFilterSubtextDisabled
                      ]}>
                        {myCategories.length === 0 
                          ? 'Aucune catégorie configurée'
                          : `${myCategories.length} catégorie${myCategories.length > 1 ? 's' : ''} configurée${myCategories.length > 1 ? 's' : ''}`
                        }
                      </Text>
                    </View>
                    {selectedService === 'my' && myCategories.length > 0 && (
                      <Ionicons name="checkmark" size={12} color="#000" style={styles.categoryCheckmark} />
                    )}
                  </TouchableOpacity>
                )}

                {/* Séparateur - conditionné selon le mode */}
                {userMode === UserMode.FOURMIZ && myCategories.length > 0 && (
                  <View style={styles.categorySeparator}>
                    <View style={styles.categorySeparatorLine} />
                    <Text style={styles.categorySeparatorText}>Catégories spécifiques</Text>
                    <View style={styles.categorySeparatorLine} />
                  </View>
                )}

                {/* Liste des catégories individuelles */}
                {serviceCategories.filter(cat => cat.id !== 'all').map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryFilterItem,
                      selectedService === category.id && [
                        styles.categoryFilterItemSelected,
                        { backgroundColor: '#f8f8f8' }
                      ]
                    ]}
                    onPress={() => setSelectedService(category.id)}
                  >
                    <Text style={[
                      styles.categoryFilterEmoji,
                      { color: selectedService === category.id ? '#000' : category.color }
                    ]}>
                      {userMode === UserMode.CLIENT ? FOURMIZ_ICON : CLIENT_ICON}
                    </Text>
                    <View style={styles.categoryFilterTextContainer}>
                      <Text style={[
                        styles.categoryFilterText,
                        selectedService === category.id && styles.categoryFilterTextSelected
                      ]}>
                        {category.name}
                      </Text>
                      {/* Affichage du nombre de résultats */}
                      <Text style={[
                        styles.categoryFilterSubtext,
                        selectedService === category.id && styles.categoryFilterSubtextSelected
                      ]}>
                        {userMode === UserMode.CLIENT 
                          ? `${category.fourmizCount || 0} fourmiz` 
                          : `${category.servicesCount || 0} commande${(category.servicesCount || 0) > 1 ? 's' : ''}`
                        }
                      </Text>
                    </View>
                    {selectedService === category.id && (
                      <Ionicons name="checkmark" size={12} color="#000" style={styles.categoryCheckmark} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Rayon de recherche</Text>
              <View style={styles.radiusContainer}>
                {appConfig.availableRadius.map((radius) => (
                  <TouchableOpacity
                    key={radius}
                    style={[
                      styles.radiusButton,
                      radiusFilter === radius && styles.radiusButtonSelected
                    ]}
                    onPress={() => setRadiusFilter(radius)}
                  >
                    <Text style={[
                      styles.radiusButtonText,
                      radiusFilter === radius && styles.radiusButtonTextSelected
                    ]}>
                      {radius} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              style={styles.applyFiltersButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyFiltersText}>Appliquer les filtres</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// STYLES COMPLETS POUR DUAL MODE
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // Chargement
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  loadingOverlayText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },

  // Badge mode
  modeBadge: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 1,
  },
  modeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Indicateur refresh position
  refreshIndicator: {
    position: 'absolute',
    top: 120,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1,
  },
  refreshText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666',
  },

  // Debug
  debugInfo: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 8,
    borderRadius: 8,
    zIndex: 1,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },

  // Carte
  map: {
    flex: 1,
  },

  // Marqueurs
  markerContainer: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#fff',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  markerEmoji: {
    fontSize: 12,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Boutons d'action
  actionButtons: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Modal container générique
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },

  // Modal fourmiz detail
  modalContent: {
    flex: 1,
    padding: 20,
  },
  fourmizModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  requestModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  fourmizModalName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  requestModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  requestModalClient: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  fourmizModalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestModalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  budgetText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  metaDivider: {
    marginHorizontal: 8,
    color: '#ccc',
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
  },
  responseTimeText: {
    fontSize: 14,
    color: '#666',
  },

  modalSection: {
    marginBottom: 20,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  modalSectionContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 28,
  },
  modalBioText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginLeft: 28,
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    fontStyle: 'italic',
  },
  noCriteriaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 16,
  },
  noCriteriaText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Liste générique - Style épuré
  listContent: {
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  listDetails: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  listName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginRight: 6,
    flex: 1,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  serviceRowEmoji: {
    fontSize: 11,
    marginRight: 3,
  },
  listService: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listRating: {
    marginLeft: 3,
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  listDistance: {
    fontSize: 11,
    color: '#666',
    marginLeft: 3,
    fontWeight: '400',
  },
  listClient: {
    fontSize: 11,
    color: '#666',
    fontWeight: '400',
  },
  listPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },

  // État vide
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#000',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal filtres - Style épuré
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },

  categoriesScrollView: {
    maxHeight: 280,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  categoryFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'relative',
  },
  categoryFilterItemSelected: {
    backgroundColor: '#f8f8f8',
    borderLeftWidth: 3,
    borderLeftColor: '#000',
  },
  categoryFilterItemDisabled: {
    backgroundColor: '#f9f9f9',
    opacity: 0.6,
  },
  categoryFilterTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  categoryFilterText: {
    fontSize: 13,
    color: '#000',
    fontWeight: '500',
  },
  categoryFilterTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  categoryFilterTextDisabled: {
    color: '#999',
  },
  categoryFilterSubtext: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  categoryFilterSubtextSelected: {
    color: '#666',
  },
  categoryFilterSubtextDisabled: {
    color: '#bbb',
  },
  categoryFilterEmoji: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryFilterEmojiDisabled: {
    opacity: 0.5,
  },
  categoryCheckmark: {
    marginLeft: 8,
  },
  categorySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
  },
  categorySeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  categorySeparatorText: {
    marginHorizontal: 12,
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
    textTransform: 'uppercase',
  },

  radiusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  radiusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  radiusButtonSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  radiusButtonText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  radiusButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  applyFiltersButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  applyFiltersText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
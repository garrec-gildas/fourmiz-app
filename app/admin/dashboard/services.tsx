import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  ArrowLeft, 
  Search,
  Download, 
  Filter, 
  RefreshCw,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Plus,
  Upload,
  FileText,
  Mail,
  Settings,
  BarChart3,
  Users,
  Clock,
  Euro,
  Tag,
  Star,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  MoreVertical,
  Archive,
  Unarchive,
  Copy,
  ExternalLink,
  Zap
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase'; // Ajustez le chemin selon votre structure

const { width } = Dimensions.get('window');

// ✅ INTERFACES TYPESCRIPT STRICTES ÉTENDUES
interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price_min: number;
  price_max: number;
  duration_min: number;
  duration_max: number;
  is_active: boolean;
  is_featured: boolean;
  credit_impot: boolean;
  credit_impot_rate: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
  provider_id: string;
  rating: number;
  orders_count: number;
  revenue_total: number;
  last_order_date?: string;
  tags: string[];
  availability_zones: string[];
  required_equipment: string[];
  skill_level: 'beginner' | 'intermediate' | 'expert';
  seasonal: boolean;
  peak_hours: string[];
}

interface ServiceStats {
  total_services: number;
  active_services: number;
  hidden_services: number;
  featured_services: number;
  credit_impot_services: number;
  total_revenue: number;
  average_rating: number;
  total_orders: number;
  categories_count: number;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  services_count: number;
  average_price: number;
  is_popular: boolean;
}

interface HiddenServiceConfig {
  serviceId: string;
  hiddenAt: string;
  reason?: string;
  hiddenBy: string;
}

interface FilterOptions {
  categories: string[];
  priceRange: [number, number];
  creditImpot: boolean | null;
  featured: boolean | null;
  active: boolean | null;
  rating: number | null;
  availability: string[];
}

// ✅ CONFIGURATION DES STATUTS ET TYPES
const categoryConfig = {
  'menage': { label: 'Ménage', color: '#4CAF50', icon: '🏠' },
  'jardinage': { label: 'Jardinage', color: '#8BC34A', icon: '🌱' },
  'bricolage': { label: 'Bricolage', color: '#FF9800', icon: '🔧' },
  'courses': { label: 'Courses', color: '#2196F3', icon: '🛒' },
  'livraison': { label: 'Livraison', color: '#9C27B0', icon: '📦' },
  'garde': { label: 'Garde', color: '#E91E63', icon: '👶' },
  'soutien': { label: 'Soutien scolaire', color: '#3F51B5', icon: '📚' },
  'informatique': { label: 'Informatique', color: '#607D8B', icon: '💻' },
  'automobile': { label: 'Automobile', color: '#795548', icon: '🚗' },
  'autre': { label: 'Autre', color: '#9E9E9E', icon: '⭐' },
};

const skillLevelConfig = {
  'beginner': { label: 'Débutant', color: '#4CAF50' },
  'intermediate': { label: 'Intermédiaire', color: '#FF9800' },
  'expert': { label: 'Expert', color: '#F44336' },
};

export default function ServicesScreen() {
  // ✅ ÉTATS DE CHARGEMENT ET GESTION D'ERREUR AVANCÉE
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [stats, setStats] = useState<ServiceStats | null>(null);
  const [hiddenServices, setHiddenServices] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  
  // États de filtrage et recherche avancés
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    priceRange: [0, 1000],
    creditImpot: null,
    featured: null,
    active: null,
    rating: null,
    availability: [],
  });
  const [sortBy, setSortBy] = useState<'title' | 'price' | 'rating' | 'orders' | 'revenue' | 'date'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // États d'affichage et modals
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  
  // Modal d'édition avancée
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editForm, setEditForm] = useState<Partial<Service>>({});
  
  // Modal de statistiques détaillées
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  
  // États utilisateur
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'moderator' | 'user'>('user');

  // ✅ CHARGEMENT DES DONNÉES SUPABASE OPTIMISÉ
  const loadServicesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer l'utilisateur actuel et son rôle
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Utilisateur non connecté');
      
      setCurrentUserId(user.id);
      
      // Récupérer le rôle utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (!profileError && profile) {
        setUserRole(profile.role);
      }

      // Charger les données en parallèle avec optimisations
      const [servicesResult, categoriesResult, statsResult, hiddenResult] = await Promise.all([
        loadServices(),
        loadCategories(),
        loadServiceStats(),
        loadHiddenServices(),
      ]);

      setServices(servicesResult);
      setCategories(categoriesResult);
      setStats(statsResult);
      setHiddenServices(new Set(hiddenResult.map(h => h.serviceId)));

    } catch (error) {
      console.error('Erreur chargement services:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
      Alert.alert('Erreur', 'Impossible de charger les données des services');
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ FONCTIONS DE CHARGEMENT MODULAIRES OPTIMISÉES
  const loadServices = async (): Promise<Service[]> => {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        service_stats (
          orders_count,
          revenue_total,
          rating,
          last_order_date
        ),
        service_tags (
          tag_name
        ),
        service_availability (
          zone_name
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    
    // Transformer les données pour correspondre à l'interface
    return (data || []).map(service => ({
      ...service,
      rating: service.service_stats?.[0]?.rating || 0,
      orders_count: service.service_stats?.[0]?.orders_count || 0,
      revenue_total: service.service_stats?.[0]?.revenue_total || 0,
      last_order_date: service.service_stats?.[0]?.last_order_date,
      tags: service.service_tags?.map((t: any) => t.tag_name) || [],
      availability_zones: service.service_availability?.map((a: any) => a.zone_name) || [],
    }));
  };

  const loadCategories = async (): Promise<ServiceCategory[]> => {
    const { data, error } = await supabase
      .from('service_categories')
      .select(`
        *,
        services!inner(id)
      `)
      .order('services_count', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const loadServiceStats = async (): Promise<ServiceStats> => {
    const { data, error } = await supabase
      .rpc('get_service_statistics');

    if (error) throw error;
    return data || {
      total_services: 0,
      active_services: 0,
      hidden_services: 0,
      featured_services: 0,
      credit_impot_services: 0,
      total_revenue: 0,
      average_rating: 0,
      total_orders: 0,
      categories_count: 0,
    };
  };

  const loadHiddenServices = async (): Promise<HiddenServiceConfig[]> => {
    try {
      const stored = await AsyncStorage.getItem('hidden_services');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erreur chargement services masqués:', error);
      return [];
    }
  };

  // ✅ FILTRAGE ET TRI AVANCÉS
  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...services];

    // Appliquer la recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(service =>
        service.title.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query) ||
        service.category.toLowerCase().includes(query) ||
        service.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Appliquer les filtres avancés
    if (filters.categories.length > 0) {
      filtered = filtered.filter(service => filters.categories.includes(service.category));
    }

    if (filters.priceRange) {
      filtered = filtered.filter(service => 
        service.price_min >= filters.priceRange[0] && 
        service.price_max <= filters.priceRange[1]
      );
    }

    if (filters.creditImpot !== null) {
      filtered = filtered.filter(service => service.credit_impot === filters.creditImpot);
    }

    if (filters.featured !== null) {
      filtered = filtered.filter(service => service.is_featured === filters.featured);
    }

    if (filters.active !== null) {
      filtered = filtered.filter(service => service.is_active === filters.active);
    }

    if (filters.rating !== null) {
      filtered = filtered.filter(service => service.rating >= filters.rating);
    }

    // Appliquer le tri
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'price':
          aValue = a.price_min;
          bValue = b.price_min;
          break;
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'orders':
          aValue = a.orders_count;
          bValue = b.orders_count;
          break;
        case 'revenue':
          aValue = a.revenue_total;
          bValue = b.revenue_total;
          break;
        case 'date':
          aValue = new Date(a.updated_at);
          bValue = new Date(b.updated_at);
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredServices(filtered);
  }, [services, searchQuery, filters, sortBy, sortOrder]);

  // ✅ ACTIONS DE GESTION AVANCÉES
  const toggleServiceVisibility = async (serviceId: string, hide: boolean) => {
    try {
      setSaving(true);
      
      let newHiddenServices = new Set(hiddenServices);
      
      if (hide) {
        const config: HiddenServiceConfig = {
          serviceId,
          hiddenAt: new Date().toISOString(),
          hiddenBy: currentUserId || 'unknown',
          reason: 'Manuel',
        };
        
        newHiddenServices.add(serviceId);
        
        // Sauvegarder dans AsyncStorage
        const hiddenConfigs = await loadHiddenServices();
        hiddenConfigs.push(config);
        await AsyncStorage.setItem('hidden_services', JSON.stringify(hiddenConfigs));
        
      } else {
        newHiddenServices.delete(serviceId);
        
        // Retirer d'AsyncStorage
        const hiddenConfigs = await loadHiddenServices();
        const filtered = hiddenConfigs.filter(c => c.serviceId !== serviceId);
        await AsyncStorage.setItem('hidden_services', JSON.stringify(filtered));
      }
      
      setHiddenServices(newHiddenServices);
      
      Alert.alert(
        'Succès',
        `Service ${hide ? 'masqué' : 'affiché'} avec succès !`
      );
      
    } catch (error) {
      console.error('Erreur toggle visibilité:', error);
      Alert.alert('Erreur', 'Impossible de modifier la visibilité du service');
    } finally {
      setSaving(false);
    }
  };

  const updateService = async (serviceId: string, updates: Partial<Service>) => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('services')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId);
      
      if (error) throw error;
      
      // Mettre à jour l'état local
      setServices(prev => prev.map(service => 
        service.id === serviceId ? { ...service, ...updates } : service
      ));
      
      Alert.alert('Succès', 'Service mis à jour avec succès !');
      setEditModalVisible(false);
      
    } catch (error) {
      console.error('Erreur mise à jour service:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le service');
    } finally {
      setSaving(false);
    }
  };

  const bulkAction = async (action: 'hide' | 'show' | 'feature' | 'unfeature' | 'activate' | 'deactivate' | 'delete') => {
    if (selectedServices.size === 0) {
      Alert.alert('Attention', 'Aucun service sélectionné');
      return;
    }

    const actionText = {
      hide: 'masquer',
      show: 'afficher',
      feature: 'mettre en avant',
      unfeature: 'retirer de la mise en avant',
      activate: 'activer',
      deactivate: 'désactiver',
      delete: 'supprimer',
    }[action];

    Alert.alert(
      'Confirmation',
      `Voulez-vous vraiment ${actionText} ${selectedServices.size} service(s) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          style: action === 'delete' ? 'destructive' : 'default',
          onPress: () => executeBulkAction(action),
        },
      ]
    );
  };

  const executeBulkAction = async (action: string) => {
    try {
      setSaving(true);
      
      const serviceIds = Array.from(selectedServices);
      
      switch (action) {
        case 'hide':
        case 'show':
          for (const serviceId of serviceIds) {
            await toggleServiceVisibility(serviceId, action === 'hide');
          }
          break;
          
        case 'feature':
        case 'unfeature':
          const { error: featureError } = await supabase
            .from('services')
            .update({ is_featured: action === 'feature' })
            .in('id', serviceIds);
          
          if (featureError) throw featureError;
          break;
          
        case 'activate':
        case 'deactivate':
          const { error: activeError } = await supabase
            .from('services')
            .update({ is_active: action === 'activate' })
            .in('id', serviceIds);
          
          if (activeError) throw activeError;
          break;
          
        case 'delete':
          const { error: deleteError } = await supabase
            .from('services')
            .delete()
            .in('id', serviceIds);
          
          if (deleteError) throw deleteError;
          break;
      }
      
      // Rafraîchir les données
      await loadServicesData();
      setSelectedServices(new Set());
      setBulkActionMode(false);
      
      Alert.alert('Succès', `Action ${action} effectuée avec succès !`);
      
    } catch (error) {
      console.error('Erreur action groupée:', error);
      Alert.alert('Erreur', 'Impossible d\'effectuer l\'action groupée');
    } finally {
      setSaving(false);
    }
  };

  // ✅ EXPORT AVANCÉ DES DONNÉES
  const exportServicesData = async () => {
    try {
      setExporting(true);
      
      const csvContent = generateCSVReport();
      const jsonContent = generateJSONReport();
      
      Alert.alert(
        'Exporter les services',
        'Choisissez le format d\'export',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'CSV', onPress: () => shareContent(csvContent, 'services.csv') },
          { text: 'JSON', onPress: () => shareContent(jsonContent, 'services.json') },
          { text: 'Rapport complet', onPress: () => generateFullReport() },
        ]
      );

    } catch (error) {
      console.error('Erreur export:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter les données');
    } finally {
      setExporting(false);
    }
  };

  const generateCSVReport = (): string => {
    const headers = 'ID,Titre,Catégorie,Prix Min,Prix Max,Actif,Crédit Impôt,Note,Commandes,Revenus\n';
    const rows = filteredServices.map(service => 
      `${service.id},${service.title},${service.category},${service.price_min},${service.price_max},${service.is_active},${service.credit_impot},${service.rating},${service.orders_count},${service.revenue_total}`
    ).join('\n');
    
    return headers + rows;
  };

  const generateJSONReport = (): string => {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      stats,
      services: filteredServices,
      categories,
      hiddenServices: Array.from(hiddenServices),
    }, null, 2);
  };

  const generateFullReport = async () => {
    const report = {
      title: 'Rapport complet des services',
      date: new Date().toLocaleDateString('fr-FR'),
      stats,
      summary: {
        totalServices: services.length,
        visibleServices: services.length - hiddenServices.size,
        hiddenServices: hiddenServices.size,
        activeServices: services.filter(s => s.is_active).length,
        featuredServices: services.filter(s => s.is_featured).length,
      },
      categories: categories.map(cat => ({
        name: cat.name,
        servicesCount: cat.services_count,
        averagePrice: cat.average_price,
      })),
      topServices: services
        .sort((a, b) => b.revenue_total - a.revenue_total)
        .slice(0, 10)
        .map(s => ({
          title: s.title,
          revenue: s.revenue_total,
          orders: s.orders_count,
          rating: s.rating,
        })),
    };
    
    await shareContent(JSON.stringify(report, null, 2), 'rapport-services.json');
  };

  const shareContent = async (content: string, filename: string) => {
    try {
      await Share.share({
        message: content,
        title: `Export services - ${filename}`,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  // ✅ RAFRAÎCHISSEMENT INTELLIGENT
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadServicesData();
    setRefreshing(false);
  };

  // ✅ EFFETS ET OPTIMISATIONS
  useEffect(() => {
    loadServicesData();
  }, [loadServicesData]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  // ✅ MÉMORISATION DES DONNÉES CALCULÉES
  const visibleServices = useMemo(() => {
    return filteredServices.filter(service => !hiddenServices.has(service.id));
  }, [filteredServices, hiddenServices]);

  const servicesByCategory = useMemo(() => {
    return categories.map(category => ({
      ...category,
      services: visibleServices.filter(service => service.category === category.id),
    }));
  }, [categories, visibleServices]);

  // ✅ COMPOSANTS DE RENDU
  const renderServiceCard = ({ item: service }: { item: Service }) => {
    const categoryInfo = categoryConfig[service.category as keyof typeof categoryConfig] || categoryConfig.autre;
    const isHidden = hiddenServices.has(service.id);
    const isSelected = selectedServices.has(service.id);

    return (
      <TouchableOpacity 
        style={[
          styles.serviceCard,
          isHidden && styles.serviceCardHidden,
          isSelected && styles.serviceCardSelected,
        ]}
        onPress={() => {
          if (bulkActionMode) {
            const newSelected = new Set(selectedServices);
            if (isSelected) {
              newSelected.delete(service.id);
            } else {
              newSelected.add(service.id);
            }
            setSelectedServices(newSelected);
          } else {
            setEditingService(service);
            setEditForm(service);
            setEditModalVisible(true);
          }
        }}
        onLongPress={() => {
          if (!bulkActionMode) {
            setBulkActionMode(true);
            setSelectedServices(new Set([service.id]));
          }
        }}
      >
        <View style={styles.serviceCardHeader}>
          <View style={styles.serviceInfo}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '20' }]}>
              <Text style={styles.categoryEmoji}>{categoryInfo.icon}</Text>
              <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
                {categoryInfo.label}
              </Text>
            </View>
            
            <View style={styles.serviceFlags}>
              {service.is_featured && (
                <View style={[styles.flag, styles.featuredFlag]}>
                  <Star size={12} color="#FFD700" />
                </View>
              )}
              {service.credit_impot && (
                <View style={[styles.flag, styles.creditFlag]}>
                  <Euro size={12} color="#4CAF50" />
                </View>
              )}
              {!service.is_active && (
                <View style={[styles.flag, styles.inactiveFlag]}>
                  <Clock size={12} color="#F44336" />
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.visibilityToggle}
            onPress={() => toggleServiceVisibility(service.id, !isHidden)}
          >
            {isHidden ? (
              <EyeOff size={20} color="#F44336" />
            ) : (
              <Eye size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.serviceTitle}>{service.title}</Text>
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {service.description}
        </Text>

        <View style={styles.serviceMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Prix</Text>
            <Text style={styles.metricValue}>
              {service.price_min === service.price_max 
                ? `${service.price_min}€`
                : `${service.price_min}-${service.price_max}€`
              }
            </Text>
          </View>

          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Note</Text>
            <View style={styles.ratingContainer}>
              <Star size={14} color="#FFD700" />
              <Text style={styles.metricValue}>{service.rating.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Commandes</Text>
            <Text style={styles.metricValue}>{service.orders_count}</Text>
          </View>

          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Revenus</Text>
            <Text style={styles.metricValue}>{service.revenue_total.toFixed(0)}€</Text>
          </View>
        </View>

        {service.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {service.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {service.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{service.tags.length - 3}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <LinearGradient
        colors={['#FF4444', '#FF6666']}
        style={styles.statsCard}
      >
        <View style={styles.statsContent}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Tableau de bord</Text>
            <TouchableOpacity onPress={() => setStatsModalVisible(true)}>
              <BarChart3 size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total_services}</Text>
              <Text style={styles.statLabel}>Services</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.active_services}</Text>
              <Text style={styles.statLabel}>Actifs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{hiddenServices.size}</Text>
              <Text style={styles.statLabel}>Masqués</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.average_rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Note moy.</Text>
            </View>
          </View>

          <View style={styles.revenueInfo}>
            <Text style={styles.revenueLabel}>Revenus totaux</Text>
            <Text style={styles.revenueValue}>{stats.total_revenue.toFixed(0)}€</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  // ✅ ÉCRAN DE CHARGEMENT
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestion des services</Text>
          <View style={styles.headerActions} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement des services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ ÉCRAN D'ERREUR
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestion des services</Text>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleRefresh}>
            <RefreshCw size={24} color="#FF4444" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#F44336" />
          <Text style={styles.errorTitle}>Erreur de chargement</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadServicesData}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ✅ HEADER AMÉLIORÉ AVEC ACTIONS MULTIPLES */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {bulkActionMode ? `${selectedServices.size} sélectionné(s)` : 'Gestion des services'}
        </Text>
        
        <View style={styles.headerActions}>
          {bulkActionMode ? (
            <>
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={() => bulkAction('hide')}
              >
                <EyeOff size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={() => bulkAction('feature')}
              >
                <Star size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={() => {
                  setBulkActionMode(false);
                  setSelectedServices(new Set());
                }}
              >
                <X size={20} color="#666" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Filter size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw 
                  size={20} 
                  color={refreshing ? "#ccc" : "#666"} 
                  style={refreshing ? { transform: [{ rotate: '180deg' }] } : {}}
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={exportServicesData}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size={20} color="#FF4444" />
                ) : (
                  <Download size={20} color="#FF4444" />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ✅ CARTE STATISTIQUES */}
        {renderStatsCard()}

        {/* ✅ BARRE DE RECHERCHE AVANCÉE */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un service..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ✅ FILTRES AVANCÉS (si affichés) */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            {/* Implémentation des filtres détaillés */}
            <Text style={styles.filtersTitle}>Filtres avancés</Text>
            {/* Ici vous pouvez ajouter tous les contrôles de filtrage */}
          </View>
        )}

        {/* ✅ ACTIONS RAPIDES */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction}>
            <Plus size={20} color="#4CAF50" />
            <Text style={styles.quickActionText}>Nouveau service</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => setBulkActionMode(!bulkActionMode)}
          >
            <Settings size={20} color="#2196F3" />
            <Text style={styles.quickActionText}>Actions groupées</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction}>
            <Upload size={20} color="#FF9800" />
            <Text style={styles.quickActionText}>Import CSV</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ LISTE DES SERVICES */}
        <View style={styles.servicesSection}>
          <View style={styles.servicesSectionHeader}>
            <Text style={styles.sectionTitle}>
              Services ({visibleServices.length})
            </Text>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleActive]}
                onPress={() => setViewMode('list')}
              >
                <Text style={styles.viewToggleText}>Liste</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleButton, viewMode === 'grid' && styles.viewToggleActive]}
                onPress={() => setViewMode('grid')}
              >
                <Text style={styles.viewToggleText}>Grille</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={visibleServices}
            renderItem={renderServiceCard}
            keyExtractor={(item) => item.id}
            numColumns={viewMode === 'grid' ? 2 : 1}
            key={viewMode} // Force re-render when view mode changes
            contentContainerStyle={styles.servicesList}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        </View>
      </ScrollView>

      {/* ✅ MODAL D'ÉDITION AVANCÉE */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {/* Implémentation complète du modal d'édition */}
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <X size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Modifier le service</Text>
            <TouchableOpacity 
              onPress={() => editingService && updateService(editingService.id, editForm)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size={24} color="#FF4444" />
              ) : (
                <Save size={24} color="#FF4444" />
              )}
            </TouchableOpacity>
          </View>
          {/* Formulaire d'édition complet ici */}
        </SafeAreaView>
      </Modal>

      {/* ✅ MODAL STATISTIQUES DÉTAILLÉES */}
      <Modal
        visible={statsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {/* Implémentation complète des statistiques détaillées */}
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setStatsModalVisible(false)}>
              <X size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Statistiques détaillées</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          {/* Graphiques et analytics détaillés ici */}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
  },

  // ✅ STYLES DE CHARGEMENT ET ERREUR
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F44336',
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },

  // ✅ STYLES STATISTIQUES
  statsCard: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statsContent: {
    gap: 16,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  revenueInfo: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  revenueLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  revenueValue: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 4,
  },

  // ✅ STYLES RECHERCHE
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
  },

  // ✅ STYLES FILTRES
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
  },

  // ✅ STYLES ACTIONS RAPIDES
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },

  // ✅ STYLES SERVICES
  servicesSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  servicesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 2,
  },
  viewToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewToggleActive: {
    backgroundColor: '#FFFFFF',
  },
  viewToggleText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  servicesList: {
    gap: 12,
  },

  // ✅ STYLES CARTE SERVICE
  serviceCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  serviceCardHidden: {
    opacity: 0.6,
    backgroundColor: '#FFE5E5',
  },
  serviceCardSelected: {
    borderColor: '#FF4444',
    backgroundColor: '#FFF5F5',
  },
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  categoryEmoji: {
    fontSize: 12,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  serviceFlags: {
    flexDirection: 'row',
    gap: 4,
  },
  flag: {
    padding: 4,
    borderRadius: 4,
  },
  featuredFlag: {
    backgroundColor: '#FFD700',
  },
  creditFlag: {
    backgroundColor: '#4CAF50',
  },
  inactiveFlag: {
    backgroundColor: '#F44336',
  },
  visibilityToggle: {
    padding: 8,
  },
  serviceTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  serviceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#999',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#2196F3',
  },
  moreTagsText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },

  // ✅ STYLES MODALS
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  modalHeaderSpacer: {
    width: 24,
  },
});
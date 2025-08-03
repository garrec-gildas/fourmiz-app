import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Service {
  id: number;
  title: string;
  description?: string;
  categorie: string;
  estimatedDuration?: number;
  isEligibleTaxCredit?: boolean;
  price_range?: string;
  created_at?: string;
}

interface UserProfile {
  id: string;
  role: 'client' | 'fourmiz';
  email: string;
}

// ✅ Clé pour les services masqués par l'admin
const HIDDEN_SERVICES_KEY = 'admin_hidden_services';

export default function ServicesListScreen() {
  // États principaux
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // 🔧 Chargement du profil utilisateur
  useEffect(() => {
    getCurrentUser();
    loadServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, searchQuery, selectedCategory]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, roles, email')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erreur récupération profil:', error);
        } else if (profile && profile.roles && profile.roles.length > 0) {
          const userProfileData: UserProfile = {
            id: profile.id,
            role: profile.roles[0] as 'client' | 'fourmiz',
            email: profile.email,
          };
          
          setCurrentUser(userProfileData);
          console.log('✅ Profil utilisateur chargé:', userProfileData);
        }
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  // ✅ Récupérer les services masqués par l'admin
  const getHiddenServices = async (): Promise<number[]> => {
    try {
      const hiddenServices = await AsyncStorage.getItem(HIDDEN_SERVICES_KEY);
      return hiddenServices ? JSON.parse(hiddenServices) : [];
    } catch (error) {
      console.error('Erreur récupération services masqués:', error);
      return [];
    }
  };

  // ✅ MODIFIÉ - Chargement des services SANS l'ID 149
  const loadServices = async () => {
    try {
      setLoading(true);
      console.log('🔧 Chargement des services depuis Supabase...');
      
      // Récupérer tous les services SAUF l'ID 149
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .neq('id', 149) // ✅ EXCLURE l'ID 149 de la liste normale
        .order('categorie, title');

      if (error) {
        console.error('❌ Erreur chargement services:', error);
        throw error;
      }

      // ✅ Récupérer les services masqués par l'admin
      const hiddenServiceIds = await getHiddenServices();
      
      // Filtrer les services masqués
      const visibleServices = (data || []).filter(service => {
        return !hiddenServiceIds.includes(service.id);
      });

      console.log(`✅ Services chargés: ${data?.length || 0} total, ${visibleServices.length} visibles (ID 149 exclu)`);
      console.log(`🔒 Services masqués par l'admin: ${hiddenServiceIds.length}`);
      
      // Tri normal par catégorie et titre
      const sortedServices = visibleServices.sort((a, b) => {
        if (a.categorie !== b.categorie) {
          return (a.categorie || '').localeCompare(b.categorie || '');
        }
        return a.title.localeCompare(b.title);
      });
      
      setServices(sortedServices);

    } catch (error) {
      console.error('💥 Erreur fatale:', error);
      Alert.alert('Erreur', 'Impossible de charger les services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🔧 Filtrage des services
  const filterServices = () => {
    let filtered = services;

    // Filtrer par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => service.categorie === selectedCategory);
    }

    // Filtrer par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(service =>
        service.title.toLowerCase().includes(query) ||
        service.description?.toLowerCase().includes(query) ||
        service.categorie.toLowerCase().includes(query)
      );
    }

    setFilteredServices(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  // ✅ FONCTION SIMPLIFIÉE - Laisse la page de commande gérer l'authentification
  const handleServicePress = (service: Service) => {
    console.log(`🛒 Commande service: ${service.title}`);
    
    // ✅ NAVIGATION DIRECTE - La page /orders/create gérera l'authentification
    router.push({
      pathname: '/orders/create',
      params: {
        serviceId: service.id.toString(),
        serviceTitle: service.title,
        serviceCategory: service.categorie,
        estimatedDuration: service.estimatedDuration?.toString() || '',
      }
    });
  };

  // 🔧 FONCTION POUR LES FOURMIZ - VOIR LES DEMANDES
  const handleViewActiveRequests = (serviceId?: number) => {
    if (!currentUser || currentUser.role !== 'fourmiz') {
      Alert.alert('Erreur', 'Vous devez être connecté en tant que fourmiz');
      return;
    }

    if (serviceId) {
      router.push({
        pathname: '/(tabs)/services-requests',
        params: { serviceId: serviceId.toString() }
      });
    } else {
      router.push('/(tabs)/services-requests');
    }
  };

  // 🔧 Récupération des catégories uniques
  const getUniqueCategories = () => {
    const categories = [...new Set(services.map(service => service.categorie).filter(Boolean))];
    return categories.sort();
  };

  // 🔧 Icônes pour les catégories
  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('jardinage')) return 'leaf-outline';
    if (categoryLower.includes('ménage') || categoryLower.includes('aide à domicile')) return 'home-outline';
    if (categoryLower.includes('transport') || categoryLower.includes('livraison')) return 'car-outline';
    if (categoryLower.includes('administratif')) return 'document-text-outline';
    if (categoryLower.includes('bricolage') || categoryLower.includes('travaux')) return 'hammer-outline';
    if (categoryLower.includes('enfance')) return 'people-outline';
    if (categoryLower.includes('animaux')) return 'paw-outline';
    if (categoryLower.includes('coaching')) return 'school-outline';
    
    return 'ellipse-outline';
  };

  // 🔧 Rendu du filtre par catégorie
  const renderCategoryFilter = () => {
    const categories = getUniqueCategories();

    return (
      <View style={styles.categoryContainer}>
        <TouchableOpacity
          style={styles.categoryDropdownButton}
          onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
        >
          <Ionicons 
            name={selectedCategory !== 'all' ? getCategoryIcon(selectedCategory) : "grid-outline"} 
            size={20} 
            color="#FF4444" 
          />
          <Text style={styles.categoryDropdownText}>
            {selectedCategory === 'all' ? 'Toutes les catégories' : selectedCategory}
          </Text>
          <Ionicons 
            name={showCategoryDropdown ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>

        {showCategoryDropdown && (
          <ScrollView 
            style={styles.categoryDropdownMenu}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={[
                styles.categoryDropdownItem,
                selectedCategory === 'all' && styles.activeCategoryItem
              ]}
              onPress={() => {
                setSelectedCategory('all');
                setShowCategoryDropdown(false);
              }}
            >
              <Ionicons name="grid-outline" size={20} color="#666" />
              <Text style={styles.categoryDropdownItemText}>Toutes les catégories</Text>
            </TouchableOpacity>
            
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryDropdownItem,
                  selectedCategory === category && styles.activeCategoryItem
                ]}
                onPress={() => {
                  setSelectedCategory(category);
                  setShowCategoryDropdown(false);
                }}
              >
                <Ionicons 
                  name={getCategoryIcon(category)} 
                  size={20} 
                  color={selectedCategory === category ? "#FF4444" : "#666"} 
                />
                <Text style={[
                  styles.categoryDropdownItemText,
                  selectedCategory === category && styles.activeCategoryText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Overlay pour fermer le menu */}
        {showCategoryDropdown && (
          <TouchableOpacity 
            style={styles.modalOverlay}
            onPress={() => setShowCategoryDropdown(false)}
            activeOpacity={1}
          />
        )}
      </View>
    );
  };

  // ✅ RENDU CARTE SERVICE - CORRECTIONS APPLIQUÉES
  const renderServiceCard = (service: Service) => {
    return (
      <TouchableOpacity
        key={service.id}
        style={styles.serviceCard}
        onPress={() => {
          // ✅ LOGIQUE SIMPLIFIÉE
          if (currentUser?.role === 'fourmiz') {
            // Fourmiz -> voir les demandes
            handleViewActiveRequests(service.id);
          } else {
            // Client ou non connecté -> vers commande (la page gérera l'auth)
            handleServicePress(service);
          }
        }}
      >
        <View style={styles.serviceHeader}>
          <View style={styles.serviceTitleContainer}>
            <Text style={styles.serviceTitle}>
              {service.title}
            </Text>
          </View>
          
          {service.categorie && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{service.categorie}</Text>
            </View>
          )}
        </View>

        {service.isEligibleTaxCredit && (
          <View style={styles.taxCreditBadge}>
            <Text style={styles.taxCreditText}>💳 Crédit d'impôt</Text>
          </View>
        )}

        {service.description && (
          <Text style={styles.serviceDescription} numberOfLines={2}>
            {service.description}
          </Text>
        )}

        <View style={styles.serviceFooter}>
          <View style={styles.serviceInfo}>
            {service.price_range && (
              <Text style={styles.servicePrice}>
                💰 {service.price_range}
              </Text>
            )}
            {/* ✅ TEMPS ESTIMÉ SUPPRIMÉ - Cette section était supprimée */}
          </View>
          
          <View style={styles.serviceAction}>
            <Ionicons 
              name={currentUser?.role === 'fourmiz' ? "eye" : "arrow-forward"} 
              size={20} 
              color={currentUser?.role === 'fourmiz' ? "#007bff" : "#3b82f6"} 
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Rechercher un service',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => router.back()}
                style={styles.headerButton}
              >
                <Ionicons name="arrow-back" size={24} color="#FF4444" />
              </TouchableOpacity>
            ),
          }} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement des services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Rechercher un service',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FF4444" />
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ TITRE ET STATISTIQUES */}
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>🔍 Rechercher un service</Text>
          <Text style={styles.serviceCount}>
            {services.length} service{services.length > 1 ? 's' : ''} disponible{services.length > 1 ? 's' : ''}
          </Text>
          {/* Texte d'administration supprimé */}
        </View>

        {/* ✅ BARRE DE RECHERCHE */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un service..."
              placeholderTextColor="#6b7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ✅ FILTRES PAR CATÉGORIE */}
        {renderCategoryFilter()}

        {/* ✅ RÉSULTATS */}
        <View style={styles.resultsSection}>
          {(searchQuery || selectedCategory !== 'all') && (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {filteredServices.length} résultat{filteredServices.length > 1 ? 's' : ''}
                {searchQuery && ` pour "${searchQuery}"`}
                {selectedCategory !== 'all' && ` dans "${selectedCategory}"`}
              </Text>
              
              {(searchQuery || selectedCategory !== 'all') && (
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                >
                  <Ionicons name="close" size={16} color="#FF4444" />
                  <Text style={styles.clearFiltersText}>Effacer</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* LISTE DES SERVICES */}
          {(searchQuery || selectedCategory !== 'all') ? (
            // Résultats filtrés
            filteredServices.length > 0 ? (
              <FlatList
                data={filteredServices}
                renderItem={({ item }) => renderServiceCard(item)}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={64} color="#d1d5db" />
                <Text style={styles.noResultsTitle}>Aucun service trouvé</Text>
                <Text style={styles.noResultsText}>
                  Essayez de modifier vos critères de recherche ou créez une demande personnalisée
                </Text>
                <TouchableOpacity
                  style={styles.resetSearchButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                >
                  <Text style={styles.resetSearchText}>Réinitialiser</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            // Tous les services (pas de filtre)
            <View>
              <Text style={styles.allServicesTitle}>📋 Tous nos services</Text>
              <FlatList
                data={services}
                renderItem={({ item }) => renderServiceCard(item)}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9fafb' 
  },
  scrollView: { 
    flex: 1 
  },
  headerButton: { 
    padding: 8, 
    marginLeft: 8 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { 
    fontSize: 16, 
    color: '#6b7280' 
  },

  // HEADER SECTION
  headerSection: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  serviceCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  adminInfo: {
    fontSize: 12,
    color: '#22c55e',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // SEARCH SECTION
  searchSection: {
    padding: 20,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },

  // CATEGORY FILTER
  categoryContainer: {
    position: 'relative',
    marginHorizontal: 20,
    marginBottom: 20,
    zIndex: 999,
  },
  categoryDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryDropdownText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  categoryDropdownMenu: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  categoryDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  activeCategoryItem: {
    backgroundColor: '#fff5f5',
    borderRightWidth: 3,
    borderRightColor: '#FF4444',
  },
  categoryDropdownItemText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  activeCategoryText: {
    color: '#FF4444',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: -20,
    right: -20,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 500,
  },

  // RESULTS SECTION
  resultsSection: {
    paddingHorizontal: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#FF4444',
    fontWeight: '500',
  },

  allServicesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },

  // NO RESULTS
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  resetSearchButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetSearchText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // SERVICE CARDS - TEMPS ESTIMÉ SUPPRIMÉ
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  taxCreditBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  taxCreditText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    gap: 4,
  },
  servicePrice: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  serviceAction: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },

  bottomSpacer: { 
    height: 32 
  },
});
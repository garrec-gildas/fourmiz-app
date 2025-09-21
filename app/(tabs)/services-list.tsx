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
  created_at?: string;
}

interface UserProfile {
  id: string;
  role: 'client' | 'fourmiz';
  email: string;
}

const HIDDEN_SERVICES_KEY = 'admin_hidden_services';

// Fonction de normalisation et utilitaires de recherche intelligente
const safeNormalize = (input: any): string => {
  try {
    if (!input) return '';
    const str = String(input);
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
};

// Extraction des mots-clés avec minimum 2 lettres
const extractKeywords = (query: string): string[] => {
  if (!query || query.trim().length < 2) return [];
  
  const normalized = safeNormalize(query);
  const stopWords = ['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou', 'pour', 'avec', 'sans', 'sur', 'par', 'dans'];
  
  return normalized
    .split(' ')
    .filter(word => word.length >= 2)
    .filter(word => !stopWords.includes(word));
};

// Calcul du score de pertinence intelligent
const calculateRelevanceScore = (service: Service, keywords: string[]): number => {
  if (!keywords.length || !service) return 0;
  
  const title = safeNormalize(service.title || '');
  const description = safeNormalize(service.description || '');
  const category = safeNormalize(service.categorie || '');
  
  let score = 0;
  const titleWords = title.split(' ').filter(Boolean);
  const descWords = description.split(' ').filter(Boolean);
  const catWords = category.split(' ').filter(Boolean);
  
  keywords.forEach(keyword => {
    // Score pour correspondance exacte dans le titre (poids maximum)
    if (title === keyword) score += 200;
    else if (title.startsWith(keyword)) score += 150;
    else if (title.includes(keyword)) score += 100;
    
    // Score pour mots complets dans le titre
    titleWords.forEach(word => {
      if (word === keyword) score += 80;
      else if (word.startsWith(keyword)) score += 60;
      else if (word.includes(keyword)) score += 30;
    });
    
    // Score pour correspondance dans la catégorie
    if (category === keyword) score += 120;
    else if (category.includes(keyword)) score += 70;
    
    catWords.forEach(word => {
      if (word === keyword) score += 50;
      else if (word.startsWith(keyword)) score += 35;
      else if (word.includes(keyword)) score += 20;
    });
    
    // Score pour correspondance dans la description
    if (description.includes(keyword)) score += 40;
    
    descWords.forEach(word => {
      if (word === keyword) score += 25;
      else if (word.startsWith(keyword)) score += 15;
      else if (word.includes(keyword)) score += 10;
    });
  });
  
  // Bonus si tous les mots-clés sont trouvés
  const foundKeywords = keywords.filter(keyword => 
    title.includes(keyword) || description.includes(keyword) || category.includes(keyword)
  );
  
  if (foundKeywords.length === keywords.length && keywords.length > 1) {
    score += 50; // Bonus pour requête complète
  }
  
  return score;
};

export default function ServicesListScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Suggestions intelligentes à partir de 2 caractères
  const getSearchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
    
    const query = safeNormalize(searchQuery);
    const suggestions = new Set<string>();
    const maxSuggestions = 5;
    
    // Récupérer les catégories uniques
    const categories = [...new Set(services.map(s => s.categorie).filter(Boolean))];
    
    services.forEach(service => {
      if (suggestions.size >= maxSuggestions) return;
      
      const titleNorm = safeNormalize(service.title || '');
      const categoryNorm = safeNormalize(service.categorie || '');
      const descNorm = safeNormalize(service.description || '');
      
      // Priorité 1 : Catégories qui correspondent
      if (categoryNorm.includes(query) && !suggestions.has(service.categorie)) {
        suggestions.add(service.categorie);
      }
      
      // Priorité 2 : Titres qui correspondent
      if (titleNorm.includes(query) && !suggestions.has(service.title)) {
        suggestions.add(service.title);
      }
      
      // Priorité 3 : Mots individuels du titre qui commencent par la recherche
      if (suggestions.size < maxSuggestions) {
        const words = titleNorm.split(' ').filter(w => w.length >= 3);
        words.forEach(word => {
          if (word.startsWith(query) && !suggestions.has(word)) {
            suggestions.add(word);
          }
        });
      }
    });
    
    return Array.from(suggestions).slice(0, maxSuggestions);
  }, [searchQuery, services]);

  // Gestion de la sélection des suggestions
  const handleSuggestionSelect = (suggestion: string) => {
    // Vérifier si c'est une catégorie
    const categories = [...new Set(services.map(s => s.categorie).filter(Boolean))];
    const isCategory = categories.includes(suggestion);
    
    if (isCategory) {
      setSelectedCategory(suggestion);
      setSearchQuery('');
    } else {
      setSearchQuery(suggestion);
      setSelectedCategory('all');
    }
    
    setShowCategoryDropdown(false);
  };

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
        }
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const getHiddenServices = async (): Promise<number[]> => {
    try {
      const hiddenServices = await AsyncStorage.getItem(HIDDEN_SERVICES_KEY);
      return hiddenServices ? JSON.parse(hiddenServices) : [];
    } catch (error) {
      console.error('Erreur récupération services masqués:', error);
      return [];
    }
  };

  const loadServices = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('services')
        .select(`
          id,
          title,
          description,
          categorie,
          estimatedDuration,
          isEligibleTaxCredit,
          created_at
        `)
        .neq('id', 149)
        .order('categorie, title');

      if (error) {
        console.error('Erreur chargement services:', error);
        throw error;
      }

      const hiddenServiceIds = await getHiddenServices();
      let visibleServices = (data || []).filter(service => {
        return service && service.id && !hiddenServiceIds.includes(service.id);
      });
      
      // Suppression des doublons par titre
      const uniqueServices: Service[] = [];
      const seenTitles = new Set<string>();
      
      visibleServices.forEach(service => {
        if (service && service.title) {
          const normalizedTitle = safeNormalize(service.title);
          if (!seenTitles.has(normalizedTitle)) {
            seenTitles.add(normalizedTitle);
            uniqueServices.push(service);
          }
        }
      });
      
      console.log(`Services chargés: ${visibleServices.length} → ${uniqueServices.length} uniques`);
      setServices(uniqueServices);

    } catch (error) {
      console.error('Erreur fatale:', error);
      Alert.alert('Erreur', 'Impossible de charger les services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterServices = useCallback(() => {
    if (!services) return;
    
    let filtered = [...services];

    // Filtre par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => 
        service && service.categorie === selectedCategory
      );
    }

    // Recherche intelligente par mots-clés (minimum 2 lettres)
    if (searchQuery.trim().length >= 2) {
      const keywords = extractKeywords(searchQuery);
      
      if (keywords.length > 0) {
        // Calculer le score pour chaque service
        const scoredServices = filtered.map(service => ({
          service,
          score: calculateRelevanceScore(service, keywords)
        }));

        // Filtrer et trier par score de pertinence (seuil minimum de 10)
        filtered = scoredServices
          .filter(item => item.score >= 10)
          .sort((a, b) => b.score - a.score)
          .map(item => item.service);
        
        console.log(`Recherche intelligente "${searchQuery}" - Mots-clés: [${keywords.join(', ')}] - ${filtered.length} résultats`);
        
        // Log des meilleurs résultats
        if (filtered.length > 0) {
          const topResults = scoredServices
            .filter(item => item.score >= 10)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
          
          console.log('Top résultats:', topResults.map(r => ({
            title: r.service.title,
            score: r.score,
            category: r.service.categorie
          })));
        }
      } else {
        // Pas de mots-clés valides (que des mots vides ou trop courts)
        console.log(`Recherche "${searchQuery}" - Pas de mots-clés valides (minimum 2 lettres)`);
        filtered = [];
      }
    } else if (searchQuery.trim().length === 1) {
      // Pour 1 caractère, recherche simple par début de mot
      const char = safeNormalize(searchQuery);
      if (char) {
        filtered = filtered.filter(service => {
          const title = safeNormalize(service.title);
          const category = safeNormalize(service.categorie);
          
          return title.startsWith(char) || 
                 category.startsWith(char) ||
                 title.split(' ').some(word => word.startsWith(char)) ||
                 category.split(' ').some(word => word.startsWith(char));
        });
        
        console.log(`Recherche simple "${searchQuery}" (1 caractère) - ${filtered.length} résultats`);
      }
    }

    setFilteredServices(filtered);
  }, [services, searchQuery, selectedCategory]);

  // Rendu des suggestions intelligentes
  const renderSearchSuggestions = () => {
    const suggestions = getSearchSuggestions;
    
    if (suggestions.length === 0) return null;
    
    // Identifier les catégories pour les icônes
    const categories = [...new Set(services.map(s => s.categorie).filter(Boolean))];
    
    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Suggestions :</Text>
        {suggestions.map((suggestion, index) => {
          const isCategory = categories.includes(suggestion);
          
          return (
            <TouchableOpacity
              key={`suggestion_${index}_${suggestion}`}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionSelect(suggestion)}
            >
              <Ionicons 
                name={isCategory ? "folder-outline" : "search"} 
                size={14} 
                color={isCategory ? "#007AFF" : "#666666"} 
              />
              <Text style={[
                styles.suggestionText,
                isCategory && styles.categorySuggestionText
              ]}>
                {suggestion}
              </Text>
              {isCategory && (
                <Text style={styles.suggestionType}>catégorie</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  const handleServicePress = (service: Service) => {
    router.push({
      pathname: '/orders/create',
      params: {
        serviceId: service.id.toString(),
        serviceTitle: service.title,
        serviceCategorie: service.categorie,
        estimatedDuration: service.estimatedDuration?.toString() || '',
      }
    });
  };

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

  const getUniqueCategories = useCallback(() => {
    const categories = services
      .filter(service => service && service.categorie)
      .map(service => service.categorie)
      .filter((cat, index, self) => self.indexOf(cat) === index)
      .sort();
    
    return categories;
  }, [services]);

  const getCategoryIcon = (categorie: string) => {
    if (!categorie) return 'ellipse-outline';
    
    const categoryLower = categorie.toLowerCase();
    
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
            size={16} 
            color="#000000" 
          />
          <Text style={styles.categoryDropdownText}>
            {selectedCategory === 'all' ? 'Toutes les catégories' : selectedCategory}
          </Text>
          <Ionicons 
            name={showCategoryDropdown ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#333333" 
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
              <Ionicons name="grid-outline" size={16} color="#333333" />
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
                  size={16} 
                  color={selectedCategory === category ? "#000000" : "#333333"} 
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

  const renderServiceCard = (service: Service) => {
    if (!service) return null;
    
    return (
      <TouchableOpacity
        key={service.id}
        style={styles.serviceCard}
        onPress={() => {
          if (currentUser?.role === 'fourmiz') {
            handleViewActiveRequests(service.id);
          } else {
            handleServicePress(service);
          }
        }}
      >
        <View style={styles.serviceContent}>
          <Text style={styles.serviceTitle}>
            {service.title || ''}
          </Text>

          {service.isEligibleTaxCredit && (
            <View style={styles.taxCreditBadge}>
              <Text style={styles.taxCreditText}>Crédit d'impôt</Text>
            </View>
          )}

          {service.description && (
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {service.description}
            </Text>
          )}
          
          <Text style={styles.serviceCategory}>{service.categorie || ''}</Text>
        </View>

        <View style={styles.serviceArrow}>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color="#333333"
          />
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
                <Ionicons name="arrow-back" size={24} color="#000000" />
              </TouchableOpacity>
            ),
          }} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement des services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayedServices = (searchQuery.trim() || selectedCategory !== 'all') ? filteredServices : services;

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
              <Ionicons name="arrow-back" size={24} color="#000000" />
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
        <View style={styles.headerSection}>
          <Text style={styles.serviceCount}>
            {displayedServices.length} service{displayedServices.length > 1 ? 's' : ''}
            {(searchQuery.trim() || selectedCategory !== 'all') ? (
              searchQuery.trim() ? ` pour "${searchQuery.trim()}"` : ` dans "${selectedCategory}"`
            ) : ' au total'}
          </Text>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#333333" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Rechercher un service..."
              placeholderTextColor="#666666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#333333" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Affichage des suggestions intelligentes */}
          {renderSearchSuggestions()}
        </View>

        {renderCategoryFilter()}

        <View style={styles.resultsSection}>
          {(searchQuery.trim() || selectedCategory !== 'all') && (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {filteredServices.length} résultat{filteredServices.length > 1 ? 's' : ''}
                {searchQuery.trim() && ` pour "${searchQuery.trim()}"`}
                {selectedCategory !== 'all' && !searchQuery.trim() && ` dans "${selectedCategory}"`}
              </Text>
              
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setShowCategoryDropdown(false);
                }}
              >
                <Ionicons name="close" size={12} color="#000000" />
                <Text style={styles.clearFiltersText}>Effacer</Text>
              </TouchableOpacity>
            </View>
          )}

          {displayedServices.length > 0 ? (
            <FlatList
              data={displayedServices}
              renderItem={({ item }) => renderServiceCard(item)}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={48} color="#e0e0e0" />
              <Text style={styles.noResultsTitle}>Aucun service trouvé</Text>
              <Text style={styles.noResultsText}>
                {searchQuery ? (
                  `Aucun résultat pour "${searchQuery}"\nEssayez d'autres mots-clés`
                ) : (
                  'Aucun service dans cette catégorie'
                )}
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
    backgroundColor: '#ffffff' 
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
    gap: 24,
  },
  loadingText: { 
    fontSize: 13, 
    color: '#333333',
    fontWeight: '400'
  },

  headerSection: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  serviceCount: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },

  searchSection: {
    padding: 24,
    backgroundColor: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
  },

  // Styles pour les suggestions intelligentes
  suggestionsContainer: {
    marginTop: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 4,
    gap: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
    flex: 1,
  },
  categorySuggestionText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  suggestionType: {
    fontSize: 10,
    color: '#999999',
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  categoryContainer: {
    position: 'relative',
    marginHorizontal: 24,
    marginBottom: 20,
    zIndex: 999,
  },
  categoryDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 48,
  },
  categoryDropdownText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
  },
  categoryDropdownMenu: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 200,
    zIndex: 1000,
  },
  categoryDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activeCategoryItem: {
    backgroundColor: '#f8f8f8',
    borderRightWidth: 3,
    borderRightColor: '#000000',
  },
  categoryDropdownItemText: {
    marginLeft: 12,
    fontSize: 13,
    color: '#333333',
    flex: 1,
    fontWeight: '400',
  },
  activeCategoryText: {
    color: '#000000',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: -24,
    right: -24,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 500,
  },

  resultsSection: {
    paddingHorizontal: 24,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  clearFiltersText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '500',
  },

  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noResultsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '400',
    lineHeight: 20,
  },
  resetSearchButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  resetSearchText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  taxCreditBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  taxCreditText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  serviceDescription: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
    fontWeight: '400',
    marginBottom: 6,
  },
  serviceCategory: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serviceArrow: {
    marginLeft: 12,
  },

  bottomSpacer: { 
    height: 32 
  },
});
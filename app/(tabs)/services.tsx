import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, MapPin, Clock, Star, Award, X } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SERVICE_CATEGORIES } from '@/constants/services';
import { Service, ServiceCategory } from '@/types';

// Mock data for client requests (missions that clients are actively searching for)
const mockClientRequests = [
  {
    id: 'req-1',
    title: 'Livraison de courses Carrefour',
    description: 'Récupération de courses au drive Carrefour et livraison à domicile',
    budget: 15,
    location: 'Paris 15ème',
    distance: 2.3,
    urgency: 'Aujourd\'hui',
    categoryId: 'delivery',
    clientName: 'Marie D.',
    postedTime: '30 min',
  },
  {
    id: 'req-2',
    title: 'Montage meuble IKEA',
    description: 'Montage d\'une armoire PAX 3 portes, outils fournis',
    budget: 35,
    location: 'Paris 14ème',
    distance: 1.8,
    urgency: 'Demain',
    categoryId: 'handyman',
    clientName: 'Thomas L.',
    postedTime: '1h',
  },
  {
    id: 'req-3',
    title: 'Garde de chien pour le weekend',
    description: 'Promenade et garde de Max, Golden Retriever, pendant 2 jours',
    budget: 50,
    location: 'Paris 16ème',
    distance: 3.5,
    urgency: 'Ce weekend',
    categoryId: 'pets',
    clientName: 'Sophie M.',
    postedTime: '2h',
  },
  {
    id: 'req-4',
    title: 'Ménage appartement 2 pièces',
    description: 'Nettoyage complet d\'un appartement de 45m², produits fournis',
    budget: 40,
    location: 'Paris 11ème',
    distance: 4.2,
    urgency: 'Jeudi prochain',
    categoryId: 'cleaning',
    clientName: 'Jean D.',
    postedTime: '3h',
  },
  {
    id: 'req-5',
    title: 'Aide déménagement petit mobilier',
    description: 'Besoin d\'aide pour déplacer quelques meubles dans un nouvel appartement',
    budget: 60,
    location: 'Paris 18ème',
    distance: 5.1,
    urgency: 'Samedi prochain',
    categoryId: 'moving',
    clientName: 'Lucie F.',
    postedTime: '5h',
  },
  {
    id: 'req-6',
    title: 'Baby-sitting soirée',
    description: 'Garde de 2 enfants (4 et 6 ans) pour une soirée',
    budget: 45,
    location: 'Paris 9ème',
    distance: 2.7,
    urgency: 'Vendredi soir',
    categoryId: 'childcare',
    clientName: 'Pierre M.',
    postedTime: '6h',
  },
];

export default function ServicesScreen() {
  const { category, mode } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(category as string || '');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

  // Générer toutes les suggestions possibles à partir des services
  const allSuggestions = React.useMemo(() => {
    const suggestions: string[] = [];
    
    SERVICE_CATEGORIES.forEach(category => {
      // Ajouter le nom de la catégorie
      suggestions.push(category.name);
      
      category.services.forEach(service => {
        // Ajouter le nom du service
        suggestions.push(service.name);
        
        // Ajouter des mots-clés extraits de la description
        const keywords = service.description.toLowerCase().split(' ');
        keywords.forEach(keyword => {
          if (keyword.length > 3 && !suggestions.includes(keyword)) {
            suggestions.push(keyword);
          }
        });
        
        // Ajouter des mots-clés spécifiques selon le service
        const serviceName = service.name.toLowerCase();
        const serviceDesc = service.description.toLowerCase();
        
        // Mots-clés pour animaux
        if (serviceName.includes('chien') || serviceName.includes('animal') || serviceName.includes('pet')) {
          suggestions.push('chien', 'promenade', 'animal', 'garde', 'pet-sitting', 'toilettage', 'vétérinaire', 'croquettes', 'litière');
        }
        
        // Mots-clés pour courses et livraisons
        if (serviceName.includes('courses') || serviceName.includes('livraison') || serviceName.includes('drive')) {
          suggestions.push('courses', 'drive', 'livraison', 'supermarché', 'carrefour', 'leclerc', 'pharmacie', 'médicaments', 'colis', 'repas', 'restaurant');
        }
        
        // Mots-clés pour bricolage
        if (serviceName.includes('meuble') || serviceName.includes('montage') || serviceName.includes('bricolage')) {
          suggestions.push('meuble', 'montage', 'ikea', 'bricolage', 'assemblage', 'réparation', 'plomberie', 'électricité', 'peinture');
        }
        
        // Mots-clés pour aide à la personne
        if (serviceName.includes('baby') || serviceName.includes('garde') || serviceName.includes('aide')) {
          suggestions.push('baby-sitting', 'garde', 'enfant', 'babysitter', 'devoirs', 'soutien', 'scolaire', 'personne âgée', 'assistance');
        }
        
        // Mots-clés pour transport
        if (serviceName.includes('transport') || serviceName.includes('covoiturage') || serviceName.includes('navette')) {
          suggestions.push('transport', 'conduire', 'voiture', 'déplacement', 'covoiturage', 'navette', 'gare', 'aéroport', 'livraison express');
        }
        
        // Mots-clés pour nettoyage
        if (serviceName.includes('nettoyage') || serviceName.includes('ménage')) {
          suggestions.push('nettoyage', 'ménage', 'propre', 'nettoyer', 'débarras', 'déménagement');
        }
        
        // Mots-clés pour jardinage
        if (serviceName.includes('jardin') || serviceName.includes('tonte') || serviceName.includes('plante')) {
          suggestions.push('jardinage', 'tonte', 'pelouse', 'arrosage', 'plantes', 'haie', 'feuilles', 'potager');
        }
        
        // Mots-clés pour événements
        if (serviceName.includes('événement') || serviceName.includes('fête') || serviceName.includes('anniversaire')) {
          suggestions.push('événement', 'fête', 'anniversaire', 'baby-shower', 'décoration', 'animation', 'DJ', 'photos');
        }
        
        // Mots-clés pour urgences
        if (serviceName.includes('urgence') || serviceName.includes('clés') || serviceName.includes('oublié')) {
          suggestions.push('urgence', 'clés', 'oublié', 'documents', 'queue', 'préfecture', 'mairie', 'intervention');
        }
        
        // Mots-clés pour services professionnels
        if (serviceName.includes('professionnel') || serviceName.includes('secrétariat') || serviceName.includes('informatique')) {
          suggestions.push('professionnel', 'secrétariat', 'informatique', 'livraison', 'documents', 'assistance', 'commercial');
        }
        
        // Mots-clés pour conciergerie
        if (serviceName.includes('gardiennage') || serviceName.includes('conciergerie') || serviceName.includes('domicile')) {
          suggestions.push('gardiennage', 'conciergerie', 'domicile', 'surveillance', 'colis', 'visite', 'airbnb', 'emménagement');
        }
        
        // Mots-clés pour services premium
        if (serviceName.includes('premium') || serviceName.includes('assistant') || serviceName.includes('luxe')) {
          suggestions.push('premium', 'assistant', 'luxe', 'voiturier', 'majordome', 'VIP', 'haut de gamme');
        }
      });
    });
    
    // Retourner les suggestions uniques et triées
    return [...new Set(suggestions)].sort();
  }, []);

  // Filtrer les suggestions en fonction de la recherche
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const filtered = allSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8); // Limiter à 8 suggestions
      
      setSearchSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, allSuggestions]);

  // Filtrer les services ou les demandes client selon le mode
  const filteredItems = React.useMemo(() => {
    // Mode Fourmiz: afficher les demandes client (missions disponibles)
    if (mode === 'fourmiz') {
      let filteredRequests = [...mockClientRequests];
      
      // Filtrer par recherche
      if (searchQuery) {
        filteredRequests = filteredRequests.filter(request => {
          const requestTitle = request.title.toLowerCase();
          const requestDesc = request.description.toLowerCase();
          const query = searchQuery.toLowerCase();
          
          return requestTitle.includes(query) || requestDesc.includes(query);
        });
      }
      
      // Filtrer par catégorie
      if (selectedCategory) {
        filteredRequests = filteredRequests.filter(request => request.categoryId === selectedCategory);
      }
      
      return filteredRequests;
    } 
    // Mode Client: afficher les services disponibles
    else {
      let services: Service[] = [];
      
      if (selectedCategory) {
        const cat = SERVICE_CATEGORIES.find(c => c.id === selectedCategory);
        services = cat?.services || [];
      } else {
        services = SERVICE_CATEGORIES.flatMap(cat => cat.services);
      }

      if (searchQuery) {
        services = services.filter(service => {
          const serviceName = service.name.toLowerCase();
          const serviceDesc = service.description.toLowerCase();
          const categoryName = SERVICE_CATEGORIES.find(cat => cat.id === service.categoryId)?.name.toLowerCase() || '';
          const query = searchQuery.toLowerCase();
          
          return serviceName.includes(query) || 
                 serviceDesc.includes(query) || 
                 categoryName.includes(query);
        });
      }

      return services;
    }
  }, [selectedCategory, searchQuery, mode]);

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const renderServiceCard = ({ item: service }: { item: Service }) => {
    const category = SERVICE_CATEGORIES.find(cat => cat.id === service.categoryId);
    const isFourmizMode = mode === 'fourmiz';
    
    return (
      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => router.push(`/service/${service.id}`)}
      >
        <View style={styles.serviceHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: category?.color + '20' }]}>
            <Text style={styles.categoryIcon}>{category?.icon}</Text>
            <Text style={[styles.categoryText, { color: category?.color }]}>
              {category?.name}
            </Text>
          </View>
          {service.isEligibleTaxCredit && (
            <View style={styles.taxCreditBadge}>
              <Award size={12} color="#4CAF50" />
              <Text style={styles.taxCreditText}>Crédit d'impôt</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.serviceName}>{service.name}</Text>
        <Text style={styles.serviceDescription}>{service.description}</Text>
        
        <View style={styles.serviceFooter}>
          <View style={styles.serviceInfo}>
            <View style={styles.infoItem}>
              <Clock size={14} color="#666" />
              <Text style={styles.infoText}>{service.estimatedDuration} min</Text>
            </View>
            <View style={styles.infoItem}>
              <MapPin size={14} color="#666" />
              <Text style={styles.infoText}>À domicile</Text>
            </View>
          </View>
          <View style={styles.budgetContainer}>
            {isFourmizMode ? (
              <Text style={styles.budgetPrice}>{(service.basePrice * 0.8).toFixed(2)}€</Text>
            ) : (
              <>
                <Text style={styles.budgetPrice}>{service.basePrice}€</Text>
              </>
            )}
            <TouchableOpacity style={styles.orderButton}>
              <Text style={styles.orderButtonText}>
                {isFourmizMode ? 'Valider la mission' : 'Demander'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderClientRequestCard = ({ item: request }: { item: any }) => {
    const category = SERVICE_CATEGORIES.find(cat => cat.id === request.categoryId);
    
    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => router.push(`/client-request/${request.id}`)}
      >
        <View style={styles.requestHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: category?.color + '20' }]}>
            <Text style={styles.categoryIcon}>{category?.icon}</Text>
            <Text style={[styles.categoryText, { color: category?.color }]}>
              {category?.name}
            </Text>
          </View>
          <View style={styles.urgencyBadge}>
            <Clock size={12} color="#FF4444" />
            <Text style={styles.urgencyText}>{request.urgency}</Text>
          </View>
        </View>
        
        <Text style={styles.requestTitle}>{request.title}</Text>
        <Text style={styles.requestDescription}>{request.description}</Text>
        
        <View style={styles.requestFooter}>
          <View style={styles.requestInfo}>
            <View style={styles.infoItem}>
              <MapPin size={14} color="#666" />
              <Text style={styles.infoText}>{request.distance} km • {request.location}</Text>
            </View>
            <View style={styles.infoItem}>
              <Clock size={14} color="#666" />
              <Text style={styles.infoText}>Posté il y a {request.postedTime}</Text>
            </View>
          </View>
          <View style={styles.budgetContainer}>
            <Text style={styles.budgetPrice}>{request.budget}€</Text>
            <TouchableOpacity style={styles.orderButton}>
              <Text style={styles.orderButtonText}>Postuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryFilter = ({ item: category }: { item: ServiceCategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryFilter,
        selectedCategory === category.id && styles.categoryFilterActive,
        { borderColor: category.color }
      ]}
      onPress={() => setSelectedCategory(selectedCategory === category.id ? '' : category.id)}
    >
      <Text style={styles.categoryFilterIcon}>{category.icon}</Text>
      <Text style={[
        styles.categoryFilterText,
        selectedCategory === category.id && styles.categoryFilterTextActive
      ]}>
        {category.name}
      </Text>
      <Text style={styles.categoryServiceCount}>
        ({category.services.length})
      </Text>
    </TouchableOpacity>
  );

  const renderSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionSelect(item)}
    >
      <Search size={16} color="#666" />
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {mode === 'fourmiz' ? 'Missions disponibles' : 'Services disponibles'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {filteredItems.length} {mode === 'fourmiz' ? 'mission' : 'service'}{filteredItems.length > 1 ? 's' : ''} trouvé{filteredItems.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search Bar with Autocomplete */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder={mode === 'fourmiz' ? "Rechercher une mission..." : "Rechercher un service..."}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
              onFocus={() => {
                if (searchQuery.length >= 2) {
                  setShowSuggestions(true);
                }
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <X size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Suggestions Dropdown */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={searchSuggestions}
                renderItem={renderSuggestion}
                keyExtractor={(item, index) => `${item}-${index}`}
                style={styles.suggestionsList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>

      {/* Popular Searches */}
      {searchQuery.length === 0 && (
        <View style={styles.popularSearches}>
          <Text style={styles.popularTitle}>Recherches populaires :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.popularTags}>
              {['courses', 'ménage', 'bricolage', 'garde enfant', 'promenade chien', 'livraison', 'jardinage', 'baby-sitting', 'transport', 'urgence'].map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.popularTag}
                  onPress={() => setSearchQuery(tag)}
                >
                  <Text style={styles.popularTagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Category Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={SERVICE_CATEGORIES}
          renderItem={renderCategoryFilter}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFilters}
        />
      </View>

      {/* Services or Client Requests List */}
      <FlatList
        data={filteredItems}
        renderItem={mode === 'fourmiz' ? renderClientRequestCard : renderServiceCard}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.servicesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Search size={64} color="#DDD" />
            <Text style={styles.emptyTitle}>
              {mode === 'fourmiz' ? 'Aucune mission trouvée' : 'Aucun service trouvé'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Essayez de modifier votre recherche ou parcourez les catégories
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    position: 'relative',
    zIndex: 1000,
  },
  searchBarContainer: {
    flex: 1,
    position: 'relative',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularSearches: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  popularTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
    marginBottom: 12,
  },
  popularTags: {
    flexDirection: 'row',
    gap: 8,
  },
  popularTag: {
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  popularTagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  filtersContainer: {
    paddingBottom: 20,
  },
  categoryFilters: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  categoryFilterActive: {
    backgroundColor: '#FF444410',
  },
  categoryFilterIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryFilterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
    marginRight: 4,
  },
  categoryFilterTextActive: {
    color: '#FF4444',
  },
  categoryServiceCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
  servicesList: {
    padding: 20,
    gap: 16,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  taxCreditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  taxCreditText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#4CAF50',
  },
  serviceName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  serviceInfo: {
    flex: 1,
    gap: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  budgetContainer: {
    alignItems: 'flex-end',
  },
  budgetLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 4,
  },
  budgetPrice: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FF4444',
    marginBottom: 8,
  },
  orderButton: {
    backgroundColor: '#FF4444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  orderButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Styles for client request cards
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  urgencyText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#FF4444',
  },
  requestTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  requestDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  requestInfo: {
    flex: 1,
    gap: 4,
  },
});
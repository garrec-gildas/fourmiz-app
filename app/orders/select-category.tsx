// app/orders/select-category.tsx - VERSION AVEC RECHERCHE
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface Category {
  name: string;
  icon: string;
}

export default function SelectCategoryScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  // ✅ Filtrer les catégories selon la recherche
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return categories.filter(category => 
      category.name.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  // ✅ Vider la recherche
  const clearSearch = () => {
    setSearchQuery('');
  };

  // ✅ Récupérer toutes les catégories uniques des services existants
  const loadCategories = async () => {
    try {
      setLoading(true);
      console.log('📥 Chargement des catégories...');

      // Récupérer toutes les catégories uniques
      const { data, error } = await supabase
        .from('services')
        .select('categorie')
        .not('categorie', 'is', null)
        .neq('id', 149); // Exclure le service "Demande personnalisée" lui-même

      if (error) throw error;

      // Créer une liste unique des catégories
      const uniqueCategories = [...new Set(data.map(service => service.categorie))]
        .filter(Boolean) // Supprimer les valeurs null/undefined
        .map(name => ({
          name: name as string,
          icon: getCategoryIcon(name as string)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      console.log(`✅ ${uniqueCategories.length} catégories chargées`);
      setCategories(uniqueCategories);

    } catch (error) {
      console.error('💥 Erreur chargement catégories:', error);
      Alert.alert('Erreur', 'Impossible de charger les catégories');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Icônes par catégorie
  const getCategoryIcon = (category: string): string => {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('jardinage')) return '🌱';
    if (categoryLower.includes('ménage') || categoryLower.includes('aide à domicile')) return '🏠';
    if (categoryLower.includes('transport') || categoryLower.includes('livraison')) return '🚗';
    if (categoryLower.includes('administratif')) return '📋';
    if (categoryLower.includes('bricolage') || categoryLower.includes('travaux')) return '🔨';
    if (categoryLower.includes('enfance')) return '👶';
    if (categoryLower.includes('animaux')) return '🐕';
    if (categoryLower.includes('coaching') || categoryLower.includes('sport')) return '💪';
    if (categoryLower.includes('bien-être') || categoryLower.includes('beauté')) return '💆';
    if (categoryLower.includes('cours') || categoryLower.includes('formation')) return '📚';
    if (categoryLower.includes('art') || categoryLower.includes('création')) return '🎨';
    if (categoryLower.includes('informatique') || categoryLower.includes('tech')) return '💻';
    if (categoryLower.includes('cuisine') || categoryLower.includes('repas')) return '👨‍🍳';
    if (categoryLower.includes('événement') || categoryLower.includes('fête')) return '🎉';
    if (categoryLower.includes('loisirs')) return '🎯';
    
    return '🔧'; // Icône par défaut
  };

  // ✅ Sélection d'une catégorie et navigation vers le formulaire
  const handleCategorySelect = (categoryName: string) => {
    console.log(`✅ Catégorie sélectionnée: ${categoryName}`);
    
    // Navigation vers le formulaire de commande avec la catégorie
    router.push({
      pathname: '/orders/create-custom',
      params: {
        serviceId: '149',
        serviceTitle: 'Demande personnalisée',
        selectedCategory: categoryName,
        categoryIcon: getCategoryIcon(categoryName),
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement des catégories...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choisir une catégorie</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionTitle}>
            📝 Demande personnalisée
          </Text>
          <Text style={styles.descriptionText}>
            Votre besoin ne figure pas dans notre liste de services ? 
            Sélectionnez la catégorie qui se rapproche le plus de votre demande, 
            puis décrivez précisément ce dont vous avez besoin.
          </Text>
          <View style={styles.requiredNotice}>
            <Text style={styles.requiredText}>
              ⚠️ La sélection d'une catégorie est obligatoire
            </Text>
          </View>
        </View>

        {/* Liste des catégories avec recherche */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>
            Catégories disponibles
          </Text>

          {/* Barre de recherche */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une catégorie..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={clearSearch}
                  style={styles.clearButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Résultats de recherche */}
          {searchQuery.trim() && (
            <Text style={styles.searchResults}>
              {filteredCategories.length} résultat{filteredCategories.length > 1 ? 's' : ''} trouvé{filteredCategories.length > 1 ? 's' : ''}
            </Text>
          )}

          {/* Grille des catégories */}
          {filteredCategories.length > 0 ? (
            <View style={styles.categoriesGrid}>
              {filteredCategories.map((category) => (
                <TouchableOpacity
                  key={category.name}
                  style={[
                    styles.categoryCard,
                    selectedCategory === category.name && styles.categoryCardSelected
                  ]}
                  onPress={() => handleCategorySelect(category.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryEmoji}>{category.icon}</Text>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsEmoji}>🔍</Text>
              <Text style={styles.noResultsTitle}>Aucune catégorie trouvée</Text>
              <Text style={styles.noResultsText}>
                Essayez avec un autre terme de recherche
              </Text>
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={clearSearch}
              >
                <Text style={styles.clearSearchText}>Voir toutes les catégories</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Note informative */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 Comment ça marche ?</Text>
          <Text style={styles.infoText}>
            1. <Text style={styles.infoBold}>Choisissez</Text> la catégorie la plus proche{'\n'}
            2. <Text style={styles.infoBold}>Décrivez</Text> précisément votre besoin{'\n'}
            3. <Text style={styles.infoBold}>Recevez</Text> des propositions de Fourmiz spécialisés{'\n'}
            4. <Text style={styles.infoBold}>Sélectionnez</Text> le Fourmiz qui vous convient
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },

  // Header
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
  },
  headerRight: {
    width: 40, // Pour équilibrer avec le bouton retour
  },

  scrollView: {
    flex: 1,
  },

  // Description
  descriptionSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  requiredNotice: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    padding: 12,
    borderRadius: 8,
  },
  requiredText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#856404',
  },

  // Catégories - VERSION SIMPLIFIÉE EN GRILLE AVEC RECHERCHE
  categoriesSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
  },

  // Barre de recherche
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
    paddingVertical: 0, // Évite les problèmes d'alignement sur Android
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchResults: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
    marginBottom: 12,
    paddingLeft: 4,
  },

  // Grille des catégories
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%', // 2 colonnes avec un peu d'espace
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryCardSelected: {
    borderColor: '#FF4444',
    backgroundColor: '#FFF5F5',
  },
  categoryEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    textAlign: 'center',
  },

  // État vide de recherche
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  noResultsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  clearSearchButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearSearchText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },

  // Info section
  infoSection: {
    backgroundColor: '#E3F2FD',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 40,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    lineHeight: 22,
  },
  infoBold: {
    fontFamily: 'Inter-SemiBold',
  },
});
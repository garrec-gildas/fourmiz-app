// components/fourmiz/ServiceSelector.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServicesService } from '@/lib/services.service';
import { 
  getFourmizCategoriesWithServices,
  matchServiceToFourmizCategory 
} from '@/constants/services-mapping';
import type { Service } from '@/types/services.types';

interface Props {
  selectedCategories: string[];
  selectedServiceIds: number[];
  onCategoryToggle: (categoryKey: string) => void;
  onServiceToggle: (serviceId: number) => void;
  onSelectionChange?: (categories: string[], serviceIds: number[]) => void;
}

export default function ServiceSelector({
  selectedCategories,
  selectedServiceIds,
  onCategoryToggle,
  onServiceToggle,
  onSelectionChange
}: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    onSelectionChange?.(selectedCategories, selectedServiceIds);
  }, [selectedCategories, selectedServiceIds]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await ServicesService.getAllServices();
      setServices(data);
    } catch (error) {
      console.error('Erreur chargement services:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(service =>
    service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (service.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (service.categorie?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categoriesWithServices = getFourmizCategoriesWithServices(filteredServices);

  const toggleCategory = (categoryKey: string) => {
    onCategoryToggle(categoryKey);
    
    // Si on sélectionne toute la catégorie, sélectionner aussi tous ses services
    const category = categoriesWithServices.find(c => c.key === categoryKey);
    if (category && selectedCategories.includes(categoryKey)) {
      category.services.forEach(service => {
        if (!selectedServiceIds.includes(service.id)) {
          onServiceToggle(service.id);
        }
      });
    }
  };

  const toggleCategoryExpansion = (categoryKey: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
    }
    setExpandedCategories(newExpanded);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4444" />
        <Text style={styles.loadingText}>Chargement des services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header avec recherche */}
      <View style={styles.header}>
        <Text style={styles.title}>🛠️ Sélectionnez vos services</Text>
        <Text style={styles.subtitle}>
          Choisissez les catégories ou services spécifiques que vous proposez
        </Text>
        
        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Rechercher un service..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Résumé de sélection */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {selectedCategories.length} catégories • {selectedServiceIds.length} services sélectionnés
        </Text>
      </View>

      {/* Liste des catégories */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {categoriesWithServices.map((category) => (
          <View key={category.key} style={styles.categoryContainer}>
            
            {/* En-tête de catégorie */}
            <TouchableOpacity
              style={[
                styles.categoryHeader,
                selectedCategories.includes(category.key) && styles.categoryHeaderActive
              ]}
              onPress={() => toggleCategory(category.key)}
            >
              <View style={styles.categoryLeft}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <View>
                  <Text style={[
                    styles.categoryLabel,
                    selectedCategories.includes(category.key) && styles.categoryLabelActive
                  ]}>
                    {category.label}
                  </Text>
                  <Text style={styles.categoryCount}>
                    {category.serviceCount} service{category.serviceCount > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.categoryRight}>
                {selectedCategories.includes(category.key) && (
                  <Ionicons name="checkmark-circle" size={20} color="#FF4444" />
                )}
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => toggleCategoryExpansion(category.key)}
                >
                  <Ionicons 
                    name={expandedCategories.has(category.key) ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* Liste des services (si catégorie étendue) */}
            {expandedCategories.has(category.key) && category.services.length > 0 && (
              <View style={styles.servicesContainer}>
                {category.services.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.serviceItem,
                      selectedServiceIds.includes(service.id) && styles.serviceItemActive
                    ]}
                    onPress={() => onServiceToggle(service.id)}
                  >
                    <View style={styles.serviceLeft}>
                      <View style={[
                        styles.serviceCheckbox,
                        selectedServiceIds.includes(service.id) && styles.serviceCheckboxActive
                      ]}>
                        {selectedServiceIds.includes(service.id) && (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        )}
                      </View>
                      
                      <View style={styles.serviceInfo}>
                        <Text style={[
                          styles.serviceTitle,
                          selectedServiceIds.includes(service.id) && styles.serviceTitleActive
                        ]}>
                          {service.title}
                        </Text>
                        {service.description && (
                          <Text style={styles.serviceDescription} numberOfLines={2}>
                            {service.description}
                          </Text>
                        )}
                        <View style={styles.serviceMeta}>
                          {service.categorie && (
                            <Text style={styles.serviceCategory}>
                              {service.categorie}
                            </Text>
                          )}
                          {service.estimatedDuration && (
                            <Text style={styles.serviceDuration}>
                              {service.estimatedDuration}min
                            </Text>
                          )}
                          {service.isEligibleTaxCredit && (
                            <View style={styles.taxCreditBadge}>
                              <Text style={styles.taxCreditText}>crédit d'impôt</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Message si aucun service dans la catégorie */}
            {expandedCategories.has(category.key) && category.services.length === 0 && (
              <View style={styles.noServicesContainer}>
                <Text style={styles.noServicesText}>
                  Aucun service trouvé dans cette catégorie
                </Text>
              </View>
            )}
          </View>
        ))}

        {categoriesWithServices.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search" size={48} color="#ccc" />
            <Text style={styles.noResultsTitle}>Aucun résultat</Text>
            <Text style={styles.noResultsText}>
              Essayez avec d'autres mots-clés
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Actions en bas */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            selectedCategories.forEach(cat => onCategoryToggle(cat));
            selectedServiceIds.forEach(id => onServiceToggle(id));
          }}
        >
          <Text style={styles.clearButtonText}>Tout désélectionner</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.selectAllButton}
          onPress={() => {
            categoriesWithServices.forEach(cat => {
              if (!selectedCategories.includes(cat.key)) {
                onCategoryToggle(cat.key);
              }
            });
          }}
        >
          <Text style={styles.selectAllButtonText}>Sélectionner tout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  summary: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  categoryContainer: {
    marginBottom: 8,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
  },
  categoryHeaderActive: {
    backgroundColor: '#fff5f5',
    borderColor: '#FF4444',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryLabelActive: {
    color: '#FF4444',
  },
  categoryCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandButton: {
    padding: 4,
  },
  servicesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  serviceItemActive: {
    backgroundColor: '#fff5f5',
    borderColor: '#FF4444',
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  serviceCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  serviceCheckboxActive: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  serviceTitleActive: {
    color: '#FF4444',
  },
  serviceDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceCategory: {
    fontSize: 10,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  serviceDuration: {
    fontSize: 10,
    color: '#6b7280',
  },
  taxCreditBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taxCreditText: {
    fontSize: 10,
    color: '#166534',
    fontWeight: '500',
  },
  noServicesContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noServicesText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9ca3af',
    marginTop: 16,
  },
  noResultsText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4444',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: '600',
  },
  selectAllButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF4444',
    alignItems: 'center',
  },
  selectAllButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
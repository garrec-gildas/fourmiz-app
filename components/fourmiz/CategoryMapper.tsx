// components/fourmiz/CategoryMapper.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServicesService } from '@/lib/services.service';
import { 
  FOURMIZ_TO_SERVICES_MAPPING,
  SPECIAL_CATEGORIES,
  matchServiceToFourmizCategory,
  getFourmizCategoriesWithServices
} from '@/constants/services-mapping';
import type { Service } from '@/types/services.types';

interface Props {
  onMappingComplete?: (mappedData: any) => void;
}

export default function CategoryMapper({ onMappingComplete }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [mappingResults, setMappingResults] = useState<any>(null);

  useEffect(() => {
    loadAndMapServices();
  }, []);

  const loadAndMapServices = async () => {
    try {
      setLoading(true);
      const data = await ServicesService.getAllServices();
      setServices(data);
      
      // Effectuer le mapping automatique
      const mapped = performMapping(data);
      setMappingResults(mapped);
      onMappingComplete?.(mapped);
    } catch (error) {
      console.error('Erreur chargement services:', error);
      Alert.alert('Erreur', 'Impossible de charger les services');
    } finally {
      setLoading(false);
    }
  };

  const performMapping = (servicesList: Service[]) => {
    const categoriesWithServices = getFourmizCategoriesWithServices(servicesList);
    
    // Statistiques générales
    const totalServices = servicesList.length;
    const mappedServices = servicesList.filter(service => {
      const matches = matchServiceToFourmizCategory(service);
      return matches.length > 0;
    });
    const unmappedServices = servicesList.filter(service => {
      const matches = matchServiceToFourmizCategory(service);
      return matches.length === 0;
    });

    // Services par catégorie originale
    const originalCategories = [...new Set(servicesList.map(s => s.categorie).filter(Boolean))];
    
    return {
      totalServices,
      mappedServices: mappedServices.length,
      unmappedServices: unmappedServices.length,
      mappingRate: Math.round((mappedServices.length / totalServices) * 100),
      categoriesWithServices,
      originalCategories,
      unmappedServicesList: unmappedServices
    };
  };

  const showUnmappedServices = () => {
    if (!mappingResults?.unmappedServicesList.length) {
      Alert.alert('Info', 'Tous les services sont mappés !');
      return;
    }

    const servicesList = mappingResults.unmappedServicesList 
      .map((s: Service) => `• ${s.title} (${s.categorie || 'sans catégorie'})`)
      .slice(0, 10) // Limiter à 10 pour l'affichage
      .join('\n');

    const message = `Services non mappés (${mappingResults.unmappedServicesList.length}) :\n\n${servicesList}${
      mappingResults.unmappedServicesList.length > 10 ? '\n\n... et plus' : ''
    }`;

    Alert.alert('Services non mappés', message);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="sync" size={24} color="#FF4444" />
        <Text style={styles.loadingText}>Analyse des services...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header avec statistiques */}
      <View style={styles.header}>
        <Text style={styles.title}>🔗 Mapping des services</Text>
        <Text style={styles.subtitle}>
          Correspondance entre vos services et les catégories fourmiz
        </Text>

        {mappingResults && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{mappingResults.totalServices}</Text>
              <Text style={styles.statLabel}>Services total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#10b981' }]}>
                {mappingResults.mappedServices}
              </Text>
              <Text style={styles.statLabel}>Mappés</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
                {mappingResults.unmappedServices}
              </Text>
              <Text style={styles.statLabel}>Non mappés</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#3b82f6' }]}>
                {mappingResults.mappingRate}%
              </Text>
              <Text style={styles.statLabel}>Taux mapping</Text>
            </View>
          </View>
        )}
      </View>

      {/* Boutons d'action */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={showUnmappedServices}
        >
          <Ionicons name="list" size={16} color="#f59e0b" />
          <Text style={styles.actionButtonText}>Voir services non mappés</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={loadAndMapServices}
        >
          <Ionicons name="refresh" size={16} color="#3b82f6" />
          <Text style={styles.actionButtonText}>Actualiser mapping</Text>
        </TouchableOpacity>
      </View>

      {/* Résultats du mapping */}
      {mappingResults?.categoriesWithServices && (
        <View style={styles.mappingResults}>
          <Text style={styles.sectionTitle}>📊 Résultats du mapping</Text>
          
          {mappingResults.categoriesWithServices.map((category: any) => (
            <View key={category.key} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                  <Text style={styles.categoryCount}>
                    {category.serviceCount} service{category.serviceCount > 1 ? 's' : ''} trouvé{category.serviceCount > 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{category.serviceCount}</Text>
                </View>
              </View>

              {category.services.length > 0 && (
                <View style={styles.servicesPreview}>
                  {category.services.slice(0, 3).map((service: Service) => (
                    <View key={service.id} style={styles.servicePreviewItem}>
                      <Text style={styles.servicePreviewTitle} numberOfLines={1}>
                        {service.title}
                      </Text>
                      <Text style={styles.servicePreviewCategory}>
                        {service.categorie}
                      </Text>
                    </View>
                  ))}
                  {category.services.length > 3 && (
                    <Text style={styles.moreServicesText}>
                      ... et {category.services.length - 3} autres
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}

          {mappingResults.categoriesWithServices.length === 0 && (
            <View style={styles.noMappingContainer}>
              <Ionicons name="warning" size={48} color="#f59e0b" />
              <Text style={styles.noMappingTitle}>Aucun mapping trouvé</Text>
              <Text style={styles.noMappingText}>
                Vos services ne correspondent à aucune catégorie fourmiz.
                Vérifiez les noms et descriptions de vos services.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Catégories originales */}
      {mappingResults?.originalCategories && (
        <View style={styles.originalCategories}>
          <Text style={styles.sectionTitle}>🏷️ Catégories originales</Text>
          <View style={styles.categoriesGrid}>
            {mappingResults.originalCategories.map((categorie: string) => (
              <View key={categorie} style={styles.originalCategoryItem}>
                <Text style={styles.originalCategoryText}>{categorie}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Guide d'amélioration */}
      <View style={styles.improvementGuide}>
        <Text style={styles.sectionTitle}>💡 Améliorer le mapping</Text>
        
        <View style={styles.guideCard}>
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          <View style={styles.guideContent}>
            <Text style={styles.guideTitle}>Bonnes pratiques</Text>
            <Text style={styles.guideText}>
              • Utilisez des mots-clés clairs dans les titres{'\n'}
              • Ajoutez des descriptions détaillées{'\n'}
              • Utilisez des catégories standardisées
            </Text>
          </View>
        </View>

        <View style={styles.guideCard}>
          <Ionicons name="warning" size={20} color="#f59e0b" />
          <View style={styles.guideContent}>
            <Text style={styles.guideTitle}>Services non mappés</Text>
            <Text style={styles.guideText}>
              Les services sans correspondance ne seront pas proposés aux fourmiz.
              Vérifiez leurs titres et catégories.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
    gap: 16,
  },
  loadingText: {
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  mappingResults: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  servicesPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  servicePreviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  servicePreviewTitle: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  servicePreviewCategory: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moreServicesText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 4,
  },
  noMappingContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  noMappingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginTop: 16,
  },
  noMappingText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  originalCategories: {
    margin: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  originalCategoryItem: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  originalCategoryText: {
    fontSize: 12,
    color: '#374151',
  },
  improvementGuide: {
    margin: 16,
    marginBottom: 32,
  },
  guideCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  guideContent: {
    marginLeft: 12,
    flex: 1,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  guideText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Filter, Clock, MapPin, Euro, Calendar, Save, SquareCheck as CheckSquare, Square, ChevronDown, ChevronUp, Target, Briefcase, Zap } from 'lucide-react-native';
import { SERVICE_CATEGORIES } from '@/constants/services';

interface AddressSuggestion {
  id: string;
  label: string;
  address: string;
  city: string;
  postalCode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface FourmizCriteria {
  // Services acceptés
  acceptedServices: {
    categoryId: string;
    serviceIds: string[];
  }[];
  
  // Disponibilités
  availability: {
    days: {
      [key: string]: boolean; // 'monday', 'tuesday', etc.
    };
    hours: {
      [key: string]: { // 'monday', 'tuesday', etc.
        [hour: string]: boolean; // '8', '9', '10', etc.
      };
    };
  };
  
  // Préférences financières
  financialPreferences: {
    minimumCommission: number;
    preferredPriceRange: {
      min: number;
      max: number;
    };
  };
  
  // Rayon d'action
  actionRadius: number;
  
  // Statut de disponibilité
  isAvailable: boolean;
}

// Jours de la semaine
const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Lundi' },
  { id: 'tuesday', label: 'Mardi' },
  { id: 'wednesday', label: 'Mercredi' },
  { id: 'thursday', label: 'Jeudi' },
  { id: 'friday', label: 'Vendredi' },
  { id: 'saturday', label: 'Samedi' },
  { id: 'sunday', label: 'Dimanche' },
];

// Heures de la journée
const HOURS_OF_DAY = Array.from({ length: 15 }, (_, i) => ({
  id: String(i + 8),
  label: `${i + 8}:00`,
}));

export default function FourmizCriteriaScreen() {
  // État initial des critères
  const [criteria, setCriteria] = useState<FourmizCriteria>({
    acceptedServices: [],
    availability: {
      days: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
      hours: {
        monday: Object.fromEntries(HOURS_OF_DAY.map(h => [h.id, h.id >= '9' && h.id <= '18'])),
        tuesday: Object.fromEntries(HOURS_OF_DAY.map(h => [h.id, h.id >= '9' && h.id <= '18'])),
        wednesday: Object.fromEntries(HOURS_OF_DAY.map(h => [h.id, h.id >= '9' && h.id <= '18'])),
        thursday: Object.fromEntries(HOURS_OF_DAY.map(h => [h.id, h.id >= '9' && h.id <= '18'])),
        friday: Object.fromEntries(HOURS_OF_DAY.map(h => [h.id, h.id >= '9' && h.id <= '18'])),
        saturday: Object.fromEntries(HOURS_OF_DAY.map(h => [h.id, false])),
        sunday: Object.fromEntries(HOURS_OF_DAY.map(h => [h.id, false])),
      },
    },
    financialPreferences: {
      minimumCommission: 10,
      preferredPriceRange: {
        min: 10,
        max: 50,
      },
    },
    actionRadius: 10,
    isAvailable: true,
  });

  // États pour l'interface
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);

  // Initialiser les services acceptés à partir des catégories disponibles
  useEffect(() => {
    if (criteria.acceptedServices.length === 0) {
      const initialAcceptedServices = SERVICE_CATEGORIES.map(category => ({
        categoryId: category.id,
        serviceIds: category.services.slice(0, 2).map(service => service.id), // Par défaut, accepter les 2 premiers services de chaque catégorie
      }));
      
      setCriteria(prev => ({
        ...prev,
        acceptedServices: initialAcceptedServices,
      }));
    }
  }, []);

  // Gérer l'expansion/réduction des catégories
  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Gérer l'expansion/réduction des jours
  const toggleDayExpansion = (dayId: string) => {
    setExpandedDays(prev => 
      prev.includes(dayId)
        ? prev.filter(id => id !== dayId)
        : [...prev, dayId]
    );
  };

  // Gérer la sélection/désélection d'un service
  const toggleService = (categoryId: string, serviceId: string) => {
    setCriteria(prev => {
      const updatedAcceptedServices = [...prev.acceptedServices];
      const categoryIndex = updatedAcceptedServices.findIndex(cat => cat.categoryId === categoryId);
      
      if (categoryIndex >= 0) {
        const category = updatedAcceptedServices[categoryIndex];
        const serviceIds = category.serviceIds.includes(serviceId)
          ? category.serviceIds.filter(id => id !== serviceId)
          : [...category.serviceIds, serviceId];
        
        updatedAcceptedServices[categoryIndex] = {
          ...category,
          serviceIds,
        };
      } else {
        updatedAcceptedServices.push({
          categoryId,
          serviceIds: [serviceId],
        });
      }
      
      return {
        ...prev,
        acceptedServices: updatedAcceptedServices,
      };
    });
  };

  // Vérifier si un service est sélectionné
  const isServiceSelected = (categoryId: string, serviceId: string) => {
    const category = criteria.acceptedServices.find(cat => cat.categoryId === categoryId);
    return category ? category.serviceIds.includes(serviceId) : false;
  };

  // Gérer la sélection/désélection d'un jour
  const toggleDay = (dayId: string) => {
    setCriteria(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        days: {
          ...prev.availability.days,
          [dayId]: !prev.availability.days[dayId],
        },
      },
    }));
  };

  // Gérer la sélection/désélection d'une heure pour un jour
  const toggleHour = (dayId: string, hour: string) => {
    setCriteria(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        hours: {
          ...prev.availability.hours,
          [dayId]: {
            ...prev.availability.hours[dayId],
            [hour]: !prev.availability.hours[dayId][hour],
          },
        },
      },
    }));
  };

  // Sélectionner toutes les heures d'un jour
  const selectAllHours = (dayId: string) => {
    setCriteria(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        hours: {
          ...prev.availability.hours,
          [dayId]: Object.fromEntries(HOURS_OF_DAY.map(h => [h.id, true])),
        },
      },
    }));
  };

  // Désélectionner toutes les heures d'un jour
  const deselectAllHours = (dayId: string) => {
    setCriteria(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        hours: {
          ...prev.availability.hours,
          [dayId]: Object.fromEntries(HOURS_OF_DAY.map(h => [h.id, false])),
        },
      },
    }));
  };

  // Mettre à jour le rayon d'action
  const updateActionRadius = (value: string) => {
    const radius = parseInt(value);
    if (!isNaN(radius) && radius >= 1 && radius <= 50) {
      setCriteria(prev => ({
        ...prev,
        actionRadius: radius,
      }));
    }
  };

  // Mettre à jour la commission minimale
  const updateMinimumCommission = (value: string) => {
    const commission = parseInt(value);
    if (!isNaN(commission) && commission >= 0) {
      setCriteria(prev => ({
        ...prev,
        financialPreferences: {
          ...prev.financialPreferences,
          minimumCommission: commission,
        },
      }));
    }
  };

  // Mettre à jour la fourchette de prix
  const updatePriceRange = (min: string, max: string) => {
    const minValue = parseInt(min);
    const maxValue = parseInt(max);
    
    if (!isNaN(minValue) && !isNaN(maxValue) && minValue >= 0 && maxValue >= minValue) {
      setCriteria(prev => ({
        ...prev,
        financialPreferences: {
          ...prev.financialPreferences,
          preferredPriceRange: {
            min: minValue,
            max: maxValue,
          },
        },
      }));
    }
  };

  // Mettre à jour la disponibilité
  const toggleAvailability = () => {
    setCriteria(prev => ({
      ...prev,
      isAvailable: !prev.isAvailable,
    }));
  };

  // Sauvegarder les critères
  const saveCriteria = async () => {
    setIsLoading(true);
    
    try {
      // Simulation d'une sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Critères sauvegardés',
        'Vos critères de mission ont été mis à jour avec succès. Vous recevrez désormais des notifications uniquement pour les missions qui vous correspondent.',
        [{ text: 'OK' }]
      );
      
      // Retourner à l'écran précédent
      router.back();
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue lors de la sauvegarde de vos critères.');
    } finally {
      setIsLoading(false);
    }
  };

  // Rendu d'une catégorie de services
  const renderServiceCategory = (category: any) => {
    const isExpanded = expandedCategories.includes(category.id);
    const selectedServicesCount = criteria.acceptedServices.find(cat => cat.categoryId === category.id)?.serviceIds.length || 0;
    
    return (
      <View key={category.id} style={styles.categoryContainer}>
        <TouchableOpacity 
          style={styles.categoryHeader}
          onPress={() => toggleCategoryExpansion(category.id)}
        >
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={styles.categoryName}>{category.name}</Text>
          </View>
          <View style={styles.categoryActions}>
            <Text style={styles.selectedCount}>
              {selectedServicesCount} sélectionné{selectedServicesCount > 1 ? 's' : ''}
            </Text>
            {isExpanded ? (
              <ChevronUp size={20} color="#666" />
            ) : (
              <ChevronDown size={20} color="#666" />
            )}
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.servicesList}>
            {category.services.map((service: any) => (
              <TouchableOpacity 
                key={service.id}
                style={styles.serviceItem}
                onPress={() => toggleService(category.id, service.id)}
              >
                {isServiceSelected(category.id, service.id) ? (
                  <CheckSquare size={20} color="#FF4444" />
                ) : (
                  <Square size={20} color="#666" />
                )}
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.servicePrice}>Dès {service.basePrice}€</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Rendu d'un jour et ses heures
  const renderDayAvailability = (day: any) => {
    const isExpanded = expandedDays.includes(day.id);
    const isDaySelected = criteria.availability.days[day.id];
    const selectedHoursCount = Object.values(criteria.availability.hours[day.id]).filter(Boolean).length;
    
    return (
      <View key={day.id} style={styles.dayContainer}>
        <View style={styles.dayHeader}>
          <TouchableOpacity 
            style={styles.dayToggle}
            onPress={() => toggleDay(day.id)}
          >
            {isDaySelected ? (
              <CheckSquare size={20} color="#4CAF50" />
            ) : (
              <Square size={20} color="#666" />
            )}
            <Text style={[styles.dayName, !isDaySelected && styles.dayNameDisabled]}>
              {day.label}
            </Text>
          </TouchableOpacity>
          
          {isDaySelected && (
            <TouchableOpacity 
              style={styles.expandButton}
              onPress={() => toggleDayExpansion(day.id)}
            >
              <Text style={styles.hoursCount}>
                {selectedHoursCount} heure{selectedHoursCount > 1 ? 's' : ''}
              </Text>
              {isExpanded ? (
                <ChevronUp size={20} color="#666" />
              ) : (
                <ChevronDown size={20} color="#666" />
              )}
            </TouchableOpacity>
          )}
        </View>
        
        {isDaySelected && isExpanded && (
          <View style={styles.hoursContainer}>
            <View style={styles.hoursActions}>
              <TouchableOpacity 
                style={styles.selectAllButton}
                onPress={() => selectAllHours(day.id)}
              >
                <Text style={styles.selectAllText}>Tout sélectionner</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deselectAllButton}
                onPress={() => deselectAllHours(day.id)}
              >
                <Text style={styles.deselectAllText}>Tout désélectionner</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.hoursList}>
              {HOURS_OF_DAY.map(hour => (
                <TouchableOpacity 
                  key={hour.id}
                  style={[
                    styles.hourItem,
                    criteria.availability.hours[day.id][hour.id] && styles.hourItemSelected
                  ]}
                  onPress={() => toggleHour(day.id, hour.id)}
                >
                  <Text style={[
                    styles.hourText,
                    criteria.availability.hours[day.id][hour.id] && styles.hourTextSelected
                  ]}>
                    {hour.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes critères de mission</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Disponibilité générale */}
        <View style={styles.availabilitySection}>
          <View style={styles.availabilityHeader}>
            <View style={styles.sectionTitleContainer}>
              <Zap size={20} color="#FF4444" />
              <Text style={styles.sectionTitle}>Statut de disponibilité</Text>
            </View>
            {Platform.OS !== 'web' ? (
              <Switch
                value={criteria.isAvailable}
                onValueChange={toggleAvailability}
                trackColor={{ false: '#E0E0E0', true: '#FF444440' }}
                thumbColor={criteria.isAvailable ? '#FF4444' : '#999'}
              />
            ) : (
              <TouchableOpacity 
                style={[
                  styles.webSwitch, 
                  criteria.isAvailable ? styles.webSwitchActive : styles.webSwitchInactive
                ]}
                onPress={toggleAvailability}
              >
                <View style={[
                  styles.webSwitchThumb, 
                  criteria.isAvailable ? styles.webSwitchThumbActive : styles.webSwitchThumbInactive
                ]} />
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={styles.availabilityDescription}>
            {criteria.isAvailable 
              ? 'Vous êtes actuellement disponible pour recevoir des demandes de mission.'
              : 'Vous êtes actuellement indisponible et ne recevrez pas de nouvelles demandes.'}
          </Text>
        </View>

        {/* Services acceptés */}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Briefcase size={20} color="#FF4444" />
            <Text style={styles.sectionTitle}>Services acceptés</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Sélectionnez les services que vous souhaitez proposer aux clients
          </Text>
          
          {SERVICE_CATEGORIES.map(renderServiceCategory)}
        </View>

        {/* Disponibilités */}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Calendar size={20} color="#FF4444" />
            <Text style={styles.sectionTitle}>Disponibilités</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Définissez vos jours et heures de disponibilité
          </Text>
          
          {DAYS_OF_WEEK.map(renderDayAvailability)}
        </View>

        {/* Rayon d'action */}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Target size={20} color="#FF4444" />
            <Text style={styles.sectionTitle}>Rayon d'action</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Définissez la distance maximale à laquelle vous êtes prêt à vous déplacer
          </Text>
          
          <View style={styles.radiusContainer}>
            <View style={styles.radiusInputContainer}>
              <TextInput
                style={styles.radiusInput}
                value={criteria.actionRadius.toString()}
                onChangeText={updateActionRadius}
                keyboardType="numeric"
                maxLength={2}
              />
              <Text style={styles.radiusUnit}>km</Text>
            </View>
            
            <View style={styles.radiusSlider}>
              <Text style={styles.sliderLabel}>1 km</Text>
              <View style={styles.sliderTrack}>
                <View 
                  style={[
                    styles.sliderFill, 
                    { width: `${(criteria.actionRadius - 1) / 49 * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.sliderLabel}>50 km</Text>
            </View>
          </View>
        </View>

        {/* Préférences financières */}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Euro size={20} color="#FF4444" />
            <Text style={styles.sectionTitle}>Préférences financières</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Définissez vos préférences de rémunération
          </Text>
          
          <View style={styles.financialContainer}>
            <Text style={styles.financialLabel}>Commission minimale</Text>
            <View style={styles.commissionInputContainer}>
              <TextInput
                style={styles.commissionInput}
                value={criteria.financialPreferences.minimumCommission.toString()}
                onChangeText={updateMinimumCommission}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.commissionUnit}>€</Text>
            </View>
            
            <Text style={styles.financialLabel}>Fourchette de prix préférée</Text>
            <View style={styles.priceRangeContainer}>
              <View style={styles.priceInputContainer}>
                <TextInput
                  style={styles.priceInput}
                  value={criteria.financialPreferences.preferredPriceRange.min.toString()}
                  onChangeText={(value) => updatePriceRange(
                    value,
                    criteria.financialPreferences.preferredPriceRange.max.toString()
                  )}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.priceUnit}>€</Text>
              </View>
              <Text style={styles.priceRangeSeparator}>à</Text>
              <View style={styles.priceInputContainer}>
                <TextInput
                  style={styles.priceInput}
                  value={criteria.financialPreferences.preferredPriceRange.max.toString()}
                  onChangeText={(value) => updatePriceRange(
                    criteria.financialPreferences.preferredPriceRange.min.toString(),
                    value
                  )}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.priceUnit}>€</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Informations */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Comment fonctionnent les critères ?</Text>
          <Text style={styles.infoText}>
            En définissant vos critères, vous recevrez uniquement des notifications pour les missions qui correspondent à vos préférences. Cela vous permet de vous concentrer sur les services que vous souhaitez réaliser, dans votre zone géographique et selon vos disponibilités.
          </Text>
          <Text style={styles.infoText}>
            Vous pouvez modifier vos critères à tout moment pour ajuster votre activité selon vos besoins.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={saveCriteria}
          disabled={isLoading}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Enregistrement...' : 'Enregistrer mes critères'}
          </Text>
        </TouchableOpacity>
      </View>
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
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  availabilitySection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  availabilityDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
  },
  section: {
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
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  categoryContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginRight: 8,
  },
  servicesList: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  serviceName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  dayContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  dayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginLeft: 12,
  },
  dayNameDisabled: {
    color: '#999',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginRight: 8,
  },
  hoursContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  hoursActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectAllButton: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  selectAllText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#4CAF50',
  },
  deselectAllButton: {
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  deselectAllText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FF4444',
  },
  hoursList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  hourItemSelected: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  hourText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  hourTextSelected: {
    color: '#4CAF50',
  },
  radiusContainer: {
    marginBottom: 16,
  },
  radiusInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radiusInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    width: 80,
    textAlign: 'center',
  },
  radiusUnit: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginLeft: 8,
  },
  radiusSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#FF4444',
    borderRadius: 2,
  },
  financialContainer: {
    marginBottom: 16,
  },
  financialLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginBottom: 8,
  },
  commissionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  commissionInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    width: 80,
    textAlign: 'center',
  },
  commissionUnit: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginLeft: 8,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    width: 80,
    textAlign: 'center',
  },
  priceUnit: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginLeft: 8,
  },
  priceRangeSeparator: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginHorizontal: 12,
  },
  infoSection: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
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
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  saveButton: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginBottom: 8,
  },
  // Web-specific styles for Switch component
  webSwitch: {
    width: 50,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  webSwitchActive: {
    backgroundColor: '#FF444440',
  },
  webSwitchInactive: {
    backgroundColor: '#E0E0E0',
  },
  webSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  webSwitchThumbActive: {
    backgroundColor: '#FF4444',
    marginLeft: 'auto',
  },
  webSwitchThumbInactive: {
    backgroundColor: '#999',
    marginLeft: 0,
  },
});
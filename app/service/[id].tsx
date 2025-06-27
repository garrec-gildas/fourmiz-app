import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Clock, Calendar, Euro, Star, Award, TriangleAlert as AlertTriangle, Phone, MessageCircle, Camera, FileText, Navigation, Zap, Info, CircleCheck as CheckCircle, User, Chrome as Home, Building } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SERVICE_CATEGORIES } from '@/constants/services';
import { Service, FormField } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface OrderFormData {
  // Informations de base
  serviceId: string;
  budget: string;
  scheduledDate: string;
  scheduledTime: string;
  isUrgent: boolean;
  
  // Adresses
  pickupAddress: string;
  pickupBuilding: string;
  pickupFloor: string;
  pickupInstructions: string;
  
  deliveryAddress: string;
  deliveryBuilding: string;
  deliveryFloor: string;
  deliveryInstructions: string;
  
  // Contact
  contactName: string;
  contactPhone: string;
  alternateContact: string;
  
  // Détails spécifiques au service
  serviceDetails: Record<string, any>;
  
  // Instructions générales
  specialInstructions: string;
  photos: string[];
}

// Mock user profile for demo
const mockUserProfile = {
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean.dupont@email.com',
  phone: '06 12 34 56 78',
  address: '15 rue de la Paix',
  building: 'A',
  floor: '3ème',
  postalCode: '75001',
  city: 'Paris',
  instructions: 'Digicode: 1234A, interphone au nom de Dupont'
};

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const [service, setService] = useState<Service | null>(null);
  const [category, setCategory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedPrice, setRecommendedPrice] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [formData, setFormData] = useState<OrderFormData>({
    serviceId: id as string,
    budget: '',
    scheduledDate: '',
    scheduledTime: '',
    isUrgent: false,
    pickupAddress: '',
    pickupBuilding: '',
    pickupFloor: '',
    pickupInstructions: '',
    deliveryAddress: '',
    deliveryBuilding: '',
    deliveryFloor: '',
    deliveryInstructions: '',
    contactName: '',
    contactPhone: '',
    alternateContact: '',
    serviceDetails: {},
    specialInstructions: '',
    photos: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize with current date and time
  useEffect(() => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    setFormData(prev => ({
      ...prev,
      scheduledDate: formattedDate,
      scheduledTime: `${hours}:${minutes}`,
    }));
  }, []);

  // Load user profile from AsyncStorage or mock data
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userSessionJson = await AsyncStorage.getItem('userSession');
        
        if (userSessionJson) {
          const userSession = JSON.parse(userSessionJson);
          // In a real app, you would fetch the complete user profile
          // For now, we'll use our mock data
          setUserProfile(mockUserProfile);
          
          // Pre-fill the form with user data
          setFormData(prev => ({
            ...prev,
            contactName: `${mockUserProfile.firstName} ${mockUserProfile.lastName}`,
            contactPhone: mockUserProfile.phone,
            deliveryAddress: `${mockUserProfile.address}, ${mockUserProfile.postalCode} ${mockUserProfile.city}`,
            deliveryBuilding: mockUserProfile.building,
            deliveryFloor: mockUserProfile.floor,
            deliveryInstructions: mockUserProfile.instructions
          }));
        } else {
          // If no user session, still use mock data for demo
          setUserProfile(mockUserProfile);
          setFormData(prev => ({
            ...prev,
            contactName: `${mockUserProfile.firstName} ${mockUserProfile.lastName}`,
            contactPhone: mockUserProfile.phone,
            deliveryAddress: `${mockUserProfile.address}, ${mockUserProfile.postalCode} ${mockUserProfile.city}`,
            deliveryBuilding: mockUserProfile.building,
            deliveryFloor: mockUserProfile.floor,
            deliveryInstructions: mockUserProfile.instructions
          }));
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };

    loadUserProfile();
  }, []);

  useEffect(() => {
    // Trouver le service par ID
    for (const cat of SERVICE_CATEGORIES) {
      const foundService = cat.services.find(s => s.id === id);
      if (foundService) {
        setService(foundService);
        setCategory(cat);
        break;
      }
    }
  }, [id]);

  // Calculer le prix recommandé en fonction du service, de l'heure et de l'urgence
  useEffect(() => {
    if (!service) return;

    let basePrice = 0;
    
    // Prix de base selon le type de service
    if (service.id.includes('delivery') || service.id.includes('courses')) {
      // Pour les services de livraison/courses, prix minimum fixe
      const currentHour = formData.scheduledTime ? parseInt(formData.scheduledTime.split(':')[0]) : new Date().getHours();
      
      // Prix minimum de 7€ entre 8h et 20h, 10€ entre 20h et 8h
      basePrice = (currentHour >= 8 && currentHour < 20) ? 7 : 10;
    } else {
      // Pour les autres services, utiliser le prix de base du service
      basePrice = service.basePrice;
    }
    
    // Majoration pour l'urgence (+30%)
    if (formData.isUrgent) {
      basePrice = basePrice * 1.3;
    }
    
    // Arrondir au nombre entier supérieur
    basePrice = Math.ceil(basePrice);
    
    setRecommendedPrice(basePrice);
    
    // Si le budget n'a pas encore été saisi, proposer le prix recommandé
    if (!formData.budget) {
      setFormData(prev => ({
        ...prev,
        budget: basePrice.toString()
      }));
    }
  }, [service, formData.scheduledTime, formData.isUrgent]);

  const updateFormData = (field: keyof OrderFormData | string, value: any) => {
    if (field.startsWith('serviceDetails.')) {
      const detailField = field.replace('serviceDetails.', '');
      setFormData(prev => ({
        ...prev,
        serviceDetails: {
          ...prev.serviceDetails,
          [detailField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation de base
    if (!formData.budget) newErrors.budget = 'Budget requis';
    if (!formData.scheduledDate) newErrors.scheduledDate = 'Date requise';
    if (!formData.scheduledTime) newErrors.scheduledTime = 'Heure requise';
    if (!formData.contactName) newErrors.contactName = 'Nom de contact requis';
    if (!formData.contactPhone) newErrors.contactPhone = 'Téléphone requis';

    // Validation des adresses selon le type de service
    if (service?.id.includes('delivery') || service?.id.includes('transport')) {
      if (!formData.pickupAddress) newErrors.pickupAddress = 'Adresse de départ requise';
      if (!formData.deliveryAddress) newErrors.deliveryAddress = 'Adresse de livraison requise';
    } else {
      if (!formData.deliveryAddress) newErrors.deliveryAddress = 'Adresse du service requise';
    }

    // Validation des champs spécifiques au service
    service?.requiredFields.forEach(field => {
      if (field.required && !formData.serviceDetails[field.id]) {
        newErrors[`serviceDetails.${field.id}`] = `${field.label} requis`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Simulation d'envoi de commande
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Demande envoyée !',
        'Votre demande a été transmise aux Fourmiz disponibles. Vous recevrez des propositions sous peu.',
        [
          {
            text: 'Voir mes commandes',
            onPress: () => router.replace('/(tabs)/orders'),
          },
          {
            text: 'Retour à l\'accueil',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  // Date picker component
  const DatePicker = () => {
    // Generate dates for the next 30 days
    const dates = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return date;
    });

    const formatDateOption = (date: Date) => {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) {
        return "Aujourd'hui";
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return "Demain";
      } else {
        return date.toLocaleDateString('fr-FR', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short' 
        });
      }
    };

    const selectDate = (date: Date) => {
      const formattedDate = date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).replace(/\//g, '/');
      updateFormData('scheduledDate', formattedDate);
      setShowDatePicker(false);
    };

    return (
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir une date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.datePickerContainer}>
              {dates.map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dateOption}
                  onPress={() => selectDate(date)}
                >
                  <Text style={styles.dateOptionText}>{formatDateOption(date)}</Text>
                  <Text style={styles.dateOptionDetail}>
                    {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Time picker component
  const TimePicker = () => {
    // Generate time options in 30-minute intervals
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 30]) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        times.push(`${formattedHour}:${formattedMinute}`);
      }
    }

    const selectTime = (time: string) => {
      updateFormData('scheduledTime', time);
      setShowTimePicker(false);
    };

    return (
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir une heure</Text>
              <TouchableOpacity
                onPress={() => setShowTimePicker(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.timePickerContainer}>
              {times.map((time, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.timeOption}
                  onPress={() => selectTime(time)}
                >
                  <Text style={styles.timeOptionText}>{time}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFormField = (field: FormField) => {
    const fieldKey = `serviceDetails.${field.id}`;
    const value = formData.serviceDetails[field.id] || '';
    const error = errors[fieldKey];

    switch (field.type) {
      case 'text':
        return (
          <View key={field.id} style={styles.inputGroup}>
            <Text style={styles.label}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              value={value}
              onChangeText={(text) => updateFormData(fieldKey, text)}
              placeholder={field.placeholder || `Saisissez ${field.label.toLowerCase()}`}
              placeholderTextColor="#999"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'number':
        return (
          <View key={field.id} style={styles.inputGroup}>
            <Text style={styles.label}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              value={value}
              onChangeText={(text) => updateFormData(fieldKey, text)}
              placeholder={field.placeholder || `Saisissez ${field.label.toLowerCase()}`}
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'select':
        return (
          <View key={field.id} style={styles.inputGroup}>
            <Text style={styles.label}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <View style={styles.selectContainer}>
              {field.options?.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectOption,
                    value === option && styles.selectOptionActive
                  ]}
                  onPress={() => updateFormData(fieldKey, option)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    value === option && styles.selectOptionTextActive
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'textarea':
        return (
          <View key={field.id} style={styles.inputGroup}>
            <Text style={styles.label}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
              style={[styles.textArea, error && styles.inputError]}
              value={value}
              onChangeText={(text) => updateFormData(fieldKey, text)}
              placeholder={field.placeholder || `Saisissez ${field.label.toLowerCase()}`}
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'time':
        return (
          <View key={field.id} style={styles.inputGroup}>
            <Text style={styles.label}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              value={value}
              onChangeText={(text) => updateFormData(fieldKey, text)}
              placeholder="HH:MM"
              placeholderTextColor="#999"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'location':
        return (
          <View key={field.id} style={styles.inputGroup}>
            <Text style={styles.label}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <View style={styles.locationInput}>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                value={value}
                onChangeText={(text) => updateFormData(fieldKey, text)}
                placeholder="Adresse complète"
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={styles.locationButton}>
                <Navigation size={20} color="#FF4444" />
              </TouchableOpacity>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      default:
        return null;
    }
  };

  if (!service || !category) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Service non trouvé</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de la demande</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Service Info */}
        <LinearGradient
          colors={[category.color, category.color + 'CC']}
          style={styles.serviceCard}
        >
          <View style={styles.serviceHeader}>
            <Text style={styles.serviceIcon}>{category.icon}</Text>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceCategory}>{category.name}</Text>
              <Text style={styles.serviceDescription}>{service.description}</Text>
            </View>
            {service.isEligibleTaxCredit && (
              <View style={styles.taxCreditBadge}>
                <Award size={16} color="#4CAF50" />
                <Text style={styles.taxCreditText}>Crédit d'impôt 50%</Text>
              </View>
            )}
          </View>
          
          <View style={styles.serviceDetails}>
            <View style={styles.serviceDetail}>
              <Clock size={16} color="#FFFFFF" />
              <Text style={styles.serviceDetailText}>~{service.estimatedDuration} min</Text>
            </View>
            {service.id.includes('delivery') || service.id.includes('courses') ? (
              <View style={styles.serviceDetail}>
                <Euro size={16} color="#FFFFFF" />
                <Text style={styles.serviceDetailText}>
                  {formData.scheduledTime && parseInt(formData.scheduledTime.split(':')[0]) >= 20 || 
                   formData.scheduledTime && parseInt(formData.scheduledTime.split(':')[0]) < 8 
                    ? 'Min 10€' 
                    : 'Min 7€'}
                </Text>
              </View>
            ) : (
              <View style={styles.serviceDetail}>
                <Euro size={16} color="#FFFFFF" />
                <Text style={styles.serviceDetailText}>Tarif libre</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Budget Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Votre budget</Text>
          <View style={styles.budgetContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Montant proposé <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.budgetInput}>
                <TextInput
                  style={[styles.input, errors.budget && styles.inputError]}
                  value={formData.budget}
                  onChangeText={(text) => updateFormData('budget', text)}
                  placeholder={recommendedPrice ? `Recommandé: ${recommendedPrice}€` : "Saisissez un montant"}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                <Text style={styles.currencySymbol}>€</Text>
              </View>
              {errors.budget && <Text style={styles.errorText}>{errors.budget}</Text>}
              
              {recommendedPrice && (
                <View style={styles.recommendationContainer}>
                  <Info size={16} color="#2196F3" />
                  <Text style={styles.recommendationText}>
                    Prix recommandé: <Text style={styles.recommendedPrice}>{recommendedPrice}€</Text>
                    {formData.isUrgent && " (inclut +30% pour l'urgence)"}
                  </Text>
                </View>
              )}
              
              <Text style={styles.helpText}>
                Proposez un montant équitable. Les Fourmiz pourront négocier.
              </Text>
            </View>
          </View>
        </View>

        {/* Date & Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quand ?</Text>
          
          <View style={styles.urgentToggle}>
            <View style={styles.urgentInfo}>
              <Zap size={20} color="#FF4444" />
              <Text style={styles.urgentLabel}>Service urgent</Text>
            </View>
            <Switch
              value={formData.isUrgent}
              onValueChange={(value) => updateFormData('isUrgent', value)}
              trackColor={{ false: '#E0E0E0', true: '#FF444440' }}
              thumbColor={formData.isUrgent ? '#FF4444' : '#999'}
            />
          </View>
          
          {formData.isUrgent && (
            <View style={styles.urgentNote}>
              <AlertTriangle size={16} color="#FF9800" />
              <Text style={styles.urgentNoteText}>
                Les services urgents ont un supplément de 30% pour compenser la disponibilité immédiate des Fourmiz
              </Text>
            </View>
          )}

          <View style={styles.dateTimeContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity 
                style={[styles.dateTimeSelector, errors.scheduledDate && styles.inputError]}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={20} color="#666" />
                <Text style={styles.dateTimeSelectorText}>
                  {formData.scheduledDate || "Sélectionner une date"}
                </Text>
              </TouchableOpacity>
              {errors.scheduledDate && <Text style={styles.errorText}>{errors.scheduledDate}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Heure <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity 
                style={[styles.dateTimeSelector, errors.scheduledTime && styles.inputError]}
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={20} color="#666" />
                <Text style={styles.dateTimeSelectorText}>
                  {formData.scheduledTime || "Sélectionner une heure"}
                </Text>
              </TouchableOpacity>
              {errors.scheduledTime && <Text style={styles.errorText}>{errors.scheduledTime}</Text>}
              {service.id.includes('delivery') || service.id.includes('courses') ? (
                <Text style={styles.timeNote}>
                  {formData.scheduledTime && parseInt(formData.scheduledTime.split(':')[0]) >= 20 || 
                   formData.scheduledTime && parseInt(formData.scheduledTime.split(':')[0]) < 8 
                    ? 'Tarif nuit (20h-8h): minimum 10€' 
                    : 'Tarif jour (8h-20h): minimum 7€'}
                </Text>
              ) : null}
            </View>
          </View>
          
          {/* Date Picker Modal */}
          <DatePicker />
          
          {/* Time Picker Modal */}
          <TimePicker />
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Où ?</Text>
          
          {/* Pickup Address (for delivery/transport services) */}
          {(service.id.includes('delivery') || service.id.includes('transport')) && (
            <View style={styles.addressGroup}>
              <Text style={styles.addressTitle}>
                <MapPin size={16} color="#FF4444" /> Adresse de départ
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Adresse <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.pickupAddress && styles.inputError]}
                  value={formData.pickupAddress}
                  onChangeText={(text) => updateFormData('pickupAddress', text)}
                  placeholder="Adresse complète de départ"
                  placeholderTextColor="#999"
                />
                {errors.pickupAddress && <Text style={styles.errorText}>{errors.pickupAddress}</Text>}
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Bâtiment</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.pickupBuilding}
                    onChangeText={(text) => updateFormData('pickupBuilding', text)}
                    placeholder="A, B, C..."
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
                  <Text style={styles.label}>Étage</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.pickupFloor}
                    onChangeText={(text) => updateFormData('pickupFloor', text)}
                    placeholder="1er, 2ème..."
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Instructions d'accès</Text>
                <TextInput
                  style={styles.textArea}
                  value={formData.pickupInstructions}
                  onChangeText={(text) => updateFormData('pickupInstructions', text)}
                  placeholder="Code d'accès, interphone, instructions spéciales..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          )}

          {/* Delivery/Service Address */}
          <View style={styles.addressGroup}>
            <Text style={styles.addressTitle}>
              <Home size={16} color="#4CAF50" /> 
              {service.id.includes('delivery') || service.id.includes('transport') 
                ? ' Adresse de livraison' 
                : ' Adresse du service'
              }
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Adresse <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.deliveryAddress && styles.inputError]}
                value={formData.deliveryAddress}
                onChangeText={(text) => updateFormData('deliveryAddress', text)}
                placeholder={service.id.includes('delivery') ? "Adresse de livraison" : "Adresse où réaliser le service"}
                placeholderTextColor="#999"
              />
              {errors.deliveryAddress && <Text style={styles.errorText}>{errors.deliveryAddress}</Text>}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Bâtiment</Text>
                <TextInput
                  style={styles.input}
                  value={formData.deliveryBuilding}
                  onChangeText={(text) => updateFormData('deliveryBuilding', text)}
                  placeholder="A, B, C..."
                  placeholderTextColor="#999"
                />
              </View>
              <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
                <Text style={styles.label}>Étage</Text>
                <TextInput
                  style={styles.input}
                  value={formData.deliveryFloor}
                  onChangeText={(text) => updateFormData('deliveryFloor', text)}
                  placeholder="1er, 2ème..."
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Instructions d'accès</Text>
              <TextInput
                style={styles.textArea}
                value={formData.deliveryInstructions}
                onChangeText={(text) => updateFormData('deliveryInstructions', text)}
                placeholder="Code d'accès, interphone, instructions spéciales..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nom de contact <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWithIcon}>
              <User size={20} color="#666" />
              <TextInput
                style={[styles.input, errors.contactName && styles.inputError]}
                value={formData.contactName}
                onChangeText={(text) => updateFormData('contactName', text)}
                placeholder="Votre nom ou nom du contact"
                placeholderTextColor="#999"
              />
            </View>
            {errors.contactName && <Text style={styles.errorText}>{errors.contactName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Téléphone <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWithIcon}>
              <Phone size={20} color="#666" />
              <TextInput
                style={[styles.input, errors.contactPhone && styles.inputError]}
                value={formData.contactPhone}
                onChangeText={(text) => updateFormData('contactPhone', text)}
                placeholder="06 12 34 56 78"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
            {errors.contactPhone && <Text style={styles.errorText}>{errors.contactPhone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact alternatif</Text>
            <View style={styles.inputWithIcon}>
              <Phone size={20} color="#666" />
              <TextInput
                style={styles.input}
                value={formData.alternateContact}
                onChangeText={(text) => updateFormData('alternateContact', text)}
                placeholder="Numéro de secours (optionnel)"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Service Specific Fields */}
        {service.requiredFields.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails du service</Text>
            {service.requiredFields.map(renderFormField)}
          </View>
        )}

        {/* Additional Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions supplémentaires</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Informations complémentaires</Text>
            <TextInput
              style={styles.textArea}
              value={formData.specialInstructions}
              onChangeText={(text) => updateFormData('specialInstructions', text)}
              placeholder="Précisions importantes, contraintes particulières, préférences..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
            <Text style={styles.helpText}>
              Plus vous donnez de détails, mieux la Fourmiz pourra répondre à vos attentes.
            </Text>
          </View>

          <TouchableOpacity style={styles.photoButton}>
            <Camera size={24} color="#FF4444" />
            <Text style={styles.photoButtonText}>Ajouter des photos</Text>
            <Text style={styles.photoButtonSubtext}>Optionnel</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service :</Text>
              <Text style={styles.summaryValue}>{service.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Budget proposé :</Text>
              <Text style={styles.summaryValue}>{formData.budget || '---'}€</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date et heure :</Text>
              <Text style={styles.summaryValue}>
                {formData.scheduledDate || '---'} à {formData.scheduledTime || '---'}
              </Text>
            </View>
            {formData.isUrgent && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Urgence :</Text>
                <Text style={[styles.summaryValue, styles.urgentText]}>Service urgent (+30%)</Text>
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <Info size={20} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Comment ça marche ?</Text>
              <Text style={styles.infoText}>
                1. Votre demande est envoyée aux Fourmiz disponibles sur votre secteur{'\n'}
                2. Vous recevez des propositions dans les 15 minutes (urgence), ou suivant votre heure ou date limite{'\n'}
                3. Vous choisissez votre Fourmiz et confirmez, le paiement se fait d'avance{'\n'}
                4. Le service est réalisé et vous payez après la prestation en communiquant votre code
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Envoi en cours...' : 'Envoyer ma demande'}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  serviceCard: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  serviceIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: 20,
  },
  taxCreditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  taxCreditText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: 20,
  },
  serviceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
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
  required: {
    color: '#F44336',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputError: {
    borderColor: '#F44336',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textArea: {
    backgroundColor: '#F8F9FA',
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
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#F44336',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
    marginTop: 4,
    lineHeight: 16,
  },
  budgetContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  budgetInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginLeft: 8,
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    gap: 8,
  },
  recommendationText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    flex: 1,
  },
  recommendedPrice: {
    fontFamily: 'Inter-Bold',
    color: '#1976D2',
  },
  urgentToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  urgentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgentLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  urgentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  urgentNoteText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FF9800',
    flex: 1,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateTimeSelectorText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
    marginLeft: 8,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
    marginLeft: 8,
  },
  timeNote: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FF9800',
    marginTop: 4,
  },
  addressGroup: {
    marginBottom: 24,
  },
  addressTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 12,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectOptionActive: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  selectOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  selectOptionTextActive: {
    color: '#FFFFFF',
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationButton: {
    padding: 8,
  },
  photoButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  photoButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FF4444',
    marginTop: 8,
  },
  photoButtonSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
    marginTop: 4,
  },
  summarySection: {
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
  summaryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  urgentText: {
    color: '#FF4444',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    lineHeight: 16,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  submitButton: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  // Date & Time Picker Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FF4444',
  },
  datePickerContainer: {
    maxHeight: 400,
  },
  dateOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  dateOptionDetail: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  timePickerContainer: {
    maxHeight: 400,
  },
  timeOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  timeOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
});
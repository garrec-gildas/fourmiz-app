// app/orders/create.tsx - VERSION COMPLÈTE MISE À JOUR AVEC STRUCTURE SUPABASE ACTUELLE
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

// ✅ INTERFACES MISES À JOUR SELON STRUCTURE SUPABASE
interface OrderForm {
  serviceTitle: string;
  description: string;
  proposedAmount: string;
  isUrgent: boolean;
  urgencyLevel: '30min' | '1hour' | '2hours' | 'normal';
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  alternativePhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  arrivalAddress: string;
  arrivalPostalCode: string;
  arrivalCity: string;
  prestationDate: string;
  departureTime: string;
  startTime: string;
  duration: string;
  pickupTime: string;
  packageNumber: string;
  equipment: string;
  needsInvoice: boolean;
  invoiceType: 'particulier' | 'entreprise';
  companyName: string;
  siret: string;
}

// Structure addresses comme dans Supabase
interface AddressesData {
  city: string;
  category: string;
  postal_code: string;
  arrival_city: string | null;
  main_address: string;
  pickup_address: string | null;
  arrival_address: string | null;
  delivery_address: string | null;
  departure_address: string;
  arrival_postal_code: string | null;
}

interface Service {
  id: number;
  title: string;
  description?: string;
  categorie: string;
  estimatedDuration?: number;
}

interface SelectOption {
  value: string;
  label: string;
}

// ✅ HOOKS PERSONNALISÉS
const useFormValidation = () => {
  const validateField = useCallback((field: keyof OrderForm, value: any): string => {
    switch (field) {
      case 'description':
        if (!value?.trim()) return 'Description requise';
        if (value.trim().length < 10) return 'Description trop courte (min 10 caractères)';
        if (value.trim().length > 500) return 'Description trop longue (max 500 caractères)';
        break;
        
      case 'proposedAmount':
        if (!value?.trim()) return 'Montant requis';
        const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
        const amount = Number(cleanValue);
        if (isNaN(amount)) return 'Montant invalide - utilisez uniquement des chiffres';
        if (amount <= 0) return 'Le montant doit être positif';
        if (amount > 10000) return 'Montant trop élevé (max 10 000€)';
        break;
        
      case 'phone':
        if (!value?.trim()) return 'Téléphone requis';
        const cleanPhone = value.replace(/[\s.-]/g, '');
        const phoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:\d{8})$/;
        if (!phoneRegex.test(cleanPhone)) {
          return 'Format de téléphone invalide (ex: 06 12 34 56 78)';
        }
        break;
        
      case 'postalCode':
        if (value && !/^\d{5}$/.test(value.trim())) {
          return 'Code postal invalide (5 chiffres requis)';
        }
        break;
        
      case 'address':
        if (!value?.trim()) return 'Adresse requise';
        if (value.trim().length < 5) return 'Adresse trop courte (minimum 5 caractères)';
        break;
        
      case 'city':
        if (!value?.trim()) return 'Ville requise';
        if (value.trim().length < 2) return 'Nom de ville trop court';
        break;
        
      case 'prestationDate':
        if (!value) return 'Date de prestation requise';
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) return 'La date ne peut pas être dans le passé';
        break;
    }
    return '';
  }, []);

  const validateForm = useCallback((form: OrderForm): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    
    const requiredFields: (keyof OrderForm)[] = [
      'description', 'proposedAmount', 'address', 'city', 'phone', 'prestationDate'
    ];
    
    requiredFields.forEach(field => {
      const error = validateField(field, form[field]);
      if (error) errors[field] = error;
    });
    
    if (form.postalCode) {
      const error = validateField('postalCode', form.postalCode);
      if (error) errors.postalCode = error;
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [validateField]);

  return { validateForm, validateField };
};

// ✅ COMPOSANTS RÉUTILISABLES

// Modal de sélection générique
const SelectModal: React.FC<{
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onCancel: () => void;
}> = ({ visible, title, options, selectedValue, onSelect, onCancel }) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>
        <ScrollView style={styles.timeScroll}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.modalOption,
                selectedValue === option.value && styles.selectedModalOption
              ]}
              onPress={() => onSelect(option.value)}
            >
              <Text style={[
                styles.modalOptionText,
                selectedValue === option.value && styles.selectedModalText
              ]}>
                {option.label}
              </Text>
              {selectedValue === option.value && (
                <Ionicons name="checkmark" size={20} color="#FF4444" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
          <Text style={styles.modalCancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// Bouton dropdown réutilisable
const DropdownButton: React.FC<{
  value?: string;
  placeholder: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: boolean;
}> = ({ value, placeholder, onPress, icon = "chevron-down", error = false }) => (
  <TouchableOpacity
    style={[styles.dropdownButton, error && styles.inputError]}
    onPress={onPress}
  >
    <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
      {value || placeholder}
    </Text>
    <Ionicons name={icon} size={20} color="#666" />
  </TouchableOpacity>
);

// ✅ COMPOSANT PRINCIPAL
export default function CreateOrderScreen() {
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // States
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Modals
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showUrgencyDropdown, setShowUrgencyDropdown] = useState(false);
  
  // Form state
  const [form, setForm] = useState<OrderForm>({
    serviceTitle: '',
    description: '',
    proposedAmount: '',
    isUrgent: false,
    urgencyLevel: 'normal',
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    alternativePhone: '',
    pickupAddress: '',
    deliveryAddress: '',
    arrivalAddress: '',
    arrivalPostalCode: '',
    arrivalCity: '',
    prestationDate: '',
    departureTime: '',
    startTime: '',
    duration: '',
    pickupTime: '',
    packageNumber: '',
    equipment: '',
    needsInvoice: false,
    invoiceType: 'particulier',
    companyName: '',
    siret: '',
  });

  // État pour gérer le focus des inputs
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Hooks personnalisés
  const { validateForm, validateField } = useFormValidation();

  // ✅ FONCTIONS UTILITAIRES

  // Générer les créneaux horaires
  const timeSlots = useMemo(() => {
    const slots = [];
    const now = new Date();
    const isToday = form.prestationDate === now.toISOString().split('T')[0];
    
    for (let hour = 0; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        if (isToday) {
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          if (hour < currentHour || (hour === currentHour && minute <= currentMinute)) {
            continue;
          }
        }
        
        slots.push(timeString);
      }
    }
    
    return slots;
  }, [form.prestationDate]);

  // Générer les durées
  const durations = useMemo(() => {
    const durations = [];
    for (let minutes = 15; minutes <= 480; minutes += 15) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      let label;
      if (hours === 0) {
        label = `${mins} min`;
      } else if (mins === 0) {
        label = `${hours}h`;
      } else {
        label = `${hours}h${mins}`;
      }
      
      durations.push({ value: minutes.toString(), label });
    }
    return durations;
  }, []);

  // Générer les dates disponibles
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 120; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateString = date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      const isoString = date.toISOString().split('T')[0];
      
      let label;
      if (i === 0) {
        label = `Aujourd'hui (${dateString})`;
      } else if (i === 1) {
        label = `Demain (${dateString})`;
      } else if (i <= 7) {
        label = dateString;
      } else {
        const shortDate = date.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
        label = shortDate;
      }
      
      dates.push({
        label: label,
        value: isoString,
        date: date
      });
    }
    
    return dates;
  }, []);

  // Calculer la surcharge d'urgence
  const calculateUrgencySurcharge = useCallback((urgencyLevel: string): string => {
    switch (urgencyLevel) {
      case '30min': return '25.00';
      case '1hour': return '15.00';
      case '2hours': return '10.00';
      default: return '0.00';
    }
  }, []);

  // Construire l'objet addresses pour Supabase
  const buildAddressesObject = useCallback((form: OrderForm, service: Service | null): AddressesData => {
    return {
      city: form.city || '',
      category: service?.categorie || '',
      postal_code: form.postalCode || '',
      arrival_city: form.arrivalCity || '',
      main_address: form.address || '',
      pickup_address: form.pickupAddress || '',
      arrival_address: form.arrivalAddress || '',
      delivery_address: form.deliveryAddress || '',
      departure_address: form.address || '',
      arrival_postal_code: form.arrivalPostalCode || ''
    };
  }, []);

  // Calculer l'heure de fin
  const calculateEndTime = useCallback((startTime: string, durationMinutes: string) => {
    if (!startTime || !durationMinutes) return '';
    
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const duration = parseInt(durationMinutes);
      
      const totalMinutes = hours * 60 + minutes + duration;
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;
      
      return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('❌ Erreur calcul heure fin:', error);
      return '';
    }
  }, []);

  const calculatedEndTime = useMemo(() => {
    return calculateEndTime(form.startTime, form.duration);
  }, [form.startTime, form.duration, calculateEndTime]);

  // Mise à jour du formulaire
  const updateForm = useCallback((key: keyof OrderForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
    
    setErrors(prev => {
      if (!prev[key]) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
    
    setSubmitError(prev => prev ? null : prev);
  }, []);

  // Gestionnaires de focus pour les inputs
  const handleInputFocus = useCallback(() => {
    setIsInputFocused(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
  }, []);

  // Obtenir le label d'urgence
  const getUrgencyLabel = useCallback((level: string) => {
    switch (level) {
      case '30min': return '🔥 Très urgent (30 min)';
      case '1hour': return '⚡ Urgent (1 heure)';
      case '2hours': return '⏰ Assez urgent (2 heures)';
      default: return 'Normal';
    }
  }, []);

  // Gestion d'erreurs
  const handleError = useCallback((error: any, context: string) => {
    console.error(`💥 Erreur ${context}:`, error);
    
    let userMessage = 'Une erreur inattendue est survenue';
    
    if (error?.code === 'PGRST301') {
      userMessage = 'Service non trouvé ou indisponible';
    } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      userMessage = 'Problème de connexion internet. Vérifiez votre connexion.';
    } else if (error?.message?.includes('auth')) {
      userMessage = 'Session expirée, veuillez vous reconnecter';
    } else if (context === 'order_creation') {
      userMessage = 'Impossible de créer la commande pour le moment';
    } else if (context === 'service_loading') {
      userMessage = 'Impossible de charger le service. Vérifiez votre connexion.';
    }
    
    setSubmitError(userMessage);
  }, []);

  // ✅ CHARGEMENT DES DONNÉES
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadService(),
        loadUserData()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  const loadService = useCallback(async () => {
    try {
      const serviceId = params.serviceId as string;
      
      if (!serviceId) {
        throw new Error('Aucun ID de service fourni');
      }

      const numericId = parseInt(serviceId, 10);
      if (isNaN(numericId)) {
        throw new Error('ID de service invalide');
      }

      const { data, error } = await supabase
        .from('services')
        .select('id, title, description, categorie, estimatedDuration')
        .eq('id', numericId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Service non trouvé');

      setSelectedService(data);
      
      setForm(prev => ({
        ...prev,
        serviceTitle: data.title,
        description: data.description || '',
        duration: data.estimatedDuration ? data.estimatedDuration.toString() : ''
      }));

    } catch (error: any) {
      handleError(error, 'service_loading');
    }
  }, [params.serviceId, handleError]);

  const loadUserData = useCallback(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ Erreur auth:', userError);
        return;
      }
      
      setCurrentUser(user);
      
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('address, phone, postal_code, city')
          .eq('user_id', user.id)
          .single();
          
        if (profile && !profileError) {
          setForm(prev => ({
            ...prev,
            address: profile.address || '',
            phone: profile.phone || '',
            postalCode: profile.postal_code || '',
            city: profile.city || '',
          }));
        }
      }
    } catch (error) {
      console.error('💥 Erreur chargement utilisateur:', error);
    }
  }, []);

  // Validation pour la synthèse
  const validateFormForSummary = useCallback(() => {
    console.log('🔍 Début validation synthèse...');
    
    const validation = validateForm(form);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
      
      Alert.alert(
        'Formulaire incomplet',
        `${Object.keys(validation.errors).length} erreur${Object.keys(validation.errors).length > 1 ? 's' : ''} détectée${Object.keys(validation.errors).length > 1 ? 's' : ''} :\n• ${Object.values(validation.errors).join('\n• ')}`,
        [{ text: 'OK' }]
      );
      return false;
    }
    
    return true;
  }, [form, validateForm]);

  // ✅ SOUMISSION MISE À JOUR SELON STRUCTURE SUPABASE
  const handleSubmit = useCallback(async () => {
    console.log('🚀 === DÉBUT SOUMISSION AVEC STRUCTURE SUPABASE ===');
    
    const validation = validateForm(form);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
      
      Alert.alert(
        'Formulaire incomplet',
        'Veuillez corriger les erreurs dans le formulaire avant de continuer.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (!currentUser) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }
    
    if (!selectedService) {
      Alert.alert('Erreur', 'Service non sélectionné');
      return;
    }

    setSubmitting(true);
    
    try {
      // Construire l'objet addresses
      const addressesData = buildAddressesObject(form, selectedService);
      
      // Calculer l'heure de fin si nécessaire
      const endTime = form.startTime && form.duration 
        ? calculateEndTime(form.startTime, form.duration) 
        : null;

      // Données pour l'insertion directe correspondant EXACTEMENT à la structure Supabase
      const orderData = {
        // IDs et relations
        client_id: currentUser.id,
        service_id: selectedService.id,
        user_id: null, // legacy field
        fourmiz_id: null, // sera assigné plus tard
        
        // Description et montant
        description: form.description,
        proposed_amount: parseFloat(form.proposedAmount.replace(/[^\d.,]/g, '').replace(',', '.')),
        
        // Dates et horaires
        date: form.prestationDate || null,
        start_time: form.startTime || null,
        end_time: endTime,
        
        // Adresses (structure complète)
        address: form.address,
        phone: form.phone,
        urgent: form.isUrgent,
        urgency_level: form.isUrgent ? form.urgencyLevel : 'normal',
        invoice_required: form.needsInvoice,
        
        // Statut
        status: 'en_attente', // ou 'PENDING' selon votre convention
        
        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: null,
        
        // Champs de confirmation/annulation
        confirmed_by_fourmiz: false,
        accepted_at: null,
        cancelled_at: null,
        cancelled_by: null,
        
        // Évaluation
        rating: null,
        feedback: null,
        
        // Facturation
        invoice_url: null,
        urgency_surcharge: calculateUrgencySurcharge(form.isUrgent ? form.urgencyLevel : 'normal'),
        cancellation_fee: '0.00',
        
        // Objet addresses complet
        addresses: addressesData,
        postal_code: form.postalCode,
        city: form.city,
        departure_address: form.address,
        arrival_address: form.arrivalAddress || null,
        arrival_postal_code: form.arrivalPostalCode || null,
        arrival_city: form.arrivalCity || null,
        delivery_address: form.deliveryAddress || null,
        pickup_address: form.pickupAddress || null,
        
        // Commission
        commission: null
      };

      console.log('📤 Données de commande à insérer:', orderData);

      const { data: insertResult, error: insertError } = await supabase
        .from('orders')
        .insert(orderData)
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log('✅ Commande créée avec succès:', insertResult);

      Alert.alert(
        '🎉 Commande créée !',
        `Votre commande #${insertResult.id} pour "${selectedService.title}" a été envoyée avec succès.`,
        [
          { 
            text: 'Voir mes commandes', 
            onPress: () => router.replace('/(tabs)/orders') 
          }
        ]
      );

    } catch (error: any) {
      console.error('💥 Erreur création commande:', error);
      handleError(error, 'order_creation');
    } finally {
      setSubmitting(false);
    }
  }, [validateForm, currentUser, selectedService, form, handleError, calculateEndTime, calculateUrgencySurcharge, buildAddressesObject]);

  // ✅ GESTION DE L'ERREUR DE CHARGEMENT
  if (submitError && !selectedService) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Nouvelle commande',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => router.push('/(tabs)/services')}
                style={styles.headerButton}
              >
                <Ionicons name="arrow-back" size={24} color="#FF4444" />
              </TouchableOpacity>
            ),
          }} 
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF4444" />
          <Text style={styles.errorTitle}>Oups !</Text>
          <Text style={styles.errorMessage}>{submitError}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity 
              style={styles.backToServicesButtonError}
              onPress={() => router.push('/(tabs)/services')}
            >
              <Ionicons name="arrow-back" size={20} color="#666" />
              <Text style={styles.backToServicesTextError}>Retour aux services</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.retryButton, loading && styles.retryButtonDisabled]}
              onPress={() => loadService()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="refresh" size={20} color="#fff" />
              )}
              <Text style={styles.retryButtonText}>
                {loading ? 'Tentative...' : 'Réessayer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Nouvelle commande',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => router.push('/(tabs)/services')}
                style={styles.headerButton}
              >
                <Ionicons name="arrow-back" size={24} color="#FF4444" />
              </TouchableOpacity>
            ),
          }} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement du service...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ RENDU PRINCIPAL
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: selectedService ? `Commander: ${selectedService.title}` : 'Nouvelle commande',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/services')}
              style={styles.headerButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FF4444" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Bouton de retour visible */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.backToServicesButton}
              onPress={() => {
                Alert.alert(
                  'Retour aux services',
                  'Voulez-vous abandonner cette commande et retourner à la liste des services ?',
                  [
                    { text: 'Continuer la commande', style: 'cancel' },
                    { 
                      text: 'Retour aux services', 
                      style: 'destructive',
                      onPress: () => router.push('/(tabs)/services')
                    }
                  ]
                );
              }}
            >
              <Ionicons name="arrow-back-circle" size={20} color="#666" />
              <Text style={styles.backToServicesText}>Retour aux services disponibles</Text>
            </TouchableOpacity>
          </View>

          {/* Service sélectionné */}
          {selectedService && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 Service sélectionné</Text>
              <View style={styles.selectedServiceCard}>
                <Text style={styles.selectedServiceTitle}>{selectedService.title}</Text>
                <Text style={styles.selectedServiceCategory}>{selectedService.categorie}</Text>
                {selectedService.description && (
                  <Text style={styles.selectedServiceDescription}>
                    {selectedService.description}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Option urgence */}
          <View style={styles.section}>
            <View style={styles.urgencyHeader}>
              <Text style={styles.sectionTitle}>🚨 Demande urgente</Text>
              <Switch
                value={form.isUrgent}
                onValueChange={(value) => {
                  updateForm('isUrgent', value);
                  if (value && form.urgencyLevel === 'normal') {
                    updateForm('urgencyLevel', '1hour');
                  }
                }}
                trackColor={{ false: '#e0e0e0', true: '#FF4444' }}
              />
            </View>
            
            {form.isUrgent && (
              <View style={styles.urgencySelector}>
                <TouchableOpacity
                  style={styles.urgencyDropdown}
                  onPress={() => setShowUrgencyDropdown(!showUrgencyDropdown)}
                >
                  <Text style={styles.urgencyText}>
                    {getUrgencyLabel(form.urgencyLevel)}
                  </Text>
                  <Ionicons 
                    name={showUrgencyDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>

                {showUrgencyDropdown && (
                  <>
                    <TouchableOpacity 
                      style={styles.urgencyOverlay} 
                      onPress={() => setShowUrgencyDropdown(false)}
                      activeOpacity={1}
                    />
                    <View style={styles.urgencyMenu}>
                      {['30min', '1hour', '2hours'].map((level) => (
                        <TouchableOpacity
                          key={level}
                          style={[
                            styles.urgencyOption,
                            form.urgencyLevel === level && styles.selectedUrgencyOption
                          ]}
                          onPress={() => {
                            updateForm('urgencyLevel', level as any);
                            setShowUrgencyDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.urgencyOptionText,
                            form.urgencyLevel === level && styles.selectedUrgencyText
                          ]}>
                            {getUrgencyLabel(level)}
                          </Text>
                          {form.urgencyLevel === level && (
                            <Ionicons name="checkmark" size={20} color="#FF4444" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Montant proposé */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Montant proposé *</Text>
            <View style={[styles.inputContainer, errors.proposedAmount && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="Montant que vous proposez"
                placeholderTextColor="#999"
                value={form.proposedAmount}
                onChangeText={(text) => updateForm('proposedAmount', text)}
                keyboardType="numeric"
                returnKeyType="done"
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <Text style={styles.currencySymbol}>€</Text>
            </View>
            {errors.proposedAmount && <Text style={styles.errorText}>{errors.proposedAmount}</Text>}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Informations complémentaires *</Text>
            <TextInput
              style={[styles.textArea, errors.description && styles.inputError]}
              placeholder="Décrivez précisément votre demande..."
              value={form.description}
              onChangeText={(text) => updateForm('description', text)}
              multiline
              numberOfLines={4}
              returnKeyType="done"
              textAlignVertical="top"
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Adresse */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Adresse *</Text>
            <TextInput
              style={[styles.input, errors.address && styles.inputError]}
              placeholder="Adresse complète (rue, numéro)"
              value={form.address}
              onChangeText={(text) => updateForm('address', text)}
              returnKeyType="done"
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>

          {/* Code postal et ville */}
          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.subSectionTitle}>Code postal</Text>
                <TextInput
                  style={[styles.input, errors.postalCode && styles.inputError]}
                  placeholder="Ex: 67000"
                  value={form.postalCode}
                  onChangeText={(text) => updateForm('postalCode', text)}
                  keyboardType="numeric"
                  maxLength={5}
                  returnKeyType="done"
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                {errors.postalCode && <Text style={styles.errorText}>{errors.postalCode}</Text>}
              </View>
              
              <View style={styles.halfWidth}>
                <Text style={styles.subSectionTitle}>Ville *</Text>
                <TextInput
                  style={[styles.input, errors.city && styles.inputError]}
                  placeholder="Ex: Strasbourg"
                  value={form.city}
                  onChangeText={(text) => updateForm('city', text)}
                  returnKeyType="done"
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
              </View>
            </View>
          </View>

          {/* Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 Contact</Text>
            
            <View style={styles.phoneField}>
              <Text style={styles.subSectionTitle}>Téléphone principal *</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="06 12 34 56 78"
                value={form.phone}
                onChangeText={(text) => updateForm('phone', text)}
                keyboardType="phone-pad"
                maxLength={14}
                returnKeyType="done"
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            <View style={styles.phoneField}>
              <Text style={styles.subSectionTitle}>Téléphone alternatif (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="06 98 76 54 32"
                value={form.alternativePhone}
                onChangeText={(text) => updateForm('alternativePhone', text)}
                keyboardType="phone-pad"
                maxLength={14}
                returnKeyType="done"
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </View>
          </View>

          {/* Date de prestation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Date de prestation *</Text>
            <DropdownButton
              value={form.prestationDate 
                ? availableDates.find(d => d.value === form.prestationDate)?.label 
                : undefined
              }
              placeholder="Choisir une date"
              onPress={() => setShowDatePicker(true)}
              icon="calendar"
              error={!!errors.prestationDate}
            />
            {errors.prestationDate && <Text style={styles.errorText}>{errors.prestationDate}</Text>}
          </View>

          {/* Planning */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕐 Planning</Text>
            
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.subSectionTitle}>Heure début</Text>
                <DropdownButton
                  value={form.startTime}
                  placeholder="Choisir"
                  onPress={() => setShowStartTimePicker(true)}
                  icon="time"
                />
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.subSectionTitle}>Durée</Text>
                <DropdownButton
                  value={form.duration ? durations.find(d => d.value === form.duration)?.label : undefined}
                  placeholder="Choisir"
                  onPress={() => setShowDurationPicker(true)}
                  icon="timer"
                />
              </View>
            </View>

            {calculatedEndTime && (
              <View style={styles.calculatedEndTime}>
                <Text style={styles.endTimeText}>
                  🕐 Fin prévue : {calculatedEndTime}
                </Text>
              </View>
            )}
          </View>

          {/* Erreur de soumission */}
          {submitError && (
            <View style={styles.section}>
              <View style={styles.submitErrorContainer}>
                <Ionicons name="alert-circle" size={20} color="#FF4444" />
                <Text style={styles.submitErrorText}>{submitError}</Text>
              </View>
            </View>
          )}

          {/* Bouton synthèse */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.summaryButton, submitting && styles.summaryButtonDisabled]}
              onPress={() => {
                if (validateFormForSummary()) {
                  setShowSummary(true);
                }
              }}
              disabled={submitting}
            >
              <Ionicons name="document-text" size={20} color="#fff" />
              <Text style={styles.summaryButtonText}>
                {submitting ? 'Traitement...' : 'Voir la synthèse'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyboardSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal synthèse */}
      <Modal visible={showSummary} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.summaryModal}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>📋 Synthèse de la commande</Text>
            <TouchableOpacity onPress={() => setShowSummary(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.summaryContent}>
            {selectedService && (
              <View style={styles.summarySection}>
                <Text style={styles.summarySectionTitle}>🎯 Service</Text>
                <Text style={styles.summaryItem}>• {selectedService.title}</Text>
                <Text style={styles.summaryItem}>• Catégorie : {selectedService.categorie}</Text>
                <Text style={styles.summaryItem}>• Montant proposé : {form.proposedAmount}€</Text>
                {form.isUrgent && (
                  <Text style={styles.summaryUrgent}>• 🚨 URGENT - {getUrgencyLabel(form.urgencyLevel)}</Text>
                )}
              </View>
            )}

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>📍 Localisation</Text>
              <Text style={styles.summaryItem}>• {form.address}</Text>
              {form.postalCode && (
                <Text style={styles.summaryItem}>• {form.postalCode} {form.city}</Text>
              )}
              {!form.postalCode && form.city && (
                <Text style={styles.summaryItem}>• {form.city}</Text>
              )}
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>📞 Contact</Text>
              <Text style={styles.summaryItem}>• Téléphone : {form.phone}</Text>
              {form.alternativePhone && (
                <Text style={styles.summaryItem}>• Téléphone alternatif : {form.alternativePhone}</Text>
              )}
            </View>

            {(form.prestationDate || form.startTime || form.duration) && (
              <View style={styles.summarySection}>
                <Text style={styles.summarySectionTitle}>📅 Planning</Text>
                {form.prestationDate && (
                  <Text style={styles.summaryItem}>
                    • Date : {availableDates.find(d => d.value === form.prestationDate)?.label}
                  </Text>
                )}
                
                {form.startTime && (
                  <Text style={styles.summaryItem}>• Heure de début : {form.startTime}</Text>
                )}
                
                {form.duration && (
                  <>
                    <Text style={styles.summaryItem}>
                      • Durée : {durations.find(d => d.value === form.duration)?.label}
                    </Text>
                    {calculatedEndTime && (
                      <Text style={styles.summaryItem}>
                        • Fin prévue : {calculatedEndTime}
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>📝 Informations complémentaires</Text>
              <Text style={styles.summaryDescription}>{form.description}</Text>
            </View>
          </ScrollView>

          <View style={styles.summaryActions}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setShowSummary(false)}
            >
              <Text style={styles.backButtonText}>Modifier</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                submitting && styles.confirmButtonDisabled
              ]}
              onPress={() => {
                setShowSummary(false);
                handleSubmit();
              }}
              disabled={submitting}
            >
              {submitting ? (
                <View style={styles.loadingButtonContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.confirmButtonText}>Création...</Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText}>✅ Valider ma commande</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modals de sélection */}
      <SelectModal
        visible={showDatePicker}
        title="Choisir une date"
        options={availableDates.map(d => ({ value: d.value, label: d.label }))}
        selectedValue={form.prestationDate}
        onSelect={(value) => {
          updateForm('prestationDate', value);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />

      <SelectModal
        visible={showStartTimePicker}
        title="Heure de début"
        options={timeSlots.map(time => ({ value: time, label: time }))}
        selectedValue={form.startTime}
        onSelect={(value) => {
          updateForm('startTime', value);
          setShowStartTimePicker(false);
        }}
        onCancel={() => setShowStartTimePicker(false)}
      />

      <SelectModal
        visible={showDurationPicker}
        title="Durée de la prestation"
        options={durations}
        selectedValue={form.duration}
        onSelect={(value) => {
          updateForm('duration', value);
          setShowDurationPicker(false);
        }}
        onCancel={() => setShowDurationPicker(false)}
      />
    </SafeAreaView>
  );
}

// ✅ STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  keyboardAvoid: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  
  headerButton: { padding: 8, marginLeft: 8 },
  
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
  
  loadingButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorActions: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  backToServicesButtonError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8,
  },
  backToServicesTextError: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  submitErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
    gap: 8,
  },
  submitErrorText: {
    flex: 1,
    fontSize: 14,
    color: '#dc2626',
    lineHeight: 20,
  },
  
  section: { marginBottom: 20, paddingHorizontal: 20 },
  row: { flexDirection: 'row', gap: 10 },
  halfWidth: { flex: 1 },
  
  keyboardSpacer: { height: 200 },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  
  backToServicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8,
    marginBottom: 8,
  },
  backToServicesText: { 
    fontSize: 14, 
    color: '#666', 
    fontWeight: '500' 
  },
  
  selectedServiceCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  selectedServiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  selectedServiceCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  selectedServiceDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 18,
  },
  
  urgencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  urgencySelector: {
    position: 'relative',
    zIndex: 1000,
  },
  urgencyOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 9998,
    backgroundColor: 'transparent',
  },
  urgencyDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  urgencyText: { fontSize: 14, fontWeight: '600', color: '#856404' },
  urgencyMenu: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
    zIndex: 9999,
    overflow: 'hidden',
    maxHeight: 200,
  },
  urgencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedUrgencyOption: { 
    backgroundColor: '#fff5f5',
    borderLeftWidth: 3,
    borderLeftColor: '#FF4444',
  },
  urgencyOptionText: { 
    fontSize: 14, 
    color: '#1f2937',
    flex: 1,
    fontWeight: '500',
  },
  selectedUrgencyText: { color: '#FF4444', fontWeight: '600' },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  currencySymbol: {
    paddingRight: 15,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    padding: 15,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: '#FF4444' },
  errorText: { color: '#FF4444', fontSize: 12, marginTop: 4 },
  
  phoneField: {
    marginBottom: 16,
  },
  
  calculatedEndTime: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  endTimeText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    padding: 15,
  },
  dropdownText: { fontSize: 16, color: '#333' },
  placeholderText: { color: '#999' },
  
  actionButtonsContainer: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  summaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    padding: 16,
    borderRadius: 8,
    justifyContent: 'center',
    gap: 8,
  },
  summaryButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#cccccc',
  },
  summaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  summaryModal: { flex: 1, backgroundColor: '#fff' },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  summaryContent: { flex: 1, padding: 20 },
  summarySection: { marginBottom: 20 },
  summarySectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  summaryItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  summaryUrgent: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  summaryActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: { color: '#666', fontWeight: '600' },
  confirmButton: {
    flex: 2,
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: { color: '#fff', fontWeight: 'bold' },
  confirmButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedModalOption: {
    backgroundColor: '#fff5f5',
    borderLeftWidth: 3,
    borderLeftColor: '#FF4444',
  },
  modalOptionText: { fontSize: 16, color: '#333', flex: 1 },
  selectedModalText: { color: '#FF4444', fontWeight: '600' },
  modalCancel: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  timeScroll: { maxHeight: 300 },
});
// app/orders/create.tsx - VERSION AVEC CALENDRIER DE SÉLECTION DE DATE + CANDIDATURES MULTIPLES (workflow_type)
// 💳 FLUX : Formulaire → Synthèse → Validation Paiement → Création Commande
// 📅 AJOUT : Calendrier identique à calendar.tsx pour sélection de date
// 🔧 CORRECTION : Fix erreur "Service non sélectionné" après paiement
// 🔧 CORRECTION : Fix erreur "Montant invalide" après paiement réussi
// ✅ NOUVEAU : Bouton candidatures multiples basé sur workflow_type
// 🔧 CORRECTION : Pas de durée par défaut
// ✅ NOUVEAU : Date du jour par défaut quand "Dès que possible" est activé
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
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { PaymentModal } from '@/components/PaymentModal';

const { width } = Dimensions.get('window');

// ✅ INTERFACES MISES À JOUR SELON STRUCTURE SUPABASE + CANDIDATURES MULTIPLES + workflow_type
interface OrderForm {
  serviceTitle: string;
  description: string;
  proposedAmount: string;
  isUrgent: boolean;
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
  // ✅ NOUVEAU CHAMP
  allowMultipleCandidates: boolean;
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
  workflow_type?: string; // ✅ NOUVEAU CHAMP
}

interface SelectOption {
  value: string;
  label: string;
}

// 📅 INTERFACES POUR LE CALENDRIER
interface CalendarDay {
  day: number;
  dateKey: string;
  isToday: boolean;
  isSelected: boolean;
  isPast: boolean;
  isDisabled: boolean;
}

// 📅 HELPERS CALENDRIER (identiques à calendar.tsx)
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  const firstDay = new Date(year, month, 1).getDay();
  return firstDay === 0 ? 6 : firstDay - 1; // Lundi = 0
};

const formatDateKey = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// ✅ HOOKS PERSONNALISÉS
const useFormValidation = () => {
  const validateField = useCallback((field: keyof OrderForm, value: any): string => {
    switch (field) {
      case 'description':
        if (value && value.trim().length > 500) return 'Description trop longue (max 500 caractères)';
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
      'proposedAmount', 'address', 'city', 'phone'
    ];
    
    // Pour les services non-urgents, la date est requise
    if (!form.isUrgent) {
      requiredFields.push('prestationDate');
    }
    
    requiredFields.forEach(field => {
      const error = validateField(field, form[field]);
      if (error) errors[field] = error;
    });
    
    // Validation de la description (facultative mais limitée à 500 caractères)
    if (form.description) {
      const error = validateField('description', form.description);
      if (error) errors.description = error;
    }
    
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

// Modal de sélection générique (pour les heures et durées)
const SelectModal: React.FC<{
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onCancel: () => void;
}> = ({ visible, title, options, selectedValue, onSelect, onCancel }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Auto-scroll vers 12:00 pour la sélection d'heure
  useEffect(() => {
    if (visible && title === "Heure de début" && scrollViewRef.current) {
      // Trouver l'index de 12:00 dans les options
      const twelveOClockIndex = options.findIndex(option => option.value === "12:00");
      
      if (twelveOClockIndex !== -1) {
        // Délai pour s'assurer que la modal est complètement rendue
        setTimeout(() => {
          if (scrollViewRef.current) {
            // Hauteur approximative d'un item (padding + bordure) = ~45px
            const itemHeight = 45;
            const scrollOffset = Math.max(0, twelveOClockIndex * itemHeight - 100); // -100 pour centrer
            
            scrollViewRef.current.scrollTo({ 
              y: scrollOffset, 
              animated: true 
            });
          }
        }, 300);
      }
    }
  }, [visible, title, options]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.timeScroll}
            showsVerticalScrollIndicator={true}
          >
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
                  <Ionicons name="checkmark" size={20} color="#000000" />
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
};

// 📅 NOUVEAU COMPOSANT CALENDRIER DE SÉLECTION
const CalendarPicker: React.FC<{
  visible: boolean;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  onCancel: () => void;
}> = ({ visible, selectedDate, onSelectDate, onCancel }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Constantes calendrier
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Navigation mois
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Construction du calendrier
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Jours vides du début
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(currentYear, currentMonth, day);
      const dayDate = new Date(currentYear, currentMonth, day);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      const isToday = currentYear === today.getFullYear() && 
                     currentMonth === today.getMonth() && 
                     day === today.getDate();
      const isSelected = selectedDate === dateKey;
      const isPast = dayDate < todayDate;
      const isDisabled = isPast;

      days.push({
        day,
        dateKey,
        isToday,
        isSelected,
        isPast,
        isDisabled,
      });
    }

    return days;
  }, [currentYear, currentMonth, selectedDate, today]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.calendarModal}>
        <View style={styles.calendarModalHeader}>
          <Text style={styles.calendarModalTitle}>Choisir une date</Text>
          <TouchableOpacity onPress={onCancel}>
            <Ionicons name="close" size={24} color="#333333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.calendarModalContent}>
          {/* Navigation mois */}
          <View style={styles.calendarPickerCard}>
            <View style={styles.calendarPickerHeader}>
              <Text style={styles.monthTitle}>
                {monthNames[currentMonth]} {currentYear}
              </Text>
              <View style={styles.calendarActions}>
                <TouchableOpacity style={styles.monthNav} onPress={goToPreviousMonth}>
                  <Ionicons name="chevron-back" size={20} color="#333333" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.monthNav} onPress={goToNextMonth}>
                  <Ionicons name="chevron-forward" size={20} color="#333333" />
                </TouchableOpacity>
              </View>
            </View>

            {/* En-têtes jours de la semaine */}
            <View style={styles.weekHeaderContainer}>
              {weekDays.map((day, index) => (
                <View key={index} style={styles.weekHeaderDay}>
                  <Text style={styles.weekHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Grille calendrier */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((dayData, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    dayData?.isToday && styles.todayDay,
                    dayData?.isSelected && styles.selectedDay,
                    dayData?.isDisabled && styles.disabledDay,
                  ]}
                  onPress={() => {
                    if (dayData && !dayData.isDisabled) {
                      onSelectDate(dayData.dateKey);
                    }
                  }}
                  disabled={!dayData || dayData.isDisabled}
                >
                  {dayData ? (
                    <Text style={[
                      styles.calendarDayText,
                      dayData.isToday && styles.todayDayText,
                      dayData.isSelected && styles.selectedDayText,
                      dayData.isDisabled && styles.disabledDayText,
                    ]}>
                      {dayData.day}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>

            {/* Boutons d'action rapide */}
            <View style={styles.quickDateActions}>
              <TouchableOpacity 
                style={styles.quickDateButton}
                onPress={() => {
                  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
                  onSelectDate(todayKey);
                }}
              >
                <Text style={styles.quickDateButtonText}>Aujourd'hui</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickDateButton}
                onPress={() => {
                  const tomorrow = new Date(today);
                  tomorrow.setDate(today.getDate() + 1);
                  const tomorrowKey = formatDateKey(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
                  onSelectDate(tomorrowKey);
                }}
              >
                <Text style={styles.quickDateButtonText}>Demain</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Affichage de la date sélectionnée */}
          {selectedDate && (
            <View style={styles.selectedDatePreview}>
              <Text style={styles.selectedDateText}>
                Date sélectionnée : {new Date(selectedDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={styles.calendarModalActions}>
          <TouchableOpacity 
            style={styles.calendarCancelButton}
            onPress={onCancel}
          >
            <Text style={styles.calendarCancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.calendarConfirmButton,
              !selectedDate && styles.calendarConfirmButtonDisabled
            ]}
            onPress={onCancel}
            disabled={!selectedDate}
          >
            <Text style={styles.calendarConfirmButtonText}>Confirmer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

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
    <Ionicons name={icon} size={16} color="#333333" />
  </TouchableOpacity>
);

// ✅ COMPOSANT PRINCIPAL
export default function CreateOrderScreen() {
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // States de base
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // 💳 ÉTATS POUR LE PAIEMENT
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentValidated, setPaymentValidated] = useState(false);
  
  // 📅 MODAL CALENDRIER (remplace showDatePicker)
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  
  // Form state avec candidatures multiples
  const [form, setForm] = useState<OrderForm>({
    serviceTitle: '',
    description: '',
    proposedAmount: '',
    isUrgent: false,
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
    startTime: '', // Reste vide - champ facultatif
    duration: '',
    pickupTime: '',
    packageNumber: '',
    equipment: '',
    needsInvoice: false,
    invoiceType: 'particulier',
    companyName: '',
    siret: '',
    // ✅ NOUVEAU CHAMP - Activé par défaut
    allowMultipleCandidates: true,
  });

  // Hooks personnalisés
  const { validateForm, validateField } = useFormValidation();

  // ✅ NOUVELLE FONCTION : Vérifier si la catégorie permet les candidatures multiples basé sur workflow_type
  const shouldShowMultipleCandidatesOption = useCallback(() => {
    if (!selectedService) return false;
    
    // Utiliser le champ workflow_type de la base de données
    return selectedService.workflow_type === 'candidatures';
  }, [selectedService]);

  // ✅ FONCTIONS UTILITAIRES

  // Générer les créneaux horaires (démarrage à 12H00)
  const timeSlots = useMemo(() => {
    const slots = [];
    const now = new Date();
    const isToday = form.prestationDate === now.toISOString().split('T')[0];
    
    // Générer toutes les heures de 12h00 à 23h45, puis de 00h00 à 11h45
    const generateSlotsForRange = (startHour: number, endHour: number) => {
      for (let hour = startHour; hour <= endHour; hour++) {
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
    };
    
    // D'abord 12h00-23h45
    generateSlotsForRange(12, 23);
    // Puis 00h00-11h45
    generateSlotsForRange(0, 11);
    
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

  // 📅 NOUVELLE FONCTION : Formater la date sélectionnée pour affichage
  const getSelectedDateLabel = useCallback(() => {
    if (!form.prestationDate) return '';
    
    const date = new Date(form.prestationDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Comparaison des dates
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isToday) return "Aujourd'hui";
    if (isTomorrow) return "Demain";
    
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }, [form.prestationDate]);

  // Calculer le surcharge d'urgence (toujours gratuit)
  const calculateUrgencySurcharge = useCallback((): string => {
    return '0.00';
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

  // ✅ MISE À JOUR DU FORMULAIRE OPTIMISÉE
  const updateForm = useCallback((key: keyof OrderForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
    
    // Supprimer l'erreur seulement si elle existe
    if (errors[key]) {
      setErrors(prev => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    }
    
    // Réinitialiser l'erreur de soumission seulement si nécessaire
    if (submitError) {
      setSubmitError(null);
    }
  }, [errors, submitError]);

  // ✅ GESTIONNAIRES DE FOCUS SIMPLIFIÉS
  const handleInputFocus = useCallback(() => {
    // Pas d'action spéciale nécessaire
  }, []);

  const handleInputBlur = useCallback(() => {
    // Pas d'action spéciale nécessaire
  }, []);

  // 📅 NOUVELLE FONCTION : Gestionnaire de sélection de date
  const handleDateSelect = useCallback((dateKey: string) => {
    updateForm('prestationDate', dateKey);
    setShowCalendarPicker(false);
  }, [updateForm]);

  // Gestion d'erreurs
  const handleError = useCallback((error: any, context: string) => {
    console.error(`❌ Erreur ${context}:`, error);
    
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

  // ✅ MISE À JOUR : Initialiser allowMultipleCandidates selon workflow_type
  useEffect(() => {
    if (!loading && selectedService) {
      const shouldShow = shouldShowMultipleCandidatesOption();
      
      setForm(prev => ({
        ...prev,
        startTime: '', // FORCE le champ heure à rester vide
        // ✅ NOUVEAU : Initialiser selon workflow_type
        allowMultipleCandidates: shouldShow ? true : false,
      }));
    }
  }, [loading, selectedService, shouldShowMultipleCandidatesOption]);

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

      // ✅ MISE À JOUR : Ajouter workflow_type à la requête
      const { data, error } = await supabase
        .from('services')
        .select('id, title, description, categorie, estimatedDuration, workflow_type')
        .eq('id', numericId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Service non trouvé');

      setSelectedService(data);
      
      setForm(prev => ({
        ...prev,
        serviceTitle: data.title,
        description: '',
        duration: '' // ✅ CORRECTION : Pas de valeur par défaut pour la durée
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
      console.error('❌ Erreur chargement utilisateur:', error);
    }
  }, []);

  // Validation pour la synthèse
  const validateFormForSummary = useCallback(() => {
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

  // 💳 NOUVELLES FONCTIONS DE PAIEMENT
  
  const handleProceedToPayment = useCallback(() => {
    // Fermer la synthèse et ouvrir la modal de paiement
    setShowSummary(false);
    setShowPaymentModal(true);
  }, []);

  // 🔧 FONCTION handlePaymentSuccess CORRIGÉE
  const handlePaymentSuccess = useCallback(async (paymentIntentId: string) => {
    setPaymentValidated(true);
    setShowPaymentModal(false);
    
    // ✅ NOUVEAU : Sauvegarder le montant validé avant d'appeler handleSubmit
    const validatedAmount = parseFloat(form.proposedAmount.replace(/[^\d.,]/g, '').replace(',', '.'));
    
    console.log('💳 Paiement réussi, montant validé:', validatedAmount);
    
    // ✅ NOUVEAU : Appeler handleSubmit avec le montant pré-validé
    await handleSubmit(true, paymentIntentId, validatedAmount);
  }, [form.proposedAmount]);

  const handlePaymentError = useCallback((error: string) => {
    console.error('❌ Erreur paiement:', error);
    setProcessingPayment(false);
    Alert.alert(
      'Erreur de paiement', 
      error,
      [
        { text: 'OK', onPress: () => setShowPaymentModal(false) }
      ]
    );
  }, []);

  // 🔧 CORRECTION CRITIQUE : SOUMISSION ADAPTÉE AVEC GESTION ROBUSTE DU SERVICE ET MONTANT + CANDIDATURES MULTIPLES
  const handleSubmit = useCallback(async (
    paymentAlreadyValidated: boolean = false, 
    paymentIntentId?: string,
    preValidatedAmount?: number  // ✅ NOUVEAU paramètre
  ) => {
    // Vérifier que le paiement a été validé (soit via l'état, soit via le paramètre)
    if (!paymentAlreadyValidated && !paymentValidated) {
      return;
    }
    
    // ✅ CORRECTION CRITIQUE : Ne pas revalider si le paiement est déjà validé
    // La validation a déjà été faite dans validateFormForSummary avant le paiement
    if (!paymentAlreadyValidated) {
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
    }
    
    // ✅ CORRECTION : Récupérer l'utilisateur si currentUser est null
    let activeUser = currentUser;
    if (!activeUser) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('❌ Impossible de récupérer l\'utilisateur:', userError);
          Alert.alert('Erreur', 'Session expirée, veuillez vous reconnecter');
          return;
        }
        activeUser = user;
        setCurrentUser(user); // Mettre à jour l'état aussi
      } catch (error) {
        console.error('❌ Erreur récupération utilisateur:', error);
        Alert.alert('Erreur', 'Impossible de vérifier votre session');
        return;
      }
    }
    
    // 🔧 CORRECTION CRITIQUE : GESTION ROBUSTE DU SERVICE SÉLECTIONNÉ
    // Récupérer le service depuis les paramètres si selectedService est null
    let activeService = selectedService;
    if (!activeService && params.serviceId) {
      try {
        const serviceId = parseInt(params.serviceId as string, 10);
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('id, title, description, categorie, estimatedDuration, workflow_type')
          .eq('id', serviceId)
          .single();
        
        if (serviceError || !serviceData) {
          console.error('❌ Impossible de récupérer le service:', serviceError);
          Alert.alert('Erreur', 'Service introuvable, veuillez recommencer la commande');
          return;
        }
        
        activeService = serviceData;
        setSelectedService(serviceData); // Mettre à jour l'état aussi
      } catch (error) {
        console.error('❌ Erreur récupération service:', error);
        Alert.alert('Erreur', 'Impossible de récupérer le service sélectionné');
        return;
      }
    }

    if (!activeService) {
      Alert.alert('Erreur', 'Service introuvable, veuillez recommencer la commande');
      return;
    }

    setSubmitting(true);
    
    try {
      // Construire l'objet addresses
      const addressesData = buildAddressesObject(form, activeService);
      
      // Données de date/heure
      let serviceDate, serviceStartTime, serviceEndTime;
      
      serviceDate = form.prestationDate || null;
      serviceStartTime = form.startTime || null;
      serviceEndTime = form.startTime && form.duration 
        ? calculateEndTime(form.startTime, form.duration) 
        : null;

      // ✅ CORRECTION : Utiliser le montant pré-validé si disponible
      let parsedAmount;
      
      if (preValidatedAmount && preValidatedAmount > 0) {
        // Utiliser le montant pré-validé du paiement
        parsedAmount = preValidatedAmount;
        console.log('💰 Utilisation montant pré-validé:', parsedAmount);
      } else {
        // Validation normale du montant
        const cleanAmount = form.proposedAmount.replace(/[^\d.,]/g, '').replace(',', '.');
        parsedAmount = parseFloat(cleanAmount);
        
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          Alert.alert('Erreur', 'Le montant saisi est invalide. Veuillez vérifier et recommencer.');
          return;
        }
        console.log('💰 Utilisation montant du formulaire:', parsedAmount);
      }

      // Données pour l'insertion directe correspondant à la structure Supabase
      const orderData = {
        // IDs et relations
        client_id: activeUser.id,
        service_id: activeService.id,
        user_id: null,
        fourmiz_id: null,
        
        // Description et montant (avec protection contre NaN)
        description: form.description || '',
        proposed_amount: parsedAmount,
        
        // Dates et horaires
        date: serviceDate,
        start_time: serviceStartTime,
        end_time: serviceEndTime,
        duration: form.duration ? parseInt(form.duration, 10) : null,
        
        // Adresses
        address: form.address,
        phone: form.phone,
        urgent: form.isUrgent,
        urgency_level: 'normal',
        invoice_required: form.needsInvoice,
        
        // Statut 
        status: 'en_attente',
        
        // 💳 PAIEMENT : Marquer comme autorisé avec horodatage
        payment_status: 'authorized',
        payment_authorized_at: new Date().toISOString(),
        
        // ✅ NOUVEAU : Candidatures multiples
        allow_multiple_candidates: form.allowMultipleCandidates,
        
        // timestamps
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
        urgency_surcharge: '0.00',
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

      console.log('📝 Données commande à insérer:', {
        service_id: orderData.service_id,
        service_title: activeService.title,
        proposed_amount: orderData.proposed_amount,
        payment_status: orderData.payment_status,
        allow_multiple_candidates: orderData.allow_multiple_candidates,
        workflow_type: activeService.workflow_type
      });

      // 🔍 DÉBOGAGE COMPLET DE L'OBJET
      console.log('🔍 OBJET COMPLET AVANT SUPABASE:', JSON.stringify(orderData, null, 2));
      console.log('🔍 CLÉS DE L\'OBJET:', Object.keys(orderData));
      console.log('🔍 RECHERCHE "nom":', Object.keys(orderData).filter(key => key.includes('nom')));
      console.log('🔍 RECHERCHE "nom" dans les valeurs:', Object.entries(orderData).filter(([key, value]) => 
        (typeof value === 'string' && value.includes('nom')) || 
        (typeof value === 'object' && value && JSON.stringify(value).includes('nom'))
      ));

      const { data: insertResult, error: insertError } = await supabase
        .from('orders')
        .insert(orderData)
        .select('id')
        .single();

      if (insertError) {
        console.error('❌ Erreur insertion Supabase:', insertError);
        throw insertError;
      }

      console.log('✅ Commande créée avec succès:', insertResult.id);

      // Traitement du parrainage client
      try {
        await supabase.rpc('process_referral_for_order', { 
          order_id_input: insertResult.id 
        });
      } catch (referralError) {
        console.error('Erreur traitement parrainage:', referralError);
        // Ne pas bloquer la création de commande pour une erreur de parrainage
      }

      Alert.alert(
        'Commande créée et paiement confirmé !',
        `Votre commande #${insertResult.id} pour "${activeService.title}" a été créée avec succès.\n\n💳 Votre paiement de ${parsedAmount.toFixed(2)}€ est confirmé.`,
        [
          { 
            text: 'Voir mes commandes', 
            onPress: () => router.replace('/(tabs)/orders') 
          }
        ]
      );

    } catch (error: any) {
      console.error('❌ Erreur création commande:', error);
      handleError(error, 'order_creation');
    } finally {
      setSubmitting(false);
      setPaymentValidated(false); // Reset pour prochaine utilisation
    }
  }, [validateForm, currentUser, selectedService, form, handleError, calculateEndTime, buildAddressesObject, paymentValidated, router, params.serviceId]);

  // ✅ GESTION DE L'ERREUR DE CHARGEMENT AVEC NAVIGATION CORRIGÉE
  if (submitError && !selectedService) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Nouvelle commande',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => router.push('/(tabs)/services-list')}
                style={styles.headerButton}
              >
                <Ionicons name="arrow-back" size={24} color="#000000" />
              </TouchableOpacity>
            ),
          }} 
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#333333" />
          <Text style={styles.errorTitle}>Oups !</Text>
          <Text style={styles.errorMessage}>{submitError}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity 
              style={styles.backToServicesButtonError}
              onPress={() => router.push('/(tabs)/services-list')}
            >
              <Ionicons name="arrow-back" size={20} color="#333333" />
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
                onPress={() => router.push('/(tabs)/services-list')}
                style={styles.headerButton}
              >
                <Ionicons name="arrow-back" size={24} color="#000000" />
              </TouchableOpacity>
            ),
          }} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
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
              onPress={() => router.push('/(tabs)/services-list')}
              style={styles.headerButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <View style={styles.container}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: null
          }}
        >
          {/* Bouton de retour visible */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.backToServicesButton}
              onPress={() => router.push('/(tabs)/services-list')}
            >
              <Ionicons name="arrow-back-circle" size={16} color="#333333" />
              <Text style={styles.backToServicesText}>Retour aux services disponibles</Text>
            </TouchableOpacity>
          </View>

          {/* Service sélectionné */}
          {selectedService && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service sélectionné</Text>
              <View style={styles.selectedServiceCard}>
                <Text style={styles.selectedServiceTitle}>{selectedService.title}</Text>
                {selectedService.description && (
                  <Text style={styles.selectedServiceDescription}>
                    {selectedService.description}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Montant proposé */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Montant proposé *</Text>
            <View style={[styles.inputContainer, errors.proposedAmount && styles.inputError]}>
              <TextInput 
                style={styles.inputWithCurrency}
                placeholder="Montant que vous proposez"
                placeholderTextColor="#999999"
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
            <Text style={styles.sectionTitle}>Informations complémentaires</Text>
            <TextInput 
              style={[styles.textArea, errors.description && styles.inputError]}
              placeholder="Donnez des informations complémentaires si vous le souhaitez..."
              placeholderTextColor="#999999"
              value={form.description}
              onChangeText={(text) => updateForm('description', text)}
              multiline
              numberOfLines={3}
              returnKeyType="done"
              textAlignVertical="top"
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Adresse */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse *</Text>
            <TextInput 
              style={[styles.input, errors.address && styles.inputError]}
              placeholder="Adresse complète (rue, numéro)"
              placeholderTextColor="#999999"
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
                  placeholderTextColor="#999999"
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
                  placeholderTextColor="#999999"
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
            <Text style={styles.sectionTitle}>Contact</Text>
            
            <View style={styles.phoneField}>
              <Text style={styles.subSectionTitle}>Téléphone principal *</Text>
              <TextInput 
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="06 12 34 56 78"
                placeholderTextColor="#999999"
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
              <Text style={styles.subSectionTitle}>Téléphone autre (facultatif)</Text>
              <TextInput 
                style={styles.input}
                placeholder="06 98 76 54 32"
                placeholderTextColor="#999999"
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

          {/* ✅ NOUVEAU : Candidatures multiples basé sur workflow_type */}
          {shouldShowMultipleCandidatesOption() && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Candidatures</Text>
              
              <View style={styles.multipleCandidatesField}>
                <View style={styles.multipleCandidatesContent}>
                  <Text style={styles.multipleCandidatesText}>Je souhaite recevoir plusieurs candidatures</Text>
                  <Text style={styles.multipleCandidatesSubtext}>
                    Recevez plusieurs propositions pour comparer les profils
                  </Text>
                </View>
                <Switch
                  value={form.allowMultipleCandidates}
                  onValueChange={(value) => updateForm('allowMultipleCandidates', value)}
                  trackColor={{ false: '#e0e0e0', true: '#000000' }}
                  style={styles.multipleCandidatesSwitch}
                />
              </View>
              
              {!form.allowMultipleCandidates && (
                <View style={styles.multipleCandidatesNote}>
                  <Ionicons name="information-circle" size={14} color="#333333" />
                  <Text style={styles.multipleCandidatesNoteText}>
                    Seule la première Fourmiz qui acceptera votre mission sera retenue
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Date de prestation AVEC CALENDRIER */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Date de prestation{!form.isUrgent ? ' *' : ' (facultative)'}
            </Text>
            
            {/* Champ "Dès que possible" */}
            <View style={styles.urgentDropdownField}>
              <Text style={styles.urgentDropdownText}>Dès que possible</Text>
              <Switch
                value={form.isUrgent}
                onValueChange={(value) => {
                  updateForm('isUrgent', value);
                  // ✅ NOUVEAU : Mettre la date du jour par défaut quand "Dès que possible" est activé
                  if (value && !form.prestationDate) {
                    const today = new Date();
                    const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
                    updateForm('prestationDate', todayKey);
                  }
                }}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                style={styles.urgentSwitch}
              />
            </View>
            
            {form.isUrgent && (
              <View style={styles.urgencyNote}>
                <Ionicons name="information-circle" size={14} color="#333333" />
                <Text style={styles.urgencyNoteText}>
                  Service dès que possible : aucun frais supplémentaire
                </Text>
              </View>
            )}
            
            {/* 📅 NOUVEAU : Bouton calendrier au lieu du dropdown */}
            <DropdownButton
              value={form.prestationDate ? getSelectedDateLabel() : undefined}
              placeholder={form.isUrgent ? "Choisir une date (facultatif)" : "Choisir une date"}
              onPress={() => setShowCalendarPicker(true)}
              icon="calendar"
              error={!form.isUrgent && !!errors.prestationDate}
            />
            {!form.isUrgent && errors.prestationDate && <Text style={styles.errorText}>{errors.prestationDate}</Text>}
          </View>

          {/* Planning */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Planning</Text>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.subSectionTitle}>Heure (facultative)</Text>
                <DropdownButton
                  value={form.startTime}
                  placeholder="Choisir"
                  onPress={() => setShowStartTimePicker(true)}
                  icon="time"
                />
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.subSectionTitle}>Durée (facultative)</Text>
                <DropdownButton
                  value={form.duration ? durations.find(d => d.value === form.duration)?.label : undefined}
                  placeholder="Choisir"
                  onPress={() => setShowDurationPicker(true)}
                  icon="timer"
                />
              </View>
            </View>

            {calculatedEndTime && form.startTime && form.duration && (
              <View style={styles.calculatedEndTime}>
                <Text style={styles.endTimeText}>
                  Fin prévue : {calculatedEndTime}
                </Text>
              </View>
            )}
          </View>

          {/* Erreur de soumission */}
          {submitError && (
            <View style={styles.section}>
              <View style={styles.submitErrorContainer}>
                <Ionicons name="alert-circle" size={16} color="#333333" />
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
              <Ionicons name="document-text" size={16} color="#fff" />
              <Text style={styles.summaryButtonText}>
                {submitting ? 'Traitement...' : 'Voir la synthèse'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyboardSpacer} />
        </ScrollView>
      </View>

      {/* MODAL SYNTHÈSE AVEC BOUTON PAIEMENT */}
      <Modal visible={showSummary} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.summaryModal}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Synthèse de la commande</Text>
            <TouchableOpacity onPress={() => setShowSummary(false)}>
              <Ionicons name="close" size={24} color="#333333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.summaryContent}>
            {selectedService && (
              <View style={styles.summarySection}>
                <Text style={styles.summarySectionTitle}>Service</Text>
                <Text style={styles.summaryItem}>• {selectedService.title}</Text>
                <Text style={styles.summaryItem}>• Montant proposé : {form.proposedAmount}€</Text>
                {form.isUrgent && (
                  <Text style={styles.summaryUrgent}>• Dès que possible (gratuit)</Text>
                )}
                {/* ✅ NOUVEAU */}
                {shouldShowMultipleCandidatesOption() && (
                  <Text style={styles.summaryItem}>
                    • Candidatures multiples : {form.allowMultipleCandidates ? 'Oui' : 'Non'}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Localisation</Text>
              <Text style={styles.summaryItem}>• {form.address}</Text>
              {form.postalCode && (
                <Text style={styles.summaryItem}>• {form.postalCode} {form.city}</Text>
              )}
              {!form.postalCode && form.city && (
                <Text style={styles.summaryItem}>• {form.city}</Text>
              )}
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Contact</Text>
              <Text style={styles.summaryItem}>• Téléphone : {form.phone}</Text>
              {form.alternativePhone && (
                <Text style={styles.summaryItem}>• Téléphone alternatif : {form.alternativePhone}</Text>
              )}
            </View>

            {(form.prestationDate || form.startTime || form.duration || form.isUrgent) && (
              <View style={styles.summarySection}>
                <Text style={styles.summarySectionTitle}>Planning</Text>
                
                {form.isUrgent && (
                  <Text style={styles.summaryUrgent}>
                    • Service dès que possible
                  </Text>
                )}
                
                {form.prestationDate && (
                  <Text style={styles.summaryItem}>
                    • Date souhaitée : {getSelectedDateLabel()}
                  </Text>
                )}
                
                {form.startTime && (
                  <Text style={styles.summaryItem}>• Heure de début souhaitée : {form.startTime}</Text>
                )}
                
                {form.duration && (
                  <>
                    <Text style={styles.summaryItem}>
                      • Durée estimée : {durations.find(d => d.value === form.duration)?.label}
                    </Text>
                    {calculatedEndTime && form.startTime && (
                      <Text style={styles.summaryItem}>
                        • Heure de fin estimée : {calculatedEndTime}
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}

            {form.description && (
              <View style={styles.summarySection}>
                <Text style={styles.summarySectionTitle}>Informations complémentaires</Text>
                <Text style={styles.summaryDescription}>{form.description}</Text>
              </View>
            )}

            {/* SECTION PAIEMENT */}
            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Paiement</Text>
              <Text style={styles.summaryItem}>• Montant à autoriser : {form.proposedAmount}€</Text>
              <Text style={styles.summaryPaymentNote}>
                Le paiement sera autorisé maintenant et débité automatiquement dès qu'une Fourmiz acceptera votre mission.
              </Text>
            </View>
          </ScrollView>

          {/* ACTIONS AVEC BOUTON PAIEMENT */}
          <View style={styles.summaryActions}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setShowSummary(false)}
            >
              <Text style={styles.backButtonText}>Modifier</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.paymentButton,
                (submitting || processingPayment) && styles.paymentButtonDisabled
              ]}
              onPress={handleProceedToPayment}
              disabled={submitting || processingPayment}
            >
              <Ionicons name="card" size={16} color="#fff" />
              <Text style={styles.paymentButtonText}>
                Autoriser le paiement
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL DE PAIEMENT STRIPE */}
      {selectedService && (
        <PaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          order={{
            id: 0,
            service_title: selectedService.title,
            proposed_amount: parseFloat(form.proposedAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            description: form.description,
            date: form.prestationDate,
            address: form.address,
            city: form.city
          }}
          loading={processingPayment}
        />
      )}

      {/* 📅 NOUVEAU : Modal Calendrier (remplace la modal de sélection de date) */}
      <CalendarPicker
        visible={showCalendarPicker}
        selectedDate={form.prestationDate}
        onSelectDate={handleDateSelect}
        onCancel={() => setShowCalendarPicker(false)}
      />

      {/* Modals de sélection pour heures et durées */}
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

// 🎨 STYLES AVEC AJOUTS POUR LE CALENDRIER ET CANDIDATURES MULTIPLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollView: { flex: 1 },
  scrollContent: { 
    paddingBottom: Platform.OS === 'ios' ? 200 : 150,
    flexGrow: 1 
  },
  
  headerButton: { padding: 6, marginLeft: 8 },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { 
    fontSize: 13, 
    color: '#333333',
    fontWeight: '400'
  },
  
  loadingButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  errorMessage: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorActions: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  backToServicesButtonError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  backToServicesTextError: {
    color: '#333333',
    fontSize: 13,
    fontWeight: '500',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  
  submitErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#333333',
    gap: 8,
  },
  submitErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
  },
  
  section: { 
    marginBottom: 16, 
    paddingHorizontal: 20 
  },
  row: { 
    flexDirection: 'row', 
    gap: 12 
  },
  halfWidth: { flex: 1 },
  
  keyboardSpacer: { height: 120 },
  
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 6,
  },
  
  backToServicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
    marginBottom: 8,
  },
  backToServicesText: { 
    fontSize: 12, 
    color: '#666666', 
    fontWeight: '400' 
  },
  
  selectedServiceCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 6,
    borderWidth: 0,
  },
  selectedServiceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  selectedServiceDescription: {
    fontSize: 12,
    color: '#333333',
    lineHeight: 16,
  },
  
  urgentDropdownField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 10,
  },
  urgentDropdownText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
  },
  urgentSwitch: {
    transform: [{ scale: 0.8 }],
  },
  urgencyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    gap: 6,
  },
  urgencyNoteText: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
  },
  
  // ✅ NOUVEAUX STYLES POUR CANDIDATURES MULTIPLES
  multipleCandidatesField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 10,
  },
  multipleCandidatesContent: {
    flex: 1,
    marginRight: 12,
  },
  multipleCandidatesText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '500',
    marginBottom: 2,
  },
  multipleCandidatesSubtext: {
    fontSize: 11,
    color: '#666666',
    lineHeight: 14,
  },
  multipleCandidatesSwitch: {
    transform: [{ scale: 0.8 }],
  },
  multipleCandidatesNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    gap: 6,
  },
  multipleCandidatesNoteText: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  inputWithCurrency: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#000000',
    textAlignVertical: 'center',
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    textAlignVertical: 'center',
  },
  currencySymbol: {
    paddingRight: 12,
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    padding: 12,
    fontSize: 13,
    color: '#000000',
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  inputError: { 
    borderColor: '#333333',
    borderWidth: 2,
  },
  errorText: { 
    color: '#333333', 
    fontSize: 12, 
    marginTop: 4,
    fontWeight: '500',
  },
  
  phoneField: {
    marginBottom: 12,
  },
  
  calculatedEndTime: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  endTimeText: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    padding: 12,
    minHeight: 40,
  },
  dropdownText: { 
    fontSize: 13, 
    color: '#000000',
    fontWeight: '400',
  },
  placeholderText: { 
    color: '#999999' 
  },
  
  actionButtonsContainer: {
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  summaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#40E0D0',
    padding: 14,
    borderRadius: 6,
    justifyContent: 'center',
    gap: 8,
  },
  summaryButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#999999',
  },
  summaryButtonText: { 
    color: '#ffffff', 
    fontSize: 13, 
    fontWeight: '600' 
  },
  
  summaryModal: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryTitle: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#000000' 
  },
  summaryContent: { 
    flex: 1, 
    padding: 16 
  },
  summarySection: { 
    marginBottom: 16 
  },
  summarySectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  summaryItem: {
    fontSize: 12,
    color: '#333333',
    marginBottom: 4,
    lineHeight: 16,
  },
  summaryUrgent: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryDescription: {
    fontSize: 12,
    color: '#333333',
    lineHeight: 16,
  },
  summaryPaymentNote: {
    fontSize: 11,
    color: '#666666',
    fontStyle: 'italic',
    lineHeight: 15,
    marginTop: 4,
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
  summaryActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  backButtonText: { 
    color: '#333333', 
    fontSize: 13,
    fontWeight: '500' 
  },
  paymentButton: {
    flex: 2,
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paymentButtonText: { 
    color: '#ffffff', 
    fontSize: 13,
    fontWeight: '600' 
  },
  paymentButtonDisabled: {
    backgroundColor: '#999999',
    opacity: 0.6,
  },

  // 📅 STYLES CALENDRIER (identiques à calendar.tsx mais adaptés pour modal)
  calendarModal: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  calendarModalTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  calendarModalContent: {
    flex: 1,
    padding: 16,
  },
  calendarModalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  calendarCancelButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  calendarCancelButtonText: {
    color: '#333333',
    fontSize: 13,
    fontWeight: '500',
  },
  calendarConfirmButton: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  calendarConfirmButtonDisabled: {
    backgroundColor: '#999999',
    opacity: 0.6,
  },
  calendarConfirmButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Carte calendrier
  calendarPickerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  calendarPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  calendarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  monthNav: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f8f8',
  },

  // En-têtes jours de la semaine
  weekHeaderContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekHeaderDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekHeaderText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '600',
  },

  // Grille calendrier
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  calendarDay: {
    width: `${100/7}%`,
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  todayDay: {
    backgroundColor: '#e8f4fd',
    borderRadius: 6,
  },
  selectedDay: {
    backgroundColor: '#000000',
    borderRadius: 6,
  },
  disabledDay: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  todayDayText: {
    color: '#2196F3',
  },
  selectedDayText: {
    color: '#ffffff',
  },
  disabledDayText: {
    color: '#cccccc',
  },

  // Actions rapides
  quickDateActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  quickDateButton: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickDateButtonText: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
  },

  // Aperçu date sélectionnée
  selectedDatePreview: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  selectedDateText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Modal de sélection générique (pour heures/durées)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedModalOption: {
    backgroundColor: '#f5f5f5',
  },
  modalOptionText: { 
    fontSize: 13, 
    color: '#000000', 
    flex: 1,
    fontWeight: '400',
  },
  selectedModalText: { 
    color: '#000000', 
    fontWeight: '600' 
  },
  modalCancel: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalCancelText: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '500',
  },
  timeScroll: { 
    maxHeight: 250 
  },
});
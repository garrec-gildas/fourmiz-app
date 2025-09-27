// app/orders/create.tsx - VERSION COMPLÈTE AVEC TOUTES LES FONCTIONNALITÉS
// 💳 FLUX : Formulaire → Synthèse → Pré-autorisation Paiement → Création Commande
// 📅 AJOUT : Calendrier identique à calendar.tsx pour sélection de date
// 🔧 CORRECTION : Upload photos basé sur complete-profile.tsx qui fonctionne
// 📸 NOUVEAU : Intégration photos avec upload Supabase fonctionnel
// ✅ NOUVEAU : Candidatures multiples basées sur workflow_type
// 💳 NOUVEAU : Système de pré-autorisation avec capture différée
// 🚀 OPTIMISÉ : Performances, gestion d'erreurs, validation améliorée
// 🛡️ TOUTES LES FONCTIONNALITÉS CONSERVÉES

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
  Image,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// Import supabase
import { supabase } from '../../lib/supabase';
// Import PaymentModal
import { PaymentModal } from '../../components/PaymentModal';

// Types pour les photos
interface PhotoData {
  id: string;
  uri: string;
  name?: string;
  type?: string;
  size?: number;
}

const { width } = Dimensions.get('window');

// 📸 FONCTIONS D'UPLOAD COMPLÈTES - Basées sur complete-profile.tsx qui fonctionne
const convertToUint8Array = async (uri: string): Promise<Uint8Array> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  } catch (error) {
    throw new Error(`Conversion échouée: ${(error as Error).message}`);
  }
};

const uploadPhotoToSupabase = async (photo: PhotoData, userId: string): Promise<string> => {
  try {
    const uint8ArrayData = await convertToUint8Array(photo.uri);
    
    const timestamp = Date.now();
    const fileName = `photo-${timestamp}.jpg`;
    const filePath = `${userId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('order-photos')
      .upload(filePath, uint8ArrayData, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
        metadata: {
          userId,
          uploadedAt: new Date().toISOString(),
          originalName: photo.name || fileName,
          uploadMethod: 'uint8Array-rn'
        }
      });

    if (error) {
      console.error('❌ Erreur upload Supabase:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('order-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('❌ Erreur upload photo:', error);
    throw error;
  }
};

const uploadAllPhotos = async (photos: PhotoData[], userId: string): Promise<string[]> => {
  if (photos.length === 0) return [];
  
  const uploadPromises = photos.map(photo => uploadPhotoToSupabase(photo, userId));
  
  try {
    const results = await Promise.allSettled(uploadPromises);
    const successfulUploads: string[] = [];
    const errors: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulUploads.push(result.value);
      } else {
        errors.push(`Photo ${index + 1}: ${result.reason.message}`);
      }
    });
    
    if (errors.length > 0) {
      console.warn('⚠️ Certaines photos ont échoué:', errors);
    }
    
    return successfulUploads;
  } catch (error) {
    console.error('❌ Erreur upload multiple:', error);
    throw error;
  }
};

// 📸 COMPOSANT PhotoSection COMPLET ET INTÉGRÉ
const PhotoSection: React.FC<{
  photos: PhotoData[];
  onPhotosChange: (photos: PhotoData[]) => void;
  maxPhotos: number;
}> = React.memo(({ photos, onPhotosChange, maxPhotos }) => {
  const [loading, setLoading] = useState(false);

  const requestPermissions = useCallback(async () => {
    const [cameraPermission, mediaPermission] = await Promise.all([
      ImagePicker.requestCameraPermissionsAsync(),
      ImagePicker.requestMediaLibraryPermissionsAsync()
    ]);
    
    return {
      camera: cameraPermission.granted,
      media: mediaPermission.granted
    };
  }, []);

  const takePhoto = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const permissions = await requestPermissions();
      
      if (!permissions.camera) {
        Alert.alert(
          'Permission requise',
          'L\'accès à l\'appareil photo est nécessaire pour prendre des photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        const newPhoto: PhotoData = {
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          name: `photo-${Date.now()}.jpg`,
          type: 'image/jpeg',
          size: result.assets[0].fileSize,
        };
        
        onPhotosChange([...photos, newPhoto]);
      }
    } catch (error) {
      console.error('❌ Erreur prise photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    } finally {
      setLoading(false);
    }
  }, [photos, onPhotosChange, requestPermissions, loading]);

  const pickFromGallery = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const permissions = await requestPermissions();
      
      if (!permissions.media) {
        Alert.alert(
          'Permission requise',
          'L\'accès à la galerie est nécessaire pour sélectionner des photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
        allowsMultipleSelection: true,
        selectionLimit: maxPhotos - photos.length,
      });

      if (!result.canceled && result.assets) {
        const newPhotos: PhotoData[] = result.assets.map((asset, index) => ({
          id: (Date.now() + index).toString(),
          uri: asset.uri,
          name: `photo-${Date.now() + index}.jpg`,
          type: 'image/jpeg',
          size: asset.fileSize,
        }));
        
        const updatedPhotos = [...photos, ...newPhotos].slice(0, maxPhotos);
        onPhotosChange(updatedPhotos);
      }
    } catch (error) {
      console.error('❌ Erreur sélection galerie:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner les photos');
    } finally {
      setLoading(false);
    }
  }, [photos, onPhotosChange, maxPhotos, requestPermissions, loading]);

  const showPhotoOptions = useCallback(() => {
    if (loading) return;
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Prendre une photo', 'Choisir dans la galerie'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickFromGallery();
          }
        }
      );
    } else {
      Alert.alert(
        'Ajouter une photo',
        'Choisissez une option',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Prendre une photo', onPress: takePhoto },
          { text: 'Galerie', onPress: pickFromGallery },
        ]
      );
    }
  }, [takePhoto, pickFromGallery, loading]);

  const removePhoto = useCallback((photoId: string) => {
    const updatedPhotos = photos.filter(photo => photo.id !== photoId);
    onPhotosChange(updatedPhotos);
  }, [photos, onPhotosChange]);

  const canAddPhotos = photos.length < maxPhotos;

  return (
    <View style={photoStyles.container}>
      <Text style={photoStyles.title}>
        Photos ({photos.length}/{maxPhotos})
      </Text>
      <Text style={photoStyles.subtitle}>
        Ajoutez des photos pour illustrer votre demande (facultatif)
      </Text>
      
      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={photoStyles.photosList}
        >
          {photos.map((photo) => (
            <View key={photo.id} style={photoStyles.photoContainer}>
              <Image source={{ uri: photo.uri }} style={photoStyles.photoThumbnail} />
              <TouchableOpacity
                style={photoStyles.removeButton}
                onPress={() => removePhoto(photo.id)}
              >
                <Ionicons name="close-circle" size={20} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {canAddPhotos && (
        <TouchableOpacity
          style={[
            photoStyles.addButton,
            loading && photoStyles.addButtonDisabled
          ]}
          onPress={showPhotoOptions}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Ionicons name="camera" size={20} color="#ffffff" />
          )}
          <Text style={photoStyles.addButtonText}>
            {loading ? 'Chargement...' : 'Ajouter une photo'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// 📸 COMPOSANT PhotoSummary COMPLET INLINE
const PhotoSummary: React.FC<{photos: PhotoData[]}> = React.memo(({ photos }) => {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  if (photos.length === 0) return null;

  const openViewer = useCallback((index: number) => {
    setSelectedPhotoIndex(index);
    setViewerVisible(true);
  }, []);

  const navigatePhoto = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedPhotoIndex(prev => prev > 0 ? prev - 1 : photos.length - 1);
    } else {
      setSelectedPhotoIndex(prev => prev < photos.length - 1 ? prev + 1 : 0);
    }
  }, [photos.length]);

  const closeViewer = useCallback(() => {
    setViewerVisible(false);
  }, []);

  return (
    <View style={photoSummaryStyles.container}>
      <Text style={photoSummaryStyles.title}>
        Photos jointes ({photos.length})
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={photoSummaryStyles.scrollContent}
      >
        {photos.map((photo, index) => (
          <TouchableOpacity
            key={photo.id}
            style={photoSummaryStyles.thumbnail}
            onPress={() => openViewer(index)}
          >
            <Image
              source={{ uri: photo.uri }}
              style={photoSummaryStyles.thumbnailImage}
              resizeMode="cover"
            />
            <View style={photoSummaryStyles.thumbnailOverlay}>
              <Ionicons name="eye" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
      >
        <View style={photoSummaryStyles.viewerContainer}>
          <TouchableOpacity
            style={photoSummaryStyles.closeButton}
            onPress={closeViewer}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>

          {photos.length > 1 && (
            <>
              <TouchableOpacity
                style={[photoSummaryStyles.navButton, photoSummaryStyles.prevButton]}
                onPress={() => navigatePhoto('prev')}
              >
                <Ionicons name="chevron-back" size={24} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[photoSummaryStyles.navButton, photoSummaryStyles.nextButton]}
                onPress={() => navigatePhoto('next')}
              >
                <Ionicons name="chevron-forward" size={24} color="#ffffff" />
              </TouchableOpacity>
            </>
          )}

          <Image
            source={{ uri: photos[selectedPhotoIndex]?.uri }}
            style={photoSummaryStyles.fullImage}
            resizeMode="contain"
          />

          {photos.length > 1 && (
            <View style={photoSummaryStyles.indicator}>
              <Text style={photoSummaryStyles.indicatorText}>
                {selectedPhotoIndex + 1} / {photos.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
});

// ✅ INTERFACES COMPLÈTES - TOUS LES CHAMPS CONSERVÉS
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
  // 🚚 CHAMPS LIVRAISON/TRANSPORT CONSERVÉS
  pickupAddress: string;
  deliveryAddress: string;
  arrivalAddress: string;
  arrivalPostalCode: string;
  arrivalCity: string;
  prestationDate: string;
  departureTime: string;
  startTime: string;
  duration: string;
  // 📦 CHAMPS COLIS CONSERVÉS  
  pickupTime: string;
  packageNumber: string;
  // 🔧 CHAMPS ÉQUIPEMENT CONSERVÉS
  equipment: string;
  // 📄 CHAMPS FACTURATION CONSERVÉS
  needsInvoice: boolean;
  invoiceType: 'particulier' | 'entreprise';
  companyName: string;
  siret: string;
  // ✅ NOUVEAUX CHAMPS
  allowMultipleCandidates: boolean;
  photos: PhotoData[];
}

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
  workflow_type?: string;
}

interface SelectOption {
  value: string;
  label: string;
}

interface CalendarDay {
  day: number;
  dateKey: string;
  isToday: boolean;
  isSelected: boolean;
  isPast: boolean;
  isDisabled: boolean;
}

// 📅 HELPERS CALENDRIER
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  const firstDay = new Date(year, month, 1).getDay();
  return firstDay === 0 ? 6 : firstDay - 1;
};

const formatDateKey = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// ✅ HOOKS PERSONNALISÉS COMPLETS
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
        if (amount < 5) return 'Montant minimum : 5€ (requis par Stripe)';
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
        
      // 📄 VALIDATION FACTURATION
      case 'companyName':
        if (value && value.trim().length < 2) return 'Nom d\'entreprise trop court';
        break;
        
      case 'siret':
        if (value && !/^\d{14}$/.test(value.replace(/\s/g, ''))) {
          return 'SIRET invalide (14 chiffres requis)';
        }
        break;
    }
    return '';
  }, []);

  const validateForm = useCallback((form: OrderForm): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    
    const requiredFields: (keyof OrderForm)[] = [
      'proposedAmount', 'address', 'city', 'phone'
    ];
    
    if (!form.isUrgent) {
      requiredFields.push('prestationDate');
    }
    
    // 📄 VALIDATION FACTURATION CONDITIONNELLE
    if (form.needsInvoice && form.invoiceType === 'entreprise') {
      if (!form.companyName?.trim()) {
        errors.companyName = 'Nom d\'entreprise requis pour la facturation';
      }
      if (!form.siret?.trim()) {
        errors.siret = 'SIRET requis pour la facturation entreprise';
      }
    }
    
    requiredFields.forEach(field => {
      const error = validateField(field, form[field]);
      if (error) errors[field] = error;
    });
    
    // Validations conditionnelles
    if (form.description) {
      const error = validateField('description', form.description);
      if (error) errors.description = error;
    }
    
    if (form.postalCode) {
      const error = validateField('postalCode', form.postalCode);
      if (error) errors.postalCode = error;
    }
    
    if (form.companyName) {
      const error = validateField('companyName', form.companyName);
      if (error) errors.companyName = error;
    }
    
    if (form.siret) {
      const error = validateField('siret', form.siret);
      if (error) errors.siret = error;
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [validateField]);

  return { validateForm, validateField };
};

// ✅ COMPOSANTS RÉUTILISABLES
const SelectModal: React.FC<{
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onCancel: () => void;
}> = React.memo(({ visible, title, options, selectedValue, onSelect, onCancel }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  
  useEffect(() => {
    if (visible && title === "Heure de début" && scrollViewRef.current) {
      const twelveOClockIndex = options.findIndex(option => option.value === "12:00");
      
      if (twelveOClockIndex !== -1) {
        setTimeout(() => {
          if (scrollViewRef.current) {
            const itemHeight = 45;
            const scrollOffset = Math.max(0, twelveOClockIndex * itemHeight - 100);
            
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
});

// 📅 COMPOSANT CALENDRIER COMPLET
const CalendarPicker: React.FC<{
  visible: boolean;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  onCancel: () => void;
}> = React.memo(({ visible, selectedDate, onSelectDate, onCancel }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const goToPreviousMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }, [currentMonth, currentYear]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }, [currentMonth, currentYear]);

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

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

  const selectToday = useCallback(() => {
    const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    onSelectDate(todayKey);
  }, [onSelectDate, today]);

  const selectTomorrow = useCallback(() => {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowKey = formatDateKey(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    onSelectDate(tomorrowKey);
  }, [onSelectDate, today]);

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

            <View style={styles.weekHeaderContainer}>
              {weekDays.map((day, index) => (
                <View key={index} style={styles.weekHeaderDay}>
                  <Text style={styles.weekHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

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

            <View style={styles.quickDateActions}>
              <TouchableOpacity style={styles.quickDateButton} onPress={selectToday}>
                <Text style={styles.quickDateButtonText}>Aujourd'hui</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickDateButton} onPress={selectTomorrow}>
                <Text style={styles.quickDateButtonText}>Demain</Text>
              </TouchableOpacity>
            </View>
          </View>

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

        <View style={styles.calendarModalActions}>
          <TouchableOpacity style={styles.calendarCancelButton} onPress={onCancel}>
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
});

const DropdownButton: React.FC<{
  value?: string;
  placeholder: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: boolean;
}> = React.memo(({ value, placeholder, onPress, icon = "chevron-down", error = false }) => (
  <TouchableOpacity
    style={[styles.dropdownButton, error && styles.inputError]}
    onPress={onPress}
  >
    <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
      {value || placeholder}
    </Text>
    <Ionicons name={icon} size={16} color="#333333" />
  </TouchableOpacity>
));

// ✅ COMPOSANT PRINCIPAL
export default function CreateOrderScreen() {
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // States consolidés
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // États paiement
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentValidated, setPaymentValidated] = useState(false);
  
  // États modales
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  
  // FORMULAIRE COMPLET - TOUS LES CHAMPS CONSERVÉS
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
    // 🚚 CHAMPS LIVRAISON/TRANSPORT
    pickupAddress: '',
    deliveryAddress: '',
    arrivalAddress: '',
    arrivalPostalCode: '',
    arrivalCity: '',
    prestationDate: '',
    departureTime: '',
    startTime: '',
    duration: '',
    // 📦 CHAMPS COLIS
    pickupTime: '',
    packageNumber: '',
    // 🔧 CHAMPS ÉQUIPEMENT
    equipment: '',
    // 📄 CHAMPS FACTURATION
    needsInvoice: false,
    invoiceType: 'particulier',
    companyName: '',
    siret: '',
    // ✅ NOUVEAUX CHAMPS
    allowMultipleCandidates: true,
    photos: [],
  });

  const { validateForm, validateField } = useFormValidation();

  // 🚀 OPTIMISATIONS
  const shouldShowMultipleCandidatesOption = useMemo(() => {
    return selectedService?.workflow_type === 'candidatures';
  }, [selectedService?.workflow_type]);

  const timeSlots = useMemo(() => {
    const slots = [];
    const now = new Date();
    const isToday = form.prestationDate === now.toISOString().split('T')[0];
    
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
    
    generateSlotsForRange(12, 23);
    generateSlotsForRange(0, 11);
    
    return slots;
  }, [form.prestationDate]);

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

  const calculatedEndTime = useMemo(() => {
    if (!form.startTime || !form.duration) return '';
    
    try {
      const [hours, minutes] = form.startTime.split(':').map(Number);
      const duration = parseInt(form.duration);
      
      const totalMinutes = hours * 60 + minutes + duration;
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;
      
      return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('❌ Erreur calcul heure fin:', error);
      return '';
    }
  }, [form.startTime, form.duration]);

  const getSelectedDateLabel = useCallback(() => {
    if (!form.prestationDate) return '';
    
    const date = new Date(form.prestationDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
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

  // 🚀 GESTIONNAIRES
  const updateForm = useCallback((key: keyof OrderForm, value: string | boolean | PhotoData[]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    
    if (errors[key]) {
      setErrors(prev => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    }
    
    if (submitError) {
      setSubmitError(null);
    }
  }, [errors, submitError]);

  const handlePhotosChange = useCallback((photos: PhotoData[]) => {
    setForm(prev => ({ ...prev, photos }));
  }, []);

  const handleDateSelect = useCallback((dateKey: string) => {
    updateForm('prestationDate', dateKey);
    setShowCalendarPicker(false);
  }, [updateForm]);

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

  // 💳 GESTION PAIEMENT
  const handleProceedToPayment = useCallback(() => {
    setShowSummary(false);
    setShowPaymentModal(true);
  }, []);

  const handlePaymentSuccess = useCallback(async (paymentIntentId: string) => {
    setPaymentValidated(true);
    setShowPaymentModal(false);
    
    const validatedAmount = parseFloat(form.proposedAmount.replace(/[^\d.,]/g, '').replace(',', '.'));
    console.log('💳 Pré-autorisation réussie, montant validé:', validatedAmount);
    
    await handleSubmit(true, paymentIntentId, validatedAmount);
  }, [form.proposedAmount]);

  const handlePaymentError = useCallback((error: string) => {
    console.error('❌ Erreur pré-autorisation:', error);
    setProcessingPayment(false);
    
    let userMessage = error;
    let actions = [{ text: 'Annuler', onPress: () => setShowPaymentModal(false) }];
    
    if (error.includes('card_declined')) {
      userMessage = 'Carte refusée. Vérifiez vos informations ou utilisez une autre carte.';
      actions = [
        { text: 'Réessayer', onPress: () => setShowPaymentModal(true) },
        { text: 'Annuler', onPress: () => setShowPaymentModal(false) }
      ];
    } else if (error.includes('insufficient_funds')) {
      userMessage = 'Fonds insuffisants sur votre carte.';
    } else if (error.includes('authentication_required')) {
      userMessage = 'Authentification 3D Secure requise. Veuillez réessayer.';
      actions = [
        { text: 'Réessayer', onPress: () => setShowPaymentModal(true) },
        { text: 'Annuler', onPress: () => setShowPaymentModal(false) }
      ];
    }
    
    Alert.alert('Erreur de pré-autorisation', userMessage, actions);
  }, []);

  // 🚀 CHARGEMENT
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
        duration: ''
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

  // 🚀 SOUMISSION COMPLÈTE
  const handleSubmit = useCallback(async (
    paymentAlreadyValidated: boolean = false, 
    paymentIntentId?: string,
    preValidatedAmount?: number
  ) => {
    if (!paymentAlreadyValidated && !paymentValidated) {
      return;
    }
    
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
        setCurrentUser(user);
      } catch (error) {
        console.error('❌ Erreur récupération utilisateur:', error);
        Alert.alert('Erreur', 'Impossible de vérifier votre session');
        return;
      }
    }
    
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
        setSelectedService(serviceData);
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
      let photoUrls: string[] = [];
      
      if (form.photos.length > 0) {
        try {
          console.log(`📸 Upload de ${form.photos.length} photos...`);
          photoUrls = await uploadAllPhotos(form.photos, activeUser.id);
          console.log(`✅ Photos uploadées: ${photoUrls.length}/${form.photos.length}`);
        } catch (photoError) {
          console.error('❌ Erreur upload photos:', photoError);
          
          const continueWithoutPhotos = await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Erreur upload photos',
              'Impossible d\'uploader les photos. Voulez-vous continuer la création de commande sans les photos ?',
              [
                { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Continuer sans photos', onPress: () => resolve(true) }
              ]
            );
          });
          
          if (!continueWithoutPhotos) {
            setSubmitting(false);
            return;
          }
          
          photoUrls = [];
        }
      }

      const addressesData = buildAddressesObject(form, activeService);
      
      let serviceDate, serviceStartTime, serviceEndTime;
      
      serviceDate = form.prestationDate || null;
      serviceStartTime = form.startTime || null;
      serviceEndTime = form.startTime && form.duration 
        ? calculatedEndTime 
        : null;

      let parsedAmount;
      
      if (preValidatedAmount && preValidatedAmount > 0) {
        parsedAmount = preValidatedAmount;
        console.log('💰 Utilisation montant pré-validé:', parsedAmount);
      } else {
        const cleanAmount = form.proposedAmount.replace(/[^\d.,]/g, '').replace(',', '.');
        parsedAmount = parseFloat(cleanAmount);
        
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          Alert.alert('Erreur', 'Le montant saisi est invalide. Veuillez vérifier et recommencer.');
          return;
        }
        console.log('💰 Utilisation montant du formulaire:', parsedAmount);
      }

      // DONNÉES COMPLÈTES - TOUS LES CHAMPS CONSERVÉS
      const orderData = {
        client_id: activeUser.id,
        service_id: activeService.id,
        user_id: null,
        fourmiz_id: null,
        description: form.description || '',
        proposed_amount: parsedAmount,
        date: serviceDate,
        start_time: serviceStartTime,
        end_time: serviceEndTime,
        duration: form.duration ? parseInt(form.duration, 10) : null,
        address: form.address,
        phone: form.phone,
        urgent: form.isUrgent,
        urgency_level: 'normal',
        invoice_required: form.needsInvoice,
        status: 'en_attente',
        payment_status: 'authorized',
        payment_authorized_at: new Date().toISOString(),
        authorization_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        payment_captured_at: null,
        payment_intent_id: paymentIntentId || null,
        allow_multiple_candidates: form.allowMultipleCandidates,
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
        created_at: new Date().toISOString(),
        updated_at: null,
        confirmed_by_fourmiz: false,
        accepted_at: null,
        cancelled_at: null,
        cancelled_by: null,
        rating: null,
        feedback: null,
        invoice_url: null,
        urgency_surcharge: '0.00',
        cancellation_fee: '0.00',
        addresses: addressesData,
        postal_code: form.postalCode,
        city: form.city,
        departure_address: form.address,
        arrival_address: form.arrivalAddress || null,
        arrival_postal_code: form.arrivalPostalCode || null,
        arrival_city: form.arrivalCity || null,
        delivery_address: form.deliveryAddress || null,
        pickup_address: form.pickupAddress || null,
        // 🔧 CHAMPS CONSERVÉS
        departure_time: form.departureTime || null,
        pickup_time: form.pickupTime || null,
        package_number: form.packageNumber || null,
        equipment: form.equipment || null,
        alternative_phone: form.alternativePhone || null,
        company_name: form.companyName || null,
        siret: form.siret || null,
        invoice_type: form.invoiceType,
        commission: null
      };

      console.log('📝 Données commande complètes à insérer:', {
        service_id: orderData.service_id,
        service_title: activeService.title,
        proposed_amount: orderData.proposed_amount,
        payment_status: orderData.payment_status,
        authorization_expires_at: orderData.authorization_expires_at,
        allow_multiple_candidates: orderData.allow_multiple_candidates,
        workflow_type: activeService.workflow_type,
        photos_count: photoUrls.length,
        pickup_address: orderData.pickup_address,
        delivery_address: orderData.delivery_address,
        equipment: orderData.equipment,
        package_number: orderData.package_number,
        invoice_required: orderData.invoice_required
      });

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

      try {
        await supabase.rpc('process_referral_for_order', { 
          order_id_input: insertResult.id 
        });
      } catch (referralError) {
        console.error('Erreur traitement parrainage:', referralError);
      }

      Alert.alert(
        'Commande créée et paiement pré-autorisé !',
        `Votre commande #${insertResult.id} pour "${activeService.title}" a été créée avec succès.\n\n💳 Votre paiement de ${parsedAmount.toFixed(2)}€ est pré-autorisé et sera débité dès qu'une Fourmiz acceptera votre mission.${photoUrls.length > 0 ? `\n📸 ${photoUrls.length} photo(s) jointe(s).` : ''}`,
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
      setPaymentValidated(false);
    }
  }, [validateForm, currentUser, selectedService, form, handleError, calculatedEndTime, buildAddressesObject, paymentValidated, router, params.serviceId]);

  // 🚀 EFFECTS
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
  }, [loadService, loadUserData]);

  useEffect(() => {
    if (!loading && selectedService) {
      const shouldShow = shouldShowMultipleCandidatesOption;
      
      setForm(prev => ({
        ...prev,
        startTime: '',
        allowMultipleCandidates: shouldShow ? true : false,
      }));
    }
  }, [loading, selectedService, shouldShowMultipleCandidatesOption]);

  // ✅ FONCTION POUR DÉTERMINER LES CHAMPS À AFFICHER SELON LA CATÉGORIE
  const shouldShowTransportFields = useMemo(() => {
    return selectedService?.categorie?.toLowerCase().includes('transport') || 
           selectedService?.categorie?.toLowerCase().includes('déménagement');
  }, [selectedService?.categorie]);

  const shouldShowDeliveryFields = useMemo(() => {
    return selectedService?.categorie?.toLowerCase().includes('livraison') || 
           selectedService?.categorie?.toLowerCase().includes('courses');
  }, [selectedService?.categorie]);

  const shouldShowPackageFields = useMemo(() => {
    return selectedService?.categorie?.toLowerCase().includes('colis') || 
           selectedService?.categorie?.toLowerCase().includes('envoi');
  }, [selectedService?.categorie]);

  // Gestion d'erreur de chargement
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
              onPress={loadService}
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
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.backToServicesButton}
              onPress={() => router.push('/(tabs)/services-list')}
            >
              <Ionicons name="arrow-back-circle" size={16} color="#333333" />
              <Text style={styles.backToServicesText}>Retour aux services disponibles</Text>
            </TouchableOpacity>
          </View>

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
              />
              <Text style={styles.currencySymbol}>€</Text>
            </View>
            {errors.proposedAmount && <Text style={styles.errorText}>{errors.proposedAmount}</Text>}
          </View>

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
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          <View style={styles.section}>
            <PhotoSection 
              photos={form.photos} 
              onPhotosChange={handlePhotosChange}
              maxPhotos={5}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse communiquée au seul prestataire Fourmiz validé *</Text>
            <TextInput 
              style={[styles.input, errors.address && styles.inputError]}
              placeholder="Adresse complète (rue, numéro)"
              placeholderTextColor="#999999"
              value={form.address}
              onChangeText={(text) => updateForm('address', text)}
              returnKeyType="done"
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>

          {/* 🚚 CHAMPS TRANSPORT/DÉMÉNAGEMENT CONDITIONNELS */}
          {shouldShowTransportFields && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Adresse d'arrivée (transport)</Text>
              <TextInput 
                style={styles.input}
                placeholder="Adresse de destination"
                placeholderTextColor="#999999"
                value={form.arrivalAddress}
                onChangeText={(text) => updateForm('arrivalAddress', text)}
                returnKeyType="done"
              />
              
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.subSectionTitle}>Code postal arrivée</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="Ex: 67000"
                    placeholderTextColor="#999999"
                    value={form.arrivalPostalCode}
                    onChangeText={(text) => updateForm('arrivalPostalCode', text)}
                    keyboardType="numeric"
                    maxLength={5}
                    returnKeyType="done"
                  />
                </View>
                
                <View style={styles.halfWidth}>
                  <Text style={styles.subSectionTitle}>Ville d'arrivée</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="Ex: Strasbourg"
                    placeholderTextColor="#999999"
                    value={form.arrivalCity}
                    onChangeText={(text) => updateForm('arrivalCity', text)}
                    returnKeyType="done"
                  />
                </View>
              </View>

              <View style={styles.phoneField}>
                <Text style={styles.subSectionTitle}>Heure de départ (facultative)</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="Ex: 14:30"
                  placeholderTextColor="#999999"
                  value={form.departureTime}
                  onChangeText={(text) => updateForm('departureTime', text)}
                  returnKeyType="done"
                />
              </View>
            </View>
          )}

          {/* 🚚 CHAMPS LIVRAISON CONDITIONNELS */}
          {shouldShowDeliveryFields && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Adresses de livraison</Text>
              
              <View style={styles.phoneField}>
                <Text style={styles.subSectionTitle}>Adresse de récupération (facultative)</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="Où récupérer l'objet/produit"
                  placeholderTextColor="#999999"
                  value={form.pickupAddress}
                  onChangeText={(text) => updateForm('pickupAddress', text)}
                  returnKeyType="done"
                />
              </View>

              <View style={styles.phoneField}>
                <Text style={styles.subSectionTitle}>Adresse de livraison (facultative)</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="Où livrer l'objet/produit"
                  placeholderTextColor="#999999"
                  value={form.deliveryAddress}
                  onChangeText={(text) => updateForm('deliveryAddress', text)}
                  returnKeyType="done"
                />
              </View>
            </View>
          )}

          {/* 📦 CHAMPS COLIS CONDITIONNELS */}
          {shouldShowPackageFields && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informations colis</Text>
              
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.subSectionTitle}>Heure de récupération</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="Ex: 14:30"
                    placeholderTextColor="#999999"
                    value={form.pickupTime}
                    onChangeText={(text) => updateForm('pickupTime', text)}
                    returnKeyType="done"
                  />
                </View>
                
                <View style={styles.halfWidth}>
                  <Text style={styles.subSectionTitle}>Numéro de colis</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="Ex: COL123456"
                    placeholderTextColor="#999999"
                    value={form.packageNumber}
                    onChangeText={(text) => updateForm('packageNumber', text)}
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>
          )}

          {/* 🔧 CHAMP ÉQUIPEMENT (pour tous les services) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Équipement nécessaire (facultatif)</Text>
            <TextInput 
              style={styles.input}
              placeholder="Ex: Échelle, outils spéciaux, matériel de protection..."
              placeholderTextColor="#999999"
              value={form.equipment}
              onChangeText={(text) => updateForm('equipment', text)}
              returnKeyType="done"
            />
          </View>

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
                />
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
              </View>
            </View>
          </View>

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
              />
            </View>
          </View>

          {/* 📄 SECTION FACTURATION COMPLÈTE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Facturation</Text>
            
            <View style={styles.multipleCandidatesField}>
              <View style={styles.multipleCandidatesContent}>
                <Text style={styles.multipleCandidatesText}>Je souhaite une facture</Text>
                <Text style={styles.multipleCandidatesSubtext}>
                  Recevez une facture officielle pour cette prestation
                </Text>
              </View>
              <Switch
                value={form.needsInvoice}
                onValueChange={(value) => updateForm('needsInvoice', value)}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                style={styles.multipleCandidatesSwitch}
              />
            </View>

            {form.needsInvoice && (
              <>
                <View style={styles.invoiceTypeSection}>
                  <Text style={styles.subSectionTitle}>Type de facturation</Text>
                  <View style={styles.invoiceTypeButtons}>
                    <TouchableOpacity
                      style={[
                        styles.invoiceTypeButton,
                        form.invoiceType === 'particulier' && styles.invoiceTypeButtonSelected
                      ]}
                      onPress={() => updateForm('invoiceType', 'particulier')}
                    >
                      <Text style={[
                        styles.invoiceTypeButtonText,
                        form.invoiceType === 'particulier' && styles.invoiceTypeButtonTextSelected
                      ]}>
                        Particulier
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.invoiceTypeButton,
                        form.invoiceType === 'entreprise' && styles.invoiceTypeButtonSelected
                      ]}
                      onPress={() => updateForm('invoiceType', 'entreprise')}
                    >
                      <Text style={[
                        styles.invoiceTypeButtonText,
                        form.invoiceType === 'entreprise' && styles.invoiceTypeButtonTextSelected
                      ]}>
                        Entreprise
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {form.invoiceType === 'entreprise' && (
                  <View style={styles.companyFields}>
                    <View style={styles.phoneField}>
                      <Text style={styles.subSectionTitle}>Nom de l'entreprise *</Text>
                      <TextInput 
                        style={[styles.input, errors.companyName && styles.inputError]}
                        placeholder="Nom de votre entreprise"
                        placeholderTextColor="#999999"
                        value={form.companyName}
                        onChangeText={(text) => updateForm('companyName', text)}
                        returnKeyType="done"
                      />
                      {errors.companyName && <Text style={styles.errorText}>{errors.companyName}</Text>}
                    </View>

                    <View style={styles.phoneField}>
                      <Text style={styles.subSectionTitle}>SIRET *</Text>
                      <TextInput 
                        style={[styles.input, errors.siret && styles.inputError]}
                        placeholder="14 chiffres (ex: 12345678901234)"
                        placeholderTextColor="#999999"
                        value={form.siret}
                        onChangeText={(text) => updateForm('siret', text)}
                        keyboardType="numeric"
                        maxLength={14}
                        returnKeyType="done"
                      />
                      {errors.siret && <Text style={styles.errorText}>{errors.siret}</Text>}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          {shouldShowMultipleCandidatesOption && (
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Date de prestation{!form.isUrgent ? ' *' : ' (facultative)'}
            </Text>
            
            <View style={styles.urgentDropdownField}>
              <Text style={styles.urgentDropdownText}>Dès que possible</Text>
              <Switch
                value={form.isUrgent}
                onValueChange={(value) => {
                  updateForm('isUrgent', value);
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
            
            <DropdownButton
              value={form.prestationDate ? getSelectedDateLabel() : undefined}
              placeholder={form.isUrgent ? "Choisir une date (facultatif)" : "Choisir une date"}
              onPress={() => setShowCalendarPicker(true)}
              icon="calendar"
              error={!form.isUrgent && !!errors.prestationDate}
            />
            {!form.isUrgent && errors.prestationDate && <Text style={styles.errorText}>{errors.prestationDate}</Text>}
          </View>

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

          {submitError && (
            <View style={styles.section}>
              <View style={styles.submitErrorContainer}>
                <Ionicons name="alert-circle" size={16} color="#333333" />
                <Text style={styles.submitErrorText}>{submitError}</Text>
              </View>
            </View>
          )}

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
                {shouldShowMultipleCandidatesOption && (
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
              
              {/* Adresses supplémentaires conditionnelles */}
              {form.arrivalAddress && (
                <Text style={styles.summaryItem}>• Destination : {form.arrivalAddress}</Text>
              )}
              {form.pickupAddress && (
                <Text style={styles.summaryItem}>• Récupération : {form.pickupAddress}</Text>
              )}
              {form.deliveryAddress && (
                <Text style={styles.summaryItem}>• Livraison : {form.deliveryAddress}</Text>
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
                
                {/* Horaires supplémentaires */}
                {form.departureTime && (
                  <Text style={styles.summaryItem}>• Heure de départ : {form.departureTime}</Text>
                )}
                {form.pickupTime && (
                  <Text style={styles.summaryItem}>• Heure de récupération : {form.pickupTime}</Text>
                )}
              </View>
            )}

            {/* Section pour les informations spécifiques */}
            {(form.packageNumber || form.equipment) && (
              <View style={styles.summarySection}>
                <Text style={styles.summarySectionTitle}>Informations spécifiques</Text>
                {form.packageNumber && (
                  <Text style={styles.summaryItem}>• Numéro de colis : {form.packageNumber}</Text>
                )}
                {form.equipment && (
                  <Text style={styles.summaryItem}>• Équipement : {form.equipment}</Text>
                )}
              </View>
            )}

            {form.description && (
              <View style={styles.summarySection}>
                <Text style={styles.summarySectionTitle}>Informations complémentaires</Text>
                <Text style={styles.summaryDescription}>{form.description}</Text>
              </View>
            )}

            {/* Section facturation */}
            {form.needsInvoice && (
              <View style={styles.summarySection}>
                <Text style={styles.summarySectionTitle}>Facturation</Text>
                <Text style={styles.summaryItem}>• Type : {form.invoiceType === 'particulier' ? 'Particulier' : 'Entreprise'}</Text>
                {form.invoiceType === 'entreprise' && form.companyName && (
                  <Text style={styles.summaryItem}>• Entreprise : {form.companyName}</Text>
                )}
                {form.invoiceType === 'entreprise' && form.siret && (
                  <Text style={styles.summaryItem}>• SIRET : {form.siret}</Text>
                )}
              </View>
            )}

            <PhotoSummary photos={form.photos} />

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Pré-autorisation de paiement</Text>
              <Text style={styles.summaryItem}>• Montant à pré-autoriser : {form.proposedAmount}€</Text>
              <Text style={styles.summaryPaymentNote}>
                Le paiement sera pré-autorisé maintenant et débité automatiquement dès qu'une Fourmiz acceptera votre mission. L'autorisation expire dans 7 jours si aucune Fourmiz n'accepte.
              </Text>
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
                styles.paymentButton,
                (submitting || processingPayment) && styles.paymentButtonDisabled
              ]}
              onPress={handleProceedToPayment}
              disabled={submitting || processingPayment}
            >
              {processingPayment ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="shield-checkmark" size={16} color="#fff" />
              )}
              <Text style={styles.paymentButtonText}>
                {processingPayment ? 'Pré-autorisation...' : 'Pré-autoriser le paiement'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

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

      <CalendarPicker
        visible={showCalendarPicker}
        selectedDate={form.prestationDate}
        onSelectDate={handleDateSelect}
        onCancel={() => setShowCalendarPicker(false)}
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

// Styles Photos
const photoStyles = StyleSheet.create({
  container: { marginVertical: 8 },
  title: { fontSize: 13, fontWeight: '600', marginBottom: 4, color: '#000000' },
  subtitle: { fontSize: 12, color: '#666666', marginBottom: 12 },
  photosList: { marginBottom: 12 },
  photoContainer: { position: 'relative', marginRight: 8 },
  photoThumbnail: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#f0f0f0' },
  removeButton: { position: 'absolute', top: -6, right: -6, backgroundColor: '#ffffff', borderRadius: 10 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#40E0D0', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 6, justifyContent: 'center', gap: 8 },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '500' },
});

const photoSummaryStyles = StyleSheet.create({
  container: { marginVertical: 8 },
  title: { fontSize: 13, fontWeight: '600', marginBottom: 8, color: '#000000' },
  scrollContent: { paddingRight: 16 },
  thumbnail: { width: 80, height: 80, borderRadius: 8, marginRight: 8, position: 'relative', overflow: 'hidden' },
  thumbnailImage: { width: '100%', height: '100%', backgroundColor: '#f0f0f0' },
  thumbnailOverlay: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4 },
  viewerContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  navButton: { position: 'absolute', top: '50%', zIndex: 10, padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  prevButton: { left: 20 },
  nextButton: { right: 20 },
  fullImage: { width: '90%', height: '70%' },
  indicator: { position: 'absolute', bottom: 50, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  indicatorText: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
});

// Styles principaux complets
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Platform.OS === 'ios' ? 200 : 150, flexGrow: 1 },
  headerButton: { padding: 6, marginLeft: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 13, color: '#333333', fontWeight: '400' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 16 },
  errorTitle: { fontSize: 18, fontWeight: '600', color: '#000000' },
  errorMessage: { fontSize: 13, color: '#666666', textAlign: 'center', lineHeight: 18 },
  errorActions: { flexDirection: 'column', gap: 12, alignItems: 'center' },
  backToServicesButtonError: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0', gap: 8 },
  backToServicesTextError: { color: '#333333', fontSize: 13, fontWeight: '500' },
  retryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000000', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, gap: 8 },
  retryButtonDisabled: { opacity: 0.6 },
  retryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '500' },
  submitErrorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', padding: 12, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#333333', gap: 8 },
  submitErrorText: { flex: 1, fontSize: 13, color: '#333333', lineHeight: 18 },
  section: { marginBottom: 16, paddingHorizontal: 20 },
  row: { flexDirection: 'row', gap: 12 },
  halfWidth: { flex: 1 },
  keyboardSpacer: { height: 120 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#000000', marginBottom: 10, letterSpacing: -0.2 },
  subSectionTitle: { fontSize: 12, fontWeight: '500', color: '#333333', marginBottom: 6 },
  backToServicesButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0', gap: 6, marginBottom: 8 },
  backToServicesText: { fontSize: 12, color: '#666666', fontWeight: '400' },
  selectedServiceCard: { backgroundColor: '#f8f8f8', padding: 16, borderRadius: 6, borderWidth: 0 },
  selectedServiceTitle: { fontSize: 13, fontWeight: '600', color: '#000000', marginBottom: 4 },
  selectedServiceDescription: { fontSize: 12, color: '#333333', lineHeight: 16 },
  urgentDropdownField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, backgroundColor: '#ffffff', padding: 12, marginBottom: 10 },
  urgentDropdownText: { fontSize: 13, color: '#000000', fontWeight: '400' },
  urgentSwitch: { transform: [{ scale: 0.8 }] },
  urgencyNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', padding: 10, borderRadius: 6, marginBottom: 10, gap: 6 },
  urgencyNoteText: { fontSize: 12, color: '#333333', fontWeight: '500' },
  multipleCandidatesField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, backgroundColor: '#ffffff', padding: 12, marginBottom: 10 },
  multipleCandidatesContent: { flex: 1, marginRight: 12 },
  multipleCandidatesText: { fontSize: 13, color: '#000000', fontWeight: '500', marginBottom: 2 },
  multipleCandidatesSubtext: { fontSize: 11, color: '#666666', lineHeight: 14 },
  multipleCandidatesSwitch: { transform: [{ scale: 0.8 }] },
  multipleCandidatesNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', padding: 10, borderRadius: 6, marginBottom: 10, gap: 6 },
  multipleCandidatesNoteText: { fontSize: 12, color: '#333333', fontWeight: '500', flex: 1, lineHeight: 16 },
  
  // Styles facturation
  invoiceTypeSection: { marginBottom: 12 },
  invoiceTypeButtons: { flexDirection: 'row', gap: 8 },
  invoiceTypeButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#ffffff', alignItems: 'center' },
  invoiceTypeButtonSelected: { backgroundColor: '#000000', borderColor: '#000000' },
  invoiceTypeButtonText: { fontSize: 13, color: '#333333', fontWeight: '500' },
  invoiceTypeButtonTextSelected: { color: '#ffffff' },
  companyFields: { marginTop: 12 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, backgroundColor: '#ffffff' },
  inputWithCurrency: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, fontSize: 13, color: '#000000', textAlignVertical: 'center' },
  input: { paddingVertical: 12, paddingHorizontal: 12, fontSize: 13, color: '#000000', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, backgroundColor: '#ffffff', textAlignVertical: 'center' },
  currencySymbol: { paddingRight: 12, fontSize: 13, color: '#333333', fontWeight: '500' },
  textArea: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, backgroundColor: '#ffffff', padding: 12, fontSize: 13, color: '#000000', minHeight: 80, maxHeight: 120, textAlignVertical: 'top' },
  inputError: { borderColor: '#333333', borderWidth: 2 },
  errorText: { color: '#333333', fontSize: 12, marginTop: 4, fontWeight: '500' },
  phoneField: { marginBottom: 12 },
  calculatedEndTime: { backgroundColor: '#f0f0f0', padding: 10, borderRadius: 6, marginTop: 8 },
  endTimeText: { fontSize: 12, color: '#333333', fontWeight: '500', textAlign: 'center' },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, backgroundColor: '#ffffff', padding: 12, minHeight: 40 },
  dropdownText: { fontSize: 13, color: '#000000', fontWeight: '400' },
  placeholderText: { color: '#999999' },
  actionButtonsContainer: { marginTop: 24, marginBottom: 20, paddingHorizontal: 20 },
  summaryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#40E0D0', padding: 14, borderRadius: 6, justifyContent: 'center', gap: 8 },
  summaryButtonDisabled: { opacity: 0.6, backgroundColor: '#999999' },
  summaryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  summaryModal: { flex: 1, backgroundColor: '#ffffff' },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  summaryTitle: { fontSize: 13, fontWeight: '600', color: '#000000' },
  summaryContent: { flex: 1, padding: 16 },
  summarySection: { marginBottom: 16 },
  summarySectionTitle: { fontSize: 13, fontWeight: '600', color: '#000000', marginBottom: 8 },
  summaryItem: { fontSize: 12, color: '#333333', marginBottom: 4, lineHeight: 16 },
  summaryUrgent: { fontSize: 12, color: '#000000', fontWeight: '600', marginBottom: 4 },
  summaryDescription: { fontSize: 12, color: '#333333', lineHeight: 16 },
  summaryPaymentNote: { fontSize: 11, color: '#666666', fontStyle: 'italic', lineHeight: 15, marginTop: 4, backgroundColor: '#f8f8f8', padding: 8, borderRadius: 4 },
  summaryActions: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  backButton: { flex: 1, backgroundColor: '#ffffff', padding: 12, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  backButtonText: { color: '#333333', fontSize: 13, fontWeight: '500' },
  paymentButton: { flex: 2, backgroundColor: '#10b981', padding: 12, borderRadius: 6, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  paymentButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  paymentButtonDisabled: { backgroundColor: '#999999', opacity: 0.6 },

  // Calendrier
  calendarModal: { flex: 1, backgroundColor: '#ffffff' },
  calendarModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  calendarModalTitle: { fontSize: 13, fontWeight: '600', color: '#000000' },
  calendarModalContent: { flex: 1, padding: 16 },
  calendarModalActions: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  calendarCancelButton: { flex: 1, backgroundColor: '#ffffff', padding: 12, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  calendarCancelButtonText: { color: '#333333', fontSize: 13, fontWeight: '500' },
  calendarConfirmButton: { flex: 1, backgroundColor: '#000000', padding: 12, borderRadius: 6, alignItems: 'center' },
  calendarConfirmButtonDisabled: { backgroundColor: '#999999', opacity: 0.6 },
  calendarConfirmButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  calendarPickerCard: { backgroundColor: '#ffffff', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 16 },
  calendarPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthTitle: { fontSize: 13, fontWeight: '600', color: '#000000' },
  calendarActions: { flexDirection: 'row', gap: 8 },
  monthNav: { padding: 8, borderRadius: 6, backgroundColor: '#f8f8f8' },
  weekHeaderContainer: { flexDirection: 'row', marginBottom: 8 },
  weekHeaderDay: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  weekHeaderText: { fontSize: 11, color: '#666666', fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  calendarDay: { width: `${100/7}%`, aspectRatio: 1, padding: 4, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  todayDay: { backgroundColor: '#e8f4fd', borderRadius: 6 },
  selectedDay: { backgroundColor: '#000000', borderRadius: 6 },
  disabledDay: { opacity: 0.3 },
  calendarDayText: { fontSize: 13, fontWeight: '600', color: '#333333' },
  todayDayText: { color: '#2196F3' },
  selectedDayText: { color: '#ffffff' },
  disabledDayText: { color: '#cccccc' },
  quickDateActions: { flexDirection: 'row', justifyContent: 'space-around', gap: 12 },
  quickDateButton: { flex: 1, backgroundColor: '#f8f8f8', padding: 12, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  quickDateButtonText: { fontSize: 12, color: '#333333', fontWeight: '500' },
  selectedDatePreview: { backgroundColor: '#f8f8f8', padding: 16, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#000000' },
  selectedDateText: { fontSize: 13, color: '#000000', fontWeight: '600', textAlign: 'center' },

  // Modales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 6, padding: 16, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 13, fontWeight: '600', color: '#000000', textAlign: 'center', marginBottom: 12 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  selectedModalOption: { backgroundColor: '#f5f5f5' },
  modalOptionText: { fontSize: 13, color: '#000000', flex: 1, fontWeight: '400' },
  selectedModalText: { color: '#000000', fontWeight: '600' },
  modalCancel: { backgroundColor: '#ffffff', padding: 12, borderRadius: 6, marginTop: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  modalCancelText: { fontSize: 13, color: '#333333', textAlign: 'center', fontWeight: '500' },
  timeScroll: { maxHeight: 250 },
});
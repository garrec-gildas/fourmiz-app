// app/orders/create-custom.tsx - VERSION COMPLÈTE AVEC SYSTÈME PAIEMENT PRÉ-AUTORISATION HARMONISÉ
// 🔧 ADAPTATION : Système pré-autorisation synchronisé avec create.tsx
// ✅ CONSERVATION : Toutes les fonctionnalités spécifiques de create-custom.tsx
// 💳 CORRECTION : Messages et logique pré-autorisation + capture différée identiques à create.tsx
// 📸 PHOTOS CORRIGÉES + 🔄 CANDIDATURES MULTIPLES + 📅 CALENDRIER + 🎯 FIELD_CONFIG
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
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { PaymentModal } from '../../components/PaymentModal';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { ActionSheetIOS } from 'react-native';

const { width } = Dimensions.get('window');

// Types pour les photos
interface PhotoData {
  id: string;
  uri: string;
  name?: string;
  type?: string;
  size?: number;
}

// 📸 FONCTIONS D'UPLOAD COMPLÈTES - Basées sur create.tsx qui fonctionne
const convertToUint8Array = async (uri: string): Promise<Uint8Array> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

// Styles Photos - IDENTIQUES À create.tsx
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

// 📸 COMPOSANT PhotoSection COMPLET ET INTÉGRÉ - IDENTIQUE À create.tsx
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

// 📸 COMPOSANT PhotoSummary CORRIGÉ avec interface harmonisée
const PhotoSummary: React.FC<{photos: PhotoData[]}> = ({ photos }) => {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  if (photos.length === 0) return null;

  const openViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setViewerVisible(true);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedPhotoIndex(prev => prev > 0 ? prev - 1 : photos.length - 1);
    } else {
      setSelectedPhotoIndex(prev => prev < photos.length - 1 ? prev + 1 : 0);
    }
  };

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
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={photoSummaryStyles.viewerContainer}>
          <TouchableOpacity
            style={photoSummaryStyles.closeButton}
            onPress={() => setViewerVisible(false)}
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
};

// Styles pour PhotoSummary inline
const photoSummaryStyles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000000',
  },
  scrollContent: {
    paddingRight: 16,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  fullImage: {
    width: '90%',
    height: '70%',
  },
  indicator: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  indicatorText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});

// ✅ INTERFACE CORRIGÉE avec photos synchronisées avec create.tsx
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
  allowMultipleCandidates: boolean;
  // 📸 CORRECTION : Type PhotoData harmonisé avec usePhotoManager
  photos: PhotoData[];
}

// Structure addresses comme dans Supabase
interface AddressesData {
  city: string;
  categorie: string;
  postal_code: string;
  arrival_city: string | null;
  main_address: string;
  pickup_address: string | null;
  arrival_address: string | null;
  delivery_address: string | null;
  departure_address: string;
  arrival_postal_code: string | null;
}

interface SelectOption {
  label: string;
  value: string;
}

interface CategoryConfig {
  [fieldName: string]: boolean | 'optionnel' | 'obligatoire';
}

// INTERFACES POUR LE CALENDRIER
interface CalendarDay {
  day: number;
  dateKey: string;
  isToday: boolean;
  isSelected: boolean;
  isPast: boolean;
  isDisabled: boolean;
}

// HELPERS CALENDRIER
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

// ✅ CONSERVATION : CONFIGURATION COMPLÈTE AVEC CHAMPS ESSENTIELS (gardée identique)
const FIELD_CONFIG: { categories: { [key: string]: CategoryConfig } } = {
  categories: {
    "Administratif": {
      date: true,
      heure_depart: false,
      heure_debut: true,
      duree: true,
      heure_retrait: false,
      adresse_lieu: true,
      lieu_livraison: false,
      lieu_arrivee: false,
      cp_ville: true,
      telephone: true,
      telephone_alt: "optionnel",
      descriptif: true,
      numero_colis: false,
      materiel: false,
      urgence: "optionnel",
      montant_propose: true,
      facturation: "optionnel"
    },
    "transport": {
      date: true,
      heure_depart: true,
      heure_debut: true,
      duree: true,
      heure_retrait: false,
      adresse_lieu: true,
      lieu_livraison: false,
      lieu_arrivee: true,
      cp_ville: true,
      telephone: true,
      telephone_alt: "optionnel",
      descriptif: true,
      numero_colis: false,
      materiel: "optionnel",
      urgence: "optionnel",
      montant_propose: true,
      facturation: "optionnel"
    },
    "Livraison": {
      date: true,
      heure_depart: false,
      heure_debut: true,
      duree: true,
      heure_retrait: true,
      adresse_lieu: true,
      lieu_livraison: true,
      lieu_arrivee: false,
      cp_ville: true,
      telephone: true,
      telephone_alt: "optionnel",
      descriptif: "optionnel",
      numero_colis: "obligatoire",
      materiel: "optionnel",
      urgence: "optionnel",
      montant_propose: true,
      facturation: "optionnel"
    },
    "Bricolage": {
      date: true,
      heure_depart: false,
      heure_debut: true,
      duree: true,
      heure_retrait: false,
      adresse_lieu: true,
      lieu_livraison: false,
      lieu_arrivee: false,
      cp_ville: true,
      telephone: true,
      telephone_alt: "optionnel",
      descriptif: true,
      numero_colis: false,
      materiel: "optionnel",
      urgence: "optionnel",
      montant_propose: true,
      facturation: "optionnel"
    },
    "Jardinage": {
      date: true,
      heure_depart: false,
      heure_debut: true,
      duree: true,
      heure_retrait: false,
      adresse_lieu: true,
      lieu_livraison: false,
      lieu_arrivee: false,
      cp_ville: true,
      telephone: true,
      telephone_alt: "optionnel",
      descriptif: true,
      numero_colis: false,
      materiel: "optionnel",
      urgence: "optionnel",
      montant_propose: true,
      facturation: "optionnel"
    },
    "Autres": {
      date: true,
      heure_depart: false,
      heure_debut: true,
      duree: true,
      heure_retrait: false,
      adresse_lieu: true,
      lieu_livraison: false,
      lieu_arrivee: false,
      cp_ville: true,
      telephone: true,
      telephone_alt: "optionnel",
      descriptif: "obligatoire",
      numero_colis: false,
      materiel: "optionnel",
      urgence: "optionnel",
      montant_propose: true,
      facturation: "optionnel"
    }
  }
};

// Hook pour la gestion d'erreur (identique à create.tsx)
const useErrorHandler = () => {
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback((error: any, context: string) => {
    console.error(`Erreur ${context}:`, error);
    
    let userMessage = 'Une erreur inattendue est survenue';
    
    if (error?.code === 'PGRST301') {
      userMessage = 'Données non trouvées';
    } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      userMessage = 'Problème de connexion internet. Vérifiez votre connexion.';
    } else if (error?.message?.includes('auth')) {
      userMessage = 'Session expirée, veuillez vous reconnecter';
    } else if (context === 'order_creation') {
      userMessage = 'Impossible de créer la demande personnalisée';
    } else if (context === 'categories_loading') {
      userMessage = 'Impossible de charger les catégories';
    }
    
    setError(userMessage);
  }, []);

  const retryAction = useCallback(async (action: () => Promise<void>) => {
    setIsRetrying(true);
    setError(null);
    
    try {
      await action();
    } catch (error) {
      handleError(error, 'retry');
    } finally {
      setIsRetrying(false);
    }
  }, [handleError]);

  const clearError = useCallback(() => setError(null), []);

  return { error, isRetrying, handleError, retryAction, clearError };
};

// Hook pour la validation du formulaire personnalisé (CONSERVÉ de create-custom)
const useCustomFormValidation = (form: OrderForm, selectedCategory: string) => {
  const validateField = useCallback((field: keyof OrderForm, value: any): string => {
    switch (field) {
      case 'serviceTitle':
        if (!value?.trim()) return 'Titre requis';
        if (value.length < 5) return 'Titre trop court (min 5 caractères)';
        if (value.length > 100) return 'Titre trop long (max 100 caractères)';
        break;
        
      case 'description':
        if (!value?.trim()) return 'Description requise';
        if (value.length < 15) return 'Description trop courte (min 15 caractères)';
        if (value.length > 1000) return 'Description trop longue (max 1000 caractères)';
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
        if (value.length < 10) return 'Adresse trop courte';
        break;
        
      case 'city':
        if (!value?.trim()) return 'Ville requise';
        if (value.trim().length < 2) return 'Nom de ville trop court';
        break;
        
      case 'prestationDate':
        if (!value) return 'Date requise';
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) return 'Date ne peut pas être dans le passé';
        break;

      case 'packageNumber':
        if (selectedCategory === 'Livraison' && !value?.trim()) {
          return 'Numéro de colis requis pour la livraison';
        }
        break;

      case 'equipment':
        if (selectedCategory === 'Bricolage' && !value?.trim()) {
          return 'Matériel requis pour le bricolage';
        }
        break;
    }
    return '';
  }, [selectedCategory]);

  const validateForm = useCallback((): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    
    // Validation catégorie
    if (!selectedCategory) {
      errors.category = 'Catégorie requise';
    }
    
    // Champs de base obligatoires
    const requiredFields: (keyof OrderForm)[] = [
      'serviceTitle', 'description', 'proposedAmount', 'address', 'city', 'phone'
    ];
    
    // Pour les services non-urgents, la date est requise
    if (!form.isUrgent) {
      requiredFields.push('prestationDate');
    }
    
    requiredFields.forEach(field => {
      const error = validateField(field, form[field]);
      if (error) errors[field] = error;
    });
    
    // Validations conditionnelles selon la catégorie
    if (selectedCategory) {
      const config = FIELD_CONFIG.categories[selectedCategory];
      
      if (config?.numero_colis === 'obligatoire') {
        const error = validateField('packageNumber', form.packageNumber);
        if (error) errors.packageNumber = error;
      }
      
      if (config?.materiel === true) {
        const error = validateField('equipment', form.equipment);
        if (error) errors.equipment = error;
      }
    }
    
    // Validation code postal si présent 
    if (form.postalCode) {
      const error = validateField('postalCode', form.postalCode);
      if (error) errors.postalCode = error;
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [form, selectedCategory, validateField]);

  return { validateForm, validateField };
};

// Hook pour charger les catégories depuis Supabase (EXACT comme create.tsx)
const useCategoriesLoader = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, handleError, retryAction, clearError } = useErrorHandler();

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      clearError();
      console.log('Chargement des catégories depuis Supabase...');
      
      const { data, error: supabaseError } = await supabase
        .from('services')
        .select('categorie')
        .not('categorie', 'is', null);

      if (supabaseError) throw supabaseError;

      const uniqueCategories = [...new Set(data.map(item => item.categorie))];
      const sortedCategories = uniqueCategories.sort();
      
      console.log('Catégories chargées:', sortedCategories);
      setCategories(sortedCategories);

    } catch (error) {
      handleError(error, 'categories_loading');
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const retryLoad = useCallback(() => {
    retryAction(loadCategories);
  }, [retryAction, loadCategories]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return { categories, loading, error, retryLoad };
};

// COMPOSANTS RÉUTILISABLES

// CALENDRIER DE SÉLECTION
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

// MODAL DE SÉLECTION AVEC ASCENSEUR 12H PAR DÉFAUT
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
    if (visible && title.includes("Heure") && scrollViewRef.current) {
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
            
            console.log(`Auto-scroll vers 12:00 (index: ${twelveOClockIndex}, offset: ${scrollOffset}px)`);
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
            style={styles.categoryScroll}
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

const DropdownButton: React.FC<{
  value?: string;
  placeholder: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: boolean;
}> = ({ value, placeholder, onPress, icon, error }) => {
  return (
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
};

// ErrorDisplay identique à create.tsx
const ErrorDisplay: React.FC<{
  error: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}> = ({ error, onRetry, isRetrying }) => {
  return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={48} color="#333333" />
      <Text style={styles.errorTitle}>Oups !</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      
      {onRetry && (
        <TouchableOpacity 
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          onPress={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="refresh" size={20} color="#fff" />
          )}
          <Text style={styles.retryButtonText}>
            {isRetrying ? 'Tentative...' : 'Réessayer'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// COMPOSANT PRINCIPAL
export default function CreateCustomOrderScreen() {
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // 💳 ÉTATS POUR LE PAIEMENT - HARMONISÉS AVEC create.tsx
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentValidated, setPaymentValidated] = useState(false);
  
  // États pour gérer le focus des inputs
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  // États pour la recherche de catégories avec menu déroulant automatique
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  // Modals (calendrier + sélections)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showDepartureTimePicker, setShowDepartureTimePicker] = useState(false);
  const [showPickupTimePicker, setShowPickupTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showUrgencyDropdown, setShowUrgencyDropdown] = useState(false);
  
  // 📸 ÉTAT PHOTOS INLINE - IDENTIQUE À create.tsx
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  
  // 📸 GESTIONNAIRE PHOTOS INLINE
  const handlePhotosChange = useCallback((photos: PhotoData[]) => {
    setPhotos(photos);
    setForm(prev => ({ ...prev, photos }));
  }, []);
  
  // Form state avec candidatures multiples + photos
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
    allowMultipleCandidates: true,
    // 📸 CORRECTION : Utiliser les photos du hook directement
    photos: [],
  });

  // Hooks personnalisés
  const { categories, loading: categoriesLoading, error: categoriesError, retryLoad } = useCategoriesLoader();
  const { error: submitError, handleError } = useErrorHandler();
  const { validateForm } = useCustomFormValidation(form, selectedCategory);

  // Toujours afficher le bouton candidatures multiples pour les demandes personnalisées
  const shouldShowMultipleCandidatesOption = useCallback(() => {
    return selectedCategory ? true : false;
  }, [selectedCategory]);

  // Filtrer les catégories selon le terme de recherche
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    
    return categories.filter(category =>
      category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  // Initialiser la catégorie depuis les params si disponible
  useEffect(() => {
    const paramCategory = params.selectedCategory as string;
    if (paramCategory && categories.includes(paramCategory)) {
      setSelectedCategory(paramCategory);
    }
  }, [params.selectedCategory, categories]);

  // FONCTIONS MÉMORISÉES

  // Configuration pour la catégorie actuelle
  const currentFieldConfig = useMemo(() => {
    if (!selectedCategory) return null;
    return FIELD_CONFIG.categories[selectedCategory];
  }, [selectedCategory]);

  // Vérifier si un champ est requis
  const isFieldRequired = useCallback((fieldName: string) => {
    if (!currentFieldConfig) {
      return ['descriptif', 'montant_propose', 'adresse_lieu', 'cp_ville', 'telephone', 'date'].includes(fieldName);
    }
    const fieldConfig = currentFieldConfig[fieldName];
    return fieldConfig === true || fieldConfig === 'obligatoire';
  }, [currentFieldConfig]);

  // Vérifier si un champ doit être affiché
  const shouldShowField = useCallback((fieldName: string) => {
    if (!currentFieldConfig) {
      return ['descriptif', 'montant_propose', 'adresse_lieu', 'cp_ville', 'telephone', 'date', 'heure_debut', 'duree', 'urgence', 'telephone_alt', 'facturation'].includes(fieldName);
    }
    const fieldConfig = currentFieldConfig[fieldName];
    return fieldConfig === true || fieldConfig === 'obligatoire' || fieldConfig === 'optionnel';
  }, [currentFieldConfig]);

  // Générer les créneaux horaires (ordre 12h-23h puis 0h-11h)
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

  // Formater la date sélectionnée pour affichage
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
  const buildAddressesObject = useCallback((form: OrderForm, category: string): AddressesData => {
    return {
      city: form.city || '',
      categorie: category || '',
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
      console.error('Erreur calcul heure fin:', error);
      return '';
    }
  }, []);

  // Heure de fin calculée
  const calculatedEndTime = useMemo(() => {
    return calculateEndTime(form.startTime, form.duration);
  }, [form.startTime, form.duration, calculateEndTime]);

  // Mise à jour du formulaire
  const updateForm = useCallback((key: keyof OrderForm, value: string | boolean | PhotoData[]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    
    setErrors(prev => {
      if (!prev[key]) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Gestionnaire pour le switch "Dès que possible" avec auto-remplissage
  const handleUrgentToggle = useCallback((value: boolean) => {
    updateForm('isUrgent', value);
    
    if (value) {
      // Configurer le niveau d'urgence par défaut
      if (form.urgencyLevel === 'normal') {
        updateForm('urgencyLevel', '1hour');
      }
      
      // Auto-remplir la date du jour si aucune date n'est sélectionnée
      if (!form.prestationDate) {
        const today = new Date();
        const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
        updateForm('prestationDate', todayKey);
        console.log('Date du jour auto-remplie pour urgence:', todayKey);
      }
    }
  }, [updateForm, form.urgencyLevel, form.prestationDate]);

  // Gestionnaire de sélection de date
  const handleDateSelect = useCallback((dateKey: string) => {
    updateForm('prestationDate', dateKey);
    setShowCalendarPicker(false);
  }, [updateForm]);

  // Gestionnaires de focus pour les inputs
  const handleInputFocus = useCallback(() => {
    setIsInputFocused(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
    // Délai pour permettre le clic sur le dropdown
    setTimeout(() => setShowSearchDropdown(false), 150);
  }, []);

  // Gestionnaire de recherche avec menu déroulant automatique
  const handleSearchChange = useCallback((text: string) => {
    setSearchTerm(text);
    setShowSearchDropdown(text.trim().length > 0 && filteredCategories.length > 0);
  }, [filteredCategories.length]);

  // Sélection depuis le dropdown de recherche avec gestion candidatures multiples
  const handleSearchSelect = useCallback((category: string) => {
    setSelectedCategory(category);
    setSearchTerm('');
    setShowSearchDropdown(false);
    
    // Réinitialiser le titre si changement de catégorie
    if (selectedCategory !== category) {
      setForm(prev => ({ 
        ...prev, 
        serviceTitle: '',
        allowMultipleCandidates: true,
      }));
    }
  }, [selectedCategory]);

  // Obtenir le label d'un champ selon la catégorie
  const getFieldLabel = useCallback((fieldName: string, defaultLabel: string) => {
    if (!selectedCategory) return defaultLabel;
    
    if (selectedCategory === 'transport') {
      switch (fieldName) {
        case 'heure_depart':
          return 'Heure de départ (+ ou - 1 heure)';
        case 'adresse_lieu':
          return 'Adresse de départ';
        default:
          return defaultLabel;
      }
    }
    
    return defaultLabel;
  }, [selectedCategory]);

  // Obtenir le label d'urgence
  const getUrgencyLabel = useCallback((level: string) => {
    switch (level) {
      case '30min': return 'Très urgent (30 min)';
      case '1hour': return 'Urgent (1 heure)';
      case '2hours': return 'Assez urgent (2 heures)';
      default: return 'Normal';
    }
  }, []);

  // CHARGEMENT DES DONNÉES
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profile) {
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
      console.error('Erreur chargement utilisateur:', error);
    }
  }, []);

  // 💳 FONCTIONS DE PAIEMENT - HARMONISÉES AVEC create.tsx
  const handleProceedToPayment = useCallback(() => {
    setShowSummary(false);
    setShowPaymentModal(true);
  }, []);

  // 💳 SUCCESS HANDLER - IDENTIQUE À create.tsx
  const handlePaymentSuccess = useCallback(async (paymentIntentId: string) => {
    setPaymentValidated(true);
    setShowPaymentModal(false);
    
    const validatedAmount = parseFloat(form.proposedAmount.replace(/[^\d.,]/g, '').replace(',', '.'));
    console.log('💳 Pré-autorisation réussie, montant validé:', validatedAmount);
    
    await handleSubmit(true, paymentIntentId, validatedAmount);
  }, [form.proposedAmount]);

  // 💳 ERROR HANDLER - IDENTIQUE À create.tsx
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

  // 📸 FONCTION handleSubmit CORRIGÉE avec système pré-autorisation harmonisé
  const handleSubmit = useCallback(async (
    paymentAlreadyValidated: boolean = false, 
    paymentIntentId?: string,
    preValidatedAmount?: number
  ) => {
    console.log('=== DÉBUT SOUMISSION CUSTOM AVEC PRÉ-AUTORISATION HARMONISÉE ===');
    console.log('Payment already validated:', paymentAlreadyValidated);
    console.log('Payment Intent ID:', paymentIntentId);
    console.log('Pre-validated amount:', preValidatedAmount);
    console.log('Nombre de photos depuis hook:', photos.length);
    
    // Vérifier que le paiement a été validé (soit via l'état, soit via le paramètre)
    if (!paymentAlreadyValidated && !paymentValidated) {
      console.log('Paiement non validé, arrêt de la soumission');
      return;
    }
    
    // Ne pas revalider si le paiement est déjà validé
    if (!paymentAlreadyValidated) {
      const validation = validateForm();
      if (!validation.isValid) {
        setErrors(validation.errors);
        
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
        
        Alert.alert(
          'Formulaire incomplet',
          'Veuillez corriger les erreurs dans le formulaire.',
          [{ text: 'OK' }]
        );
        return;
      }
    } else {
      console.log('Paiement validé - Skip de la re-validation du formulaire');
    }

    // Récupérer l'utilisateur si currentUser est null
    let activeUser = currentUser;
    if (!activeUser) {
      console.log('currentUser null, récupération de l\'utilisateur...');
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('Impossible de récupérer l\'utilisateur:', userError);
          Alert.alert('Erreur', 'Session expirée, veuillez vous reconnecter');
          return;
        }
        activeUser = user;
        setCurrentUser(user);
        console.log('Utilisateur récupéré:', user.id);
      } catch (error) {
        console.error('Erreur récupération utilisateur:', error);
        Alert.alert('Erreur', 'Impossible de vérifier votre session');
        return;
      }
    }

    setSubmitting(true);
    
    try {
      console.log('Envoi de la demande personnalisée avec pré-autorisation...');

      // Utiliser le montant pré-validé si disponible
      let parsedAmount;
      
      if (preValidatedAmount && preValidatedAmount > 0) {
        // Utiliser le montant pré-validé du paiement
        parsedAmount = preValidatedAmount;
        console.log('Utilisation du montant pré-validé:', parsedAmount);
      } else {
        // Validation normale du montant
        const cleanAmount = form.proposedAmount.replace(/[^\d.,]/g, '').replace(',', '.');
        parsedAmount = parseFloat(cleanAmount);
        
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          console.error('Montant invalide:', form.proposedAmount, 'parsed:', parsedAmount);
          Alert.alert('Erreur', 'Le montant saisi est invalide. Veuillez vérifier et recommencer.');
          return;
        }
        console.log('Validation normale du montant:', parsedAmount);
      }

      // 📸 UPLOAD DES PHOTOS CORRIGÉ - Système inline identique à create.tsx
      let photoUrls: string[] = [];
      
      if (photos && photos.length > 0) {
        try {
          console.log(`📸 Upload de ${photos.length} photos avec système inline...`);
          photoUrls = await uploadAllPhotos(photos, activeUser.id);
          console.log(`✅ Photos uploadées avec succès: ${photoUrls.length}/${photos.length}`);
          
          // Si certaines photos ont échoué mais pas toutes
          if (photoUrls.length > 0 && photoUrls.length < photos.length) {
            Alert.alert(
              'Upload partiel des photos',
              `${photoUrls.length}/${photos.length} photos ont été uploadées avec succès. Les autres photos n'ont pas pu être uploadées mais votre commande sera créée avec les photos disponibles.`,
              [{ text: 'Continuer', style: 'default' }]
            );
          }
          
        } catch (photoError: any) {
          console.error('❌ Erreur upload photos:', photoError);
          
          let errorMessage = 'Impossible d\'uploader les photos.';
          
          // Messages d'erreur spécifiques
          if (photoError.message?.includes('Bucket not found')) {
            errorMessage = 'Le stockage de photos n\'est pas configuré. Contactez le support technique.';
          } else if (photoError.message?.includes('authentifié')) {
            errorMessage = 'Session expirée. Veuillez vous reconnecter et réessayer.';
          } else if (photoError.message?.includes('network') || photoError.message?.includes('fetch')) {
            errorMessage = 'Problème de connexion lors de l\'upload des photos.';
          }
          
          // Demander à l'utilisateur s'il veut continuer sans photos
          const continueWithoutPhotos = await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Erreur upload photos',
              `${errorMessage}\n\nVoulez-vous continuer la création de votre demande sans photos ?`,
              [
                { text: 'Annuler', onPress: () => resolve(false) },
                { text: 'Continuer sans photos', onPress: () => resolve(true) }
              ]
            );
          });
          
          if (!continueWithoutPhotos) {
            console.log('Utilisateur a annulé suite à l\'erreur photos');
            return;
          }
          
          console.log('Continuation sans photos suite au choix utilisateur');
          photoUrls = [];
        }
      }

      // Construire l'objet addresses
      const addressesData = buildAddressesObject(form, selectedCategory);
      
      // Calculer l'heure de fin si nécessaire
      const endTime = form.startTime && form.duration 
        ? calculateEndTime(form.startTime, form.duration) 
        : null;

      // 💳 STRUCTURE D'INSERTION AVEC PRÉ-AUTORISATION - HARMONISÉE AVEC create.tsx
      const orderData = {
        // IDs et relations
        client_id: activeUser.id,
        service_id: null, // Service personnalisé
        user_id: null,
        fourmiz_id: null,
        
        // Titre et description
        service_title: form.serviceTitle, // Pour les demandes personnalisées
        description: form.description,
        proposed_amount: parsedAmount, // Utilise le montant validé
        
        // Dates et horaires
        date: form.prestationDate || null,
        start_time: form.startTime || null,
        end_time: endTime,
        duration: form.duration ? parseInt(form.duration, 10) : null,
        
        // Adresses (structure complète)
        address: form.address,
        phone: form.phone,
        urgent: form.isUrgent,
        urgency_level: form.isUrgent ? form.urgencyLevel : 'normal',
        invoice_required: form.needsInvoice,
        
        // Statut 
        status: 'en_attente',
        
        // 💳 CHAMPS DE PAIEMENT PRÉ-AUTORISATION - IDENTIQUES À create.tsx
        payment_status: 'authorized',
        payment_authorized_at: new Date().toISOString(),
        authorization_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        payment_captured_at: null,
        payment_intent_id: paymentIntentId || null,
        
        // Candidatures multiples
        allow_multiple_candidates: form.allowMultipleCandidates,
        
        // 📸 URLs des photos corrigées
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
        
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
        commission: null,
        
        // Champs spécifiques pour demandes personnalisées
        equipment: form.equipment || null,
        package_number: form.packageNumber || null,
      };

      console.log('📝 Données de demande personnalisée à insérer (avec pré-autorisation):', {
        service_title: orderData.service_title,
        proposed_amount: orderData.proposed_amount,
        payment_status: orderData.payment_status,
        authorization_expires_at: orderData.authorization_expires_at,
        allow_multiple_candidates: orderData.allow_multiple_candidates,
        photos_count: photoUrls.length
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

      console.log('✅ Demande personnalisée créée avec succès:', insertResult.id);

      // Traitement du parrainage client
      try {
        await supabase.rpc('process_referral_for_order', { 
          order_id_input: insertResult.id 
        });
        console.log('✅ Parrainage client traité pour demande personnalisée:', insertResult.id);
      } catch (referralError) {
        console.error('⚠️ Erreur traitement parrainage:', referralError);
        // Ne pas bloquer la création de commande pour une erreur de parrainage
      }

      const photoText = photoUrls.length > 0 ? `\n📸 ${photoUrls.length} photo${photoUrls.length > 1 ? 's' : ''} jointe${photoUrls.length > 1 ? 's' : ''}` : '';

      // 💳 MESSAGE UTILISATEUR HARMONISÉ AVEC create.tsx - PRÉ-AUTORISATION
      Alert.alert(
        'Demande créée et paiement pré-autorisé !',
        `Votre demande personnalisée #${insertResult.id} "${form.serviceTitle}" a été créée avec succès.\n\n💳 Votre paiement de ${parsedAmount.toFixed(2)}€ est pré-autorisé et sera débité dès qu'une Fourmiz acceptera votre mission.${photoText}`,
        [
          { 
            text: 'Voir mes commandes', 
            onPress: () => router.push('/(tabs)/orders')
          }
        ]
      );

    } catch (error: any) {
      console.error('❌ Erreur création demande:', error);
      handleError(error, 'order_creation');
    } finally {
      setSubmitting(false);
      setPaymentValidated(false);
    }
  }, [validateForm, currentUser, form, selectedCategory, handleError, calculateEndTime, calculateUrgencySurcharge, buildAddressesObject, paymentValidated, router, photos, uploadAllPhotos]);

  // Validation pour la synthèse
  const validateFormForSummary = useCallback(() => {
    console.log('Début validation synthèse custom...');
    
    const validation = validateForm();
    
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
  }, [validateForm]);

  // Fonction pour rendre un champ conditionnel
  const renderField = useCallback((fieldName: string, label: string, component: React.ReactNode) => {
    if (!shouldShowField(fieldName)) return null;
    
    const required = isFieldRequired(fieldName);
    const adaptiveLabel = getFieldLabel(fieldName, label);
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {adaptiveLabel} {required && '*'}
        </Text>
        {component}
      </View>
    );
  }, [shouldShowField, isFieldRequired, getFieldLabel]);

  // GESTION DES ERREURS DE CHARGEMENT 

  if (categoriesError) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Nouvelle demande personnalisée' }} />
        <ErrorDisplay 
          error={categoriesError} 
          onRetry={retryLoad}
          isRetrying={categoriesLoading}
        />
      </SafeAreaView>
    );
  }

  if (categoriesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Nouvelle demande personnalisée' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement des catégories...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // RENDU PRINCIPAL

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Nouvelle demande personnalisée',
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
      
      <View style={styles.container}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          removeClippedSubviews={false}
        >
          {/* Bouton de retour visible */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.backToServicesButton}
              onPress={() => router.push('/(tabs)/services')}
            >
              <Ionicons name="arrow-back-circle" size={16} color="#333333" />
              <Text style={styles.backToServicesText}>Retour aux services disponibles</Text>
            </TouchableOpacity>
          </View>

          {/* Sélection de catégorie avec menu déroulant automatique */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catégorie (obligatoire pour passer commande)*</Text>
            
            {/* Champ de recherche avec dropdown automatique */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={16} color="#666666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Proposer un mot clé..."
                placeholderTextColor="#999999"
                value={searchTerm}
                onChangeText={handleSearchChange}
                returnKeyType="search"
                onFocus={() => {
                  handleInputFocus();
                  if (searchTerm.trim().length > 0 && filteredCategories.length > 0) {
                    setShowSearchDropdown(true);
                  }
                }}
                onBlur={handleInputBlur}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => {
                    setSearchTerm('');
                    setShowSearchDropdown(false);
                  }}
                >
                  <Ionicons name="close-circle" size={16} color="#666666" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Menu déroulant automatique */}
            {showSearchDropdown && filteredCategories.length > 0 && (
              <View style={styles.searchDropdown}>
                {filteredCategories.slice(0, 5).map((category, index) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.searchDropdownItem,
                      index === filteredCategories.slice(0, 5).length - 1 && styles.searchDropdownItemLast
                    ]}
                    onPress={() => handleSearchSelect(category)}
                  >
                    <Ionicons name="arrow-forward" size={14} color="#666666" style={styles.searchDropdownIcon} />
                    <Text style={styles.searchDropdownText}>{category}</Text>
                  </TouchableOpacity>
                ))}
                {filteredCategories.length > 5 && (
                  <View style={styles.searchDropdownMore}>
                    <Text style={styles.searchDropdownMoreText}>
                      +{filteredCategories.length - 5} autres catégories
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            <DropdownButton
              value={selectedCategory}
              placeholder="Choisir une catégorie"
              onPress={() => setShowCategoryPicker(true)}
              error={!!errors.category}
            />
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>

          {/* Titre du service personnalisé */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Titre de votre demande *</Text>
            <TextInput 
              style={[styles.input, errors.serviceTitle && styles.inputError]}
              placeholder="Ex: Aide au déménagement, Cours de guitare..."
              placeholderTextColor="#999999"
              value={form.serviceTitle}
              onChangeText={(text) => updateForm('serviceTitle', text)}
              maxLength={100}
              returnKeyType="done"
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            {errors.serviceTitle && <Text style={styles.errorText}>{errors.serviceTitle}</Text>}
          </View>

          {/* Affichage conditionnel selon la catégorie */}
          {selectedCategory && (
            <>
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
                <Text style={styles.sectionTitle}>Description *</Text>
                <TextInput 
                  style={[styles.textArea, errors.description && styles.inputError]}
                  placeholder="Décrivez précisément votre demande personnalisée..."
                  placeholderTextColor="#999999"
                  value={form.description}
                  onChangeText={(text) => updateForm('description', text)}
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                  returnKeyType="done"
                  textAlignVertical="top"
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                <Text style={styles.characterCount}>
                  {form.description.length}/1000 caractères
                </Text>
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
              </View>

              {/* 📸 SECTION PHOTOS CORRIGÉE - Système inline identique à create.tsx */}
              <View style={styles.section}>
                <PhotoSection 
                  photos={photos} 
                  onPhotosChange={handlePhotosChange}
                  maxPhotos={5}
                />
              </View>

              {/* Adresse */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{getFieldLabel('adresse_lieu', 'Adresse')} communiquée au seul prestataire Fourmiz validé *</Text>
                <TextInput 
                  style={[styles.input, errors.address && styles.inputError]}
                  placeholder={selectedCategory === 'transport' ? 'Adresse de départ complète' : 'Adresse complète (rue, numéro)'}
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
              {shouldShowField('cp_ville') && (
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
              )}

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

                {shouldShowField('telephone_alt') && (
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
                )}
              </View>

              {/* Candidatures multiples - toujours affiché pour demandes personnalisées */}
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
              {shouldShowField('date') && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Date de prestation{!form.isUrgent ? ' *' : ' (facultative)'}
                  </Text>
                  
                  {/* Champ "Dès que possible" avec même style que dropdown */}
                  <View style={styles.urgentDropdownField}>
                    <Text style={styles.urgentDropdownText}>Dès que possible</Text>
                    <Switch
                      value={form.isUrgent}
                      onValueChange={handleUrgentToggle}
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
                  
                  {/* BOUTON CALENDRIER */}
                  <DropdownButton
                    value={form.prestationDate ? getSelectedDateLabel() : undefined}
                    placeholder={form.isUrgent ? "Choisir une date (facultatif)" : "Choisir une date"}
                    onPress={() => setShowCalendarPicker(true)}
                    icon="calendar"
                    error={!form.isUrgent && !!errors.prestationDate}
                  />
                  {!form.isUrgent && errors.prestationDate && <Text style={styles.errorText}>{errors.prestationDate}</Text>}
                </View>
              )}

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

              {/* Adresses spécifiques transport */}
              {selectedCategory === 'transport' && shouldShowField('lieu_arrivee') && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Destination</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="Adresse d'arrivée complète"
                    placeholderTextColor="#999999"
                    value={form.arrivalAddress}
                    onChangeText={(text) => updateForm('arrivalAddress', text)}
                    returnKeyType="done"
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                  
                  <View style={styles.row}>
                    <View style={styles.halfWidth}>
                      <Text style={styles.subSectionTitle}>Code postal destination</Text>
                      <TextInput 
                        style={styles.input}
                        placeholder="Ex: 75001"
                        placeholderTextColor="#999999"
                        value={form.arrivalPostalCode}
                        onChangeText={(text) => updateForm('arrivalPostalCode', text)}
                        keyboardType="numeric"
                        maxLength={5}
                        returnKeyType="done"
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                      />
                    </View>
                    
                    <View style={styles.halfWidth}>
                      <Text style={styles.subSectionTitle}>Ville destination</Text>
                      <TextInput 
                        style={styles.input}
                        placeholder="Ex: Paris"
                        placeholderTextColor="#999999"
                        value={form.arrivalCity}
                        onChangeText={(text) => updateForm('arrivalCity', text)}
                        returnKeyType="done"
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Informations spécifiques Livraison */}
              {selectedCategory === 'Livraison' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Informations livraison</Text>
                  
                  {shouldShowField('heure_retrait') && (
                    <View style={styles.phoneField}>
                      <Text style={styles.subSectionTitle}>Heure de retrait</Text>
                      <DropdownButton
                        value={form.pickupTime}
                        placeholder="Choisir"
                        onPress={() => setShowPickupTimePicker(true)}
                        icon="time"
                      />
                    </View>
                  )}

                  {shouldShowField('lieu_livraison') && (
                    <View style={styles.phoneField}>
                      <Text style={styles.subSectionTitle}>Adresse de livraison</Text>
                      <TextInput 
                        style={styles.input}
                        placeholder="Adresse complète de livraison"
                        placeholderTextColor="#999999"
                        value={form.deliveryAddress}
                        onChangeText={(text) => updateForm('deliveryAddress', text)}
                        returnKeyType="done"
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Numéro de colis pour Livraison */}
              {renderField('numero_colis', 'Numéro de colis', (
                <View>
                  <TextInput 
                    style={[styles.input, errors.packageNumber && styles.inputError]}
                    placeholder="Numéro de colis à récupérer"
                    placeholderTextColor="#999999"
                    value={form.packageNumber}
                    onChangeText={(text) => updateForm('packageNumber', text)}
                    returnKeyType="done"
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                  {errors.packageNumber && <Text style={styles.errorText}>{errors.packageNumber}</Text>}
                </View>
              ))}

              {/* Matériel pour Bricolage */}
              {renderField('materiel', 'Matériel nécessaire', (
                <View>
                  <TextInput 
                    style={[styles.textArea, errors.equipment && styles.inputError]}
                    placeholder="Décrivez le matériel nécessaire (outils, fournitures...)"
                    placeholderTextColor="#999999"
                    value={form.equipment}
                    onChangeText={(text) => updateForm('equipment', text)}
                    multiline
                    numberOfLines={3}
                    returnKeyType="done"
                    textAlignVertical="top"
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                  {errors.equipment && <Text style={styles.errorText}>{errors.equipment}</Text>}
                </View>
              ))}

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
            </>
          )}

          <View style={styles.keyboardSpacer} />
        </ScrollView>

      {/* Modal sélection catégorie avec gestion candidatures multiples */}
      <SelectModal
        visible={showCategoryPicker}
        title="Choisir une catégorie"
        options={filteredCategories.map(cat => ({ value: cat, label: cat }))}
        selectedValue={selectedCategory}
        onSelect={(value) => {
          setSelectedCategory(value);
          setShowCategoryPicker(false);
          setSearchTerm(''); // Effacer la recherche après sélection
          
          // Réinitialiser le titre si changement de catégorie
          if (selectedCategory !== value) {
            setForm(prev => ({ 
              ...prev, 
              serviceTitle: '',
              allowMultipleCandidates: true,
            }));
          }
        }}
        onCancel={() => setShowCategoryPicker(false)}
      />

      {/* CALENDRIER DE SÉLECTION DE DATE */}
      <CalendarPicker
        visible={showCalendarPicker}
        selectedDate={form.prestationDate}
        onSelectDate={handleDateSelect}
        onCancel={() => setShowCalendarPicker(false)}
      />

      {/* 💳 MODAL SYNTHÈSE AVEC PAIEMENT PRÉ-AUTORISATION - HARMONISÉE AVEC create.tsx */}
      <Modal visible={showSummary} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.summaryModal}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Synthèse de la demande</Text>
            <TouchableOpacity onPress={() => setShowSummary(false)}>
              <Ionicons name="close" size={24} color="#333333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.summaryContent}>
            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Demande personnalisée</Text>
              <Text style={styles.summaryItem}>• Titre : {form.serviceTitle}</Text>
              <Text style={styles.summaryItem}>• Catégorie : {selectedCategory}</Text>
              <Text style={styles.summaryItem}>• Montant proposé : {form.proposedAmount}€</Text>
              {form.isUrgent && (
                <Text style={styles.summaryUrgent}>• Dès que possible - {getUrgencyLabel(form.urgencyLevel)}</Text>
              )}
              {shouldShowMultipleCandidatesOption() && (
                <Text style={styles.summaryItem}>
                  • Candidatures multiples : {form.allowMultipleCandidates ? 'Oui' : 'Non'}
                </Text>
              )}
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Localisation</Text>
              <Text style={styles.summaryItem}>• Adresse : {form.address}</Text>
              <Text style={styles.summaryItem}>• {form.postalCode} {form.city}</Text>
              
              {selectedCategory === 'transport' && form.arrivalAddress && (
                <>
                  <Text style={styles.summaryItem}>• Destination : {form.arrivalAddress}</Text>
                  <Text style={styles.summaryItem}>• {form.arrivalPostalCode} {form.arrivalCity}</Text>
                </>
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
                
                {form.departureTime && (
                  <Text style={styles.summaryItem}>• Heure de départ : {form.departureTime}</Text>
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

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Contact</Text>
              <Text style={styles.summaryItem}>• Téléphone : {form.phone}</Text>
              {form.alternativePhone && (
                <Text style={styles.summaryItem}>• Téléphone alternatif : {form.alternativePhone}</Text>
              )}
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Description</Text>
              <Text style={styles.summaryDescription}>{form.description}</Text>
            </View>

            {/* 📸 SECTION PHOTOS DANS LA SYNTHÈSE - CORRIGÉE */}
            {photos && photos.length > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.summarySectionTitle}>Photos jointes</Text>
                <PhotoSummary photos={photos} />
              </View>
            )}

            {form.packageNumber && (
              <View style={styles.summarySection}>
                <Text style={styles.summarySectionTitle}>Colis</Text>
                <Text style={styles.summaryItem}>• Numéro : {form.packageNumber}</Text>
              </View>
            )}

            {form.equipment && (
              <View style={styles.summarySection}>
                <Text style={styles.summarySectionTitle}>Matériel</Text>
                <Text style={styles.summaryDescription}>{form.equipment}</Text>
              </View>
            )}

            {/* 💳 SECTION PAIEMENT PRÉ-AUTORISATION - HARMONISÉE AVEC create.tsx */}
            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Pré-autorisation de paiement</Text>
              <Text style={styles.summaryItem}>• Montant à pré-autoriser : {form.proposedAmount}€</Text>
              <Text style={styles.summaryPaymentNote}>
                Le paiement sera pré-autorisé maintenant et débité automatiquement dès qu'une Fourmiz acceptera votre mission. L'autorisation expire dans 7 jours si aucune Fourmiz n'accepte.
              </Text>
            </View>
          </ScrollView>

          {/* 💳 ACTIONS AVEC PRÉ-AUTORISATION - HARMONISÉES AVEC create.tsx */}
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

      {/* 💳 MODAL DE PAIEMENT STRIPE - IDENTIQUE À create.tsx */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        order={{
          id: 0,
          service_title: form.serviceTitle,
          proposed_amount: parseFloat(form.proposedAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
          description: form.description,
          date: form.prestationDate,
          address: form.address,
          city: form.city
        }}
        loading={processingPayment}
      />

      {/* Modals de sélection avec ascenseur 12h */}
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
        visible={showDepartureTimePicker}
        title="Heure de départ"
        options={timeSlots.map(time => ({ value: time, label: time }))}
        selectedValue={form.departureTime}
        onSelect={(value) => {
          updateForm('departureTime', value);
          setShowDepartureTimePicker(false);
        }}
        onCancel={() => setShowDepartureTimePicker(false)}
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

      <SelectModal
        visible={showPickupTimePicker}
        title="Heure de retrait"
        options={timeSlots.map(time => ({ value: time, label: time }))}
        selectedValue={form.pickupTime}
        onSelect={(value) => {
          updateForm('pickupTime', value);
          setShowPickupTimePicker(false);
        }}
        onCancel={() => setShowPickupTimePicker(false)}
      />
      </View>
    </SafeAreaView>
  );
}

// STYLES COMPLETS (IDENTIQUES À create.tsx avec ajouts pour create-custom + photos)
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
    paddingHorizontal: 20,
    position: 'relative',
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
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    marginBottom: 10,
    position: 'relative',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: '#000000',
    textAlignVertical: 'center',
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 4,
  },
  
  // Menu déroulant automatique de recherche
  searchDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    zIndex: 1000,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchDropdownItemLast: {
    borderBottomWidth: 0,
  },
  searchDropdownIcon: {
    marginRight: 8,
  },
  searchDropdownText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '500',
  },
  searchDropdownMore: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  searchDropdownMoreText: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
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
  
  // STYLES POUR CANDIDATURES MULTIPLES
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
  characterCount: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
    marginTop: 4,
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

  // STYLES CALENDRIER
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
  
  // Modal de sélection générique
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
  categoryScroll: { 
    maxHeight: 250 
  },
});
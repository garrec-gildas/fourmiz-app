// app/auth/complete-profile.tsx - VERSION FINALE COMPLÈTE - CORRIGÉE POUR MODIFICATION PROFIL
// Interface douce + Validation coordonnées territoires français + Toutes fonctionnalités + Fix erreur contrainte FK + Système photo complet

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  Image,
  KeyboardAvoidingView,
  ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LegalEngagementsSection } from '../../src/components/LegalEngagementsSection';
import type { 
  EngagementFormData, 
  EngagementValidation 
} from '../../src/types/legal-engagements';

import { AddressInputWithAutocomplete } from '../../src/components/AddressInputWithAutocomplete';
import { validateAddressFormat, validatePostalCodeCityCoherence } from '../../src/utils/addressValidation';
import type { AddressSuggestion } from '../../src/types/address';

import { TrackingConsentSection, useTrackingConsents } from '../../src/components/TrackingConsentSection';
import type { TrackingConsents } from '../../src/components/TrackingConsentSection';

import {
  supabase,
  handleSupabaseError,
  getCurrentUser,
  getCurrentSession,
  uploadFile,
  Database
} from '../../lib/supabase';

import { useRoleManagerAdapter } from '../../hooks/useRoleManagerAdapter';

// Types TypeScript
type UserRole = 'client' | 'fourmiz';
type LegalStatus = 'particulier' | 'travailleur_independant' | 'entreprise';
type ProfileUpdate = Database['public']['tables']['profiles']['Update'];
type ProfileInsert = Database['public']['tables']['profiles']['Insert'];
type AddressInputMode = 'manual' | 'autocomplete';

interface CompleteProfileFormData {
  roles: UserRole[];
  firstname: string;
  lastname: string;
  phone: string;
  address: string;
  building: string;
  floor: string;
  postalCode: string;
  city: string;
  legalStatus: LegalStatus;
  rcsNumber: string;
  idDocumentUri: string | null;
  existingDocumentUrl: string | null;
  avatarUri: string | null;
  existingAvatarUrl: string | null;
  selectedAddressCoordinates: {
    latitude: number;
    longitude: number;
  } | null;
  addressValidationStatus: {
    isValidated: boolean;
    confidence?: number;
    formattedAddress?: string;
  };
}

interface FormErrors {
  roles?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  legalStatus?: string;
  rcsNumber?: string;
  idDocument?: string;
}

interface UserSession {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      firstname?: string;
      lastname?: string;
      phone?: string;
    };
  };
}

interface UiState {
  sessionLoading: boolean;
  uploading: boolean;
  uploadingDocument: boolean;
  uploadingAvatar: boolean;
  creatingReferralCode: boolean;
  prefilling: boolean;
  syncingRoles: boolean;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fallbackUsed?: boolean;
}

interface StrictValidationResult {
  isValid: boolean;
  message: string;
}

// Constantes
const ROLE_CONFIG = {
  client: {
    emoji: '👤',
    label: 'Client',
    description: 'Demander des services'
  },
  fourmiz: {
    emoji: '🐜',
    label: 'Fourmiz',
    description: 'Offrir des services'
  }
} as const;

const LEGAL_STATUS_CONFIG = {
  particulier: {
    emoji: '👤',
    label: 'Particulier',
    description: 'Personne physique offrant ses services de manière occasionnelle'
  },
  travailleur_independant: {
    emoji: '💼',
    label: 'Travailleur indépendant',
    description: 'Auto-entrepreneur, micro-entreprise, profession libérale'
  },
  entreprise: {
    emoji: '🏢',
    label: 'Entreprise',
    description: 'Société (SARL, SAS, EURL...) avec numéro RCS'
  }
} as const;

const VALIDATION_RULES = {
  phone: /^(\+33|0)[1-9](\d{8})$/,
  postalCode: /^[0-9]{5}$/,
  minNameLength: 2,
  minAddressLength: 10,
  minRcsLength: 9,
} as const;

const UPLOAD_CONFIG = {
  maxRetries: 3,
  timeoutMs: 30000,
  chunkSize: 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  maxSizeMB: 10,
  useUint8Array: true,
  validateAfterUpload: true,
  maxValidationRetries: 15
};

// Fonctions utilitaires
const clearRoleCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('user_last_role_preference');
    await AsyncStorage.removeItem('savedRole');
    console.log('Cache des rôles nettoyé');
  } catch (error) {
    console.warn('Erreur nettoyage cache rôles:', error);
  }
};

const formatPhoneNumber = (phone: string): string => {
  if (!phone || phone.trim() === '') return '';
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length < 6) return numbers;
  if (numbers.length >= 10) {
    return numbers.slice(0, 10).replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  if (numbers.length >= 8) {
    return numbers.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
  }
  if (numbers.length >= 6) {
    return numbers.replace(/(\d{2})(\d{2})(\d{2})/, '$1 $2 $3');
  }
  return numbers;
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Upload timeout')), ms)
    )
  ]);
};

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
    throw new Error('Conversion échouée: ' + (error as Error).message);
  }
};

const validateUploadedFile = async (
  publicUrl: string, 
  expectedMinSize: number = 1000,
  maxRetries: number = 15
): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
      
      const response = await fetch(publicUrl, { 
        method: 'HEAD',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      const contentLength = response.headers.get('content-length');
      const fileSize = contentLength ? parseInt(contentLength) : 0;
      
      if (response.ok && fileSize >= expectedMinSize) {
        return true;
      }
      
    } catch (error) {
      // Silent retry
    }
  }
  
  return false;
};

// Gestionnaire d'erreurs pour profil manquant
const safeGetProfile = async (userId: string, retries: number = 3): Promise<any> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profil manquant - créer un profil minimal
          console.log('Profil manquant détecté, création d\'un profil minimal...');
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: userId,
              email: '', // Sera mis à jour lors de la soumission
              firstname: '',
              lastname: '',
              phone: '',
              address: '',
              postal_code: '',
              city: '',
              roles: ['client'],
              legal_status: 'particulier',
              profile_completed: false,
              criteria_completed: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (createError) {
            throw createError;
          }
          
          return newProfile;
        }
        
        throw error;
      }
      
      return profile;
      
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      // Attendre avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

export default function CompleteProfileScreen() {
  const { 
    roles: paramRoles, 
    force_edit, 
    from, 
    redirect_to,
    edit_mode,
    focus
  } = useLocalSearchParams();
  
  const initialRoles = useMemo(() => {
    return (paramRoles as string)?.split(',').filter(role => 
      ['client', 'fourmiz'].includes(role)
    ) as UserRole[] || [];
  }, [paramRoles]);

  const isEditMode = force_edit === 'true' || from === 'profile';

  // Refs pour éviter les re-exécutions
  const stableRefs = useRef({
    sessionLoaded: false,
    dataLoaded: false,
    initialized: false
  });

  const { reloadProfile, currentRole } = useRoleManagerAdapter();

  // States pour contrôler l'affichage et la navigation
  const [rolesConfirmed, setRolesConfirmed] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  
  // State pour gérer la cohérence adresse
  const [addressInputMode, setAddressInputMode] = useState<AddressInputMode>('manual');

  // States
  const [session, setSession] = useState<UserSession | null>(null);
  const [formData, setFormData] = useState<CompleteProfileFormData>({
    roles: initialRoles,
    firstname: '',
    lastname: '',
    phone: '',
    address: '',
    building: '',
    floor: '',
    postalCode: '',
    city: '',
    legalStatus: 'particulier',
    rcsNumber: '',
    idDocumentUri: null,
    existingDocumentUrl: null,
    avatarUri: null,
    existingAvatarUrl: null,
    selectedAddressCoordinates: null,
    addressValidationStatus: {
      isValidated: false
    },
  });

  const [uiState, setUiState] = useState<UiState>({
    sessionLoading: true,
    uploading: false,
    uploadingDocument: false,
    uploadingAvatar: false,
    creatingReferralCode: false,
    prefilling: false,
    syncingRoles: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // States pour composants enfants
  const [trackingConsents, setTrackingConsents] = useState<TrackingConsents>({
    mission: true,
    offDuty: false,
    dataRetention: 30
  });

  const [engagementFormData, setEngagementFormData] = useState<EngagementFormData>({});
  const [engagementValidation, setEngagementValidation] = useState<EngagementValidation>({
    isValid: true,
    acceptedCount: 0,
    totalRequired: 0
  });

  const { saveConsents: saveTrackingConsents, isLoading: isTrackingLoading } = useTrackingConsents(session?.user?.id);

  // Effects pour gérer rolesConfirmed et bouton retour en mode édition
  useEffect(() => {
    if (isEditMode) {
      setRolesConfirmed(true);
      setShowBackButton(false); 
      if (formData.addressValidationStatus.isValidated) {
        setAddressInputMode('autocomplete');
      }
    }
  }, [isEditMode, formData.addressValidationStatus.isValidated]);

  // Effect pour gérer l'affichage du bouton retour
  useEffect(() => {
    if (rolesConfirmed && !isEditMode && formData.roles.length > 0) {
      setShowBackButton(true);
    } else {
      setShowBackButton(false);
    }
  }, [rolesConfirmed, isEditMode, formData.roles.length]);

  // Fonction pour revenir à la sélection des rôles
  const handleBackToRoleSelection = useCallback(() => {
    setRolesConfirmed(false);
    setShowBackButton(false);
  }, []);

  // Fonction pour confirmer les rôles
  const handleConfirmRoles = useCallback(() => {
    if (formData.roles.length > 0) {
      setRolesConfirmed(true);
      setShowBackButton(true);
    }
  }, [formData.roles.length]);

  // Callbacks stabilisés
  const handleEngagementFormDataChange = useCallback((data: Partial<EngagementFormData>) => {
    setEngagementFormData(prev => ({ ...prev, ...data }));
  }, []);

  const handleEngagementValidationChange = useCallback((validation: EngagementValidation) => {
    setEngagementValidation(validation);
  }, []);

  const handleTrackingConsentChange = useCallback((newConsents: TrackingConsents) => {
    setTrackingConsents(newConsents);
    console.log('Consentements tracking mis à jour:', newConsents);
  }, []);

  // Gestion cohérence adresse - Sélection via autocomplétion
  const handleAddressSelected = useCallback((selectedAddress: AddressSuggestion) => {
    console.log('Adresse sélectionnée:', selectedAddress);
    
    let streetAddress = selectedAddress.label;
    
    if (selectedAddress.postcode && selectedAddress.city) {
      streetAddress = streetAddress
        .replace(/,\s*\d{5}\s*.*$/i, '') 
        .replace(/\s+\d{5}\s*.*$/i, '')  
        .trim();
      
      if (selectedAddress.city) {
        const escapedCity = selectedAddress.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const cityRegex = new RegExp('\\s*,?\\s*' + escapedCity + '.*$', 'gi');
        streetAddress = streetAddress.replace(cityRegex, '');
      }
      
      if (selectedAddress.postcode) {
        const escapedPostcode = selectedAddress.postcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const postcodeRegex = new RegExp('\\s*,?\\s*' + escapedPostcode + '.*$', 'gi');
        streetAddress = streetAddress.replace(postcodeRegex, '');
      }
      
      streetAddress = streetAddress.trim();
      
      if (streetAddress.length < 5) {
        streetAddress = selectedAddress.label;
      }
    }
    
    console.log('Adresse nettoyée:', streetAddress);
    
    setAddressInputMode('autocomplete');
    
    setFormData(prev => ({
      ...prev,
      address: streetAddress,
      selectedAddressCoordinates: {
        latitude: selectedAddress.coordinates[1],
        longitude: selectedAddress.coordinates[0]
      },
      addressValidationStatus: {
        isValidated: true,
        confidence: selectedAddress.score,
        formattedAddress: selectedAddress.label
      },
      postalCode: selectedAddress.postcode || prev.postalCode,
      city: selectedAddress.city || prev.city
    }));
    
    setErrors(prev => ({ 
      ...prev, 
      address: undefined, 
      postalCode: undefined, 
      city: undefined 
    }));
  }, []);

  // INTERFACE DOUCE - Gestion cohérence adresse - Modification manuelle de l'adresse
  const handleManualAddressChange = useCallback((text: string) => {
    if (addressInputMode === 'autocomplete') {
      setAddressInputMode('manual');
      setFormData(prev => ({
        ...prev,
        address: text,
        addressValidationStatus: { isValidated: false },
        selectedAddressCoordinates: null
      }));
    } else {
      setFormData(prev => ({ ...prev, address: text }));
      setErrors(prev => ({ ...prev, address: undefined }));
    }
  }, [addressInputMode]);

  // INTERFACE DOUCE - Code postal avec messages bienveillants
  const handlePostalCodeChange = useCallback((text: string) => {
    if (addressInputMode === 'autocomplete') {
      Alert.alert(
        'Préserver la cohérence de votre adresse',
        'Pour garantir la précision de votre localisation, nous recommandons de conserver le code postal validé automatiquement.\n\nSouhaitez-vous modifier manuellement votre adresse ?',
        [
          { text: 'Conserver', style: 'cancel' },
          { 
            text: 'Modifier manuellement', 
            onPress: () => {
              setAddressInputMode('manual');
              setFormData(prev => ({
                ...prev,
                postalCode: text,
                addressValidationStatus: { isValidated: false },
                selectedAddressCoordinates: null
              }));
              setErrors(prev => ({ ...prev, postalCode: undefined }));
            }
          }
        ]
      );
    } else {
      setFormData(prev => ({ ...prev, postalCode: text }));
      setErrors(prev => ({ ...prev, postalCode: undefined }));
    }
  }, [addressInputMode]);

  // INTERFACE DOUCE - Ville avec messages bienveillants
  const handleCityChange = useCallback((text: string) => {
    if (addressInputMode === 'autocomplete') {
      Alert.alert(
        'Préserver la cohérence de votre adresse',
        'Pour garantir la précision de votre localisation, nous recommandons de conserver la ville validée automatiquement.\n\nSouhaitez-vous modifier manuellement votre adresse ?',
        [
          { text: 'Conserver', style: 'cancel' },
          { 
            text: 'Modifier manuellement', 
            onPress: () => {
              setAddressInputMode('manual');
              setFormData(prev => ({
                ...prev,
                city: text,
                addressValidationStatus: { isValidated: false },
                selectedAddressCoordinates: null
              }));
              setErrors(prev => ({ ...prev, city: undefined }));
            }
          }
        ]
      );
    } else {
      setFormData(prev => ({ ...prev, city: text }));
      setErrors(prev => ({ ...prev, city: undefined }));
    }
  }, [addressInputMode]);

  // INTERFACE DOUCE - Fonction pour repasser en mode manuel
  const handleSwitchToManualMode = useCallback(() => {
    Alert.alert(
      'Passer en saisie manuelle',
      'En saisissant manuellement votre adresse, nous vous recommandons d\'utiliser l\'autocomplétion pour assurer la précision de votre localisation.\n\nContinuer en saisie manuelle ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Continuer', 
          onPress: () => {
            setAddressInputMode('manual');
            setFormData(prev => ({
              ...prev,
              addressValidationStatus: { isValidated: false },
              selectedAddressCoordinates: null
            }));
          }
        }
      ]
    );
  }, []);

  // Validation finale
  const validateFinalDataForDatabase = useMemo(() => {
    return (data: CompleteProfileFormData): string | null => {
      console.log('Validation finale des données:', {
        roles: data.roles,
        phone: data.phone,
        postalCode: data.postalCode,
        isFourmiz: data.roles.includes('fourmiz'),
        addressValidated: data.addressValidationStatus.isValidated,
        addressInputMode: addressInputMode
      });

      if (!data.roles || data.roles.length === 0) {
        return 'Aucun rôle sélectionné - impossible de sauvegarder';
      }

      const phoneClean = data.phone.replace(/\s/g, '');
      if (!VALIDATION_RULES.phone.test(phoneClean)) {
        return 'Format téléphone invalide: ' + data.phone;
      }

      if (!VALIDATION_RULES.postalCode.test(data.postalCode)) {
        return 'Code postal invalide: ' + data.postalCode;
      }

      if (addressInputMode === 'manual' && !data.addressValidationStatus.isValidated) {
        return 'Adresse non validée - utilisez l\'autocomplétion pour garantir la cohérence';
      }

      if (data.roles.includes('fourmiz')) {
        if (!data.idDocumentUri && !data.existingDocumentUrl) {
          return 'Document d\'identité manquant pour Fourmiz';
        }

        if (!engagementValidation.isValid) {
          return 'Engagements légaux non validés pour Fourmiz';
        }
      }

      console.log('Validation finale réussie');
      return null;
    };
  }, [engagementValidation.isValid, addressInputMode]);

  // Synchronisation des rôles
  const syncRolesAfterSave = useCallback(async (newRoles: UserRole[]): Promise<void> => {
    console.log('Début synchronisation des rôles:', newRoles);
    setUiState(prev => ({ ...prev, syncingRoles: true }));

    try {
      await clearRoleCache();
      
      if (reloadProfile) {
        console.log('Rechargement forcé du profil...');
        await reloadProfile();
      }

      const primaryRole = newRoles.includes('fourmiz') ? 'fourmiz' : 'client';
      await AsyncStorage.setItem('user_last_role_preference', primaryRole);
      console.log('Nouvelle préférence de rôle sauvée:', primaryRole);

      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('Synchronisation des rôles terminée');
    } catch (error) {
      console.error('Erreur synchronisation rôles:', error);
    } finally {
      setUiState(prev => ({ ...prev, syncingRoles: false }));
    }
  }, [reloadProfile]);

  // VALIDATION DES COORDONNÉES POUR TERRITOIRES FRANÇAIS
  const isValidOverseasCoordinates = useCallback((latitude: number, longitude: number): boolean => {
    // Territoires français d'outre-mer et leurs plages de coordonnées
    const overseasTerritories = [
      // Martinique
      { latMin: 14.3, latMax: 14.9, lonMin: -61.3, lonMax: -60.8 },
      // Guadeloupe  
      { latMin: 15.8, latMax: 16.5, lonMin: -61.9, lonMax: -61.0 },
      // Guyane française
      { latMin: 2.1, latMax: 5.8, lonMin: -54.6, lonMax: -51.6 },
      // Réunion
      { latMin: -21.4, latMax: -20.9, lonMin: 55.2, lonMax: 55.8 },
      // Mayotte
      { latMin: -13.0, latMax: -12.6, lonMin: 45.0, lonMax: 45.3 },
      // Nouvelle-Calédonie
      { latMin: -22.7, latMax: -19.9, lonMin: 163.0, lonMax: 168.0 },
      // Polynésie française (Tahiti)
      { latMin: -18.2, latMax: -17.4, lonMin: -149.9, lonMax: -149.1 },
      // Saint-Pierre-et-Miquelon
      { latMin: 46.7, latMax: 47.2, lonMin: -56.4, lonMax: -56.1 },
      // Wallis-et-Futuna
      { latMin: -14.4, latMax: -13.2, lonMin: -178.2, lonMax: -176.1 },
      // France métropolitaine
      { latMin: 41.0, latMax: 51.2, lonMin: -5.5, lonMax: 9.9 }
    ];

    return overseasTerritories.some(territory => 
      latitude >= territory.latMin && latitude <= territory.latMax &&
      longitude >= territory.lonMin && longitude <= territory.lonMax
    );
  }, []);

  // INTERFACE DOUCE - Validation stricte avec messages bienveillants
  const validateStrictRequirements = useMemo((): StrictValidationResult => {
    if (formData.roles.length === 0) {
      return { isValid: false, message: 'Choisissez votre profil pour commencer (Client, Fourmiz, ou les deux)' };
    }

    if (!formData.firstname?.trim() || formData.firstname.trim().length < VALIDATION_RULES.minNameLength) {
      return { isValid: false, message: 'Votre prénom nous aidera à personnaliser votre expérience (minimum 2 caractères)' };
    }
    
    if (!formData.lastname?.trim() || formData.lastname.trim().length < VALIDATION_RULES.minNameLength) {
      return { isValid: false, message: 'Votre nom est nécessaire pour créer votre profil (minimum 2 caractères)' };
    }

    const phoneClean = formData.phone?.replace(/\s/g, '') || '';
    if (!phoneClean || !VALIDATION_RULES.phone.test(phoneClean)) {
      return { isValid: false, message: 'Votre numéro de téléphone nous permettra de vous contacter (format: 06 12 34 56 78)' };
    }

    if (!formData.address?.trim() || formData.address.trim().length < VALIDATION_RULES.minAddressLength) {
      return { isValid: false, message: 'Votre adresse nous aide à vous connecter aux services les plus proches (minimum 10 caractères)' };
    }

    if (!formData.postalCode?.trim() || !VALIDATION_RULES.postalCode.test(formData.postalCode)) {
      return { isValid: false, message: 'Le code postal est nécessaire pour une localisation précise (5 chiffres requis)' };
    }

    if (!formData.city?.trim() || formData.city.trim().length < VALIDATION_RULES.minNameLength) {
      return { isValid: false, message: 'Votre ville complète votre adresse (minimum 2 caractères)' };
    }

    // INTERFACE DOUCE - Message plus encourageant pour l'adresse
    if (addressInputMode === 'manual' && !formData.addressValidationStatus.isValidated) {
      return { isValid: false, message: 'Pour vous offrir le meilleur service, nous recommandons de valider votre adresse via l\'autocomplétion' };
    }

    // Vérification anti-duplication
    const addressLower = formData.address.toLowerCase();
    const cityLower = formData.city.toLowerCase();
    if (addressLower.includes(formData.postalCode) || addressLower.includes(cityLower)) {
      return { isValid: false, message: 'L\'adresse doit contenir uniquement le numéro et la rue (le code postal et la ville sont dans des champs séparés)' };
    }

    if (!formData.legalStatus) {
      return { isValid: false, message: 'Votre statut juridique nous aide à adapter les services à vos besoins' };
    }

    if (['travailleur_independant', 'entreprise'].includes(formData.legalStatus)) {
      if (!formData.rcsNumber?.trim() || formData.rcsNumber.trim().length < VALIDATION_RULES.minRcsLength) {
        return { isValid: false, message: 'Le numéro RCS est requis pour votre statut juridique (informations professionnelles)' };
      }
    }

    if (formData.roles.includes('fourmiz')) {
      if (!formData.idDocumentUri && !formData.existingDocumentUrl) {
        return { isValid: false, message: 'Une pièce d\'identité est nécessaire pour vérifier votre profil Fourmiz et rassurer nos clients' };
      }
      
      if (!engagementValidation.isValid) {
        return { 
          isValid: false, 
          message: engagementValidation.error || 'L\'acceptation des engagements légaux est nécessaire pour devenir Fourmiz' 
        };
      }

      if (!trackingConsents.mission) {
        return {
          isValid: false,
          message: 'Le consentement de suivi pendant les missions est fortement recommandé pour votre sécurité et l\'efficacité du service'
        };
      }
    }

    return { isValid: true, message: '' };
  }, [formData, engagementValidation, trackingConsents, addressInputMode]);

  // Progression du formulaire
  const getFormProgress = useMemo(() => {
    let completed = 0;
    const isFourmizRole = formData.roles.includes('fourmiz');
    const hasRcsRequirement = ['travailleur_independant', 'entreprise'].includes(formData.legalStatus);
    
    let total = 8;
    if (hasRcsRequirement) total += 1;
    if (isFourmizRole) {
      total += 1;
      if (!engagementValidation.isValid) {
        total += engagementValidation.totalRequired;
      }
    }
    
    if (formData.roles.length > 0) completed++;
    if (formData.firstname.trim().length >= VALIDATION_RULES.minNameLength) completed++;
    if (formData.lastname.trim().length >= VALIDATION_RULES.minNameLength) completed++;
    if (formData.phone.trim() && VALIDATION_RULES.phone.test(formData.phone.replace(/\s/g, ''))) completed++;
    if (formData.address.trim().length >= VALIDATION_RULES.minAddressLength) completed++;
    if (formData.postalCode.trim() && VALIDATION_RULES.postalCode.test(formData.postalCode)) completed++;
    if (formData.city.trim().length >= VALIDATION_RULES.minNameLength) completed++;
    if (formData.legalStatus) completed++;
    
    if (hasRcsRequirement) {
      if (formData.rcsNumber.trim().length >= VALIDATION_RULES.minRcsLength) completed++;
    }
    
    if (isFourmizRole) {
      if (formData.idDocumentUri || formData.existingDocumentUrl) completed++;
      
      if (!engagementValidation.isValid) {
        completed += engagementValidation.acceptedCount;
      }
    }
    
    const percentage = Math.round((completed / total) * 100);
    
    return { completed, total, percentage };
  }, [formData, engagementValidation]);

  // INTERFACE DOUCE - Hints plus encourageants
  const getValidationHints = useMemo(() => {
    const hints: string[] = [];
    
    if (formData.roles.length === 0) hints.push('Choisissez votre profil (client, fourmiz, ou les deux)');
    if (!formData.firstname.trim()) hints.push('Ajoutez votre prénom');
    if (!formData.lastname.trim()) hints.push('Ajoutez votre nom');
    if (!formData.phone.trim()) hints.push('Ajoutez votre numéro de téléphone');
    else if (!VALIDATION_RULES.phone.test(formData.phone.replace(/\s/g, ''))) hints.push('Vérifiez le format de votre téléphone');
    if (!formData.address.trim()) hints.push('Précisez votre adresse');
    if (!formData.postalCode.trim()) hints.push('Ajoutez votre code postal');
    else if (!VALIDATION_RULES.postalCode.test(formData.postalCode)) hints.push('Vérifiez votre code postal (5 chiffres)');
    if (!formData.city.trim()) hints.push('Précisez votre ville');
    
    // Hint doux pour l'adresse
    if (addressInputMode === 'manual' && !formData.addressValidationStatus.isValidated) {
      hints.push('Conseil : utilisez l\'autocomplétion pour votre adresse');
    }
    
    if (['travailleur_independant', 'entreprise'].includes(formData.legalStatus) && (!formData.rcsNumber.trim() || formData.rcsNumber.trim().length < 9)) {
      hints.push('Numéro RCS requis pour ce statut');
    }
    
    if (formData.roles.includes('fourmiz')) {
      if (!formData.idDocumentUri && !formData.existingDocumentUrl) {
        hints.push('Pièce d\'identité requise pour les Fourmiz');
      }
      
      if (!engagementValidation.isValid && engagementValidation.error) {
        hints.push(engagementValidation.error);
      }
    }
    
    return hints;
  }, [formData, engagementValidation, addressInputMode]);

  const isFormValid = useCallback((): boolean => {
    return validateStrictRequirements.isValid;
  }, [validateStrictRequirements.isValid]);

  // Fonction de sauvegarde fallback
  const saveFallbackUpload = useCallback(async (
    userId: string, 
    fileUri: string, 
    metadata: any
  ): Promise<void> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { error } = await supabase.from('pending_uploads').insert({
        user_id: userId,
        file_path: userId + '/id-document-' + Date.now(),
        file_data: 'data:' + (metadata.mimeType || 'image/jpeg') + ';base64,' + base64,
        metadata: metadata,
        status: 'pending'
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }, []);

  // Pré-remplissage des données
  const prefillFormData = useCallback(async (currentUser: UserSession['user']): Promise<void> => {
    if ((isEditMode && stableRefs.current.dataLoaded) || !currentUser) {
      return;
    }

    try {
      setUiState(prev => ({ ...prev, prefilling: true }));

      let prefillData = {
        firstname: '',
        lastname: '',
        phone: '',
      };

      const existingProfile = await safeGetProfile(currentUser.id);

      if (existingProfile) {
        prefillData.firstname = existingProfile.firstname || '';
        prefillData.lastname = existingProfile.lastname || '';
        prefillData.phone = existingProfile.phone || '';
      }

      if (!prefillData.firstname || !prefillData.lastname || !prefillData.phone) {
        if (currentUser.user_metadata) {
          if (!prefillData.firstname && currentUser.user_metadata.firstname) {
            prefillData.firstname = currentUser.user_metadata.firstname;
          }
          
          if (!prefillData.lastname && currentUser.user_metadata.lastname) {
            prefillData.lastname = currentUser.user_metadata.lastname;
          }
          
          if (!prefillData.phone && currentUser.user_metadata.phone) {
            prefillData.phone = currentUser.user_metadata.phone;
          }
        }
      }

      if (!prefillData.firstname && !prefillData.lastname && currentUser.email) {
        const emailPart = currentUser.email.split('@')[0];
        
        if (emailPart.includes('.')) {
          const parts = emailPart.split('.');
          if (parts.length >= 2) {
            prefillData.firstname = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            prefillData.lastname = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
          }
        }
      }

      if (prefillData.phone) {
        prefillData.phone = formatPhoneNumber(prefillData.phone);
      }
      
      setFormData(prev => ({
        ...prev,
        firstname: prefillData.firstname.trim() || prev.firstname,
        lastname: prefillData.lastname.trim() || prev.lastname,
        phone: prefillData.phone.trim() || prev.phone,
      }));

    } catch (error) {
      // Silent error handling
    } finally {
      setUiState(prev => ({ ...prev, prefilling: false }));
    }
  }, []);

  // Chargement de la session utilisateur
  const loadUserSession = useCallback(async (): Promise<void> => {
    if (stableRefs.current.sessionLoaded) {
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      const currentSession = await getCurrentSession();
      
      if (!currentUser || !currentSession) {
        Alert.alert(
          'Session expirée',
          'Veuillez vous reconnecter pour continuer',
          [{ text: 'OK', onPress: () => router.replace('/auth/signin') }]
        );
        return;
      }
      
      const userSession: UserSession = {
        user: {
          id: currentUser.id,
          email: currentUser.email,
          user_metadata: currentUser.user_metadata || {}
        }
      };
      
      setSession(userSession);
      stableRefs.current.sessionLoaded = true;

      await loadExistingProfile(currentUser.id);

      if (!isEditMode || !stableRefs.current.dataLoaded) {
        await prefillFormData(userSession.user);
      }

    } catch (error) {
      const { userMessage } = handleSupabaseError(error, 'Session utilisateur');
      
      Alert.alert(
        'Erreur de session',
        userMessage,
        [{ text: 'Réessayer', onPress: () => router.replace('/auth/signin') }]
      );
    } finally {
      setUiState(prev => ({ ...prev, sessionLoading: false }));
    }
  }, []);

  // Chargement du profil existant avec gestionnaire d'erreurs
  const loadExistingProfile = useCallback(async (userId: string): Promise<void> => {
    if (!userId || stableRefs.current.dataLoaded) {
      return;
    }

    try {
      console.log('Chargement profil existant pour:', userId);
      
      const existingProfile = await safeGetProfile(userId);

      if (existingProfile) {
        console.log('Profil existant trouvé:', {
          roles: existingProfile.roles,
          profile_completed: existingProfile.profile_completed
        });

        if (existingProfile.profile_completed && existingProfile.firstname && existingProfile.lastname && !isEditMode) {
          Alert.alert(
            'Profil déjà complété',
            'Votre profil est déjà rempli. Redirection vers l\'application...',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
          );
          return;
        }
        
        if (isEditMode || existingProfile.profile_completed) {
          const formattedPhone = existingProfile.phone ? formatPhoneNumber(existingProfile.phone) : '';

          const addressValidationStatus = {
            isValidated: !!existingProfile.address_validated_at,
            confidence: existingProfile.address_confidence || undefined,
            formattedAddress: existingProfile.formatted_address || undefined
          };

          const selectedAddressCoordinates = (existingProfile.latitude && existingProfile.longitude) ? {
            latitude: existingProfile.latitude,
            longitude: existingProfile.longitude
          } : null;

          setFormData(prev => ({
            ...prev,
            firstname: existingProfile.firstname || '',
            lastname: existingProfile.lastname || '',
            phone: formattedPhone,
            address: existingProfile.address || '',
            building: existingProfile.building || '',
            floor: existingProfile.floor || '',
            postalCode: existingProfile.postal_code || '',
            city: existingProfile.city || '',
            roles: (existingProfile.roles as UserRole[]) || prev.roles,
            legalStatus: (existingProfile.legal_status as LegalStatus) || 'particulier',
            rcsNumber: existingProfile.rcs_number || '',
            existingDocumentUrl: existingProfile.id_document_path || null,
            existingAvatarUrl: existingProfile.avatar_url || null,
            idDocumentUri: null,
            avatarUri: null,
            selectedAddressCoordinates,
            addressValidationStatus,
          }));

          if (addressValidationStatus.isValidated) {
            setAddressInputMode('autocomplete');
          }

          if (existingProfile.roles?.includes('fourmiz')) {
            console.log('Chargement consentements tracking existants...');
            
            setTrackingConsents({
              mission: existingProfile.tracking_consent_mission ?? true,
              offDuty: existingProfile.tracking_consent_off_duty ?? false,
              dataRetention: existingProfile.data_retention_days ?? 30,
              lastUpdated: existingProfile.tracking_consent_date
            });
          }

          setIsDataLoaded(true);
          stableRefs.current.dataLoaded = true;
        }
      }
    } catch (error) {
      console.error('Exception loadExistingProfile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert(
        'Erreur de chargement', 
        'Impossible de charger votre profil: ' + errorMessage
      );
    }
  }, []);

  // INTERFACE DOUCE - Validation des champs avec messages bienveillants
  const validateField = useCallback((field: keyof CompleteProfileFormData, value: any): string | undefined => {
    switch (field) {
      case 'roles':
        return value.length === 0 ? 'Choisissez votre profil pour commencer' : undefined;
      case 'firstname':
        if (!value.trim()) return 'Votre prénom nous aidera à personnaliser votre expérience';
        if (value.trim().length < VALIDATION_RULES.minNameLength) return 'Votre prénom doit contenir au moins 2 caractères';
        return undefined;
      case 'lastname':
        if (!value.trim()) return 'Votre nom est nécessaire pour créer votre profil';
        if (value.trim().length < VALIDATION_RULES.minNameLength) return 'Votre nom doit contenir au moins 2 caractères';
        return undefined;
      case 'phone':
        if (!value.trim()) return 'Votre numéro de téléphone nous permettra de vous contacter';
        if (!VALIDATION_RULES.phone.test(value.replace(/\s/g, ''))) return 'Format de téléphone invalide (ex: 06 12 34 56 78)';
        return undefined;
      case 'address':
        if (!value.trim()) return 'Votre adresse nous aide à vous connecter aux services les plus proches';
        
        if (addressInputMode === 'autocomplete') {
          return undefined;
        }
        
        if (addressInputMode === 'manual') {
          if (!formData.addressValidationStatus.isValidated) {
            return 'Conseil : utilisez l\'autocomplétion pour une adresse plus précise';
          }
        }
        
        return undefined;
        
      case 'postalCode':
        if (!value.trim()) return 'Le code postal est nécessaire pour vous localiser';
        if (!VALIDATION_RULES.postalCode.test(value)) return 'Le code postal doit contenir 5 chiffres';
        
        if (addressInputMode === 'manual' && formData.city) {
          const coherence = validatePostalCodeCityCoherence(value, formData.city);
          if (!coherence.isValid && coherence.warning) {
            return `Vérifiez que ${value} correspond bien à ${formData.city}`;
          }
        }
        
        return undefined;
        
      case 'city':
        if (!value.trim()) return 'La ville est nécessaire pour vous localiser';
        if (value.trim().length < VALIDATION_RULES.minNameLength) return 'Merci de préciser le nom de votre ville';
        return undefined;
      case 'legalStatus':
        return !value ? 'Votre statut juridique nous aide à adapter les services à vos besoins' : undefined;
      case 'rcsNumber':
        if (['travailleur_independant', 'entreprise'].includes(formData.legalStatus)) {
          if (!value.trim()) return 'Le numéro RCS est requis pour ce statut';
          if (value.trim().length < VALIDATION_RULES.minRcsLength) return 'Le numéro RCS doit contenir au moins 9 caractères';
        }
        return undefined;
      default:
        return undefined;
    }
  }, [formData.legalStatus, formData.addressValidationStatus.isValidated, formData.city, addressInputMode]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    (['roles', 'firstname', 'lastname', 'phone', 'address', 'postalCode', 'city', 'legalStatus', 'rcsNumber'] as const).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    if (formData.roles.includes('fourmiz')) {
      if (!formData.idDocumentUri && !formData.existingDocumentUrl) {
        newErrors.idDocument = 'Une pièce d\'identité est nécessaire pour vérifier votre profil Fourmiz';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [formData, validateField]);

  // NOUVELLES FONCTIONS POUR GESTION APPAREIL PHOTO + GALERIE
  
  const requestPermissions = useCallback(async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return {
      camera: cameraPermission.granted,
      media: mediaPermission.granted
    };
  }, []);

  const takeIdDocumentPhoto = useCallback(async (): Promise<void> => {
    try {
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
        setFormData(prev => ({ 
          ...prev, 
          idDocumentUri: result.assets[0].uri 
        }));
        
        setErrors(prev => ({ ...prev, idDocument: undefined }));
      }
    } catch (error) {
      console.error('Erreur prise photo document:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  }, [requestPermissions]);

  const pickIdDocumentFromGallery = useCallback(async (): Promise<void> => {
    try {
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
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ 
          ...prev, 
          idDocumentUri: result.assets[0].uri 
        }));
        
        setErrors(prev => ({ ...prev, idDocument: undefined }));
      }
    } catch (error) {
      console.error('Erreur sélection galerie document:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le document');
    }
  }, [requestPermissions]);

  const takeAvatarPhoto = useCallback(async (): Promise<void> => {
    try {
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
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ 
          ...prev, 
          avatarUri: result.assets[0].uri 
        }));
      }
    } catch (error) {
      console.error('Erreur prise photo avatar:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  }, [requestPermissions]);

  const pickAvatarFromGallery = useCallback(async (): Promise<void> => {
    try {
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
        aspect: [1, 1],
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ 
          ...prev, 
          avatarUri: result.assets[0].uri 
        }));
      }
    } catch (error) {
      console.error('Erreur sélection galerie avatar:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    }
  }, [requestPermissions]);

  const showIdDocumentOptions = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Prendre une photo', 'Choisir dans la galerie'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takeIdDocumentPhoto();
          } else if (buttonIndex === 2) {
            pickIdDocumentFromGallery();
          }
        }
      );
    } else {
      Alert.alert(
        'Ajouter une pièce d\'identité',
        'Choisissez une option',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Prendre une photo', onPress: takeIdDocumentPhoto },
          { text: 'Galerie', onPress: pickIdDocumentFromGallery },
        ]
      );
    }
  }, [takeIdDocumentPhoto, pickIdDocumentFromGallery]);

  const showAvatarOptions = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Prendre une photo', 'Choisir dans la galerie'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takeAvatarPhoto();
          } else if (buttonIndex === 2) {
            pickAvatarFromGallery();
          }
        }
      );
    } else {
      Alert.alert(
        'Ajouter une photo de profil',
        'Choisissez une option',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Prendre une photo', onPress: takeAvatarPhoto },
          { text: 'Galerie', onPress: pickAvatarFromGallery },
        ]
      );
    }
  }, [takeAvatarPhoto, pickAvatarFromGallery]);

  const uploadIdDocument = useCallback(async (userId: string): Promise<UploadResult> => {
    if (!formData.idDocumentUri) {
      return { success: true, url: undefined };
    }

    try {
      setUiState(prev => ({ ...prev, uploadingDocument: true }));

      if (!formData.idDocumentUri || !userId) {
        throw new Error('URI du fichier ou userId manquant');
      }

      const fileInfo = await FileSystem.getInfoAsync(formData.idDocumentUri);
      if (!fileInfo.exists) {
        throw new Error('Fichier non trouvé');
      }

      const fileSize = fileInfo.size || 0;
      const fileExtension = formData.idDocumentUri.split('.').pop() || 'jpg';
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
      
      if (fileSize > UPLOAD_CONFIG.maxSizeMB * 1024 * 1024) {
        throw new Error('Fichier trop volumineux (max ' + UPLOAD_CONFIG.maxSizeMB + 'MB)');
      }

      const uint8ArrayData = await convertToUint8Array(formData.idDocumentUri);

      const fileName = 'id-document-' + Date.now() + '.' + fileExtension;
      const filePath = userId + '/' + fileName;
      
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= UPLOAD_CONFIG.maxRetries; attempt++) {
        try {
          const uploadPromise = supabase.storage
            .from('user-documents')
            .upload(filePath, uint8ArrayData, {
              cacheControl: '3600',
              upsert: false,
              contentType: mimeType,
              metadata: {
                userId,
                uploadedAt: new Date().toISOString(),
                originalName: 'id-document.' + fileExtension,
                uploadMethod: 'uint8Array-rn'
              }
            });
          
          const { data, error } = await withTimeout(
            uploadPromise, 
            UPLOAD_CONFIG.timeoutMs
          );
          
          if (error) {
            throw error;
          }
          
          const { data: urlData } = supabase.storage
            .from('user-documents')
            .getPublicUrl(filePath);
          
          if (UPLOAD_CONFIG.validateAfterUpload) {
            const isValid = await validateUploadedFile(
              urlData.publicUrl, 
              uint8ArrayData.length * 0.9,
              UPLOAD_CONFIG.maxValidationRetries
            );
            
            if (!isValid) {
              throw new Error('Validation post-upload échouée');
            }
          }
          
          return {
            success: true,
            url: urlData.publicUrl
          };
          
        } catch (error) {
          lastError = error as Error;
          
          if (attempt < UPLOAD_CONFIG.maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      await saveFallbackUpload(userId, formData.idDocumentUri, {
        originalSize: fileSize,
        originalType: mimeType,
        uploadAttempts: UPLOAD_CONFIG.maxRetries,
        lastError: lastError?.message,
        uploadMethod: 'fallback-rn'
      });
      
      return {
        success: true,
        url: undefined,
        fallbackUsed: true
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    } finally {
      setUiState(prev => ({ ...prev, uploadingDocument: false }));
    }
  }, [formData.idDocumentUri, saveFallbackUpload]);

  const uploadAvatar = useCallback(async (userId: string): Promise<UploadResult> => {
    if (!formData.avatarUri) {
      return { success: true, url: undefined };
    }

    try {
      setUiState(prev => ({ ...prev, uploadingAvatar: true }));
      
      const uint8ArrayData = await convertToUint8Array(formData.avatarUri);
      const fileName = 'profile_photo-' + Date.now() + '.jpg';
      const filePath = userId + '/' + fileName;
      
      const { data, error } = await supabase.storage
        .from('user-documents')
        .upload(filePath, uint8ArrayData, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        });
      
      if (error) {
        throw error;
      }
      
      const { data: urlData } = supabase.storage
        .from('user-documents')
        .getPublicUrl(filePath);
      
      return {
        success: true,
        url: urlData.publicUrl
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    } finally {
      setUiState(prev => ({ ...prev, uploadingAvatar: false }));
    }
  }, [formData.avatarUri]);

  const generateUniqueReferralCode = useCallback(async (): Promise<string | null> => {
    try {
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        const { data: existingCode } = await supabase
          .from('user_referral_codes')
          .select('id')
          .eq('code', code)
          .single();
        
        if (!existingCode) {
          return code;
        }
        
        attempts++;
      }
      
      return null;
      
    } catch (error) {
      return null;
    }
  }, []);

  const createReferralCodeForUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      setUiState(prev => ({ ...prev, creatingReferralCode: true }));

      const uniqueCode = await generateUniqueReferralCode();
      
      if (!uniqueCode) {
        return false;
      }

      const { error } = await supabase
        .from('user_referral_codes')
        .insert({
          user_id: userId,
          code: uniqueCode,
          is_active: true,
          created_at: new Date().toISOString()
        });

      if (error) {
        return false;
      }

      return true;

    } catch (error) {
      return false;
    } finally {
      setUiState(prev => ({ ...prev, creatingReferralCode: false }));
    }
  }, [generateUniqueReferralCode]);

  const handlePhoneChange = useCallback((text: string) => {
    const currentNumericLength = formData.phone.replace(/\D/g, '').length;
    const newNumericLength = text.replace(/\D/g, '').length;
    
    if (newNumericLength < currentNumericLength) {
      setFormData(prev => ({ ...prev, phone: text }));
    } else {
      const formatted = formatPhoneNumber(text);
      setFormData(prev => ({ ...prev, phone: formatted }));
    }
    
    setErrors(prev => ({ ...prev, phone: undefined }));
  }, [formData.phone]);

  // Fonction de soumission principale avec validation des coordonnées - VERSION CORRIGÉE
  const handleSubmit = useCallback(async (): Promise<void> => {
    console.log('Début sauvegarde profil');

    const finalValidationError = validateFinalDataForDatabase(formData);
    if (finalValidationError) {
      console.error('Validation finale échouée:', finalValidationError);
      Alert.alert('Validation échouée', finalValidationError);
      return;
    }

    if (!validateForm()) {
      const hints = getValidationHints.slice(0, 5);
      Alert.alert(
        'Profil incomplet', 
        'Veuillez remplir tous les champs obligatoires :\n\n• ' + hints.join('\n• ')
      );
      return;
    }

    const strictValidation = validateStrictRequirements;
    if (!strictValidation.isValid) {
      Alert.alert('Validation échouée', strictValidation.message);
      return;
    }

    if (!formData.addressValidationStatus.isValidated && !isEditMode) {
      Alert.alert(
        'Adresse non validée',
        'Veuillez sélectionner une adresse dans les suggestions ou utiliser le système d\'autocomplete pour une adresse plus précise.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!session?.user) {
      Alert.alert('Session expirée', 'Veuillez vous reconnecter');
      router.replace('/auth/signin');
      return;
    }

    setUiState(prev => ({ ...prev, uploading: true }));

    try {
      let documentPath: string | null = null;
      let avatarPath: string | null = null;
      let uploadFallbackUsed = false;

      if (formData.roles.includes('fourmiz')) {
        if (formData.idDocumentUri) {
          const uploadResult = await uploadIdDocument(session.user.id);
          
          if (!uploadResult.success) {
            throw new Error('Échec de l\'upload du document: ' + uploadResult.error);
          }
          
          if (uploadResult.fallbackUsed) {
            uploadFallbackUsed = true;
          } else if (uploadResult.url) {
            documentPath = uploadResult.url;
          }
        } else if (formData.existingDocumentUrl) {
          documentPath = formData.existingDocumentUrl;
        }
      }

      if (formData.avatarUri) {
        const avatarUploadResult = await uploadAvatar(session.user.id);
        
        if (!avatarUploadResult.success) {
          console.warn('Upload avatar échoué, continuation sans avatar');
        } else if (avatarUploadResult.url) {
          avatarPath = avatarUploadResult.url;
        }
      } else if (formData.existingAvatarUrl) {
        avatarPath = formData.existingAvatarUrl;
      }

      const phoneToSave = formData.phone.trim().replace(/\s/g, '');
      if (!VALIDATION_RULES.phone.test(phoneToSave)) {
        throw new Error('Format téléphone final invalide: ' + phoneToSave);
      }

      const finalRoles = formData.roles.length > 0 ? formData.roles : ['client'];

      // VALIDATION DES COORDONNÉES AVANT SAUVEGARDE
      let coordinatesToSave = {
        latitude: null as number | null,
        longitude: null as number | null,
        formattedAddress: formData.addressValidationStatus.formattedAddress || null,
        addressConfidence: formData.addressValidationStatus.confidence || null
      };

      if (formData.selectedAddressCoordinates) {
        const { latitude, longitude } = formData.selectedAddressCoordinates;
        
        console.log('Vérification coordonnées:', { latitude, longitude });
        
        if (isValidOverseasCoordinates(latitude, longitude)) {
          coordinatesToSave.latitude = latitude;
          coordinatesToSave.longitude = longitude;
          console.log('Coordonnées validées pour territoire français');
        } else {
          console.warn('Coordonnées hors territoire français, sauvegarde sans géolocalisation');
          Alert.alert(
            'Information',
            'Votre adresse a été enregistrée. La géolocalisation précise sera activée prochainement pour votre région.',
            [{ text: 'OK' }]
          );
        }
      }

      // CORRECTION PRINCIPALE : Construction des données sans ID pour éviter la contrainte FK
      const profileData = {
        user_id: session.user.id,
        email: session.user.email,
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        phone: phoneToSave,
        address: formData.address.trim(),
        building: formData.building.trim() || null,
        floor: formData.floor.trim() || null,
        postal_code: formData.postalCode.trim(),
        city: formData.city.trim(),
        roles: finalRoles,
        legal_status: formData.legalStatus,
        rcs_number: ['travailleur_independant', 'entreprise'].includes(formData.legalStatus) 
          ? formData.rcsNumber.trim() 
          : null,
        id_document_path: documentPath,
        avatar_url: avatarPath,
        profile_completed: true,
        criteria_completed: false,
        updated_at: new Date().toISOString(),
        // COORDONNÉES CONDITIONNELLES
        latitude: coordinatesToSave.latitude,
        longitude: coordinatesToSave.longitude,
        formatted_address: coordinatesToSave.formattedAddress,
        address_confidence: coordinatesToSave.addressConfidence,
        address_validated_at: formData.addressValidationStatus.isValidated 
          ? new Date().toISOString() 
          : null,
      };
      
      console.log('Données à sauvegarder:', {
        address: profileData.address,
        city: profileData.city,
        postal_code: profileData.postal_code,
        latitude: profileData.latitude,
        longitude: profileData.longitude
      });
      
      // CORRECTION : Utilisation d'UPDATE/INSERT explicites au lieu d'upsert
      let profileError: any = null;
      
      if (isEditMode) {
        // Mode édition : UPDATE explicite pour éviter de toucher à l'ID
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', session.user.id);
        
        profileError = error;
        console.log('Mode édition : UPDATE effectué');
      } else {
        // Mode création : INSERT
        const { error } = await supabase
          .from('profiles')
          .insert(profileData);
        
        profileError = error;
        console.log('Mode création : INSERT effectué');
      }

      if (profileError) {
        console.error('Erreur Supabase (Sauvegarde profil):', profileError);
        const { userMessage } = handleSupabaseError(profileError, 'Sauvegarde profil');
        throw new Error(userMessage);
      }

      console.log('Profil sauvegardé avec succès');

      if (formData.roles.includes('fourmiz')) {
        console.log('Sauvegarde des consentements tracking...');
        
        const trackingSaved = await saveTrackingConsents(trackingConsents);
        
        if (!trackingSaved) {
          console.warn('Erreur sauvegarde consentements tracking (continuera sans)');
          Alert.alert(
            'Attention',
            'Vos préférences de géolocalisation n\'ont pas pu être sauvegardées. Vous pourrez les configurer plus tard dans votre profil.',
            [{ text: 'Continuer' }]
          );
        } else {
          console.log('Consentements tracking sauvegardés');
        }
      }

      await syncRolesAfterSave(finalRoles);

      let referralCodeCreated = false;
      if (!isEditMode) {
        referralCodeCreated = await createReferralCodeForUser(session.user.id);
      }

      let successMessage: string;
      
      if (isEditMode) {
        successMessage = 'Votre profil a été mis à jour avec succès' + (uploadFallbackUsed ? '. Votre document sera traité prochainement.' : '');
      } else {
        if (formData.roles.includes('fourmiz')) {
          successMessage = uploadFallbackUsed 
            ? 'Merci ' + formData.firstname + ' ! Votre profil Fourmiz a été créé avec succès' + (referralCodeCreated ? ' et votre code de parrainage est prêt' : '') + '. Votre document d\'identité sera traité prochainement. Vous pourrez configurer vos critères de service via votre profil. Bienvenue sur Fourmiz !'
            : 'Merci ' + formData.firstname + ' ! Votre profil Fourmiz a été créé avec succès' + (referralCodeCreated ? ' et votre code de parrainage est prêt' : '') + '. Vous pourrez configurer vos critères de service via votre profil. Bienvenue sur Fourmiz !';
        } else {
          successMessage = uploadFallbackUsed 
            ? 'Merci ' + formData.firstname + ' ! Votre profil a été enregistré avec succès' + (referralCodeCreated ? ' et votre code de parrainage est prêt' : '') + '. Votre document d\'identité sera traité prochainement. Bienvenue sur Fourmiz !'
            : 'Merci ' + formData.firstname + ' ! Votre profil a été enregistré avec succès' + (referralCodeCreated ? ' et votre code de parrainage est prêt' : '') + '. Bienvenue sur Fourmiz !';
        }
      }

      Alert.alert(
        isEditMode ? 'Profil mis à jour' : 'Profil complété',
        successMessage,
        [
          { 
            text: isEditMode ? 'Retour au profil' : 'Découvrir l\'app', 
            onPress: () => {
              if (from === 'profile' || isEditMode) {
                router.replace('/(tabs)/profile');
              } else {
                router.replace('/(tabs)');
              }
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Erreur complète sauvegarde:', error);
      Alert.alert(
        'Erreur de sauvegarde',
        error.message || 'Impossible d\'enregistrer votre profil. Veuillez réessayer.',
        [
          { text: 'Réessayer' },
          { 
            text: 'Support', 
            onPress: () => Alert.alert('Support', 'Contactez-nous à support@fourmiz.app')
          }
        ]
      );
    } finally {
      setUiState(prev => ({ ...prev, uploading: false }));
    }
  }, [
    validateFinalDataForDatabase, formData, validateForm, getValidationHints, validateStrictRequirements,
    session, isEditMode, uploadIdDocument, uploadAvatar, saveTrackingConsents,
    trackingConsents, syncRolesAfterSave, createReferralCodeForUser, from, isValidOverseasCoordinates
  ]);

  const toggleRole = useCallback((role: UserRole): void => {
    const newRoles = formData.roles.includes(role)
      ? formData.roles.filter(r => r !== role)
      : [...formData.roles, role];
    
    setFormData(prev => ({ ...prev, roles: newRoles }));
    setErrors(prev => ({ ...prev, roles: undefined }));
  }, [formData.roles]);

  const renderLegalStatusButton = useCallback((status: LegalStatus) => {
    const config = LEGAL_STATUS_CONFIG[status];
    const isSelected = formData.legalStatus === status;
    
    return (
      <TouchableOpacity
        key={status}
        style={[
          styles.legalStatusButton,
          isSelected && styles.legalStatusButtonSelected
        ]}
        onPress={() => {
          setFormData(prev => ({ 
            ...prev, 
            legalStatus: status,
            rcsNumber: status === 'particulier' ? '' : prev.rcsNumber
          }));
          
          setErrors(prev => ({ ...prev, legalStatus: undefined }));
        }}
        activeOpacity={0.8}
      >
        <Text style={[
          styles.legalStatusText,
          isSelected && styles.legalStatusTextSelected
        ]}>
          {config.emoji} {config.label}
        </Text>
        <Text style={[
          styles.legalStatusDescription,
          isSelected && styles.legalStatusDescriptionSelected
        ]}>
          {config.description}
        </Text>
      </TouchableOpacity>
    );
  }, [formData.legalStatus]);

  const updateFormData = useCallback((field: keyof CompleteProfileFormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const renderInputField = (
    label: string,
    field: keyof CompleteProfileFormData,
    props: any = {}
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput 
        style={[
          styles.input,
          props.multiline && styles.textArea,
          errors[field as keyof FormErrors] && styles.inputWarning
        ]}
        value={formData[field] as string}
        onChangeText={(text) => {
          if (field === 'phone') {
            handlePhoneChange(text);
          } else {
            updateFormData(field, text);
          }
        }}
        {...props}
      />
      {errors[field as keyof FormErrors] && (
        <View style={styles.helpMessageContainer}>
          <Ionicons name="information-circle-outline" size={16} color="#0ea5e9" />
          <Text style={styles.helpMessage}>{errors[field as keyof FormErrors]}</Text>
        </View>
      )}
    </View>
  );

  const isSubmitDisabled = useMemo(() => {
    return uiState.uploading || 
           uiState.syncingRoles || 
           isTrackingLoading || 
           !isFormValid() || 
           !validateStrictRequirements.isValid;
  }, [uiState.uploading, uiState.syncingRoles, isTrackingLoading, isFormValid, validateStrictRequirements.isValid]);

  // useEffect principal
  useEffect(() => {
    if (!stableRefs.current.initialized && !stableRefs.current.sessionLoaded) {
      stableRefs.current.initialized = true;
      loadUserSession();
    }
  }, []);

  // Rendu du contenu
  const renderContent = useMemo(() => (
    <View style={styles.content}>
      {/* Header avec bouton retour conditionnel */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {showBackButton && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToRoleSelection}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={24} color="#000000" />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>
              {isEditMode ? 'Modifier mon profil' : 'Complétez votre profil'}
            </Text>
            <Text style={styles.subtitle}>
              {isEditMode ? 'Modifiez vos informations personnelles' : 'Dernière étape avant de découvrir Fourmiz'}
            </Text>
          </View>
          {showBackButton && <View style={styles.headerSpacer} />}
        </View>
      </View>

      {/* Affichage des rôles sélectionnés quand confirmés */}
      {rolesConfirmed && formData.roles.length > 0 && !isEditMode && (
        <View style={styles.confirmedRolesCard}>
          <Text style={styles.confirmedRolesTitle}>Profil sélectionné</Text>
          <Text style={styles.confirmedRolesValue}>
            {formData.roles.map(r => ROLE_CONFIG[r].label).join(' + ')}
          </Text>
        </View>
      )}

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Progression: {getFormProgress.completed}/{getFormProgress.total} étapes ({getFormProgress.percentage}%)
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: getFormProgress.percentage + '%' }
            ]} 
          />
        </View>
        {getValidationHints.length > 0 && (
          <View style={styles.hintsContainer}>
            <Text style={styles.hintsTitle}>Étapes suivantes :</Text>
            {getValidationHints.slice(0, 3).map((hint, index) => (
              <Text key={index} style={styles.hintText}>• {hint}</Text>
            ))}
            {getValidationHints.length > 3 && (
              <Text style={styles.hintText}>• Et {getValidationHints.length - 3} autre(s)...</Text>
            )}
          </View>
        )}
      </View>

      {(formData.firstname || formData.lastname || formData.phone) && !isEditMode && (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            Certains champs ont été pré-remplis automatiquement. Vous pouvez les modifier si nécessaire.
          </Text>
        </View>
      )}

      {isEditMode && (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            Mode édition : Vous pouvez modifier toutes vos informations
          </Text>
        </View>
      )}

      {uiState.syncingRoles && (
        <View style={styles.syncingCard}>
          <ActivityIndicator size="small" color="#000000" />
          <Text style={styles.syncingText}>
            Synchronisation des rôles en cours...
          </Text>
        </View>
      )}

      {/* SECTION RÔLES */}
      {(!rolesConfirmed && !isEditMode) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sélectionnez vos rôles</Text>
          <Text style={styles.sectionDescription}>
            Choisissez selon vos besoins
          </Text>
          {errors.roles && (
            <View style={styles.helpMessageContainer}>
              <Ionicons name="information-circle-outline" size={16} color="#0ea5e9" />
              <Text style={styles.helpMessage}>{errors.roles}</Text>
            </View>
          )}
          
          <View style={styles.rolesContainer}>
            {(['client', 'fourmiz'] as const).map((role) => {
              const config = ROLE_CONFIG[role];
              const isSelected = formData.roles.includes(role);
              
              return (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButton,
                    isSelected && styles.roleButtonSelected
                  ]}
                  onPress={() => toggleRole(role)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.roleText,
                    isSelected && styles.roleTextSelected
                  ]}>
                    {config.emoji} {config.label}
                  </Text>
                  <Text style={[
                    styles.roleDescription,
                    isSelected && styles.roleDescriptionSelected
                  ]}>
                    {config.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Affichage de la sélection actuelle et bouton de validation */}
          {formData.roles.length > 0 && (
            <View style={styles.currentSelectionBox}>
              <Text style={styles.selectionLabel}>Sélection actuelle :</Text>
              <Text style={styles.selectionValue}>
                {formData.roles.map(r => ROLE_CONFIG[r].label).join(' + ')}
              </Text>
              
              <TouchableOpacity
                style={styles.neutralConfirmButton}
                onPress={handleConfirmRoles}
              >
                <Text style={styles.neutralConfirmText}>Valider</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* SECTION RÔLES EN MODE ÉDITION */}
      {isEditMode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vos rôles</Text>
          {errors.roles && (
            <View style={styles.helpMessageContainer}>
              <Ionicons name="information-circle-outline" size={16} color="#0ea5e9" />
              <Text style={styles.helpMessage}>{errors.roles}</Text>
            </View>
          )}
          
          <View style={styles.rolesContainer}>
            {(['client', 'fourmiz'] as const).map((role) => {
              const config = ROLE_CONFIG[role];
              const isSelected = formData.roles.includes(role);
              
              return (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButton,
                    isSelected && styles.roleButtonSelected
                  ]}
                  onPress={() => toggleRole(role)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.roleText,
                    isSelected && styles.roleTextSelected
                  ]}>
                    {config.emoji} {config.label}
                  </Text>
                  <Text style={[
                    styles.roleDescription,
                    isSelected && styles.roleDescriptionSelected
                  ]}>
                    {config.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Reste du contenu seulement si les rôles sont confirmés OU en mode édition */}
      {(rolesConfirmed || isEditMode) && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Photo de profil</Text>
              
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={showAvatarOptions}
                activeOpacity={0.8}
              >
                <View style={styles.avatarContainer}>
                  {(formData.avatarUri || formData.existingAvatarUrl) ? (
                    <Image 
                      source={{ 
                        uri: formData.avatarUri || formData.existingAvatarUrl 
                      }} 
                      style={styles.avatarImage} 
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person-outline" size={24} color="#666666" />
                    </View>
                  )}
                  <View style={styles.avatarOverlay}>
                    <Ionicons name="camera" size={16} color="#ffffff" />
                  </View>
                </View>
              </TouchableOpacity>
              
              <Text style={styles.helpText}>
                {formData.avatarUri ? 'Nouvelle photo sélectionnée' :
                 formData.existingAvatarUrl ? 'Cliquez pour changer votre photo' :
                 'Ajoutez une photo de profil (recommandé)'}
              </Text>
            </View>
            
            {renderInputField('Prénom', 'firstname', {
              placeholder: 'Votre prénom',
              textContentType: 'givenName',
              autoCapitalize: 'words',
              maxLength: 50
            })}

            {renderInputField('Nom', 'lastname', {
              placeholder: 'Votre nom',
              textContentType: 'familyName',
              autoCapitalize: 'words',
              maxLength: 50
            })}

            {renderInputField('Téléphone', 'phone', {
              keyboardType: 'phone-pad',
              placeholder: '06 12 34 56 78',
              textContentType: 'telephoneNumber',
              maxLength: 14
            })}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statut juridique</Text>
            <Text style={styles.sectionDescription}>
              Sélectionnez votre statut pour adapter les informations requises
            </Text>
            {errors.legalStatus && (
              <View style={styles.helpMessageContainer}>
                <Ionicons name="information-circle-outline" size={16} color="#0ea5e9" />
                <Text style={styles.helpMessage}>{errors.legalStatus}</Text>
              </View>
            )}
            
            <View style={styles.statusContainer}>
              {(['particulier', 'travailleur_independant', 'entreprise'] as const).map(renderLegalStatusButton)}
            </View>

            {['travailleur_independant', 'entreprise'].includes(formData.legalStatus) && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Numéro RCS
                  <Text style={styles.labelHint}> (Registre du Commerce et des Sociétés)</Text>
                </Text>
                <TextInput 
                  style={[
                    styles.input,
                    errors.rcsNumber && styles.inputWarning
                  ]}
                  value={formData.rcsNumber}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, rcsNumber: text }));
                    setErrors(prev => ({ ...prev, rcsNumber: undefined }));
                  }}
                  placeholder="123 456 789 R.C.S. Paris"
                  maxLength={50}
                  autoCapitalize="characters"
                />
                {errors.rcsNumber && (
                  <View style={styles.helpMessageContainer}>
                    <Ionicons name="information-circle-outline" size={16} color="#0ea5e9" />
                    <Text style={styles.helpMessage}>{errors.rcsNumber}</Text>
                  </View>
                )}
                <Text style={styles.helpText}>
                  {formData.legalStatus === 'travailleur_independant' 
                    ? "Trouvez votre numéro RCS sur votre extrait K-bis ou votre attestation d'inscription au répertoire SIRENE"
                    : "Numéro d'immatriculation de votre société au Registre du Commerce et des Sociétés"
                  }
                </Text>
              </View>
            )}
          </View>

          {/* INTERFACE DOUCE - Section adresse révisée */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Votre adresse</Text>
            <Text style={styles.sectionDescription}>
              Nous utilisons votre adresse pour vous proposer les services les plus proches
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse de rue</Text>
              
              <AddressInputWithAutocomplete
                value={formData.address}
                onChangeText={handleManualAddressChange}
                onAddressSelected={handleAddressSelected}
                postalCode={formData.postalCode}
                city={formData.city}
                style={[
                  styles.input, 
                  errors.address && styles.inputWarning
                ]}
                errors={errors.address}
                placeholder="Exemple : 123 rue de la Paix"
                testID="complete-profile-address-input"
              />
              
              {errors.address && (
                <View style={styles.helpMessageContainer}>
                  <Ionicons name="information-circle-outline" size={16} color="#0ea5e9" />
                  <Text style={styles.helpMessage}>{errors.address}</Text>
                </View>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                {renderInputField('Bâtiment (optionnel)', 'building', {
                  placeholder: 'Bât. A',
                  maxLength: 20
                })}
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                {renderInputField('Étage (optionnel)', 'floor', {
                  placeholder: '2ème',
                  maxLength: 20
                })}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>
                  Code postal
                  {addressInputMode === 'autocomplete' && (
                    <Text style={styles.validatedLabel}> ✓ validé</Text>
                  )}
                </Text>
                <TextInput 
                  style={[
                    styles.input,
                    errors.postalCode && styles.inputWarning,
                    addressInputMode === 'autocomplete' && styles.inputValidated
                  ]}
                  value={formData.postalCode}
                  onChangeText={handlePostalCodeChange}
                  keyboardType="numeric"
                  placeholder="75001"
                  textContentType="postalCode"
                  maxLength={5}
                  editable={addressInputMode !== 'autocomplete'}
                />
                {errors.postalCode && (
                  <View style={styles.helpMessageContainer}>
                    <Ionicons name="information-circle-outline" size={16} color="#0ea5e9" />
                    <Text style={styles.helpMessage}>{errors.postalCode}</Text>
                  </View>
                )}
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>
                  Ville
                  {addressInputMode === 'autocomplete' && (
                    <Text style={styles.validatedLabel}> ✓ validée</Text>
                  )}
                </Text>
                <TextInput 
                  style={[
                    styles.input,
                    errors.city && styles.inputWarning,
                    addressInputMode === 'autocomplete' && styles.inputValidated
                  ]}
                  value={formData.city}
                  onChangeText={handleCityChange}
                  placeholder="Paris"
                  textContentType="addressCity"
                  autoCapitalize="words"
                  maxLength={50}
                  editable={addressInputMode !== 'autocomplete'}
                />
                {errors.city && (
                  <View style={styles.helpMessageContainer}>
                    <Ionicons name="information-circle-outline" size={16} color="#0ea5e9" />
                    <Text style={styles.helpMessage}>{errors.city}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Indicateur de mode doux et encourageant */}
            {addressInputMode === 'autocomplete' && (
              <View style={styles.validatedAddressCard}>
                <View style={styles.validatedAddressHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={styles.validatedAddressTitle}>
                    Adresse validée automatiquement
                  </Text>
                </View>
                <Text style={styles.validatedAddressText}>
                  Votre adresse a été vérifiée pour une localisation précise
                </Text>
                <TouchableOpacity
                  style={styles.manualModeButtonGentle}
                  onPress={handleSwitchToManualMode}
                >
                  <Text style={styles.manualModeButtonGentleText}>Modifier manuellement</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Message encourageant pour le mode manuel */}
            {addressInputMode === 'manual' && !formData.addressValidationStatus.isValidated && (
              <View style={styles.manualModeCard}>
                <View style={styles.manualModeHeader}>
                  <Ionicons name="create-outline" size={20} color="#0ea5e9" />
                  <Text style={styles.manualModeTitle}>Saisie manuelle activée</Text>
                </View>
                <Text style={styles.manualModeText}>
                  Pour une localisation optimale, nous vous recommandons d'utiliser l'autocomplétion
                </Text>
              </View>
            )}
          </View>

          {formData.roles.includes('fourmiz') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informations Fourmiz</Text>
              <Text style={styles.sectionDescription}>
                Document requis pour vérifier votre identité et activer vos services
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pièce d'identité</Text>
                {errors.idDocument && (
                  <View style={styles.helpMessageContainer}>
                    <Ionicons name="information-circle-outline" size={16} color="#0ea5e9" />
                    <Text style={styles.helpMessage}>{errors.idDocument}</Text>
                  </View>
                )}
                
                <TouchableOpacity
                  style={styles.documentButton}
                  onPress={showIdDocumentOptions}
                  disabled={uiState.uploadingDocument}
                  activeOpacity={0.8}
                >
                  <Text style={styles.documentButtonText}>
                    {(formData.idDocumentUri || formData.existingDocumentUrl) ? 'Modifier le document' : 'Ajouter un document'}
                  </Text>
                </TouchableOpacity>

                {(formData.idDocumentUri || formData.existingDocumentUrl) && (
                  <View style={styles.documentPreview}>
                    <Image 
                      source={{ 
                        uri: formData.idDocumentUri || formData.existingDocumentUrl 
                      }} 
                      style={styles.previewImage} 
                    />
                    <View style={styles.documentStatus}>
                      <Text style={styles.documentStatusText}>
                        {formData.idDocumentUri 
                          ? 'Nouveau document sélectionné'
                          : 'Document existant'
                        }
                      </Text>
                      <TouchableOpacity
                        style={styles.changeButton}
                        onPress={showIdDocumentOptions}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.changeButtonText}>
                          {formData.idDocumentUri ? 'Rechanger' : 'Changer'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <Text style={styles.helpText}>
                  Carte d'identité, passeport ou permis de conduire. Upload sécurisé avec système de sauvegarde automatique.
                </Text>
              </View>
            </View>
          )}

          {formData.roles.includes('fourmiz') && (
            <TrackingConsentSection
              userId={session?.user?.id}
              isFourmizRole={formData.roles.includes('fourmiz')}
              isEditMode={isEditMode}
              onConsentChange={handleTrackingConsentChange}
              disabled={uiState.uploading || uiState.syncingRoles || isTrackingLoading}
            />
          )}

          <LegalEngagementsSection
            userId={session?.user?.id}
            isFourmizRole={formData.roles.includes('fourmiz')}
            isEditMode={isEditMode}
            formData={engagementFormData}
            onFormDataChange={handleEngagementFormDataChange}
            onValidationChange={handleEngagementValidationChange}
            disabled={uiState.uploading || uiState.syncingRoles || isTrackingLoading}
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitDisabled && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            activeOpacity={0.8}
          >
            {(uiState.uploading || uiState.syncingRoles || isTrackingLoading) ? (
              <View style={styles.submitButtonLoading}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.submitButtonLoadingText}>
                  {uiState.uploadingDocument ? 'Upload sécurisé...' : 
                   uiState.uploadingAvatar ? 'Upload avatar...' :
                   uiState.creatingReferralCode ? 'Finalisation...' :
                   uiState.syncingRoles ? 'Synchronisation...' :
                   isTrackingLoading ? 'Sauvegarde consentements...' :
                   'Sauvegarde...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>
                {!isFormValid() ? 'Complétez les informations requises' : 
                 isEditMode ? 'Enregistrer les modifications' : 'Finaliser mon profil'}
              </Text>
            )}
          </TouchableOpacity>

          {!isEditMode && (
            <View style={styles.bonusCard}>
              <Text style={styles.bonusTitle}>Bonus de bienvenue</Text>
              <Text style={styles.bonusText}>
                Votre code de parrainage sera créé automatiquement pour que vous puissiez inviter vos amis et gagner des récompenses.
              </Text>
            </View>
          )}

          <Text style={styles.legalText}>
            En {isEditMode ? 'modifiant' : 'complétant'} votre profil, vous confirmez que les informations fournies sont exactes et acceptez nos conditions d'utilisation.
          </Text>
        </>
      )}
    </View>
  ), [
    showBackButton, handleBackToRoleSelection, isEditMode, formData, rolesConfirmed, 
    getFormProgress, getValidationHints, uiState, errors, session, isTrackingLoading, 
    toggleRole, handleConfirmRoles, showAvatarOptions, renderInputField, renderLegalStatusButton, 
    handleManualAddressChange, handleAddressSelected, handlePostalCodeChange, handleCityChange,
    addressInputMode, handleSwitchToManualMode, showIdDocumentOptions, handleEngagementFormDataChange, 
    handleEngagementValidationChange, handleTrackingConsentChange, handleSubmit, isSubmitDisabled, 
    isFormValid
  ]);

  const renderLoadingState = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>
          {uiState.prefilling ? 'Pré-remplissage des données...' :
           uiState.syncingRoles ? 'Synchronisation des rôles...' : 
           'Vérification de votre session...'}
        </Text>
      </View>
    </SafeAreaView>
  );

  const renderErrorState = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Session expirée</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => router.replace('/auth/signin')}
        >
          <Text style={styles.retryButtonText}>Se reconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (uiState.sessionLoading || uiState.prefilling) return renderLoadingState();
  if (!session) return renderErrorState();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={[]}
          ListHeaderComponent={renderContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={() => null}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// STYLES DOUX ET BIENVEILLANTS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: -40,
  },
  
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    marginLeft: -8,
    zIndex: 1,
  },
  
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  
  headerSpacer: {
    width: 40,
  },
  
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    color: '#666666',
    lineHeight: 18,
    fontWeight: '400',
  },

  confirmedRolesCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  confirmedRolesTitle: {
    fontSize: 13,
    color: '#0c4a6e',
    marginBottom: 4,
  },
  confirmedRolesValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c4a6e',
  },

  content: {
    paddingHorizontal: 24,
    paddingVertical: 0,
    paddingTop: 16,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#333333',
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },

  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 18,
    fontWeight: '400',
  },

  progressContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333333',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 2,
  },
  hintsContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  hintsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    fontWeight: '400',
  },

  noticeCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  noticeText: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
    fontWeight: '400',
  },

  syncingCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  syncingText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '600',
  },

  rolesContainer: {
    gap: 12,
  },
  roleButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  roleButtonSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  roleTextSelected: {
    color: '#ffffff',
  },
  roleDescription: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },
  roleDescriptionSelected: {
    color: '#ffffff',
    opacity: 0.9,
  },

  currentSelectionBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  selectionLabel: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  selectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  neutralConfirmButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  neutralConfirmText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },

  statusContainer: {
    gap: 12,
    marginBottom: 16,
  },
  legalStatusButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  legalStatusButtonSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  legalStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  legalStatusTextSelected: {
    color: '#ffffff',
  },
  legalStatusDescription: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '400',
  },
  legalStatusDescriptionSelected: {
    color: '#ffffff',
    opacity: 0.9,
  },
  labelHint: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666666',
  },

  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#ffffff',
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
  },
  
  // STYLES DOUX - Remplacer les styles d'erreur agressifs
  inputWarning: {
    borderColor: '#f59e0b', // Orange doux au lieu de rouge
    backgroundColor: '#fffbeb',
  },
  
  inputValidated: {
    backgroundColor: '#f0fdf4', // Vert très doux
    borderColor: '#059669',
    borderWidth: 1,
  },
  
  validatedLabel: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  
  helpMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    gap: 6,
  },
  
  helpMessage: {
    fontSize: 12,
    color: '#0ea5e9', // Bleu doux au lieu de rouge
    lineHeight: 16,
    flex: 1,
  },
  
  validatedAddressCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  
  validatedAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  
  validatedAddressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
  },
  
  validatedAddressText: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
    marginBottom: 12,
  },
  
  manualModeButtonGentle: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  
  manualModeButtonGentleText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '500',
  },
  
  manualModeCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  
  manualModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  
  manualModeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0c4a6e',
  },
  
  manualModeText: {
    fontSize: 13,
    color: '#0369a1',
    lineHeight: 18,
  },

  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 13,
    color: '#666666',
    marginTop: 4,
    lineHeight: 16,
    fontWeight: '400',
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },

  documentButton: {
    backgroundColor: '#000000',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  documentButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  documentPreview: {
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  previewImage: {
    width: 200,
    height: 120,
    borderRadius: 6,
    resizeMode: 'cover',
    marginBottom: 12,
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  documentStatusText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 13,
    flex: 1,
  },
  changeButton: {
    backgroundColor: '#666666',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  changeButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  avatarButton: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f8f8',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000000',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  submitButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  submitButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonLoadingText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '400',
  },

  bonusCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  bonusTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  bonusText: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },

  legalText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '400',
  },
});
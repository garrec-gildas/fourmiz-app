// app/auth/complete-profile.tsx - VERSION COMPLÈTE FUSIONNÉE
// ✅ CONSERVÉ: Toutes les fonctionnalités existantes exactement comme avant
// 🆕 AJOUTÉ: Fonctionnalité d'adresse avec autocomplete et validation GPS
// 🆕 AJOUTÉ: Fonctionnalité de consentement de tracking pour les Fourmiz
// 🔧 CORRIGÉ: Supprimé la redirection automatique vers /criteria 
// 🔧 CORRIGÉ: Ajouté synchronisation forcée des rôles après sauvegarde
// 🔧 CORRIGÉ: Nettoyage cache AsyncStorage pour éviter les désynchronisations
// 🔧 CORRIGÉ: Génération de codes de parrainage en 6 caractères au lieu de 8

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Image,
  KeyboardAvoidingView,
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

// 🆕 AJOUTÉ: Imports pour l'adresse avec autocomplete
import { AddressInputWithAutocomplete } from '../../src/components/AddressInputWithAutocomplete';
import { validateAddressFormat, validatePostalCodeCityCoherence } from '../../src/utils/addressValidation';
import type { AddressSuggestion } from '../../src/types/address';

// 🆕 AJOUTÉ: Imports pour le tracking consent
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

// 🆕 AJOUTÉ: Import pour la synchronisation des rôles
import { useRoleManagerAdapter } from '../../hooks/useRoleManagerAdapter';

// Types TypeScript
type UserRole = 'client' | 'fourmiz';
type LegalStatus = 'particulier' | 'travailleur_independant' | 'entreprise';
type ProfileUpdate = Database['public']['tables']['profiles']['Update'];

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
  // 🆕 AJOUTÉ: Propriétés pour l'adresse avec autocomplete
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
  syncingRoles: boolean; // 🆕 AJOUTÉ: État de synchronisation des rôles
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

// Constantes et helpers
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

// 🆕 AJOUTÉ: Fonction de nettoyage du cache
const clearRoleCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('user_last_role_preference');
    await AsyncStorage.removeItem('savedRole');
    console.log('🧹 Cache des rôles nettoyé');
  } catch (error) {
    console.warn('⚠️ Erreur nettoyage cache rôles:', error);
  }
};

// Fonctions utilitaires
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
    throw new Error(`Conversion échouée: ${error.message}`);
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
  const isImageEditMode = edit_mode === 'images';
  const shouldFocusDocument = focus === 'document';

  // 🆕 AJOUTÉ: Hook pour la gestion des rôles
  const { reloadProfile, currentRole } = useRoleManagerAdapter();

  // 🆕 AJOUTÉ: État et hook pour le tracking consent
  const [trackingConsents, setTrackingConsents] = useState<TrackingConsents>({
    mission: true,  // Par défaut autorisé pour les missions
    offDuty: false, // Par défaut refusé hors mission (respect vie privée)
    dataRetention: 30
  });

  const [session, setSession] = useState<UserSession | null>(null);

  // Hook pour la gestion des consentements
  const { saveConsents: saveTrackingConsents, isLoading: isTrackingLoading } = useTrackingConsents(session?.user?.id);

  const [engagementFormData, setEngagementFormData] = useState<EngagementFormData>({});
  const [engagementValidation, setEngagementValidation] = useState<EngagementValidation>({
    isValid: true,
    acceptedCount: 0,
    totalRequired: 0
  });

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
    // 🆕 AJOUTÉ: Initialisation des propriétés d'adresse
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
    syncingRoles: false, // 🆕 AJOUTÉ
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const handleEngagementFormDataChange = useCallback((data: Partial<EngagementFormData>) => {
    setEngagementFormData(prev => ({ ...prev, ...data }));
  }, []);

  const handleEngagementValidationChange = useCallback((validation: EngagementValidation) => {
    setEngagementValidation(validation);
  }, []);

  // 🆕 AJOUTÉ: Gestionnaire pour les changements de consentement tracking
  const handleTrackingConsentChange = useCallback((newConsents: TrackingConsents) => {
    setTrackingConsents(newConsents);
    console.log('📍 Consentements tracking mis à jour:', newConsents);
  }, []);

  // 🆕 AJOUTÉ: Gestion de la sélection d'adresse depuis l'autocomplete
  const handleAddressSelected = useCallback((selectedAddress: AddressSuggestion) => {
    console.log('Adresse sélectionnée:', selectedAddress);
    
    setFormData(prev => ({
      ...prev,
      address: selectedAddress.label,
      selectedAddressCoordinates: {
        latitude: selectedAddress.coordinates[1],
        longitude: selectedAddress.coordinates[0]
      },
      addressValidationStatus: {
        isValidated: true,
        confidence: selectedAddress.score,
        formattedAddress: selectedAddress.label
      },
      // Auto-remplir le code postal et la ville si pas déjà remplis
      postalCode: prev.postalCode || selectedAddress.postcode,
      city: prev.city || selectedAddress.city
    }));
    
    // Effacer les erreurs d'adresse
    if (errors.address) {
      setErrors(prev => ({ ...prev, address: undefined }));
    }
  }, [errors.address]);

  // Validation finale avant sauvegarde
  const validateFinalDataForDatabase = useCallback((data: CompleteProfileFormData): string | null => {
    console.log('🔍 Validation finale des données:', {
      roles: data.roles,
      phone: data.phone,
      postalCode: data.postalCode,
      isFourmiz: data.roles.includes('fourmiz'),
      addressValidated: data.addressValidationStatus.isValidated
    });

    // Validation stricte des rôles
    if (!data.roles || data.roles.length === 0) {
      return 'Aucun rôle sélectionné - impossible de sauvegarder';
    }

    // Validation format téléphone final
    const phoneClean = data.phone.replace(/\s/g, '');
    if (!VALIDATION_RULES.phone.test(phoneClean)) {
      return `Format téléphone invalide: ${data.phone}`;
    }

    // Validation code postal final
    if (!VALIDATION_RULES.postalCode.test(data.postalCode)) {
      return `Code postal invalide: ${data.postalCode}`;
    }

    // Validation Fourmiz spécifique
    if (data.roles.includes('fourmiz')) {
      if (!data.idDocumentUri && !data.existingDocumentUrl) {
        return 'Document d\'identité manquant pour Fourmiz';
      }

      if (!engagementValidation.isValid) {
        return 'Engagements légaux non validés pour Fourmiz';
      }
    }

    console.log('✅ Validation finale réussie');
    return null;
  }, [engagementValidation]);

  // 🆕 AJOUTÉ: Fonction de synchronisation des rôles
  const syncRolesAfterSave = useCallback(async (newRoles: UserRole[]): Promise<void> => {
    console.log('🔄 Début synchronisation des rôles:', newRoles);
    setUiState(prev => ({ ...prev, syncingRoles: true }));

    try {
      // Nettoyage du cache
      await clearRoleCache();
      
      // Force le rechargement du profil
      if (reloadProfile) {
        console.log('🔄 Rechargement forcé du profil...');
        await reloadProfile();
      }

      // Sauvegarde de la nouvelle préférence de rôle
      const primaryRole = newRoles.includes('fourmiz') ? 'fourmiz' : 'client';
      await AsyncStorage.setItem('user_last_role_preference', primaryRole);
      console.log('💾 Nouvelle préférence de rôle sauvée:', primaryRole);

      // Délai pour la synchronisation des hooks
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('✅ Synchronisation des rôles terminée');
    } catch (error) {
      console.error('❌ Erreur synchronisation rôles:', error);
    } finally {
      setUiState(prev => ({ ...prev, syncingRoles: false }));
    }
  }, [reloadProfile]);

  // 🆕 AJOUTÉ: Validation optionnelle côté serveur
  const validateAddressOnServer = useCallback(async (
    address: string, 
    postalCode: string, 
    city: string
  ): Promise<{
    isValid: boolean;
    coordinates?: { latitude: number; longitude: number };
    error?: string;
  }> => {
    try {
      const response = await fetch('/api/address/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          postalCode,
          city,
          userId: session?.user?.id
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur de validation serveur');
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.warn('Erreur validation serveur:', error);
      return {
        isValid: false,
        error: 'Impossible de valider l\'adresse côté serveur'
      };
    }
  }, [session?.user?.id]);

  // 🆕 MODIFIÉ: Validation stricte avec consentements tracking
  const validateStrictRequirements = useCallback((): StrictValidationResult => {
    if (formData.roles.length === 0) {
      return { isValid: false, message: 'Vous devez sélectionner au moins un rôle (Client ou Fourmiz)' };
    }

    if (!formData.firstname?.trim() || formData.firstname.trim().length < VALIDATION_RULES.minNameLength) {
      return { isValid: false, message: 'Le prénom est obligatoire (minimum 2 caractères)' };
    }
    
    if (!formData.lastname?.trim() || formData.lastname.trim().length < VALIDATION_RULES.minNameLength) {
      return { isValid: false, message: 'Le nom est obligatoire (minimum 2 caractères)' };
    }

    const phoneClean = formData.phone?.replace(/\s/g, '') || '';
    if (!phoneClean || !VALIDATION_RULES.phone.test(phoneClean)) {
      return { isValid: false, message: 'Numéro de téléphone invalide (ex: 06 12 34 56 78)' };
    }

    if (!formData.address?.trim() || formData.address.trim().length < VALIDATION_RULES.minAddressLength) {
      return { isValid: false, message: 'Adresse complète requise (minimum 10 caractères)' };
    }

    if (!formData.postalCode?.trim() || !VALIDATION_RULES.postalCode.test(formData.postalCode)) {
      return { isValid: false, message: 'Code postal invalide (5 chiffres requis)' };
    }

    if (!formData.city?.trim() || formData.city.trim().length < VALIDATION_RULES.minNameLength) {
      return { isValid: false, message: 'Ville obligatoire (minimum 2 caractères)' };
    }

    if (!formData.legalStatus) {
      return { isValid: false, message: 'Statut juridique obligatoire' };
    }

    if (['travailleur_independant', 'entreprise'].includes(formData.legalStatus)) {
      if (!formData.rcsNumber?.trim() || formData.rcsNumber.trim().length < VALIDATION_RULES.minRcsLength) {
        return { isValid: false, message: 'Numéro RCS obligatoire pour ce statut juridique' };
      }
    }

    if (formData.roles.includes('fourmiz')) {
      if (!formData.idDocumentUri && !formData.existingDocumentUrl) {
        return { isValid: false, message: 'Pièce d\'identité obligatoire pour les Fourmiz' };
      }
      
      if (!engagementValidation.isValid) {
        return { 
          isValid: false, 
          message: engagementValidation.error || 'Acceptation des engagements légaux obligatoire pour les Fourmiz' 
        };
      }

      // 🆕 AJOUTÉ: Validation des consentements tracking (optionnel mais recommandé)
      if (!trackingConsents.mission) {
        return {
          isValid: false,
          message: 'Le consentement de suivi pendant les missions est fortement recommandé pour la sécurité et l\'efficacité du service'
        };
      }
    }

    return { isValid: true, message: '' };
  }, [formData, engagementValidation, trackingConsents]);

  const isFormValid = useCallback((): boolean => {
    return validateStrictRequirements().isValid;
  }, [validateStrictRequirements]);

  const getFormProgress = useCallback((): { completed: number; total: number; percentage: number } => {
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

  const getValidationHints = useCallback((): string[] => {
    const hints: string[] = [];
    
    if (formData.roles.length === 0) hints.push('Sélectionnez au moins un rôle');
    if (!formData.firstname.trim() || formData.firstname.trim().length < 2) hints.push('Renseignez votre prénom');
    if (!formData.lastname.trim() || formData.lastname.trim().length < 2) hints.push('Renseignez votre nom');
    if (!formData.phone.trim()) hints.push('Renseignez votre téléphone');
    else if (!VALIDATION_RULES.phone.test(formData.phone.replace(/\s/g, ''))) hints.push('Format de téléphone invalide');
    if (!formData.address.trim() || formData.address.trim().length < 10) hints.push('Renseignez votre adresse complète');
    if (!formData.postalCode.trim()) hints.push('Renseignez votre code postal');
    else if (!VALIDATION_RULES.postalCode.test(formData.postalCode)) hints.push('Code postal invalide');
    if (!formData.city.trim()) hints.push('Renseignez votre ville');
    
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
  }, [formData, engagementValidation]);

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
        file_path: `${userId}/id-document-${Date.now()}`,
        file_data: `data:${metadata.mimeType || 'image/jpeg'};base64,${base64}`,
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

  const prefillFormData = useCallback(async (currentUser: UserSession['user']): Promise<void> => {
    if (isEditMode && isDataLoaded) {
      return;
    }

    try {
      setUiState(prev => ({ ...prev, prefilling: true }));

      let prefillData = {
        firstname: '',
        lastname: '',
        phone: '',
      };

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('firstname, lastname, phone')
        .eq('user_id', currentUser.id)
        .single();

      if (existingProfile) {
        prefillData.firstname = existingProfile.firstname || existingProfile.prenom || existingProfile.first_name || '';
        prefillData.lastname = existingProfile.lastname || existingProfile.nom || existingProfile.last_name || '';
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
  }, [isEditMode, isDataLoaded]);

  const loadUserSession = useCallback(async (): Promise<void> => {
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

      await loadExistingProfile(currentUser.id);

      if (!isEditMode || !isDataLoaded) {
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
  }, [prefillFormData, isEditMode, isDataLoaded]);

  // 🆕 MODIFIÉ: Chargement des données existantes avec consentements tracking
  const loadExistingProfile = useCallback(async (userId: string): Promise<void> => {
    try {
      console.log('🔍 Chargement profil existant pour:', userId);
      
      const { data: existingProfile, error } = await supabase
        .from('profiles')
        .select(`
          firstname,
          lastname,
          phone,
          address,
          building,
          floor,
          postal_code,
          city,
          roles,
          legal_status,
          rcs_number,
          id_document_path,
          avatar_url,
          profile_completed,
          criteria_completed,
          latitude,
          longitude,
          formatted_address,
          address_confidence,
          address_validated_at,
          tracking_consent_mission,
          tracking_consent_off_duty,
          tracking_consent_date,
          data_retention_days
        `)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Aucun profil existant trouvé - création en cours');
          return;
        }
        
        console.error('❌ Erreur chargement profil:', error);
        const { userMessage } = handleSupabaseError(error, 'Chargement profil');
        Alert.alert('Erreur', `Impossible de charger votre profil: ${userMessage}`);
        return;
      }

      if (existingProfile) {
        console.log('✅ Profil existant trouvé:', {
          roles: existingProfile.roles,
          profile_completed: existingProfile.profile_completed
        });

        // Vérification redirection profil complété
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

          // 🆕 AJOUTÉ: Chargement des données d'adresse avec GPS
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
            // 🆕 AJOUTÉ: Chargement des données GPS
            selectedAddressCoordinates,
            addressValidationStatus,
          }));

          // 🆕 AJOUTÉ: Chargement des consentements tracking existants
          if (existingProfile.roles?.includes('fourmiz')) {
            console.log('📍 Chargement consentements tracking existants...');
            
            setTrackingConsents({
              mission: existingProfile.tracking_consent_mission ?? true,
              offDuty: existingProfile.tracking_consent_off_duty ?? false,
              dataRetention: existingProfile.data_retention_days ?? 30,
              lastUpdated: existingProfile.tracking_consent_date
            });
          }

          setIsDataLoaded(true);
          
        } else {
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
            // 🆕 AJOUTÉ: Chargement des données GPS
            selectedAddressCoordinates,
            addressValidationStatus,
          }));

          // 🆕 AJOUTÉ: Chargement des consentements tracking existants
          if (existingProfile.roles?.includes('fourmiz')) {
            console.log('📍 Chargement consentements tracking existants...');
            
            setTrackingConsents({
              mission: existingProfile.tracking_consent_mission ?? true,
              offDuty: existingProfile.tracking_consent_off_duty ?? false,
              dataRetention: existingProfile.data_retention_days ?? 30,
              lastUpdated: existingProfile.tracking_consent_date
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Exception loadExistingProfile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert(
        'Erreur de chargement', 
        `Impossible de charger votre profil: ${errorMessage}`
      );
    }
  }, [isEditMode]);

  // 🆕 MODIFIÉ: Validation des champs avec validation d'adresse renforcée
  const validateField = useCallback((field: keyof CompleteProfileFormData, value: any): string | undefined => {
    switch (field) {
      case 'roles':
        return value.length === 0 ? 'Veuillez sélectionner au moins un rôle' : undefined;
      case 'firstname':
        if (!value.trim()) return 'Le prénom est requis';
        if (value.trim().length < VALIDATION_RULES.minNameLength) return 'Le prénom doit contenir au moins 2 caractères';
        return undefined;
      case 'lastname':
        if (!value.trim()) return 'Le nom est requis';
        if (value.trim().length < VALIDATION_RULES.minNameLength) return 'Le nom doit contenir au moins 2 caractères';
        return undefined;
      case 'phone':
        if (!value.trim()) return 'Le téléphone est requis';
        if (!VALIDATION_RULES.phone.test(value.replace(/\s/g, ''))) return 'Format de téléphone invalide (ex: 06 12 34 56 78)';
        return undefined;
      case 'address':
        if (!value.trim()) return 'L\'adresse est requise';
        
        // Validation de format renforcée
        const formatValidation = validateAddressFormat(value);
        if (!formatValidation.isValid) {
          return formatValidation.issues[0] || 'Format d\'adresse invalide';
        }
        
        // Vérifier si l'adresse a été validée par l'autocomplete
        if (!formData.addressValidationStatus.isValidated) {
          return 'Veuillez sélectionner une adresse dans les suggestions ou utiliser une adresse plus précise';
        }
        
        return undefined;
        
      case 'postalCode':
        if (!value.trim()) return 'Le code postal est requis';
        if (!VALIDATION_RULES.postalCode.test(value)) return 'Code postal invalide (5 chiffres)';
        
        // Validation de cohérence avec la ville
        if (formData.city) {
          const coherence = validatePostalCodeCityCoherence(value, formData.city);
          if (!coherence.isValid && coherence.warning) {
            return coherence.warning;
          }
        }
        
        return undefined;
        
      case 'city':
        if (!value.trim()) return 'La ville est requise';
        if (value.trim().length < VALIDATION_RULES.minNameLength) return 'Le nom de ville doit contenir au moins 2 caractères';
        return undefined;
      case 'legalStatus':
        return !value ? 'Veuillez sélectionner votre statut juridique' : undefined;
      case 'rcsNumber':
        if (['travailleur_independant', 'entreprise'].includes(formData.legalStatus)) {
          if (!value.trim()) return 'Le numéro RCS est requis pour ce statut';
          if (value.trim().length < VALIDATION_RULES.minRcsLength) return 'Le numéro RCS doit contenir au moins 9 caractères';
        }
        return undefined;
      default:
        return undefined;
    }
  }, [formData.legalStatus, formData.addressValidationStatus.isValidated, formData.city]);

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
        newErrors.idDocument = 'La pièce d\'identité est requise pour les Fourmiz';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [formData, validateField]);

  const pickIdDocument = useCallback(async (): Promise<void> => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission requise',
          'L\'accès à la galerie est nécessaire pour ajouter votre pièce d\'identité',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() }
          ]
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
        
        if (errors.idDocument) {
          setErrors(prev => ({ ...prev, idDocument: undefined }));
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner le document');
    }
  }, [errors.idDocument]);

  const pickAvatar = useCallback(async (): Promise<void> => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission requise',
          'L\'accès à la galerie est nécessaire pour ajouter votre photo de profil',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() }
          ]
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
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    }
  }, []);

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
        throw new Error(`Fichier trop volumineux (max ${UPLOAD_CONFIG.maxSizeMB}MB)`);
      }

      const uint8ArrayData = await convertToUint8Array(formData.idDocumentUri);

      const fileName = `id-document-${Date.now()}.${fileExtension}`;
      const filePath = `${userId}/${fileName}`;
      
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
                originalName: `id-document.${fileExtension}`,
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
      
      if (!formData.avatarUri || !userId) {
        throw new Error('URI de l\'avatar ou userId manquant');
      }

      const fileInfo = await FileSystem.getInfoAsync(formData.avatarUri);
      if (!fileInfo.exists) {
        throw new Error('Fichier avatar non trouvé');
      }

      const fileSize = fileInfo.size || 0;
      const fileExtension = formData.avatarUri.split('.').pop() || 'jpg';
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
      
      if (fileSize > UPLOAD_CONFIG.maxSizeMB * 1024 * 1024) {
        throw new Error(`Avatar trop volumineux (max ${UPLOAD_CONFIG.maxSizeMB}MB)`);
      }

      const uint8ArrayData = await convertToUint8Array(formData.avatarUri);

      const fileName = `profile_photo-${Date.now()}.${fileExtension}`;
      const filePath = `${userId}/${fileName}`;
      
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
                originalName: `profile_photo.${fileExtension}`,
                uploadMethod: 'uint8Array-avatar'
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
              throw new Error('Validation avatar post-upload échouée');
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
      
      await saveFallbackUpload(userId, formData.avatarUri, {
        originalSize: fileSize,
        originalType: mimeType,
        uploadAttempts: UPLOAD_CONFIG.maxRetries,
        lastError: lastError?.message,
        uploadMethod: 'fallback-avatar'
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
      setUiState(prev => ({ ...prev, uploadingAvatar: false }));
    }
  }, [formData.avatarUri, saveFallbackUpload]);

  // 🔧 CORRIGÉ: Fonction de génération de codes de parrainage - 6 caractères au lieu de 8
  const generateUniqueReferralCode = useCallback(async (): Promise<string | null> => {
    try {
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        // ✅ CORRIGÉ: Génération de 6 caractères au lieu de 8
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
    
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: undefined }));
    }
  }, [errors.phone, formData.phone]);

  // 🆕 MODIFIÉ: handleSubmit avec sauvegarde des consentements tracking
  const handleSubmit = useCallback(async (): Promise<void> => {
    console.log('🚀 Début sauvegarde profil avec validation d\'adresse renforcée');

    const finalValidationError = validateFinalDataForDatabase(formData);
    if (finalValidationError) {
      console.error('❌ Validation finale échouée:', finalValidationError);
      Alert.alert('Validation échouée', finalValidationError);
      return;
    }

    if (!validateForm()) {
      const hints = getValidationHints();
      Alert.alert(
        'Profil incomplet', 
        `Veuillez remplir tous les champs obligatoires :\n\n• ${hints.slice(0, 5).join('\n• ')}`
      );
      return;
    }

    const strictValidation = validateStrictRequirements();
    if (!strictValidation.isValid) {
      Alert.alert('Validation échouée', strictValidation.message);
      return;
    }

    // 🆕 AJOUTÉ: Validation d'adresse renforcée
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
      // 🆕 AJOUTÉ: Validation optionnelle côté serveur (recommandé en production)
      if (process.env.NODE_ENV === 'production' && !isEditMode) {
        const serverValidation = await validateAddressOnServer(
          formData.address,
          formData.postalCode,
          formData.city
        );
        
        if (!serverValidation.isValid) {
          Alert.alert(
            'Validation d\'adresse échouée',
            'Votre adresse n\'a pas pu être validée. Veuillez vérifier les informations saisies.',
            [{ text: 'OK' }]
          );
          setUiState(prev => ({ ...prev, uploading: false }));
          return;
        }
        
        // Mettre à jour les coordonnées avec la validation serveur si disponible
        if (serverValidation.coordinates) {
          setFormData(prev => ({
            ...prev,
            selectedAddressCoordinates: serverValidation.coordinates || prev.selectedAddressCoordinates
          }));
        }
      }

      let documentPath: string | null = null;
      let avatarPath: string | null = null;
      let uploadFallbackUsed = false;

      // Upload des documents pour Fourmiz
      if (formData.roles.includes('fourmiz')) {
        if (formData.idDocumentUri) {
          const uploadResult = await uploadIdDocument(session.user.id);
          
          if (!uploadResult.success) {
            throw new Error(`Échec de l'upload du document: ${uploadResult.error}`);
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

      // Upload avatar
      if (formData.avatarUri) {
        const avatarUploadResult = await uploadAvatar(session.user.id);
        
        if (!avatarUploadResult.success) {
          console.warn('⚠️ Upload avatar échoué, continuation sans avatar');
        } else if (avatarUploadResult.url) {
          avatarPath = avatarUploadResult.url;
        }
      } else if (formData.existingAvatarUrl) {
        avatarPath = formData.existingAvatarUrl;
      }

      const phoneToSave = formData.phone.trim().replace(/\s/g, '');
      if (!VALIDATION_RULES.phone.test(phoneToSave)) {
        throw new Error(`Format téléphone final invalide: ${phoneToSave}`);
      }

      const finalRoles = formData.roles.length > 0 ? formData.roles : ['client'];

      console.log('💾 Données finales à sauvegarder:', {
        userId: session.user.id,
        email: session.user.email,
        roles: finalRoles,
        phone: phoneToSave,
        document: documentPath ? 'Présent' : 'Absent',
        avatar: avatarPath ? 'Présent' : 'Absent',
        addressValidated: formData.addressValidationStatus.isValidated,
        gpsCoordinates: formData.selectedAddressCoordinates ? 'Présent' : 'Absent'
      });

      // 🆕 AJOUTÉ: Inclusion des coordonnées GPS et données d'adresse dans profileData
      const profileData: ProfileUpdate = {
        id: session.user.id,
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
        // criteria_completed reste false car les critères seront configurés séparément
        criteria_completed: false,
        updated_at: new Date().toISOString(),
        // 🆕 AJOUTÉ: Coordonnées GPS et métadonnées d'adresse
        latitude: formData.selectedAddressCoordinates?.latitude || null,
        longitude: formData.selectedAddressCoordinates?.longitude || null,
        formatted_address: formData.addressValidationStatus.formattedAddress || null,
        address_confidence: formData.addressValidationStatus.confidence || null,
        address_validated_at: formData.addressValidationStatus.isValidated 
          ? new Date().toISOString() 
          : null,
      };

      console.log('🔄 Tentative upsert profil...');
      
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        });

      if (profileError) {
        console.error('❌ Erreur Supabase (Sauvegarde profil):', profileError);
        const { userMessage } = handleSupabaseError(profileError, 'Sauvegarde profil');
        throw new Error(userMessage);
      }

      console.log('✅ Profil sauvegardé avec succès');

      // 🆕 AJOUTÉ: Sauvegarde des consentements de tracking pour les Fourmiz
      if (formData.roles.includes('fourmiz')) {
        console.log('💾 Sauvegarde des consentements tracking...');
        
        const trackingSaved = await saveTrackingConsents(trackingConsents);
        
        if (!trackingSaved) {
          console.warn('⚠️ Erreur sauvegarde consentements tracking (continuera sans)');
          // Ne pas bloquer la finalisation, mais avertir l'utilisateur
          Alert.alert(
            'Attention',
            'Vos préférences de géolocalisation n\'ont pas pu être sauvegardées. Vous pourrez les configurer plus tard dans votre profil.',
            [{ text: 'Continuer' }]
          );
        } else {
          console.log('✅ Consentements tracking sauvegardés');
        }
      }

      // 🆕 AJOUTÉ: Synchronisation des rôles après sauvegarde
      await syncRolesAfterSave(finalRoles);

      // Vérification post-sauvegarde
      const { data: verificationData, error: verificationError } = await supabase
        .from('profiles')
        .select('roles, profile_completed')
        .eq('user_id', session.user.id)
        .single();

      if (verificationError) {
        console.warn('⚠️ Impossible de vérifier la sauvegarde:', verificationError);
      } else {
        console.log('✅ Vérification post-sauvegarde:', verificationData);
        
        if (!verificationData.roles || verificationData.roles.length === 0) {
          console.error('❌ CRITIQUE: Rôles toujours vides après sauvegarde !');
          throw new Error('Erreur critique: Les rôles n\'ont pas été sauvegardés correctement');
        }
      }

      // Création du code de parrainage pour nouveaux utilisateurs
      let referralCodeCreated = false;
      if (!isEditMode) {
        referralCodeCreated = await createReferralCodeForUser(session.user.id);
      }

      // Messages de succès pour tous les utilisateurs (pas de redirection automatique)
      let successMessage: string;
      
      if (isEditMode) {
        successMessage = `Votre profil a été mis à jour avec succès${uploadFallbackUsed ? '. Votre document sera traité prochainement.' : ''}`;
      } else {
        if (formData.roles.includes('fourmiz')) {
          successMessage = uploadFallbackUsed 
            ? `Merci ${formData.firstname} ! Votre profil Fourmiz a été créé avec succès${referralCodeCreated ? ' et votre code de parrainage est prêt' : ''}. Votre document d'identité sera traité prochainement. Vous pourrez configurer vos critères de service via votre profil. Bienvenue sur Fourmiz !`
            : `Merci ${formData.firstname} ! Votre profil Fourmiz a été créé avec succès${referralCodeCreated ? ' et votre code de parrainage est prêt' : ''}. Vous pourrez configurer vos critères de service via votre profil. Bienvenue sur Fourmiz !`;
        } else {
          successMessage = uploadFallbackUsed 
            ? `Merci ${formData.firstname} ! Votre profil a été enregistré avec succès${referralCodeCreated ? ' et votre code de parrainage est prêt' : ''}. Votre document d'identité sera traité prochainement. Bienvenue sur Fourmiz !`
            : `Merci ${formData.firstname} ! Votre profil a été enregistré avec succès${referralCodeCreated ? ' et votre code de parrainage est prêt' : ''}. Bienvenue sur Fourmiz !`;
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
                // 🔧 CORRIGÉ: Redirection simple vers l'app sans logique spéciale
                router.replace('/(tabs)');
              }
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('❌ Erreur complète sauvegarde:', error);
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
  }, [validateFinalDataForDatabase, validateForm, getValidationHints, validateStrictRequirements, session, formData, uploadIdDocument, uploadAvatar, createReferralCodeForUser, isEditMode, from, syncRolesAfterSave, validateAddressOnServer, trackingConsents, saveTrackingConsents]);

  const toggleRole = useCallback((role: UserRole): void => {
    const newRoles = formData.roles.includes(role)
      ? formData.roles.filter(r => r !== role)
      : [...formData.roles, role];
    
    setFormData(prev => ({ ...prev, roles: newRoles }));
    
    if (errors.roles) {
      setErrors(prev => ({ ...prev, roles: undefined }));
    }
  }, [formData.roles, errors.roles]);

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
          
          if (errors.legalStatus) {
            setErrors(prev => ({ ...prev, legalStatus: undefined }));
          }
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
  }, [formData.legalStatus, errors.legalStatus]);

  const updateFormData = useCallback((field: keyof CompleteProfileFormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

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
          errors[field as keyof FormErrors] && styles.inputError
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
        <Text style={styles.errorText}>{errors[field as keyof FormErrors]}</Text>
      )}
    </View>
  );

  // 🆕 MODIFIÉ: isSubmitDisabled avec isTrackingLoading
  const isSubmitDisabled = useMemo(() => {
    return uiState.uploading || 
           uiState.syncingRoles || 
           isTrackingLoading || // 🆕 AJOUTÉ
           !isFormValid() || 
           !validateStrictRequirements().isValid;
  }, [uiState.uploading, uiState.syncingRoles, isTrackingLoading, isFormValid, validateStrictRequirements]);

  useEffect(() => {
    loadUserSession();
  }, [loadUserSession]);

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

  const renderRoleButton = (role: UserRole) => {
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
  };

  if (uiState.sessionLoading || uiState.prefilling) return renderLoadingState();
  if (!session) return renderErrorState();

  const progress = getFormProgress();
  const validationHints = getValidationHints();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditMode ? 'Modifier mon profil' : 'Complétez votre profil'}
            </Text>
            <Text style={styles.subtitle}>
              {isEditMode ? 'Modifiez vos informations personnelles' : 'Dernière étape avant de découvrir Fourmiz'}
            </Text>
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Progression: {progress.completed}/{progress.total} étapes ({progress.percentage}%)
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progress.percentage}%` }
                ]} 
              />
            </View>
            {validationHints.length > 0 && (
              <View style={styles.hintsContainer}>
                <Text style={styles.hintsTitle}>À compléter:</Text>
                {validationHints.slice(0, 3).map((hint, index) => (
                  <Text key={index} style={styles.hintText}>• {hint}</Text>
                ))}
                {validationHints.length > 3 && (
                  <Text style={styles.hintText}>• Et {validationHints.length - 3} autre(s)...</Text>
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

          {/* 🆕 AJOUTÉ: Indicateur de synchronisation des rôles */}
          {uiState.syncingRoles && (
            <View style={styles.syncingCard}>
              <ActivityIndicator size="small" color="#000000" />
              <Text style={styles.syncingText}>
                Synchronisation des rôles en cours...
              </Text>
            </View>
          )}

          {(formData.roles.length === 0 || isEditMode) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isEditMode ? 'Vos rôles' : 'Sélectionnez vos rôles'}
              </Text>
              {errors.roles && <Text style={styles.errorText}>{errors.roles}</Text>}
              
              <View style={styles.rolesContainer}>
                {(['client', 'fourmiz'] as const).map(renderRoleButton)}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Photo de profil</Text>
              
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={pickAvatar}
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
            {errors.legalStatus && <Text style={styles.errorText}>{errors.legalStatus}</Text>}
            
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
                    errors.rcsNumber && styles.inputError
                  ]}
                  value={formData.rcsNumber}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, rcsNumber: text }));
                    if (errors.rcsNumber) {
                      setErrors(prev => ({ ...prev, rcsNumber: undefined }));
                    }
                  }}
                  placeholder="123 456 789 R.C.S. Paris"
                  maxLength={50}
                  autoCapitalize="characters"
                />
                {errors.rcsNumber && (
                  <Text style={styles.errorText}>{errors.rcsNumber}</Text>
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

          {/* 🆕 REMPLACÉ: Section adresse avec autocomplete */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse</Text>
            <Text style={styles.sectionDescription}>
              Utilisez l'auto-complétion pour une adresse précise (nécessaire pour la géolocalisation des services)
            </Text>
            
            {/* NOUVEAU COMPOSANT D'ADRESSE AVEC AUTOCOMPLETE */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse complète</Text>
              
              <AddressInputWithAutocomplete
                value={formData.address}
                onChangeText={(text) => {
                  updateFormData('address', text);
                  // Réinitialiser le statut de validation si l'utilisateur tape
                  if (formData.addressValidationStatus.isValidated) {
                    setFormData(prev => ({
                      ...prev,
                      addressValidationStatus: { isValidated: false },
                      selectedAddressCoordinates: null
                    }));
                  }
                }}
                onAddressSelected={handleAddressSelected}
                postalCode={formData.postalCode}
                city={formData.city}
                style={[styles.input, errors.address && styles.inputError]}
                errors={errors.address}
                placeholder="123 rue de la Paix"
                testID="complete-profile-address-input"
              />
              
              {/* Indicateur de validation */}
              {formData.addressValidationStatus.isValidated && (
                <View style={styles.addressValidationSuccess}>
                  <Text style={styles.addressValidationText}>
                    ✅ Adresse validée {formData.addressValidationStatus.confidence 
                      ? `(${Math.round(formData.addressValidationStatus.confidence * 100)}% de confiance)`
                      : ''
                    }
                  </Text>
                  {formData.selectedAddressCoordinates && (
                    <Text style={styles.coordinatesText}>
                      📍 GPS: {formData.selectedAddressCoordinates.latitude.toFixed(6)}, {formData.selectedAddressCoordinates.longitude.toFixed(6)}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                {renderInputField('Bâtiment', 'building', {
                  placeholder: 'Bât. A',
                  maxLength: 20
                })}
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                {renderInputField('Étage', 'floor', {
                  placeholder: '2ème',
                  maxLength: 20
                })}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                {renderInputField('Code postal', 'postalCode', {
                  keyboardType: 'numeric',
                  placeholder: '75001',
                  textContentType: 'postalCode',
                  maxLength: 5
                })}
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                {renderInputField('Ville', 'city', {
                  placeholder: 'Paris',
                  textContentType: 'addressCity',
                  autoCapitalize: 'words',
                  maxLength: 50
                })}
              </View>
            </View>
          </View>

          {formData.roles.includes('fourmiz') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informations Fourmiz</Text>
              <Text style={styles.sectionDescription}>
                Document requis pour vérifier votre identité et activer vos services
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pièce d'identité</Text>
                {errors.idDocument && <Text style={styles.errorText}>{errors.idDocument}</Text>}
                
                <TouchableOpacity
                  style={styles.documentButton}
                  onPress={pickIdDocument}
                  disabled={uiState.uploadingDocument}
                  activeOpacity={0.8}
                >
                  <Text style={styles.documentButtonText}>
                    {(formData.idDocumentUri || formData.existingDocumentUrl) ? 'Modifier le document' : 'Sélectionner un document'}
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
                        onPress={pickIdDocument}
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

          {/* 🆕 AJOUTÉ: Section TrackingConsent pour les Fourmiz */}
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
            disabled={uiState.uploading || uiState.syncingRoles || isTrackingLoading} // 🆕 AJOUTÉ: isTrackingLoading
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
                   isTrackingLoading ? 'Sauvegarde consentements...' : // 🆕 AJOUTÉ
                   'Sauvegarde...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>
                {!isFormValid() ? 'Remplissez tous les champs obligatoires' : 
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// 🆕 AJOUTÉ: Styles pour l'adresse avec autocomplete et synchronisation
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

  content: {
    paddingHorizontal: 24,
    paddingVertical: 0,
    paddingTop: 16,
    paddingBottom: 40,
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

  // 🆕 AJOUTÉ: Styles pour la synchronisation des rôles
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
  inputError: {
    borderColor: '#333333',
    backgroundColor: '#ffffff',
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

  // 🆕 AJOUTÉ: Styles pour l'indicateur de validation d'adresse
  addressValidationSuccess: {
    backgroundColor: '#d4edda',
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
  },
  
  addressValidationText: {
    fontSize: 13,
    color: '#155724',
    fontWeight: '600',
    marginBottom: 4,
  },
  
  coordinatesText: {
    fontSize: 11,
    color: '#155724',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
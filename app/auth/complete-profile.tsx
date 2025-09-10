// app/auth/complete-profile.tsx - COMPLÉTION PROFIL ULTRA-AMÉLIORÉE
// 🚀 Version optimisée avec helpers Supabase, types stricts et validation robuste
// ✅ Compatible avec le système de parrainage optimisé
// 🔧 CORRIGÉ: Fonction generateUniqueCode intégrée (plus de dépendance externe)
// ➕ NOUVEAU: Pré-remplissage automatique des champs nom, prénom, téléphone
// 🛠️ AJOUTÉ: Upload robuste avec fallback + diagnostic intégré

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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  supabase,
  handleSupabaseError,
  getCurrentUser,
  getCurrentSession,
  uploadFile,
  Database
} from '../../lib/supabase';

// ✅ TYPES TYPESCRIPT STRICTS
type UserRole = 'client' | 'fourmiz';
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

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
  rib: string;
  idDocumentUri: string | null;
}

interface FormErrors {
  roles?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  rib?: string;
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
  creatingReferralCode: boolean;
  prefilling: boolean;
  testing: boolean; // ➕ NOUVEAU: État pour le diagnostic
}

// 🛠️ NOUVEAU: Interface pour le résultat d'upload robuste
interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fallbackUsed?: boolean;
}

// 🎭 CONSTANTES ET HELPERS
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

const VALIDATION_RULES = {
  phone: /^(\+33|0)[1-9](\d{8})$/,
  postalCode: /^[0-9]{5}$/,
  minNameLength: 2,
  minAddressLength: 10,
  minRibLength: 23,
} as const;

// 🔧 Configuration d'upload robuste
const UPLOAD_CONFIG = {
  maxRetries: 3,
  timeoutMs: 30000,
  chunkSize: 1024 * 1024, // 1MB chunks
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  maxSizeMB: 10
};

// ➕ NOUVEAU: Helper pour formater le téléphone
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  // Supprimer tout sauf les chiffres
  const numbers = phone.replace(/\D/g, '');
  // Formater: 06 12 34 56 78
  if (numbers.length >= 10) {
    return numbers.slice(0, 10).replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return numbers;
};

// ⏱️ Helper: Timeout wrapper
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Upload timeout')), ms)
    )
  ]);
};

export default function CompleteProfileScreen() {
  // 📱 PARAMÈTRES URL
  const { roles: paramRoles } = useLocalSearchParams();
  const initialRoles = useMemo(() => {
    return (paramRoles as string)?.split(',').filter(role => 
      ['client', 'fourmiz'].includes(role)
    ) as UserRole[] || [];
  }, [paramRoles]);

  // ✅ ÉTAT LOCAL TYPÉ
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
    rib: '',
    idDocumentUri: null
  });

  const [uiState, setUiState] = useState<UiState>({
    sessionLoading: true,
    uploading: false,
    uploadingDocument: false,
    creatingReferralCode: false,
    prefilling: false,
    testing: false // ➕ NOUVEAU
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [session, setSession] = useState<UserSession | null>(null);

  // 🧪 NOUVEAU: Test diagnostic storage complet
  const runStorageDiagnostic = useCallback(async (): Promise<void> => {
    setUiState(prev => ({ ...prev, testing: true }));
    
    try {
      // Étape 1: Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        Alert.alert('❌ Erreur Auth', `Utilisateur non connecté: ${authError?.message}`);
        return;
      }
      
      // Étape 2: Test avec fichier minimal
      const testContent = `Test upload ${new Date().toISOString()}`;
      const testBlob = new Blob([testContent], { type: 'text/plain' });
      const testPath = `${user.id}/diagnostic-${Date.now()}.txt`;
      
      // Étape 3: Upload avec timeout personnalisé
      const uploadPromise = supabase.storage
        .from('user-documents')
        .upload(testPath, testBlob, {
          cacheControl: '3600',
          upsert: false
        });
      
      // Timeout de 10 secondes pour le diagnostic
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout après 10s')), 10000)
      );
      
      const startTime = Date.now();
      const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);
      const endTime = Date.now();
      
      if (error) {
        console.error('❌ Erreur upload:', error);
        Alert.alert(
          '❌ Erreur Upload Détectée', 
          `Code: ${error.statusCode || 'N/A'}\nMessage: ${error.message}\nTemps: ${endTime - startTime}ms\n\n🔍 Ceci nous aide à diagnostiquer !\n\n➡️ Vérifiez la configuration Supabase Storage.`
        );
        return;
      }
      
      // Étape 4: Vérifier l'URL publique
      const { data: urlData } = supabase.storage
        .from('user-documents')
        .getPublicUrl(testPath);
      
      // Étape 5: Nettoyer le fichier test
      const { error: deleteError } = await supabase.storage
        .from('user-documents')
        .remove([testPath]);
      
      if (deleteError) {
        console.warn('⚠️ Nettoyage échoué:', deleteError);
      }
      
      // Succès total !
      Alert.alert(
        '✅ Test Upload Réussi !', 
        `Votre Storage fonctionne parfaitement !\n\n⏱️ Temps: ${endTime - startTime}ms\n🔗 URL: OK\n🗑️ Nettoyage: ${deleteError ? 'Échoué' : 'OK'}\n\n➡️ Le problème "Network request failed" ne vient pas de la configuration Storage.`
      );
      
    } catch (error: any) {
      console.error('❌ Erreur critique test:', error);
      
      if (error.message === 'Timeout après 10s') {
        Alert.alert(
          '❌ Timeout Upload', 
          'L\'upload prend trop de temps (>10s).\n\nCauses probables:\n• Connexion lente\n• Fichier trop volumineux\n• Serveur surchargé\n\n➡️ Essayez avec une meilleure connexion ou un fichier plus petit.'
        );
      } else {
        Alert.alert(
          '❌ Erreur Test', 
          `${error.message}\n\nType: ${error.name || 'Inconnu'}\n\n➡️ Vérifiez votre configuration Supabase.`
        );
      }
    } finally {
      setUiState(prev => ({ ...prev, testing: false }));
    }
  }, []);

  // 💾 NOUVEAU: Fallback pour sauvegarder en base si upload échoue
  const saveFallbackUpload = useCallback(async (
    userId: string, 
    fileUri: string, 
    metadata: any
  ): Promise<void> => {
    try {
      
      // Convertir le fichier en base64 pour sauvegarde temporaire
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const { error } = await supabase.from('pending_uploads').insert({
        user_id: userId,
        file_path: `${userId}/id-document-${Date.now()}`,
        file_data: base64,
        metadata: metadata,
        status: 'pending'
      });

      if (error) {
        console.error('❌ Erreur sauvegarde fallback:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Erreur critique fallback:', error);
      throw error;
    }
  }, []);

  // ➕ NOUVEAU: Fonction de pré-remplissage intelligent
  const prefillFormData = useCallback(async (currentUser: UserSession['user']): Promise<void> => {
    try {
      setUiState(prev => ({ ...prev, prefilling: true }));

      let prefillData = {
        firstname: '',
        lastname: '',
        phone: '',
      };

      // PRIORITÉ 1: Vérifier s'il y a déjà un profil en base
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('firstname, lastname, phone, prenom, nom, first_name, last_name')
        .eq('user_id', currentUser.id)
        .single();

      if (existingProfile) {
        
        // Construction intelligente depuis le profil
        prefillData.firstname = existingProfile.firstname || existingProfile.prenom || existingProfile.first_name || '';
        prefillData.lastname = existingProfile.lastname || existingProfile.nom || existingProfile.last_name || '';
        prefillData.phone = formatPhoneNumber(existingProfile.phone || '');
      }

      // PRIORITÉ 2: Métadonnées utilisateur (données d'inscription)
      if (!prefillData.firstname || !prefillData.lastname || !prefillData.phone) {
        
        if (currentUser.user_metadata) {
          if (!prefillData.firstname && currentUser.user_metadata.firstname) {
            prefillData.firstname = currentUser.user_metadata.firstname;
          }
          
          if (!prefillData.lastname && currentUser.user_metadata.lastname) {
            prefillData.lastname = currentUser.user_metadata.lastname;
          }
          
          if (!prefillData.phone && currentUser.user_metadata.phone) {
            prefillData.phone = formatPhoneNumber(currentUser.user_metadata.phone);
          }
        }
      }

      // PRIORITÉ 3: Extraire depuis l'email si nécessaire
      if (!prefillData.firstname && !prefillData.lastname && currentUser.email) {
        const emailPart = currentUser.email.split('@')[0];
        
        // Essayer de détecter prénom.nom
        if (emailPart.includes('.')) {
          const parts = emailPart.split('.');
          if (parts.length >= 2) {
            prefillData.firstname = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            prefillData.lastname = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
          }
        }
      }

      // Application des données pré-remplies
      
      setFormData(prev => ({
        ...prev,
        firstname: prefillData.firstname.trim(),
        lastname: prefillData.lastname.trim(),
        phone: prefillData.phone.trim(),
      }));

    } catch (error) {
      console.warn('⚠️ Erreur lors du pré-remplissage:', error);
      // Ne pas bloquer l'utilisateur si le pré-remplissage échoue
    } finally {
      setUiState(prev => ({ ...prev, prefilling: false }));
    }
  }, []);

  // 🔄 CHARGEMENT DE LA SESSION UTILISATEUR (MODIFIÉ avec pré-remplissage)
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

      // Vérifier si le profil existe déjà et est complet
      await loadExistingProfile(currentUser.id);

      // ➕ NOUVEAU: Pré-remplir les champs automatiquement
      await prefillFormData(userSession.user);

    } catch (error) {
      console.error('❌ Erreur chargement session:', error);
      const { userMessage } = handleSupabaseError(error, 'Session utilisateur');
      
      Alert.alert(
        'Erreur de session',
        userMessage,
        [{ text: 'Réessayer', onPress: () => router.replace('/auth/signin') }]
      );
    } finally {
      setUiState(prev => ({ ...prev, sessionLoading: false }));
    }
  }, [prefillFormData]);

  // 📋 CHARGEMENT DU PROFIL EXISTANT (SI EXISTE) - MODIFIÉ pour ne pas écraser le pré-remplissage
  const loadExistingProfile = useCallback(async (userId: string): Promise<void> => {
    try {
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
          rib,
          id_document_path,
          profile_completed
        `)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Impossible de charger le profil existant:', error);
        return;
      }

      if (existingProfile) {
        
        // Si le profil est déjà complet, rediriger
        if (existingProfile.profile_completed && existingProfile.firstname && existingProfile.lastname) {
          Alert.alert(
            'Profil déjà complété',
            'Votre profil est déjà rempli. Redirection vers l\'application...',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
          );
          return;
        }
        
        // ✅ AMÉLIORATION: Ne pré-remplir que les champs non critiques (adresse, etc.)
        // Les champs nom/prénom/téléphone seront gérés par prefillFormData()
        setFormData(prev => ({
          ...prev,
          address: existingProfile.address || '',
          building: existingProfile.building || '',
          floor: existingProfile.floor || '',
          postalCode: existingProfile.postal_code || '',
          city: existingProfile.city || '',
          roles: (existingProfile.roles as UserRole[]) || prev.roles,
          rib: existingProfile.rib || '',
          // Note: ne pas écraser firstname, lastname, phone qui sont gérés par prefillFormData
        }));
      }
    } catch (error) {
      console.warn('⚠️ Erreur chargement profil existant:', error);
      // Ne pas bloquer l'utilisateur si on ne peut pas charger le profil existant
    }
  }, []);

  // 🛠️ VALIDATION ROBUSTE DU FORMULAIRE
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
        if (value.trim().length < VALIDATION_RULES.minAddressLength) return 'L\'adresse doit être plus précise';
        return undefined;
      
      case 'postalCode':
        if (!value.trim()) return 'Le code postal est requis';
        if (!VALIDATION_RULES.postalCode.test(value)) return 'Code postal invalide (5 chiffres)';
        return undefined;
      
      case 'city':
        if (!value.trim()) return 'La ville est requise';
        if (value.trim().length < VALIDATION_RULES.minNameLength) return 'Le nom de ville doit contenir au moins 2 caractères';
        return undefined;
      
      default:
        return undefined;
    }
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Validation des champs principaux
    (['roles', 'firstname', 'lastname', 'phone', 'address', 'postalCode', 'city'] as const).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    // Validation spécifique pour les Fourmiz
    if (formData.roles.includes('fourmiz')) {
      if (!formData.rib.trim()) {
        newErrors.rib = 'Le RIB est requis pour les Fourmiz';
        isValid = false;
      } else if (formData.rib.length < VALIDATION_RULES.minRibLength) {
        newErrors.rib = 'Le RIB doit contenir 23 caractères minimum';
        isValid = false;
      }

      if (!formData.idDocumentUri) {
        newErrors.idDocument = 'La pièce d\'identité est requise pour les Fourmiz';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [formData, validateField]);

  // 🖼️ SÉLECTION DE DOCUMENT D'IDENTITÉ
  const pickIdDocument = useCallback(async (): Promise<void> => {
    try {
      // Demander permission
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

      // Lancer le sélecteur d'image
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
        
        // Effacer l'erreur de document si elle existe
        if (errors.idDocument) {
          setErrors(prev => ({ ...prev, idDocument: undefined }));
        }
      }
    } catch (error) {
      console.error('❌ Erreur sélection document:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le document');
    }
  }, [errors.idDocument]);

  // ☁️ UPLOAD DU DOCUMENT D'IDENTITÉ - VERSION ULTRA-ROBUSTE
  const uploadIdDocument = useCallback(async (userId: string): Promise<UploadResult> => {
    if (!formData.idDocumentUri) {
      return { success: true, url: null };
    }
    
    try {
      setUiState(prev => ({ ...prev, uploadingDocument: true }));

      // Validation préliminaire
      if (!formData.idDocumentUri || !userId) {
        throw new Error('URI du fichier ou userId manquant');
      }

      // Récupérer les données du fichier
      const response = await fetch(formData.idDocumentUri);
      if (!response.ok) {
        throw new Error(`Erreur lecture fichier: ${response.status}`);
      }
      
      const blob = await response.blob();
      const fileSize = blob.size;
      const fileType = blob.type;
      
      // Validations
      if (fileSize > UPLOAD_CONFIG.maxSizeMB * 1024 * 1024) {
        throw new Error(`Fichier trop volumineux (max ${UPLOAD_CONFIG.maxSizeMB}MB)`);
      }
      
      if (!UPLOAD_CONFIG.allowedTypes.includes(fileType)) {
        throw new Error(`Type de fichier non supporté: ${fileType}`);
      }

      // Chemin unique pour le fichier - CORRIGÉ pour utiliser le chemin qui marche
      const fileName = `id-document-${Date.now()}.${fileType.split('/')[1]}`;
      const filePath = `${userId}/id-document-${fileName}`; // ✅ CORRECTION: Utiliser le chemin qui marche
      
      // Upload avec retry
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= UPLOAD_CONFIG.maxRetries; attempt++) {
        try {
          
          const uploadPromise = supabase.storage
            .from('user-documents')
            .upload(filePath, blob, {
              cacheControl: '3600',
              upsert: false,
              metadata: {
                userId,
                uploadedAt: new Date().toISOString(),
                originalName: `id-document.${fileType.split('/')[1]}`
              }
            });
          
          const { data, error } = await withTimeout(
            uploadPromise, 
            UPLOAD_CONFIG.timeoutMs
          );
          
          if (error) {
            throw error;
          }
          
          // Succès - Générer l'URL publique
          const { data: urlData } = supabase.storage
            .from('user-documents')
            .getPublicUrl(filePath);
          
          return {
            success: true,
            url: urlData.publicUrl
          };
          
        } catch (error) {
          lastError = error as Error;
          console.warn(`❌ Tentative ${attempt} échouée:`, error);
          
          if (attempt < UPLOAD_CONFIG.maxRetries) {
            // Attendre avant retry (backoff exponentiel)
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // Toutes les tentatives ont échoué - Utiliser le fallback
      
      await saveFallbackUpload(userId, formData.idDocumentUri, {
        originalSize: fileSize,
        originalType: fileType,
        uploadAttempts: UPLOAD_CONFIG.maxRetries,
        lastError: lastError?.message
      });
      
      return {
        success: true,
        url: null, // Pas d'URL car sauvegardé en base
        fallbackUsed: true
      };
      
    } catch (error) {
      console.error('❌ Erreur upload critique:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    } finally {
      setUiState(prev => ({ ...prev, uploadingDocument: false }));
    }
  }, [formData.idDocumentUri, saveFallbackUpload]);

  // 🔧 FONCTION DE GÉNÉRATION DE CODE UNIQUE (INTÉGRÉE - PLUS DE DÉPENDANCE EXTERNE)
  const generateUniqueReferralCode = useCallback(async (): Promise<string | null> => {
    try {
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        // Générer un code de 8 caractères : 5 lettres + 3 chiffres
        const letters = Math.random().toString(36).substring(2, 7).toUpperCase();
        const numbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const code = letters + numbers;
        
        // Vérifier l'unicité du code
        const { data: existingCode } = await supabase
          .from('user_referral_codes')
          .select('id')
          .eq('code', code)
          .single();
        
        // Si le code n'existe pas, on peut l'utiliser
        if (!existingCode) {
          return code;
        }
        
        attempts++;
      }
      
      console.error('❌ Impossible de générer un code unique après', maxAttempts, 'tentatives');
      return null;
      
    } catch (error) {
      console.error('💥 Erreur génération code unique:', error);
      return null;
    }
  }, []);

  // ➕ CRÉATION DU CODE DE PARRAINAGE (VERSION CORRIGÉE)
  const createReferralCodeForUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      setUiState(prev => ({ ...prev, creatingReferralCode: true }));

      // 🔧 CORRECTION: Utiliser la fonction intégrée au lieu d'un import externe
      const uniqueCode = await generateUniqueReferralCode();
      
      if (!uniqueCode) {
        console.warn('⚠️ Impossible de générer un code unique');
        return false;
      }

      // Créer l'entrée dans la table des codes de parrainage
      const { error } = await supabase
        .from('user_referral_codes')
        .insert({
          user_id: userId,
          code: uniqueCode,
          is_active: true,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Erreur création code parrainage:', error);
        return false;
      }
      return true;

    } catch (error) {
      console.error('💥 Exception création code parrainage:', error);
      return false;
    } finally {
      setUiState(prev => ({ ...prev, creatingReferralCode: false }));
    }
  }, [generateUniqueReferralCode]);

  // ➕ NOUVEAU: Fonction pour formater le téléphone en temps réel
  const handlePhoneChange = useCallback((text: string) => {
    const formatted = formatPhoneNumber(text);
    setFormData(prev => ({ ...prev, phone: formatted }));
    
    // Effacer l'erreur du téléphone si elle existe
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: undefined }));
    }
  }, [errors.phone]);

  // 💾 SAUVEGARDE DU PROFIL COMPLET - MODIFIÉE avec upload robuste
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!validateForm()) {
      Alert.alert('Formulaire incomplet', 'Veuillez corriger les erreurs avant de continuer');
      return;
    }

    if (!session?.user) {
      Alert.alert('Session expirée', 'Veuillez vous reconnecter');
      router.replace('/auth/signin');
      return;
    }
    console.log('📋 Données:', {
      roles: formData.roles,
      user: session.user.email,
      hasFourmizRole: formData.roles.includes('fourmiz'),
      // ✅ LOG des données pré-remplies
      prefillData: {
        firstname: formData.firstname,
        lastname: formData.lastname,
        phone: formData.phone
      }
    });

    setUiState(prev => ({ ...prev, uploading: true }));

    try {
      let documentPath: string | null = null;
      let uploadFallbackUsed = false;

      // Upload du document si nécessaire avec le système robuste
      if (formData.roles.includes('fourmiz') && formData.idDocumentUri) {
        
        const uploadResult = await uploadIdDocument(session.user.id);
        
        if (!uploadResult.success) {
          throw new Error(`Échec de l'upload du document: ${uploadResult.error}`);
        }
        
        if (uploadResult.fallbackUsed) {
          uploadFallbackUsed = true;
          // On continue quand même avec documentPath = null
        } else if (uploadResult.url) {
          documentPath = uploadResult.url;
        }
      }

      // Préparer les données du profil
      const profileData: ProfileUpdate = {
        id: session.user.id,
        email: session.user.email,
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        phone: formData.phone.trim().replace(/\s/g, ''), // Supprimer espaces pour stockage
        address: formData.address.trim(),
        building: formData.building.trim() || null,
        floor: formData.floor.trim() || null,
        postal_code: formData.postalCode.trim(),
        city: formData.city.trim(),
        roles: formData.roles,
        rib: formData.roles.includes('fourmiz') ? formData.rib.trim() : null,
        id_document_path: documentPath,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };

      // Sauvegarder en base avec upsert
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (profileError) {
        console.error('❌ Erreur sauvegarde profil:', profileError);
        const { userMessage } = handleSupabaseError(profileError, 'Sauvegarde profil');
        throw new Error(userMessage);
      }

      // ➕ CRÉATION DU CODE DE PARRAINAGE POUR L'UTILISATEUR
      const referralCodeCreated = await createReferralCodeForUser(session.user.id);
      
      if (referralCodeCreated) {
      } else {
        console.warn('⚠️ Code de parrainage non créé, mais profil sauvegardé');
        // On ne bloque pas l'utilisateur si le code de parrainage échoue
      }

      // Message de succès et redirection
      const successMessage = uploadFallbackUsed 
        ? `Merci ${formData.firstname} ! Votre profil a été enregistré avec succès${referralCodeCreated ? ' et votre code de parrainage est prêt' : ''}. Votre document d'identité sera traité prochainement. Bienvenue sur Fourmiz !`
        : `Merci ${formData.firstname} ! Votre profil a été enregistré avec succès${referralCodeCreated ? ' et votre code de parrainage est prêt' : ''}. Bienvenue sur Fourmiz !`;

      Alert.alert(
        '🎉 Profil complété !',
        successMessage,
        [
          { 
            text: 'Découvrir l\'app', 
            onPress: () => router.replace('/(tabs)') 
          }
        ]
      );

    } catch (error: any) {
      console.error('💥 ERREUR SAUVEGARDE PROFIL:', error);
      
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
  }, [validateForm, session, formData, uploadIdDocument, createReferralCodeForUser]);

  // 🎭 GESTION DES RÔLES
  const toggleRole = useCallback((role: UserRole): void => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
    
    // Effacer l'erreur de rôles si elle existe
    if (errors.roles) {
      setErrors(prev => ({ ...prev, roles: undefined }));
    }
  }, [formData.roles, errors.roles]);

  // 📱 HELPERS DE MISE À JOUR
  const updateFormData = useCallback((field: keyof CompleteProfileFormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Effacer l'erreur du champ modifié
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // 🔄 CHARGEMENT INITIAL
  useEffect(() => {
    loadUserSession();
  }, [loadUserSession]);

  // 📊 RENDU CONDITIONNEL DES ÉTATS
  const renderLoadingState = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4444" />
        <Text style={styles.loadingText}>
          {uiState.prefilling ? 'Pré-remplissage des données...' : 'Vérification de votre session...'}
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

  // 🎨 COMPOSANTS DE RENDU
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
          // ➕ NOUVEAU: Gestion spéciale pour le téléphone
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

  // États de chargement
  if (uiState.sessionLoading || uiState.prefilling) return renderLoadingState();
  if (!session) return renderErrorState();

  // 🎨 RENDU PRINCIPAL
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
          <Text style={styles.title}>Complétez votre profil</Text>
          <Text style={styles.subtitle}>
            Dernière étape avant de découvrir Fourmiz !
          </Text>

          {/* 🧪 NOUVEAU: Bouton de diagnostic (temporaire) */}
          <TouchableOpacity 
            onPress={runStorageDiagnostic}
            disabled={uiState.testing}
            style={styles.diagnosticButton}
          >
            <Text style={styles.diagnosticButtonText}>
              {uiState.testing ? '🔄 Test en cours...' : '🧪 TESTER STORAGE (si problème upload)'}
            </Text>
          </TouchableOpacity>

          {/* ✅ INDICATION SI DES DONNÉES ONT ÉTÉ PRÉ-REMPLIES */}
          {(formData.firstname || formData.lastname || formData.phone) && (
            <View style={styles.prefillNotice}>
              <Text style={styles.prefillNoticeText}>
                ℹ️ Certains champs ont été pré-remplis automatiquement. Vous pouvez les modifier si nécessaire.
              </Text>
            </View>
          )}

          {/* 🎭 Sélection des rôles */}
          {formData.roles.length === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sélectionnez vos rôles *</Text>
              {errors.roles && <Text style={styles.errorText}>{errors.roles}</Text>}
              
              <View style={styles.rolesContainer}>
                {(['client', 'fourmiz'] as const).map(renderRoleButton)}
              </View>
            </View>
          )}

          {/* 📝 Informations personnelles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            
            {renderInputField('Prénom *', 'firstname', {
              placeholder: 'Votre prénom',
              textContentType: 'givenName',
              autoCapitalize: 'words',
              maxLength: 50
            })}

            {renderInputField('Nom *', 'lastname', {
              placeholder: 'Votre nom',
              textContentType: 'familyName',
              autoCapitalize: 'words',
              maxLength: 50
            })}

            {renderInputField('Téléphone *', 'phone', {
              keyboardType: 'phone-pad',
              placeholder: '06 12 34 56 78',
              textContentType: 'telephoneNumber',
              maxLength: 14
            })}
          </View>

          {/* 🏠 Adresse */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse</Text>
            
            {renderInputField('Adresse *', 'address', {
              multiline: true,
              numberOfLines: 2,
              placeholder: '123 rue de la Paix',
              textContentType: 'streetAddressLine1',
              maxLength: 200
            })}

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
                {renderInputField('Code postal *', 'postalCode', {
                  keyboardType: 'numeric',
                  placeholder: '75001',
                  textContentType: 'postalCode',
                  maxLength: 5
                })}
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                {renderInputField('Ville *', 'city', {
                  placeholder: 'Paris',
                  textContentType: 'addressCity',
                  autoCapitalize: 'words',
                  maxLength: 50
                })}
              </View>
            </View>
          </View>

          {/* 🐜 Informations Fourmiz */}
          {formData.roles.includes('fourmiz') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informations Fourmiz</Text>
              <Text style={styles.sectionDescription}>
                Requis pour recevoir vos paiements et vérifier votre identité
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>RIB (IBAN) *</Text>
                <TextInput
                  style={[styles.input, errors.rib && styles.inputError]}
                  value={formData.rib}
                  onChangeText={(text) => updateFormData('rib', text)}
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                  autoCapitalize="characters"
                  maxLength={34}
                />
                {errors.rib && <Text style={styles.errorText}>{errors.rib}</Text>}
                <Text style={styles.helpText}>
                  Votre IBAN pour recevoir les paiements
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pièce d'identité *</Text>
                {errors.idDocument && <Text style={styles.errorText}>{errors.idDocument}</Text>}
                
                <TouchableOpacity
                  style={styles.documentButton}
                  onPress={pickIdDocument}
                  disabled={uiState.uploadingDocument}
                  activeOpacity={0.8}
                >
                  <Text style={styles.documentButtonText}>
                    🖼️ {formData.idDocumentUri ? 'Modifier le document' : 'Sélectionner un document'}
                  </Text>
                </TouchableOpacity>

                {formData.idDocumentUri && (
                  <View style={styles.documentPreview}>
                    <Image 
                      source={{ uri: formData.idDocumentUri }} 
                      style={styles.previewImage} 
                    />
                    <View style={styles.documentStatus}>
                      <Text style={styles.documentStatusText}>
                        ✅ Document prêt (upload robuste avec fallback)
                      </Text>
                      <TouchableOpacity
                        style={styles.changeDocumentButton}
                        onPress={pickIdDocument}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.changeDocumentText}>Changer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <Text style={styles.helpText}>
                  Carte d'identité, passeport ou permis de conduire.{'\n'}
                  📤 Upload ultra-robuste: 3 tentatives + fallback automatique.
                </Text>
              </View>
            </View>
          )}

          {/* 🚀 Bouton de validation */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (uiState.uploading || formData.roles.length === 0) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={uiState.uploading || formData.roles.length === 0}
            activeOpacity={0.8}
          >
            {uiState.uploading ? (
              <View style={styles.submitButtonLoading}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitButtonLoadingText}>
                  {uiState.uploadingDocument ? 'Upload sécurisé...' : 
                   uiState.creatingReferralCode ? 'Finalisation...' : 'Sauvegarde...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>
                {formData.roles.length === 0 ? 'Choisissez un rôle d\'abord' : 'Finaliser mon profil'}
              </Text>
            )}
          </TouchableOpacity>

          {/* ➕ NOUVEAU: Information sur le parrainage */}
          <View style={styles.referralInfo}>
            <Text style={styles.referralTitle}>🎉 Bonus de bienvenue !</Text>
            <Text style={styles.referralText}>
              Votre code de parrainage sera créé automatiquement pour que vous puissiez inviter vos amis et gagner des récompenses !
            </Text>
          </View>

          {/* 📝 Informations légales */}
          <Text style={styles.legalText}>
            En complétant votre profil, vous confirmez que les informations fournies sont exactes et acceptez nos conditions d'utilisation.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // 📱 États de chargement
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#FF4444',
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // 📝 Contenu principal
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },

  // 🧪 NOUVEAU: Bouton diagnostic
  diagnosticButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FF5252',
  },
  diagnosticButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },

  // ➕ NOUVEAU: Notice de pré-remplissage
  prefillNotice: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeft: 4,
    borderLeftColor: '#2196f3',
  },
  prefillNoticeText: {
    fontSize: 13,
    color: '#1976d2',
    lineHeight: 18,
  },

  // 📋 Sections
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },

  // 🎭 Rôles
  rolesContainer: {
    gap: 12,
  },
  roleButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  roleButtonSelected: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  roleTextSelected: {
    color: '#fff',
  },
  roleDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  roleDescriptionSelected: {
    color: '#fff',
    opacity: 0.9,
  },

  // 📝 Champs de saisie
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fafafa',
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#FF4444',
    backgroundColor: '#fff5f5',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    lineHeight: 16,
  },

  // 📐 Layout
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },

  // 📄 Document
  documentButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  documentButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  documentPreview: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  previewImage: {
    width: 200,
    height: 120,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 8,
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  documentStatusText: {
    color: '#28A745',
    fontWeight: '600',
    fontSize: 12,
    flex: 1,
  },
  changeDocumentButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeDocumentText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // 🚀 Bouton de soumission
  submitButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonLoadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // ➕ NOUVEAU: Section parrainage
  referralInfo: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
    textAlign: 'center',
  },
  referralText: {
    fontSize: 14,
    color: '#424242',
    textAlign: 'center',
    lineHeight: 20,
  },

  // 📝 Mentions légales
  legalText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});
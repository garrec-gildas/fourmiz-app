// app/auth/complete-profile-fourmiz.tsx - VERSION CORRIGÉE SANS CHAMPS INEXISTANTS
// 🔧 CORRECTIONS : Suppression des champs rib et user_type qui n'existent pas
// ✅ Utilise SEULEMENT les colonnes existantes dans la table profiles
// 🚀 Corrigé pour la détection automatique du rôle Fourmiz

import React, { useEffect, useState, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import {
  supabase,
  handleSupabaseError,
  getCurrentUser,
  getCurrentSession,
  uploadFile,
} from '../../lib/supabase';

interface FourmizUpgradeData {
  profileImageUri: string | null;
  idDocumentUri: string | null;
  // Champs présentation fourmiz
  bio: string;
  skills: string[];
  hourly_rate: string;
  experience_years: string;
  languages: string[];
  work_zone: string;
  preferred_missions: string[];
  portfolio_urls: string[];
}

interface FormErrors {
  profileImage?: string;
  idDocument?: string;
  bio?: string;
  hourly_rate?: string;
}

// Compétences prédéfinies
const PREDEFINED_SKILLS = [
  'Ménage', 'Repassage', 'Cuisine', 'Jardinage', 'Bricolage', 'Peinture',
  'Plomberie', 'Électricité', 'Déménagement', 'Montage meuble', 'Nettoyage',
  'Baby-sitting', 'Cours particuliers', 'Aide informatique', 'Couture',
  'Décoration', 'Photographie', 'Livraison', 'Courses', 'Assistance admin'
];

// Langues disponibles
const AVAILABLE_LANGUAGES = [
  'Français', 'Anglais', 'Espagnol', 'Italien', 'Allemand', 'Portugais',
  'Arabe', 'Chinois', 'Japonais', 'Russe', 'Néerlandais', 'Autre'
];

// Types de missions
const MISSION_TYPES = [
  'Ménage et nettoyage', 'Jardinage et extérieur', 'Bricolage et réparations',
  'Cuisine et restauration', 'Garde d\'enfants', 'Aide aux personnes âgées',
  'Déménagement et transport', 'Cours et formation', 'Événementiel',
  'Assistance administrative', 'Autre'
];

export default function FourmizUpgradeScreen() {
  const { from } = useLocalSearchParams();

  const [formData, setFormData] = useState<FourmizUpgradeData>({
    profileImageUri: null,
    idDocumentUri: null,
    bio: '',
    skills: [],
    hourly_rate: '',
    experience_years: '',
    languages: ['Français'],
    work_zone: '',
    preferred_missions: [],
    portfolio_urls: ['']
  });

  const [uiState, setUiState] = useState({
    sessionLoading: true,
    uploading: false,
    uploadingDocument: false,
    uploadingProfileImage: false,
  });

  const [showFourmizPresentation, setShowFourmizPresentation] = useState(false);
  const [showSkillsSelection, setShowSkillsSelection] = useState(false);
  const [showLanguagesSelection, setShowLanguagesSelection] = useState(false);
  const [showMissionsSelection, setShowMissionsSelection] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [session, setSession] = useState<any>(null);
  const [existingProfile, setExistingProfile] = useState<any>(null);

  // CHARGEMENT DE LA SESSION UTILISATEUR
  const loadUserSession = useCallback(async () => {
    console.log('🔐 Chargement session utilisateur...');
    
    try {
      const session = await getCurrentSession();
      console.log('📋 Session:', session ? 'trouvée' : 'non trouvée');
      
      if (!session) {
        console.log('❌ Pas de session, redirection login');
        router.replace('/auth/signin');
        return;
      }

      setSession(session);
      console.log('✅ Session chargée pour:', session.user.email);
      
    } catch (error) {
      console.error('❌ Erreur chargement session:', error);
      Alert.alert('Erreur', 'Impossible de charger votre session');
      router.replace('/auth/signin');
    } finally {
      setUiState(prev => ({ ...prev, sessionLoading: false }));
    }
  }, []);

  // CHARGEMENT DU PROFIL EXISTANT
  const loadExistingProfile = useCallback(async (userId: string) => {
    console.log('📋 Chargement profil existant pour:', userId);
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Erreur profil:', error);
        throw error;
      }

      console.log('✅ Profil existant:', profile);
      setExistingProfile(profile);
      
      // Pré-remplir les champs présentation si ils existent
      if (profile) {
        setFormData(prev => ({
          ...prev,
          bio: profile.bio || '',
          skills: profile.skills || [],
          hourly_rate: profile.hourly_rate ? profile.hourly_rate.toString() : '',
          experience_years: profile.experience_years ? profile.experience_years.toString() : '',
          languages: profile.languages || ['Français'],
          work_zone: profile.work_zone || '',
          preferred_missions: profile.preferred_missions || [],
          portfolio_urls: profile.portfolio_urls || ['']
        }));
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement profil:', error);
    }
  }, []);

  // VALIDATION DU FORMULAIRE
  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    if (!formData.profileImageUri) {
      newErrors.profileImage = 'La photo de profil est obligatoire';
    }
    
    if (!formData.idDocumentUri) {
      newErrors.idDocument = 'Le document d\'identité est obligatoire';
    }
    
    if (formData.bio && formData.bio.length < 20) {
      newErrors.bio = 'La présentation doit faire au moins 20 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // SÉLECTION DE LA PHOTO DE PROFIL
  const pickProfileImage = async () => {
    console.log('📸 Sélection photo de profil...');
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin d\'accéder à vos photos pour uploader votre photo de profil.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ Photo de profil sélectionnée');
        setFormData(prev => ({
          ...prev,
          profileImageUri: result.assets[0].uri
        }));
        
        setErrors(prev => ({ ...prev, profileImage: undefined }));
      }
    } catch (error) {
      console.error('❌ Erreur sélection photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    }
  };

  // SÉLECTION DU DOCUMENT D'IDENTITÉ
  const pickIdDocument = async () => {
    console.log('📄 Sélection document identité...');
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin d\'accéder à vos photos pour uploader votre document d\'identité.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ Document sélectionné');
        setFormData(prev => ({
          ...prev,
          idDocumentUri: result.assets[0].uri
        }));
        
        setErrors(prev => ({ ...prev, idDocument: undefined }));
      }
    } catch (error) {
      console.error('❌ Erreur sélection document:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le document');
    }
  };

  // FONCTIONS POUR LA PRÉSENTATION FOURMIZ
  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const toggleLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const toggleMission = (mission: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_missions: prev.preferred_missions.includes(mission)
        ? prev.preferred_missions.filter(m => m !== mission)
        : [...prev.preferred_missions, mission]
    }));
  };

  const updatePortfolioUrl = (index: number, url: string) => {
    setFormData(prev => ({
      ...prev,
      portfolio_urls: prev.portfolio_urls.map((item, i) => 
        i === index ? url : item
      )
    }));
  };

  const addPortfolioUrl = () => {
    setFormData(prev => ({
      ...prev,
      portfolio_urls: [...prev.portfolio_urls, '']
    }));
  };

  const removePortfolioUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      portfolio_urls: prev.portfolio_urls.filter((_, i) => i !== index)
    }));
  };

  // UPLOAD DE LA PHOTO DE PROFIL vers bucket avatars
  const uploadProfileImage = async (userId: string): Promise<string | null> => {
    if (!formData.profileImageUri) {
      console.log('⚠️ Pas de photo de profil à uploader');
      return null;
    }

    console.log('📤 Upload photo de profil...');
    setUiState(prev => ({ ...prev, uploadingProfileImage: true }));

    try {
      const bucketName = 'avatars';
      const fileName = `${userId}/profile-${Date.now()}.jpg`;
      
      console.log('📁 Upload vers bucket:', bucketName);
      console.log('📝 Nom du fichier:', fileName);
      
      const response = await fetch(formData.profileImageUri);
      const blob = await response.blob();
      
      console.log('📊 taille du fichier:', blob.size, 'bytes');
      console.log('🎭 type MIME:', blob.type);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('❌ Erreur upload photo:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      console.log('✅ Photo de profil uploadée avec succès:', publicUrl);
      return publicUrl;
      
    } catch (error) {
      console.error('❌ Erreur upload photo de profil:', error);
      throw new Error('Impossible d\'uploader la photo de profil');
    } finally {
      setUiState(prev => ({ ...prev, uploadingProfileImage: false }));
    }
  };

  // UPLOAD DU DOCUMENT D'IDENTITÉ vers bucket user-documents
  const uploadIdDocument = async (userId: string): Promise<string | null> => {
    if (!formData.idDocumentUri) {
      console.log('⚠️ Pas de document à uploader');
      return null;
    }

    console.log('📤 Upload document identité...');
    setUiState(prev => ({ ...prev, uploadingDocument: true }));

    try {
      const bucketName = 'user-documents';
      const fileName = `${userId}/id-document-${Date.now()}.jpg`;
      
      console.log('📁 Upload vers bucket:', bucketName);
      console.log('📝 Nom du fichier:', fileName);
      
      const response = await fetch(formData.idDocumentUri);
      const blob = await response.blob();
      
      console.log('📊 taille du fichier:', blob.size, 'bytes');
      console.log('🎭 type MIME:', blob.type);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('❌ Erreur upload:', uploadError);
        throw uploadError;
      }

      console.log('✅ Document uploadé avec succès:', uploadData.path);
      return uploadData.path;
      
    } catch (error) {
      console.error('❌ Erreur upload document:', error);
      throw new Error('Impossible d\'uploader le document d\'identité');
    } finally {
      setUiState(prev => ({ ...prev, uploadingDocument: false }));
    }
  };

  // 🔧 FONCTION DE SAUVEGARDE CORRIGÉE - SANS CHAMPS INEXISTANTS
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      Alert.alert('Informations manquantes', 'Veuillez remplir tous les champs requis');
      return;
    }

    if (!session?.user) {
      Alert.alert('Session expirée', 'Veuillez vous reconnecter');
      router.replace('/auth/signin');
      return;
    }

    console.log('🔄 === MISE À NIVEAU VERS FOURMIZ CORRIGÉE ===');
    console.log('👤 Utilisateur:', session.user.email);
    console.log('➕ Ajout des infos Fourmiz (CHAMPS EXISTANTS SEULEMENT)');

    setUiState(prev => ({ ...prev, uploading: true }));

    try {
      // Upload de la photo de profil
      let profileImageUrl = null;
      try {
        profileImageUrl = await uploadProfileImage(session.user.id);
        if (!profileImageUrl) {
          throw new Error('Échec de l\'upload de la photo de profil');
        }
      } catch (photoError) {
        console.error('❌ Erreur upload photo:', photoError);
        Alert.alert(
          'Attention',
          'La photo de profil n\'a pas pu être uploadée, mais nous continuons le processus.',
          [{ text: 'Continuer' }]
        );
      }

      // Upload du document d'identité (obligatoire)
      const idDocumentPath = await uploadIdDocument(session.user.id);
      if (!idDocumentPath) {
        throw new Error('Échec de l\'upload du document d\'identité');
      }

      // 🔧 MISE À JOUR CORRIGÉE : SEULEMENT LES CHAMPS QUI EXISTENT
      const fourmizUpdate: any = {
        // ✅ Champs obligatoires existants
        ...(profileImageUrl && { avatar_url: profileImageUrl }),
        id_document_path: idDocumentPath,
        
        // ✅ CORRECTION CRITIQUE : Ajouter rôle fourmiz dans l'array roles
        roles: existingProfile?.roles && Array.isArray(existingProfile.roles)
          ? [...new Set([...existingProfile.roles, 'fourmiz'])] 
          : ['client', 'fourmiz'],
          
        // ✅ SUPPRIMÉ : user_type (n'existe pas dans la table)
        // user_type: 'fourmiz',  // ❌ Cette colonne n'existe pas !
        
        // ✅ SUPPRIMÉ : rib (supprimé de la table)
        // rib: formData.rib,     // ❌ Cette colonne a été supprimée !
          
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };

      // ✅ AJOUT DES INFOS PRÉSENTATION FOURMIZ SI REMPLIES (champs existants)
      if (formData.bio.trim()) {
        fourmizUpdate.bio = formData.bio.trim();
      }
      
      if (formData.skills.length > 0) {
        fourmizUpdate.skills = formData.skills;
      }
      
      if (formData.hourly_rate) {
        const rate = parseFloat(formData.hourly_rate);
        if (!isNaN(rate)) {
          fourmizUpdate.hourly_rate = rate;
        }
      }
      
      if (formData.experience_years) {
        const years = parseInt(formData.experience_years);
        if (!isNaN(years)) {
          fourmizUpdate.experience_years = years;
        }
      }
      
      if (formData.languages.length > 0) {
        fourmizUpdate.languages = formData.languages;
      }
      
      if (formData.work_zone.trim()) {
        fourmizUpdate.work_zone = formData.work_zone.trim();
      }
      
      if (formData.preferred_missions.length > 0) {
        fourmizUpdate.preferred_missions = formData.preferred_missions;
      }
      
      // Portfolio URLs (filtrer les URLs vides)
      const validPortfolioUrls = formData.portfolio_urls.filter(url => url.trim());
      if (validPortfolioUrls.length > 0) {
        fourmizUpdate.portfolio_urls = validPortfolioUrls;
      }

      console.log('📝 Mise à jour avec champs EXISTANTS seulement:', fourmizUpdate);

      const { error: profileError } = await supabase
        .from('profiles')
        .update(fourmizUpdate)
        .eq('user_id', session.user.id);

      if (profileError) {
        console.error('❌ Erreur mise à jour profil:', profileError);
        const { userMessage } = handleSupabaseError(profileError, 'Mise à jour profil');
        throw new Error(userMessage);
      }

      console.log('✅ Mise à niveau Fourmiz réussie avec champs corrects !');

      // Message de succès personnalisé
      const firstName = existingProfile?.firstname || 'Utilisateur';
      const hasPresentation = formData.bio.trim() || formData.skills.length > 0 || formData.hourly_rate;
        
      Alert.alert(
        '🎉 Félicitations !',
        `Parfait ${firstName} ! Vous êtes maintenant Client ET Fourmiz.\n\n👤 Vos informations Client sont conservées\n🐜 Vos informations Fourmiz ont été ajoutées${hasPresentation ? '\n📝 Votre présentation est prête' : ''}\n\n🚀 Vous pouvez maintenant proposer vos services ET en commander !`,
        [
          { 
            text: 'Découvrir mes nouvelles fonctionnalités', 
            onPress: () => router.replace('/(tabs)/criteria?force=true&first_time=true')
          }
        ]
      );

    } catch (error: any) {
      console.error('❌ ERREUR MISE À NIVEAU FOURMIZ:', error);
      
      Alert.alert(
        'Erreur de mise à niveau',
        error.message || 'Impossible de vous passer en Fourmiz. Veuillez réessayer.',
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
      console.log('🏁 Fin mise à niveau Fourmiz corrigée');
    }
  }, [formData, session, existingProfile]);

  // FONCTION POUR REDIRECTION VERS CRITÈRES
  const handleGoToCriteria = useCallback(() => {
    console.log('🔀 Redirection vers page criteria');
    router.push('/criteria');
  }, []);

  // EFFECTS POUR INITIALISER LA PAGE
  useEffect(() => {
    console.log('🚀 Initialisation page mise à niveau Fourmiz');
    loadUserSession();
  }, [loadUserSession]);

  useEffect(() => {
    if (session?.user?.id) {
      console.log('📋 Session chargée, récupération profil existant');
      loadExistingProfile(session.user.id);
    }
  }, [session, loadExistingProfile]);

  // ÉCRANS DE CHARGEMENT 
  if (uiState.sessionLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#000000" size="large" />
          <Text style={styles.loadingText}>Chargement de votre profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
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
  }

  // RENDU PRINCIPAL
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Devenir Fourmiz</Text>
            <Text style={styles.subtitle}>
              Ajoutez le rôle Fourmiz à votre profil Client existant 
            </Text>
          </View>

          {/* Informations rassurantes */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#000000" />
              <Text style={styles.sectionTitle}>Vos informations Client sont conservées</Text>
            </View>
            <Text style={styles.sectionText}>
              Pas besoin de tout ressaisir ! Nous ajoutons simplement les informations 
              nécessaires pour que vous puissiez proposer vos services.
            </Text>
          </View>

          {/* Profil existant récapitulatif */}
          {existingProfile && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={16} color="#000000" />
                <Text style={styles.sectionTitle}>Votre profil actuel</Text>
              </View>
              
              <View style={styles.existingProfileContent}>
                <View style={styles.existingAvatarContainer}>
                  {existingProfile.avatar_url ? (
                    <Image 
                      source={{ uri: existingProfile.avatar_url }} 
                      style={styles.existingAvatar}
                      onError={() => console.log('❌ Erreur chargement photo:', existingProfile.avatar_url)}
                    />
                  ) : (
                    <View style={[styles.existingAvatar, styles.existingAvatarPlaceholder]}>
                      <Text style={styles.existingAvatarText}>
                        {existingProfile.firstname ? existingProfile.firstname.charAt(0).toUpperCase() : '👤'}
                      </Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.existingProfileName}>
                  {existingProfile.firstname || ''} {existingProfile.lastname || ''}
                </Text>
                <Text style={styles.existingProfileDetails}>
                  {existingProfile.email || 'Email non renseigné'}
                </Text>
                <Text style={styles.existingProfileDetails}>
                  {existingProfile.phone || 'Téléphone non renseigné'}
                </Text>
                <Text style={styles.existingProfileDetails}>
                  {existingProfile.address || ''}{existingProfile.address && existingProfile.city ? ', ' : ''}{existingProfile.city || 'Adresse non renseignée'}
                </Text>
                
                <View style={styles.profileRoleSection}>
                  <Text style={styles.profileRoleLabel}>Votre rôle :</Text>
                  <View style={styles.profileSwitchContainer}>
                    <View style={[styles.profileSwitchButton, styles.profileSwitchButtonActive]}>
                      <Ionicons name="person" size={14} color="#ffffff" />
                      <Text style={[styles.profileSwitchButtonText, styles.profileSwitchButtonTextActive]}>
                        Client 
                      </Text>
                    </View>

                    <View style={[styles.profileSwitchButton, styles.profileSwitchButtonInactive]}>
                      <Ionicons name="construct" size={14} color="#666666" />
                      <Text style={styles.profileSwitchButtonText}>
                        Fourmiz
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.profileUpgradeHint}>
                    Ajoutez le rôle Fourmiz ci-dessous
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Informations Fourmiz obligatoires */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={16} color="#000000" />
              <Text style={styles.sectionTitle}>Informations obligatoires</Text>
            </View>
            <Text style={styles.sectionText}>
              2 informations obligatoires pour devenir Fourmiz
            </Text>

            {/* Photo de profil */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>1. Photo de profil *</Text>
              {errors.profileImage && <Text style={styles.errorText}>{errors.profileImage}</Text>}
              
              <TouchableOpacity
                style={styles.profileImageButton}
                onPress={pickProfileImage}
                disabled={uiState.uploadingProfileImage}
              >
                {formData.profileImageUri ? (
                  <View style={styles.profileImagePreview}>
                    <Image 
                      source={{ uri: formData.profileImageUri }} 
                      style={styles.profileImage} 
                    />
                    <View style={styles.changePhotoContainer}>
                      <Ionicons name="camera" size={14} color="#000000" />
                      <Text style={styles.changePhotoText}>Modifier la photo</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person-circle-outline" size={32} color="#666666" />
                    <Text style={styles.profileImageText}>Ajouter votre photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.helpText}>
                Une photo claire de votre visage pour que vos clients vous reconnaissent
              </Text>
            </View>

            {/* Pièce d'identité */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>2. Pièce d'identité *</Text>
              {errors.idDocument && <Text style={styles.errorText}>{errors.idDocument}</Text>}
              
              <TouchableOpacity
                style={styles.documentButton}
                onPress={pickIdDocument}
                disabled={uiState.uploadingDocument}
              >
                <Ionicons name="camera" size={16} color="#ffffff" />
                <Text style={styles.documentButtonText}>
                  {formData.idDocumentUri ? 'Modifier le document' : 'Prendre en photo / Sélectionner'}
                </Text>
              </TouchableOpacity>

              {formData.idDocumentUri && (
                <View style={styles.documentPreview}>
                  <Image 
                    source={{ uri: formData.idDocumentUri }} 
                    style={styles.previewImage} 
                  />
                  <View style={styles.documentStatusContainer}>
                    <Ionicons name="checkmark-circle" size={14} color="#000000" />
                    <Text style={styles.documentStatusText}>Document prêt</Text>
                  </View>
                </View>
              )}

              <Text style={styles.helpText}>
                Carte d'identité, passeport ou permis de conduire pour vérifier votre identité
              </Text>
            </View>
          </View>

          {/* Présentation Fourmiz optionnelle */}
          <View style={styles.sectionCard}>
            <TouchableOpacity 
              onPress={() => setShowFourmizPresentation(!showFourmizPresentation)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <Ionicons name="person-circle-outline" size={16} color="#000000" />
                <Text style={styles.sectionTitle}>Présentation Fourmiz (optionnel)</Text>
                <View style={styles.sectionExpandButton}>
                  <Ionicons 
                    name={showFourmizPresentation ? "chevron-up" : "chevron-down"} 
                    size={14} 
                    color="#666666" 
                  />
                </View>
              </View>
            </TouchableOpacity>
            
            {showFourmizPresentation && (
              <View style={styles.sectionContent}>
                <Text style={styles.sectionText}>
                  Complétez votre présentation pour attirer plus de clients
                </Text>

                {/* Bio/Présentation */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Présentez-vous</Text>
                  {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
                  <TextInput
                    style={[styles.textArea, errors.bio && styles.inputError]}
                    value={formData.bio}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, bio: text }));
                      if (errors.bio) setErrors(prev => ({ ...prev, bio: undefined }));
                    }}
                    placeholder="Décrivez vos compétences, votre expérience, ce qui vous différencie..."
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Text style={styles.helpText}>
                    Minimum 20 caractères pour une présentation complète
                  </Text>
                </View>

                {/* Tarif horaire */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Tarif horaire</Text>
                  {errors.hourly_rate && <Text style={styles.errorText}>{errors.hourly_rate}</Text>}
                  <View style={styles.priceInputContainer}>
                    <TextInput
                      style={[styles.priceInput, errors.hourly_rate && styles.inputError]}
                      value={formData.hourly_rate}
                      onChangeText={(text) => {
                        setFormData(prev => ({ ...prev, hourly_rate: text }));
                        if (errors.hourly_rate) setErrors(prev => ({ ...prev, hourly_rate: undefined }));
                      }}
                      placeholder="25"
                      keyboardType="numeric"
                    />
                    <Text style={styles.priceUnit}>€/h</Text>
                  </View>
                  <Text style={styles.helpText}>
                    Entre 5€ et 200€ par heure selon vos compétences
                  </Text>
                </View>

                {/* Années d'expérience */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Années d'expérience</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.experience_years}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, experience_years: text }))}
                    placeholder="3"
                    keyboardType="numeric"
                  />
                </View>

                {/* Compétences */}
                <View style={styles.inputGroup}>
                  <TouchableOpacity 
                    onPress={() => setShowSkillsSelection(!showSkillsSelection)}
                    style={styles.selectorButton}
                  >
                    <Text style={styles.label}>Compétences</Text>
                    <Ionicons 
                      name={showSkillsSelection ? "chevron-up" : "chevron-down"} 
                      size={14} 
                      color="#666666" 
                    />
                  </TouchableOpacity>
                  
                  {formData.skills.length > 0 && (
                    <View style={styles.selectedItemsContainer}>
                      {formData.skills.map((skill, index) => (
                        <View key={index} style={styles.selectedItem}>
                          <Text style={styles.selectedItemText}>{skill}</Text>
                          <TouchableOpacity onPress={() => toggleSkill(skill)}>
                            <Ionicons name="close" size={12} color="#ffffff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {showSkillsSelection && (
                    <View style={styles.optionsGrid}>
                      {PREDEFINED_SKILLS.map((skill) => (
                        <TouchableOpacity
                          key={skill}
                          style={[
                            styles.optionButton,
                            formData.skills.includes(skill) && styles.optionButtonSelected
                          ]}
                          onPress={() => toggleSkill(skill)}
                        >
                          <Text style={[
                            styles.optionButtonText,
                            formData.skills.includes(skill) && styles.optionButtonTextSelected
                          ]}>
                            {skill}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Langues parlées */}
                <View style={styles.inputGroup}>
                  <TouchableOpacity 
                    onPress={() => setShowLanguagesSelection(!showLanguagesSelection)}
                    style={styles.selectorButton}
                  >
                    <Text style={styles.label}>Langues parlées</Text>
                    <Ionicons 
                      name={showLanguagesSelection ? "chevron-up" : "chevron-down"} 
                      size={14} 
                      color="#666666" 
                    />
                  </TouchableOpacity>
                  
                  {formData.languages.length > 0 && (
                    <View style={styles.selectedItemsContainer}>
                      {formData.languages.map((language, index) => (
                        <View key={index} style={styles.selectedItem}>
                          <Text style={styles.selectedItemText}>{language}</Text>
                          {language !== 'Français' && (
                            <TouchableOpacity onPress={() => toggleLanguage(language)}>
                              <Ionicons name="close" size={12} color="#ffffff" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {showLanguagesSelection && (
                    <View style={styles.optionsGrid}>
                      {AVAILABLE_LANGUAGES.map((language) => (
                        <TouchableOpacity
                          key={language}
                          style={[
                            styles.optionButton,
                            formData.languages.includes(language) && styles.optionButtonSelected
                          ]}
                          onPress={() => toggleLanguage(language)}
                          disabled={language === 'Français'}
                        >
                          <Text style={[
                            styles.optionButtonText,
                            formData.languages.includes(language) && styles.optionButtonTextSelected,
                            language === 'Français' && styles.optionButtonTextDisabled
                          ]}>
                            {language}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Zone de travail */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Zone de travail préférée</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.work_zone}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, work_zone: text }))}
                    placeholder="Paris 75001, 75002, 75003..."
                  />
                  <Text style={styles.helpText}>
                    Arrondissements, villes ou zones où vous souhaitez intervenir
                  </Text>
                </View>

                {/* Types de missions préférées */}
                <View style={styles.inputGroup}>
                  <TouchableOpacity 
                    onPress={() => setShowMissionsSelection(!showMissionsSelection)}
                    style={styles.selectorButton}
                  >
                    <Text style={styles.label}>Types de missions préférées</Text>
                    <Ionicons 
                      name={showMissionsSelection ? "chevron-up" : "chevron-down"} 
                      size={14} 
                      color="#666666" 
                    />
                  </TouchableOpacity>
                  
                  {formData.preferred_missions.length > 0 && (
                    <View style={styles.selectedItemsContainer}>
                      {formData.preferred_missions.map((mission, index) => (
                        <View key={index} style={styles.selectedMissionItem}>
                          <Text style={styles.selectedMissionText}>{mission}</Text>
                          <TouchableOpacity onPress={() => toggleMission(mission)}>
                            <Ionicons name="close" size={12} color="#333333" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {showMissionsSelection && (
                    <View style={styles.optionsGrid}>
                      {MISSION_TYPES.map((mission) => (
                        <TouchableOpacity
                          key={mission}
                          style={[
                            styles.missionOptionButton,
                            formData.preferred_missions.includes(mission) && styles.missionOptionButtonSelected
                          ]}
                          onPress={() => toggleMission(mission)}
                        >
                          <Text style={[
                            styles.missionOptionButtonText,
                            formData.preferred_missions.includes(mission) && styles.missionOptionButtonTextSelected
                          ]}>
                            {mission}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Portfolio */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Portfolio (liens optionnels)</Text>
                  {formData.portfolio_urls.map((url, index) => (
                    <View key={index} style={styles.portfolioInputContainer}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={url}
                        onChangeText={(text) => updatePortfolioUrl(index, text)}
                        placeholder="https://mon-site.com ou Instagram, LinkedIn..."
                      />
                      {formData.portfolio_urls.length > 1 && (
                        <TouchableOpacity
                          style={styles.removePortfolioButton}
                          onPress={() => removePortfolioUrl(index)}
                        >
                          <Ionicons name="trash" size={14} color="#666666" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  
                  {formData.portfolio_urls.length < 3 && (
                    <TouchableOpacity
                      style={styles.addPortfolioButton}
                      onPress={addPortfolioUrl}
                    >
                      <Ionicons name="add" size={14} color="#000000" />
                      <Text style={styles.addPortfolioText}>Ajouter un lien</Text>
                    </TouchableOpacity>
                  )}
                  
                  <Text style={styles.helpText}>
                    Partagez vos réalisations : site web, réseaux sociaux, photos de travaux...
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Ce que vous pourrez faire */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="rocket-outline" size={16} color="#000000" />
              <Text style={styles.sectionTitle}>Une fois Fourmiz, vous pourrez</Text>
            </View>
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="cash-outline" size={14} color="#000000" />
                <Text style={styles.benefitText}>Proposer vos services et gagner de l'argent</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="calendar-outline" size={14} color="#000000" />
                <Text style={styles.benefitText}>Gérer votre planning et vos disponibilités</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="search-outline" size={14} color="#000000" />
                <Text style={styles.benefitText}>Voir les demandes de services près de chez vous</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="chatbubble-outline" size={14} color="#000000" />
                <Text style={styles.benefitText}>Communiquer avec vos futurs clients</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="analytics-outline" size={14} color="#000000" />
                <Text style={styles.benefitText}>Suivre vos gains dans la section dédiée</Text>
              </View>
            </View>
          </View>

          {/* Bouton de validation */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              uiState.uploading && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={uiState.uploading}
          >
            {uiState.uploading ? (
              <View style={styles.submitButtonLoading}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitButtonLoadingText}>
                  {uiState.uploadingProfileImage ? 'Upload photo...' : 
                   uiState.uploadingDocument ? 'Upload document...' : 'Finalisation...'}
                </Text>
              </View>
            ) : (
              <>
                <Ionicons name="construct" size={16} color="#ffffff" />
                <Text style={styles.submitButtonText}>Devenir Fourmiz maintenant</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Bouton retour */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              if (from) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            disabled={uiState.uploading}
          >
            <Text style={styles.cancelButtonText}>Plus tard</Text>
          </TouchableOpacity>

          {/* Note rassurante */}
          <View style={styles.noteSection}>
            <Ionicons name="information-circle-outline" size={14} color="#666666" />
            <Text style={styles.noteText}>
              Cette opération ajoute uniquement le rôle Fourmiz à votre compte Client existant. 
              Toutes vos informations personnelles et votre historique Client sont conservés.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// STYLES (inchangés - même styles que dans le document original)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
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
    textAlign: 'center',
    fontWeight: '400',
  },
  errorText: {
    fontSize: 13,
    color: '#333333',
    marginTop: 4,
    fontWeight: '400',
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
    fontSize: 13,
    fontWeight: '600',
  },
  
  header: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '400',
  },
  
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  sectionExpandButton: {
    padding: 4,
  },
  sectionContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    fontWeight: '400',
    marginBottom: 16,
  },
  
  existingProfileContent: {
    alignItems: 'center',
  },
  existingAvatarContainer: {
    marginBottom: 12,
  },
  existingAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#000000',
  },
  existingAvatarPlaceholder: {
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  existingAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  existingProfileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  existingProfileDetails: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '400',
  },
  
  profileRoleSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  profileRoleLabel: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '400',
  },
  profileSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  profileSwitchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  profileSwitchButtonActive: {
    backgroundColor: '#000000',
  },
  profileSwitchButtonInactive: {
    backgroundColor: 'transparent',
  },
  profileSwitchButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  profileSwitchButtonTextActive: {
    color: '#ffffff',
  },
  profileUpgradeHint: {
    fontSize: 11,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '400',
  },
  
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 12,
    fontSize: 13,
    backgroundColor: '#ffffff',
    fontWeight: '400',
    color: '#000000',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 12,
    fontSize: 13,
    backgroundColor: '#ffffff',
    fontWeight: '400',
    color: '#000000',
    height: 60,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#333333',
    backgroundColor: '#ffffff',
  },
  helpText: {
    fontSize: 13,
    color: '#666666',
    marginTop: 4,
    fontWeight: '400',
    lineHeight: 16,
  },
  
  profileImageButton: {
    alignItems: 'center',
    marginBottom: 8,
  },
  profileImagePreview: {
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
  },
  changePhotoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changePhotoText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  profileImageText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },
  
  documentButton: {
    backgroundColor: '#000000',
    borderRadius: 6,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  documentButtonText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  documentPreview: {
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
  },
  previewImage: {
    width: 200,
    height: 120,
    borderRadius: 6,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  documentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 4,
  },
  documentStatusText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
    flex: 1,
  },
  
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  priceInput: {
    flex: 1,
    padding: 12,
    fontSize: 13,
    fontWeight: '400',
    color: '#000000',
    borderWidth: 0,
  },
  priceUnit: {
    paddingRight: 12,
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
  },
  
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  optionButton: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionButtonSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  optionButtonText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
  },
  optionButtonTextSelected: {
    color: '#ffffff',
  },
  optionButtonTextDisabled: {
    color: '#333333',
  },
  
  selectedItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  selectedItem: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedItemText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  
  missionOptionButton: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  missionOptionButtonSelected: {
    backgroundColor: '#f8f8f8',
    borderColor: '#000000',
    borderWidth: 2,
  },
  missionOptionButtonText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },
  missionOptionButtonTextSelected: {
    color: '#000000',
    fontWeight: '600',
  },
  selectedMissionItem: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedMissionText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '600',
  },
  
  portfolioInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  removePortfolioButton: {
    padding: 8,
  },
  addPortfolioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 12,
    gap: 4,
  },
  addPortfolioText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
  },
  
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
    flex: 1,
  },
  
  submitButton: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 24,
    gap: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
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
  
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 24,
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '400',
  },

  noteSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  noteText: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 16,
    fontWeight: '400',
    flex: 1,
  },
});
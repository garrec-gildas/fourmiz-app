// app/auth/complete-profile-fourmiz.tsx - VERSION COMPLÈTE CORRIGÉE
// 🎯 Version spécifique pour Client → Fourmiz avec TOUTES les fonctions
// ✅ Toutes les fonctions nécessaires incluses

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
import {
  supabase,
  handleSupabaseError,
  getCurrentUser,
  getCurrentSession,
  uploadFile,
} from '../../lib/supabase';

interface FourmizUpgradeData {
  rib: string;
  idDocumentUri: string | null;
}

interface FormErrors {
  rib?: string;
  idDocument?: string;
}

export default function FourmizUpgradeScreen() {
  const { from } = useLocalSearchParams();

  const [formData, setFormData] = useState<FourmizUpgradeData>({
    rib: '',
    idDocumentUri: null
  });

  const [uiState, setUiState] = useState({
    sessionLoading: true,
    uploading: false,
    uploadingDocument: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [session, setSession] = useState(null);
  const [existingProfile, setExistingProfile] = useState(null);

  // ✅ CHARGEMENT DE LA SESSION UTILISATEUR
  const loadUserSession = useCallback(async () => {
    console.log('🔍 Chargement session utilisateur...');
    
    try {
      const session = await getCurrentSession();
      console.log('📊 Session:', session ? 'trouvée' : 'non trouvée');
      
      if (!session) {
        console.log('❌ Pas de session, redirection login');
        router.replace('/auth/signin');
        return;
      }

      setSession(session);
      console.log('✅ Session chargée pour:', session.user.email);
      
    } catch (error) {
      console.error('💥 Erreur chargement session:', error);
      Alert.alert('Erreur', 'Impossible de charger votre session');
      router.replace('/auth/signin');
    } finally {
      setUiState(prev => ({ ...prev, sessionLoading: false }));
    }
  }, []);

  // ✅ CHARGEMENT DU PROFIL EXISTANT
  const loadExistingProfile = useCallback(async (userId: string) => {
    console.log('🔍 Chargement profil existant pour:', userId);
    
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

      console.log('📊 Profil existant:', profile);
      setExistingProfile(profile);
      
    } catch (error) {
      console.error('💥 Erreur chargement profil:', error);
      // Ne pas bloquer si le profil n'existe pas encore
    }
  }, []);

  // ✅ VALIDATION DU FORMULAIRE
  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    if (!formData.rib.trim()) {
      newErrors.rib = 'Le RIB est obligatoire';
    } else if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/.test(formData.rib.replace(/\s/g, ''))) {
      newErrors.rib = 'Format RIB invalide (ex: FR76 1234...)';
    }
    
    if (!formData.idDocumentUri) {
      newErrors.idDocument = 'Le document d\'identité est obligatoire';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ SÉLECTION DU DOCUMENT D'IDENTITÉ
  const pickIdDocument = async () => {
    console.log('📷 Sélection document identité...');
    
    try {
      // Demander les permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin d\'accéder à vos photos pour uploader votre document d\'identité.'
        );
        return;
      }

      // Lancer le sélecteur d'images
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
        
        // Effacer l'erreur si il y en avait une
        setErrors(prev => ({ ...prev, idDocument: undefined }));
      }
    } catch (error) {
      console.error('💥 Erreur sélection document:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le document');
    }
  };

  // ✅ UPLOAD DU DOCUMENT D'IDENTITÉ vers bucket user-documents
  const uploadIdDocument = async (userId: string): Promise<string | null> => {
    if (!formData.idDocumentUri) {
      console.log('❌ Pas de document à uploader');
      return null;
    }

    console.log('📤 Upload document identité...');
    setUiState(prev => ({ ...prev, uploadingDocument: true }));

    try {
      // ✅ UTILISER LE BUCKET EXISTANT user-documents
      const bucketName = 'user-documents';
      const fileName = `${userId}/id-document-${Date.now()}.jpg`;
      
      console.log('📤 Upload vers bucket:', bucketName);
      console.log('📄 Nom du fichier:', fileName);
      
      // Lire le fichier depuis l'URI
      const response = await fetch(formData.idDocumentUri);
      const blob = await response.blob();
      
      console.log('📊 Taille du fichier:', blob.size, 'bytes');
      console.log('📋 Type MIME:', blob.type);
      
      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true, // Permettre l'écrasement si le fichier existe
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('❌ Erreur upload:', uploadError);
        throw uploadError;
      }

      console.log('✅ Document uploadé avec succès:', uploadData.path);
      return uploadData.path;
      
    } catch (error) {
      console.error('💥 Erreur upload document:', error);
      throw new Error('Impossible d\'uploader le document d\'identité');
    } finally {
      setUiState(prev => ({ ...prev, uploadingDocument: false }));
    }
  };

  // ✅ FONCTION DE SAUVEGARDE MISE À JOUR
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

    console.log('💾 === MISE À NIVEAU VERS FOURMIZ ===');
    console.log('📋 Utilisateur:', session.user.email);
    console.log('🔄 Ajout des infos Fourmiz uniquement');

    setUiState(prev => ({ ...prev, uploading: true }));

    try {
      // Upload du document d'identité
      const idDocumentPath = await uploadIdDocument(session.user.id);
      if (!idDocumentPath) {
        throw new Error('Échec de l\'upload du document d\'identité');
      }

      // 🎯 MISE À JOUR PARTIELLE : Seulement les champs Fourmiz
      const fourmizUpdate = {
        rib: formData.rib.trim(),
        id_document_path: idDocumentPath,
        
        // ✅ IMPORTANT : Ajouter le rôle fourmiz SANS écraser les autres
        roles: existingProfile?.roles 
          ? [...new Set([...existingProfile.roles, 'fourmiz'])] 
          : ['client', 'fourmiz'],
          
        // ✅ Marquer comme complet pour ce nouveau rôle
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };

      console.log('📤 Mise à jour avec infos Fourmiz:', fourmizUpdate);

      const { error: profileError } = await supabase
        .from('profiles')
        .update(fourmizUpdate)
        .eq('user_id', session.user.id);

      if (profileError) {
        console.error('❌ Erreur mise à jour profil:', profileError);
        const { userMessage } = handleSupabaseError(profileError, 'Mise à jour profil');
        throw new Error(userMessage);
      }

      console.log('✅ Mise à niveau Fourmiz réussie !');

      // Message de succès personnalisé
      const firstName = existingProfile?.firstname || 'Utilisateur';
      Alert.alert(
        '🎉 Félicitations !',
        `Parfait ${firstName} ! Vous êtes maintenant Client ET Fourmiz.\n\n✅ Vos informations Client sont conservées\n🆕 Vos informations Fourmiz ont été ajoutées\n\n➡️ Vous pouvez maintenant proposer vos services ET en commander !`,
        [
          { 
            text: 'Découvrir mes nouvelles fonctionnalités', 
            onPress: () => router.replace('/(tabs)')
          }
        ]
      );

    } catch (error) {
      console.error('💥 ERREUR MISE À NIVEAU FOURMIZ:', error);
      
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
      console.log('🏁 Fin mise à niveau Fourmiz');
    }
  }, [formData, session, existingProfile]);

  // ✅ EFFECTS POUR INITIALISER LA PAGE
  useEffect(() => {
    console.log('🚀 Initialisation page mise à niveau Fourmiz');
    loadUserSession();
  }, [loadUserSession]);

  useEffect(() => {
    if (session?.user?.id) {
      console.log('👤 Session chargée, récupération profil existant');
      loadExistingProfile(session.user.id);
    }
  }, [session, loadExistingProfile]);

  // ✅ ÉCRANS DE CHARGEMENT
  if (uiState.sessionLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FF4444" size="large" />
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
          {/* Header adapté */}
          <View style={styles.header}>
            <Text style={styles.title}>🚀 Devenir Fourmiz</Text>
            <Text style={styles.subtitle}>
              Ajoutez le rôle Fourmiz à votre profil Client existant
            </Text>
          </View>

          {/* Informations rassurantes */}
          <View style={styles.reassuranceSection}>
            <Text style={styles.reassuranceTitle}>✅ Vos informations Client sont conservées</Text>
            <Text style={styles.reassuranceText}>
              Pas besoin de tout ressaisir ! Nous ajoutons simplement les informations 
              nécessaires pour que vous puissiez proposer vos services.
            </Text>
          </View>

          {/* Profil existant récapitulatif */}
          {existingProfile && (
            <View style={styles.existingProfileSection}>
              <Text style={styles.existingProfileTitle}>👤 Votre profil actuel</Text>
              <View style={styles.existingProfileCard}>
                <Text style={styles.existingProfileName}>
                  {existingProfile.firstname} {existingProfile.lastname}
                </Text>
                <Text style={styles.existingProfileDetails}>
                  📧 {existingProfile.email}
                </Text>
                <Text style={styles.existingProfileDetails}>
                  📞 {existingProfile.phone}
                </Text>
                <Text style={styles.existingProfileDetails}>
                  📍 {existingProfile.address}, {existingProfile.city}
                </Text>
                <View style={styles.currentRoles}>
                  <Text style={styles.currentRolesLabel}>Rôle actuel : </Text>
                  <View style={styles.roleTag}>
                    <Text style={styles.roleTagText}>👤 Client</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Informations Fourmiz à ajouter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💼 Informations Fourmiz à ajouter</Text>
            <Text style={styles.sectionDescription}>
              Ces 2 informations supplémentaires sont nécessaires pour recevoir vos paiements et vérifier votre identité en tant que prestataire.
            </Text>

            {/* RIB */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>1. RIB (IBAN) *</Text>
              <TextInput
                style={[styles.input, errors.rib && styles.inputError]}
                value={formData.rib}
                onChangeText={(text) => setFormData(prev => ({ ...prev, rib: text }))}
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                autoCapitalize="characters"
                maxLength={34}
              />
              {errors.rib && <Text style={styles.errorText}>{errors.rib}</Text>}
              <Text style={styles.helpText}>
                Pour recevoir les paiements de vos services
              </Text>
            </View>

            {/* Document d'identité */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>2. Pièce d'identité *</Text>
              {errors.idDocument && <Text style={styles.errorText}>{errors.idDocument}</Text>}
              
              <TouchableOpacity
                style={styles.documentButton}
                onPress={pickIdDocument}
                disabled={uiState.uploadingDocument}
              >
                <Text style={styles.documentButtonText}>
                  📷 {formData.idDocumentUri ? 'Modifier le document' : 'Prendre en photo / Sélectionner'}
                </Text>
              </TouchableOpacity>

              {formData.idDocumentUri && (
                <View style={styles.documentPreview}>
                  <Image 
                    source={{ uri: formData.idDocumentUri }} 
                    style={styles.previewImage} 
                  />
                  <Text style={styles.documentStatusText}>✅ Document prêt</Text>
                </View>
              )}

              <Text style={styles.helpText}>
                Carte d'identité, passeport ou permis de conduire pour vérifier votre identité
              </Text>
            </View>
          </View>

          {/* Ce que vous pourrez faire */}
          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsTitle}>🎯 Une fois Fourmiz, vous pourrez :</Text>
            <View style={styles.benefitsList}>
              <Text style={styles.benefitItem}>💰 Proposer vos services et gagner de l'argent</Text>
              <Text style={styles.benefitItem}>⏰ Gérer votre planning et vos disponibilités</Text>
              <Text style={styles.benefitItem}>🔍 Voir les demandes de services près de chez vous</Text>
              <Text style={styles.benefitItem}>💬 Communiquer avec vos futurs clients</Text>
              <Text style={styles.benefitItem}>📊 Suivre vos gains dans la section dédiée</Text>
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
                  {uiState.uploadingDocument ? 'Upload document...' : 'Finalisation...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>🚀 Devenir Fourmiz maintenant</Text>
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
            <Text style={styles.noteText}>
              💡 Note : Cette opération ajoute uniquement le rôle Fourmiz à votre compte Client existant. 
              Toutes vos informations personnelles et votre historique Client sont conservés.
            </Text>
          </View>
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
  content: {
    flexGrow: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Section générale
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  
  // Groupes d'input
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  
  // Document picker
  documentButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  documentButtonText: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
  documentPreview: {
    alignItems: 'center',
    marginBottom: 8,
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentStatusText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  
  // Boutons
  submitButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#adb5bd',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonLoadingText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
  },

  // Sections spécifiques à la mise à niveau
  reassuranceSection: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  reassuranceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  reassuranceText: {
    fontSize: 14,
    color: '#388e3c',
    lineHeight: 20,
  },

  existingProfileSection: {
    marginBottom: 24,
  },
  existingProfileTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  existingProfileCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  existingProfileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  existingProfileDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  currentRoles: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  currentRolesLabel: {
    fontSize: 14,
    color: '#666',
  },
  roleTag: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  benefitsSection: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },

  noteSection: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  noteText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 16,
  },
});
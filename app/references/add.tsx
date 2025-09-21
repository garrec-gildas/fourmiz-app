import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

const AddReference = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const categories = [
    'Bricolage',
    'Jardinage',
    'Ménage',
    'Déménagement',
    'Montage de meubles',
    'Peinture',
    'Électricité',
    'Plomberie',
    'Informatique',
    'Cours particuliers',
    'Garde d\'enfants',
    'Garde d\'animaux',
    'Livraison',
    'Photographie',
    'Cuisine',
    'Autre'
  ];

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        setIsAuthenticated(false);
        Alert.alert('Erreur', 'Vous devez être connecté');
        router.back();
        return;
      }

      setUserId(user.id);
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
      Alert.alert('Erreur', 'Problème d\'authentification');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'L\'accès à la galerie est nécessaire');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.slice(0, 5);
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 5));
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner les images');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // 🔧 FONCTION CORRIGÉE - Compatible React Native
  const uploadSingleImage = async (imageAsset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    try {
      if (!userId) {
        console.log('Erreur upload: pas d\'userId');
        return null;
      }

      console.log('🚀 [Upload] Début upload image:', imageAsset.uri);

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = imageAsset.fileName?.split('.').pop() || 'jpg';
      const fileName = `reference_${userId}_${timestamp}_${randomId}.${fileExtension}`;
      const filePath = `references/${fileName}`;

      console.log('📁 [Upload] Nom du fichier:', filePath);

      // ✅ SOLUTION 1: Utiliser FormData (le plus simple)
      const formData = new FormData();
      formData.append('file', {
        uri: imageAsset.uri,
        type: imageAsset.type || 'image/jpeg',
        name: fileName,
      } as any);

      console.log('📦 [Upload] FormData créé avec type:', imageAsset.type || 'image/jpeg');

      const { data, error } = await supabase.storage
        .from('user-documents')
        .upload(filePath, formData);

      if (error) {
        console.log('❌ [Upload] Erreur Supabase:', error);
        
        // ✅ SOLUTION 2: Si FormData échoue, essayer avec fetch + blob
        console.log('🔄 [Upload] Tentative alternative avec fetch...');
        
        try {
          const response = await fetch(imageAsset.uri);
          const blob = await response.blob();
          
          console.log('📦 [Upload Alt] Blob créé:', blob.size, 'bytes');

          const { data: altData, error: altError } = await supabase.storage
            .from('user-documents')
            .upload(filePath, blob, {
              contentType: imageAsset.type || 'image/jpeg',
              cacheControl: '3600',
              upsert: false
            });

          if (altError) {
            console.log('❌ [Upload Alt] Erreur alternative:', altError);
            return null;
          }

          console.log('✅ [Upload Alt] Succès alternative:', altData?.path);
          
          const { data: urlData } = supabase.storage
            .from('user-documents')
            .getPublicUrl(filePath);

          const finalUrl = urlData.publicUrl;
          console.log('🔗 [Upload Alt] URL générée:', finalUrl);

          return finalUrl;

        } catch (altError) {
          console.log('💥 [Upload Alt] Exception alternative:', altError);
          return null;
        }
      }

      console.log('✅ [Upload] Succès FormData:', data?.path);

      // Générer l'URL publique
      const { data: urlData } = supabase.storage
        .from('user-documents')
        .getPublicUrl(filePath);

      const finalUrl = urlData.publicUrl;
      console.log('🔗 [Upload] URL générée:', finalUrl);

      // Test de l'URL
      try {
        const testResponse = await fetch(finalUrl);
        console.log('🔍 [Upload] Test URL - Status:', testResponse.status);
        if (testResponse.status === 200) {
          console.log('✅ [Upload] URL accessible');
        } else {
          console.log('⚠️ [Upload] URL status inattendu');
        }
      } catch (testError) {
        console.log('🔍 [Upload] Erreur test URL:', testError);
      }

      return finalUrl;

    } catch (error) {
      console.log('💥 [Upload] Exception générale:', error);
      return null;
    }
  };

  const createReference = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return;
    }

    if (!category.trim()) {
      Alert.alert('Erreur', 'La catégorie est obligatoire');
      return;
    }

    if (!userId) {
      Alert.alert('Erreur', 'Problème d\'authentification');
      return;
    }

    setIsUploading(true);

    try {
      let uploadedUrls: string[] = [];

      // Upload des images
      if (selectedImages.length > 0) {
        console.log(`📤 [AddReference] Début upload de ${selectedImages.length} images...`);
        
        for (let i = 0; i < selectedImages.length; i++) {
          const image = selectedImages[i];
          console.log(`📷 [AddReference] Upload image ${i + 1}/${selectedImages.length}`);
          
          const url = await uploadSingleImage(image);
          if (url) {
            uploadedUrls.push(url);
            console.log(`✅ [AddReference] Image ${i + 1} uploadée:`, url.substring(0, 50) + '...');
          } else {
            console.log(`❌ [AddReference] Échec upload image ${i + 1}`);
          }
        }
      }

      console.log(`📊 [AddReference] Résultat upload: ${uploadedUrls.length}/${selectedImages.length} images réussies`);

      // Sauvegarde en base
      const referenceData = {
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        photo_urls: uploadedUrls,
        user_id: userId,
        created_at: new Date().toISOString()
      };

      console.log('💾 [AddReference] Sauvegarde en base...', {
        title: referenceData.title,
        category: referenceData.category,
        photosCount: uploadedUrls.length
      });

      const { error } = await supabase
        .from('user_references')
        .insert([referenceData]);

      if (error) {
        console.log('❌ [AddReference] Erreur sauvegarde:', error);
        Alert.alert('Erreur', 'Impossible de sauvegarder la référence');
        return;
      }

      console.log('✅ [AddReference] Référence sauvegardée avec succès');

      Alert.alert('Succès', 'Référence créée avec succès !', [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]);

    } catch (error) {
      console.log('💥 [AddReference] Exception création:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Vérification...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Non authentifié</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle Référence</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Titre *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Nom du projet"
              placeholderTextColor="#666666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Catégorie *</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    category === cat && styles.categoryButtonSelected
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    category === cat && styles.categoryButtonTextSelected
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description du projet réalisé"
              placeholderTextColor="#666666"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Images ({selectedImages.length}/5)</Text>
            
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImages}>
              <Text style={styles.imagePickerText}>+ Ajouter des images</Text>
            </TouchableOpacity>

            {selectedImages.length > 0 && (
              <View style={styles.imageGrid}>
                {selectedImages.map((image, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: image.uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Text style={styles.removeImageText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isUploading && styles.disabledButton]}
            onPress={createReference}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Créer la référence</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  errorText: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '400',
  },
  retryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 24,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryButton: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryButtonSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#333333',
  },
  categoryButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  imagePickerButton: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  imagePickerText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  imageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#000000',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#666666',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default AddReference;
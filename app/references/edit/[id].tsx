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
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';

interface Reference {
  id: string;
  title: string;
  description: string;
  photo_urls: string[];
  user_id: string;
}

const EditReference = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [reference, setReference] = useState<Reference | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated && userId) {
      loadReference();
    }
  }, [isAuthenticated, userId]);

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

  const loadReference = async () => {
    if (!id || !userId) return;

    try {
      const { data, error } = await supabase
        .from('user_references')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        Alert.alert('Erreur', 'Référence non trouvée');
        router.back();
        return;
      }

      setReference(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setExistingImages(data.photo_urls || []);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger la référence');
      router.back();
    }
  };

  const pickImages = async () => {
    const totalImages = existingImages.length + newImages.length;
    if (totalImages >= 5) {
      Alert.alert('Limite atteinte', 'Maximum 5 images par référence');
      return;
    }

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
        const remaining = 5 - totalImages;
        const imagesToAdd = result.assets.slice(0, remaining);
        setNewImages(prev => [...prev, ...imagesToAdd]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner les images');
    }
  };

  const removeExistingImage = (index: number) => {
    Alert.alert(
      'Supprimer l\'image',
      'Êtes-vous sûr de vouloir supprimer cette image ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            setExistingImages(prev => prev.filter((_, i) => i !== index));
          }
        }
      ]
    );
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadSingleImage = async (imageAsset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    try {
      if (!userId) return null;

      const response = await fetch(imageAsset.uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      if (arrayBuffer.byteLength === 0) return null;

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = imageAsset.fileName?.split('.').pop() || 'jpg';
      const fileName = `reference_${userId}_${timestamp}_${randomId}.${fileExtension}`;
      const filePath = `references/${fileName}`;

      const { data, error } = await supabase.storage
        .from('user-documents')
        .upload(filePath, arrayBuffer, {
          contentType: imageAsset.type || 'image/jpeg',
          duplex: 'half'
        });

      if (error) return null;

      const { data: urlData } = supabase.storage
        .from('user-documents')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      return null;
    }
  };

  const deleteImageFromStorage = async (imageUrl: string) => {
    try {
      const url = new URL(imageUrl);
      const path = url.pathname.split('/storage/v1/object/public/user-documents/')[1];
      
      if (path) {
        await supabase.storage.from('user-documents').remove([path]);
      }
    } catch (error) {
      // Ignore errors for image deletion
    }
  };

  const updateReference = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return;
    }

    if (!userId || !reference) {
      Alert.alert('Erreur', 'Problème d\'authentification');
      return;
    }

    setIsUpdating(true);

    try {
      // Upload nouvelles images
      let newImageUrls: string[] = [];
      if (newImages.length > 0) {
        for (const image of newImages) {
          const url = await uploadSingleImage(image);
          if (url) {
            newImageUrls.push(url);
          }
        }
      }

      // Combine existing and new images
      const allImageUrls = [...existingImages, ...newImageUrls];

      // Find images to delete from storage
      const originalImages = reference.photo_urls || [];
      const imagesToDelete = originalImages.filter(url => !existingImages.includes(url));

      // Delete removed images from storage
      for (const imageUrl of imagesToDelete) {
        await deleteImageFromStorage(imageUrl);
      }

      // Update reference in database
      const { error } = await supabase
        .from('user_references')
        .update({
          title: title.trim(),
          description: description.trim(),
          photo_urls: allImageUrls,
          updated_at: new Date().toISOString()
        })
        .eq('id', reference.id)
        .eq('user_id', userId);

      if (error) {
        Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
        return;
      }

      Alert.alert('Succès', 'Référence mise à jour !', [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]);

    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteReference = () => {
    Alert.alert(
      'Supprimer la référence',
      'Êtes-vous sûr de vouloir supprimer définitivement cette référence ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: confirmDeleteReference
        }
      ]
    );
  };

  const confirmDeleteReference = async () => {
    if (!reference || !userId) return;

    try {
      // Delete all images from storage
      const imagesToDelete = reference.photo_urls || [];
      for (const imageUrl of imagesToDelete) {
        await deleteImageFromStorage(imageUrl);
      }

      // Delete reference from database
      const { error } = await supabase
        .from('user_references')
        .delete()
        .eq('id', reference.id)
        .eq('user_id', userId);

      if (error) {
        Alert.alert('Erreur', 'Impossible de supprimer la référence');
        return;
      }

      Alert.alert('Succès', 'Référence supprimée !', [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]);

    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement...</Text>
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
        <Text style={styles.headerTitle}>Modifier Référence</Text>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={deleteReference}
        >
          <Text style={styles.deleteButtonText}>Supprimer</Text>
        </TouchableOpacity>
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
            <Text style={styles.label}>
              Images ({existingImages.length + newImages.length}/5)
            </Text>
            
            {existingImages.length + newImages.length < 5 && (
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImages}>
                <Text style={styles.imagePickerText}>+ Ajouter des images</Text>
              </TouchableOpacity>
            )}

            {/* Images existantes */}
            {existingImages.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Images actuelles</Text>
                <View style={styles.imageGrid}>
                  {existingImages.map((imageUrl, index) => (
                    <View key={`existing-${index}`} style={styles.imageContainer}>
                      <Image source={{ uri: imageUrl }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeExistingImage(index)}
                      >
                        <Text style={styles.removeImageText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Nouvelles images */}
            {newImages.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Nouvelles images</Text>
                <View style={styles.imageGrid}>
                  {newImages.map((image, index) => (
                    <View key={`new-${index}`} style={styles.imageContainer}>
                      <Image source={{ uri: image.uri }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeNewImage(index)}
                      >
                        <Text style={styles.removeImageText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isUpdating && styles.disabledButton]}
            onPress={updateReference}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Sauvegarder les modifications</Text>
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
  deleteButton: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deleteButtonText: {
    color: '#333333',
    fontSize: 13,
    fontWeight: '600',
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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

export default EditReference;
// hooks/usePhotoManager.ts - VERSION CORRIGÉE
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';

export interface PhotoData {
  id: string;
  uri: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  type: string;
  uploading?: boolean;
  uploadError?: string;
  supabaseUrl?: string;
}

// 🔧 CORRECTION : Définir le nom du bucket de manière cohérente
const BUCKET_NAME = 'order-photos'; // Changé de 'order-attachments' vers 'order-photos'

export const usePhotoManager = (maxPhotos: number = 5) => {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  // Demander les permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions requises',
        'Les permissions caméra et galerie sont nécessaires pour ajouter des photos.'
      );
      return false;
    }
    return true;
  }, []);

  // Compresser et redimensionner l'image
  const processImage = useCallback(async (uri: string): Promise<string> => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 1200 } }, // Redimensionner à max 1200px de largeur
        ],
        {
          compress: 0.8, // Compression à 80%
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return manipResult.uri;
    } catch (error) {
      console.error('Erreur traitement image:', error);
      return uri; // Retourner l'URI original en cas d'erreur
    }
  }, []);

  // 🔧 NOUVELLE FONCTION : Vérifier l'existence du bucket
  const checkBucketExists = useCallback(async (): Promise<boolean> => {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('❌ Erreur vérification buckets:', error);
        return false;
      }
      
      const bucketExists = buckets?.some(bucket => bucket.id === BUCKET_NAME);
      if (!bucketExists) {
        console.error(`❌ Le bucket '${BUCKET_NAME}' n'existe pas`);
        console.log('📋 Buckets disponibles:', buckets?.map(b => b.id).join(', ') || 'Aucun');
      }
      
      return bucketExists || false;
    } catch (error) {
      console.error('❌ Erreur vérification bucket:', error);
      return false;
    }
  }, []);

  // 🔧 CORRECTION : Uploader une photo vers Supabase Storage avec vérification bucket
  const uploadPhotoToSupabase = useCallback(async (photoData: PhotoData): Promise<string> => {
    try {
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Vérifier l'existence du bucket
      const bucketExists = await checkBucketExists();
      if (!bucketExists) {
        throw new Error(`Le bucket de stockage '${BUCKET_NAME}' n'existe pas. Veuillez contacter le support technique.`);
      }

      const fileExt = photoData.fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log(`📸 Upload vers ${BUCKET_NAME}/${fileName}...`);

      // Convertir l'URI en blob
      const response = await fetch(photoData.uri);
      if (!response.ok) {
        throw new Error(`Erreur lecture fichier: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log(`📸 Taille fichier: ${blob.size} bytes`);

      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          upsert: false
        });

      if (error) {
        console.error('❌ Erreur Supabase upload:', error);
        throw new Error(`Upload échoué: ${error.message}`);
      }

      if (!data?.path) {
        throw new Error('Aucun chemin retourné par Supabase');
      }

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      if (!urlData?.publicUrl) {
        throw new Error('Impossible d\'obtenir l\'URL publique');
      }

      console.log(`✅ Photo uploadée: ${data.path}`);
      return urlData.publicUrl;

    } catch (error: any) {
      console.error('❌ Erreur upload photo:', error);
      throw error;
    }
  }, [checkBucketExists]);

  // Prendre une photo avec la caméra
  const takePhoto = useCallback(async () => {
    setShowPhotoOptions(false);
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const processedUri = await processImage(asset.uri);
        
        const newPhoto: PhotoData = {
          id: Date.now().toString(),
          uri: processedUri,
          fileName: `photo_${Date.now()}.jpg`,
          fileSize: asset.fileSize || 0,
          width: asset.width || 0,
          height: asset.height || 0,
          type: asset.type || 'image',
          uploading: false,
        };

        setPhotos(prev => [...prev, newPhoto]);
        return newPhoto;
      }
    } catch (error) {
      console.error('Erreur prise photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
    return null;
  }, [requestPermissions, processImage]);

  // Sélectionner une photo depuis la galerie
  const pickFromGallery = useCallback(async () => {
    setShowPhotoOptions(false);
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const availableSlots = maxPhotos - photos.length;
      if (availableSlots <= 0) {
        Alert.alert('Limite atteinte', `Vous ne pouvez ajouter que ${maxPhotos} photos maximum.`);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: availableSlots,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newPhotos: PhotoData[] = [];
        
        for (const asset of result.assets) {
          const processedUri = await processImage(asset.uri);
          
          const newPhoto: PhotoData = {
            id: Date.now().toString() + Math.random(),
            uri: processedUri,
            fileName: asset.fileName || `photo_${Date.now()}.jpg`,
            fileSize: asset.fileSize || 0,
            width: asset.width || 0,
            height: asset.height || 0,
            type: asset.type || 'image',
            uploading: false,
          };
          
          newPhotos.push(newPhoto);
        }

        setPhotos(prev => [...prev, ...newPhotos].slice(0, maxPhotos));
        return newPhotos;
      }
    } catch (error) {
      console.error('Erreur sélection photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner les photos');
    }
    return null;
  }, [requestPermissions, processImage, maxPhotos, photos.length]);

  // Supprimer une photo
  const removePhoto = useCallback((photoId: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  }, []);

  // 🔧 CORRECTION : Upload toutes les photos avec gestion d'erreur améliorée
  const uploadAllPhotos = useCallback(async (photosToUpload: PhotoData[]): Promise<string[]> => {
    if (!photosToUpload || photosToUpload.length === 0) {
      console.log('📸 Aucune photo à uploader');
      return [];
    }

    console.log(`📸 Début upload de ${photosToUpload.length} photos...`);
    setUploadingPhotos(true);
    
    try {
      const uploadedUrls: string[] = [];
      const failedUploads: string[] = [];
      
      // Upload en série pour éviter la surcharge
      for (let i = 0; i < photosToUpload.length; i++) {
        const photo = photosToUpload[i];
        
        try {
          if (!photo.supabaseUrl) { // Si pas encore uploadée
            console.log(`📸 Upload photo ${i + 1}/${photosToUpload.length}...`);
            const url = await uploadPhotoToSupabase(photo);
            uploadedUrls.push(url);
            
            // Mettre à jour l'état local avec l'URL
            setPhotos(prev => prev.map(p => 
              p.id === photo.id ? { ...p, supabaseUrl: url } : p
            ));
          } else {
            uploadedUrls.push(photo.supabaseUrl);
          }
        } catch (error: any) {
          console.error(`❌ Échec upload photo ${i + 1}:`, error.message);
          failedUploads.push(`Photo ${i + 1}: ${error.message}`);
        }
      }
      
      // Gérer les résultats
      if (failedUploads.length > 0) {
        console.warn('⚠️ Certaines photos ont échoué:', failedUploads);
        
        if (uploadedUrls.length === 0) {
          // Toutes les photos ont échoué
          throw new Error(`Aucune photo n'a pu être uploadée:\n${failedUploads.join('\n')}`);
        } else {
          // Certaines photos ont échoué mais pas toutes
          console.warn(`⚠️ ${failedUploads.length}/${photosToUpload.length} photos ont échoué`);
        }
      }
      
      console.log(`✅ Upload terminé: ${uploadedUrls.length}/${photosToUpload.length} photos réussies`);
      return uploadedUrls;
      
    } catch (error: any) {
      console.error('❌ Erreur générale upload photos:', error);
      throw error;
    } finally {
      setUploadingPhotos(false);
    }
  }, [uploadPhotoToSupabase]);

  // Réinitialiser toutes les photos
  const clearPhotos = useCallback(() => {
    setPhotos([]);
  }, []);

  // 🔧 NOUVELLE FONCTION : Supprimer une photo de Supabase
  const deletePhotoFromSupabase = useCallback(async (photoUrl: string): Promise<boolean> => {
    try {
      // Extraire le chemin depuis l'URL publique
      const urlParts = photoUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === BUCKET_NAME);
      
      if (bucketIndex === -1 || bucketIndex >= urlParts.length - 1) {
        throw new Error('URL de photo invalide');
      }
      
      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);
        
      if (error) {
        console.error('❌ Erreur suppression photo:', error);
        return false;
      }
      
      console.log(`✅ Photo supprimée: ${filePath}`);
      return true;
      
    } catch (error: any) {
      console.error('❌ Erreur suppression photo:', error);
      return false;
    }
  }, []);

  return {
    // États
    photos,
    uploadingPhotos,
    showPhotoOptions,
    
    // Actions
    takePhoto,
    pickFromGallery,
    removePhoto,
    uploadAllPhotos,
    clearPhotos,
    setShowPhotoOptions,
    deletePhotoFromSupabase,
    
    // Utilitaires
    canAddMore: photos.length < maxPhotos,
    photoCount: photos.length,
    maxPhotos,
    bucketName: BUCKET_NAME, // Export du nom de bucket pour debugging
  };
};
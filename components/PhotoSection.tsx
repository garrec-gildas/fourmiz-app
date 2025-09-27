// components/PhotoSection.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePhotoManager, PhotoData } from '../hooks/usePhotoManager';

interface PhotoSectionProps {
  photos: PhotoData[];
  onPhotosChange: (photos: PhotoData[]) => void;
  maxPhotos?: number;
  title?: string;
  subtitle?: string;
}

const PhotoSection: React.FC<PhotoSectionProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  title = "Photos (facultatives)",
  subtitle = "Ajoutez jusqu'à 5 photos pour mieux décrire votre demande"
}) => {
  const {
    showPhotoOptions,
    setShowPhotoOptions,
    takePhoto,
    pickFromGallery,
    uploadingPhotos,
  } = usePhotoManager(maxPhotos);

  const handleRemovePhoto = (photoId: string) => {
    const updatedPhotos = photos.filter(photo => photo.id !== photoId);
    onPhotosChange(updatedPhotos);
  };

  const handleTakePhoto = async () => {
    setShowPhotoOptions(false);
    try {
      await takePhoto();
      // Note: Cette implémentation nécessite une adaptation pour synchroniser avec les props
      // Pour l'instant, c'est une version simplifiée
    } catch (error) {
      console.error('Erreur prise photo:', error);
    }
  };

  const handlePickFromGallery = async () => {
    setShowPhotoOptions(false);
    try {
      await pickFromGallery();
      // Note: Cette implémentation nécessite une adaptation pour synchroniser avec les props
    } catch (error) {
      console.error('Erreur sélection galerie:', error);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title} - {photos.length}/{maxPhotos}
      </Text>
      
      {/* Grille des photos */}
      {photos.length > 0 && (
        <View style={styles.photosGrid}>
          {photos.map((photo) => (
            <PhotoThumbnail
              key={photo.id}
              photo={photo}
              onRemove={handleRemovePhoto}
            />
          ))}
        </View>
      )}
      
      {/* Boutons d'ajout */}
      {photos.length < maxPhotos && (
        <View style={styles.photoActions}>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => setShowPhotoOptions(true)}
          >
            <Ionicons name="camera" size={16} color="#333333" />
            <Text style={styles.photoButtonText}>Ajouter des photos</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <Text style={styles.photoNote}>
        {subtitle}
      </Text>

      {/* Modal de sélection photo */}
      <PhotoOptionsModal
        visible={showPhotoOptions}
        onClose={() => setShowPhotoOptions(false)}
        onTakePhoto={handleTakePhoto}
        onPickFromGallery={handlePickFromGallery}
      />

      {/* Indicateur d'upload */}
      {uploadingPhotos && (
        <View style={styles.uploadingIndicator}>
          <ActivityIndicator color="#333333" size="small" />
          <Text style={styles.uploadingText}>Upload des photos...</Text>
        </View>
      )}
    </View>
  );
};

// Composant pour chaque miniature de photo
const PhotoThumbnail: React.FC<{
  photo: PhotoData;
  onRemove: (photoId: string) => void;
}> = ({ photo, onRemove }) => (
  <View style={styles.photoContainer}>
    <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
    <TouchableOpacity
      style={styles.photoRemoveButton}
      onPress={() => onRemove(photo.id)}
    >
      <Ionicons name="close-circle" size={20} color="#fff" />
    </TouchableOpacity>
    {photo.uploading && (
      <View style={styles.photoUploadingOverlay}>
        <ActivityIndicator color="#fff" size="small" />
      </View>
    )}
  </View>
);

// Modal des options de photo
const PhotoOptionsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickFromGallery: () => void;
}> = ({ visible, onClose, onTakePhoto, onPickFromGallery }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.photoModalOverlay}>
      <View style={styles.photoModalContent}>
        <Text style={styles.photoModalTitle}>Ajouter une photo</Text>
        
        <TouchableOpacity style={styles.photoModalOption} onPress={onTakePhoto}>
          <Ionicons name="camera" size={24} color="#333333" />
          <Text style={styles.photoModalOptionText}>Prendre une photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.photoModalOption} onPress={onPickFromGallery}>
          <Ionicons name="images" size={24} color="#333333" />
          <Text style={styles.photoModalOptionText}>Choisir depuis la galerie</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.photoModalCancel}
          onPress={onClose}
        >
          <Text style={styles.photoModalCancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  section: { 
    marginBottom: 16, 
    paddingHorizontal: 20 
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  
  // Grille des photos
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  photoContainer: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Actions
  photoActions: {
    marginBottom: 8,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    gap: 8,
    justifyContent: 'center',
  },
  photoButtonText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
  photoNote: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },

  // Indicateur d'upload
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 8,
  },
  uploadingText: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
  },

  // Modal options photo
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  photoModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 20,
    paddingBottom: 40,
  },
  photoModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  photoModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
  },
  photoModalOptionText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  photoModalCancel: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 8,
  },
  photoModalCancelText: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default PhotoSection;
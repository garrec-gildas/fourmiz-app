// src/screens/fourmiz/scanner/DocumentScannerScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import ImagePicker from 'react-native-image-picker';
import { CameraPermissions } from '../../../utils/scanner/CameraPermissions';

export default function DocumentScannerScreen({ navigation, route }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const documentType = route?.params?.documentType || 'ID';

  useEffect(() => {
    checkAndRequestPermissions();
  }, []);

  const checkAndRequestPermissions = async () => {
    try {
      const permissions = await CameraPermissions.checkPermissions();
      
      if (permissions.both) {
        setHasPermission(true);
      } else {
        const granted = await CameraPermissions.requestPermissions();
        setHasPermission(granted);
      }
    } catch (error) {
      console.error('Erreur permissions:', error);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  const takePicture = async (camera) => {
    if (scanning) return;
    
    setScanning(true);
    
    try {
      const options = {
        quality: 0.8,
        base64: true,
        skipProcessing: false,
        forceUpOrientation: true,
        fixOrientation: true,
      };

      const data = await camera.takePictureAsync(options);
      
      // Naviguer vers l'écran de résultat
      navigation.navigate('ScanResult', {
        imageUri: data.uri,
        documentType: documentType,
        base64: data.base64
      });
      
    } catch (error) {
      console.error('Erreur capture:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    } finally {
      setScanning(false);
    }
  };

  const selectFromGallery = () => {
    const options = {
      title: 'Sélectionner un document',
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.8,
    };

    ImagePicker.showImagePicker(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      navigation.navigate('ScanResult', {
        imageUri: response.uri,
        documentType: documentType,
        base64: response.data
      });
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Vérification des permissions...</Text>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Permissions requises</Text>
          <Text style={styles.permissionText}>
            Pour scanner vos documents, nous avons besoin d'accéder à votre caméra.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={checkAndRequestPermissions}
          >
            <Text style={styles.permissionButtonText}>Autoriser l'accès</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.galleryButton}
            onPress={selectFromGallery}
          >
            <Text style={styles.galleryButtonText}>Télécharger une photo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <RNCamera
        style={styles.camera}
        type={RNCamera.Constants.Type.back}
        flashMode={RNCamera.Constants.FlashMode.auto}
        androidCameraPermissionOptions={{
          title: 'Permission caméra',
          message: 'Nous avons besoin d\'accéder à votre caméra pour scanner vos documents',
          buttonPositive: 'Autoriser',
          buttonNegative: 'Refuser',
        }}
      >
        {({ camera, status }) => {
          if (status !== 'READY') return <View />;
          
          return (
            <View style={styles.cameraContainer}>
              {/* Cadre de scan */}
              <View style={styles.scanFrame}>
                <View style={styles.scanCorner} />
                <View style={[styles.scanCorner, styles.topRight]} />
                <View style={[styles.scanCorner, styles.bottomLeft]} />
                <View style={[styles.scanCorner, styles.bottomRight]} />
              </View>

              {/* Instructions */}
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsText}>
                  Placez votre {documentType === 'ID' ? 'pièce d\'identité' : 'document'} dans le cadre
                </Text>
              </View>

              {/* Boutons */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={styles.galleryButton}
                  onPress={selectFromGallery}
                >
                  <Text style={styles.galleryButtonText}>Galerie</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.captureButton, scanning && styles.captureButtonDisabled]}
                  onPress={() => takePicture(camera)}
                  disabled={scanning}
                >
                  {scanning ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <View style={styles.captureButtonInner} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      </RNCamera>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  camera: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scanFrame: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    height: '40%',
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 12,
  },
  scanCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#007AFF',
    borderWidth: 4,
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    right: -2,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: -2,
    top: 'auto',
    borderTopWidth: 0,
    borderBottomWidth: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    top: 'auto',
    left: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 8,
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  captureButtonDisabled: {
    backgroundColor: '#999',
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
  },
  galleryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  galleryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
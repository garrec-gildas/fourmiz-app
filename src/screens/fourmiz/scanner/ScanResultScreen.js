// src/screens/fourmiz/scanner/ScanResultScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';

export default function ScanResultScreen({ navigation, route }) {
  const [uploading, setUploading] = useState(false);
  const { imageUri, documentType, base64 } = route.params;

  const handleSave = async () => {
    setUploading(true);
    
    try {
      // Simuler l'upload du document
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Ici vous pouvez ajouter l'appel à votre API
      // const response = await DocumentService.uploadDocument({
      //   image: base64,
      //   type: documentType
      // });
      
      Alert.alert(
        'Succès',
        'Votre document a été enregistré avec succès !',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('Home') 
          }
        ]
      );
      
    } catch (error) {
      console.error('Erreur upload:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'enregistrer le document. Veuillez réessayer.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRetake = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Vérifiez votre document</Text>
          <Text style={styles.subtitle}>
            {documentType === 'ID' ? 'Pièce d\'identité' : 'Document'}
          </Text>
        </View>

        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: imageUri }} 
            style={styles.documentImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Vérifications :</Text>
          <Text style={styles.instructionItem}>✓ Le document est entièrement visible</Text>
          <Text style={styles.instructionItem}>✓ Les informations sont lisibles</Text>
          <Text style={styles.instructionItem}>✓ L'image n'est pas floue</Text>
          <Text style={styles.instructionItem}>✓ L'éclairage est suffisant</Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={handleRetake}
            disabled={uploading}
          >
            <Text style={styles.retakeButtonText}>Reprendre</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, uploading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Valider</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 30,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    padding: 10,
  },
  documentImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
  },
  instructionsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  instructionItem: {
    fontSize: 16,
    marginBottom: 8,
    color: '#28A745',
    lineHeight: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#6C757D',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
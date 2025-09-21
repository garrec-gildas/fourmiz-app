// components/DebugImage.tsx - Composant pour diagnostiquer les erreurs d'images
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';

interface DebugImageProps {
  uri: string;
  style?: any;
  placeholder?: string;
}

export const DebugImage: React.FC<DebugImageProps> = ({ 
  uri, 
  style, 
  placeholder = "Aucune image" 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = (errorEvent: any) => {
    console.log(`❌ [DebugImage] Erreur de chargement pour: ${uri}`);
    console.log(`❌ [DebugImage] Détails erreur:`, errorEvent);
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    console.log(`✅ [DebugImage] Image chargée avec succès: ${uri}`);
    setError(false);
    setLoading(false);
  };

  const handleLoadStart = () => {
    console.log(`🔄 [DebugImage] Début chargement: ${uri}`);
    setLoading(true);
    setError(false);
  };

  const retry = () => {
    console.log(`🔄 [DebugImage] Tentative ${retryCount + 1} pour: ${uri}`);
    setRetryCount(prev => prev + 1);
    setError(false);
    setLoading(true);
  };

  const showDetails = () => {
    Alert.alert(
      "Détails de l'image",
      `URL: ${uri}\nStatut: ${error ? 'Erreur' : loading ? 'Chargement' : 'Chargée'}\nTentatives: ${retryCount + 1}`,
      [
        { text: "Copier URL", onPress: () => console.log("URL à copier:", uri) },
        { text: "OK" }
      ]
    );
  };

  if (error) {
    return (
      <View style={[style, { backgroundColor: '#ffebee', justifyContent: 'center', alignItems: 'center', padding: 8 }]}>
        <Text style={{ color: '#d32f2f', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>
          Erreur image
        </Text>
        <TouchableOpacity
          onPress={retry}
          style={{ backgroundColor: '#d32f2f', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 4 }}
        >
          <Text style={{ color: 'white', fontSize: 10 }}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={showDetails}
          style={{ backgroundColor: '#666', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
        >
          <Text style={{ color: 'white', fontSize: 10 }}>Détails</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[style, { backgroundColor: '#e3f2fd', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#1976d2', fontSize: 12 }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <Image
      key={`${uri}-${retryCount}`} // Force le rechargement après retry
      source={{ uri }}
      style={style}
      contentFit="cover"
      onError={handleError}
      onLoad={handleLoad}
      onLoadStart={handleLoadStart}
      placeholder={placeholder}
      transition={200}
    />
  );
};
// app/(tabs)/map.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={64} color="#ccc" />
          <Text style={styles.placeholderText}>Carte interactive</Text>
          <Text style={styles.placeholderSubtext}>
            Trouvez des services et des Fourmiz près de chez vous
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="locate" size={20} color="#FF4444" />
            <Text style={styles.controlText}>Ma position</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="search" size={20} color="#FF4444" />
            <Text style={styles.controlText}>Rechercher</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="filter" size={20} color="#FF4444" />
            <Text style={styles.controlText}>Filtrer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🗺️ Fonctionnalités à venir</Text>
          <Text style={styles.infoItem}>• Localisation des services</Text>
          <Text style={styles.infoItem}>• Fourmiz disponibles</Text>
          <Text style={styles.infoItem}>• Itinéraires optimisés</Text>
          <Text style={styles.infoItem}>• Zones de service</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20 },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginBottom: 20,
  },
  placeholderText: { fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 16 },
  placeholderSubtext: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  controlText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#FF4444' },
  infoCard: {
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe6e6',
  },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#FF4444', marginBottom: 8 },
  infoItem: { fontSize: 14, color: '#666', marginVertical: 2 },
});

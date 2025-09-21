// app/services/tracking-view.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useServiceTracking } from '../../hooks/useGPSTracking';

interface TrackingViewScreenProps {
  serviceId: string;
}

export default function TrackingViewScreen({ serviceId }: TrackingViewScreenProps) {
  const { 
    servicePosition, 
    loading, 
    error, 
    startPolling, 
    stopPolling,
    fetchServicePosition 
  } = useServiceTracking(serviceId);
  
  useEffect(() => {
    startPolling(15); // Mise à jour toutes les 15 secondes
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchServicePosition} />
      }
    >
      <Text style={styles.title}>Suivi de votre service</Text>
      
      {error && <Text style={styles.error}>{error}</Text>}
      
      {servicePosition ? (
        <View style={styles.trackingInfo}>
          <Text style={styles.fourmizName}>
            Fourmiz: {servicePosition.fourmizName}
          </Text>
          
          <Text style={styles.serviceType}>
            Service: {servicePosition.serviceType}
          </Text>
          
          <Text style={styles.distance}>
            Distance parcourue: {servicePosition.totalDistanceKm}km
          </Text>
          
          <Text style={styles.lastUpdate}>
            Dernière position: {new Date(servicePosition.lastUpdate).toLocaleTimeString()}
          </Text>
          
          <View style={styles.coordinates}>
            <Text>Coordonnées actuelles:</Text>
            <Text>{servicePosition.latitude.toFixed(6)}, {servicePosition.longitude.toFixed(6)}</Text>
          </View>
          
          {/* Ici vous pouvez ajouter une vraie carte plus tard */}
          <View style={styles.mapPlaceholder}>
            <Text>Carte interactive (à intégrer)</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.noTracking}>
          Service non suivi actuellement ou terminé
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  error: { color: 'red', marginBottom: 10 },
  trackingInfo: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8 },
  fourmizName: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  serviceType: { fontSize: 14, color: '#666', marginBottom: 8 },
  distance: { fontSize: 14, marginBottom: 8 },
  lastUpdate: { fontSize: 12, color: '#888', marginBottom: 12 },
  coordinates: { marginBottom: 15 },
  mapPlaceholder: { 
    height: 200, 
    backgroundColor: '#e0e0e0', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderRadius: 8 
  },
  noTracking: { textAlign: 'center', color: '#666', marginTop: 50 }
});
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapViewDirections = ({
  origin,
  destination,
  waypoints = [],
  apikey,
  strokeWidth = 3,
  strokeColor = "#000",
  mode = "DRIVING",
  language = "en",
  optimizeWaypoints = false,
  precision = "high",
  timePrecision = "none",
  onStart,
  onReady,
  onError,
}) => {
  
  // Simulate the onStart callback
  React.useEffect(() => {
    if (onStart && origin && destination) {
      onStart({
        origin,
        destination,
        waypoints
      });
    }
    
    // Simulate the onReady callback with mock data
    if (onReady && origin && destination) {
      // Mock distance and duration values
      const mockDistance = 3.5; // kilometers
      const mockDuration = 15; // minutes
      
      setTimeout(() => {
        onReady({
          distance: mockDistance,
          duration: mockDuration,
          coordinates: [origin, ...(waypoints || []), destination],
          fare: null
        });
      }, 500);
    }
  }, [origin, destination, waypoints, onStart, onReady]);

  return (
    <View style={[
      styles.directionsContainer,
      { borderColor: strokeColor, borderWidth: strokeWidth }
    ]}>
      <Text style={styles.directionsText}>
        📍 Route: {mode} {waypoints.length > 0 ? `(${waypoints.length + 2} points)` : ''}
      </Text>
      <Text style={styles.directionsSubtext}>
        Directions visible on mobile
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  directionsContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
    maxWidth: 200,
    borderStyle: 'dashed',
  },
  directionsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  directionsSubtext: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  }
});

export default MapViewDirections;
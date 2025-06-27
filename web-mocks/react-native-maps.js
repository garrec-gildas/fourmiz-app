import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Mock MapView component pour web - Version complète
const MapView = React.forwardRef((props, ref) => {
  const {
    style,
    children,
    region,
    initialRegion,
    onRegionChange,
    onRegionChangeComplete,
    showsUserLocation,
    showsMyLocationButton,
    provider,
    ...otherProps
  } = props;

  // Simuler les callbacks si fournis
  React.useEffect(() => {
    if (onRegionChange && region) {
      onRegionChange(region);
    }
    if (onRegionChangeComplete && region) {
      onRegionChangeComplete(region);
    }
  }, [region, onRegionChange, onRegionChangeComplete]);

  return (
    <View
      ref={ref}
      style={[styles.mapContainer, style]}
      {...otherProps}
    >
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>🗺️ Carte Interactive</Text>
        <Text style={styles.mapSubtext}>
          {region ? `${region.latitude.toFixed(4)}, ${region.longitude.toFixed(4)}` : 'Chargement...'}
        </Text>
        <Text style={styles.webNote}>Fonctionnalité complète disponible sur mobile</Text>
      </View>
      <View style={styles.childrenContainer}>
        {children}
      </View>
    </View>
  );
});

// Mock Marker component
const Marker = ({ 
  coordinate, 
  title, 
  description, 
  children, 
  onPress, 
  rotation = 0,
  anchor = { x: 0.5, y: 1 },
  ...props 
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <View
      style={[
        styles.marker,
        {
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: [
            { translateX: -12 }, 
            { translateY: -24 },
            { rotate: `${rotation}deg` }
          ],
        }
      ]}
      onTouchEnd={handlePress}
      {...props}
    >
      {children || (
        <View style={styles.defaultMarker}>
          <Text style={styles.markerText}>📍</Text>
          {title && <Text style={styles.markerTitle}>{title}</Text>}
          }
        </View>
      )}
    </View>
  );
};

// Mock Polyline component
const Polyline = ({ 
  coordinates = [], 
  strokeColor = '#FF4444', 
  strokeWidth = 2, 
  lineDashPattern,
  ...props 
}) => {
  return (
    <View style={[
      styles.polyline, 
      { 
        borderColor: strokeColor,
        borderWidth: strokeWidth,
        borderStyle: lineDashPattern ? 'dashed' : 'solid'
      }
    ]}>
      <Text style={[styles.polylineText, { color: strokeColor }]}>
        📍 Itinéraire ({coordinates.length} points)
      </Text>
    </View>
  );
};

// Mock Circle component
const Circle = ({ 
  center, 
  radius = 1000, 
  strokeColor = '#FF4444', 
  fillColor = 'rgba(255, 68, 68, 0.1)', 
  strokeWidth = 2,
  ...props 
}) => {
  return (
    <View
      style={[
        styles.circle,
        {
          backgroundColor: fillColor,
          borderColor: strokeColor,
          borderWidth: strokeWidth,
        }
      ]}
    >
      <Text style={[styles.circleText, { color: strokeColor }]}>
        Zone {Math.round(radius/1000)}km
      </Text>
    </View>
  );
};

// Mock Callout component
const Callout = ({ children, tooltip = false, ...props }) => {
  return (
    <View style={[styles.callout, tooltip && styles.tooltip]}>
      {children}
    </View>
  );
};

// Mock AnimatedRegion
class AnimatedRegion {
  constructor(region) {
    this.latitude = region.latitude;
    this.longitude = region.longitude;
    this.latitudeDelta = region.latitudeDelta;
    this.longitudeDelta = region.longitudeDelta;
  }

  setValue(region) {
    Object.assign(this, region);
  }

  timing(config) {
    return {
      start: (callback) => {
        if (callback) callback();
      }
    };
  }
}

// Mock constants et utilitaires
const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = 'default';

// Mock des utilitaires de géolocalisation
const getDistance = (from, to) => {
  // Formule de distance simplifiée
  const R = 6371; // Rayon de la Terre en km
  const dLat = (to.latitude - from.latitude) * Math.PI / 180;
  const dLon = (to.longitude - from.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Distance en mètres
};

const styles = StyleSheet.create({
  mapContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  mapText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  webNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  childrenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  marker: {
    zIndex: 1000,
  },
  defaultMarker: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    fontSize: 20,
  },
  markerTitle: {
    fontSize: 10,
    color: '#333',
    marginTop: 2,
    textAlign: 'center',
  },
  polyline: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 2,
  },
  polylineText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  circle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    left: '50%',
    top: '50%',
    transform: [{ translateX: -60 }, { translateY: -60 }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  callout: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: 200,
  },
  tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
});

// Export par défaut
export default MapView;

// Exports nommés
export {
  MapView,
  Marker,
  Polyline,
  Circle,
  Callout,
  AnimatedRegion,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
  getDistance,
};

// Export de compatibilité
export const enableLatestRenderer = () => {};
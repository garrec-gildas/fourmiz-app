import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Phone, MessageCircle, Navigation, Clock, Star, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Car, Bike, User, Info, Shield, Layers, LifeBuoy, ChevronLeft, ChevronRight, Clock8, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing, interpolate } from 'react-native-reanimated';
import * as Location from 'expo-location';

// Use dynamic import for web compatibility
let MapView, Marker, Circle, PROVIDER_GOOGLE, Polyline, Callout, AnimatedRegion, MapViewDirections;
if (Platform.OS !== 'web') {
  // On native platforms, import the real components
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Circle = Maps.Circle;
  Polyline = Maps.Polyline;
  Callout = Maps.Callout;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  AnimatedRegion = Maps.AnimatedRegion;
  
  // Import directions library for native
  MapViewDirections = require('react-native-maps-directions').default;
} else {
  // On web, import our mock implementation
  const WebMock = require('../../../web-mocks/react-native-maps');
  MapView = WebMock.default;
  Marker = WebMock.Marker;
  Circle = WebMock.Circle;
  Polyline = WebMock.Polyline;
  Callout = WebMock.Callout;
  PROVIDER_GOOGLE = WebMock.PROVIDER_GOOGLE;
  AnimatedRegion = WebMock.AnimatedRegion;
  
  // Import directions mock for web
  MapViewDirections = require('../../../web-mocks/react-native-maps-directions').default;
}

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = 'AIzaSyD6V0xJcIoI1I-FHKZ_sXWEBTup1V8V1Ko'; // Replace with your actual API key

// Default region (Paris, France)
const DEFAULT_REGION = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.0082,
  longitudeDelta: 0.0081,
};

// Mock data pour le suivi de mission
const mockTrackingData = {
  mission: {
    id: '1',
    serviceName: 'Livraison de courses Drive',
    clientName: 'Jean Dupont',
    fourmizName: 'Marie Dubois',
    fourmizAvatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    status: 'in_progress', // pending, accepted, in_progress, completed
    estimatedArrival: '15 min',
    totalAmount: 12.50,
    vehicleType: 'Vélo',
    startTime: '14:30',
    estimatedDuration: 45,
  },
  fourmizLocation: {
    latitude: 48.8566,
    longitude: 2.3522,
    heading: 45, // Direction en degrés
    speed: 15, // km/h
  },
  clientLocation: {
    latitude: 48.8606,
    longitude: 2.3376,
  },
  pickupLocation: {
    latitude: 48.8534,
    longitude: 2.3488,
    name: 'Carrefour Drive',
    address: '123 Boulevard Saint-Germain',
  },
  timeline: [
    {
      id: '1',
      title: 'Mission acceptée',
      description: 'Marie a accepté votre demande',
      time: '14:30',
      status: 'completed',
      icon: CheckCircle,
    },
    {
      id: '2',
      title: 'En route vers le magasin',
      description: 'Marie se dirige vers Carrefour Drive',
      time: '14:32',
      status: 'completed',
      icon: Navigation,
    },
    {
      id: '3',
      title: 'Arrivée au magasin',
      description: 'Récupération de vos courses en cours',
      time: '14:45',
      status: 'in_progress',
      icon: AlertCircle,
    },
    {
      id: '4',
      title: 'En route vers vous',
      description: 'Livraison en cours',
      time: 'Estimé 15:00',
      status: 'pending',
      icon: Car,
    },
    {
      id: '5',
      title: 'Livraison terminée',
      description: 'Vos courses sont arrivées !',
      time: 'Estimé 15:15',
      status: 'pending',
      icon: CheckCircle,
    },
  ],
  messages: [
    {
      id: '1',
      sender: 'fourmiz',
      message: 'Je suis en route vers le magasin ! 🚴‍♀️',
      time: '14:32',
    },
    {
      id: '2',
      sender: 'fourmiz',
      message: 'Arrivée au Carrefour Drive, je récupère vos courses',
      time: '14:45',
    },
  ],
  routeInfo: {
    currentLeg: 'pickup', // 'pickup' or 'delivery'
    totalDistance: 5.2, // km
    remainingDistance: 2.8, // km
    totalDuration: 25, // minutes
    remainingDuration: 15, // minutes
    trafficCondition: 'moderate', // 'low', 'moderate', 'high'
  }
};

const statusConfig = {
  pending: { label: 'En attente', color: '#FF9800', icon: Clock },
  accepted: { label: 'Acceptée', color: '#2196F3', icon: CheckCircle },
  in_progress: { label: 'En cours', color: '#4CAF50', icon: AlertCircle },
  completed: { label: 'Terminée', color: '#4CAF50', icon: CheckCircle },
};

export default function TrackingScreen() {
  const { id } = useLocalSearchParams();
  const [showTimeline, setShowTimeline] = useState(false);
  const [mapType, setMapType] = useState('standard');
  const [showTrafficLayer, setShowTrafficLayer] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1); // 1x, 2x, or 3x
  const [showLayersModal, setShowLayersModal] = useState(false);
  const [showRouteOptions, setShowRouteOptions] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState('fastest');
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [trackingData, setTrackingData] = useState(mockTrackingData);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [directionsResult, setDirectionsResult] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<any>(null);
  
  // Animation values
  const pulseAnim = useSharedValue(1);
  const rotateAnim = useSharedValue(0);
  const locationOpacity = useSharedValue(1);
  
  // References
  const mapRef = useRef<any>(null);
  const fourmizMarkerRef = useRef<any>(null);
  const animatedFourmizLocation = useRef(new AnimatedRegion({
    latitude: mockTrackingData.fourmizLocation.latitude,
    longitude: mockTrackingData.fourmizLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })).current;

  // Animated styles
  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnim.value }],
    };
  });
  
  const rotateStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { 
          rotateZ: `${interpolate(
            rotateAnim.value,
            [0, 1],
            [0, 360]
          )}deg` 
        }
      ],
    };
  });
  
  const opacityStyle = useAnimatedStyle(() => {
    return {
      opacity: locationOpacity.value,
    };
  });

  useEffect(() => {
    // Pulse animation for the Fourmiz marker
    pulseAnim.value = withRepeat(
      withTiming(1.2, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
    
    // Rotation animation for the compass
    rotateAnim.value = withRepeat(
      withTiming(1, {
        duration: 5000,
        easing: Easing.linear,
      }),
      -1,
      true
    );
    
    // Blinking animation for the location indicator
    locationOpacity.value = withRepeat(
      withTiming(0.5, {
        duration: 700,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    // Only attempt geolocation on mobile platforms
    if (Platform.OS !== 'web') {
      getCurrentLocation();
    } else {
      // For web, set a default location
      setUserLocation({
        latitude: mockTrackingData.clientLocation.latitude,
        longitude: mockTrackingData.clientLocation.longitude,
      });
    }

    return () => {
      // Cleanup if needed
    };
  }, []);
  
  // Start the Fourmiz movement simulation
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    // Fourmiz movement simulation
    let lastPosition = { ...mockTrackingData.fourmizLocation };
    
    // Define waypoints based on the mission stage
    const simulationWaypoints = [
      { // Starting point
        latitude: mockTrackingData.fourmizLocation.latitude,
        longitude: mockTrackingData.fourmizLocation.longitude,
      },
      { // Halfway to store
        latitude: (mockTrackingData.fourmizLocation.latitude + mockTrackingData.pickupLocation.latitude) / 2 + 0.002,
        longitude: (mockTrackingData.fourmizLocation.longitude + mockTrackingData.pickupLocation.longitude) / 2 - 0.001,
      },
      { // Store location
        latitude: mockTrackingData.pickupLocation.latitude,
        longitude: mockTrackingData.pickupLocation.longitude,
      },
      { // Halfway to client
        latitude: (mockTrackingData.pickupLocation.latitude + mockTrackingData.clientLocation.latitude) / 2 - 0.001,
        longitude: (mockTrackingData.pickupLocation.longitude + mockTrackingData.clientLocation.longitude) / 2 + 0.002,
      },
      { // Client location
        latitude: mockTrackingData.clientLocation.latitude,
        longitude: mockTrackingData.clientLocation.longitude,
      },
    ];
    
    let currentWaypointIndex = 0;
    let progress = 0;
    
    const movementInterval = setInterval(() => {
      if (currentWaypointIndex >= simulationWaypoints.length - 1) {
        clearInterval(movementInterval);
        return;
      }
      
      const startPoint = simulationWaypoints[currentWaypointIndex];
      const endPoint = simulationWaypoints[currentWaypointIndex + 1];
      
      progress += 0.02 * simulationSpeed;
      
      if (progress >= 1) {
        // Move to next waypoint
        currentWaypointIndex++;
        progress = 0;
        
        // Update mission state based on waypoint
        if (currentWaypointIndex === 2) { // Reached store
          setTrackingData(prev => ({
            ...prev,
            timeline: prev.timeline.map(item => 
              item.id === '3' ? { ...item, status: 'completed' } : item
            ),
            routeInfo: {
              ...prev.routeInfo,
              currentLeg: 'delivery',
              remainingDistance: 2.4,
              remainingDuration: 12
            }
          }));
        } else if (currentWaypointIndex === 4) { // Reached client
          setTrackingData(prev => ({
            ...prev,
            mission: { ...prev.mission, status: 'completed' },
            timeline: prev.timeline.map(item => 
              item.id === '4' || item.id === '5' ? { ...item, status: 'completed' } : item
            )
          }));
        }
        
        if (currentWaypointIndex >= simulationWaypoints.length - 1) {
          clearInterval(movementInterval);
          return;
        }
      }
      
      const startPoint2 = simulationWaypoints[currentWaypointIndex];
      const endPoint2 = simulationWaypoints[currentWaypointIndex + 1];
      
      // Interpolate position
      const newLatitude = startPoint2.latitude + (endPoint2.latitude - startPoint2.latitude) * progress;
      const newLongitude = startPoint2.longitude + (endPoint2.longitude - startPoint2.longitude) * progress;
      
      // Calculate heading
      const deltaLat = endPoint2.latitude - startPoint2.latitude;
      const deltaLong = endPoint2.longitude - startPoint2.longitude;
      const heading = Math.atan2(deltaLong, deltaLat) * 180 / Math.PI;
      
      // Update tracking data
      setTrackingData(prev => ({
        ...prev,
        fourmizLocation: {
          ...prev.fourmizLocation,
          latitude: newLatitude,
          longitude: newLongitude,
          heading: heading
        },
        routeInfo: {
          ...prev.routeInfo,
          remainingDistance: Math.max(0, prev.routeInfo.remainingDistance - 0.05 * simulationSpeed),
          remainingDuration: Math.max(0, prev.routeInfo.remainingDuration - 0.2 * simulationSpeed),
        }
      }));
      
      // Update animated region
      if (Platform.OS !== 'web' && fourmizMarkerRef.current) {
        animatedFourmizLocation.setValue({
          latitude: newLatitude,
          longitude: newLongitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
      
      // Calculate metrics
      const distanceDelta = Math.sqrt(
        Math.pow((newLatitude - lastPosition.latitude) * 111.32, 2) +
        Math.pow((newLongitude - lastPosition.longitude) * 110.57, 2)
      );
      
      lastPosition = { latitude: newLatitude, longitude: newLongitude };
      
    }, 500);
    
    return () => clearInterval(movementInterval);
  }, [simulationSpeed]);
  
  // Handle directions result
  useEffect(() => {
    if (directionsResult) {
      setRouteCoordinates(directionsResult.coordinates);
    }
  }, [directionsResult]);
  
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to track your position');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      setUserLocation(mockTrackingData.clientLocation);
    }
  };

  // Call Fourmiz
  const handleCallFourmiz = () => {
    Alert.alert(
      'Appeler Marie',
      'Voulez-vous appeler votre Fourmiz ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appeler', onPress: () => console.log('Calling Fourmiz') }
      ]
    );
  };

  // Message Fourmiz
  const handleMessageFourmiz = () => {
    router.push(`/chat/${mockTrackingData.mission.id}`);
  };
  
  // Center map on fourmiz
  const handleCenterOnFourmiz = () => {
    if (mapRef.current && Platform.OS !== 'web') {
      mapRef.current.animateToRegion({
        latitude: trackingData.fourmizLocation.latitude,
        longitude: trackingData.fourmizLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };
  
  // Change map type
  const handleMapTypeChange = () => {
    setMapType(prevType => prevType === 'standard' ? 'satellite' : 'standard');
  };
  
  // Toggle traffic layer
  const handleToggleTraffic = () => {
    setShowTrafficLayer(prev => !prev);
  };
  
  // Change simulation speed
  const handleChangeSpeed = () => {
    setSimulationSpeed(prev => {
      if (prev === 1) return 2;
      if (prev === 2) return 3;
      return 1;
    });
  };
  
  // Change route option
  const handleRouteChange = (route: string) => {
    setSelectedRoute(route);
    setShowRouteOptions(false);
  };

  // Helper to format time string
  const formatTimeRemaining = (minutes: number) => {
    if (minutes < 1) return 'moins d\'une minute';
    return `${Math.ceil(minutes)} min`;
  };
  
  // Get vehicle icon
  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType.toLowerCase()) {
      case 'vélo':
      case 'bike':
        return Bike;
      case 'voiture':
      case 'car':
        return Car;
      default:
        return User;
    }
  };

  const VehicleIcon = getVehicleIcon(trackingData.mission.vehicleType);
  const statusInfo = statusConfig[trackingData.mission.status as keyof typeof statusConfig];
  
  // Render map for native platforms
  const renderMapContent = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapText}>🗺️ Suivi en temps réel</Text>
          <Text style={styles.mapSubtext}>
            Position: {trackingData.fourmizLocation.latitude.toFixed(4)}, {trackingData.fourmizLocation.longitude.toFixed(4)}
          </Text>
          <Text style={styles.webNote}>Carte interactive disponible sur mobile</Text>
          
          {/* Simulation des marqueurs */}
          <View style={styles.markersSimulation}>
            <View style={styles.markerSim}>
              <Text style={styles.markerText}>📍 Départ</Text>
            </View>
            <View style={styles.markerSim}>
              <Text style={styles.markerText}>
                🚴‍♀️ {trackingData.mission.fourmizName} • {formatTimeRemaining(trackingData.routeInfo.remainingDuration)}
              </Text>
            </View>
            <View style={styles.markerSim}>
              <Text style={styles.markerText}>🏪 {mockTrackingData.pickupLocation.name}</Text>
            </View>
            <View style={styles.markerSim}>
              <Text style={styles.markerText}>🏠 Vous</Text>
            </View>
          </View>
        </View>
      );
    }
    
    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={showTrafficLayer}
        mapType={mapType}
      >
        {/* Origin/Pickup marker */}
        <Marker
          coordinate={trackingData.pickupLocation}
          title={trackingData.pickupLocation.name}
          description={trackingData.pickupLocation.address}
        >
          <View style={styles.storeMarker}>
            <Text style={styles.storeIcon}>🏪</Text>
          </View>
          <Callout>
            <View style={styles.calloutContainer}>
              <Text style={styles.calloutTitle}>{trackingData.pickupLocation.name}</Text>
              <Text style={styles.calloutAddress}>{trackingData.pickupLocation.address}</Text>
            </View>
          </Callout>
        </Marker>
        
        {/* Destination marker */}
        <Marker
          coordinate={trackingData.clientLocation}
          title="Votre position"
          description="Adresse de livraison"
        >
          <View style={styles.destinationMarker}>
            <Text style={styles.destinationIcon}>📍</Text>
          </View>
          <Callout>
            <View style={styles.calloutContainer}>
              <Text style={styles.calloutTitle}>Adresse de livraison</Text>
              <Text style={styles.calloutAddress}>Votre position</Text>
            </View>
          </Callout>
        </Marker>
        
        {/* Fourmiz animated marker */}
        <Marker.Animated
          ref={fourmizMarkerRef}
          coordinate={animatedFourmizLocation}
          title={trackingData.mission.fourmizName}
          description={`${trackingData.mission.vehicleType} • Arrivée dans ${formatTimeRemaining(trackingData.routeInfo.remainingDuration)}`}
          rotation={trackingData.fourmizLocation.heading}
        >
          <Animated.View style={[styles.fourmizMarker, pulseStyle]}>
            <Image
              source={{ uri: trackingData.mission.fourmizAvatar }}
              style={styles.fourmizMarkerImage}
            />
          </Animated.View>
          <Callout>
            <View style={styles.calloutContainer}>
              <Text style={styles.calloutTitle}>{trackingData.mission.fourmizName}</Text>
              <Text style={styles.calloutEta}>
                Arrivée dans {formatTimeRemaining(trackingData.routeInfo.remainingDuration)}
              </Text>
              <View style={styles.calloutSpeed}>
                <Text style={styles.calloutSpeedText}>
                  {trackingData.fourmizLocation.speed} km/h • {trackingData.routeInfo.remainingDistance.toFixed(1)} km
                </Text>
              </View>
            </View>
          </Callout>
        </Marker.Animated>
        
        {/* Current route visualization */}
        {trackingData.routeInfo.currentLeg === 'pickup' ? (
          <MapViewDirections
            origin={trackingData.fourmizLocation}
            destination={trackingData.pickupLocation}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor="#FF9800"
            mode="DRIVING"
            onReady={(result) => setDirectionsResult(result)}
          />
        ) : (
          <MapViewDirections
            origin={trackingData.fourmizLocation}
            destination={trackingData.clientLocation}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor="#FF4444"
            mode="DRIVING"
            onReady={(result) => setDirectionsResult(result)}
          />
        )}
        
        {/* Alternative or completed routes */}
        {trackingData.routeInfo.currentLeg === 'delivery' && (
          <Polyline
            coordinates={[
              trackingData.fourmizLocation,
              trackingData.pickupLocation,
            ]}
            strokeColor="#BBBBBB"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>
    );
  };

  // Render timeline item
  const renderTimelineItem = (item: any, index: number) => {
    const ItemIcon = item.icon;
    const isLast = index === trackingData.timeline.length - 1;

    return (
      <View key={item.id} style={styles.timelineItem}>
        <View style={styles.timelineIconContainer}>
          <View style={[
            styles.timelineIcon,
            item.status === 'completed' && styles.timelineIconCompleted,
            item.status === 'in_progress' && styles.timelineIconInProgress,
            item.status === 'pending' && styles.timelineIconPending,
          ]}>
            <ItemIcon 
              size={16} 
              color={
                item.status === 'completed' ? '#4CAF50' :
                item.status === 'in_progress' ? '#FF9800' : '#999'
              } 
            />
          </View>
          {!isLast && (
            <View style={[
              styles.timelineLine,
              item.status === 'completed' && styles.timelineLineCompleted
            ]} />
          )}
        </View>
        <View style={styles.timelineContent}>
          <Text style={styles.timelineTitle}>{item.title}</Text>
          <Text style={styles.timelineDescription}>{item.description}</Text>
          <Text style={styles.timelineTime}>{item.time}</Text>
        </View>
      </View>
    );
  };

  // Render layers modal
  const renderLayersModal = () => (
    <Modal
      visible={showLayersModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowLayersModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Options de la carte</Text>
            <TouchableOpacity onPress={() => setShowLayersModal(false)} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Type de carte</Text>
            <View style={styles.mapTypeOptions}>
              <TouchableOpacity 
                style={[
                  styles.mapTypeOption,
                  mapType === 'standard' && styles.mapTypeOptionActive
                ]}
                onPress={() => {
                  setMapType('standard');
                  setShowLayersModal(false);
                }}
              >
                <Text style={[
                  styles.mapTypeText,
                  mapType === 'standard' && styles.mapTypeTextActive
                ]}>Standard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.mapTypeOption,
                  mapType === 'satellite' && styles.mapTypeOptionActive
                ]}
                onPress={() => {
                  setMapType('satellite');
                  setShowLayersModal(false);
                }}
              >
                <Text style={[
                  styles.mapTypeText,
                  mapType === 'satellite' && styles.mapTypeTextActive
                ]}>Satellite</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Couches</Text>
            <View style={styles.layerOption}>
              <View style={styles.layerOptionInfo}>
                <Info size={20} color="#666" />
                <Text style={styles.layerOptionText}>Afficher le trafic</Text>
              </View>
              <Switch
                value={showTrafficLayer}
                onValueChange={handleToggleTraffic}
                trackColor={{ false: '#E0E0E0', true: '#FF444440' }}
                thumbColor={showTrafficLayer ? '#FF4444' : '#999'}
              />
            </View>
          </View>
          
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Simulation</Text>
            <View style={styles.speedOptions}>
              <TouchableOpacity 
                style={[
                  styles.speedOption,
                  simulationSpeed === 1 && styles.speedOptionActive
                ]}
                onPress={() => {
                  setSimulationSpeed(1);
                  setShowLayersModal(false);
                }}
              >
                <Text style={[
                  styles.speedText,
                  simulationSpeed === 1 && styles.speedTextActive
                ]}>1x</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.speedOption,
                  simulationSpeed === 2 && styles.speedOptionActive
                ]}
                onPress={() => {
                  setSimulationSpeed(2);
                  setShowLayersModal(false);
                }}
              >
                <Text style={[
                  styles.speedText,
                  simulationSpeed === 2 && styles.speedTextActive
                ]}>2x</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.speedOption,
                  simulationSpeed === 3 && styles.speedOptionActive
                ]}
                onPress={() => {
                  setSimulationSpeed(3);
                  setShowLayersModal(false);
                }}
              >
                <Text style={[
                  styles.speedText,
                  simulationSpeed === 3 && styles.speedTextActive
                ]}>3x</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // Render route options modal
  const renderRouteOptionsModal = () => (
    <Modal
      visible={showRouteOptions}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowRouteOptions(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Options d'itinéraire</Text>
            <TouchableOpacity onPress={() => setShowRouteOptions(false)} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.routeOptionItem,
              selectedRoute === 'fastest' && styles.routeOptionItemActive
            ]}
            onPress={() => handleRouteChange('fastest')}
          >
            <View style={styles.routeOptionInfo}>
              <Zap size={20} color="#FF4444" />
              <View style={styles.routeOptionDetails}>
                <Text style={styles.routeOptionTitle}>Le plus rapide</Text>
                <Text style={styles.routeOptionDescription}>15 min • 3.2 km</Text>
              </View>
            </View>
            {selectedRoute === 'fastest' && (
              <CheckCircle size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.routeOptionItem,
              selectedRoute === 'shortest' && styles.routeOptionItemActive
            ]}
            onPress={() => handleRouteChange('shortest')}
          >
            <View style={styles.routeOptionInfo}>
              <MapPin size={20} color="#2196F3" />
              <View style={styles.routeOptionDetails}>
                <Text style={styles.routeOptionTitle}>Le plus court</Text>
                <Text style={styles.routeOptionDescription}>18 min • 2.9 km</Text>
              </View>
            </View>
            {selectedRoute === 'shortest' && (
              <CheckCircle size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.routeOptionItem,
              selectedRoute === 'lowTraffic' && styles.routeOptionItemActive
            ]}
            onPress={() => handleRouteChange('lowTraffic')}
          >
            <View style={styles.routeOptionInfo}>
              <Car size={20} color="#FF9800" />
              <View style={styles.routeOptionDetails}>
                <Text style={styles.routeOptionTitle}>Moins de trafic</Text>
                <Text style={styles.routeOptionDescription}>19 min • 3.5 km</Text>
              </View>
            </View>
            {selectedRoute === 'lowTraffic' && (
              <CheckCircle size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Suivi en temps réel</Text>
          <Text style={styles.headerSubtitle}>{trackingData.mission.serviceName}</Text>
        </View>
        <TouchableOpacity 
          style={styles.timelineButton}
          onPress={() => setShowTimeline(!showTimeline)}
        >
          <Clock size={24} color="#FF4444" />
        </TouchableOpacity>
      </View>

      {/* Status Bar */}
      <LinearGradient
        colors={[statusInfo.color, statusInfo.color + 'CC']}
        style={styles.statusBar}
      >
        <View style={styles.statusContent}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>{statusInfo.label}</Text>
            <Text style={styles.statusDescription}>
              {trackingData.routeInfo.currentLeg === 'pickup' 
                ? `En route vers ${mockTrackingData.pickupLocation.name}`
                : 'En route vers votre adresse'
              }
            </Text>
            <Text style={styles.statusEta}>
              Arrivée estimée dans {formatTimeRemaining(trackingData.routeInfo.remainingDuration)}
            </Text>
          </View>
          <View style={styles.statusActions}>
            <TouchableOpacity style={styles.statusAction} onPress={handleCallFourmiz}>
              <Phone size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.statusAction} onPress={handleMessageFourmiz}>
              <MessageCircle size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Map */}
      <View style={styles.mapContainer}>
        {renderMapContent()}
        
        {/* Map controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={handleCenterOnFourmiz}
          >
            <Navigation size={24} color="#FF4444" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={() => setShowLayersModal(true)}
          >
            <Layers size={24} color="#333" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={() => setShowRouteOptions(true)}
          >
            <Search size={24} color="#333" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={handleMapTypeChange}
          >
            <Animated.View style={rotateStyle}>
              <Compass size={24} color="#333" />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Speed indicator */}
        <View style={styles.speedIndicator}>
          <VehicleIcon size={16} color="#FF4444" />
          <Text style={styles.speedText}>
            {trackingData.fourmizLocation.speed} km/h
            {simulationSpeed > 1 && ` • ${simulationSpeed}x`}
          </Text>
        </View>
        
        {/* Distance and Time Remaining */}
        <View style={styles.distanceIndicator}>
          <MapPin size={16} color="#2196F3" />
          <Text style={styles.distanceText}>
            {trackingData.routeInfo.remainingDistance.toFixed(1)} km
          </Text>
          <Clock size={16} color="#4CAF50" />
          <Text style={styles.timeText}>
            {formatTimeRemaining(trackingData.routeInfo.remainingDuration)}
          </Text>
        </View>
        
        {/* Current leg indicator */}
        <View style={styles.legIndicator}>
          <View style={styles.legProgress}>
            <View 
              style={[
                styles.legProgressFill, 
                { 
                  width: `${trackingData.routeInfo.currentLeg === 'pickup' 
                    ? 40
                    : trackingData.routeInfo.remainingDuration === 0 
                      ? 100 
                      : 70}%` 
                }
              ]} 
            />
          </View>
          <View style={styles.legLabels}>
            <View style={styles.legLabel}>
              <View style={[
                styles.legDot,
                trackingData.routeInfo.currentLeg !== 'pickup' && styles.legDotCompleted
              ]} />
              <Text style={styles.legText}>Récupération</Text>
            </View>
            
            <View style={styles.legLabel}>
              <View style={[
                styles.legDot,
                trackingData.routeInfo.remainingDuration === 0 && styles.legDotCompleted
              ]} />
              <Text style={styles.legText}>Livraison</Text>
            </View>
          </View>
        </View>
        
        {/* Traffic info */}
        {showTrafficLayer && (
          <View style={styles.trafficInfo}>
            <View style={styles.trafficHeader}>
              <Car size={14} color="#333" />
              <Text style={styles.trafficTitle}>Conditions de trafic</Text>
            </View>
            <View style={styles.trafficLevels}>
              <View style={styles.trafficLevel}>
                <View style={[styles.trafficIndicator, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.trafficText}>Fluide</Text>
              </View>
              <View style={styles.trafficLevel}>
                <View style={[styles.trafficIndicator, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.trafficText}>Modéré</Text>
              </View>
              <View style={styles.trafficLevel}>
                <View style={[styles.trafficIndicator, { backgroundColor: '#F44336' }]} />
                <Text style={styles.trafficText}>Dense</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* SOS Button */}
        <TouchableOpacity 
          style={styles.sosButton}
          onPress={() => Alert.alert(
            'Assistance d\'urgence',
            'Un agent d\'assistance va vous contacter immédiatement. Souhaitez-vous continuer ?',
            [
              { text: 'Annuler', style: 'cancel' },
              { 
                text: 'Assistance urgente', 
                style: 'destructive',
                onPress: () => Alert.alert('Assistance', 'Un agent va vous contacter sous peu.')
              }
            ]
          )}
        >
          <LifeBuoy size={20} color="#FFFFFF" />
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Timeline Panel */}
      {showTimeline && (
        <View style={styles.timelinePanel}>
          <View style={styles.timelinePanelHeader}>
            <Text style={styles.timelinePanelTitle}>Suivi de la mission</Text>
            <TouchableOpacity onPress={() => setShowTimeline(false)}>
              <Text style={styles.timelinePanelClose}>Fermer</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timelineList}>
            {trackingData.timeline.map(renderTimelineItem)}
          </View>
        </View>
      )}
      
      {/* Render modals */}
      {renderLayersModal()}
      {renderRouteOptionsModal()}

      {/* Fourmiz Info Card */}
      <View style={styles.fourmizCard}>
        <View style={styles.fourmizInfo}>
          <View style={styles.fourmizAvatar}>
            <Image 
              source={{ uri: trackingData.mission.fourmizAvatar }}
              style={styles.fourmizAvatarImage} 
            />
          </View>
          <View style={styles.fourmizDetails}>
            <Text style={styles.fourmizName}>{trackingData.mission.fourmizName}</Text>
            <View style={styles.fourmizMeta}>
              <Star size={14} color="#FFD700" fill="#FFD700" />
              <Text style={styles.fourmizRating}>4.8</Text>
              <Text style={styles.fourmizVehicle}>• {trackingData.mission.vehicleType}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.missionInfo}>
          <Text style={styles.missionAmount}>{trackingData.mission.totalAmount.toFixed(2)}€</Text>
          <Text style={styles.missionDuration}>~{trackingData.mission.estimatedDuration} min</Text>
        </View>
      </View>

      {/* Recent Messages */}
      {trackingData.messages.length > 0 && (
        <View style={styles.messagesCard}>
          <View style={styles.messagesHeader}>
            <Text style={styles.messagesTitle}>Messages récents</Text>
            <TouchableOpacity onPress={handleMessageFourmiz}>
              <Text style={styles.messagesViewAll}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          {trackingData.messages.slice(-2).map((message) => (
            <View key={message.id} style={styles.messageItem}>
              <Text style={styles.messageText}>{message.message}</Text>
              <Text style={styles.messageTime}>{message.time}</Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Security Badge */}
      <View style={styles.securityBadge}>
        <Shield size={14} color="#4CAF50" />
        <Text style={styles.securityText}>Trajet sécurisé</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginTop: 2,
  },
  timelineButton: {
    padding: 8,
  },
  statusBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 2,
  },
  statusEta: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    opacity: 0.95,
  },
  statusActions: {
    flexDirection: 'row',
    gap: 12,
  },
  statusAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e5e5e5',
    borderStyle: 'dashed',
    margin: 16,
    borderRadius: 12,
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
    marginBottom: 16,
  },
  markersSimulation: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  markerSim: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  markerText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  mapControls: {
    position: 'absolute',
    top: 80,
    right: 16,
    flexDirection: 'column',
    gap: 8,
  },
  mapControlButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  speedIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  speedText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  distanceIndicator: {
    position: 'absolute',
    top: 16,
    right: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  distanceText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2196F3',
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
  },
  legIndicator: {
    position: 'absolute',
    bottom: 200,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legProgress: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    marginBottom: 8,
  },
  legProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  legLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
  },
  legDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  legText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  trafficInfo: {
    position: 'absolute',
    left: 16,
    bottom: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trafficHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  trafficTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  trafficLevels: {
    flexDirection: 'row',
    gap: 10,
  },
  trafficLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trafficIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trafficText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  sosButton: {
    position: 'absolute',
    left: 16,
    bottom: 90,
    backgroundColor: '#F44336',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sosText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  timelinePanel: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: height * 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  timelinePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timelinePanelTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  timelinePanelClose: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FF4444',
  },
  timelineList: {
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconCompleted: {
    backgroundColor: '#E8F5E8',
  },
  timelineIconInProgress: {
    backgroundColor: '#FFF3E0',
  },
  timelineIconPending: {
    backgroundColor: '#F0F0F0',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E5E5',
    marginTop: 8,
    marginLeft: 15,
  },
  timelineLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#999',
  },
  fourmizMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  fourmizMarkerImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  storeMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  storeIcon: {
    fontSize: 20,
  },
  destinationMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  destinationIcon: {
    fontSize: 20,
  },
  calloutContainer: {
    padding: 8,
    width: 150,
  },
  calloutTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 4,
  },
  calloutAddress: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  calloutEta: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  calloutSpeed: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calloutSpeedText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  fourmizCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fourmizInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fourmizAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FF4444',
    marginRight: 12,
    overflow: 'hidden',
  },
  fourmizAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  fourmizDetails: {
    flex: 1,
  },
  fourmizName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  fourmizMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fourmizRating: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginLeft: 4,
  },
  fourmizVehicle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginLeft: 8,
  },
  missionInfo: {
    alignItems: 'flex-end',
  },
  missionAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
    marginBottom: 2,
  },
  missionDuration: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  messagesCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  messagesTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  messagesViewAll: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FF4444',
  },
  messageItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#333',
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#666',
    alignSelf: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FF4444',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  mapTypeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  mapTypeOption: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  mapTypeOptionActive: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  mapTypeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  mapTypeTextActive: {
    color: '#4CAF50',
  },
  layerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  layerOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  layerOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  speedOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  speedOption: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  speedOptionActive: {
    backgroundColor: '#FF444410',
    borderColor: '#FF4444',
  },
  speedText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  speedTextActive: {
    color: '#FF4444',
  },
  routeOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  routeOptionItemActive: {
    backgroundColor: '#E8F5E8',
  },
  routeOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeOptionDetails: {
    flex: 1,
  },
  routeOptionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  routeOptionDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  routeInfo: {
    marginTop: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
  },
  routeInfoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
    marginBottom: 8,
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  routeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
  },
  securityBadge: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  securityText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#4CAF50',
  },
});
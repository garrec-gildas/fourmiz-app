import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Star, Filter, Navigation, Phone, MessageCircle, Eye, Clock, Target, Users, Zap, Plus, Minus, Search, Compass, ArrowUp } from 'lucide-react-native';
import * as Location from 'expo-location';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

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
  const WebMock = require('../../web-mocks/react-native-maps');
  MapView = WebMock.default;
  Marker = WebMock.Marker;
  Circle = WebMock.Circle;
  Polyline = WebMock.Polyline;
  Callout = WebMock.Callout;
  PROVIDER_GOOGLE = WebMock.PROVIDER_GOOGLE;
  AnimatedRegion = WebMock.AnimatedRegion;
  
  // Import directions mock for web
  MapViewDirections = require('../../web-mocks/react-native-maps-directions').default;
}

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = 'AIzaSyD6V0xJcIoI1I-FHKZ_sXWEBTup1V8V1Ko'; // Replace with your actual API key

// Default region (Paris, France)
const DEFAULT_REGION = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Mock data for the Fourmiz providers
const mockFourmizData = [
  {
    id: '1',
    name: 'Marie Dubois',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    rating: 4.8,
    completedMissions: 127,
    specialties: ['Courses & Achats', 'Livraison'],
    location: {
      latitude: 48.8566,
      longitude: 2.3522,
    },
    distance: 0.8, // km
    isAvailable: true,
    responseTime: '< 5 min',
    priceRange: '8-15€',
    isVerified: true,
    languages: ['Français', 'Anglais'],
    workingHours: '9h-18h',
    vehicleType: 'Vélo',
    isMoving: true,
    heading: 45, // degrees
    speed: 12, // km/h
  },
  {
    id: '2',
    name: 'Thomas Martin',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    rating: 4.9,
    completedMissions: 89,
    specialties: ['Bricolage & Nettoyage', 'Montage'],
    location: {
      latitude: 48.8606,
      longitude: 2.3376,
    },
    distance: 1.2,
    isAvailable: true,
    responseTime: '< 10 min',
    priceRange: '15-35€',
    isVerified: true,
    languages: ['Français'],
    workingHours: '8h-20h',
    vehicleType: 'Voiture',
    isMoving: true,
    heading: 280, // degrees
    speed: 28, // km/h
  },
  {
    id: '3',
    name: 'Sophie Laurent',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    rating: 4.7,
    completedMissions: 156,
    specialties: ['Aide à la Personne', 'Baby-sitting'],
    location: {
      latitude: 48.8534,
      longitude: 2.3488,
    },
    distance: 2.1,
    isAvailable: true,
    responseTime: '< 15 min',
    priceRange: '12-25€',
    isVerified: true,
    languages: ['Français', 'Espagnol'],
    workingHours: '10h-19h',
    vehicleType: 'Transports en commun',
    isMoving: false,
    heading: 0, // degrees
    speed: 0, // km/h
  },
];

// Mock service zones with dynamic pricing
const mockServiceZones = [
  {
    id: 'zone1',
    name: 'Centre-ville',
    center: {
      latitude: 48.8566,
      longitude: 2.3522,
    },
    radius: 3000, // meters
    color: 'rgba(76, 175, 80, 0.2)', // green
    strokeColor: '#4CAF50',
    pricing: 'Normal',
    isHighDemand: false,
  },
  {
    id: 'zone2',
    name: 'Quartier Ouest',
    center: {
      latitude: 48.8566,
      longitude: 2.3122,
    },
    radius: 2000, // meters
    color: 'rgba(255, 152, 0, 0.2)', // orange
    strokeColor: '#FF9800',
    pricing: '+10%',
    isHighDemand: true,
  },
  {
    id: 'zone3',
    name: 'Quartier Nord',
    center: {
      latitude: 48.8766,
      longitude: 2.3522,
    },
    radius: 2500, // meters
    color: 'rgba(33, 150, 243, 0.2)', // blue
    strokeColor: '#2196F3',
    pricing: 'Normal',
    isHighDemand: false,
  }
];

// Mock points of interest
const mockPointsOfInterest = [
  {
    id: 'poi1',
    name: 'Tour Eiffel',
    type: 'attraction',
    location: {
      latitude: 48.8584,
      longitude: 2.2945,
    },
    icon: '🗼',
  },
  {
    id: 'poi2',
    name: 'Notre-Dame',
    type: 'attraction',
    location: {
      latitude: 48.8530,
      longitude: 2.3499,
    },
    icon: '⛪',
  },
  {
    id: 'poi3',
    name: 'Louvre',
    type: 'museum',
    location: {
      latitude: 48.8606,
      longitude: 2.3376,
    },
    icon: '🏛️',
  },
  {
    id: 'poi4',
    name: 'Gare du Nord',
    type: 'transport',
    location: {
      latitude: 48.8809,
      longitude: 2.3553,
    },
    icon: '🚆',
  },
  {
    id: 'poi5',
    name: 'Festival de Musique',
    type: 'event',
    location: {
      latitude: 48.8720,
      longitude: 2.3330,
    },
    icon: '🎵',
    temporaryEvent: true,
    eventDate: '2024-12-25',
  },
];

// Sample routes for demonstration
const mockRoutes = {
  main: {
    origin: {
      latitude: 48.8584,
      longitude: 2.2945,
    },
    destination: {
      latitude: 48.8606,
      longitude: 2.3376,
    },
    waypoints: [
      {
        latitude: 48.8634,
        longitude: 2.3343,
      }
    ],
    mode: 'DRIVING',
    distance: 5.2, // km
    duration: 18, // minutes
    trafficLevel: 'moderate',
  },
  alternative1: {
    origin: {
      latitude: 48.8584,
      longitude: 2.2945,
    },
    destination: {
      latitude: 48.8606,
      longitude: 2.3376,
    },
    waypoints: [],
    mode: 'DRIVING',
    distance: 5.8, // km
    duration: 22, // minutes
    trafficLevel: 'low',
  },
  alternative2: {
    origin: {
      latitude: 48.8584,
      longitude: 2.2945,
    },
    destination: {
      latitude: 48.8606,
      longitude: 2.3376,
    },
    waypoints: [],
    mode: 'TRANSIT',
    distance: 6.1, // km
    duration: 25, // minutes
    trafficLevel: 'none',
  }
};

export default function FourmizMapScreen() {
  const { serviceType, category } = useLocalSearchParams();
  const [userLocation, setUserLocation] = useState<any>(null);
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [selectedFourmiz, setSelectedFourmiz] = useState<any>(null);
  const [fourmizLocations, setFourmizLocations] = useState(mockFourmizData);
  const [showFilters, setShowFilters] = useState(false);
  const [showServiceZones, setShowServiceZones] = useState(true);
  const [showPointsOfInterest, setShowPointsOfInterest] = useState(true);
  const [showRoutes, setShowRoutes] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState('main');
  const [mapType, setMapType] = useState('standard');
  const [zoomLevel, setZoomLevel] = useState(15);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [filters, setFilters] = useState({
    maxDistance: 5, // km
    minRating: 4.0,
    availableOnly: true,
    hasVehicle: false,
    isVerified: false,
    maxResponseTime: 30, // minutes
  });
  
  const mapRef = useRef<any>(null);
  
  // Shared values for animations
  const pulseValue = useSharedValue(1);
  const rotateValue = useSharedValue(0);

  // Animated styles
  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseValue.value }],
    };
  });

  useEffect(() => {
    // Pulse animation for moving Fourmiz
    pulseValue.value = withRepeat(
      withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    
    // Rotation animation (for compass)
    rotateValue.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );
    
    // Only attempt geolocation on mobile platforms
    if (Platform.OS !== 'web') {
      getCurrentLocation();
    } else {
      // For web, just set a default location (Paris)
      setUserLocation({
        latitude: 48.8566,
        longitude: 2.3522,
      });
      
      // Update map region too
      setMapRegion({
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
    
    // Start the Fourmiz movement simulation
    const interval = setInterval(() => {
      if (Platform.OS !== 'web') { // Only simulate movement on native
        updateFourmizLocations();
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'L\'accès à la localisation est nécessaire pour afficher les Fourmiz près de vous.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setUserLocation(newLocation);
      
      // Update map region
      setMapRegion({
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Erreur de géolocalisation:', error);
      // Set default location (Paris) in case of error
      setUserLocation({
        latitude: 48.8566,
        longitude: 2.3522,
      });
      
      // Update map region too
      setMapRegion({
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  };
  
  // Simulate Fourmiz movement (for demo purposes)
  const updateFourmizLocations = () => {
    setFourmizLocations(prevLocations => 
      prevLocations.map(fourmiz => {
        // Only update moving Fourmiz
        if (!fourmiz.isMoving) return fourmiz;
        
        const movementFactor = fourmiz.speed / 3600; // convert km/h to km/s, then multiply by update interval
        
        // Calculate new position based on heading and speed
        const deltaLat = movementFactor * Math.cos(fourmiz.heading * Math.PI / 180) * 0.009;
        const deltaLng = movementFactor * Math.sin(fourmiz.heading * Math.PI / 180) * 0.009;
        
        // Update location
        return {
          ...fourmiz,
          location: {
            latitude: fourmiz.location.latitude + deltaLat,
            longitude: fourmiz.location.longitude + deltaLng,
          },
          // Randomly change heading sometimes
          heading: Math.random() > 0.8 ? 
            (fourmiz.heading + (Math.random() > 0.5 ? 30 : -30)) % 360 :
            fourmiz.heading
        };
      })
    );
  };

  const filteredFourmiz = fourmizLocations.filter(fourmiz => {
    if (filters.availableOnly && !fourmiz.isAvailable) return false;
    if (fourmiz.distance > filters.maxDistance) return false;
    if (fourmiz.rating < filters.minRating) return false;
    if (filters.isVerified && !fourmiz.isVerified) return false;
    
    // Filter by specialty if a service is specified
    if (serviceType && !fourmiz.specialties.some(specialty => 
      specialty.toLowerCase().includes(serviceType.toString().toLowerCase())
    )) return false;
    
    return true;
  });

  const handleFourmizSelect = (fourmiz: any) => {
    setSelectedFourmiz(fourmiz);
    
    // If on native, animate to the selected Fourmiz
    if (mapRef.current && Platform.OS !== 'web') {
      mapRef.current.animateToRegion({
        latitude: fourmiz.location.latitude,
        longitude: fourmiz.location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
    
    // Show a route to this Fourmiz
    setShowRoutes(true);
  };

  const handleContactFourmiz = (fourmiz: any, method: 'call' | 'message') => {
    if (method === 'call') {
      Alert.alert(
        'Appeler',
        `Voulez-vous appeler ${fourmiz.name} ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Appeler', onPress: () => console.log(`Calling ${fourmiz.name}`) }
        ]
      );
    } else {
      router.push(`/chat/${fourmiz.id}`);
    }
  };

  const handleBookFourmiz = (fourmiz: any) => {
    Alert.alert(
      'Réserver',
      `Voulez-vous réserver ${fourmiz.name} pour votre service ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Réserver', 
          onPress: () => {
            Alert.alert('Réservation', 'Demande de réservation envoyée !');
            router.push('/(tabs)/orders');
          }
        }
      ]
    );
  };

  const handleMyLocationPress = () => {
    if (Platform.OS === 'web') {
      // For web, just show a message
      Alert.alert(
        'Localisation',
        'La géolocalisation est disponible sur l\'application mobile.',
        [{ text: 'OK' }]
      );
    } else {
      getCurrentLocation();
      
      // Animate to user location if available
      if (userLocation && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    }
  };
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 1, 20));
    
    if (mapRef.current && Platform.OS !== 'web') {
      const region = {
        ...mapRegion,
        latitudeDelta: mapRegion.latitudeDelta / 2,
        longitudeDelta: mapRegion.longitudeDelta / 2,
      };
      mapRef.current.animateToRegion(region, 300);
      setMapRegion(region);
    }
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 1, 5));
    
    if (mapRef.current && Platform.OS !== 'web') {
      const region = {
        ...mapRegion,
        latitudeDelta: mapRegion.latitudeDelta * 2,
        longitudeDelta: mapRegion.longitudeDelta * 2,
      };
      mapRef.current.animateToRegion(region, 300);
      setMapRegion(region);
    }
  };
  
  const handleMapTypeChange = () => {
    setMapType(prev => prev === 'standard' ? 'satellite' : 'standard');
  };
  
  const handleToggleServiceZones = () => {
    setShowServiceZones(prev => !prev);
  };
  
  const handleTogglePointsOfInterest = () => {
    setShowPointsOfInterest(prev => !prev);
  };
  
  const handleRouteChange = (route: string) => {
    setSelectedRoute(route);
  };
  
  const handleDirectionsReady = (result: any) => {
    setRouteInfo(result);
  };

  const renderFourmizCard = () => {
    if (!selectedFourmiz) return null;

    return (
      <View style={styles.fourmizCard}>
        <View style={styles.fourmizHeader}>
          <Image source={{ uri: selectedFourmiz.avatar }} style={styles.fourmizAvatar} />
          <View style={styles.fourmizInfo}>
            <View style={styles.fourmizNameRow}>
              <Text style={styles.fourmizName}>{selectedFourmiz.name}</Text>
              {selectedFourmiz.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Target size={12} color="#4CAF50" />
                </View>
              )}
            </View>
            <View style={styles.fourmizRating}>
              <Star size={14} color="#FFD700" fill="#FFD700" />
              <Text style={styles.fourmizRatingText}>{selectedFourmiz.rating}</Text>
              <Text style={styles.fourmizMissions}>({selectedFourmiz.completedMissions} missions)</Text>
            </View>
            <View style={styles.fourmizDistance}>
              <MapPin size={12} color="#666" />
              <Text style={styles.fourmizDistanceText}>{selectedFourmiz.distance} km</Text>
              <Clock size={12} color="#666" />
              <Text style={styles.fourmizResponseTime}>{selectedFourmiz.responseTime}</Text>
            </View>
          </View>
          <View style={[
            styles.availabilityIndicator,
            selectedFourmiz.isAvailable ? styles.availabilityAvailable : styles.availabilityBusy
          ]}>
            <Text style={styles.availabilityText}>
              {selectedFourmiz.isAvailable ? 'Disponible' : 'Occupé'}
            </Text>
          </View>
        </View>

        <View style={styles.fourmizDetails}>
          <View style={styles.fourmizSpecialties}>
            <Text style={styles.fourmizSpecialtiesTitle}>Spécialités :</Text>
            <View style={styles.specialtyTags}>
              {selectedFourmiz.specialties.map((specialty: string, index: number) => (
                <View key={index} style={styles.specialtyTag}>
                  <Text style={styles.specialtyTagText}>{specialty}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.fourmizMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Prix :</Text>
              <Text style={styles.metaValue}>{selectedFourmiz.priceRange}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Transport :</Text>
              <Text style={styles.metaValue}>{selectedFourmiz.vehicleType}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Horaires :</Text>
              <Text style={styles.metaValue}>{selectedFourmiz.workingHours}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Langues :</Text>
              <Text style={styles.metaValue}>{selectedFourmiz.languages.join(', ')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.fourmizActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push(`/fourmiz-profile/${selectedFourmiz.id}`)}
          >
            <Eye size={18} color="#666" />
            <Text style={styles.actionButtonText}>Profil</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleContactFourmiz(selectedFourmiz, 'call')}
          >
            <Phone size={18} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Appeler</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleContactFourmiz(selectedFourmiz, 'message')}
          >
            <MessageCircle size={18} color="#2196F3" />
            <Text style={styles.actionButtonText}>Message</Text>
          </TouchableOpacity>
          
          {selectedFourmiz.isAvailable && (
            <TouchableOpacity 
              style={styles.bookButton}
              onPress={() => handleBookFourmiz(selectedFourmiz)}
            >
              <Text style={styles.bookButtonText}>Réserver</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Route information */}
        {routeInfo && (
          <View style={styles.routeInfo}>
            <Text style={styles.routeInfoTitle}>Itinéraire</Text>
            <View style={styles.routeDetails}>
              <View style={styles.routeDetail}>
                <Clock size={14} color="#666" />
                <Text style={styles.routeDetailText}>
                  {routeInfo.duration.toFixed(0)} min
                </Text>
              </View>
              <View style={styles.routeDetail}>
                <MapPin size={14} color="#666" />
                <Text style={styles.routeDetailText}>
                  {routeInfo.distance.toFixed(1)} km
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };
  
  // Map is not available on web except as a placeholder
  const renderMap = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapText}>🗺️ Carte Interactive</Text>
          <Text style={styles.mapSubtext}>
            Localisation: {userLocation ? `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : 'Chargement...'}
          </Text>
          <Text style={styles.webNote}>Fonctionnalité complète disponible sur mobile</Text>
          
          {/* Simulation des marqueurs */}
          <View style={styles.markersSimulation}>
            <View style={styles.markerSim}>
              <Text style={styles.markerText}>📍 Vous</Text>
            </View>
            {selectedFourmiz && (
              <View style={styles.markerSim}>
                <Text style={styles.markerText}>🚗 {selectedFourmiz.name}</Text>
              </View>
            )}
            {showServiceZones && (
              <View style={styles.markerSim}>
                <Text style={styles.markerText}>🔵 Zones de service</Text>
              </View>
            )}
            {showPointsOfInterest && (
              <View style={styles.markerSim}>
                <Text style={styles.markerText}>⭐ Points d'intérêt</Text>
              </View>
            )}
          </View>
        </View>
      );
    }
    
    // For native platforms, render the actual map
    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={true}
        mapType={mapType}
      >
        {/* Service zones */}
        {showServiceZones && mockServiceZones.map(zone => (
          <Circle
            key={zone.id}
            center={zone.center}
            radius={zone.radius}
            fillColor={zone.color}
            strokeColor={zone.strokeColor}
            strokeWidth={2}
          />
        ))}
        
        {/* Points of interest */}
        {showPointsOfInterest && mockPointsOfInterest.map(poi => (
          <Marker
            key={poi.id}
            coordinate={poi.location}
            title={poi.name}
            description={poi.type}
          >
            <View style={styles.poiMarker}>
              <Text style={styles.poiIcon}>{poi.icon}</Text>
              {poi.temporaryEvent && (
                <View style={styles.eventBadge}>
                  <Text style={styles.eventBadgeText}>Événement</Text>
                </View>
              )}
            </View>
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{poi.name}</Text>
                <Text style={styles.calloutSubtitle}>
                  {poi.type.charAt(0).toUpperCase() + poi.type.slice(1)}
                </Text>
                {poi.temporaryEvent && (
                  <Text style={styles.calloutEvent}>
                    Événement le {new Date(poi.eventDate).toLocaleDateString('fr-FR')}
                  </Text>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
        
        {/* Fourmiz markers */}
        {filteredFourmiz.map(fourmiz => (
          <Marker
            key={fourmiz.id}
            coordinate={fourmiz.location}
            title={fourmiz.name}
            description={fourmiz.vehicleType}
            onPress={() => handleFourmizSelect(fourmiz)}
            rotation={fourmiz.isMoving ? fourmiz.heading : 0}
          >
            <Animated.View style={[styles.fourmizMarker, fourmiz.isMoving && pulseStyle]}>
              <Image
                source={{ uri: fourmiz.avatar }}
                style={styles.fourmizMarkerImage}
              />
              <View style={[
                styles.fourmizMarkerStatus,
                fourmiz.isAvailable ? styles.statusAvailable : styles.statusBusy
              ]} />
            </Animated.View>
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{fourmiz.name}</Text>
                <View style={styles.calloutRating}>
                  <Star size={12} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.calloutRatingText}>{fourmiz.rating}</Text>
                </View>
                <Text style={styles.calloutSubtitle}>{fourmiz.vehicleType}</Text>
                <View style={styles.calloutSpecialties}>
                  {fourmiz.specialties.map((specialty, index) => (
                    <Text key={index} style={styles.calloutSpecialty}>• {specialty}</Text>
                  ))}
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
        
        {/* Routes */}
        {showRoutes && selectedFourmiz && userLocation && (
          <MapViewDirections
            origin={userLocation}
            destination={selectedFourmiz.location}
            waypoints={mockRoutes[selectedRoute as keyof typeof mockRoutes].waypoints}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor="#FF4444"
            mode={mockRoutes[selectedRoute as keyof typeof mockRoutes].mode}
            onReady={handleDirectionsReady}
          />
        )}
      </MapView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Fourmiz près de vous</Text>
          <Text style={styles.headerSubtitle}>
            {filteredFourmiz.length} Fourmiz disponible{filteredFourmiz.length > 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={24} color="#FF4444" />
        </TouchableOpacity>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {/* Render map differently based on platform */}
        {renderMap()}

        {/* Quick stats overlay */}
        <View style={styles.statsOverlay}>
          <View style={styles.statItem}>
            <Users size={16} color="#4CAF50" />
            <Text style={styles.statText}>{filteredFourmiz.filter(f => f.isAvailable).length} disponibles</Text>
          </View>
          <View style={styles.statItem}>
            <Zap size={16} color="#FF9800" />
            <Text style={styles.statText}>{filteredFourmiz.filter(f => f.responseTime.includes('< 5')).length} rapides</Text>
          </View>
          <View style={styles.statItem}>
            <Target size={16} color="#2196F3" />
            <Text style={styles.statText}>{filteredFourmiz.filter(f => f.isVerified).length} vérifiées</Text>
          </View>
        </View>
        
        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={handleMyLocationPress}
          >
            <Navigation size={24} color="#FF4444" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={handleZoomIn}
          >
            <Plus size={24} color="#333" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={handleZoomOut}
          >
            <Minus size={24} color="#333" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={handleMapTypeChange}
          >
            <Compass size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        {/* Layer Controls */}
        <View style={styles.layerControls}>
          <TouchableOpacity 
            style={[
              styles.layerButton,
              showServiceZones && styles.layerButtonActive
            ]}
            onPress={handleToggleServiceZones}
          >
            <Text style={[
              styles.layerButtonText,
              showServiceZones && styles.layerButtonTextActive
            ]}>
              Zones
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.layerButton,
              showPointsOfInterest && styles.layerButtonActive
            ]}
            onPress={handleTogglePointsOfInterest}
          >
            <Text style={[
              styles.layerButtonText,
              showPointsOfInterest && styles.layerButtonTextActive
            ]}>
              Points d'intérêt
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Route selector */}
        {showRoutes && (
          <View style={styles.routeSelector}>
            <TouchableOpacity 
              style={[
                styles.routeOption,
                selectedRoute === 'main' && styles.routeOptionSelected
              ]}
              onPress={() => handleRouteChange('main')}
            >
              <Text style={[
                styles.routeOptionText,
                selectedRoute === 'main' && styles.routeOptionTextSelected
              ]}>
                Route principale • {mockRoutes.main.duration} min
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.routeOption,
                selectedRoute === 'alternative1' && styles.routeOptionSelected
              ]}
              onPress={() => handleRouteChange('alternative1')}
            >
              <Text style={[
                styles.routeOptionText,
                selectedRoute === 'alternative1' && styles.routeOptionTextSelected
              ]}>
                Alternative 1 • {mockRoutes.alternative1.duration} min
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.routeOption,
                selectedRoute === 'alternative2' && styles.routeOptionSelected
              ]}
              onPress={() => handleRouteChange('alternative2')}
            >
              <Text style={[
                styles.routeOptionText,
                selectedRoute === 'alternative2' && styles.routeOptionTextSelected
              ]}>
                Transport • {mockRoutes.alternative2.duration} min
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Selected Fourmiz Card */}
      {selectedFourmiz && (
        <View style={styles.cardContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardScroll}
          >
            {renderFourmizCard()}
          </ScrollView>
        </View>
      )}

      {/* Fourmiz List (when no selection) */}
      {!selectedFourmiz && (
        <View style={styles.listContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fourmizList}
          >
            {filteredFourmiz.map((fourmiz) => (
              <TouchableOpacity
                key={fourmiz.id}
                style={styles.fourmizListItem}
                onPress={() => handleFourmizSelect(fourmiz)}
              >
                <Image source={{ uri: fourmiz.avatar }} style={styles.listItemAvatar} />
                <Text style={styles.listItemName}>{fourmiz.name}</Text>
                <View style={styles.listItemRating}>
                  <Star size={12} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.listItemRatingText}>{fourmiz.rating}</Text>
                </View>
                <Text style={styles.listItemDistance}>{fourmiz.distance} km</Text>
                <View style={[
                  styles.listItemStatus,
                  fourmiz.isAvailable ? styles.listItemStatusAvailable : styles.listItemStatusBusy
                ]}>
                  <Text style={styles.listItemStatusText}>
                    {fourmiz.isAvailable ? 'Dispo' : 'Occupé'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Zone Legend */}
      {showServiceZones && (
        <View style={styles.zoneLegend}>
          <Text style={styles.zoneLegendTitle}>Zones de tarification</Text>
          {mockServiceZones.map(zone => (
            <View key={zone.id} style={styles.zoneLegendItem}>
              <View 
                style={[
                  styles.zoneLegendColor,
                  { backgroundColor: zone.strokeColor }
                ]} 
              />
              <Text style={styles.zoneLegendText}>{zone.name}</Text>
              <Text style={[
                styles.zoneLegendPrice,
                zone.isHighDemand && styles.zoneLegendHighDemand
              ]}>
                {zone.pricing} {zone.isHighDemand && '(forte demande)'}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  filterButton: {
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
  },
  markersSimulation: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 20,
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
  statsOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#333',
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
  layerControls: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  layerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  layerButtonActive: {
    backgroundColor: '#FF4444',
  },
  layerButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  layerButtonTextActive: {
    color: '#FFFFFF',
  },
  routeSelector: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'column',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  routeOptionSelected: {
    backgroundColor: '#FF444410',
    borderColor: '#FF4444',
  },
  routeOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  routeOptionTextSelected: {
    color: '#FF4444',
  },
  zoneLegend: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 200,
  },
  zoneLegendTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 8,
  },
  zoneLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  zoneLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  zoneLegendText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#333',
    flex: 1,
  },
  zoneLegendPrice: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  zoneLegendHighDemand: {
    color: '#FF4444',
  },
  fourmizMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fourmizMarkerImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  fourmizMarkerStatus: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusAvailable: {
    backgroundColor: '#4CAF50',
  },
  statusBusy: {
    backgroundColor: '#FF9800',
  },
  poiMarker: {
    alignItems: 'center',
  },
  poiIcon: {
    fontSize: 24,
  },
  eventBadge: {
    position: 'absolute',
    top: -10,
    right: -15,
    backgroundColor: '#E91E63',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  eventBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'Inter-Bold',
  },
  calloutContainer: {
    width: 150,
    padding: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 4,
  },
  calloutSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 4,
  },
  calloutRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  calloutRatingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  calloutEvent: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#E91E63',
    marginTop: 4,
  },
  calloutSpecialties: {
    marginTop: 4,
  },
  calloutSpecialty: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  cardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardScroll: {
    padding: 20,
  },
  fourmizCard: {
    width: width - 40,
  },
  fourmizHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  fourmizAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  fourmizInfo: {
    flex: 1,
  },
  fourmizNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fourmizName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginRight: 8,
  },
  verifiedBadge: {
    backgroundColor: '#E8F5E8',
    borderRadius: 10,
    padding: 2,
  },
  fourmizRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fourmizRatingText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginLeft: 4,
    marginRight: 8,
  },
  fourmizMissions: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  fourmizDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fourmizDistanceText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginRight: 8,
  },
  fourmizResponseTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  availabilityIndicator: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availabilityAvailable: {
    backgroundColor: '#E8F5E8',
  },
  availabilityBusy: {
    backgroundColor: '#FFF3E0',
  },
  availabilityText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
  },
  fourmizDetails: {
    marginBottom: 16,
  },
  fourmizSpecialties: {
    marginBottom: 12,
  },
  fourmizSpecialtiesTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  specialtyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specialtyTag: {
    backgroundColor: '#FF444410',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  specialtyTagText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#FF4444',
  },
  fourmizMeta: {
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  metaValue: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  fourmizActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  routeInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
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
  listContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  fourmizList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  fourmizListItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: 100,
  },
  listItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  listItemName: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  listItemRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  listItemRatingText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  listItemDistance: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 6,
  },
  listItemStatus: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  listItemStatusAvailable: {
    backgroundColor: '#E8F5E8',
  },
  listItemStatusBusy: {
    backgroundColor: '#FFF3E0',
  },
  listItemStatusText: {
    fontSize: 9,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
  },
});
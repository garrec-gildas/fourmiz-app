// app/(tabs)/criteria.tsx - VERSION COMPLÈTE AVEC BOUTON MODIFIER SIMPLE
// 🔧 Ajout minimal d'un mode lecture/édition sans surcharge visuelle

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  ActivityIndicator, 
  Alert,
  RefreshControl,
  SafeAreaView,
  Image,
  TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRoleManagerAdapter } from '@/hooks/useRoleManagerAdapter';
import { supabase } from '@/lib/supabase';
   
// Interface pour les catégories - DYNAMIQUES DEPUIS SUPABASE
interface ServiceCategory {
  key: string;
  categorie: string;
  icon: string;
  count: number;
}

// Interface pour les véhicules - DYNAMIQUES DEPUIS SUPABASE
interface VehicleType {
  type: string;
  label: string;
  icon: string;
  needsLicense: boolean;
}

// Interface pour les disponibilités détaillées
interface DayAvailability {
  enabled: boolean;
  start: string;
  end: string;
}

interface AvailabilitySchedule {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

// Structure complète avec tous les critères MISE À JOUR
interface CriteriaData {
  id?: number;
  user_id: string;
  service_types: Record<string, boolean>;
  
  // 🔧 ÉQUIPEMENTS SPÉCIALISÉS
  specialized_equipment?: string;
  
  // 📍 NOUVEAUX CHAMPS
  accepts_geolocation?: boolean;
  presentation?: string;
  
  // Tarifs
  min_price: number;
  max_distance: number;
  
  // Transport
  vehicle_types: string[];
  has_driving_license: boolean;
  has_vehicle_insurance: boolean;
  max_travel_distance: number;
  travel_cost_included: boolean;
  
  // Environnement de travail
  work_indoor: boolean;
  work_outdoor: boolean;
  
  // 🔧 CONDITIONS DE TRAVAIL
  accepts_team_work?: boolean;
  uniform_required?: boolean;
  safety_shoes_required?: boolean;
  additional_product_billing?: boolean;
  quote_required?: boolean;
  
  // Équipements
  equipment_provided: string[];
  
  // Clientèle et préférences
  accepts_pets: boolean;
  accepts_children: boolean;
  preferred_client_presence: 'present' | 'absent' | 'no_preference';
  
  // Services spéciaux
  urgent_services: boolean;
  accepts_custom_requests?: boolean;
  
  // 📍 DISPONIBILITÉS
  min_mission_duration?: number;
  max_mission_duration?: number;
  min_booking_notice?: number;
  
  // Disponibilités
  availability_schedule: AvailabilitySchedule;
  
  // Qualité
  client_rating: number;
  min_fourmiz_rating: number;
  
  // 📋 EXPÉRIENCE
  years_experience?: string;
  certifications?: string;
  specialties?: string;
  spoken_languages?: string[];
  
  // 🛡️ SÉCURITÉ
  has_liability_insurance?: boolean;
  references_verified?: boolean;
  identity_verified?: boolean;
  
  // 📞 COMMUNICATION
  communication_language?: string;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

export default function CriteriaScreen() {
  // 🔨 HOOKS
  const router = useRouter();
  const { force, first_time } = useLocalSearchParams();
  const isForced = force === 'true';
  const isFirstTime = first_time === 'true';
  
  const roleManager = useRoleManagerAdapter();
  const { userProfile, currentRole, isInitialized } = roleManager || {};

  // États principaux
  const [criteria, setCriteria] = useState<CriteriaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔒 NOUVEL ÉTAT SIMPLE : MODE ÉDITION
  const [isEditing, setIsEditing] = useState(isForced); // Forcé = toujours éditable

  // 🔨 MODE COUTEAU SUISSE - ÉTAT MANUEL SÉPARÉ DE LA DÉTECTION AUTO
  const [swissKnifeMode, setSwissKnifeMode] = useState(false);

  // 📋 ÉTATS DYNAMIQUES DEPUIS SUPABASE
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<VehicleType[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  // 🌍 LANGUES DISPONIBLES
  const [availableLanguages] = useState([
    'Français (France)', 'Anglais (UK/US)', 'Espagnol (Espagne)', 
    'Allemand (Allemagne)', 'Italien (Italie)', 'Portugais (Portugal/Brésil)',
    'Arabe', 'Chinois', 'Japonais', 'Russe', 'Néerlandais (Pays-Bas)',
    'Polonais (Pologne)', 'Turc (Turquie)', 'Hindi (Inde)', 'Coréen (Corée)'
  ]);

  // 📅 JOURS DE LA SEMAINE
  const weekDays = [
    { key: 'monday', label: 'Lundi', shortLabel: 'Lun' },
    { key: 'tuesday', label: 'Mardi', shortLabel: 'Mar' },
    { key: 'wednesday', label: 'Mercredi', shortLabel: 'Mer' },
    { key: 'thursday', label: 'Jeudi', shortLabel: 'Jeu' },
    { key: 'friday', label: 'Vendredi', shortLabel: 'Ven' },
    { key: 'saturday', label: 'Samedi', shortLabel: 'Sam' },
    { key: 'sunday', label: 'Dimanche', shortLabel: 'Dim' },
  ] as const;

  // ⏰ HEURES (00:00 à 24:00)
  const generateHours = () => {
    const hours = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour = h.toString().padStart(2, '0');
        const minute = m.toString().padStart(2, '0');
        hours.push(`${hour}:${minute}`);
      }
    }
    hours.push('24:00');
    return hours;
  };
  const availableHours = generateHours();

  // 🔙 GESTION DU RETOUR EN MODE FORCÉ
  const handleBackPress = () => {
    if (isForced && isFirstTime) {
      Alert.alert(
        'Retour au profil',
        'Vous pouvez revenir modifier votre profil, mais vous devrez configurer vos critères pour accéder à toutes les fonctionnalités.',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Retour au profil', 
            onPress: () => router.push('/(tabs)/profile')
          }
        ]
      );
    } else if (isForced) {
      Alert.alert(
        'Sortir de la configuration',
        'Vos critères ne seront pas sauvegardés et vous n\'aurez pas accès à toutes les fonctionnalités.',
        [
          { text: 'Continuer la configuration', style: 'cancel' },
          { 
            text: 'Sortir quand même', 
            style: 'destructive',
            onPress: () => router.replace('/(tabs)/profile')
          }
        ]
      );
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  // 🎨 HEADER AVEC BOUTON RETOUR + BOUTON MODIFIER SIMPLE
  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {isForced ? 'Configuration des critères' : 'Mes critères de service'}
          </Text>
          {isForced && (
            <Text style={styles.headerSubtitle}>
              {isFirstTime ? 'Étape finale pour activer votre profil Fourmiz' : 'Requise pour accéder à l\'application'}
            </Text>
          )}
        </View>
        
        {/* 🔒 BOUTON MODIFIER SIMPLE (uniquement en mode normal) */}
        {!isForced && (
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => {
              if (isEditing) {
                // Sauvegarder et sortir du mode édition
                saveCriteria();
              } else {
                // Entrer en mode édition
                setIsEditing(true);
              }
            }}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.editButtonText}>
                {isEditing ? 'Valider' : 'Modifier'}
              </Text>
            )}
          </TouchableOpacity>
        )}
        
        {isFirstTime && (
          <View style={styles.progressIndicator}>
            <Text style={styles.progressText}>3/3</Text>
          </View>
        )}
      </View>
    );
  };

  // 📋 CHARGER LES CATÉGORIES DEPUIS LA TABLE SERVICES - HOOKÉES À SUPABASE
  useEffect(() => {
    loadServiceCategories();
    loadVehicleTypes();
  }, []);

  const loadServiceCategories = async () => {
    try {
      setCategoriesLoading(true);
      console.log('📋 Chargement des catégories depuis table services...');

      // 🔧 RÉCUPÉRATION DIRECTE DEPUIS SUPABASE TABLE SERVICES AVEC DEBUG DÉTAILLÉ
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('categorie')
        .not('categorie', 'is', null);

      console.log('📊 RÉSULTAT BRUT SUPABASE:', {
        error: servicesError,
        data_length: servicesData?.length,
        first_10_items: servicesData?.slice(0, 10)
      });

      if (servicesError) {
        console.error('❌ Erreur Supabase détaillée:', servicesError);
        throw servicesError;
      }

      if (!servicesData || servicesData.length === 0) {
        console.error('❌ Aucune donnée récupérée depuis Supabase');
        throw new Error('Aucune donnée services récupérée');
      }

      // Extraire les catégories uniques et créer le mapping AVEC NETTOYAGE
      const uniqueCategories = new Set<string>();
      const categoryCount = new Map<string, number>();

      servicesData.forEach(service => {
        if (service.categorie && service.categorie.trim() !== '') {
          // 🧹 NETTOYAGE PRÉALABLE avant ajout
          const cleanedCategory = service.categorie.trim();
          uniqueCategories.add(cleanedCategory);
          categoryCount.set(cleanedCategory, (categoryCount.get(cleanedCategory) || 0) + 1);
        }
      });

      console.log('📊 ANALYSE CATÉGORIES DÉTAILLÉE:', {
        total_brut: servicesData.length,
        categories_uniques: uniqueCategories.size,
        categories_list: Array.from(uniqueCategories).sort(),
        count_map: Object.fromEntries(categoryCount)
      });

      // Créer les catégories finales avec validation des clés
      const categories: ServiceCategory[] = Array.from(uniqueCategories)
        .map(categorie => {
          let key = categorie.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[àáâäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôöõ]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[ç]/g, 'c')
            .replace(/[^a-z0-9_]/g, '');
          
          // 🔧 VALIDATION : Si la clé est vide, utiliser un fallback
          if (!key || key.trim() === '') {
            key = `service_${Math.random().toString(36).substr(2, 9)}`;
            console.warn('⚠️ Clé vide détectée pour catégorie:', categorie, '→ Fallback:', key);
          }
          
          return {
            key,
            categorie,
            icon: '', // Pas d'icône
            count: categoryCount.get(categorie) || 0
          };
        })
        .filter(cat => cat.key && cat.categorie); // 🔧 FILTRER les catégories invalides

      console.log('✅ CATÉGORIES FINALES TRAITÉES:', {
        nombre_final: categories.length,
        keys: categories.map(c => c.key),
        noms: categories.map(c => c.categorie)
      });

      // 📋 TRI ALPHABÉTIQUE au lieu du tri par popularité
      const sortedCategories = categories.sort((a, b) => a.categorie.localeCompare(b.categorie));
      setServiceCategories(sortedCategories);

      console.log('✅ Catégories chargées et triées:', sortedCategories.length);

    } catch (error) {
      console.error('❌ ERREUR CRITIQUE lors du chargement des catégories:', error);
      console.log('🔧 Chargement du fallback avec 4 catégories...');
      
      // Fallback avec liste minimale triée alphabétiquement
      setServiceCategories([
        { key: 'bricolage', categorie: 'Bricolage', icon: '', count: 0 },
        { key: 'jardinage', categorie: 'Jardinage', icon: '', count: 0 },
        { key: 'menage', categorie: 'Ménage', icon: '', count: 0 },
        { key: 'autres', categorie: 'Autres', icon: '', count: 0 }
      ]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // 🚗 CHARGER LES TYPES DE VÉHICULES
  const loadVehicleTypes = async () => {
    try {
      setVehiclesLoading(true);
      console.log('🚗 Chargement des types de véhicules...');

      const allVehicleTypes = [
        'pied', 'velo', 'trottinette', 'skateboard', 'gyroroue', 'gyropode', 
        'hoverboard', 'moto', 'voiture', 'camionnette', 'van', 'camion', 
        'bateau', 'avion', 'helicoptere'
      ];

      const vehicles = allVehicleTypes
        .map(vehicleType => mapVehicleTypeToDisplay(vehicleType))
        .filter(Boolean);

      console.log('✅ Types de véhicules chargés:', vehicles.length);
      setAvailableVehicles(vehicles);

    } catch (error) {
      console.error('❌ Erreur lors du chargement des véhicules:', error);
      const fallbackVehicles = ['pied', 'velo', 'voiture'].map(type => 
        mapVehicleTypeToDisplay(type)
      ).filter(Boolean);
      setAvailableVehicles(fallbackVehicles);
    } finally {
      setVehiclesLoading(false);
    }
  };

  // 🚗 MAPPING VÉHICULE → AFFICHAGE SANS ICÔNES
  const mapVehicleTypeToDisplay = (vehicleType: string): VehicleType | null => {
    const vehicleMap: Record<string, {label: string, icon: string, needsLicense: boolean}> = {
      'pied': { label: 'À pied', icon: '', needsLicense: false },
      'velo': { label: 'Vélo', icon: '', needsLicense: false },
      'trottinette': { label: 'Trottinette', icon: '', needsLicense: false },
      'skateboard': { label: 'Skateboard', icon: '', needsLicense: false },
      'gyroroue': { label: 'Gyroroue', icon: '', needsLicense: false },
      'gyropode': { label: 'Gyropode', icon: '', needsLicense: false },
      'hoverboard': { label: 'Hoverboard', icon: '', needsLicense: false },
      'moto': { label: 'Moto', icon: '', needsLicense: true },
      'voiture': { label: 'Voiture', icon: '', needsLicense: true },
      'camionnette': { label: 'Camionnette', icon: '', needsLicense: true },
      'van': { label: 'Van', icon: '', needsLicense: true },
      'camion': { label: 'Camion', icon: '', needsLicense: true },
      'bateau': { label: 'Bateau', icon: '', needsLicense: true },
      'avion': { label: 'Avion', icon: '', needsLicense: true },
      'helicoptere': { label: 'Hélicoptère', icon: '', needsLicense: true },
    };

    const mapping = vehicleMap[vehicleType];
    if (mapping) {
      return {
        type: vehicleType,
        ...mapping
      };
    }
    return null;
  };

  // 📂 CHARGER LES CRITÈRES
  useEffect(() => {
    if (!isInitialized || categoriesLoading || vehiclesLoading) {
      console.log('⏳ En attente de l\'initialisation...', { 
        isInitialized, categoriesLoading, vehiclesLoading 
      });
      return;
    }

    if (userProfile?.id) {
      console.log('📂 Chargement critères pour user:', userProfile.id);
      loadCriteria();
    } else {
      setError('Profil utilisateur non disponible');
      setLoading(false);
    }
  }, [userProfile?.id, isInitialized, categoriesLoading, vehiclesLoading]);

  // 🔨 INITIALISER LE MODE COUTEAU SUISSE AU CHARGEMENT
  useEffect(() => {
    if (!criteria || !serviceCategories.length) return;
    
    const totalServices = serviceCategories.length;
    const selectedServices = Object.values(criteria.service_types).filter(Boolean).length;
    
    // Détecter le mode seulement au chargement initial, pas en continu
    if (selectedServices === totalServices && totalServices > 0) {
      setSwissKnifeMode(true);
    }
  }, [serviceCategories.length]); // Déclenché seulement quand les catégories sont chargées

  // 🛡️ VERSION SÉCURISÉE RENFORCÉE DE loadCriteria - 🔧 CORRECTION APPLIQUÉE
  const loadCriteria = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📂 [loadCriteria] === DÉBUT CHARGEMENT SÉCURISÉ ===');
      
      // 🛡️ SÉCURITÉ : Vérification double de l'utilisateur actuel
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        console.error('❌ [loadCriteria] Erreur auth ou utilisateur non connecté:', authError);
        setError('Utilisateur non authentifié');
        setLoading(false);
        return;
      }

      console.log('👤 [loadCriteria] Utilisateur authentifié:', {
        currentUserId: currentUser.id,
        currentUserEmail: currentUser.email,
        userProfileId: userProfile?.id,
        userProfileEmail: userProfile?.email
      });

      // 🔧 CORRECTION APPLIQUÉE : Vérification avec userProfile.user_id au lieu de userProfile.id
      if (userProfile?.user_id && userProfile.user_id !== currentUser.id) {
        console.error('🚨 [loadCriteria] ALERTE SÉCURITÉ CRITIQUE:', {
          message: 'userProfile.user_id !== currentUser.id',
          userProfileId: userProfile.id,
          userProfileUserId: userProfile.user_id,
          currentUserId: currentUser.id,
          userEmail: currentUser.email,
          userProfileEmail: userProfile.email
        });
        
        setError('Incohérence utilisateur détectée');
        setLoading(false);
        return;
      }

      const userIdToUse = currentUser.id;
      console.log('🔍 [loadCriteria] ID utilisateur validé:', userIdToUse);
      
      const { data, error } = await supabase
        .from('criteria')
        .select('*')
        .eq('user_id', userIdToUse)
        .eq('user_type', 'fourmiz');

      if (error) {
        console.error('❌ [loadCriteria] Erreur Supabase critères:', error);
        // Si l'erreur est PGRST116 (pas de résultats), ce n'est pas grave, on crée les critères par défaut
        if (error.code === 'PGRST116') {
          console.log('🔧 [loadCriteria] Aucun critère existant trouvé, création des critères par défaut');
          createDefaultCriteria(userIdToUse);
          return;
        }
        // Pour les autres erreurs, on affiche l'erreur et crée quand même les critères par défaut
        console.error('❌ [loadCriteria] Erreur différente de PGRST116:', error);
        createDefaultCriteria(userIdToUse);
        return;
      }

      if (data && data.length > 0) {
        const loadedCriteria = data[0];
        
        console.log('📋 [loadCriteria] Critères trouvés:', {
          criteriaId: loadedCriteria.id,
          criteriaUserId: loadedCriteria.user_id,
          expectedUserId: userIdToUse
        });
        
        // 🛡️ VÉRIFICATION FINALE : S'assurer que les critères appartiennent au bon utilisateur
        if (loadedCriteria.user_id !== userIdToUse) {
          console.error('🚨 [loadCriteria] ALERTE SÉCURITÉ FINALE:', {
            message: 'Critères chargés pour mauvais utilisateur!',
            criteriaUserId: loadedCriteria.user_id,
            expectedUserId: userIdToUse,
            userEmail: currentUser.email,
            action: 'Création nouveaux critères'
          });
          createDefaultCriteria(userIdToUse);
          return;
        }

        // Compléter les champs manquants
        if (!loadedCriteria.availability_schedule) {
          loadedCriteria.availability_schedule = getDefaultSchedule();
        }
        if (!loadedCriteria.vehicle_types) {
          loadedCriteria.vehicle_types = [];
        }
        if (!loadedCriteria.equipment_provided) {
          loadedCriteria.equipment_provided = [];
        }
        if (!loadedCriteria.spoken_languages) {
          loadedCriteria.spoken_languages = ['Français (France)'];
        }
        if (loadedCriteria.min_mission_duration === undefined) {
          loadedCriteria.min_mission_duration = 1;
        }
        if (loadedCriteria.max_mission_duration === undefined) {
          loadedCriteria.max_mission_duration = 8;
        }
        if (loadedCriteria.min_booking_notice === undefined) {
          loadedCriteria.min_booking_notice = 24;
        }
        // 📍 VALEURS PAR DÉFAUT POUR NOUVEAUX CHAMPS
        if (loadedCriteria.accepts_geolocation === undefined) {
          loadedCriteria.accepts_geolocation = false;
        }
        if (loadedCriteria.presentation === undefined) {
          loadedCriteria.presentation = '';
        }
        
        console.log('✅ [loadCriteria] Critères existants chargés et validés pour:', currentUser.email);
        setCriteria(loadedCriteria);
      } else {
        console.log('🔧 [loadCriteria] Aucun critère trouvé, création nouveaux critères pour:', currentUser.email);
        createDefaultCriteria(userIdToUse);
      }
    } catch (error) {
      console.error('❌ [loadCriteria] Erreur lors du chargement critères:', error);
      setError('Erreur de connexion');
      
      // En cas d'erreur, essayer de créer des critères par défaut avec l'auth actuel
      try {
        const { data: { user: fallbackUser } } = await supabase.auth.getUser();
        if (fallbackUser) {
          createDefaultCriteria(fallbackUser.id);
        }
      } catch (fallbackError) {
        console.error('❌ [loadCriteria] Erreur fallback:', fallbackError);
      }
    } finally {
      setLoading(false);
      console.log('📂 [loadCriteria] === FIN CHARGEMENT SÉCURISÉ ===');
    }
  };

  const getDefaultSchedule = (): AvailabilitySchedule => ({
    monday: { enabled: false, start: "08:00", end: "18:00" },
    tuesday: { enabled: false, start: "08:00", end: "18:00" },
    wednesday: { enabled: false, start: "08:00", end: "18:00" },
    thursday: { enabled: false, start: "08:00", end: "18:00" },
    friday: { enabled: false, start: "08:00", end: "18:00" },
    saturday: { enabled: false, start: "09:00", end: "17:00" },
    sunday: { enabled: false, start: "09:00", end: "17:00" },
  });

  // ⚡ VERSION SÉCURISÉE de createDefaultCriteria AVEC VALEURS MINIMALES PAR DÉFAUT
  const createDefaultCriteria = (forceUserId?: string) => {
    // Utiliser l'ID forcé ou celui du userProfile
    const userIdToUse = forceUserId || userProfile?.id;
    
    if (!userIdToUse) {
      console.error('❌ [createDefaultCriteria] Impossible de créer critères : pas d\'ID utilisateur');
      setError('Utilisateur non identifié');
      return;
    }
    
    console.log('🔧 [createDefaultCriteria] Création critères minimaux pour user:', userIdToUse);
    
    // ⚡ AUCUN SERVICE SÉLECTIONNÉ PAR DÉFAUT - L'utilisateur doit choisir
    const defaultServiceTypes: Record<string, boolean> = {};
    serviceCategories.forEach((category) => {
      defaultServiceTypes[category.key] = false; // Tous désactivés
    });

    const defaultCriteria: CriteriaData = {
      user_id: userIdToUse,
      service_types: defaultServiceTypes, // ⚡ Aucun service par défaut
      
      // ⚡ VALEURS CONSERVÉES PAR DÉFAUT (selon votre demande)
      min_price: 10,              // ⚡ 10€
      max_distance: 5,            // ⚡ 5km
      client_rating: 4.0,         // ⚡ 4.0 étoiles
      spoken_languages: ['Français (France)'], // ⚡ Français
      communication_language: 'Français (France)', // ⚡ Français
      
      // 📍 NOUVEAUX CHAMPS PAR DÉFAUT
      accepts_geolocation: false,
      presentation: '',
      
      // ⚡ TRANSPORT - AUCUN SÉLECTIONNÉ (l'utilisateur doit choisir)
      vehicle_types: [], // Vide - l'utilisateur doit sélectionner
      has_driving_license: false,
      has_vehicle_insurance: false,
      max_travel_distance: 10, // Valeur technique nécessaire
      travel_cost_included: false, // Pas d'assumption
      
      // ⚡ ENVIRONNEMENT - AUCUN SÉLECTIONNÉ
      work_indoor: false,  // L'utilisateur doit choisir
      work_outdoor: false, // L'utilisateur doit choisir
      
      // ⚡ CONDITIONS DE TRAVAIL - TOUTES À FALSE
      accepts_team_work: false,
      uniform_required: false,
      safety_shoes_required: false,
      additional_product_billing: false,
      quote_required: false,
      
      // ⚡ ÉQUIPEMENT - NON FOURNI PAR DÉFAUT
      equipment_provided: [], // Vide - l'utilisateur doit décider
      
      // ⚡ CLIENTÈLE - PAS DE PRÉFÉRENCE PAR DÉFAUT
      accepts_pets: false,        // L'utilisateur doit choisir
      accepts_children: false,    // L'utilisateur doit choisir
      preferred_client_presence: 'no_preference', // Neutre
      
      // ⚡ MISSIONS - VALEURS MINIMALES TECHNIQUES SEULEMENT
      min_mission_duration: 1,     // Valeur technique minimum
      max_mission_duration: 8,     // Valeur technique maximum
      min_booking_notice: 24,      // Valeur technique standard
      
      // ⚡ SERVICES SPÉCIAUX - DÉSACTIVÉS
      urgent_services: false,           // L'utilisateur doit choisir
      accepts_custom_requests: false,   // L'utilisateur doit choisir
      
      // ⚡ DISPONIBILITÉS - TOUTES DÉSACTIVÉES (l'utilisateur doit configurer)
      availability_schedule: getDefaultSchedule(),
      
      // ⚡ QUALITÉ ET SÉCURITÉ - NON VÉRIFIÉES PAR DÉFAUT
      min_fourmiz_rating: 4.0,     // Même que client_rating pour cohérence
      has_liability_insurance: false,  // L'utilisateur doit confirmer
      references_verified: false,      // Non vérifié par défaut
      identity_verified: false,        // Non vérifié par défaut
      
      // ⚡ EXPÉRIENCE - VIDE (optionnel de toute façon)
      years_experience: '',
      certifications: '',
      specialties: '',
      specialized_equipment: '',
    };
    
    console.log('✅ [createDefaultCriteria] Critères minimaux créés - utilisateur doit tout configurer');
    setCriteria(defaultCriteria);
  };

  // 🔄 Rafraîchir TOUT
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadServiceCategories(),
      loadVehicleTypes(),
      loadCriteria()
    ]);
    setRefreshing(false);
  };

  // 💾 SAUVEGARDER - VERSION CORRIGÉE FINALE AVEC NAVIGATION DANS CALLBACK D'ALERTE
  const saveCriteria = useCallback(async (): Promise<void> => {
    if (!criteria) {
      Alert.alert('Erreur', 'Critères non disponibles');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      console.log('💾 [saveCriteria] === DÉBUT SAUVEGARDE SÉCURISÉE ===');
      
      // 🛡️ SÉCURITÉ : Vérification de l'utilisateur avant sauvegarde
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        console.error('❌ [saveCriteria] Erreur auth lors de la sauvegarde:', authError);
        Alert.alert('Erreur', 'Utilisateur non authentifié');
        return;
      }

      // 🛡️ S'assurer que nous sauvegardons pour le bon utilisateur
      const userIdToUse = currentUser.id;
      
      console.log('👤 [saveCriteria] Sauvegarde pour utilisateur:', {
        userId: userIdToUse,
        email: currentUser.email,
        criteriaUserId: criteria.user_id
      });
      
      const dataToSave = {
        ...criteria,
        user_id: userIdToUse,
        user_type: 'fourmiz',
        updated_at: new Date().toISOString(),
      };

      console.log('📋 [saveCriteria] Données préparées pour sauvegarde');

      // 🔧 SOLUTION SIMPLE : UPSERT DIRECT SANS COMPLICATIONS
      const { data, error } = await supabase
        .from('criteria')
        .upsert(dataToSave)
        .select();

      if (error) {
        console.error('❌ [saveCriteria] Erreur sauvegarde critères:', error);
        Alert.alert('Erreur', `Impossible de sauvegarder: ${error.message}`);
        return;
      }

      console.log('✅ [saveCriteria] Critères sauvegardés avec succès');

      // 🔧 MARQUER LES CRITÈRES COMME COMPLÉTÉS DANS LA TABLE PROFILES
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          criteria_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userIdToUse);

      if (updateError) {
        console.error('❌ [saveCriteria] Erreur mise à jour profile:', updateError);
        // On continue même si cette étape échoue
      } else {
        console.log('✅ [saveCriteria] Profile mis à jour: criteria_completed = true');
      }

      console.log('💾 [saveCriteria] === FIN SAUVEGARDE SÉCURISÉE ===');

      // 🔧 NOUVELLE GESTION - ÉMISSION ÉVÉNEMENT PUIS REDIRECTION
      if (isForced) {
        console.log('🔨 [saveCriteria] MODE FORCÉ: émission événement puis redirection');
        
        // ⚡ ÉTAPE 1: Émettre l'événement pour forcer la synchronisation du layout
        console.log('📡 [saveCriteria] Émission événement criteriaSaved');
        
        // ⚡ ÉTAPE 2: Attendre que le layout se synchronise
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // ⚡ ÉTAPE 3: Redirection directe vers available-orders
        Alert.alert(
          'Configuration terminée !',
          'Vos critères ont été sauvegardés. Vous allez être redirigé vers les missions disponibles.',
          [
            { 
              text: 'Voir les missions', 
              onPress: () => {
                console.log('🎯 [saveCriteria] Redirection FINALE vers available-orders');
                try {
                  router.replace('/(tabs)/available-orders');
                } catch (routerError) {
                  console.error('❌ [saveCriteria] Erreur redirection:', routerError);
                  router.replace('/(tabs)/');
                }
              }
            }
          ],
          { cancelable: false }
        );
      } else {
        // 🔒 MODE NORMAL : Sortir du mode édition et afficher confirmation
        setIsEditing(false);
        Alert.alert(
          '✅ Succès', 
          'Vos critères ont été sauvegardés !',
          [
            { 
              text: 'OK'
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('❌ [saveCriteria] Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', `Une erreur est survenue: ${error instanceof Error ? error.message : 'Inconnue'}`);
    } finally {
      setSaving(false);
    }
  }, [criteria, isForced, router, isEditing]);

  // 🔄 FONCTIONS DE MISE À JOUR AVEC CONTRÔLE D'ÉDITION
  const toggleServiceType = (categoryKey: string) => {
    if (!criteria || swissKnifeMode || !isEditing) return; // 🔒 Bloqué si pas en édition
    setCriteria(prev => ({
      ...prev!,
      service_types: {
        ...prev!.service_types,
        [categoryKey]: !prev!.service_types[categoryKey]
      }
    }));
  };

  // 🔨 BASCULER MODE COUTEAU SUISSE AVEC DEBUG
  const toggleSwissKnifeMode = () => {
    if (!criteria || !isEditing) return; // 🔒 Bloqué si pas en édition
    
    const newMode = !swissKnifeMode;
    setSwissKnifeMode(newMode);
    
    if (newMode) {
      // Activer tous les services avec debug
      const allSelected: Record<string, boolean> = {};
      serviceCategories.forEach(category => {
        if (category.key && category.key.trim() !== '') {
          allSelected[category.key] = true;
        }
      });
      
      console.log('🔨 MODE COUTEAU SUISSE ACTIVÉ:', {
        total_categories: serviceCategories.length,
        valid_keys: Object.keys(allSelected).length,
        all_keys: serviceCategories.map(c => c.key),
        categories_with_empty_keys: serviceCategories.filter(c => !c.key || c.key.trim() === '')
      });
      
      setCriteria(prev => ({
        ...prev!,
        service_types: allSelected
      }));
    } else {
      // Désactiver le mode : désélectionner tous les services pour permettre la sélection manuelle
      const noneSelected: Record<string, boolean> = {};
      serviceCategories.forEach((category) => {
        if (category.key && category.key.trim() !== '') {
          noneSelected[category.key] = false;
        }
      });
      setCriteria(prev => ({
        ...prev!,
        service_types: noneSelected
      }));
    }
  };

  const toggleVehicleType = (vehicleType: string) => {
    if (!criteria || !isEditing) return; // 🔒 Bloqué si pas en édition
    setCriteria(prev => {
      const vehicleTypes = prev!.vehicle_types || [];
      const isSelected = vehicleTypes.includes(vehicleType);
      
      return {
        ...prev!,
        vehicle_types: isSelected 
          ? vehicleTypes.filter(v => v !== vehicleType)
          : [...vehicleTypes, vehicleType]
      };
    });
  };

  const toggleLanguage = (language: string) => {
    if (!criteria || !isEditing) return; // 🔒 Bloqué si pas en édition
    setCriteria(prev => {
      const languages = prev!.spoken_languages || [];
      const isSelected = languages.includes(language);
      
      return {
        ...prev!,
        spoken_languages: isSelected 
          ? languages.filter(l => l !== language)
          : [...languages, language]
      };
    });
  };

  const updateCriteria = (field: keyof CriteriaData, value: any) => {
    if (!criteria || !isEditing) return; // 🔒 Bloqué si pas en édition
    setCriteria(prev => ({ ...prev!, [field]: value }));
  };

  const toggleDayAvailability = (day: keyof AvailabilitySchedule) => {
    if (!criteria || !isEditing) return; // 🔒 Bloqué si pas en édition
    setCriteria(prev => ({
      ...prev!,
      availability_schedule: {
        ...prev!.availability_schedule,
        [day]: {
          ...prev!.availability_schedule[day],
          enabled: !prev!.availability_schedule[day].enabled
        }
      }
    }));
  };

  const updateDayTime = (day: keyof AvailabilitySchedule, timeType: 'start' | 'end', value: string) => {
    if (!criteria || !isEditing) return; // 🔒 Bloqué si pas en édition
    setCriteria(prev => ({
      ...prev!,
      availability_schedule: {
        ...prev!.availability_schedule,
        [day]: {
          ...prev!.availability_schedule[day],
          [timeType]: value
        }
      }
    }));
  };

  // États de chargement
  if (!isInitialized || categoriesLoading || vehiclesLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      </SafeAreaView>
    );
  }

  if ((error && !criteria) || !criteria) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error || 'Erreur de chargement des critères'}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              loadServiceCategories();
              loadVehicleTypes(); 
              if (userProfile?.id) loadCriteria();
            }}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Introduction modifiée pour le mode forcé */}
        <View style={styles.introSection}>
          <Text style={styles.introSubtitle}>
            {isForced 
              ? 'Configurez vos critères pour recevoir des missions qui vous conviennent'
              : isEditing
              ? 'Modifiez vos critères selon vos préférences'
              : 'Consultez vos critères de service configurés'
            }
          </Text>
        </View>

        {/* 📍 PRÉSENTATION PERSONNELLE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Présentation personnelle (optionnel)</Text>
          <View style={[styles.criteriaCard, !isEditing && styles.readOnlyCard]}>
            <Text style={styles.inputLabel}>Phrase de présentation (100 caractères max)</Text>
            {isEditing ? (
              <>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: Artisan passionné avec 10 ans d'expérience, travail soigné garanti !"
                  value={criteria.presentation || ''}
                  onChangeText={(text) => {
                    if (text.length <= 100) {
                      updateCriteria('presentation', text);
                    }
                  }}
                  maxLength={100}
                />
                <Text style={styles.characterCount}>
                  {(criteria.presentation || '').length}/100 caractères
                </Text>
              </>
            ) : (
              <Text style={styles.readOnlyText}>
                {criteria.presentation || 'Aucune présentation configurée'}
              </Text>
            )}
          </View>
        </View>

        {/* ÉQUIPEMENTS SPÉCIALISÉS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Équipements spécialisés (optionnel)</Text>
          <View style={[styles.criteriaCard, !isEditing && styles.readOnlyCard]}>
            <Text style={styles.inputLabel}>Décrivez vos équipements professionnels spécialisés</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={3}
                placeholder="Ex: Matériel de diagnostic électronique, outils de précision, équipements de sécurité spéciaux..."
                value={criteria.specialized_equipment || ''}
                onChangeText={(text) => updateCriteria('specialized_equipment', text)}
              />
            ) : (
              <Text style={styles.readOnlyText}>
                {criteria.specialized_equipment || 'Aucun équipement spécialisé renseigné'}
              </Text>
            )}
          </View>
        </View>

        {/* 🔨 TYPES DE SERVICES AVEC MODE COUTEAU SUISSE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Types de services ({Object.values(criteria.service_types).filter(Boolean).length}/{serviceCategories.length} sélectionnés)
            </Text>
            
            {/* 🔨 SWITCH MODE COUTEAU SUISSE */}
            {isEditing && (
              <View style={styles.swissKnifeModeContainer}>
                <View style={styles.swissKnifeModeInfo}>
                  <Text style={styles.swissKnifeModeLabel}>Mode Couteau Suisse</Text>
                  <Text style={styles.swissKnifeModeDesc}>Tous les services activés</Text>
                </View>
                <Switch
                  value={swissKnifeMode}
                  onValueChange={toggleSwissKnifeMode}
                  trackColor={{ false: '#e0e0e0', true: '#000000' }}
                  thumbColor="#ffffff"
                />
              </View>
            )}
          </View>

          {serviceCategories.length > 0 ? (
            <View style={styles.servicesGrid}>
              {serviceCategories.map((category) => {
                const isSelected = criteria.service_types[category.key] || false;
                return (
                  <TouchableOpacity
                    key={category.key}
                    style={[
                      styles.serviceCard,
                      isSelected && styles.serviceCardActive,
                      (swissKnifeMode || !isEditing) && styles.serviceCardDisabled // 🔒 Désactivé si pas en édition
                    ]}
                    onPress={() => toggleServiceType(category.key)}
                    activeOpacity={(swissKnifeMode || !isEditing) ? 1 : 0.8}
                    disabled={swissKnifeMode || !isEditing} // 🔒 Désactivé si pas en édition
                  >
                    <Text style={[
                      styles.serviceLabel,
                      isSelected && styles.serviceLabelActive,
                      (swissKnifeMode || !isEditing) && styles.serviceLabelDisabled // 🔒 Style désactivé
                    ]}>
                      {category.categorie}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkIconContainer}>
                        <Ionicons name="checkmark" size={12} color="#000000" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.noCategoriesContainer}>
              <Text style={styles.noCategoriesText}>Aucune catégorie chargée</Text>
              <TouchableOpacity 
                style={styles.reloadButton} 
                onPress={loadServiceCategories}
              >
                <Text style={styles.reloadButtonText}>Recharger catégories</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* TRANSPORT ET MOBILITÉ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Transport et mobilité ({criteria.vehicle_types?.length || 0}/{availableVehicles.length} sélectionnés)
          </Text>
          <View style={styles.servicesGrid}>
            {availableVehicles.map((vehicle) => {
              const isSelected = criteria.vehicle_types?.includes(vehicle.type) || false;
              return (
                <TouchableOpacity
                  key={vehicle.type}
                  style={[
                    styles.serviceCard,
                    isSelected && styles.serviceCardActive,
                    !isEditing && styles.serviceCardDisabled // 🔒 Désactivé si pas en édition
                  ]}
                  onPress={() => toggleVehicleType(vehicle.type)}
                  activeOpacity={!isEditing ? 1 : 0.8}
                  disabled={!isEditing} // 🔒 Désactivé si pas en édition
                >
                  <Text style={[
                    styles.serviceLabel,
                    isSelected && styles.serviceLabelActive,
                    !isEditing && styles.serviceLabelDisabled // 🔒 Style désactivé
                  ]}>
                    {vehicle.label}
                  </Text>
                  {vehicle.needsLicense && (
                    <Text style={styles.licenseRequired}>Permis</Text>
                  )}
                  {isSelected && (
                    <View style={styles.checkIconContainer}>
                      <Ionicons name="checkmark" size={12} color="#000000" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          
          <View style={[styles.criteriaCard, !isEditing && styles.readOnlyCard]}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Permis de conduire</Text>
                <Text style={styles.switchSubText}>Permis valide et à jour</Text>
              </View>
              <Switch
                value={criteria.has_driving_license}
                onValueChange={(value) => updateCriteria('has_driving_license', value)}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Assurance véhicule</Text>
                <Text style={styles.switchSubText}>Couverture usage professionnel</Text>
              </View>
              <Switch
                value={criteria.has_vehicle_insurance}
                onValueChange={(value) => updateCriteria('has_vehicle_insurance', value)}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Frais de déplacement inclus</Text>
                <Text style={styles.switchSubText}>Pas de facturation supplémentaire</Text>
              </View>
              <Switch
                value={criteria.travel_cost_included}
                onValueChange={(value) => updateCriteria('travel_cost_included', value)}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>
          </View>
        </View>

        {/* 🔧 CONDITIONS DE TRAVAIL AVEC SWITCHES INTÉRIEUR/EXTÉRIEUR REMIS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conditions de travail</Text>
          <View style={[styles.criteriaCard, !isEditing && styles.readOnlyCard]}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Travail en intérieur</Text>
              </View>
              <Switch
                value={criteria.work_indoor}
                onValueChange={(value) => updateCriteria('work_indoor', value)}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Travail en extérieur</Text>
              </View>
              <Switch
                value={criteria.work_outdoor}
                onValueChange={(value) => updateCriteria('work_outdoor', value)}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Port d'uniforme requis</Text>
                <Text style={styles.switchSubText}>Tenue spécifique demandée</Text>
              </View>
              <Switch
                value={criteria.uniform_required}
                onValueChange={(value) => updateCriteria('uniform_required', value)}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Chaussures de sécurité</Text>
                <Text style={styles.switchSubText}>Équipements de protection individuelle</Text>
              </View>
              <Switch
                value={criteria.safety_shoes_required}
                onValueChange={(value) => updateCriteria('safety_shoes_required', value)}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Facturation produits supplémentaires</Text>
                <Text style={styles.switchSubText}>Matériaux et consommables facturés en plus</Text>
              </View>
              <Switch
                value={criteria.additional_product_billing}
                onValueChange={(value) => updateCriteria('additional_product_billing', value)}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Devis préalable requis</Text>
                <Text style={styles.switchSubText}>Estimation obligatoire avant intervention</Text>
              </View>
              <Switch
                value={criteria.quote_required}
                onValueChange={(value) => updateCriteria('quote_required', value)}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>

            {/* 📍 NOUVEAU SWITCH GÉOLOCALISATION */}
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Accepter la géolocalisation</Text>
                <Text style={styles.switchSubText}>Durant votre disponibilité Fourmiz - la géolocalisation durant votre mission est automatique</Text>
              </View>
              <Switch
                value={criteria.accepts_geolocation}
                onValueChange={(value) => updateCriteria('accepts_geolocation', value)}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>
          </View>
        </View>

        {/* ÉQUIPEMENTS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Équipements et matériel</Text>
          <View style={[styles.criteriaCard, !isEditing && styles.readOnlyCard]}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Je prévois l'équipement pour réaliser mes prestations</Text>
                <Text style={styles.switchSubText}>J'apporte le matériel nécessaire aux missions</Text>
              </View>
              <Switch
                value={criteria.equipment_provided?.length > 0}
                onValueChange={(value) => updateCriteria('equipment_provided', value ? ['oui'] : [])}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>
          </View>
        </View>

        {/* Tarifs et distance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tarifs et distance</Text>
          <View style={[styles.criteriaCard, !isEditing && styles.readOnlyCard]}>
            <View style={styles.criteriaRow}>
              <Text style={styles.criteriaLabel}>Prix minimum par commande</Text>
              <View style={styles.priceSelector}>
                <TouchableOpacity
                  style={[styles.priceButton, !isEditing && styles.priceButtonDisabled]}
                  onPress={() => updateCriteria('min_price', Math.max(1, criteria.min_price - 1))}
                  disabled={!isEditing} // 🔒 Désactivé si pas en édition
                >
                  <Ionicons name="remove" size={16} color={!isEditing ? "#cccccc" : "#000000"} />
                </TouchableOpacity>
                <Text style={styles.priceValue}>{criteria.min_price}€</Text>
                <TouchableOpacity
                  style={[styles.priceButton, !isEditing && styles.priceButtonDisabled]}
                  onPress={() => updateCriteria('min_price', Math.min(500, criteria.min_price + 1))}
                  disabled={!isEditing} // 🔒 Désactivé si pas en édition
                >
                  <Ionicons name="add" size={16} color={!isEditing ? "#cccccc" : "#000000"} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.criteriaRow}>
              <Text style={styles.criteriaLabel}>Distance maximum</Text>
              <View style={styles.priceSelector}>
                <TouchableOpacity
                  style={[styles.priceButton, !isEditing && styles.priceButtonDisabled]}
                  onPress={() => updateCriteria('max_distance', Math.max(1, criteria.max_distance - 1))}
                  disabled={!isEditing} // 🔒 Désactivé si pas en édition
                >
                  <Ionicons name="remove" size={16} color={!isEditing ? "#cccccc" : "#000000"} />
                </TouchableOpacity>
                <Text style={styles.priceValue}>{criteria.max_distance}km</Text>
                <TouchableOpacity
                  style={[styles.priceButton, !isEditing && styles.priceButtonDisabled]}
                  onPress={() => updateCriteria('max_distance', Math.min(50, criteria.max_distance + 1))}
                  disabled={!isEditing} // 🔒 Désactivé si pas en édition
                >
                  <Ionicons name="add" size={16} color={!isEditing ? "#cccccc" : "#000000"} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* 📅 DISPONIBILITÉS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes disponibilités détaillées</Text>
          
          {weekDays.map((day) => {
            const daySchedule = criteria.availability_schedule[day.key];
            return (
              <View key={day.key} style={[styles.dayCard, !isEditing && styles.readOnlyCard]}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayInfo}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <Text style={styles.dayShort}>{day.shortLabel}</Text>
                  </View>
                  <Switch
                    value={daySchedule.enabled}
                    onValueChange={() => toggleDayAvailability(day.key)}
                    trackColor={{ false: '#e0e0e0', true: '#000000' }}
                    thumbColor="#ffffff"
                    disabled={!isEditing} // 🔒 Désactivé si pas en édition
                  />
                </View>
                
                {daySchedule.enabled && (
                  <View style={styles.timeSlotContainer}>
                    <View style={styles.timeSlot}>
                      <Text style={styles.timeLabel}>Début</Text>
                      <View style={styles.timePicker}>
                        <TouchableOpacity
                          style={[styles.timeButton, !isEditing && styles.timeButtonDisabled]}
                          onPress={() => {
                            const currentIndex = availableHours.indexOf(daySchedule.start);
                            const newIndex = Math.max(0, currentIndex - 1);
                            updateDayTime(day.key, 'start', availableHours[newIndex]);
                          }}
                          disabled={!isEditing} // 🔒 Désactivé si pas en édition
                        >
                          <Ionicons name="chevron-down" size={16} color={!isEditing ? "#cccccc" : "#000000"} />
                        </TouchableOpacity>
                        <Text style={styles.timeValue}>{daySchedule.start}</Text>
                        <TouchableOpacity
                          style={[styles.timeButton, !isEditing && styles.timeButtonDisabled]}
                          onPress={() => {
                            const currentIndex = availableHours.indexOf(daySchedule.start);
                            const newIndex = Math.min(availableHours.length - 1, currentIndex + 1);
                            updateDayTime(day.key, 'start', availableHours[newIndex]);
                          }}
                          disabled={!isEditing} // 🔒 Désactivé si pas en édition
                        >
                          <Ionicons name="chevron-up" size={16} color={!isEditing ? "#cccccc" : "#000000"} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.timeSeparator}>→</Text>

                    <View style={styles.timeSlot}>
                      <Text style={styles.timeLabel}>Fin</Text>
                      <View style={styles.timePicker}>
                        <TouchableOpacity
                          style={[styles.timeButton, !isEditing && styles.timeButtonDisabled]}
                          onPress={() => {
                            const currentIndex = availableHours.indexOf(daySchedule.end);
                            const newIndex = Math.max(0, currentIndex - 1);
                            updateDayTime(day.key, 'end', availableHours[newIndex]);
                          }}
                          disabled={!isEditing} // 🔒 Désactivé si pas en édition
                        >
                          <Ionicons name="chevron-down" size={16} color={!isEditing ? "#cccccc" : "#000000"} />
                        </TouchableOpacity>
                        <Text style={styles.timeValue}>{daySchedule.end}</Text>
                        <TouchableOpacity
                          style={[styles.timeButton, !isEditing && styles.timeButtonDisabled]}
                          onPress={() => {
                            const currentIndex = availableHours.indexOf(daySchedule.end);
                            const newIndex = Math.min(availableHours.length - 1, currentIndex + 1);
                            updateDayTime(day.key, 'end', availableHours[newIndex]);
                          }}
                          disabled={!isEditing} // 🔒 Désactivé si pas en édition
                        >
                          <Ionicons name="chevron-up" size={16} color={!isEditing ? "#cccccc" : "#000000"} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* 🔧 Services spéciaux */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services spéciaux</Text>
          <View style={[styles.criteriaCard, !isEditing && styles.readOnlyCard]}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Services urgents</Text>
              </View>
              <Switch
                value={criteria.urgent_services}
                onValueChange={(value) => updateCriteria('urgent_services', value)}
                trackColor={{ false: '#e0e0e0', true: '#FF6B00' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Demandes personnalisées</Text>
                <Text style={styles.switchSubText}>En dehors de la liste officielle Fourmiz</Text>
              </View>
              <Switch
                value={criteria.accepts_custom_requests}
                onValueChange={(value) => updateCriteria('accepts_custom_requests', value)}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>
          </View>
        </View>

        {/* EXPÉRIENCE ET SPÉCIALITÉS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expérience et spécialités (optionnel)</Text>
          <View style={[styles.criteriaCard, !isEditing && styles.readOnlyCard]}>
            <Text style={styles.inputLabel}>Années d'expérience par service</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={2}
                placeholder="Ex: Ménage 5 ans, Bricolage 3 ans, Jardinage 2 ans..."
                value={criteria.years_experience || ''}
                onChangeText={(text) => updateCriteria('years_experience', text)}
              />
            ) : (
              <Text style={styles.readOnlyText}>
                {criteria.years_experience || 'Non renseigné'}
              </Text>
            )}

            <Text style={styles.inputLabel}>Certifications et diplômes</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={2}
                placeholder="Ex: CAP Électricité, Certification nettoyage industriel, Permis phytosanitaire..."
                value={criteria.certifications || ''}
                onChangeText={(text) => updateCriteria('certifications', text)}
              />
            ) : (
              <Text style={styles.readOnlyText}>
                {criteria.certifications || 'Non renseigné'}
              </Text>
            )}

            <Text style={styles.inputLabel}>Spécialités</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={3}
                placeholder="Ex: Rénovation ancienne, entretien piscines, dépannage électronique, jardins japonais..."
                value={criteria.specialties || ''}
                onChangeText={(text) => updateCriteria('specialties', text)}
              />
            ) : (
              <Text style={styles.readOnlyText}>
                {criteria.specialties || 'Non renseigné'}
              </Text>
            )}
          </View>
        </View>

        {/* LANGUES PARLÉES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Langues parlées</Text>
          <View style={styles.servicesGrid}>
            {availableLanguages.map((language) => {
              const isSelected = criteria.spoken_languages?.includes(language) || false;
              return (
                <TouchableOpacity
                  key={language}
                  style={[
                    styles.serviceCard,
                    isSelected && styles.serviceCardActive,
                    !isEditing && styles.serviceCardDisabled // 🔒 Désactivé si pas en édition
                  ]}
                  onPress={() => toggleLanguage(language)}
                  activeOpacity={!isEditing ? 1 : 0.8}
                  disabled={!isEditing} // 🔒 Désactivé si pas en édition
                >
                  <Text style={[
                    styles.serviceLabel,
                    isSelected && styles.serviceLabelActive,
                    !isEditing && styles.serviceLabelDisabled // 🔒 Style désactivé
                  ]}>
                    {language.split(' ')[0]}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkIconContainer}>
                      <Ionicons name="checkmark" size={12} color="#000000" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ASSURANCE RESPONSABILITÉ CIVILE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assurance responsabilité civile</Text>
          <View style={[styles.criteriaCard, !isEditing && styles.readOnlyCard]}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>J'ai une assurance responsabilité civile</Text>
                <Text style={styles.switchSubText}>Couverture professionnelle active et valide</Text>
              </View>
              <Switch
                value={criteria.has_liability_insurance}
                onValueChange={(value) => updateCriteria('has_liability_insurance', value)}
                trackColor={{ false: '#e0e0e0', true: '#000000' }}
                thumbColor="#ffffff"
                disabled={!isEditing} // 🔒 Désactivé si pas en édition
              />
            </View>
          </View>
        </View>

        {/* 🔧 Exigences de qualité Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exigences de qualité Client</Text>
          <View style={[styles.criteriaCard, !isEditing && styles.readOnlyCard]}>
            <View style={styles.criteriaRow}>
              <Text style={styles.criteriaLabel}>Note minimum des clients</Text>
              <View style={styles.ratingSelector}>
                {[3.0, 3.5, 4.0, 4.5, 5.0].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      criteria.client_rating === rating && styles.ratingButtonActive,
                      !isEditing && styles.ratingButtonDisabled // 🔒 Désactivé si pas en édition
                    ]}
                    onPress={() => updateCriteria('client_rating', rating)}
                    disabled={!isEditing} // 🔒 Désactivé si pas en édition
                  >
                    <Text style={[
                      styles.ratingText,
                      criteria.client_rating === rating && styles.ratingTextActive,
                      !isEditing && styles.ratingTextDisabled // 🔒 Style désactivé
                    ]}>
                      {rating}★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 🔨 BOUTON SAUVEGARDER MODIFIÉ POUR LE MODE FORCÉ */}
        {isForced && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
              onPress={saveCriteria}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <View style={styles.saveButtonLoading}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.saveButtonLoadingText}>Sauvegarde...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="save-outline" size={16} color="#ffffff" style={styles.saveIcon} />
                  <Text style={styles.saveButtonText}>
                    Terminer la configuration
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 📋 RÉSUMÉ COMPLET SANS ICÔNES */}
        <View style={styles.section}>
          <View style={[styles.summaryCard, !isEditing && styles.summaryCardReadOnly]}>
            <View style={styles.summaryHeader}>
              <Ionicons name="document-text-outline" size={20} color="#000000" />
              <Text style={styles.summaryTitle}>
                {isEditing ? 'Aperçu de vos critères' : 'Résumé de vos critères'}
              </Text>
            </View>
            
            <View style={styles.summaryContent}>
              <Text style={styles.summaryText}>
                {(() => {
                  const count = Object.values(criteria.service_types).filter(Boolean).length;
                  return `${count}/${serviceCategories.length} ${count <= 1 ? 'type de service' : 'types de services'}`;
                })()}
                {swissKnifeMode && ' (Mode Couteau Suisse)'}
              </Text>
              {criteria.presentation && (
                <Text style={styles.summaryText}>
                  Présentation: "{criteria.presentation}"
                </Text>
              )}
              <Text style={styles.summaryText}>
                {(() => {
                  const count = criteria.vehicle_types?.length || 0;
                  return `${count}/${availableVehicles.length} ${count <= 1 ? 'moyen de transport' : 'moyens de transport'}`;
                })()}
              </Text>
              <Text style={styles.summaryText}>
                Équipement fourni: {criteria.equipment_provided?.length > 0 ? 'Oui' : 'Non'}
              </Text>
              <Text style={styles.summaryText}>
                {(() => {
                  const count = criteria.spoken_languages?.length || 0;
                  return `${count} ${count <= 1 ? 'langue parlée' : 'langues parlées'}`;
                })()}
              </Text>
              <Text style={styles.summaryText}>
                À partir de {criteria.min_price}€ par commande
              </Text>
              <Text style={styles.summaryText}>
                Dans un rayon de {criteria.max_distance}km
              </Text>
              <Text style={styles.summaryText}>
                Missions: {criteria.min_mission_duration || 1}h min → {criteria.max_mission_duration || 8}h max
              </Text>
              <Text style={styles.summaryText}>
                Préavis minimum de réservation: {criteria.min_booking_notice || 24}h
              </Text>
              <Text style={styles.summaryText}>
                {Object.values(criteria.availability_schedule).filter(day => day.enabled).length}/7 jours disponibles
              </Text>
              <Text style={styles.summaryText}>
                Intérieur: {criteria.work_indoor ? 'Oui' : 'Non'} | Extérieur: {criteria.work_outdoor ? 'Oui' : 'Non'}
              </Text>
              <Text style={styles.summaryText}>
                Services urgents: {criteria.urgent_services ? 'Oui' : 'Non'}
              </Text>
              <Text style={styles.summaryText}>
                Assurance RC: {criteria.has_liability_insurance ? 'Oui' : 'Non'} | ID vérifiée: {criteria.identity_verified ? 'Oui' : 'Non'}
              </Text>
              <Text style={styles.summaryText}>
                Géolocalisation acceptée: {criteria.accepts_geolocation ? 'Oui' : 'Non'}
              </Text>
              <Text style={styles.summaryText}>
                Clients ≥ {criteria.client_rating}★
              </Text>
              <Text style={styles.summaryText}>
                Communication: {criteria.communication_language?.split(' ')[0] || 'Français'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// 🎨 STYLES AVEC NOUVEAUX ÉLÉMENTS POUR MODE LECTURE/ÉDITION
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24 },
  loadingText: { fontSize: 13, color: '#333333', fontWeight: '400' },
  loadingSubText: { fontSize: 12, color: '#666666', fontStyle: 'italic' },
  errorText: { fontSize: 13, color: '#000000', textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  retryButton: { backgroundColor: '#000000', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 6 },
  retryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  
  // 🎨 HEADER AVEC BOUTON MODIFIER SIMPLE
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  
  // 🔒 BOUTON MODIFIER SIMPLE ET ÉPURÉ
  editButton: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 80,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  
  progressIndicator: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  progressText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  scrollView: { flex: 1 },
  
  // Introduction modifiée (sans titre)
  introSection: { 
    backgroundColor: '#ffffff', 
    padding: 24, 
    alignItems: 'center' 
  },
  introSubtitle: { 
    fontSize: 13, 
    color: '#666666', 
    textAlign: 'center', 
    lineHeight: 20, 
    fontWeight: '400' 
  },
  
  section: { paddingHorizontal: 24, marginBottom: 20 },
  
  // 🔨 HEADER DE SECTION POUR MODE COUTEAU SUISSE
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#000000', 
    marginBottom: 8 
  },
  
  // 🔨 CONTAINER MODE COUTEAU SUISSE
  swissKnifeModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  swissKnifeModeInfo: {
    flex: 1,
  },
  swissKnifeModeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  swissKnifeModeDesc: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },
  
  sectionSubtitle: { fontSize: 12, color: '#666666', marginBottom: 16, lineHeight: 18 },
  subSectionTitle: { fontSize: 12, fontWeight: '500', color: '#333333', marginBottom: 12, marginTop: 8 },
  
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceCard: { 
    width: '31.5%',
    backgroundColor: '#ffffff', 
    padding: 12,
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1, 
    borderColor: '#e0e0e0', 
    position: 'relative',
    minHeight: 60
  },
  serviceCardActive: { 
    backgroundColor: '#f8f8f8', 
    borderColor: '#000000' 
  },
  // 🔒 ÉTAT DÉSACTIVÉ POUR MODE LECTURE
  serviceCardDisabled: {
    opacity: 0.6,
  },
  serviceLabel: { 
    fontSize: 9,
    fontWeight: '400', 
    color: '#333333', 
    textAlign: 'center', 
    lineHeight: 12,
    paddingHorizontal: 2,
    numberOfLines: 1
  },
  serviceLabelActive: { color: '#000000', fontWeight: '600' },
  // 🔒 ÉTAT DÉSACTIVÉ POUR LABELS
  serviceLabelDisabled: {
    color: '#999999',
  },
  checkIconContainer: { position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  licenseRequired: { position: 'absolute', bottom: 4, left: 4, fontSize: 9, color: '#666666', fontWeight: '500' },
  
  noCategoriesContainer: { backgroundColor: '#f8f8f8', padding: 20, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  noCategoriesText: { fontSize: 13, color: '#666666', marginBottom: 12, textAlign: 'center' },
  reloadButton: { backgroundColor: '#000000', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  reloadButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  
  criteriaCard: { backgroundColor: '#ffffff', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: '#e0e0e0' },
  // 🔒 STYLE POUR MODE LECTURE
  readOnlyCard: {
    backgroundColor: '#fafafa',
    borderColor: '#e9ecef',
  },
  criteriaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  criteriaLabel: { fontSize: 13, color: '#333333', flex: 1, fontWeight: '400', minWidth: 120 },
  
  inputLabel: { fontSize: 12, color: '#333333', marginBottom: 8, marginTop: 12, fontWeight: '500' },
  textInput: { 
    borderWidth: 1, 
    borderColor: '#e0e0e0', 
    borderRadius: 6, 
    padding: 12, 
    fontSize: 13, 
    color: '#000000',
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
    marginBottom: 8
  },
  // 🔒 TEXTE EN MODE LECTURE SEULEMENT
  readOnlyText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 44,
    textAlignVertical: 'center',
  },
  characterCount: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
    marginTop: -4,
    marginBottom: 8,
    fontWeight: '400'
  },
  
  priceSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 6, padding: 4 },
  priceButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 4, borderWidth: 1, borderColor: '#e0e0e0' },
  // 🔒 BOUTON PRIX DÉSACTIVÉ
  priceButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d0d0d0',
  },
  priceValue: { fontSize: 13, fontWeight: '600', color: '#000000', marginHorizontal: 12, minWidth: 40, textAlign: 'center' },
  
  dayCard: { backgroundColor: '#ffffff', borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayLabel: { fontSize: 13, fontWeight: '600', color: '#000000' },
  dayShort: { fontSize: 11, color: '#666666', backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  
  timeSlotContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, justifyContent: 'space-between' },
  timeSlot: { alignItems: 'center', gap: 8 },
  timeLabel: { fontSize: 12, color: '#666666', fontWeight: '500' },
  timePicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 6, padding: 4 },
  timeButton: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 4, borderWidth: 1, borderColor: '#e0e0e0' },
  // 🔒 BOUTON TEMPS DÉSACTIVÉ
  timeButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d0d0d0',
  },
  timeValue: { fontSize: 13, fontWeight: '600', color: '#000000', marginHorizontal: 12, minWidth: 50, textAlign: 'center' },
  timeSeparator: { fontSize: 16, color: '#000000', fontWeight: '600', marginHorizontal: 16 },
  
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  switchInfo: { flex: 1 },
  switchLabel: { fontSize: 13, color: '#000000', marginBottom: 4, fontWeight: '600' },
  switchSubText: { fontSize: 13, color: '#666666', fontWeight: '400' },
  
  ratingSelector: { flexDirection: 'row', gap: 6 },
  ratingButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4, backgroundColor: '#f8f8f8', borderWidth: 1, borderColor: '#e0e0e0' },
  ratingButtonActive: { backgroundColor: '#000000', borderColor: '#000000' },
  // 🔒 BOUTON RATING DÉSACTIVÉ
  ratingButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d0d0d0',
  },
  ratingText: { fontSize: 13, color: '#666666', fontWeight: '400' },
  ratingTextActive: { color: '#ffffff', fontWeight: '600' },
  // 🔒 TEXTE RATING DÉSACTIVÉ
  ratingTextDisabled: {
    color: '#cccccc',
  },
  
  saveButton: { backgroundColor: '#000000', padding: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveButtonDisabled: { opacity: 0.6 },
  saveIcon: { marginRight: 4 },
  saveButtonText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  // 💾 STYLE POUR L'ÉTAT DE CHARGEMENT DU BOUTON
  saveButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonLoadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  summaryCard: { backgroundColor: '#ffffff', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: '#e0e0e0' },
  // 🔒 SUMMARY EN MODE LECTURE
  summaryCardReadOnly: {
    backgroundColor: '#f8f8f8',
    borderColor: '#e0e0e0',
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: '#000000' },
  summaryContent: { gap: 8 },
  summaryText: { fontSize: 13, color: '#333333', fontWeight: '400' },
  
  bottomSpacer: { height: 32 }
});
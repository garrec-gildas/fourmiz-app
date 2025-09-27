// app/fourmiz-preview.tsx - FICHE DE PRÉSENTATION FOURMIZ COMPLÈTE
// Affichage complet de la fiche fourmiz avec toutes les données réelles
// 🆕 Ajout Description - Bio, Certifications et connexion services Supabase
// ✅ CORRECTION : Formatage des langues sans nom de pays
// ✅ CORRECTION : Missions terminées uniquement + suppression % réussite

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

// ====================================
// FONCTIONS HELPER DE FORMATAGE POUR CRITÈRES
// ====================================

// 🆕 FONCTION CONNECTÉE À SUPABASE POUR LES SERVICES
const formatServiceTypes = (serviceTypes: Record<string, boolean> | null, serviceCategories: any[]): string => {
  if (!serviceTypes || typeof serviceTypes !== 'object') {
    return 'Services non renseignés';
  }
  
  const selectedServices = Object.entries(serviceTypes)
    .filter(([key, isSelected]) => isSelected)
    .map(([key]) => {
      // Chercher la catégorie correspondante dans les données Supabase
      const category = serviceCategories.find(cat => cat.key === key);
      return category ? category.categorie : key;
    })
    .filter(Boolean);
  
  if (selectedServices.length === 0) {
    return 'Aucun service sélectionné';
  }
  
  return selectedServices.join(', ');
};

const formatVehicleTypes = (vehicleTypes: string[] | null): string => {
  if (!vehicleTypes || !Array.isArray(vehicleTypes) || vehicleTypes.length === 0) {
    return 'Non renseigné';
  }
  
  const vehicleLabels: { [key: string]: string } = {
    'pied': 'À pied',
    'velo': 'Vélo',
    'trottinette': 'Trottinette',
    'skateboard': 'Skateboard',
    'gyroroue': 'Gyroroue',
    'gyropode': 'Gyropode',
    'hoverboard': 'Hoverboard',
    'moto': 'Moto',
    'voiture': 'Voiture',
    'camionnette': 'Camionnette',
    'van': 'Van',
    'camion': 'Camion',
    'bateau': 'Bateau',
    'avion': 'Avion',
    'helicoptere': 'Hélicoptère',
  };
  
  const formattedVehicles = vehicleTypes
    .map(type => vehicleLabels[type] || type);
  
  // Séparer "À pied" des véhicules motorisés
  const walkingIndex = formattedVehicles.indexOf('À pied');
  const motorizedVehicles = formattedVehicles.filter(v => v !== 'À pied');
  
  if (walkingIndex !== -1 && motorizedVehicles.length > 0) {
    return `À pied, ${motorizedVehicles.join(', ')} (permis requis)`;
  } else if (walkingIndex !== -1) {
    return 'À pied';
  } else if (motorizedVehicles.length > 0) {
    return `${motorizedVehicles.join(', ')} (permis requis)`;
  }
  
  return formattedVehicles.join(', ');
};

const formatEquipments = (equipmentProvided: string[] | null, specializedEquipment: string | null): string => {
  const allEquipments = [];
  
  if (equipmentProvided && Array.isArray(equipmentProvided) && equipmentProvided.length > 0) {
    // Si equipmentProvided contient "oui", l'utilisateur fournit l'équipement
    if (equipmentProvided.includes('oui')) {
      allEquipments.push('Équipement de base fourni');
    }
  }
  
  if (specializedEquipment && typeof specializedEquipment === 'string' && specializedEquipment.trim()) {
    allEquipments.push(specializedEquipment.trim());
  }
  
  if (allEquipments.length === 0) {
    return 'Équipement à définir avec le client';
  }
  
  return allEquipments.join(' • ');
};

// ✅ NOUVELLE FONCTION : Formatage des langues sans nom de pays
const formatSpokenLanguages = (spokenLanguages: string[] | null): string => {
  if (!spokenLanguages || !Array.isArray(spokenLanguages) || spokenLanguages.length === 0) {
    return 'Non renseigné';
  }
  
  // Nettoyer les langues en supprimant les informations de pays entre parenthèses
  const cleanedLanguages = spokenLanguages
    .map(lang => {
      if (typeof lang !== 'string') return '';
      // Supprimer tout ce qui est entre parenthèses (comme "(France)", "(United States)")
      return lang.replace(/\s*\([^)]*\)/g, '').trim();
    })
    .filter(lang => lang.length > 0) // Enlever les chaînes vides
    .filter((lang, index, arr) => arr.indexOf(lang) === index); // Supprimer les doublons
  
  if (cleanedLanguages.length === 0) {
    return 'Non renseigné';
  }
  
  return cleanedLanguages.join(', ');
};

export default function FourmizPreviewScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [criteriaData, setCriteriaData] = useState<any>(null);
  const [references, setReferences] = useState<any[]>([]);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]); // 🆕 CATÉGORIES DEPUIS SUPABASE
  
  // ✅ SUPPRESSION DE fourmizCompletionRate
  const [unifiedStats, setUnifiedStats] = useState<any>({
    fourmizMissions: 0,
    fourmizRating: null,
    fourmizHasRating: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true); // 🆕 LOADING CATÉGORIES
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ====================================
  // 🆕 CHARGEMENT DES CATÉGORIES DEPUIS SUPABASE
  // ====================================

  const loadServiceCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      console.log('🔍 Chargement des catégories pour fourmiz-preview...');

      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('categorie')
        .not('categorie', 'is', null);

      if (servicesError) {
        console.error('❌ Erreur chargement catégories:', servicesError);
        throw servicesError;
      }

      if (!servicesData || servicesData.length === 0) {
        console.error('❌ Aucune donnée catégories récupérée');
        setServiceCategories([]);
        return;
      }

      // Extraire les catégories uniques
      const uniqueCategories = new Set<string>();
      const categoryCount = new Map<string, number>();

      servicesData.forEach(service => {
        if (service.categorie && service.categorie.trim() !== '') {
          const cleanedCategory = service.categorie.trim();
          uniqueCategories.add(cleanedCategory);
          categoryCount.set(cleanedCategory, (categoryCount.get(cleanedCategory) || 0) + 1);
        }
      });

      // Créer les catégories finales
      const categories = Array.from(uniqueCategories)
        .map(categorie => {
          let key = categorie.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[àáâãäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[ç]/g, 'c')
            .replace(/[^a-z0-9_]/g, '');
          
          if (!key || key.trim() === '') {
            key = `service_${Math.random().toString(36).substr(2, 9)}`;
          }
          
          return {
            key,
            categorie,
            count: categoryCount.get(categorie) || 0
          };
        })
        .filter(cat => cat.key && cat.categorie)
        .sort((a, b) => a.categorie.localeCompare(b.categorie));

      setServiceCategories(categories);
      console.log('✅ Catégories chargées pour preview:', categories.length);

    } catch (error) {
      console.error('💥 Erreur critique chargement catégories:', error);
      setServiceCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // ====================================
  // CHARGEMENT DES DONNÉES
  // ====================================

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user?.id) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select(`
            *,
            missions_completed,
            fourmiz_rating,
            fourmiz_has_real_rating
          `)
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Erreur chargement profil:', error);
          setError('Erreur de chargement du profil');
          return;
        }
        
        if (profileData) {
          setProfile(profileData);
          
          // Vérifier si l'utilisateur a le rôle fourmiz
          if (!profileData.roles || !profileData.roles.includes('fourmiz')) {
            setError('Vous devez être fourmiz pour accéder à cette page');
            return;
          }
        }
      }
    } catch (error) {
      console.error('Erreur critique chargement profil:', error);
      setError('Erreur de chargement du profil');
    }
  }, []);

  const loadUserCriteria = useCallback(async () => {
    if (!profile?.user_id) return;
    
    setCriteriaLoading(true);
    try {
      const { data: criteria, error } = await supabase
        .from('criteria')
        .select('*')
        .eq('user_id', profile.user_id)
        .single();
      
      if (error) {
        console.error('Erreur chargement critères:', error);
        setCriteriaData(null);
        return;
      }
      
      setCriteriaData(criteria);
      
    } catch (error) {
      console.error('Erreur critique chargement critères:', error);
      setCriteriaData(null);
    } finally {
      setCriteriaLoading(false);
    }
  }, [profile?.user_id]);

  const loadUserReferences = useCallback(async () => {
    if (!profile?.user_id) return;
    
    setReferencesLoading(true);
    try {
      const { data: refs, error } = await supabase
        .from('user_references')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erreur chargement références:', error);
        setReferences([]);
        return;
      }
      
      setReferences(refs || []);
      
    } catch (error) {
      console.error('Erreur critique chargement références:', error);
      setReferences([]);
    } finally {
      setReferencesLoading(false);
    }
  }, [profile?.user_id]);

  // ✅ FONCTION CORRIGÉE : UNIQUEMENT MISSIONS TERMINÉES + SUPPRESSION % RÉUSSITE
  const loadFourmizStats = useCallback(async () => {
    if (!profile?.user_id) return;
    
    try {
      // ✅ CORRECTION : Chargement des missions TERMINÉES UNIQUEMENT
      const { data: fourmizOrders, error: fourmizOrdersError } = await supabase
        .from('orders')
        .select('id, proposed_amount, status')
        .eq('fourmiz_id', profile.user_id)
        .eq('status', 'terminee'); // ✅ FILTRE SUR LES MISSIONS TERMINÉES

      let newStats = {
        fourmizMissions: 0,
        fourmizRating: null,
        fourmizHasRating: false,
        // ✅ SUPPRESSION DE fourmizCompletionRate
      };

      if (!fourmizOrdersError && fourmizOrders) {
        // ✅ fourmizMissions = nombre de missions terminées
        newStats.fourmizMissions = fourmizOrders.length;
        // ✅ SUPPRESSION DU CALCUL DU COMPLETION RATE
      }

      // Récupérer les ratings depuis le profil
      if (profile.fourmiz_has_real_rating && profile.fourmiz_rating) {
        newStats.fourmizRating = parseFloat(profile.fourmiz_rating);
        newStats.fourmizHasRating = true;
      }

      setUnifiedStats(newStats);
      
    } catch (error) {
      console.error('Erreur chargement stats fourmiz:', error);
    }
  }, [profile?.user_id, profile?.fourmiz_has_real_rating, profile?.fourmiz_rating]);

  // ====================================
  // EFFECTS
  // ====================================

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await loadServiceCategories(); // 🆕 CHARGER CATÉGORIES EN PREMIER
      await loadProfile();
      setLoading(false);
    };
    
    initializeData();
  }, [loadProfile, loadServiceCategories]);

  useEffect(() => {
    if (profile?.user_id) {
      loadUserCriteria();
      loadUserReferences();
      loadFourmizStats();
    }
  }, [profile?.user_id, loadUserCriteria, loadUserReferences, loadFourmizStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadServiceCategories(); // 🆕 RECHARGER CATÉGORIES
    await loadProfile();
    if (profile?.user_id) {
      await loadUserCriteria();
      await loadUserReferences();
      await loadFourmizStats();
    }
    setRefreshing(false);
  }, [loadProfile, loadServiceCategories, profile?.user_id, loadUserCriteria, loadUserReferences, loadFourmizStats]);

  // ====================================
  // HANDLERS
  // ====================================

  const handleGoToCriteria = useCallback(() => {
    router.push('/criteria');
  }, []);

  const handleGoToReferences = useCallback(() => {
    router.push('/references');
  }, []);

  // ====================================
  // RENDER
  // ====================================

  if (loading || categoriesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement de votre fiche...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={32} color="#333333" />
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/(tabs)/profile')}>
            <Text style={styles.retryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={32} color="#666666" />
          <Text style={styles.errorTitle}>Profil non trouvé</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/(tabs)/profile')}>
            <Text style={styles.retryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile?.firstname && profile?.lastname 
    ? `${profile.firstname} ${profile.lastname}` 
    : profile?.firstname || user?.email || 'Utilisateur';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/profile')}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Ma fiche fourmiz</Text>
        </View>
        
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#000000']}
            tintColor="#000000"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Votre fiche de présentation</Text>
          <Text style={styles.introText}>
            Voici comment les clients voient votre profil lorsqu'ils recherchent un fourmiz. 
            Cette fiche est générée automatiquement à partir de vos critères configurés.
          </Text>
        </View>

        {/* Fiche de présentation complète */}
        <View style={styles.previewCard}>
          {/* Header fourmiz - UNIQUEMENT PHOTO + NOM */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {profile.avatar_url ? (
                <Image 
                  source={{ uri: profile.avatar_url }} 
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {profile.firstname ? profile.firstname.charAt(0).toUpperCase() : '👤'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.profileName}>{displayName}</Text>
          </View>
          
          {criteriaLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#000000" />
              <Text style={styles.loadingText}>Chargement des critères...</Text>
            </View>
          ) : criteriaData ? (
            <>
              {/* 🆕 DESCRIPTION - BIO */}
              {criteriaData.presentation && criteriaData.presentation.trim() && (
                <View style={styles.previewSection}>
                  <View style={styles.previewSectionHeader}>
                    <Ionicons name="document-text-outline" size={18} color="#000000" />
                    <Text style={styles.previewSectionTitle}>Description - Bio</Text>
                  </View>
                  <Text style={styles.previewBioText}>
                    {criteriaData.presentation}
                  </Text>
                </View>
              )}

              {/* Rating fourmiz */}
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <Ionicons name="star" size={18} color="#FFD700" />
                  <Text style={styles.previewSectionTitle}>Évaluation</Text>
                </View>
                <Text style={styles.previewSectionContent}>
                  {unifiedStats.fourmizHasRating && unifiedStats.fourmizRating
                    ? `${unifiedStats.fourmizRating.toFixed(1)}/5 étoiles`
                    : 'Nouveau fourmiz - Pas encore d\'avis'
                  }
                </Text>
              </View>

              {/* ✅ EXPÉRIENCE CORRIGÉE : MISSIONS TERMINÉES UNIQUEMENT + SUPPRESSION % RÉUSSITE */}
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <Ionicons name="construct-outline" size={18} color="#000000" />
                  <Text style={styles.previewSectionTitle}>Expérience</Text>
                </View>
                <Text style={styles.previewSectionContent}>
                  {unifiedStats.fourmizMissions > 0 
                    ? `${unifiedStats.fourmizMissions} missions terminées`
                    : 'Aucune mission terminée pour le moment'
                  }
                </Text>
              </View>

              {/* Ville */}
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <Ionicons name="location-outline" size={18} color="#000000" />
                  <Text style={styles.previewSectionTitle}>Localisation</Text>
                </View>
                <Text style={styles.previewSectionContent}>
                  {profile.city || 'Ville non renseignée'}
                </Text>
              </View>
              
              {/* Services proposés - 🆕 CONNECTÉ À SUPABASE */}
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <Ionicons name="briefcase-outline" size={18} color="#000000" />
                  <Text style={styles.previewSectionTitle}>Services proposés</Text>
                </View>
                <Text style={styles.previewSectionContent}>
                  {formatServiceTypes(criteriaData.service_types, serviceCategories)}
                </Text>
              </View>
              
              {/* Transport */}
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <Ionicons name="car-outline" size={18} color="#000000" />
                  <Text style={styles.previewSectionTitle}>Transport</Text>
                </View>
                <Text style={styles.previewSectionContent}>
                  {formatVehicleTypes(criteriaData.vehicle_types)}
                  {criteriaData.travel_cost_included && ' • Déplacements inclus'}
                </Text>
              </View>
              
              {/* Équipements */}
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <Ionicons name="construct-outline" size={18} color="#000000" />
                  <Text style={styles.previewSectionTitle}>Équipements</Text>
                </View>
                <Text style={styles.previewSectionContent}>
                  {formatEquipments(criteriaData.equipment_provided, criteriaData.specialized_equipment)}
                </Text>
              </View>
              
              {/* Sécurité */}
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#000000" />
                  <Text style={styles.previewSectionTitle}>Sécurité</Text>
                </View>
                <View style={styles.previewSecurityItems}>
                  {/* Identité toujours vérifiée */}
                  <View style={styles.previewSecurityItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#000000" />
                    <Text style={styles.previewSecurityText}>Identité vérifiée</Text>
                  </View>
                  
                  {/* Assurance RC conditionnelle */}
                  {criteriaData.has_liability_insurance && (
                    <View style={styles.previewSecurityItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#000000" />
                      <Text style={styles.previewSecurityText}>Assurance RC</Text>
                    </View>
                  )}
                </View>
              </View>
              
              {/* Langues - ✅ CORRECTION : Utilisation de formatSpokenLanguages */}
              {criteriaData.spoken_languages && criteriaData.spoken_languages.length > 0 && (
                <View style={styles.previewSection}>
                  <View style={styles.previewSectionHeader}>
                    <Ionicons name="language-outline" size={18} color="#000000" />
                    <Text style={styles.previewSectionTitle}>Langues</Text>
                  </View>
                  <Text style={styles.previewSectionContent}>
                    {formatSpokenLanguages(criteriaData.spoken_languages)}
                  </Text>
                </View>
              )}
              
              {/* 🆕 Formation & spécialités AVEC CERTIFICATIONS */}
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <Ionicons name="school-outline" size={18} color="#000000" />
                  <Text style={styles.previewSectionTitle}>Formation & spécialités</Text>
                </View>
                
                {/* Années d'expérience */}
                {criteriaData.years_experience && criteriaData.years_experience.trim() && (
                  <Text style={styles.previewSectionContent}>
                    Expérience : {criteriaData.years_experience}
                  </Text>
                )}
                
                {/* 🆕 CERTIFICATIONS ET DIPLÔMES */}
                {criteriaData.certifications && criteriaData.certifications.trim() && (
                  <Text style={styles.previewCertifications}>
                    Certifications : {criteriaData.certifications}
                  </Text>
                )}
                
                {/* Spécialités */}
                {criteriaData.specialties && criteriaData.specialties.trim() && (
                  <Text style={styles.previewSpecialties}>
                    Spécialités : {criteriaData.specialties}
                  </Text>
                )}

                {/* Message par défaut si aucune info */}
                {(!criteriaData.years_experience || !criteriaData.years_experience.trim()) &&
                 (!criteriaData.certifications || !criteriaData.certifications.trim()) &&
                 (!criteriaData.specialties || !criteriaData.specialties.trim()) && (
                  <Text style={styles.previewSectionContent}>
                    Informations de formation à compléter
                  </Text>
                )}
              </View>
              
            </>
          ) : (
            <View style={styles.noCriteriaContainer}>
              <Ionicons name="information-circle-outline" size={24} color="#666666" />
              <Text style={styles.noCriteriaText}>
                Aucun critère configuré. Complétez votre profil fourmiz pour que les clients puissent voir vos services.
              </Text>
            </View>
          )}

          {/* Section Références */}
          <View style={styles.previewSection}>
            <View style={styles.previewSectionHeader}>
              <Ionicons name="images-outline" size={18} color="#000000" />
              <Text style={styles.previewSectionTitle}>Mes références</Text>
            </View>
            
            {referencesLoading ? (
              <View style={styles.referencesLoading}>
                <ActivityIndicator size="small" color="#666666" />
                <Text style={styles.referencesLoadingText}>Chargement...</Text>
              </View>
            ) : references.length > 0 ? (
              <View style={styles.referencesContainer}>
                {references.slice(0, 5).map((ref, index) => (
                  <TouchableOpacity 
                    key={ref.id || index} 
                    style={styles.referenceItem}
                    onPress={() => router.push(`/references/edit/${ref.id}`)}
                    activeOpacity={0.7}
                  >
                    {ref.photo_urls && ref.photo_urls.length > 0 && (
                      <Image 
                        source={{ uri: ref.photo_urls[0] }} 
                        style={styles.referencePhoto}
                      />
                    )}
                    <View style={styles.referenceContent}>
                      <Text style={styles.referenceTitle}>
                        {ref.title || `Référence ${index + 1}`}
                      </Text>
                      {ref.category && (
                        <Text style={styles.referenceCategory}>
                          {ref.category}
                        </Text>
                      )}
                      {ref.description && (
                        <Text style={styles.referenceDescription}>
                          {ref.description.length > 100 
                            ? `${ref.description.substring(0, 100)}...` 
                            : ref.description
                          }
                        </Text>
                      )}
                    </View>
                    <View style={styles.referenceChevron}>
                      <Ionicons name="chevron-forward" size={16} color="#666666" />
                    </View>
                  </TouchableOpacity>
                ))}
                
                {references.length > 5 && (
                  <Text style={styles.moreReferences}>
                    +{references.length - 5} autres références
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.previewSectionContent}>
                Aucune référence ajoutée pour le moment
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleGoToCriteria}
          >
            <Ionicons name="create-outline" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Modifier mes critères</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={handleGoToReferences}
          >
            <Ionicons name="images-outline" size={16} color="#000000" />
            <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
              Gérer mes références
            </Text>
          </TouchableOpacity>
        </View>

        {/* Note */}
        <View style={styles.noteContainer}>
          <Ionicons name="information-circle-outline" size={16} color="#666666" />
          <Text style={styles.noteText}>
            Cette fiche est générée automatiquement à partir de vos critères configurés.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ====================================
// STYLES
// ====================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
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
  
  placeholder: {
    width: 80,
  },
  
  content: {
    flex: 1,
    padding: 24,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    padding: 48,
  },
  
  loadingText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
    textAlign: 'center',
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  
  errorText: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
  
  retryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  
  introSection: {
    marginBottom: 24,
  },
  
  introTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  
  introText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    fontWeight: '400',
  },
  
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 24,
  },
  
  // CARTE DE PROFIL SIMPLIFIÉE - UNIQUEMENT PHOTO + NOM
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  
  avatarContainer: {
    marginBottom: 12,
  },
  
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  
  // SECTIONS DE CONTENU
  previewSection: {
    marginBottom: 20,
  },
  
  previewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  
  previewSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  
  previewSectionContent: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginLeft: 28,
    fontWeight: '400',
  },
  
  // 🆕 STYLE POUR LA BIO
  previewBioText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginLeft: 28,
    fontWeight: '400',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    fontStyle: 'italic',
  },
  
  // 🆕 STYLE POUR LES CERTIFICATIONS
  previewCertifications: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginLeft: 28,
    marginTop: 6,
    fontWeight: '500',
  },
  
  previewSpecialties: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginLeft: 28,
    marginTop: 4,
    fontWeight: '400',
  },
  
  previewSecurityItems: {
    marginLeft: 28,
    gap: 8,
  },
  
  previewSecurityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  previewSecurityText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  
  noCriteriaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 16,
  },
  
  noCriteriaText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 18,
  },
  
  referencesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 28,
  },
  
  referencesLoadingText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  
  referencesContainer: {
    marginLeft: 28,
    gap: 16,
  },
  
  referenceItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
    alignItems: 'center',
  },
  
  referencePhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  
  referenceContent: {
    flex: 1,
    gap: 4,
  },
  
  referenceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  
  referenceCategory: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
  },
  
  referenceDescription: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    fontWeight: '400',
  },
  
  referenceChevron: {
    padding: 8,
  },
  
  moreReferences: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  
  actionButtonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '400',
    fontSize: 13,
  },
  
  actionButtonTextSecondary: {
    color: '#000000',
  },
  
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  noteText: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    flex: 1,
    fontWeight: '400',
  },
  
  bottomSpacer: {
    height: 32,
  },
});
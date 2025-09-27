// app/fourmiz-profile-readonly/[fourmizId].tsx - FICHE FOURMIZ EN LECTURE SEULE HARMONISÉE
// Version strictement identique à fourmiz-preview.tsx pour la consultation par les clients
// Design moderne et cohérent avec la fiche de présentation du fourmiz
// 🔧 MODIFIÉ: Navigation conditionnelle au lieu de router.back()
// 🔧 CORRIGÉ: Utilisation de profiles.missions_completed comme source unique (cohérent avec applications.tsx)
// ✅ CORRECTION : Formatage des langues sans nom de pays

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
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

// ====================================
// FONCTIONS HELPER DE FORMATAGE POUR CRITÈRES
// ====================================

// FONCTION CONNECTÉE À SUPABASE POUR LES SERVICES
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

export default function FourmizProfileReadonly() {
  const { fourmizId, from } = useLocalSearchParams<{ fourmizId: string; from?: string }>();
  
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [criteriaData, setCriteriaData] = useState<any>(null);
  const [references, setReferences] = useState<any[]>([]);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [unifiedStats, setUnifiedStats] = useState<any>({
    fourmizMissions: 0,
    fourmizRating: null,
    fourmizHasRating: false,
    fourmizCompletionRate: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔧 NOUVELLE FONCTION DE NAVIGATION CONDITIONNELLE
  const handleBack = useCallback(() => {
    console.log('🔙 Navigation retour depuis fourmiz-profile, source:', from);
    
    switch (from) {
      case 'applications':
        console.log('→ Retour vers applications');
        router.replace('/(tabs)/applications');
        break;
      case 'map':
        console.log('→ Retour vers map');
        router.replace('/(tabs)/map');
        break;
      case 'services':
        console.log('→ Retour vers services');
        router.replace('/(tabs)/services');
        break;
      case 'orders':
        console.log('→ Retour vers orders');
        router.replace('/(tabs)/orders');
        break;
      default:
        // Fallback intelligent : essayer de détecter la source ou aller vers applications
        console.log('→ Fallback vers applications (source par défaut)');
        router.replace('/(tabs)/applications');
        break;
    }
  }, [from]);

  // ====================================
  // CHARGEMENT DES CATÉGORIES DEPUIS SUPABASE
  // ====================================

  const loadServiceCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      console.log('🔍 Chargement des catégories pour fourmiz-readonly...');

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
      console.log('✅ Catégories chargées pour readonly:', categories.length);

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
    if (!fourmizId) {
      setError('Aucun identifiant fourmiz fourni');
      return;
    }
    
    try {
      console.log('🔄 Chargement profil fourmiz readonly:', fourmizId);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          *,
          missions_completed,
          fourmiz_rating,
          fourmiz_has_real_rating
        `)
        .eq('user_id', fourmizId)
        .single();
      
      if (error) {
        console.error('Erreur chargement profil:', error);
        setError('Erreur de chargement du profil');
        return;
      }
      
      if (profileData) {
        setProfile(profileData);
        setUser({ id: fourmizId }); // Simuler l'objet user
        
        // Vérifier si l'utilisateur a le rôle fourmiz
        if (!profileData.roles || !profileData.roles.includes('fourmiz')) {
          setError('Ce profil n\'est pas un fourmiz');
          return;
        }
      }
    } catch (error) {
      console.error('Erreur critique chargement profil:', error);
      setError('Erreur de chargement du profil');
    }
  }, [fourmizId]);

  const loadUserCriteria = useCallback(async () => {
    if (!fourmizId) return;
    
    setCriteriaLoading(true);
    try {
      const { data: criteria, error } = await supabase
        .from('criteria')
        .select('*')
        .eq('user_id', fourmizId)
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
  }, [fourmizId]);

  const loadUserReferences = useCallback(async () => {
    if (!fourmizId) return;
    
    setReferencesLoading(true);
    try {
      const { data: refs, error } = await supabase
        .from('user_references')
        .select('*')
        .eq('user_id', fourmizId)
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
  }, [fourmizId]);

  // 🔧 CORRIGÉ: Utilisation de profiles.missions_completed (même source que applications.tsx)
  const loadFourmizStats = useCallback(async () => {
    if (!fourmizId || !profile) return;
    
    try {
      console.log('🔄 Chargement stats depuis profiles.missions_completed (cohérent avec applications.tsx)');

      // SOURCE PRINCIPALE : profiles.missions_completed (même source que applications.tsx)
      let newStats = {
        fourmizMissions: profile.missions_completed || 0,  // ← COHÉRENT avec applications.tsx
        fourmizRating: null,
        fourmizHasRating: false,
        fourmizCompletionRate: 85, // Valeur par défaut ou peut être calculée
      };

      // Récupérer les ratings depuis le profil
      if (profile?.fourmiz_has_real_rating && profile?.fourmiz_rating) {
        newStats.fourmizRating = parseFloat(profile.fourmiz_rating);
        newStats.fourmizHasRating = true;
      }

      console.log('✅ Stats mises à jour depuis profiles.missions_completed:', newStats);
      setUnifiedStats(newStats);
      
    } catch (error) {
      console.error('Erreur chargement stats fourmiz:', error);
      
      // Stats par défaut en cas d'erreur
      setUnifiedStats({
        fourmizMissions: 0,
        fourmizRating: null,
        fourmizHasRating: false,
        fourmizCompletionRate: 0,
      });
    }
  }, [fourmizId, profile]);

  // ====================================
  // EFFECTS
  // ====================================

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await loadServiceCategories();
      await loadProfile();
      setLoading(false);
    };
    
    initializeData();
  }, [loadProfile, loadServiceCategories]);

  useEffect(() => {
    if (fourmizId) {
      loadUserCriteria();
      loadUserReferences();
    }
  }, [fourmizId, loadUserCriteria, loadUserReferences]);

  // Charger les stats après que le profil soit chargé
  useEffect(() => {
    if (profile) {
      loadFourmizStats();
    }
  }, [profile, loadFourmizStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadServiceCategories();
    await loadProfile();
    if (fourmizId) {
      await loadUserCriteria();
      await loadUserReferences();
      // loadFourmizStats sera appelé automatiquement après loadProfile via l'useEffect
    }
    setRefreshing(false);
  }, [loadProfile, loadServiceCategories, fourmizId, loadUserCriteria, loadUserReferences]);

  // ====================================
  // RENDER
  // ====================================

  if (loading || categoriesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
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
          <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
            <Text style={styles.retryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile?.firstname && profile?.lastname 
    ? `${profile.firstname} ${profile.lastname}` 
    : profile?.firstname || profile?.email || 'Utilisateur';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profil fourmiz</Text>
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
              {/* DESCRIPTION - BIO */}
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

              {/* Nombre de missions */}
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <Ionicons name="construct-outline" size={18} color="#000000" />
                  <Text style={styles.previewSectionTitle}>Expérience</Text>
                </View>
                <Text style={styles.previewSectionContent}>
                  {unifiedStats.fourmizMissions} missions réalisées
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
              
              {/* Services proposés - CONNECTÉ À SUPABASE */}
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
              
              {/* Formation & spécialités AVEC CERTIFICATIONS */}
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
                
                {/* CERTIFICATIONS ET DIPLÔMES */}
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
                Aucun critère configuré. Ce fourmiz doit compléter son profil.
              </Text>
            </View>
          )}

          {/* Section Références */}
          <View style={styles.previewSection}>
            <View style={styles.previewSectionHeader}>
              <Ionicons name="images-outline" size={18} color="#000000" />
              <Text style={styles.previewSectionTitle}>Portfolio</Text>
            </View>
            
            {referencesLoading ? (
              <View style={styles.referencesLoading}>
                <ActivityIndicator size="small" color="#666666" />
                <Text style={styles.referencesLoadingText}>Chargement...</Text>
              </View>
            ) : references.length > 0 ? (
              <View style={styles.referencesContainer}>
                {references.slice(0, 10).map((ref, index) => (
                  <View 
                    key={ref.id || index} 
                    style={styles.referenceItem}
                  >
                    {ref.photo_urls && ref.photo_urls.length > 0 && (
                      <Image 
                        source={{ uri: ref.photo_urls[0] }} 
                        style={styles.referencePhoto}
                      />
                    )}
                    <View style={styles.referenceContent}>
                      <Text style={styles.referenceTitle}>
                        {ref.title || `Portfolio ${index + 1}`}
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
                  </View>
                ))}
                
                {references.length > 10 && (
                  <Text style={styles.moreReferences}>
                    +{references.length - 10} autres références
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.previewSectionContent}>
                Aucun portfolio ajouté pour le moment
              </Text>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ====================================
// STYLES - IDENTIQUES À FOURMIZ-PREVIEW
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
  
  // STYLE POUR LA BIO
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
  
  // STYLE POUR LES CERTIFICATIONS
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
  
  moreReferences: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  
  bottomSpacer: {
    height: 32,
  },
});
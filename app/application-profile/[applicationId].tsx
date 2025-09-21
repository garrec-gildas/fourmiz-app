// app/application-profile/[applicationId].tsx - VERSION MISE À JOUR AVEC VRAIES DONNÉES
// Harmonisé avec les corrections de profile.tsx
// - Chargement des vraies données depuis la table criteria
// - Fonctions de formatage cohérentes
// - Section références avec photos
// - Suppression du prix
// - Amélioration de l'expérience utilisateur

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

// ====================================
// INTERFACES ET TYPES
// ====================================

interface FourmizProfile {
  // Données du profil utilisateur
  id: string;
  profile: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
    bio?: string;
    location?: string;
    city?: string;
  };
  
  // Données de base fourmiz
  fourmiz_rating: number;
  fourmiz_has_real_rating: boolean;
  missions_completed: number;
  response_rate: number;
  last_activity: string;
  experience_years?: number;
  
  // Données criteria (vraies données)
  criteria?: {
    service_types: string[];
    vehicle_types: string[];
    has_driving_license: boolean;
    travel_cost_included: boolean;
    max_distance?: number;
    equipment_provided: string[];
    specialized_equipment: string[];
    has_liability_insurance: boolean;
    identity_verified: boolean;
    years_experience: number;
    specialties?: string;
    spoken_languages: string[];
    availability_schedule?: any;
    urgent_services: boolean;
  };
  
  // Références
  references?: Array<{
    id: string;
    title?: string;
    description?: string;
    photo_url?: string;
    client_name?: string;
  }>;
  
  // Données legacy (gardées pour compatibilité)
  skills?: string[];
  languages?: string[];
  work_zone?: string;
  preferred_missions?: string[];
  portfolio_urls?: string[];
  certifications?: string[];
}

// ====================================
// FONCTIONS DE FORMATAGE (COHÉRENTES AVEC PROFILE.TSX)
// ====================================

const formatServiceTypes = (serviceTypes: string[] | null): string => {
  if (!serviceTypes || !Array.isArray(serviceTypes) || serviceTypes.length === 0) {
    return 'Services non renseignés';
  }
  
  const serviceLabels: { [key: string]: string } = {
    'course': 'Courses',
    'menage': 'Ménage',
    'jardinage': 'Jardinage', 
    'bricolage': 'Bricolage',
    'demenagement': 'Déménagement',
    'livraison': 'Livraison',
    'garde_enfants': 'Garde d\'enfants',
    'garde_animaux': 'Garde d\'animaux',
    'soutien_scolaire': 'Soutien scolaire',
    'informatique': 'Informatique',
    'autre': 'Autres services'
  };
  
  return serviceTypes
    .map(type => serviceLabels[type] || type)
    .join(', ');
};

const formatVehicleTypes = (vehicleTypes: string[] | null): string => {
  if (!vehicleTypes || !Array.isArray(vehicleTypes) || vehicleTypes.length === 0) {
    return 'Non renseigné';
  }
  
  const vehicleLabels: { [key: string]: string } = {
    'pied': 'À pied',
    'velo': 'Vélo',
    'scooter': 'Scooter',
    'voiture': 'Voiture',
    'moto': 'Moto',
    'transport_commun': 'Transports en commun',
    // Legacy support
    'foot': 'À pied',
    'bike': 'Vélo',
    'motorcycle': 'Moto',
    'car': 'Voiture',
    'van': 'Camionnette',
    'truck': 'Camion',
    'public_transport': 'Transport public'
  };
  
  return vehicleTypes
    .map(type => vehicleLabels[type] || type)
    .join(', ');
};

const formatEquipments = (equipmentProvided: string[] | null, specializedEquipment: string[] | null): string => {
  const allEquipments = [];
  
  if (equipmentProvided && Array.isArray(equipmentProvided)) {
    allEquipments.push(...equipmentProvided);
  }
  
  if (specializedEquipment && Array.isArray(specializedEquipment)) {
    allEquipments.push(...specializedEquipment);
  }
  
  if (allEquipments.length === 0) {
    return 'Aucun équipement renseigné';
  }
  
  const equipmentLabels: { [key: string]: string } = {
    'outils_base': 'Outils de base',
    'materiel_nettoyage': 'Matériel de nettoyage',
    'vehicule_transport': 'Véhicule de transport',
    'materiel_jardinage': 'Matériel de jardinage',
    'outils_bricolage': 'Outils de bricolage',
    'materiel_informatique': 'Matériel informatique'
  };
  
  return allEquipments
    .map(eq => equipmentLabels[eq] || eq)
    .join(', ');
};

export default function FourmizProfilePage() {
  const { applicationId } = useLocalSearchParams();
  const [fourmizData, setFourmizData] = useState<FourmizProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [referencesLoading, setReferencesLoading] = useState(false);

  // ====================================
  // CHARGEMENT DES DONNÉES
  // ====================================

  const fetchFourmizProfile = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Chargement du profil fourmiz pour application:', applicationId);
      
      // Étape 1: Charger l'application et le profil de base
      const { data: applicationData, error: appError } = await supabase
        .from('mission_applications')
        .select(`
          *,
          fourmiz:fourmiz_profiles(*),
          profile:profiles(*)
        `)
        .eq('id', applicationId)
        .single();

      if (appError) {
        console.error('❌ Erreur chargement application:', appError);
        throw appError;
      }

      if (!applicationData?.profile) {
        throw new Error('Profil fourmiz non trouvé');
      }

      // Construire l'objet fourmiz de base
      let fourmizProfile: FourmizProfile = {
        id: applicationData.profile.user_id || applicationData.profile.id,
        profile: {
          first_name: applicationData.profile.firstname || applicationData.profile.first_name || '',
          last_name: applicationData.profile.lastname || applicationData.profile.last_name || '',
          avatar_url: applicationData.profile.avatar_url,
          bio: applicationData.profile.bio,
          location: applicationData.profile.city || applicationData.profile.location,
          city: applicationData.profile.city,
        },
        fourmiz_rating: applicationData.profile.fourmiz_rating || 0,
        fourmiz_has_real_rating: applicationData.profile.fourmiz_has_real_rating || false,
        missions_completed: applicationData.profile.missions_completed || 0,
        response_rate: applicationData.profile.response_rate || 100,
        last_activity: applicationData.profile.last_activity || new Date().toISOString(),
        experience_years: applicationData.profile.experience_years || 0,
        
        // Données legacy pour compatibilité
        skills: applicationData.fourmiz?.skills || [],
        languages: applicationData.fourmiz?.languages || [],
        work_zone: applicationData.fourmiz?.work_zone || '',
        preferred_missions: applicationData.fourmiz?.preferred_missions || [],
        portfolio_urls: applicationData.fourmiz?.portfolio_urls || [],
        certifications: applicationData.fourmiz?.certifications || [],
      };

      setFourmizData(fourmizProfile);
      
      // Étape 2: Charger les vraies données critères en parallèle
      await Promise.all([
        loadUserCriteria(applicationData.profile.user_id || applicationData.profile.id),
        loadUserReferences(applicationData.profile.user_id || applicationData.profile.id)
      ]);

    } catch (error) {
      console.error('❌ Erreur lors du chargement du profil fourmiz:', error);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  const loadUserCriteria = useCallback(async (userId: string) => {
    setCriteriaLoading(true);
    try {
      console.log('🔍 Chargement des critères pour userId:', userId);
      
      const { data: criteria, error } = await supabase
        .from('criteria')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.warn('⚠️ Critères non trouvés (normal pour nouveaux comptes):', error.message);
        return;
      }
      
      if (criteria) {
        setFourmizData(prev => prev ? {
          ...prev,
          criteria: criteria
        } : null);
        console.log('✅ Critères chargés:', criteria);
      }
      
    } catch (error) {
      console.warn('❌ Erreur chargement critères:', error);
    } finally {
      setCriteriaLoading(false);
    }
  }, []);

  const loadUserReferences = useCallback(async (userId: string) => {
    setReferencesLoading(true);
    try {
      console.log('🔍 Chargement des références pour userId:', userId);
      
      const { data: refs, error } = await supabase
        .from('user_references')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('⚠️ Références non trouvées:', error.message);
        return;
      }
      
      if (refs && refs.length > 0) {
        setFourmizData(prev => prev ? {
          ...prev,
          references: refs
        } : null);
        console.log('✅ Références chargées:', refs.length);
      }
      
    } catch (error) {
      console.warn('❌ Erreur chargement références:', error);
    } finally {
      setReferencesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (applicationId) {
      fetchFourmizProfile();
    }
  }, [applicationId, fetchFourmizProfile]);

  // ====================================
  // RENDU DES COMPOSANTS
  // ====================================

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!fourmizData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={48} color="#666666" />
          <Text style={styles.errorTitle}>Profil non trouvé</Text>
          <Text style={styles.errorText}>Ce fourmiz n'existe pas ou n'est plus disponible</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const criteria = fourmizData.criteria;
  const references = fourmizData.references || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Fourmiz</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ====================================
            EN-TÊTE DU PROFIL AMÉLIORÉ
            ==================================== */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {fourmizData.profile.avatar_url ? (
                <Image 
                  source={{ uri: fourmizData.profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {fourmizData.profile.first_name?.[0]}{fourmizData.profile.last_name?.[0]}
                  </Text>
                </View>
              )}
              
              {criteria?.identity_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                </View>
              )}
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {fourmizData.profile.first_name} {fourmizData.profile.last_name}
              </Text>
              
              <View style={styles.profileStats}>
                <View style={styles.statItem}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.statText}>
                    {fourmizData.fourmiz_has_real_rating && fourmizData.fourmiz_rating
                      ? `${fourmizData.fourmiz_rating.toFixed(1)}/5`
                      : 'Nouveau'
                    }
                  </Text>
                </View>
                <Text style={styles.statSeparator}>•</Text>
                <Text style={styles.statText}>{fourmizData.missions_completed} missions</Text>
                <Text style={styles.statSeparator}>•</Text>
                <Text style={styles.statText}>{fourmizData.response_rate}% de réponse</Text>
              </View>
              
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={16} color="#666666" />
                <Text style={styles.locationText}>
                  {fourmizData.profile.city || fourmizData.profile.location || 'Ville non renseignée'}
                </Text>
              </View>
              
              {fourmizData.profile.bio && (
                <Text style={styles.bio}>{fourmizData.profile.bio}</Text>
              )}
            </View>
          </View>
        </View>

        {/* ====================================
            SERVICES PROPOSÉS (VRAIES DONNÉES)
            ==================================== */}
        {criteria?.service_types && criteria.service_types.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="briefcase-outline" size={20} color="#000000" />
              <Text style={styles.sectionTitle}>Services proposés</Text>
            </View>
            
            <View style={styles.sectionContent}>
              <View style={styles.badgeContainer}>
                {criteria.service_types.map((service) => (
                  <View key={service} style={styles.badgeSecondary}>
                    <Text style={styles.badgeSecondaryText}>
                      {formatServiceTypes([service]).replace('Services non renseignés', service)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ====================================
            TRANSPORT ET MOBILITÉ (VRAIES DONNÉES)
            ==================================== */}
        {criteria?.vehicle_types && criteria.vehicle_types.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="car-outline" size={20} color="#000000" />
              <Text style={styles.sectionTitle}>Transport et mobilité</Text>
            </View>
            
            <View style={styles.sectionContent}>
              <Text style={styles.subsectionTitle}>Moyens de transport</Text>
              <View style={styles.badgeContainer}>
                {criteria.vehicle_types.map((vehicle) => (
                  <View key={vehicle} style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {formatVehicleTypes([vehicle]).replace('Non renseigné', vehicle)}
                    </Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Permis de conduire</Text>
                <Text style={styles.infoValue}>
                  {criteria.has_driving_license ? '✅ Oui' : '❌ Non'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Frais de déplacement</Text>
                <Text style={styles.infoValue}>
                  {criteria.travel_cost_included ? '✅ Inclus' : '💶 Facturés'}
                </Text>
              </View>

              {criteria.max_distance && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Rayon d'intervention</Text>
                  <Text style={styles.infoValue}>{criteria.max_distance} km</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ====================================
            ÉQUIPEMENTS ET MATÉRIEL (VRAIES DONNÉES)
            ==================================== */}
        {criteria && (criteria.equipment_provided?.length > 0 || criteria.specialized_equipment?.length > 0) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="construct-outline" size={20} color="#000000" />
              <Text style={styles.sectionTitle}>Équipements et matériel</Text>
            </View>
            
            <View style={styles.sectionContent}>
              {criteria.equipment_provided?.length > 0 && (
                <>
                  <Text style={styles.subsectionTitle}>Équipements fournis</Text>
                  <View style={styles.badgeContainer}>
                    {criteria.equipment_provided.map((equipment) => (
                      <View key={equipment} style={styles.badge}>
                        <Text style={styles.badgeText}>{equipment}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              
              {criteria.specialized_equipment?.length > 0 && (
                <>
                  <Text style={styles.subsectionTitle}>Équipements spécialisés</Text>
                  <View style={styles.badgeContainer}>
                    {criteria.specialized_equipment.map((equipment) => (
                      <View key={equipment} style={styles.badgeSecondary}>
                        <Text style={styles.badgeSecondaryText}>{equipment}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* ====================================
            SÉCURITÉ PROFESSIONNELLE (VRAIES DONNÉES)
            ==================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#000000" />
            <Text style={styles.sectionTitle}>Sécurité professionnelle</Text>
          </View>
          
          <View style={styles.sectionContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Assurance RC</Text>
              <Text style={styles.infoValue}>
                {criteria?.has_liability_insurance ? '✅ Couverte' : '❌ Non couverte'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Identité vérifiée</Text>
              <Text style={styles.infoValue}>
                {criteria?.identity_verified ? '✅ Vérifiée' : '⏳ En attente'}
              </Text>
            </View>
          </View>
        </View>

        {/* ====================================
            SPÉCIALITÉS ET EXPÉRIENCE (VRAIES DONNÉES)
            ==================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy-outline" size={20} color="#000000" />
            <Text style={styles.sectionTitle}>Spécialités et expérience</Text>
          </View>
          
          <View style={styles.sectionContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Années d'expérience</Text>
              <Text style={styles.infoValue}>
                {criteria?.years_experience || fourmizData.experience_years || 0} ans
              </Text>
            </View>

            {criteria?.specialties && (
              <>
                <Text style={styles.subsectionTitle}>Spécialités détaillées</Text>
                <Text style={styles.description}>{criteria.specialties}</Text>
              </>
            )}

            {criteria?.spoken_languages && criteria.spoken_languages.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Langues parlées</Text>
                <View style={styles.badgeContainer}>
                  {criteria.spoken_languages.map((language) => (
                    <View key={language} style={styles.badge}>
                      <Text style={styles.badgeText}>{language}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Legacy data - gardé pour compatibilité */}
            {fourmizData.skills && fourmizData.skills.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Compétences additionnelles</Text>
                <View style={styles.badgeContainer}>
                  {fourmizData.skills.map((skill) => (
                    <View key={skill} style={styles.badgeSecondary}>
                      <Text style={styles.badgeSecondaryText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>

        {/* ====================================
            DISPONIBILITÉS (VRAIES DONNÉES)
            ==================================== */}
        {criteria?.availability_schedule && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color="#000000" />
              <Text style={styles.sectionTitle}>Disponibilités</Text>
            </View>
            
            <View style={styles.sectionContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Planning</Text>
                <Text style={styles.infoValue}>Disponible selon planning personnalisé</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Services urgents</Text>
                <Text style={styles.infoValue}>
                  {criteria.urgent_services ? '✅ Acceptés' : '❌ Non acceptés'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ====================================
            RÉFÉRENCES AVEC PHOTOS (NOUVELLES DONNÉES)
            ==================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="images-outline" size={20} color="#000000" />
            <Text style={styles.sectionTitle}>Références</Text>
          </View>
          
          <View style={styles.sectionContent}>
            {referencesLoading ? (
              <View style={styles.referencesLoading}>
                <ActivityIndicator size="small" color="#666666" />
                <Text style={styles.referencesLoadingText}>Chargement des références...</Text>
              </View>
            ) : references.length > 0 ? (
              <View style={styles.referencesContainer}>
                {references.slice(0, 4).map((ref, index) => (
                  <View key={ref.id || index} style={styles.referenceItem}>
                    {ref.photo_url && (
                      <Image 
                        source={{ uri: ref.photo_url }} 
                        style={styles.referencePhoto}
                      />
                    )}
                    <View style={styles.referenceContent}>
                      <Text style={styles.referenceTitle}>
                        {ref.title || `Référence ${index + 1}`}
                      </Text>
                      {ref.description && (
                        <Text style={styles.referenceDescription}>
                          {ref.description.length > 120 
                            ? `${ref.description.substring(0, 120)}...` 
                            : ref.description
                          }
                        </Text>
                      )}
                      {ref.client_name && (
                        <Text style={styles.referenceClient}>
                          — {ref.client_name}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
                
                {references.length > 4 && (
                  <Text style={styles.moreReferences}>
                    +{references.length - 4} autres références disponibles
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.noReferencesText}>
                Aucune référence disponible pour le moment
              </Text>
            )}
          </View>
        </View>

        {/* Portfolio legacy - gardé pour compatibilité */}
        {fourmizData.portfolio_urls && fourmizData.portfolio_urls.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="folder-outline" size={20} color="#000000" />
              <Text style={styles.sectionTitle}>Portfolio</Text>
            </View>
            
            <View style={styles.portfolioContainer}>
              {fourmizData.portfolio_urls.map((url, index) => (
                <Image 
                  key={index}
                  source={{ uri: url }} 
                  style={styles.portfolioImage}
                />
              ))}
            </View>
          </View>
        )}

        {/* ====================================
            ACTIONS (SANS PRIX)
            ==================================== */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryButton}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Choisir ce Fourmiz</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="chatbubble-outline" size={20} color="#000000" />
            <Text style={styles.secondaryButtonText}>Envoyer un message</Text>
          </TouchableOpacity>
        </View>

        {/* Note sur la négociation du prix */}
        <View style={styles.priceNote}>
          <Ionicons name="information-circle-outline" size={16} color="#666666" />
          <Text style={styles.priceNoteText}>
            Les tarifs sont négociés directement avec le Fourmiz selon votre demande spécifique.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ====================================
// STYLES AMÉLIORÉS
// ====================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  
  backButton: {
    padding: 8,
  },
  
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  
  loadingText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  
  errorText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
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
  
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  
  avatarContainer: {
    position: 'relative',
  },
  
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
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
  
  verifiedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#000000',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  
  profileInfo: {
    flex: 1,
  },
  
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  statText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  
  statSeparator: {
    fontSize: 13,
    color: '#cccccc',
  },
  
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  
  locationText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  
  bio: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
    fontWeight: '400',
  },
  
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  
  sectionContent: {
    gap: 12,
  },
  
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
    marginTop: 8,
  },
  
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  badge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  badgeText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },
  
  badgeSecondary: {
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  
  badgeSecondaryText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '400',
  },
  
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  
  infoLabel: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  
  infoValue: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '500',
  },
  
  description: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
    fontWeight: '400',
  },
  
  // Styles pour les références
  referencesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  
  referencesLoadingText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  
  referencesContainer: {
    gap: 12,
  },
  
  referenceItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  
  referencePhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
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
  
  referenceDescription: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    fontWeight: '400',
  },
  
  referenceClient: {
    fontSize: 12,
    color: '#333333',
    fontStyle: 'italic',
    fontWeight: '400',
  },
  
  moreReferences: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  
  noReferencesText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  
  portfolioContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  
  portfolioImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  
  actionsContainer: {
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
  },
  
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  
  priceNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 40,
  },
  
  priceNoteText: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    flex: 1,
    fontWeight: '400',
  },
});
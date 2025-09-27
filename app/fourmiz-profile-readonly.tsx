// app/fourmiz-profile-readonly.tsx - FICHE FOURMIZ EN LECTURE SEULE - VERSION CORRIGÉE
// ✅ CORRECTION : Boucle infinie dans useEffect réparée
// ✅ CORRECTION : Cohérence avec fourmiz-preview (missions terminées uniquement, suppression % réussite)
// Version dédiée pour consultation par les clients (sans boutons de modification)
// Utilise des paramètres de requête au lieu de routes dynamiques

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

// 🛡️ HELPERS DE SÉCURITÉ
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const safeNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// Interfaces
interface UserProfile {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  address?: string;
  postal_code?: string;
  city?: string;
}

interface UserCriteria {
  services: string[];
  zones: string[];
  radius?: number;
  tools?: string[];
  certifications?: string[];
}

interface UserReference {
  id: number;
  client_name: string;
  service_type: string;
  rating: number;
  comment: string;
  photos?: string[];
  created_at: string;
}

// ✅ INTERFACE CORRIGÉE : Suppression completion_rate
interface FourmizStats {
  total_missions: number;
  average_rating: number;
  response_time_avg: number;
  // ✅ SUPPRESSION DE completion_rate
}

const FourmizProfileReadonly = () => {
  const { fourmizId } = useLocalSearchParams<{ fourmizId: string }>();
  
  // États
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [criteria, setCriteria] = useState<UserCriteria | null>(null);
  const [references, setReferences] = useState<UserReference[]>([]);
  const [stats, setStats] = useState<FourmizStats | null>(null);

  // Chargement du profil - ✅ FONCTIONS STABLES
  const loadProfile = useCallback(async () => {
    if (!fourmizId) {
      console.error('❌ Aucun fourmizId fourni');
      Alert.alert('Erreur', 'Aucun ID de Fourmiz fourni');
      return;
    }

    try {
      console.log('🔄 Chargement profil fourmiz:', fourmizId);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', fourmizId)
        .single();

      if (profileError) {
        console.error('❌ Erreur chargement profil:', profileError);
        throw profileError;
      }

      if (!profileData) {
        throw new Error('Profil non trouvé');
      }

      console.log('✅ Profil chargé:', profileData.firstname, profileData.lastname);
      setProfile(profileData);

    } catch (error) {
      console.error('💥 Erreur fatale chargement profil:', error);
      Alert.alert('Erreur', 'Impossible de charger le profil de ce Fourmiz');
    }
  }, []); // ✅ STABLE : Dépendances vides car fourmizId est accessible via closure

  // Chargement des critères - ✅ FONCTIONS STABLES
  const loadCriteria = useCallback(async () => {
    if (!fourmizId) return;

    try {
      console.log('🔄 Chargement critères pour:', fourmizId);

      const { data, error } = await supabase
        .from('criteria')
        .select('*')
        .eq('user_id', fourmizId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Aucun critère configuré pour ce fourmiz');
          setCriteria(null);
          return;
        }
        console.error('❌ Erreur chargement critères:', error);
        throw error;
      }

      console.log('✅ Critères chargés');
      
      // Traitement des données
      const processedCriteria: UserCriteria = {
        services: Array.isArray(data.services) ? data.services : [],
        zones: Array.isArray(data.zones) ? data.zones : [],
        radius: safeNumber(data.radius) || 10,
        tools: Array.isArray(data.tools) ? data.tools : [],
        certifications: Array.isArray(data.certifications) ? data.certifications : []
      };

      setCriteria(processedCriteria);

    } catch (error) {
      console.error('💥 Erreur fatale chargement critères:', error);
    }
  }, []); // ✅ STABLE : Dépendances vides

  // Chargement des références - ✅ FONCTIONS STABLES
  const loadReferences = useCallback(async () => {
    if (!fourmizId) return;

    try {
      console.log('🔄 Chargement références pour:', fourmizId);

      const { data, error } = await supabase
        .from('references')
        .select('*')
        .eq('fourmiz_id', fourmizId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement références:', error);
        throw error;
      }

      console.log('✅ Références chargées:', data?.length || 0);
      setReferences(data || []);

    } catch (error) {
      console.error('💥 Erreur fatale chargement références:', error);
    }
  }, []); // ✅ STABLE : Dépendances vides

  // ✅ FONCTION CORRIGÉE : COHÉRENCE AVEC fourmiz-preview (missions terminées uniquement)
  const loadStats = useCallback(async () => {
    if (!fourmizId) return;

    try {
      console.log('🔄 Chargement stats pour:', fourmizId);

      // ✅ MÉTHODE PRINCIPALE : Compter directement les missions terminées depuis orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, rating, status, fourmiz_id')
        .eq('fourmiz_id', fourmizId)
        .eq('status', 'terminee'); // ✅ UNIQUEMENT LES MISSIONS TERMINÉES

      // Récupération du rating depuis le profil
      const { data: profileStats, error: profileError } = await supabase
        .from('profiles')
        .select('fourmiz_rating, fourmiz_has_real_rating, default_rating')
        .eq('id', fourmizId)
        .single();

      let calculatedStats: FourmizStats;

      if (ordersError) {
        console.error('❌ Erreur chargement orders:', ordersError);
        
        // FALLBACK : Stats par défaut
        calculatedStats = {
          total_missions: 0,
          average_rating: 0,
          response_time_avg: 2.5,
          // ✅ SUPPRESSION DE completion_rate
        };
      } else {
        const orders = ordersData || [];
        const ratings = orders.filter(o => o.rating).map(o => o.rating);

        calculatedStats = {
          total_missions: orders.length, // ✅ NOMBRE DE MISSIONS TERMINÉES UNIQUEMENT
          average_rating: profileError ? 
            (ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0) :
            safeNumber(profileStats?.fourmiz_rating || profileStats?.default_rating) || 0,
          response_time_avg: 2.5,
          // ✅ SUPPRESSION DE completion_rate
        };
      }

      console.log('✅ Statistiques chargées (missions terminées uniquement):', calculatedStats);
      setStats(calculatedStats);

    } catch (error) {
      console.error('💥 Erreur fatale chargement stats:', error);
      
      // Stats par défaut en cas d'erreur totale
      const fallbackStats: FourmizStats = {
        total_missions: 0,
        average_rating: 0,
        response_time_avg: 2.5,
        // ✅ SUPPRESSION DE completion_rate
      };
      setStats(fallbackStats);
    }
  }, []); // ✅ STABLE : Dépendances vides

  // ✅ CORRECTION PRINCIPALE : Chargement initial SANS boucle infinie
  useEffect(() => {
    if (!fourmizId) {
      console.error('❌ fourmizId manquant');
      Alert.alert('Erreur', 'ID Fourmiz manquant');
      setLoading(false);
      return;
    }

    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        loadProfile(),
        loadCriteria(), 
        loadReferences(),
        loadStats()
      ]);
      setLoading(false);
    };

    loadAllData();
  }, [fourmizId]); // ✅ CORRECTION : Seulement fourmizId, pas les fonctions !

  // Fonctions de formatage
  const formatExperience = useCallback((totalMissions: number): string => {
    if (totalMissions === 0) return 'Nouveau';
    if (totalMissions < 5) return 'Débutant';
    if (totalMissions < 20) return 'Expérimenté';
    if (totalMissions < 50) return 'Expert';
    return 'Maître';
  }, []);

  const formatRating = useCallback((rating: number): string => {
    return rating > 0 ? rating.toFixed(1) : 'N/A';
  }, []);

  // Rendu des sections
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#333333" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Profil Fourmiz</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderProfileSection = () => (
    <View style={styles.section}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#6b7280" />
            </View>
          )}
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {safeString(profile?.firstname)} {safeString(profile?.lastname)}
          </Text>
          
          {stats && (
            <View style={styles.profileStats}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.statText}>
                  {formatRating(stats.average_rating)} ({stats.total_missions} missions terminées)
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="shield-checkmark" size={14} color="#10b981" />
                <Text style={styles.statText}>
                  {formatExperience(stats.total_missions)}
                </Text>
              </View>
            </View>
          )}
          
          {profile?.bio && (
            <Text style={styles.profileBio}>{profile.bio}</Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderContactSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Contact</Text>
      
      <View style={styles.contactInfo}>
        <View style={styles.contactItem}>
          <Ionicons name="mail" size={16} color="#6b7280" />
          <Text style={styles.contactText}>{safeString(profile?.email)}</Text>
        </View>
        
        {profile?.address && (
          <View style={styles.contactItem}>
            <Ionicons name="location" size={16} color="#6b7280" />
            <Text style={styles.contactText}>
              {safeString(profile.address)}
              {profile.postal_code && profile.city && 
                `, ${profile.postal_code} ${profile.city}`
              }
            </Text>
          </View>
        )}
        
        <View style={styles.contactNote}>
          <Ionicons name="chatbubble" size={14} color="#6b7280" />
          <Text style={styles.contactNoteText}>
            Communication uniquement par chat dans l'application
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCompetencesSection = () => {
    if (!criteria) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compétences</Text>
        
        {criteria.services.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Services proposés</Text>
            <View style={styles.tagContainer}>
              {criteria.services.map((service, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{service}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {criteria.zones.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Zones d'intervention</Text>
            <View style={styles.tagContainer}>
              {criteria.zones.map((zone, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{zone}</Text>
                </View>
              ))}
            </View>
            {criteria.radius && (
              <Text style={styles.radiusText}>
                Rayon d'intervention : {criteria.radius} km
              </Text>
            )}
          </View>
        )}

        {criteria.tools && criteria.tools.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Équipements disponibles</Text>
            <View style={styles.tagContainer}>
              {criteria.tools.map((tool, index) => (
                <View key={index} style={[styles.tag, styles.toolTag]}>
                  <Ionicons name="construct" size={12} color="#059669" />
                  <Text style={[styles.tagText, { color: '#059669' }]}>{tool}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {criteria.certifications && criteria.certifications.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Certifications</Text>
            <View style={styles.tagContainer}>
              {criteria.certifications.map((cert, index) => (
                <View key={index} style={[styles.tag, styles.certTag]}>
                  <Ionicons name="ribbon" size={12} color="#7c3aed" />
                  <Text style={[styles.tagText, { color: '#7c3aed' }]}>{cert}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderReferencesSection = () => {
    if (references.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Références ({references.length})
        </Text>
        
        {references.map((ref) => (
          <View key={ref.id} style={styles.referenceCard}>
            <View style={styles.referenceHeader}>
              <View style={styles.referenceInfo}>
                <Text style={styles.referenceName}>{ref.client_name}</Text>
                <Text style={styles.referenceService}>{ref.service_type}</Text>
              </View>
              
              <View style={styles.referenceRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= ref.rating ? "star" : "star-outline"}
                    size={14}
                    color={star <= ref.rating ? "#f59e0b" : "#d1d5db"}
                  />
                ))}
              </View>
            </View>
            
            {ref.comment && (
              <Text style={styles.referenceComment}>{ref.comment}</Text>
            )}
            
            {ref.photos && ref.photos.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.photoScroll}
              >
                {ref.photos.map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: photo }}
                    style={styles.referencePhoto}
                  />
                ))}
              </ScrollView>
            )}
            
            <Text style={styles.referenceDate}>
              {new Date(ref.created_at).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // ✅ SECTION STATS CORRIGÉE : Suppression completion_rate
  const renderStatsSection = () => {
    if (!stats) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistiques</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="briefcase" size={24} color="#3b82f6" />
            <Text style={styles.statValue}>{stats.total_missions}</Text>
            <Text style={styles.statLabel}>Missions terminées</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>{formatRating(stats.average_rating)}</Text>
            <Text style={styles.statLabel}>Note moyenne</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>{stats.response_time_avg}h</Text>
            <Text style={styles.statLabel}>Temps de réponse</Text>
          </View>
          
          {/* ✅ SUPPRESSION DE LA CARTE completion_rate */}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Profil non trouvé</Text>
          <Text style={styles.errorText}>
            Ce Fourmiz n'existe pas ou son profil n'est plus disponible.
          </Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {renderHeader()}
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {renderProfileSection()}
        {renderContactSection()}
        {renderCompetencesSection()}
        {renderStatsSection()}
        {renderReferencesSection()}
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 32,
  },
  
  scrollView: {
    flex: 1,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  errorButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  
  // Profil
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 16,
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
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  profileStats: {
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  profileBio: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  
  // Contact
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  contactNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  contactNoteText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#0369a1',
    fontStyle: 'italic',
    flex: 1,
  },
  
  // Compétences
  subsection: {
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  toolTag: {
    backgroundColor: '#ecfdf5',
  },
  certTag: {
    backgroundColor: '#f3e8ff',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
  },
  radiusText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  
  // Statistiques
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  
  // Références
  referenceCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  referenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  referenceInfo: {
    flex: 1,
  },
  referenceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  referenceService: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  referenceRating: {
    flexDirection: 'row',
    gap: 2,
  },
  referenceComment: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
    marginBottom: 12,
  },
  photoScroll: {
    marginBottom: 12,
  },
  referencePhoto: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 8,
  },
  referenceDate: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'right',
  },
  
  bottomSpacer: {
    height: 32,
  },
});

export default FourmizProfileReadonly;
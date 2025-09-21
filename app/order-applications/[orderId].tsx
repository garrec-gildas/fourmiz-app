// app/order-applications/[orderId].tsx - VERSION ÉPURÉE AVEC FICHES DE PRÉSENTATION
// Style harmonisé avec profile.tsx - Interface simplifiée et claire
// - Liste simple des candidats avec accordéons
// - Focus uniquement sur les fiches de présentation
// - Design épuré et cohérent

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

// ====================================
// INTERFACES SIMPLIFIÉES
// ====================================

interface FourmizPresentation {
  id: string;
  user_id: string;
  custom_description?: string;
  strengths?: string;
  specializations?: string[];
  work_examples?: string[];
  availability_details?: string;
  pricing_info?: string;
  certifications?: string[];
  portfolio_images?: string[];
  created_at: string;
  updated_at: string;
}

interface OrderApplication {
  id: number;
  fourmiz_id: string;
  motivation_message: string;
  status: 'en_attente' | 'acceptee' | 'refusee';
  applied_at: string;
  
  fourmiz_profile: {
    id: string;
    firstname: string;
    lastname: string;
    avatar_url: string;
    bio: string;
    fourmiz_rating: number;
    fourmiz_has_real_rating: boolean;
    missions_completed: number;
    availability_status: string;
    last_seen: string;
  };
  
  presentation?: FourmizPresentation;
}

interface OrderDetails {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  proposed_amount: number;
  status: string;
}

const AVAILABILITY_STATUS = {
  'available': { label: 'Disponible', color: '#22c55e', bgColor: '#f0fdf4' },
  'busy': { label: 'Occupé', color: '#f59e0b', bgColor: '#fffbeb' },
  'offline': { label: 'Hors ligne', color: '#6b7280', bgColor: '#f9fafb' }
};

export default function OrderApplicationsScreen() {
  const { orderId } = useLocalSearchParams();
  const [applications, setApplications] = useState<OrderApplication[]>([]);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // États pour accordéons
  const [expandedApplications, setExpandedApplications] = useState<Set<number>>(new Set());

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (!user) {
          Alert.alert(
            'Connexion requise',
            'Vous devez être connecté pour voir les candidatures.',
            [{ text: 'OK', onPress: () => router.push('/auth/login') }]
          );
          return;
        }
        
        setCurrentUser(user);
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de vérifier votre connexion');
      }
    };
    
    getUser();
  }, []);

  useEffect(() => {
    if (currentUser && orderId) {
      loadApplications();
    }
  }, [currentUser, orderId]);

  const loadApplications = async () => {
    try {
      setLoading(true);

      // Vérifier la commande
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          description,
          date,
          address,
          postal_code,
          city,
          proposed_amount,
          status,
          client_id,
          services (title)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      if (!orderData) {
        throw new Error(`Commande ${orderId} introuvable`);
      }

      if (orderData.client_id !== currentUser.id) {
        Alert.alert(
          'Accès refusé',
          'Vous n\'êtes pas autorisé à consulter ces candidatures.',
          [{ text: 'Retour', onPress: () => router.back() }]
        );
        return;
      }

      const formattedOrder: OrderDetails = {
        id: orderData.id,
        title: orderData.services?.title || 'Service non spécifié',
        description: orderData.description,
        date: orderData.date,
        location: `${orderData.address}, ${orderData.postal_code} ${orderData.city}`,
        proposed_amount: orderData.proposed_amount,
        status: orderData.status
      };

      setOrderDetails(formattedOrder);

      // Charger les candidatures
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('order_applications')
        .select(`
          id,
          fourmiz_id,
          motivation_message,
          status,
          applied_at,
          fourmiz_profile:profiles!fourmiz_id (
            id,
            user_id,
            firstname,
            lastname,
            avatar_url,
            bio,
            fourmiz_rating,
            fourmiz_has_real_rating,
            missions_completed,
            availability_status,
            last_seen
          )
        `)
        .eq('order_id', orderId)
        .order('applied_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      setApplications(applicationsData || []);

      // Charger les fiches de présentation
      if (applicationsData && applicationsData.length > 0) {
        await loadPresentations(applicationsData);
      }

    } catch (error) {
      Alert.alert(
        'Erreur de chargement',
        `Impossible de charger les candidatures.\n\n${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        [
          { text: 'Réessayer', onPress: () => loadApplications() },
          { text: 'Retour', onPress: () => router.back() }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPresentations = async (applicationsData: any[]) => {
    try {
      const userIds = applicationsData
        .map(app => app.fourmiz_profile?.user_id)
        .filter(Boolean);

      if (userIds.length === 0) return;

      const { data: presentationsData, error: presentationsError } = await supabase
        .from('fourmiz_presentations')
        .select('*')
        .in('user_id', userIds);

      if (presentationsError) {
        console.warn('Erreur chargement fiches de présentation:', presentationsError.message);
        return;
      }

      const enrichedApplications = applicationsData.map(app => {
        const userId = app.fourmiz_profile?.user_id;
        const presentation = presentationsData?.find(p => p.user_id === userId);

        return {
          ...app,
          presentation: presentation || null
        };
      });

      setApplications(enrichedApplications);

    } catch (error) {
      console.error('Erreur critique chargement présentations:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadApplications();
  };

  const toggleExpanded = (applicationId: number) => {
    const newExpanded = new Set(expandedApplications);
    if (newExpanded.has(applicationId)) {
      newExpanded.delete(applicationId);
    } else {
      newExpanded.add(applicationId);
    }
    setExpandedApplications(newExpanded);
  };

  const handleAction = async (applicationId: number, action: 'accept' | 'reject') => {
    const actionText = action === 'accept' ? 'accepter' : 'refuser';

    Alert.alert(
      `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} cette candidature`,
      `Êtes-vous sûr de vouloir ${actionText} cette candidature ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              const status = action === 'accept' ? 'acceptee' : 'refusee';
              const { error } = await supabase
                .from('order_applications')
                .update({ 
                  status,
                  selected_at: action === 'accept' ? new Date().toISOString() : null
                })
                .eq('id', applicationId);

              if (error) throw error;

              if (action === 'accept') {
                const acceptedApp = applications.find(app => app.id === applicationId);
                if (acceptedApp) {
                  const { error: orderError } = await supabase
                    .from('orders')
                    .update({
                      fourmiz_id: acceptedApp.fourmiz_id,
                      status: 'acceptee',
                      accepted_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', orderId);

                  if (orderError) throw orderError;
                }
              }

              loadApplications();
              Alert.alert('Succès', `Candidature ${action === 'accept' ? 'acceptée' : 'refusée'}`);

            } catch (error) {
              Alert.alert('Erreur', `Impossible de ${actionText} la candidature`);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'En ligne';
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}j`;
  };

  const renderStars = (rating: number, hasRating: boolean) => {
    if (!hasRating) {
      return (
        <View style={styles.starsContainer}>
          <Text style={styles.noRatingText}>Nouveau</Text>
        </View>
      );
    }

    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={12}
          color={i <= rating ? "#000000" : "#e0e0e0"}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderApplicationCard = (application: OrderApplication) => {
    const isExpanded = expandedApplications.has(application.id);
    const availabilityConfig = AVAILABILITY_STATUS[application.fourmiz_profile.availability_status as keyof typeof AVAILABILITY_STATUS] || AVAILABILITY_STATUS.offline;
    const presentation = application.presentation;

    return (
      <View
        key={application.id}
        style={[
          styles.applicationCard,
          application.status === 'acceptee' && styles.applicationCardAccepted,
          application.status === 'refusee' && styles.applicationCardRejected,
          isExpanded && styles.applicationCardExpanded
        ]}
      >
        {/* Header cliquable */}
        <TouchableOpacity
          onPress={() => toggleExpanded(application.id)}
          style={styles.cardHeader}
          activeOpacity={0.7}
        >
          {/* Statut */}
          <View style={styles.statusSection}>
            {application.status === 'acceptee' && (
              <View style={styles.statusBadgeAccepted}>
                <Ionicons name="checkmark-circle" size={12} color="#ffffff" />
                <Text style={styles.statusBadgeText}>Acceptée</Text>
              </View>
            )}
            {application.status === 'refusee' && (
              <View style={styles.statusBadgeRejected}>
                <Ionicons name="close-circle" size={12} color="#ffffff" />
                <Text style={styles.statusBadgeText}>Refusée</Text>
              </View>
            )}
            {application.status === 'en_attente' && (
              <View style={styles.statusBadgePending}>
                <Ionicons name="time" size={12} color="#666666" />
                <Text style={styles.statusBadgeText}>En attente</Text>
              </View>
            )}
            
            <Text style={styles.applicationDate}>
              {formatDate(application.applied_at)}
            </Text>
          </View>

          {/* Profil fourmiz */}
          <View style={styles.profileSection}>
            {application.fourmiz_profile.avatar_url ? (
              <Image 
                source={{ uri: application.fourmiz_profile.avatar_url }}
                style={styles.profileAvatar}
              />
            ) : (
              <View style={styles.profileAvatarPlaceholder}>
                <Ionicons name="person" size={20} color="#666666" />
              </View>
            )}
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {application.fourmiz_profile.firstname} {application.fourmiz_profile.lastname}
              </Text>
              
              <View style={styles.profileStats}>
                {renderStars(
                  application.fourmiz_profile.fourmiz_rating || 0, 
                  application.fourmiz_profile.fourmiz_has_real_rating
                )}
                <Text style={styles.ratingText}>
                  {application.fourmiz_profile.fourmiz_has_real_rating 
                    ? `${(application.fourmiz_profile.fourmiz_rating || 0).toFixed(1)}/5`
                    : 'Nouveau'
                  } • {application.fourmiz_profile.missions_completed} missions
                </Text>
              </View>

              <View style={styles.profileIndicators}>
                <View style={[styles.availabilityBadge, { backgroundColor: availabilityConfig.bgColor }]}>
                  <View style={[styles.availabilityDot, { backgroundColor: availabilityConfig.color }]} />
                  <Text style={[styles.availabilityText, { color: availabilityConfig.color }]}>
                    {formatLastSeen(application.fourmiz_profile.last_seen)}
                  </Text>
                </View>
                
                {presentation && (
                  <View style={styles.hasPresentationBadge}>
                    <Ionicons name="card-outline" size={10} color="#000000" />
                    <Text style={styles.hasPresentationText}>Fiche complète</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.expandIcon}>
              <Ionicons 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#666666" 
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Contenu accordéon : Fiche de présentation */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.expandedDivider} />

            {presentation ? (
              <View style={styles.presentationSection}>
                <View style={styles.presentationHeader}>
                  <Ionicons name="card-outline" size={16} color="#000000" />
                  <Text style={styles.presentationTitle}>Fiche de présentation</Text>
                </View>

                {presentation.custom_description && (
                  <View style={styles.presentationBlock}>
                    <Text style={styles.presentationBlockTitle}>Présentation</Text>
                    <Text style={styles.presentationBlockContent}>
                      {presentation.custom_description}
                    </Text>
                  </View>
                )}

                {presentation.strengths && (
                  <View style={styles.presentationBlock}>
                    <Text style={styles.presentationBlockTitle}>Points forts</Text>
                    <Text style={styles.presentationBlockContent}>
                      {presentation.strengths}
                    </Text>
                  </View>
                )}

                {presentation.specializations && presentation.specializations.length > 0 && (
                  <View style={styles.presentationBlock}>
                    <Text style={styles.presentationBlockTitle}>Spécialisations</Text>
                    <View style={styles.specializationsContainer}>
                      {presentation.specializations.map((spec, index) => (
                        <View key={index} style={styles.specializationTag}>
                          <Text style={styles.specializationText}>{spec}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {presentation.availability_details && (
                  <View style={styles.presentationBlock}>
                    <Text style={styles.presentationBlockTitle}>Disponibilités</Text>
                    <Text style={styles.presentationBlockContent}>
                      {presentation.availability_details}
                    </Text>
                  </View>
                )}

                {presentation.certifications && presentation.certifications.length > 0 && (
                  <View style={styles.presentationBlock}>
                    <Text style={styles.presentationBlockTitle}>Certifications</Text>
                    <View style={styles.certificationsContainer}>
                      {presentation.certifications.map((cert, index) => (
                        <View key={index} style={styles.certificationItem}>
                          <Ionicons name="ribbon-outline" size={14} color="#000000" />
                          <Text style={styles.certificationText}>{cert}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {presentation.portfolio_images && presentation.portfolio_images.length > 0 && (
                  <View style={styles.presentationBlock}>
                    <Text style={styles.presentationBlockTitle}>Portfolio</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.portfolioScroll}
                    >
                      {presentation.portfolio_images.map((imageUrl, index) => (
                        <Image 
                          key={index}
                          source={{ uri: imageUrl }}
                          style={styles.portfolioImage}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noPresentationInfo}>
                <Ionicons name="document-text-outline" size={24} color="#cccccc" />
                <Text style={styles.noPresentationText}>
                  Ce fourmiz n'a pas encore créé sa fiche de présentation
                </Text>
              </View>
            )}

            {/* Message motivation */}
            <View style={styles.motivationSection}>
              <Text style={styles.motivationTitle}>Message de motivation</Text>
              <Text style={styles.motivationContent}>
                {application.motivation_message}
              </Text>
            </View>

            {/* Actions */}
            {application.status === 'en_attente' && (
              <View style={styles.actionsSection}>
                <TouchableOpacity 
                  style={styles.viewProfileButton}
                  onPress={() => router.push(`/application-profile/${application.id}`)}
                >
                  <Ionicons name="person-outline" size={16} color="#000000" />
                  <Text style={styles.viewProfileText}>Voir le profil détaillé</Text>
                </TouchableOpacity>

                <View style={styles.decisionButtons}>
                  <TouchableOpacity 
                    style={styles.rejectButton}
                    onPress={() => handleAction(application.id, 'reject')}
                  >
                    <Ionicons name="close" size={16} color="#666666" />
                    <Text style={styles.rejectButtonText}>Refuser</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.acceptButton}
                    onPress={() => handleAction(application.id, 'accept')}
                  >
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                    <Text style={styles.acceptButtonText}>Accepter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Candidatures' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement des candidatures...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orderDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Commande introuvable' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color="#666666" />
          <Text style={styles.errorTitle}>Commande introuvable</Text>
          <Text style={styles.errorText}>
            Cette commande n'existe pas ou vous n'avez pas l'autorisation de la consulter.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: `${applications.length} candidature${applications.length > 1 ? 's' : ''}`,
          headerTitleStyle: { fontSize: 16, fontWeight: '600' }
        }} 
      />

      {/* Header avec détails commande */}
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle}>{orderDetails.title}</Text>
        <Text style={styles.orderDetails}>
          {orderDetails.location}
        </Text>
        <Text style={styles.orderDate}>
          {new Date(orderDetails.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })} • Budget indicatif : {orderDetails.proposed_amount}€
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {applications.length > 0 ? (
          <View style={styles.applicationsList}>
            <Text style={styles.listTitle}>
              Appuyez sur une candidature pour voir la fiche de présentation
            </Text>
            {applications.map(renderApplicationCard)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#cccccc" />
            <Text style={styles.emptyTitle}>Aucune candidature</Text>
            <Text style={styles.emptySubtitle}>
              Cette mission n'a pas encore reçu de candidatures.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ====================================
// STYLES ÉPURÉS INSPIRÉS DE PROFILE.TSX
// ====================================

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },

  // États de chargement
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { 
    fontSize: 13, 
    color: '#666666',
    fontWeight: '400',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  errorTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#000000' 
  },
  errorText: { 
    fontSize: 13, 
    color: '#666666', 
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },

  // Header commande
  orderHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  orderDetails: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },

  scrollView: { 
    flex: 1 
  },
  applicationsList: { 
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  listTitle: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Carte candidature - Style épuré
  applicationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  applicationCardAccepted: {
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  applicationCardRejected: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    opacity: 0.7,
  },
  applicationCardExpanded: {
    borderColor: '#000000',
    borderWidth: 2,
  },

  // Header carte
  cardHeader: {
    padding: 20,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadgeAccepted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  statusBadgeRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  applicationDate: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },

  // Section profil
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  profileAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: { 
    flex: 1,
    gap: 6,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  noRatingText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '400',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },
  profileIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  availabilityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  hasPresentationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  hasPresentationText: {
    fontSize: 10,
    color: '#000000',
    fontWeight: '600',
  },
  expandIcon: {
    padding: 4,
  },

  // Contenu accordéon
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 20,
  },

  // Fiche de présentation - Style épuré
  presentationSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  presentationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  presentationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  presentationBlock: {
    marginBottom: 16,
  },
  presentationBlockTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  presentationBlockContent: {
    fontSize: 13,
    color: '#000000',
    lineHeight: 18,
    fontWeight: '400',
  },
  specializationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specializationTag: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  specializationText: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '600',
  },
  certificationsContainer: {
    gap: 8,
  },
  certificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  certificationText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
  },
  portfolioScroll: {
    marginTop: 8,
  },
  portfolioImage: {
    width: 80,
    height: 60,
    borderRadius: 6,
    marginRight: 8,
  },
  noPresentationInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  noPresentationText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
    textAlign: 'center',
  },

  // Message motivation
  motivationSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  motivationTitle: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '600',
    marginBottom: 8,
  },
  motivationContent: {
    fontSize: 13,
    color: '#000000',
    lineHeight: 18,
    fontWeight: '400',
  },

  // Actions
  actionsSection: {
    gap: 16,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  viewProfileText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
  },
  decisionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },

  // État vide
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomSpacer: { 
    height: 32 
  },
});
// app/(tabs)/applications.tsx - VERSION ÉPURÉE HARMONISÉE
// Style cohérent avec orders.tsx et available-orders.tsx
// Design simple et fonctionnel sans fioritures
// 🔧 MODIFIÉ: Bouton retour vers orders au lieu de router.back()

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import useAuth from '@/hooks/useAuth';

interface ApplicationWithProfile {
  id: number;
  order_id: number;
  fourmiz_id: string;
  status: 'en_attente' | 'acceptee' | 'rejetee';
  motivation_message?: string;
  created_at: string;
  order?: {
    id: number;
    service_title: string;
    client_id: string;
  };
  fourmiz_profile?: {
    id: string;
    firstname: string;
    lastname: string;
    avatar_url?: string;
    bio?: string;
    phone?: string;
    fourmiz_rating?: number;
    fourmiz_has_real_rating?: boolean;
    missions_completed?: number;
  };
}

export default function ApplicationsScreen() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadApplications = useCallback(async () => {
    if (!user?.id) {
      console.log('Pas d\'utilisateur connecté');
      return;
    }

    try {
      console.log('Chargement des candidatures pour:', user.id);

      const { data: applicationsData, error: applicationsError } = await supabase
        .from('order_applications')
        .select(`
          id,
          order_id,
          fourmiz_id,
          status,
          motivation_message,
          created_at,
          orders!inner(
            id,
            service_title,
            client_id
          )
        `)
        .eq('orders.client_id', user.id)
        .order('created_at', { ascending: false });

      if (applicationsError) {
        console.error('Erreur chargement candidatures:', applicationsError);
        throw applicationsError;
      }

      console.log('Candidatures trouvées:', applicationsData?.length || 0);

      if (!applicationsData || applicationsData.length === 0) {
        setApplications([]);
        return;
      }

      const fourmizIds = applicationsData.map(app => app.fourmiz_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, firstname, lastname, avatar_url, bio, phone, fourmiz_rating, fourmiz_has_real_rating, missions_completed')
        .in('id', fourmizIds);

      if (profilesError) {
        console.error('Erreur chargement profils:', profilesError);
        throw profilesError;
      }

      const applicationsWithProfiles: ApplicationWithProfile[] = applicationsData.map(app => ({
        ...app,
        order: app.orders,
        fourmiz_profile: profilesData?.find(profile => profile.id === app.fourmiz_id)
      }));

      console.log('Candidatures avec profils chargées:', applicationsWithProfiles.length);
      setApplications(applicationsWithProfiles);

    } catch (error) {
      console.error('Erreur chargement candidatures:', error);
      Alert.alert('Erreur', 'Impossible de charger les candidatures');
    }
  }, [user?.id]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadApplications();
      setLoading(false);
    };

    loadData();
  }, [loadApplications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  }, [loadApplications]);

  const viewFourmizProfile = useCallback((fourmizId: string) => {
    console.log('Navigation vers profil fourmiz:', fourmizId);
    router.push(`/fourmiz-profile-readonly/${fourmizId}?from=applications`);
  }, []);

  const acceptApplication = useCallback(async (application: ApplicationWithProfile) => {
    if (!application.order) {
      Alert.alert('Erreur', 'Informations de commande manquantes');
      return;
    }

    Alert.alert(
      'Accepter la candidature',
      `Voulez-vous accepter la candidature de ${application.fourmiz_profile?.firstname || 'cette Fourmiz'} pour "${application.order.service_title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          style: 'default',
          onPress: async () => {
            try {
              console.log('Acceptation candidature:', application.id);

              const { error: updateError } = await supabase
                .from('order_applications')
                .update({ status: 'acceptee' })
                .eq('id', application.id);

              if (updateError) {
                throw updateError;
              }

              const { error: assignError } = await supabase
                .from('orders')
                .update({ 
                  fourmiz_id: application.fourmiz_id,
                  status: 'acceptee'
                })
                .eq('id', application.order_id);

              if (assignError) {
                throw assignError;
              }

              Alert.alert('Succès', 'Candidature acceptée avec succès');
              await loadApplications();

            } catch (error) {
              console.error('Erreur acceptation:', error);
              Alert.alert('Erreur', 'Impossible d\'accepter la candidature');
            }
          }
        }
      ]
    );
  }, [loadApplications]);

  const rejectApplication = useCallback(async (application: ApplicationWithProfile) => {
    Alert.alert(
      'Rejeter la candidature',
      `Voulez-vous rejeter la candidature de ${application.fourmiz_profile?.firstname || 'cette Fourmiz'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Rejet candidature:', application.id);

              const { error } = await supabase
                .from('order_applications')
                .update({ status: 'rejetee' })
                .eq('id', application.id);

              if (error) {
                throw error;
              }

              Alert.alert('Succès', 'Candidature rejetée');
              await loadApplications();

            } catch (error) {
              console.error('Erreur rejet:', error);
              Alert.alert('Erreur', 'Impossible de rejeter la candidature');
            }
          }
        }
      ]
    );
  }, [loadApplications]);

  const renderApplication = ({ item: application }: { item: ApplicationWithProfile }) => {
    const profile = application.fourmiz_profile;
    const order = application.order;

    if (!profile || !order) {
      return null;
    }

    const getStatusInfo = (status: string) => {
      switch (status) {
        case 'en_attente':
          return { color: '#f59e0b', label: 'En attente' };
        case 'acceptee':
          return { color: '#10b981', label: 'Acceptée' };
        case 'rejetee':
          return { color: '#ef4444', label: 'Rejetée' };
        default:
          return { color: '#6b7280', label: status };
      }
    };

    const statusInfo = getStatusInfo(application.status);
    const isActionable = application.status === 'en_attente';

    return (
      <View style={styles.applicationCard}>
        <View style={styles.applicationHeader}>
          <Text style={styles.orderTitle}>{order.service_title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.fourmizProfile}
          onPress={() => viewFourmizProfile(profile.id)}
          activeOpacity={0.7}
        >
          <View style={styles.fourmizHeader}>
            <View style={styles.avatarContainer}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {profile.firstname?.[0]}{profile.lastname?.[0]}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.fourmizInfo}>
              <Text style={styles.fourmizName}>
                {profile.firstname} {profile.lastname}
              </Text>
              
              <View style={styles.fourmizStats}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#000000" />
                  <Text style={styles.ratingText}>
                    {profile.fourmiz_has_real_rating && profile.fourmiz_rating
                      ? `${profile.fourmiz_rating.toFixed(1)}/5`
                      : 'Nouveau'
                    }
                  </Text>
                </View>
                <Text style={styles.missionCount}>
                  {profile.missions_completed || 0} missions
                </Text>
              </View>
              
              {profile.bio && (
                <Text style={styles.fourmizBio} numberOfLines={2}>
                  {profile.bio}
                </Text>
              )}
            </View>

            <View style={styles.chevronContainer}>
              <Ionicons name="chevron-forward" size={20} color="#666666" />
            </View>
          </View>
        </TouchableOpacity>

        {application.motivation_message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Message:</Text>
            <Text style={styles.messageText} numberOfLines={3}>
              {application.motivation_message}
            </Text>
          </View>
        )}

        <View style={styles.applicationFooter}>
          <Text style={styles.applicationDate}>
            {new Date(application.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>

        {isActionable && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.rejectButton}
              onPress={() => rejectApplication(application)}
            >
              <Ionicons name="close" size={16} color="#666666" />
              <Text style={styles.rejectButtonText}>Rejeter</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.acceptButton}
              onPress={() => acceptApplication(application)}
            >
              <Ionicons name="checkmark" size={16} color="#ffffff" />
              <Text style={styles.acceptButtonText}>Accepter</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement des candidatures...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/orders')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Candidatures ({applications.length})
        </Text>
        <View style={styles.placeholder} />
      </View>

      {applications.length > 0 ? (
        <FlatList
          data={applications}
          renderItem={renderApplication}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#cccccc" />
          <Text style={styles.emptyTitle}>Aucune candidature</Text>
          <Text style={styles.emptyText}>
            Vous n'avez pas encore reçu de candidatures pour vos commandes.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '400',
  },

  listContainer: {
    padding: 20,
  },
  separator: {
    height: 16,
  },

  applicationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },

  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },

  fourmizProfile: {
    marginBottom: 16,
  },
  fourmizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    width: 60,
    height: 60,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
  },
  fourmizInfo: {
    flex: 1,
    gap: 6,
  },
  fourmizName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  fourmizStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  missionCount: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  fourmizBio: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
    fontWeight: '400',
  },
  chevronContainer: {
    padding: 4,
  },

  messageContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
    fontWeight: '400',
  },

  applicationFooter: {
    marginBottom: 16,
  },
  applicationDate: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },

  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingVertical: 12,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 6,
    paddingVertical: 12,
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

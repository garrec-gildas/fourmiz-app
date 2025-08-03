// app/(tabs)/history.tsx - HISTORIQUE DES MISSIONS FOURMIZ
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface CompletedMission {
  id: number;
  service_id: number;
  client_id: string;
  description: string;
  address: string;
  postal_code: string;
  city: string;
  date: string;
  start_time: string;
  end_time: string;
  phone: string;
  urgent: boolean;
  urgency_level: string;
  proposed_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  accepted_at: string;
  fourmiz_id: string;
  rating: number | null;
  feedback: string | null;
  
  // Relations
  services: {
    title: string;
    categorie: string;
  };
  client_profile: {
    firstname: string;
    lastname: string;
    avatar_url: string;
    phone: string;
    email: string;
  };
}

const STATUS_CONFIG = {
  'terminee': {
    label: '🎉 Terminée',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    description: 'Mission accomplie'
  },
  'annulee': {
    label: '❌ Annulée',
    color: '#ef4444',
    bgColor: '#fee2e2',
    description: 'Mission annulée'
  }
};

export default function HistoryScreen() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [completedMissions, setCompletedMissions] = useState<CompletedMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    getCurrentUser();
  }, []);

  // Recharger l'historique quand on revient sur l'écran
  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        fetchCompletedMissions();
      }
    }, [currentUser])
  );

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        await fetchCompletedMissions();
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      setError('Impossible de récupérer les informations utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedMissions = async () => {
    if (!currentUser) return;

    try {
      setError(null);
      console.log('📚 Chargement de l\'historique pour fourmiz:', currentUser.id);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          services (
            title,
            categorie
          ),
          client_profile:profiles!client_id (
            firstname,
            lastname,
            avatar_url,
            phone,
            email
          )
        `)
        .eq('fourmiz_id', currentUser.id) // ✅ Missions de cette fourmiz
        .in('status', ['terminee', 'annulee']) // ✅ Seulement historique
        .order('updated_at', { ascending: false }); // Trier par date de fin

      if (error) {
        console.error('❌ Erreur lors de la récupération de l\'historique:', error);
        throw error;
      }

      console.log('✅ Historique récupéré:', data?.length || 0);
      setCompletedMissions(data || []);
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération de l\'historique:', error);
      setError(`Impossible de charger l'historique: ${error.message}`);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompletedMissions();
    setRefreshing(false);
  };

  // Filtrer les missions selon le statut sélectionné
  const filteredMissions = filterStatus === 'all' 
    ? completedMissions 
    : completedMissions.filter(mission => mission.status === filterStatus);

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Fonction pour formater l'heure
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.slice(0, 5); // HH:MM
  };

  // Calculer les statistiques
  const stats = {
    total: completedMissions.length,
    completed: completedMissions.filter(m => m.status === 'terminee').length,
    cancelled: completedMissions.filter(m => m.status === 'annulee').length,
    averageRating: completedMissions.filter(m => m.rating).length > 0 
      ? (completedMissions.filter(m => m.rating).reduce((acc, m) => acc + (m.rating || 0), 0) / completedMissions.filter(m => m.rating).length).toFixed(1)
      : 'N/A',
    totalEarnings: completedMissions.filter(m => m.status === 'terminee').reduce((acc, m) => acc + (m.proposed_amount || 0), 0)
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement de l'historique...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#FF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderFilterButtons = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      <TouchableOpacity
        style={[
          styles.filterButton,
          filterStatus === 'all' && styles.filterButtonActive
        ]}
        onPress={() => setFilterStatus('all')}
      >
        <Text style={[
          styles.filterButtonText,
          filterStatus === 'all' && styles.filterButtonTextActive
        ]}>
          📋 Toutes ({completedMissions.length})
        </Text>
      </TouchableOpacity>

      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
        const count = completedMissions.filter(mission => mission.status === status).length;
        if (count === 0) return null;
        
        return (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filterStatus === status && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[
              styles.filterButtonText,
              filterStatus === status && styles.filterButtonTextActive
            ]}>
              {config.label} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Statistiques */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Terminées</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.averageRating}</Text>
            <Text style={styles.statLabel}>Note moyenne</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{((stats.totalEarnings || 0) / 100).toFixed(0)}€</Text>
            <Text style={styles.statLabel}>Total gagné</Text>
          </View>
        </View>

        {/* Filtres */}
        {renderFilterButtons()}

        <Text style={styles.sectionTitle}>📚 Historique de mes missions</Text>

        {filteredMissions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="library-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {filterStatus === 'all' 
                ? 'Aucune mission dans l\'historique'
                : `Aucune mission ${STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.description || filterStatus}`
              }
            </Text>
            <Text style={styles.emptySubtitle}>
              {filterStatus === 'all'
                ? 'Vos missions terminées apparaîtront ici'
                : 'Changez de filtre pour voir d\'autres missions'
              }
            </Text>
            {filterStatus === 'all' && (
              <TouchableOpacity
                style={styles.findMissionsButton}
                onPress={() => router.push('/(tabs)/available-orders')}
              >
                <Text style={styles.findMissionsButtonText}>Trouver des missions</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredMissions.map((mission) => (
            <CompletedMissionCard 
              key={mission.id} 
              mission={mission}
              formatDate={formatDate}
              formatTime={formatTime}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CompletedMissionCard = ({ 
  mission, 
  formatDate,
  formatTime
}: { 
  mission: CompletedMission;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
}) => {
  const statusConfig = STATUS_CONFIG[mission.status as keyof typeof STATUS_CONFIG];

  return (
    <View style={styles.missionCard}>
      <View style={styles.missionHeader}>
        <View style={styles.missionInfo}>
          <Text style={styles.missionTitle}>#{mission.id} • {mission.services?.title}</Text>
          <Text style={styles.missionCategory}>{mission.services?.categorie}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig?.bgColor }]}>
          <Text style={[styles.statusText, { color: statusConfig?.color }]}>
            {statusConfig?.label}
          </Text>
        </View>
      </View>

      {/* Détails */}
      <View style={styles.missionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#6b7280" />
          <Text style={styles.detailText}>
            {formatDate(mission.date)}
            {mission.start_time && ` à ${formatTime(mission.start_time)}`}
            {mission.end_time && ` - ${formatTime(mission.end_time)}`}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color="#6b7280" />
          <Text style={styles.detailText} numberOfLines={2}>
            {mission.address}
            {mission.postal_code && mission.city && `, ${mission.postal_code} ${mission.city}`}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="card" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{((mission.proposed_amount || 0) / 100).toFixed(2)}€</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="checkmark-done" size={16} color="#6b7280" />
          <Text style={styles.detailText}>
            {mission.status === 'terminee' ? 'Terminée' : 'Annulée'} le {formatDate(mission.updated_at)}
          </Text>
        </View>
      </View>

      {/* Description */}
      {mission.description && (
        <Text style={styles.missionDescription}>{mission.description}</Text>
      )}

      {/* Client info */}
      <View style={styles.clientSection}>
        <View style={styles.clientInfo}>
          {mission.client_profile?.avatar_url ? (
            <Image 
              source={{ uri: mission.client_profile.avatar_url }}
              style={styles.clientAvatar}
            />
          ) : (
            <View style={styles.clientAvatarPlaceholder}>
              <Ionicons name="person" size={20} color="#6b7280" />
            </View>
          )}
          <View style={styles.clientDetails}>
            <Text style={styles.clientName}>
              {mission.client_profile?.firstname} {mission.client_profile?.lastname}
            </Text>
            <Text style={styles.clientRole}>Client</Text>
          </View>
        </View>
      </View>

      {/* Note et feedback */}
      {mission.status === 'terminee' && (
        <View style={styles.ratingSection}>
          {mission.rating ? (
            <View style={styles.ratingDisplay}>
              <Text style={styles.ratingText}>Note reçue: </Text>
              <View style={styles.stars}>
                {[...Array(5)].map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < mission.rating! ? "star" : "star-outline"}
                    size={16}
                    color="#fbbf24"
                  />
                ))}
              </View>
              <Text style={styles.ratingValue}>({mission.rating}/5)</Text>
            </View>
          ) : (
            <Text style={styles.noRatingText}>Pas encore notée</Text>
          )}
          
          {mission.feedback && (
            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackLabel}>Commentaire du client:</Text>
              <Text style={styles.feedbackText}>"{mission.feedback}"</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF4444',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#FF4444' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  
  filterContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  findMissionsButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  findMissionsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  missionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  missionInfo: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  missionCategory: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  missionDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  missionDescription: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: 12,
    lineHeight: 20,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    fontStyle: 'italic',
  },
  clientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  clientAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientDetails: {
    marginLeft: 12,
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  clientRole: {
    fontSize: 12,
    color: '#6b7280',
  },
  ratingSection: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#92400e',
    marginRight: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingValue: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
  },
  noRatingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  feedbackSection: {
    marginTop: 8,
  },
  feedbackLabel: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 4,
    fontWeight: '600',
  },
  feedbackText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

// app/(tabs)/services-requests.tsx - MES MISSIONS ACCEPTÉES (FOURMIZ) - SÉCURISÉ
// 🔒 VERSION MISE À JOUR : Intégration avec roleManager.ts
// ✅ ACCÈS RESTREINT : Fourmiz uniquement

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
import { useRoleAccessWithComponents } from '@/hooks/useRoleAccessComponents'; // 🆕 NOUVEAU IMPORT

interface Mission {
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
  'acceptee': {
    label: '✅ Acceptée',
    color: '#10b981',
    bgColor: '#d1fae5',
    description: 'Mission acceptée'
  },
  'en_cours': {
    label: '🔄 En cours',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    description: 'Prestation en cours'
  }
};

export default function ServicesRequestsScreen() {
  // 🆕 NOUVEAU : Hook avec composants intégrés
  const { hasAccess, authLoading, AccessDeniedScreen, LoadingScreen, user } = useRoleAccessWithComponents('fourmiz');
  
  if (authLoading) return <LoadingScreen />;
  if (!hasAccess) return <AccessDeniedScreen />;

  // ✅ ÉTAT LOCAL - Logique existante maintenue
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ✅ LOGIQUE MÉTIER IDENTIQUE - Pas de changement fonctionnel
  useEffect(() => {
    if (user) {
      fetchMissions();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchMissions();
      }
    }, [user])
  );

  const fetchMissions = async () => {
    if (!user) return;

    try {
      setError(null);
      setLoading(true);
      console.log('🔍 Chargement des missions actives pour fourmiz:', user.id);
      
      // 📝 REQUÊTE CORRIGÉE SANS estimated_duration et rating
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
        .eq('fourmiz_id', user.id)
        .in('status', ['acceptee', 'en_cours'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur lors de la récupération des missions:', error);
        throw error;
      }

      console.log('✅ Missions actives récupérées:', data?.length || 0);
      setMissions(data || []);
    } catch (error: any) {
      console.error('💥 Erreur lors de la récupération des missions:', error);
      setError(`Impossible de charger les missions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMissions();
    setRefreshing(false);
  };

  const updateMissionStatus = async (missionId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', missionId)
        .eq('fourmiz_id', user?.id);

      if (error) throw error;
      
      await fetchMissions();
      
      const statusMessages = {
        'en_cours': 'Mission marquée comme en cours',
        'terminee': 'Mission terminée avec succès',
        'annulee': 'Mission annulée'
      };
      
      Alert.alert('Succès', statusMessages[newStatus as keyof typeof statusMessages] || 'Statut mis à jour');
    } catch (error: any) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      Alert.alert('Erreur', `Impossible de mettre à jour le statut: ${error.message}`);
    }
  };

  const filteredMissions = filterStatus === 'all' 
    ? missions 
    : missions.filter(mission => mission.status === filterStatus);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement de vos missions...</Text>
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
          📋 Toutes ({missions.length})
        </Text>
      </TouchableOpacity>

      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
        const count = missions.filter(mission => mission.status === status).length;
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
        {/* 📊 Statistiques en haut */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {missions.filter(m => m.status === 'acceptee').length}
            </Text>
            <Text style={styles.statLabel}>Acceptées</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {missions.filter(m => m.status === 'en_cours').length}
            </Text>
            <Text style={styles.statLabel}>En cours</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{missions.length}</Text>
            <Text style={styles.statLabel}>Total actives</Text>
          </View>
        </View>

        {/* 🔍 Filtres */}
        {renderFilterButtons()}

        <Text style={styles.sectionTitle}>🛠️ Mes missions actives</Text>

        {/* 📋 Liste des missions ou état vide */}
        {filteredMissions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="construct-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {filterStatus === 'all' 
                ? 'Aucune mission active'
                : `Aucune mission ${STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.description || filterStatus}`
              }
            </Text>
            <Text style={styles.emptySubtitle}>
              {filterStatus === 'all'
                ? 'Vous n\'avez pas de mission en cours'
                : 'Changez de filtre pour voir vos autres missions actives'
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
            <MissionCard 
              key={mission.id} 
              mission={mission}
              onUpdateStatus={updateMissionStatus}
              formatDate={formatDate}
              formatTime={formatTime}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// 🎨 COMPOSANT CARTE MISSION - Identique à l'original
const MissionCard = ({ 
  mission, 
  onUpdateStatus,
  formatDate,
  formatTime
}: { 
  mission: Mission;
  onUpdateStatus: (id: number, status: string) => void;
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

      {mission.urgent && (
        <View style={styles.urgentBadge}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" />
          <Text style={styles.urgentText}>URGENT - {mission.urgency_level}</Text>
        </View>
      )}

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
          <Text style={styles.detailText}>
            {typeof mission.proposed_amount === 'number' 
              ? `${(mission.proposed_amount / 100).toFixed(2)}€`
              : `${mission.proposed_amount}€`
            }
          </Text>
        </View>
      </View>

      {mission.description && (
        <Text style={styles.missionDescription}>{mission.description}</Text>
      )}

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
            <Text style={styles.clientRole}>Votre client</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.contactButton}
          onPress={() => {
            Alert.alert(
              'Contacter le client',
              `Téléphone: ${mission.client_profile?.phone || 'Non renseigné'}\nEmail: ${mission.client_profile?.email || 'Non renseigné'}`,
              [
                { text: 'Fermer' },
                { text: 'Appeler', onPress: () => {} },
                { text: 'Message', onPress: () => router.push(`/chat/${mission.id}`) }
              ]
            );
          }}
        >
          <Ionicons name="chatbubble" size={16} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View style={styles.missionActions}>
        {mission.status === 'acceptee' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.startButton]}
            onPress={() => onUpdateStatus(mission.id, 'en_cours')}
          >
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={styles.startButtonText}>Commencer</Text>
          </TouchableOpacity>
        )}
        
        {mission.status === 'en_cours' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => onUpdateStatus(mission.id, 'terminee')}
          >
            <Ionicons name="checkmark-done" size={16} color="#fff" />
            <Text style={styles.completeButtonText}>Terminer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ✅ STYLES IDENTIQUES - Aucune modification
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9fafb' 
  },
  content: { 
    padding: 20 
  },
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
  statNumber: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#FF4444' 
  },
  statLabel: { 
    fontSize: 12, 
    color: '#666', 
    marginTop: 4, 
    textAlign: 'center' 
  },
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
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 16 
  },
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
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  urgentText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
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
    justifyContent: 'space-between',
    backgroundColor: '#e0f2fe',
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
  contactButton: {
    padding: 8,
    backgroundColor: '#dbeafe',
    borderRadius: 20,
  },
  missionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    gap: 4,
  },
  startButton: { 
    backgroundColor: '#059669' 
  },
  startButtonText: { 
    color: '#fff', 
    fontWeight: '600' 
  },
  completeButton: { 
    backgroundColor: '#3b82f6' 
  },
  completeButtonText: { 
    color: '#fff', 
    fontWeight: '600' 
  },
});
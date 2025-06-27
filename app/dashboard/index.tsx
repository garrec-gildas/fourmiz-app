import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, TrendingUp, Euro, Calendar, Star, Users, Clock, MapPin, ChartBar as BarChart3, Settings, Eye, ChevronRight, Award, Target, Zap, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Circle as XCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Mock data pour le tableau de bord
const mockDashboardData = {
  fourmiz: {
    name: 'Jean Dupont',
    rating: 4.8,
    totalMissions: 127,
    completionRate: 96,
    responseTime: '< 5 min',
    joinDate: '2024-01-15',
    isVerified: true,
    level: 'Expert',
  },
  earnings: {
    today: 45.50,
    thisWeek: 287.30,
    thisMonth: 1156.80,
    total: 8945.60,
    pending: 125.40,
    lastPayout: '2024-12-15',
    badgesRewards: 125.00, // Ajout des récompenses de badges
  },
  missions: {
    pending: 3,
    inProgress: 2,
    completed: 122,
    cancelled: 5,
    todayMissions: 4,
    weekMissions: 18,
  },
  performance: {
    averageRating: 4.8,
    onTimeRate: 98,
    clientSatisfaction: 96,
    repeatClients: 45,
    topCategory: 'Courses & Achats',
    badgesEarned: 5, // Ajout du nombre de badges gagnés
  },
  recentMissions: [
    {
      id: '1',
      serviceName: 'Livraison de courses',
      clientName: 'Marie D.',
      status: 'completed',
      earnings: 12.50,
      date: '2024-12-20',
      rating: 5,
    },
    {
      id: '2',
      serviceName: 'Montage meuble IKEA',
      clientName: 'Thomas L.',
      status: 'in_progress',
      earnings: 35.00,
      date: '2024-12-20',
      rating: null,
    },
    {
      id: '3',
      serviceName: 'Promenade de chien',
      clientName: 'Sophie M.',
      status: 'pending',
      earnings: 18.00,
      date: '2024-12-21',
      rating: null,
    },
  ],
  quickStats: [
    { label: 'Missions aujourd\'hui', value: '4', icon: Calendar, color: '#4CAF50' },
    { label: 'Gains cette semaine', value: '287€', icon: Euro, color: '#2196F3' },
    { label: 'Note moyenne', value: '4.8', icon: Star, color: '#FFD700' },
    { label: 'Taux de réussite', value: '96%', icon: Target, color: '#FF4444' },
  ]
};

const statusConfig = {
  pending: { label: 'En attente', color: '#FF9800', icon: AlertCircle },
  in_progress: { label: 'En cours', color: '#2196F3', icon: Clock },
  completed: { label: 'Terminée', color: '#4CAF50', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: '#F44336', icon: XCircle },
};

export default function DashboardScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');

  const renderQuickStat = ({ item }: { item: any }) => {
    const IconComponent = item.icon;
    
    return (
      <View style={styles.quickStatCard}>
        <View style={[styles.quickStatIcon, { backgroundColor: item.color + '15' }]}>
          <IconComponent size={24} color={item.color} />
        </View>
        <Text style={styles.quickStatValue}>{item.value}</Text>
        <Text style={styles.quickStatLabel}>{item.label}</Text>
      </View>
    );
  };

  const renderRecentMission = ({ item }: { item: any }) => {
    const statusInfo = statusConfig[item.status as keyof typeof statusConfig];
    const StatusIcon = statusInfo.icon;

    return (
      <TouchableOpacity 
        style={styles.missionCard}
        onPress={() => router.push(`/order/${item.id}`)}
      >
        <View style={styles.missionHeader}>
          <View style={styles.missionInfo}>
            <Text style={styles.missionService}>{item.serviceName}</Text>
            <Text style={styles.missionClient}>{item.clientName}</Text>
          </View>
          <View style={styles.missionMeta}>
            <Text style={styles.missionEarnings}>{item.earnings.toFixed(2)}€</Text>
            <View style={styles.missionStatus}>
              <StatusIcon size={12} color={statusInfo.color} />
              <Text style={[styles.missionStatusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
        </View>
        
        {item.rating && (
          <View style={styles.missionRating}>
            <Star size={14} color="#FFD700" fill="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}/5</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tableau de bord</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('/dashboard/settings')}
        >
          <Settings size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <LinearGradient
          colors={['#FF4444', '#FF6B6B']}
          style={styles.welcomeCard}
        >
          <View style={styles.welcomeContent}>
            <View style={styles.welcomeInfo}>
              <Text style={styles.welcomeTitle}>Bonjour {mockDashboardData.fourmiz.name} !</Text>
              <Text style={styles.welcomeSubtitle}>
                Niveau {mockDashboardData.fourmiz.level} • {mockDashboardData.fourmiz.totalMissions} missions
              </Text>
              <View style={styles.welcomeStats}>
                <View style={styles.welcomeStat}>
                  <Star size={16} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.welcomeStatText}>{mockDashboardData.fourmiz.rating}</Text>
                </View>
                <View style={styles.welcomeStat}>
                  <Target size={16} color="#FFFFFF" />
                  <Text style={styles.welcomeStatText}>{mockDashboardData.fourmiz.completionRate}%</Text>
                </View>
              </View>
            </View>
            <View style={styles.welcomeBadge}>
              <Award size={32} color="#FFFFFF" />
            </View>
          </View>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={styles.quickStatsSection}>
          <FlatList
            data={mockDashboardData.quickStats}
            renderItem={renderQuickStat}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickStatsList}
          />
        </View>

        {/* Earnings Overview */}
        <View style={styles.earningsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gains</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/dashboard/earnings')}
            >
              <Text style={styles.viewAllText}>Voir tout</Text>
              <ChevronRight size={16} color="#FF4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.earningsGrid}>
            <View style={styles.earningCard}>
              <Text style={styles.earningLabel}>Aujourd'hui</Text>
              <Text style={styles.earningAmount}>{mockDashboardData.earnings.today.toFixed(2)}€</Text>
            </View>
            <View style={styles.earningCard}>
              <Text style={styles.earningLabel}>Cette semaine</Text>
              <Text style={styles.earningAmount}>{mockDashboardData.earnings.thisWeek.toFixed(2)}€</Text>
            </View>
            <View style={styles.earningCard}>
              <Text style={styles.earningLabel}>Ce mois</Text>
              <Text style={styles.earningAmount}>{mockDashboardData.earnings.thisMonth.toFixed(2)}€</Text>
            </View>
            <View style={styles.earningCard}>
              <Text style={styles.earningLabel}>Badges & Récompenses</Text>
              <Text style={[styles.earningAmount, styles.badgesAmount]}>
                {mockDashboardData.earnings.badgesRewards.toFixed(2)}€
              </Text>
            </View>
          </View>
        </View>

        {/* Missions Overview */}
        <View style={styles.missionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Missions</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/fourmiz-calendar')}
            >
              <Text style={styles.viewAllText}>Calendrier</Text>
              <ChevronRight size={16} color="#FF4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.missionsGrid}>
            <View style={[styles.missionStatCard, styles.pendingCard]}>
              <AlertCircle size={24} color="#FF9800" />
              <Text style={styles.missionStatNumber}>{mockDashboardData.missions.pending}</Text>
              <Text style={styles.missionStatLabel}>En attente</Text>
            </View>
            <View style={[styles.missionStatCard, styles.progressCard]}>
              <Clock size={24} color="#2196F3" />
              <Text style={styles.missionStatNumber}>{mockDashboardData.missions.inProgress}</Text>
              <Text style={styles.missionStatLabel}>En cours</Text>
            </View>
            <View style={[styles.missionStatCard, styles.completedCard]}>
              <CheckCircle size={24} color="#4CAF50" />
              <Text style={styles.missionStatNumber}>{mockDashboardData.missions.completed}</Text>
              <Text style={styles.missionStatLabel}>Terminées</Text>
            </View>
          </View>
        </View>

        {/* Recent Missions */}
        <View style={styles.recentMissionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Missions récentes</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/(tabs)/orders')}
            >
              <Text style={styles.viewAllText}>Voir tout</Text>
              <ChevronRight size={16} color="#FF4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.recentMissionsList}>
            {mockDashboardData.recentMissions.map((mission) => (
              <View key={mission.id}>
                {renderRecentMission({ item: mission })}
              </View>
            ))}
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.performanceSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/dashboard/analytics')}
            >
              <Text style={styles.viewAllText}>Analytics</Text>
              <ChevronRight size={16} color="#FF4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.performanceGrid}>
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Star size={20} color="#FFD700" />
                <Text style={styles.performanceValue}>{mockDashboardData.performance.averageRating}</Text>
              </View>
              <Text style={styles.performanceLabel}>Note moyenne</Text>
            </View>
            
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Clock size={20} color="#4CAF50" />
                <Text style={styles.performanceValue}>{mockDashboardData.performance.onTimeRate}%</Text>
              </View>
              <Text style={styles.performanceLabel}>Ponctualité</Text>
            </View>
            
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Users size={20} color="#2196F3" />
                <Text style={styles.performanceValue}>{mockDashboardData.performance.repeatClients}</Text>
              </View>
              <Text style={styles.performanceLabel}>Clients fidèles</Text>
            </View>
            
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Award size={20} color="#FFD700" />
                <Text style={styles.performanceValue}>{mockDashboardData.performance.badgesEarned}</Text>
              </View>
              <Text style={styles.performanceLabel}>Badges gagnés</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/fourmiz-calendar')}
          >
            <Calendar size={24} color="#FF4444" />
            <Text style={styles.actionButtonText}>Voir mon calendrier</Text>
            <ChevronRight size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/dashboard/earnings')}
          >
            <Euro size={24} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Gérer mes gains</Text>
            <ChevronRight size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Settings size={24} color="#2196F3" />
            <Text style={styles.actionButtonText}>Paramètres du profil</Text>
            <ChevronRight size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  welcomeCard: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 12,
  },
  welcomeStats: {
    flexDirection: 'row',
    gap: 16,
  },
  welcomeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  welcomeStatText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  welcomeBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStatsSection: {
    paddingVertical: 16,
  },
  quickStatsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  quickStatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  earningsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FF4444',
  },
  earningsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  earningCard: {
    width: (width - 76) / 2,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  earningLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 8,
  },
  earningAmount: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
  },
  badgesAmount: {
    color: '#FFD700',
  },
  pendingAmount: {
    color: '#FF9800',
  },
  missionsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  missionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  missionStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  pendingCard: {
    backgroundColor: '#FFF8E1',
  },
  progressCard: {
    backgroundColor: '#E3F2FD',
  },
  completedCard: {
    backgroundColor: '#E8F5E8',
  },
  missionStatNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  missionStatLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  recentMissionsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentMissionsList: {
    gap: 12,
  },
  missionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  missionInfo: {
    flex: 1,
  },
  missionService: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  missionClient: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  missionMeta: {
    alignItems: 'flex-end',
  },
  missionEarnings: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  missionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  missionStatusText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  missionRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  performanceSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  performanceCard: {
    width: (width - 76) / 2,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  performanceValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  performanceLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  quickActionsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginLeft: 12,
  },
});
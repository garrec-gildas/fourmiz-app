import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Award, Trophy, Star, Target, Zap, Crown, Medal, Gift, TrendingUp, Users, Calendar, CircleCheck as CheckCircle, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Mock data pour les badges - Classés par valeur financière décroissante
const mockBadgesData = {
  totalBadges: 8,
  unlockedBadges: 5,
  totalRewards: 125, // en euros
  currentMonth: {
    spending: 356.80,
    orders: 8,
    maxOrder: 75.00,
    department: 'Paris (75)', // Ajout du département
  },
  badges: [
    {
      id: 'spending-champion',
      name: 'Client des Dépenses',
      description: 'Récompense du montant le plus élevé de commandes du mois',
      value: 50,
      currency: '€',
      isUnlocked: true,
      unlockedDate: '2024-12-15',
      icon: TrendingUp,
      color: '#FFD700',
      gradient: ['#FFD700', '#FFA000'],
      category: 'spending',
      requirement: 'Dépenser plus de 300€ en un mois',
      progress: 100,
      rarity: 'legendary'
    },
    {
      id: 'social-butterfly',
      name: 'Client Social',
      description: 'Au plus grand nombre de parrainages (Clients et Fourmiz) sur le mois',
      value: 45,
      currency: '€',
      isUnlocked: false,
      unlockedDate: null,
      icon: Users,
      color: '#E91E63',
      gradient: ['#E91E63', '#F06292'],
      category: 'referral',
      requirement: 'Plus grand nombre de parrainages du mois',
      progress: 20,
      rarity: 'epic'
    },
    {
      id: 'night-owl',
      name: 'Client Nocturne',
      description: 'Au plus grand nombre de commandes entre 20h00 et 5h00 sur un mois',
      value: 35,
      currency: '€',
      isUnlocked: false,
      unlockedDate: null,
      icon: Calendar,
      color: '#3F51B5',
      gradient: ['#3F51B5', '#5C6BC0'],
      category: 'timing',
      requirement: 'Plus grand nombre de commandes nocturnes du mois',
      progress: 40,
      rarity: 'epic'
    },
    {
      id: 'max-order',
      name: 'Client Force One',
      description: 'Récompense la plus grosse commande unique du mois',
      value: 30,
      currency: '€',
      isUnlocked: true,
      unlockedDate: '2024-12-18',
      icon: Star,
      color: '#FF6B6B',
      gradient: ['#FF6B6B', '#FF4444'],
      category: 'order',
      requirement: 'Passer une commande de plus de 70€',
      progress: 100,
      rarity: 'epic'
    },
    {
      id: 'early-bird',
      name: 'Client Lève-tôt',
      description: 'Au plus grand nombre de commandes passées entre 5 heures et 8 heures sur le mois',
      value: 25,
      currency: '€',
      isUnlocked: false,
      unlockedDate: null,
      icon: Calendar,
      color: '#607D8B',
      gradient: ['#607D8B', '#90A4AE'],
      category: 'timing',
      requirement: 'Plus grand nombre de commandes matinales du mois',
      progress: 60,
      rarity: 'rare'
    },
    {
      id: 'perfect-rating',
      name: 'Client Parfait',
      description: 'Donner une note de 5/5 sur 10 commandes consécutives',
      value: 20,
      currency: '€',
      isUnlocked: true,
      unlockedDate: '2024-12-10',
      icon: Star,
      color: '#9C27B0',
      gradient: ['#9C27B0', '#BA68C8'],
      category: 'quality',
      requirement: '10 commandes consécutives notées 5/5',
      progress: 100,
      rarity: 'epic'
    },
    {
      id: 'orders-champion',
      name: 'Client Cardio',
      description: 'Récompense le plus grand nombre de commandes du mois',
      value: 15,
      currency: '€',
      isUnlocked: true,
      unlockedDate: '2024-12-20',
      icon: Trophy,
      color: '#4CAF50',
      gradient: ['#4CAF50', '#66BB6A'],
      category: 'orders',
      requirement: 'Passer plus de 15 commandes en un mois',
      progress: 100,
      rarity: 'rare'
    },
    {
      id: 'speed-demon',
      name: 'Client Express',
      description: 'Au plus grand nombre de commandes en 24 heures sur un mois',
      value: 10,
      currency: '€',
      isUnlocked: true,
      unlockedDate: '2024-12-05',
      icon: Zap,
      color: '#FF9800',
      gradient: ['#FF9800', '#FFB74D'],
      category: 'speed',
      requirement: 'Plus grand nombre de commandes en 24h du mois',
      progress: 100,
      rarity: 'rare'
    }
  ]
};

const rarityConfig = {
  common: { label: 'Commun', color: '#607D8B', stars: 1 },
  rare: { label: 'Rare', color: '#4CAF50', stars: 2 },
  epic: { label: 'Épique', color: '#9C27B0', stars: 3 },
  legendary: { label: 'Légendaire', color: '#FFD700', stars: 4 }
};

export default function ClientBadgesScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Tous', icon: Award },
    { id: 'spending', label: 'Dépenses', icon: TrendingUp },
    { id: 'orders', label: 'Commandes', icon: Trophy },
    { id: 'quality', label: 'Qualité', icon: Star },
    { id: 'speed', label: 'Rapidité', icon: Zap },
    { id: 'referral', label: 'Parrainage', icon: Users },
    { id: 'timing', label: 'Horaires', icon: Calendar }
  ];

  const filteredBadges = selectedCategory === 'all' 
    ? mockBadgesData.badges 
    : mockBadgesData.badges.filter(badge => badge.category === selectedCategory);

  const renderBadge = ({ item: badge }) => {
    const IconComponent = badge.icon;
    const rarity = rarityConfig[badge.rarity as keyof typeof rarityConfig];

    return (
      <TouchableOpacity key={badge.id} style={styles.badgeCard}>
        <LinearGradient
          colors={badge.isUnlocked ? badge.gradient : ['#E5E5E5', '#BDBDBD']}
          style={styles.badgeGradient}
        >
          {/* Badge Header */}
          <View style={styles.badgeHeader}>
            <View style={styles.badgeIconContainer}>
              <IconComponent 
                size={32} 
                color={badge.isUnlocked ? "#FFFFFF" : "#999"} 
                fill={badge.isUnlocked ? "#FFFFFF" : "#999"}
              />
              {!badge.isUnlocked && (
                <View style={styles.lockOverlay}>
                  <Lock size={16} color="#666" />
                </View>
              )}
            </View>
            <View style={styles.badgeReward}>
              <Text style={[styles.badgeValue, !badge.isUnlocked && styles.lockedText]}>
                {badge.value}{badge.currency}
              </Text>
            </View>
          </View>

          {/* Badge Info */}
          <View style={styles.badgeInfo}>
            <Text style={[styles.badgeName, !badge.isUnlocked && styles.lockedText]}>
              {badge.name}
            </Text>
            <Text style={[styles.badgeDescription, !badge.isUnlocked && styles.lockedText]}>
              {badge.description}
            </Text>
          </View>

          {/* Rarity */}
          <View style={styles.rarityContainer}>
            <View style={styles.rarityStars}>
              {Array.from({ length: rarity.stars }).map((_, index) => (
                <Star 
                  key={index} 
                  size={12} 
                  color={badge.isUnlocked ? "#FFFFFF" : "#999"} 
                  fill={badge.isUnlocked ? "#FFFFFF" : "#999"} 
                />
              ))}
            </View>
            <Text style={[styles.rarityLabel, !badge.isUnlocked && styles.lockedText]}>
              {rarity.label}
            </Text>
          </View>

          {/* Progress or Date */}
          {badge.isUnlocked ? (
            <View style={styles.unlockedInfo}>
              <CheckCircle size={16} color="#FFFFFF" />
              <Text style={styles.unlockedDate}>
                Obtenu le {new Date(badge.unlockedDate).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          ) : (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${badge.progress}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {badge.progress}% - {badge.requirement}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderCategoryFilter = (category: any) => {
    const IconComponent = category.icon;
    const isActive = selectedCategory === category.id;

    return (
      <TouchableOpacity
        key={category.id}
        style={[styles.categoryButton, isActive && styles.categoryButtonActive]}
        onPress={() => setSelectedCategory(category.id)}
      >
        <IconComponent 
          size={16} 
          color={isActive ? "#FFFFFF" : "#666"} 
        />
        <Text style={[
          styles.categoryButtonText,
          isActive && styles.categoryButtonTextActive
        ]}>
          {category.label}
        </Text>
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
        <Text style={styles.headerTitle}>Mes Badges et Récompenses mensuelles</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#FF4444', '#FF6B6B']}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <Crown size={48} color="#FFFFFF" />
            <Text style={styles.heroTitle}>Collection de Badges Mensuels</Text>
            <Text style={styles.heroSubtitle}>
              Découvrez les badges que vous avez débloqués grâce à vos commandes mensuelles
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{mockBadgesData.unlockedBadges}</Text>
                <Text style={styles.heroStatLabel}>badges débloqués</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{mockBadgesData.totalRewards}€</Text>
                <Text style={styles.heroStatLabel}>réductions gagnées</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Important Notice */}
        <View style={styles.noticeSection}>
          <View style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <Award size={24} color="#2196F3" />
              <Text style={styles.noticeTitle}>Calcul mensuel et départemental</Text>
            </View>
            <Text style={styles.noticeText}>
              <Text style={styles.noticeHighlight}>Les scores et réductions affichés sont calculés mensuellement</Text> et 
              comparés aux autres clients de votre zone géographique départementale.
            </Text>
            <Text style={styles.noticeLocation}>
              📍 Votre zone : {mockBadgesData.currentMonth.department}
            </Text>
            <Text style={styles.noticeChallenges}>
              Fourmiz vous notifiera des challenges ponctuels sur des critères différents (des challenges sur une heure, sur 24 heures, sur un rayon d'action de 1 km par exemple).
            </Text>
          </View>
        </View>

        {/* Progress Overview */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Progression globale</Text>
          
          <View style={styles.overallProgressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>
                {mockBadgesData.unlockedBadges} / {mockBadgesData.totalBadges} badges
              </Text>
              <Text style={styles.progressPercentage}>
                {Math.round((mockBadgesData.unlockedBadges / mockBadgesData.totalBadges) * 100)}%
              </Text>
            </View>
            <View style={styles.overallProgressBar}>
              <View 
                style={[
                  styles.overallProgressFill, 
                  { width: `${(mockBadgesData.unlockedBadges / mockBadgesData.totalBadges) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressSubtext}>
              Continuez vos commandes pour débloquer tous les badges mensuels !
            </Text>
          </View>
        </View>

        {/* Current Month Performance */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionTitle}>Performance ce mois-ci</Text>
          
          <View style={styles.performanceGrid}>
            <View style={styles.performanceCard}>
              <TrendingUp size={24} color="#4CAF50" />
              <Text style={styles.performanceValue}>
                {mockBadgesData.currentMonth.spending.toFixed(0)}€
              </Text>
              <Text style={styles.performanceLabel}>Dépenses mensuelles</Text>
            </View>
            
            <View style={styles.performanceCard}>
              <Trophy size={24} color="#FF9800" />
              <Text style={styles.performanceValue}>
                {mockBadgesData.currentMonth.orders}
              </Text>
              <Text style={styles.performanceLabel}>Commandes ce mois</Text>
            </View>
            
            <View style={styles.performanceCard}>
              <Star size={24} color="#9C27B0" />
              <Text style={styles.performanceValue}>
                {mockBadgesData.currentMonth.maxOrder.toFixed(0)}€
              </Text>
              <Text style={styles.performanceLabel}>Plus grosse commande</Text>
            </View>
          </View>
        </View>

        {/* Category Filters */}
        <View style={styles.filtersSection}>
          <Text style={styles.sectionTitle}>Catégories</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilters}
          >
            {categories.map(renderCategoryFilter)}
          </ScrollView>
        </View>

        {/* Badges Grid - Classés par valeur financière */}
        <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? 'Tous les badges (classés par valeur)' : `Badges ${categories.find(c => c.id === selectedCategory)?.label}`}
          </Text>
          
          <FlatList
            data={filteredBadges.sort((a, b) => b.value - a.value)}
            renderItem={renderBadge}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.badgesRow}
            scrollEnabled={false}
          />
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Conseils pour débloquer plus de badges</Text>
          
          <View style={styles.tipCard}>
            <Gift size={24} color="#FF4444" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Commandez régulièrement</Text>
              <Text style={styles.tipText}>
                Plus vous passez de commandes, plus vous avez de chances de débloquer des badges !
              </Text>
            </View>
          </View>
          
          <View style={styles.tipCard}>
            <Medal size={24} color="#4CAF50" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Notez vos Fourmiz</Text>
              <Text style={styles.tipText}>
                Donnez des notes justes à vos Fourmiz pour débloquer les badges de qualité.
              </Text>
            </View>
          </View>
          
          <View style={styles.tipCard}>
            <Users size={24} color="#2196F3" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Parrainez vos amis</Text>
              <Text style={styles.tipText}>
                Invitez vos amis à rejoindre Fourmiz pour débloquer les badges de parrainage.
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Calendar size={24} color="#FF9800" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Variez vos horaires</Text>
              <Text style={styles.tipText}>
                Commandez tôt le matin ou tard le soir pour débloquer les badges horaires spéciaux.
              </Text>
            </View>
          </View>
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
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  heroCard: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 20,
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 32,
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  noticeSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  noticeCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  noticeTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
    marginLeft: 12,
  },
  noticeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    lineHeight: 20,
    marginBottom: 8,
  },
  noticeHighlight: {
    fontFamily: 'Inter-SemiBold',
  },
  noticeLocation: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1976D2',
    marginBottom: 12,
  },
  noticeChallenges: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  progressSection: {
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  overallProgressCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  progressPercentage: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FF4444',
  },
  overallProgressBar: {
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    marginBottom: 8,
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: '#FF4444',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
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
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  filtersSection: {
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
  categoryFilters: {
    gap: 8,
    paddingRight: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#FF4444',
  },
  categoryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  badgesSection: {
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
  badgesRow: {
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: '48%', // Changed to make exactly 2 per row with space between
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  badgeGradient: {
    padding: 16,
    minHeight: 200,
  },
  badgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badgeIconContainer: {
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    padding: 2,
  },
  badgeReward: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  lockedText: {
    color: '#999',
  },
  badgeInfo: {
    marginBottom: 12,
  },
  badgeName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 16,
  },
  rarityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rarityStars: {
    flexDirection: 'row',
    gap: 2,
  },
  rarityLabel: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  unlockedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unlockedDate: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  progressContainer: {
    marginTop: 'auto',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 9,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: 12,
  },
  tipsSection: {
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
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 18,
  },
});
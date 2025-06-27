import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, TrendingUp, Star, Clock, Users, Target, Calendar, ChartBar as BarChart3, ChartPie as PieChart, Activity } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Mock data pour les analytics
const mockAnalyticsData = {
  overview: {
    totalMissions: 127,
    averageRating: 4.8,
    completionRate: 96,
    responseTime: 4.2, // minutes
    repeatClientRate: 35,
    totalEarnings: 8945.60,
  },
  performance: {
    thisMonth: {
      missions: 18,
      earnings: 1156.80,
      rating: 4.9,
      completionRate: 100,
    },
    lastMonth: {
      missions: 15,
      earnings: 987.40,
      rating: 4.7,
      completionRate: 93,
    },
    growth: {
      missions: 20, // +20%
      earnings: 17.2, // +17.2%
      rating: 4.3, // +4.3%
    }
  },
  categoryStats: [
    { name: 'Courses & Achats', missions: 45, earnings: 3200.50, percentage: 35.4, color: '#4ECDC4' },
    { name: 'Bricolage & Nettoyage', missions: 32, earnings: 2890.30, percentage: 25.2, color: '#FECA57' },
    { name: 'Aide à la Personne', missions: 28, earnings: 1876.40, percentage: 22.0, color: '#45B7D1' },
    { name: 'Animaux', missions: 15, earnings: 756.20, percentage: 11.8, color: '#FF6B6B' },
    { name: 'Transport', missions: 7, earnings: 222.20, percentage: 5.5, color: '#96CEB4' },
  ],
  timeStats: {
    bestDays: ['Samedi', 'Dimanche', 'Mercredi'],
    bestHours: ['14h-16h', '18h-20h', '10h-12h'],
    averageDuration: 75, // minutes
  },
  clientStats: {
    newClients: 23,
    repeatClients: 45,
    clientRetentionRate: 66,
    averageOrderValue: 18.50,
  },
  monthlyTrend: [
    { month: 'Jul', missions: 25, earnings: 1345.60, rating: 4.6 },
    { month: 'Aoû', missions: 19, earnings: 1098.50, rating: 4.7 },
    { month: 'Sep', missions: 14, earnings: 876.30, rating: 4.8 },
    { month: 'Oct', missions: 22, earnings: 1234.20, rating: 4.7 },
    { month: 'Nov', missions: 15, earnings: 987.40, rating: 4.7 },
    { month: 'Déc', missions: 18, earnings: 1156.80, rating: 4.9 },
  ],
};

export default function AnalyticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  const renderCategoryStat = (category: any, index: number) => (
    <View key={index} style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
        <Text style={styles.categoryName}>{category.name}</Text>
        <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
      </View>
      <View style={styles.categoryStats}>
        <Text style={styles.categoryMissions}>{category.missions} missions</Text>
        <Text style={styles.categoryEarnings}>{category.earnings.toFixed(2)}€</Text>
      </View>
    </View>
  );

  const renderMonthlyTrend = (item: any, index: number) => (
    <View key={index} style={styles.trendCard}>
      <Text style={styles.trendMonth}>{item.month}</Text>
      <View style={styles.trendStats}>
        <Text style={styles.trendMissions}>{item.missions}</Text>
        <Text style={styles.trendEarnings}>{item.earnings.toFixed(0)}€</Text>
        <View style={styles.trendRating}>
          <Star size={12} color="#FFD700" fill="#FFD700" />
          <Text style={styles.trendRatingText}>{item.rating}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['week', 'month', 'quarter'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period === 'week' ? 'Semaine' : period === 'month' ? 'Mois' : 'Trimestre'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Cards */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
          
          <View style={styles.overviewGrid}>
            <LinearGradient
              colors={['#4CAF50', '#66BB6A']}
              style={styles.overviewCard}
            >
              <TrendingUp size={24} color="#FFFFFF" />
              <Text style={styles.overviewValue}>{mockAnalyticsData.overview.totalMissions}</Text>
              <Text style={styles.overviewLabel}>Missions totales</Text>
            </LinearGradient>

            <LinearGradient
              colors={['#FFD700', '#FFC107']}
              style={styles.overviewCard}
            >
              <Star size={24} color="#FFFFFF" />
              <Text style={styles.overviewValue}>{mockAnalyticsData.overview.averageRating}</Text>
              <Text style={styles.overviewLabel}>Note moyenne</Text>
            </LinearGradient>

            <LinearGradient
              colors={['#2196F3', '#42A5F5']}
              style={styles.overviewCard}
            >
              <Target size={24} color="#FFFFFF" />
              <Text style={styles.overviewValue}>{mockAnalyticsData.overview.completionRate}%</Text>
              <Text style={styles.overviewLabel}>Taux de réussite</Text>
            </LinearGradient>

            <LinearGradient
              colors={['#FF4444', '#FF6B6B']}
              style={styles.overviewCard}
            >
              <Clock size={24} color="#FFFFFF" />
              <Text style={styles.overviewValue}>{mockAnalyticsData.overview.responseTime}min</Text>
              <Text style={styles.overviewLabel}>Temps de réponse</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Performance Comparison */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionTitle}>Performance ce mois</Text>
          
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonTitle}>vs mois dernier</Text>
            </View>
            
            <View style={styles.comparisonGrid}>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Missions</Text>
                <View style={styles.comparisonValues}>
                  <Text style={styles.comparisonCurrent}>
                    {mockAnalyticsData.performance.thisMonth.missions}
                  </Text>
                  <Text style={[styles.comparisonGrowth, styles.positiveGrowth]}>
                    +{mockAnalyticsData.performance.growth.missions}%
                  </Text>
                </View>
              </View>
              
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Gains</Text>
                <View style={styles.comparisonValues}>
                  <Text style={styles.comparisonCurrent}>
                    {mockAnalyticsData.performance.thisMonth.earnings.toFixed(0)}€
                  </Text>
                  <Text style={[styles.comparisonGrowth, styles.positiveGrowth]}>
                    +{mockAnalyticsData.performance.growth.earnings}%
                  </Text>
                </View>
              </View>
              
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Note</Text>
                <View style={styles.comparisonValues}>
                  <Text style={styles.comparisonCurrent}>
                    {mockAnalyticsData.performance.thisMonth.rating}
                  </Text>
                  <Text style={[styles.comparisonGrowth, styles.positiveGrowth]}>
                    +{mockAnalyticsData.performance.growth.rating}%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Répartition par catégorie</Text>
          
          <View style={styles.categoryList}>
            {mockAnalyticsData.categoryStats.map((category, index) => 
              renderCategoryStat(category, index)
            )}
          </View>
        </View>

        {/* Time Analysis */}
        <View style={styles.timeSection}>
          <Text style={styles.sectionTitle}>Analyse temporelle</Text>
          
          <View style={styles.timeGrid}>
            <View style={styles.timeCard}>
              <Calendar size={24} color="#4CAF50" />
              <Text style={styles.timeTitle}>Meilleurs jours</Text>
              <View style={styles.timeList}>
                {mockAnalyticsData.timeStats.bestDays.map((day, index) => (
                  <Text key={index} style={styles.timeItem}>{day}</Text>
                ))}
              </View>
            </View>
            
            <View style={styles.timeCard}>
              <Clock size={24} color="#2196F3" />
              <Text style={styles.timeTitle}>Meilleures heures</Text>
              <View style={styles.timeList}>
                {mockAnalyticsData.timeStats.bestHours.map((hour, index) => (
                  <Text key={index} style={styles.timeItem}>{hour}</Text>
                ))}
              </View>
            </View>
          </View>
          
          <View style={styles.durationCard}>
            <Activity size={24} color="#FF9800" />
            <View style={styles.durationInfo}>
              <Text style={styles.durationTitle}>Durée moyenne des missions</Text>
              <Text style={styles.durationValue}>
                {mockAnalyticsData.timeStats.averageDuration} minutes
              </Text>
            </View>
          </View>
        </View>

        {/* Client Analysis */}
        <View style={styles.clientSection}>
          <Text style={styles.sectionTitle}>Analyse clientèle</Text>
          
          <View style={styles.clientGrid}>
            <View style={styles.clientCard}>
              <Users size={24} color="#2196F3" />
              <Text style={styles.clientValue}>{mockAnalyticsData.clientStats.newClients}</Text>
              <Text style={styles.clientLabel}>Nouveaux clients</Text>
            </View>
            
            <View style={styles.clientCard}>
              <Target size={24} color="#4CAF50" />
              <Text style={styles.clientValue}>{mockAnalyticsData.clientStats.repeatClients}</Text>
              <Text style={styles.clientLabel}>Clients fidèles</Text>
            </View>
            
            <View style={styles.clientCard}>
              <TrendingUp size={24} color="#FF9800" />
              <Text style={styles.clientValue}>{mockAnalyticsData.clientStats.clientRetentionRate}%</Text>
              <Text style={styles.clientLabel}>Taux de fidélisation</Text>
            </View>
            
            <View style={styles.clientCard}>
              <BarChart3 size={24} color="#FF4444" />
              <Text style={styles.clientValue}>{mockAnalyticsData.clientStats.averageOrderValue.toFixed(2)}€</Text>
              <Text style={styles.clientLabel}>Panier moyen</Text>
            </View>
          </View>
        </View>

        {/* Monthly Trend */}
        <View style={styles.trendSection}>
          <Text style={styles.sectionTitle}>Évolution sur 6 mois</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.trendList}>
              {mockAnalyticsData.monthlyTrend.map((item, index) => 
                renderMonthlyTrend(item, index)
              )}
            </View>
          </ScrollView>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#FF4444',
  },
  periodButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  overviewSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewCard: {
    width: (width - 56) / 2,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  overviewValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  performanceSection: {
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
  comparisonCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  comparisonHeader: {
    marginBottom: 16,
  },
  comparisonTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  comparisonGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 8,
  },
  comparisonValues: {
    alignItems: 'center',
  },
  comparisonCurrent: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 4,
  },
  comparisonGrowth: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  positiveGrowth: {
    color: '#4CAF50',
  },
  negativeGrowth: {
    color: '#F44336',
  },
  categorySection: {
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
  categoryList: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  categoryPercentage: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#666',
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 24,
  },
  categoryMissions: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  categoryEarnings: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
  },
  timeSection: {
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
  timeGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timeCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  timeTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginTop: 8,
    marginBottom: 12,
  },
  timeList: {
    alignItems: 'center',
    gap: 4,
  },
  timeItem: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  durationCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationInfo: {
    marginLeft: 12,
  },
  durationTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  durationValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FF9800',
  },
  clientSection: {
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
  clientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  clientCard: {
    width: (width - 76) / 2,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  clientValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  clientLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  trendSection: {
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
  trendList: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
  },
  trendCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  trendMonth: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginBottom: 12,
  },
  trendStats: {
    alignItems: 'center',
    gap: 4,
  },
  trendMissions: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  trendEarnings: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
  },
  trendRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendRatingText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
});
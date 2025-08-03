import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Star, 
  Calendar, 
  Clock, 
  Gift, 
  Target, 
  Activity, 
  BarChart3 
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// 🛡️ HELPERS DE RENDU SÉCURISÉ
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const safeNumber = (value: any): string => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return String(Math.floor(Number(value)));
};

const SafeText = ({ children, style }: { children: any; style?: any }) => (
  <Text style={style}>{safeString(children)}</Text>
);

interface AnalyticsData {
  totalUsers: number;
  totalFourmiz: number;
  monthlyRevenue: number;
  avgCommission: number;
  totalBonuses: number;
  activeUsers: number;
  avgRating: number;
  completionRate: number;
}

interface ServiceStat {
  name: string;
  count: number;
  avg_rating: number;
  avg_price: number;
}

interface ViralityPrediction {
  metric: string;
  current: string;
  predicted: string;
  growth: string;
}

const AdminAnalytics = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  // Données simulées réalistes
  const analyticsData: AnalyticsData = {
    totalUsers: 15420,
    totalFourmiz: 2890,
    monthlyRevenue: 125000,
    avgCommission: 12.5,
    totalBonuses: 8500,
    activeUsers: 3200,
    avgRating: 4.3,
    completionRate: 96.5
  };

  // Statistiques des services
  const serviceStats: ServiceStat[] = [
    { name: 'Livraison', count: 2500, avg_rating: 4.3, avg_price: 12.5 },
    { name: 'Courses', count: 1800, avg_rating: 4.5, avg_price: 15.0 },
    { name: 'Ménage', count: 900, avg_rating: 4.7, avg_price: 25.0 },
    { name: 'Jardinage', count: 400, avg_rating: 4.4, avg_price: 35.0 },
    { name: 'Bricolage', count: 600, avg_rating: 4.2, avg_price: 40.0 },
  ];

  // Prévisions de viralité
  const viralityPredictions: ViralityPrediction[] = [
    { metric: 'Taux de parrainage', current: '12%', predicted: '18%', growth: '+6%' },
    { metric: 'Nouveaux utilisateurs/jour', current: '45', predicted: '75', growth: '+67%' },
    { metric: 'Rétention 30j', current: '68%', predicted: '75%', growth: '+7%' },
    { metric: 'CA mensuel', current: '125k€', predicted: '180k€', growth: '+44%' },
  ];

  // Données de notation
  const ratingData = [
    { stars: 5, count: 3200, color: '#10B981' },
    { stars: 4, count: 1800, color: '#84CC16' },
    { stars: 3, count: 400, color: '#F59E0B' },
    { stars: 2, count: 150, color: '#F97316' },
    { stars: 1, count: 50, color: '#EF4444' },
  ];

  // Données de revenus détaillées
  const revenueData = [
    { period: "Aujourd'hui", revenue: '4,250€', commissions: '531€', bonus: '150€', growth: '+12%' },
    { period: 'Cette semaine', revenue: '28,750€', commissions: '3,594€', bonus: '950€', growth: '+18%' },
    { period: 'Ce mois', revenue: '125,000€', commissions: '15,625€', bonus: '4,200€', growth: '+22%' },
    { period: 'Cette année', revenue: '1,250,000€', commissions: '156,250€', bonus: '38,500€', growth: '+45%' },
  ];

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    color = '#3B82F6',
    backgroundColor = '#F3F4F6' 
  }: {
    title: string;
    value: string;
    icon: any;
    trend?: string;
    color?: string;
    backgroundColor?: string;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardHeader}>
        <View style={styles.statCardContent}>
          <SafeText style={styles.statCardTitle}>{title}</SafeText>
          <SafeText style={styles.statCardValue}>{value}</SafeText>
          {trend && (
            <SafeText style={[
              styles.statCardTrend,
              { color: trend.startsWith('+') ? '#10B981' : '#EF4444' }
            ]}>
              {trend} vs mois dernier
            </SafeText>
          )}
        </View>
        <View style={[styles.statCardIcon, { backgroundColor: color + '20' }]}>
          <Icon size={24} color={color} />
        </View>
      </View>
    </View>
  );

  const TabButton = ({ 
    id, 
    label, 
    active, 
    onPress 
  }: {
    id: string;
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.tabButton,
        active ? styles.tabButtonActive : styles.tabButtonInactive
      ]}
      activeOpacity={0.7}
    >
      <SafeText style={[
        styles.tabButtonText,
        active ? styles.tabButtonTextActive : styles.tabButtonTextInactive
      ]}>
        {label}
      </SafeText>
    </TouchableOpacity>
  );

  const ServiceCard = ({ service }: { service: ServiceStat }) => {
    const totalOrders = serviceStats.reduce((sum, s) => sum + s.count, 0);
    const marketShare = ((service.count / totalOrders) * 100).toFixed(1);
    
    return (
      <View style={styles.serviceCard}>
        <View style={styles.serviceCardHeader}>
          <SafeText style={styles.serviceCardName}>{service.name}</SafeText>
          <SafeText style={styles.serviceCardMarketShare}>{marketShare}%</SafeText>
        </View>
        
        <View style={styles.serviceCardStats}>
          <View style={styles.serviceCardStat}>
            <SafeText style={styles.serviceCardStatLabel}>Commandes</SafeText>
            <SafeText style={styles.serviceCardStatValue}>{safeNumber(service.count)}</SafeText>
          </View>
          
          <View style={styles.serviceCardStat}>
            <SafeText style={styles.serviceCardStatLabel}>Note</SafeText>
            <View style={styles.serviceCardRating}>
              <Star size={16} color="#FbbF24" fill="#FbbF24" />
              <SafeText style={styles.serviceCardStatValue}>{service.avg_rating}</SafeText>
            </View>
          </View>
          
          <View style={styles.serviceCardStat}>
            <SafeText style={styles.serviceCardStatLabel}>Prix moyen</SafeText>
            <SafeText style={styles.serviceCardStatValue}>{service.avg_price}€</SafeText>
          </View>
        </View>
      </View>
    );
  };

  const PredictionCard = ({ prediction }: { prediction: ViralityPrediction }) => (
    <View style={styles.predictionCard}>
      <SafeText style={styles.predictionCardTitle}>{prediction.metric}</SafeText>
      
      <View style={styles.predictionCardContent}>
        <View style={styles.predictionCardRow}>
          <SafeText style={styles.predictionCardLabel}>Actuel:</SafeText>
          <SafeText style={styles.predictionCardValue}>{prediction.current}</SafeText>
        </View>
        
        <View style={styles.predictionCardRow}>
          <SafeText style={styles.predictionCardLabel}>Prévu (3 mois):</SafeText>
          <SafeText style={styles.predictionCardValue}>{prediction.predicted}</SafeText>
        </View>
        
        <View style={styles.predictionCardRow}>
          <SafeText style={styles.predictionCardLabel}>Croissance:</SafeText>
          <SafeText style={[styles.predictionCardGrowth, { color: '#10B981' }]}>
            {prediction.growth}
          </SafeText>
        </View>
      </View>
    </View>
  );

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* KPIs principaux */}
      <View style={styles.section}>
        <SafeText style={styles.sectionTitle}>Indicateurs Clés</SafeText>
        <View style={styles.statsGrid}>
          <StatCard 
            title="Total Clients" 
            value={analyticsData.totalUsers.toLocaleString()} 
            icon={Users} 
            trend="+15%" 
            color="#3B82F6"
          />
          <StatCard 
            title="Total Fourmiz" 
            value={analyticsData.totalFourmiz.toLocaleString()} 
            icon={Target} 
            trend="+8%" 
            color="#10B981"
          />
          <StatCard 
            title="CA Mensuel" 
            value={`${(analyticsData.monthlyRevenue/1000).toFixed(0)}k€`} 
            icon={DollarSign} 
            trend="+22%" 
            color="#F59E0B"
          />
          <StatCard 
            title="Note Moyenne" 
            value={analyticsData.avgRating.toString()} 
            icon={Star} 
            trend="+0.2" 
            color="#EF4444"
          />
        </View>
      </View>

      {/* Statistiques secondaires */}
      <View style={styles.section}>
        <SafeText style={styles.sectionTitle}>Performance</SafeText>
        <View style={styles.performanceGrid}>
          <View style={styles.performanceCard}>
            <SafeText style={styles.performanceCardLabel}>Taux de completion</SafeText>
            <SafeText style={[styles.performanceCardValue, { color: '#10B981' }]}>
              {analyticsData.completionRate}%
            </SafeText>
          </View>
          
          <View style={styles.performanceCard}>
            <SafeText style={styles.performanceCardLabel}>Utilisateurs actifs</SafeText>
            <SafeText style={[styles.performanceCardValue, { color: '#3B82F6' }]}>
              {safeNumber(analyticsData.activeUsers)}
            </SafeText>
          </View>
          
          <View style={styles.performanceCard}>
            <SafeText style={styles.performanceCardLabel}>Commission moyenne</SafeText>
            <SafeText style={[styles.performanceCardValue, { color: '#F59E0B' }]}>
              {analyticsData.avgCommission}%
            </SafeText>
          </View>
          
          <View style={styles.performanceCard}>
            <SafeText style={styles.performanceCardLabel}>Bonus totaux</SafeText>
            <SafeText style={[styles.performanceCardValue, { color: '#EF4444' }]}>
              {safeNumber(analyticsData.totalBonuses)}€
            </SafeText>
          </View>
        </View>
      </View>

      {/* Répartition des notes */}
      <View style={styles.section}>
        <SafeText style={styles.sectionTitle}>Répartition des Notes</SafeText>
        <View style={styles.ratingsContainer}>
          {ratingData.map((rating, index) => (
            <View key={index} style={styles.ratingRow}>
              <View style={styles.ratingStars}>
                {[...Array(rating.stars)].map((_, i) => (
                  <Star key={i} size={16} color="#FbbF24" fill="#FbbF24" />
                ))}
              </View>
              <View style={[styles.ratingBar, styles.ratingBarContainer]}>
                <View 
                  style={[
                    styles.ratingBarFill, 
                    { 
                      width: `${(rating.count / 5600) * 100}%`,
                      backgroundColor: rating.color 
                    }
                  ]} 
                />
              </View>
              <SafeText style={styles.ratingCount}>{safeNumber(rating.count)}</SafeText>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderRevenueTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* KPIs revenus */}
      <View style={styles.section}>
        <SafeText style={styles.sectionTitle}>Revenus & Commissions</SafeText>
        <View style={styles.statsGrid}>
          <StatCard 
            title="CA Aujourd'hui" 
            value="4,250€" 
            icon={DollarSign} 
            trend="+12%" 
            color="#10B981"
          />
          <StatCard 
            title="Commission Moyenne" 
            value={`${analyticsData.avgCommission}%`} 
            icon={TrendingUp} 
            trend="+0.5%" 
            color="#3B82F6"
          />
          <StatCard 
            title="Bonus Parrainage" 
            value="850€" 
            icon={Gift} 
            trend="+18%" 
            color="#F59E0B"
          />
        </View>
      </View>

      {/* Tableau des revenus */}
      <View style={styles.section}>
        <SafeText style={styles.sectionTitle}>Détail des Revenus par Période</SafeText>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <SafeText style={[styles.tableHeaderText, { flex: 2 }]}>Période</SafeText>
            <SafeText style={[styles.tableHeaderText, { flex: 1.5 }]}>CA</SafeText>
            <SafeText style={[styles.tableHeaderText, { flex: 1.5 }]}>Commissions</SafeText>
            <SafeText style={[styles.tableHeaderText, { flex: 1 }]}>Croissance</SafeText>
          </View>
          
          {revenueData.map((row, index) => (
            <View key={index} style={[
              styles.tableRow,
              index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
            ]}>
              <SafeText style={[styles.tableCell, { flex: 2 }]}>{row.period}</SafeText>
              <SafeText style={[styles.tableCell, { flex: 1.5 }]}>{row.revenue}</SafeText>
              <SafeText style={[styles.tableCell, { flex: 1.5 }]}>{row.commissions}</SafeText>
              <SafeText style={[
                styles.tableCell, 
                { flex: 1, color: row.growth.startsWith('+') ? '#10B981' : '#EF4444' }
              ]}>
                {row.growth}
              </SafeText>
            </View>
          ))}
        </View>
      </View>

      {/* Insights prix */}
      <View style={styles.section}>
        <SafeText style={styles.sectionTitle}>Insights Prix</SafeText>
        <View style={styles.insightsContainer}>
          <View style={[styles.insightCard, { backgroundColor: '#EBF8FF' }]}>
            <SafeText style={[styles.insightTitle, { color: '#1E40AF' }]}>
              Prix Optimaux
            </SafeText>
            <SafeText style={[styles.insightText, { color: '#1E40AF' }]}>
              • Prix le plus populaire: 15€ (1,240 commandes){'\n'}
              • Zone optimale: 14€-16€{'\n'}
              • Panier moyen optimal: 16.5€
            </SafeText>
          </View>
          
          <View style={[styles.insightCard, { backgroundColor: '#F0FDF4' }]}>
            <SafeText style={[styles.insightTitle, { color: '#166534' }]}>
              Recommandations
            </SafeText>
            <SafeText style={[styles.insightText, { color: '#166534' }]}>
              • Promouvoir services 14€-16€{'\n'}
              • Créer offres groupées 25€ et 35€{'\n'}
              • Tester prix premium 49€ et 59€
            </SafeText>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderStatsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Services */}
      <View style={styles.section}>
        <SafeText style={styles.sectionTitle}>Statistiques par Service</SafeText>
        <View style={styles.servicesContainer}>
          {serviceStats.map((service, index) => (
            <ServiceCard key={index} service={service} />
          ))}
        </View>
      </View>

      {/* Performance Fourmiz */}
      <View style={styles.section}>
        <SafeText style={styles.sectionTitle}>Performance des Fourmiz</SafeText>
        <View style={styles.performanceGrid}>
          <View style={styles.performanceCard}>
            <SafeText style={styles.performanceCardLabel}>Taux de completion</SafeText>
            <SafeText style={[styles.performanceCardValue, { color: '#10B981' }]}>96.5%</SafeText>
          </View>
          
          <View style={styles.performanceCard}>
            <SafeText style={styles.performanceCardLabel}>Temps de réponse moyen</SafeText>
            <SafeText style={[styles.performanceCardValue, { color: '#3B82F6' }]}>8 min</SafeText>
          </View>
          
          <View style={styles.performanceCard}>
            <SafeText style={styles.performanceCardLabel}>Fourmiz actifs (24h)</SafeText>
            <SafeText style={[styles.performanceCardValue, { color: '#8B5CF6' }]}>1,240</SafeText>
          </View>
          
          <View style={styles.performanceCard}>
            <SafeText style={styles.performanceCardLabel}>Revenus moyen/Fourmiz</SafeText>
            <SafeText style={[styles.performanceCardValue, { color: '#F59E0B' }]}>340€</SafeText>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderPredictionsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Prédictions */}
      <View style={styles.section}>
        <SafeText style={styles.sectionTitle}>Prédictions de Croissance & Viralité</SafeText>
        <View style={styles.predictionsGrid}>
          {viralityPredictions.map((prediction, index) => (
            <PredictionCard key={index} prediction={prediction} />
          ))}
        </View>
      </View>

      {/* Facteurs de viralité */}
      <View style={styles.section}>
        <SafeText style={styles.sectionTitle}>Facteurs de Viralité</SafeText>
        <View style={styles.viralityContainer}>
          <View style={[styles.viralityCard, { backgroundColor: '#F0FDF4' }]}>
            <SafeText style={styles.viralityCardLabel}>Taux de parrainage réussi</SafeText>
            <SafeText style={[styles.viralityCardValue, { color: '#16A34A' }]}>78%</SafeText>
          </View>
          
          <View style={[styles.viralityCard, { backgroundColor: '#EBF8FF' }]}>
            <SafeText style={styles.viralityCardLabel}>Partages réseaux sociaux</SafeText>
            <SafeText style={[styles.viralityCardValue, { color: '#2563EB' }]}>+45%</SafeText>
          </View>
          
          <View style={[styles.viralityCard, { backgroundColor: '#FAF5FF' }]}>
            <SafeText style={styles.viralityCardLabel}>Score NPS</SafeText>
            <SafeText style={[styles.viralityCardValue, { color: '#9333EA' }]}>68</SafeText>
          </View>
          
          <View style={[styles.viralityCard, { backgroundColor: '#FFF7ED' }]}>
            <SafeText style={styles.viralityCardLabel}>Utilisation organique</SafeText>
            <SafeText style={[styles.viralityCardValue, { color: '#EA580C' }]}>82%</SafeText>
          </View>
        </View>
      </View>

      {/* Recommandations stratégiques */}
      <View style={styles.section}>
        <SafeText style={styles.sectionTitle}>Recommandations Stratégiques</SafeText>
        <View style={styles.recommendationsContainer}>
          <View style={[styles.recommendationCard, { borderLeftColor: '#10B981' }]}>
            <SafeText style={[styles.recommendationTitle, { color: '#166534' }]}>
              Court terme (1-3 mois)
            </SafeText>
            <SafeText style={[styles.recommendationText, { color: '#166534' }]}>
              • Augmenter bonus parrainage de 20%{'\n'}
              • Lancer programme de fidélité{'\n'}
              • Optimiser les heures de pointe
            </SafeText>
          </View>
          
          <View style={[styles.recommendationCard, { borderLeftColor: '#3B82F6' }]}>
            <SafeText style={[styles.recommendationTitle, { color: '#1E40AF' }]}>
              Moyen terme (3-6 mois)
            </SafeText>
            <SafeText style={[styles.recommendationText, { color: '#1E40AF' }]}>
              • Expansion géographique{'\n'}
              • Nouveaux services premium{'\n'}
              • Partenariats stratégiques
            </SafeText>
          </View>
          
          <View style={[styles.recommendationCard, { borderLeftColor: '#8B5CF6' }]}>
            <SafeText style={[styles.recommendationTitle, { color: '#6B21A8' }]}>
              Long terme (6+ mois)
            </SafeText>
            <SafeText style={[styles.recommendationText, { color: '#6B21A8' }]}>
              • IA pour optimisation routes{'\n'}
              • Plateforme B2B{'\n'}
              • International
            </SafeText>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.layout}>
        {/* Header */}
        <View style={styles.header}>
          <SafeText style={styles.headerTitle}>Analytics Avancées</SafeText>
          <SafeText style={styles.headerSubtitle}>
            Analyse complète des performances de l'application
          </SafeText>
        </View>

        {/* Navigation des onglets */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabNavigation}
          contentContainerStyle={styles.tabNavigationContent}
        >
          <TabButton 
            id="overview" 
            label="Vue d'ensemble" 
            active={selectedTab === 'overview'} 
            onPress={() => setSelectedTab('overview')} 
          />
          <TabButton 
            id="revenue" 
            label="Revenus" 
            active={selectedTab === 'revenue'} 
            onPress={() => setSelectedTab('revenue')} 
          />
          <TabButton 
            id="stats" 
            label="Services" 
            active={selectedTab === 'stats'} 
            onPress={() => setSelectedTab('stats')} 
          />
          <TabButton 
            id="predictions" 
            label="Prédictions" 
            active={selectedTab === 'predictions'} 
            onPress={() => setSelectedTab('predictions')} 
          />
        </ScrollView>

        {/* Contenu */}
        <View style={styles.content}>
          {selectedTab === 'overview' && renderOverviewTab()}
          {selectedTab === 'revenue' && renderRevenueTab()}
          {selectedTab === 'stats' && renderStatsTab()}
          {selectedTab === 'predictions' && renderPredictionsTab()}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <SafeText style={styles.footerText}>
            Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
          </SafeText>
          <View style={styles.footerStatus}>
            <SafeText style={styles.footerStatusText}>Données en temps réel</SafeText>
            <View style={styles.footerStatusIndicator} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  layout: {
    flex: 1,
  },
  
  // Header
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
  },

  // Tab Navigation
  tabNavigation: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tabNavigationContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  tabButtonActive: {
    backgroundColor: '#3B82F6',
  },
  tabButtonInactive: {
    backgroundColor: '#F3F4F6',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  tabButtonTextInactive: {
    color: '#374151',
  },

  // Content
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },

  // Stats Cards
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardContent: {
    flex: 1,
  },
  statCardTitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  statCardTrend: {
    fontSize: 12,
  },
  statCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Performance Cards
  performanceGrid: {
    gap: 12,
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceCardLabel: {
    fontSize: 14,
    color: '#666666',
  },
  performanceCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Ratings
  ratingsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    width: 100,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  ratingBar: {
    height: 8,
    borderRadius: 4,
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: '#666666',
    width: 40,
    textAlign: 'right',
  },

  // Services
  servicesContainer: {
    gap: 12,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  serviceCardMarketShare: {
    fontSize: 14,
    color: '#666666',
  },
  serviceCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceCardStat: {
    alignItems: 'center',
  },
  serviceCardStatLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  serviceCardStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  serviceCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Table
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableRowEven: {
    backgroundColor: '#F9FAFB',
  },
  tableRowOdd: {
    backgroundColor: '#FFFFFF',
  },
  tableCell: {
    fontSize: 14,
    color: '#333333',
  },

  // Insights
  insightsContainer: {
    gap: 12,
  },
  insightCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Predictions
  predictionsGrid: {
    gap: 12,
  },
  predictionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  predictionCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  predictionCardContent: {
    gap: 8,
  },
  predictionCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  predictionCardLabel: {
    fontSize: 12,
    color: '#666666',
  },
  predictionCardValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  predictionCardGrowth: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Virality
  viralityContainer: {
    gap: 12,
  },
  viralityCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viralityCardLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  viralityCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Recommendations
  recommendationsContainer: {
    gap: 16,
  },
  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Footer
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  footerText: {
    fontSize: 12,
    color: '#666666',
  },
  footerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerStatusText: {
    fontSize: 12,
    color: '#666666',
  },
  footerStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
});

export default AdminAnalytics;
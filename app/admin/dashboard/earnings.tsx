import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Euro, 
  TrendingUp, 
  Calendar, 
  Download, 
  Filter, 
  CreditCard, 
  Clock, 
  CircleCheck as CheckCircle, 
  CircleAlert as AlertCircle, 
  Award,
  BarChart3,
  RefreshCw,
  FileText,
  Mail,
  Eye,
  EyeOff
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart, PieChart } from 'recharts';
import { supabase } from '../../../lib/supabase'; // Ajustez le chemin selon votre structure

const { width } = Dimensions.get('window');

// ✅ INTERFACES TYPESCRIPT STRICTES (selon audit)
interface EarningsSummary {
  total_earnings: number;
  month_earnings: number;
  week_earnings: number;
  pending_amount: number;
  last_payout_date: string;
  next_payout_date: string;
  badges_rewards: number;
}

interface EarningsBreakdown {
  direct_commissions: number;
  referral_commissions: number;
  bonuses: number;
  badges_rewards: number;
}

interface Transaction {
  id: string;
  type: 'commission' | 'referral' | 'bonus' | 'badge' | 'payout';
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'processing';
  date: string;
  order_id: string;
  user_id: string;
}

interface MonthlyStats {
  month: string;
  earnings: number;
  missions: number;
  date: string;
}

interface EarningsData {
  summary: EarningsSummary;
  breakdown: EarningsBreakdown;
  transactions: Transaction[];
  monthlyStats: MonthlyStats[];
}

// ✅ CONFIGURATION DES TYPES ET STATUTS
const transactionTypeConfig = {
  commission: { label: 'Commission', color: '#4CAF50', icon: Euro },
  referral: { label: 'Filleul', color: '#2196F3', icon: TrendingUp },
  bonus: { label: 'Bonus', color: '#FF9800', icon: CheckCircle },
  badge: { label: 'Badge', color: '#FFD700', icon: Award },
  payout: { label: 'Virement', color: '#666', icon: CreditCard },
};

const statusConfig = {
  completed: { label: 'Terminé', color: '#4CAF50', icon: CheckCircle },
  pending: { label: 'En attente', color: '#FF9800', icon: Clock },
  processing: { label: 'En cours', color: '#2196F3', icon: AlertCircle },
};

export default function EarningsScreen() {
  // ✅ ÉTATS DE CHARGEMENT ET GESTION D'ERREUR (modèle ServicesScreen)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // États de filtrage et affichage
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [filterType, setFilterType] = useState<'all' | 'commission' | 'referral' | 'bonus' | 'badge' | 'payout'>('all');
  const [showCharts, setShowCharts] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const { mode } = useLocalSearchParams();
  const isFourmizMode = mode === 'fourmiz';

  // ✅ CHARGEMENT DES DONNÉES SUPABASE (selon modèle excellence)
  const loadEarningsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer l'utilisateur actuel
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Utilisateur non connecté');
      
      setCurrentUserId(user.id);

      // Charger les données en parallèle
      const [summaryResult, transactionsResult, statsResult] = await Promise.all([
        loadEarningsSummary(user.id),
        loadTransactions(user.id),
        loadMonthlyStats(user.id),
      ]);

      const breakdown = calculateBreakdown(transactionsResult);

      setEarningsData({
        summary: summaryResult,
        breakdown,
        transactions: transactionsResult,
        monthlyStats: statsResult,
      });

    } catch (error) {
      console.error('Erreur chargement gains:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
      Alert.alert('Erreur', 'Impossible de charger les données des gains');
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ FONCTIONS DE CHARGEMENT MODULAIRES
  const loadEarningsSummary = async (userId: string): Promise<EarningsSummary> => {
    const { data, error } = await supabase
      .from('earnings_summary')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  };

  const loadTransactions = async (userId: string): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  };

  const loadMonthlyStats = async (userId: string): Promise<MonthlyStats[]> => {
    const { data, error } = await supabase
      .from('monthly_earnings_stats')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(6);

    if (error) throw error;
    return data || [];
  };

  // ✅ CALCULS INTELLIGENTS
  const calculateBreakdown = (transactions: Transaction[]): EarningsBreakdown => {
    const completed = transactions.filter(t => t.status === 'completed');
    
    return {
      direct_commissions: completed
        .filter(t => t.type === 'commission')
        .reduce((sum, t) => sum + t.amount, 0),
      referral_commissions: completed
        .filter(t => t.type === 'referral')
        .reduce((sum, t) => sum + t.amount, 0),
      bonuses: completed
        .filter(t => t.type === 'bonus')
        .reduce((sum, t) => sum + t.amount, 0),
      badges_rewards: completed
        .filter(t => t.type === 'badge')
        .reduce((sum, t) => sum + t.amount, 0),
    };
  };

  // ✅ RAFRAÎCHISSEMENT DES DONNÉES
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEarningsData();
    setRefreshing(false);
  };

  // ✅ EXPORT DES DONNÉES (nouvelle fonctionnalité)
  const exportEarningsData = async () => {
    try {
      setExporting(true);
      
      if (!earningsData) return;

      const csvContent = generateCSVReport(earningsData);
      const pdfContent = generatePDFReport(earningsData);
      
      // Proposer les options d'export
      Alert.alert(
        'Exporter les données',
        'Choisissez le format d\'export',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'CSV', onPress: () => shareContent(csvContent, 'earnings.csv') },
          { text: 'PDF', onPress: () => shareContent(pdfContent, 'earnings.pdf') },
          { text: 'Email', onPress: () => sendByEmail(csvContent) },
        ]
      );

    } catch (error) {
      console.error('Erreur export:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter les données');
    } finally {
      setExporting(false);
    }
  };

  const generateCSVReport = (data: EarningsData): string => {
    const headers = 'Date,Type,Description,Montant,Statut,ID Commande\n';
    const rows = data.transactions.map(t => 
      `${t.date},${t.type},${t.description},${t.amount},${t.status},${t.order_id}`
    ).join('\n');
    
    return headers + rows;
  };

  const generatePDFReport = (data: EarningsData): string => {
    // Implémentation basique - vous pouvez utiliser une lib comme react-native-html-to-pdf
    return `Rapport de gains - ${new Date().toLocaleDateString()}`;
  };

  const shareContent = async (content: string, filename: string) => {
    try {
      await Share.share({
        message: content,
        title: `Rapport de gains - ${filename}`,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const sendByEmail = async (content: string) => {
    try {
      // Implémentation basique - vous pouvez utiliser react-native-email-link
      await Share.share({
        message: content,
        title: 'Rapport de gains',
      });
    } catch (error) {
      console.error('Erreur email:', error);
    }
  };

  // ✅ CHARGEMENT INITIAL
  useEffect(() => {
    loadEarningsData();
  }, [loadEarningsData]);

  // ✅ FILTRAGE DES TRANSACTIONS
  const filteredTransactions = earningsData?.transactions.filter(transaction => 
    filterType === 'all' || transaction.type === filterType
  ) || [];

  // ✅ DONNÉES POUR GRAPHIQUES
  const chartData = earningsData?.monthlyStats.map(stat => ({
    name: stat.month,
    earnings: stat.earnings,
    missions: stat.missions,
  })) || [];

  const pieData = earningsData ? [
    { name: 'Commissions directes', value: earningsData.breakdown.direct_commissions, color: '#4CAF50' },
    { name: 'Commissions filleuls', value: earningsData.breakdown.referral_commissions, color: '#2196F3' },
    { name: 'Bonus', value: earningsData.breakdown.bonuses, color: '#FF9800' },
    { name: 'Badges', value: earningsData.breakdown.badges_rewards, color: '#FFD700' },
  ] : [];

  // ✅ COMPOSANTS DE RENDU
  const renderTransaction = ({ item }: { item: Transaction }) => {
    const typeConfig = transactionTypeConfig[item.type];
    const statusInfo = statusConfig[item.status];
    const TypeIcon = typeConfig.icon;
    const StatusIcon = statusInfo.icon;

    return (
      <TouchableOpacity style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <View style={[styles.transactionIcon, { backgroundColor: typeConfig.color + '15' }]}>
              <TypeIcon size={20} color={typeConfig.color} />
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionDescription}>{item.description}</Text>
              <View style={styles.transactionMeta}>
                <Text style={styles.transactionDate}>
                  {new Date(item.date).toLocaleDateString('fr-FR')}
                </Text>
                <View style={styles.transactionStatus}>
                  <StatusIcon size={12} color={statusInfo.color} />
                  <Text style={[styles.transactionStatusText, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <Text style={[
            styles.transactionAmount,
            { color: item.amount > 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {item.amount > 0 ? '+' : ''}{item.amount.toFixed(2)}€
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMonthStat = ({ item }: { item: MonthlyStats }) => (
    <View style={styles.monthStatCard}>
      <Text style={styles.monthName}>{item.month}</Text>
      <Text style={styles.monthEarnings}>{item.earnings.toFixed(0)}€</Text>
      <Text style={styles.monthMissions}>{item.missions} {isFourmizMode ? 'missions' : 'commandes'}</Text>
    </View>
  );

  // ✅ ÉCRAN DE CHARGEMENT
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes gains</Text>
          <View style={styles.downloadButton} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement des gains...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ ÉCRAN D'ERREUR
  if (error || !earningsData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes gains</Text>
          <TouchableOpacity style={styles.downloadButton} onPress={handleRefresh}>
            <RefreshCw size={24} color="#FF4444" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#F44336" />
          <Text style={styles.errorTitle}>Erreur de chargement</Text>
          <Text style={styles.errorMessage}>{error || 'Données indisponibles'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadEarningsData}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ✅ HEADER AMÉLIORÉ */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes gains</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerActionButton} 
            onPress={() => setShowCharts(!showCharts)}
          >
            {showCharts ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerActionButton} 
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw 
              size={20} 
              color={refreshing ? "#ccc" : "#666"} 
              style={refreshing ? { transform: [{ rotate: '180deg' }] } : {}}
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerActionButton} 
            onPress={exportEarningsData}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size={20} color="#FF4444" />
            ) : (
              <Download size={20} color="#FF4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ✅ CARTE RÉSUMÉ AMÉLIORÉE */}
        <LinearGradient
          colors={['#4CAF50', '#66BB6A']}
          style={styles.summaryCard}
        >
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Gains totaux</Text>
            <Text style={styles.summaryAmount}>
              {earningsData.summary.total_earnings.toFixed(2)}€
            </Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>Ce mois</Text>
                <Text style={styles.summaryStatValue}>
                  {earningsData.summary.month_earnings.toFixed(2)}€
                </Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>En attente</Text>
                <Text style={styles.summaryStatValue}>
                  {earningsData.summary.pending_amount.toFixed(2)}€
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ✅ GRAPHIQUES INTERACTIFS (nouvelle fonctionnalité) */}
        {showCharts && (
          <View style={styles.chartsSection}>
            <Text style={styles.sectionTitle}>Analyse visuelle</Text>
            
            {/* Graphique temporel */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Évolution mensuelle</Text>
              <LineChart
                width={width - 80}
                height={200}
                data={chartData}
                style={styles.chart}
              />
            </View>

            {/* Graphique en secteurs */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Répartition des revenus</Text>
              <PieChart
                width={width - 80}
                height={200}
                data={pieData}
                style={styles.chart}
              />
            </View>
          </View>
        )}

        {/* ✅ RÉPARTITION DES GAINS */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Répartition des gains</Text>
          
          <View style={styles.breakdownCard}>
            {isFourmizMode && (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownInfo}>
                  <View style={[styles.breakdownDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.breakdownLabel}>Vos propres services</Text>
                </View>
                <Text style={styles.breakdownAmount}>
                  {earningsData.breakdown.direct_commissions.toFixed(2)}€
                </Text>
              </View>
            )}
            
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownInfo}>
                <View style={[styles.breakdownDot, { backgroundColor: '#2196F3' }]} />
                <Text style={styles.breakdownLabel}>Commissions filleuls (2,5%)</Text>
              </View>
              <Text style={styles.breakdownAmount}>
                {earningsData.breakdown.referral_commissions.toFixed(2)}€
              </Text>
            </View>
            
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownInfo}>
                <View style={[styles.breakdownDot, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.breakdownLabel}>Bonus parrainage</Text>
              </View>
              <Text style={styles.breakdownAmount}>
                {earningsData.breakdown.bonuses.toFixed(2)}€
              </Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownInfo}>
                <View style={[styles.breakdownDot, { backgroundColor: '#FFD700' }]} />
                <Text style={styles.breakdownLabel}>Badges et Récompenses</Text>
              </View>
              <Text style={styles.breakdownAmount}>
                {earningsData.breakdown.badges_rewards.toFixed(2)}€
              </Text>
            </View>
          </View>
        </View>

        {/* ✅ STATISTIQUES MENSUELLES */}
        <View style={styles.monthlyStatsSection}>
          <Text style={styles.sectionTitle}>Évolution mensuelle</Text>
          <FlatList
            data={earningsData.monthlyStats}
            renderItem={renderMonthStat}
            keyExtractor={(item) => item.month}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthlyStatsList}
          />
        </View>

        {/* ✅ INFORMATIONS DE VIREMENT */}
        <View style={styles.payoutSection}>
          <Text style={styles.sectionTitle}>Prochains virements</Text>
          
          <View style={styles.payoutCard}>
            <View style={styles.payoutInfo}>
              <Calendar size={24} color="#2196F3" />
              <View style={styles.payoutDetails}>
                <Text style={styles.payoutTitle}>Prochain virement</Text>
                <Text style={styles.payoutDate}>
                  {new Date(earningsData.summary.next_payout_date).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </View>
            <Text style={styles.payoutAmount}>
              {earningsData.summary.pending_amount.toFixed(2)}€
            </Text>
          </View>
          
          <Text style={styles.payoutNote}>
            Les virements sont effectués chaque vendredi pour les gains de la semaine précédente.
          </Text>
        </View>

        {/* ✅ TRANSACTIONS AVEC FILTRES AMÉLIORÉS */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Historique des transactions</Text>
            <TouchableOpacity style={styles.filterButton}>
              <Filter size={20} color="#FF4444" />
            </TouchableOpacity>
          </View>

          {/* Onglets de filtrage */}
          <View style={styles.filterTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterTabsContainer}>
                {[
                  { key: 'all', label: 'Tout' },
                  { key: 'commission', label: 'Commissions' },
                  { key: 'referral', label: 'Filleuls' },
                  { key: 'bonus', label: 'Bonus' },
                  { key: 'badge', label: 'Badges' },
                  { key: 'payout', label: 'Virements' },
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterTab,
                      filterType === filter.key && styles.filterTabActive
                    ]}
                    onPress={() => setFilterType(filter.key as any)}
                  >
                    <Text style={[
                      styles.filterTabText,
                      filterType === filter.key && styles.filterTabTextActive
                    ]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.transactionsList}>
            {filteredTransactions.map((transaction) => (
              <View key={transaction.id}>
                {renderTransaction({ item: transaction })}
              </View>
            ))}
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
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  downloadButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  
  // ✅ STYLES DE CHARGEMENT ET ERREUR
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F44336',
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },

  // ✅ STYLES GRAPHIQUES
  chartsSection: {
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
  chartCard: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 8,
  },

  // ✅ STYLES EXISTANTS (conservés)
  summaryCard: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryContent: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 32,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 4,
  },
  summaryStatValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  breakdownSection: {
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
  breakdownCard: {
    gap: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
  },
  breakdownAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
  },
  monthlyStatsSection: {
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
  monthlyStatsList: {
    gap: 12,
    paddingRight: 20,
  },
  monthStatCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  monthName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
    marginBottom: 8,
  },
  monthEarnings: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  monthMissions: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
  payoutSection: {
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
  payoutCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  payoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  payoutDetails: {
    marginLeft: 12,
  },
  payoutTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  payoutDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  payoutAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
  },
  payoutNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    fontStyle: 'italic',
  },
  transactionsSection: {
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
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterButton: {
    padding: 8,
  },
  filterTabs: {
    marginBottom: 16,
  },
  filterTabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  filterTabActive: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  transactionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionStatusText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});
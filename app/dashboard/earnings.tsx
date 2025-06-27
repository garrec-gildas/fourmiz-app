import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Euro, TrendingUp, Calendar, Download, Filter, CreditCard, Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Award } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Mock data pour les gains
const mockEarningsData = {
  summary: {
    totalEarnings: 8945.60,
    thisMonth: 1156.80,
    thisWeek: 287.30,
    pending: 125.40,
    lastPayout: '2024-12-15',
    nextPayout: '2024-12-22',
    badgesRewards: 125.00, // Ajout des récompenses de badges
  },
  breakdown: {
    directCommissions: 7156.48, // 80% des ventes
    referralCommissions: 892.06, // 2.5% des filleuls
    bonuses: 897.06, // Bonus de parrainage
    badgesRewards: 125.00, // Récompenses de badges
  },
  recentTransactions: [
    {
      id: '1',
      type: 'commission',
      description: 'Livraison de courses - Marie D.',
      amount: 10.00, // 80% de 12.50€
      status: 'completed',
      date: '2024-12-20',
      orderId: 'ORD-001',
    },
    {
      id: '2',
      type: 'commission',
      description: 'Montage meuble IKEA - Thomas L.',
      amount: 28.00, // 80% de 35€
      status: 'pending',
      date: '2024-12-20',
      orderId: 'ORD-002',
    },
    {
      id: '3',
      type: 'referral',
      description: 'Commission filleul - Sophie M.',
      amount: 2.25, // 2.5% de 90€
      status: 'completed',
      date: '2024-12-19',
      orderId: 'REF-003',
    },
    {
      id: '4',
      type: 'bonus',
      description: 'Bonus parrainage - Lucas P.',
      amount: 3.00,
      status: 'completed',
      date: '2024-12-18',
      orderId: 'BON-004',
    },
    {
      id: '5',
      type: 'badge',
      description: 'Badge "Fourmiz Express"',
      amount: 10.00,
      status: 'completed',
      date: '2024-12-17',
      orderId: 'BDG-005',
    },
    {
      id: '6',
      type: 'payout',
      description: 'Virement bancaire',
      amount: -245.50,
      status: 'completed',
      date: '2024-12-15',
      orderId: 'PAY-006',
    },
  ],
  monthlyStats: [
    { month: 'Déc', earnings: 1156.80, missions: 18 },
    { month: 'Nov', earnings: 987.40, missions: 15 },
    { month: 'Oct', earnings: 1234.20, missions: 22 },
    { month: 'Sep', earnings: 876.30, missions: 14 },
    { month: 'Aoû', earnings: 1098.50, missions: 19 },
    { month: 'Jul', earnings: 1345.60, missions: 25 },
  ],
};

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
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [filterType, setFilterType] = useState<'all' | 'commission' | 'referral' | 'bonus' | 'badge' | 'payout'>('all');
  const { mode } = useLocalSearchParams();
  const isFourmizMode = mode === 'fourmiz';

  const filteredTransactions = mockEarningsData.recentTransactions.filter(transaction => 
    filterType === 'all' || transaction.type === filterType
  );

  const renderTransaction = ({ item }: { item: any }) => {
    const typeConfig = transactionTypeConfig[item.type as keyof typeof transactionTypeConfig];
    const statusInfo = statusConfig[item.status as keyof typeof statusConfig];
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

  const renderMonthStat = ({ item }: { item: any }) => (
    <View style={styles.monthStatCard}>
      <Text style={styles.monthName}>{item.month}</Text>
      <Text style={styles.monthEarnings}>{item.earnings.toFixed(0)}€</Text>
      <Text style={styles.monthMissions}>{item.missions} {isFourmizMode ? 'missions' : 'commandes'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes gains</Text>
        <TouchableOpacity style={styles.downloadButton}>
          <Download size={24} color="#FF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <LinearGradient
          colors={['#4CAF50', '#66BB6A']}
          style={styles.summaryCard}
        >
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Gains totaux</Text>
            <Text style={styles.summaryAmount}>
              {mockEarningsData.summary.totalEarnings.toFixed(2)}€
            </Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>Ce mois</Text>
                <Text style={styles.summaryStatValue}>
                  {mockEarningsData.summary.thisMonth.toFixed(2)}€
                </Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>En attente</Text>
                <Text style={styles.summaryStatValue}>
                  {mockEarningsData.summary.pending.toFixed(2)}€
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Breakdown */}
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
                  {mockEarningsData.breakdown.directCommissions.toFixed(2)}€
                </Text>
              </View>
            )}
            
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownInfo}>
                <View style={[styles.breakdownDot, { backgroundColor: '#2196F3' }]} />
                <Text style={styles.breakdownLabel}>Commissions filleuls (2,5%)</Text>
              </View>
              <Text style={styles.breakdownAmount}>
                {mockEarningsData.breakdown.referralCommissions.toFixed(2)}€
              </Text>
            </View>
            
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownInfo}>
                <View style={[styles.breakdownDot, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.breakdownLabel}>Bonus parrainage</Text>
              </View>
              <Text style={styles.breakdownAmount}>
                {mockEarningsData.breakdown.bonuses.toFixed(2)}€
              </Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownInfo}>
                <View style={[styles.breakdownDot, { backgroundColor: '#FFD700' }]} />
                <Text style={styles.breakdownLabel}>Badges et Récompenses</Text>
              </View>
              <Text style={styles.breakdownAmount}>
                {mockEarningsData.breakdown.badgesRewards.toFixed(2)}€
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly Stats */}
        <View style={styles.monthlyStatsSection}>
          <Text style={styles.sectionTitle}>Évolution mensuelle</Text>
          <FlatList
            data={mockEarningsData.monthlyStats}
            renderItem={renderMonthStat}
            keyExtractor={(item) => item.month}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthlyStatsList}
          />
        </View>

        {/* Payout Info */}
        <View style={styles.payoutSection}>
          <Text style={styles.sectionTitle}>Prochains virements</Text>
          
          <View style={styles.payoutCard}>
            <View style={styles.payoutInfo}>
              <Calendar size={24} color="#2196F3" />
              <View style={styles.payoutDetails}>
                <Text style={styles.payoutTitle}>Prochain virement</Text>
                <Text style={styles.payoutDate}>
                  {new Date(mockEarningsData.summary.nextPayout).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </View>
            <Text style={styles.payoutAmount}>
              {mockEarningsData.summary.pending.toFixed(2)}€
            </Text>
          </View>
          
          <Text style={styles.payoutNote}>
            Les virements sont effectués chaque vendredi pour les gains de la semaine précédente.
          </Text>
        </View>

        {/* Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Historique des transactions</Text>
            <TouchableOpacity style={styles.filterButton}>
              <Filter size={20} color="#FF4444" />
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
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
  downloadButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
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
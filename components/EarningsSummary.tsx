// components/EarningsSummary.tsx
// 💰 Composant résumé des gains de parrainage
// 🚀 Compatible avec le système de parrainage optimisé

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  loadEarningsData,
  formatAmount,
  formatGaintype,
  formatStatus,
  getStatusColor,
  ReferralGain,
  ReferralCommission,
  EarningsStats
} from '../lib/referralEarnings';

// 📋 Interfaces TypeScript 
interface EarningsSummaryProps {
  userId: string;
  onPress?: () => void;
  refreshTrigger?: number; // Pour forcer le refresh depuis un parent 
  showDetailButton?: boolean;
  compact?: boolean; // Version compacte pour intégration
}

interface EarningsData {
  gains: ReferralGain[];
  commissions: ReferralCommission[];
  stats: EarningsStats;
  totalTransactions: number;
  recentGains: ReferralGain[];
  pendingGains: ReferralGain[];
  paidGains: ReferralGain[];
}

interface LoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

// 🎨 Constantes de style
const COLORS = {
  primary: '#FF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
} as const;

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 3,
} as const;

export default function EarningsSummary({
  userId,
  onPress,
  refreshTrigger = 0,
  showDetailButton = true,
  compact = false
}: EarningsSummaryProps) {
  // 📊 État local
  const [earningsData, setEarningsData] = useState<EarningsData>({
    gains: [],
    commissions: [],
    stats: {
      totalGains: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      bonusAmount: 0,
      commissionAmount: 0,
      gainsLastMonth: 0
    },
    totalTransactions: 0,
    recentGains: [],
    pendingGains: [],
    paidGains: []
  });

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    isRefreshing: false,
    error: null
  });

  // 🔄 Chargement des données
  const loadData = useCallback(async (isRefresh = false): Promise<void> => {
    try {
      if (!userId) {
        throw new Error('User ID requis');
      }

      console.log('💰 Chargement données gains pour:', userId);
      
      setLoadingState(prev => ({
        ...prev,
        isLoading: !isRefresh,
        isRefreshing: isRefresh,
        error: null
      }));

      const data = await loadEarningsData(userId);
      
      console.log('✅ Données chargées:', {
        gains: data.gains.length,
        commissions: data.commissions.length,
        totalAmount: data.stats.totalAmount 
      });

      setEarningsData(data);
      
    } catch (error) {
      console.error('❌ Erreur chargement gains:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      setLoadingState(prev => ({
        ...prev,
        error: errorMessage
      }));
      
      if (!isRefresh) {
        Alert.alert(
          'Erreur',
          'Impossible de charger vos gains. Veuillez réessayer.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false
      }));
    }
  }, [userId]);

  // 🔄 Refresh manuel
  const handleRefresh = useCallback((): void => {
    loadData(true);
  }, [loadData]);

  // 📊 Calculs dérivés
  const summaryStats = useMemo(() => {
    const { stats } = earningsData;
    
    return {
      totalEarned: stats.totalAmount,
      available: stats.paidAmount,
      pending: stats.pendingAmount,
      thisMonth: stats.gainsLastMonth,
      totalTransactions: earningsData.totalTransactions,
      successRate: stats.totalGains > 0 ? (stats.paidAmount / stats.totalAmount * 100) : 0
    };
  }, [earningsData]);

  // ⚡ Effets
  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  // 🎨 Composants de rendu
  const renderStatCard = (
    title: string,
    value: string,
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
    subtitle?: string
  ) => (
    <View style={[styles.statCard, compact && styles.statCardCompact]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={compact ? 16 : 20} color={color} />
        <Text style={[styles.statTitle, compact && styles.statTitleCompact]}>
          {title}
        </Text>
      </View>
      <Text style={[styles.statValue, compact && styles.statValueCompact, { color }]}>
        {value}
      </Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, compact && styles.statSubtitleCompact]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  const renderRecentActivity = () => {
    if (compact || earningsData.recentGains.length === 0) return null;

    return (
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Gains récents</Text>
        {earningsData.recentGains.slice(0, 3).map((gain) => (
          <View key={gain.id} style={styles.activityItem}>
            <View style={styles.activityInfo}>
              <Text style={styles.activityType}>
                {formatGaintype(gain.type)}
              </Text>
              <Text style={styles.activityDate}>
                {new Date(gain.createdAt).toLocaleDateString('fr-FR')}
              </Text>
            </View>
            <View style={styles.activityAmount}>
              <Text style={[styles.activityValue, { color: COLORS.success }]}>
                {formatAmount(gain.amount)}
              </Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor(gain.status)}20` }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(gain.status) }
                ]}>
                  {formatStatus(gain.status)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="warning-outline" size={48} color={COLORS.warning} />
      <Text style={styles.errorTitle}>Erreur de chargement</Text>
      <Text style={styles.errorMessage}>{loadingState.error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Chargement de vos gains...</Text>
    </View>
  );

  // 🎯 Rendu principal
  if (loadingState.isLoading && !loadingState.isRefreshing) {
    return renderLoading();
  }

  if (loadingState.error && earningsData.stats.totalAmount === 0) {
    return renderError();
  }

  return (
    <ScrollView
      style={[styles.container, compact && styles.containerCompact]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loadingState.isRefreshing}
          onRefresh={handleRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* 💰 Résumé principal */}
      <View style={[styles.summaryCard, CARD_SHADOW]}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.summaryTitle}>Vos gains totaux</Text>
            <Text style={styles.summaryAmount}>
              {formatAmount(summaryStats.totalEarned)}
            </Text>
          </View>
          <View style={styles.summaryBadge}>
            <Ionicons name="trending-up" size={24} color={COLORS.white} />
          </View>
        </View>

        {/* 📊 Statistiques en grille */}
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Disponible',
            formatAmount(summaryStats.available),
            'wallet-outline',
            COLORS.success,
            `${summaryStats.successRate.toFixed(1)}% payés`
          )}
          
          {renderStatCard(
            'En attente',
            formatAmount(summaryStats.pending),
            'time-outline',
            COLORS.warning,
            `${earningsData.pendingGains.length} gain(s)`
          )}
          
          {renderStatCard(
            'Ce mois',
            summaryStats.thisMonth.toString(),
            'calendar-outline',
            COLORS.info,
            'nouveaux gains'
          )}
          
          {renderStatCard(
            'Transactions',
            summaryStats.totalTransactions.toString(),
            'receipt-outline',
            COLORS.gray,
            'au total'
          )}
        </View>

        {/* 🔍 Bouton détails */}
        {showDetailButton && onPress && (
          <TouchableOpacity style={styles.detailButton} onPress={onPress}>
            <Text style={styles.detailButtonText}>Voir le détail</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 📈 Activité récente */}
      {renderRecentActivity()}

      {/* 📭 Message si pas de gains */}
      {summaryStats.totalEarned === 0 && !loadingState.isLoading && (
        <View style={styles.emptyState}>
          <Ionicons name="gift-outline" size={64} color={COLORS.gray} />
          <Text style={styles.emptyTitle}>Aucun gain pour le moment</Text>
          <Text style={styles.emptyMessage}>
            Parrainez vos amis pour commencer à gagner des récompenses !
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    padding: 16,
  },
  containerCompact: {
    padding: 8,
  },

  // Chargement 
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },

  // Erreur
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },

  // Carte de résumé
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  summaryBadge: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Grille de stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 20,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  statCardCompact: {
    marginBottom: 8,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 6,
    fontWeight: '500',
  },
  statTitleCompact: {
    fontSize: 11,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statValueCompact: {
    fontSize: 16,
  },
  statSubtitle: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  statSubtitleCompact: {
    fontSize: 9,
  },

  // Bouton détail
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 4,
  },

  // Section activité
  activitySection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityInfo: {
    flex: 1,
  },
  activityType: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  activityAmount: {
    alignItems: 'flex-end',
  },
  activityValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // État vide
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    ...CARD_SHADOW,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
});
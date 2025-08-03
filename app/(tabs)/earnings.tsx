// app/(tabs)/earnings.tsx - VERSION AVEC USER_REVENUE_SUMMARY - CORRIGÉE
// ✅ CORRECTIONS: Toutes les utilisations de .includes() sont maintenant sécurisées
// ✅ Utilise la vue user_revenue_summary pour les revenus détaillés
// 🚀 REVENUS COMPLETS : Services, Parrainage, Récompenses

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface EarningsBreakdown {
  totalBadgesRewards: number;
  totalReferralBonus: number;
  totalReferralCommissions: number;
  totalServiceCommissions: number;
  revenusTotal: number;
}

interface Transaction {
  id: string;
  type: 'service' | 'referral_bonus' | 'referral_commission' | 'reward';
  description: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending';
  details?: string;
}

interface MonthlyEarnings {
  month: string;
  year: number;
  monthNumber: number;
  serviceCommissions: number;
  referralBonuses: number;
  referralCommissions: number;
  rewards: number;
  total: number;
}

// ✅ HELPERS SÉCURISÉS pour éviter les erreurs .includes()
const hasRole = (profile: any, role: string): boolean => {
  if (!profile || !profile.roles || !Array.isArray(profile.roles)) {
    return false;
  }
  return profile.roles.includes(role);
};

const getUserRoles = (profile: any): string[] => {
  if (!profile || !profile.roles || !Array.isArray(profile.roles)) {
    return [];
  }
  return profile.roles;
};

const isRoleOnly = (profile: any, role: string): boolean => {
  const roles = getUserRoles(profile);
  return roles.length === 1 && roles[0] === role;
};

export default function EarningsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [earnings, setEarnings] = useState<EarningsBreakdown>({
    totalBadgesRewards: 0,
    totalReferralBonus: 0,
    totalReferralCommissions: 0,
    totalServiceCommissions: 0,
    revenusTotal: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarnings[]>([]);

  // ✅ VARIABLES DE RÔLE SÉCURISÉES
  const userRoles = getUserRoles(userProfile);
  const isClientOnly = hasRole(userProfile, 'client') && !hasRole(userProfile, 'fourmiz');
  const isFourmiz = hasRole(userProfile, 'fourmiz');
  const canHaveServiceCommissions = isFourmiz;

  useEffect(() => {
    loadEarningsData();
  }, []);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return;
      }

      setCurrentUser(user);
      console.log('💰 Chargement gains pour:', user.id);

      // Vérifier les rôles de l'utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles, firstname, lastname')
        .eq('user_id', user.id)
        .single();

      if (!profile?.roles || profile.roles.length === 0) {
        Alert.alert('Erreur', 'Profil utilisateur non trouvé');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      await Promise.all([
        loadEarningsSummary(user.id),
        loadRecentTransactions(user.id, profile), // Passer le profil
        loadMonthlyBreakdown(user.id)
      ]);

    } catch (error) {
      console.error('❌ Erreur chargement gains:', error);
      Alert.alert('Erreur', 'Impossible de charger les données des gains');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEarningsData();
    setRefreshing(false);
  };

  // Charger le résumé des gains depuis user_revenue_summary
  const loadEarningsSummary = async (userId: string) => {
    try {
      console.log('📊 Chargement résumé gains...');

      const { data: summary, error } = await supabase
        .from('user_revenue_summary')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Erreur résumé gains:', error);
        // Si pas de données, garder les valeurs par défaut à 0
        return;
      }

      if (summary) {
        const newEarnings: EarningsBreakdown = {
          totalBadgesRewards: parseFloat(summary.total_badges_rewards || 0),
          totalReferralBonus: parseFloat(summary.total_referral_bonus || 0),
          totalReferralCommissions: parseFloat(summary.total_referral_commissions || 0),
          totalServiceCommissions: parseFloat(summary.total_service_commissions || 0),
          revenusTotal: parseFloat(summary.revenus_total || 0),
        };

        setEarnings(newEarnings);
        console.log('✅ Résumé gains chargé:', newEarnings);
      }

    } catch (error) {
      console.error('❌ Erreur chargement résumé:', error);
    }
  };

  // Charger les transactions récentes de tous types (filtrées selon le profil)
  const loadRecentTransactions = async (userId: string, profile: any) => {
    try {
      console.log('💸 Chargement transactions récentes...');
      const transactions: Transaction[] = [];
      
      // ✅ UTILISATION SÉCURISÉE de hasRole
      const isFourmizUser = hasRole(profile, 'fourmiz');

      // 1. Commissions de services (user_credits) - Seulement pour les Fourmiz
      if (isFourmizUser) {
        const { data: serviceCommissions } = await supabase
          .from('user_credits')
          .select('id, amount, created_at, description')
          .eq('user_id', userId)
          .eq('type', 'commission_fournisseur')
          .order('created_at', { ascending: false })
          .limit(5);

        if (serviceCommissions) {
          serviceCommissions.forEach((credit: any) => {
            transactions.push({
              id: credit.id,
              type: 'service',
              description: credit.description || 'Commission service',
              amount: parseFloat(credit.amount || 0),
              date: new Date(credit.created_at).toLocaleDateString('fr-FR'),
              status: 'completed'
            });
          });
        }
      }

      // 2. Bonus de parrainage (referrals) - Pour tous
      const { data: referralBonuses } = await supabase
        .from('referrals')
        .select('id, bonus_amount, created_at, filleul_name')
        .eq('parrain_id', userId)
        .eq('is_validated', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (referralBonuses) {
        referralBonuses.forEach((bonus: any) => {
          transactions.push({
            id: bonus.id,
            type: 'referral_bonus',
            description: `Bonus parrainage`,
            amount: parseFloat(bonus.bonus_amount || 0),
            date: new Date(bonus.created_at).toLocaleDateString('fr-FR'),
            status: 'completed',
            details: bonus.filleul_name ? `Filleul: ${bonus.filleul_name}` : undefined
          });
        });
      }

      // 3. Commissions de parrainage (referral_commissions) - Pour tous
      const { data: referralCommissions } = await supabase
        .from('referral_commissions')
        .select('id, commission_amount, created_at, order_id')
        .eq('parrain_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (referralCommissions) {
        referralCommissions.forEach((commission: any) => {
          transactions.push({
            id: commission.id,
            type: 'referral_commission',
            description: 'Commission parrainage',
            amount: parseFloat(commission.commission_amount || 0),
            date: new Date(commission.created_at).toLocaleDateString('fr-FR'),
            status: 'completed',
            details: commission.order_id ? `Commande: #${commission.order_id.slice(-6)}` : undefined
          });
        });
      }

      // 4. Récompenses (rewards) - Pour tous
      const { data: rewards } = await supabase
        .from('rewards')
        .select('id, amount, created_at, badge_name, description')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (rewards) {
        rewards.forEach((reward: any) => {
          transactions.push({
            id: reward.id,
            type: 'reward',
            description: reward.badge_name || 'Récompense',
            amount: parseFloat(reward.amount || 0),
            date: new Date(reward.created_at).toLocaleDateString('fr-FR'),
            status: 'completed',
            details: reward.description
          });
        });
      }

      // Trier toutes les transactions par date
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Garder les 10 plus récentes
      setRecentTransactions(transactions.slice(0, 10));
      console.log('✅ Transactions récentes chargées:', transactions.length);

    } catch (error) {
      console.error('❌ Erreur chargement transactions:', error);
      setRecentTransactions([]);
    }
  };

  // Charger la répartition mensuelle
  const loadMonthlyBreakdown = async (userId: string) => {
    try {
      console.log('📅 Chargement répartition mensuelle...');
      
      // Pour l'instant, on fait un calcul simple sur les 6 derniers mois
      // Vous pouvez créer une vue monthly_revenue_breakdown si nécessaire
      
      const monthlyData: MonthlyEarnings[] = [];
      const now = new Date();
      
      for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const monthNames = [
          'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];

        // Ici vous pourriez faire des requêtes spécifiques par mois
        // Pour l'exemple, on met des données à 0
        monthlyData.push({
          month: `${monthNames[month]} ${year}`,
          year,
          monthNumber: month,
          serviceCommissions: 0,
          referralBonuses: 0,
          referralCommissions: 0,
          rewards: 0,
          total: 0
        });
      }

      setMonthlyEarnings(monthlyData);
      console.log('✅ Répartition mensuelle chargée');

    } catch (error) {
      console.error('❌ Erreur répartition mensuelle:', error);
      setMonthlyEarnings([]);
    }
  };

  const downloadStatement = () => {
    Alert.alert(
      'Téléchargement',
      'Fonctionnalité de téléchargement en développement',
      [{ text: 'OK' }]
    );
  };

  const requestPayout = () => {
    Alert.alert(
      'Demande de paiement',
      `Demander un paiement de ${earnings.revenusTotal.toFixed(2)} € ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => {
          Alert.alert('Succès', 'Demande de paiement envoyée !');
        }}
      ]
    );
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'service': return 'construct';
      case 'referral_bonus': return 'gift';
      case 'referral_commission': return 'people';
      case 'reward': return 'trophy';
      default: return 'cash';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'service': return '#3B82F6';
      case 'referral_bonus': return '#10B981';
      case 'referral_commission': return '#8B5CF6';
      case 'reward': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement de vos gains...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ VÉRIFICATION SÉCURISÉE pour l'accès Fourmiz
  if (!hasRole(userProfile, 'fourmiz')) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notAuthorizedContainer}>
          <Ionicons name="lock-closed" size={64} color="#ccc" />
          <Text style={styles.notAuthorizedTitle}>Accès réservé aux Fourmiz</Text>
          <Text style={styles.notAuthorizedDesc}>
            Cette section est uniquement accessible aux prestataires Fourmiz.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* ✅ DEBUG GAINS - avec affichage sécurisé des rôles */}
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>🔍 DEBUG GAINS</Text>
          <Text style={styles.debugText}>User: {currentUser?.id?.slice(-8)}</Text>
          <Text style={styles.debugText}>Type profil: {isClientOnly ? 'Client pur' : isFourmiz ? 'Fourmiz' : 'Autre'}</Text>
          <Text style={styles.debugText}>Roles: {userRoles.join(', ') || 'Aucun'}</Text>
          <Text style={styles.debugText}>Peut commissions services: {canHaveServiceCommissions ? 'Oui' : 'Non'}</Text>
          <Text style={styles.debugText}>Total: {earnings.revenusTotal.toFixed(2)} €</Text>
          <Text style={styles.debugText}>Services: {earnings.totalServiceCommissions.toFixed(2)} €</Text>
          <Text style={styles.debugText}>Parrainage: {(earnings.totalReferralBonus + earnings.totalReferralCommissions).toFixed(2)} €</Text>
          <Text style={styles.debugText}>Récompenses: {earnings.totalBadgesRewards.toFixed(2)} €</Text>
          <Text style={styles.debugText}>Transactions: {recentTransactions.length}</Text>
        </View>

        {/* En-tête adapté selon le profil */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isClientOnly ? '🎁 Mes Récompenses' : '💰 Mes Gains'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isClientOnly 
              ? 'Vos gains de parrainage et récompenses'
              : 'Suivi détaillé de tous vos revenus'
            }
          </Text>
        </View>

        {/* Carte totale */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>
            {isClientOnly ? 'Récompenses totales' : 'Gains totaux'}
          </Text>
          <Text style={styles.totalAmount}>{earnings.revenusTotal.toFixed(2)} €</Text>
          <Text style={styles.totalSubtext}>
            {isClientOnly ? 'Parrainage et récompenses' : 'Tous revenus confondus'}
          </Text>
        </View>

        {/* Répartition par catégorie */}
        <Text style={styles.sectionTitle}>📊 Répartition des gains</Text>
        <View style={styles.categoryGrid}>
          {/* Commissions services - Seulement pour les vrais Fourmiz */}
          {canHaveServiceCommissions && (
            <View style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="construct" size={24} color="#1976D2" />
              </View>
              <Text style={styles.categoryAmount}>{earnings.totalServiceCommissions.toFixed(2)} €</Text>
              <Text style={styles.categoryLabel}>Commissions services</Text>
            </View>
          )}

          <View style={styles.categoryCard}>
            <View style={[styles.categoryIcon, { backgroundColor: '#E8F5E8' }]}>
              <Ionicons name="gift" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.categoryAmount}>{earnings.totalReferralBonus.toFixed(2)} €</Text>
            <Text style={styles.categoryLabel}>Bonus parrainage</Text>
          </View>

          <View style={styles.categoryCard}>
            <View style={[styles.categoryIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="people" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.categoryAmount}>{earnings.totalReferralCommissions.toFixed(2)} €</Text>
            <Text style={styles.categoryLabel}>Commissions filleuls</Text>
          </View>

          <View style={styles.categoryCard}>
            <View style={[styles.categoryIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="trophy" size={24} color="#FF9800" />
            </View>
            <Text style={styles.categoryAmount}>{earnings.totalBadgesRewards.toFixed(2)} €</Text>
            <Text style={styles.categoryLabel}>Récompenses</Text>
          </View>
        </View>

        {/* Boutons d'action */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={downloadStatement}>
            <Ionicons name="download" size={20} color="#FF4444" />
            <Text style={styles.actionText}>Télécharger relevé</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, earnings.revenusTotal <= 0 && styles.actionButtonDisabled]} 
            onPress={requestPayout}
            disabled={earnings.revenusTotal <= 0}
          >
            <Ionicons name="card" size={20} color={earnings.revenusTotal <= 0 ? "#ccc" : "#FF4444"} />
            <Text style={[styles.actionText, earnings.revenusTotal <= 0 && styles.actionTextDisabled]}>
              Demander paiement
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transactions récentes */}
        <Text style={styles.sectionTitle}>
          {isClientOnly ? '🎁 Récompenses récentes' : '💸 Transactions récentes'}
        </Text>
        {recentTransactions.length > 0 ? (
          recentTransactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionLeft}>
                <View style={[
                  styles.transactionIcon, 
                  { backgroundColor: `${getTransactionColor(transaction.type)}20` }
                ]}>
                  <Ionicons 
                    name={getTransactionIcon(transaction.type) as any} 
                    size={20} 
                    color={getTransactionColor(transaction.type)} 
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  <Text style={styles.transactionDate}>{transaction.date}</Text>
                  {transaction.details && (
                    <Text style={styles.transactionDetails}>{transaction.details}</Text>
                  )}
                </View>
              </View>
              <View style={styles.transactionRight}>
                <Text style={styles.transactionAmount}>+{transaction.amount.toFixed(2)} €</Text>
                <View style={styles.transactionStatusBadge}>
                  <Text style={styles.transactionStatus}>Reçu</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {isClientOnly ? 'Aucune récompense' : 'Aucune transaction'}
            </Text>
            <Text style={styles.emptyDesc}>
              {isClientOnly 
                ? 'Vos récompenses de parrainage et badges apparaîtront ici.'
                : 'Vos gains apparaîtront ici au fur et à mesure.'
              }
            </Text>
          </View>
        )}

        {/* Répartition mensuelle */}
        {monthlyEarnings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>📅 Évolution mensuelle</Text>
            {monthlyEarnings.map((month, index) => (
              <View key={index} style={styles.monthCard}>
                <View style={styles.monthInfo}>
                  <Text style={styles.monthName}>{month.month}</Text>
                  <Text style={styles.monthBreakdown}>
                    Services: {month.serviceCommissions.toFixed(2)}€ • 
                    Parrainage: {(month.referralBonuses + month.referralCommissions).toFixed(2)}€
                  </Text>
                </View>
                <Text style={styles.monthAmount}>{month.total.toFixed(2)} €</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9fafb' 
  },
  content: { 
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },

  // DEBUG
  debugSection: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },

  // Carte totale
  totalCard: {
    backgroundColor: '#FF4444',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  totalLabel: { 
    fontSize: 16, 
    color: '#fff', 
    opacity: 0.9,
    fontWeight: '500'
  },
  totalAmount: { 
    fontSize: 36, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginVertical: 8 
  },
  totalSubtext: { 
    fontSize: 14, 
    color: '#fff', 
    opacity: 0.8,
    textAlign: 'center'
  },

  // Sections
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 16, 
    marginTop: 8,
    color: '#1f2937'
  },

  // Grille des catégories
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Boutons d'action
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  actionText: { 
    marginLeft: 8, 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#FF4444' 
  },
  actionTextDisabled: {
    color: '#9ca3af',
  },

  // Transactions
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  transactionDate: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  transactionDetails: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  transactionStatusBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  transactionStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },

  // Mois
  monthCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  monthInfo: { 
    flex: 1 
  },
  monthName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1f2937' 
  },
  monthBreakdown: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  monthAmount: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#FF4444' 
  },

  // État vide
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Accès non autorisé
  notAuthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notAuthorizedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  notAuthorizedDesc: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
});
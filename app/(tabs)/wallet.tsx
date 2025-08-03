// app/(tabs)/wallet.tsx - PORTEFEUILLE AMÉLIORÉ FINAL
// ✅ Compatible avec votre vraie structure de données
// ✅ Intègre les gains de parrainage de user_referrals
// ✅ Gère user_credits et autres tables existantes

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { ReferralService } from '@/lib/referralService';

interface WalletBalance {
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  referralEarnings: number;
  serviceEarnings: number;
  withdrawnAmount: number;
}

interface Transaction {
  id: string;
  type: 'referral_bonus' | 'service_payment' | 'withdrawal' | 'deposit' | 'commission';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  reference?: string;
}

interface BankInfo {
  iban: string;
  name: string;
  verified: boolean;
}

export default function WalletScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [balance, setBalance] = useState<WalletBalance>({
    availableBalance: 0,
    pendingBalance: 0,
    totalEarned: 0,
    referralEarnings: 0,
    serviceEarnings: 0,
    withdrawnAmount: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUser(user);
      console.log('💰 Chargement portefeuille pour:', user.id);

      await Promise.all([
        loadUserBalance(user.id),
        loadTransactionHistory(user.id),
        loadBankInfo(user.id),
      ]);

    } catch (error) {
      console.error('❌ Erreur chargement portefeuille:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du portefeuille');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  // 💰 Charger le solde depuis vos vraies tables
  const loadUserBalance = async (userId: string) => {
    try {
      console.log('💰 Chargement solde...');

      // 1. ✅ Gains de parrainage depuis user_referrals
      const { data: referralGains, error: referralError } = await supabase
        .from('user_referrals')
        .select('bonus_earned, total_commission_earned, status')
        .eq('referrer_user_id', userId);

      let referralEarnings = 0;
      if (!referralError && referralGains) {
        referralEarnings = referralGains.reduce((sum, gain) => 
          sum + (gain.bonus_earned || 0) + (gain.total_commission_earned || 0), 0
        );
      }

      // 2. ✅ Crédits depuis user_credits (si existe)
      const { data: credits, error: creditsError } = await supabase
        .from('user_credits')
        .select('amount, type, status, created_at')
        .eq('user_id', userId);

      let serviceEarnings = 0;
      let availableBalance = 0;
      let pendingBalance = 0;

      if (!creditsError && credits) {
        credits.forEach(credit => {
          const amount = credit.amount || 0;
          
          if (credit.status === 'completed') {
            availableBalance += amount;
          } else if (credit.status === 'pending') {
            pendingBalance += amount;
          }
          
          // Si ce n'est pas un bonus de parrainage, c'est un gain de service
          if (credit.type !== 'referral_bonus' && credit.type !== 'welcome_bonus') {
            serviceEarnings += amount;
          }
        });
      }

      // 3. ✅ Retraits depuis iban_requests ou table similaire
      const { data: withdrawals } = await supabase
        .from('iban_requests')
        .select('amount, status')
        .eq('user_id', userId);

      let withdrawnAmount = 0;
      if (withdrawals) {
        withdrawnAmount = withdrawals
          .filter(w => w.status === 'completed' || w.status === 'approved')
          .reduce((sum, w) => sum + (w.amount || 0), 0);
      }

      // 4. Calculer le solde final
      const totalEarned = referralEarnings + serviceEarnings;
      const finalAvailable = Math.max(0, availableBalance + referralEarnings - withdrawnAmount);

      setBalance({
        availableBalance: finalAvailable,
        pendingBalance,
        totalEarned,
        referralEarnings,
        serviceEarnings,
        withdrawnAmount,
      });

      console.log('✅ Solde calculé:', {
        available: finalAvailable,
        pending: pendingBalance,
        totalEarned,
        referralEarnings,
        serviceEarnings,
        withdrawn: withdrawnAmount,
      });

    } catch (error) {
      console.error('❌ Erreur calcul solde:', error);
    }
  };

  // 📜 Charger l'historique des vraies tables
  const loadTransactionHistory = async (userId: string) => {
    try {
      console.log('📜 Chargement historique...');
      const transactionList: Transaction[] = [];

      // 1. ✅ Gains de parrainage depuis user_referrals
      const { data: referralGains } = await supabase
        .from('user_referrals')
        .select(`
          id,
          bonus_earned,
          total_commission_earned,
          status,
          created_at,
          referrer_name,
          referred_user:referred_user_id (
            email,
            profiles (firstname, lastname)
          )
        `)
        .eq('referrer_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (referralGains) {
        referralGains.forEach(gain => {
          if (gain.bonus_earned > 0) {
            const referredName = gain.referred_user?.profiles ? 
              `${gain.referred_user.profiles.firstname} ${gain.referred_user.profiles.lastname}` :
              gain.referred_user?.email?.split('@')[0] || 'Utilisateur';

            transactionList.push({
              id: `ref_bonus_${gain.id}`,
              type: 'referral_bonus',
              amount: gain.bonus_earned,
              description: `Bonus parrainage - ${referredName}`,
              status: gain.status === 'completed' ? 'completed' : 'pending',
              created_at: gain.created_at,
              reference: 'referral_system',
            });
          }

          if (gain.total_commission_earned > 0) {
            transactionList.push({
              id: `ref_comm_${gain.id}`,
              type: 'commission',
              amount: gain.total_commission_earned,
              description: `Commission parrainage`,
              status: 'completed',
              created_at: gain.created_at,
              reference: 'referral_system',
            });
          }
        });
      }

      // 2. ✅ Crédits depuis user_credits
      const { data: credits } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(15);

      if (credits) {
        credits.forEach(credit => {
          transactionList.push({
            id: credit.id,
            type: credit.type as any,
            amount: credit.amount,
            description: credit.description || `Crédit ${credit.type}`,
            status: credit.status === 'completed' ? 'completed' : 'pending',
            created_at: credit.created_at,
            reference: credit.source,
          });
        });
      }

      // 3. ✅ Demandes de retrait depuis iban_requests
      const { data: withdrawals } = await supabase
        .from('iban_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (withdrawals) {
        withdrawals.forEach(withdrawal => {
          transactionList.push({
            id: withdrawal.id,
            type: 'withdrawal',
            amount: -withdrawal.amount, // Négatif pour les retraits
            description: `Demande de retrait`,
            status: withdrawal.status === 'completed' || withdrawal.status === 'approved' ? 'completed' : 'pending',
            created_at: withdrawal.created_at,
          });
        });
      }

      // 4. Trier par date
      transactionList.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(transactionList.slice(0, 20)); // Garder les 20 plus récentes
      console.log('✅ Historique chargé:', transactionList.length, 'transactions');

    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
    }
  };

  // 🏦 Charger les infos bancaires depuis iban_requests
  const loadBankInfo = async (userId: string) => {
    try {
      const { data: bankData, error } = await supabase
        .from('iban_requests')
        .select('iban, account_holder_name, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && bankData) {
        setBankInfo({
          iban: bankData.iban || '',
          name: bankData.account_holder_name || '',
          verified: bankData.status === 'approved',
        });
      }
    } catch (error) {
      console.log('ℹ️ Pas d\'infos bancaires trouvées');
    }
  };

  // 💸 Gérer la demande de retrait
  const handleWithdrawal = () => {
    if (balance.availableBalance < 10) {
      Alert.alert(
        'Solde insuffisant',
        'Le montant minimum pour un retrait est de 10€.'
      );
      return;
    }

    Alert.alert(
      'Demande de retrait',
      `Souhaitez-vous faire une demande de retrait de ${balance.availableBalance.toFixed(2)}€ ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Continuer', onPress: () => showWithdrawalForm() }
      ]
    );
  };

  // 📝 Formulaire de retrait simplifié
  const showWithdrawalForm = () => {
    Alert.prompt(
      'IBAN requis',
      'Entrez votre IBAN pour recevoir le virement :',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Envoyer', 
          onPress: (iban) => {
            if (iban && iban.length > 10) {
              processWithdrawal(iban);
            } else {
              Alert.alert('Erreur', 'IBAN invalide');
            }
          }
        }
      ],
      'plain-text',
      bankInfo?.iban || ''
    );
  };

  // 🔄 Traiter la demande de retrait
  const processWithdrawal = async (iban: string) => {
    if (!currentUser) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('iban_requests')
        .insert({
          user_id: currentUser.id,
          amount: balance.availableBalance,
          iban: iban.toUpperCase(),
          account_holder_name: bankInfo?.name || 'Utilisateur',
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (error) {
        Alert.alert('Erreur', 'Impossible de traiter la demande de retrait');
      } else {
        Alert.alert(
          'Demande envoyée !',
          'Votre demande de retrait sera traitée sous 48h ouvrées.'
        );
        await loadWalletData(); // Recharger
      }

    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // 🏦 Configurer IBAN
  const handleAddBankInfo = () => {
    Alert.prompt(
      'Configurer IBAN',
      'Entrez votre IBAN pour les futurs retraits :',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Sauvegarder', 
          onPress: (iban) => {
            if (iban && iban.length > 10) {
              saveBankInfo(iban);
            }
          }
        }
      ],
      'plain-text',
      bankInfo?.iban || ''
    );
  };

  const saveBankInfo = async (iban: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('iban_requests')
        .insert({
          user_id: currentUser.id,
          iban: iban.toUpperCase(),
          account_holder_name: 'Utilisateur',
          amount: 0,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (!error) {
        Alert.alert('✅ IBAN sauvegardé', 'Votre IBAN a été configuré avec succès');
        await loadBankInfo(currentUser.id);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'IBAN');
    }
  };

  // 🎁 Échanger
  const handleExchange = () => {
    Alert.alert(
      'Échanger des crédits',
      'Fonctionnalité en développement.\n\nBientôt : convertir vos crédits en bons d\'achat ou autres récompenses.'
    );
  };

  // 📊 Icônes et couleurs des transactions
  const getTransactionIcon = (type: string): string => {
    switch (type) {
      case 'referral_bonus': return 'people';
      case 'welcome_bonus': return 'gift';
      case 'service_payment': return 'construct';
      case 'commission': return 'trending-up';
      case 'withdrawal': return 'arrow-up';
      case 'deposit': return 'arrow-down';
      default: return 'card';
    }
  };

  const getTransactionColor = (type: string, amount: number): string => {
    if (amount < 0) return '#FF4444';
    switch (type) {
      case 'referral_bonus': return '#4CAF50';
      case 'welcome_bonus': return '#9C27B0';
      case 'service_payment': return '#2196F3';
      case 'commission': return '#FF9800';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement de votre portefeuille...</Text>
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
        {/* Carte de solde principale */}
        <LinearGradient
          colors={['#FF4444', '#FF6B6B']}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>💰 Solde disponible</Text>
          <Text style={styles.balanceAmount}>
            {balance.availableBalance.toFixed(2)} €
          </Text>
          <View style={styles.balanceDetails}>
            <Text style={styles.balanceSubtext}>
              En attente : {balance.pendingBalance.toFixed(2)} €
            </Text>
            <Text style={styles.balanceSubtext}>
              Total gagné : {balance.totalEarned.toFixed(2)} €
            </Text>
          </View>
        </LinearGradient>

        {/* Répartition des gains */}
        <View style={styles.earningsBreakdown}>
          <Text style={styles.sectionTitle}>📊 Répartition des gains</Text>
          <View style={styles.earningsGrid}>
            <View style={styles.earningsCard}>
              <Ionicons name="people" size={20} color="#4CAF50" />
              <Text style={styles.earningsAmount}>
                {balance.referralEarnings.toFixed(2)} €
              </Text>
              <Text style={styles.earningsLabel}>Parrainage</Text>
            </View>
            <View style={styles.earningsCard}>
              <Ionicons name="construct" size={20} color="#2196F3" />
              <Text style={styles.earningsAmount}>
                {balance.serviceEarnings.toFixed(2)} €
              </Text>
              <Text style={styles.earningsLabel}>Services</Text>
            </View>
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.actionCard, balance.availableBalance < 10 && styles.actionCardDisabled]}
            onPress={handleWithdrawal}
            disabled={balance.availableBalance < 10}
          >
            <Ionicons 
              name="arrow-up" 
              size={24} 
              color={balance.availableBalance < 10 ? '#ccc' : '#FF4444'} 
            />
            <Text style={[
              styles.actionLabel,
              balance.availableBalance < 10 && styles.actionLabelDisabled
            ]}>
              Retirer
            </Text>
            <Text style={styles.actionSubtext}>Min. 10€</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleAddBankInfo}>
            <Ionicons name="card" size={24} color="#4CAF50" />
            <Text style={styles.actionLabel}>IBAN</Text>
            <Text style={styles.actionSubtext}>
              {bankInfo ? 'Configuré' : 'Configurer'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleExchange}>
            <Ionicons name="gift" size={24} color="#9C27B0" />
            <Text style={styles.actionLabel}>Échanger</Text>
            <Text style={styles.actionSubtext}>Bientôt</Text>
          </TouchableOpacity>
        </View>

        {/* Informations bancaires */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>💳 Informations bancaires</Text>
            {bankInfo?.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.verifiedText}>Vérifié</Text>
              </View>
            )}
          </View>
          
          {bankInfo?.iban ? (
            <>
              <Text style={styles.infoText}>
                IBAN : {bankInfo.iban}
              </Text>
              <Text style={styles.infoText}>
                Titulaire : {bankInfo.name}
              </Text>
            </>
          ) : (
            <Text style={styles.infoText}>
              Aucune information bancaire configurée
            </Text>
          )}
          
          <TouchableOpacity style={styles.editButton} onPress={handleAddBankInfo}>
            <Text style={styles.editButtonText}>
              {bankInfo ? 'Modifier' : 'Ajouter'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Historique des transactions */}
        <View style={styles.transactionsSection}>
          <TouchableOpacity 
            style={styles.transactionsHeader}
            onPress={() => setShowTransactions(!showTransactions)}
          >
            <Text style={styles.sectionTitle}>
              📜 Historique ({transactions.length})
            </Text>
            <Ionicons 
              name={showTransactions ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>

          {showTransactions && (
            <View style={styles.transactionsList}>
              {transactions.length > 0 ? (
                transactions.slice(0, 10).map((transaction) => (
                  <View key={transaction.id} style={styles.transactionCard}>
                    <View style={styles.transactionIcon}>
                      <Ionicons 
                        name={getTransactionIcon(transaction.type) as any}
                        size={20} 
                        color={getTransactionColor(transaction.type, transaction.amount)} 
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionDescription}>
                        {transaction.description}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                    <View style={styles.transactionAmount}>
                      <Text style={[
                        styles.transactionAmountText,
                        { color: getTransactionColor(transaction.type, transaction.amount) }
                      ]}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} €
                      </Text>
                      <View style={[
                        styles.transactionStatus,
                        { backgroundColor: transaction.status === 'completed' ? '#E8F5E8' : '#FFF3E0' }
                      ]}>
                        <Text style={[
                          styles.transactionStatusText,
                          { color: transaction.status === 'completed' ? '#4CAF50' : '#FF9800' }
                        ]}>
                          {transaction.status === 'completed' ? 'Validé' : 'En attente'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyTransactions}>
                  <Ionicons name="receipt-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyTitle}>Aucune transaction</Text>
                  <Text style={styles.emptyDesc}>
                    Vos gains et retraits apparaîtront ici
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Sécurité */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔒 Sécurité</Text>
          <Text style={styles.infoText}>Toutes vos transactions sont sécurisées</Text>
          <Text style={styles.infoSubtext}>
            Dernière vérification : {new Date().toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
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

  // Carte de solde
  balanceCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  balanceDetails: {
    alignItems: 'center',
    gap: 4,
  },
  balanceSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },

  // Répartition des gains
  earningsBreakdown: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  earningsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  earningsCard: {
    flex: 1,
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
  earningsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginVertical: 8,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#6b7280',
  },

  // Actions rapides
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  actionLabelDisabled: {
    color: '#ccc',
  },
  actionSubtext: {
    fontSize: 11,
    color: '#999',
  },

  // Cartes d'information
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#999',
  },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FF4444',
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },

  // Transactions
  transactionsSection: {
    marginBottom: 24,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsList: {
    gap: 8,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transactionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  transactionStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // État vide
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 32,
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
  },
});
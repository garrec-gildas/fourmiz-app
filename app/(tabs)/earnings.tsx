// app/(tabs)/earnings.tsx - VERSION CORRIGÉE avec PayPal/Cartes cadeaux
// ✅ CORRECTIONS: Suppression IBAN, ajout PayPal/Cartes cadeaux
// ✅ TOUTES LES FONCTIONNALITÉS CONSERVÉES: Temps réel, transactions, revenus, etc.
// 💰 REVENUS COMPLETS : Services, Parrainage, Récompenses
// 🎨 STYLE ÉPURÉ : Cohérent avec le design services.tsx, messages.tsx et network.tsx
// 🔄 TEMPS RÉEL : Subscriptions Supabase pour mise à jour automatique
// 📊 ÉVOLUTION MENSUELLE : Détails expandables avec données réelles depuis Supabase

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRoleManagerAdapter } from '@/hooks/useRoleManagerAdapter';

interface EarningsBreakdown {
  totalBadgesRewards: number;
  totalReferralBonus: number;
  totalReferralCommissions: number;
  totalServiceCommissions: number;
  revenusTotal: number;
}

interface MonthlyEarningsBreakdown {
  monthBadgesRewards: number;
  monthReferralBonus: number;
  monthReferralCommissions: number;
  monthServiceCommissions: number;
  monthTotal: number;
}

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
  type: 'service' | 'referral_bonus' | 'referral_commission' | 'reward' | 'withdrawal' | 'deposit' | 'commission';
  description: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending';
  details?: string;
  created_at?: string;
  reference?: string;
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
  const [currentMonthEarnings, setCurrentMonthEarnings] = useState<MonthlyEarningsBreakdown>({
    monthBadgesRewards: 0,
    monthReferralBonus: 0,
    monthReferralCommissions: 0,
    monthServiceCommissions: 0,
    monthTotal: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarnings[]>([]);
  
  // 💰 PORTEFEUILLE : États pour la gestion du portefeuille
  const [walletBalance, setWalletBalance] = useState<WalletBalance>({
    availableBalance: 0,
    pendingBalance: 0,
    totalEarned: 0,
    referralEarnings: 0,
    serviceEarnings: 0,
    withdrawnAmount: 0,
  });
  const [walletTransactions, setWalletTransactions] = useState<Transaction[]>([]);
  const [showWalletTransactions, setShowWalletTransactions] = useState(false);
  
  // 🆕 NOUVEAU SYSTÈME PAIEMENT - États pour modal PayPal/Cartes
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'paypal' | 'gift_card' | 'voucher'>('paypal');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  
  // 🔄 TEMPS RÉEL : États pour les subscriptions
  const subscriptionsRef = useRef<any[]>([]);
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 📅 ÉVOLUTION MENSUELLE : État pour les détails expandables
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  // 🎯 UTILISER LE ROLE MANAGER pour déterminer le rôle actuel
  const roleManager = useRoleManagerAdapter(userProfile);
  const currentRole = roleManager?.currentRole; // 'client' ou 'fourmiz'

  // ✅ VARIABLES DE RÔLE SÉCURISÉES - BASÉES SUR LE ROLE MANAGER
  const userRoles = getUserRoles(userProfile);
  const hasClientRole = hasRole(userProfile, 'client');
  const hasFourmizRole = hasRole(userProfile, 'fourmiz');
  
  // ✅ CARTE COMMISSION SERVICES : Si utilisateur a le rôle fourmiz (peu importe la vue)
  const canHaveServiceCommissions = hasFourmizRole;
  const isInClientView = currentRole === 'client';

  // ⚡ FONCTIONS UTILITAIRES
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'service': return 'construct-outline';
      case 'referral_bonus': return 'gift-outline';
      case 'referral_commission': return 'people-outline';
      case 'reward': return 'trophy-outline';
      case 'withdrawal': return 'arrow-up-outline';
      case 'deposit': return 'arrow-down-outline';
      case 'commission': return 'trending-up-outline';
      default: return 'cash-outline';
    }
  };

  // 🔄 TEMPS RÉEL : Fonction debounced
  const debouncedUpdate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(async () => {
      if (currentUser && userProfile) {
        console.log('🔄 Mise à jour temps réel déclenchée');
        await Promise.all([
          loadCurrentMonthEarnings(currentUser.id),
          loadRecentTransactions(currentUser.id, userProfile),
          loadEarningsSummary(currentUser.id),
          loadWalletBalance(currentUser.id),
          loadWalletTransactionHistory(currentUser.id)
        ]);
      }
    }, 1000);
  }, [currentUser, userProfile]);

  const toggleRealTime = useCallback(() => {
    setIsRealTimeActive(prev => {
      const newState = !prev;
      console.log(`🔄 Temps réel ${newState ? 'activé' : 'désactivé'}`);
      return newState;
    });
  }, []);

  // 🆕 NOUVEAU SYSTÈME PAIEMENT - Helper validation email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPayoutPlaceholder = (method: string): string => {
    switch (method) {
      case 'paypal': return 'votre.email@paypal.com';
      case 'gift_card': return 'email@example.com (pour recevoir la carte)';
      case 'voucher': return 'Nom et adresse postale complète';
      default: return '';
    }
  };

  const getPayoutDescription = (method: string): string => {
    switch (method) {
      case 'paypal': return 'Paiement instantané sur votre compte PayPal';
      case 'gift_card': return 'Carte cadeau Amazon envoyée par email';
      case 'voucher': return 'Bon d\'achat physique par courrier postal';
      default: return '';
    }
  };

  // 🆕 NOUVEAU SYSTÈME PAIEMENT - Fonctions principales
  const handleWithdrawal = useCallback(() => {
    if (walletBalance.availableBalance < 10) {
      Alert.alert(
        'Solde insuffisant',
        'Le montant minimum pour une demande de paiement est de 10€.'
      );
      return;
    }

    console.log('💳 Ouverture modal PayPal/Cartes cadeaux');
    setShowPayoutModal(true);
  }, [walletBalance.availableBalance]);

  const processPayout = useCallback(async () => {
    if (!payoutDetails.trim()) {
      Alert.alert('Information manquante', 'Veuillez remplir les informations requises selon la méthode choisie');
      return;
    }

    // Validation email pour PayPal
    if (payoutMethod === 'paypal' && !isValidEmail(payoutDetails.trim())) {
      Alert.alert('Email invalide', 'Veuillez saisir une adresse email PayPal valide');
      return;
    }

    if (!currentUser) return;

    try {
      setPayoutLoading(true);
      console.log('💳 Traitement demande:', payoutMethod, walletBalance.availableBalance);
      
      // Créer la demande de paiement dans la nouvelle table payout_requests
      const { error } = await supabase
        .from('payout_requests')
        .insert({
          user_id: currentUser.id,
          amount: walletBalance.availableBalance,
          payout_method: payoutMethod,
          paypal_email: payoutMethod === 'paypal' ? payoutDetails.trim() : null,
          gift_card_provider: payoutMethod === 'gift_card' ? 'amazon' : null,
          postal_address: payoutMethod === 'voucher' ? payoutDetails.trim() : null,
          notes: `Demande via earnings - ${payoutMethod}`,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('❌ Erreur création demande paiement:', error);
        Alert.alert('Erreur', 'Impossible de traiter la demande de paiement');
      } else {
        Alert.alert(
          '✅ Demande envoyée !',
          `Votre demande de ${walletBalance.availableBalance.toFixed(2)}€ via ${
            payoutMethod === 'paypal' ? 'PayPal' : 
            payoutMethod === 'gift_card' ? 'carte cadeau Amazon' : 
            'bon d\'achat postal'
          } a été transmise.\n\nVous recevrez le paiement sous 2-3 jours ouvrés.`,
          [{ text: 'Parfait !', style: 'default' }]
        );
        
        setShowPayoutModal(false);
        setPayoutDetails('');
        await loadEarningsData(); // Recharger les données
      }

    } catch (error) {
      console.error('❌ Erreur traitement paiement:', error);
      Alert.alert('Erreur temporaire', 'Impossible de traiter votre demande maintenant. Réessayez dans quelques minutes.');
    } finally {
      setPayoutLoading(false);
    }
  }, [currentUser, walletBalance.availableBalance, payoutMethod, payoutDetails]);

  const handleExchange = useCallback(() => {
    Alert.alert(
      'Échanger des crédits',
      'Fonctionnalité en développement.\n\nBientôt : convertir vos crédits en bons d\'achat ou autres récompenses.'
    );
  }, []);

  // FONCTIONS DE CHARGEMENT - DÉFINIES DANS L'ORDRE CORRECT (CONSERVÉES INTÉGRALEMENT)
  const loadWalletBalance = async (userId: string) => {
    try {
      console.log('💰 Chargement solde portefeuille...');

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
          
          if (credit.type !== 'referral_bonus' && credit.type !== 'welcome_bonus') {
            serviceEarnings += amount;
          }
        });
      }

      // 🆕 MODIFIÉ : Chercher dans payout_requests au lieu de iban_requests
      const { data: withdrawals } = await supabase
        .from('payout_requests')
        .select('amount, status')
        .eq('user_id', userId);

      let withdrawnAmount = 0;
      if (withdrawals) {
        withdrawnAmount = withdrawals
          .filter(w => w.status === 'completed')
          .reduce((sum, w) => sum + (w.amount || 0), 0);
      }

      const totalEarned = referralEarnings + serviceEarnings;
      const finalAvailable = Math.max(0, availableBalance + referralEarnings - withdrawnAmount);

      setWalletBalance({
        availableBalance: finalAvailable,
        pendingBalance,
        totalEarned,
        referralEarnings,
        serviceEarnings,
        withdrawnAmount,
      });

      console.log('✅ Solde portefeuille calculé:', finalAvailable);

    } catch (error) {
      console.error('❌ Erreur calcul solde portefeuille:', error);
    }
  };

  const loadWalletTransactionHistory = async (userId: string) => {
    try {
      console.log('📋 Chargement historique portefeuille...');
      const transactionList: Transaction[] = [];

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
              `${gain.referred_user?.profiles?.firstname} ${gain.referred_user?.profiles?.lastname}` :
              gain.referred_user?.email?.split('@')[0] || 'Utilisateur';

            transactionList.push({
              id: `ref_bonus_${gain.id}`,
              type: 'referral_bonus',
              amount: gain.bonus_earned,
              description: `Bonus parrainage - ${referredName}`,
              status: gain.status === 'completed' ? 'completed' : 'pending',
              date: new Date(gain.created_at).toLocaleDateString('fr-FR'),
              created_at: gain.created_at,
              reference: 'referral_system',
            });
          }
        });
      }

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
            date: new Date(credit.created_at).toLocaleDateString('fr-FR'),
            created_at: credit.created_at,
            reference: credit.source,
          });
        });
      }

      // 🆕 MODIFIÉ : Chercher dans payout_requests au lieu de iban_requests
      const { data: withdrawals } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (withdrawals) {
        withdrawals.forEach(withdrawal => {
          const methodLabel = withdrawal.payout_method === 'paypal' ? 'PayPal' : 
                             withdrawal.payout_method === 'gift_card' ? 'Carte cadeau' : 'Voucher';
          
          transactionList.push({
            id: withdrawal.id,
            type: 'withdrawal',
            amount: -withdrawal.amount,
            description: `Retrait ${methodLabel}`,
            status: withdrawal.status === 'completed' ? 'completed' : 'pending',
            date: new Date(withdrawal.created_at).toLocaleDateString('fr-FR'),
            created_at: withdrawal.created_at,
          });
        });
      }

      transactionList.sort((a, b) => 
        new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()
      );

      setWalletTransactions(transactionList.slice(0, 20));
      console.log('✅ Historique portefeuille chargé:', transactionList.length, 'transactions');

    } catch (error) {
      console.error('❌ Erreur chargement historique portefeuille:', error);
    }
  };

  // TOUTES LES AUTRES FONCTIONS DE CHARGEMENT CONSERVÉES INTÉGRALEMENT
  const loadCurrentMonthEarnings = async (userId: string) => {
    try {
      console.log('📊 Chargement gains du mois en cours...');

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      let monthServiceCommissions = 0;
      let monthReferralBonus = 0;
      let monthReferralCommissions = 0;
      let monthBadgesRewards = 0;

      const { data: serviceCommissions } = await supabase
        .from('user_credits')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'commission_fournisseur')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (serviceCommissions) {
        monthServiceCommissions = serviceCommissions.reduce((sum, credit) => 
          sum + parseFloat(credit.amount || 0), 0
        );
      }

      const { data: referralBonuses } = await supabase
        .from('referrals')
        .select('bonus_amount')
        .eq('parrain_id', userId)
        .eq('is_validated', true)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (referralBonuses) {
        monthReferralBonus = referralBonuses.reduce((sum, bonus) => 
          sum + parseFloat(bonus.bonus_amount || 0), 0
        );
      }

      const { data: referralCommissions } = await supabase
        .from('referral_commissions')
        .select('commission_amount')
        .eq('parrain_id', userId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (referralCommissions) {
        monthReferralCommissions = referralCommissions.reduce((sum, commission) => 
          sum + parseFloat(commission.commission_amount || 0), 0
        );
      }

      const { data: rewards } = await supabase
        .from('rewards')
        .select('amount')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (rewards) {
        monthBadgesRewards = rewards.reduce((sum, reward) => 
          sum + parseFloat(reward.amount || 0), 0
        );
      }

      const monthTotal = monthServiceCommissions + monthReferralBonus + monthReferralCommissions + monthBadgesRewards;

      const monthlyEarnings: MonthlyEarningsBreakdown = {
        monthBadgesRewards,
        monthReferralBonus,
        monthReferralCommissions,
        monthServiceCommissions,
        monthTotal,
      };

      setCurrentMonthEarnings(monthlyEarnings);
      console.log('✅ Gains mois en cours chargés:', monthlyEarnings);

    } catch (error) {
      console.error('❌ Erreur chargement gains mois:', error);
    }
  };

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

  const loadRecentTransactions = async (userId: string, profile: any) => {
    try {
      console.log('📋 Chargement transactions récentes...');
      const transactions: Transaction[] = [];
      
      const isFourmizUser = hasRole(profile, 'fourmiz');

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

      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setRecentTransactions(transactions.slice(0, 10));
      console.log('✅ Transactions récentes chargées:', transactions.length);

    } catch (error) {
      console.error('❌ Erreur chargement transactions:', error);
      setRecentTransactions([]);
    }
  };

  const loadMonthlyBreakdown = async (userId: string) => {
    try {
      console.log('📅 Chargement répartition mensuelle...');
      
      const monthlyData: MonthlyEarnings[] = [];
      const now = new Date();
      
      // Commencer par le mois précédent (exclure le mois en cours)
      for (let i = 1; i <= 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
        
        const monthNames = [
          'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];

        // Récupérer les commissions services
        const { data: serviceCommissions } = await supabase
          .from('user_credits')
          .select('amount')
          .eq('user_id', userId)
          .eq('type', 'commission_fournisseur')
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString());

        const monthServiceCommissions = serviceCommissions 
          ? serviceCommissions.reduce((sum, credit) => sum + parseFloat(credit.amount || 0), 0)
          : 0;

        // Récupérer les bonus parrainage
        const { data: referralBonuses } = await supabase
          .from('referrals')
          .select('bonus_amount')
          .eq('parrain_id', userId)
          .eq('is_validated', true)
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString());

        const monthReferralBonuses = referralBonuses 
          ? referralBonuses.reduce((sum, bonus) => sum + parseFloat(bonus.bonus_amount || 0), 0)
          : 0;

        // Récupérer les commissions filleuls
        const { data: referralCommissions } = await supabase
          .from('referral_commissions')
          .select('commission_amount')
          .eq('parrain_id', userId)
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString());

        const monthReferralCommissions = referralCommissions 
          ? referralCommissions.reduce((sum, commission) => sum + parseFloat(commission.commission_amount || 0), 0)
          : 0;

        // Récupérer les récompenses
        const { data: rewards } = await supabase
          .from('rewards')
          .select('amount')
          .eq('user_id', userId)
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString());

        const monthRewards = rewards 
          ? rewards.reduce((sum, reward) => sum + parseFloat(reward.amount || 0), 0)
          : 0;

        const total = monthServiceCommissions + monthReferralBonuses + monthReferralCommissions + monthRewards;

        monthlyData.push({
          month: `${monthNames[month]} ${year}`,
          year,
          monthNumber: month,
          serviceCommissions: monthServiceCommissions,
          referralBonuses: monthReferralBonuses,
          referralCommissions: monthReferralCommissions,
          rewards: monthRewards,
          total
        });
      }

      setMonthlyEarnings(monthlyData);
      console.log('✅ Répartition mensuelle chargée avec données réelles');

    } catch (error) {
      console.error('❌ Erreur répartition mensuelle:', error);
      setMonthlyEarnings([]);
    }
  };

  // FONCTION PRINCIPALE DE CHARGEMENT - DÉFINIE APRÈS TOUTES LES AUTRES (CONSERVÉE INTÉGRALEMENT)
  const loadEarningsData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return;
      }

      setCurrentUser(user);
      console.log('🔄 Chargement gains pour:', user.id);

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
        loadCurrentMonthEarnings(user.id),
        loadRecentTransactions(user.id, profile),
        loadMonthlyBreakdown(user.id),
        loadWalletBalance(user.id),
        loadWalletTransactionHistory(user.id)
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

  // 🔄 TEMPS RÉEL : Configuration des subscriptions (CONSERVÉE INTÉGRALEMENT)
  const setupRealtimeSubscriptions = () => {
    if (!currentUser || !isRealTimeActive) return;

    console.log('🔗 Configuration subscriptions temps réel...');
    cleanupSubscriptions();

    const userId = currentUser.id;

    const userCreditsChannel = supabase
      .channel(`user_credits_${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_credits',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('💰 Nouveau credit détecté:', payload);
          debouncedUpdate();
        }
      )
      .subscribe();

    const referralsChannel = supabase
      .channel(`referrals_${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'referrals',
          filter: `parrain_id=eq.${userId}`
        },
        (payload) => {
          console.log('🎁 Nouveau parrainage détecté:', payload);
          debouncedUpdate();
        }
      )
      .subscribe();

    const referralCommissionsChannel = supabase
      .channel(`referral_commissions_${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'referral_commissions',
          filter: `parrain_id=eq.${userId}`
        },
        (payload) => {
          console.log('👥 Nouvelle commission filleul détectée:', payload);
          debouncedUpdate();
        }
      )
      .subscribe();

    const rewardsChannel = supabase
      .channel(`rewards_${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'rewards',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🏆 Nouvelle récompense détectée:', payload);
          debouncedUpdate();
        }
      )
      .subscribe();

    subscriptionsRef.current = [
      userCreditsChannel,
      referralsChannel, 
      referralCommissionsChannel,
      rewardsChannel
    ];

    console.log('✅ Subscriptions temps réel configurées');
  };

  const cleanupSubscriptions = () => {
    console.log('🧹 Nettoyage subscriptions...');
    subscriptionsRef.current.forEach(channel => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    });
    subscriptionsRef.current = [];
  };

  // EFFECTS (CONSERVÉS INTÉGRALEMENT)
  useEffect(() => {
    loadEarningsData();
    
    return () => {
      cleanupSubscriptions();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentUser && userProfile && currentRole) {
      loadRecentTransactions(currentUser.id, userProfile);
    }
  }, [currentRole, currentUser, userProfile]);

  useEffect(() => {
    if (currentUser && userProfile && isRealTimeActive) {
      setupRealtimeSubscriptions();
    }
    return () => cleanupSubscriptions();
  }, [currentUser, userProfile, isRealTimeActive]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement de vos gains...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasClientRole && !hasFourmizRole) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notAuthorizedContainer}>
          <Ionicons name="lock-closed-outline" size={48} color="#cccccc" />
          <Text style={styles.notAuthorizedTitle}>Accès non autorisé</Text>
          <Text style={styles.notAuthorizedDesc}>
            Cette section nécessite un profil client ou prestataire.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={['#000000']}
            tintColor="#000000"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction générale supprimée - titre dans le header */}

        {/* 💰 SECTION PORTEFEUILLE (CONSERVÉE AVEC PETITES MODIFICATIONS TEXTE) */}
        <View style={styles.walletSection}>
          {/* Carte de solde principale */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Ionicons name="wallet-outline" size={20} color="#000000" />
              <Text style={styles.balanceLabel}>Solde disponible</Text>
            </View>
            
            <Text style={styles.balanceAmount}>
              {walletBalance.availableBalance.toFixed(2)} €
            </Text>
            
            <View style={styles.balanceDetails}>
              <Text style={styles.balanceSubText}>
                En attente : {walletBalance.pendingBalance.toFixed(2)} €
              </Text>
              <Text style={styles.balanceSubText}>
                Total gagné : {walletBalance.totalEarned.toFixed(2)} €
              </Text>
            </View>
          </View>

          {/* Actions rapides */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={[
                  styles.actionCard, 
                  walletBalance.availableBalance < 10 && styles.actionCardDisabled
                ]}
                onPress={handleWithdrawal}
                disabled={walletBalance.availableBalance < 10}
              >
                <Ionicons 
                  name="card-outline" 
                  size={20} 
                  color={walletBalance.availableBalance < 10 ? "#666666" : "#000000"} 
                />
                <Text style={[
                  styles.actionLabel,
                  walletBalance.availableBalance < 10 && styles.actionLabelDisabled
                ]}>
                  Retirer
                </Text>
                <Text style={styles.actionSubText}>PayPal/Cartes</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={handleExchange}>
                <Ionicons name="gift-outline" size={20} color="#000000" />
                <Text style={styles.actionLabel}>Échanger</Text>
                <Text style={styles.actionSubText}>Bientôt</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* TOUTE LA SECTION TRANSACTIONS CONSERVÉE INTÉGRALEMENT */}
          <View style={styles.walletTransactionsSection}>
            <TouchableOpacity 
              style={styles.transactionsHeader}
              onPress={() => setShowWalletTransactions(!showWalletTransactions)}
            >
              <Text style={styles.sectionTitle}>
                Historique portefeuille ({walletTransactions.length})
              </Text>
              <Ionicons 
                name={showWalletTransactions ? 'chevron-up-outline' : 'chevron-down-outline'} 
                size={20} 
                color="#666666" 
              />
            </TouchableOpacity>

            {showWalletTransactions && (
              <View style={styles.transactionsList}>
                {walletTransactions.length > 0 ? (
                  walletTransactions.slice(0, 5).map((transaction) => (
                    <View key={transaction.id} style={styles.transactionCard}>
                      <View style={styles.transactionIcon}>
                        <Ionicons 
                          name={getTransactionIcon(transaction.type) as any}
                          size={20} 
                          color="#000000"
                        />
                      </View>
                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionDescription}>
                          {transaction.description}
                        </Text>
                        <Text style={styles.transactionDate}>
                          {transaction.date}
                        </Text>
                      </View>
                      <View style={styles.transactionAmount}>
                        <Text style={[
                          styles.transactionAmountText,
                          { color: transaction.amount > 0 ? '#000000' : '#666666' }
                        ]}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} €
                        </Text>
                        <View style={styles.transactionStatus}>
                          <Text style={styles.transactionStatusText}>
                            {transaction.status === 'completed' ? 'Validé' : 'En attente'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyTransactions}>
                    <Ionicons name="receipt-outline" size={48} color="#cccccc" />
                    <Text style={styles.emptyTitle}>Aucune transaction</Text>
                    <Text style={styles.emptyDesc}>
                      Vos gains et retraits apparaîtront ici
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* TOUTES LES AUTRES SECTIONS CONSERVÉES INTÉGRALEMENT */}
        {/* 📊 SECTION GAINS DU MOIS */}
        <View style={styles.gainsSection}>
          {/* Carte totale - MOIS EN COURS */}
          <View style={styles.totalCard}>
            <View style={styles.totalHeader}>
              <Ionicons name="calendar-outline" size={20} color="#000000" />
              <Text style={styles.totalLabel}>
                {isInClientView ? 'Revenus du mois' : 'Gains du mois'}
              </Text>
            </View>
            <Text style={styles.totalAmount}>{currentMonthEarnings.monthTotal.toFixed(2)} €</Text>
            <Text style={styles.totalSubText}>
              {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())} - 
              {isInClientView ? ' Parrainage et récompenses' : ' Tous revenus confondus'}
            </Text>
          </View>

          {/* Répartition par catégorie - MOIS EN COURS */}
          <View style={styles.categorySection}>
            <Text style={styles.sectionTitle}>Répartition du mois</Text>
            <View style={styles.categoryGrid}>
              {/* CARTE COMMISSION SERVICES - Si utilisateur a le rôle fourmiz */}
              {canHaveServiceCommissions && (
                <View style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name="construct-outline" size={16} color="#000000" />
                    <Text style={styles.categoryLabel}>Commissions services</Text>
                  </View>
                  <Text style={styles.categoryAmount}>{currentMonthEarnings.monthServiceCommissions.toFixed(2)} €</Text>
                </View>
              )}

              <View style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Ionicons name="gift-outline" size={16} color="#000000" />
                  <Text style={styles.categoryLabel}>Bonus parrainage</Text>
                </View>
                <Text style={styles.categoryAmount}>{currentMonthEarnings.monthReferralBonus.toFixed(2)} €</Text>
              </View>

              <View style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Ionicons name="people-outline" size={16} color="#000000" />
                  <Text style={styles.categoryLabel}>Commissions filleuls</Text>
                </View>
                <Text style={styles.categoryAmount}>{currentMonthEarnings.monthReferralCommissions.toFixed(2)} €</Text>
              </View>

              <View style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Ionicons name="trophy-outline" size={16} color="#000000" />
                  <Text style={styles.categoryLabel}>Récompenses</Text>
                </View>
                <Text style={styles.categoryAmount}>{currentMonthEarnings.monthBadgesRewards.toFixed(2)} €</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Transactions récentes (CONSERVÉE INTÉGRALEMENT) */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>
            {isInClientView ? 'Revenus récents' : 'Transactions récentes'}
          </Text>
          
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionLeft}>
                  <View style={styles.transactionIcon}>
                    <Ionicons 
                      name={getTransactionIcon(transaction.type) as any} 
                      size={20} 
                      color="#000000"
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={styles.transactionDate}>{transaction.date}</Text>
                    {transaction.details && (
                      <Text style={styles.transactionDetailsText}>{transaction.details}</Text>
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
              <Ionicons name="receipt-outline" size={48} color="#cccccc" />
              <Text style={styles.emptyTitle}>
                {isInClientView ? 'Aucune récompense' : 'Aucune transaction'}
              </Text>
              <Text style={styles.emptyDesc}>
                {isInClientView
                  ? 'Vos récompenses de parrainage et badges apparaîtront ici.'
                  : 'Vos gains apparaîtront ici au fur et à mesure.'
                }
              </Text>
            </View>
          )}
        </View>

        {/* Évolution mensuelle (mois précédents uniquement) */}
        {monthlyEarnings.length > 0 && (
          <View style={styles.monthlySection}>
            <Text style={styles.sectionTitle}>Évolution mensuelle</Text>
            {monthlyEarnings.map((month, index) => (
              <View key={index}>
                <TouchableOpacity 
                  style={styles.monthCard}
                  onPress={() => setExpandedMonth(expandedMonth === index ? null : index)}
                >
                  <View style={styles.monthInfo}>
                    <Text style={styles.monthName}>{month.month}</Text>
                    <Text style={styles.monthSummary}>
                      Total des gains du mois
                    </Text>
                  </View>
                  <View style={styles.monthRight}>
                    <Text style={styles.monthAmount}>{month.total.toFixed(2)} €</Text>
                    <Ionicons 
                      name={expandedMonth === index ? 'chevron-up-outline' : 'chevron-down-outline'} 
                      size={16} 
                      color="#666666" 
                    />
                  </View>
                </TouchableOpacity>
                
                {/* Détails expandables */}
                {expandedMonth === index && (
                  <View style={styles.monthDetails}>
                    {canHaveServiceCommissions && month.serviceCommissions > 0 && (
                      <View style={styles.detailRow}>
                        <View style={styles.detailLeft}>
                          <Ionicons name="construct-outline" size={14} color="#666666" />
                          <Text style={styles.detailLabel}>Commissions Services</Text>
                        </View>
                        <Text style={styles.detailAmount}>{month.serviceCommissions.toFixed(2)} €</Text>
                      </View>
                    )}
                    
                    {month.referralBonuses > 0 && (
                      <View style={styles.detailRow}>
                        <View style={styles.detailLeft}>
                          <Ionicons name="gift-outline" size={14} color="#666666" />
                          <Text style={styles.detailLabel}>Bonus parrainage</Text>
                        </View>
                        <Text style={styles.detailAmount}>{month.referralBonuses.toFixed(2)} €</Text>
                      </View>
                    )}
                    
                    {month.referralCommissions > 0 && (
                      <View style={styles.detailRow}>
                        <View style={styles.detailLeft}>
                          <Ionicons name="people-outline" size={14} color="#666666" />
                          <Text style={styles.detailLabel}>Commissions filleuls</Text>
                        </View>
                        <Text style={styles.detailAmount}>{month.referralCommissions.toFixed(2)} €</Text>
                      </View>
                    )}
                    
                    {month.rewards > 0 && (
                      <View style={styles.detailRow}>
                        <View style={styles.detailLeft}>
                          <Ionicons name="trophy-outline" size={14} color="#666666" />
                          <Text style={styles.detailLabel}>Récompenses</Text>
                        </View>
                        <Text style={styles.detailAmount}>{month.rewards.toFixed(2)} €</Text>
                      </View>
                    )}
                    
                    {month.total === 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.noEarningsText}>Aucun gain ce mois-ci</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 🆕 NOUVEAU MODAL PAYPAL/CARTES CADEAUX */}
      <Modal
        visible={showPayoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPayoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Demander un paiement</Text>
              <TouchableOpacity onPress={() => setShowPayoutModal(false)}>
                <Ionicons name="close-outline" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <View style={styles.amountSection}>
              <Text style={styles.modalBalance}>
                Montant à recevoir : {walletBalance.availableBalance.toFixed(2)}€
              </Text>
              <Text style={styles.modalSubtext}>
                Aucun frais - Vous recevez l'intégralité
              </Text>
            </View>

            <View style={styles.methodSection}>
              <Text style={styles.methodLabel}>Choisissez votre méthode :</Text>
              
              {(['paypal', 'gift_card', 'voucher'] as const).map((method) => (
                <TouchableOpacity 
                  key={method}
                  style={[
                    styles.methodOption,
                    payoutMethod === method && styles.methodSelected
                  ]}
                  onPress={() => setPayoutMethod(method)}
                >
                  <View style={styles.methodContent}>
                    <View style={styles.methodIcon}>
                      <Ionicons 
                        name={
                          method === 'paypal' ? 'logo-paypal' : 
                          method === 'gift_card' ? 'gift-outline' : 
                          'mail-outline'
                        } 
                        size={18} 
                        color="#000000" 
                      />
                    </View>
                    <View style={styles.methodDetails}>
                      <Text style={styles.methodTitle}>
                        {method === 'paypal' ? 'PayPal' : 
                         method === 'gift_card' ? 'Carte cadeau Amazon' : 
                         'Bon d\'achat postal'}
                      </Text>
                      <Text style={styles.methodDesc}>
                        {getPayoutDescription(method)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.detailsInput}
              placeholder={getPayoutPlaceholder(payoutMethod)}
              value={payoutDetails}
              onChangeText={setPayoutDetails}
              keyboardType={payoutMethod === 'paypal' ? 'email-address' : 'default'}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={payoutMethod === 'voucher'}
              numberOfLines={payoutMethod === 'voucher' ? 3 : 1}
            />

            <View style={styles.infoSection}>
              <Ionicons name="time-outline" size={16} color="#666666" />
              <Text style={styles.infoText}>
                Délai : 2-3 jours ouvrés maximum
              </Text>
            </View>

            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!payoutDetails.trim() || payoutLoading) && styles.submitButtonDisabled
              ]}
              onPress={processPayout}
              disabled={!payoutDetails.trim() || payoutLoading}
            >
              {payoutLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Confirmer la demande
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// STYLES (CONSERVÉS INTÉGRALEMENT + AJOUT STYLES MODAL)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },

  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },

  // Sections
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },

  // Portefeuille
  walletSection: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  // Carte de solde
  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 12,
  },
  balanceDetails: {
    alignItems: 'center',
    gap: 4,
  },
  balanceSubText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },

  // Actions
  actionsSection: {
    marginBottom: 24,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
  },
  actionLabelDisabled: {
    color: '#666666',
  },
  actionSubText: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '400',
  },

  // Transactions portefeuille
  walletTransactionsSection: {
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

  // Section gains
  gainsSection: {
    marginBottom: 24,
  },

  // Répartition par catégorie
  categorySection: {
    marginBottom: 24,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },

  // Carte gains du mois
  totalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
    alignItems: 'center',
    marginBottom: 24,
  },
  totalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  totalLabel: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginVertical: 8,
  },
  totalSubText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },

  // Transactions récentes
  transactionsSection: {
    marginBottom: 24,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
    fontWeight: '400',
  },
  transactionDetailsText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
    fontWeight: '400',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  transactionStatusBadge: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  transactionStatus: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666666',
  },

  // Transactions pour portefeuille
  transactionDetails: {
    flex: 1,
  },
  transactionAmountText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionStatusText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666666',
  },

  // Mensuel
  monthlySection: {
    marginBottom: 24,
  },
  monthCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  monthInfo: {
    flex: 1,
  },
  monthName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  monthSummary: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
    fontWeight: '400',
  },
  monthBreakdown: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
    fontWeight: '400',
  },
  monthRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  
  // Détails mensuels expandables
  monthDetails: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    marginTop: -12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },
  detailAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  noEarningsText: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
    textAlign: 'center',
    flex: 1,
  },

  // États vides
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },

  // Accès non autorisé
  notAuthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notAuthorizedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  notAuthorizedDesc: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },

  // 🆕 NOUVEAUX STYLES MODAL PAYPAL/CARTES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  modalBalance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtext: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  methodSection: {
    marginBottom: 20,
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  methodOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  methodSelected: {
    borderColor: '#000000',
    backgroundColor: '#f8f8f8',
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodDetails: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  methodDesc: {
    fontSize: 11,
    color: '#666666',
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#666666',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  bottomSpacer: {
    height: 32,
  },
});
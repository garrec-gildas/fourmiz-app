import { supabase } from './supabase';

// Types pour les gains
export interface ReferralGain {
  id: number;
  sponsorId: string;
  referredId: string;
  amount: number;
  type: 'bonus' | 'commission' | 'badge' | 'service' | 'signup_bonus' | 'first_order_bonus' | 'client_order' | 'fourmiz_service' | 'fourmiz_client' | 'manual_bonus';
  status: 'pending' | 'paid' | 'cancelled';
  description?: string;
  createdAt: string;
  metadata?: Record<string, any>;
  sponsorName?: string;
  referredName?: string;
}

// Types pour les commissions
export interface ReferralCommission {
  id: number;
  referralId: string;
  parrainId: string;
  filleulId: string;
  orderId?: number;
  serviceId?: string;
  commissionAmount: number;
  commissionRate: number;
  orderAmount?: number;
  status: 'pending' | 'paid' | 'cancelled';
  earnedAt: string;
  parrainName?: string;
  filleulName?: string;
  codeUtilise?: string;
}

// Types pour les statistiques de gains
export interface EarningsStats {
  totalGains: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  bonusAmount: number;
  commissionAmount: number;
  gainsLastMonth: number;
}

// ===== RÉCUPÉRATION DES GAINS =====
export const getUserGains = async (userId: string): Promise<ReferralGain[]> => {
  try {
    console.log('📊 Récupération gains pour:', userId);

    const { data: gains, error } = await supabase
      .from('referral_gains_detailed')
      .select('*')
      .eq('sponsor_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération gains:', error);
      return [];
    }

    if (!gains || gains.length === 0) {
      console.log('ℹ️ Aucun gain trouvé');
      return [];
    }

    console.log(`✅ ${gains.length} gain(s) trouvé(s)`);
    
    return gains.map(gain => ({
      id: gain.id,
      sponsorId: gain.sponsor_id,
      referredId: gain.referred_id,
      amount: parseFloat(gain.amount),
      type: gain.type,
      status: gain.status,
      description: gain.description,
      createdAt: gain.created_at,
      metadata: gain.metadata,
      sponsorName: gain.sponsor_name,
      referredName: gain.referred_name
    }));

  } catch (error) {
    console.error('💥 Exception récupération gains:', error);
    return [];
  }
};

// ===== RÉCUPÉRATION DES COMMISSIONS =====
export const getUserCommissions = async (userId: string): Promise<ReferralCommission[]> => {
  try {
    console.log('💰 Récupération commissions pour:', userId);

    const { data: commissions, error } = await supabase
      .from('referral_commissions_detailed')
      .select('*')
      .eq('parrain_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération commissions:', error);
      return [];
    }

    if (!commissions || commissions.length === 0) {
      console.log('ℹ️ Aucune commission trouvée');
      return [];
    }

    console.log(`✅ ${commissions.length} commission(s) trouvée(s)`);
    
    return commissions.map(commission => ({
      id: commission.id,
      referralId: commission.referral_id,
      parrainId: commission.parrain_id,
      filleulId: commission.filleul_id,
      orderId: commission.order_id,
      serviceId: commission.service_id,
      commissionAmount: parseFloat(commission.commission_amount),
      commissionRate: parseFloat(commission.commission_rate),
      orderAmount: commission.order_amount ? parseFloat(commission.order_amount) : undefined,
      status: commission.status,
      earnedAt: commission.earned_at,
      parrainName: commission.parrain_name,
      filleulName: commission.filleul_name,
      codeUtilise: commission.code_utilise
    }));

  } catch (error) {
    console.error('💥 Exception récupération commissions:', error);
    return [];
  }
};

// ===== STATISTIQUES DES GAINS =====
export const getUserEarningsStats = async (userId: string): Promise<EarningsStats> => {
  try {
    console.log('📈 Récupération stats gains pour:', userId);

    const { data: stats, error } = await supabase
      .from('user_earnings_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !stats) {
      console.log('ℹ️ Aucune stat trouvée, retour valeurs par défaut');
      return {
        totalGains: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        bonusAmount: 0,
        commissionAmount: 0,
        gainsLastMonth: 0
      };
    }

    console.log('✅ Stats gains récupérées');
    
    return {
      totalGains: stats.total_gains || 0,
      totalAmount: parseFloat(stats.total_amount || 0),
      paidAmount: parseFloat(stats.paid_amount || 0),
      pendingAmount: parseFloat(stats.pending_amount || 0),
      bonusAmount: parseFloat(stats.bonus_amount || 0),
      commissionAmount: parseFloat(stats.commission_amount || 0),
      gainsLastMonth: stats.gains_last_month || 0
    };

  } catch (error) {
    console.error('💥 Exception stats gains:', error);
    return {
      totalGains: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      bonusAmount: 0,
      commissionAmount: 0,
      gainsLastMonth: 0
    };
  }
};

// ===== CRÉATION D'UN GAIN MANUEL =====
export const createReferralGain = async (
  sponsorId: string,
  referredId: string,
  amount: number,
  type: 'signup_bonus' | 'client_order' | 'fourmiz_service' | 'fourmiz_client' | 'manual_bonus',
  description?: string,
  metadata?: Record<string, any>
): Promise<boolean> => {
  try {
    console.log('➕ Création gain:', { sponsorId, referredId, amount, type });

    const { error } = await supabase.rpc('create_referral_gain', {
      p_sponsor_id: sponsorId,
      p_referred_id: referredId,
      p_amount: amount,
      p_type: type,
      p_description: description,
      p_metadata: metadata
    });

    if (error) {
      console.error('❌ Erreur création gain:', error);
      return false;
    }

    console.log('✅ Gain créé avec succès');
    return true;

  } catch (error) {
    console.error('💥 Exception création gain:', error);
    return false;
  }
};

// ===== CRÉATION D'UNE COMMISSION =====
export const createReferralCommission = async (
  referralId: string,
  orderId: number,
  orderAmount: number,
  commissionRate: number = 5.00
): Promise<boolean> => {
  try {
    console.log('💵 Création commission:', { referralId, orderId, orderAmount, commissionRate });

    const { error } = await supabase.rpc('create_referral_commission', {
      p_referral_id: referralId,
      p_order_id: orderId,
      p_order_amount: orderAmount,
      p_commission_rate: commissionRate
    });

    if (error) {
      console.error('❌ Erreur création commission:', error);
      return false;
    }

    console.log('✅ Commission créée avec succès');
    return true;

  } catch (error) {
    console.error('💥 Exception création commission:', error);
    return false;
  }
};

// ===== CHARGEMENT COMPLET DES DONNÉES DE GAINS =====
export const loadEarningsData = async (userId: string) => {
  try {
    console.log('🔄 Chargement données gains complètes pour:', userId);

    // Charger toutes les données en parallèle
    const [gains, commissions, stats] = await Promise.all([
      getUserGains(userId),
      getUserCommissions(userId),
      getUserEarningsStats(userId)
    ]);

    return {
      gains,
      commissions,
      stats,
      // Statistiques calculées
      totalTransactions: gains.length + commissions.length,
      recentGains: gains.filter(g => {
        const gainDate = new Date(g.createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return gainDate > thirtyDaysAgo;
      }),
      pendingGains: gains.filter(g => g.status === 'pending'),
      paidGains: gains.filter(g => g.status === 'paid')
    };

  } catch (error) {
    console.error('💥 Erreur chargement données gains:', error);
    return {
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
    };
  }
};

// ===== FORMATAGE MONTANT =====
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
};

// ===== FORMATAGE TYPE DE GAIN =====
export const formatGainType = (type: ReferralGain['type']): string => {
  const types = {
    bonus: 'Bonus',
    commission: 'Commission',
    badge: 'Badge',
    service: 'Service',
    signup_bonus: 'Bonus inscription',
    first_order_bonus: 'Bonus 1ère commande',
    client_order: 'Commission commande',
    fourmiz_service: 'Commission service',
    fourmiz_client: 'Commission gains fourmiz'
  };
  
  return types[type] || type;
};

// ===== FORMATAGE STATUT =====
export const formatStatus = (status: 'pending' | 'paid' | 'cancelled'): string => {
  const statuses = {
    pending: 'En attente',
    paid: 'Payé',
    cancelled: 'Annulé'
  };
  
  return statuses[status] || status;
};

// ===== COULEUR SELON STATUT =====
export const getStatusColor = (status: 'pending' | 'paid' | 'cancelled'): string => {
  const colors = {
    pending: '#f59e0b', // Orange
    paid: '#10b981',    // Vert
    cancelled: '#ef4444' // Rouge
  };
  
  return colors[status] || '#6b7280';
};

// ===== SIMULATION DE GAINS =====
export const simulateGains = async (
  userId: string,
  activityType: 'order' | 'service',
  amount: number,
  fourmizEarnings?: number
): Promise<{ total: number; details: any[] }> => {
  try {
    console.log('🎮 Simulation gains:', { userId, activityType, amount, fourmizEarnings });

    // Charger la configuration actuelle
    const { loadReferralRates, calculateClientOrderCommission, calculateFourmizServiceCommission, calculateFourmizClientCommission, calculateSignupBonus } = await import('./referralConfig');
    const rates = await loadReferralRates();

    // Vérifier si l'utilisateur a un parrain
    const { data: referralData } = await supabase
      .from('user_referrals')
      .select('parrain_id, filleul_id')
      .eq('filleul_id', userId)
      .eq('statut', 'actif')
      .single();

    if (!referralData) {
      return { total: 0, details: [] };
    }

    const details = [];
    let total = 0;

    // Simuler selon le type d'activité
    if (activityType === 'order') {
      // Commission commande
      const commissionCalc = calculateClientOrderCommission(amount, rates);
      if (commissionCalc) {
        details.push({
          type: 'Commission commande',
          amount: commissionCalc.calculatedGain,
          rate: commissionCalc.rate
        });
        total += commissionCalc.calculatedGain;
      }
    } else if (activityType === 'service') {
      // Commission service
      const serviceCommissionCalc = calculateFourmizServiceCommission(amount, rates);
      if (serviceCommissionCalc) {
        details.push({
          type: 'Commission service',
          amount: serviceCommissionCalc.calculatedGain,
          rate: serviceCommissionCalc.rate
        });
        total += serviceCommissionCalc.calculatedGain;
      }

      // Commission gains fourmiz
      if (fourmizEarnings && fourmizEarnings > 0) {
        const earningsCommissionCalc = calculateFourmizClientCommission(fourmizEarnings, rates);
        if (earningsCommissionCalc) {
          details.push({
            type: 'Commission gains fourmiz',
            amount: earningsCommissionCalc.calculatedGain,
            rate: earningsCommissionCalc.rate
          });
          total += earningsCommissionCalc.calculatedGain;
        }
      }
    }

    // Bonus inscription si première activité
    const { isFirstActivity } = await import('./referralConfig');
    const isFirst = await isFirstActivity(userId, activityType);
    
    if (isFirst) {
      const bonusCalc = calculateSignupBonus(rates);
      if ((activityType === 'order' && rates.signupBonus.triggerOnFirstOrder) ||
          (activityType === 'service' && rates.signupBonus.triggerOnFirstService)) {
        details.push({
          type: 'Bonus inscription',
          amount: bonusCalc.calculatedGain,
          rate: null
        });
        total += bonusCalc.calculatedGain;
      }
    }

    console.log(`✅ Simulation: ${total}€ total, ${details.length} gain(s)`);
    return { total, details };

  } catch (error) {
    console.error('💥 Erreur simulation gains:', error);
    return { total: 0, details: [] };
  }
};

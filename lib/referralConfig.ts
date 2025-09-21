// =====================================================
// 📁 CONFIGURATION DU SYSTÈME DE GAINS - PARRAINAGE
// =====================================================

export interface ReferralRates {
  // Bonus d'inscription (déclenché à la première commande OU premier service)
  signupBonus: {
    amount: number;           // Montant fixe défini par l'admin
    triggerOnFirstOrder: boolean;    // Se déclenche sur première commande
    triggerOnFirstService: boolean;  // Se déclenche sur premier service
    description: string;      // Description du bonus
  };
  
  // Commissions sur commandes client
  clientOrderCommission: {
    rate: number;            // % défini par l'admin
    minimum: number;         // Montant minimum pour déclencher
    maximum?: number;        // Plafond de commission (optionnel)
    description: string;     // Description de la commission
  };
  
  // Commissions sur services fourmiz
  fourmizServiceCommission: {
    rate: number;            // % défini par l'admin  
    minimum: number;         // Montant minimum pour déclencher
    maximum?: number;        // Plafond de commission (optionnel)
    description: string;     // Description de la commission
  };
  
  // Commission fourmiz sur client (gains du fourmiz)
  fourmizClientCommission: {
    rate: number;            // % défini par l'admin sur les gains fourmiz
    minimum: number;         // Montant minimum pour déclencher
    maximum?: number;        // Plafond de commission (optionnel)
    description: string;     // Description de la commission
  };
  
  // Conditions générales
  conditions: {
    maxGainsPerMonth: number;        // Plafond mensuel par parrain
    maxGainsPerFilleul: number;      // Plafond par filleul
    minimumProfileCompletion: boolean; // Profil doit être complété
    activeReferralOnly: boolean;     // Seulement relations actives
  };
  
  // Paramètres admin
  adminSettings: {
    canModifyRates: boolean;         // Admin peut modifier les taux
    requireApproval: boolean;        // Gains nécessitent approbation
    autoPayment: boolean;            // Paiement automatique
    paymentThreshold: number;        // Seuil minimum pour paiement
  };
}

// ===== CONFIGURATION PAR DÉFAUT =====
export const DEFAULT_REFERRAL_RATES: ReferralRates = {
  signupBonus: {
    amount: 15.00,                   // 15€ par défaut
    triggerOnFirstOrder: true,       // Se déclenche sur première commande
    triggerOnFirstService: true,     // OU sur premier service
    description: "Bonus de parrainage"
  },
  
  clientOrderCommission: {
    rate: 5.00,                      // 5% par défaut
    minimum: 10.00,                  // Commande minimum 10€
    maximum: 50.00,                  // Commission max 50€
    description: "Commission sur commande client"
  },
  
  fourmizServiceCommission: {
    rate: 3.00,                      // 3% par défaut
    minimum: 15.00,                  // Service minimum 15€
    maximum: 30.00,                  // Commission max 30€
    description: "Commission sur service fourmiz"
  },
  
  fourmizClientCommission: {
    rate: 2.00,                      // 2% par défaut sur gains fourmiz
    minimum: 20.00,                  // Gains minimum 20€
    maximum: 25.00,                  // Commission max 25€
    description: "Commission sur gains fourmiz d'un client"
  },
  
  conditions: {
    maxGainsPerMonth: 500.00,        // 500€ max par mois
    maxGainsPerFilleul: 200.00,      // 200€ max par filleul
    minimumProfileCompletion: true,   // Profil obligatoire
    activeReferralOnly: true         // Relations actives seulement
  },
  
  adminSettings: {
    canModifyRates: true,
    requireApproval: false,          // Pas d'approbation par défaut
    autoPayment: false,              // Paiement manuel
    paymentThreshold: 20.00          // Paiement à partir de 20€
  }
};

// ===== TYPES POUR LES ÉVÉNEMENTS =====
export type GainTriggerType = 
  | 'signup_bonus'           // Bonus d'inscription
  | 'client_order'          // Commission commande client
  | 'fourmiz_service'       // Commission service fourmiz
  | 'fourmiz_client'        // Commission gains fourmiz d'un client
  | 'manual_bonus'          // Bonus manuel admin
  | 'loyalty_bonus';        // Bonus fidélité

export interface GainCalculation {
  type: GainTriggerType;
  baseAmount: number;       // Montant de base (commande/service)
  calculatedGain: number;   // Gain calculé
  rate?: number;           // Taux appliqué (si commission)
  parrainId: string;
  filleulId: string;
  description: string;
  metadata?: Record<string, any>;
}

// ===== FONCTIONS DE CALCUL =====

/**
 * Calcule le bonus d'inscription
 */
export const calculateSignupBonus = (
  rates: ReferralRates = DEFAULT_REFERRAL_RATES
): GainCalculation => {
  return {
    type: 'signup_bonus',
    baseAmount: rates.signupBonus.amount,
    calculatedGain: rates.signupBonus.amount,
    parrainId: '', // À remplir
    filleulId: '', // À remplir
    description: rates.signupBonus.description,
    metadata: {
      triggerOnFirstOrder: rates.signupBonus.triggerOnFirstOrder,
      triggerOnFirstService: rates.signupBonus.triggerOnFirstService
    }
  };
};

/**
 * Calcule la commission sur commande client
 */
export const calculateClientOrderCommission = (
  orderAmount: number,
  rates: ReferralRates = DEFAULT_REFERRAL_RATES
): GainCalculation | null => {
  const config = rates.clientOrderCommission;
  
  // Vérifier montant minimum
  if (orderAmount < config.minimum) {
    return null;
  }
  
  // Calculer commission
  let commission = (orderAmount * config.rate) / 100;
  
  // Appliquer plafond si défini
  if (config.maximum && commission > config.maximum) {
    commission = config.maximum;
  }
  
  return {
    type: 'client_order',
    baseAmount: orderAmount,
    calculatedGain: commission,
    rate: config.rate,
    parrainId: '', // À remplir
    filleulId: '', // À remplir
    description: config.description,
    metadata: {
      orderAmount,
      rate: config.rate,
      cappedAt: config.maximum
    }
  };
};

/**
 * Calcule la commission sur service fourmiz
 */
export const calculateFourmizServiceCommission = (
  serviceAmount: number,
  rates: ReferralRates = DEFAULT_REFERRAL_RATES
): GainCalculation | null => {
  const config = rates.fourmizServiceCommission;
  
  // Vérifier montant minimum
  if (serviceAmount < config.minimum) {
    return null;
  }
  
  // Calculer commission
  let commission = (serviceAmount * config.rate) / 100;
  
  // Appliquer plafond si défini
  if (config.maximum && commission > config.maximum) {
    commission = config.maximum;
  }
  
  return {
    type: 'fourmiz_service',
    baseAmount: serviceAmount,
    calculatedGain: commission,
    rate: config.rate,
    parrainId: '', // À remplir
    filleulId: '', // À remplir
    description: config.description,
    metadata: {
      serviceAmount,
      rate: config.rate,
      cappedAt: config.maximum
    }
  };
};

/**
 * Calcule la commission fourmiz sur client (gains du fourmiz)
 */
export const calculateFourmizClientCommission = (
  fourmizEarnings: number,
  rates: ReferralRates = DEFAULT_REFERRAL_RATES
): GainCalculation | null => {
  const config = rates.fourmizClientCommission;
  
  // Vérifier montant minimum
  if (fourmizEarnings < config.minimum) {
    return null;
  }
  
  // Calculer commission
  let commission = (fourmizEarnings * config.rate) / 100;
  
  // Appliquer plafond si défini
  if (config.maximum && commission > config.maximum) {
    commission = config.maximum;
  }
  
  return {
    type: 'fourmiz_client',
    baseAmount: fourmizEarnings,
    calculatedGain: commission,
    rate: config.rate,
    parrainId: '', // À remplir
    filleulId: '', // À remplir
    description: config.description,
    metadata: {
      fourmizEarnings,
      rate: config.rate,
      cappedAt: config.maximum
    }
  };
};

// ===== GESTION DES TAUX ADMIN =====

/**
 * Sauvegarde les taux de parrainage en base
 */
export const saveReferralRates = async (rates: ReferralRates): Promise<boolean> => {
  try {
    const { supabase } = await import('./supabase');
    
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        key: 'referral_rates',
        value: rates,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });
    
    if (error) {
      console.error('❌ Erreur sauvegarde taux:', error);
      return false;
    }
    
    console.log('✅ Taux de parrainage sauvegardés');
    return true;
    
  } catch (error) {
    console.error('💥 Exception sauvegarde taux:', error);
    return false;
  }
};

/**
 * Charge les taux de parrainage depuis la base
 */
export const loadReferralRates = async (): Promise<ReferralRates> => {
  try {
    const { supabase } = await import('./supabase');
    
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'referral_rates')
      .single();
    
    if (error || !data) {
      console.log('ℹ️ Aucun taux personnalisé, utilisation des valeurs par défaut');
      return DEFAULT_REFERRAL_RATES;
    }
    
    console.log('✅ Taux de parrainage chargés');
    return data.value as ReferralRates;
    
  } catch (error) {
    console.error('💥 Exception chargement taux:', error);
    return DEFAULT_REFERRAL_RATES;
  }
};

// ===== VALIDATION DES CONDITIONS =====

/**
 * Vérifie si un gain peut être accordé selon les conditions
 */
export const canGrantGain = async (
  parrainId: string,
  filleulId: string,
  gainAmount: number,
  rates: ReferralRates = DEFAULT_REFERRAL_RATES
): Promise<{ canGrant: boolean; reason?: string }> => {
  try {
    const { supabase } = await import('./supabase');
    
    // Vérifier plafond mensuel
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data: monthlyGains } = await supabase
      .from('referral_gains')
      .select('amount')
      .eq('sponsor_id', parrainId)
      .gte('created_at', startOfMonth.toISOString());
    
    const currentMonthlyTotal = monthlyGains?.reduce((sum, gain) => sum + parseFloat(gain.amount), 0) || 0;
    
    if (currentMonthlyTotal + gainAmount > rates.conditions.maxGainsPerMonth) {
      return {
        canGrant: false,
        reason: `Plafond mensuel dépassé (${rates.conditions.maxGainsPerMonth}€)`
      };
    }
    
    // Vérifier plafond par filleul
    const { data: filleulGains } = await supabase
      .from('referral_gains')
      .select('amount')
      .eq('sponsor_id', parrainId)
      .eq('referred_id', filleulId);
    
    const currentFilleulTotal = filleulGains?.reduce((sum, gain) => sum + parseFloat(gain.amount), 0) || 0;
    
    if (currentFilleulTotal + gainAmount > rates.conditions.maxGainsPerFilleul) {
      return {
        canGrant: false,
        reason: `Plafond par filleul dépassé (${rates.conditions.maxGainsPerFilleul}€)`
      };
    }
    
    // Vérifier profil complété si requis
    if (rates.conditions.minimumProfileCompletion) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completed')
        .eq('id', filleulId)
        .single();
      
      if (!profile?.profile_completed) {
        return {
          canGrant: false,
          reason: 'Profil du filleul non complété'
        };
      }
    }
    
    // Vérifier relation active si requis
    if (rates.conditions.activeReferralOnly) {
      const { data: referral } = await supabase
        .from('user_referrals')
        .select('statut')
        .eq('parrain_id', parrainId)
        .eq('filleul_id', filleulId)
        .single();
      
      if (referral?.statut !== 'actif') {
        return {
          canGrant: false,
          reason: 'Relation de parrainage inactive'
        };
      }
    }
    
    return { canGrant: true };
    
  } catch (error) {
    console.error('💥 Erreur validation conditions:', error);
    return {
      canGrant: false,
      reason: 'Erreur technique lors de la validation'
    };
  }
};

// ===== UTILITAIRES =====

/**
 * Formate un taux en pourcentage
 */
export const formatRate = (rate: number): string => {
  return `${rate.toFixed(1)}%`;
};

/**
 * Formate un montant en euros
 */
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

/**
 * Vérifie si c'est la première commande/service d'un utilisateur
 */
export const isFirstActivity = async (
  userId: string,
  activityType: 'order' | 'service'
): Promise<boolean> => {
  try {
    const { supabase } = await import('./supabase');
    
    if (activityType === 'order') {
      const { data: orders } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);
      
      return (orders?.length || 0) <= 1;
    } else {
      const { data: services } = await supabase
        .from('services')
        .select('id', { count: 'exact' })
        .eq('fourmiz_id', userId);
      
      return (services?.length || 0) <= 1;
    }
    
  } catch (error) {
    console.error('💥 Erreur vérification première activité:', error);
    return false;
  }
};

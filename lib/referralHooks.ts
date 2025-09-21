import { supabase } from './supabase';
import { createReferralGain } from './referralEarnings';
import { 
  loadReferralRates, 
  calculateSignupBonus,
  calculateClientOrderCommission,
  calculateFourmizServiceCommission,
  calculateFourmizClientCommission,
  canGrantGain,
  isFirstActivity,
  ReferralRates,
  DEFAULT_REFERRAL_RATES
} from './referralConfig';

// Types pour les événements
export interface OrderCompletedEvent {
  orderId: number;
  userId: string;
  totalAmount: number;
  serviceId?: string;
}

export interface ServiceCompletedEvent {
  serviceId: string;
  clientId: string;
  fourmizId: string;
  amount: number;
  fourmizEarnings: number;  // Montant que gagne le fourmiz
}

// ===== GESTION DES ÉVÉNEMENTS DE PARRAINAGE =====

/**
 * Traite une commande terminée et crée les gains appropriés
 */
export const handleOrderCompleted = async (event: OrderCompletedEvent): Promise<boolean> => {
  try {
    console.log('🛒 Traitement commande terminée:', event);

    // Charger les taux actuels
    const rates = await loadReferralRates();

    // Vérifier si l'utilisateur a un parrain
    const { data: referralData, error } = await supabase
      .from('user_referrals')
      .select(`
        id,
        parrain_id,
        filleul_id,
        code_utilise,
        profiles!inner (firstname, lastname)
      `)
      .eq('filleul_id', event.userId)
      .eq('statut', 'actif')
      .single();

    if (error || !referralData) {
      console.log('ℹ️ Aucun parrainage trouvé pour cet utilisateur');
      return true; // Pas d'erreur, juste pas de parrainage
    }

    console.log('✅ Parrainage trouvé, traitement des gains...');

    // 1. Vérifier si c'est la première commande pour le bonus d'inscription
    const isFirstOrder = await isFirstActivity(event.userId, 'order');
    
    if (isFirstOrder && rates.signupBonus.triggerOnFirstOrder) {
      console.log('🎉 Première commande - Bonus d\'inscription...');
      
      // Vérifier si le bonus peut être accordé
      const validation = await canGrantGain(
        referralData.parrain_id,
        referralData.filleul_id,
        rates.signupBonus.amount,
        rates
      );

      if (validation.canGrant) {
        const bonusCalc = calculateSignupBonus(rates);
        
        const bonusCreated = await createReferralGain(
          referralData.parrain_id,
          referralData.filleul_id,
          bonusCalc.calculatedGain,
          'signup_bonus',
          `${bonusCalc.description} (première commande)`,
          {
            ...bonusCalc.metadata,
            triggeredBy: 'first_order',
            orderId: event.orderId,
            referralId: referralData.id
          }
        );

        if (bonusCreated) {
          console.log(`✅ Bonus inscription créé: ${bonusCalc.calculatedGain}€`);
        } else {
          console.error('❌ Erreur création bonus inscription');
        }
      } else {
        console.warn(`⚠️ Bonus refusé: ${validation.reason}`);
      }
    }

    // 2. Calculer et créer la commission sur commande
    const commissionCalc = calculateClientOrderCommission(event.totalAmount, rates);
    
    if (commissionCalc) {
      // Vérifier si la commission peut être accordée
      const validation = await canGrantGain(
        referralData.parrain_id,
        referralData.filleul_id,
        commissionCalc.calculatedGain,
        rates
      );

      if (validation.canGrant) {
        const commissionCreated = await createReferralGain(
          referralData.parrain_id,
          referralData.filleul_id,
          commissionCalc.calculatedGain,
          'client_order',
          commissionCalc.description,
          {
            ...commissionCalc.metadata,
            orderId: event.orderId,
            referralId: referralData.id
          }
        );

        if (commissionCreated) {
          console.log(`✅ Commission créée: ${commissionCalc.calculatedGain}€ (${commissionCalc.rate}%)`);
        } else {
          console.error('❌ Erreur création commission');
        }
      } else {
        console.warn(`⚠️ Commission refusée: ${validation.reason}`);
      }
    } else {
      console.log(`ℹ️ Commande trop faible pour commission (${event.totalAmount}€ < ${rates.clientOrderCommission.minimum}€)`);
    }

    console.log('✅ Traitement commande terminé');
    return true;

  } catch (error) {
    console.error('💥 Erreur traitement commande:', error);
    return false;
  }
};

/**
 * Traite l'achèvement d'un service et crée les gains appropriés
 */
export const handleServiceCompleted = async (event: ServiceCompletedEvent): Promise<boolean> => {
  try {
    console.log('🔧 Traitement service terminé:', event);

    // Charger les taux actuels
    const rates = await loadReferralRates();

    // Vérifier si le client a un parrain
    const { data: clientReferral } = await supabase
      .from('user_referrals')
      .select('id, parrain_id, filleul_id')
      .eq('filleul_id', event.clientId)
      .eq('statut', 'actif')
      .single();

    // Vérifier si le fourmiz a un parrain
    const { data: fourmizReferral } = await supabase
      .from('user_referrals')
      .select('id, parrain_id, filleul_id')
      .eq('filleul_id', event.fourmizId)
      .eq('statut', 'actif')
      .single();

    let gainsCreated = 0;

    // 1. Traiter le bonus d'inscription pour le fourmiz si c'est son premier service
    if (fourmizReferral && rates.signupBonus.triggerOnFirstService) {
      const isFirstService = await isFirstActivity(event.fourmizId, 'service');
      
      if (isFirstService) {
        console.log('🎉 Premier service Fourmiz - Bonus d\'inscription...');
        
        const validation = await canGrantGain(
          fourmizReferral.parrain_id,
          fourmizReferral.filleul_id,
          rates.signupBonus.amount,
          rates
        );

        if (validation.canGrant) {
          const bonusCalc = calculateSignupBonus(rates);
          
          const bonusCreated = await createReferralGain(
            fourmizReferral.parrain_id,
            fourmizReferral.filleul_id,
            bonusCalc.calculatedGain,
            'signup_bonus',
            `${bonusCalc.description} (premier service)`,
            {
              ...bonusCalc.metadata,
              triggeredBy: 'first_service',
              serviceId: event.serviceId,
              referralId: fourmizReferral.id
            }
          );

          if (bonusCreated) {
            gainsCreated++;
            console.log(`✅ Bonus inscription Fourmiz créé: ${bonusCalc.calculatedGain}€`);
          }
        } else {
          console.warn(`⚠️ Bonus Fourmiz refusé: ${validation.reason}`);
        }
      }
    }

    // 2. Commission fourmiz sur service si il a un parrain
    if (fourmizReferral) {
      const serviceCommissionCalc = calculateFourmizServiceCommission(event.amount, rates);
      
      if (serviceCommissionCalc) {
        const validation = await canGrantGain(
          fourmizReferral.parrain_id,
          fourmizReferral.filleul_id,
          serviceCommissionCalc.calculatedGain,
          rates
        );

        if (validation.canGrant) {
          const commissionCreated = await createReferralGain(
            fourmizReferral.parrain_id,
            fourmizReferral.filleul_id,
            serviceCommissionCalc.calculatedGain,
            'fourmiz_service',
            serviceCommissionCalc.description,
            {
              ...serviceCommissionCalc.metadata,
              serviceId: event.serviceId,
              referralId: fourmizReferral.id
            }
          );

          if (commissionCreated) {
            gainsCreated++;
            console.log(`✅ Commission service Fourmiz créée: ${serviceCommissionCalc.calculatedGain}€ (${serviceCommissionCalc.rate}%)`);
          }
        } else {
          console.warn(`⚠️ Commission service refusée: ${validation.reason}`);
        }
      } else {
        console.log(`ℹ️ Service trop faible pour commission (${event.amount}€ < ${rates.fourmizServiceCommission.minimum}€)`);
      }
    }

    // 3. Commission fourmiz-client (sur les gains du fourmiz) si il a un parrain
    if (fourmizReferral && event.fourmizEarnings > 0) {
      const clientCommissionCalc = calculateFourmizClientCommission(event.fourmizEarnings, rates);
      
      if (clientCommissionCalc) {
        const validation = await canGrantGain(
          fourmizReferral.parrain_id,
          fourmizReferral.filleul_id,
          clientCommissionCalc.calculatedGain,
          rates
        );

        if (validation.canGrant) {
          const commissionCreated = await createReferralGain(
            fourmizReferral.parrain_id,
            fourmizReferral.filleul_id,
            clientCommissionCalc.calculatedGain,
            'fourmiz_client',
            clientCommissionCalc.description,
            {
              ...clientCommissionCalc.metadata,
              serviceId: event.serviceId,
              referralId: fourmizReferral.id,
              clientId: event.clientId
            }
          );

          if (commissionCreated) {
            gainsCreated++;
            console.log(`✅ Commission gains Fourmiz créée: ${clientCommissionCalc.calculatedGain}€ (${clientCommissionCalc.rate}%)`);
          }
        } else {
          console.warn(`⚠️ Commission gains refusée: ${validation.reason}`);
        }
      } else {
        console.log(`ℹ️ Gains trop faibles pour commission (${event.fourmizEarnings}€ < ${rates.fourmizClientCommission.minimum}€)`);
      }
    }

    console.log(`✅ Service traité, ${gainsCreated} gain(s) créé(s)`);
    return true;

  } catch (error) {
    console.error('💥 Erreur traitement service:', error);
    return false;
  }
};

// ===== HOOKS D'INTÉGRATION SIMPLIFIÉS =====

/**
 * Hook à appeler après la création/validation d'une commande
 * Usage: await handleOrderCreated(orderId, userId, amount);
 */
export const handleOrderCreated = async (
  orderId: number,
  userId: string,
  totalAmount: number,
  serviceId?: string
): Promise<void> => {
  try {
    const event: OrderCompletedEvent = {
      orderId,
      userId,
      totalAmount,
      serviceId
    };
    await handleOrderCompleted(event);
  } catch (error) {
    console.error('Erreur hook commande créée:', error);
  }
};

/**
 * Hook à appeler après la finalisation d'un service
 * Usage: await handleServiceFinished(serviceId, clientId, fourmizId, totalAmount, fourmizEarnings);
 */
export const handleServiceFinished = async (
  serviceId: string,
  clientId: string,
  fourmizId: string,
  amount: number,
  fourmizEarnings: number
): Promise<void> => {
  try {
    const event: ServiceCompletedEvent = {
      serviceId,
      clientId,
      fourmizId,
      amount,
      fourmizEarnings
    };
    await handleServiceCompleted(event);
  } catch (error) {
    console.error('Erreur hook service terminé:', error);
  }
};

// ===== FONCTION DE RÉCONCILIATION =====

/**
 * Fonction pour traiter les commandes/services rétroactivement
 * Utile pour rattraper les gains manqués après mise à jour des taux
 */
export const reconcileReferralGains = async (fromDate?: string): Promise<number> => {
  try {
    console.log('🔄 Réconciliation des gains de parrainage...');
    
    const startDate = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let processedCount = 0;

    // Récupérer les commandes récentes sans gain associé
    const { data: missedOrders } = await supabase
      .from('orders') // À adapter selon votre schéma
      .select('id, user_id, total_amount, service_id, created_at')
      .gte('created_at', startDate);

    if (missedOrders?.length) {
      console.log(`📋 Vérification de ${missedOrders.length} commande(s)...`);
      
      for (const order of missedOrders) {
        // Vérifier s'il y a déjà des gains pour cette commande
        const { data: existingGains } = await supabase
          .from('referral_gains')
          .select('id')
          .eq('metadata->>orderId', order.id.toString());

        if (!existingGains?.length) {
          const event: OrderCompletedEvent = {
            orderId: order.id,
            userId: order.user_id,
            totalAmount: order.total_amount,
            serviceId: order.service_id
          };
          
          const success = await handleOrderCompleted(event);
          if (success) processedCount++;
        }
      }
    }

    // Récupérer les services récents sans gain associé
    const { data: missedServices } = await supabase
      .from('services') // À adapter selon votre schéma
      .select('id, client_id, fourmiz_id, amount, created_at')
      .gte('created_at', startDate);

    if (missedServices?.length) {
      console.log(`🔧 Vérification de ${missedServices.length} service(s)...`);
      
      for (const service of missedServices) {
        // Vérifier s'il y a déjà des gains pour ce service
        const { data: existingGains } = await supabase
          .from('referral_gains')
          .select('id')
          .eq('metadata->>serviceId', service.id);

        if (!existingGains?.length) {
          // Estimer les gains du fourmiz (ex: 75% du montant total du service)
          const estimatedFourmizEarnings = service.amount * 0.75;
          
          const event: ServiceCompletedEvent = {
            serviceId: service.id,
            clientId: service.client_id,
            fourmizId: service.fourmiz_id,
            amount: service.amount,
            fourmizEarnings: estimatedFourmizEarnings
          };
          
          const success = await handleServiceCompleted(event);
          if (success) processedCount++;
        }
      }
    }

    console.log(`✅ Réconciliation terminée: ${processedCount} élément(s) traité(s)`);
    return processedCount;

  } catch (error) {
    console.error('💥 Erreur réconciliation:', error);
    return 0;
  }
};

// ===== FONCTIONS DE SIMULATION =====

/**
 * Simule les gains pour une commande donnée (sans les créer)
 */
export const simulateOrderGains = async (
  userId: string,
  orderAmount: number
): Promise<{ signupBonus?: number; commission?: number; total: number }> => {
  try {
    const rates = await loadReferralRates();
    const result = { total: 0 };

    // Vérifier si l'utilisateur a un parrain
    const { data: referralData } = await supabase
      .from('user_referrals')
      .select('parrain_id, filleul_id')
      .eq('filleul_id', userId)
      .eq('statut', 'actif')
      .single();

    if (!referralData) {
      return result;
    }

    // Simuler bonus inscription si première commande
    const isFirstOrder = await isFirstActivity(userId, 'order');
    if (isFirstOrder && rates.signupBonus.triggerOnFirstOrder) {
      const validation = await canGrantGain(
        referralData.parrain_id,
        referralData.filleul_id,
        rates.signupBonus.amount,
        rates
      );
      
      if (validation.canGrant) {
        result.signupBonus = rates.signupBonus.amount;
        result.total += rates.signupBonus.amount;
      }
    }

    // Simuler commission
    const commissionCalc = calculateClientOrderCommission(orderAmount, rates);
    if (commissionCalc) {
      const validation = await canGrantGain(
        referralData.parrain_id,
        referralData.filleul_id,
        commissionCalc.calculatedGain,
        rates
      );
      
      if (validation.canGrant) {
        result.commission = commissionCalc.calculatedGain;
        result.total += commissionCalc.calculatedGain;
      }
    }

    return result;

  } catch (error) {
    console.error('💥 Erreur simulation gains:', error);
    return { total: 0 };
  }
};

/**
 * Simule les gains pour un service donné (sans les créer)
 */
export const simulateServiceGains = async (
  fourmizId: string,
  serviceAmount: number,
  fourmizEarnings: number
): Promise<{ signupBonus?: number; serviceCommission?: number; earningsCommission?: number; total: number }> => {
  try {
    const rates = await loadReferralRates();
    const result = { total: 0 };

    // Vérifier si le fourmiz a un parrain
    const { data: referralData } = await supabase
      .from('user_referrals')
      .select('parrain_id, filleul_id')
      .eq('filleul_id', fourmizId)
      .eq('statut', 'actif')
      .single();

    if (!referralData) {
      return result;
    }

    // Simuler bonus inscription si premier service
    const isFirstService = await isFirstActivity(fourmizId, 'service');
    if (isFirstService && rates.signupBonus.triggerOnFirstService) {
      const validation = await canGrantGain(
        referralData.parrain_id,
        referralData.filleul_id,
        rates.signupBonus.amount,
        rates
      );
      
      if (validation.canGrant) {
        result.signupBonus = rates.signupBonus.amount;
        result.total += rates.signupBonus.amount;
      }
    }

    // Simuler commission service
    const serviceCommissionCalc = calculateFourmizServiceCommission(serviceAmount, rates);
    if (serviceCommissionCalc) {
      const validation = await canGrantGain(
        referralData.parrain_id,
        referralData.filleul_id,
        serviceCommissionCalc.calculatedGain,
        rates
      );
      
      if (validation.canGrant) {
        result.serviceCommission = serviceCommissionCalc.calculatedGain;
        result.total += serviceCommissionCalc.calculatedGain;
      }
    }

    // Simuler commission gains
    const earningsCommissionCalc = calculateFourmizClientCommission(fourmizEarnings, rates);
    if (earningsCommissionCalc) {
      const validation = await canGrantGain(
        referralData.parrain_id,
        referralData.filleul_id,
        earningsCommissionCalc.calculatedGain,
        rates
      );
      
      if (validation.canGrant) {
        result.earningsCommission = earningsCommissionCalc.calculatedGain;
        result.total += earningsCommissionCalc.calculatedGain;
      }
    }

    return result;

  } catch (error) {
    console.error('💥 Erreur simulation gains service:', error);
    return { total: 0 };
  }
};

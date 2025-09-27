// services/payment-expiry.service.ts
// Service pour gérer l'expiration et l'annulation automatique des autorisations de paiement

import { supabase } from '../lib/supabase';
import { PaymentService } from '../lib/payment.service';

export interface ExpiryResult {
  totalProcessed: number;
  successfulCancellations: number;
  failedCancellations: number;
  errors: string[];
}

/**
 * Annule toutes les autorisations de paiement expirées
 * À exécuter quotidiennement via un cron job
 */
export const cancelExpiredAuthorizations = async (): Promise<ExpiryResult> => {
  const result: ExpiryResult = {
    totalProcessed: 0,
    successfulCancellations: 0,
    failedCancellations: 0,
    errors: []
  };

  try {
    console.log('🕐 Début du nettoyage des autorisations expirées...');

    // 1. Récupérer toutes les commandes avec autorisation expirée
    const { data: expiredOrders, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        payment_intent_id,
        proposed_amount,
        service_title,
        client_id,
        authorization_expires_at,
        created_at
      `)
      .eq('payment_status', 'authorized')
      .lt('authorization_expires_at', new Date().toISOString())
      .is('fourmiz_id', null); // Seulement les commandes non assignées

    if (fetchError) {
      throw new Error(`Erreur récupération commandes expirées: ${fetchError.message}`);
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('✅ Aucune autorisation expirée trouvée');
      return result;
    }

    result.totalProcessed = expiredOrders.length;
    console.log(`📋 ${expiredOrders.length} autorisation(s) expirée(s) trouvée(s)`);

    // 2. Traiter chaque commande expirée
    for (const order of expiredOrders) {
      try {
        await processSingleExpiredOrder(order);
        result.successfulCancellations++;
        
        console.log(`✅ Commande ${order.id} - Autorisation annulée avec succès`);

      } catch (error: any) {
        result.failedCancellations++;
        const errorMsg = `Commande ${order.id}: ${error.message}`;
        result.errors.push(errorMsg);
        
        console.error(`❌ ${errorMsg}`);
      }
    }

    // 3. Log du résumé
    console.log(`🎯 Nettoyage terminé:
      - Total traité: ${result.totalProcessed}
      - Succès: ${result.successfulCancellations}
      - Échecs: ${result.failedCancellations}
    `);

    return result;

  } catch (error: any) {
    console.error('❌ Erreur globale nettoyage autorisations:', error);
    result.errors.push(`Erreur globale: ${error.message}`);
    return result;
  }
};

/**
 * Traite une seule commande expirée
 */
const processSingleExpiredOrder = async (order: any) => {
  const orderId = order.id;
  const paymentIntentId = order.payment_intent_id;

  try {
    // 1. Annuler l'autorisation côté Stripe
    if (paymentIntentId) {
      console.log(`💳 Annulation Stripe pour commande ${orderId}...`);
      
      await PaymentService.cancelAuthorization(
        paymentIntentId,
        orderId,
        'Authorization expired - no Fourmiz assigned within 7 days'
      );
    }

    // 2. Mettre à jour la commande dans la base de données
    const now = new Date().toISOString();
    
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'authorization_expired',
        cancelled_at: now,
        cancelled_by: 'system',
        cancellation_reason: 'Autorisation expirée - aucune Fourmiz assignée dans les 7 jours',
        updated_at: now
      })
      .eq('id', orderId);

    if (updateError) {
      throw new Error(`Erreur mise à jour BDD: ${updateError.message}`);
    }

    // 3. Optionnel: Notifier le client
    try {
      await notifyClientOfExpiration(order);
    } catch (notifError) {
      console.warn(`⚠️ Erreur notification client pour commande ${orderId}:`, notifError);
      // Ne pas faire échouer le processus pour une erreur de notification
    }

  } catch (error) {
    throw new Error(`Échec traitement commande ${orderId}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
};

/**
 * Notifier le client que son autorisation a expiré
 */
const notifyClientOfExpiration = async (order: any) => {
  try {
    // Créer une notification pour le client
    const notification = {
      user_id: order.client_id,
      type: 'authorization_expired',
      title: 'Commande expirée',
      message: `Votre commande "${order.service_title}" a expiré car aucune Fourmiz ne l'a acceptée dans les 7 jours. Aucun montant n'a été débité.`,
      data: {
        order_id: order.id,
        service_title: order.service_title,
        proposed_amount: order.proposed_amount
      },
      created_at: new Date().toISOString()
    };

    // Insérer la notification (adapter selon votre structure)
    // await supabase.from('notifications').insert(notification);

    console.log(`📧 Notification envoyée au client ${order.client_id} pour commande expirée ${order.id}`);

  } catch (error) {
    console.error('Erreur envoi notification expiration:', error);
    throw error;
  }
};

/**
 * Vérifier et annuler une seule autorisation spécifique
 */
export const checkAndCancelSingleAuthorization = async (orderId: number): Promise<boolean> => {
  try {
    // Récupérer la commande
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        payment_intent_id,
        payment_status,
        authorization_expires_at,
        fourmiz_id,
        service_title,
        client_id,
        proposed_amount
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new Error(`Commande ${orderId} introuvable`);
    }

    // Vérifier si l'autorisation est expirée
    const isExpired = new Date(order.authorization_expires_at) < new Date();
    const isAuthorized = order.payment_status === 'authorized';
    const isNotAssigned = !order.fourmiz_id;

    if (isExpired && isAuthorized && isNotAssigned) {
      await processSingleExpiredOrder(order);
      return true;
    }

    return false;

  } catch (error) {
    console.error(`Erreur vérification autorisation commande ${orderId}:`, error);
    return false;
  }
};

/**
 * Obtenir les statistiques des autorisations
 */
export const getAuthorizationStats = async () => {
  try {
    const now = new Date().toISOString();

    // Autorisations actives
    const { count: activeAuthorizations } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'authorized')
      .gt('authorization_expires_at', now)
      .is('fourmiz_id', null);

    // Autorisations expirées (non traitées)
    const { count: expiredAuthorizations } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'authorized')
      .lt('authorization_expires_at', now);

    // Autorisations capturées aujourd'hui
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const { count: capturedToday } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'captured')
      .gte('payment_captured_at', todayStart.toISOString());

    return {
      activeAuthorizations: activeAuthorizations || 0,
      expiredAuthorizations: expiredAuthorizations || 0,
      capturedToday: capturedToday || 0,
      timestamp: now
    };

  } catch (error) {
    console.error('Erreur récupération statistiques autorisations:', error);
    return {
      activeAuthorizations: 0,
      expiredAuthorizations: 0,
      capturedToday: 0,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};

/**
 * Prévoir les prochaines expirations (pour alertes)
 */
export const getUpcomingExpirations = async (hoursAhead: number = 24) => {
  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));

    const { data: upcomingExpirations, error } = await supabase
      .from('orders')
      .select(`
        id,
        service_title,
        proposed_amount,
        authorization_expires_at,
        created_at
      `)
      .eq('payment_status', 'authorized')
      .is('fourmiz_id', null)
      .gt('authorization_expires_at', now.toISOString())
      .lt('authorization_expires_at', futureDate.toISOString())
      .order('authorization_expires_at', { ascending: true });

    if (error) {
      throw error;
    }

    return upcomingExpirations || [];

  } catch (error) {
    console.error('Erreur récupération prochaines expirations:', error);
    return [];
  }
};
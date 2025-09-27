// services/fourmiz-assignment.service.ts
// Service pour assigner une Fourmiz à une commande avec capture automatique du paiement pré-autorisé

import { supabase } from '../lib/supabase';
import { PaymentService } from '../lib/payment.service';

export interface AssignmentResult {
  success: boolean;
  orderId: number;
  fourmizId: number;
  capturedAmount: number;
  error?: string;
}

/**
 * Assigne une Fourmiz à une commande et capture automatiquement le paiement pré-autorisé
 */
export const assignFourmizToOrder = async (
  orderId: number, 
  fourmizId: number
): Promise<AssignmentResult> => {
  try {
    console.log(`🎯 Début assignation Fourmiz ${fourmizId} à commande ${orderId}`);

    // 1. Récupérer les détails de la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        payment_intent_id,
        payment_status,
        authorization_expires_at,
        proposed_amount,
        client_id,
        status
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Commande ${orderId} introuvable: ${orderError?.message}`);
    }

    // 2. Vérifications de sécurité
    if (order.status !== 'en_attente') {
      throw new Error(`Commande ${orderId} n'est pas en attente (statut: ${order.status})`);
    }

    if (order.payment_status !== 'authorized') {
      throw new Error(`Paiement non pré-autorisé (statut: ${order.payment_status})`);
    }

    if (!order.payment_intent_id) {
      throw new Error('Payment Intent ID manquant');
    }

    // 3. Vérifier que l'autorisation n'a pas expiré
    const expirationDate = new Date(order.authorization_expires_at);
    const now = new Date();
    
    if (expirationDate < now) {
      throw new Error(`Autorisation de paiement expirée le ${expirationDate.toLocaleDateString()}`);
    }

    console.log(`✅ Autorisation valide jusqu'au ${expirationDate.toLocaleDateString()}`);

    // 4. Vérifier que la Fourmiz est disponible
    const { data: fourmiz, error: fourmizError } = await supabase
      .from('profiles')
      .select('id, user_id, status')
      .eq('user_id', fourmizId)
      .single();

    if (fourmizError || !fourmiz) {
      throw new Error(`Fourmiz ${fourmizId} introuvable: ${fourmizError?.message}`);
    }

    // 5. Capturer le paiement pré-autorisé
    console.log(`💳 Capture du paiement pré-autorisé...`);
    
    const captureResult = await PaymentService.captureAuthorizedPayment(
      order.payment_intent_id,
      orderId,
      fourmizId
    );

    if (!captureResult) {
      throw new Error('Échec de la capture du paiement');
    }

    console.log(`✅ Paiement capturé avec succès`);

    // 6. Mettre à jour la commande avec l'assignation
    const assignmentDate = new Date().toISOString();
    
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        fourmiz_id: fourmizId,
        status: 'assigned',
        payment_status: 'captured',
        payment_captured_at: assignmentDate,
        assigned_at: assignmentDate,
        updated_at: assignmentDate
      })
      .eq('id', orderId);

    if (updateError) {
      // En cas d'erreur de mise à jour, il faudrait idéalement annuler la capture
      // Mais on log l'erreur et on continue car le paiement a été capturé
      console.error(`⚠️ Erreur mise à jour commande après capture:`, updateError);
      throw new Error(`Erreur mise à jour commande: ${updateError.message}`);
    }

    // 7. Log de succès
    console.log(`🎉 Assignation réussie: Fourmiz ${fourmizId} → Commande ${orderId}`);

    // 8. Notifications (optionnel - à implémenter selon vos besoins)
    try {
      await notifyAssignment(orderId, fourmizId, order.client_id);
    } catch (notifError) {
      console.warn('Erreur notification assignation:', notifError);
      // Ne pas faire échouer l'assignation pour une erreur de notification
    }

    return {
      success: true,
      orderId: orderId,
      fourmizId: fourmizId,
      capturedAmount: order.proposed_amount
    };

  } catch (error: any) {
    console.error(`❌ Erreur assignation Fourmiz ${fourmizId} à commande ${orderId}:`, error);
    
    return {
      success: false,
      orderId: orderId,
      fourmizId: fourmizId,
      capturedAmount: 0,
      error: error.message || 'Erreur inconnue lors de l\'assignation'
    };
  }
};

/**
 * Vérifier si une commande peut être assignée
 */
export const canAssignOrder = async (orderId: number): Promise<boolean> => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('status, payment_status, authorization_expires_at, fourmiz_id')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return false;
    }

    // Vérifications
    const isAvailable = order.status === 'en_attente';
    const isAuthorized = order.payment_status === 'authorized';
    const notAssigned = !order.fourmiz_id;
    const notExpired = new Date(order.authorization_expires_at) > new Date();

    return isAvailable && isAuthorized && notAssigned && notExpired;

  } catch (error) {
    console.error('Erreur vérification assignation:', error);
    return false;
  }
};

/**
 * Récupérer les commandes assignables pour une Fourmiz
 */
export const getAssignableOrders = async (fourmizId?: number) => {
  try {
    let query = supabase
      .from('orders')
      .select(`
        id,
        service_title,
        proposed_amount,
        address,
        city,
        date,
        start_time,
        urgent,
        authorization_expires_at,
        allow_multiple_candidates
      `)
      .eq('status', 'en_attente')
      .eq('payment_status', 'authorized')
      .is('fourmiz_id', null)
      .gt('authorization_expires_at', new Date().toISOString());

    const { data: orders, error } = await query;

    if (error) {
      throw error;
    }

    return orders || [];

  } catch (error) {
    console.error('Erreur récupération commandes assignables:', error);
    return [];
  }
};

/**
 * Notifier les parties concernées de l'assignation
 */
const notifyAssignment = async (orderId: number, fourmizId: number, clientId: string) => {
  try {
    // Ici vous pouvez ajouter :
    // - Notifications push
    // - Emails
    // - Messages in-app
    // - Webhooks
    
    console.log(`📱 Notifications assignation envoyées pour commande ${orderId}`);
    
    // Exemple de structure pour les notifications
    const notifications = [
      {
        user_id: clientId,
        type: 'order_assigned',
        title: 'Fourmiz assignée !',
        message: `Une Fourmiz a accepté votre commande #${orderId}`,
        data: { order_id: orderId, fourmiz_id: fourmizId }
      },
      {
        user_id: fourmizId,
        type: 'assignment_confirmed',
        title: 'Mission confirmée',
        message: `Vous êtes assigné à la mission #${orderId}`,
        data: { order_id: orderId }
      }
    ];

    // Insérer les notifications (adapter selon votre table)
    // await supabase.from('notifications').insert(notifications);
    
  } catch (error) {
    console.error('Erreur envoi notifications:', error);
    throw error;
  }
};

/**
 * Annuler une assignation (en cas de problème)
 */
export const cancelAssignment = async (orderId: number, reason: string) => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        fourmiz_id: null,
        status: 'en_attente',
        assigned_at: null,
        updated_at: new Date().toISOString(),
        cancellation_reason: reason
      })
      .eq('id', orderId);

    if (error) {
      throw error;
    }

    console.log(`🔄 Assignation annulée pour commande ${orderId}: ${reason}`);
    return true;

  } catch (error) {
    console.error('Erreur annulation assignation:', error);
    return false;
  }
};
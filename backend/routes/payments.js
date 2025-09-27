// backend/routes/payments.js
// Endpoints pour le système de pré-autorisation de paiement Stripe

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Middleware d'authentification (à adapter selon votre système)
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token d\'authentification requis' });
    }

    const token = authHeader.substring(7);
    
    // Vérifier le token avec votre système (Supabase, JWT, etc.)
    // const user = await verifyToken(token);
    // req.user = user;
    
    // Pour l'exemple, on simule un utilisateur valide
    req.user = { id: 'user_123' }; // À remplacer par votre logique
    
    next();
  } catch (error) {
    console.error('Erreur authentification:', error);
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// Middleware de validation des montants
const validateAmount = (req, res, next) => {
  const { amount } = req.body;
  
  if (!amount || typeof amount !== 'number') {
    return res.status(400).json({ error: 'Montant requis et doit être un nombre' });
  }
  
  if (amount <= 0) {
    return res.status(400).json({ error: 'Le montant doit être positif' });
  }
  
  if (amount > 10000) {
    return res.status(400).json({ error: 'Montant trop élevé (max 10,000€)' });
  }
  
  next();
};

/**
 * POST /api/payments/create-authorization
 * Créer une pré-autorisation de paiement
 */
router.post('/create-authorization', authenticateUser, validateAmount, async (req, res) => {
  try {
    const {
      orderId,
      amount,
      description = '',
      metadata = {},
      authorization_expires_days = 7
    } = req.body;

    // Validation des paramètres requis
    if (!orderId) {
      return res.status(400).json({ error: 'orderId requis' });
    }

    console.log(`💳 Création pré-autorisation: Commande ${orderId}, Montant ${amount}€`);

    // Créer le PaymentIntent avec capture manuelle
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir en centimes
      currency: 'eur',
      capture_method: 'manual', // Pré-autorisation
      confirmation_method: 'automatic',
      description: description || `Pré-autorisation commande #${orderId}`,
      metadata: {
        order_id: orderId.toString(),
        user_id: req.user.id,
        type: 'authorization',
        authorization_expires_days: authorization_expires_days.toString(),
        created_at: new Date().toISOString(),
        ...metadata
      },
      // Configuration pour Apple Pay/Google Pay
      payment_method_options: {
        card: {
          capture_method: 'manual'
        }
      }
    });

    console.log(`✅ PaymentIntent créé: ${paymentIntent.id}`);

    // Réponse avec les informations nécessaires pour le frontend
    res.json({
      success: true,
      payment_intent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        capture_method: paymentIntent.capture_method
      }
    });

  } catch (error) {
    console.error('❌ Erreur création pré-autorisation:', error);
    
    // Gestion des erreurs Stripe spécifiques
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        error: 'Erreur carte bancaire',
        details: {
          code: error.code,
          decline_code: error.decline_code,
          message: error.message
        }
      });
    }
    
    res.status(500).json({
      error: 'Erreur lors de la création de la pré-autorisation',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

/**
 * POST /api/payments/capture-authorization
 * Capturer une pré-autorisation (quand Fourmiz accepte)
 */
router.post('/capture-authorization', authenticateUser, async (req, res) => {
  try {
    const {
      payment_intent_id,
      order_id,
      fourmiz_id,
      amount_to_capture // Optionnel pour capture partielle
    } = req.body;

    // Validation des paramètres
    if (!payment_intent_id || !order_id || !fourmiz_id) {
      return res.status(400).json({
        error: 'payment_intent_id, order_id et fourmiz_id requis'
      });
    }

    console.log(`💰 Capture paiement: PaymentIntent ${payment_intent_id}, Commande ${order_id}`);

    // Récupérer le PaymentIntent pour vérifications
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    // Vérifications de sécurité
    if (paymentIntent.status !== 'requires_capture') {
      return res.status(400).json({
        error: 'PaymentIntent ne peut pas être capturé',
        status: paymentIntent.status
      });
    }

    // Vérifier la propriété via metadata
    if (paymentIntent.metadata.order_id !== order_id.toString()) {
      return res.status(403).json({
        error: 'PaymentIntent ne correspond pas à cette commande'
      });
    }

    // Effectuer la capture
    const captureOptions = {
      metadata: {
        fourmiz_id: fourmiz_id.toString(),
        captured_at: new Date().toISOString(),
        captured_by: req.user.id
      }
    };

    // Capture partielle si montant spécifié
    if (amount_to_capture) {
      captureOptions.amount_to_capture = Math.round(amount_to_capture * 100);
    }

    const capturedPayment = await stripe.paymentIntents.capture(
      payment_intent_id,
      captureOptions
    );

    console.log(`✅ Paiement capturé: ${capturedPayment.amount / 100}€`);

    res.json({
      success: true,
      captured_amount: capturedPayment.amount / 100,
      currency: capturedPayment.currency,
      status: capturedPayment.status,
      payment_intent_id: capturedPayment.id
    });

  } catch (error) {
    console.error('❌ Erreur capture paiement:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: 'Impossible de capturer ce paiement',
        details: error.message
      });
    }
    
    res.status(500).json({
      error: 'Erreur lors de la capture du paiement',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

/**
 * POST /api/payments/cancel-authorization
 * Annuler une pré-autorisation
 */
router.post('/cancel-authorization', authenticateUser, async (req, res) => {
  try {
    const {
      payment_intent_id,
      order_id,
      reason = 'requested_by_customer',
      cancellation_reason
    } = req.body;

    if (!payment_intent_id || !order_id) {
      return res.status(400).json({
        error: 'payment_intent_id et order_id requis'
      });
    }

    console.log(`❌ Annulation autorisation: PaymentIntent ${payment_intent_id}`);

    // Récupérer le PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    // Vérifications
    if (!['requires_payment_method', 'requires_confirmation', 'requires_action', 'requires_capture'].includes(paymentIntent.status)) {
      return res.status(400).json({
        error: 'PaymentIntent ne peut pas être annulé',
        status: paymentIntent.status
      });
    }

    // Vérifier la propriété
    if (paymentIntent.metadata.order_id !== order_id.toString()) {
      return res.status(403).json({
        error: 'PaymentIntent ne correspond pas à cette commande'
      });
    }

    // Annuler le PaymentIntent
    const canceledPayment = await stripe.paymentIntents.cancel(payment_intent_id, {
      cancellation_reason: reason,
      metadata: {
        canceled_at: new Date().toISOString(),
        canceled_by: req.user.id,
        reason: cancellation_reason || 'Demande d\'annulation'
      }
    });

    console.log(`✅ Autorisation annulée: ${payment_intent_id}`);

    res.json({
      success: true,
      status: canceledPayment.status,
      canceled_at: new Date().toISOString(),
      payment_intent_id: canceledPayment.id
    });

  } catch (error) {
    console.error('❌ Erreur annulation autorisation:', error);
    
    res.status(500).json({
      error: 'Erreur lors de l\'annulation',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

/**
 * GET /api/payments/authorization-status/:paymentIntentId
 * Vérifier le statut d'une autorisation
 */
router.get('/authorization-status/:paymentIntentId', authenticateUser, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'PaymentIntent ID requis' });
    }

    console.log(`🔍 Vérification statut: ${paymentIntentId}`);

    // Récupérer le PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Calculer les informations d'expiration
    const createdAt = new Date(paymentIntent.created * 1000);
    const expirationDays = parseInt(paymentIntent.metadata.authorization_expires_days || '7');
    const expiresAt = new Date(createdAt.getTime() + (expirationDays * 24 * 60 * 60 * 1000));
    const now = new Date();
    const isExpired = expiresAt < now;
    const hoursUntilExpiry = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));

    // Déterminer les actions possibles
    const canCapture = paymentIntent.status === 'requires_capture' && !isExpired;
    const canCancel = ['requires_payment_method', 'requires_confirmation', 'requires_action', 'requires_capture'].includes(paymentIntent.status) && !isExpired;

    const response = {
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      created_at: createdAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      is_expired: isExpired,
      hours_until_expiry: hoursUntilExpiry,
      can_capture: canCapture,
      can_cancel: canCancel,
      metadata: paymentIntent.metadata,
      capture_method: paymentIntent.capture_method
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Erreur vérification statut:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(404).json({
        error: 'PaymentIntent introuvable'
      });
    }
    
    res.status(500).json({
      error: 'Erreur lors de la vérification du statut',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

/**
 * GET /api/payments/expired-authorizations
 * Récupérer les autorisations expirées (pour tâche cron)
 */
router.get('/expired-authorizations', authenticateUser, async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    console.log('🕐 Recherche autorisations expirées...');

    // Rechercher les PaymentIntents avec capture manuelle anciens
    const cutoffDate = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60); // 7 jours

    const paymentIntents = await stripe.paymentIntents.list({
      limit: parseInt(limit),
      created: { lt: cutoffDate },
      expand: ['data.charges']
    });

    // Filtrer les autorisations expirées qui nécessitent encore une capture
    const expiredAuthorizations = paymentIntents.data.filter(pi => {
      return pi.capture_method === 'manual' && 
             pi.status === 'requires_capture' &&
             pi.metadata.type === 'authorization';
    });

    const result = expiredAuthorizations.map(pi => ({
      payment_intent_id: pi.id,
      order_id: pi.metadata.order_id,
      amount: pi.amount / 100,
      created_at: new Date(pi.created * 1000).toISOString(),
      days_expired: Math.floor((Date.now() - (pi.created * 1000)) / (1000 * 60 * 60 * 24))
    }));

    console.log(`🔍 ${result.length} autorisations expirées trouvées`);

    res.json({
      expired_authorizations: result,
      total_found: result.length,
      search_date: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur recherche autorisations expirées:', error);
    
    res.status(500).json({
      error: 'Erreur lors de la recherche',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

/**
 * POST /api/payments/webhook
 * Webhook Stripe pour gérer les événements de paiement
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Vérifier la signature du webhook
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Erreur signature webhook:', err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  console.log(`📥 Webhook reçu: ${event.type}`);

  try {
    // Gérer les différents types d'événements
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
        
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object);
        break;
        
      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(event.data.object);
        break;
        
      default:
        console.log(`ℹ️ Type d'événement non géré: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('❌ Erreur traitement webhook:', error);
    res.status(500).json({ error: 'Erreur traitement webhook' });
  }
});

// Fonctions de gestion des événements webhook
async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log(`✅ Paiement réussi: ${paymentIntent.id}`);
  
  // Mettre à jour votre base de données
  // await updateOrderPaymentStatus(paymentIntent.metadata.order_id, 'captured');
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log(`❌ Paiement échoué: ${paymentIntent.id}`);
  
  // Mettre à jour votre base de données
  // await updateOrderPaymentStatus(paymentIntent.metadata.order_id, 'failed');
}

async function handlePaymentIntentCanceled(paymentIntent) {
  console.log(`🚫 Paiement annulé: ${paymentIntent.id}`);
  
  // Mettre à jour votre base de données
  // await updateOrderPaymentStatus(paymentIntent.metadata.order_id, 'canceled');
}

async function handlePaymentIntentRequiresAction(paymentIntent) {
  console.log(`⚠️ Action requise: ${paymentIntent.id}`);
  
  // Envoyer notification à l'utilisateur si nécessaire
}

module.exports = router;
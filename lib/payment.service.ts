// lib/payment.service.ts
// Service pour l'API Fourmiz backend - VERSION AVEC PRÉ-AUTORISATION

// Configuration de l'API - URL CORRIGÉE
const API_BASE_URL = 'https://fourmiz-backend-exkhszz7t-fourmiz.vercel.app';

// Types et interfaces
export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
  capture_method?: 'automatic' | 'manual';
}

export interface CreatePaymentParams {
  orderId: number;
  amount: number;
  description: string;
  userId?: string;
  metadata?: Record<string, string>;
}

// 🆕 NOUVEAU : Paramètres pour pré-autorisation
export interface CreateAuthorizationParams extends CreatePaymentParams {
  capture_method: 'manual'; // Force la pré-autorisation
  authorization_expires_days?: number; // Durée de validité (défaut: 7 jours)
}

export interface PaymentEligibility {
  canPay: boolean;
  reason?: string;
}

// 🆕 NOUVEAU : Résultat de capture
export interface CaptureResult {
  success: boolean;
  payment_intent_id: string;
  captured_amount: number;
  captured_at: string;
  error?: string;
}

// 🆕 NOUVEAU : Résultat d'annulation
export interface CancelResult {
  success: boolean;
  payment_intent_id: string;
  canceled_amount: number;
  canceled_at: string;
  reason: string;
  error?: string;
}

// Service principal
export class PaymentService {
  
  // ⚠️ DÉPRÉCIÉ : Utiliser createPaymentAuthorization à la place
  static async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent | null> {
    console.log('⚠️ createPaymentIntent déprécié - Utiliser createPaymentAuthorization');
    return this.createPaymentAuthorization({
      ...params,
      capture_method: 'manual' // Force pré-autorisation par défaut
    });
  }

  // 🆕 NOUVEAU : Créer une pré-autorisation de paiement
  static async createPaymentAuthorization(params: CreateAuthorizationParams): Promise<PaymentIntent | null> {
    try {
      console.log('🔒 PaymentService.createPaymentAuthorization - Params:', params);
      
      const response = await fetch(`${API_BASE_URL}/api/payments/create-authorization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount,
          description: params.description,
          orderId: params.orderId,
          userId: params.userId || 'test-user',
          capture_method: 'manual', // 🔑 Pré-autorisation
          authorization_expires_days: params.authorization_expires_days || 7,
          metadata: {
            type: 'authorization',
            order_id: params.orderId.toString(),
            ...params.metadata
          }
        })
      });

      console.log('🔒 Authorization response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Authorization API Error:', errorData);
        throw new Error(`Authorization API Error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      console.log('✅ PaymentIntent Authorization créé:', data);
      
      return {
        id: data.id,
        client_secret: data.client_secret,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        capture_method: 'manual'
      };

    } catch (error) {
      console.error('❌ PaymentService.createPaymentAuthorization error:', error);
      return null;
    }
  }

  // 🆕 NOUVEAU : Capturer une pré-autorisation (quand Fourmiz accepte)
  static async captureAuthorizedPayment(
    paymentIntentId: string,
    orderId: number,
    fourmizId: number,
    captureAmount?: number
  ): Promise<CaptureResult> {
    try {
      console.log('💰 PaymentService.captureAuthorizedPayment:', {
        paymentIntentId,
        orderId,
        fourmizId,
        captureAmount
      });

      const response = await fetch(`${API_BASE_URL}/api/payments/capture-authorization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          order_id: orderId,
          fourmiz_id: fourmizId,
          amount_to_capture: captureAmount, // Optionnel : capturer un montant partiel
          metadata: {
            captured_by: 'fourmiz_assignment',
            fourmiz_id: fourmizId.toString(),
            order_id: orderId.toString()
          }
        })
      });

      console.log('💰 Capture response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Capture API Error:', errorData);
        
        return {
          success: false,
          payment_intent_id: paymentIntentId,
          captured_amount: 0,
          captured_at: new Date().toISOString(),
          error: `Capture failed: ${response.status} - ${errorData}`
        };
      }

      const data = await response.json();
      console.log('✅ Paiement capturé avec succès:', data);
      
      return {
        success: true,
        payment_intent_id: paymentIntentId,
        captured_amount: data.amount_captured || data.amount,
        captured_at: data.captured_at || new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ PaymentService.captureAuthorizedPayment error:', error);
      
      return {
        success: false,
        payment_intent_id: paymentIntentId,
        captured_amount: 0,
        captured_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown capture error'
      };
    }
  }

  // 🆕 NOUVEAU : Annuler une pré-autorisation
  static async cancelAuthorization(
    paymentIntentId: string,
    orderId: number,
    reason: string,
    canceledBy: 'user' | 'system' | 'admin' = 'system'
  ): Promise<CancelResult> {
    try {
      console.log('❌ PaymentService.cancelAuthorization:', {
        paymentIntentId,
        orderId,
        reason,
        canceledBy
      });

      const response = await fetch(`${API_BASE_URL}/api/payments/cancel-authorization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          order_id: orderId,
          cancellation_reason: reason,
          canceled_by: canceledBy,
          metadata: {
            canceled_at: new Date().toISOString(),
            order_id: orderId.toString()
          }
        })
      });

      console.log('❌ Cancel response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Cancel API Error:', errorData);
        
        return {
          success: false,
          payment_intent_id: paymentIntentId,
          canceled_amount: 0,
          canceled_at: new Date().toISOString(),
          reason,
          error: `Cancel failed: ${response.status} - ${errorData}`
        };
      }

      const data = await response.json();
      console.log('✅ Autorisation annulée avec succès:', data);
      
      return {
        success: true,
        payment_intent_id: paymentIntentId,
        canceled_amount: data.amount_canceled || data.amount,
        canceled_at: data.canceled_at || new Date().toISOString(),
        reason
      };

    } catch (error) {
      console.error('❌ PaymentService.cancelAuthorization error:', error);
      
      return {
        success: false,
        payment_intent_id: paymentIntentId,
        canceled_amount: 0,
        canceled_at: new Date().toISOString(),
        reason,
        error: error instanceof Error ? error.message : 'Unknown cancel error'
      };
    }
  }

  // 🔄 MODIFIÉ : Confirmer un paiement (maintenant pour les autorisations)
  static async confirmPayment(
    paymentIntentId: string,
    orderId: number,
    paymentMethodId?: string
  ): Promise<boolean> {
    try {
      console.log('🔥 PaymentService.confirmPayment (authorization):', {
        paymentIntentId,
        orderId,
        paymentMethodId
      });

      const response = await fetch(`${API_BASE_URL}/api/payments/confirm-authorization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          orderId,
          paymentMethodId,
          confirmation_type: 'authorization' // Indique que c'est une autorisation
        })
      });

      console.log('🔥 Confirm authorization response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Confirm Authorization API Error:', errorData);
        throw new Error(`Confirm Authorization API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Autorisation confirmée:', data);
      
      return data.success || true;

    } catch (error) {
      console.error('❌ PaymentService.confirmPayment (authorization) error:', error);
      return false;
    }
  }

  // 🆕 NOUVEAU : Vérifier le statut d'une autorisation
  static async checkAuthorizationStatus(paymentIntentId: string): Promise<{
    status: 'requires_authorization' | 'authorized' | 'captured' | 'canceled' | 'expired';
    amount: number;
    expires_at?: string;
    can_capture: boolean;
  } | null> {
    try {
      console.log('🔍 PaymentService.checkAuthorizationStatus:', paymentIntentId);

      const response = await fetch(`${API_BASE_URL}/api/payments/authorization-status/${paymentIntentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error('❌ Status check failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('✅ Authorization status:', data);
      
      return {
        status: data.status,
        amount: data.amount,
        expires_at: data.expires_at,
        can_capture: data.can_capture || data.status === 'authorized'
      };

    } catch (error) {
      console.error('❌ PaymentService.checkAuthorizationStatus error:', error);
      return null;
    }
  }

  // 🔄 CONSERVÉ : Validation d'éligibilité
  static async validatePaymentEligibility(orderId: number): Promise<PaymentEligibility> {
    console.log('⚠️ validatePaymentEligibility - Skip validation pour nouvelle commande');
    
    // Pour les nouvelles commandes (orderId = 0), toujours autoriser
    if (orderId === 0) {
      return {
        canPay: true
      };
    }

    // Pour les commandes existantes, autoriser par défaut
    return {
      canPay: true
    };
  }

  // 🆕 NOUVEAU : Obtenir les autorisations expirées (pour tâche cron)
  static async getExpiredAuthorizations(): Promise<Array<{
    payment_intent_id: string;
    order_id: number;
    amount: number;
    expires_at: string;
  }>> {
    try {
      console.log('⏰ PaymentService.getExpiredAuthorizations');

      const response = await fetch(`${API_BASE_URL}/api/payments/expired-authorizations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error('❌ Failed to get expired authorizations:', response.status);
        return [];
      }

      const data = await response.json();
      console.log(`✅ Found ${data.length} expired authorizations`);
      
      return data.expired_authorizations || [];

    } catch (error) {
      console.error('❌ PaymentService.getExpiredAuthorizations error:', error);
      return [];
    }
  }
}

// 🔄 CONSERVÉ : Fonctions utilitaires
export const formatAmount = (amount: number, currency = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const validateAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 10000;
};

// 🆕 NOUVEAU : Utilitaires pour les autorisations
export const formatAuthorizationExpiry = (expiresAt: string): string => {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Expirée';
  if (diffDays === 0) return 'Expire aujourd\'hui';
  if (diffDays === 1) return 'Expire demain';
  return `Expire dans ${diffDays} jours`;
};

export const isAuthorizationExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

export const getAuthorizationTimeRemaining = (expiresAt: string): number => {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  return Math.max(0, expiryDate.getTime() - now.getTime());
};

export default PaymentService;
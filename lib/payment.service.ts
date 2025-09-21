// lib/payment.service.ts
// Service pour l'API Fourmiz backend - CORRIGÉ pour endpoints REST

// Configuration de l'API
const API_BASE_URL = 'https://fourmiz-backend-25bjybh9r-fourmiz.vercel.app';

// Types et interfaces
export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface CreatePaymentParams {
  orderId: number;
  amount: number;
  description: string;
  userId?: string;
}

export interface PaymentEligibility {
  canPay: boolean;
  reason?: string;
}

// Service principal
export class PaymentService {
  
  // Créer un Payment Intent via l'API Fourmiz
  static async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent | null> {
    try {
      console.log('🔥 PaymentService.createPaymentIntent - Params:', params);
      
      const response = await fetch(`${API_BASE_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount,
          description: params.description,
          orderId: params.orderId,
          userId: params.userId || 'test-user'
        })
      });

      console.log('🔥 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ API Error Response:', errorData);
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      console.log('✅ PaymentIntent créé:', data);
      
      return {
        id: data.id,
        client_secret: data.client_secret,
        amount: data.amount,
        currency: data.currency,
        status: data.status
      };

    } catch (error) {
      console.error('❌ PaymentService.createPaymentIntent error:', error);
      return null;
    }
  }

  // Confirmer un paiement via l'API Fourmiz
  static async confirmPayment(
    paymentIntentId: string,
    orderId: number,
    paymentMethodId?: string
  ): Promise<boolean> {
    try {
      console.log('🔥 PaymentService.confirmPayment:', {
        paymentIntentId,
        orderId,
        paymentMethodId
      });

      const response = await fetch(`${API_BASE_URL}/api/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          orderId,
          paymentMethodId
        })
      });

      console.log('🔥 Confirm response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Confirm API Error:', errorData);
        throw new Error(`Confirm API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Paiement confirmé:', data);
      
      return data.success || true;

    } catch (error) {
      console.error('❌ PaymentService.confirmPayment error:', error);
      return false;
    }
  }

  // Validation d'éligibilité simplifiée (puisque l'endpoint n'existe pas)
  static async validatePaymentEligibility(orderId: number): Promise<PaymentEligibility> {
    console.log('⚠️ validatePaymentEligibility - Skip validation pour nouvelle commande');
    
    // Pour les nouvelles commandes (orderId = 0), toujours autoriser
    if (orderId === 0) {
      return {
        canPay: true
      };
    }

    // Pour les commandes existantes, autoriser par défaut
    // Dans un vrai cas, vous devriez vérifier via Supabase
    return {
      canPay: true
    };
  }
}

// Fonctions utilitaires
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

export default PaymentService;
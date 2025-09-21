// lib/wallet-integration.service.ts
// Service principal pour toutes les opérations wallet
// Compatible avec la structure Supabase existante

import { supabase } from './supabase';

export interface WalletBalance {
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  referralEarnings: number;
  serviceEarnings: number;
  orderEarnings: number;
}

export interface WalletTransaction {
  id: string;
  type: 'referral_bonus' | 'service_payment' | 'order_payment' | 'withdrawal' | 'commission' | 'manual';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  source?: string;
  created_at: string;
  reference?: string;
}

export interface CreateWalletOrderData {
  service_id: number;
  fourmiz_id: string;
  description: string;
  proposed_amount: number;
  urgency_surcharge?: number;
}

export class WalletIntegrationService {
  
  /**
   * Calculer le solde wallet complet d'un utilisateur
   */
  static async calculateWalletBalance(userId: string): Promise<WalletBalance> {
    try {
      // Récupérer tous les crédits de l'utilisateur
      const { data: credits, error } = await supabase
        .from('user_credits')
        .select('amount, type, status')
        .eq('user_id', userId);

      if (error) {
        console.error('Erreur récupération crédits:', error);
        return this.getEmptyBalance();
      }

      if (!credits || credits.length === 0) {
        return this.getEmptyBalance();
      }

      // Calculer les différents types de soldes
      const completedCredits = credits.filter(c => c.status === 'completed' || !c.status);
      const pendingCredits = credits.filter(c => c.status === 'pending');

      const availableBalance = completedCredits.reduce((sum, credit) => sum + parseFloat(credit.amount), 0);
      const pendingBalance = pendingCredits.reduce((sum, credit) => sum + parseFloat(credit.amount), 0);

      // Séparer par type pour les statistiques
      const referralEarnings = completedCredits
        .filter(c => c.type === 'referral' || c.type === 'referral_bonus')
        .reduce((sum, credit) => sum + Math.max(0, parseFloat(credit.amount)), 0);

      const serviceEarnings = completedCredits
        .filter(c => c.type === 'service_payment' || c.type === 'commission')
        .reduce((sum, credit) => sum + Math.max(0, parseFloat(credit.amount)), 0);

      const orderEarnings = completedCredits
        .filter(c => c.type === 'order_payment')
        .reduce((sum, credit) => sum + Math.max(0, parseFloat(credit.amount)), 0);

      const totalEarned = completedCredits
        .reduce((sum, credit) => sum + Math.max(0, parseFloat(credit.amount)), 0);

      const totalWithdrawn = Math.abs(completedCredits
        .filter(c => c.type === 'withdrawal')
        .reduce((sum, credit) => sum + Math.min(0, parseFloat(credit.amount)), 0));

      return {
        availableBalance: Math.round(availableBalance * 100) / 100,
        pendingBalance: Math.round(pendingBalance * 100) / 100,
        totalEarned: Math.round(totalEarned * 100) / 100,
        totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
        referralEarnings: Math.round(referralEarnings * 100) / 100,
        serviceEarnings: Math.round(serviceEarnings * 100) / 100,
        orderEarnings: Math.round(orderEarnings * 100) / 100,
      };

    } catch (error) {
      console.error('Erreur calcul solde wallet:', error);
      return this.getEmptyBalance();
    }
  }

  /**
   * Créditer automatiquement le wallet d'un fourmiz après validation
   */
  static async creditFourmizAfterValidation(
    fourmizId: string,
    amount: number,
    orderId: string,
    description?: string
  ): Promise<boolean> {
    try {
      console.log('Crédit wallet fourmiz:', { fourmizId, amount, orderId });

      // Vérifier que la commande est bien validée
      const { data: order } = await supabase
        .from('orders')
        .select('client_validated_at, fourmiz_validated_at')
        .eq('id', orderId)
        .single();

      if (!order?.client_validated_at || !order?.fourmiz_validated_at) {
        throw new Error('Commande non validée par les deux parties');
      }

      // Créer le crédit
      const { error } = await supabase
        .from('user_credits')
        .insert({
          user_id: fourmizId,
          amount: amount,
          type: 'service_payment',
          source: `order_${orderId}`,
          description: description || `Paiement commande #${orderId}`,
          status: 'completed',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erreur création crédit:', error);
        return false;
      }

      console.log('Crédit wallet créé avec succès');
      return true;

    } catch (error) {
      console.error('Erreur crédit wallet fourmiz:', error);
      return false;
    }
  }

  /**
   * Créer une commande payée avec wallet
   */
  static async createWalletOrder(
    clientId: string,
    orderData: CreateWalletOrderData
  ): Promise<any> {
    try {
      const totalAmount = orderData.proposed_amount + (orderData.urgency_surcharge || 0);

      // Vérifier le solde
      const balance = await this.calculateWalletBalance(clientId);
      if (balance.availableBalance < totalAmount) {
        throw new Error(`Solde insuffisant. Disponible: ${balance.availableBalance}€, Requis: ${totalAmount}€`);
      }

      // Créer la commande
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: clientId,
          fourmiz_id: orderData.fourmiz_id,
          service_id: orderData.service_id,
          description: orderData.description,
          proposed_amount: orderData.proposed_amount,
          urgency_surcharge: orderData.urgency_surcharge || 0,
          total_amount: totalAmount,
          payment_method: 'wallet',
          status: 'paid_with_wallet',
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) {
        throw new Error('Erreur création commande: ' + orderError.message);
      }

      // Débiter le wallet
      const { error: creditError } = await supabase
        .from('user_credits')
        .insert({
          user_id: clientId,
          amount: -totalAmount,
          type: 'order_payment',
          source: `order_${order.id}`,
          description: `Commande #${order.id} - ${orderData.description}`,
          status: 'completed',
          created_at: new Date().toISOString()
        });

      if (creditError) {
        throw new Error('Erreur débit wallet: ' + creditError.message);
      }

      return order;

    } catch (error) {
      console.error('Erreur création commande wallet:', error);
      throw error;
    }
  }

  /**
   * Créer une demande de paiement
   */
  static async requestPayout(
    userId: string,
    amount: number,
    method: 'paypal' | 'gift_card' | 'voucher',
    details: string
  ): Promise<boolean> {
    try {
      // Vérifier le solde
      const balance = await this.calculateWalletBalance(userId);
      if (balance.availableBalance < amount) {
        throw new Error('Solde insuffisant');
      }

      if (amount < 20) {
        throw new Error('Montant minimum: 20€');
      }

      // Créer la demande
      const { error } = await supabase
        .from('payout_requests')
        .insert({
          user_id: userId,
          amount: amount,
          payout_method: method,
          payout_details: {
            [method]: details
          },
          status: 'pending',
          requested_at: new Date().toISOString()
        });

      if (error) {
        throw new Error('Erreur création demande: ' + error.message);
      }

      return true;

    } catch (error) {
      console.error('Erreur demande paiement:', error);
      throw error;
    }
  }

  /**
   * Récupérer l'historique des transactions
   */
  static async getWalletTransactionHistory(
    userId: string, 
    limit: number = 20
  ): Promise<WalletTransaction[]> {
    try {
      const { data: credits, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erreur récupération historique:', error);
        return [];
      }

      return (credits || []).map(credit => ({
        id: credit.id,
        type: credit.type || 'manual',
        amount: parseFloat(credit.amount),
        description: credit.description || 'Transaction',
        status: credit.status || 'completed',
        source: credit.source,
        created_at: credit.created_at,
        reference: credit.source
      }));

    } catch (error) {
      console.error('Erreur historique transactions:', error);
      return [];
    }
  }

  /**
   * Vérifier si un utilisateur peut utiliser le wallet pour un montant donné
   */
  static async canUseWalletForAmount(userId: string, amount: number): Promise<{
    canUse: boolean;
    reason?: string;
    currentBalance?: number;
  }> {
    try {
      const balance = await this.calculateWalletBalance(userId);
      
      if (balance.availableBalance >= amount) {
        return { canUse: true, currentBalance: balance.availableBalance };
      } else {
        return {
          canUse: false,
          reason: `Solde insuffisant. Disponible: ${balance.availableBalance.toFixed(2)}€, Requis: ${amount.toFixed(2)}€`,
          currentBalance: balance.availableBalance
        };
      }
    } catch (error) {
      return {
        canUse: false,
        reason: 'Erreur vérification solde',
        currentBalance: 0
      };
    }
  }

  /**
   * Solde vide par défaut
   */
  private static getEmptyBalance(): WalletBalance {
    return {
      availableBalance: 0,
      pendingBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      referralEarnings: 0,
      serviceEarnings: 0,
      orderEarnings: 0,
    };
  }
}
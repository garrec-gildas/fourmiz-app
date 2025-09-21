// lib/wallet-role-bridge.ts
// Bridge entre système wallet et gestion des rôles
// Gère la logique métier entre les capacités wallet et les rôles utilisateur

import { supabase } from './supabase';
import { WalletIntegrationService } from './wallet-integration.service';

export interface WalletCapabilities {
  canReceiveInWallet: boolean;
  canUseWalletAsClient: boolean;
  needsClientRoleForWallet: boolean;
  needsFourmizRoleForEarnings: boolean;
}

export interface ContextualMessage {
  earnMessage: string;
  spendMessage: string;
  actionAdvice: string;
}

export class WalletRoleBridge {

  /**
   * Analyser les capacités wallet selon les rôles de l'utilisateur
   */
  static async analyzeWalletCapabilities(userId: string): Promise<WalletCapabilities> {
    try {
      // Récupérer le profil utilisateur avec rôles
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles, profile_completed')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        return {
          canReceiveInWallet: false,
          canUseWalletAsClient: false,
          needsClientRoleForWallet: true,
          needsFourmizRoleForEarnings: true
        };
      }

      const roles = profile.roles || [];
      const hasClientRole = roles.includes('client');
      const hasFourmizRole = roles.includes('fourmiz');
      const isProfileComplete = profile.profile_completed;

      return {
        // Peut recevoir dans wallet = rôle fourmiz + profil complet
        canReceiveInWallet: hasFourmizRole && isProfileComplete,
        
        // Peut utiliser wallet comme client = rôle client + profil complet
        canUseWalletAsClient: hasClientRole && isProfileComplete,
        
        // Besoin d'ajouter rôle client = fourmiz sans rôle client + has balance
        needsClientRoleForWallet: hasFourmizRole && !hasClientRole,
        
        // Besoin d'ajouter rôle fourmiz = client sans rôle fourmiz
        needsFourmizRoleForEarnings: hasClientRole && !hasFourmizRole
      };

    } catch (error) {
      console.error('Erreur analyse capacités wallet:', error);
      return {
        canReceiveInWallet: false,
        canUseWalletAsClient: false,
        needsClientRoleForWallet: false,
        needsFourmizRoleForEarnings: false
      };
    }
  }

  /**
   * Activer le rôle Client pour permettre l'usage wallet
   */
  static async enableClientRoleForWallet(userId: string): Promise<{
    success: boolean;
    message: string;
    redirectRoute?: string;
  }> {
    try {
      // Récupérer le profil actuel
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles, profile_completed, firstname, lastname, email, phone')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        return {
          success: false,
          message: 'Profil introuvable'
        };
      }

      // Vérifier que le profil est suffisamment complet
      if (!profile.firstname || !profile.lastname || !profile.email) {
        return {
          success: false,
          message: 'Complétez votre profil pour devenir Client',
          redirectRoute: '/auth/complete-profile'
        };
      }

      const currentRoles = profile.roles || [];
      
      // Vérifier que l'utilisateur n'a pas déjà le rôle client
      if (currentRoles.includes('client')) {
        return {
          success: true,
          message: 'Vous avez déjà le rôle Client'
        };
      }

      // Ajouter le rôle client
      const updatedRoles = [...currentRoles, 'client'];

      const { error } = await supabase
        .from('profiles')
        .update({
          roles: updatedRoles,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw new Error('Erreur mise à jour rôles: ' + error.message);
      }

      return {
        success: true,
        message: 'Rôle Client ajouté avec succès ! Vous pouvez maintenant utiliser votre wallet pour commander des services.'
      };

    } catch (error) {
      console.error('Erreur activation rôle client:', error);
      return {
        success: false,
        message: 'Erreur technique lors de l\'ajout du rôle Client'
      };
    }
  }

  /**
   * Créditer le wallet avec vérification de rôle
   */
  static async creditWalletWithRoleCheck(
    userId: string,
    amount: number,
    source: string,
    description: string
  ): Promise<boolean> {
    try {
      const capabilities = await this.analyzeWalletCapabilities(userId);
      
      if (!capabilities.canReceiveInWallet) {
        console.warn('Utilisateur ne peut pas recevoir dans wallet:', userId);
        return false;
      }

      // Utiliser le service d'intégration pour le crédit
      const { error } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          amount: amount,
          type: 'service_payment',
          source: source,
          description: description,
          status: 'completed',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erreur crédit wallet avec rôle:', error);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Erreur crédit wallet avec vérification rôle:', error);
      return false;
    }
  }

  /**
   * Vérifier si l'utilisateur peut utiliser le wallet pour un montant donné
   */
  static async canUseWalletForAmount(
    userId: string, 
    amount: number
  ): Promise<{
    canUse: boolean;
    reason: string;
  }> {
    try {
      const capabilities = await this.analyzeWalletCapabilities(userId);
      
      if (!capabilities.canUseWalletAsClient) {
        if (capabilities.needsClientRoleForWallet) {
          return {
            canUse: false,
            reason: 'Ajoutez le rôle Client pour utiliser votre wallet'
          };
        } else {
          return {
            canUse: false,
            reason: 'Profil incomplet pour utiliser le wallet'
          };
        }
      }

      // Vérifier le solde
      const balanceCheck = await WalletIntegrationService.canUseWalletForAmount(userId, amount);
      return balanceCheck;

    } catch (error) {
      return {
        canUse: false,
        reason: 'Erreur vérification wallet'
      };
    }
  }

  /**
   * Générer des messages contextuels selon les rôles
   */
  static async getContextualMessage(userId: string): Promise<ContextualMessage> {
    try {
      const capabilities = await this.analyzeWalletCapabilities(userId);
      const balance = await WalletIntegrationService.calculateWalletBalance(userId);

      let earnMessage = 'Aucun gain pour le moment';
      let spendMessage = 'Impossible de dépenser';
      let actionAdvice = 'Complétez votre profil pour utiliser le wallet';

      // Messages pour les gains
      if (capabilities.canReceiveInWallet) {
        earnMessage = 'Gagnez des crédits en terminant des prestations Fourmiz';
      } else if (capabilities.needsFourmizRoleForEarnings) {
        earnMessage = 'Devenez Fourmiz pour gagner des crédits sur les prestations';
      }

      // Messages pour les dépenses
      if (capabilities.canUseWalletAsClient) {
        if (balance.availableBalance > 0) {
          spendMessage = `Utilisez vos ${balance.availableBalance.toFixed(2)}€ pour commander des services`;
        } else {
          spendMessage = 'Pas de crédit disponible pour commander des services';
        }
      } else if (capabilities.needsClientRoleForWallet) {
        spendMessage = 'Ajoutez le rôle Client pour dépenser vos crédits';
      }

      // Conseil d'action principal
      if (capabilities.canReceiveInWallet && capabilities.canUseWalletAsClient) {
        actionAdvice = 'Gagnez et dépensez vos crédits librement';
      } else if (capabilities.canReceiveInWallet) {
        actionAdvice = 'Ajoutez le rôle Client pour utiliser vos gains';
      } else if (capabilities.canUseWalletAsClient) {
        actionAdvice = 'Devenez Fourmiz pour gagner des crédits';
      } else if (capabilities.needsClientRoleForWallet) {
        actionAdvice = 'Ajoutez le rôle Client pour utiliser votre wallet';
      }

      return {
        earnMessage,
        spendMessage,
        actionAdvice
      };

    } catch (error) {
      console.error('Erreur génération messages contextuels:', error);
      return {
        earnMessage: 'Erreur de chargement',
        spendMessage: 'Erreur de chargement', 
        actionAdvice: 'Veuillez réessayer'
      };
    }
  }

  /**
   * Obtenir les statistiques wallet contextuelles selon le rôle
   */
  static async getContextualWalletStats(userId: string): Promise<any> {
    try {
      const capabilities = await this.analyzeWalletCapabilities(userId);
      const balance = await WalletIntegrationService.calculateWalletBalance(userId);
      
      return {
        balance,
        capabilities,
        canRequestPayout: capabilities.canReceiveInWallet && balance.availableBalance >= 20,
        canOrderServices: capabilities.canUseWalletAsClient && balance.availableBalance > 0,
        needsUpgrade: capabilities.needsClientRoleForWallet || capabilities.needsFourmizRoleForEarnings
      };

    } catch (error) {
      console.error('Erreur stats wallet contextuelles:', error);
      return null;
    }
  }

  /**
   * Créer une commande wallet avec vérifications de rôles
   */
  static async createWalletOrderWithRoleCheck(
    clientId: string,
    orderData: any
  ): Promise<any> {
    try {
      const capabilities = await this.analyzeWalletCapabilities(clientId);
      
      if (!capabilities.canUseWalletAsClient) {
        throw new Error('Rôle Client requis pour commander avec le wallet');
      }

      return await WalletIntegrationService.createWalletOrder(clientId, orderData);

    } catch (error) {
      console.error('Erreur commande wallet avec rôles:', error);
      throw error;
    }
  }
}
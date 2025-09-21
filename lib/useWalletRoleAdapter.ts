// lib/useWalletRoleAdapter.ts
// Hook unifié qui étend useRoleManagerAdapter avec les fonctionnalités wallet
// Compatible avec l'architecture existante

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useRoleManagerAdapter } from './useRoleManagerAdapter';
import { WalletIntegrationService, WalletBalance, CreateWalletOrderData } from './wallet-integration.service';
import { WalletRoleBridge, WalletCapabilities, ContextualMessage } from './wallet-role-bridge';

export interface UseWalletRoleAdapterReturn {
  // États rôles (héritées de useRoleManagerAdapter)
  currentRole: string;
  userProfile: any;
  loading: boolean;
  canSwitchRole: boolean;
  switchingRole: boolean;
  hasClientRole: boolean;
  hasFourmizRole: boolean;
  switchRole: (targetRole: string) => Promise<any>;
  
  // États wallet (nouveaux)
  walletBalance: WalletBalance;
  walletLoading: boolean;
  walletError: string | null;
  
  // Capacités wallet selon rôles
  canUseWalletAsClient: boolean;
  canReceiveInWallet: boolean;
  needsClientRoleForWallet: boolean;
  needsFourmizRoleForEarnings: boolean;
  
  // Actions wallet
  enableClientRoleForWallet: () => Promise<void>;
  requestPayout: (amount: number, method: 'paypal' | 'gift_card' | 'voucher', details: string) => Promise<boolean>;
  createWalletOrder: (orderData: CreateWalletOrderData) => Promise<any>;
  canUseWalletForAmount: (amount: number) => { canUse: boolean; reason: string };
  refreshWallet: () => Promise<void>;
  
  // Messages contextuels
  getContextualMessage: () => ContextualMessage;
}

export function useWalletRoleAdapter(initialProfile: any = null): UseWalletRoleAdapterReturn {
  // Hook de base pour la gestion des rôles
  const roleAdapter = useRoleManagerAdapter(initialProfile);
  
  // États wallet spécifiques
  const [walletBalance, setWalletBalance] = useState<WalletBalance>({
    availableBalance: 0,
    pendingBalance: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    referralEarnings: 0,
    serviceEarnings: 0,
    orderEarnings: 0,
  });
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  
  // États capacités wallet
  const [walletCapabilities, setWalletCapabilities] = useState<WalletCapabilities>({
    canReceiveInWallet: false,
    canUseWalletAsClient: false,
    needsClientRoleForWallet: false,
    needsFourmizRoleForEarnings: false,
  });
  
  // Messages contextuels
  const [contextualMessage, setContextualMessage] = useState<ContextualMessage>({
    earnMessage: 'Chargement...',
    spendMessage: 'Chargement...',
    actionAdvice: 'Chargement...',
  });

  // Calculer les rôles depuis le profil
  const { hasClientRole, hasFourmizRole } = useMemo(() => {
    const profile = roleAdapter.userProfile || initialProfile;
    if (!profile?.roles) {
      return { hasClientRole: false, hasFourmizRole: false };
    }
    
    const roles = Array.isArray(profile.roles) ? profile.roles : [];
    return {
      hasClientRole: roles.includes('client'),
      hasFourmizRole: roles.includes('fourmiz'),
    };
  }, [roleAdapter.userProfile, initialProfile]);

  // Charger les données wallet quand le profil change
  useEffect(() => {
    const profile = roleAdapter.userProfile || initialProfile;
    if (profile?.user_id || profile?.id) {
      const userId = profile.user_id || profile.id;
      loadWalletData(userId);
    }
  }, [roleAdapter.userProfile?.user_id, roleAdapter.userProfile?.id, initialProfile?.user_id, initialProfile?.id]);

  /**
   * Charger toutes les données wallet et capacités
   */
  const loadWalletData = useCallback(async (userId: string) => {
    if (!userId) return;
    
    try {
      setWalletLoading(true);
      setWalletError(null);

      // Charger solde, capacités et messages en parallèle
      const [balance, capabilities, message] = await Promise.all([
        WalletIntegrationService.calculateWalletBalance(userId),
        WalletRoleBridge.analyzeWalletCapabilities(userId),
        WalletRoleBridge.getContextualMessage(userId),
      ]);

      setWalletBalance(balance);
      setWalletCapabilities(capabilities);
      setContextualMessage(message);

    } catch (error) {
      console.error('Erreur chargement données wallet:', error);
      setWalletError('Impossible de charger les données du portefeuille');
    } finally {
      setWalletLoading(false);
    }
  }, []);

  /**
   * Rafraîchir les données wallet
   */
  const refreshWallet = useCallback(async () => {
    const profile = roleAdapter.userProfile || initialProfile;
    const userId = profile?.user_id || profile?.id;
    if (userId) {
      await loadWalletData(userId);
    }
  }, [roleAdapter.userProfile, initialProfile, loadWalletData]);

  /**
   * Activer le rôle Client pour utiliser le wallet
   */
  const enableClientRoleForWallet = useCallback(async () => {
    const profile = roleAdapter.userProfile || initialProfile;
    const userId = profile?.user_id || profile?.id;
    
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non identifié');
      return;
    }

    try {
      const result = await WalletRoleBridge.enableClientRoleForWallet(userId);
      
      if (result.success) {
        Alert.alert('Rôle ajouté', result.message);
        // Recharger les données après changement de rôle
        await refreshWallet();
      } else {
        Alert.alert('Erreur', result.message);
        
        // Rediriger si nécessaire
        if (result.redirectRoute) {
          // router.push(result.redirectRoute);
        }
      }
    } catch (error) {
      console.error('Erreur activation rôle client:', error);
      Alert.alert('Erreur', 'Impossible d\'activer le rôle Client');
    }
  }, [roleAdapter.userProfile, initialProfile, refreshWallet]);

  /**
   * Demander un paiement
   */
  const requestPayout = useCallback(async (
    amount: number,
    method: 'paypal' | 'gift_card' | 'voucher',
    details: string
  ): Promise<boolean> => {
    const profile = roleAdapter.userProfile || initialProfile;
    const userId = profile?.user_id || profile?.id;
    
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non identifié');
      return false;
    }

    if (!walletCapabilities.canReceiveInWallet) {
      Alert.alert('Erreur', 'Vous devez être Fourmiz pour demander un paiement');
      return false;
    }

    try {
      const success = await WalletIntegrationService.requestPayout(userId, amount, method, details);
      
      if (success) {
        Alert.alert('Demande envoyée', 'Votre demande de paiement sera traitée sous 48h');
        await refreshWallet();
        return true;
      } else {
        Alert.alert('Erreur', 'Impossible de traiter votre demande');
        return false;
      }
    } catch (error) {
      console.error('Erreur demande paiement:', error);
      Alert.alert('Erreur', error.message || 'Impossible de traiter votre demande');
      return false;
    }
  }, [roleAdapter.userProfile, initialProfile, walletCapabilities.canReceiveInWallet, refreshWallet]);

  /**
   * Créer une commande payée avec le wallet
   */
  const createWalletOrder = useCallback(async (orderData: CreateWalletOrderData): Promise<any> => {
    const profile = roleAdapter.userProfile || initialProfile;
    const userId = profile?.user_id || profile?.id;
    
    if (!userId) {
      throw new Error('Utilisateur non identifié');
    }

    if (!walletCapabilities.canUseWalletAsClient) {
      throw new Error('Rôle Client requis pour utiliser le wallet');
    }

    try {
      const order = await WalletRoleBridge.createWalletOrderWithRoleCheck(userId, orderData);
      await refreshWallet(); // Rafraîchir après débit
      return order;
    } catch (error) {
      console.error('Erreur commande wallet:', error);
      throw error;
    }
  }, [roleAdapter.userProfile, initialProfile, walletCapabilities.canUseWalletAsClient, refreshWallet]);

  /**
   * Vérifier si on peut utiliser le wallet pour un montant
   */
  const canUseWalletForAmount = useCallback((amount: number): { canUse: boolean; reason: string } => {
    if (!walletCapabilities.canUseWalletAsClient) {
      if (walletCapabilities.needsClientRoleForWallet) {
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

    if (walletBalance.availableBalance >= amount) {
      return { canUse: true, reason: 'Solde suffisant' };
    } else {
      return {
        canUse: false,
        reason: `Solde insuffisant. Disponible: ${walletBalance.availableBalance.toFixed(2)}€, Requis: ${amount.toFixed(2)}€`
      };
    }
  }, [walletCapabilities, walletBalance.availableBalance]);

  /**
   * Obtenir les messages contextuels
   */
  const getContextualMessage = useCallback((): ContextualMessage => {
    return contextualMessage;
  }, [contextualMessage]);

  return {
    // États rôles (délégués)
    currentRole: roleAdapter.currentRole,
    userProfile: roleAdapter.userProfile,
    loading: roleAdapter.loading || walletLoading,
    canSwitchRole: roleAdapter.canSwitchRole,
    switchingRole: roleAdapter.switchingRole,
    hasClientRole,
    hasFourmizRole,
    switchRole: roleAdapter.switchRole,
    
    // États wallet
    walletBalance,
    walletLoading,
    walletError,
    
    // Capacités wallet
    canUseWalletAsClient: walletCapabilities.canUseWalletAsClient,
    canReceiveInWallet: walletCapabilities.canReceiveInWallet,
    needsClientRoleForWallet: walletCapabilities.needsClientRoleForWallet,
    needsFourmizRoleForEarnings: walletCapabilities.needsFourmizRoleForEarnings,
    
    // Actions wallet
    enableClientRoleForWallet,
    requestPayout,
    createWalletOrder,
    canUseWalletForAmount,
    refreshWallet,
    
    // Messages contextuels
    getContextualMessage,
  };
}
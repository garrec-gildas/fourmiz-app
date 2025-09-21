// app/(tabs)/wallet.tsx - VERSION FINALE COMPATIBLE
// 💰 Utilise les services wallet créés (wallet-integration.service.ts, wallet-role-bridge.ts, useWalletRoleAdapter.ts)
// ✅ Toutes les fonctionnalités préservées
// 🔧 Imports et appels corrigés pour correspondre aux services réels

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useWalletRoleAdapter } from '@/lib/useWalletRoleAdapter';
import { WalletIntegrationService } from '@/lib/wallet-integration.service';

interface Transaction {
  id: string;
  type: 'referral_bonus' | 'service_payment' | 'order_payment' | 'withdrawal' | 'commission' | 'manual';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  reference?: string;
}

export default function WalletScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'paypal' | 'gift_card' | 'voucher'>('paypal');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Hook unifié wallet + rôles
  const {
    // États wallet
    walletBalance,
    walletLoading,
    walletError,
    
    // Capacités selon rôles
    canUseWalletAsClient,
    canReceiveInWallet,
    needsClientRoleForWallet,
    
    // États rôles
    currentRole,
    hasClientRole,
    hasFourmizRole,
    canSwitchRole,
    switchRole,
    
    // Actions wallet
    enableClientRoleForWallet,
    requestPayout,
    refreshWallet,
    
    // Messages contextuels
    getContextualMessage
  } = useWalletRoleAdapter();

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUser(user);
      console.log('💰 Chargement portefeuille pour:', user.id);

      // Charger les transactions
      await loadTransactionHistory(user.id);
      
      // Le solde est géré par useWalletRoleAdapter
      await refreshWallet();

    } catch (error) {
      console.error('❌ Erreur chargement portefeuille:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du portefeuille');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  // Charger l'historique avec le service d'intégration
  const loadTransactionHistory = async (userId: string) => {
    try {
      console.log('📋 Chargement historique...');
      
      const transactionList = await WalletIntegrationService.getWalletTransactionHistory(userId, 20);
      setTransactions(transactionList);
      console.log('✅ Historique chargé:', transactionList.length, 'transactions');

    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
    }
  };

  // Gestion des demandes de paiement
  const handlePayout = () => {
    if (!canReceiveInWallet) {
      Alert.alert(
        'Rôle Fourmiz requis',
        'Vous devez être Fourmiz pour demander un paiement',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Devenir Fourmiz', onPress: () => router.push('/auth/complete-profile-fourmiz') }
        ]
      );
      return;
    }

    if (walletBalance.availableBalance < 20) {
      Alert.alert(
        'Solde insuffisant',
        'Le montant minimum pour une demande de paiement est de 20€.'
      );
      return;
    }

    setShowPayoutModal(true);
  };

  const processPayout = async () => {
    if (!payoutDetails.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir les informations requises');
      return;
    }

    try {
      setPayoutLoading(true);
      
      const success = await requestPayout(
        walletBalance.availableBalance,
        payoutMethod,
        payoutDetails.trim()
      );

      if (success) {
        setShowPayoutModal(false);
        setPayoutDetails('');
        await loadWalletData(); // Recharger les données
      }

    } catch (error) {
      // L'erreur est déjà gérée dans requestPayout
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleOrderServices = () => {
    if (!canUseWalletAsClient) {
      if (needsClientRoleForWallet) {
        // Proposer d'ajouter le rôle Client
        Alert.alert(
          'Utilisez votre wallet',
          'Ajoutez le rôle Client pour commander des services avec vos ' + walletBalance.availableBalance.toFixed(2) + '€',
          [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Devenir Client', onPress: enableClientRoleForWallet }
          ]
        );
        return;
      } else {
        Alert.alert('Profil incomplet', 'Complétez votre profil pour utiliser le wallet');
        return;
      }
    }

    // Naviguer vers la liste des services (route à créer)
    Alert.alert('Fonctionnalité à venir', 'La commande de services avec wallet sera bientôt disponible');
  };

  const getPayoutPlaceholder = (method: string): string => {
    switch (method) {
      case 'paypal': return 'Adresse email PayPal';
      case 'gift_card': return 'Adresse email pour la carte cadeau';
      case 'voucher': return 'Adresse postale pour le bon';
      default: return '';
    }
  };

  const getTransactionIcon = (type: string): string => {
    switch (type) {
      case 'referral_bonus': return 'people-outline';
      case 'service_payment': return 'construct-outline';
      case 'order_payment': return 'cart-outline';
      case 'commission': return 'trending-up-outline';
      case 'withdrawal': return 'arrow-up-outline';
      case 'manual': return 'card-outline';
      default: return 'card-outline';
    }
  };

  // Messages contextuels selon les rôles
  const contextualMessages = getContextualMessage();

  if (walletLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement de votre portefeuille...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={['#000000']}
            tintColor="#000000"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction avec rôle actuel */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>
            Mon Portefeuille {currentRole === 'client' ? '(Client)' : currentRole === 'fourmiz' ? '(Fourmiz)' : ''}
          </Text>
          <Text style={styles.introSubtitle}>
            {contextualMessages.actionAdvice}
          </Text>
        </View>

        {/* Carte de solde principale */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet-outline" size={20} color="#000000" />
            <Text style={styles.balanceLabel}>Solde disponible</Text>
          </View>
          
          <Text style={styles.balanceAmount}>
            {walletBalance.availableBalance.toFixed(2)} €
          </Text>
          
          <View style={styles.balanceDetails}>
            <Text style={styles.balanceSubText}>
              En attente : {walletBalance.pendingBalance.toFixed(2)} €
            </Text>
            <Text style={styles.balanceSubText}>
              Total gagné : {walletBalance.totalEarned.toFixed(2)} €
            </Text>
          </View>
        </View>

        {/* Section d'upgrade Client pour fourmiz */}
        {needsClientRoleForWallet && walletBalance.availableBalance > 0 && (
          <View style={styles.upgradeSection}>
            <View style={styles.upgradeCard}>
              <View style={styles.upgradeHeader}>
                <Ionicons name="rocket-outline" size={20} color="#000000" />
                <Text style={styles.upgradeTitle}>Utilisez votre wallet</Text>
              </View>
              <Text style={styles.upgradeText}>
                Ajoutez le rôle Client pour commander des services avec vos {walletBalance.availableBalance.toFixed(2)}€
              </Text>
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={enableClientRoleForWallet}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add-outline" size={16} color="#ffffff" />
                <Text style={styles.upgradeButtonText}>Devenir Client</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Répartition des gains */}
        <View style={styles.earningsSection}>
          <Text style={styles.sectionTitle}>Répartition des gains</Text>
          <View style={styles.earningsGrid}>
            <View style={styles.earningsCard}>
              <View style={styles.earningsHeader}>
                <Ionicons name="people-outline" size={16} color="#000000" />
                <Text style={styles.earningsLabel}>Parrainage</Text>
              </View>
              <Text style={styles.earningsAmount}>
                {walletBalance.referralEarnings.toFixed(2)} €
              </Text>
            </View>
            
            <View style={styles.earningsCard}>
              <View style={styles.earningsHeader}>
                <Ionicons name="construct-outline" size={16} color="#000000" />
                <Text style={styles.earningsLabel}>Services</Text>
              </View>
              <Text style={styles.earningsAmount}>
                {(walletBalance.serviceEarnings + walletBalance.orderEarnings).toFixed(2)} €
              </Text>
            </View>
          </View>
        </View>

        {/* Actions rapides avec gestion des rôles */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[
                styles.actionCard,
                !canUseWalletAsClient && styles.actionCardDisabled
              ]}
              onPress={handleOrderServices}
              disabled={!canUseWalletAsClient}
            >
              <Ionicons 
                name="construct-outline" 
                size={20} 
                color={!canUseWalletAsClient ? "#666666" : "#000000"} 
              />
              <Text style={[
                styles.actionLabel,
                !canUseWalletAsClient && styles.actionLabelDisabled
              ]}>
                Commander
              </Text>
              <Text style={styles.actionSubText}>
                {canUseWalletAsClient ? 'Services' : 'Rôle requis'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.actionCard,
                (walletBalance.availableBalance < 20 || !canReceiveInWallet) && styles.actionCardDisabled
              ]}
              onPress={handlePayout}
              disabled={walletBalance.availableBalance < 20 || !canReceiveInWallet}
            >
              <Ionicons 
                name="arrow-up-outline" 
                size={20} 
                color={(walletBalance.availableBalance < 20 || !canReceiveInWallet) ? "#666666" : "#000000"} 
              />
              <Text style={[
                styles.actionLabel,
                (walletBalance.availableBalance < 20 || !canReceiveInWallet) && styles.actionLabelDisabled
              ]}>
                Demander
              </Text>
              <Text style={styles.actionSubText}>
                {canReceiveInWallet ? 'Min. 20€' : 'Fourmiz requis'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages contextuels */}
        <View style={styles.contextSection}>
          <View style={styles.contextCard}>
            <View style={styles.contextItem}>
              <Ionicons name="arrow-down-outline" size={16} color="#000000" />
              <Text style={styles.contextText}>{contextualMessages.earnMessage}</Text>
            </View>
            <View style={styles.contextItem}>
              <Ionicons name="arrow-up-outline" size={16} color="#000000" />
              <Text style={styles.contextText}>{contextualMessages.spendMessage}</Text>
            </View>
          </View>
        </View>

        {/* Historique des transactions */}
        <View style={styles.transactionsSection}>
          <TouchableOpacity 
            style={styles.transactionsHeader}
            onPress={() => setShowTransactions(!showTransactions)}
          >
            <Text style={styles.sectionTitle}>
              Historique ({transactions.length})
            </Text>
            <Ionicons 
              name={showTransactions ? 'chevron-up-outline' : 'chevron-down-outline'} 
              size={20} 
              color="#666666" 
            />
          </TouchableOpacity>

          {showTransactions && (
            <View style={styles.transactionsList}>
              {transactions.length > 0 ? (
                transactions.slice(0, 10).map((transaction) => (
                  <View key={transaction.id} style={styles.transactionCard}>
                    <View style={styles.transactionIcon}>
                      <Ionicons 
                        name={getTransactionIcon(transaction.type) as any}
                        size={20} 
                        color="#000000"
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionDescription}>
                        {transaction.description}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                    <View style={styles.transactionAmount}>
                      <Text style={[
                        styles.transactionAmountText,
                        { color: transaction.amount > 0 ? '#000000' : '#666666' }
                      ]}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} €
                      </Text>
                      <View style={styles.transactionStatus}>
                        <Text style={styles.transactionStatusText}>
                          {transaction.status === 'completed' ? 'Validé' : 'En attente'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyTransactions}>
                  <Ionicons name="receipt-outline" size={48} color="#cccccc" />
                  <Text style={styles.emptyTitle}>Aucune transaction</Text>
                  <Text style={styles.emptyDesc}>
                    Vos gains et dépenses apparaîtront ici
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Switch de rôle si possible */}
        {canSwitchRole && (
          <View style={styles.roleSection}>
            <Text style={styles.sectionTitle}>Changer de rôle</Text>
            <View style={styles.roleCard}>
              <Text style={styles.roleText}>
                Vous êtes actuellement en mode {currentRole === 'client' ? 'Client' : 'Fourmiz'}
              </Text>
              <TouchableOpacity 
                style={styles.roleButton}
                onPress={() => switchRole(currentRole === 'client' ? 'fourmiz' : 'client')}
              >
                <Text style={styles.roleButtonText}>
                  Passer en mode {currentRole === 'client' ? 'Fourmiz' : 'Client'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal de demande de paiement */}
      <Modal
        visible={showPayoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPayoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Demander un paiement</Text>
              <TouchableOpacity onPress={() => setShowPayoutModal(false)}>
                <Ionicons name="close-outline" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBalance}>
              Montant disponible: {walletBalance.availableBalance.toFixed(2)}€
            </Text>

            <View style={styles.methodSection}>
              <Text style={styles.methodLabel}>Méthode de paiement:</Text>
              
              {(['paypal', 'gift_card', 'voucher'] as const).map((method) => (
                <TouchableOpacity 
                  key={method}
                  style={[
                    styles.methodOption,
                    payoutMethod === method && styles.methodSelected
                  ]}
                  onPress={() => setPayoutMethod(method)}
                >
                  <Text style={styles.methodText}>
                    {method === 'paypal' ? 'PayPal' : 
                     method === 'gift_card' ? 'Carte cadeau Amazon' : 
                     'Bon d\'achat'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.detailsInput}
              placeholder={getPayoutPlaceholder(payoutMethod)}
              value={payoutDetails}
              onChangeText={setPayoutDetails}
              keyboardType={payoutMethod === 'paypal' ? 'email-address' : 'default'}
            />

            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!payoutDetails.trim() || payoutLoading) && styles.submitButtonDisabled
              ]}
              onPress={processPayout}
              disabled={!payoutDetails.trim() || payoutLoading}
            >
              {payoutLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Demander {walletBalance.availableBalance.toFixed(2)}€
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  
  // Introduction
  introSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },
  
  // Solde
  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  balanceDetails: {
    alignItems: 'center',
    gap: 4,
  },
  balanceSubText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },

  // Section upgrade client
  upgradeSection: {
    marginBottom: 24,
  },
  upgradeCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  upgradeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  upgradeText: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 6,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Sections
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },

  // Gains
  earningsSection: {
    marginBottom: 24,
  },
  earningsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  earningsCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },
  earningsAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },

  // Actions
  actionsSection: {
    marginBottom: 24,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
  },
  actionLabelDisabled: {
    color: '#666666',
  },
  actionSubText: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '400',
  },

  // Messages contextuels
  contextSection: {
    marginBottom: 24,
  },
  contextCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contextText: {
    flex: 1,
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },

  // Transactions
  transactionsSection: {
    marginBottom: 24,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsList: {
    gap: 8,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionStatus: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  transactionStatusText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666666',
  },

  // État vide
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },

  // Section rôles
  roleSection: {
    marginBottom: 24,
  },
  roleCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 12,
    textAlign: 'center',
  },
  roleButton: {
    backgroundColor: '#000000',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  roleButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  modalBalance: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  methodSection: {
    marginBottom: 20,
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  methodOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  methodSelected: {
    borderColor: '#000000',
    backgroundColor: '#f8f8f8',
  },
  methodText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  bottomSpacer: {
    height: 32,
  },
});
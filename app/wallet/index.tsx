import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Euro, Plus, Minus, CreditCard, TrendingUp, TrendingDown, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Eye, Download, Settings, Shield, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Mock data pour le portefeuille
const mockWalletData = {
  balance: 0.00,
  pendingBalance: 125.40,
  totalEarnings: 1247.80,
  isStripeConfigured: false,
  recentTransactions: [
    {
      id: '1',
      type: 'earning',
      description: 'Commission - Livraison de courses',
      amount: 12.50,
      status: 'completed',
      date: '2024-12-20T14:30:00Z',
      reference: 'TXN-001',
    },
    {
      id: '2',
      type: 'withdrawal',
      description: 'Retrait vers compte bancaire',
      amount: -50.00,
      status: 'pending',
      date: '2024-12-19T10:15:00Z',
      reference: 'WTH-002',
    },
    {
      id: '3',
      type: 'earning',
      description: 'Bonus parrainage - Sophie M.',
      amount: 3.00,
      status: 'completed',
      date: '2024-12-18T16:45:00Z',
      reference: 'BON-003',
    },
    {
      id: '4',
      type: 'deposit',
      description: 'Crédit de compte',
      amount: 25.00,
      status: 'completed',
      date: '2024-12-17T09:20:00Z',
      reference: 'DEP-004',
    },
  ],
};

const transactionTypeConfig = {
  earning: { 
    label: 'Gain', 
    color: '#4CAF50', 
    icon: TrendingUp,
    bgColor: '#E8F5E8'
  },
  deposit: { 
    label: 'Crédit', 
    color: '#2196F3', 
    icon: Plus,
    bgColor: '#E3F2FD'
  },
  withdrawal: { 
    label: 'Retrait', 
    color: '#FF9800', 
    icon: Minus,
    bgColor: '#FFF3E0'
  },
};

const statusConfig = {
  completed: { label: 'Terminé', color: '#4CAF50', icon: CheckCircle },
  pending: { label: 'En attente', color: '#FF9800', icon: Clock },
  failed: { label: 'Échoué', color: '#F44336', icon: AlertTriangle },
};

export default function WalletScreen() {
  const [showBalance, setShowBalance] = useState(true);
  const { mode } = useLocalSearchParams();
  const isFourmizMode = mode === 'fourmiz';

  const handleAddFunds = () => {
    if (!mockWalletData.isStripeConfigured) {
      Alert.alert(
        'Paiement indisponible',
        'La fonctionnalité de paiement par carte est désactivée car la clé publique Stripe n\'est pas configurée. Veuillez fournir votre clé pour l\'activer.',
        [{ text: 'OK' }]
      );
      return;
    }
    router.push('/wallet/add-funds');
  };

  const handleWithdraw = () => {
    if (mockWalletData.balance <= 0) {
      Alert.alert(
        'Solde insuffisant',
        'Votre solde est insuffisant pour effectuer un retrait.',
        [{ text: 'OK' }]
      );
      return;
    }
    router.push('/wallet/withdraw');
  };

  const handleViewTransactions = () => {
    router.push('/wallet/transactions');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTransaction = ({ item }: { item: any }) => {
    const typeConfig = transactionTypeConfig[item.type as keyof typeof transactionTypeConfig];
    const statusInfo = statusConfig[item.status as keyof typeof statusConfig];
    const TypeIcon = typeConfig.icon;
    const StatusIcon = statusInfo.icon;

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <View style={[styles.transactionIcon, { backgroundColor: typeConfig.bgColor }]}>
              <TypeIcon size={20} color={typeConfig.color} />
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionDescription}>{item.description}</Text>
              <View style={styles.transactionMeta}>
                <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
                <View style={styles.transactionStatus}>
                  <StatusIcon size={12} color={statusInfo.color} />
                  <Text style={[styles.transactionStatusText, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.transactionReference}>Réf: {item.reference}</Text>
            </View>
          </View>
          <Text style={[
            styles.transactionAmount,
            { color: item.amount > 0 ? '#4CAF50' : '#FF9800' }
          ]}>
            {item.amount > 0 ? '+' : ''}{item.amount.toFixed(2)}€
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Portefeuille</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Settings size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <LinearGradient
          colors={['#FF4444', '#FF6B6B']}
          style={styles.balanceCard}
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Solde disponible</Text>
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowBalance(!showBalance)}
            >
              <Eye size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.balanceAmount}>
            {showBalance ? `${mockWalletData.balance.toFixed(2)}€` : '••••'}
          </Text>
          
          {mockWalletData.pendingBalance > 0 && (
            <View style={styles.pendingBalance}>
              <Clock size={16} color="#FFFFFF" />
              <Text style={styles.pendingText}>
                {mockWalletData.pendingBalance.toFixed(2)}€ en attente
              </Text>
            </View>
          )}
          
          <View style={styles.totalEarnings}>
            <Text style={styles.totalEarningsLabel}>Gains totaux</Text>
            <Text style={styles.totalEarningsAmount}>
              {showBalance ? `${mockWalletData.totalEarnings.toFixed(2)}€` : '••••'}
            </Text>
          </View>
        </LinearGradient>

        {/* Stripe Configuration Warning */}
        {!mockWalletData.isStripeConfigured && (
          <View style={styles.warningCard}>
            <AlertTriangle size={24} color="#FF9800" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Paiement par carte désactivé</Text>
              <Text style={styles.warningText}>
                La fonctionnalité de paiement par carte est désactivée car la clé publique Stripe n'est pas configurée. Veuillez fournir votre clé pour l'activer.
              </Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[
                styles.actionButton,
                !mockWalletData.isStripeConfigured && styles.actionButtonDisabled
              ]}
              onPress={handleAddFunds}
              disabled={!mockWalletData.isStripeConfigured}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#4CAF5015' }]}>
                <Plus size={24} color={mockWalletData.isStripeConfigured ? '#4CAF50' : '#999'} />
              </View>
              <Text style={[
                styles.actionTitle,
                !mockWalletData.isStripeConfigured && styles.actionTitleDisabled
              ]}>
                Créditer le compte
              </Text>
              <Text style={[
                styles.actionSubtitle,
                !mockWalletData.isStripeConfigured && styles.actionSubtitleDisabled
              ]}>
                Ajouter des fonds
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.actionButton,
                mockWalletData.balance <= 0 && styles.actionButtonDisabled
              ]}
              onPress={handleWithdraw}
              disabled={mockWalletData.balance <= 0}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FF980015' }]}>
                <Minus size={24} color={mockWalletData.balance > 0 ? '#FF9800' : '#999'} />
              </View>
              <Text style={[
                styles.actionTitle,
                mockWalletData.balance <= 0 && styles.actionTitleDisabled
              ]}>
                Demander un paiement
              </Text>
              <Text style={[
                styles.actionSubtitle,
                mockWalletData.balance <= 0 && styles.actionSubtitleDisabled
              ]}>
                Retirer du solde
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Transactions récentes</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={handleViewTransactions}
            >
              <Text style={styles.viewAllText}>Voir tout</Text>
              <Download size={16} color="#FF4444" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.transactionsList}>
            {mockWalletData.recentTransactions.slice(0, 3).map((transaction) => (
              <View key={transaction.id}>
                {renderTransaction({ item: transaction })}
              </View>
            ))}
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.securitySection}>
          <View style={styles.securityHeader}>
            <Shield size={24} color="#4CAF50" />
            <Text style={styles.securityTitle}>Sécurité des transactions</Text>
          </View>
          <Text style={styles.securityText}>
            Les transactions sont sécurisées et cryptées. Toutes les opérations sont protégées par des protocoles de sécurité avancés.
          </Text>
          <Text style={styles.securityContact}>
            Pour toute question, contactez le support.
          </Text>
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <View style={styles.helpCard}>
            <Info size={20} color="#2196F3" />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Comment ça marche ?</Text>
              <Text style={styles.helpText}>
                • Créditez votre compte pour payer vos services{'\n'}
                {isFourmizMode ? (
                  '• Recevez vos gains directement dans votre portefeuille\n• Demandez un paiement quand vous le souhaitez'
                ) : (
                  '• Payez vos services directement depuis votre portefeuille\n• Suivez vos dépenses en temps réel'
                )}
                {'\n'}
                • Suivez toutes vos transactions en temps réel
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  balanceCard: {
    margin: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  eyeButton: {
    padding: 4,
  },
  balanceAmount: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  pendingBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 6,
  },
  pendingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  totalEarnings: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  totalEarningsLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  totalEarningsAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F57C00',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#F57C00',
    lineHeight: 20,
  },
  actionsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionTitleDisabled: {
    color: '#999',
  },
  actionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  actionSubtitleDisabled: {
    color: '#999',
  },
  transactionsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FF4444',
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  transactionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionStatusText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  transactionReference: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  securitySection: {
    backgroundColor: '#E8F5E8',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
    marginLeft: 12,
  },
  securityText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4CAF50',
    lineHeight: 20,
    marginBottom: 8,
  },
  securityContact: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
  },
  helpSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  helpContent: {
    flex: 1,
    marginLeft: 12,
  },
  helpTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    lineHeight: 18,
  },
});
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Euro, CreditCard, Clock, Info, CircleCheck as CheckCircle } from 'lucide-react-native';

// Mock data pour le portefeuille
const mockWalletData = {
  balance: 125.40,
  bankAccounts: [
    {
      id: '1',
      type: 'bank',
      name: 'Compte principal',
      lastDigits: '1234',
      isDefault: true,
    }
  ],
  withdrawalFee: 0.00,
  minWithdrawal: 10.00,
  processingTime: '2-3 jours ouvrés',
};

export default function WithdrawScreen() {
  const [amount, setAmount] = useState(mockWalletData.balance.toFixed(2));
  const [withdrawAll, setWithdrawAll] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(mockWalletData.bankAccounts[0].id);
  const [isLoading, setIsLoading] = useState(false);

  const handleAmountChange = (text: string) => {
    // Permettre seulement les nombres et un point décimal
    const cleanText = text.replace(/[^0-9.]/g, '');
    const numAmount = parseFloat(cleanText);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      setAmount('');
    } else if (numAmount > mockWalletData.balance) {
      setAmount(mockWalletData.balance.toFixed(2));
    } else {
      setAmount(cleanText);
    }
    
    setWithdrawAll(numAmount >= mockWalletData.balance);
  };

  const toggleWithdrawAll = () => {
    const newState = !withdrawAll;
    setWithdrawAll(newState);
    
    if (newState) {
      setAmount(mockWalletData.balance.toFixed(2));
    } else {
      // Si on désactive "Tout retirer", on met un montant par défaut
      setAmount(Math.min(mockWalletData.balance, 50).toFixed(2));
    }
  };

  const handleWithdraw = async () => {
    const numAmount = parseFloat(amount);
    
    if (!amount || numAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide.');
      return;
    }

    if (numAmount < mockWalletData.minWithdrawal) {
      Alert.alert('Erreur', `Le montant minimum de retrait est de ${mockWalletData.minWithdrawal}€.`);
      return;
    }

    if (numAmount > mockWalletData.balance) {
      Alert.alert('Erreur', 'Le montant ne peut pas dépasser votre solde disponible.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulation d'une demande de retrait
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Demande envoyée !',
        `Votre demande de retrait de ${numAmount.toFixed(2)}€ a été envoyée avec succès. Le traitement prendra ${mockWalletData.processingTime}.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'La demande de retrait a échoué. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Demander un paiement</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance Info */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceAmount}>{mockWalletData.balance.toFixed(2)}€</Text>
        </View>

        {/* Amount Selection */}
        <View style={styles.amountSection}>
          <Text style={styles.sectionTitle}>Montant à retirer</Text>
          
          <View style={styles.amountInputContainer}>
            <Euro size={20} color="#666" />
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="0.00"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              editable={!withdrawAll}
            />
            <Text style={styles.currencySymbol}>€</Text>
          </View>

          <View style={styles.withdrawAllContainer}>
            <Text style={styles.withdrawAllLabel}>Retirer tout le solde</Text>
            <Switch
              value={withdrawAll}
              onValueChange={toggleWithdrawAll}
              trackColor={{ false: '#E0E0E0', true: '#FF444440' }}
              thumbColor={withdrawAll ? '#FF4444' : '#999'}
            />
          </View>

          <View style={styles.limitsInfo}>
            <Text style={styles.limitsText}>
              Montant minimum : {mockWalletData.minWithdrawal}€ • Frais : {mockWalletData.withdrawalFee}€
            </Text>
          </View>
        </View>

        {/* Bank Account */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>Compte bancaire</Text>
          
          {mockWalletData.bankAccounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={[
                styles.accountCard,
                selectedAccount === account.id && styles.accountCardSelected
              ]}
              onPress={() => setSelectedAccount(account.id)}
            >
              <View style={styles.accountInfo}>
                <CreditCard size={24} color="#2196F3" />
                <View style={styles.accountDetails}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountNumber}>••••{account.lastDigits}</Text>
                </View>
              </View>
              {selectedAccount === account.id && (
                <CheckCircle size={20} color="#4CAF50" />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addAccountButton}>
            <Text style={styles.addAccountText}>+ Ajouter un compte bancaire</Text>
          </TouchableOpacity>
        </View>

        {/* Processing Time */}
        <View style={styles.processingSection}>
          <View style={styles.processingHeader}>
            <Clock size={20} color="#FF9800" />
            <Text style={styles.processingTitle}>Délai de traitement</Text>
          </View>
          <Text style={styles.processingText}>
            Les demandes de paiement sont traitées dans un délai de {mockWalletData.processingTime}.
            Vous recevrez une notification lorsque le virement sera effectué.
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Info size={20} color="#2196F3" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Informations importantes</Text>
            <Text style={styles.infoText}>
              • Les virements sont effectués uniquement vers des comptes bancaires vérifiés{'\n'}
              • Assurez-vous que les informations de votre compte sont correctes{'\n'}
              • Pour les montants supérieurs à 1000€, une vérification supplémentaire peut être requise
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.withdrawButton, isLoading && styles.withdrawButtonDisabled]}
          onPress={handleWithdraw}
          disabled={isLoading || !amount || parseFloat(amount) <= 0}
        >
          <Text style={styles.withdrawButtonText}>
            {isLoading ? 'Traitement en cours...' : `Demander le paiement de ${amount}€`}
          </Text>
        </TouchableOpacity>
      </View>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  balanceSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
  },
  amountSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
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
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginLeft: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  withdrawAllContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  withdrawAllLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  limitsInfo: {
    alignItems: 'center',
  },
  limitsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
  accountSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  accountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  accountCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountDetails: {
    marginLeft: 12,
  },
  accountName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  addAccountButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  addAccountText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2196F3',
  },
  processingSection: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  processingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  processingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F57C00',
    marginLeft: 12,
  },
  processingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#F57C00',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    lineHeight: 18,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  withdrawButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  withdrawButtonDisabled: {
    backgroundColor: '#999',
  },
  withdrawButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
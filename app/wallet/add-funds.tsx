import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, CreditCard, Euro, Shield, Info } from 'lucide-react-native';

const PRESET_AMOUNTS = [10, 25, 50, 100];

export default function AddFundsScreen() {
  const [amount, setAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePresetSelect = (presetAmount: number) => {
    setAmount(presetAmount.toString());
    setSelectedPreset(presetAmount);
  };

  const handleAmountChange = (text: string) => {
    // Permettre seulement les nombres et un point décimal
    const cleanText = text.replace(/[^0-9.]/g, '');
    setAmount(cleanText);
    setSelectedPreset(null);
  };

  const handleAddFunds = async () => {
    const numAmount = parseFloat(amount);
    
    if (!amount || numAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide.');
      return;
    }

    if (numAmount < 5) {
      Alert.alert('Erreur', 'Le montant minimum est de 5€.');
      return;
    }

    if (numAmount > 500) {
      Alert.alert('Erreur', 'Le montant maximum est de 500€.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulation d'un paiement Stripe
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Paiement réussi !',
        `${numAmount.toFixed(2)}€ ont été ajoutés à votre portefeuille.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Le paiement a échoué. Veuillez réessayer.');
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
        <Text style={styles.headerTitle}>Créditer le compte</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount Selection */}
        <View style={styles.amountSection}>
          <Text style={styles.sectionTitle}>Montant à ajouter</Text>
          
          <View style={styles.presetAmounts}>
            {PRESET_AMOUNTS.map((presetAmount) => (
              <TouchableOpacity
                key={presetAmount}
                style={[
                  styles.presetButton,
                  selectedPreset === presetAmount && styles.presetButtonActive
                ]}
                onPress={() => handlePresetSelect(presetAmount)}
              >
                <Text style={[
                  styles.presetText,
                  selectedPreset === presetAmount && styles.presetTextActive
                ]}>
                  {presetAmount}€
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customAmountContainer}>
            <Text style={styles.customAmountLabel}>Ou saisissez un montant personnalisé</Text>
            <View style={styles.amountInputContainer}>
              <Euro size={20} color="#666" />
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
              <Text style={styles.currencySymbol}>€</Text>
            </View>
          </View>

          <View style={styles.limitsInfo}>
            <Text style={styles.limitsText}>Montant minimum : 5€ • Maximum : 500€</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Méthode de paiement</Text>
          
          <View style={styles.paymentMethodCard}>
            <View style={styles.paymentMethodIcon}>
              <CreditCard size={24} color="#4CAF50" />
            </View>
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodTitle}>Carte bancaire</Text>
              <Text style={styles.paymentMethodSubtitle}>Visa, Mastercard, American Express</Text>
            </View>
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.securitySection}>
          <View style={styles.securityHeader}>
            <Shield size={20} color="#4CAF50"  />
            <Text style={styles.securityTitle}>Paiement sécurisé</Text>
          </View>
          <Text style={styles.securityText}>
            Toutes les transactions sont sécurisées et cryptées. Vos informations de paiement ne sont jamais stockées sur nos serveurs.
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Info size={20} color="#2196F3" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Crédits instantanés</Text>
            <Text style={styles.infoText}>
              Les fonds seront immédiatement disponibles dans votre portefeuille après le paiement.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addFundsButton, isLoading && styles.addFundsButtonDisabled]}
          onPress={handleAddFunds}
          disabled={isLoading || !amount || parseFloat(amount) <= 0}
        >
          <Text style={styles.addFundsButtonText}>
            {isLoading ? 'Traitement en cours...' : `Ajouter ${amount ? parseFloat(amount).toFixed(2) : '0.00'}€`}
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
  amountSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
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
  presetAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  presetButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  presetButtonActive: {
    backgroundColor: '#FF444410',
    borderColor: '#FF4444',
  },
  presetText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  presetTextActive: {
    color: '#FF4444',
  },
  customAmountContainer: {
    marginBottom: 16,
  },
  customAmountLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
    marginBottom: 12,
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
  limitsInfo: {
    alignItems: 'center',
  },
  limitsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
  paymentSection: {
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
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  securitySection: {
    backgroundColor: '#E8F5E8',
    marginHorizontal: 20,
    marginBottom: 16,
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
  addFundsButton: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  addFundsButtonDisabled: {
    backgroundColor: '#999',
  },
  addFundsButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
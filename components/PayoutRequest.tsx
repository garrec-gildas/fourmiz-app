// components/PayoutRequest.tsx
// Interface pour les demandes de paiement PayPal/cartes cadeaux
// Compatible avec le système wallet Fourmiz

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PayoutRequestProps {
  visible: boolean;
  onClose: () => void;
  availableBalance: number;
  onRequestSubmit: (request: PayoutRequestData) => Promise<void>;
  minAmount?: number;
  maxAmount?: number;
}

interface PayoutRequestData {
  amount: number;
  method: 'paypal' | 'gift_card';
  paypalEmail?: string;
  giftCardProvider?: string;
  notes?: string;
}

type PayoutMethod = 'paypal' | 'gift_card';

const GIFT_CARD_PROVIDERS = [
  { id: 'amazon', name: 'Amazon', icon: 'storefront-outline' },
  { id: 'decathlon', name: 'Decathlon', icon: 'fitness-outline' },
  { id: 'fnac', name: 'Fnac', icon: 'library-outline' },
  { id: 'carrefour', name: 'Carrefour', icon: 'cart-outline' },
  { id: 'google_play', name: 'Google Play', icon: 'logo-google-playstore' },
  { id: 'app_store', name: 'App Store', icon: 'logo-apple-appstore' }
];

export const PayoutRequest: React.FC<PayoutRequestProps> = ({
  visible,
  onClose,
  availableBalance,
  onRequestSubmit,
  minAmount = 10,
  maxAmount = 500
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PayoutMethod>('paypal');
  const [amount, setAmount] = useState<string>('');
  const [paypalEmail, setPaypalEmail] = useState<string>('');
  const [selectedGiftCard, setSelectedGiftCard] = useState<string>('amazon');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Validation du montant
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum)) {
      newErrors.amount = 'Montant requis';
    } else if (amountNum < minAmount) {
      newErrors.amount = `Montant minimum: ${minAmount}€`;
    } else if (amountNum > maxAmount) {
      newErrors.amount = `Montant maximum: ${maxAmount}€`;
    } else if (amountNum > availableBalance) {
      newErrors.amount = 'Montant supérieur au solde disponible';
    }

    // Validation PayPal
    if (selectedMethod === 'paypal') {
      if (!paypalEmail) {
        newErrors.paypalEmail = 'Email PayPal requis';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) {
        newErrors.paypalEmail = 'Email PayPal invalide';
      }
    }

    // Validation carte cadeau
    if (selectedMethod === 'gift_card' && !selectedGiftCard) {
      newErrors.giftCard = 'Sélectionnez un fournisseur';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [amount, minAmount, maxAmount, availableBalance, selectedMethod, paypalEmail, selectedGiftCard]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const requestData: PayoutRequestData = {
        amount: parseFloat(amount),
        method: selectedMethod,
        notes: notes.trim() || undefined
      };

      if (selectedMethod === 'paypal') {
        requestData.paypalEmail = paypalEmail.trim();
      } else {
        requestData.giftCardProvider = selectedGiftCard;
      }

      await onRequestSubmit(requestData);

      // Réinitialiser le formulaire
      setAmount('');
      setPaypalEmail('');
      setSelectedGiftCard('amazon');
      setNotes('');
      setErrors({});
      
      Alert.alert(
        'Demande envoyée',
        'Votre demande de paiement sera traitée sous 2-3 jours ouvrés.',
        [{ text: 'OK', onPress: onClose }]
      );

    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error.message || 'Impossible de soumettre la demande'
      );
    } finally {
      setLoading(false);
    }
  }, [validateForm, amount, selectedMethod, paypalEmail, selectedGiftCard, notes, onRequestSubmit, onClose]);

  const handleAmountChange = useCallback((text: string) => {
    // Ne garder que les chiffres et un seul point décimal
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      parts.splice(2);
    }
    const formatted = parts.join('.');
    setAmount(formatted);
    
    // Effacer l'erreur de montant si elle existe
    if (errors.amount) {
      setErrors(prev => ({...prev, amount: ''}));
    }
  }, [errors.amount]);

  const resetForm = useCallback(() => {
    setAmount('');
    setPaypalEmail('');
    setSelectedGiftCard('amazon');
    setNotes('');
    setErrors({});
    setSelectedMethod('paypal');
  }, []);

  const handleClose = useCallback(() => {
    if (!loading) {
      resetForm();
      onClose();
    }
  }, [loading, resetForm, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            disabled={loading}
          >
            <Ionicons name="close" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Demande de paiement</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.balanceCard}>
            <Ionicons name="wallet-outline" size={24} color="#000000" />
            <Text style={styles.balanceLabel}>Solde disponible</Text>
            <Text style={styles.balanceAmount}>{availableBalance.toFixed(2)} €</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Montant à retirer</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.amountInput, errors.amount && styles.inputError]}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                keyboardType="decimal-pad"
                maxLength={8}
                editable={!loading}
              />
              <Text style={styles.currency}>€</Text>
            </View>
            {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
            <Text style={styles.inputHelp}>
              Entre {minAmount}€ et {Math.min(maxAmount, availableBalance).toFixed(2)}€
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Méthode de paiement</Text>
            
            <View style={styles.methodSelector}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  styles.methodButtonLeft,
                  selectedMethod === 'paypal' && styles.methodButtonActive
                ]}
                onPress={() => setSelectedMethod('paypal')}
                disabled={loading}
              >
                <Ionicons
                  name="logo-paypal"
                  size={20}
                  color={selectedMethod === 'paypal' ? '#ffffff' : '#666666'}
                />
                <Text style={[
                  styles.methodButtonText,
                  selectedMethod === 'paypal' && styles.methodButtonTextActive
                ]}>
                  PayPal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodButton,
                  styles.methodButtonRight,
                  selectedMethod === 'gift_card' && styles.methodButtonActive
                ]}
                onPress={() => setSelectedMethod('gift_card')}
                disabled={loading}
              >
                <Ionicons
                  name="gift-outline"
                  size={20}
                  color={selectedMethod === 'gift_card' ? '#ffffff' : '#666666'}
                />
                <Text style={[
                  styles.methodButtonText,
                  selectedMethod === 'gift_card' && styles.methodButtonTextActive
                ]}>
                  Carte cadeau
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {selectedMethod === 'paypal' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Email PayPal</Text>
              <TextInput
                style={[styles.input, errors.paypalEmail && styles.inputError]}
                value={paypalEmail}
                onChangeText={(text) => {
                  setPaypalEmail(text);
                  if (errors.paypalEmail) {
                    setErrors(prev => ({...prev, paypalEmail: ''}));
                  }
                }}
                placeholder="votre.email@exemple.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
              {errors.paypalEmail && <Text style={styles.errorText}>{errors.paypalEmail}</Text>}
            </View>
          )}

          {selectedMethod === 'gift_card' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fournisseur</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.giftCardScroll}>
                {GIFT_CARD_PROVIDERS.map((provider) => (
                  <TouchableOpacity
                    key={provider.id}
                    style={[
                      styles.giftCardOption,
                      selectedGiftCard === provider.id && styles.giftCardOptionActive
                    ]}
                    onPress={() => setSelectedGiftCard(provider.id)}
                    disabled={loading}
                  >
                    <Ionicons
                      name={provider.icon as any}
                      size={24}
                      color={selectedGiftCard === provider.id ? '#ffffff' : '#666666'}
                    />
                    <Text style={[
                      styles.giftCardOptionText,
                      selectedGiftCard === provider.id && styles.giftCardOptionTextActive
                    ]}>
                      {provider.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Informations supplémentaires..."
              multiline
              numberOfLines={3}
              maxLength={200}
              editable={!loading}
            />
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color="#666666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>
                Les demandes sont traitées sous 2-3 jours ouvrés. 
                Vous recevrez une confirmation par email.
              </Text>
              <Text style={styles.infoSubtext}>
                Frais de traitement: gratuit • Minimum: {minAmount}€
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !amount}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                Demander {amount || '0.00'} €
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  balanceCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginVertical: 20,
    gap: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666666',
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    paddingVertical: 16,
    textAlign: 'center',
  },
  currency: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666666',
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ff4444',
    marginTop: 4,
  },
  inputHelp: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  methodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 4,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  methodButtonLeft: {
    marginRight: 2,
  },
  methodButtonRight: {
    marginLeft: 2,
  },
  methodButtonActive: {
    backgroundColor: '#000000',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  methodButtonTextActive: {
    color: '#ffffff',
  },
  giftCardScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  giftCardOption: {
    alignItems: 'center',
    padding: 16,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    minWidth: 80,
    gap: 8,
  },
  giftCardOptionActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  giftCardOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    textAlign: 'center',
  },
  giftCardOptionTextActive: {
    color: '#ffffff',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#666666',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  submitButton: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
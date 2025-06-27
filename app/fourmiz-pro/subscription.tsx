import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, CreditCard, Shield, Info, CircleCheck as CheckCircle, Calendar, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SubscriptionScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardName, setCardName] = useState('');

  const formatCardNumber = (text: string) => {
    // Supprimer tous les espaces
    const cleaned = text.replace(/\s+/g, '');
    // Ajouter un espace tous les 4 chiffres
    const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
    return formatted;
  };

  const formatExpiry = (text: string) => {
    // Supprimer tous les caractères non numériques
    const cleaned = text.replace(/[^\d]/g, '');
    // Format MM/YY
    if (cleaned.length <= 2) {
      return cleaned;
    } else {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
  };

  const handleCardNumberChange = (text: string) => {
    const formatted = formatCardNumber(text);
    // Limiter à 19 caractères (16 chiffres + 3 espaces)
    if (formatted.length <= 19) {
      setCardNumber(formatted);
    }
  };

  const handleExpiryChange = (text: string) => {
    const formatted = formatExpiry(text);
    // Limiter à 5 caractères (MM/YY)
    if (formatted.length <= 5) {
      setCardExpiry(formatted);
    }
  };

  const handleCVCChange = (text: string) => {
    // Limiter à 3 ou 4 chiffres
    if (/^\d{0,4}$/.test(text)) {
      setCardCVC(text);
    }
  };

  const validateForm = () => {
    if (!cardNumber || cardNumber.replace(/\s+/g, '').length < 16) {
      Alert.alert('Erreur', 'Veuillez saisir un numéro de carte valide');
      return false;
    }
    
    if (!cardExpiry || cardExpiry.length < 5) {
      Alert.alert('Erreur', 'Veuillez saisir une date d\'expiration valide');
      return false;
    }
    
    if (!cardCVC || cardCVC.length < 3) {
      Alert.alert('Erreur', 'Veuillez saisir un code de sécurité valide');
      return false;
    }
    
    if (!cardName) {
      Alert.alert('Erreur', 'Veuillez saisir le nom du titulaire de la carte');
      return false;
    }
    
    if (!acceptTerms) {
      Alert.alert('Erreur', 'Veuillez accepter les conditions d\'abonnement');
      return false;
    }
    
    return true;
  };

  const handleSubscribe = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Simulation d'un paiement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Abonnement activé !',
        'Félicitations ! Votre abonnement Fourmiz PRO est maintenant actif. Vous pouvez dès à présent profiter de tous les avantages premium.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/fourmiz-pro'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue lors du traitement du paiement. Veuillez réessayer.');
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
        <Text style={styles.headerTitle}>Abonnement Fourmiz PRO</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Subscription Summary */}
        <LinearGradient
          colors={['#FFD700', '#FFC107']}
          style={styles.summaryCard}
        >
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>Fourmiz PRO</Text>
            <Text style={styles.summaryPrice}>10,00€/mois</Text>
            <Text style={styles.summaryDescription}>
              Sans engagement • Résiliation à tout moment
            </Text>
          </View>
        </LinearGradient>

        {/* Payment Method */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Méthode de paiement</Text>
          
          <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
              <CreditCard size={24} color="#333" />
              <Text style={styles.cardTitle}>Carte bancaire</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Numéro de carte</Text>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={19}
              />
            </View>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Date d'expiration</Text>
                <TextInput
                  style={styles.input}
                  value={cardExpiry}
                  onChangeText={handleExpiryChange}
                  placeholder="MM/YY"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              
              <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
                <Text style={styles.label}>CVC</Text>
                <TextInput
                  style={styles.input}
                  value={cardCVC}
                  onChangeText={handleCVCChange}
                  placeholder="123"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom du titulaire</Text>
              <TextInput
                style={styles.input}
                value={cardName}
                onChangeText={setCardName}
                placeholder="JEAN DUPONT"
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        {/* Subscription Options */}
        <View style={styles.optionsSection}>
          <Text style={styles.sectionTitle}>Options d'abonnement</Text>
          
          <View style={styles.optionCard}>
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Calendar size={20} color="#333" />
                <Text style={styles.optionLabel}>Renouvellement automatique</Text>
              </View>
              {Platform.OS !== 'web' ? (
                <Switch
                  value={autoRenew}
                  onValueChange={setAutoRenew}
                  trackColor={{ false: '#E0E0E0', true: '#FFD70040' }}
                  thumbColor={autoRenew ? '#FFD700' : '#999'}
                />
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.webSwitch, 
                    autoRenew ? styles.webSwitchActive : styles.webSwitchInactive
                  ]}
                  onPress={() => setAutoRenew(!autoRenew)}
                >
                  <View style={[
                    styles.webSwitchThumb, 
                    autoRenew ? styles.webSwitchThumbActive : styles.webSwitchThumbInactive
                  ]} />
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={styles.optionDescription}>
              {autoRenew 
                ? 'Votre abonnement sera automatiquement renouvelé chaque mois' 
                : 'Votre abonnement expirera à la fin du mois en cours'
              }
            </Text>
          </View>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <View style={styles.termsCard}>
            <View style={styles.termsCheckbox}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => setAcceptTerms(!acceptTerms)}
              >
                {acceptTerms ? (
                  <CheckCircle size={20} color="#FFD700" />
                ) : (
                  <View style={styles.emptyCheckbox} />
                )}
              </TouchableOpacity>
              
              <Text style={styles.termsText}>
                J'accepte les{' '}
                <Text style={styles.termsLink}>conditions d'abonnement</Text>
                {' '}et je comprends que tout mois entamé est dû et non remboursable
              </Text>
            </View>
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.securitySection}>
          <View style={styles.securityCard}>
            <Shield size={20} color="#4CAF50" />
            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>Paiement sécurisé</Text>
              <Text style={styles.securityText}>
                Toutes vos informations de paiement sont cryptées et sécurisées. Nous ne stockons pas les détails de votre carte.
              </Text>
            </View>
          </View>
        </View>

        {/* Billing Info */}
        <View style={styles.billingInfoSection}>
          <View style={styles.billingInfoCard}>
            <Info size={20} color="#2196F3" />
            <View style={styles.billingInfoContent}>
              <Text style={styles.billingInfoTitle}>Informations de facturation</Text>
              <Text style={styles.billingInfoText}>
                • Premier paiement immédiat de 10,00€{'\n'}
                • Facturation mensuelle le même jour chaque mois{'\n'}
                • Vous pouvez annuler à tout moment{'\n'}
                • Tout mois entamé est dû et non remboursable
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.subscribeButton, isLoading && styles.subscribeButtonDisabled]}
          onPress={handleSubscribe}
          disabled={isLoading}
        >
          <Text style={styles.subscribeButtonText}>
            {isLoading ? 'Traitement en cours...' : 'S\'abonner pour 10,00€/mois'}
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
  summaryCard: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryContent: {
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  summaryPrice: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  summaryDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
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
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  cardContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginLeft: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 12,
  },
  optionsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginLeft: 12,
  },
  optionDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginLeft: 32,
  },
  termsSection: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  termsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  emptyCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
    lineHeight: 20,
  },
  termsLink: {
    color: '#FFD700',
    textDecorationLine: 'underline',
  },
  securitySection: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  securityCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  securityContent: {
    flex: 1,
    marginLeft: 12,
  },
  securityTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#4CAF50',
    lineHeight: 18,
  },
  billingInfoSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  billingInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  billingInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  billingInfoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
    marginBottom: 4,
  },
  billingInfoText: {
    fontSize: 12,
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
  subscribeButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonDisabled: {
    backgroundColor: '#999',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  // Web-specific styles for Switch component
  webSwitch: {
    width: 50,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  webSwitchActive: {
    backgroundColor: '#FFD70040',
  },
  webSwitchInactive: {
    backgroundColor: '#E0E0E0',
  },
  webSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  webSwitchThumbActive: {
    backgroundColor: '#FFD700',
    marginLeft: 'auto',
  },
  webSwitchThumbInactive: {
    backgroundColor: '#999',
    marginLeft: 0,
  },
});
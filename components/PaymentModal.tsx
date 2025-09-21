// components/PaymentModal.tsx
// Modal de paiement avec Apple Pay - VERSION COMPLÈTE FONCTIONNELLE

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  useStripe, 
  usePaymentSheet,
  PaymentSheetError,
  PaymentSheet 
} from '@stripe/stripe-react-native';
import { PaymentService, PaymentIntent } from '@/lib/payment.service';
import { 
  formatAmount, 
  getAvailablePaymentMethods, 
  getPaymentMethodIcon, 
  getPaymentMethodLabel,
  GOOGLE_PAY_CONFIG,
  STRIPE_APPEARANCE
} from '@/lib/stripe.config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Configuration Apple Pay
const APPLE_PAY_CONFIG = {
  merchantId: 'merchant.com.lesfourmiz.fourmiz',
  merchantCountryCode: 'FR',
  currencyCode: 'EUR',
  testEnv: __DEV__,
};

interface Order {
  id: number;
  service_title?: string;
  proposed_amount: number;
  description?: string;
  date?: string;
  address?: string;
  city?: string;
}

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  order: Order;
  loading?: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  onError,
  order,
  loading = false
}) => {
  // États locaux
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>([]);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [applePaySupported, setApplePaySupported] = useState<boolean>(false);

  // Hooks Stripe
  const stripe = useStripe();
  const { 
    initPaymentSheet, 
    presentPaymentSheet, 
    loading: sheetLoading,
    resetPaymentSheetCustomer
  } = usePaymentSheet();

  // Vérifier la disponibilité d'Apple Pay
  const checkApplePaySupport = async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      console.log('🍎 Apple Pay non disponible: pas sur iOS');
      setApplePaySupported(false);
      return false;
    }

    // Sur iOS, on considère qu'Apple Pay est potentiellement disponible
    // Stripe gérera la vérification finale lors de l'affichage du Payment Sheet
    console.log('🍎 Apple Pay potentiellement disponible sur iOS');
    setApplePaySupported(true);
    return true; // ✅ Retour explicite
  };

  // Initialiser le paiement quand le modal s'ouvre
  useEffect(() => {
    console.log('🔄 useEffect PaymentModal - visible:', visible);

    if (visible && order) {
      console.log('✅ Démarrage initializePayment');
      initializePayment();
    } else if (!visible) {
      console.log('🔄 Modal fermée - Reset état');
      resetPaymentState();
    }
  }, [visible, order]);

  // Reset de l'état du paiement
  const resetPaymentState = () => {
    console.log('🔄 Reset état paiement');
    setPaymentIntent(null);
    setInitializing(false);
    setProcessing(false);
    setPaymentError(null);
    setAvailablePaymentMethods([]);
    setApplePaySupported(false);
  };

  // Initialiser le Payment Intent et configurer Payment Sheet
  const initializePayment = async () => {
    try {
      setInitializing(true);
      setPaymentError(null);

      console.log('🔄 Initialisation paiement commande:', order.id);

      // Vérifier Apple Pay en premier
      await checkApplePaySupport();

      // Validation éligibilité (skip pour nouvelles commandes)
      if (order.id > 0) {
        console.log('🔍 Validation éligibilité...');
        const eligibility = await PaymentService.validatePaymentEligibility(order.id);
        if (!eligibility.canPay) {
          throw new Error(eligibility.reason || 'Paiement non autorisé');
        }
      }

      // Créer le Payment Intent
      console.log('💳 Création Payment Intent...');
      const intent = await PaymentService.createPaymentIntent({
        orderId: order.id,
        amount: order.proposed_amount,
        description: `${order.service_title || 'Service'} - Commande #${order.id}`,
        metadata: {
          order_id: order.id.toString(),
          service_title: order.service_title || '',
          platform: Platform.OS
        }
      });

      if (!intent) {
        throw new Error('Impossible de créer le paiement');
      }

      setPaymentIntent(intent);
      console.log('✅ Payment Intent créé');

      // Configurer Payment Sheet
      await configurePaymentSheet(intent);

      // Définir les moyens de paiement disponibles
      const methods = getAvailablePaymentMethods(Platform.OS as 'ios' | 'android');
      console.log('💳 Moyens de paiement de base:', methods);
      
      // Ajouter Apple Pay seulement s'il est supporté
      if (Platform.OS === 'ios' && applePaySupported) {
        if (!methods.includes('apple_pay')) {
          methods.push('apple_pay');
        }
        console.log('🍎 Apple Pay ajouté aux moyens de paiement');
      }
      
      setAvailablePaymentMethods(methods);
      console.log('💳 Moyens de paiement finaux:', methods);
      console.log('✅ Paiement initialisé avec succès');

    } catch (error: any) {
      console.error('❌ Erreur initialisation:', error);
      const errorMessage = error.message || 'Erreur d\'initialisation du paiement';
      setPaymentError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setInitializing(false);
    }
  };

  // Configurer Stripe Payment Sheet
  const configurePaymentSheet = async (intent: PaymentIntent, isApplePayAvailable?: boolean) => {
    try {
      console.log('🔧 Configuration PaymentSheet...');
      
      // ✅ FORCER APPLE PAY SUR IOS POUR DIAGNOSTIC
      const forceApplePayOnIOS = Platform.OS === 'ios';
      console.log('🔧 Apple Pay forcé:', forceApplePayOnIOS);
      console.log('🔧 Merchant ID:', APPLE_PAY_CONFIG.merchantId);

      const amountInCents = Math.round(order.proposed_amount * 100);
      
      const paymentSheetConfig: PaymentSheet.SetupParams = {
        paymentIntentClientSecret: intent.client_secret,
        merchantDisplayName: 'Fourmiz',
        
        // ✅ FORCER APPLE PAY SUR IOS
        applePay: forceApplePayOnIOS ? {
          merchantId: APPLE_PAY_CONFIG.merchantId,
          merchantCountryCode: APPLE_PAY_CONFIG.merchantCountryCode,
          currencyCode: APPLE_PAY_CONFIG.currencyCode,
          
          paymentSummaryItems: [
            {
              label: order.service_title || 'Service Fourmiz',
              amount: amountInCents.toString(),
              type: 'Final' as const,
            }
          ],
          
          buttonType: 'pay' as const,
          borderRadius: 8,
          merchantCapabilities: 'supports3DS' as const,
          supportedNetworks: ['visa', 'masterCard', 'amex'] as const,
          
          ...(APPLE_PAY_CONFIG.testEnv && { testEnv: true }),
        } : undefined,
        
        // Configuration Google Pay
        googlePay: Platform.OS === 'android' ? {
          merchantId: GOOGLE_PAY_CONFIG.merchantId,
          testEnv: GOOGLE_PAY_CONFIG.testEnv,
          currencyCode: 'EUR',
          countryCode: 'FR',
          merchantCountryCode: 'FR',
        } : undefined,
        
        returnURL: 'fourmiz://payment-return',
        
        appearance: {
          ...STRIPE_APPEARANCE,
          colors: {
            primary: '#000000',
            background: '#ffffff',
            componentBackground: '#f8f9fa',
            componentBorder: '#e1e5e9',
            componentDivider: '#e1e5e9',
            primaryText: '#1a1a1a',
            secondaryText: '#73757a',
            componentText: '#1a1a1a',
            placeholderText: '#a7a7a7',
            icon: '#73757a',
            error: '#df1b41',
          },
          shapes: {
            borderRadius: 8,
            borderWidth: 1,
          },
        },
        
        // ✅ FORCER APPLE PAY DANS paymentMethodTypes
        paymentMethodTypes: forceApplePayOnIOS 
          ? ['card', 'paypal', 'applePay'] as const
          : ['card', 'paypal'] as const,
        
        defaultBillingDetails: {
          address: {
            country: 'FR',
          }
        },
        
        primaryButtonLabel: 'Payer maintenant',
        allowsDelayedPaymentMethods: false,
      };

      console.log('🔧 Configuration finale FORCÉE:', {
        platform: Platform.OS,
        hasApplePay: !!paymentSheetConfig.applePay,
        paymentMethodTypes: paymentSheetConfig.paymentMethodTypes,
        forceApplePayOnIOS,
        merchantId: APPLE_PAY_CONFIG.merchantId,
      });

      const { error } = await initPaymentSheet(paymentSheetConfig);

      if (error) {
        console.error('❌ Erreur configuration PaymentSheet:', error);
        
        if (error.message?.toLowerCase().includes('apple')) {
          throw new Error(`Erreur Apple Pay: ${error.message}\n\nVérifiez la configuration dans Stripe Dashboard.`);
        }
        
        throw new Error(`Configuration impossible: ${error.message}`);
      }

      console.log('✅ PaymentSheet configuré');
      console.log(`🍎 Apple Pay: ${forceApplePayOnIOS ? 'FORCÉ ACTIVÉ' : 'DÉSACTIVÉ'}`);

    } catch (error: any) {
      console.error('❌ Erreur configurePaymentSheet:', error);
      throw error;
    }
  };

  // Traiter le paiement
  const handlePayment = async () => {
    console.log('🔥 Démarrage paiement');

    if (!paymentIntent || !stripe) {
      Alert.alert('Erreur', 'Paiement non disponible');
      return;
    }

    try {
      setProcessing(true);
      setPaymentError(null);

      console.log('💳 Présentation PaymentSheet...');
      const { error, paymentMethod } = await presentPaymentSheet();

      console.log('💳 Résultat:', { error: error?.code, paymentMethod: paymentMethod?.type });

      if (error) {
        if (error.code === PaymentSheetError.Canceled) {
          console.log('ℹ️ Paiement annulé');
          return;
        }
        
        if (error.code === PaymentSheetError.Failed) {
          throw new Error(`Paiement échoué: ${error.message}`);
        }
        
        throw new Error(error.message || 'Erreur lors du paiement');
      }

      // Identifier le type de paiement
      let paymentType = 'Carte bancaire';
      if (paymentMethod?.type === 'ApplePay') {
        paymentType = 'Apple Pay';
      }
      
      console.log(`✅ Paiement ${paymentType} réussi`);

      // Confirmer côté serveur
      const confirmed = await PaymentService.confirmPayment(
        paymentIntent.id,
        order.id,
        paymentMethod?.id
      );

      if (!confirmed) {
        throw new Error('Impossible de confirmer le paiement');
      }

      console.log('✅ Paiement confirmé serveur');

      Alert.alert(
        'Paiement réussi !',
        `Votre paiement de ${formatAmount(order.proposed_amount)} via ${paymentType} a été confirmé.`,
        [{
          text: 'OK',
          onPress: () => {
            onSuccess(paymentIntent.id);
            onClose();
          }
        }]
      );

    } catch (error: any) {
      console.error('❌ Erreur paiement:', error);
      const errorMessage = error.message || 'Erreur lors du paiement';
      setPaymentError(errorMessage);
      Alert.alert('Erreur de paiement', errorMessage, [{ text: 'OK' }]);
      if (onError) onError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // Fermer le modal
  const handleClose = () => {
    if (processing || initializing) {
      Alert.alert(
        'Paiement en cours',
        'Un paiement est en cours. Quitter ?',
        [
          { text: 'Continuer', style: 'cancel' },
          { text: 'Quitter', style: 'destructive', onPress: () => { resetPaymentState(); onClose(); }}
        ]
      );
    } else {
      resetPaymentState();
      onClose();
    }
  };

  // Retry
  const handleRetry = () => {
    setPaymentError(null);
    initializePayment();
  };

  // Rendu du contenu
  const renderContent = () => {
    if (initializing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>
            Préparation du paiement{Platform.OS === 'ios' && applePaySupported ? ' avec Apple Pay' : ''}...
          </Text>
        </View>
      );
    }

    if (paymentError) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Erreur de paiement</Text>
          <Text style={styles.errorMessage}>{paymentError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={16} color="#ffffff" />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Détails commande */}
        <View style={styles.orderSection}>
          <Text style={styles.orderTitle}>{order.service_title || 'Service'}</Text>
          <Text style={styles.orderSubtitle}>Commande #{order.id}</Text>
          
          {order.date && (
            <View style={styles.orderDetail}>
              <Ionicons name="calendar-outline" size={14} color="#666666" />
              <Text style={styles.orderDetailText}>
                {new Date(order.date).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
          
          {order.address && (
            <View style={styles.orderDetail}>
              <Ionicons name="location-outline" size={14} color="#666666" />
              <Text style={styles.orderDetailText} numberOfLines={2}>
                {order.address}{order.city ? `, ${order.city}` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Montant */}
        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Montant du service :</Text>
            <Text style={styles.amountValue}>{formatAmount(order.proposed_amount)}</Text>
          </View>
          
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Frais de service :</Text>
            <Text style={styles.amountValue}>Gratuit</Text>
          </View>
          
          <View style={[styles.amountRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total à payer :</Text>
            <Text style={styles.totalAmount}>{formatAmount(order.proposed_amount)}</Text>
          </View>
        </View>

        {/* Moyens de paiement */}
        <View style={styles.paymentMethodsSection}>
          <Text style={styles.sectionTitle}>Moyens de paiement acceptés</Text>
          <View style={styles.methodsGrid}>
            {availablePaymentMethods.map((method) => (
              <View 
                key={method} 
                style={[
                  styles.methodItem,
                  method === 'apple_pay' && styles.applePayMethodItem
                ]}
              >
                <Ionicons
                  name={method === 'apple_pay' ? 'logo-apple' : getPaymentMethodIcon(method as any) as any}
                  size={18}
                  color={method === 'apple_pay' ? "#000000" : "#666666"}
                />
                <Text style={[
                  styles.methodText,
                  method === 'apple_pay' && styles.applePayMethodText
                ]}>
                  {method === 'apple_pay' ? 'Apple Pay' : getPaymentMethodLabel(method as any)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sécurité */}
        <View style={styles.securitySection}>
          <View style={styles.securityItem}>
            <Ionicons name="shield-checkmark" size={16} color="#10b981" />
            <Text style={styles.securityText}>Paiement sécurisé par Stripe</Text>
          </View>
          <View style={styles.securityItem}>
            <Ionicons name="lock-closed" size={16} color="#10b981" />
            <Text style={styles.securityText}>Données cryptées SSL</Text>
          </View>
          {applePaySupported && (
            <View style={styles.securityItem}>
              <Ionicons name="logo-apple" size={16} color="#10b981" />
              <Text style={styles.securityText}>Touch ID / Face ID avec Apple Pay</Text>
            </View>
          )}
        </View>

        {/* Informations */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Informations importantes</Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
            <Text style={styles.infoText}>Paiement immédiat sécurisé</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={14} color="#666666" />
            <Text style={styles.infoText}>Débité dès qu'une Fourmiz accepte</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="refresh-outline" size={14} color="#666666" />
            <Text style={styles.infoText}>Remboursement automatique si aucune acceptation</Text>
          </View>

          {applePaySupported && (
            <View style={styles.infoItem}>
              <Ionicons name="logo-apple" size={14} color="#666666" />
              <Text style={styles.infoText}>Paiement rapide avec Apple Pay</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Paiement sécurisé{applePaySupported && ' • Apple Pay'}
            </Text>
            <TouchableOpacity 
              onPress={handleClose} 
              style={styles.closeButton}
              disabled={processing || initializing}
            >
              <Ionicons 
                name="close" 
                size={24} 
                color={processing || initializing ? "#cccccc" : "#666666"} 
              />
            </TouchableOpacity>
          </View>

          {/* Contenu */}
          {renderContent()}

          {/* Footer */}
          {!initializing && !paymentError && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.payButton,
                  (processing || loading || sheetLoading) && styles.payButtonDisabled
                ]}
                onPress={handlePayment}
                disabled={processing || loading || sheetLoading || !paymentIntent}
              >
                {processing || sheetLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={16} color="#ffffff" />
                    <Text style={styles.payButtonText}>
                      {applePaySupported 
                        ? `Payer ${formatAmount(order.proposed_amount)} (Carte ou Apple Pay)`
                        : `Payer ${formatAmount(order.proposed_amount)}`
                      }
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Styles
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.9,
    minHeight: screenHeight * 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // États de chargement et d'erreur
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Sections
  orderSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  orderSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  orderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  orderDetailText: {
    fontSize: 13,
    color: '#666666',
    flex: 1,
  },

  amountSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  amountLabel: {
    fontSize: 14,
    color: '#666666',
  },
  amountValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '700',
  },

  paymentMethodsSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 12,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  applePayMethodItem: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333333',
  },
  methodText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  applePayMethodText: {
    color: '#ffffff',
    fontWeight: '600',
  },

  securitySection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityText: {
    fontSize: 13,
    color: '#666666',
  },

  infoSection: {
    paddingVertical: 20,
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666666',
    flex: 1,
  },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  payButton: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});
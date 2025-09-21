// components/StripePaymentElement.tsx
// Interface paiement unifiée : Cartes + Apple Pay + Google Pay
// Version complète avec backend Vercel opérationnel

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useStripe,
  useApplePay,
  useGooglePay,
  PaymentSheet,
  isPlatformPaySupported,
  PlatformPay
} from '@stripe/stripe-react-native';

interface StripePaymentElementProps {
  orderId: string;
  amount: number; // en euros
  clientId: string;
  fourmizId: string;
  description: string;
  onPaymentSuccess: (paymentIntentId: string, paymentMethod: string) => void;
  onPaymentError: (error: string) => void;
  onPaymentCancel?: () => void;
  disabled?: boolean;
}

export const StripePaymentElement: React.FC<StripePaymentElementProps> = ({
  orderId,
  amount,
  clientId,
  fourmizId,
  description,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
  disabled = false
}) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { isApplePaySupported } = useApplePay();
  const { isGooglePaySupported } = useGooglePay();
  
  const [loading, setLoading] = useState(false);
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [platformPaySupported, setPlatformPaySupported] = useState(false);

  // Vérifier support des paiements platform
  useEffect(() => {
    const checkPlatformPaySupport = async () => {
      try {
        const supported = await isPlatformPaySupported();
        setPlatformPaySupported(supported);
      } catch (error) {
        console.log('Erreur vérification Platform Pay:', error);
        setPlatformPaySupported(false);
      }
    };
    
    checkPlatformPaySupport();
  }, []);

  // Initialiser Payment Sheet
  const initializePaymentSheet = async () => {
    try {
      setLoading(true);

      // Récupérer l'URL API depuis les variables d'environnement
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      
      if (!apiUrl) {
        throw new Error('URL API backend non configurée');
      }

      console.log('💳 Création Payment Intent:', { orderId, amount, apiUrl });

      // Créer Payment Intent via backend Vercel
      const response = await fetch(`${apiUrl}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          amount: Math.round(amount * 100), // Convertir en centimes
          clientId,
          fourmizId,
          description,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          }
        }),
      });

      const data = await response.json();
      console.log('💳 Réponse create-intent:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Erreur création paiement');
      }

      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);

      // Configuration Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Fourmiz',
        paymentIntentClientSecret: data.clientSecret,
        allowsDelayedPaymentMethods: true,
        returnURL: 'fourmiz://payment-return',
        appearance: {
          colors: {
            primary: '#000000',
            background: '#ffffff',
            componentBackground: '#f8f8f8',
            componentBorder: '#e0e0e0',
            componentDivider: '#e0e0e0',
            primaryText: '#000000',
            secondaryText: '#666666',
            componentText: '#000000',
            placeholderText: '#999999'
          },
          shapes: {
            borderRadius: 8,
            borderWidth: 1
          },
          primaryButton: {
            colors: {
              background: '#000000',
              text: '#ffffff',
              border: '#000000'
            }
          }
        },
        applePay: {
          merchantCountryCode: 'FR',
        },
        googlePay: {
          merchantCountryCode: 'FR',
          testEnv: __DEV__, // Mode test en développement
          currencyCode: 'EUR',
        },
      });

      if (initError) {
        console.error('Erreur init Payment Sheet:', initError);
        throw new Error(initError.message);
      }

      setPaymentSheetEnabled(true);
      console.log('✅ Payment Sheet initialisé avec succès');

    } catch (error: any) {
      console.error('Erreur initialisation Payment Sheet:', error);
      onPaymentError(error.message || 'Erreur initialisation paiement');
    } finally {
      setLoading(false);
    }
  };

  // Paiement via Payment Sheet (cartes)
  const openPaymentSheet = async () => {
    if (!paymentSheetEnabled || loading) return;

    try {
      setLoading(true);
      console.log('💳 Ouverture Payment Sheet');
      
      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === 'Canceled') {
          console.log('💳 Paiement annulé par utilisateur');
          onPaymentCancel?.();
          return;
        }
        throw new Error(error.message);
      }

      // Paiement réussi
      console.log('✅ Paiement carte réussi:', paymentIntentId);
      onPaymentSuccess(paymentIntentId, 'card');
    } catch (error: any) {
      console.error('Erreur Payment Sheet:', error);
      onPaymentError(error.message || 'Erreur de paiement');
    } finally {
      setLoading(false);
    }
  };

  // Paiement via Apple Pay / Google Pay
  const handlePlatformPay = async () => {
    if (!platformPaySupported || loading) return;

    try {
      setLoading(true);
      console.log('🍎 Lancement Platform Pay');

      // S'assurer d'avoir le client secret
      const secretToUse = clientSecret || await createPaymentIntent();

      // Configuration Platform Pay
      const { error } = await PlatformPay.confirmPlatformPayPayment(secretToUse, {
        applePay: {
          cartItems: [{
            label: description,
            amount: amount.toFixed(2),
            paymentType: 'Immediate'
          }],
          merchantCountryCode: 'FR',
          currencyCode: 'EUR',
          requiredShippingAddressFields: [],
          requiredBillingContactFields: []
        },
        googlePay: {
          testEnv: __DEV__,
          merchantCountryCode: 'FR',
          currencyCode: 'EUR',
          label: description,
          amount: amount.toFixed(2)
        }
      });

      if (error) {
        if (error.code === 'Canceled') {
          console.log('🍎 Paiement Platform Pay annulé');
          onPaymentCancel?.();
          return;
        }
        throw new Error(error.message);
      }

      // Paiement réussi
      const paymentMethod = Platform.OS === 'ios' ? 'apple_pay' : 'google_pay';
      console.log(`✅ Paiement ${paymentMethod} réussi:`, paymentIntentId);
      onPaymentSuccess(paymentIntentId, paymentMethod);
    } catch (error: any) {
      console.error('Erreur Platform Pay:', error);
      onPaymentError(error.message || 'Erreur de paiement');
    } finally {
      setLoading(false);
    }
  };

  // Créer Payment Intent si nécessaire
  const createPaymentIntent = async (): Promise<string> => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    
    const response = await fetch(`${apiUrl}/api/payments/create-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        amount: Math.round(amount * 100),
        clientId,
        fourmizId,
        description
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    
    setClientSecret(data.clientSecret);
    setPaymentIntentId(data.paymentIntentId);
    return data.clientSecret;
  };

  // Initialisation au montage
  useEffect(() => {
    if (!disabled) {
      initializePaymentSheet();
    }
  }, [orderId, amount, disabled]);

  if (disabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.disabledText}>Paiement temporairement indisponible</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.amountContainer}>
        <Text style={styles.amountLabel}>Montant à payer</Text>
        <Text style={styles.amountValue}>{amount.toFixed(2)} €</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.paymentMethods}>
        {/* Apple Pay / Google Pay */}
        {platformPaySupported && (Platform.OS === 'ios' ? isApplePaySupported : isGooglePaySupported) && (
          <TouchableOpacity
            style={[styles.payButton, styles.platformPayButton]}
            onPress={handlePlatformPay}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons 
                  name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google'} 
                  size={20} 
                  color="#ffffff" 
                />
                <Text style={styles.platformPayText}>
                  {Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Séparateur */}
        {platformPaySupported && (Platform.OS === 'ios' ? isApplePaySupported : isGooglePaySupported) && (
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>ou</Text>
            <View style={styles.separatorLine} />
          </View>
        )}

        {/* Paiement par carte */}
        <TouchableOpacity
          style={[styles.payButton, styles.cardPayButton]}
          onPress={openPaymentSheet}
          disabled={!paymentSheetEnabled || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <>
              <Ionicons name="card-outline" size={20} color="#000000" />
              <Text style={styles.cardPayText}>Payer par carte</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.securityInfo}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#666666" />
        <Text style={styles.securityText}>
          Paiement sécurisé • Fonds bloqués jusqu'à validation du service
        </Text>
      </View>

      {/* Debug info en développement */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Debug: API={process.env.EXPO_PUBLIC_API_URL?.substring(0, 30)}... | Order={orderId}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  amountLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  paymentMethods: {
    gap: 12,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 12,
  },
  platformPayButton: {
    backgroundColor: '#000000',
  },
  platformPayText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardPayButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
  },
  cardPayText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 12,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  separatorText: {
    fontSize: 14,
    color: '#666666',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  securityText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
  disabledText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    padding: 20,
  },
  debugInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f0f4ff',
    borderRadius: 4,
  },
  debugText: {
    fontSize: 10,
    color: '#0066cc',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
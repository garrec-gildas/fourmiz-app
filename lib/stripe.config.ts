// lib/stripe.config.ts
// Configuration Stripe pour Fourmiz avec Apple Pay - REMPLACE TOUT LE FICHIER EXISTANT

import { Platform } from 'react-native';

// Clé publique Stripe TEST (celle que nous avons testée)
export const STRIPE_PUBLISHABLE_KEY = 'pk_test_51RHho6Rr2gKkUrhCa1d20LxlMVRkkqYsRjb1pGX0RBncJFvrgiOoc8idWG3Hxdu2avPKhW490Kouua5vyPiFCfT1005d4XPBlW';

// Types
export type StripePaymentMethod = 'card' | 'apple_pay' | 'google_pay' | 'paypal';

// 🍎 CONFIGURATION APPLE PAY - TEST AVEC MERCHANT ID DE DÉMONSTRATION
export const APPLE_PAY_CONFIG = {
  merchantId: 'merchant.com.lesfourmiz.fourmiz', // ✅ TEST avec Merchant ID de démonstration Stripe
  merchantDisplayName: 'Fourmiz',
  merchantCountryCode: 'FR',
  currencyCode: 'EUR',
  testEnv: __DEV__, // Mode test en développement uniquement
  supportedNetworks: ['visa', 'masterCard', 'amex'] as const,
  merchantCapabilities: 'supports3DS' as const,
  buttonType: 'pay' as const,
  borderRadius: 8
};

// 📱 CONFIGURATION GOOGLE PAY AMÉLIORÉE
export const GOOGLE_PAY_CONFIG = {
  merchantId: 'fourmiz-test',
  testEnv: __DEV__, // Mode test en développement
  currencyCode: 'EUR',
  countryCode: 'FR',
  merchantCountryCode: 'FR',
  // Paramètres additionnels pour Google Pay
  billingAddressRequired: false,
  shippingAddressRequired: false,
  allowCreditCards: true,
  allowPrepaidCards: true
};

// 🎨 THÈME STRIPE FRANÇAIS OPTIMISÉ
export const STRIPE_APPEARANCE = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#000000',
    colorBackground: '#ffffff',
    colorText: '#1a1a1a',
    colorTextSecondary: '#666666',
    colorDanger: '#dc2626',
    colorSuccess: '#059669',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    fontSizeBase: '16px',
    borderRadius: '8px',
    spacingUnit: '4px'
  },
  rules: {
    '.Input': {
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '16px'
    },
    '.Input:focus': {
      borderColor: '#000000',
      boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.1)'
    },
    '.Label': {
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151'
    }
  }
};

// 🇫🇷 MESSAGES D'ERREUR EN FRANÇAIS
export const STRIPE_ERROR_MESSAGES = {
  'card_declined': 'Carte refusée. Vérifiez vos informations ou utilisez une autre carte.',
  'expired_card': 'Carte expirée. Utilisez une carte valide.',
  'incorrect_cvc': 'Code de sécurité (CVC) incorrect.',
  'invalid_number': 'Numéro de carte invalide.',
  'incomplete_number': 'Numéro de carte incomplet.',
  'incomplete_expiry': 'Date d\'expiration incomplète.',
  'incomplete_cvc': 'Code de sécurité incomplet.',
  'processing_error': 'Erreur de traitement. Réessayez dans quelques instants.',
  'network_error': 'Erreur de connexion. Vérifiez votre connexion Internet.',
  'generic_error': 'Erreur inattendue. Veuillez réessayer.',
  'insufficient_funds': 'Fonds insuffisants sur cette carte.',
  'lost_card': 'Cette carte a été déclarée perdue. Contactez votre banque.',
  'stolen_card': 'Cette carte a été déclarée volée. Contactez votre banque.',
  'authentication_required': 'Authentification requise. Suivez les instructions de votre banque.',
  'apple_pay_not_supported': 'Apple Pay n\'est pas supporté sur cet appareil.',
  'google_pay_not_supported': 'Google Pay n\'est pas supporté sur cet appareil.'
} as const;

// 💰 FONCTIONS UTILITAIRES FORMATAGE
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatAmountForStripe = (amount: number): number => {
  // Stripe attend les montants en centimes pour EUR
  return Math.round(amount * 100);
};

export const formatAmountFromStripe = (amountInCents: number): number => {
  // Convertir les centimes en euros
  return amountInCents / 100;
};

// ✅ VALIDATION MONTANTS
export const validateAmount = (amount: number): { valid: boolean; error?: string } => {
  if (amount <= 0) {
    return { valid: false, error: 'Le montant doit être supérieur à 0€' };
  }
  
  if (amount > 10000) {
    return { valid: false, error: 'Le montant ne peut pas dépasser 10 000€' };
  }
  
  if (amount < 0.5) {
    return { valid: false, error: 'Le montant minimum est de 0,50€' };
  }
  
  return { valid: true };
};

// 🔍 DÉTECTION MOYENS DE PAIEMENT DISPONIBLES
export const getAvailablePaymentMethods = (platform: 'ios' | 'android'): StripePaymentMethod[] => {
  console.log(`🔍 Détection moyens de paiement pour ${platform}`);
  
  const baseMethods: StripePaymentMethod[] = ['card'];
  
  if (platform === 'ios') {
    // ✅ Apple Pay disponible sur iOS uniquement
    const methods = [...baseMethods, 'apple_pay'];
    console.log('🍎 Apple Pay ajouté pour iOS');
    return methods;
  } else if (platform === 'android') {
    // Google Pay disponible sur Android uniquement
    const methods = [...baseMethods, 'google_pay'];
    console.log('📱 Google Pay ajouté pour Android');
    return methods;
  }
  
  console.log('💳 Seulement cartes bancaires disponibles');
  return baseMethods;
};

// 🎨 ICÔNES MOYENS DE PAIEMENT
export const getPaymentMethodIcon = (method: StripePaymentMethod): string => {
  const iconMap: Record<StripePaymentMethod, string> = {
    card: 'card-outline',
    apple_pay: 'logo-apple', 
    google_pay: 'logo-google',
    paypal: 'logo-paypal'
  };
  return iconMap[method] || 'card-outline';
};

// 🏷️ LIBELLÉS MOYENS DE PAIEMENT EN FRANÇAIS
export const getPaymentMethodLabel = (method: StripePaymentMethod): string => {
  const labelMap: Record<StripePaymentMethod, string> = {
    card: 'Carte bancaire',
    apple_pay: 'Apple Pay',
    google_pay: 'Google Pay', 
    paypal: 'PayPal'
  };
  return labelMap[method] || 'Paiement';
};

// 🔧 CONFIGURATION PAYMENT SHEET PAR DÉFAUT
export const getDefaultPaymentSheetConfig = (amount: number, description: string) => ({
  // Configuration commune
  merchantDisplayName: APPLE_PAY_CONFIG.merchantDisplayName,
  returnURL: 'fourmiz://payment-return',
  appearance: STRIPE_APPEARANCE,
  
  // Détails de facturation par défaut
  defaultBillingDetails: {
    address: {
      country: 'FR',
    }
  },
  
  // Désactiver les méthodes de paiement différées
  allowsDelayedPaymentMethods: false,
  
  // Configuration Apple Pay
  ...(Platform.OS === 'ios' && {
    applePay: {
      merchantId: APPLE_PAY_CONFIG.merchantId,
      merchantCountryCode: APPLE_PAY_CONFIG.merchantCountryCode,
      currencyCode: APPLE_PAY_CONFIG.currencyCode,
      paymentSummaryItems: [
        {
          label: description,
          amount: formatAmountForStripe(amount).toString(),
          type: 'Final' as const,
        }
      ],
      buttonType: APPLE_PAY_CONFIG.buttonType,
      borderRadius: APPLE_PAY_CONFIG.borderRadius,
      merchantCapabilities: APPLE_PAY_CONFIG.merchantCapabilities,
      supportedNetworks: APPLE_PAY_CONFIG.supportedNetworks,
      testEnv: APPLE_PAY_CONFIG.testEnv,
    }
  }),
  
  // Configuration Google Pay
  ...(Platform.OS === 'android' && {
    googlePay: {
      merchantId: GOOGLE_PAY_CONFIG.merchantId,
      testEnv: GOOGLE_PAY_CONFIG.testEnv,
      currencyCode: GOOGLE_PAY_CONFIG.currencyCode,
      countryCode: GOOGLE_PAY_CONFIG.countryCode,
      merchantCountryCode: GOOGLE_PAY_CONFIG.merchantCountryCode,
      billingAddressRequired: GOOGLE_PAY_CONFIG.billingAddressRequired,
      shippingAddressRequired: GOOGLE_PAY_CONFIG.shippingAddressRequired,
    }
  }),
  
  // Types de moyens de paiement supportés
  paymentMethodTypes: Platform.OS === 'ios' 
    ? ['card', 'applePay'] as const
    : ['card'] as const, // Google Pay sera ajouté plus tard si nécessaire
});

// 🚨 GESTION D'ERREURS STRIPE
export const handleStripeError = (error: any): string => {
  console.error('🚨 Erreur Stripe:', error);
  
  if (!error) {
    return STRIPE_ERROR_MESSAGES.generic_error;
  }
  
  // Erreurs spécifiques Stripe
  const errorCode = error.code || error.type;
  if (errorCode && STRIPE_ERROR_MESSAGES[errorCode as keyof typeof STRIPE_ERROR_MESSAGES]) {
    return STRIPE_ERROR_MESSAGES[errorCode as keyof typeof STRIPE_ERROR_MESSAGES];
  }
  
  // Erreurs réseau
  if (error.message?.includes('network') || error.message?.includes('connection')) {
    return STRIPE_ERROR_MESSAGES.network_error;
  }
  
  // Message d'erreur personnalisé si disponible
  if (error.message) {
    return error.message;
  }
  
  // Erreur générique
  return STRIPE_ERROR_MESSAGES.generic_error;
};

// 📊 MÉTRIQUES ET LOGGING
export const logPaymentEvent = (event: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`💳 [${timestamp}] Stripe Event: ${event}`, data || '');
  
  // Ici vous pourriez envoyer vers votre service d'analytics
  // Analytics.track('stripe_payment_event', { event, data, timestamp });
};

// 🎯 CONSTANTES UTILES
export const PAYMENT_CONSTANTS = {
  MIN_AMOUNT: 0.5, // Minimum 0,50€
  MAX_AMOUNT: 10000, // Maximum 10 000€
  CURRENCY: 'EUR',
  COUNTRY: 'FR',
  RETRY_ATTEMPTS: 3,
  TIMEOUT_MS: 30000, // 30 secondes
} as const;

// 🔐 VALIDATION SÉCURITÉ
export const validatePaymentData = (data: {
  amount: number;
  currency?: string;
  orderId?: number;
}) => {
  const errors: string[] = [];
  
  // Validation du montant
  const amountValidation = validateAmount(data.amount);
  if (!amountValidation.valid) {
    errors.push(amountValidation.error!);
  }
  
  // Validation de la devise
  if (data.currency && data.currency !== PAYMENT_CONSTANTS.CURRENCY) {
    errors.push(`Devise non supportée: ${data.currency}. Seul EUR est accepté.`);
  }
  
  // Validation de l'ID commande
  if (data.orderId !== undefined && (data.orderId < 0 || !Number.isInteger(data.orderId))) {
    errors.push('ID de commande invalide.');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};
// types/payment.types.ts
// Types TypeScript pour le système de pré-autorisation de paiement

// Statuts possibles pour les paiements
export type PaymentStatus = 
  | 'pending'               // En attente
  | 'authorized'            // Pré-autorisé
  | 'captured'              // Capturé (débité)
  | 'failed'                // Échec
  | 'canceled'              // Annulé
  | 'authorization_expired' // Autorisation expirée
  | 'refunded'              // Remboursé
  | 'partially_refunded';   // Partiellement remboursé

// Interface pour une demande de pré-autorisation
export interface PaymentAuthorizationRequest {
  orderId: number;
  amount: number;
  currency?: string;
  description?: string;
  capture_method: 'manual';
  confirmation_method?: 'automatic' | 'manual';
  authorization_expires_days?: number;
  metadata?: {
    order_id: string;
    service_title?: string;
    platform?: string;
    type: 'authorization';
    [key: string]: any;
  };
}

// Interface pour une capture de paiement
export interface PaymentCaptureRequest {
  payment_intent_id: string;
  order_id: number;
  fourmiz_id: number;
  amount_to_capture?: number; // Optionnel pour capture partielle
  metadata?: {
    fourmiz_id: string;
    assignment_date: string;
    [key: string]: any;
  };
}

// Interface pour l'annulation d'une autorisation
export interface PaymentCancelRequest {
  payment_intent_id: string;
  order_id: number;
  reason: string;
  cancellation_reason?: 
    | 'duplicate'
    | 'fraudulent'
    | 'requested_by_customer'
    | 'abandoned'
    | 'expired';
}

// Statut détaillé d'une autorisation
export interface AuthorizationStatus {
  payment_intent_id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  created_at: string;
  expires_at: string;
  captured_at?: string;
  canceled_at?: string;
  can_capture: boolean;
  can_cancel: boolean;
  days_until_expiry: number;
  metadata?: Record<string, any>;
}

// Réponse d'une opération de paiement
export interface PaymentOperationResponse {
  success: boolean;
  payment_intent_id?: string;
  status?: PaymentStatus;
  amount?: number;
  error?: string;
  details?: {
    stripe_error_code?: string;
    stripe_error_type?: string;
    decline_code?: string;
    network_status?: string;
  };
}

// Statistiques des autorisations
export interface AuthorizationStats {
  active_authorizations: number;
  expired_authorizations: number;
  captured_today: number;
  total_authorized_amount: number;
  total_captured_amount: number;
  authorization_success_rate: number;
  capture_success_rate: number;
  average_time_to_capture_hours: number;
  timestamp: string;
}

// Configuration des autorisations
export interface AuthorizationConfig {
  default_expiry_days: number;
  max_expiry_days: number;
  min_amount_cents: number;
  max_amount_cents: number;
  auto_cancel_on_expiry: boolean;
  send_expiry_notifications: boolean;
  notification_hours_before_expiry: number[];
}

// Événement d'autorisation (pour historique)
export interface AuthorizationEvent {
  id: string;
  payment_intent_id: string;
  order_id: number;
  event_type: 
    | 'authorization_created'
    | 'authorization_confirmed'
    | 'capture_attempted'
    | 'capture_succeeded'
    | 'capture_failed'
    | 'authorization_canceled'
    | 'authorization_expired';
  amount?: number;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
  created_by: 'system' | 'user' | 'admin';
}

// Interface pour les webhooks Stripe
export interface StripeWebhookEvent {
  id: string;
  object: 'event';
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request?: {
    id: string;
    idempotency_key?: string;
  };
}

// Types spécifiques aux PaymentIntents Stripe
export interface StripePaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number;
  currency: string;
  status: 
    | 'requires_payment_method'
    | 'requires_confirmation'
    | 'requires_action'
    | 'processing'
    | 'requires_capture'
    | 'canceled'
    | 'succeeded';
  capture_method: 'automatic' | 'manual';
  confirmation_method: 'automatic' | 'manual';
  created: number;
  description?: string;
  metadata: Record<string, string>;
  client_secret: string;
  charges?: {
    data: StripeCharge[];
  };
}

// Interface pour les charges Stripe
export interface StripeCharge {
  id: string;
  object: 'charge';
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  captured: boolean;
  created: number;
  description?: string;
  metadata: Record<string, string>;
  payment_intent: string;
}

// Interface pour les erreurs de paiement
export interface PaymentError {
  type: 
    | 'api_error'
    | 'card_error'
    | 'idempotency_error'
    | 'invalid_request_error'
    | 'rate_limit_error'
    | 'authentication_error'
    | 'authorization_error';
  code?: string;
  decline_code?: string;
  message: string;
  param?: string;
  payment_intent_id?: string;
  charge_id?: string;
}

// Interface pour les notifications d'expiration
export interface ExpiryNotification {
  order_id: number;
  client_id: string;
  service_title: string;
  amount: number;
  expires_at: string;
  hours_until_expiry: number;
  notification_type: 'warning' | 'final_warning' | 'expired';
}

// Interface pour les métriques de performance
export interface PaymentMetrics {
  period: 'day' | 'week' | 'month' | 'year';
  start_date: string;
  end_date: string;
  authorizations_created: number;
  authorizations_captured: number;
  authorizations_expired: number;
  authorizations_canceled: number;
  total_authorized_amount: number;
  total_captured_amount: number;
  average_authorization_to_capture_time_hours: number;
  authorization_success_rate: number;
  capture_success_rate: number;
  expiry_rate: number;
}

// Utilitaires de type
export type PaymentIntentId = string;
export type OrderId = number;
export type FourmizId = number;
export type AmountInCents = number;
export type AmountInEuros = number;

// Guards de type pour vérifications runtime
export const isValidPaymentStatus = (status: string): status is PaymentStatus => {
  return [
    'pending',
    'authorized', 
    'captured',
    'failed',
    'canceled',
    'authorization_expired',
    'refunded',
    'partially_refunded'
  ].includes(status);
};

export const isExpiredAuthorization = (authStatus: AuthorizationStatus): boolean => {
  return new Date(authStatus.expires_at) < new Date();
};

export const canCaptureAuthorization = (authStatus: AuthorizationStatus): boolean => {
  return authStatus.status === 'authorized' && 
         authStatus.can_capture && 
         !isExpiredAuthorization(authStatus);
};

export const canCancelAuthorization = (authStatus: AuthorizationStatus): boolean => {
  return authStatus.status === 'authorized' && 
         authStatus.can_cancel;
};
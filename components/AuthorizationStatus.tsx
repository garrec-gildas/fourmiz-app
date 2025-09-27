// components/AuthorizationStatus.tsx
// Composant pour afficher le statut d'autorisation de paiement d'une commande

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PaymentStatus } from '../types/payment.types';

interface AuthorizationStatusProps {
  paymentStatus: PaymentStatus;
  authorizationExpiresAt?: string;
  paymentAuthorizedAt?: string;
  paymentCapturedAt?: string;
  proposedAmount: number;
  onCancelAuthorization?: () => void;
  showCancelButton?: boolean;
  compact?: boolean;
}

export const AuthorizationStatus: React.FC<AuthorizationStatusProps> = ({
  paymentStatus,
  authorizationExpiresAt,
  paymentAuthorizedAt,
  paymentCapturedAt,
  proposedAmount,
  onCancelAuthorization,
  showCancelButton = false,
  compact = false
}) => {
  
  // Calculer les informations d'affichage
  const statusInfo = useMemo(() => {
    const now = new Date();
    const expiresAt = authorizationExpiresAt ? new Date(authorizationExpiresAt) : null;
    const authorizedAt = paymentAuthorizedAt ? new Date(paymentAuthorizedAt) : null;
    const capturedAt = paymentCapturedAt ? new Date(paymentCapturedAt) : null;

    const formatAmount = (amount: number) => `${amount.toFixed(2)}€`;

    switch (paymentStatus) {
      case 'authorized':
        const isExpired = expiresAt && expiresAt < now;
        const hoursUntilExpiry = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))) : 0;
        
        if (isExpired) {
          return {
            icon: 'time-outline' as const,
            iconColor: '#ff6b6b',
            bgColor: '#fff5f5',
            borderColor: '#ff6b6b',
            title: 'Autorisation expirée',
            subtitle: `${formatAmount(proposedAmount)} - Expirée le ${expiresAt?.toLocaleDateString('fr-FR')}`,
            message: 'Cette autorisation a expiré. Aucun montant n\'a été débité.',
            urgent: true
          };
        }

        const isUrgent = hoursUntilExpiry <= 24;
        
        return {
          icon: 'shield-checkmark-outline' as const,
          iconColor: isUrgent ? '#f59e0b' : '#10b981',
          bgColor: isUrgent ? '#fffbeb' : '#f0fdf4',
          borderColor: isUrgent ? '#f59e0b' : '#10b981',
          title: 'Paiement pré-autorisé',
          subtitle: `${formatAmount(proposedAmount)} - ${hoursUntilExpiry}h restantes`,
          message: `Débité dès qu'une Fourmiz accepte votre mission. Expire le ${expiresAt?.toLocaleDateString('fr-FR')} à ${expiresAt?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
          urgent: isUrgent,
          canCancel: true
        };

      case 'captured':
        return {
          icon: 'checkmark-circle' as const,
          iconColor: '#059669',
          bgColor: '#ecfdf5',
          borderColor: '#059669',
          title: 'Paiement effectué',
          subtitle: `${formatAmount(proposedAmount)} - Débité le ${capturedAt?.toLocaleDateString('fr-FR')}`,
          message: 'Le paiement a été effectué avec succès. Votre mission est confirmée.',
          urgent: false
        };

      case 'canceled':
        return {
          icon: 'close-circle-outline' as const,
          iconColor: '#6b7280',
          bgColor: '#f9fafb',
          borderColor: '#6b7280',
          title: 'Autorisation annulée',
          subtitle: `${formatAmount(proposedAmount)} - Annulée`,
          message: 'L\'autorisation a été annulée. Aucun montant n\'a été débité.',
          urgent: false
        };

      case 'authorization_expired':
        return {
          icon: 'time-outline' as const,
          iconColor: '#dc2626',
          bgColor: '#fef2f2',
          borderColor: '#dc2626',
          title: 'Autorisation expirée',
          subtitle: `${formatAmount(proposedAmount)} - Expirée automatiquement`,
          message: 'Aucune Fourmiz n\'a accepté dans les 7 jours. Aucun montant n\'a été débité.',
          urgent: false
        };

      case 'failed':
        return {
          icon: 'alert-circle-outline' as const,
          iconColor: '#dc2626',
          bgColor: '#fef2f2',
          borderColor: '#dc2626',
          title: 'Échec du paiement',
          subtitle: `${formatAmount(proposedAmount)} - Échec`,
          message: 'Le paiement a échoué. Veuillez réessayer avec une autre méthode.',
          urgent: true
        };

      case 'refunded':
        return {
          icon: 'arrow-back-circle-outline' as const,
          iconColor: '#6366f1',
          bgColor: '#eef2ff',
          borderColor: '#6366f1',
          title: 'Paiement remboursé',
          subtitle: `${formatAmount(proposedAmount)} - Remboursé`,
          message: 'Le montant a été remboursé sur votre compte.',
          urgent: false
        };

      default:
        return {
          icon: 'help-circle-outline' as const,
          iconColor: '#6b7280',
          bgColor: '#f9fafb',
          borderColor: '#6b7280',
          title: 'Statut inconnu',
          subtitle: `${formatAmount(proposedAmount)}`,
          message: 'Statut de paiement non reconnu.',
          urgent: false
        };
    }
  }, [paymentStatus, authorizationExpiresAt, paymentAuthorizedAt, paymentCapturedAt, proposedAmount]);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderLeftColor: statusInfo.borderColor }]}>
        <Ionicons name={statusInfo.icon} size={16} color={statusInfo.iconColor} />
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle}>{statusInfo.title}</Text>
          <Text style={styles.compactSubtitle}>{statusInfo.subtitle}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: statusInfo.bgColor,
        borderColor: statusInfo.borderColor
      },
      statusInfo.urgent && styles.urgentPulse
    ]}>
      {/* En-tête avec icône et titre */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name={statusInfo.icon} size={20} color={statusInfo.iconColor} />
          <Text style={[styles.title, { color: statusInfo.iconColor }]}>
            {statusInfo.title}
          </Text>
        </View>
        
        {statusInfo.urgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>!</Text>
          </View>
        )}
      </View>

      {/* Montant et informations */}
      <Text style={styles.subtitle}>{statusInfo.subtitle}</Text>
      
      {/* Message détaillé */}
      <Text style={styles.message}>{statusInfo.message}</Text>

      {/* Actions */}
      {showCancelButton && statusInfo.canCancel && onCancelAuthorization && (
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={onCancelAuthorization}
        >
          <Ionicons name="close-outline" size={16} color="#dc2626" />
          <Text style={styles.cancelButtonText}>Annuler l'autorisation</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  
  compactContent: {
    flex: 1,
  },
  
  compactTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  
  compactSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  title: {
    fontSize: 14,
    fontWeight: '600',
  },

  urgentBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },

  urgentText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },

  message: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
    marginBottom: 12,
  },

  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dc2626',
    backgroundColor: '#ffffff',
    gap: 6,
    alignSelf: 'flex-start',
  },

  cancelButtonText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },

  urgentPulse: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default AuthorizationStatus;
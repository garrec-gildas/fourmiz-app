// hooks/useOrderTimeout.ts - Hook pour gérer les commandes sans validation
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

interface TimeoutOrder {
  id: number;
  service_title?: string;
  created_at: string;
  proposed_amount: number;
  status: string;
  services?: {
    title: string;
  };
  hoursWaiting: number;
}

export const useOrderTimeout = (userId: string | null) => {
  const [timeoutOrders, setTimeoutOrders] = useState<TimeoutOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Configuration des délais (en heures)
  const TIMEOUT_CONFIG = {
    WARNING_THRESHOLD: 12, // Avertissement après 12h
    CRITICAL_THRESHOLD: 24, // Critique après 24h
    AUTO_CANCEL_THRESHOLD: 48, // Annulation automatique après 48h
    REPOST_THRESHOLD: 72 // Republication automatique après 72h
  };

  const checkTimeoutOrders = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Récupérer les commandes en attente depuis plus de 12h
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          service_title,
          created_at,
          proposed_amount,
          status,
          services (
            title
          )
        `)
        .eq('client_id', userId)
        .eq('status', 'en_attente')
        .lt('created_at', new Date(Date.now() - TIMEOUT_CONFIG.WARNING_THRESHOLD * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const timeoutOrdersWithHours = orders?.map(order => {
        const createdAt = new Date(order.created_at);
        const now = new Date();
        const hoursWaiting = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));

        return {
          ...order,
          hoursWaiting
        };
      }) || [];

      setTimeoutOrders(timeoutOrdersWithHours);

      // Traitement automatique des commandes critiques
      await processTimeoutOrders(timeoutOrdersWithHours);

    } catch (error) {
      console.error('Erreur vérification timeout:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTimeoutOrders = async (orders: TimeoutOrder[]) => {
    for (const order of orders) {
      const { hoursWaiting } = order;

      if (hoursWaiting >= TIMEOUT_CONFIG.AUTO_CANCEL_THRESHOLD) {
        await handleAutoCancelOrder(order);
      } else if (hoursWaiting >= TIMEOUT_CONFIG.CRITICAL_THRESHOLD) {
        await handleCriticalTimeoutOrder(order);
      }
    }
  };

  const handleAutoCancelOrder = async (order: TimeoutOrder) => {
    try {
      // Marquer comme expirée au lieu d'annulée
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'expiree',
          updated_at: new Date().toISOString(),
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'system',
          cancellation_reason: 'Aucune Fourmiz disponible dans les délais'
        })
        .eq('id', order.id);

      if (error) throw error;

      // Créer une notification pour le client
      await createTimeoutNotification(order, 'expired');

      console.log(`✅ Commande ${order.id} expirée automatiquement après ${order.hoursWaiting}h`);

    } catch (error) {
      console.error('Erreur annulation automatique:', error);
    }
  };

  const handleCriticalTimeoutOrder = async (order: TimeoutOrder) => {
    try {
      // Créer notification critique
      await createTimeoutNotification(order, 'critical');

      // Optionnel: Relancer avec montant majoré
      await suggestPriceIncrease(order);

    } catch (error) {
      console.error('Erreur gestion critique:', error);
    }
  };

  const createTimeoutNotification = async (order: TimeoutOrder, type: 'warning' | 'critical' | 'expired') => {
    const messages = {
      warning: `⏰ Votre commande "${getOrderTitle(order)}" attend depuis ${order.hoursWaiting}h sans réponse de Fourmiz`,
      critical: `🚨 Votre commande "${getOrderTitle(order)}" attend depuis ${order.hoursWaiting}h. Aucune Fourmiz disponible pour le moment`,
      expired: `❌ Votre commande "${getOrderTitle(order)}" a expiré après ${order.hoursWaiting}h sans validation. Elle a été automatiquement annulée`
    };

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: order.client_id,
          title: type === 'expired' ? 'Commande expirée' : 'Commande en attente',
          message: messages[type],
          type: type === 'expired' ? 'order_expired' : 'order_timeout',
          related_order_id: order.id,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur création notification:', error);
    }
  };

  const suggestPriceIncrease = async (order: TimeoutOrder) => {
    // Suggérer une augmentation de 20% du montant
    const suggestedAmount = Math.ceil(order.proposed_amount * 1.2);
    
    try {
      const { error } = await supabase
        .from('price_suggestions')
        .insert({
          order_id: order.id,
          original_amount: order.proposed_amount,
          suggested_amount: suggestedAmount,
          reason: 'timeout_no_fourmiz',
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur suggestion prix:', error);
    }
  };

  const getOrderTitle = (order: TimeoutOrder): string => {
    return order.service_title || order.services?.title || 'Service';
  };

  // Actions manuelles disponibles pour l'utilisateur
  const repostOrder = async (orderId: number) => {
    try {
      // Dupliquer la commande avec un nouveau timestamp
      const { data: originalOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      // Créer nouvelle commande basée sur l'originale
      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          ...originalOrder,
          id: undefined, // Laisse la DB générer un nouvel ID
          created_at: new Date().toISOString(),
          updated_at: null,
          status: 'en_attente',
          fourmiz_id: null,
          accepted_at: null,
          cancelled_at: null,
          cancelled_by: null
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Marquer l'ancienne comme remplacée
      await supabase
        .from('orders')
        .update({
          status: 'remplacee',
          updated_at: new Date().toISOString(),
          replacement_order_id: newOrder.id
        })
        .eq('id', orderId);

      return newOrder;

    } catch (error) {
      console.error('Erreur republication:', error);
      throw error;
    }
  };

  const increaseBudget = async (orderId: number, newAmount: number) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          proposed_amount: newAmount,
          updated_at: new Date().toISOString(),
          price_updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Notification aux Fourmiz qu'une commande a augmenté son budget
      await notifyFourmizPriceIncrease(orderId, newAmount);

    } catch (error) {
      console.error('Erreur augmentation budget:', error);
      throw error;
    }
  };

  const notifyFourmizPriceIncrease = async (orderId: number, newAmount: number) => {
    try {
      // Récupérer les Fourmiz de la zone
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('postal_code, city')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Notifier les Fourmiz actives dans la zone
      const { data: fourmizInZone, error: fourmizError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'fourmiz')
        .eq('is_active', true)
        .or(`postal_code.eq.${order.postal_code},city.ilike.%${order.city}%`);

      if (fourmizError) throw fourmizError;

      // Créer notifications pour chaque Fourmiz
      const notifications = fourmizInZone?.map(fourmiz => ({
        user_id: fourmiz.id,
        title: '💰 Budget augmenté',
        message: `Une commande dans votre zone a augmenté son budget à ${newAmount}€`,
        type: 'budget_increase',
        related_order_id: orderId,
        created_at: new Date().toISOString()
      })) || [];

      if (notifications.length > 0) {
        await supabase
          .from('notifications')
          .insert(notifications);
      }

    } catch (error) {
      console.error('Erreur notification Fourmiz:', error);
    }
  };

  return {
    timeoutOrders,
    loading,
    checkTimeoutOrders,
    repostOrder,
    increaseBudget,
    TIMEOUT_CONFIG
  };
};

// Composant d'alerte pour les commandes en timeout
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TimeoutAlertProps {
  order: TimeoutOrder;
  onRepost: (orderId: number) => void;
  onIncreaseBudget: (orderId: number) => void;
  onCancel: (orderId: number) => void;
}

export const TimeoutAlert: React.FC<TimeoutAlertProps> = ({
  order,
  onRepost,
  onIncreaseBudget,
  onCancel
}) => {
  const getAlertLevel = () => {
    if (order.hoursWaiting >= 48) return 'critical';
    if (order.hoursWaiting >= 24) return 'warning';
    return 'info';
  };

  const alertLevel = getAlertLevel();
  
  const alertStyles = {
    info: { bg: '#e6f3ff', border: '#0066cc', icon: 'information-circle' as const },
    warning: { bg: '#fff3cd', border: '#ff9500', icon: 'warning' as const },
    critical: { bg: '#f8d7da', border: '#dc3545', icon: 'alert-circle' as const }
  };

  const currentStyle = alertStyles[alertLevel];

  const handleIncreaseBudget = () => {
    const suggestedAmount = Math.ceil(order.proposed_amount * 1.2);
    
    Alert.alert(
      '💰 Augmenter le budget',
      `Aucune Fourmiz n'a accepté votre commande depuis ${order.hoursWaiting}h.\n\nVoulez-vous augmenter le budget de ${order.proposed_amount}€ à ${suggestedAmount}€ pour attirer plus de Fourmiz ?`,
      [
        { text: 'Non merci', style: 'cancel' },
        { 
          text: `Oui, ${suggestedAmount}€`, 
          onPress: () => onIncreaseBudget(order.id)
        }
      ]
    );
  };

  const handleRepost = () => {
    Alert.alert(
      '🔄 Republier la commande',
      'Votre commande va être republiée avec la date/heure actuelle pour être plus visible par les Fourmiz.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Republier', 
          onPress: () => onRepost(order.id)
        }
      ]
    );
  };

  return (
    <View style={[styles.alertContainer, { 
      backgroundColor: currentStyle.bg,
      borderColor: currentStyle.border 
    }]}>
      <View style={styles.alertHeader}>
        <Ionicons name={currentStyle.icon} size={24} color={currentStyle.border} />
        <View style={styles.alertContent}>
          <Text style={[styles.alertTitle, { color: currentStyle.border }]}>
            {alertLevel === 'critical' ? 'Commande en difficulté' : 
             alertLevel === 'warning' ? 'Commande en attente' : 
             'Pas encore de réponse'}
          </Text>
          <Text style={styles.alertMessage}>
            Votre commande "{order.service_title || order.services?.title}" attend depuis {order.hoursWaiting}h sans validation.
          </Text>
        </View>
      </View>

      <View style={styles.alertActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleIncreaseBudget}
        >
          <Ionicons name="trending-up" size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>Augmenter le budget</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleRepost}
        >
          <Ionicons name="refresh" size={16} color="#0066cc" />
          <Text style={styles.secondaryButtonText}>Republier</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.dangerButton]}
          onPress={() => onCancel(order.id)}
        >
          <Ionicons name="close" size={16} color="#dc3545" />
          <Text style={styles.dangerButtonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  alertContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    flex: 1,
    minWidth: 100,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#0066cc',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#e6f3ff',
    borderWidth: 1,
    borderColor: '#0066cc',
  },
  secondaryButtonText: {
    color: '#0066cc',
    fontSize: 12,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  dangerButtonText: {
    color: '#dc3545',
    fontSize: 12,
    fontWeight: '600',
  },
});
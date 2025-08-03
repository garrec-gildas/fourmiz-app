// src/hooks/useOrders.ts - HOOK COMPLET POUR LA GESTION DES COMMANDES
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export interface Order {
  id: number;
  client_id: string;
  service_id: number;
  fourmiz_id?: string;
  proposed_amount: number;
  description: string;
  urgency_level: 'normal' | '30min' | '1hour' | '2hours';
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  confirmed_by_fourmiz: boolean;
  accepted_at?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  rating?: number;
  feedback?: string;
  invoice_url?: string;
  urgency_surcharge: number;
  cancellation_fee: number;
  created_at: string;
  updated_at: string;
  
  // Données jointes
  service_title?: string;
  service_category?: string;
  client_name?: string;
  client_email?: string;
  fourmiz_name?: string;
  fourmiz_email?: string;
  urgency_display?: string;
  minutes_since_created?: number;
}

export interface OrderStats {
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total_amount: number;
  urgent_count: number;
}

// Hook principal pour gérer les commandes
export const useOrders = (userId?: string, userRole?: 'client' | 'fourmiz') => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OrderStats>({
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    total_amount: 0,
    urgent_count: 0,
  });

  // Récupérer les commandes selon le rôle
  const fetchOrders = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('orders_detailed').select('*');

      if (userRole === 'client') {
        query = query.eq('client_id', userId);
      } else if (userRole === 'fourmiz') {
        query = query.eq('fourmiz_id', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
      calculateStats(data || []);
    } catch (err: any) {
      console.error('Erreur récupération commandes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  // Calculer les statistiques
  const calculateStats = (orderList: Order[]) => {
    const stats: OrderStats = {
      pending: orderList.filter(o => o.status === 'PENDING').length,
      in_progress: orderList.filter(o => o.status === 'IN_PROGRESS').length,
      completed: orderList.filter(o => o.status === 'COMPLETED').length,
      cancelled: orderList.filter(o => o.status === 'CANCELLED').length,
      total_amount: orderList
        .filter(o => ['COMPLETED', 'IN_PROGRESS'].includes(o.status))
        .reduce((sum, o) => sum + o.proposed_amount, 0),
      urgent_count: orderList.filter(o => 
        o.urgency_level !== 'normal' && o.status === 'PENDING'
      ).length,
    };
    setStats(stats);
  };

  // Accepter une commande (côté fourmiz)
  const acceptOrder = useCallback(async (orderId: number) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'ACCEPTED',
          fourmiz_id: userId,
          confirmed_by_fourmiz: true,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      await fetchOrders();
      return { success: true };
    } catch (error: any) {
      console.error('Erreur acceptation commande:', error);
      Alert.alert('Erreur', 'Impossible d\'accepter la commande');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [userId, fetchOrders]);

  // Annuler une commande
  const cancelOrder = useCallback(async (orderId: number, reason?: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('cancel_order', {
        p_order_id: orderId,
        p_cancelled_by: userId,
        p_reason: reason
      });

      if (error) throw error;

      if (data.success) {
        await fetchOrders();
        
        if (data.cancellation_fee > 0) {
          Alert.alert(
            'Commande annulée',
            `Des frais d'annulation de ${data.cancellation_fee}€ s'appliquent pour cette commande urgente.`
          );
        } else {
          Alert.alert('Commande annulée', 'La commande a été annulée avec succès.');
        }
        
        return { success: true, cancellation_fee: data.cancellation_fee };
      } else {
        Alert.alert('Erreur', data.error);
        return { success: false, error: data.error };
      }
    } catch (error: any) {
      console.error('Erreur annulation commande:', error);
      Alert.alert('Erreur', 'Impossible d\'annuler la commande');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [userId, fetchOrders]);

  // Marquer une commande comme terminée
  const completeOrder = useCallback(async (orderId: number) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('orders')
        .update({ status: 'COMPLETED' })
        .eq('id', orderId);

      if (error) throw error;

      await fetchOrders();
      Alert.alert('Succès', 'Mission marquée comme terminée');
      return { success: true };
    } catch (error: any) {
      console.error('Erreur completion commande:', error);
      Alert.alert('Erreur', 'Impossible de terminer la commande');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [fetchOrders]);

  // Évaluer une commande terminée
  const rateOrder = useCallback(async (orderId: number, rating: number, feedback?: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('orders')
        .update({ rating, feedback })
        .eq('id', orderId);

      if (error) throw error;

      await fetchOrders();
      Alert.alert('Merci !', 'Votre évaluation a été enregistrée');
      return { success: true };
    } catch (error: any) {
      console.error('Erreur évaluation commande:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'évaluation');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [fetchOrders]);

  // Récupérer les commandes urgentes (pour les fourmiz)
  const fetchUrgentOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('urgent_orders')
        .select('*')
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Erreur commandes urgentes:', error);
      return [];
    }
  }, []);

  // Obtenir le prix recommandé pour un service
  const getRecommendedPrice = useCallback(async (serviceId: number, urgencyLevel: string = 'normal') => {
    try {
      const { data, error } = await supabase.rpc('get_recommended_price', {
        p_service_id: serviceId,
        p_urgency_level: urgencyLevel
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Erreur prix recommandé:', error);
      return null;
    }
  }, []);

  // Créer une nouvelle commande
  const createOrder = useCallback(async (orderData: {
    serviceId: number;
    proposedAmount: number;
    description: string;
    urgencyLevel?: string;
  }) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('create_order', {
        p_client_id: userId,
        p_service_id: orderData.serviceId,
        p_proposed_amount: orderData.proposedAmount,
        p_description: orderData.description,
        p_urgency_level: orderData.urgencyLevel || 'normal'
      });

      if (error) throw error;

      if (data.success) {
        await fetchOrders();
        return { success: true, orderId: data.order_id };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error: any) {
      console.error('Erreur création commande:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [userId, fetchOrders]);

  const refetch = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (userId && userRole) {
      fetchOrders();
      
      // Actualisation automatique toutes les 30 secondes pour les commandes urgentes
      const interval = setInterval(fetchOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchOrders, userId, userRole]);

  return {
    orders,
    loading,
    error,
    stats,
    actions: {
      refetch,
      acceptOrder,
      cancelOrder,
      completeOrder,
      rateOrder,
      createOrder,
      getRecommendedPrice,
      fetchUrgentOrders,
    },
  };
};

// Hook spécialisé pour les commandes client
export const useClientOrders = (clientId?: string) => {
  return useOrders(clientId, 'client');
};

// Hook spécialisé pour les commandes fourmiz
export const useFourmizOrders = (fourmizId?: string) => {
  return useOrders(fourmizId, 'fourmiz');
};

// Hook pour les commandes urgentes (pour toutes les fourmiz)
export const useUrgentOrders = () => {
  const [urgentOrders, setUrgentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUrgentOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('urgent_orders')
        .select('*')
        .limit(50);

      if (error) throw error;
      setUrgentOrders(data || []);
    } catch (error) {
      console.error('Erreur commandes urgentes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUrgentOrders();
    
    // Actualisation plus fréquente pour les urgences (15 secondes)
    const interval = setInterval(fetchUrgentOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchUrgentOrders]);

  return {
    urgentOrders,
    loading,
    refetch: fetchUrgentOrders,
  };
};
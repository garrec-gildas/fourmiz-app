// app/(tabs)/available-orders.tsx - VERSION LIBRE SANS RESTRICTION DE RÔLE
// ✅ ACCÈS LIBRE : Tous les utilisateurs connectés
// 🛠️ CORRIGÉ : Gestion des erreurs et validation des données améliorées

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface Service {
  id: number;
  title: string;
  category: string;
  description?: string;
}

interface ClientProfile {
  firstname: string;
  lastname: string;
  total_orders: number;
}

interface Order {
  id: number;
  client_id: string;
  service_id: number;
  status: 'en_attente' | 'acceptee' | 'en_cours' | 'terminee' | 'annulee';
  date: string;
  start_time?: string;
  departure_time?: string;
  proposed_amount: number;
  address: string;
  postal_code: string;
  city: string;
  description?: string;
  created_at: string;
  updated_at: string;
  duration?: number;
  services: Service;
  client_profile: ClientProfile;
}

const AvailableOrdersScreen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  // 🔒 AUTHENTIFICATION SIMPLE SANS RESTRICTION DE RÔLE
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    loadUser();
  }, []);

  // ✅ LOGIQUE MÉTIER - AMÉLIORÉE avec gestion d'erreurs
  useEffect(() => {
    if (user) {
      loadAvailableOrders();
    }
  }, [user]);

  const loadAvailableOrders = async () => {
    try {
      console.log('🔍 Chargement des commandes disponibles...');

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          services (
            id,
            title,
            category,
            description
          ),
          client_profile:profiles!client_id (
            firstname,
            lastname,
            total_orders
          )
        `)
        .eq('status', 'en_attente')
        .is('fourmiz_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement commandes disponibles:', error);
        throw error;
      }

      console.log('✅ Commandes disponibles chargées:', data?.length || 0);
      
      // 🛠️ VALIDATION ET NETTOYAGE DES DONNÉES
      const validOrders = (data || []).filter(order => {
        // Vérifier les champs essentiels
        const isValid = order.id && 
                       order.services && 
                       order.client_profile && 
                       order.proposed_amount && 
                       order.address;
        
        if (!isValid) {
          console.warn('⚠️ Commande invalide détectée:', order.id);
        }
        
        // 🛠️ CORRECTION : Gestion des dates de service manquantes
        if (!order.date) {
          console.warn(`⚠️ Pas de date de service pour commande: ${order.id}`);
        }
        
        // 🛠️ CORRECTION : Gestion des heures de service invalides
        if (order.start_time && !isValidTime(order.start_time)) {
          console.warn(`⚠️ Date/heure de service invalide pour commande: ${order.id}`);
        }
        
        return isValid;
      });

      setOrders(validOrders);

    } catch (error) {
      console.error('💥 Erreur fatale:', error);
      Alert.alert('Erreur', 'Impossible de charger les commandes disponibles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🛠️ FONCTION UTILITAIRE : Validation du format d'heure
  const isValidTime = (time: string): boolean => {
    if (!time) return false;
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAvailableOrders();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date non définie';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      console.error('❌ Erreur formatage date:', error);
      return 'Date invalide';
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    if (!isValidTime(timeString)) return 'Heure invalide';
    return timeString.slice(0, 5);
  };

  const handleAcceptOrder = async (orderId: number) => {
    Alert.alert(
      'Accepter cette commande',
      'Êtes-vous sûr de vouloir accepter cette commande ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            try {
              console.log('🔄 Acceptation de la commande:', orderId);
              
              const { error } = await supabase
                .from('orders')
                .update({ 
                  status: 'acceptee',
                  fourmiz_id: user?.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

              if (error) {
                console.error('❌ Erreur SQL acceptation:', error);
                throw error;
              }

              console.log('✅ Commande acceptée avec succès');
              Alert.alert('Succès', 'Commande acceptée avec succès !');
              loadAvailableOrders(); // Recharger la liste
              
            } catch (error) {
              console.error('❌ Erreur acceptation:', error);
              Alert.alert('Erreur', 'Impossible d\'accepter la commande');
            }
          },
        },
      ]
    );
  };

  const handleViewDetails = (orderId: number) => {
    console.log('👁️ Affichage détails commande:', orderId);
    router.push(`/available-orders/${orderId}`);
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => {
    // 🛠️ VALIDATION DES DONNÉES AVANT AFFICHAGE
    if (!order.services || !order.client_profile) {
      console.warn('⚠️ Données manquantes pour la commande:', order.id);
      return null;
    }

    const orderDate = order.date ? new Date(order.date) : null;
    const isUrgent = orderDate && (orderDate.getTime() - Date.now() < 24 * 60 * 60 * 1000);

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceTitle}>
              {order.services.title || 'Service non défini'}
            </Text>
            <Text style={styles.serviceCategory}>
              {order.services.category || 'Catégorie non définie'}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {order.proposed_amount ? `${order.proposed_amount}€` : 'Prix non défini'}
            </Text>
            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              {formatDate(order.date)}
              {order.start_time && ` à ${formatTime(order.start_time)}`}
              {order.departure_time && ` (départ ${formatTime(order.departure_time)})`}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="#6b7280" />
            <Text style={styles.detailText} numberOfLines={2}>
              {order.address || 'Adresse non définie'}, {order.postal_code} {order.city}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              Durée estimée : {order.duration || '?'} min
            </Text>
          </View>
        </View>

        {order.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.orderDescription} numberOfLines={3}>
              {order.description}
            </Text>
          </View>
        )}

        {order.client_profile && (
          <View style={styles.clientSection}>
            <Text style={styles.clientSectionTitle}>Client</Text>
            <View style={styles.clientInfo}>
              <View style={styles.clientAvatar}>
                <Ionicons name="person" size={20} color="#6b7280" />
              </View>
              <View style={styles.clientDetails}>
                <Text style={styles.clientName}>
                  {order.client_profile.firstname || 'Prénom'} {order.client_profile.lastname || 'Nom'}
                </Text>
                <Text style={styles.ordersCount}>
                  ({order.client_profile.total_orders || 0} commandes)
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.orderActions}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => handleViewDetails(order.id)}
          >
            <Ionicons name="eye" size={16} color="#3b82f6" />
            <Text style={styles.detailsButtonText}>Détails</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptOrder(order.id)}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.acceptButtonText}>Accepter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement des commandes disponibles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Commandes Disponibles</Text>
        <Text style={styles.subtitle}>{orders.length} commande(s) disponible(s)</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Aucune commande disponible</Text>
          <Text style={styles.emptySubtitle}>
            Les nouvelles commandes apparaîtront ici
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="#FF4444" />
            <Text style={styles.refreshButtonText}>Actualiser</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  urgentBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  urgentText: { 
    fontSize: 12, 
    fontWeight: '600',
    color: '#fff',
  },
  orderDetails: { 
    gap: 8, 
    marginBottom: 12 
  },
  detailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  detailText: { 
    fontSize: 14, 
    color: '#6b7280', 
    flex: 1 
  },
  descriptionContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  orderDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  clientSection: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  clientSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  ordersCount: { 
    fontSize: 12, 
    color: '#6b7280' 
  },
  orderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  detailsButtonText: { 
    fontSize: 14, 
    color: '#3b82f6', 
    fontWeight: '600' 
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButtonText: { 
    fontSize: 14, 
    color: '#fff', 
    fontWeight: '600' 
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  refreshButtonText: {
    color: '#FF4444',
    fontWeight: '600',
  },
});

// 🚨 IMPORTANT : Export par défaut requis
export default AvailableOrdersScreen;
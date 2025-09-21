// app/(tabs)/orders.tsx - COMMANDES CLIENT - VERSION CORRIGÉE COMPLÈTE
// ✅ Protection intégrée sans dépendance externe
// 🔒 ACCÈS RESTREINT : Client uniquement
// 🔧 CORRECTIONS : statut pending, date 1970, adresse manquante

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface Order {
  id: number;
  service_id: number;
  description: string;
  address: string;
  postal_code: string;
  city: string;
  date: string;
  start_time: string;
  end_time: string;
  phone: string;
  urgent: boolean;
  urgency_level: string;
  proposed_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  confirmed_by_fourmiz: boolean;
  fourmiz_id: string | null;
  rating: number | null;
  // Relations
  services: {
    title: string;
    categorie: string;
  };
  fourmiz_profile?: {
    firstname: string;
    lastname: string;
    avatar_url: string;
    phone: string;
  };
  // Champs additionnels pour l'adresse
  service_address?: string;
  delivery_address?: string;
  location?: string;
}

// ✅ STATUS_CONFIG ÉTENDU avec statuts anglais
const STATUS_CONFIG = {
  'en_attente': {
    label: '⏳ En attente',
    color: '#fbbf24',
    bgColor: '#fef3c7',
    description: 'Recherche d\'une fourmiz'
  },
  'pending': { // ✅ CORRECTION statut pending
    label: '⏳ En attente',
    color: '#fbbf24',
    bgColor: '#fef3c7',
    description: 'Recherche d\'une fourmiz'
  },
  'acceptee': {
    label: '✅ Acceptée',
    color: '#10b981',
    bgColor: '#d1fae5',
    description: 'Fourmiz assignée'
  },
  'confirmed': { // ✅ AJOUT statut anglais
    label: '✅ Acceptée',
    color: '#10b981',
    bgColor: '#d1fae5',
    description: 'Fourmiz assignée'
  },
  'accepted': { // ✅ AJOUT variante
    label: '✅ Acceptée',
    color: '#10b981',
    bgColor: '#d1fae5',
    description: 'Fourmiz assignée'
  },
  'en_cours': {
    label: '🚀 En cours',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    description: 'Prestation en cours'
  },
  'in_progress': { // ✅ AJOUT statut anglais
    label: '🚀 En cours',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    description: 'Prestation en cours'
  },
  'terminee': {
    label: '🎉 Terminée',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    description: 'Mission accomplie'
  },
  'completed': { // ✅ AJOUT statut anglais
    label: '🎉 Terminée',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    description: 'Mission accomplie'
  },
  'annulee': {
    label: '❌ Annulée',
    color: '#ef4444',
    bgColor: '#fee2e2',
    description: 'Commande annulée'
  },
  'cancelled': { // ✅ AJOUT statut anglais
    label: '❌ Annulée',
    color: '#ef4444',
    bgColor: '#fee2e2',
    description: 'Commande annulée'
  },
  'created': { // ✅ AJOUT statut legacy
    label: '⏳ En attente',
    color: '#fbbf24',
    bgColor: '#fef3c7',
    description: 'Recherche d\'une fourmiz'
  }
};

export default function OrdersScreen() {
  // ✅ PROTECTION SIMPLIFIÉE INTÉGRÉE
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ✅ VÉRIFICATION D'ACCÈS AU CHARGEMENT
  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        console.log('❌ Utilisateur non connecté');
        router.replace('/auth/signin');
        return;
      }

      setUser(currentUser);

      // Vérifier le profil et les rôles
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles, firstname, lastname')
        .eq('user_id', currentUser.id)
        .single();

      if (!profile?.roles?.includes('client')) {
        console.log('❌ Accès refusé : utilisateur n\'est pas client');
        // Rediriger vers l'écran principal ou afficher un message
        Alert.alert(
          'Accès refusé',
          'Cette section est réservée aux clients.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      setUserProfile(profile);
      console.log('✅ Accès autorisé pour client:', profile.firstname);

    } catch (error) {
      console.error('❌ Erreur vérification accès:', error);
      router.replace('/auth/signin');
    } finally {
      setAuthLoading(false);
    }
  };

  // Recharger les commandes quand on revient sur l'écran
  useFocusEffect(
    useCallback(() => {
      if (user && userProfile) {
        loadOrders();
      }
    }, [user, userProfile])
  );

  const loadOrders = async () => {
    if (!user) return;

    try {
      console.log('📋 Chargement des commandes pour:', user.id);
      
      // ✅ REQUÊTE ÉTENDUE avec plus de champs d'adresse
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          services (
            title,
            categorie
          ),
          fourmiz_profile:profiles!fourmiz_id (
            firstname,
            lastname,
            avatar_url,
            phone
          )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement commandes:', error);
        throw error;
      }

      console.log('✅ Commandes chargées:', data?.length || 0);
      
      // ✅ DEBUG DÉTAILLÉ des commandes avec date 1970
      data?.forEach(order => {
        const dateString = order.date || order.created_at;
        const parsedDate = new Date(dateString);
        
        if (parsedDate.getFullYear() === 1970) {
          console.log('🐛 === COMMANDE AVEC DATE 1970 ===');
          console.log('📋 ID:', order.id);
          console.log('📅 order.date (raw):', order.date);
          console.log('📅 order.created_at (raw):', order.created_at);
          console.log('📅 order.updated_at (raw):', order.updated_at);
          console.log('📊 Timestamp order.date:', new Date(order.date).getTime());
          console.log('📊 Timestamp created_at:', new Date(order.created_at).getTime());
          console.log('🏠 Adresse:', order.address);
          console.log('📬 Code postal:', order.postal_code);
          console.log('🏙️ Ville:', order.city);
          console.log('📊 Statut:', order.status);
          console.log('💰 Montant:', order.proposed_amount);
          console.log('🔍 Objet complet:', JSON.stringify(order, null, 2));
          console.log('==================================');
        }
      });
      
      setOrders(data || []);
    } catch (error) {
      console.error('💥 Erreur fatale:', error);
      Alert.alert('Erreur', 'Impossible de charger vos commandes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [user]);

  // Filtrer les commandes selon le statut sélectionné
  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === filterStatus);

  // ✅ FONCTION DE FORMATAGE DATE CORRIGÉE - DEBUG APPROFONDI
  const formatDate = (dateString: string) => {
    console.log('🗓️ === DEBUG DATE ===');
    console.log('📥 Date reçue (raw):', dateString);
    console.log('📊 Type:', typeof dateString);
    console.log('📏 Longueur:', dateString?.length);
    
    // Vérifier si la date existe
    if (!dateString) {
      console.log('❌ Pas de date fournie');
      return 'Date manquante';
    }
    
    try {
      // Essayer de parser la date
      const date = new Date(dateString);
      console.log('📅 Date parsée:', date);
      console.log('⏰ Timestamp:', date.getTime());
      console.log('📅 Année:', date.getFullYear());
      console.log('📅 Mois:', date.getMonth() + 1);
      console.log('📅 Jour:', date.getDate());
      
      // Vérifier si la date est valide
      if (isNaN(date.getTime())) {
        console.log('❌ Date invalide (NaN)');
        return 'Date invalide';
      }
      
      // Si c'est 1970, c'est probablement un timestamp à 0 ou mal formaté
      if (date.getFullYear() === 1970 && date.getTime() === 0) {
        console.log('⚠️ Timestamp à 0 détecté (epoch)');
        return 'Date non définie';
      }
      
      // Formatage français
      const formattedDate = date.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      
      console.log('✅ Date formatée:', formattedDate);
      return formattedDate;
      
    } catch (error) {
      console.error('💥 Erreur formatage date:', error);
      return 'Erreur date';
    }
  };

  // ✅ FONCTION DE FORMATAGE ADRESSE ROBUSTE
  const formatOrderAddress = (order: Order) => {
    console.log('🏠 Formatage adresse pour commande:', order.id);
    
    let addressParts: string[] = [];
    
    // Adresse principale
    if (order.address && order.address.trim()) {
      addressParts.push(order.address.trim());
    }
    
    // Code postal et ville
    const cityPart = [];
    if (order.postal_code && order.postal_code.trim()) {
      cityPart.push(order.postal_code.trim());
    }
    if (order.city && order.city.trim()) {
      cityPart.push(order.city.trim());
    }
    
    if (cityPart.length > 0) {
      addressParts.push(cityPart.join(' '));
    }
    
    // ✅ FALLBACK si pas d'adresse complète
    if (addressParts.length === 0) {
      // Essayer d'autres champs possibles
      const fallbackAddress = order.service_address || 
                             order.delivery_address || 
                             order.location;
                             
      if (fallbackAddress && typeof fallbackAddress === 'string') {
        return fallbackAddress.trim() || 'Adresse à définir';
      }
      
      console.log('⚠️ Aucune adresse trouvée pour commande:', order.id);
      return 'Adresse non renseignée';
    }
    
    const fullAddress = addressParts.join(', ');
    console.log('✅ Adresse formatée:', fullAddress);
    return fullAddress;
  };

  // Fonction pour formater l'heure
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.slice(0, 5); // HH:MM
  };

  const renderFilterButtons = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      <TouchableOpacity
        style={[
          styles.filterButton,
          filterStatus === 'all' && styles.filterButtonActive
        ]}
        onPress={() => setFilterStatus('all')}
      >
        <Text style={[
          styles.filterButtonText,
          filterStatus === 'all' && styles.filterButtonTextActive
        ]}>
          📋 Toutes ({orders.length})
        </Text>
      </TouchableOpacity>

      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
        const count = orders.filter(order => order.status === status).length;
        if (count === 0) return null;
        
        return (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filterStatus === status && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[
              styles.filterButtonText,
              filterStatus === status && styles.filterButtonTextActive
            ]}>
              {config.label} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderOrderCard = (order: Order) => {
    // ✅ RÉCUPÉRATION CONFIG STATUT avec fallback
    const statusConfig = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || {
      label: order.status || 'Statut inconnu',
      color: '#6b7280',
      bgColor: '#f3f4f6',
      description: 'Statut non reconnu'
    };
    
    return (
      <TouchableOpacity
        key={order.id}
        style={styles.orderCard}
        onPress={() => router.push(`/orders/${order.id}`)}
      >
        {/* Header avec statut */}
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>#{order.id} • {order.services?.title}</Text>
            <Text style={styles.orderCategory}>{order.services?.categorie}</Text>
          </View>
          
          <View style={[
            styles.statusBadge,
            { backgroundColor: statusConfig.bgColor }
          ]}>
            <Text style={[
              styles.statusText,
              { color: statusConfig.color }
            ]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Urgence si applicable */}
        {order.urgent && (
          <View style={styles.urgentBadge}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.urgentText}>URGENT - {order.urgency_level}</Text>
          </View>
        )}

        {/* Détails de la prestation */}
        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              {/* ✅ ESSAYER PLUSIEURS CHAMPS DE DATE */}
              {(() => {
                console.log('🗓️ === DEBUG DATES COMMANDE ===');
                console.log('📋 Commande ID:', order.id);
                console.log('📅 order.date:', order.date);
                console.log('📅 order.created_at:', order.created_at);
                console.log('📅 order.updated_at:', order.updated_at);
                console.log('================================');
                
                // Essayer order.date d'abord (date de la prestation)
                let dateToUse = order.date || order.created_at;
                return formatDate(dateToUse);
              })()}
              {order.start_time && ` à ${formatTime(order.start_time)}`}
              {order.end_time && ` - ${formatTime(order.end_time)}`}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="#6b7280" />
            <Text style={styles.detailText} numberOfLines={2}>
              {formatOrderAddress(order)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="card" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{order.proposed_amount}€</Text>
          </View>
        </View>

        {/* Fourmiz assignée */}
        {order.fourmiz_id && order.fourmiz_profile && (
          <View style={styles.fourmizSection}>
            <View style={styles.fourmizInfo}>
              {order.fourmiz_profile.avatar_url ? (
                <Image 
                  source={{ uri: order.fourmiz_profile.avatar_url }}
                  style={styles.fourmizAvatar}
                />
              ) : (
                <View style={styles.fourmizAvatarPlaceholder}>
                  <Ionicons name="person" size={20} color="#6b7280" />
                </View>
              )}
              <View style={styles.fourmizDetails}>
                <Text style={styles.fourmizName}>
                  {order.fourmiz_profile.firstname} {order.fourmiz_profile.lastname}
                </Text>
                <Text style={styles.fourmizRole}>Votre fourmiz</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => {
                // TODO: Ouvrir le chat ou appeler
                Alert.alert('Contact', 'Fonction de contact à implémenter');
              }}
            >
              <Ionicons name="chatbubble" size={16} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        )}

        {/* Actions rapides */}
        <View style={styles.actionButtons}>
          {(order.status === 'en_attente' || order.status === 'pending') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                Alert.alert(
                  'Annuler la commande',
                  'Êtes-vous sûr de vouloir annuler cette commande ?',
                  [
                    { text: 'Non', style: 'cancel' },
                    { 
                      text: 'Oui, annuler', 
                      style: 'destructive',
                      onPress: () => {
                        // TODO: Implémenter l'annulation
                        Alert.alert('Info', 'Fonction d\'annulation à implémenter');
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          )}
          
          {(order.status === 'terminee' || order.status === 'completed') && !order.rating && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rateButton]}
              onPress={() => {
                // TODO: Ouvrir l'écran de notation
                Alert.alert('Notation', 'Écran de notation à implémenter');
              }}
            >
              <Ionicons name="star" size={16} color="#fbbf24" />
              <Text style={styles.rateButtonText}>Noter</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ✅ ÉCRANS DE CHARGEMENT ET D'ERREUR
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Mes commandes' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Vérification des accès...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Si pas d'accès, le redirect a déjà eu lieu
  if (!user || !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Accès refusé' }} />
        <View style={styles.loadingContainer}>
          <Ionicons name="lock-closed" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Accès refusé</Text>
          <Text style={styles.emptyDescription}>Cette section est réservée aux clients.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Mes commandes' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Chargement de vos commandes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ INTERFACE IDENTIQUE - Votre design préservé
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Mes commandes' }} />
      
      {/* Filtres */}
      {renderFilterButtons()}

      {/* Liste des commandes */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              {filterStatus === 'all' 
                ? 'Aucune commande'
                : `Aucune commande ${STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.description || filterStatus}`
              }
            </Text>
            <Text style={styles.emptyDescription}>
              {filterStatus === 'all'
                ? 'Vous n\'avez pas encore passé de commande'
                : 'Changez de filtre pour voir vos autres commandes'
              }
            </Text>
            {filterStatus === 'all' && (
              <TouchableOpacity
                style={styles.createOrderButton}
                onPress={() => router.push('/services')}
              >
                <Text style={styles.createOrderButtonText}>Créer une commande</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.ordersContainer}>
            {filteredOrders.map(renderOrderCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ✅ STYLES IDENTIQUES - Aucune modification
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  filterContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  ordersContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  orderCategory: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  urgentText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  fourmizSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  fourmizInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fourmizAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  fourmizAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fourmizDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fourmizName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  fourmizRole: {
    fontSize: 12,
    color: '#6b7280',
  },
  contactButton: {
    padding: 8,
    backgroundColor: '#e0f2fe',
    borderRadius: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
  rateButton: {
    backgroundColor: '#fef3c7',
  },
  rateButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#d97706',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  createOrderButton: {
    marginTop: 24,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createOrderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
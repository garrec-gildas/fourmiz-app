// app/orders/[id].tsx - Fiche de synthèse épurée - VERSION CORRIGÉE AVEC FALLBACK
// 🎨 STYLE ÉPURÉ ALIGNÉ SUR services.tsx
// ✅ CONSERVATION DE TOUTES LES FONCTIONNALITÉS EXISTANTES
// 🔧 AJOUT: Accès aux missions disponibles pour consultation
// 🔒 SÉCURITÉ: Masquage adresse pour fourmiz en attente
// 📝 URGENT remplacé par "Dès que possible"
// 🛡️ CORRECTIONS: Protection contre les erreurs null
// 🔧 CORRIGÉ: Logique de fallback pour services (service_title quand service_id est null)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Image,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface OrderDetail {
  id: number;
  client_id: string;
  service_id: number;
  fourmiz_id: string | null;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  address: string;
  postal_code: string;
  city: string;
  departure_address: string;
  arrival_address: string;
  arrival_postal_code: string;
  arrival_city: string;
  delivery_address: string;
  pickup_address: string;
  addresses: any;
  phone: string;
  urgent: boolean;
  urgency_level: string;
  invoice_required: boolean;
  proposed_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  confirmed_by_fourmiz: boolean;
  accepted_at: string;
  cancelled_at: string;
  cancelled_by: string;
  rating: number | null;
  feedback: string | null;
  invoice_url: string | null;
  urgency_surcharge: number;
  cancellation_fee: number;
  fourmiz_commission: number;
  service_title: string;
  
  services: {
    id: number;
    title: string;
    categorie: string;
    description: string;
    estimatedDuration: number;
  } | null;
  
  client_profile: {
    firstname: string;
    lastname: string;
    avatar_url: string;
    phone: string;
  } | null;
  
  fourmiz_profile?: {
    firstname: string;
    lastname: string;
    avatar_url: string;
    phone: string;
  } | null;
}

interface ServiceInfo {
  title: string;
  categorie: string;
  description: string;
  estimatedDuration: number | null;
}

const STATUS_CONFIG = {
  'en_attente': {
    label: 'En attente',
    color: '#000000',
    bgColor: '#f8f8f8',
    client_description: 'Recherche d\'une fourmiz disponible',
    fourmiz_description: 'En attente d\'acceptation',
    viewer_description: 'Mission disponible - Vous pouvez postuler',
    icon: 'time'
  },
  'acceptee': {
    label: 'Acceptée',
    color: '#000000',
    bgColor: '#f8f8f8',
    client_description: 'Une fourmiz a accepté votre demande',
    fourmiz_description: 'Commande acceptée - Prêt à commencer',
    viewer_description: 'Mission déjà acceptée par une fourmiz',
    icon: 'checkmark-circle'
  },
  'en_cours': {
    label: 'En cours',
    color: '#000000',
    bgColor: '#f8f8f8',
    client_description: 'La prestation est en cours de réalisation',
    fourmiz_description: 'Prestation en cours de réalisation',
    viewer_description: 'Mission en cours de réalisation',
    icon: 'play-circle'
  },
  'terminee': {
    label: 'Terminée',
    color: '#000000',
    bgColor: '#f8f8f8',
    client_description: 'Mission accomplie avec succès',
    fourmiz_description: 'Mission accomplie avec succès',
    viewer_description: 'Mission terminée',
    icon: 'checkmark-done-circle'
  },
  'annulee': {
    label: 'Annulée',
    color: '#666666',
    bgColor: '#f8f8f8',
    client_description: 'Commande annulée',
    fourmiz_description: 'Commande annulée',
    viewer_description: 'Mission annulée',
    icon: 'close-circle'
  }
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'client' | 'fourmiz' | 'viewer' | null>(null);

  // États pour les accordéons
  const [showServiceDetails, setShowServiceDetails] = useState(true);
  const [showScheduleDetails, setShowScheduleDetails] = useState(true);
  const [showLocationDetails, setShowLocationDetails] = useState(true);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showPricingDetails, setShowPricingDetails] = useState(false);
  const [showOrderInfo, setShowOrderInfo] = useState(false);

  const normalizeStatus = (status: any): string => {
    const safeStatus = String(status || '').toLowerCase();
    
    if (['en_attente', 'pending', 'created'].includes(safeStatus)) {
      return 'en_attente';
    }
    if (['acceptee', 'accepted', 'confirmed'].includes(safeStatus)) {
      return 'acceptee';
    }
    if (['en_cours', 'in_progress'].includes(safeStatus)) {
      return 'en_cours';
    }
    if (['terminee', 'completed', 'finished'].includes(safeStatus)) {
      return 'terminee';
    }
    if (['annulee', 'cancelled', 'canceled'].includes(safeStatus)) {
      return 'annulee';
    }
    return 'en_attente';
  };

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          throw error;
        }
        
        if (!user) {
          Alert.alert(
            'Connexion requise',
            'Vous devez être connecté pour voir cette commande.',
            [{ text: 'OK', onPress: () => router.push('/auth/login') }]
          );
          return;
        }
        
        setCurrentUser(user);
        console.log('🐛 DEBUG - Current user loaded:', user.id);
      } catch (error) {
        console.error('🐛 DEBUG - Error loading user:', error);
        Alert.alert('Erreur', 'Impossible de vérifier votre connexion');
      }
    };
    
    getUser();
  }, []);

  useEffect(() => {
    if (currentUser && id) {
      console.log('🐛 DEBUG - Loading order details for ID:', id, 'User:', currentUser.id);
      loadOrderDetails();
    }
  }, [currentUser, id]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      console.log('🐛 DEBUG - Starting order query for ID:', id);

      // Test séparé pour vérifier l'accès aux services
      console.log('🐛 DEBUG - Testing direct service access...');
      const { data: serviceTest, error: serviceTestError } = await supabase
        .from('services')
        .select('*')
        .limit(5);
      console.log('🐛 DEBUG - Service test result:', { serviceTest, serviceTestError });

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          services (
            id,
            title,
            categorie,
            description,
            estimatedDuration
          ),
          client_profile:profiles!client_id (
            firstname,
            lastname,
            avatar_url,
            phone
          ),
          fourmiz_profile:profiles!fourmiz_id (
            firstname,
            lastname,
            avatar_url,
            phone
          )
        `)
        .eq('id', id)
        .single();

      // LOGS DE DEBUG DÉTAILLÉS
      console.log('🐛 DEBUG - Requête order terminée');
      console.log('🐛 DEBUG - Error:', orderError);
      console.log('🐛 DEBUG - Data exists:', !!orderData);
      console.log('🐛 DEBUG - Data keys:', orderData ? Object.keys(orderData) : 'No data');
      console.log('🐛 DEBUG - Service ID dans order:', orderData?.service_id);
      console.log('🐛 DEBUG - Services relation:', orderData?.services);
      console.log('🐛 DEBUG - Services relation type:', typeof orderData?.services);
      console.log('🐛 DEBUG - Services relation keys:', orderData?.services ? Object.keys(orderData.services) : 'No services');
      console.log('🐛 DEBUG - Service title fallback:', orderData?.service_title);
      console.log('🐛 DEBUG - Client profile:', !!orderData?.client_profile);
      console.log('🐛 DEBUG - Fourmiz profile:', !!orderData?.fourmiz_profile);

      if (orderError) {
        console.error('🐛 DEBUG - Order query error:', orderError);
        throw orderError;
      }

      if (!orderData) {
        console.error('🐛 DEBUG - No order data returned for ID:', id);
        throw new Error(`Commande ${id} introuvable`);
      }

      console.log('🐛 DEBUG - Order data loaded successfully');
      console.log('🐛 DEBUG - Order status:', orderData.status);
      console.log('🐛 DEBUG - Order client_id:', orderData.client_id);
      console.log('🐛 DEBUG - Order fourmiz_id:', orderData.fourmiz_id);

      // LOGIQUE D'AUTORISATION MODIFIÉE
      const isClient = orderData.client_id === currentUser.id;
      const isFourmiz = orderData.fourmiz_id === currentUser.id;
      
      console.log('🐛 DEBUG - Access check - isClient:', isClient, 'isFourmiz:', isFourmiz);
      
      // Permettre l'accès aux missions disponibles pour tous les utilisateurs (sauf le client)
      const isAvailableOrder = orderData.status === 'en_attente' && !isClient;
      
      console.log('🐛 DEBUG - isAvailableOrder:', isAvailableOrder);
      
      const hasAccess = isClient || isFourmiz || isAvailableOrder;

      console.log('🐛 DEBUG - Final access decision:', hasAccess);

      if (!hasAccess) {
        console.warn('🐛 DEBUG - Access denied for user');
        Alert.alert(
          'Accès refusé', 
          'Vous n\'êtes pas autorisé à consulter cette commande.',
          [{ text: 'Retour', onPress: () => router.back() }]
        );
        return;
      }

      // LOGIQUE DE FALLBACK POUR LES SERVICES - NOUVEAU
      console.log('✅ NOUVEAU - Création serviceInfo avec fallback');
      const unifiedServiceInfo: ServiceInfo = {
        title: orderData.services?.title || orderData.service_title || 'Service non défini',
        categorie: orderData.services?.categorie || 'Catégorie non définie', 
        description: orderData.services?.description || '',
        estimatedDuration: orderData.services?.estimatedDuration || null
      };
      
      console.log('✅ NOUVEAU - Service info unified:', unifiedServiceInfo);
      setServiceInfo(unifiedServiceInfo);

      // Déterminer le rôle de l'utilisateur
      let userRole: 'client' | 'fourmiz' | 'viewer' = 'viewer';
      if (isClient) userRole = 'client';
      else if (isFourmiz) userRole = 'fourmiz';

      console.log('🐛 DEBUG - User role determined:', userRole);

      setUserRole(userRole);
      setOrder(orderData);

      console.log('🐛 DEBUG - Order state updated successfully');

    } catch (error) {
      console.error('🐛 DEBUG - Load order details error:', error);
      Alert.alert(
        'Erreur de chargement', 
        `Impossible de charger les détails de la commande.\n\n${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        [
          { text: 'Réessayer', onPress: () => loadOrderDetails() },
          { text: 'Retour', onPress: () => router.back() }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🐛 DEBUG - Loading finished');
    }
  };

  const onRefresh = () => {
    console.log('🐛 DEBUG - Refresh triggered');
    setRefreshing(true);
    loadOrderDetails();
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    Alert.alert(
      'Annuler la commande',
      'Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              const updateData = {
                status: 'annulee',
                cancelled_at: new Date().toISOString(),
                cancelled_by: currentUser.id,
                updated_at: new Date().toISOString()
              };
              
              const { error } = await supabase
                .from('orders')
                .update(updateData)
                .eq('id', order.id);

              if (error) throw error;

              Alert.alert('Commande annulée', 'Votre commande a été annulée avec succès.');
              loadOrderDetails();
              
            } catch (error) {
              Alert.alert('Erreur', `Impossible d'annuler la commande.\n\n${error instanceof Error ? error.message : 'Erreur inconnue'}`);
            }
          }
        }
      ]
    );
  };

  const handleAcceptMission = async () => {
    if (!order || !currentUser?.id) return;

    Alert.alert(
      'Accepter cette mission',
      'Voulez-vous accepter cette commande ? Le client sera notifié.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            try {
              console.log('✅ Acceptation commande:', order.id, 'par:', currentUser.id);
              
              const { error } = await supabase
                .from('orders')
                .update({
                  fourmiz_id: currentUser.id,
                  status: 'acceptee',
                  accepted_at: new Date().toISOString(),
                  confirmed_by_fourmiz: true,
                  updated_at: new Date().toISOString()
                })
                .eq('id', order.id);

              if (error) throw error;

              console.log('✅ Mission acceptée avec succès');
              
              Alert.alert(
                'Mission acceptée',
                'Félicitations ! Vous avez accepté cette mission. Le client va être notifié.',
                [
                  { 
                    text: 'Mes commandes', 
                    onPress: () => router.push('/(tabs)/services-requests')
                  }
                ]
              );
              
            } catch (error: any) {
              console.error('❌ Erreur acceptation:', error);
              Alert.alert('Erreur', `Impossible d'accepter: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const handleChat = () => {
    if (order?.id) {
      router.push(`/chat/${order.id}`);
    } else {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le chat');
    }
  };

  const handleRateService = () => {
    if (order?.id) {
      router.push(`/orders/${order.id}/rate`);
    } else {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la notation');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return 'Non défini';
    const date = new Date(dateTimeString);
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    console.log('🐛 DEBUG - Rendering loading state');
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Détails de la commande' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order || !serviceInfo) {
    console.log('🐛 DEBUG - Rendering no order state');
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Commande introuvable' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color="#666666" />
          <Text style={styles.errorTitle}>Commande introuvable</Text>
          <Text style={styles.errorText}>
            Cette commande n'existe pas ou vous n'avez pas l'autorisation de la consulter.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  console.log('✅ NOUVEAU - Services relation OK via serviceInfo, proceeding with render');

  const statusConfig = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
  const otherParty = userRole === 'client' ? order.fourmiz_profile : order.client_profile;
  const otherPartyRole = userRole === 'client' ? 'Fourmiz' : 'Client';
  const normalizedStatus = normalizeStatus(order.status);

  console.log('🐛 DEBUG - Rendering main component with:');
  console.log('🐛 DEBUG - User role:', userRole);
  console.log('🐛 DEBUG - Status:', normalizedStatus);
  console.log('🐛 DEBUG - Services title (via serviceInfo):', serviceInfo.title);

  // Fonction pour obtenir la description du statut selon le rôle
  const getStatusDescription = () => {
    if (userRole === 'client') return statusConfig.client_description;
    if (userRole === 'fourmiz') return statusConfig.fourmiz_description;
    return statusConfig.viewer_description;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: `Commande #${order.id}`,
          headerTitleStyle: { fontSize: 16, fontWeight: '600' }
        }} 
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* En-tête avec rôle et statut */}
        <View style={styles.headerSection}>
          {userRole === 'client' && (
            <View style={styles.roleBadge}>
              <Ionicons name="person" size={14} color="#ffffff" />
              <Text style={styles.roleText}>Vous êtes le Client</Text>
            </View>
          )}
          {userRole === 'fourmiz' && (
            <View style={[styles.roleBadge, styles.fourmizBadge]}>
              <Ionicons name="construct" size={14} color="#ffffff" />
              <Text style={styles.roleText}>Vous êtes la Fourmiz</Text>
            </View>
          )}
          {userRole === 'viewer' && (
            <View style={[styles.roleBadge, styles.viewerBadge]}>
              <Ionicons name="eye" size={14} color="#ffffff" />
              <Text style={styles.roleText}>Mission disponible</Text>
            </View>
          )}
        </View>

        {/* Statut principal épuré */}
        <View style={styles.section}>
          <View style={[styles.statusCard, { backgroundColor: statusConfig.bgColor }]}>
            <View style={styles.statusHeader}>
              <View style={styles.statusIconContainer}>
                <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
              </View>
              <View style={styles.statusContent}>
                <Text style={[styles.statusTitle, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
                <Text style={styles.statusDescription}>
                  {getStatusDescription()}
                </Text>
              </View>
            </View>

            {order.urgent && (
              <View style={styles.urgentIndicator}>
                <Ionicons name="alert-circle" size={14} color="#000000" />
                <Text style={styles.urgentText}>
                  Dès que possible
                </Text>
              </View>
            )}
          </View>
        </View>

        {/*Service en demande - UTILISE serviceInfo*/}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setShowServiceDetails(!showServiceDetails)}
              activeOpacity={0.7}
            >
              <Ionicons name="construct-outline" size={16} color="#000000" />
              <Text style={styles.sectionTitle}>Service demandé</Text>
              <View style={styles.expandButton}>
                <Ionicons 
                  name={showServiceDetails ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color="#666666" 
                />
              </View>
            </TouchableOpacity>
            
            {showServiceDetails && (
              <View style={styles.sectionContent}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Service</Text>
                  <Text style={styles.infoValue}>{serviceInfo.title}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Catégorie</Text>
                  <Text style={styles.infoValue}>{serviceInfo.categorie}</Text>
                </View>
                {serviceInfo.description && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Description du service</Text>
                    <Text style={styles.infoValue}>{serviceInfo.description}</Text>
                  </View>
                )}
                {order.description && 
                 order.description.trim() !== '' && 
                 order.description.trim() !== 'Description réelle de la demande' && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Demande du client</Text>
                    <Text style={[styles.infoValue, styles.clientDescription]}>{order.description}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Planning - UTILISE serviceInfo*/}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setShowScheduleDetails(!showScheduleDetails)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={16} color="#000000" />
              <Text style={styles.sectionTitle}>Planning</Text>
              <View style={styles.expandButton}>
                <Ionicons 
                  name={showScheduleDetails ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color="#666666" 
                />
              </View>
            </TouchableOpacity>
            
            {showScheduleDetails && (
              <View style={styles.sectionContent}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Date de prestation</Text>
                  <Text style={styles.infoValue}>{formatDate(order.date)}</Text>
                </View>
                {order.start_time && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>
                      {serviceInfo.categorie === 'Transport' ? 'Heure de départ' : 'Heure de début'}
                    </Text>
                    <Text style={styles.infoValue}>
                      {formatTime(order.start_time)}
                      {order.end_time && ` - ${formatTime(order.end_time)}`}
                    </Text>
                  </View>
                )}
                {serviceInfo.estimatedDuration && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Durée estimée</Text>
                    <Text style={styles.infoValue}>{serviceInfo.estimatedDuration} minutes</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Localisation complète - Seulement pour commandes acceptées - UTILISE serviceInfo*/}
        {normalizedStatus !== 'en_attente' && (
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => setShowLocationDetails(!showLocationDetails)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={16} color="#000000" />
                <Text style={styles.sectionTitle}>Localisation</Text>
                <View style={styles.expandButton}>
                  <Ionicons 
                    name={showLocationDetails ? "chevron-up" : "chevron-down"} 
                    size={14} 
                    color="#666666" 
                  />
                </View>
              </TouchableOpacity>
              
              {showLocationDetails && (
                <View style={styles.sectionContent}>
                  <View style={styles.infoItemWithAction}>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>
                        {serviceInfo.categorie === 'Transport' ? 'Adresse de départ' : 'Adresse'}
                      </Text>
                      <Text style={styles.infoValue}>
                        {order.address || 'Adresse non définie'}
                        {order.postal_code && order.city && (
                          <Text>{'\n'}{order.postal_code} {order.city}</Text>
                        )}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.actionIcon}
                      onPress={() => {
                        const address = encodeURIComponent(`${order.address || ''}, ${order.postal_code || ''} ${order.city || ''}`);
                        Linking.openURL(`https://maps.google.com/?q=${address}`);
                      }}
                    >
                      <Ionicons name="map" size={14} color="#000000" />
                    </TouchableOpacity>
                  </View>

                  {serviceInfo.categorie === 'Transport' && order.arrival_postal_code && order.arrival_city && (
                    <View style={styles.infoItemWithAction}>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Destination</Text>
                        <Text style={styles.infoValue}>
                          {order.arrival_address && `${order.arrival_address}, `}
                          {order.arrival_postal_code} {order.arrival_city}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.actionIcon}
                        onPress={() => {
                          const address = encodeURIComponent(`${order.arrival_address || ''}, ${order.arrival_postal_code} ${order.arrival_city}`);
                          Linking.openURL(`https://maps.google.com/?q=${address}`);
                        }}
                      >
                        <Ionicons name="map" size={14} color="#000000" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {order.delivery_address && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Adresse de livraison</Text>
                      <Text style={styles.infoValue}>{order.delivery_address}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Localisation limitée - Pour commandes en attente - UTILISE serviceInfo*/}
        {normalizedStatus === 'en_attente' && (
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => setShowLocationDetails(!showLocationDetails)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={16} color="#000000" />
                <Text style={styles.sectionTitle}>Zone d'intervention</Text>
                <View style={styles.expandButton}>
                  <Ionicons 
                    name={showLocationDetails ? "chevron-up" : "chevron-down"} 
                    size={14} 
                    color="#666666" 
                  />
                </View>
              </TouchableOpacity>
              
              {showLocationDetails && (
                <View style={styles.sectionContent}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Ville</Text>
                    <Text style={styles.infoValue}>
                      {order.postal_code && order.city ? `${order.postal_code} ${order.city}` : (order.city || 'Ville non définie')}
                    </Text>
                  </View>
                  
                  {serviceInfo.categorie === 'Transport' && order.arrival_postal_code && order.arrival_city && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Destination</Text>
                      <Text style={styles.infoValue}>
                        {order.arrival_postal_code} {order.arrival_city}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Contact */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setShowContactDetails(!showContactDetails)}
              activeOpacity={0.7}
            >
              <Ionicons name="call-outline" size={16} color="#000000" />
              <Text style={styles.sectionTitle}>Contact</Text>
              <View style={styles.expandButton}>
                <Ionicons 
                  name={showContactDetails ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color="#666666" 
                />
              </View>
            </TouchableOpacity>
            
            {showContactDetails && (
              <View style={styles.sectionContent}>
                <View style={styles.infoItemWithAction}>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Téléphone</Text>
                    <Text style={styles.infoValue}>{order.phone || 'Téléphone non fourni'}</Text>
                  </View>
                  {userRole !== 'viewer' && order.phone && (
                    <TouchableOpacity
                      style={styles.actionIcon}
                      onPress={() => Linking.openURL(`tel:${order.phone}`)}
                    >
                      <Ionicons name="call" size={14} color="#000000" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Autre partie (Client ou Fourmiz) - Masqué pour les viewers */}
        {otherParty && userRole !== 'viewer' && (
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={16} color="#000000" />
                <Text style={styles.sectionTitle}>
                  {userRole === 'client' ? 'Votre fourmiz' : 'Votre client'}
                </Text>
              </View>
              
              <View style={styles.sectionContent}>
                <View style={styles.personInfo}>
                  {otherParty.avatar_url ? (
                    <Image 
                      source={{ uri: otherParty.avatar_url }}
                      style={styles.personAvatar}
                    />
                  ) : (
                    <View style={styles.personAvatarPlaceholder}>
                      <Ionicons 
                        name={userRole === 'client' ? 'construct' : 'person'} 
                        size={16} 
                        color="#666666" 
                      />
                    </View>
                  )}
                  
                  <View style={styles.personDetails}>
                    <Text style={styles.personName}>
                      {(otherParty.firstname || '') + ' ' + (otherParty.lastname || '')}
                    </Text>
                    <Text style={styles.personRole}>{otherPartyRole}</Text>
                  </View>
                </View>

                {/* Actions avec la personne */}
                <View style={styles.personActions}>
                  {(normalizedStatus === 'acceptee' || normalizedStatus === 'en_cours') && (
                    <TouchableOpacity style={styles.actionButton} onPress={handleChat}>
                      <Ionicons name="chatbubble-outline" size={14} color="#000000" />
                      <Text style={styles.actionButtonText}>Discuter</Text>
                    </TouchableOpacity>
                  )}

                  {userRole === 'client' && (normalizedStatus === 'en_attente' || normalizedStatus === 'acceptee') && (
                    <TouchableOpacity style={styles.actionButtonSecondary} onPress={handleCancelOrder}>
                      <Ionicons name="close-circle-outline" size={14} color="#666666" />
                      <Text style={styles.actionButtonSecondaryText}>Annuler</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {order.accepted_at && (
                  <View style={styles.acceptedInfo}>
                    <Ionicons name="checkmark-circle" size={12} color="#000000" />
                    <Text style={styles.acceptedText}>
                      Acceptée le {formatDateTime(order.accepted_at)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Information client pour les viewers */}
        {userRole === 'viewer' && order.client_profile && (
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={16} color="#000000" />
                <Text style={styles.sectionTitle}>Client</Text>
              </View>
              
              <View style={styles.sectionContent}>
                <View style={styles.personInfo}>
                  {order.client_profile.avatar_url ? (
                    <Image 
                      source={{ uri: order.client_profile.avatar_url }}
                      style={styles.personAvatar}
                    />
                  ) : (
                    <View style={styles.personAvatarPlaceholder}>
                      <Ionicons name="person" size={16} color="#666666" />
                    </View>
                  )}
                  
                  <View style={styles.personDetails}>
                    <Text style={styles.personName}>
                      {(order.client_profile.firstname || '') + ' ' + (order.client_profile.lastname || '')}
                    </Text>
                    <Text style={styles.personRole}>Client</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Tarification */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setShowPricingDetails(!showPricingDetails)}
              activeOpacity={0.7}
            >
              <Ionicons name="card-outline" size={16} color="#000000" />
              <Text style={styles.sectionTitle}>Tarification</Text>
              <View style={styles.expandButton}>
                <Ionicons 
                  name={showPricingDetails ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color="#666666" 
                />
              </View>
            </TouchableOpacity>
            
            {showPricingDetails && (
              <View style={styles.sectionContent}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Montant proposé</Text>
                  <Text style={styles.priceValue}>{order.proposed_amount || 0}€</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Montant Fourmiz</Text>
                  <Text style={styles.priceValue}>{order.fourmiz_amount || 0}€</Text>
                </View>

                {order.urgency_surcharge > 0 && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Supplément urgence</Text>
                    <Text style={styles.priceValue}>+{order.urgency_surcharge}€</Text>
                  </View>
                )}

                {order.invoice_required && (
                  <View style={styles.infoItemWithAction}>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Facturation</Text>
                      <Text style={styles.infoValue}>Facture demandée</Text>
                    </View>
                    {order.invoice_url && userRole !== 'viewer' && (
                      <TouchableOpacity
                        style={styles.actionIcon}
                        onPress={() => Linking.openURL(order.invoice_url!)}
                      >
                        <Ionicons name="download" size={14} color="#000000" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Informations de commande */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setShowOrderInfo(!showOrderInfo)}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={16} color="#000000" />
              <Text style={styles.sectionTitle}>Informations</Text>
              <View style={styles.expandButton}>
                <Ionicons 
                  name={showOrderInfo ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color="#666666" 
                />
              </View>
            </TouchableOpacity>
            
            {showOrderInfo && (
              <View style={styles.sectionContent}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Créée le</Text>
                  <Text style={styles.infoValue}>{formatDateTime(order.created_at)}</Text>
                </View>

                {order.updated_at && order.updated_at !== order.created_at && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Dernière modification</Text>
                    <Text style={styles.infoValue}>{formatDateTime(order.updated_at)}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Actions principales */}
        <View style={styles.actionsSection}>
          {/* Bouton d'acceptation pour les viewers */}
          {userRole === 'viewer' && normalizedStatus === 'en_attente' && (
            <TouchableOpacity 
              style={styles.acceptMissionButton} 
              onPress={handleAcceptMission}
            >
              <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
              <Text style={styles.acceptMissionButtonText}>Accepter cette mission</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={16} color="#000000" />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>

          {order.status === 'terminee' && !order.rating && userRole === 'client' && (
            <TouchableOpacity style={styles.rateButton} onPress={handleRateService}>
              <Ionicons name="star" size={16} color="#ffffff" />
              <Text style={styles.rateButtonText}>Noter la prestation</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },

  // États de chargement épurés
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { 
    fontSize: 13, 
    color: '#666666',
    fontWeight: '400',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  errorTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#000000' 
  },
  errorText: { 
    fontSize: 13, 
    color: '#666666', 
    textAlign: 'center',
    lineHeight: 20,
  },

  scrollView: { 
    flex: 1 
  },

  // En-tête épuré
  headerSection: {
    padding: 20,
    alignItems: 'flex-start',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  fourmizBadge: {
    backgroundColor: '#333333',
  },
  viewerBadge: {
    backgroundColor: '#666666',
  },
  roleText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },

  // Sections épurées
  section: { 
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  expandButton: {
    padding: 4,
  },
  sectionContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },

  // Statut principal épuré
  statusCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContent: { 
    flex: 1 
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  urgentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  urgentText: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
  },

  // Éléments d'information épurés
  infoItem: {
    gap: 4,
  },
  infoItemWithAction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: { 
    flex: 1 
  },
  infoLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },
  infoValue: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '500',
    lineHeight: 18,
  },
  infoHint: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  priceValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  clientDescription: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    fontStyle: 'italic',
  },

  // Informations personne épurées
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  personAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personDetails: { 
    flex: 1 
  },
  personName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  personRole: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },
  personActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  acceptedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  acceptedText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },

  // Boutons d'action épurés
  actionIcon: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f8f8',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },

  // Actions principales épurées
  actionsSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  acceptMissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptMissionButtonText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  backButtonText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  rateButtonText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },

  bottomSpacer: { 
    height: 32 
  },
});
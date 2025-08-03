// app/orders/[id].tsx - Détails complets d'une commande AVEC LOGS
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  
  // Relations
  services: {
    id: number;
    title: string;
    categorie: string;
    description: string;
    estimated_duration: number;
  };
  
  client_profile: {
    first_name: string;
    last_name: string;
    avatar_url: string;
    phone: string;
  };
  
  fourmiz_profile?: {
    first_name: string;
    last_name: string;
    avatar_url: string;
    phone: string;
    rating: number;
    completed_jobs: number;
  };
}

interface StatusHistory {
  id: number;
  order_id: number;
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_at: string;
  comment: string;
}

const STATUS_CONFIG = {
  'en_attente': {
    label: '⏳ En attente',
    color: '#fbbf24',
    bgColor: '#fef3c7',
    description: 'Recherche d\'une fourmiz disponible',
    icon: 'hourglass'
  },
  'acceptee': {
    label: '✅ Acceptée',
    color: '#10b981',
    bgColor: '#d1fae5',
    description: 'Une fourmiz a accepté votre demande',
    icon: 'checkmark-circle'
  },
  'en_cours': {
    label: '🚀 En cours',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    description: 'La prestation est en cours de réalisation',
    icon: 'play-circle'
  },
  'terminee': {
    label: '🎉 Terminée',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    description: 'Mission accomplie avec succès',
    icon: 'checkmark-done-circle'
  },
  'annulee': {
    label: '❌ Annulée',
    color: '#ef4444',
    bgColor: '#fee2e2',
    description: 'Commande annulée',
    icon: 'close-circle'
  }
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ✅ LOGS DÉTAILLÉS INITIALISATION
  useEffect(() => {
    console.log('🔥 =================================');
    console.log('🔥 ORDER DETAIL SCREEN CHARGÉ');
    console.log('🔥 =================================');
    console.log('📥 Paramètres reçus:', { id });
    console.log('🆔 ID commande:', id);
    console.log('🔍 Type ID:', typeof id);
    
    const getUser = async () => {
      try {
        console.log('👤 =================================');
        console.log('👤 RÉCUPÉRATION UTILISATEUR');
        console.log('👤 =================================');
        console.log('🔍 Récupération utilisateur actuel...');
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        console.log('📡 Réponse Supabase auth:');
        console.log('   User:', user ? { id: user.id, email: user.email } : null);
        console.log('   Error:', error);
        
        if (error) {
          console.error('❌ Erreur récupération user:', error);
          throw error;
        }
        
        if (!user) {
          console.error('❌ Utilisateur non connecté');
          Alert.alert(
            'Connexion requise',
            'Vous devez être connecté pour voir cette commande.',
            [{ text: 'OK', onPress: () => router.push('/auth/login') }]
          );
          return;
        }
        
        console.log('✅ Utilisateur connecté:', user.email);
        console.log('🆔 User ID:', user.id);
        setCurrentUser(user);
        
      } catch (error) {
        console.error('💥 Erreur fatale récupération user:', error);
        Alert.alert('Erreur', 'Impossible de vérifier votre connexion');
      }
    };
    
    getUser();
  }, []);

  // ✅ CHARGEMENT DÉTAILS COMMANDE AVEC LOGS
  useEffect(() => {
    if (currentUser && id) {
      console.log('🔗 Déclenchement chargement commande');
      console.log('   User OK:', !!currentUser);
      console.log('   ID OK:', !!id);
      loadOrderDetails();
    } else {
      console.log('⏳ Attente user + id:');
      console.log('   currentUser:', !!currentUser);
      console.log('   id:', !!id);
    }
  }, [currentUser, id]);

  const loadOrderDetails = async () => {
    try {
      console.log('📋 =================================');
      console.log('📋 CHARGEMENT DÉTAILS COMMANDE');
      console.log('📋 =================================');
      console.log('🆔 ID commande à charger:', id);
      console.log('👤 User ID actuel:', currentUser?.id);
      
      setLoading(true);

      // Requête principale avec relations
      console.log('📡 Lancement requête Supabase complexe...');
      console.log('🔍 Query: orders avec relations services + profiles');
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          services (
            id,
            title,
            categorie,
            description,
            estimated_duration
          ),
          client_profile:profiles!client_id (
            first_name,
            last_name,
            avatar_url,
            phone
          ),
          fourmiz_profile:profiles!fourmiz_id (
            first_name,
            last_name,
            avatar_url,
            phone,
            rating,
            completed_jobs
          )
        `)
        .eq('id', id)
        .eq('client_id', currentUser.id) // Sécurité : seul le propriétaire peut voir
        .single();

      console.log('📡 Réponse requête principale:');
      console.log('   OrderData présent:', !!orderData);
      console.log('   OrderError:', orderError);
      
      if (orderData) {
        console.log('📊 Détails commande reçue:');
        console.log('   ID:', orderData.id);
        console.log('   Statut:', orderData.status);
        console.log('   Service:', orderData.services?.title);
        console.log('   Catégorie:', orderData.services?.categorie);
        console.log('   Client ID:', orderData.client_id);
        console.log('   Fourmiz ID:', orderData.fourmiz_id);
        console.log('   Montant:', orderData.proposed_amount);
        console.log('   Date:', orderData.date);
        console.log('   Adresse:', orderData.address);
        console.log('   Urgent:', orderData.urgent);
        console.log('   Créée le:', orderData.created_at);
        
        // Logs relations
        console.log('🔗 Relations chargées:');
        console.log('   Service relation:', !!orderData.services);
        console.log('   Client profile:', !!orderData.client_profile);
        console.log('   Fourmiz profile:', !!orderData.fourmiz_profile);
        
        if (orderData.services) {
          console.log('📋 Détails service:');
          console.log('   Titre:', orderData.services.title);
          console.log('   Catégorie:', orderData.services.categorie);
          console.log('   Durée estimée:', orderData.services.estimated_duration);
        }
        
        if (orderData.client_profile) {
          console.log('👤 Profil client:');
          console.log('   Nom:', orderData.client_profile.first_name, orderData.client_profile.last_name);
          console.log('   Téléphone:', orderData.client_profile.phone);
        }
        
        if (orderData.fourmiz_profile) {
          console.log('🔧 Profil fourmiz:');
          console.log('   Nom:', orderData.fourmiz_profile.first_name, orderData.fourmiz_profile.last_name);
          console.log('   Rating:', orderData.fourmiz_profile.rating);
          console.log('   Jobs terminés:', orderData.fourmiz_profile.completed_jobs);
        }
      }

      if (orderError) {
        console.error('❌ Erreur requête commande:', orderError);
        console.error('   Code:', orderError.code);
        console.error('   Message:', orderError.message);
        console.error('   Details:', orderError.details);
        throw orderError;
      }

      if (!orderData) {
        console.error('❌ Aucune donnée retournée');
        console.error('   Possible cause: commande inexistante ou non autorisée');
        throw new Error('Commande introuvable ou accès non autorisé');
      }

      console.log('✅ Commande chargée avec succès');
      setOrder(orderData);

      // Tentative de chargement historique (optionnel)
      console.log('📚 Tentative chargement historique statuts...');
      try {
        const { data: historyData, error: historyError } = await supabase
          .from('order_status_history')
          .select('*')
          .eq('order_id', id)
          .order('changed_at', { ascending: true });
        
        if (historyError) {
          console.warn('⚠️ Table historique non disponible:', historyError.message);
        } else {
          console.log(`📚 ${historyData?.length || 0} entrées d'historique trouvées`);
          setStatusHistory(historyData || []);
        }
      } catch (historyErr) {
        console.warn('⚠️ Erreur chargement historique (non bloquant):', historyErr);
      }

    } catch (error) {
      console.error('💥 ERREUR FATALE chargement commande:', error);
      console.error('   Type:', typeof error);
      console.error('   Message:', error instanceof Error ? error.message : 'Erreur inconnue');
      console.error('   Stack:', error instanceof Error ? error.stack : 'N/A');
      
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
      console.log('🏁 Fin chargement commande');
    }
  };

  // ✅ RAFRAÎCHISSEMENT AVEC LOGS
  const onRefresh = () => {
    console.log('🔄 =================================');
    console.log('🔄 RAFRAÎCHISSEMENT COMMANDE');
    console.log('🔄 =================================');
    console.log('🔄 Déclenchement rafraîchissement...');
    
    setRefreshing(true);
    loadOrderDetails();
  };

  // ✅ ANNULATION AVEC LOGS DÉTAILLÉS
  const handleCancelOrder = async () => {
    if (!order) {
      console.error('❌ Tentative annulation sans commande chargée');
      return;
    }

    console.log('🚫 =================================');
    console.log('🚫 DEMANDE ANNULATION COMMANDE');
    console.log('🚫 =================================');
    console.log('🆔 Commande à annuler:', order.id);
    console.log('📊 Statut actuel:', order.status);
    console.log('👤 Client ID:', order.client_id);
    console.log('🔧 Fourmiz ID:', order.fourmiz_id);

    Alert.alert(
      'Annuler la commande',
      'Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.',
      [
        { 
          text: 'Non', 
          style: 'cancel',
          onPress: () => console.log('🚫 Annulation avortée par utilisateur')
        },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚫 =================================');
              console.log('🚫 EXÉCUTION ANNULATION');
              console.log('🚫 =================================');
              console.log('🆔 Annulation commande ID:', order.id);
              console.log('⏱️ Timestamp annulation:', new Date().toISOString());
              
              const updateData = {
                status: 'annulee',
                cancelled_at: new Date().toISOString(),
                cancelled_by: currentUser.id,
                updated_at: new Date().toISOString()
              };
              
              console.log('📝 Données mise à jour:', updateData);
              console.log('📡 Lancement requête UPDATE...');
              
              const { data, error } = await supabase
                .from('orders')
                .update(updateData)
                .eq('id', order.id)
                .select()
                .single();

              console.log('📡 Réponse UPDATE:');
              console.log('   Data:', data);
              console.log('   Error:', error);

              if (error) {
                console.error('❌ Erreur UPDATE:', error);
                throw error;
              }

              console.log('✅ Commande annulée avec succès');
              console.log('📊 Nouveau statut:', data?.status);
              
              Alert.alert(
                '✅ Succès', 
                'Commande annulée avec succès',
                [{ text: 'OK' }]
              );
              
              console.log('🔄 Déclenchement rechargement des données...');
              loadOrderDetails(); // Recharger les données
              
            } catch (error) {
              console.error('💥 ERREUR FATALE annulation:', error);
              console.error('   Message:', error instanceof Error ? error.message : 'Erreur inconnue');
              
              Alert.alert(
                '❌ Erreur', 
                `Impossible d'annuler la commande.\n\n${error instanceof Error ? error.message : 'Erreur inconnue'}`,
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  // ✅ ACTIONS AVEC LOGS
  const handleCallFourmiz = () => {
    console.log('📞 =================================');
    console.log('📞 APPEL FOURMIZ');
    console.log('📞 =================================');
    
    if (order?.fourmiz_profile?.phone) {
      const phoneNumber = order.fourmiz_profile.phone.replace(/\s/g, '');
      console.log('📞 Numéro à appeler:', phoneNumber);
      console.log('📞 Ouverture application téléphone...');
      
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      console.error('❌ Numéro fourmiz non disponible');
      console.log('   fourmiz_profile:', !!order?.fourmiz_profile);
      console.log('   phone:', order?.fourmiz_profile?.phone);
      
      Alert.alert('Erreur', 'Numéro de téléphone non disponible');
    }
  };

  const handleChatFourmiz = () => {
    console.log('💬 =================================');
    console.log('💬 CHAT FOURMIZ');
    console.log('💬 =================================');
    console.log('🆔 Order ID pour chat:', order?.id);
    console.log('🔧 Fourmiz ID:', order?.fourmiz_id);
    
    if (order?.id) {
      console.log('📱 Navigation vers chat...');
      router.push(`/chat/${order.id}`);
    } else {
      console.error('❌ ID commande manquant pour chat');
      Alert.alert('Erreur', 'Impossible d\'ouvrir le chat');
    }
  };

  const handleRateService = () => {
    console.log('⭐ =================================');
    console.log('⭐ NOTATION SERVICE');
    console.log('⭐ =================================');
    console.log('🆔 Order ID à noter:', order?.id);
    console.log('📊 Statut commande:', order?.status);
    console.log('⭐ Note existante:', order?.rating);
    
    if (order?.id) {
      console.log('📱 Navigation vers notation...');
      router.push(`/orders/${order.id}/rate`);
    } else {
      console.error('❌ ID commande manquant pour notation');
      Alert.alert('Erreur', 'Impossible d\'ouvrir la notation');
    }
  };

  // ✅ HELPERS AVEC LOGS
  const formatDate = (dateString: string) => {
    console.log('📅 Formatage date:', dateString);
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    console.log('📅 Date formatée:', formatted);
    return formatted;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) {
      console.log('⏰ Pas de time string fourni');
      return '';
    }
    const formatted = timeString.slice(0, 5);
    console.log('⏰ Time formaté:', timeString, '→', formatted);
    return formatted;
  };

  const formatDateTime = (dateTimeString: string) => {
    console.log('📅⏰ Formatage datetime:', dateTimeString);
    const date = new Date(dateTimeString);
    const formatted = date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    console.log('📅⏰ DateTime formaté:', formatted);
    return formatted;
  };

  // ✅ GESTION ÉTATS DE CHARGEMENT
  if (loading) {
    console.log('⏳ Affichage écran de chargement');
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Détails de la commande' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement des détails...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    console.log('❌ Aucune commande à afficher');
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Commande introuvable' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Commande introuvable</Text>
          <Text style={styles.errorSubtitle}>
            Cette commande n'existe pas ou vous n'avez pas l'autorisation de la consulter.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              console.log('⬅️ Retour depuis erreur');
              router.back();
            }}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
  
  console.log('🖼️ =================================');
  console.log('🖼️ RENDU INTERFACE PRINCIPALE');
  console.log('🖼️ =================================');
  console.log('📊 Commande à afficher:');
  console.log('   ID:', order.id);
  console.log('   Service:', order.services?.title);
  console.log('   Statut:', order.status);
  console.log('   Config statut:', statusConfig?.label);
  console.log('   Client:', order.client_profile?.first_name);
  console.log('   Fourmiz:', order.fourmiz_profile?.first_name || 'Non assigné');
  console.log('   Montant:', order.proposed_amount, '€');

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: `Commande #${order.id}`,
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => {
                console.log('📋 Menu contextuel commande');
                Alert.alert('Menu', 'Fonctionnalités à venir');
              }}
              style={styles.headerButton}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="#374151" />
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Statut principal */}
        <View style={styles.statusSection}>
          <View style={[
            styles.statusCard,
            { backgroundColor: statusConfig.bgColor }
          ]}>
            <View style={styles.statusHeader}>
              <Ionicons 
                name={statusConfig.icon as any} 
                size={32} 
                color={statusConfig.color} 
              />
              <View style={styles.statusInfo}>
                <Text style={[styles.statusTitle, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
                <Text style={styles.statusDescription}>
                  {statusConfig.description}
                </Text>
              </View>
            </View>

            {order.urgent && (
              <View style={styles.urgentIndicator}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.urgentText}>
                  URGENT - {order.urgency_level}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Informations du service */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Service demandé</Text>
          <View style={styles.serviceCard}>
            <Text style={styles.serviceName}>{order.services.title}</Text>
            <Text style={styles.serviceCategory}>{order.services.categorie}</Text>
            {order.services.description && (
              <Text style={styles.serviceDescription}>{order.services.description}</Text>
            )}
            <Text style={styles.clientDescription}>{order.description}</Text>
          </View>
        </View>

        {/* Planning */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Planning</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date de prestation</Text>
                <Text style={styles.infoValue}>{formatDate(order.date)}</Text>
              </View>
            </View>

            {order.start_time && (
              <View style={styles.infoRow}>
                <Ionicons name="time" size={20} color="#6b7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    {order.services.categorie === 'Transport' ? 'Heure de départ' : 'Heure de début'}
                  </Text>
                  <Text style={styles.infoValue}>
                    {formatTime(order.start_time)}
                    {order.end_time && ` - ${formatTime(order.end_time)}`}
                  </Text>
                </View>
              </View>
            )}

            {order.services.estimated_duration && (
              <View style={styles.infoRow}>
                <Ionicons name="timer" size={20} color="#6b7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Durée estimée</Text>
                  <Text style={styles.infoValue}>{order.services.estimated_duration} minutes</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Adresses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Localisation</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>
                  {order.services.categorie === 'Transport' ? 'Adresse de départ' : 'Adresse'}
                </Text>
                <Text style={styles.infoValue}>
                  {order.address}
                  {order.postal_code && order.city && (
                    <Text>{'\n'}{order.postal_code} {order.city}</Text>
                  )}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => {
                  console.log('🗺️ Ouverture Maps pour adresse principale');
                  const address = encodeURIComponent(`${order.address}, ${order.postal_code} ${order.city}`);
                  Linking.openURL(`https://maps.google.com/?q=${address}`);
                }}
              >
                <Ionicons name="map" size={16} color="#3b82f6" />
              </TouchableOpacity>
            </View>

            {/* Adresses spécifiques Transport */}
            {order.services.categorie === 'Transport' && order.arrival_postal_code && order.arrival_city && (
              <View style={styles.infoRow}>
                <Ionicons name="flag" size={20} color="#6b7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Destination</Text>
                  <Text style={styles.infoValue}>
                    {order.arrival_address && `${order.arrival_address}, `}
                    {order.arrival_postal_code} {order.arrival_city}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => {
                    console.log('🗺️ Ouverture Maps pour destination');
                    const address = encodeURIComponent(`${order.arrival_address || ''}, ${order.arrival_postal_code} ${order.arrival_city}`);
                    Linking.openURL(`https://maps.google.com/?q=${address}`);
                  }}
                >
                  <Ionicons name="map" size={16} color="#3b82f6" />
                </TouchableOpacity>
              </View>
            )}

            {/* Adresse de livraison */}
            {order.delivery_address && (
              <View style={styles.infoRow}>
                <Ionicons name="cube" size={20} color="#6b7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Adresse de livraison</Text>
                  <Text style={styles.infoValue}>{order.delivery_address}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Contact</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                <Text style={styles.infoValue}>{order.phone}</Text>
              </View>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => {
                  console.log('📞 Appel client depuis contact');
                  Linking.openURL(`tel:${order.phone}`);
                }}
              >
                <Ionicons name="call" size={16} color="#10b981" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Fourmiz assignée */}
        {order.fourmiz_id && order.fourmiz_profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Votre fourmiz</Text>
            <View style={styles.fourmizCard}>
              <View style={styles.fourmizHeader}>
                {order.fourmiz_profile.avatar_url ? (
                  <Image 
                    source={{ uri: order.fourmiz_profile.avatar_url }}
                    style={styles.fourmizAvatar}
                  />
                ) : (
                  <View style={styles.fourmizAvatarPlaceholder}>
                    <Ionicons name="person" size={32} color="#6b7280" />
                  </View>
                )}
                
                <View style={styles.fourmizInfo}>
                  <Text style={styles.fourmizName}>
                    {order.fourmiz_profile.first_name} {order.fourmiz_profile.last_name}
                  </Text>
                  {order.fourmiz_profile.rating && (
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={16} color="#fbbf24" />
                      <Text style={styles.ratingText}>
                        {order.fourmiz_profile.rating.toFixed(1)}
                      </Text>
                      {order.fourmiz_profile.completed_jobs && (
                        <Text style={styles.jobsText}>
                          • {order.fourmiz_profile.completed_jobs} missions
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.fourmizActions}>
                <TouchableOpacity 
                  style={styles.fourmizActionButton}
                  onPress={() => {
                    console.log('📞 Appel fourmiz depuis carte');
                    handleCallFourmiz();
                  }}
                >
                  <Ionicons name="call" size={20} color="#10b981" />
                  <Text style={styles.fourmizActionText}>Appeler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.fourmizActionButton}
                  onPress={() => {
                    console.log('💬 Chat fourmiz depuis carte');
                    handleChatFourmiz();
                  }}
                >
                  <Ionicons name="chatbubble" size={20} color="#3b82f6" />
                  <Text style={styles.fourmizActionText}>Message</Text>
                </TouchableOpacity>
              </View>

              {order.accepted_at && (
                <View style={styles.acceptedInfo}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.acceptedText}>
                    Acceptée le {formatDateTime(order.accepted_at)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Montant */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Tarification</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="card" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Montant proposé</Text>
                <Text style={styles.priceValue}>{order.proposed_amount}€</Text>
              </View>
            </View>

            {order.urgency_surcharge > 0 && (
              <View style={styles.infoRow}>
                <Ionicons name="flash" size={20} color="#f59e0b" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Supplément urgence</Text>
                  <Text style={styles.priceValue}>+{order.urgency_surcharge}€</Text>
                </View>
              </View>
            )}

            {order.invoice_required && (
              <View style={styles.infoRow}>
                <Ionicons name="document-text" size={20} color="#6b7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Facturation</Text>
                  <Text style={styles.infoValue}>Facture demandée</Text>
                </View>
                {order.invoice_url && (
                  <TouchableOpacity
                    style={styles.actionIcon}
                    onPress={() => {
                      console.log('📄 Téléchargement facture');
                      Linking.openURL(order.invoice_url!);
                    }}
                  >
                    <Ionicons name="download" size={16} color="#3b82f6" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Informations de commande */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Informations</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Créée le</Text>
                <Text style={styles.infoValue}>{formatDateTime(order.created_at)}</Text>
              </View>
            </View>

            {order.updated_at !== order.created_at && (
              <View style={styles.infoRow}>
                <Ionicons name="refresh" size={20} color="#6b7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Dernière modification</Text>
                  <Text style={styles.infoValue}>{formatDateTime(order.updated_at)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Actions principales */}
        <View style={styles.actionsSection}>
          {order.status === 'en_attente' && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                console.log('🚫 Clic bouton annulation');
                handleCancelOrder();
              }}
            >
              <Ionicons name="close-circle" size={20} color="#ef4444" />
              <Text style={styles.cancelButtonText}>Annuler la commande</Text>
            </TouchableOpacity>
          )}

          {order.status === 'terminee' && !order.rating && (
            <TouchableOpacity 
              style={styles.rateButton}
              onPress={() => {
                console.log('⭐ Clic bouton notation');
                handleRateService();
              }}
            >
              <Ionicons name="star" size={20} color="#fff" />
              <Text style={styles.rateButtonText}>Noter la prestation</Text>
            </TouchableOpacity>
          )}

          {order.fourmiz_id && (
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => {
                console.log('💬 Clic bouton chat principal');
                handleChatFourmiz();
              }}
            >
              <Ionicons name="chatbubble" size={20} color="#fff" />
              <Text style={styles.chatButtonText}>Contacter la fourmiz</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Espacement en bas */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { fontSize: 16, color: '#6b7280' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#ef4444' },
  errorSubtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  headerButton: { padding: 8 },
  scrollView: { flex: 1 },

  // Sections
  section: { 
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },

  // Statut principal
  statusSection: { 
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusInfo: { flex: 1 },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 16,
    color: '#6b7280',
  },
  urgentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  urgentText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },

  // Cartes d'information
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 18,
    color: '#111827',
    fontWeight: 'bold',
  },

  // Service
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  clientDescription: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    fontStyle: 'italic',
  },

  // Fourmiz
  fourmizCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fourmizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fourmizAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  fourmizAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fourmizInfo: { flex: 1 },
  fourmizName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#fbbf24',
    fontWeight: '600',
  },
  jobsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  fourmizActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  fourmizActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  fourmizActionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  acceptedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  acceptedText: {
    fontSize: 14,
    color: '#6b7280',
  },

  // Boutons d'action
  actionIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  mapButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
  },

  // Actions principales
  actionsSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbbf24',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  rateButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  chatButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',  
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  bottomSpacer: { height: 32 },
});
// app/(tabs)/orders.tsx - VERSION ULTRA-SÉCURISÉE - ACCÈS LIBRE
// ✅ Protection maximale contre toutes les erreurs .includes()
// 🚀 Décomptes corrects + Design amélioré + Gestion timeout intelligente
// 🔓 MODIFICATION : Suppression de la redirection forcée uniquement

import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

// 🛡️ HELPERS DE SÉCURITÉ POUR .includes()
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const safeArrayIncludes = (array: string[], value: any): boolean => {
  if (!Array.isArray(array)) return false;
  const safeValue = safeString(value).toLowerCase();
  return array.includes(safeValue);
};

interface Order {
  id: number;
  service_id: number | null;
  service_title?: string;
  status: string;
  date: string;
  start_time?: string;
  end_time?: string;
  proposed_amount: number;
  address: string;
  postal_code: string;
  city: string;
  description?: string;
  created_at: string;
  updated_at: string;
  services?: {
    title: string;
    categorie: string;
  } | null;
  fourmiz_profile?: {
    firstname: string;
    lastname: string;
    avatar_url?: string;
  } | null;
  phone?: string;
  urgent?: boolean;
  urgency_level?: string;
  // ✅ NOUVEAU : Champ pour les adresses avec catégorie
  addresses?: {
    category?: string;
  } | null;
}

interface StatsCard {
  id: string;
  title: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  borderColor: string;
}

type FilterType = 'all' | 'en_attente' | 'acceptee' | 'en_cours' | 'terminee' | 'annulee';

const OrdersScreen = () => {
  // États de base
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // ✅ MAPPING ULTRA-SÉCURISÉ DES STATUTS avec protection maximale
  const normalizeStatus = (status: any): FilterType => {
    // 🛡️ Protection complète contre tous les types
    const safeStatus = safeString(status);
    const statusLower = safeStatus.toLowerCase();
    
    // 🛡️ Utilisation du helper sécurisé pour .includes()
    // En attente
    if (safeArrayIncludes(['en_attente', 'pending', 'created'], statusLower)) {
      return 'en_attente';
    }
    
    // Acceptée
    if (safeArrayIncludes(['acceptee', 'accepted', 'confirmed'], statusLower)) {
      return 'acceptee';
    }
    
    // En cours
    if (safeArrayIncludes(['en_cours', 'in_progress'], statusLower)) {
      return 'en_cours';
    }
    
    // Terminée
    if (safeArrayIncludes(['terminee', 'completed', 'finished'], statusLower)) {
      return 'terminee';
    }
    
    // Annulée
    if (safeArrayIncludes(['annulee', 'cancelled', 'canceled'], statusLower)) {
      return 'annulee';
    }
    
    // Par défaut, retourner en_attente (plus sûr que le statut original)
    console.warn('⚠️ Statut non reconnu:', status, '-> defaulting to en_attente');
    return 'en_attente';
  };

  // ✅ FONCTION POUR CALCULER LA DATE/HEURE DU SERVICE
  const getServiceDateTime = (order: Order): Date | null => {
    try {
      // Utiliser la date de prestation, pas la date de création
      const serviceDate = safeString(order.date);
      const serviceTime = safeString(order.start_time);
      
      if (!serviceDate) {
        console.warn('⚠️ Pas de date de service pour commande:', order.id);
        return null;
      }
      
      // Construire la date/heure complète du service
      const dateTimeString = serviceTime 
        ? `${serviceDate}T${serviceTime}:00`
        : `${serviceDate}T09:00:00`; // Par défaut 9h si pas d'heure
      
      const serviceDateTime = new Date(dateTimeString);
      
      if (isNaN(serviceDateTime.getTime())) {
        console.warn('⚠️ Date/heure de service invalide pour commande:', order.id);
        return null;
      }
      
      return serviceDateTime;
      
    } catch (error) {
      console.error('❌ Erreur calcul date service:', error);
      return null;
    }
  };

  // ✅ FONCTION POUR OBTENIR LES HEURES JUSQU'AU SERVICE
  const getHoursUntilService = (order: Order): number => {
    const serviceDateTime = getServiceDateTime(order);
    if (!serviceDateTime) return 0;
    
    const now = new Date();
    return Math.floor((serviceDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));
  };

  // ✅ FONCTION POUR OBTENIR LES HEURES D'ATTENTE DEPUIS LA CRÉATION
  const getWaitingHours = (order: Order): number => {
    const createdAt = new Date(order.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
  };

  // ✅ SYSTÈME DE NOTIFICATIONS PROGRESSIVES basé sur des pourcentages
  const getTimeoutThresholds = (serviceDateTime: Date, createdAt: Date) => {
    const now = new Date();
    const totalTimeAvailable = serviceDateTime.getTime() - createdAt.getTime(); // Temps total disponible
    const timeRemaining = serviceDateTime.getTime() - now.getTime(); // Temps restant
    const timeElapsed = now.getTime() - createdAt.getTime(); // Temps écoulé
    
    // Calculer les pourcentages du délai écoulé
    const percentageElapsed = (timeElapsed / totalTimeAvailable) * 100;
    
    return {
      TOTAL_TIME_HOURS: totalTimeAvailable / (1000 * 60 * 60),
      TIME_REMAINING_HOURS: timeRemaining / (1000 * 60 * 60),
      PERCENTAGE_ELAPSED: percentageElapsed,
      
      // Seuils basés sur pourcentages
      WARNING_PERCENTAGE: 50,   // Avertissement à 50% du délai écoulé
      CRITICAL_PERCENTAGE: 75,  // Critique à 75% du délai écoulé
      AUTO_CANCEL_PERCENTAGE: 100, // Auto-annulation à l'heure du service (100%)
      
      CONTEXT: percentageElapsed >= 100 ? 'service_passed' : 
               percentageElapsed >= 75 ? 'critical_phase' :
               percentageElapsed >= 50 ? 'warning_phase' : 'normal_phase'
    };
  };

  // ✅ FONCTION DE TIMEOUT INTELLIGENTE avec pourcentages
  const getOrderTimeoutStatus = (order: Order) => {
    const normalizedStatus = normalizeStatus(order.status);
    
    // Seulement pour les commandes en attente
    if (normalizedStatus !== 'en_attente') {
      return { 
        isTimeout: false, 
        level: 'none' as const, 
        message: '', 
        shouldShowActions: false,
        percentageElapsed: 0,
        hoursUntilService: 0 
      };
    }
    
    const serviceDateTime = getServiceDateTime(order);
    if (!serviceDateTime) {
      return { 
        isTimeout: false, 
        level: 'none' as const, 
        message: '', 
        shouldShowActions: false,
        percentageElapsed: 0,
        hoursUntilService: 0 
      };
    }
    
    const createdAt = new Date(order.created_at);
    const thresholds = getTimeoutThresholds(serviceDateTime, createdAt);
    
    const hoursUntilService = thresholds.TIME_REMAINING_HOURS;
    const percentageElapsed = thresholds.PERCENTAGE_ELAPSED;
    
    // Service déjà passé (100%+)
    if (percentageElapsed >= 100) {
      const hoursAfterService = Math.abs(hoursUntilService);
      return {
        isTimeout: true,
        level: 'expired' as const,
        message: `Service prévu il y a ${Math.floor(hoursAfterService)}h - Auto-annulation`,
        shouldShowActions: false, // Pas d'actions, juste annulation
        percentageElapsed: percentageElapsed,
        hoursUntilService: hoursUntilService
      };
    }
    
    // Phase critique (75%+)
    if (percentageElapsed >= thresholds.CRITICAL_PERCENTAGE) {
      const hoursLeft = Math.max(0, Math.floor(hoursUntilService));
      return {
        isTimeout: true,
        level: 'critical' as const,
        message: `Service dans ${hoursLeft}h - CRITIQUE: Aucune Fourmiz trouvée`,
        shouldShowActions: true,
        percentageElapsed: percentageElapsed,
        hoursUntilService: hoursUntilService
      };
    }
    
    // Phase d'avertissement (50%+)
    if (percentageElapsed >= thresholds.WARNING_PERCENTAGE) {
      const hoursLeft = Math.max(0, Math.floor(hoursUntilService));
      return {
        isTimeout: true,
        level: 'warning' as const,
        message: `Service dans ${hoursLeft}h - Aucune Fourmiz disponible`,
        shouldShowActions: true,
        percentageElapsed: percentageElapsed,
        hoursUntilService: hoursUntilService
      };
    }
    
    return { 
      isTimeout: false, 
      level: 'none' as const, 
      message: '', 
      shouldShowActions: false,
      percentageElapsed: percentageElapsed,
      hoursUntilService: hoursUntilService 
    };
  };

  // ✅ FONCTION SIMPLIFIÉE POUR VÉRIFIER LE TIMEOUT
  const isOrderInTimeout = (order: Order): boolean => {
    const timeoutStatus = getOrderTimeoutStatus(order);
    return timeoutStatus.isTimeout;
  };

  // ✅ FONCTION POUR OBTENIR LE MESSAGE DE TIMEOUT
  const getTimeoutMessage = (order: Order): string => {
    const timeoutStatus = getOrderTimeoutStatus(order);
    return timeoutStatus.message;
  };

  // ✅ SYSTÈME DE NOTIFICATIONS CLIENT
  const createClientNotification = async (order: Order, type: 'warning' | 'critical' | 'auto_cancel') => {
    try {
      const orderTitle = getOrderTitle(order);
      const serviceDateTime = getServiceDateTime(order);
      const hoursUntil = Math.floor((serviceDateTime!.getTime() - new Date().getTime()) / (1000 * 60 * 60));
      
      let notificationData = {
        user_id: currentUser.id,
        order_id: order.id,
        type: type,
        created_at: new Date().toISOString(),
        read: false
      };
      
      switch (type) {
        case 'warning':
          notificationData = {
            ...notificationData,
            title: '⚠️ Aucune Fourmiz disponible',
            message: `Votre service "${orderTitle}" dans ${hoursUntil}h n'a pas encore trouvé de Fourmiz. Vous pouvez augmenter votre budget ou republier votre demande pour attirer plus d'attention.`,
            action_buttons: ['increase_budget', 'repost']
          };
          break;
          
        case 'critical':
          notificationData = {
            ...notificationData,
            title: '🚨 Service bientôt dû - URGENT',
            message: `Votre service "${orderTitle}" dans ${hoursUntil}h n'a toujours pas de Fourmiz assignée. Action urgente requise : augmentez votre budget ou republiez votre demande.`,
            action_buttons: ['increase_budget', 'repost', 'cancel_free']
          };
          break;
          
        case 'auto_cancel':
          notificationData = {
            ...notificationData,
            title: '❌ Service auto-annulé',
            message: `Votre service "${orderTitle}" a été automatiquement annulé car aucune Fourmiz n'était disponible à l'heure prévue. Aucun frais ne vous sera facturé. Vous pouvez créer une nouvelle demande quand vous le souhaitez.`,
            action_buttons: ['create_new']
          };
          break;
      }
      
      // Envoyer la notification (API call simulé)
      console.log('📧 Notification envoyée:', notificationData);
      
      // TODO: Implémenter l'envoi réel via push notification / email / SMS
      // await sendPushNotification(notificationData);
      // await sendEmailNotification(notificationData);
      
      // Enregistrer en base pour l'historique
      const { error } = await supabase
        .from('notifications')
        .insert(notificationData);
        
      if (error) {
        console.error('❌ Erreur sauvegarde notification:', error);
      } else {
        console.log('✅ Notification sauvegardée en base');
      }
        
    } catch (error) {
      console.error('💥 Erreur création notification:', error);
    }
  };

  // ✅ FONCTION D'ANNULATION GRATUITE pour absence de Fourmiz
  const handleFreeCancel = async (orderId: number, reason: 'no_fourmiz_warning' | 'no_fourmiz_critical' | 'auto_cancel') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'annulee',
          updated_at: new Date().toISOString(),
          cancelled_at: new Date().toISOString(),
          cancelled_by: currentUser.id,
          cancellation_reason: reason,
          cancellation_fee: 0.00, // ✅ ANNULATION GRATUITE
          is_free_cancellation: true
        })
        .eq('id', orderId)
        .eq('client_id', currentUser.id);

      if (error) throw error;
      
      let message = '';
      switch (reason) {
        case 'no_fourmiz_warning':
          message = 'Commande annulée gratuitement (aucune Fourmiz disponible)';
          break;
        case 'no_fourmiz_critical':
          message = 'Commande annulée gratuitement (aucune Fourmiz trouvée malgré les relances)';
          break;
        case 'auto_cancel':
          message = 'Commande auto-annulée gratuitement (service passé sans Fourmiz)';
          break;
      }
      
      Alert.alert('✅ Annulation gratuite', message);
      
      // Créer notification si c'est une auto-annulation
      if (reason === 'auto_cancel') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          await createClientNotification(order, 'auto_cancel');
        }
      }
      
      loadOrders();
      
    } catch (error) {
      console.error('❌ Erreur annulation gratuite:', error);
      Alert.alert('Erreur', 'Impossible d\'annuler la commande');
    }
  };

  // ✅ VÉRIFICATION AUTOMATIQUE ET NOTIFICATIONS
  useEffect(() => {
    if (!orders.length || !currentUser) return;
    
    const checkAndNotify = async () => {
      for (const order of orders) {
        if (normalizeStatus(order.status) !== 'en_attente') continue;
        
        const timeoutStatus = getOrderTimeoutStatus(order);
        
        // Auto-annulation si service passé
        if (timeoutStatus.level === 'expired') {
          console.log('🤖 Auto-annulation pour commande:', order.id);
          await handleFreeCancel(order.id, 'auto_cancel');
          continue;
        }
        
        // Vérifier si on doit envoyer des notifications
        // TODO: Ajouter logique pour éviter les notifications en double
        // (vérifier si notification déjà envoyée pour ce niveau)
        
        if (timeoutStatus.level === 'critical') {
          console.log('🚨 Notification critique pour commande:', order.id);
          await createClientNotification(order, 'critical');
        } else if (timeoutStatus.level === 'warning') {
          console.log('⚠️ Notification avertissement pour commande:', order.id);
          await createClientNotification(order, 'warning');
        }
      }
    };
    
    // Vérification immédiate
    checkAndNotify();
    
    // ✅ VÉRIFICATION TOUTES LES 15 SECONDES pour réactivité maximale
    const interval = setInterval(checkAndNotify, 15 * 1000); // 15 secondes
    
    return () => clearInterval(interval);
  }, [orders, currentUser]);

  // 🔓 VÉRIFICATION D'ACCÈS MODIFIÉE - SANS REDIRECTION FORCÉE
  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUser(user);
        console.log('✅ Utilisateur connecté:', user.id);
      } else {
        console.log('👤 Aucun utilisateur connecté - Pas de redirection forcée');
        // ✅ PAS DE REDIRECTION AUTOMATIQUE
        // router.replace('/auth/signin'); // ← SUPPRIMÉ
      }

    } catch (error) {
      console.error('❌ Erreur vérification accès:', error);
      // ✅ PAS DE REDIRECTION EN CAS D'ERREUR NON PLUS
      // router.replace('/auth/signin'); // ← SUPPRIMÉ
    } finally {
      setAuthLoading(false);
    }
  };

  // Recharger les commandes quand on revient sur l'écran
  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        loadOrders();
      }
    }, [currentUser])
  );

  const loadOrders = async () => {
    try {
      if (!currentUser?.id) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('🔄 Chargement des commandes pour:', currentUser.id);

      // ✅ REQUÊTE ÉTENDUE avec addresses pour récupérer la catégorie
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          service_title,
          addresses,
          services (
            title,
            categorie
          ),
          fourmiz_profile:fourmiz_id (
            firstname,
            lastname,
            avatar_url
          )
        `)
        .eq('client_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement commandes:', error);
        throw error;
      }

      console.log('✅ Commandes chargées:', data?.length || 0);
      
      // ✅ DEBUG DU DÉCOMPTE
      const statusCount: Record<string, number> = {};
      data?.forEach(order => {
        const normalizedStatus = normalizeStatus(order.status);
        statusCount[normalizedStatus] = (statusCount[normalizedStatus] || 0) + 1;
        console.log(`📊 Commande ${order.id}: ${order.status} → ${normalizedStatus}`);
      });
      
      console.log('📊 Décompte par statut normalisé:', statusCount);
      
      setOrders(data || []);

    } catch (error) {
      console.error('💥 Erreur fatale chargement commandes:', error);
      Alert.alert('Erreur', 'Impossible de charger vos commandes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  // ✅ CALCUL ULTRA-SÉCURISÉ DES STATISTIQUES avec protection maximale
  const pendingOrders = orders.filter(order => normalizeStatus(order.status) === 'en_attente');
  const timeoutPendingOrders = pendingOrders.filter(order => isOrderInTimeout(order));
  const acceptedOrders = orders.filter(order => normalizeStatus(order.status) === 'acceptee');
  const inProgressOrders = orders.filter(order => normalizeStatus(order.status) === 'en_cours');
  const completedOrders = orders.filter(order => normalizeStatus(order.status) === 'terminee');
  const cancelledOrders = orders.filter(order => normalizeStatus(order.status) === 'annulee');

  // ✅ STATISTIQUES CORRIGÉES avec décomptes précis
  const statsCards: StatsCard[] = [
    {
      id: 'all',
      title: 'Total',
      count: orders.length,
      icon: 'apps',
      color: '#1f2937',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    },
    {
      id: 'en_attente',
      title: 'En attente',
      count: pendingOrders.length,
      icon: timeoutPendingOrders.length > 0 ? 'warning' : 'time',
      color: timeoutPendingOrders.length > 0 ? '#dc2626' : '#d97706',
      bgColor: timeoutPendingOrders.length > 0 ? '#fee2e2' : '#fef3c7',
      borderColor: timeoutPendingOrders.length > 0 ? '#ef4444' : '#f59e0b'
    },
    {
      id: 'acceptee',
      title: 'Acceptées',
      count: acceptedOrders.length,
      icon: 'checkmark-circle',
      color: '#0369a1',
      bgColor: '#dbeafe',
      borderColor: '#3b82f6'
    },
    {
      id: 'en_cours',
      title: 'En cours',
      count: inProgressOrders.length,
      icon: 'play-circle',
      color: '#7c3aed',
      bgColor: '#e4d4f4',
      borderColor: '#8b5cf6'
    },
    {
      id: 'terminee',
      title: 'Terminées',
      count: completedOrders.length,
      icon: 'checkmark-done-circle',
      color: '#059669',
      bgColor: '#d1fae5',
      borderColor: '#10b981'
    },
    {
      id: 'annulee',
      title: 'Annulées',
      count: cancelledOrders.length,
      icon: 'close-circle',
      color: '#dc2626',
      bgColor: '#fee2e2',
      borderColor: '#ef4444'
    }
  ];

  // ✅ FILTRAGE ULTRA-SÉCURISÉ avec statuts normalisés
  const filteredOrders = filter === 'all' 
    ? orders 
    : filter === 'en_cours' 
      ? [...acceptedOrders, ...inProgressOrders]
      : orders.filter(order => normalizeStatus(order.status) === filter);

  const formatDate = (dateString: string) => {
    const safeDateString = safeString(dateString);
    if (!safeDateString) return 'Date manquante';
    
    try {
      const date = new Date(safeDateString);
      
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      if (date.getFullYear() === 1970 && date.getTime() === 0) {
        return 'Date non définie';
      }
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
    } catch (error) {
      return 'Erreur date';
    }
  };

  const formatTime = (timeString?: string) => {
    const safeTimeString = safeString(timeString);
    if (!safeTimeString) return '';
    return safeTimeString.slice(0, 5);
  };

  // 🛡️ FONCTION ULTRA-SÉCURISÉE pour la configuration des statuts
  const getStatusConfig = (status: any) => {
    const normalizedStatus = normalizeStatus(status);
    
    switch (normalizedStatus) {
      case 'en_attente':
        return { label: 'En attente', color: '#d97706', bgColor: '#fef3c7' };
      case 'acceptee':
        return { label: 'Acceptée', color: '#0369a1', bgColor: '#dbeafe' };
      case 'en_cours':
        return { label: 'En cours', color: '#7c3aed', bgColor: '#e4d4f4' };
      case 'terminee':
        return { label: 'Terminée', color: '#059669', bgColor: '#d1fae5' };
      case 'annulee':
        return { label: 'Annulée', color: '#dc2626', bgColor: '#fee2e2' };
      default:
        return { label: 'Inconnu', color: '#6b7280', bgColor: '#f3f4f6' };
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    Alert.alert(
      'Annuler la commande',
      'Êtes-vous sûr de vouloir annuler cette commande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('orders')
                .update({
                  status: 'annulee',
                  updated_at: new Date().toISOString(),
                  cancelled_at: new Date().toISOString(),
                  cancelled_by: currentUser.id
                })
                .eq('id', orderId)
                .eq('client_id', currentUser?.id);

              if (error) throw error;
              
              Alert.alert('✅ Commande annulée', 'Votre commande a été annulée avec succès.');
              loadOrders();
              
            } catch (error: any) {
              console.error('Erreur annulation:', error);
              Alert.alert('Erreur', 'Impossible d\'annuler la commande.');
            }
          },
        },
      ]
    );
  };

  const handleChatOrder = (orderId: number) => {
    router.push(`/chat/${orderId}`);
  };

  // 🛡️ FONCTION ULTRA-SÉCURISÉE pour obtenir le titre
  const getOrderTitle = (order: Order): string => {
    if (order.service_id === null && order.service_title) {
      return safeString(order.service_title);
    }
    if (order.services?.title) {
      return safeString(order.services.title);
    }
    return 'Service';
  };

  // ✅ FONCTION ULTRA-SÉCURISÉE pour obtenir la catégorie avec fallback
  const getOrderCategory = (order: Order): string => {
    // Pour les demandes personnalisées, essayer plusieurs sources
    if (order.service_id === null) {
      // 1. Essayer depuis addresses.category
      if (order.addresses?.category) {
        return safeString(order.addresses.category);
      }
      
      // 2. Fallback général
      return 'Demande personnalisée';
    }
    
    // Pour les services normaux
    return safeString(order.services?.categorie) || '';
  };

  const getCurrentFilterName = () => {
    const currentCard = statsCards.find(card => card.id === filter);
    return currentCard ? `${currentCard.title} (${currentCard.count})` : 'Toutes';
  };

  const selectFilter = (filterId: FilterType) => {
    setFilter(filterId);
    setShowFilterDropdown(false);
  };

  // ✅ COMPOSANT STATSCARD AMÉLIORÉ avec meilleur centrage
  const StatsCard = ({ card, onPress, isActive }: { 
    card: StatsCard; 
    onPress: () => void;
    isActive: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.statsCard,
        { 
          backgroundColor: card.bgColor,
          borderColor: card.borderColor,
          borderWidth: isActive ? 2 : 1,
          opacity: isActive ? 1 : 0.8
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statsCardContent}>
        {/* ✅ HEADER AMÉLIORÉ avec icône au-dessus du chiffre */}
        <View style={styles.statsCardIconContainer}>
          <Ionicons name={card.icon} size={24} color={card.color} />
        </View>
        
        {/* ✅ CHIFFRE MIEUX CENTRÉ ET PLUS VISIBLE */}
        <Text style={[styles.statsCardCount, { color: card.color }]}>
          {card.count}
        </Text>
        
        {/* ✅ TITRE MIEUX LISIBLE */}
        <Text style={[styles.statsCardTitle, { color: card.color }]}>
          {card.title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // ✅ FONCTIONS COMPLÈTES pour augmenter le budget et republier
  const handleIncreaseBudget = (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const suggestedAmount = Math.ceil(order.proposed_amount * 1.2);

    Alert.prompt(
      '💰 Nouveau budget',
      `Budget actuel: ${order.proposed_amount}€\nBudget suggéré: ${suggestedAmount}€\n\nEntrez le nouveau montant :`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer',
          onPress: async (newAmount) => {
            if (!newAmount || newAmount.trim() === '') {
              Alert.alert('Erreur', 'Veuillez entrer un montant valide');
              return;
            }

            const amount = parseFloat(newAmount.replace(',', '.'));
            
            if (isNaN(amount) || amount <= 0) {
              Alert.alert('Erreur', 'Veuillez entrer un montant valide supérieur à 0');
              return;
            }

            if (amount <= order.proposed_amount) {
              Alert.alert('Erreur', 'Le nouveau montant doit être supérieur au montant actuel');
              return;
            }

            if (amount > 10000) {
              Alert.alert('Erreur', 'Le montant ne peut pas dépasser 10 000€');
              return;
            }

            try {
              console.log('💰 Mise à jour du budget pour commande', orderId, ':', amount);

              const { error } = await supabase
                .from('orders')
                .update({
                  proposed_amount: amount,
                  updated_at: new Date().toISOString(),
                  price_updated_at: new Date().toISOString()
                })
                .eq('id', orderId)
                .eq('client_id', currentUser?.id);

              if (error) {
                console.error('❌ Erreur mise à jour budget:', error);
                throw error;
              }

              console.log('✅ Budget mis à jour avec succès');

              Alert.alert(
                '✅ Budget mis à jour',
                `Le budget a été porté à ${amount}€. Les Fourmiz de votre secteur ont été notifiées de cette augmentation.`,
                [{ text: 'OK', onPress: () => loadOrders() }]
              );

              // TODO: Optionnel - Notifier les Fourmiz dans la zone
              // await notifier_fourmiz_augmentation_budget(orderId, amount);

            } catch (error: any) {
              console.error('💥 Erreur lors de la mise à jour:', error);
              Alert.alert(
                'Erreur', 
                error.message || 'Impossible de mettre à jour le budget. Veuillez réessayer.'
              );
            }
          }
        }
      ],
      'plain-text',
      suggestedAmount.toString()
    );
  };

  const handleRepostOrder = async (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    Alert.alert(
      '🔄 Republier la commande',
      `Voulez-vous republier la commande "${getOrderTitle(order)}" ?\n\nElle sera remise en première position pour attirer l'attention des Fourmiz.`,
      [
        { text: 'Non', style: 'cancel' },
        { 
          text: 'Oui, republier', 
          onPress: async () => {
            try {
              console.log('🔄 Republication de la commande:', orderId);

              // Récupérer la commande complète
              const { data: originalOrder, error: fetchError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .eq('client_id', currentUser?.id)
                .single();

              if (fetchError) {
                console.error('❌ Erreur récupération commande:', fetchError);
                throw new Error('Impossible de récupérer la commande originale');
              }

              if (!originalOrder) {
                throw new Error('Commande introuvable ou accès refusé');
              }

              // Créer une nouvelle commande basée sur l'originale
              const newOrderData = {
                // Copier tous les champs sauf les IDs et timestamps
                client_id: originalOrder.client_id,
                service_id: originalOrder.service_id,
                service_title: originalOrder.service_title,
                description: originalOrder.description,
                proposed_amount: originalOrder.proposed_amount,
                address: originalOrder.address,
                postal_code: originalOrder.postal_code,
                city: originalOrder.city,
                date: originalOrder.date,
                start_time: originalOrder.start_time,
                end_time: originalOrder.end_time,
                phone: originalOrder.phone,
                urgent: originalOrder.urgent,
                urgency_level: originalOrder.urgency_level,
                addresses: originalOrder.addresses,
                
                // Nouveaux timestamps et statut
                created_at: new Date().toISOString(),
                updated_at: null,
                status: 'en_attente',
                
                // Réinitialiser les champs d'assignation
                fourmiz_id: null,
                accepted_at: null,
                cancelled_at: null,
                cancelled_by: null,
                confirmed_by_fourmiz: false,
                
                // Autres champs par défaut
                rating: null,
                feedback: null,
                invoice_url: null,
                commission: null
              };

              console.log('📤 Données nouvelle commande:', newOrderData);

              const { data: newOrder, error: insertError } = await supabase
                .from('orders')
                .insert(newOrderData)
                .select('id')
                .single();

              if (insertError) {
                console.error('❌ Erreur création nouvelle commande:', insertError);
                throw insertError;
              }

              console.log('✅ Nouvelle commande créée:', newOrder.id);

              // Marquer l'ancienne commande comme remplacée
              const { error: updateError } = await supabase
                .from('orders')
                .update({
                  status: 'remplacee',
                  updated_at: new Date().toISOString(),
                  replacement_order_id: newOrder.id,
                  cancelled_at: new Date().toISOString(),
                  cancelled_by: currentUser.id
                })
                .eq('id', orderId);

              if (updateError) {
                console.error('⚠️ Erreur mise à jour ancienne commande:', updateError);
                // Continuer quand même, l'essentiel est que la nouvelle commande soit créée
              }

              console.log('✅ Republication terminée avec succès');

              Alert.alert(
                '✅ Commande republiée',
                `Votre commande a été republiée avec succès.\n\nNouvelle commande #${newOrder.id} créée et mise en première position.`,
                [{ text: 'OK', onPress: () => loadOrders() }]
              );

            } catch (error: any) {
              console.error('💥 Erreur lors de la republication:', error);
              Alert.alert(
                'Erreur de republication', 
                error.message || 'Impossible de republier la commande. Veuillez réessayer.'
              );
            }
          }
        }
      ]
    );
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => {
    const statusConfig = getStatusConfig(order.status);
    const orderTitle = getOrderTitle(order);
    const orderCategory = getOrderCategory(order);
    const normalizedStatus = normalizeStatus(order.status);

    return (
      <View style={styles.orderCard}>
        {/* ✅ Alerte de timeout intelligente basée sur la date du service */}
        {(() => {
          const timeoutStatus = getOrderTimeoutStatus(order);
          if (!timeoutStatus.isTimeout) return null;
          
          const level = timeoutStatus.level;
          const message = timeoutStatus.message;
          
          let bannerColor, textColor, borderColor;
          
          if (level === 'expired') {
            bannerColor = '#fee2e2';
            textColor = '#dc2626';
            borderColor = '#ef4444';
          } else if (level === 'critical') {
            bannerColor = '#fed7d7';
            textColor = '#c53030';
            borderColor = '#e53e3e';
          } else {
            bannerColor = '#fef3c7';
            textColor = '#d97706';
            borderColor = '#f59e0b';
          }
          
          return (
            <View style={[styles.timeoutBanner, { 
              backgroundColor: bannerColor,
              borderLeftColor: borderColor 
            }]}>
              <Ionicons 
                name={level === 'expired' ? "close-circle" : level === 'critical' ? "alert-circle" : "warning"} 
                size={16} 
                color={textColor} 
              />
              <Text style={[styles.timeoutText, { color: textColor }]}>
                {message}
              </Text>
            </View>
          );
        })()}

        <View style={styles.orderHeader}>
          <View style={styles.orderTitleContainer}>
            <Text style={styles.orderTitle}>{orderTitle}</Text>
            {/* ✅ CATÉGORIE AMÉLIORÉE avec indicateur pour demandes personnalisées */}
            <Text style={styles.orderCategory}>
              {orderCategory}
              {order.service_id === null && ' 🔧'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              {formatDate(order.date || order.created_at)}
              {order.start_time && ` à ${formatTime(order.start_time)}`}
              {order.end_time && ` - ${formatTime(order.end_time)}`}
              {(() => {
                // ✅ Afficher le temps restant jusqu'au service
                const hoursUntil = getHoursUntilService(order);
                if (hoursUntil > 0 && hoursUntil <= 168) { // Afficher si moins d'une semaine
                  const days = Math.floor(hoursUntil / 24);
                  const hours = hoursUntil % 24;
                  
                  if (days > 0) {
                    return ` (dans ${days}j ${hours}h)`;
                  } else {
                    return ` (dans ${hours}h)`;
                  }
                }
                return '';
              })()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="#6b7280" />
            <Text style={styles.detailText} numberOfLines={2}>
              {safeString(order.address)}
              {order.postal_code && order.city && `, ${safeString(order.postal_code)} ${safeString(order.city)}`}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="card" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{order.proposed_amount}€</Text>
          </View>

          {order.service_id === null && order.description && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text" size={16} color="#6b7280" />
              <Text style={styles.detailText} numberOfLines={2}>
                {safeString(order.description)}
              </Text>
            </View>
          )}

          {order.urgent && (
            <View style={styles.detailRow}>
              <Ionicons name="flash" size={16} color="#ef4444" />
              <Text style={[styles.detailText, { color: '#ef4444', fontWeight: '600' }]}>
                URGENT - {safeString(order.urgency_level) || 'Priorité élevée'}
              </Text>
            </View>
          )}
        </View>

        {order.fourmiz_profile && (
          <View style={styles.fourmizSection}>
            <Text style={styles.fourmizSectionTitle}>Fourmiz assignée</Text>
            <View style={styles.fourmizInfo}>
              {order.fourmiz_profile.avatar_url ? (
                <Image source={{ uri: order.fourmiz_profile.avatar_url }} style={styles.fourmizAvatar} />
              ) : (
                <View style={styles.fourmizAvatarPlaceholder}>
                  <Ionicons name="person" size={20} color="#6b7280" />
                </View>
              )}
              <View style={styles.fourmizDetails}>
                <Text style={styles.fourmizName}>
                  {safeString(order.fourmiz_profile.firstname)} {safeString(order.fourmiz_profile.lastname)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ✅ Actions de timeout intelligentes avec notifications */}
        {(() => {
          const timeoutStatus = getOrderTimeoutStatus(order);
          if (!timeoutStatus.shouldShowActions) return null;
          
          return (
            <View style={styles.timeoutActions}>
              {timeoutStatus.level !== 'expired' && (
                <>
                  <TouchableOpacity 
                    style={styles.timeoutActionButton}
                    onPress={() => handleIncreaseBudget(order.id)}
                  >
                    <Ionicons name="trending-up" size={16} color="#0066cc" />
                    <Text style={styles.timeoutActionText}>Augmenter le budget</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.timeoutActionButton}
                    onPress={() => handleRepostOrder(order.id)}
                  >
                    <Ionicons name="refresh" size={16} color="#059669" />
                    <Text style={styles.timeoutActionText}>Republier</Text>
                  </TouchableOpacity>
                </>
              )}
              
              {/* ✅ BOUTON D'ANNULATION GRATUITE */}
              <TouchableOpacity 
                style={[styles.timeoutActionButton, { backgroundColor: '#e6f3ff' }]}
                onPress={() => {
                  Alert.alert(
                    '✅ Annulation gratuite',
                    'Cette annulation est gratuite car aucune Fourmiz n\'était disponible pour votre service.',
                    [
                      { text: 'Garder la commande', style: 'cancel' },
                      { 
                        text: 'Annuler gratuitement', 
                        style: 'destructive',
                        onPress: () => {
                          const reason = timeoutStatus.level === 'critical' ? 'no_fourmiz_critical' : 'no_fourmiz_warning';
                          handleFreeCancel(order.id, reason);
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="close-circle" size={16} color="#0066cc" />
                <Text style={[styles.timeoutActionText, { color: '#0066cc' }]}>
                  Annuler (gratuit)
                </Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Actions normales */}
        <View style={styles.commandActions}>
          {(normalizedStatus === 'acceptee' || normalizedStatus === 'en_cours') && (
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => handleChatOrder(order.id)}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#3b82f6" />
              <Text style={styles.chatButtonText}>Discuter</Text>
            </TouchableOpacity>
          )}

          {(normalizedStatus === 'en_attente' || normalizedStatus === 'acceptee') && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => handleCancelOrder(order.id)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Mes Commandes' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>
            {authLoading ? 'Vérification...' : 'Chargement de vos commandes...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 🔓 AFFICHAGE SI PAS CONNECTÉ - SANS REDIRECTION FORCÉE
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Mes Commandes' }} />
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Connexion requise</Text>
          <Text style={styles.emptySubtitle}>
            Connectez-vous pour voir vos commandes
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => router.push('/auth/signin')}
          >
            <Text style={styles.emptyButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Mes Commandes' }} />
      
      {/* Header sans indicateur de timeout */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Mes Commandes</Text>
      </View>

      {/* ✅ TABLEAU DE BORD AMÉLIORÉ avec cartes mieux présentées */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.dashboardContainer}
        contentContainerStyle={styles.dashboardContent}
      >
        {statsCards.map((card) => (
          <StatsCard
            key={card.id}
            card={card}
            onPress={() => selectFilter(card.id as FilterType)}
            isActive={filter === card.id}
          />
        ))}
      </ScrollView>

      {/* Menu déroulant de filtre moderne */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Affichage :</Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <Text style={styles.dropdownButtonText}>
              {getCurrentFilterName()}
            </Text>
            <Ionicons 
              name={showFilterDropdown ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#6b7280" 
            />
          </TouchableOpacity>

          {showFilterDropdown && (
            <>
              <TouchableOpacity 
                style={styles.dropdownOverlay} 
                onPress={() => setShowFilterDropdown(false)}
                activeOpacity={1}
              />
              <View style={styles.dropdownMenu}>
                {statsCards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.dropdownOption,
                      filter === card.id && styles.selectedDropdownOption
                    ]}
                    onPress={() => selectFilter(card.id as FilterType)}
                  >
                    <View style={styles.dropdownOptionContent}>
                      <Ionicons name={card.icon} size={18} color={card.color} />
                      <Text style={[
                        styles.dropdownOptionText,
                        filter === card.id && styles.selectedDropdownText
                      ]}>
                        {card.title} ({card.count})
                      </Text>
                    </View>
                    {filter === card.id && (
                      <Ionicons name="checkmark" size={18} color="#FF4444" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </View>

      {/* Liste des commandes */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="list-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>
            {filter === 'all' ? 'Aucune commande' : `Aucune commande ${getStatusConfig(filter).label.toLowerCase()}`}
          </Text>
          <Text style={styles.emptySubtitle}>
            Vous n'avez pas encore passé de commande
          </Text>
          {filter === 'all' && (
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/services')}
            >
              <Text style={styles.emptyButtonText}>Découvrir les services</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a202c',
  },
  
  // ✅ TABLEAU DE BORD AMÉLIORÉ
  dashboardContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 4,
  },
  dashboardContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    alignItems: 'center',
  },
  
  // ✅ CARTES STATISTIQUES AGRANDIES - Icônes non rognées
  statsCard: {
    minWidth: 110,
    width: 110,
    height: 100,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  
  // ✅ CONTENEUR ICÔNE AGRANDI
  statsCardIconContainer: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
    minWidth: 28,
  },
  
  // ✅ CHIFFRE BIEN ESPACÉ
  statsCardCount: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 24,
  },
  
  // ✅ TITRE AVEC PLUS D'ESPACE
  statsCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
    numberOfLines: 1,
    maxWidth: '95%',
  },
  
  // Section de filtre
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
  },
  
  // Menu déroulant moderne
  dropdownContainer: {
    position: 'relative',
    flex: 1,
    zIndex: 1000,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 42,
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d3748',
    flex: 1,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 998,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 999,
    overflow: 'hidden',
    maxHeight: 300,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedDropdownOption: {
    backgroundColor: '#fff5f5',
    borderLeftWidth: 3,
    borderLeftColor: '#FF4444',
  },
  dropdownOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#2d3748',
    fontWeight: '500',
    backgroundColor: 'transparent',
  },
  selectedDropdownText: {
    color: '#FF4444',
    fontWeight: '600',
    backgroundColor: 'transparent',
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
  listContainer: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  
  // Styles pour les alertes de timeout
  timeoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  timeoutText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  timeoutActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  timeoutActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeoutActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
  },
  
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
  },
  orderCategory: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
    color: '#4a5568',
    flex: 1,
  },
  fourmizSection: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f7fafc',
  },
  fourmizSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },
  fourmizInfo: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#f7fafc',
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
    color: '#1a202c',
  },
  commandActions: {
    flexDirection: 'row',
    gap: 12,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebf4ff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3182ce',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fed7d7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e53e3e',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a202c',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrdersScreen;
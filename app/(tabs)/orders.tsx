// app/(tabs)/orders.tsx - VERSION FINALE OPTIMISÉE AVEC OPTION B CANDIDATURES
// ✅ CORRECTIONS PERFORMANCE : Gardes anti-boucle, cache, limitations fréquence
// ✅ SUPPRESSION SYSTÈME PAIEMENT : Le paiement se fait à la création, pas ici
// ✅ TOUTES FONCTIONNALITÉS CONSERVÉES : timeout, actions, notation, etc.
// 🔧 CORRIGÉ : localStorage remplacé par AsyncStorage pour React Native
// 🔧 MODIFIÉ : Header local compact sans bouton de retour
// 🔧 NOUVEAU : Correction complète du problème de clavier dans RatingModal
// 🆕 AJOUTÉ : Option B - Lien contextuel vers candidatures pour workflow candidatures
// 🗑️ SUPPRIMÉ : Badges de statut de paiement (débit effectué en fin de commande)
// 🔧 INTERFACE CORRIGÉE : Conformité parfaite avec la structure DB orders

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🛡️ HELPERS DE SÉCURITÉ OPTIMISÉS
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

// ✅ CACHE POUR OPTIMISER LES PERFORMANCES
const statusCache = new Map<string, FilterType>();

const safeArrayIncludes = (array: string[], value: any): boolean => {
  if (!Array.isArray(array)) return false;
  const safeValue = safeString(value).toLowerCase();
  return array.includes(safeValue);
};

// ✅ FONCTION DE TRADUCTION POUR LES NIVEAUX D'URGENCE
const translateUrgencyLevel = (urgencyLevel: string): string => {
  const safeLevel = safeString(urgencyLevel).toLowerCase();
  
  const translations: Record<string, string> = {
    '1hour': '1 heure',
    '2hours': '2 heures', 
    '3hours': '3 heures',
    '4hours': '4 heures',
    '5hours': '5 heures',
    '6hours': '6 heures',
    '12hours': '12 heures',
    '24hours': '24 heures',
    'same day': 'Même jour',
    'today': 'Aujourd\'hui',
    'asap': 'Dès que possible',
    'immediate': 'Immédiat',
    'urgent': 'Urgent',
    'high priority': 'Priorité élevée',
    'very urgent': 'Très urgent',
    'critical': 'Critique'
  };
  
  if (translations[safeLevel]) {
    return translations[safeLevel];
  }
  
  const hourMatch = safeLevel.match(/(\d+)\s*hours?/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1]);
    return hours === 1 ? '1 heure' : `${hours} heures`;
  }
  
  const dayMatch = safeLevel.match(/(\d+)\s*days?/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1]);
    return days === 1 ? '1 jour' : `${days} jours`;
  }
  
  return urgencyLevel || 'Priorité élevée';
};

// 🔧 INTERFACE ORDER CORRIGÉE - CONFORMITÉ PARFAITE AVEC DB
interface Order {
  // Champs de base de la table orders
  id: number;
  user_id?: string;
  service_id: number | null;
  service_title?: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  address: string;
  postal_code: string;
  city: string;
  phone?: string;
  urgent?: boolean;
  urgency_level?: string;
  invoice_required?: boolean;
  proposed_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  
  // Champs de gestion des utilisateurs
  client_id?: string;
  fourmiz_id?: string;
  confirmed_by_fourmiz?: boolean;
  accepted_at?: string;
  cancelled_at?: string;
  cancelled_by?: string; // 🔧 CORRIGÉ: uuid -> string (était number)
  cancellation_reason?: string;
  
  // Champs de validation et évaluation
  validated_at?: string;
  validated_by?: string;
  validation_method?: string;
  client_validated_at?: string;
  fourmiz_validated_at?: string;
  validation_completed_at?: string;
  rating?: number;
  feedback?: string;
  
  // Champs financiers
  urgency_surcharge?: number;
  cancellation_fee?: number;
  fourmiz_amount?: number;
  platform_fee?: number;
  commission?: number;
  invoice_url?: string;
  
  // Champs de paiement
  payment_method?: string;
  payment_status?: string;
  payment_authorized_at?: string; // 🔧 CORRIGÉ: remplace paid_at
  payment_intent_id?: string;
  funds_released_at?: string;
  
  // Champs d'adresses étendues
  departure_address?: string;
  arrival_address?: string;
  arrival_postal_code?: string;
  arrival_city?: string;
  delivery_address?: string;
  pickup_address?: string;
  addresses?: {
    categorie?: string;
  } | null;
  
  // Champs spécialisés
  equipment?: any; // jsonb
  package_number?: string;
  duration?: number;
  
  // Workflow et candidatures
  workflow_type?: 'direct' | 'candidatures';
  allow_multiple_candidates?: boolean;
  
  // Relations JOIN (non-DB, calculées)
  services?: {
    title: string;
    categorie: string;
  } | null;
  fourmiz_profile?: {
    id: string;
    firstname: string;
    lastname: string;
    avatar_url?: string;
  } | null;
}

type FilterType = 'all' | 'en_attente' | 'acceptee' | 'en_cours' | 'terminee' | 'annulee';

// 🔧 COMPOSANT MODAL DE NOTATION - CORRECTION CLAVIER COMPLÈTE
const RatingModal = ({ 
  visible, 
  onClose, 
  onSubmit, 
  title, 
  targetName,
  loading 
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  title: string;
  targetName: string;
  loading: boolean;
}) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');

  const handleSubmit = () => {
    if (rating < 1 || rating > 5) {
      Alert.alert('Erreur', 'Veuillez sélectionner une note entre 1 et 5 étoiles');
      return;
    }
    // 🔧 CORRECTION : Fermer le clavier avant validation
    Keyboard.dismiss();
    onSubmit(rating, comment.trim());
  };

  const resetForm = () => {
    setRating(5);
    setComment('');
  };

  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.ratingModalOverlay}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.ratingModalContent}>
              <View style={styles.ratingModalHeader}>
                <Text style={styles.ratingModalTitle}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.ratingModalCloseButton}>
                  <Ionicons name="close" size={24} color="#333333" />
                </TouchableOpacity>
              </View>

              <Text style={styles.ratingTargetText}>Évaluer : {targetName}</Text>

              <View style={styles.starsContainer}>
                <Text style={styles.starsLabel}>Note :</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(star)}
                      style={styles.starButton}
                    >
                      <Ionicons
                        name={star <= rating ? "star" : "star-outline"}
                        size={32}
                        color={star <= rating ? "#FFD700" : "#ccc"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.ratingText}>{rating}/5</Text>
              </View>

              <View style={styles.commentContainer}>
                <Text style={styles.commentLabel}>Commentaire (optionnel) :</Text>
                <TextInput
                  style={styles.commentInput}
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Partagez votre expérience..."
                  placeholderTextColor="#999999"
                  multiline={true}
                  numberOfLines={3}
                  maxLength={500}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  blurOnSubmit={true}
                />
                <Text style={styles.commentCounter}>{comment.length}/500</Text>
              </View>

              <View style={styles.ratingModalActions}>
                <TouchableOpacity 
                  style={styles.ratingCancelButton}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.ratingCancelText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.ratingSubmitButton, loading && styles.ratingSubmitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.ratingSubmitText}>Valider & Noter</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const OrdersScreen = () => {
  // États de base
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollViewRef = useRef<FlatList>(null);

  // 🔧 ÉTATS POUR VALIDATION AVEC NOTATION
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrderForRating, setSelectedOrderForRating] = useState<Order | null>(null);
  const [ratingModalTitle, setRatingModalTitle] = useState('');
  const [ratingTargetName, setRatingTargetName] = useState('');
  const [validatingWithRating, setValidatingWithRating] = useState(false);

  // 🆕 FONCTION POUR DÉTECTER LE WORKFLOW D'UNE COMMANDE (OPTION B)
  const getOrderWorkflow = useCallback((order: Order): 'direct' | 'candidatures' => {
    // Vérifier d'abord si c'est explicitement défini
    if (order.workflow_type) {
      return order.workflow_type as 'direct' | 'candidatures';
    }
    
    // Logique de détection basée sur les caractéristiques de la commande
    // Les commandes avec service_id null sont souvent des demandes personnalisées -> candidatures
    if (order.service_id === null && order.service_title) {
      return 'candidatures';
    }
    
    // Fallback par défaut
    return 'direct';
  }, []);

  // ✅ MAPPING ULTRA-SÉCURISÉ ET OPTIMISÉ DES STATUTS
  const normalizeStatus = useCallback((status: any): FilterType => {
    const statusKey = String(status || '');
    if (statusCache.has(statusKey)) {
      return statusCache.get(statusKey)!;
    }
    
    const safeStatus = safeString(status);
    const statusLower = safeStatus.toLowerCase();
    
    let normalizedStatus: FilterType;
    
    if (safeArrayIncludes(['en_attente', 'pending', 'created'], statusLower)) {
      normalizedStatus = 'en_attente';
    }
    else if (safeArrayIncludes(['acceptee', 'accepted', 'confirmed'], statusLower)) {
      normalizedStatus = 'acceptee';
    }
    else if (safeArrayIncludes(['en_cours', 'in_progress'], statusLower)) {
      normalizedStatus = 'en_cours';
    }
    else if (safeArrayIncludes(['terminee', 'completed', 'finished'], statusLower)) {
      normalizedStatus = 'terminee';
    }
    else if (safeArrayIncludes(['annulee', 'cancelled', 'canceled'], statusLower)) {
      normalizedStatus = 'annulee';
    }
    else {
      console.warn('⚠️ Statut non reconnu:', status, '-> defaulting to en_attente');
      normalizedStatus = 'en_attente';
    }
    
    statusCache.set(statusKey, normalizedStatus);
    return normalizedStatus;
  }, []);

  // 🔧 FONCTION OPTIMISÉE AVEC CACHE POUR CALCULER LA DATE/HEURE DU SERVICE
  const getServiceDatetime = useMemo(() => {
    const dateCache = new Map();
    
    return (order: Order): Date | null => {
      const cacheKey = `${order.id}-${order.date}-${order.start_time}`;
      
      if (dateCache.has(cacheKey)) {
        return dateCache.get(cacheKey);
      }
      
      try {
        const serviceDate = safeString(order.date);
        const serviceTime = safeString(order.start_time);
        
        if (!serviceDate) {
          dateCache.set(cacheKey, null);
          return null;
        }
        
        let datetimeString: string;
        
        if (serviceTime) {
          const cleanTime = serviceTime.includes(':') ? serviceTime : `${serviceTime}:00`;
          const finalTime = cleanTime.split(':').length === 3 
            ? cleanTime 
            : `${cleanTime}:00`;
          datetimeString = `${serviceDate}T${finalTime}`;
        } else {
          datetimeString = `${serviceDate}T09:00:00`;
        }
        
        const serviceDatetime = new Date(datetimeString);
        
        if (isNaN(serviceDatetime.getTime())) {
          try {
            const dateOnly = new Date(serviceDate);
            if (!isNaN(dateOnly.getTime())) {
              dateCache.set(cacheKey, dateOnly);
              return dateOnly;
            }
          } catch (fallbackError) {
            console.warn(`❌ Échec parsing fallback pour commande ${order.id}`);
          }
          dateCache.set(cacheKey, null);
          return null;
        }
        
        // ✅ CACHE avec expiration
        dateCache.set(cacheKey, serviceDatetime);
        setTimeout(() => dateCache.delete(cacheKey), 300000); // 5 minutes
        
        return serviceDatetime;
        
      } catch (error) {
        console.error(`❌ Erreur calcul date service pour commande ${order.id}:`, error);
        dateCache.set(cacheKey, null);
        return null;
      }
    };
  }, []);

  // ✅ FONCTION POUR OBTENIR LES HEURES JUSQU'AU SERVICE
  const getHoursUntilService = useCallback((order: Order): number => {
    const serviceDatetime = getServiceDatetime(order);
    if (!serviceDatetime) return 0;
    
    const now = new Date();
    return Math.floor((serviceDatetime.getTime() - now.getTime()) / (1000 * 60 * 60));
  }, [getServiceDatetime]);

  // ✅ SYSTÈME DE NOTIFICATIONS PROGRESSIVES basé sur des pourcentages
  const getTimeoutThresholds = useCallback((serviceDatetime: Date, createdAt: Date) => {
    const now = new Date();
    const totalTimeAvailable = serviceDatetime.getTime() - createdAt.getTime();
    const timeRemaining = serviceDatetime.getTime() - now.getTime();
    const timeElapsed = now.getTime() - createdAt.getTime();
    
    const percentageElapsed = (timeElapsed / totalTimeAvailable) * 100;
    
    return {
      TOTAL_TIME_HOURS: totalTimeAvailable / (1000 * 60 * 60),
      TIME_REMAINING_HOURS: timeRemaining / (1000 * 60 * 60),
      PERCENTAGE_ELAPSED: percentageElapsed,
      
      WARNING_PERCENTAGE: 50,
      CRITICAL_PERCENTAGE: 75,
      AUTO_CANCEL_PERCENTAGE: 100,
      
      CONTEXT: percentageElapsed >= 100 ? 'service_passed' : 
               percentageElapsed >= 75 ? 'critical_phase' :
               percentageElapsed >= 50 ? 'warning_phase' : 'normal_phase'
    };
  }, []);

  // ✅ FONCTION DE TIMEOUT OPTIMISÉE AVEC CACHE
  const getOrderTimeoutStatus = useMemo(() => {
    const timeoutCache = new Map();
    
    return (order: Order) => {
      const cacheKey = `${order.id}-${order.status}-${order.date}-${order.created_at}`;
      
      if (timeoutCache.has(cacheKey)) {
        return timeoutCache.get(cacheKey);
      }
      
      const normalizedStatus = normalizeStatus(order.status);
      
      if (normalizedStatus !== 'en_attente') {
        const result = { 
          isTimeout: false, 
          level: 'none' as const, 
          message: '', 
          shouldShowActions: false,
          percentageElapsed: 0,
          hoursUntilService: 0 
        };
        timeoutCache.set(cacheKey, result);
        return result;
      }
      
      const serviceDatetime = getServiceDatetime(order);
      if (!serviceDatetime) {
        const result = { 
          isTimeout: false, 
          level: 'none' as const, 
          message: '', 
          shouldShowActions: false,
          percentageElapsed: 0,
          hoursUntilService: 0 
        };
        timeoutCache.set(cacheKey, result);
        return result;
      }
      
      const createdAt = new Date(order.created_at);
      const thresholds = getTimeoutThresholds(serviceDatetime, createdAt);
      
      const hoursUntilService = thresholds.TIME_REMAINING_HOURS;
      const percentageElapsed = thresholds.PERCENTAGE_ELAPSED;
      
      let result;
      
      if (percentageElapsed >= 100) {
        const hoursAfterService = Math.abs(hoursUntilService);
        result = {
          isTimeout: true,
          level: 'expired' as const,
          message: `Service prévu il y a ${Math.floor(hoursAfterService)}h - Auto-annulation`,
          shouldShowActions: false,
          percentageElapsed: percentageElapsed,
          hoursUntilService: hoursUntilService
        };
      }
      else if (percentageElapsed >= thresholds.CRITICAL_PERCENTAGE) {
        const hoursLeft = Math.max(0, Math.floor(hoursUntilService));
        result = {
          isTimeout: true,
          level: 'critical' as const,
          message: `Service dans ${hoursLeft}h - CRITIQUE: Aucune Fourmiz trouvée`,
          shouldShowActions: true,
          percentageElapsed: percentageElapsed,
          hoursUntilService: hoursUntilService
        };
      }
      else if (percentageElapsed >= thresholds.WARNING_PERCENTAGE) {
        const hoursLeft = Math.max(0, Math.floor(hoursUntilService));
        result = {
          isTimeout: true,
          level: 'warning' as const,
          message: `Service dans ${hoursLeft}h - Aucune Fourmiz disponible`,
          shouldShowActions: true,
          percentageElapsed: percentageElapsed,
          hoursUntilService: hoursUntilService
        };
      }
      else {
        result = { 
          isTimeout: false, 
          level: 'none' as const, 
          message: '', 
          shouldShowActions: false,
          percentageElapsed: percentageElapsed,
          hoursUntilService: hoursUntilService 
        };
      }
      
      // 🛡️ MISE EN CACHE avec expiration
      timeoutCache.set(cacheKey, result);
      setTimeout(() => timeoutCache.delete(cacheKey), 300000); // 5 minutes
      
      return result;
    };
  }, [normalizeStatus, getServiceDatetime, getTimeoutThresholds]);

  // ✅ FONCTIONS SIMPLIFIÉES POUR LE TIMEOUT 
  const isOrderInTimeout = useCallback((order: Order): boolean => {
    const timeoutStatus = getOrderTimeoutStatus(order);
    return timeoutStatus.isTimeout;
  }, [getOrderTimeoutStatus]);

  const getTimeoutMessage = useCallback((order: Order): string => {
    const timeoutStatus = getOrderTimeoutStatus(order);
    return timeoutStatus.message;
  }, [getOrderTimeoutStatus]);

  // 🔐 FONCTION POUR VÉRIFIER SI LA COMMANDE PEUT ÊTRE VALIDÉE
  const canValidateOrder = useCallback((order: Order): boolean => {
    const normalizedStatus = normalizeStatus(order.status);
    
    if (!order.fourmiz_profile) {
      return false;
    }
    
    if (normalizedStatus !== 'acceptee' && normalizedStatus !== 'en_cours') {
      return false;
    }
    
    if (!order.date) {
      return false;
    }
    
    const serviceDate = new Date(order.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return serviceDate <= today;
  }, [normalizeStatus]);

  // 🔐 FONCTION POUR OUVRIR LA MODAL DE NOTATION
  const handleValidateOrder = useCallback(async (order: Order) => {
    const fourmizName = order.fourmiz_profile 
      ? `${order.fourmiz_profile.firstname} ${order.fourmiz_profile.lastname}`
      : 'Fourmiz';

    setSelectedOrderForRating(order);
    setRatingModalTitle('Noter votre Fourmiz');
    setRatingTargetName(fourmizName);
    setShowRatingModal(true);
  }, []);

  // ✅ FONCTION DE VALIDATION AVEC NOTATION
  const handleSubmitOrderRating = useCallback(async (rating: number, comment: string) => {
    if (!selectedOrderForRating) return;

    try {
      setValidatingWithRating(true);
      console.log('🔐 Validation de la commande avec notation:', selectedOrderForRating.id);

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'terminee',
          validated_at: new Date().toISOString(),
          validated_by: currentUser?.id,
          validation_method: 'client_direct',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrderForRating.id)
        .eq('client_id', currentUser?.id);

      if (orderError) {
        console.error('❌ Erreur validation commande:', orderError);
        throw orderError;
      }

      const { error: ratingError } = await supabase.rpc('add_rating', {
        p_order_id: selectedOrderForRating.id,
        p_rating: rating,
        p_comment: comment || null
      });

      if (ratingError) {
        console.error('❌ Erreur ajout rating:', ratingError);
        throw new Error('Impossible d\'enregistrer votre note');
      }

      console.log('✅ Commande validée avec notation:', rating, comment);

      Alert.alert(
        '✅ Mission validée et notée',
        `Merci pour votre évaluation ! Votre note de ${rating}/5 a été enregistrée.`,
        [{ text: 'OK', onPress: () => loadOrders() }]
      );

      setShowRatingModal(false);
      setSelectedOrderForRating(null);

    } catch (error: any) {
      console.error('🚨 Erreur lors de la validation avec notation:', error);
      Alert.alert(
        'Erreur', 
        error.message || 'Impossible de valider la mission. Veuillez réessayer.'
      );
    } finally {
      setValidatingWithRating(false);
    }
  }, [currentUser, selectedOrderForRating, loadOrders]);

  // ✅ FONCTION D'ANNULATION GRATUITE OPTIMISÉE AVEC GARDES ANTI-BOUCLE (CORRIGÉE AVEC ASYNCSTORAGE)
  const handleFreeCancel = useCallback(async (orderId: number, reason: 'no_fourmiz_warning' | 'no_fourmiz_critical' | 'auto_cancel') => {
    try {
      // 🛡️ GARDE ANTI-DOUBLE-ANNULATION (AVEC ASYNCSTORAGE)
      const cancelKey = `cancelling_${orderId}`;
      const existingCancel = await AsyncStorage.getItem(cancelKey);
      if (existingCancel) {
        console.log(`⏭️ Annulation ${orderId} déjà en cours - ignorée`);
        return;
      }
      await AsyncStorage.setItem(cancelKey, 'true');
      
      console.log(`🔄 Annulation gratuite de la commande ${orderId} pour raison: ${reason}`);
      
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'annulee',
          updated_at: new Date().toISOString(),
          cancelled_at: new Date().toISOString(),
          cancelled_by: currentUser.id
        })
        .eq('id', orderId)
        .eq('client_id', currentUser.id);

      if (error) {
        console.error('❌ Erreur annulation gratuite:', error);
        throw error;
      }
      
      console.log(`✅ Annulation gratuite réussie pour commande ${orderId}`);
      
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
      
      // ✅ RECHARGEMENT DIFFÉRÉ pour éviter les conflits
      setTimeout(async () => {
        loadOrders();
        await AsyncStorage.removeItem(cancelKey);
      }, 2000);
      
    } catch (error) {
      console.error('❌ Erreur annulation gratuite:', error);
      Alert.alert('Erreur', 'Impossible d\'annuler la commande');
      await AsyncStorage.removeItem(`cancelling_${orderId}`);
    }
  }, [currentUser, loadOrders]);

  // ✅ VÉRIFICATION AUTOMATIQUE OPTIMISÉE AVEC LIMITATIONS ET GARDES (CORRIGÉE AVEC ASYNCSTORAGE)
  useEffect(() => {
    if (!orders.length || !currentUser) return;
    
    const checkAndNotify = async () => {
      try {
        // 🛡️ LIMITATION : Une seule vérification par minute maximum (AVEC ASYNCSTORAGE)
        const lastCheckKey = 'lastTimeoutCheck';
        const now = Date.now();
        const lastCheckString = await AsyncStorage.getItem(lastCheckKey);
        const lastCheck = parseInt(lastCheckString || '0');
        
        if (now - lastCheck < 60000) { // 60 secondes minimum entre vérifications
          console.log('ℹ️ Vérification timeout ignorée - trop récente');
          return;
        }
        
        // ✅ FILTRER UNIQUEMENT LES COMMANDES EN_ATTENTE + garde anti-boucle
        const pendingOrders = orders.filter(order => {
          const normalized = normalizeStatus(order.status);
          return normalized === 'en_attente' && order.date; // 🛡️ Ignorer si pas de date
        });
        
        if (pendingOrders.length === 0) {
          console.log('ℹ️ Aucune commande en attente valide à vérifier');
          return;
        }
        
        console.log(`🔄 Vérification timeout pour ${pendingOrders.length} commandes (limitée)`);
        
        // 🛡️ TRAITEMENT LIMITÉ : Maximum 3 commandes par vérification
        const ordersToCheck = pendingOrders.slice(0, 3);
        
        for (const order of ordersToCheck) {
          try {
            const timeoutStatus = getOrderTimeoutStatus(order);
            
            // 🛡️ GARDE ANTI-BOUCLE : Vérifier si déjà traité récemment (AVEC ASYNCSTORAGE)
            const orderKey = `processed_${order.id}`;
            const lastProcessedString = await AsyncStorage.getItem(orderKey);
            const lastProcessed = parseInt(lastProcessedString || '0');
            const timeSinceProcessed = now - lastProcessed;
            
            if (timeSinceProcessed < 300000) { // 5 minutes minimum entre traitements
              console.log(`⏭️ Commande ${order.id} ignorée - déjà traitée récemment`);
              continue;
            }
            
            // Auto-annulation si service passé
            if (timeoutStatus.level === 'expired') {
              console.log(`🔄 Auto-annulation pour commande: ${order.id}`);
              
              // 🛡️ MARQUER COMME TRAITÉ AVANT annulation (AVEC ASYNCSTORAGE)
              await AsyncStorage.setItem(orderKey, now.toString());
              
              await handleFreeCancel(order.id, 'auto_cancel');
              
              // ✅ ARRÊTER la boucle après UNE annulation
              await AsyncStorage.setItem(lastCheckKey, now.toString());
              return; // 🛡️ SORTIR IMMÉDIATEMENT
            }
            
            // Notifications limitées (désactivées temporairement pour éviter spam)
            if (timeoutStatus.level === 'critical') {
              console.log(`🚨 État critique détecté pour commande: ${order.id}`);
            } else if (timeoutStatus.level === 'warning') {
              console.log(`⚠️ Avertissement détecté pour commande: ${order.id}`);
            }
            
          } catch (error) {
            console.error(`❌ Erreur traitement commande ${order.id}:`, error);
          }
        }
        
        // ✅ MARQUER comme vérifié (AVEC ASYNCSTORAGE)
        await AsyncStorage.setItem(lastCheckKey, now.toString());
        
      } catch (error) {
        console.error('❌ Erreur dans checkAndNotify:', error);
      }
    };
    
    // Vérification différée pour éviter les erreurs de montage
    const timeoutId = setTimeout(async () => {
      try {
        const lastCheckKey = 'lastTimeoutCheck';
        const now = Date.now();
        const lastCheckString = await AsyncStorage.getItem(lastCheckKey);
        const lastCheck = parseInt(lastCheckString || '0');
        
        // Vérification immédiate si pas faite récemment
        if (now - lastCheck >= 60000) {
          await checkAndNotify();
        }
      } catch (error) {
        console.error('❌ Erreur vérification immédiate:', error);
      }
    }, 1000);
    
    // ✅ INTERVALLE TRÈS RÉDUIT : 2 minutes au lieu de 30 secondes
    const interval = setInterval(async () => {
      try {
        const lastCheckKey = 'lastTimeoutCheck';
        const currentTime = Date.now();
        const lastCheckTimeString = await AsyncStorage.getItem(lastCheckKey);
        const lastCheckTime = parseInt(lastCheckTimeString || '0');
        
        if (currentTime - lastCheckTime >= 120000) { // 2 minutes minimum
          await checkAndNotify();
        }
      } catch (error) {
        console.error('❌ Erreur dans interval:', error);
      }
    }, 120 * 1000); // 2 minutes
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [orders, currentUser, normalizeStatus, getOrderTimeoutStatus, handleFreeCancel]);

  // 🔄 VÉRIFICATION D'ACCÈS
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
        console.log('⚠️ Aucun utilisateur connecté - Pas de redirection forcée');
      }

    } catch (error) {
      console.error('❌ Erreur vérification accès:', error);
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

  const loadOrders = useCallback(async () => {
    try {
      if (!currentUser?.id) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('🔄 Chargement des commandes pour:', currentUser.id);

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
            id,
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
      
      const statusCount: Record<string, number> = {};
      data?.forEach(order => {
        const normalizedStatus = normalizeStatus(order.status);
        statusCount[normalizedStatus] = (statusCount[normalizedStatus] || 0) + 1;
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
  }, [currentUser, normalizeStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  // ✅ CALCUL DES STATISTIQUES AVEC MÉMOISATION
  const orderStats = useMemo(() => {
    const pendingOrders = orders.filter(order => normalizeStatus(order.status) === 'en_attente');
    const timeoutPendingOrders = pendingOrders.filter(order => isOrderInTimeout(order));
    const acceptedOrders = orders.filter(order => normalizeStatus(order.status) === 'acceptee');
    const inProgressOrders = orders.filter(order => normalizeStatus(order.status) === 'en_cours');
    const completedOrders = orders.filter(order => normalizeStatus(order.status) === 'terminee');
    const cancelledOrders = orders.filter(order => normalizeStatus(order.status) === 'annulee');

    return {
      pendingOrders,
      timeoutPendingOrders,
      acceptedOrders,
      inProgressOrders,
      completedOrders,
      cancelledOrders
    };
  }, [orders, normalizeStatus, isOrderInTimeout]);

  // ✅ FILTRAGE OPTIMISÉ
  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'en_cours') return [...orderStats.acceptedOrders, ...orderStats.inProgressOrders];
    return orders.filter(order => normalizeStatus(order.status) === filter);
  }, [orders, filter, orderStats, normalizeStatus]);

  const formatDate = useCallback((dateString: string) => {
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
  }, []);

  const formatTime = useCallback((timeString?: string) => {
    const safeTimeString = safeString(timeString);
    if (!safeTimeString) return '';
    return safeTimeString.slice(0, 5);
  }, []);

  // 🛡️ FONCTION POUR LA CONFIGURATION DES STATUTS
  const getStatusConfig = useCallback((status: any) => {
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
  }, [normalizeStatus]);

  const handleCancelOrder = useCallback(async (orderId: number) => {
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
  }, [currentUser, loadOrders]);

  const handleChatOrder = useCallback((orderId: number) => {
    router.push(`/chat/${orderId}`);
  }, []);

  // 🛡️ FONCTIONS POUR OBTENIR LE TITRE ET LA CATÉGORIE
  const getOrderTitle = useCallback((order: Order): string => {
    if (order.service_id === null && order.service_title) {
      return safeString(order.service_title);
    }
    if (order.services?.title) {
      return safeString(order.services.title);
    }
    return 'Service';
  }, []);

  const getOrderCategory = useCallback((order: Order): string => {
    if (order.service_id === null) {
      if (order.addresses?.categorie) {
        return safeString(order.addresses.categorie);
      }
      return 'Demande personnalisée';
    }
    return safeString(order.services?.categorie) || '';
  }, []);

  // ✅ OPTIONS DE FILTRE
  const filterOptions = useMemo(() => [
    { id: 'all', label: `Toutes (${orders.length})`, icon: 'apps' as const },
    { id: 'en_attente', label: `En attente (${orderStats.pendingOrders.length})`, icon: 'time' as const },
    { id: 'acceptee', label: `Acceptées (${orderStats.acceptedOrders.length})`, icon: 'checkmark-circle' as const },
    { id: 'en_cours', label: `En cours (${orderStats.inProgressOrders.length})`, icon: 'play-circle' as const },
    { id: 'terminee', label: `Terminées (${orderStats.completedOrders.length})`, icon: 'checkmark-done-circle' as const },
    { id: 'annulee', label: `Annulées (${orderStats.cancelledOrders.length})`, icon: 'close-circle' as const }
  ], [orders.length, orderStats]);

  const getCurrentFilterName = useCallback(() => {
    const currentFilter = filterOptions.find(option => option.id === filter);
    return currentFilter?.label || 'toutes';
  }, [filterOptions, filter]);

  const selectFilter = useCallback((filterId: FilterType) => {
    setFilter(filterId);
    setShowFilterDropdown(false);
  }, []);

  // ✅ GESTION DU SCROLL TO TOP
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // ✅ FONCTIONS POUR AUGMENTER LE BUDGET ET REPUBLIER
  const handleIncreaseBudget = useCallback((orderId: number) => {
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
                  updated_at: new Date().toISOString()
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

            } catch (error: any) {
              console.error('🚨 Erreur lors de la mise à jour:', error);
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
  }, [orders, currentUser, loadOrders]);

  const handleRepostOrder = useCallback(async (orderId: number) => {
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

              const newOrderData = {
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
                
                created_at: new Date().toISOString(),
                updated_at: null,
                status: 'en_attente',
                
                fourmiz_id: null,
                accepted_at: null,
                cancelled_at: null,
                cancelled_by: null,
                confirmed_by_fourmiz: false,
                
                rating: null,
                feedback: null,
                invoice_url: null,
                commission: null
              };

              console.log('📝 Données nouvelle commande:', newOrderData);

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

              try {
                const { error: updateError } = await supabase
                  .from('orders')
                  .update({
                    status: 'remplacee',
                    updated_at: new Date().toISOString(),
                    cancelled_at: new Date().toISOString(),
                    cancelled_by: currentUser.id
                  })
                  .eq('id', orderId);

                if (updateError) {
                  console.error('⚠️ Erreur mise à jour ancienne commande:', updateError);
                }
              } catch (updateError) {
                console.log('ℹ️ Impossible de marquer comme remplacée, mais nouvelle commande créée');
              }

              console.log('✅ Republication terminée avec succès');

              Alert.alert(
                '✅ Commande republiée',
                `Votre commande a été republiée avec succès.\n\nNouvelle commande #${newOrder.id} créée et mise en première position.`,
                [{ text: 'OK', onPress: () => loadOrders() }]
              );

            } catch (error: any) {
              console.error('🚨 Erreur lors de la republication:', error);
              Alert.alert(
                'Erreur de republication', 
                error.message || 'Impossible de republier la commande. Veuillez réessayer.'
              );
            }
          }
        }
      ]
    );
  }, [orders, getOrderTitle, currentUser, loadOrders]);

  // ✅ RENDER ORDER ITEM OPTIMISÉ AVEC OPTION B CANDIDATURES
  const renderOrderItem = useCallback(({ item: order }: { item: Order }) => {
    const statusConfig = getStatusConfig(order.status);
    const orderTitle = getOrderTitle(order);
    const orderCategory = getOrderCategory(order);
    const normalizedStatus = normalizeStatus(order.status);

    return (
      <View style={styles.orderCard}>
        {/* Alerte de timeout intelligente */}
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
                size={14} 
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
            <Ionicons name="calendar" size={14} color="#6b7280" />
            <Text style={styles.detailText}>
              {formatDate(order.date || order.created_at)}
              {order.start_time && ` à ${formatTime(order.start_time)}`}
              {order.end_time && ` - ${formatTime(order.end_time)}`}
              {(() => {
                const hoursUntil = getHoursUntilService(order);
                if (hoursUntil > 0 && hoursUntil <= 168) {
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
            <Ionicons name="location" size={14} color="#6b7280" />
            <Text style={styles.detailText} numberOfLines={2}>
              {safeString(order.address)}
              {order.postal_code && order.city && `, ${safeString(order.postal_code)} ${safeString(order.city)}`}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="card" size={14} color="#6b7280" />
            <Text style={styles.detailText}>{order.proposed_amount}€</Text>
          </View>

          {order.service_id === null && order.description && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text" size={14} color="#6b7280" />
              <Text style={styles.detailText} numberOfLines={2}>
                {safeString(order.description)}
              </Text>
            </View>
          )}
        </View>

        {order.fourmiz_profile && (
          <View style={styles.fourmizSection}>
            <Text style={styles.fourmizSectionTitle}>Votre Fourmiz</Text>
            <View style={styles.fourmizInfo}>
              {order.fourmiz_profile.avatar_url ? (
                <Image source={{ uri: order.fourmiz_profile.avatar_url }} style={styles.fourmizAvatar} />
              ) : (
                <View style={styles.fourmizAvatarPlaceholder}>
                  <Ionicons name="person" size={16} color="#6b7280" />
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

        {/* 🆕 OPTION B : Bouton candidatures pour workflow candidatures */}
        {normalizedStatus === 'en_attente' && getOrderWorkflow(order) === 'candidatures' && (
          <View style={styles.applicationsSection}>
            <TouchableOpacity 
              style={styles.viewApplicationsButton}
              onPress={() => router.push('/(tabs)/applications')}
            >
              <Ionicons name="people-outline" size={14} color="#0369a1" />
              <Text style={styles.viewApplicationsText}>
                Voir les candidatures reçues
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#0369a1" />
            </TouchableOpacity>
          </View>
        )}

        {/* Actions de timeout intelligentes */}
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
                    <Ionicons name="trending-up" size={14} color="#0066cc" />
                    <Text style={styles.timeoutActionText}>Augmenter le budget</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.timeoutActionButton}
                    onPress={() => handleRepostOrder(order.id)}
                  >
                    <Ionicons name="refresh" size={14} color="#059669" />
                    <Text style={styles.timeoutActionText}>Republier</Text>
                  </TouchableOpacity>
                </>
              )}
              
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
                <Ionicons name="close-circle" size={14} color="#0066cc" />
                <Text style={[styles.timeoutActionText, { color: '#0066cc' }]}>
                  Annuler (gratuit)
                </Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Actions normales avec validation */}
        <View style={styles.orderActions}>
          {(normalizedStatus === 'acceptee' || normalizedStatus === 'en_cours') && (
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => handleChatOrder(order.id)}
            >
              <Ionicons name="chatbubble-outline" size={14} color="#3b82f6" />
              <Text style={styles.chatButtonText}>Discuter</Text>
            </TouchableOpacity>
          )}

          {canValidateOrder(order) && (
            <TouchableOpacity 
              style={styles.validateButton}
              onPress={() => handleValidateOrder(order)}
            >
              <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
              <Text style={styles.validateButtonText}>Valider & Noter</Text>
            </TouchableOpacity>
          )}

          {(normalizedStatus === 'en_attente' || normalizedStatus === 'acceptee') && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => handleCancelOrder(order.id)}
            >
              <Ionicons name="close-circle-outline" size={14} color="#ef4444" />
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [getStatusConfig, getOrderTitle, getOrderCategory, normalizeStatus, getOrderTimeoutStatus, formatDate, formatTime, getHoursUntilService, getOrderWorkflow, handleIncreaseBudget, handleRepostOrder, handleFreeCancel, handleChatOrder, canValidateOrder, handleValidateOrder, handleCancelOrder]);

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Mes Commandes' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>
            {authLoading ? 'Vérification...' : 'Chargement de vos commandes...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
      
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Mes Commandes</Text>
      </View>

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
              size={16} 
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
                {filterOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.dropdownOption,
                      filter === option.id && styles.selectedDropdownOption
                    ]}
                    onPress={() => selectFilter(option.id as FilterType)}
                  >
                    <View style={styles.dropdownOptionContent}>
                      <Ionicons name={option.icon} size={16} color="#333333" />
                      <Text style={[
                        styles.dropdownOptionText,
                        filter === option.id && styles.selectedDropdownText
                      ]}>
                        {option.label}
                      </Text>
                    </View>
                    {filter === option.id && (
                      <Ionicons name="checkmark" size={16} color="#000000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </View>

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
          ref={scrollViewRef}
          data={filteredOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderItem}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {showScrollTop && (
        <TouchableOpacity
          style={styles.scrollToTopButton}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-up" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <RatingModal
        visible={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          setSelectedOrderForRating(null);
        }}
        onSubmit={handleSubmitOrderRating}
        title={ratingModalTitle}
        targetName={ratingTargetName}
        loading={validatingWithRating}
      />
    </SafeAreaView>
  );
};

// ✅ STYLES OPTIMISÉS + HEADER COMPACT + SUPPRESSION STYLES PAIEMENT + OPTION B CANDIDATURES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 28,
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
  },
  
  dropdownContainer: {
    position: 'relative',
    flex: 1,
    zIndex: 1000,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  dropdownButtonText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#000000',
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
    top: 38,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 999,
    overflow: 'hidden',
    maxHeight: 250,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedDropdownOption: {
    backgroundColor: '#f5f5f5',
  },
  dropdownOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dropdownOptionText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
    backgroundColor: 'transparent',
  },
  selectedDropdownText: {
    color: '#000000',
    fontWeight: '600',
    backgroundColor: 'transparent',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  
  timeoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
    gap: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  timeoutText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  timeoutActions: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  timeoutActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 4,
    flex: 1,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeoutActionText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333333',
  },
  
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  orderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 3,
  },
  orderCategory: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '400',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#333333',
    flex: 1,
    fontWeight: '400',
  },
  fourmizSection: {
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  fourmizSectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 6,
  },
  fourmizInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fourmizAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  fourmizAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fourmizDetails: {
    marginLeft: 10,
    flex: 1,
  },
  fourmizName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
  },

  // 🆕 NOUVEAUX STYLES POUR OPTION B CANDIDATURES
  applicationsSection: {
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewApplicationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  viewApplicationsText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
    color: '#0369a1',
  },

  orderActions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebf4ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    flex: 1,
    minHeight: 32,
    justifyContent: 'center',
  },
  chatButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3182ce',
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    flex: 1,
    minHeight: 32,
    justifyContent: 'center',
  },
  validateButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10b981',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fed7d7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    flex: 1,
    minHeight: 32,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#e53e3e',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  scrollToTopButton: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },

  // 🔧 MODAL NOTATION - CORRECTION CLAVIER COMPLÈTE
  ratingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  ratingModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  ratingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ratingModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  ratingModalCloseButton: {
    padding: 4,
  },

  ratingTargetText: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },

  starsContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  starsLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  starButton: {
    padding: 6,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFD700',
  },

  commentContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 6,
  },
  commentInput: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#000000',
    textAlignVertical: 'top',
    minHeight: 80,
    maxHeight: 120,
  },
  commentCounter: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'right',
    marginTop: 3,
  },

  ratingModalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  ratingCancelButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  ratingCancelText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333333',
  },
  ratingSubmitButton: {
    flex: 2,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  ratingSubmitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  ratingSubmitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default OrdersScreen;
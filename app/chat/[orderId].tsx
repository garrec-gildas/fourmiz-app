// app/chat/[orderId].tsx - VERSION PROPRE SANS DEBUG
// Chat entre client et fourmiz avec filtrage complet des informations de contact
// 🔒 BLOQUE : téléphones, emails, réseaux sociaux, liens, contournements
// ✨ AMÉLIORATIONS : Performance, UX, gestion d'erreurs, accessibilité
// 🔧 FIX : Correction des noms de colonnes firstname/lastname + read/read_at
// 🧹 CLEAN : Suppression du système de debug

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 🔒 SYSTÈME DE FILTRAGE ULTRA-SÉCURISÉ (Amélioré)
const SECURITY_PATTERNS = {
  // 📱 TÉLÉPHONES (tous formats + variations)
  phones: [
    /(?:(?:\+33|0033|0)\s?[1-9](?:[\s.-]?\d{2}){4})/gi,
    /(?:\+\d{1,3}\s?)?(?:\(\d{1,4}\))?\s?[\d\s.-]{7,15}/gi,
    /\b\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/gi,
    /\b\d{10,}\b/gi,
    // Nouveaux patterns pour contournements
    /\b(?:zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf)\s*(?:zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf)\s*(?:zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf)/gi,
  ],

  // 📧 EMAILS (tous formats + contournements sophistiqués)
  emails: [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
    /\b[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b/gi,
    /\b[A-Za-z0-9._%+-]+\s*\[\s*at\s*\]\s*[A-Za-z0-9.-]+\s*\[\s*dot\s*\]\s*[A-Z|a-z]{2,}\b/gi,
    /\b[A-Za-z0-9._%+-]+\s*\(\s*at\s*\)\s*[A-Za-z0-9.-]+\s*\(\s*dot\s*\)\s*[A-Z|a-z]{2,}\b/gi,
    /\b[A-Za-z0-9._%+-]+\s*\{\s*arobase\s*\}\s*[A-Za-z0-9.-]+\s*\{\s*point\s*\}\s*[A-Z|a-z]{2,}\b/gi,
  ],

  // 🔗 LIENS ET URLs (étendu)
  urls: [
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    /[a-zA-Z0-9-]+\.(com|org|net|fr|be|ch|de|uk|io|co|app|xyz|me|info|online|site|tech|pro)\b/gi,
    /bit\.ly\/[^\s]+/gi,
    /tinyurl\.com\/[^\s]+/gi,
  ],

  // 📱 RÉSEAUX SOCIAUX (étendu)
  socialMedia: [
    /@[a-zA-Z0-9_]+/g,
    /(?:instagram|insta|ig)\s*[:\s]*[a-zA-Z0-9_.]+/gi,
    /(?:facebook|fb)\s*[:\s]*[a-zA-Z0-9_.]+/gi,
    /(?:twitter|x\.com)\s*[:\s]*[a-zA-Z0-9_]+/gi,
    /(?:tiktok|tt)\s*[:\s]*[a-zA-Z0-9_.]+/gi,
    /(?:linkedin|li)\s*[:\s]*[a-zA-Z0-9_.]+/gi,
    /(?:snapchat|snap)\s*[:\s]*[a-zA-Z0-9_.]+/gi,
    /(?:discord)\s*[:\s]*[a-zA-Z0-9_.#]+/gi,
    /(?:telegram|tg)\s*[:\s]*[a-zA-Z0-9_.]+/gi,
    /(?:whatsapp|wa)\s*[:\s]*[a-zA-Z0-9_.]+/gi,
    /(?:youtube|yt)\s*[:\s]*[a-zA-Z0-9_.]+/gi,
    /(?:pinterest|pin)\s*[:\s]*[a-zA-Z0-9_.]+/gi,
  ],
};

// 🔒 MOTS-CLÉS SUSPECTS (Étendu)
const FORBIDDEN_KEYWORDS = [
  // Contact externe
  'whatsapp', 'telegram', 'signal', 'viber', 'messenger', 'skype',
  'appelle', 'appel', 'téléphone', 'phone', 'tel', 'mobile', 'portable', 'numero',
  'contacte', 'contact', 'joindre', 'joignable', 'rappel', 'rappelle',
  'email', 'mail', 'e-mail', 'courrier', 'adresse', 'gmail', 'outlook', 'hotmail',
  
  // Réseaux sociaux
  'instagram', 'facebook', 'twitter', 'tiktok', 'snapchat',
  'linkedin', 'discord', 'youtube', 'twitch', 'pinterest',
  
  // Contournement
  'dehors', 'ailleurs', 'autre app', 'autre plateforme', 'en dehors',
  'privé', 'personnel', 'direct', 'directement', 'offline',
  'rencontre', 'voir', 'face à face', 'en personne',
  
  // Urgence (souvent utilisé pour forcer contact externe)
  'urgent', 'urgence', 'rapidement', 'vite', 'immédiat', 'asap',
  
  // Nouveaux patterns de contournement
  'mon profil', 'mes coordonnées', 'mes infos', 'trouve moi',
];

// 🔒 FONCTION PRINCIPALE DE FILTRAGE (Améliorée)
const filterMessage = (message: string): {
  isAllowed: boolean;
  filteredMessage: string;
  violations: string[];
  severity: 'low' | 'medium' | 'high';
  confidence: number;
} => {
  const violations: string[] = [];
  let filteredMessage = message;
  let isAllowed = true;
  let severity: 'low' | 'medium' | 'high' = 'low';
  let confidence = 0;

  // 1. Vérifier les patterns critiques
  Object.entries(SECURITY_PATTERNS).forEach(([type, patterns]) => {
    patterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (type === 'phones' && isLikelyPhoneNumber(match)) {
            violations.push(`Numéro détecté: ${match}`);
            filteredMessage = filteredMessage.replace(match, '***CENSURÉ***');
            isAllowed = false;
            severity = 'high';
            confidence += 90;
          } else if (type === 'emails') {
            violations.push(`Email détecté: ${match}`);
            filteredMessage = filteredMessage.replace(match, '***CENSURÉ***');
            isAllowed = false;
            severity = 'high';
            confidence += 95;
          } else if (type === 'urls') {
            violations.push(`Lien détecté: ${match}`);
            filteredMessage = filteredMessage.replace(match, '***CENSURÉ***');
            isAllowed = false;
            severity = 'medium';
            confidence += 70;
          } else if (type === 'socialMedia') {
            violations.push(`Réseau social détecté: ${match}`);
            filteredMessage = filteredMessage.replace(match, '***CENSURÉ***');
            isAllowed = false;
            severity = 'medium';
            confidence += 80;
          }
        });
      }
    });
  });

  // 2. Vérifier les mots-clés suspects
  const lowerMessage = message.toLowerCase();
  FORBIDDEN_KEYWORDS.forEach(keyword => {
    if (lowerMessage.includes(keyword)) {
      violations.push(`Mot-clé interdit: ${keyword}`);
      if (severity === 'low') severity = 'medium';
      confidence += 40;
    }
  });

  // 3. Analyse contextuelle (nouveau)
  const suspiciousPatterns = [
    /(?:appelle|contacte|écrit)\s*(?:moi|nous)\s*(?:sur|via|par)/gi,
    /(?:mon|notre|mes)\s*(?:numéro|mail|compte|profil)/gi,
    /(?:trouve|cherche|regarde)\s*(?:moi|nous)\s*(?:sur|dans)/gi,
  ];

  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(message)) {
      violations.push('Pattern suspect détecté');
      if (severity === 'low') severity = 'medium';
      confidence += 60;
    }
  });

  return { 
    isAllowed, 
    filteredMessage, 
    violations, 
    severity, 
    confidence: Math.min(confidence, 100) 
  };
};

// 🔒 FONCTION : Vérifier si c'est un numéro de téléphone (Améliorée)
const isLikelyPhoneNumber = (text: string): boolean => {
  const cleanText = text.replace(/[\s.-]/g, '');
  
  // Exclure les faux positifs
  if (cleanText.length < 8 || cleanText.length > 15) return false;
  if (/^[1-9]\d*0{3,}$/.test(cleanText)) return false; // Prix
  if (/^(?:\d{8}|\d{6})$/.test(cleanText)) return false; // Dates
  if (/^[0-9]{5}$/.test(cleanText)) return false; // Codes postaux
  if (/^[0-9]{4}$/.test(cleanText)) return false; // Années
  
  // Numéros français typiques
  if (/^(?:\+33|0033|33|06|07|01|02|03|04|05|08|09)/.test(cleanText)) return true;
  if (/^0[1-9]\d{8}$/.test(cleanText)) return true;
  
  // Numéros internationaux
  if (/^\+\d{10,14}$/.test(cleanText)) return true;
  
  const digitCount = cleanText.length;
  const consecutiveDigits = cleanText.match(/(\d)\1{3,}/); // 4+ chiffres identiques
  
  return digitCount >= 10 && digitCount <= 14 && !consecutiveDigits;
};

// 🔒 INTERFACES - ✅ CORRIGÉ : read au lieu de read_at
interface ChatMessage {
  id: number;
  order_id: number;
  sender_id: string;
  message: string;
  message_type: 'text' | 'image' | 'location' | 'system';
  created_at: string;
  read: boolean;        // ✅ CORRIGÉ : read (boolean) au lieu de read_at (timestamp)
  metadata?: any;
  updated_at?: string;
  deleted_at?: string;
}

interface OrderInfo {
  id: number;
  client_id: string;
  fourmiz_id: string;
  status: string;
  date: string;
  start_time: string;
  address: string;
  proposed_amount: number;
  services: {
    title: string;
    categorie: string;
  };
  client_profile: {
    firstname: string;
    lastname: string;
    avatar_url: string;
    phone: string;
  };
  fourmiz_profile?: {
    firstname: string;
    lastname: string;
    avatar_url: string;
    phone: string;
  };
}

interface SecurityIncident {
  type: string;
  userId: string;
  orderId: string;
  violations: string[];
  severity: string;
  confidence: number;
  originalMessage: string;
  timestamp: string;
  userAgent?: string;
}

const MESSAGE_TYPES = {
  text: { icon: 'chatbubble', color: '#3b82f6' },
  image: { icon: 'image', color: '#10b981' },
  location: { icon: 'location', color: '#f59e0b' },
  system: { icon: 'information-circle', color: '#6b7280' }
};

// 🎨 CONSTANTES DE STYLE
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  white: '#ffffff',
};

export default function ChatScreen() {
  const { orderId } = useLocalSearchParams();
  
  console.log('🗨️ ChatScreen - orderId reçu:', orderId);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  
  // 🔒 ÉTATS POUR LA SÉCURITÉ
  const [securityAlertVisible, setSecurityAlertVisible] = useState(false);
  const [securityMessage, setSecurityMessage] = useState('');
  const [blockedMessage, setBlockedMessage] = useState('');
  const [securitySeverity, setSecuritySeverity] = useState<'low' | 'medium' | 'high'>('low');
  
  // 🎨 ÉTATS POUR L'ANIMATION
  const [fadeAnim] = useState(new Animated.Value(1));
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  // 📱 RÉFÉRENCES
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<any>(null);
  const typingSubscriptionRef = useRef<any>(null);

  // 🔄 MÉMOISATION POUR OPTIMISER LES PERFORMANCES
  const otherUser = useMemo(() => {
    if (!order || !currentUser) return null;
    return currentUser.id === order.client_id 
      ? order.fourmiz_profile 
      : order.client_profile;
  }, [order, currentUser]);

  const userRole = useMemo(() => {
    if (!order || !currentUser) return '';
    return currentUser.id === order.client_id ? 'Client' : 'Fourmiz';
  }, [order, currentUser]);

  const otherRole = useMemo(() => {
    if (!order || !currentUser) return '';
    return currentUser.id === order.client_id ? 'Fourmiz' : 'Client';
  }, [order, currentUser]);

  // 🚀 CHARGER L'UTILISATEUR
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('❌ Erreur récupération utilisateur:', error);
          Alert.alert(
            'Session expirée',
            'Veuillez vous reconnecter',
            [{ text: 'Se connecter', onPress: () => router.replace('/auth/login') }]
          );
          return;
        }

        if (!user) {
          Alert.alert(
            'Session expirée',
            'Veuillez vous reconnecter',
            [{ text: 'Se connecter', onPress: () => router.replace('/auth/login') }]
          );
          return;
        }

        setCurrentUser(user);
        setConnectionStatus('connected');
        console.log('✅ Utilisateur chargé:', user.email);

      } catch (error: any) {
        console.error('🔥 Erreur fatale chargement utilisateur:', error);
        setConnectionStatus('disconnected');
        Alert.alert(
          'Erreur de connexion',
          'Impossible de charger votre profil',
          [{ text: 'Se reconnecter', onPress: () => router.replace('/auth/login') }]
        );
      }
    };

    loadUser();
  }, []);

  // 🚀 CHARGER LES DONNÉES INITIALES
  useEffect(() => {
    if (currentUser && orderId) {
      loadOrderInfo();
      loadMessages();
      subscribeToMessages();
      subscribeToTyping();
    }

    return () => {
      // 🧹 NETTOYAGE
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (typingSubscriptionRef.current) {
        typingSubscriptionRef.current.unsubscribe();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUser, orderId]);

  // 📖 MARQUER LES MESSAGES COMME LUS AU FOCUS
  useFocusEffect(
    useCallback(() => {
      if (currentUser && orderId) {
        markMessagesAsRead();
      }
    }, [currentUser, orderId])
  );

  // 📜 AUTO-SCROLL VERS LE BAS
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // 🔄 CHARGER LES INFORMATIONS DE LA COMMANDE
  const loadOrderInfo = async () => {
    try {
      console.log('📋 Chargement des informations de la commande:', orderId);
      
      if (!orderId || isNaN(parseInt(orderId as string))) {
        throw new Error(`OrderId invalide: ${orderId}`);
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          services (title, categorie),
          client_profile:profiles!client_id (
            firstname, lastname, avatar_url, phone
          ),
          fourmiz_profile:profiles!fourmiz_id (
            firstname, lastname, avatar_url, phone
          )
        `)
        .eq('id', parseInt(orderId as string))
        .single();

      if (error) {
        console.error('❌ Erreur chargement commande:', error);
        throw error;
      }

      if (!data) {
        throw new Error(`Commande ${orderId} introuvable`);
      }

      // 🔒 Vérifier l'accès
      const userHasAccess = data.client_id === currentUser.id || data.fourmiz_id === currentUser.id;
      
      if (!userHasAccess) {
        setHasAccess(false);
        Alert.alert(
          'Accès refusé', 
          'Vous n\'avez pas accès à cette conversation',
          [{ text: 'Retour', onPress: () => router.back() }]
        );
        return;
      }

      setOrder(data);
      setHasAccess(true);
      console.log('✅ Commande chargée avec succès');

    } catch (error: any) {
      console.error('❌ Erreur chargement commande:', error);
      Alert.alert(
        'Erreur', 
        'Impossible de charger les informations de la commande',
        [{ text: 'Retour', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  // 💬 CHARGER LES MESSAGES
  const loadMessages = async () => {
    try {
      console.log('💬 Chargement des messages pour orderId:', orderId);
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erreur chargement messages:', error);
        throw error;
      }
      
      console.log('✅ Messages chargés:', data?.length || 0);
      setMessages(data || []);
    } catch (error) {
      console.error('❌ Erreur chargement messages:', error);
      Alert.alert('Erreur', 'Impossible de charger les messages');
    }
  };

  // 🔄 S'ABONNER AUX NOUVEAUX MESSAGES
  const subscribeToMessages = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = supabase
      .channel(`chat_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => {
            // Éviter les doublons
            if (prev.find(msg => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          
          // Marquer comme lu si ce n'est pas notre message
          if (newMessage.sender_id !== currentUser.id) {
            markMessageAsRead(newMessage.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });
  };

  // ⌨️ S'ABONNER AUX INDICATEURS DE FRAPPE
  const subscribeToTyping = () => {
    if (typingSubscriptionRef.current) {
      typingSubscriptionRef.current.unsubscribe();
    }

    typingSubscriptionRef.current = supabase
      .channel(`typing_${orderId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== currentUser.id) {
          setOtherUserTyping(payload.is_typing);
          
          // Auto-clear typing après 3 secondes
          if (payload.is_typing) {
            setTimeout(() => setOtherUserTyping(false), 3000);
          }
        }
      })
      .subscribe();
  };

  // 🔄 FONCTION DE NAVIGATION RETOUR INTELLIGENTE
  const handleBackNavigation = () => {
    if (!currentUser || !order) {
      router.back();
      return;
    }

    // Déterminer la page de retour selon le rôle
    const isClient = currentUser.id === order.client_id;
    const isFourmiz = currentUser.id === order.fourmiz_id;

    try {
      if (isClient) {
        // Client : retour vers ses commandes
        router.push('/(tabs)/orders');
      } else if (isFourmiz) {
        // Fourmiz : retour vers ses services en cours (plus logique depuis un chat)
        router.push('/(tabs)/services-requests'); 
      } else {
        // Fallback : retour simple
        router.back();
      }
    } catch (error) {
      console.error('❌ Erreur navigation retour:', error);
      router.back(); // Fallback en cas d'erreur
    }
  };

  // 📨 FONCTION SÉCURISÉE D'ENVOI DE MESSAGE
  const sendMessage = async () => {
    if (!newMessage.trim() || !orderId || !currentUser || sending) return;

    const messageText = newMessage.trim();
    
    // 🔒 FILTRAGE ULTRA-SÉCURISÉ
    const filterResult = filterMessage(messageText);
    
    if (!filterResult.isAllowed) {
      // 🚫 Message bloqué
      console.warn('🔒 Message bloqué:', {
        userId: currentUser.id,
        orderId,
        violations: filterResult.violations,
        severity: filterResult.severity,
        confidence: filterResult.confidence,
        message: messageText.substring(0, 50) + '...'
      });
      
      // 📊 Log de sécurité
      await logSecurityIncident({
        type: 'blocked_message',
        userId: currentUser.id,
        orderId: orderId.toString(),
        violations: filterResult.violations,
        severity: filterResult.severity,
        confidence: filterResult.confidence,
        originalMessage: messageText,
        timestamp: new Date().toISOString(),
        userAgent: Platform.OS + ' ' + Platform.Version
      });
      
      // 🚨 Afficher l'alerte de sécurité
      setBlockedMessage(filterResult.filteredMessage);
      setSecurityMessage(getSecurityMessage(filterResult.severity, filterResult.confidence));
      setSecuritySeverity(filterResult.severity);
      setSecurityAlertVisible(true);
      
      return; // Bloquer l'envoi
    }

    // ✅ Message autorisé - continuer l'envoi normal
    setNewMessage('');
    setSending(true);
    setIsTyping(false);

    // 🔄 Notifier qu'on ne tape plus
    if (typingSubscriptionRef.current) {
      typingSubscriptionRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: currentUser.id, is_typing: false }
      });
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          order_id: parseInt(orderId as string),
          sender_id: currentUser.id,
          message: messageText,
          message_type: 'text',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // 📜 Scroller vers le bas
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
      setNewMessage(messageText); // Restaurer le message
    } finally {
      setSending(false);
    }
  };

  // 🔒 LOG DES INCIDENTS DE SÉCURITÉ
  const logSecurityIncident = async (incident: SecurityIncident) => {
    try {
      await supabase.from('security_incidents').insert([incident]);
    } catch (error) {
      console.error('❌ Erreur log sécurité:', error);
    }
  };

  // 🔒 MESSAGES DE SÉCURITÉ SELON LA GRAVITÉ
  const getSecurityMessage = (severity: string, confidence: number): string => {
    const baseMessages = {
      high: 'Pour votre sécurité et celle de votre interlocuteur, le partage d\'informations personnelles (email, téléphone) n\'est pas autorisé. Toutes les communications doivent passer par cette messagerie sécurisée.',
      medium: 'Les liens externes et références aux réseaux sociaux ne sont pas autorisés. Utilisez cette messagerie pour toutes vos communications.',
      low: 'Ce message contient du contenu non autorisé. Merci de respecter les règles de communication.'
    };

    let message = baseMessages[severity as keyof typeof baseMessages] || baseMessages.low;
    
    if (confidence > 80) {
      message += '\n\n⚠️ Violation détectée avec un haut niveau de confiance.';
    }
    
    return message;
  };

  // 📖 MARQUER LES MESSAGES COMME LUS - ✅ CORRIGÉ : read au lieu de read_at
  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read: true })      // ✅ CORRIGÉ : read (boolean) au lieu de read_at (timestamp)
        .eq('order_id', orderId)
        .neq('sender_id', currentUser.id)
        .eq('read', false);          // ✅ CORRIGÉ : read false au lieu de read_at null
    } catch (error) {
      console.error('❌ Erreur marquage lu:', error);
    }
  };

  // 📖 MARQUER UN MESSAGE COMME LU - ✅ CORRIGÉ : read au lieu de read_at
  const markMessageAsRead = async (messageId: number) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read: true })      // ✅ CORRIGÉ : read (boolean) au lieu de read_at (timestamp)
        .eq('id', messageId);
    } catch (error) {
      console.error('❌ Erreur marquage message lu:', error);
    }
  };

  // ⌨️ GÉRER LA FRAPPE
  const handleTyping = useCallback((text: string) => {
    setNewMessage(text);
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      if (typingSubscriptionRef.current) {
        typingSubscriptionRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { user_id: currentUser.id, is_typing: true }
        });
      }
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false);
      if (typingSubscriptionRef.current) {
        typingSubscriptionRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { user_id: currentUser.id, is_typing: false }
        });
      }
    }

    // Clear timeout précédent
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Arrêter l'indicateur après 2 secondes d'inactivité
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        if (typingSubscriptionRef.current) {
          typingSubscriptionRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: currentUser.id, is_typing: false }
          });
        }
      }
    }, 2000);
  }, [isTyping, currentUser]);

  // 📍 PARTAGE DE LOCALISATION SÉCURISÉ
  const sendLocation = async () => {
    Alert.alert(
      'Partager ma position',
      'Voulez-vous partager votre position actuelle ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Partager',
          onPress: async () => {
            try {
              setSending(true);
              
              // Position générique pour demo (remplacer par GPS réel)
              const mockLocation = {
                latitude: 48.5734 + (Math.random() - 0.5) * 0.01,
                longitude: 7.7521 + (Math.random() - 0.5) * 0.01,
                address: 'Zone de service - Strasbourg'
              };

              await supabase
                .from('chat_messages')
                .insert({
                  order_id: parseInt(orderId as string),
                  sender_id: currentUser.id,
                  message: `📍 Position partagée: ${mockLocation.address}`,
                  message_type: 'location',
                  metadata: mockLocation,
                  created_at: new Date().toISOString()
                });
                
            } catch (error) {
              console.error('❌ Erreur partage position:', error);
              Alert.alert('Erreur', 'Impossible de partager la position');
            } finally {
              setSending(false);
            }
          }
        }
      ]
    );
  };

  // 🕒 FORMATAGE DU TEMPS
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // 📅 FORMATAGE DE LA DATE
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
      });
    }
  };

  // 💬 RENDU D'UN MESSAGE
  const renderMessage = (message: ChatMessage, index: number) => {
    const isMyMessage = message.sender_id === currentUser.id;
    const showDate = index === 0 || 
      formatDate(message.created_at) !== formatDate(messages[index - 1].created_at);

    return (
      <View key={message.id}>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(message.created_at)}</Text>
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
        ]}>
          {message.message_type === 'system' ? (
            <View style={styles.systemMessage}>
              <Ionicons name="information-circle" size={16} color={COLORS.gray[500]} />
              <Text style={styles.systemMessageText}>{message.message}</Text>
            </View>
          ) : (
            <View style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
            ]}>
              {message.message_type === 'location' ? (
                <TouchableOpacity
                  style={styles.locationMessage}
                  onPress={() => {
                    Alert.alert('Position partagée', message.message, [
                      { text: 'Fermer', style: 'cancel' },
                      { 
                        text: 'Voir sur la carte', 
                        onPress: () => {
                          // Ouvrir l'app de cartographie
                          console.log('Ouvrir carte:', message.metadata);
                        }
                      }
                    ]);
                  }}
                  accessible={true}
                  accessibilityLabel="Position partagée"
                  accessibilityHint="Appuyez pour voir les détails de la position"
                >
                  <Ionicons name="location" size={20} color={COLORS.warning} />
                  <Text style={styles.locationText}>{message.message}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[
                  styles.messageText,
                  isMyMessage ? styles.myMessageText : styles.otherMessageText
                ]}>
                  {message.message}
                </Text>
              )}
              
              <View style={styles.messageFooter}>
                <Text style={[
                  styles.messageTime,
                  isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                ]}>
                  {formatTime(message.created_at)}
                </Text>
                {isMyMessage && (
                  <Ionicons 
                    name={message.read ? "checkmark-done" : "checkmark"}  // ✅ CORRIGÉ : message.read au lieu de message.read_at
                    size={14} 
                    color={message.read ? COLORS.success : COLORS.gray[500]}  // ✅ CORRIGÉ : message.read au lieu de message.read_at
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // 📋 RENDU DES INFORMATIONS DE COMMANDE
  const renderOrderInfo = () => {
    if (!order) return null;

    return (
      <View style={styles.orderInfoCard}>
        <View style={styles.orderInfoHeader}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceTitle}>{order.services.title}</Text>
            <Text style={styles.serviceCategory}>{order.services.categorie}</Text>
            <View style={[styles.statusBadge, getStatusStyle(order.status)]}>
              <Text style={[styles.statusText, getStatusTextStyle(order.status)]}>
                {getStatusLabel(order.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.orderAmount}>{order.proposed_amount}€</Text>
        </View>
        
        <View style={styles.orderInfoDetails}>
          <View style={styles.orderInfoRow}>
            <Ionicons name="calendar" size={16} color={COLORS.gray[500]} />
            <Text style={styles.orderInfoText}>
              {new Date(order.date).toLocaleDateString('fr-FR')}
              {order.start_time && ` à ${order.start_time.slice(0, 5)}`}
            </Text>
          </View>
          
          <View style={styles.orderInfoRow}>
            <Ionicons name="location" size={16} color={COLORS.gray[500]} />
            <Text style={styles.orderInfoText} numberOfLines={2}>
              {order.address}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // 🏷️ FONCTIONS POUR LE STATUT
  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'En attente',
      accepted: 'Acceptée',
      in_progress: 'En cours',
      completed: 'Terminée',
      cancelled: 'Annulée'
    };
    return labels[status] || status;
  };

  const getStatusStyle = (status: string) => {
    const styles: { [key: string]: any } = {
      pending: { backgroundColor: '#fef3c7' },
      accepted: { backgroundColor: '#dbeafe' },
      in_progress: { backgroundColor: '#d1fae5' },
      completed: { backgroundColor: '#dcfce7' },
      cancelled: { backgroundColor: '#fee2e2' }
    };
    return styles[status] || { backgroundColor: COLORS.gray[100] };
  };

  const getStatusTextStyle = (status: string) => {
    const styles: { [key: string]: any } = {
      pending: { color: '#92400e' },
      accepted: { color: '#1e40af' },
      in_progress: { color: '#065f46' },
      completed: { color: '#166534' },
      cancelled: { color: '#dc2626' }
    };
    return styles[status] || { color: COLORS.gray[600] };
  };

  // 📱 RENDU DE L'EN-TÊTE DU CHAT
  const renderChatHeader = () => {
    if (!order) return null;

    return (
      <View style={styles.chatHeader}>
        {/* Bouton de retour */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackNavigation}
          accessible={true}
          accessibilityLabel={`Retour vers ${userRole === 'Client' ? 'mes commandes' : 'mes services en cours'}`}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Zone principale cliquable pour les détails */}
        <TouchableOpacity 
          style={styles.chatHeaderMain}
          onPress={() => router.push(`/orders/${order.id}`)}
          accessible={true}
          accessibilityLabel={`Voir les détails de la commande avec ${otherUser ? `${otherUser.firstname} ${otherUser.lastname}` : 'l\'utilisateur'}`}
        >
          {otherUser?.avatar_url ? (
            <Image source={{ uri: otherUser.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color={COLORS.gray[500]} />
            </View>
          )}
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {otherUser ? `${otherUser.firstname} ${otherUser.lastname}` : 'Utilisateur'}
            </Text>
            <Text style={styles.headerRole}>{otherRole}</Text>
            {otherUserTyping && (
              <Text style={styles.typingIndicator}>en train d'écrire...</Text>
            )}
            {/* Indicateur de connexion */}
            <View style={styles.connectionStatus}>
              <View style={[
                styles.connectionDot, 
                connectionStatus === 'connected' && styles.connectedDot,
                connectionStatus === 'connecting' && styles.connectingDot,
                connectionStatus === 'disconnected' && styles.disconnectedDot
              ]} />
              <Text style={styles.connectionText}>
                {connectionStatus === 'connected' ? 'En ligne' : 
                 connectionStatus === 'connecting' ? 'Connexion...' : 'Hors ligne'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Boutons d'action à droite */}
        <View style={styles.headerActions}>
          {/* Bouton info sécurisé */}
          <TouchableOpacity 
            style={styles.infoButton} 
            onPress={() => {
              Alert.alert(
                'Communication Sécurisée',
                'Cette messagerie est votre moyen de communication sécurisé. Aucune information personnelle ne doit être échangée pour protéger votre vie privée.',
                [{ text: 'Compris', style: 'default' }]
              );
            }}
            accessible={true}
            accessibilityLabel="Informations sur la sécurité"
          >
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 🚨 RENDU DE L'ALERTE DE SÉCURITÉ
  const renderSecurityAlert = () => (
    <Modal visible={securityAlertVisible} transparent animationType="fade">
      <View style={styles.securityAlertOverlay}>
        <Animated.View 
          style={[
            styles.securityAlertContainer,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.securityAlertHeader}>
            <Ionicons 
              name="shield-checkmark" 
              size={32} 
              color={securitySeverity === 'high' ? COLORS.danger : COLORS.warning} 
            />
            <Text style={styles.securityAlertTitle}>Message Bloqué</Text>
          </View>
          
          <Text style={styles.securityAlertMessage}>{securityMessage}</Text>
          
          {blockedMessage && (
            <View style={styles.blockedMessageContainer}>
              <Text style={styles.blockedMessageLabel}>Votre message modifié :</Text>
              <Text style={styles.blockedMessageText}>{blockedMessage}</Text>
            </View>
          )}
          
          <View style={styles.securityAlertButtons}>
            <TouchableOpacity 
              style={[
                styles.securityAlertButton,
                securitySeverity === 'high' && styles.securityAlertButtonDanger
              ]}
              onPress={() => {
                setSecurityAlertVisible(false);
                setNewMessage(''); // Effacer le message bloqué
                textInputRef.current?.focus();
              }}
              accessible={true}
              accessibilityLabel="Fermer l'alerte et effacer le message"
            >
              <Text style={[
                styles.securityAlertButtonText,
                securitySeverity === 'high' && styles.securityAlertButtonTextDanger
              ]}>
                J'ai compris
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  // 🔄 ÉCRAN DE CHARGEMENT
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Chat' }} />
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement du chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 🚫 ÉCRAN D'ERREUR SI PAS D'ACCÈS
  if (!order || !hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Chat - Erreur' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
          <Text style={styles.errorText}>
            {!order ? 'Conversation introuvable' : 'Accès refusé'}
          </Text>
          
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ INTERFACE NORMALE DU CHAT
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Chat',
          headerShown: false,
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {renderChatHeader()}
        
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        >
          {renderOrderInfo()}
          
          {messages.map(renderMessage)}
          
          {otherUserTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={sendLocation}
            disabled={sending}
            accessible={true}
            accessibilityLabel="Partager ma position"
          >
            <Ionicons name="location" size={24} color={COLORS.gray[500]} />
          </TouchableOpacity>
          
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            placeholder="Tapez votre message..."
            placeholderTextColor={COLORS.gray[500]}
            value={newMessage}
            onChangeText={handleTyping}
            multiline
            maxLength={1000}
            accessible={true}
            accessibilityLabel="Zone de saisie de message"
            accessibilityHint="Tapez votre message ici"
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
            accessible={true}
            accessibilityLabel="Envoyer le message"
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 🔒 ALERTE DE SÉCURITÉ */}
      {renderSecurityAlert()}
    </SafeAreaView>
  );
}

// 🎨 STYLES OPTIMISÉS SANS DEBUG
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.gray[50] 
  },
  keyboardAvoid: { 
    flex: 1 
  },
  
  // États de chargement et d'erreur
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  loadingText: { 
    fontSize: 16, 
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // Header du chat
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
  },
  chatHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20 
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { 
    flex: 1 
  },
  headerName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.gray[900] 
  },
  headerRole: { 
    fontSize: 14, 
    color: COLORS.gray[500] 
  },
  typingIndicator: { 
    fontSize: 12, 
    color: COLORS.primary, 
    fontStyle: 'italic' 
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray[400],
  },
  connectedDot: {
    backgroundColor: COLORS.success,
  },
  connectingDot: {
    backgroundColor: COLORS.warning,
  },
  disconnectedDot: {
    backgroundColor: COLORS.danger,
  },
  connectionText: {
    fontSize: 10,
    color: COLORS.gray[500],
  },
  
  // Bouton info
  infoButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
  },

  // Info commande
  orderInfoCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: { 
    flex: 1 
  },
  serviceTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.gray[900] 
  },
  serviceCategory: { 
    fontSize: 14, 
    color: COLORS.primary, 
    marginTop: 2 
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderAmount: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.success 
  },
  orderInfoDetails: { 
    gap: 8 
  },
  orderInfoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  orderInfoText: { 
    fontSize: 14, 
    color: COLORS.gray[500], 
    flex: 1 
  },

  // Messages
  messagesContainer: { 
    flex: 1 
  },
  messagesContent: { 
    paddingBottom: 16 
  },
  
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.gray[500],
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  messageContainer: { 
    marginHorizontal: 16, 
    marginVertical: 2 
  },
  myMessageContainer: { 
    alignItems: 'flex-end' 
  },
  otherMessageContainer: { 
    alignItems: 'flex-start' 
  },
  
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  messageText: { 
    fontSize: 16, 
    lineHeight: 22 
  },
  myMessageText: { 
    color: COLORS.white 
  },
  otherMessageText: { 
    color: COLORS.gray[900] 
  },

  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: { 
    fontSize: 12 
  },
  myMessageTime: { 
    color: 'rgba(255,255,255,0.7)' 
  },
  otherMessageTime: { 
    color: COLORS.gray[500] 
  },

  // Messages système
  systemMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    marginVertical: 8,
  },
  systemMessageText: { 
    fontSize: 14, 
    color: COLORS.gray[500], 
    textAlign: 'center' 
  },

  // Messages de localisation
  locationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: { 
    fontSize: 16, 
    color: COLORS.warning, 
    textDecorationLine: 'underline' 
  },

  // Indicateur de frappe
  typingContainer: {
    marginHorizontal: 16,
    marginVertical: 2,
    alignItems: 'flex-start',
  },
  typingBubble: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typingDots: { 
    flexDirection: 'row', 
    gap: 4 
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray[500],
  },
  dot1: {},
  dot2: {},
  dot3: {},

  // Zone de saisie
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.gray[900],
    maxHeight: 100,
    backgroundColor: COLORS.white,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },

  // Styles de sécurité
  securityAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityAlertContainer: {
    backgroundColor: COLORS.white,
    margin: 20,
    padding: 24,
    borderRadius: 16,
    maxWidth: SCREEN_WIDTH * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  securityAlertHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  securityAlertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginTop: 8,
    textAlign: 'center',
  },
  securityAlertMessage: {
    fontSize: 14,
    color: COLORS.gray[600],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  blockedMessageContainer: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  blockedMessageLabel: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  blockedMessageText: {
    fontSize: 14,
    color: '#78350f',
    fontStyle: 'italic',
  },
  securityAlertButtons: {
    alignItems: 'center',
  },
  securityAlertButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  securityAlertButtonDanger: {
    backgroundColor: COLORS.danger,
  },
  securityAlertButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  securityAlertButtonTextDanger: {
    color: COLORS.white,
  },
});
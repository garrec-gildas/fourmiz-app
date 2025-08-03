// hooks/useChat.ts - Hook principal pour la gestion du chat
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export interface ChatMessage {
  id: number;
  order_id: number;
  sender_id: string;
  message: string;
  message_type: 'text' | 'image' | 'location' | 'system';
  metadata?: any;
  created_at: string;
  read_at: string | null;
}

export interface ChatHookReturn {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  isTyping: boolean;
  otherUserTyping: boolean;
  sendMessage: (message: string) => Promise<void>;
  sendLocation: (location: { latitude: number; longitude: number; address: string }) => Promise<void>;
  markAsRead: () => Promise<void>;
  setTyping: (typing: boolean) => void;
}

export const useChat = (orderId: number, currentUserId: string): ChatHookReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>();

  // Charger les messages
  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('❌ Erreur chargement messages:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // S'abonner aux nouveaux messages et typing
  useEffect(() => {
    if (!orderId || !currentUserId) return;

    loadMessages();

    // Channel pour les messages et typing
    const channel = supabase
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
          setMessages(prev => [...prev, newMessage]);
          
          // Marquer comme lu si ce n'est pas notre message
          if (newMessage.sender_id !== currentUserId) {
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
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== currentUserId) {
          setOtherUserTyping(payload.is_typing);
          
          // Auto-clear typing après 3 secondes
          if (payload.is_typing) {
            setTimeout(() => setOtherUserTyping(false), 3000);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [orderId, currentUserId, loadMessages]);

  // Marquer un message comme lu
  const markMessageAsRead = useCallback(async (messageId: number) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);
    } catch (error) {
      console.error('❌ Erreur marquage lu:', error);
    }
  }, []);

  // Marquer tous les messages comme lus
  const markAsRead = useCallback(async () => {
    try {
      await supabase.rpc('mark_messages_as_read', {
        p_user_id: currentUserId,
        p_order_id: orderId
      });
    } catch (error) {
      console.error('❌ Erreur marquage messages lus:', error);
    }
  }, [currentUserId, orderId]);

  // Envoyer un message texte
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || sending) return;

    setSending(true);
    setTyping(false);

    // Notifier qu'on ne tape plus
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUserId, is_typing: false }
    });

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          order_id: orderId,
          sender_id: currentUserId,
          message: message.trim(),
          message_type: 'text',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // TODO: Envoyer notification push
      // await sendPushNotification(otherUserId, message);

    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
      throw error;
    } finally {
      setSending(false);
    }
  }, [orderId, currentUserId, sending]);

  // Envoyer une localisation
  const sendLocation = useCallback(async (location: { latitude: number; longitude: number; address: string }) => {
    setSending(true);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          order_id: orderId,
          sender_id: currentUserId,
          message: `Position partagée: ${location.address}`,
          message_type: 'location',
          metadata: location,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('❌ Erreur envoi localisation:', error);
      Alert.alert('Erreur', 'Impossible de partager la position');
      throw error;
    } finally {
      setSending(false);
    }
  }, [orderId, currentUserId]);

  // Gérer l'indicateur "en train d'écrire"
  const setTyping = useCallback((typing: boolean) => {
    setIsTyping(typing);

    // Envoyer l'état de typing
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUserId, is_typing: typing }
    });

    // Auto-clear après 3 secondes d'inactivité
    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'typing',
          payload: { user_id: currentUserId, is_typing: false }
        });
      }, 3000);
    }
  }, [currentUserId]);

  return {
    messages,
    loading,
    sending,
    isTyping,
    otherUserTyping,
    sendMessage,
    sendLocation,
    markAsRead,
    setTyping
  };
};

// hooks/useUnreadMessages.ts - Hook pour compter les messages non lus
export const useUnreadMessages = (userId: string) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase.rpc('get_unread_messages_count', {
        p_user_id: userId
      });

      if (error) throw error;
      setUnreadCount(data || 0);
    } catch (error) {
      console.error('❌ Erreur comptage messages non lus:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUnreadCount();

    // S'abonner aux changements de messages
    const subscription = supabase
      .channel('unread_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUnreadCount]);

  return { unreadCount, loading, refresh: loadUnreadCount };
};

// utils/chatUtils.ts - Utilitaires pour le chat
export const chatUtils = {
  // Formater l'heure d'un message
  formatMessageTime: (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  },

  // Formater la date d'un message
  formatMessageDate: (timestamp: string): string => {
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
  },

  // Formater le timestamp relatif (il y a X min/heures)
  formatRelativeTime: (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  },

  // Vérifier si deux messages sont du même jour
  isSameDay: (timestamp1: string, timestamp2: string): boolean => {
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    return date1.toDateString() === date2.toDateString();
  },

  // Vérifier si deux messages sont du même expéditeur et proches dans le temps
  shouldGroupMessages: (msg1: ChatMessage, msg2: ChatMessage, maxMinutes = 5): boolean => {
    if (msg1.sender_id !== msg2.sender_id) return false;
    if (msg1.message_type === 'system' || msg2.message_type === 'system') return false;
    
    const time1 = new Date(msg1.created_at);
    const time2 = new Date(msg2.created_at);
    const diffInMinutes = Math.abs(time2.getTime() - time1.getTime()) / (1000 * 60);
    
    return diffInMinutes <= maxMinutes;
  },

  // Tronquer un long message pour les aperçus
  truncateMessage: (message: string, maxLength = 50): string => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength).trim() + '...';
  },

  // Formater un message selon son type pour l'aperçu
  formatPreviewMessage: (message: ChatMessage): string => {
    switch (message.message_type) {
      case 'image':
        return '📷 Image';
      case 'location':
        return '📍 Position partagée';
      case 'system':
        return `🔔 ${message.message}`;
      default:
        return chatUtils.truncateMessage(message.message);
    }
  },

  // Obtenir l'icône pour un type de message
  getMessageTypeIcon: (type: string): string => {
    switch (type) {
      case 'image': return 'image';
      case 'location': return 'location';
      case 'system': return 'information-circle';
      default: return 'chatbubble';
    }
  },

  // Valider un message avant envoi
  validateMessage: (message: string): { valid: boolean; error?: string } => {
    if (!message.trim()) {
      return { valid: false, error: 'Le message ne peut pas être vide' };
    }
    
    if (message.length > 1000) {
      return { valid: false, error: 'Le message est trop long (max 1000 caractères)' };
    }
    
    return { valid: true };
  },

  // Extraire les mentions d'un message (pour future extension)
  extractMentions: (message: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(message)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  },

  // Nettoyer et sécuriser un message
  sanitizeMessage: (message: string): string => {
    return message
      .trim()
      .replace(/\s+/g, ' ') // Réduire les espaces multiples
      .substring(0, 1000); // Limiter la longueur
  }
};

// utils/notificationUtils.ts - Utilitaires pour les notifications
export const notificationUtils = {
  // Envoyer une notification push (à implémenter avec Expo Notifications)
  sendPushNotification: async (
    targetUserId: string, 
    message: string, 
    orderId: number,
    senderName: string
  ): Promise<void> => {
    try {
      // TODO: Implémenter avec Expo Notifications
      console.log('📱 Notification push à envoyer:', {
        targetUserId,
        message: chatUtils.truncateMessage(message, 100),
        orderId,
        senderName
      });

      // Exemple d'implémentation future:
      // const { data: tokens } = await supabase
      //   .from('push_tokens')
      //   .select('token')
      //   .eq('user_id', targetUserId);
      
      // if (tokens?.length) {
      //   await sendExpoNotification({
      //     to: tokens.map(t => t.token),
      //     title: senderName,
      //     body: message,
      //     data: { orderId, type: 'chat_message' }
      //   });
      // }
    } catch (error) {
      console.error('❌ Erreur envoi notification:', error);
    }
  },

  // Programmer une notification de rappel
  scheduleReminderNotification: async (
    userId: string,
    orderId: number,
    scheduledTime: Date,
    message: string
  ): Promise<void> => {
    try {
      // TODO: Implémenter avec Expo Notifications
      console.log('⏰ Notification programmée:', {
        userId,
        orderId,
        scheduledTime,
        message
      });
    } catch (error) {
      console.error('❌ Erreur programmation notification:', error);
    }
  },

  // Marquer les notifications comme lues
  markNotificationsAsRead: async (userId: string, orderId?: number): Promise<void> => {
    try {
      // TODO: Implémenter avec votre système de notifications
      console.log('✅ Notifications marquées comme lues:', { userId, orderId });
    } catch (error) {
      console.error('❌ Erreur marquage notifications:', error);
    }
  }
};
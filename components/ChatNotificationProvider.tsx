// components/ChatNotificationProvider.tsx - Provider pour les notifications chat CORRIGÉ
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';

interface ChatNotificationContextType {
  unreadCount: number;
  showInAppNotification: (message: NotificationMessage) => void;
  hideInAppNotification: () => void;
  currentNotification: NotificationMessage | null;
}

interface NotificationMessage {
  id: string;
  title: string;
  message: string;
  orderId: number;
  senderName: string;
  senderAvatar?: string;
  timestamp: string;
  type: 'chat_message' | 'order_update' | 'system';
}

const ChatNotificationContext = createContext<ChatNotificationContextType | null>(null);

export const useChatNotifications = () => {
  const context = useContext(ChatNotificationContext);
  if (!context) {
    throw new Error('useChatNotifications must be used within ChatNotificationProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
  currentUserId?: string;
}

export const ChatNotificationProvider: React.FC<Props> = ({ children, currentUserId }) => {
  const [currentNotification, setCurrentNotification] = useState<NotificationMessage | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [unreadCount, setUnreadCount] = useState(0);

  // 📊 HOOK LOCAL POUR LES MESSAGES NON LUS (remplace useUnreadMessages)
  useEffect(() => {
    if (!currentUserId) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        // Compter les messages non lus pour cet utilisateur
        const { data, error } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact' })
          .neq('sender_id', currentUserId)
          .eq('read', false)
          .in('order_id', 
            // Sous-requête pour obtenir les commandes de l'utilisateur
            await supabase
              .from('orders')
              .select('id')
              .or(`client_id.eq.${currentUserId},fourmiz_id.eq.${currentUserId}`)
              .then(result => result.data?.map(order => order.id) || [])
          );

        if (error) {
          console.error('❌ Erreur comptage messages non lus:', error);
          setUnreadCount(0);
        } else {
          setUnreadCount(data?.length || 0);
        }
      } catch (error) {
        console.error('❌ Exception comptage messages:', error);
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();

    // Recompter toutes les 30 secondes
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [currentUserId]);

  // Écouter les changements d'état de l'app
  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription?.remove();
  }, []);

  // Écouter les nouveaux messages en temps réel
  useEffect(() => {
    if (!currentUserId) return;

    console.log('🔔 Configuration des notifications temps réel pour:', currentUserId);

    const subscription = supabase
      .channel('global_chat_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          try {
            const newMessage = payload.new as any;
            
            console.log('📨 Nouveau message reçu:', newMessage.id);
            
            // Ne pas notifier nos propres messages
            if (newMessage.sender_id === currentUserId) {
              console.log('🚫 Message ignoré (notre propre message)');
              return;
            }
            
            // Vérifier que l'utilisateur fait partie de cette conversation
            const { data: order, error: orderError } = await supabase
              .from('orders')
              .select('client_id, fourmiz_id')
              .eq('id', newMessage.order_id)
              .single();
            
            if (orderError || !order) {
              console.log('🚫 Message ignoré (commande non trouvée)');
              return;
            }

            if (order.client_id !== currentUserId && order.fourmiz_id !== currentUserId) {
              console.log('🚫 Message ignoré (pas notre conversation)');
              return;
            }

            // Incrémenter le compteur de messages non lus
            setUnreadCount(prev => prev + 1);

            // Obtenir les infos de l'expéditeur
            const { data: sender } = await supabase
              .from('profiles')
              .select('firstname, lastname, avatar_url')
              .eq('user_id', newMessage.sender_id)
              .single();

            const senderName = sender 
              ? `${sender.firstname || ''} ${sender.lastname || ''}`.trim() || 'Utilisateur'
              : 'Utilisateur';

            // Créer la notification
            const notification: NotificationMessage = {
              id: `msg_${newMessage.id}`,
              title: senderName,
              message: formatNotificationMessage(newMessage.message, newMessage.message_type),
              orderId: newMessage.order_id,
              senderName,
              senderAvatar: sender?.avatar_url,
              timestamp: newMessage.created_at,
              type: 'chat_message'
            };

            console.log('🔔 Notification créée:', notification);

            // Afficher la notification seulement si l'app est en foreground
            if (appState === 'active') {
              showInAppNotification(notification);
            } else {
              console.log('📱 App en arrière-plan - notification in-app non affichée');
            }

          } catch (error) {
            console.error('❌ Erreur traitement nouveau message:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status subscription chat:', status);
      });

    return () => {
      console.log('🧹 Nettoyage subscription chat notifications');
      subscription.unsubscribe();
    };
  }, [currentUserId, appState]);

  const formatNotificationMessage = (message: string, type: string): string => {
    switch (type) {
      case 'image':
        return '📷 A envoyé une image';
      case 'location':
        return '📍 A partagé sa position';
      case 'system':
        return message;
      default:
        return message.length > 50 ? message.substring(0, 50) + '...' : message;
    }
  };

  const showInAppNotification = (notification: NotificationMessage) => {
    console.log('📢 Affichage notification in-app:', notification.title);
    setCurrentNotification(notification);
    
    // Auto-hide après 4 secondes
    setTimeout(() => {
      setCurrentNotification(null);
    }, 4000);
  };

  const hideInAppNotification = () => {
    setCurrentNotification(null);
  };

  const value: ChatNotificationContextType = {
    unreadCount,
    showInAppNotification,
    hideInAppNotification,
    currentNotification
  };

  return (
    <ChatNotificationContext.Provider value={value}>
      {children}
    </ChatNotificationContext.Provider>
  );
};
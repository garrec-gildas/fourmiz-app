// app/(tabs)/messages.tsx - VERSION SANS HEADER LOCAL
// 🔒 Protection complète contre les erreurs .includes()
// 💬 CONVERSATIONS SÉCURISÉES : Recherche et filtrage protégés
// 🎨 STYLE ÉPURÉ : Cohérent avec le design services.tsx
// 📱 HISTORIQUE CONSERVÉ : Toute la logique de messagerie maintenue
// 🔧 MODIFIÉ : Header local supprimé (utilise le header global du layout)

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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

// 🔒 HELPERS DE SÉCURITÉ POUR LES STRINGS
const safeString = (value: any): string => {
  return value?.toString() || '';
};

const safeStringSearch = (text: any, query: string): boolean => {
  const safeText = safeString(text);
  return safeText.toLowerCase().includes(query.toLowerCase());
};

// 🔍 HELPER POUR FILTRAGE SÉCURISÉ
const filterConversations = (conversations: Conversation[], query: string): Conversation[] => {
  if (!query.trim()) return conversations;
  
  const searchQuery = query.toLowerCase();
  return conversations.filter(conv => 
    safeStringSearch(conv.other_user_name, searchQuery) ||
    safeStringSearch(conv.service_title, searchQuery) ||
    safeStringSearch(conv.latest_message, searchQuery)
  );
};

interface Conversation {
  order_id: number;
  latest_message: string;
  latest_message_type: string;
  latest_message_time: string;
  sender_name: string;
  unread_count: number;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string;
  service_title: string;
  order_status: string;
}

const STATUS_LABELS = {
  'en_attente': 'En attente',
  'acceptee': 'Acceptée',
  'en_cours': 'En cours',
  'terminee': 'Terminée',
  'annulee': 'Annulée'
};

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('en_cours'); 
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        loadConversations();
        subscribeToMessages();
      }
    }, [currentUser])
  );

  // 🔍 FILTRAGE SÉCURISÉ - Utilisation des helpers protégés
  useEffect(() => {
    let filtered = conversations;

    // Filtrer par statut 
    if (filterStatus !== 'all') {
      filtered = filtered.filter(conv => conv.order_status === filterStatus);
    }

    // 🔒 FILTRAGE SÉCURISÉ PAR RECHERCHE
    filtered = filterConversations(filtered, searchQuery);

    setFilteredConversations(filtered);
  }, [conversations, filterStatus, searchQuery]);

  const loadConversations = async () => {
    if (!currentUser) return;

    try {
      console.log('📊 Chargement des conversations...');

      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          message,
          created_at,
          sender_id,
          order_id,
          read_at,
          message_type,
          orders (
            id,
            status,
            client_id,
            fourmiz_id,
            services (
              title,
              categorie
            ),
            client_profile:profiles!client_id (
              firstname,
              lastname,
              avatar_url
            ),
            fourmiz_profile:profiles!fourmiz_id (
              firstname,
              lastname,
              avatar_url
            )
          )
        `)
        .not('orders', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('❌ Erreur chargement messages:', error);
        throw error;
      }

      console.log('✅ Messages chargés:', messagesData?.length || 0);

      const userMessages = messagesData?.filter(message => {
        const order = message.orders;
        return order && (
          order.client_id === currentUser.id || 
          order.fourmiz_id === currentUser.id ||
          message.sender_id === currentUser.id
        );
      }) || [];

      console.log('👤 Messages filtrés pour utilisateur:', userMessages.length);

      // Grouper les messages par conversation (order_id)
      const conversationsMap = new Map();
      
      userMessages.forEach(message => {
        const orderId = message.order_id;
        const order = message.orders;
        
        if (!conversationsMap.has(orderId) && order) {
          const isCurrentUserClient = order.client_id === currentUser.id;
          const otherUser = isCurrentUserClient ? 
            order.fourmiz_profile : 
            order.client_profile;

          // Déterminer le destinataire du message (l'autre participant)
          let otherUserId: string;
          if (order.client_id === currentUser.id) {
            otherUserId = order.fourmiz_id;
          } else {
            otherUserId = order.client_id;
          }

          conversationsMap.set(orderId, {
            order_id: orderId,
            order_status: safeString(order.status) || 'unknown',
            latest_message: safeString(message.message),
            latest_message_type: safeString(message.message_type) || 'text',
            latest_message_time: message.created_at,
            unread_count: 0,
            other_user_id: otherUserId,
            other_user_name: `${safeString(otherUser?.firstname)} ${safeString(otherUser?.lastname)}`.trim() || 'Utilisateur',
            other_user_avatar: safeString(otherUser?.avatar_url),
            service_title: safeString(order.services?.title) || 'Service',
            sender_name: ''
          });
        }
        
        // Un message est "reçu" si l'utilisateur actuel n'est PAS l'expéditeur
        if (!message.read_at && message.sender_id !== currentUser.id) {
          const conv = conversationsMap.get(orderId);
          if (conv) {
            conv.unread_count += 1;
          }
        }
      });

      const conversations = Array.from(conversationsMap.values());
      setConversations(conversations);

      // Calculer le total des messages non lus
      const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
      setTotalUnread(totalUnread);
      console.log('📬 Messages non lus:', totalUnread);

    } catch (error: any) {
      console.error('⚠️ Erreur fatale:', error);
      Alert.alert('Erreur', `Impossible de charger les conversations: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const subscribeToMessages = () => {
    // Écouter les nouveaux messages en temps réel
    const subscription = supabase
      .channel('conversations_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          console.log('📨 Nouveau message reçu:', payload);
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          if (payload.new.read_at && !payload.old.read_at) {
            loadConversations();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations();
  }, [currentUser]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}min`;
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  const formatLastMessage = (message: string, type: string) => {
    if (type === 'image') return '📷 Image';
    if (type === 'location') return '📍 Position';
    if (type === 'system') return '🔔 ' + message;
    
    // 🔒 TRONCATURE SÉCURISÉE
    const safeMessage = safeString(message);
    return safeMessage.length > 50 ? safeMessage.substring(0, 50) + '...' : safeMessage;
  };

  // 🎯 FILTRE UNIQUEMENT "EN COURS" - Suppression des terminées
  const renderFilterButtons = () => {
    const statuses = [
      { key: 'en_cours', label: 'En cours', count: conversations.filter(c => c.order_status === 'en_cours').length },
    ].filter(status => status.count > 0);

    if (statuses.length === 0) return null;

    return (
      <View style={styles.filterSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {statuses.map((status) => (
            <TouchableOpacity
              key={status.key}
              style={[
                styles.filterButton,
                filterStatus === status.key && styles.filterButtonActive
              ]}
              onPress={() => setFilterStatus(status.key)}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === status.key && styles.filterButtonTextActive
              ]}>
                {status.label} ({status.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderConversationCard = (conversation: Conversation) => {
    const hasUnread = conversation.unread_count > 0;

    return (
      <TouchableOpacity
        key={conversation.order_id}
        style={[
          styles.conversationCard,
          hasUnread && styles.conversationCardUnread
        ]}
        onPress={() => {
          console.log('🔍 Clic sur conversation:', {
            order_id: conversation.order_id,
            type_order_id: typeof conversation.order_id,
            other_user_name: conversation.other_user_name,
            service_title: conversation.service_title,
            conversation_complete: conversation
          });
          
          if (!conversation.order_id) {
            console.error('❌ order_id manquant!');
            Alert.alert('Erreur', 'ID de commande manquant pour cette conversation');
            return;
          }
          
          try {
            const chatPath = `/chat/${conversation.order_id}`;
            console.log('🚀 Tentative navigation vers:', chatPath);
            
            router.push(chatPath);
            console.log('✅ Navigation lancée avec succès');
            
          } catch (error) {
            console.error('❌ Erreur navigation:', error);
            Alert.alert('Erreur Navigation', `Impossible d'ouvrir le chat: ${error.message}`);
          }
        }}
      >
        <View style={styles.conversationHeader}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {conversation.other_user_avatar ? (
              <Image 
                source={{ uri: conversation.other_user_avatar }} 
                style={styles.avatar} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={20} color="#666666" />
              </View>
            )}
            {hasUnread && <View style={styles.unreadDot} />}
          </View>

          {/* Info utilisateur et service */}
          <View style={styles.conversationInfo}>
            <View style={styles.conversationTop}>
              <Text style={[
                styles.userName,
                hasUnread && styles.userNameUnread
              ]}>
                {conversation.other_user_name}
              </Text>
              <Text style={styles.timeStamp}>
                {formatTime(conversation.latest_message_time)}
              </Text>
            </View>

            <View style={styles.serviceRow}>
              <Text style={styles.serviceTitle} numberOfLines={1}>
                {conversation.service_title}
              </Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {STATUS_LABELS[conversation.order_status as keyof typeof STATUS_LABELS]}
                </Text>
              </View>
            </View>

            <View style={styles.messageRow}>
              <Text style={[
                styles.lastMessage,
                hasUnread && styles.lastMessageUnread
              ]} numberOfLines={2}>
                {formatLastMessage(conversation.latest_message, conversation.latest_message_type)}
              </Text>
              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>
                    {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={48} color="#cccccc" />
      <Text style={styles.emptyTitle}>Aucune conversation</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || filterStatus !== 'all' 
          ? 'Aucune conversation ne correspond à vos critères'
          : 'Vous n\'avez pas encore de conversations.\nVos échanges avec les fourmiz apparaîtront ici.'
        }
      </Text>
      {(searchQuery || filterStatus !== 'all') && (
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={() => {
            setSearchQuery('');
            setFilterStatus('en_cours');
          }}
        >
          <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={16} color="#666666" />
      <TextInput 
        style={styles.searchInput}
        placeholder="Rechercher une conversation..."
        placeholderTextColor="#666666"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')}>
          <Ionicons name="close-circle" size={16} color="#666666" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement des conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Barre de recherche avec espacement ajusté */}
        {conversations.length > 0 && (
          <View style={styles.searchSection}>
            {renderSearchBar()}
          </View>
        )}

        {/* Filtres */}
        {conversations.length > 0 && renderFilterButtons()}

        {/* Liste des conversations */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#000000']}
              tintColor="#000000"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredConversations.length > 0 ? (
            <View style={styles.conversationsList}>
              {filteredConversations.map(renderConversationCard)}
            </View>
          ) : (
            renderEmptyState()
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// 🎨 STYLES ÉPURÉS COHÉRENTS AVEC SERVICES.TSX - HEADER SUPPRIMÉ
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },
  content: { 
    flex: 1 
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  loadingText: { 
    fontSize: 13, 
    color: '#333333',
    fontWeight: '400',
  },

  // Recherche épurée avec espacement ajusté
  searchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 20,                // ✅ Augmenté de 16 à 20 pour compenser l'absence de header
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
  },

  // Filtres épurés
  filterSection: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  filterButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },

  // Liste épurée
  scrollView: { 
    flex: 1 
  },
  conversationsList: {
    padding: 24,
    gap: 16,
  },

  // Carte de conversation épurée
  conversationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  conversationCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
    backgroundColor: '#fafafa',
  },

  conversationHeader: {
    flexDirection: 'row',
    gap: 12,
  },

  // Avatar épuré
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  // Info conversation épurée
  conversationInfo: {
    flex: 1,
    gap: 6,
  },
  conversationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  userNameUnread: {
    fontWeight: '600',
  },
  timeStamp: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },

  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceTitle: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f8f8f8',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#666666',
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  lastMessage: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    flex: 1,
    fontWeight: '400',
  },
  lastMessageUnread: {
    color: '#333333',
    fontWeight: '400',
  },
  unreadBadge: {
    backgroundColor: '#000000',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },

  // État vide épuré
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontWeight: '400',
  },
  resetButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  resetButtonText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },

  bottomSpacer: { 
    height: 32 
  },
});
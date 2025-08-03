// app/(tabs)/messages.tsx - VERSION SÉCURISÉE
// ✅ Protection complète contre les erreurs .includes()
// 🚀 CONVERSATIONS SÉCURISÉES : Recherche et filtrage protégés

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

// 🛡️ HELPERS DE SÉCURITÉ POUR LES STRINGS
const safeString = (value: any): string => {
  return value?.toString() || '';
};

const safeStringSearch = (text: any, query: string): boolean => {
  const safeText = safeString(text);
  return safeText.toLowerCase().includes(query.toLowerCase());
};

// 🛡️ HELPER POUR FILTRAGE SÉCURISÉ
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

const STATUS_COLORS = {
  'en_attente': '#fbbf24',
  'acceptee': '#10b981',
  'en_cours': '#3b82f6',
  'terminee': '#8b5cf6',
  'annulee': '#ef4444'
};

const STATUS_LABELS = {
  'en_attente': '⏳ En attente',
  'acceptee': '✅ Acceptée',
  'en_cours': '🚀 En cours',
  'terminee': '🎉 Terminée',
  'annulee': '❌ Annulée'
};

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
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

  // 🛡️ FILTRAGE SÉCURISÉ - Utilisation des helpers protégés
  useEffect(() => {
    let filtered = conversations;

    // Filtrer par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(conv => conv.order_status === filterStatus);
    }

    // 🛡️ FILTRAGE SÉCURISÉ PAR RECHERCHE
    filtered = filterConversations(filtered, searchQuery);

    setFilteredConversations(filtered);
  }, [conversations, filterStatus, searchQuery]);

  // ✅ FONCTION CORRIGÉE avec vraie structure de votre DB
  const loadConversations = async () => {
    if (!currentUser) return;

    try {
      console.log('💬 Chargement des conversations...');

      // ✅ Requête corrigée avec les bonnes colonnes
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

      // ✅ Filtrer les messages où l'utilisateur actuel participe
      const userMessages = messagesData?.filter(message => {
        const order = message.orders;
        return order && (
          order.client_id === currentUser.id || 
          order.fourmiz_id === currentUser.id ||
          message.sender_id === currentUser.id
        );
      }) || [];

      console.log('📋 Messages filtrés pour utilisateur:', userMessages.length);

      // Grouper les messages par conversation (order_id)
      const conversationsMap = new Map();
      
      userMessages.forEach(message => {
        const orderId = message.order_id;
        const order = message.orders;
        
        if (!conversationsMap.has(orderId) && order) {
          // ✅ Déterminer l'autre utilisateur selon la logique de votre DB
          const isCurrentUserClient = order.client_id === currentUser.id;
          const otherUser = isCurrentUserClient ? 
            order.fourmiz_profile : 
            order.client_profile;

          // Déterminer le destinataire du message (l'autre participant)
          let otherUserId: string;
          if (order.client_id === currentUser.id) {
            otherUserId = order.fourmiz_id; // L'utilisateur actuel est client, l'autre est fourmiz
          } else {
            otherUserId = order.client_id; // L'utilisateur actuel est fourmiz, l'autre est client
          }

          // 🛡️ CONSTRUCTION SÉCURISÉE DES DONNÉES DE CONVERSATION
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
        
        // ✅ Compter les messages non lus (reçus par l'utilisateur actuel)
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
      console.error('💥 Erreur fatale:', error);
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
          loadConversations(); // Recharger les conversations
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
          // Rafraîchir si un message est marqué comme lu
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
    
    // 🛡️ TRONCATURE SÉCURISÉE
    const safeMessage = safeString(message);
    return safeMessage.length > 50 ? safeMessage.substring(0, 50) + '...' : safeMessage;
  };

  const renderFilterButtons = () => {
    const statuses = [
      { key: 'all', label: '📋 Toutes', count: conversations.length },
      { key: 'en_cours', label: '🚀 En cours', count: conversations.filter(c => c.order_status === 'en_cours').length },
      { key: 'acceptee', label: '✅ Acceptées', count: conversations.filter(c => c.order_status === 'acceptee').length },
      { key: 'terminee', label: '🎉 Terminées', count: conversations.filter(c => c.order_status === 'terminee').length },
    ].filter(status => status.count > 0);

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
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
    );
  };

  const renderConversationCard = (conversation: Conversation) => {
    const hasUnread = conversation.unread_count > 0;
    const statusColor = STATUS_COLORS[conversation.order_status as keyof typeof STATUS_COLORS];

    return (
      <TouchableOpacity
        key={conversation.order_id}
        style={[
          styles.conversationCard,
          hasUnread && styles.conversationCardUnread
        ]}
        onPress={() => router.push(`/chat/${conversation.order_id}`)}
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
                <Ionicons name="person" size={24} color="#6b7280" />
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
              <View style={[
                styles.statusBadge,
                { backgroundColor: statusColor + '20' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: statusColor }
                ]}>
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

        {/* Actions rapides */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/orders/${conversation.order_id}`);
            }}
          >
            <Ionicons name="document-text" size={16} color="#3b82f6" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert('Appel', 'Fonction d\'appel en cours de développement');
            }}
          >
            <Ionicons name="call" size={16} color="#10b981" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
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
            setFilterStatus('all');
          }}
        >
          <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color="#6b7280" />
      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher une conversation..."
        placeholderTextColor="#6b7280"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')}>
          <Ionicons name="close-circle" size={20} color="#6b7280" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Messages' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Chargement des conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Messages',
          headerRight: () => (
            <View style={styles.headerActions}>
              {totalUnread > 0 && (
                <View style={styles.headerUnreadBadge}>
                  <Text style={styles.headerUnreadText}>
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Text>
                </View>
              )}
            </View>
          ),
        }} 
      />

      <View style={styles.content}>
        {/* Barre de recherche */}
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
              colors={['#3b82f6']}
              tintColor="#3b82f6"
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1 },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { fontSize: 16, color: '#6b7280' },

  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerUnreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  headerUnreadText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },

  // Recherche
  searchSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },

  // Filtres
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Liste
  scrollView: { flex: 1 },
  conversationsList: {
    padding: 16,
    gap: 12,
  },

  // Carte de conversation
  conversationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  conversationCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    backgroundColor: '#fefeff',
  },

  conversationHeader: {
    flexDirection: 'row',
    gap: 12,
  },

  // Avatar
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Info conversation
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
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  userNameUnread: {
    color: '#111827',
    fontWeight: 'bold',
  },
  timeStamp: {
    fontSize: 12,
    color: '#6b7280',
  },

  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceTitle: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    flex: 1,
  },
  lastMessageUnread: {
    color: '#374151',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },

  // Actions rapides
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  quickActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // État vide
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  resetButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },

  bottomSpacer: { height: 32 },
});
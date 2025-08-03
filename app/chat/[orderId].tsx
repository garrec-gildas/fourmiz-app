// app/chat/[orderId].tsx - Chat entre client et fourmiz
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: number;
  order_id: number;
  sender_id: string;
  message: string;
  message_type: 'text' | 'image' | 'location' | 'system';
  created_at: string;
  read_at: string | null;
  metadata?: any;
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
  };
}

const MESSAGE_TYPES = {
  text: { icon: 'chatbubble', color: '#3b82f6' },
  image: { icon: 'image', color: '#10b981' },
  location: { icon: 'location', color: '#f59e0b' },
  system: { icon: 'information-circle', color: '#6b7280' }
};

export default function ChatScreen() {
  const { orderId } = useLocalSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  // Charger l'utilisateur
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  // Charger les données initiales
  useEffect(() => {
    if (currentUser && orderId) {
      loadOrderInfo();
      loadMessages();
      subscribeToMessages();
      subscribeToTyping();
    }
  }, [currentUser, orderId]);

  // Marquer les messages comme lus au focus
  useFocusEffect(
    useCallback(() => {
      if (currentUser && orderId) {
        markMessagesAsRead();
      }
    }, [currentUser, orderId])
  );

  // Auto-scroll vers le bas
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadOrderInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          services (title, categorie),
          client_profile:profiles!client_id (
            first_name, last_name, avatar_url, phone
          ),
          fourmiz_profile:profiles!fourmiz_id (
            first_name, last_name, avatar_url, phone, rating
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      // Vérifier que l'utilisateur fait partie de cette commande
      if (data.client_id !== currentUser.id && data.fourmiz_id !== currentUser.id) {
        Alert.alert('Erreur', 'Vous n\'avez pas accès à cette conversation');
        router.back();
        return;
      }

      setOrder(data);
    } catch (error) {
      console.error('❌ Erreur chargement commande:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations');
      router.back();
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('❌ Erreur chargement messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
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
          if (newMessage.sender_id !== currentUser.id) {
            markMessageAsRead(newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const subscribeToTyping = () => {
    const subscription = supabase
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

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);
    setIsTyping(false);

    // Notifier qu'on ne tape plus
    supabase.channel(`typing_${orderId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUser.id, is_typing: false }
    });

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

      // Notification push (à implémenter)
      // await sendPushNotification(otherUserId, messageText);

    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
      setNewMessage(messageText); // Restaurer le message
    } finally {
      setSending(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .neq('sender_id', currentUser.id)
        .is('read_at', null);
    } catch (error) {
      console.error('❌ Erreur marquage lu:', error);
    }
  };

  const markMessageAsRead = async (messageId: number) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);
    } catch (error) {
      console.error('❌ Erreur marquage message lu:', error);
    }
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      supabase.channel(`typing_${orderId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: currentUser.id, is_typing: true }
      });
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false);
      supabase.channel(`typing_${orderId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: currentUser.id, is_typing: false }
      });
    }
  };

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
              // TODO: Obtenir la position GPS réelle
              const mockLocation = {
                latitude: 48.5734,
                longitude: 7.7521,
                address: 'Strasbourg, France'
              };

              await supabase
                .from('chat_messages')
                .insert({
                  order_id: parseInt(orderId as string),
                  sender_id: currentUser.id,
                  message: `Position partagée: ${mockLocation.address}`,
                  message_type: 'location',
                  metadata: mockLocation,
                  created_at: new Date().toISOString()
                });
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de partager la position');
            }
          }
        }
      ]
    );
  };

  const callOtherUser = () => {
    const otherUser = currentUser.id === order?.client_id 
      ? order?.fourmiz_profile 
      : order?.client_profile;
    
    if (otherUser?.phone) {
      Linking.openURL(`tel:${otherUser.phone}`);
    } else {
      Alert.alert('Erreur', 'Numéro de téléphone non disponible');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

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
              <Ionicons name="information-circle" size={16} color="#6b7280" />
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
                    if (message.metadata) {
                      const { latitude, longitude } = message.metadata;
                      Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`);
                    }
                  }}
                >
                  <Ionicons name="location" size={20} color="#f59e0b" />
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
                    name={message.read_at ? "checkmark-done" : "checkmark"} 
                    size={14} 
                    color={message.read_at ? "#10b981" : "#6b7280"} 
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderOrderInfo = () => {
    if (!order) return null;

    const otherUser = currentUser.id === order.client_id 
      ? order.fourmiz_profile 
      : order.client_profile;

    return (
      <View style={styles.orderInfoCard}>
        <View style={styles.orderInfoHeader}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceTitle}>{order.services.title}</Text>
            <Text style={styles.serviceCategory}>{order.services.categorie}</Text>
          </View>
          <Text style={styles.orderAmount}>{order.proposed_amount}€</Text>
        </View>
        
        <View style={styles.orderInfoDetails}>
          <View style={styles.orderInfoRow}>
            <Ionicons name="calendar" size={16} color="#6b7280" />
            <Text style={styles.orderInfoText}>
              {new Date(order.date).toLocaleDateString('fr-FR')}
              {order.start_time && ` à ${order.start_time.slice(0, 5)}`}
            </Text>
          </View>
          
          <View style={styles.orderInfoRow}>
            <Ionicons name="location" size={16} color="#6b7280" />
            <Text style={styles.orderInfoText} numberOfLines={2}>
              {order.address}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderChatHeader = () => {
    if (!order) return null;

    const otherUser = currentUser.id === order.client_id 
      ? order.fourmiz_profile 
      : order.client_profile;

    const userRole = currentUser.id === order.client_id ? 'Client' : 'Fourmiz';
    const otherRole = currentUser.id === order.client_id ? 'Fourmiz' : 'Client';

    return (
      <TouchableOpacity 
        style={styles.chatHeader}
        onPress={() => router.push(`/orders/${order.id}`)}
      >
        {otherUser?.avatar_url ? (
          <Image source={{ uri: otherUser.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color="#6b7280" />
          </View>
        )}
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : 'Utilisateur'}
          </Text>
          <Text style={styles.headerRole}>{otherRole}</Text>
          {otherUserTyping && (
            <Text style={styles.typingIndicator}>en train d'écrire...</Text>
          )}
        </View>

        <TouchableOpacity style={styles.callButton} onPress={callOtherUser}>
          <Ionicons name="call" size={20} color="#10b981" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Chat' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Chargement du chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <TouchableOpacity style={styles.actionButton} onPress={sendLocation}>
            <Ionicons name="location" size={24} color="#6b7280" />
          </TouchableOpacity>
          
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            placeholder="Tapez votre message..."
            placeholderTextColor="#6b7280"
            value={newMessage}
            onChangeText={handleTyping}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  keyboardAvoid: { flex: 1 },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { fontSize: 16, color: '#6b7280' },

  // Header du chat
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  headerRole: { fontSize: 14, color: '#6b7280' },
  typingIndicator: { fontSize: 12, color: '#3b82f6', fontStyle: 'italic' },
  callButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
  },

  // Info commande
  orderInfoCard: {
    backgroundColor: '#fff',
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
  serviceInfo: { flex: 1 },
  serviceTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  serviceCategory: { fontSize: 14, color: '#3b82f6', marginTop: 2 },
  orderAmount: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  orderInfoDetails: { gap: 8 },
  orderInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderInfoText: { fontSize: 14, color: '#6b7280', flex: 1 },

  // Messages
  messagesContainer: { flex: 1 },
  messagesContent: { paddingBottom: 16 },
  
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  messageContainer: { marginHorizontal: 16, marginVertical: 2 },
  myMessageContainer: { alignItems: 'flex-end' },
  otherMessageContainer: { alignItems: 'flex-start' },
  
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  messageText: { fontSize: 16, lineHeight: 22 },
  myMessageText: { color: '#fff' },
  otherMessageText: { color: '#111827' },

  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: { fontSize: 12 },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },
  otherMessageTime: { color: '#6b7280' },

  // Messages système
  systemMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    marginVertical: 8,
  },
  systemMessageText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },

  // Messages de localisation
  locationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: { fontSize: 16, color: '#f59e0b', textDecorationLine: 'underline' },

  // Indicateur de frappe
  typingContainer: {
    marginHorizontal: 16,
    marginVertical: 2,
    alignItems: 'flex-start',
  },
  typingBubble: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  typingDots: { flexDirection: 'row', gap: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6b7280',
  },
  dot1: { animationDelay: '0s' },
  dot2: { animationDelay: '0.2s' },
  dot3: { animationDelay: '0.4s' },

  // Zone de saisie
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
});
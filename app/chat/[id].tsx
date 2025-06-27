import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Paperclip, Camera, MapPin, Phone, MoveVertical as MoreVertical, Star, Clock, CircleCheck as CheckCircle, Circle as Check, Eye, Info } from 'lucide-react-native';

// Types pour les messages
interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'location' | 'system';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  imageUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

// Mock data pour la conversation
const mockConversation = {
  id: '1',
  orderId: 'ORD-001',
  serviceName: 'Livraison de courses Drive',
  participants: [
    {
      id: 'client-1',
      name: 'Jean Dupont',
      type: 'client',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      isOnline: true,
      lastSeen: new Date(),
    },
    {
      id: 'fourmiz-1',
      name: 'Marie Dubois',
      type: 'fourmiz',
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      isOnline: true,
      lastSeen: new Date(),
      rating: 4.8,
      completedMissions: 127,
    }
  ],
  messages: [
    {
      id: '1',
      senderId: 'fourmiz-1',
      senderName: 'Marie Dubois',
      content: 'Bonjour ! J\'ai bien reçu votre demande de livraison de courses. Je peux m\'en occuper cet après-midi.',
      timestamp: new Date('2024-12-20T10:30:00'),
      type: 'text',
      status: 'read',
    },
    {
      id: '2',
      senderId: 'client-1',
      senderName: 'Jean Dupont',
      content: 'Parfait ! À quelle heure pourriez-vous récupérer les courses ?',
      timestamp: new Date('2024-12-20T10:32:00'),
      type: 'text',
      status: 'read',
    },
    {
      id: '3',
      senderId: 'fourmiz-1',
      senderName: 'Marie Dubois',
      content: 'Je peux passer au drive vers 14h30. Cela vous convient-il ?',
      timestamp: new Date('2024-12-20T10:35:00'),
      type: 'text',
      status: 'read',
    },
    {
      id: '4',
      senderId: 'client-1',
      senderName: 'Jean Dupont',
      content: 'Oui c\'est parfait ! Voici l\'adresse exacte pour la livraison :',
      timestamp: new Date('2024-12-20T10:36:00'),
      type: 'text',
      status: 'read',
    },
    {
      id: '5',
      senderId: 'client-1',
      senderName: 'Jean Dupont',
      content: '',
      timestamp: new Date('2024-12-20T10:37:00'),
      type: 'location',
      status: 'read',
      location: {
        latitude: 48.8566,
        longitude: 2.3522,
        address: '15 rue de la Paix, 75001 Paris'
      }
    },
    {
      id: '6',
      senderId: 'fourmiz-1',
      senderName: 'Marie Dubois',
      content: 'Parfait, j\'ai bien noté l\'adresse. Je vous enverrai une photo quand j\'aurai récupéré les courses.',
      timestamp: new Date('2024-12-20T10:40:00'),
      type: 'text',
      status: 'read',
    },
    {
      id: '7',
      senderId: 'system',
      senderName: 'Système',
      content: 'Marie a accepté votre mission. Le paiement de 12,50€ a été pré-autorisé.',
      timestamp: new Date('2024-12-20T10:45:00'),
      type: 'system',
      status: 'delivered',
    },
    {
      id: '8',
      senderId: 'fourmiz-1',
      senderName: 'Marie Dubois',
      content: 'Je suis arrivée au drive Carrefour ! Je récupère vos courses maintenant 🛒',
      timestamp: new Date('2024-12-20T14:32:00'),
      type: 'text',
      status: 'read',
    },
    {
      id: '9',
      senderId: 'fourmiz-1',
      senderName: 'Marie Dubois',
      content: '',
      timestamp: new Date('2024-12-20T14:45:00'),
      type: 'image',
      status: 'delivered',
      imageUrl: 'https://images.pexels.com/photos/1005638/pexels-photo-1005638.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop'
    },
    {
      id: '10',
      senderId: 'fourmiz-1',
      senderName: 'Marie Dubois',
      content: 'Courses récupérées ! Je suis en route vers chez vous. Arrivée prévue dans 15 minutes.',
      timestamp: new Date('2024-12-20T14:46:00'),
      type: 'text',
      status: 'sent',
    },
  ] as Message[]
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>(mockConversation.messages);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Simuler l'utilisateur actuel (ici le client)
  const currentUserId = 'client-1';
  const otherParticipant = mockConversation.participants.find(p => p.id !== currentUserId);

  useEffect(() => {
    // Faire défiler vers le bas au chargement
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendMessage = () => {
    if (newMessage.trim() === '') return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: currentUserId,
      senderName: 'Jean Dupont',
      content: newMessage.trim(),
      timestamp: new Date(),
      type: 'text',
      status: 'sending',
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simuler l'envoi
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );
    }, 1000);

    // Faire défiler vers le bas
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleAttachment = () => {
    Alert.alert(
      'Ajouter un fichier',
      'Que souhaitez-vous envoyer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Photo', onPress: () => handlePhotoAttachment() },
        { text: 'Position', onPress: () => handleLocationAttachment() },
      ]
    );
  };

  const handlePhotoAttachment = () => {
    Alert.alert('Photo', 'Fonctionnalité photo disponible dans la version mobile');
  };

  const handleLocationAttachment = () => {
    const locationMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUserId,
      senderName: 'Jean Dupont',
      content: '',
      timestamp: new Date(),
      type: 'location',
      status: 'sending',
      location: {
        latitude: 48.8566,
        longitude: 2.3522,
        address: 'Ma position actuelle'
      }
    };

    setMessages(prev => [...prev, locationMessage]);
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleCall = () => {
    Alert.alert(
      'Appeler',
      `Voulez-vous appeler ${otherParticipant?.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appeler', onPress: () => console.log('Calling...') }
      ]
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  };

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <Clock size={12} color="#999" />;
      case 'sent':
        return <Check size={12} color="#999" />;
      case 'delivered':
        return <CheckCircle size={12} color="#999" />;
      case 'read':
        return <CheckCircle size={12} color="#4CAF50" />;
      default:
        return null;
    }
  };

  const renderMessage = ({ item: message, index }: { item: Message, index: number }) => {
    const isOwnMessage = message.senderId === currentUserId;
    const isSystemMessage = message.type === 'system';
    const showDate = index === 0 || 
      formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);

    return (
      <View>
        {/* Date separator */}
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(message.timestamp)}</Text>
          </View>
        )}

        {/* System message */}
        {isSystemMessage ? (
          <View style={styles.systemMessage}>
            <Info size={16} color="#666" />
            <Text style={styles.systemMessageText}>{message.content}</Text>
          </View>
        ) : (
          /* Regular message */
          <View style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
          ]}>
            {/* Avatar for other's messages */}
            {!isOwnMessage && (
              <Image 
                source={{ uri: otherParticipant?.avatar }} 
                style={styles.messageAvatar}
              />
            )}

            <View style={[
              styles.messageBubble,
              isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
            ]}>
              {/* Message content based on type */}
              {message.type === 'text' && (
                <Text style={[
                  styles.messageText,
                  isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                ]}>
                  {message.content}
                </Text>
              )}

              {message.type === 'image' && (
                <View style={styles.imageMessage}>
                  <Image 
                    source={{ uri: message.imageUrl }} 
                    style={styles.messageImage}
                  />
                  <Text style={[
                    styles.messageText,
                    isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                  ]}>
                    📷 Photo
                  </Text>
                </View>
              )}

              {message.type === 'location' && (
                <View style={styles.locationMessage}>
                  <MapPin size={20} color={isOwnMessage ? '#FFFFFF' : '#FF4444'} />
                  <Text style={[
                    styles.messageText,
                    isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                  ]}>
                    📍 {message.location?.address}
                  </Text>
                </View>
              )}

              {/* Message metadata */}
              <View style={styles.messageMetadata}>
                <Text style={[
                  styles.messageTime,
                  isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
                ]}>
                  {formatTime(message.timestamp)}
                </Text>
                {isOwnMessage && (
                  <View style={styles.messageStatus}>
                    {getStatusIcon(message.status)}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Image 
            source={{ uri: otherParticipant?.avatar }} 
            style={styles.headerAvatar}
          />
          <View style={styles.headerDetails}>
            <Text style={styles.headerName}>{otherParticipant?.name}</Text>
            <View style={styles.headerMeta}>
              {otherParticipant?.type === 'fourmiz' && (
                <>
                  <Star size={12} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.headerRating}>{otherParticipant.rating}</Text>
                  <Text style={styles.headerSeparator}>•</Text>
                </>
              )}
              <View style={[
                styles.onlineIndicator,
                otherParticipant?.isOnline ? styles.online : styles.offline
              ]} />
              <Text style={styles.headerStatus}>
                {otherParticipant?.isOnline ? 'En ligne' : 'Hors ligne'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleCall}>
            <Phone size={24} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MoreVertical size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Service Info */}
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceTitle}>Mission : {mockConversation.serviceName}</Text>
        <TouchableOpacity 
          style={styles.viewOrderButton}
          onPress={() => router.push(`/order/${mockConversation.orderId}`)}
        >
          <Eye size={16} color="#FF4444" />
          <Text style={styles.viewOrderText}>Voir la commande</Text>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>{otherParticipant?.name} est en train d'écrire...</Text>
        </View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachButton} onPress={handleAttachment}>
            <Paperclip size={24} color="#666" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Tapez votre message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              newMessage.trim() ? styles.sendButtonActive : styles.sendButtonInactive
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Send size={20} color={newMessage.trim() ? "#FFFFFF" : "#999"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerDetails: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRating: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginLeft: 2,
  },
  headerSeparator: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 6,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#999',
  },
  headerStatus: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  serviceInfo: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  serviceTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#F57C00',
    flex: 1,
  },
  viewOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewOrderText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FF4444',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#999',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  systemMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    gap: 8,
  },
  systemMessageText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    textAlign: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
    position: 'relative',
  },
  ownMessageBubble: {
    backgroundColor: '#FF4444',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#333',
  },
  imageMessage: {
    gap: 8,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  locationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherMessageTime: {
    color: '#999',
  },
  messageStatus: {
    marginLeft: 4,
  },
  typingIndicator: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  typingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  attachButton: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#FF4444',
  },
  sendButtonInactive: {
    backgroundColor: '#F0F0F0',
  },
});
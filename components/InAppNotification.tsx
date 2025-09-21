// components/InAppNotification.tsx - Notifications flottantes dans l'app (SANS DÉPENDANCES)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useChatNotifications } from '@/components/ChatNotificationProvider';

const { width } = Dimensions.get('window');

// 📱 Calcul des safe areas sans dépendance externe
const getStatusBarHeight = () => {
  if (Platform.OS === 'ios') {
    return 44; // Safe area par défaut iOS
  } else {
    return StatusBar.currentHeight || 24;
  }
};

export const InAppNotification: React.FC = () => {
  const { currentNotification, hideInAppNotification } = useChatNotifications();
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (currentNotification) {
      // Animer l'entrée
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [currentNotification, slideAnim]);

  const handlePress = () => {
    hideInAppNotification();
    if (currentNotification?.orderId) {
      router.push(`/chat/${currentNotification.orderId}`);
    }
  };

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      hideInAppNotification();
    });
  };

  const formatNotificationTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
    
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'chat_message': return 'chatbubble';
      case 'order_update': return 'document-text';
      case 'system': return 'information-circle';
      default: return 'notifications';
    }
  };

  if (!currentNotification) return null;

  return (
    <Animated.View 
      style={[
        styles.notificationContainer,
        {
          top: getStatusBarHeight() + 10, // 📱 Safe area calculée manuellement 
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.notification}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {currentNotification.senderAvatar ? (
            <Image 
              source={{ uri: currentNotification.senderAvatar }} 
              style={styles.avatar} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#6b7280" />
            </View>
          )}
          <View style={styles.onlineIndicator} />
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {currentNotification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {currentNotification.message}
          </Text>
          <Text style={styles.time}>
            {formatNotificationTime(currentNotification.timestamp)}
          </Text>
        </View>

        {/* Type d'icône */}
        <View style={styles.typeIndicator}>
          <Ionicons 
            name={getNotificationIcon(currentNotification.type)} 
            size={16} 
            color="#3b82f6" 
          />
        </View>

        {/* Bouton fermer */}
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="close" size={18} color="#6b7280" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  notificationContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  notification: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  message: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  typeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
});

// 🔧 Hook pour utiliser les notifications depuis n'importe où
export const useInAppNotification = () => {
  const { showInAppNotification } = useChatNotifications();

  const showSuccess = (title: string, message: string) => {
    showInAppNotification({
      id: `success_${Date.now()}`,
      title,
      message,
      orderId: 0,
      senderName: 'Système',
      timestamp: new Date().toISOString(),
      type: 'system',
    });
  };

  const showError = (title: string, message: string) => {
    showInAppNotification({
      id: `error_${Date.now()}`,
      title,
      message,
      orderId: 0,
      senderName: 'Système',
      timestamp: new Date().toISOString(),
      type: 'system',
    });
  };

  const showChatMessage = (
    title: string,
    message: string,
    orderId: number,
    senderName: string,
    senderAvatar?: string
  ) => {
    showInAppNotification({
      id: `chat_${Date.now()}`,
      title,
      message,
      orderId,
      senderName,
      senderAvatar,
      timestamp: new Date().toISOString(),
      type: 'chat_message',
    });
  };

  return {
    showSuccess,
    showError,
    showChatMessage,
  };
};
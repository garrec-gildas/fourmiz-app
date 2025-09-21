// components/NotificationManager.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { 
  initializeNotifications, 
  getNotificationStatus, 
  sendTestNotification,
  forceRetryNotifications,
  cleanupNotifications
} from '../lib/notifications';

interface NotificationManagerProps {
  userId: string;
  isAuthenticated: boolean;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({ 
  userId, 
  isAuthenticated 
}) => {
  const [status, setStatus] = useState(getNotificationStatus());
  const [isLoading, setIsLoading] = useState(false);

  // Initialiser les notifications quand l'utilisateur se connecte
  useEffect(() => {
    if (isAuthenticated && userId) {
      console.log('🔔 Initialisation sécurisée des notifications pour:', userId);
      handleInitializeNotifications();
    } else if (!isAuthenticated) {
      // Nettoyer quand l'utilisateur se déconnecte
      cleanupNotifications();
    }
  }, [isAuthenticated, userId]);

  // Mettre à jour le statut périodiquement 
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getNotificationStatus());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleInitializeNotifications = async (): Promise<void> => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const success = await initializeNotifications(userId);
      if (success) {
        console.log('✅ Notifications initialisées avec succès');
      } else {
        console.log('❌ Échec initialisation notifications');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
    } finally {
      setIsLoading(false);
      setStatus(getNotificationStatus());
    }
  };

  const handleForceRetry = async (): Promise<void> => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const success = await forceRetryNotifications(userId);
      Alert.alert(
        'Retry Notifications',
        success ? 'Réinitialisation réussie !' : 'Échec de la réinitialisation'
      );
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la réinitialisation');
    } finally {
      setIsLoading(false);
      setStatus(getNotificationStatus());
    }
  };

  const handleTestNotification = async (): Promise<void> => {
    try {
      const success = await sendTestNotification();
      Alert.alert(
        'Test Notification',
        success ? 'Notification de test envoyée !' : 'Échec du test'
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la notification de test');
    }
  };

  const getStatusColor = (): string => {
    if (status.isInitialized && status.hasToken) return '#4CAF50'; // Vert 
    if (status.lastError) return '#F44336'; // Rouge
    return '#FF9800'; // Orange
  };

  const getStatusText = (): string => {
    if (status.isInitialized && status.hasToken) return 'Actives ✅';
    if (status.lastError) return `Erreur: ${status.lastError.code}`;
    return 'En attente...';
  };

  if (!isAuthenticated) {
    return null; // Ne pas afficher si pas connecté
  }

  return (
    <View style={{ padding: 16, backgroundColor: '#f5f5f5', margin: 16, borderRadius: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
        🔔 Notifications Push
      </Text>
      
      {/* Statut */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View 
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: getStatusColor(),
            marginRight: 8
          }} 
        />
        <Text style={{ fontSize: 16 }}>
          Statut: {getStatusText()}
        </Text>
      </View>

      {/* Détails */}
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
        Token: {status.hasToken ? '✅' : '❌'}
      </Text>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}
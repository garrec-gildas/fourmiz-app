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

  const handleInitializeNotifications = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const success = await initializeNotifications(userId);
      if (success) {
        console.log('✅ Notifications initialisées avec succès');
      } else {
        console.log('⚠️ Échec initialisation notifications');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
    } finally {
      setIsLoading(false);
      setStatus(getNotificationStatus());
    }
  };

  const handleForceRetry = async () => {
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

  const handleTestNotification = async () => {
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

  const getStatusColor = () => {
    if (status.isInitialized && status.hasToken) return '#4CAF50'; // Vert
    if (status.lastError) return '#F44336'; // Rouge
    return '#FF9800'; // Orange
  };

  const getStatusText = () => {
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
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
        Utilisateur: {status.userId || 'Non défini'}
      </Text>
      {status.retryCount > 0 && (
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
          Tentatives: {status.retryCount}/3
        </Text>
      )}

      {/* Erreur détaillée */}
      {status.lastError && (
        <View style={{ 
          backgroundColor: '#ffebee', 
          padding: 8, 
          borderRadius: 4, 
          marginTop: 8,
          marginBottom: 8 
        }}>
          <Text style={{ fontSize: 12, color: '#c62828' }}>
            Dernière erreur: {status.lastError.message}
          </Text>
          <Text style={{ fontSize: 10, color: '#999' }}>
            {new Date(status.lastError.timestamp).toLocaleString()}
          </Text>
        </View>
      )}

      {/* Boutons d'action */}
      <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#2196F3',
            padding: 8,
            borderRadius: 4,
            flex: 1,
            opacity: isLoading ? 0.5 : 1
          }}
          onPress={handleInitializeNotifications}
          disabled={isLoading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
            {isLoading ? 'Chargement...' : 'Réinitialiser'}
          </Text>
        </TouchableOpacity>

        {status.lastError && (
          <TouchableOpacity
            style={{
              backgroundColor: '#FF9800',
              padding: 8,
              borderRadius: 4,
              flex: 1,
              opacity: isLoading ? 0.5 : 1
            }}
            onPress={handleForceRetry}
            disabled={isLoading}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
              Force Retry
            </Text>
          </TouchableOpacity>
        )}

        {status.isInitialized && status.hasToken && (
          <TouchableOpacity
            style={{
              backgroundColor: '#4CAF50',
              padding: 8,
              borderRadius: 4,
              flex: 1
            }}
            onPress={handleTestNotification}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
              Test 🧪
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Hook personnalisé pour utiliser les notifications
export const useNotifications = (userId: string | null, isAuthenticated: boolean) => {
  const [status, setStatus] = useState(getNotificationStatus());

  useEffect(() => {
    if (isAuthenticated && userId) {
      initializeNotifications(userId);
    }
  }, [userId, isAuthenticated]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getNotificationStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return status;
};

export default NotificationManager;
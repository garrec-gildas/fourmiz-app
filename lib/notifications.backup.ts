// lib/notifications.ts - VERSION REACT NATIVE POWER FIX
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface NotificationToken {
  token: string;
  platform: string;
  device_id?: string;
  user_id: string;
}

class NotificationService {
  private appStateSubscription: any = null;
  private notificationSubscription: any = null;
  private responseSubscription: any = null;
  private currentUserId: string | null = null;

  /**
   * Initialisation complète des notifications
   */
  async initialize(userId: string): Promise<boolean> {
    try {
      console.log('🔔 Initialisation notifications pour:', userId);
      this.currentUserId = userId;

      // 1. Vérifier si device physique
      if (!Device.isDevice) {
        console.log('⚠️ Les notifications ne fonctionnent que sur un device physique');
        return false;
      }

      // 2. Demander les permissions
      const permissionGranted = await this.requestPermissions();
      if (!permissionGranted) {
        return false;
      }

      // 3. Récupérer et sauvegarder le token
      const tokenSaved = await this.getAndSaveToken(userId);
      if (!tokenSaved) {
        return false;
      }

      // 4. Configurer les listeners
      this.setupListeners();

      // 5. Gérer l'état de l'app
      this.setupAppStateListener();

      console.log('✅ Notifications initialisées avec succès');
      return true;

    } catch (error) {
      console.error('❌ Erreur initialisation notifications:', error);
      return false;
    }
  }

  /**
   * Demander les permissions de notifications
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permissions notifications refusées');
        return false;
      }

      console.log('✅ Permissions notifications accordées');
      return true;

    } catch (error) {
      console.error('❌ Erreur permissions notifications:', error);
      return false;
    }
  }

  /**
   * Récupérer le token Expo et le sauvegarder
   */
  private async getAndSaveToken(userId: string): Promise<boolean> {
    try {
      // Récupérer le token Expo
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id'
      });

      const token = tokenData.data;
      console.log('📱 Token Expo reçu:', token.substring(0, 20) + '...');

      // Préparer les données du token
      const notificationToken: NotificationToken = {
        token,
        platform: Platform.OS,
        device_id: await this.getDeviceId(),
        user_id: userId
      };

      // Sauvegarder en base (table notification_tokens)
      await this.saveTokenToDatabase(notificationToken);

      return true;

    } catch (error) {
      console.error('❌ Erreur récupération token:', error);
      return false;
    }
  }

  /**
   * Obtenir un ID unique du device
   */
  private async getDeviceId(): Promise<string> {
    try {
      // Vous pouvez utiliser expo-device pour obtenir un ID unique
      return Device.osName + '_' + Device.modelName + '_' + Date.now();
    } catch (error) {
      return 'unknown_device_' + Date.now();
    }
  }

  /**
   * Sauvegarder le token en base de données
   */
  private async saveTokenToDatabase(tokenData: NotificationToken): Promise<void> {
    try {
      // Créer la table si elle n'existe pas (à faire côté admin)
      const { error } = await supabase
        .from('notification_tokens')
        .upsert({
          user_id: tokenData.user_id,
          token: tokenData.token,
          platform: tokenData.platform,
          device_id: tokenData.device_id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,device_id'
        });

      if (error) {
        console.error('❌ Erreur sauvegarde token:', error);
      } else {
        console.log('✅ Token sauvegardé en base');
      }

    } catch (error) {
      console.error('❌ Erreur sauvegarde token:', error);
    }
  }

  /**
   * Configurer les listeners de notifications
   */
  private setupListeners(): void {
    // Listener pour les notifications reçues quand l'app est ouverte
    this.notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification reçue:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listener pour quand l'utilisateur tape sur une notification
    this.responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapée:', response);
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Configurer le listener d'état de l'app (SANS window.addEventListener)
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('📱 État app changé:', nextAppState);
      
      if (nextAppState === 'active') {
        // App devient active - marquer les notifications comme lues
        this.markNotificationsAsRead();
      } else if (nextAppState === 'background') {
        // App en arrière-plan
        console.log('📱 App en arrière-plan');
      }
    });
  }

  /**
   * Gérer une notification reçue
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    // Logique personnalisée pour traiter la notification
    const { title, body, data } = notification.request.content;
    
    console.log('📨 Notification:', { title, body, data });
    
    // Vous pouvez ajouter votre logique ici
    if (data?.type === 'mission') {
      // Rediriger vers la page des missions
    } else if (data?.type === 'message') {
      // Rediriger vers les messages
    }
  }

  /**
   * Gérer le tap sur une notification
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { notification } = response;
    const data = notification.request.content.data;
    
    console.log('👆 Action sur notification:', data);
    
    // Navigation basée sur le type de notification
    if (data?.screen) {
      // Naviguer vers l'écran spécifié
      // navigation.navigate(data.screen, data.params);
    }
  }

  /**
   * Marquer les notifications comme lues
   */
  private async markNotificationsAsRead(): Promise<void> {
    try {
      if (this.currentUserId) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('user_id', this.currentUserId)
          .is('read_at', null);
      }
    } catch (error) {
      console.error('❌ Erreur marquage notifications lues:', error);
    }
  }

  /**
   * Envoyer une notification push
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    try {
      // Récupérer le token de l'utilisateur
      const { data: tokenData, error } = await supabase
        .from('notification_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !tokenData) {
        console.log('❌ Token non trouvé pour utilisateur:', userId);
        return false;
      }

      // Envoyer la notification via l'API Expo
      const message = {
        to: tokenData.token,
        sound: 'default',
        title,
        body,
        data: data || {}
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const responseData = await response.json();
      
      if (responseData.data?.status === 'ok') {
        console.log('✅ Notification envoyée avec succès');
        return true;
      } else {
        console.error('❌ Erreur envoi notification:', responseData);
        return false;
      }

    } catch (error) {
      console.error('❌ Erreur envoi notification:', error);
      return false;
    }
  }

  /**
   * Mettre à jour le statut de disponibilité pour les notifications
   */
  async updateNotificationStatus(userId: string, isActive: boolean): Promise<void> {
    try {
      await supabase
        .from('notification_tokens')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      console.log(`✅ Statut notifications mis à jour: ${isActive ? 'actif' : 'inactif'}`);

    } catch (error) {
      console.error('❌ Erreur mise à jour statut notifications:', error);
    }
  }

  /**
   * Nettoyer les listeners (à appeler lors du logout)
   */
  cleanup(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.remove();
    }
    if (this.responseSubscription) {
      this.responseSubscription.remove();
    }
    if (this.appStateSubscription) {
      this.appStateSubscription?.remove();
    }
    
    this.currentUserId = null;
    console.log('🧹 Listeners notifications nettoyés');
  }

  /**
   * Obtenir les notifications de l'utilisateur
   */
  async getUserNotifications(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('❌ Erreur récupération notifications:', error);
      return [];
    }
  }
}

// Instance singleton
export const notificationService = new NotificationService();

// Fonctions utilitaires pour compatibilité
export const initializeNotifications = (userId: string) => {
  return notificationService.initialize(userId);
};

export const cleanupNotifications = () => {
  notificationService.cleanup();
};

export default notificationService;
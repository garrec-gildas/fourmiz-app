// services/PushNotificationService.ts - version corrigée et sécurisée
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const notificationType = notification.request.content.data?.type;
    return {
      shouldShowAlert: true,
      shouldPlaySound: notificationType !== 'silent',
      shouldSetBadge: true,
      priority: notificationType === 'urgent' ? 'max' : 'default',
    };
  },
});

export interface NotificationData {
  type: 'chat_message' | 'order_update' | 'system_alert' | 'reminder';
  orderId?: number;
  messageId?: number;
  senderId?: string;
  senderName?: string;
  urgency?: 'low' | 'normal' | 'high' | 'urgent';
  action?: string;
  [key: string]: any;
}

class PushNotificationService {
  private initialized = false;
  private currentUserId: string | null = null;
  private notificationListeners: (() => void)[] = [];
  private onNotificationNavigate?: (data: NotificationData) => void;

  async initialize(userId?: string): Promise<void> {
    if (this.initialized) return;
    try {
      if (Platform.OS === 'android') await this.setupAndroidChannels();
      if (userId) {
        this.currentUserId = userId;
        await this.registerForPushNotifications(userId);
      }
      this.setupNotificationListeners();
      this.initialized = true;
    } catch (error) {
      console.error('Erreur initialisation notifications:', error);
    }
  }

  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF4444',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('urgent', {
      name: 'Messages urgents',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#FF0000',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Commandes',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#4CAF50',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('silent', {
      name: 'Notifications silencieuses',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [],
      lightColor: '#2196F3',
      sound: null,
    });
  }

  async registerForPushNotifications(userId: string): Promise<string | null> {
    try {
      if (!Device.isDevice) return null;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        this.showPermissionAlert();
        return null;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      const token = tokenData.data;
      const deviceInfo = {
        deviceId: await this.getDeviceId(),
        deviceName: Device.deviceName || Device.modelName || 'Appareil inconnu',
        platform: Platform.OS,
      };
      await this.saveTokenToDatabase(userId, token, deviceInfo);
      this.currentUserId = userId;
      return token;
    } catch (error) {
      console.error('Erreur enregistrement notifications:', error);
      return null;
    }
  }

  private async getDeviceId(): Promise<string> {
    try {
      if (Device.osInternalBuildId) return Device.osInternalBuildId;
      if (Device.deviceYearClass) return `${Device.brand}-${Device.deviceYearClass}`;
      return `${Device.brand || 'unknown'}-${Date.now()}`;
    } catch {
      return `device-${Date.now()}`;
    }
  }

  private async saveTokenToDatabase(userId: string, token: string, deviceInfo: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token,
          platform: deviceInfo.platform,
          device_id: deviceInfo.deviceId,
          device_name: deviceInfo.deviceName,
          is_active: true,
          last_used: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: ['user_id', 'token'],
        });
      if (error) throw error;
    } catch (error) {
      console.error('Erreur sauvegarde token:', error);
    }
  }

  private showPermissionAlert(): void {
    Alert.alert(
      'Notifications désactivées',
      'Vous pouvez les activer dans les paramètres de votre appareil.',
      [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Paramètres', onPress: () => Notifications.openSettingsAsync() },
      ]
    );
  }

  private setupNotificationListeners(): void {
    const receivedListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    let dismissedListener;
    if (typeof Notifications.addNotificationDismissedListener === 'function') {
      dismissedListener = Notifications.addNotificationDismissedListener(
        this.handleNotificationDismissed.bind(this)
      );
    }

    this.notificationListeners.push(
      () => receivedListener.remove(),
      () => responseListener.remove(),
      () => dismissedListener?.remove?.()
    );
  }

  private handleNotificationReceived(notification: Notifications.Notification): void {
    const data = notification.request.content.data as NotificationData;
    this.navigateFromNotification(data);
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data as NotificationData;
    this.navigateFromNotification(data);
  }

  private handleNotificationDismissed(notificationId: string): void {
    console.log('Notification supprimée:', notificationId);
  }

  private navigateFromNotification(data: NotificationData): void {
    if (this.onNotificationNavigate) {
      this.onNotificationNavigate(data);
    } else {
      console.warn('Aucun callback de navigation défini');
    }
  }

  public setOnNotificationNavigate(callback: (data: NotificationData) => void) {
    this.onNotificationNavigate = callback;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;

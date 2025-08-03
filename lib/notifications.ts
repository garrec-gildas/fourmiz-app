// lib/notifications.ts - VERSION CORRIGÉE POUR GÉRER LES TOKENS EXISTANTS
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// ✅ CONFIGURATION DES NOTIFICATIONS
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const CACHE_KEYS = {
  TOKEN: 'fourmiz_notification_token',
  TOKEN_EXPIRY: 'fourmiz_token_expiry',
  DEVICE_ID: 'fourmiz_device_id',
  RETRY_COUNT: 'fourmiz_retry_count',
  LAST_ERROR: 'fourmiz_last_error',
} as const;

const TOKEN_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 heures
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_COOLDOWN = 5 * 60 * 1000; // 5 minutes entre tentatives

interface NotificationError {
  code?: string;
  message: string;
  timestamp: number;
}

interface NotificationStatus {
  isInitialized: boolean;
  hasToken: boolean;
  userId: string | null;
  lastError?: NotificationError;
  retryCount: number;
}

class NotificationService {
  private static instance: NotificationService;
  private currentUserId: string | null = null;
  private currentToken: string | null = null;
  private isInitialized = false;
  private retryCount = 0;
  private lastError: NotificationError | null = null;
  private isInitializing = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // 🚀 INITIALISATION SÉCURISÉE
  async initialize(userId: string, skipCooldown = false): Promise<boolean> {
    try {
      if (this.isInitializing) {
        console.log('🔔 Initialisation déjà en cours...');
        return false;
      }

      if (!skipCooldown && !(await this.canRetry())) {
        console.log('⏳ Cooldown actif ou limite de tentatives atteinte');
        return false;
      }

      this.isInitializing = true;
      console.log(`🔔 Initialisation sécurisée des notifications pour: ${userId}`);
      
      this.currentUserId = userId;
      this.retryCount++;

      // 1. Vérifier device physique
      if (!Device.isDevice) {
        console.log('⚠️ Émulateur détecté - notifications désactivées');
        return false;
      }

      // 2. Demander permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Permissions notifications refusées');
        this.setError('PERMISSION_DENIED', 'Permissions refusées');
        return false;
      }
      console.log('✅ Permissions notifications accordées');

      // 3. Obtenir et sauvegarder le token
      const success = await this.getAndSaveToken(userId);
      if (!success) {
        console.log('❌ Échec sauvegarde token');
        await this.scheduleRetry(userId);
        return false;
      }

      // 4. Succès - Reset des compteurs
      await this.resetRetryCount();
      this.isInitialized = true;
      this.lastError = null;
      console.log('✅ Notifications initialisées avec succès');
      return true;

    } catch (error) {
      console.error('❌ Erreur initialisation notifications:', error);
      this.setError('INIT_ERROR', error instanceof Error ? error.message : 'Erreur inconnue');
      await this.scheduleRetry(userId);
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  // ⏳ VÉRIFIER SI ON PEUT RÉESSAYER
  private async canRetry(): Promise<boolean> {
    try {
      const storedRetryCount = await AsyncStorage.getItem(CACHE_KEYS.RETRY_COUNT);
      const storedLastError = await AsyncStorage.getItem(CACHE_KEYS.LAST_ERROR);
      
      if (storedRetryCount) {
        this.retryCount = parseInt(storedRetryCount, 10);
      }

      if (storedLastError) {
        this.lastError = JSON.parse(storedLastError);
        
        const timeSinceLastError = Date.now() - this.lastError.timestamp;
        if (timeSinceLastError < RETRY_COOLDOWN) {
          return false;
        }
      }

      return this.retryCount < MAX_RETRY_ATTEMPTS;
    } catch {
      return true;
    }
  }

  // 🔄 PROGRAMMER UNE NOUVELLE TENTATIVE
  private async scheduleRetry(userId: string): Promise<void> {
    if (this.retryCount < MAX_RETRY_ATTEMPTS) {
      console.log(`🔄 Tentative de réinitialisation des notifications...`);
      setTimeout(() => {
        this.initialize(userId, false);
      }, 2000);
    } else {
      console.log('⚠️ Limite de tentatives atteinte - abandon');
      await this.setError('MAX_RETRIES', 'Limite de tentatives atteinte');
    }
  }

  // ❌ ENREGISTRER UNE ERREUR
  private async setError(code: string, message: string): Promise<void> {
    this.lastError = { code, message, timestamp: Date.now() };
    try {
      await AsyncStorage.setItem(CACHE_KEYS.LAST_ERROR, JSON.stringify(this.lastError));
      await AsyncStorage.setItem(CACHE_KEYS.RETRY_COUNT, this.retryCount.toString());
    } catch (error) {
      console.error('❌ Impossible de sauvegarder l\'erreur:', error);
    }
  }

  // ✅ RESET DES COMPTEURS DE TENTATIVES
  private async resetRetryCount(): Promise<void> {
    this.retryCount = 0;
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.RETRY_COUNT);
      await AsyncStorage.removeItem(CACHE_KEYS.LAST_ERROR);
    } catch (error) {
      console.error('❌ Impossible de reset les compteurs:', error);
    }
  }

  // 🎟️ OBTENIR LE TOKEN EXPO
  private async getExpoPushToken(): Promise<string | null> {
    try {
      const cachedToken = await AsyncStorage.getItem(CACHE_KEYS.TOKEN);
      const cachedExpiry = await AsyncStorage.getItem(CACHE_KEYS.TOKEN_EXPIRY);
      
      if (cachedToken && cachedExpiry && Date.now() < parseInt(cachedExpiry)) {
        console.log('✅ Token récupéré depuis le cache');
        return cachedToken;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? 
                       Constants.easConfig?.projectId ??
                       process.env.EXPO_PUBLIC_PROJECT_ID;
      
      if (!projectId) {
        throw new Error('Project ID manquant dans la configuration');
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;

      const expiry = Date.now() + TOKEN_REFRESH_INTERVAL;
      await AsyncStorage.setItem(CACHE_KEYS.TOKEN, token);
      await AsyncStorage.setItem(CACHE_KEYS.TOKEN_EXPIRY, expiry.toString());

      console.log('✅ Nouveau token généré et mis en cache');
      return token;

    } catch (error) {
      console.error('❌ Erreur génération token Expo:', error);
      throw error;
    }
  }

  // 📱 ID DEVICE UNIQUE
  private async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(CACHE_KEYS.DEVICE_ID);
      
      if (!deviceId) {
        const modelName = Device.modelName?.replace(/\s+/g, '_') || 'unknown';
        deviceId = `${Platform.OS}_${modelName}_${Date.now()}`;
        await AsyncStorage.setItem(CACHE_KEYS.DEVICE_ID, deviceId);
      }

      return deviceId;
    } catch (error) {
      console.warn('⚠️ Impossible de générer device ID:', error);
      return `unknown_${Platform.OS}_${Date.now()}`;
    }
  }

  // 💾 SAUVEGARDER TOKEN - VERSION CORRIGÉE ✅
  private async getAndSaveToken(userId: string): Promise<boolean> {
    try {
      const token = await this.getExpoPushToken();
      if (!token) {
        throw new Error('Impossible de générer le token de notification');
      }

      this.currentToken = token;
      const deviceId = await this.getDeviceId();

      console.log('💾 Sauvegarde du token...');

      // ✅ STRATÉGIE UPSERT : Essayer mise à jour d'abord, puis insertion
      const { error: updateError } = await supabase
        .from('push_tokens')
        .update({
          device_type: Platform.OS,
          platform: Platform.OS,
          device_id: deviceId,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('token', token);

      if (!updateError) {
        console.log('✅ Token existant mis à jour avec succès');
        return true;
      }

      // Si la mise à jour n'a affecté aucune ligne, essayer l'insertion
      console.log('🆕 Token non trouvé pour mise à jour, tentative d\'insertion...');

      const { error: insertError } = await supabase
        .from('push_tokens')
        .insert({
          user_id: userId,
          token: token,
          device_type: Platform.OS,
          platform: Platform.OS,
          device_id: deviceId,
          is_active: true,
        });

      if (insertError) {
        console.error('❌ Erreur insertion:', insertError);
        
        // Si c'est une erreur de contrainte unique (23505), c'est OK
        if (insertError.code === '23505') {
          console.log('💡 Token déjà existant - c\'est normal');
          
          // Forcer une mise à jour
          const { error: forceUpdateError } = await supabase
            .from('push_tokens')
            .update({ 
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('token', token);

          if (forceUpdateError) {
            console.error('❌ Erreur mise à jour forcée:', forceUpdateError);
            return false;
          }

          console.log('✅ Token existant réactivé avec succès');
          return true;
        }

        // Autres erreurs
        await this.handleDatabaseError(insertError);
        return false;
      }

      console.log('✅ Nouveau token inséré avec succès');
      return true;

    } catch (error) {
      console.error('❌ Exception sauvegarde token:', error);
      this.setError('SAVE_ERROR', error instanceof Error ? error.message : 'Erreur de sauvegarde');
      return false;
    }
  }

  // 🩺 DIAGNOSTIC D'ERREURS DE BASE DE DONNÉES - SIMPLIFIÉ
  private async handleDatabaseError(error: any): Promise<void> {
    const errorMessage = error.message || 'Erreur de base de données';
    
    switch (error.code) {
      case 'PGRST204':
        console.log('💡 Colonne manquante - vérifiez que le SQL a été exécuté');
        await this.setError('MISSING_COLUMN', 'Colonne manquante dans push_tokens');
        break;
        
      case '23503':
        console.log('💡 Profil utilisateur manquant');
        await this.setError('USER_NOT_FOUND', 'Utilisateur non trouvé');
        break;
        
      case '42501':
        console.log('💡 Problème de permissions RLS');
        await this.setError('PERMISSION_ERROR', 'Problème de permissions');
        break;
        
      default:
        console.log('💡 Erreur de base de données:', errorMessage);
        await this.setError('DB_ERROR', errorMessage);
    }
  }

  // 📱 NOTIFICATION DE TEST
  async sendTestNotification(): Promise<boolean> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Fourmiz 🐜",
          body: "Notifications corrigées - Plus d'erreur 23505 !",
          data: { type: 'test' },
        },
        trigger: { seconds: 1 },
      });
      console.log('✅ Notification de test programmée');
      return true;
    } catch (error) {
      console.error('❌ Erreur test notification:', error);
      return false;
    }
  }

  // 📊 STATUS DÉTAILLÉ
  getStatus(): NotificationStatus {
    return {
      isInitialized: this.isInitialized,
      hasToken: !!this.currentToken,
      userId: this.currentUserId,
      lastError: this.lastError || undefined,
      retryCount: this.retryCount,
    };
  }

  // 🔄 FORCE RETRY (pour debug)
  async forceRetry(userId: string): Promise<boolean> {
    await this.resetRetryCount();
    return this.initialize(userId, true);
  }

  // 🧹 NETTOYAGE COMPLET
  async cleanup(): Promise<void> {
    try {
      this.currentUserId = null;
      this.currentToken = null;
      this.isInitialized = false;
      this.retryCount = 0;
      this.lastError = null;
      this.isInitializing = false;

      const keys = Object.values(CACHE_KEYS);
      await AsyncStorage.multiRemove(keys);
      
      console.log('🧹 Service nettoyé complètement');
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
    }
  }

  // 🆘 RESET COMPLET (pour résoudre les boucles)
  async resetCompletely(userId: string): Promise<boolean> {
    console.log('🆘 Reset complet du service de notifications...');
    
    try {
      // 1. Nettoyer complètement
      await this.cleanup();
      
      // 2. Supprimer tous les tokens de cet utilisateur en base
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId);
      
      console.log('🗑️ Anciens tokens supprimés');
      
      // 3. Réinitialiser complètement
      return await this.initialize(userId, true);
      
    } catch (error) {
      console.error('❌ Erreur reset complet:', error);
      return false;
    }
  }
}

// 🚀 EXPORTS
export const notificationService = NotificationService.getInstance();

export const initializeNotifications = async (userId: string): Promise<boolean> => {
  return await notificationService.initialize(userId);
};

export const cleanupNotifications = async (): Promise<void> => {
  await notificationService.cleanup();
};

export const sendTestNotification = async (): Promise<boolean> => {
  return await notificationService.sendTestNotification();
};

export const getNotificationStatus = (): NotificationStatus => {
  return notificationService.getStatus();
};

export const forceRetryNotifications = async (userId: string): Promise<boolean> => {
  return await notificationService.forceRetry(userId);
};

// 🆘 NOUVELLE FONCTION DE RESET COMPLET
export const resetNotificationsCompletely = async (userId: string): Promise<boolean> => {
  return await notificationService.resetCompletely(userId);
};

export default notificationService;
// app/settings/notifications.tsx - Écran de paramètres des notifications
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import pushNotificationService from '@/services/PushNotificationService';
import { supabase } from '@/lib/supabase';

interface NotificationPreferences {
  chat_messages: boolean;
  order_updates: boolean;
  system_alerts: boolean;
  marketing: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export default function NotificationSettingsScreen() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    chat_messages: true,
    order_updates: true,
    system_alerts: true,
    marketing: false,
    push_enabled: true,
    email_enabled: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

  useEffect(() => {
    loadUserAndPreferences();
    checkNotificationPermissions();
  }, []);

  const loadUserAndPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        const userPrefs = await pushNotificationService.getUserPreferences(user.id);
        if (userPrefs) {
          setPreferences(userPrefs);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement préférences:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNotificationPermissions = async () => {
    try {
      const hasPermission = await pushNotificationService.constructor.checkNotificationPermissions();
      setPermissionStatus(hasPermission ? 'granted' : 'denied');
    } catch (error) {
      console.error('❌ Erreur vérification permissions:', error);
      setPermissionStatus('error');
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const savePreferences = async () => {
    if (!currentUser) return;

    setSaving(true);
    try {
      const success = await pushNotificationService.updateUserPreferences(
        currentUser.id,
        preferences
      );

      if (success) {
        Alert.alert(
          '✅ Paramètres sauvegardés',
          'Vos préférences de notification ont été mises à jour.'
        );
      } else {
        throw new Error('Échec de la sauvegarde');
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      Alert.alert(
        '❌ Erreur',
        'Impossible de sauvegarder vos préférences. Veuillez réessayer.'
      );
    } finally {
      setSaving(false);
    }
  };

  const requestNotificationPermissions = async () => {
    try {
      if (currentUser) {
        const token = await pushNotificationService.registerForPushNotifications(currentUser.id);
        if (token) {
          setPermissionStatus('granted');
          Alert.alert(
            '✅ Notifications activées',
            'Vous recevrez maintenant des notifications push.'
          );
        } else {
          setPermissionStatus('denied');
        }
      }
    } catch (error) {
      console.error('❌ Erreur demande permissions:', error);
      Alert.alert(
        '❌ Erreur',
        'Impossible d\'activer les notifications. Vérifiez les paramètres de votre appareil.'
      );
    }
  };

  const openSystemSettings = () => {
    Alert.alert(
      'Paramètres système',
      'Pour modifier les autorisations de notification, rendez-vous dans les paramètres de votre appareil.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Ouvrir paramètres', 
          onPress: () => pushNotificationService.constructor.openNotificationSettings()
        }
      ]
    );
  };

  const testNotification = async () => {
    if (!currentUser) return;

    try {
      await pushNotificationService.sendNotificationToUser(
        currentUser.id,
        '🔔 Notification de test',
        'Ceci est une notification de test pour vérifier que tout fonctionne correctement.',
        { type: 'system_alert', urgency: 'normal' }
      );

      Alert.alert(
        '📤 Test envoyé',
        'Une notification de test a été envoyée. Vous devriez la recevoir dans quelques secondes.'
      );
    } catch (error) {
      console.error('❌ Erreur test notification:', error);
      Alert.alert(
        '❌ Erreur',
        'Impossible d\'envoyer la notification de test.'
      );
    }
  };

  const renderPermissionStatus = () => {
    const getStatusInfo = () => {
      switch (permissionStatus) {
        case 'granted':
          return {
            icon: 'checkmark-circle',
            color: '#10b981',
            text: 'Autorisées',
            subtitle: 'Les notifications push sont activées'
          };
        case 'denied':
          return {
            icon: 'close-circle',
            color: '#ef4444',
            text: 'Refusées',
            subtitle: 'Activez les notifications dans les paramètres'
          };
        default:
          return {
            icon: 'help-circle',
            color: '#f59e0b',
            text: 'Inconnues',
            subtitle: 'Vérification en cours...'
          };
      }
    };

    const status = getStatusInfo();

    return (
      <View style={styles.permissionCard}>
        <View style={styles.permissionHeader}>
          <Ionicons name={status.icon} size={24} color={status.color} />
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionTitle}>
              Notifications push : {status.text}
            </Text>
            <Text style={styles.permissionSubtitle}>
              {status.subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.permissionActions}>
          {permissionStatus === 'denied' && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestNotificationPermissions}
            >
              <Text style={styles.permissionButtonText}>Activer</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.permissionButton, styles.secondaryButton]}
            onPress={openSystemSettings}
          >
            <Text style={[styles.permissionButtonText, styles.secondaryButtonText]}>
              Paramètres
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPreferenceItem = (
    key: keyof NotificationPreferences,
    title: string,
    subtitle: string,
    icon: string
  ) => (
    <View style={styles.preferenceItem}>
      <View style={styles.preferenceLeft}>
        <Ionicons name={icon} size={20} color="#6b7280" />
        <View style={styles.preferenceText}>
          <Text style={styles.preferenceTitle}>{title}</Text>
          <Text style={styles.preferenceSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={preferences[key] as boolean}
        onValueChange={(value) => handlePreferenceChange(key, value)}
        trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
        thumbColor="#fff"
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Notifications' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Chargement des paramètres...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Notifications',
          headerRight: () => (
            <TouchableOpacity 
              onPress={savePreferences}
              disabled={saving}
              style={styles.saveButton}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Text style={styles.saveButtonText}>Sauvegarder</Text>
              )}
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Statut des permissions */}
        {renderPermissionStatus()}

        {/* Test de notification */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={testNotification}
            disabled={permissionStatus !== 'granted'}
          >
            <Ionicons name="flask" size={20} color="#fff" />
            <Text style={styles.testButtonText}>Tester les notifications</Text>
          </TouchableOpacity>
        </View>

        {/* Préférences générales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Types de notifications</Text>
          
          {renderPreferenceItem(
            'push_enabled',
            'Notifications push',
            'Recevoir des notifications sur cet appareil',
            'notifications'
          )}
          
          {renderPreferenceItem(
            'chat_messages',
            'Messages',
            'Nouveaux messages dans vos conversations',
            'chatbubble'
          )}
          
          {renderPreferenceItem(
            'order_updates',
            'Commandes',
            'Mises à jour de vos commandes',
            'document-text'
          )}
          
          {renderPreferenceItem(
            'system_alerts',
            'Alertes système',
            'Notifications importantes du système',
            'alert-circle'
          )}
          
          {renderPreferenceItem(
            'marketing',
            'Promotions',
            'Offres spéciales et nouveautés',
            'megaphone'
          )}
        </View>

        {/* Autres canaux */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Autres canaux</Text>
          
          {renderPreferenceItem(
            'email_enabled',
            'Notifications par email',
            'Recevoir des notifications par email',
            'mail'
          )}
        </View>

        {/* Heures de silence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Heures de silence</Text>
          <Text style={styles.sectionSubtitle}>
            Définissez une période où vous ne souhaitez pas recevoir de notifications
          </Text>
          
          <View style={styles.quietHoursContainer}>
            <TouchableOpacity style={styles.timeButton}>
              <Ionicons name="moon" size={20} color="#6b7280" />
              <Text style={styles.timeButtonText}>
                Début : {preferences.quiet_hours_start || 'Non défini'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.timeButton}>
              <Ionicons name="sunny" size={20} color="#6b7280" />
              <Text style={styles.timeButtonText}>
                Fin : {preferences.quiet_hours_end || 'Non défini'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Informations complémentaires */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>À propos des notifications</Text>
              <Text style={styles.infoDescription}>
                Les notifications vous permettent de rester informé des nouveaux messages 
                et des mises à jour de vos commandes. Vous pouvez les personnaliser 
                selon vos préférences.
              </Text>
            </View>
          </View>
          
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={20} color="#10b981" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Confidentialité</Text>
              <Text style={styles.infoDescription}>
                Vos préférences de notification sont privées et ne sont utilisées 
                que pour personnaliser votre expérience.
              </Text>
            </View>
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              Alert.alert(
                'Tout activer',
                'Voulez-vous activer toutes les notifications ?',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { 
                    text: 'Activer', 
                    onPress: () => {
                      setPreferences(prev => ({
                        ...prev,
                        chat_messages: true,
                        order_updates: true,
                        system_alerts: true,
                        push_enabled: true,
                        email_enabled: true
                      }));
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="checkmark-done" size={20} color="#10b981" />
            <Text style={styles.actionButtonText}>Tout activer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              Alert.alert(
                'Tout désactiver',
                'Voulez-vous désactiver toutes les notifications ? Vous ne recevrez plus aucune notification.',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { 
                    text: 'Désactiver', 
                    style: 'destructive',
                    onPress: () => {
                      setPreferences(prev => ({
                        ...prev,
                        chat_messages: false,
                        order_updates: false,
                        system_alerts: false,
                        marketing: false,
                        push_enabled: false,
                        email_enabled: false
                      }));
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="close-circle" size={20} color="#ef4444" />
            <Text style={styles.actionButtonText}>Tout désactiver</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              Alert.alert(
                'Réinitialiser',
                'Voulez-vous restaurer les paramètres par défaut ?',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { 
                    text: 'Réinitialiser', 
                    onPress: () => {
                      setPreferences({
                        chat_messages: true,
                        order_updates: true,
                        system_alerts: true,
                        marketing: false,
                        push_enabled: true,
                        email_enabled: true,
                        quiet_hours_start: null,
                        quiet_hours_end: null,
                      });
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="refresh" size={20} color="#f59e0b" />
            <Text style={styles.actionButtonText}>Réinitialiser</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { fontSize: 16, color: '#6b7280' },
  saveButton: { padding: 8 },
  saveButtonText: { fontSize: 16, color: '#3b82f6', fontWeight: '600' },
  scrollView: { flex: 1 },

  // Section
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    paddingHorizontal: 16,
    lineHeight: 20,
  },

  // Permissions
  permissionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  permissionInfo: { flex: 1 },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  permissionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  permissionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  permissionButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
  },
  permissionButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#374151',
  },

  // Test button
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
  },
  testButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

  // Préférences
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  preferenceText: { flex: 1 },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  preferenceSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },

  // Heures de silence
  quietHoursContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 12,
  },
  timeButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },

  // Informations
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9ff',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  infoText: { flex: 1 },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },

  // Actions rapides
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },

  bottomSpacer: { height: 32 },
});
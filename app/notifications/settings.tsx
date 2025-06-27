import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  ArrowLeft, 
  Bell, 
  BellOff,
  Smartphone,
  Mail,
  MessageCircle,
  Euro,
  Users,
  Calendar,
  Award,
  Shield,
  Info,
  Clock,
  Volume2,
  Vibrate
} from 'lucide-react-native';

interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  
  // Types de notifications
  orderNotifications: boolean;
  paymentNotifications: boolean;
  referralNotifications: boolean;
  badgeNotifications: boolean;
  messageNotifications: boolean;
  systemNotifications: boolean;
  securityNotifications: boolean;
  promotionNotifications: boolean;
  
  // Paramètres avancés
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  
  // Fréquence
  instantNotifications: boolean;
  dailyDigest: boolean;
  weeklyDigest: boolean;
}

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    
    orderNotifications: true,
    paymentNotifications: true,
    referralNotifications: true,
    badgeNotifications: true,
    messageNotifications: true,
    systemNotifications: true,
    securityNotifications: true,
    promotionNotifications: false,
    
    quietHours: {
      enabled: true,
      startTime: '22:00',
      endTime: '08:00',
    },
    soundEnabled: true,
    vibrationEnabled: true,
    
    instantNotifications: true,
    dailyDigest: false,
    weeklyDigest: true,
  });

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateQuietHours = (key: keyof NotificationSettings['quietHours'], value: any) => {
    setSettings(prev => ({
      ...prev,
      quietHours: { ...prev.quietHours, [key]: value }
    }));
  };

  const handleSaveSettings = () => {
    // Ici on sauvegarderait les paramètres
    Alert.alert(
      'Paramètres sauvegardés',
      'Vos préférences de notification ont été mises à jour.',
      [{ text: 'OK' }]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Réinitialiser les paramètres',
      'Voulez-vous vraiment remettre tous les paramètres par défaut ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Réinitialiser', 
          style: 'destructive',
          onPress: () => {
            // Réinitialiser aux valeurs par défaut
            setSettings({
              pushNotifications: true,
              emailNotifications: true,
              smsNotifications: false,
              orderNotifications: true,
              paymentNotifications: true,
              referralNotifications: true,
              badgeNotifications: true,
              messageNotifications: true,
              systemNotifications: true,
              securityNotifications: true,
              promotionNotifications: false,
              quietHours: {
                enabled: true,
                startTime: '22:00',
                endTime: '08:00',
              },
              soundEnabled: true,
              vibrationEnabled: true,
              instantNotifications: true,
              dailyDigest: false,
              weeklyDigest: true,
            });
          }
        }
      ]
    );
  };

  const renderSettingRow = (
    icon: any,
    title: string,
    description: string,
    value: boolean,
    onToggle: (value: boolean) => void,
    color: string = '#666'
  ) => {
    const IconComponent = icon;
    
    return (
      <View style={styles.settingRow}>
        <View style={[styles.settingIcon, { backgroundColor: color + '15' }]}>
          <IconComponent size={20} color={color} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#E0E0E0', true: '#FF444440' }}
          thumbColor={value ? '#FF4444' : '#999'}
        />
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
        <Text style={styles.headerTitle}>Paramètres de notification</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Canaux de notification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Canaux de notification</Text>
          
          {renderSettingRow(
            Smartphone,
            'Notifications push',
            'Recevoir des notifications sur votre appareil',
            settings.pushNotifications,
            (value) => updateSetting('pushNotifications', value),
            '#4CAF50'
          )}
          
          {renderSettingRow(
            Mail,
            'Notifications email',
            'Recevoir des notifications par email',
            settings.emailNotifications,
            (value) => updateSetting('emailNotifications', value),
            '#2196F3'
          )}
          
          {renderSettingRow(
            MessageCircle,
            'Notifications SMS',
            'Recevoir des notifications par SMS (urgences uniquement)',
            settings.smsNotifications,
            (value) => updateSetting('smsNotifications', value),
            '#FF9800'
          )}
        </View>

        {/* Types de notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Types de notifications</Text>
          
          {renderSettingRow(
            Calendar,
            'Missions et commandes',
            'Nouvelles missions, acceptations, modifications',
            settings.orderNotifications,
            (value) => updateSetting('orderNotifications', value),
            '#4CAF50'
          )}
          
          {renderSettingRow(
            Euro,
            'Paiements',
            'Paiements reçus, virements, factures',
            settings.paymentNotifications,
            (value) => updateSetting('paymentNotifications', value),
            '#2196F3'
          )}
          
          {renderSettingRow(
            Users,
            'Parrainage',
            'Nouveaux filleuls, commissions de parrainage',
            settings.referralNotifications,
            (value) => updateSetting('referralNotifications', value),
            '#FF4444'
          )}
          
          {renderSettingRow(
            Award,
            'Badges et récompenses',
            'Nouveaux badges débloqués, challenges',
            settings.badgeNotifications,
            (value) => updateSetting('badgeNotifications', value),
            '#FFD700'
          )}
          
          {renderSettingRow(
            MessageCircle,
            'Messages',
            'Nouveaux messages de clients ou Fourmiz',
            settings.messageNotifications,
            (value) => updateSetting('messageNotifications', value),
            '#FF9800'
          )}
          
          {renderSettingRow(
            Shield,
            'Sécurité',
            'Connexions, modifications de compte',
            settings.securityNotifications,
            (value) => updateSetting('securityNotifications', value),
            '#F44336'
          )}
          
          {renderSettingRow(
            Info,
            'Système',
            'Mises à jour, maintenance, informations importantes',
            settings.systemNotifications,
            (value) => updateSetting('systemNotifications', value),
            '#9C27B0'
          )}
          
          {renderSettingRow(
            Bell,
            'Promotions',
            'Offres spéciales, codes promo, événements',
            settings.promotionNotifications,
            (value) => updateSetting('promotionNotifications', value),
            '#E91E63'
          )}
        </View>

        {/* Paramètres avancés */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres avancés</Text>
          
          {renderSettingRow(
            Volume2,
            'Son des notifications',
            'Jouer un son lors de la réception',
            settings.soundEnabled,
            (value) => updateSetting('soundEnabled', value),
            '#FF9800'
          )}
          
          {renderSettingRow(
            Vibrate,
            'Vibration',
            'Faire vibrer l\'appareil lors de la réception',
            settings.vibrationEnabled,
            (value) => updateSetting('vibrationEnabled', value),
            '#9C27B0'
          )}
        </View>

        {/* Heures silencieuses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Heures silencieuses</Text>
          
          {renderSettingRow(
            BellOff,
            'Activer les heures silencieuses',
            'Désactiver les notifications pendant certaines heures',
            settings.quietHours.enabled,
            (value) => updateQuietHours('enabled', value),
            '#666'
          )}
          
          {settings.quietHours.enabled && (
            <View style={styles.quietHoursConfig}>
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>De :</Text>
                <TouchableOpacity style={styles.timeButton}>
                  <Clock size={16} color="#666" />
                  <Text style={styles.timeText}>{settings.quietHours.startTime}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>À :</Text>
                <TouchableOpacity style={styles.timeButton}>
                  <Clock size={16} color="#666" />
                  <Text style={styles.timeText}>{settings.quietHours.endTime}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Fréquence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fréquence</Text>
          
          {renderSettingRow(
            Bell,
            'Notifications instantanées',
            'Recevoir les notifications immédiatement',
            settings.instantNotifications,
            (value) => updateSetting('instantNotifications', value),
            '#4CAF50'
          )}
          
          {renderSettingRow(
            Mail,
            'Résumé quotidien',
            'Recevoir un résumé par email chaque jour',
            settings.dailyDigest,
            (value) => updateSetting('dailyDigest', value),
            '#2196F3'
          )}
          
          {renderSettingRow(
            Calendar,
            'Résumé hebdomadaire',
            'Recevoir un résumé par email chaque semaine',
            settings.weeklyDigest,
            (value) => updateSetting('weeklyDigest', value),
            '#FF9800'
          )}
        </View>

        {/* Informations importantes */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Info size={20} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Notifications importantes</Text>
              <Text style={styles.infoText}>
                Les notifications de sécurité et les alertes système critiques ne peuvent pas être désactivées 
                pour votre protection et la sécurité de votre compte.
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
            <Text style={styles.saveButtonText}>Sauvegarder les paramètres</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resetButton} onPress={handleResetSettings}>
            <Text style={styles.resetButtonText}>Réinitialiser par défaut</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 18,
  },
  quietHoursConfig: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    lineHeight: 18,
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  resetButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
});
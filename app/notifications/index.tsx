import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Bell, Settings, Filter, BookMarked as MarkAsRead, Trash2, Euro, Users, Calendar, Star, TriangleAlert as AlertTriangle, Info, CircleCheck as CheckCircle, MessageCircle, TrendingUp, Award, MapPin, Clock, Gift, CreditCard, Shield } from 'lucide-react-native';

// Types de notifications
interface Notification {
  id: string;
  type: 'order' | 'payment' | 'referral' | 'system' | 'badge' | 'message' | 'promotion' | 'security';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  data?: any;
}

// Mock data pour les notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'order',
    title: 'Nouvelle mission disponible',
    message: 'Une mission de livraison de courses est disponible près de chez vous (2.3 km). Budget proposé : 15€',
    timestamp: new Date('2024-12-20T14:30:00'),
    isRead: false,
    priority: 'high',
    actionUrl: '/order/new-123',
    data: { orderId: 'new-123', budget: 15, distance: 2.3 }
  },
  {
    id: '2',
    type: 'payment',
    title: 'Paiement reçu',
    message: 'Vous avez reçu 12,00€ pour la mission "Livraison de courses" réalisée pour Marie D.',
    timestamp: new Date('2024-12-20T12:15:00'),
    isRead: false,
    priority: 'medium',
    data: { amount: 12.00, clientName: 'Marie D.' }
  },
  {
    id: '3',
    type: 'badge',
    title: 'Nouveau badge débloqué !',
    message: 'Félicitations ! Vous avez débloqué le badge "Fourmiz Express" et gagné 10€ de bonus.',
    timestamp: new Date('2024-12-20T10:45:00'),
    isRead: false,
    priority: 'high',
    actionUrl: '/badges',
    data: { badgeName: 'Fourmiz Express', reward: 10 }
  },
  {
    id: '4',
    type: 'referral',
    title: 'Nouveau filleul inscrit',
    message: 'Sophie M. s\'est inscrite grâce à votre code de parrainage. Vous avez gagné 3€ !',
    timestamp: new Date('2024-12-19T16:20:00'),
    isRead: true,
    priority: 'medium',
    data: { referralName: 'Sophie M.', bonus: 3 }
  },
  {
    id: '5',
    type: 'message',
    title: 'Nouveau message',
    message: 'Thomas L. vous a envoyé un message concernant la mission "Montage meuble IKEA"',
    timestamp: new Date('2024-12-19T14:10:00'),
    isRead: true,
    priority: 'medium',
    actionUrl: '/chat/thomas-l',
    data: { senderName: 'Thomas L.' }
  },
  {
    id: '6',
    type: 'system',
    title: 'Mise à jour de l\'application',
    message: 'Une nouvelle version de Fourmiz est disponible avec de nouvelles fonctionnalités !',
    timestamp: new Date('2024-12-19T09:00:00'),
    isRead: true,
    priority: 'low',
  },
  {
    id: '7',
    type: 'security',
    title: 'Connexion depuis un nouvel appareil',
    message: 'Votre compte a été connecté depuis un nouvel appareil. Si ce n\'était pas vous, sécurisez votre compte.',
    timestamp: new Date('2024-12-18T20:30:00'),
    isRead: true,
    priority: 'urgent',
    actionUrl: '/security',
  },
  {
    id: '8',
    type: 'promotion',
    title: 'Offre spéciale week-end',
    message: 'Gagnez 20% de bonus sur toutes vos missions ce week-end ! Offre valable jusqu\'à dimanche.',
    timestamp: new Date('2024-12-18T08:00:00'),
    isRead: true,
    priority: 'medium',
  },
  {
    id: '9',
    type: 'order',
    title: 'Mission terminée',
    message: 'Votre mission "Promenade de chien" a été marquée comme terminée. N\'oubliez pas de laisser un avis !',
    timestamp: new Date('2024-12-17T18:45:00'),
    isRead: true,
    priority: 'low',
    actionUrl: '/order/completed-456',
  },
  {
    id: '10',
    type: 'payment',
    title: 'Virement effectué',
    message: 'Votre virement hebdomadaire de 245,50€ a été effectué sur votre compte bancaire.',
    timestamp: new Date('2024-12-15T10:00:00'),
    isRead: true,
    priority: 'medium',
    data: { amount: 245.50 }
  }
];

// Configuration des types de notifications
const notificationConfig = {
  order: { 
    icon: Calendar, 
    color: '#4CAF50', 
    label: 'Missions',
    bgColor: '#E8F5E8'
  },
  payment: { 
    icon: Euro, 
    color: '#2196F3', 
    label: 'Paiements',
    bgColor: '#E3F2FD'
  },
  referral: { 
    icon: Users, 
    color: '#FF4444', 
    label: 'Parrainage',
    bgColor: '#FFF0F0'
  },
  system: { 
    icon: Info, 
    color: '#9C27B0', 
    label: 'Système',
    bgColor: '#F3E5F5'
  },
  badge: { 
    icon: Award, 
    color: '#FFD700', 
    label: 'Badges',
    bgColor: '#FFF8E1'
  },
  message: { 
    icon: MessageCircle, 
    color: '#FF9800', 
    label: 'Messages',
    bgColor: '#FFF3E0'
  },
  promotion: { 
    icon: Gift, 
    color: '#E91E63', 
    label: 'Promotions',
    bgColor: '#FCE4EC'
  },
  security: { 
    icon: Shield, 
    color: '#F44336', 
    label: 'Sécurité',
    bgColor: '#FFEBEE'
  }
};

const priorityConfig = {
  low: { color: '#9E9E9E', label: 'Faible' },
  medium: { color: '#FF9800', label: 'Normale' },
  high: { color: '#FF4444', label: 'Importante' },
  urgent: { color: '#F44336', label: 'Urgente' }
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filtrer les notifications
  const filteredNotifications = notifications.filter(notification => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'unread') return !notification.isRead;
    return notification.type === selectedFilter;
  });

  // Compter les notifications non lues
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Marquer une notification comme lue
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  // Supprimer une notification
  const deleteNotification = (notificationId: string) => {
    Alert.alert(
      'Supprimer la notification',
      'Êtes-vous sûr de vouloir supprimer cette notification ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => {
            setNotifications(prev => 
              prev.filter(notification => notification.id !== notificationId)
            );
          }
        }
      ]
    );
  };

  // Gérer le clic sur une notification
  const handleNotificationPress = (notification: Notification) => {
    // Marquer comme lue
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Naviguer vers l'action si disponible
    if (notification.actionUrl) {
      router.push(notification.actionUrl as any);
    }
  };

  // Rendu d'une notification
  const renderNotification = ({ item: notification }: { item: Notification }) => {
    const config = notificationConfig[notification.type];
    const IconComponent = config.icon;
    const priority = priorityConfig[notification.priority];

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !notification.isRead && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <View style={[styles.notificationIcon, { backgroundColor: config.bgColor }]}>
              <IconComponent size={20} color={config.color} />
            </View>
            
            <View style={styles.notificationInfo}>
              <View style={styles.notificationTitleRow}>
                <Text style={[
                  styles.notificationTitle,
                  !notification.isRead && styles.unreadTitle
                ]}>
                  {notification.title}
                </Text>
                {notification.priority === 'urgent' && (
                  <View style={styles.urgentBadge}>
                    <AlertTriangle size={12} color="#F44336" />
                  </View>
                )}
              </View>
              
              <Text style={styles.notificationMessage}>
                {notification.message}
              </Text>
              
              <View style={styles.notificationMeta}>
                <Text style={styles.notificationTime}>
                  {formatTime(notification.timestamp)}
                </Text>
                <View style={[styles.typeBadge, { backgroundColor: config.bgColor }]}>
                  <Text style={[styles.typeText, { color: config.color }]}>
                    {config.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          {!notification.isRead && (
            <View style={styles.unreadDot} />
          )}
        </View>

        <View style={styles.notificationActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              markAsRead(notification.id);
            }}
          >
            <CheckCircle size={16} color="#4CAF50" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              deleteNotification(notification.id);
            }}
          >
            <Trash2 size={16} color="#F44336" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Formater le temps
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  // Filtres disponibles
  const filters = [
    { key: 'all', label: 'Toutes', count: notifications.length },
    { key: 'unread', label: 'Non lues', count: unreadCount },
    { key: 'order', label: 'Missions', count: notifications.filter(n => n.type === 'order').length },
    { key: 'payment', label: 'Paiements', count: notifications.filter(n => n.type === 'payment').length },
    { key: 'referral', label: 'Parrainage', count: notifications.filter(n => n.type === 'referral').length },
    { key: 'badge', label: 'Badges', count: notifications.filter(n => n.type === 'badge').length },
    { key: 'message', label: 'Messages', count: notifications.filter(n => n.type === 'message').length },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadgeHeader}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={24} color="#FF4444" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/notifications/settings')}
          >
            <Settings size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      {unreadCount > 0 && (
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <CheckCircle size={20} color="#4CAF50" />
            <Text style={styles.markAllText}>Tout marquer comme lu</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersList}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterButton,
                    selectedFilter === filter.key && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedFilter(filter.key)}
                >
                  <Text style={[
                    styles.filterText,
                    selectedFilter === filter.key && styles.filterTextActive
                  ]}>
                    {filter.label} ({filter.count})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.notificationsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bell size={64} color="#DDD" />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptySubtitle}>
              {selectedFilter === 'unread' 
                ? 'Toutes vos notifications ont été lues'
                : 'Vous n\'avez aucune notification pour le moment'
              }
            </Text>
          </View>
        }
      />
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
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  unreadBadgeHeader: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  quickActions: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    gap: 8,
  },
  markAllText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filtersList: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  filterButtonActive: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  filterText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  notificationsList: {
    padding: 20,
    gap: 12,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  notificationContent: {
    flex: 1,
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    flex: 1,
  },
  unreadTitle: {
    color: '#000',
  },
  urgentBadge: {
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
  typeBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  notificationActions: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
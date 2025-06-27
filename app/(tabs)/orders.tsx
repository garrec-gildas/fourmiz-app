import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, MapPin, Star, MessageCircle, Phone, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';
import { router } from 'expo-router';

// Mock data pour les commandes
const mockOrders = [
  {
    id: '1',
    serviceName: 'Livraison de courses Drive',
    status: 'in_progress',
    fourmizName: 'Marie D.',
    fourmizRating: 4.8,
    scheduledTime: '14:30',
    location: '15 rue de la Paix, Paris',
    totalAmount: 12.50,
    estimatedArrival: '15 min',
    category: '🛒',
  },
  {
    id: '2',
    serviceName: 'Promener un chien',
    status: 'completed',
    fourmizName: 'Thomas L.',
    fourmizRating: 4.9,
    scheduledTime: '10:00',
    location: 'Parc des Buttes-Chaumont',
    totalAmount: 15.00,
    completedAt: 'Il y a 2h',
    category: '🐾',
    rating: 5,
  },
  {
    id: '3',
    serviceName: 'Montage de meuble IKEA',
    status: 'pending',
    scheduledTime: 'Demain 16:00',
    location: '42 avenue Victor Hugo',
    totalAmount: 25.00,
    category: '🛠️',
  },
];

const statusConfig = {
  pending: { label: 'En attente', color: '#FF9800', icon: Clock },
  accepted: { label: 'Acceptée', color: '#2196F3', icon: CheckCircle },
  in_progress: { label: 'En cours', color: '#4CAF50', icon: Clock },
  completed: { label: 'Terminée', color: '#4CAF50', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: '#F44336', icon: XCircle },
};

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  const currentOrders = mockOrders.filter(order => 
    order.status === 'pending' || order.status === 'accepted' || order.status === 'in_progress'
  );
  
  const historyOrders = mockOrders.filter(order => 
    order.status === 'completed' || order.status === 'cancelled'
  );

  const renderOrderCard = ({ item: order }: { item: any }) => {
    const statusInfo = statusConfig[order.status as keyof typeof statusConfig];
    const StatusIcon = statusInfo.icon;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/order/${order.id}`)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.serviceInfo}>
            <Text style={styles.categoryIcon}>{order.category}</Text>
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceName}>{order.serviceName}</Text>
              <View style={styles.statusContainer}>
                <StatusIcon size={14} color={statusInfo.color} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.orderPrice}>{order.totalAmount.toFixed(2)}€</Text>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Clock size={16} color="#666" />
            <Text style={styles.detailText}>
              {order.status === 'completed' ? order.completedAt : order.scheduledTime}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={16} color="#666" />
            <Text style={styles.detailText}>{order.location}</Text>
          </View>
        </View>

        {order.fourmizName && (
          <View style={styles.fourmizInfo}>
            <View style={styles.fourmizDetails}>
              <Text style={styles.fourmizName}>{order.fourmizName}</Text>
              <View style={styles.ratingContainer}>
                <Star size={14} color="#FFD700" fill="#FFD700" />
                <Text style={styles.ratingText}>{order.fourmizRating}</Text>
              </View>
            </View>
            
            {order.status === 'in_progress' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.chatButton}>
                  <MessageCircle size={18} color="#FF4444" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.callButton}>
                  <Phone size={18} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {order.status === 'in_progress' && order.estimatedArrival && (
          <View style={styles.estimatedArrival}>
            <Text style={styles.arrivalText}>
              Arrivée estimée dans {order.estimatedArrival}
            </Text>
          </View>
        )}

        {order.status === 'completed' && order.rating && (
          <View style={styles.completedRating}>
            <Text style={styles.ratingLabel}>Votre note :</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  color="#FFD700"
                  fill={star <= order.rating ? "#FFD700" : "transparent"}
                />
              ))}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes commandes</Text>
        
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'current' && styles.activeTab]}
            onPress={() => setActiveTab('current')}
          >
            <Text style={[styles.tabText, activeTab === 'current' && styles.activeTabText]}>
              En cours ({currentOrders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              Historique ({historyOrders.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Orders List */}
      <FlatList
        data={activeTab === 'current' ? currentOrders : historyOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {activeTab === 'current' ? 'Aucune commande en cours' : 'Aucun historique'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'current' 
                ? 'Vos prochaines commandes apparaîtront ici'
                : 'Vos commandes terminées apparaîtront ici'
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
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 21,
  },
  activeTab: {
    backgroundColor: '#FF4444',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  ordersList: {
    padding: 20,
    gap: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  orderPrice: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FF4444',
  },
  orderDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    flex: 1,
  },
  fourmizInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  fourmizDetails: {
    flex: 1,
  },
  fourmizName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  chatButton: {
    backgroundColor: '#FF444410',
    borderRadius: 20,
    padding: 8,
  },
  callButton: {
    backgroundColor: '#4CAF5010',
    borderRadius: 20,
    padding: 8,
  },
  estimatedArrival: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  arrivalText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1976D2',
    textAlign: 'center',
  },
  completedRating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  ratingLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
});
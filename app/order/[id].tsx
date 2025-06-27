import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Clock, Euro, Star, MessageCircle, Phone, CircleCheck as CheckCircle, Circle as XCircle, CircleAlert as AlertCircle, Eye, Shield, Calendar, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Types pour les commandes
interface Order {
  id: string;
  serviceName: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  clientName: string;
  clientAvatar?: string;
  fourmizName?: string;
  fourmizAvatar?: string;
  fourmizRating?: number;
  scheduledTime: string;
  scheduledDate: string;
  location: string;
  totalAmount: number;
  estimatedDuration: number;
  category: string;
  categoryIcon: string;
  description: string;
  specialInstructions?: string;
  clientRating?: number;
  fourmizRating?: number;
  clientComment?: string;
  fourmizComment?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

// Mock data pour une commande
const mockOrder: Order = {
  id: '1',
  serviceName: 'Livraison de courses Drive',
  status: 'in_progress',
  clientName: 'Jean Dupont',
  clientAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  fourmizName: 'Marie Dubois',
  fourmizAvatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  fourmizRating: 4.8,
  scheduledTime: '14:30',
  scheduledDate: '2024-12-20',
  location: '15 rue de la Paix, 75001 Paris',
  totalAmount: 12.50,
  estimatedDuration: 45,
  category: 'Courses & Achats',
  categoryIcon: '🛒',
  description: 'Récupération courses Carrefour Drive',
  specialInstructions: 'Commande n°123456, retrait à 14h30 précises',
  clientRating: 4.5, // Note du client (visible uniquement par les Fourmiz)
};

const statusConfig = {
  pending: { label: 'En attente', color: '#FF9800', icon: AlertCircle },
  accepted: { label: 'Acceptée', color: '#2196F3', icon: CheckCircle },
  in_progress: { label: 'En cours', color: '#4CAF50', icon: Clock },
  completed: { label: 'Terminée', color: '#4CAF50', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: '#F44336', icon: XCircle },
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [userType, setUserType] = useState<'client' | 'fourmiz'>('fourmiz'); // Simuler un utilisateur Fourmiz
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Simuler le chargement des données de commande
    setOrder(mockOrder);
  }, [id]);

  const handleContactClient = () => {
    if (!order) return;
    
    Alert.alert(
      'Contacter le client',
      `Comment souhaitez-vous contacter ${order.clientName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Message', onPress: () => router.push(`/chat/${order.id}`) },
        { text: 'Appel', onPress: () => console.log('Calling client...') }
      ]
    );
  };

  const handleContactFourmiz = () => {
    if (!order) return;
    
    Alert.alert(
      'Contacter la Fourmiz',
      `Comment souhaitez-vous contacter ${order.fourmizName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Message', onPress: () => router.push(`/chat/${order.id}`) },
        { text: 'Appel', onPress: () => console.log('Calling Fourmiz...') }
      ]
    );
  };

  const handleTrackOrder = () => {
    if (!order) return;
    router.push(`/map/tracking/${order.id}`);
  };

  const handleRateClient = () => {
    if (!order) return;
    router.push({
      pathname: '/order/rate-client',
      params: { id: order.id, clientName: order.clientName }
    });
  };

  const handleRateFourmiz = () => {
    if (!order) return;
    Alert.alert('Évaluation', 'Fonctionnalité d\'évaluation de la Fourmiz à venir.');
  };

  const handleCancelOrder = () => {
    if (!order) return;
    
    Alert.alert(
      'Annuler la commande',
      'Êtes-vous sûr de vouloir annuler cette commande ?',
      [
        { text: 'Non', style: 'cancel' },
        { 
          text: 'Oui, annuler', 
          style: 'destructive',
          onPress: () => {
            setIsLoading(true);
            // Simuler l'annulation
            setTimeout(() => {
              setOrder(prev => prev ? { ...prev, status: 'cancelled', cancelReason: 'Annulée par l\'utilisateur' } : null);
              setIsLoading(false);
            }, 1000);
          }
        }
      ]
    );
  };

  const handleCompleteOrder = () => {
    if (!order) return;
    
    Alert.alert(
      'Terminer la commande',
      'Confirmez-vous que cette commande est terminée ?',
      [
        { text: 'Non', style: 'cancel' },
        { 
          text: 'Oui, terminer', 
          onPress: () => {
            setIsLoading(true);
            // Simuler la complétion
            setTimeout(() => {
              setOrder(prev => prev ? { ...prev, status: 'completed', completedAt: new Date().toISOString() } : null);
              setIsLoading(false);
              
              // Si l'utilisateur est une Fourmiz, proposer d'évaluer le client
              if (userType === 'fourmiz') {
                setTimeout(() => {
                  Alert.alert(
                    'Évaluer le client',
                    'Souhaitez-vous évaluer ce client ?',
                    [
                      { text: 'Plus tard', style: 'cancel' },
                      { text: 'Évaluer maintenant', onPress: handleRateClient }
                    ]
                  );
                }, 500);
              }
            }, 1000);
          }
        }
      ]
    );
  };

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement de la commande...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const StatusIcon = statusConfig[order.status].icon;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de la commande</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status Card */}
        <LinearGradient
          colors={[statusConfig[order.status].color, statusConfig[order.status].color + 'CC']}
          style={styles.statusCard}
        >
          <View style={styles.statusHeader}>
            <StatusIcon size={24} color="#FFFFFF" />
            <Text style={styles.statusText}>{statusConfig[order.status].label}</Text>
          </View>
          
          <Text style={styles.serviceName}>{order.serviceName}</Text>
          
          <View style={styles.statusDetails}>
            <View style={styles.statusDetail}>
              <Calendar size={16} color="#FFFFFF" />
              <Text style={styles.statusDetailText}>
                {new Date(order.scheduledDate).toLocaleDateString('fr-FR')} à {order.scheduledTime}
              </Text>
            </View>
            <View style={styles.statusDetail}>
              <MapPin size={16} color="#FFFFFF" />
              <Text style={styles.statusDetailText}>{order.location}</Text>
            </View>
          </View>
          
          <View style={styles.statusFooter}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Montant</Text>
              <Text style={styles.priceValue}>{order.totalAmount.toFixed(2)}€</Text>
            </View>
            
            {order.status === 'in_progress' && (
              <TouchableOpacity 
                style={styles.trackButton}
                onPress={handleTrackOrder}
              >
                <Eye size={16} color="#FFFFFF" />
                <Text style={styles.trackButtonText}>Suivre</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* Service Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Détails du service</Text>
          
          <View style={styles.serviceCard}>
            <View style={styles.serviceHeader}>
              <Text style={styles.categoryIcon}>{order.categoryIcon}</Text>
              <View style={styles.serviceInfo}>
                <Text style={styles.categoryName}>{order.category}</Text>
                <Text style={styles.serviceDescription}>{order.description}</Text>
              </View>
            </View>
            
            <View style={styles.serviceDetails}>
              <View style={styles.detailItem}>
                <Clock size={16} color="#666" />
                <Text style={styles.detailText}>Durée estimée: {order.estimatedDuration} min</Text>
              </View>
              
              {order.specialInstructions && (
                <View style={styles.instructionsContainer}>
                  <Text style={styles.instructionsLabel}>Instructions spéciales:</Text>
                  <Text style={styles.instructionsText}>{order.specialInstructions}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Client Information - Visible only for Fourmiz */}
        {userType === 'fourmiz' && (
          <View style={styles.personSection}>
            <Text style={styles.sectionTitle}>Client</Text>
            
            <View style={styles.personCard}>
              <View style={styles.personHeader}>
                {order.clientAvatar ? (
                  <Image source={{ uri: order.clientAvatar }} style={styles.personAvatar} />
                ) : (
                  <View style={styles.personAvatarPlaceholder}>
                    <User size={24} color="#FFFFFF" />
                  </View>
                )}
                
                <View style={styles.personInfo}>
                  <Text style={styles.personName}>{order.clientName}</Text>
                  
                  {/* Client Rating - Visible only for Fourmiz */}
                  <View style={styles.ratingContainer}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.ratingText}>{order.clientRating}</Text>
                    <View style={styles.ratingBadge}>
                      <Shield size={10} color="#4CAF50" />
                      <Text style={styles.ratingBadgeText}>Visible uniquement par vous</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.personActions}>
                <TouchableOpacity 
                  style={styles.personAction}
                  onPress={handleContactClient}
                >
                  <MessageCircle size={20} color="#2196F3" />
                  <Text style={styles.personActionText}>Message</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.personAction}
                  onPress={handleContactClient}
                >
                  <Phone size={20} color="#4CAF50" />
                  <Text style={styles.personActionText}>Appeler</Text>
                </TouchableOpacity>
                
                {order.status === 'completed' && !order.fourmizComment && (
                  <TouchableOpacity 
                    style={styles.rateButton}
                    onPress={handleRateClient}
                  >
                    <Star size={20} color="#FFFFFF" />
                    <Text style={styles.rateButtonText}>Évaluer</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Fourmiz Information - Visible only for clients */}
        {userType === 'client' && order.fourmizName && (
          <View style={styles.personSection}>
            <Text style={styles.sectionTitle}>Fourmiz</Text>
            
            <View style={styles.personCard}>
              <View style={styles.personHeader}>
                {order.fourmizAvatar ? (
                  <Image source={{ uri: order.fourmizAvatar }} style={styles.personAvatar} />
                ) : (
                  <View style={styles.personAvatarPlaceholder}>
                    <User size={24} color="#FFFFFF" />
                  </View>
                )}
                
                <View style={styles.personInfo}>
                  <Text style={styles.personName}>{order.fourmizName}</Text>
                  
                  {order.fourmizRating && (
                    <View style={styles.ratingContainer}>
                      <Star size={14} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.ratingText}>{order.fourmizRating}</Text>
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.personActions}>
                <TouchableOpacity 
                  style={styles.personAction}
                  onPress={handleContactFourmiz}
                >
                  <MessageCircle size={20} color="#2196F3" />
                  <Text style={styles.personActionText}>Message</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.personAction}
                  onPress={handleContactFourmiz}
                >
                  <Phone size={20} color="#4CAF50" />
                  <Text style={styles.personActionText}>Appeler</Text>
                </TouchableOpacity>
                
                {order.status === 'completed' && !order.clientComment && (
                  <TouchableOpacity 
                    style={styles.rateButton}
                    onPress={handleRateFourmiz}
                  >
                    <Star size={20} color="#FFFFFF" />
                    <Text style={styles.rateButtonText}>Évaluer</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Order Actions */}
        <View style={styles.actionsSection}>
          {order.status === 'pending' && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelOrder}
              disabled={isLoading}
            >
              <XCircle size={20} color="#F44336" />
              <Text style={styles.cancelButtonText}>
                {isLoading ? 'Annulation...' : 'Annuler la commande'}
              </Text>
            </TouchableOpacity>
          )}
          
          {order.status === 'in_progress' && userType === 'fourmiz' && (
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={handleCompleteOrder}
              disabled={isLoading}
            >
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.completeButtonText}>
                {isLoading ? 'Finalisation...' : 'Marquer comme terminée'}
              </Text>
            </TouchableOpacity>
          )}
          
          {order.status === 'completed' && order.completedAt && (
            <View style={styles.completionInfo}>
              <CheckCircle size={20} color="#4CAF50" />
              <Text style={styles.completionText}>
                Terminée le {new Date(order.completedAt).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
          
          {order.status === 'cancelled' && order.cancelReason && (
            <View style={styles.cancellationInfo}>
              <XCircle size={20} color="#F44336" />
              <Text style={styles.cancellationText}>
                {order.cancelReason}
              </Text>
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  statusCard: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  serviceName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statusDetails: {
    marginBottom: 16,
  },
  statusDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  priceValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  trackButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
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
  serviceCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  serviceHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  serviceDetails: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  instructionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  instructionsLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
  },
  personSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  personCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  personHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  personAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  personAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  personInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  personName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginLeft: 4,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#4CAF50',
  },
  personActions: {
    flexDirection: 'row',
    gap: 8,
  },
  personAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  personActionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  rateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  rateButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  actionsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#F44336',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F44336',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  completeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  completionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#4CAF50',
  },
  cancellationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cancellationText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#F44336',
  },
});
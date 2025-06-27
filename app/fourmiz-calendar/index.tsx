import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Star, ChevronLeft, ChevronRight, Plus, Filter, Eye, MessageCircle, Phone, CircleCheck as CheckCircle, Circle as XCircle, CircleAlert as AlertCircle } from 'lucide-react-native';

// Types pour les missions
interface Mission {
  id: string;
  serviceName: string;
  clientName: string;
  clientAvatar: string;
  date: string;
  time: string;
  duration: number; // en minutes
  location: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  category: string;
  categoryIcon: string;
  description: string;
  clientPhone?: string;
  specialInstructions?: string;
  clientRating?: number; // Note attribuée au client
}

// Mock data pour les missions
const mockMissions: Mission[] = [
  // Missions pour aujourd'hui
  {
    id: '1',
    serviceName: 'Livraison de courses Drive',
    clientName: 'Marie Dubois',
    clientAvatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    date: new Date().toISOString().split('T')[0], // Aujourd'hui
    time: '14:30',
    duration: 45,
    location: '15 rue de la Paix, 75001 Paris',
    status: 'confirmed',
    price: 12.50,
    category: 'Courses & Achats',
    categoryIcon: '🛒',
    description: 'Récupération courses Carrefour Drive',
    clientPhone: '+33 6 12 34 56 78',
    specialInstructions: 'Commande n°123456, retrait à 14h30 précises',
    clientRating: 4.7
  },
  {
    id: '2',
    serviceName: 'Promenade de chien',
    clientName: 'Thomas Martin',
    clientAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    date: new Date().toISOString().split('T')[0], // Aujourd'hui
    time: '16:00',
    duration: 60,
    location: 'Parc des Buttes-Chaumont',
    status: 'pending',
    price: 18.00,
    category: 'Animaux',
    categoryIcon: '🐾',
    description: 'Promenade de Max, Golden Retriever',
    specialInstructions: 'Chien très sociable, aime jouer avec les autres chiens',
    clientRating: 4.2
  },
  {
    id: '3',
    serviceName: 'Nettoyage après fête',
    clientName: 'Alexandre Petit',
    clientAvatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    date: new Date().toISOString().split('T')[0], // Aujourd'hui
    time: '09:00',
    duration: 150,
    location: '25 boulevard Voltaire, 75011 Paris',
    status: 'completed',
    price: 40.00,
    category: 'Bricolage & Nettoyage',
    categoryIcon: '🛠️',
    description: 'Nettoyage appartement 3 pièces',
    specialInstructions: 'Produits de nettoyage fournis',
    clientRating: 4.5
  },
  {
    id: '4',
    serviceName: 'Livraison de colis',
    clientName: 'Julie Moreau',
    clientAvatar: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    date: new Date().toISOString().split('T')[0], // Aujourd'hui
    time: '11:30',
    duration: 30,
    location: '8 rue des Lilas, 75012 Paris',
    status: 'cancelled',
    price: 15.00,
    category: 'Transport',
    categoryIcon: '🚗',
    description: 'Livraison d\'un colis Amazon',
    clientRating: 3.8
  },

  // Missions pour cette semaine
  {
    id: '5',
    serviceName: 'Montage meuble IKEA',
    clientName: 'Sophie Laurent',
    clientAvatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    date: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    })(), // Demain
    time: '10:00',
    duration: 120,
    location: '42 avenue Victor Hugo, 75016 Paris',
    status: 'confirmed',
    price: 35.00,
    category: 'Bricolage & Nettoyage',
    categoryIcon: '🛠️',
    description: 'Montage armoire PAX 3 portes',
    specialInstructions: 'Tous les outils sont fournis',
    clientRating: 4.9
  },
  {
    id: '6',
    serviceName: 'Baby-sitting',
    clientName: 'Julie Moreau',
    clientAvatar: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    date: (() => {
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      return dayAfterTomorrow.toISOString().split('T')[0];
    })(), // Après-demain
    time: '19:00',
    duration: 180,
    location: '8 rue des Lilas, 75012 Paris',
    status: 'confirmed',
    price: 45.00,
    category: 'Aide à la Personne',
    categoryIcon: '🧑‍🤝‍🧑',
    description: 'Garde de Emma (6 ans) et Lucas (4 ans)',
    specialInstructions: 'Coucher à 20h30, histoire avant de dormir',
    clientRating: 4.6
  },
  {
    id: '7',
    serviceName: 'Assistance informatique',
    clientName: 'Pierre Durand',
    clientAvatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    date: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 3);
      return date.toISOString().split('T')[0];
    })(), // Dans 3 jours
    time: '14:00',
    duration: 90,
    location: '17 rue de Rivoli, 75004 Paris',
    status: 'pending',
    price: 30.00,
    category: 'Services numériques',
    categoryIcon: '💻',
    description: 'Configuration PC et imprimante',
    clientRating: 4.3
  },

  // Missions pour ce mois
  {
    id: '8',
    serviceName: 'Déménagement petit studio',
    clientName: 'Lucas Bernard',
    clientAvatar: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    date: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 10);
      return date.toISOString().split('T')[0];
    })(), // Dans 10 jours
    time: '09:00',
    duration: 240,
    location: '29 rue Saint-Antoine, 75004 Paris',
    status: 'confirmed',
    price: 80.00,
    category: 'Déménagement',
    categoryIcon: '📦',
    description: 'Aide au déménagement d\'un studio 20m²',
    specialInstructions: 'Prévoir gants de travail, 3ème étage sans ascenseur',
    clientRating: 4.1
  },
  {
    id: '9',
    serviceName: 'Cours de cuisine',
    clientName: 'Camille Roux',
    clientAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    date: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 15);
      return date.toISOString().split('T')[0];
    })(), // Dans 15 jours
    time: '18:00',
    duration: 120,
    location: '5 rue Montorgueil, 75002 Paris',
    status: 'pending',
    price: 50.00,
    category: 'Cours & Formation',
    categoryIcon: '👨‍🍳',
    description: 'Cours de cuisine italienne pour débutant',
    clientRating: 4.8
  },
  {
    id: '10',
    serviceName: 'Tonte de pelouse',
    clientName: 'Michel Dupont',
    clientAvatar: 'https://images.pexels.com/photos/834863/pexels-photo-834863.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    date: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 20);
      return date.toISOString().split('T')[0];
    })(), // Dans 20 jours
    time: '10:30',
    duration: 60,
    location: '12 avenue des Ternes, 75017 Paris',
    status: 'pending',
    price: 25.00,
    category: 'Jardinage',
    categoryIcon: '🌿',
    description: 'Tonte de pelouse 100m²',
    specialInstructions: 'Tondeuse sur place, prévoir sac poubelle pour déchets verts',
    clientRating: 4.4
  }
];

const statusConfig = {
  pending: { label: 'En attente', color: '#FF9800', icon: AlertCircle },
  confirmed: { label: 'Confirmée', color: '#2196F3', icon: CheckCircle },
  in_progress: { label: 'En cours', color: '#4CAF50', icon: Clock },
  completed: { label: 'Terminée', color: '#4CAF50', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: '#F44336', icon: XCircle },
};

export default function FourmizCalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Générer les dates pour la vue semaine
  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Lundi = début de semaine
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      week.push(currentDate);
    }
    return week;
  };

  // Filtrer les missions selon la date et le statut
  const getFilteredMissions = () => {
    let filtered = mockMissions;

    // Filtrer par date selon le mode de vue
    if (viewMode === 'day') {
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      filtered = filtered.filter(mission => mission.date === selectedDateStr);
    } else if (viewMode === 'week') {
      const weekDates = getWeekDates(selectedDate);
      const weekDateStrs = weekDates.map(date => date.toISOString().split('T')[0]);
      filtered = filtered.filter(mission => weekDateStrs.includes(mission.date));
    }

    // Filtrer par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(mission => mission.status === filterStatus);
    }

    return filtered.sort((a, b) => {
      if (a.date !== b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return a.time.localeCompare(b.time);
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    
    setSelectedDate(newDate);
  };

  const formatDateHeader = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    if (viewMode === 'day') {
      return selectedDate.toLocaleDateString('fr-FR', options);
    } else if (viewMode === 'week') {
      const weekDates = getWeekDates(selectedDate);
      const start = weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const end = weekDates[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      return `${start} - ${end}`;
    } else {
      return selectedDate.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
    }
  };

  const handleMissionAction = (mission: Mission, action: 'accept' | 'decline' | 'contact' | 'view' | 'rate') => {
    switch (action) {
      case 'accept':
        Alert.alert(
          'Accepter la mission',
          `Voulez-vous accepter la mission "${mission.serviceName}" ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Accepter', 
              onPress: () => Alert.alert('Mission acceptée', 'Le client a été notifié de votre acceptation.')
            }
          ]
        );
        break;
      case 'decline':
        Alert.alert(
          'Refuser la mission',
          `Voulez-vous refuser la mission "${mission.serviceName}" ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Refuser', 
              style: 'destructive',
              onPress: () => Alert.alert('Mission refusée', 'Le client a été notifié de votre refus.')
            }
          ]
        );
        break;
      case 'contact':
        Alert.alert(
          'Contacter le client',
          `Contacter ${mission.clientName}`,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Appeler', onPress: () => Alert.alert('Appel', `Appel vers ${mission.clientPhone}`) },
            { text: 'Message', onPress: () => router.push(`/chat/${mission.id}`) }
          ]
        );
        break;
      case 'view':
        router.push(`/order/${mission.id}`);
        break;
      case 'rate':
        showRatingDialog(mission);
        break;
    }
  };

  const showRatingDialog = (mission: Mission) => {
    Alert.alert(
      'Noter le client',
      `Comment évaluez-vous ${mission.clientName} ?`,
      [
        { text: '1 ⭐', onPress: () => submitRating(mission, 1) },
        { text: '2 ⭐⭐', onPress: () => submitRating(mission, 2) },
        { text: '3 ⭐⭐⭐', onPress: () => submitRating(mission, 3) },
        { text: '4 ⭐⭐⭐⭐', onPress: () => submitRating(mission, 4) },
        { text: '5 ⭐⭐⭐⭐⭐', onPress: () => submitRating(mission, 5) },
        { text: 'Annuler', style: 'cancel' }
      ]
    );
  };

  const submitRating = (mission: Mission, rating: number) => {
    Alert.alert(
      'Merci pour votre évaluation !',
      `Vous avez attribué ${rating} étoile${rating > 1 ? 's' : ''} à ${mission.clientName}.`,
      [{ text: 'OK' }]
    );
  };

  const renderMissionCard = ({ item: mission }: { item: Mission }) => {
    const statusInfo = statusConfig[mission.status];
    const StatusIcon = statusInfo.icon;

    return (
      <TouchableOpacity 
        style={styles.missionCard}
        onPress={() => handleMissionAction(mission, 'view')}
      >
        <View style={styles.missionHeader}>
          <View style={styles.missionInfo}>
            <Text style={styles.categoryIcon}>{mission.categoryIcon}</Text>
            <View style={styles.missionDetails}>
              <Text style={styles.serviceName}>{mission.serviceName}</Text>
              <View style={styles.statusContainer}>
                <StatusIcon size={14} color={statusInfo.color} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.missionPrice}>{mission.price.toFixed(2)}€</Text>
        </View>

        <View style={styles.missionContent}>
          <View style={styles.clientInfo}>
            <View style={styles.clientAvatar}>
              <Text style={styles.clientInitial}>{mission.clientName.charAt(0)}</Text>
            </View>
            <View style={styles.clientNameContainer}>
              <Text style={styles.clientName}>{mission.clientName}</Text>
              {mission.clientRating && (
                <View style={styles.clientRating}>
                  <Star size={12} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.clientRatingText}>{mission.clientRating}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.missionMeta}>
            <View style={styles.metaRow}>
              <Clock size={16} color="#666" />
              <Text style={styles.metaText}>
                {mission.time} ({mission.duration} min)
              </Text>
            </View>
            <View style={styles.metaRow}>
              <MapPin size={16} color="#666" />
              <Text style={styles.metaText}>{mission.location}</Text>
            </View>
          </View>

          {mission.specialInstructions && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsLabel}>Instructions :</Text>
              <Text style={styles.instructionsText}>{mission.specialInstructions}</Text>
            </View>
          )}
        </View>

        {mission.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.declineButton}
              onPress={() => handleMissionAction(mission, 'decline')}
            >
              <XCircle size={18} color="#F44336" />
              <Text style={styles.declineButtonText}>Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.acceptButton}
              onPress={() => handleMissionAction(mission, 'accept')}
            >
              <CheckCircle size={18} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Accepter</Text>
            </TouchableOpacity>
          </View>
        )}

        {(mission.status === 'confirmed' || mission.status === 'in_progress') && (
          <View style={styles.contactButtons}>
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => handleMissionAction(mission, 'contact')}
            >
              <MessageCircle size={18} color="#FF4444" />
              <Text style={styles.chatButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={() => handleMissionAction(mission, 'contact')}
            >
              <Phone size={18} color="#4CAF50" />
              <Text style={styles.callButtonText}>Appeler</Text>
            </TouchableOpacity>
          </View>
        )}

        {mission.status === 'completed' && !mission.clientRating && (
          <View style={styles.rateClientButton}>
            <TouchableOpacity 
              style={styles.rateButton}
              onPress={() => handleMissionAction(mission, 'rate')}
            >
              <Star size={18} color="#FFD700" />
              <Text style={styles.rateButtonText}>Noter le client</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filteredMissions = getFilteredMissions();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Calendrier</Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={24} color="#FF4444" />
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <View style={styles.viewModeToggle}>
          {(['day', 'week', 'month'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.viewModeButton, viewMode === mode && styles.viewModeButtonActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.viewModeText, viewMode === mode && styles.viewModeTextActive]}>
                {mode === 'day' ? 'Jour' : mode === 'week' ? 'Semaine' : 'Mois'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigateDate('prev')}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.dateHeader}>
          <CalendarIcon size={20} color="#FF4444" />
          <Text style={styles.dateText}>{formatDateHeader()}</Text>
        </View>
        
        <TouchableOpacity style={styles.navButton} onPress={() => navigateDate('next')}>
          <ChevronRight size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { key: 'all', label: 'Toutes', color: '#666' },
            { key: 'pending', label: 'En attente', color: '#FF9800' },
            { key: 'confirmed', label: 'Confirmées', color: '#2196F3' },
            { key: 'in_progress', label: 'En cours', color: '#4CAF50' },
            { key: 'completed', label: 'Terminées', color: '#4CAF50' },
            { key: 'cancelled', label: 'Annulées', color: '#F44336' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                filterStatus === filter.key && styles.filterButtonActive,
                { borderColor: filter.color }
              ]}
              onPress={() => setFilterStatus(filter.key)}
            >
              <Text style={[
                styles.filterText,
                filterStatus === filter.key && { color: filter.color }
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Missions List */}
      <View style={styles.missionsContainer}>
        <View style={styles.missionsHeader}>
          <Text style={styles.missionsTitle}>
            {filteredMissions.length} mission{filteredMissions.length > 1 ? 's' : ''}
          </Text>
          <Text style={styles.totalEarnings}>
            Total: {filteredMissions.reduce((sum, mission) => sum + mission.price, 0).toFixed(2)}€
          </Text>
        </View>

        <FlatList
          data={filteredMissions}
          renderItem={renderMissionCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.missionsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <CalendarIcon size={64} color="#DDD" />
              <Text style={styles.emptyTitle}>Aucune mission</Text>
              <Text style={styles.emptySubtitle}>
                {viewMode === 'day' 
                  ? 'Aucune mission prévue pour cette journée'
                  : viewMode === 'week'
                  ? 'Aucune mission prévue pour cette semaine'
                  : 'Aucune mission prévue pour ce mois'
                }
              </Text>
            </View>
          }
        />
      </View>
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
  addButton: {
    padding: 8,
  },
  viewModeContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
  },
  viewModeButtonActive: {
    backgroundColor: '#FF4444',
  },
  viewModeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  viewModeTextActive: {
    color: '#FFFFFF',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  navButton: {
    padding: 8,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    textTransform: 'capitalize',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  filterButtonActive: {
    backgroundColor: '#F8F9FA',
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  missionsContainer: {
    flex: 1,
    paddingTop: 16,
  },
  missionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  missionsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  totalEarnings: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
  },
  missionsList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  missionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  missionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  missionDetails: {
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
  missionPrice: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FF4444',
  },
  missionContent: {
    gap: 12,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientInitial: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  clientNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  clientRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  clientRatingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#F57C00',
  },
  missionMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    flex: 1,
  },
  instructionsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  instructionsLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  declineButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#F44336',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF444410',
  },
  chatButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FF4444',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF5010',
  },
  callButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
  },
  rateClientButton: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFF8E1',
  },
  rateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#F57C00',
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
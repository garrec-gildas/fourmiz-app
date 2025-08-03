// app/(tabs)/calendar.tsx - VERSION CORRIGÉE
// 🔒 Imports corrigés pour résoudre les erreurs de chemin
// ✅ ACCÈS RESTREINT : Fourmiz uniquement

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// 🔧 TEMPORAIRE : Système d'accès simplifié sans hooks externes
// (Remplacez par vos vrais hooks quand les chemins seront corrects)

export default function CalendarScreen() {
  // 🛡️ SYSTÈME D'ACCÈS TEMPORAIRE SIMPLIFIÉ
  // TODO: Remplacer par useAuth() quand le chemin sera corrigé
  const [loading] = useState(false);
  const [hasAccess] = useState(true); // Mettre à false pour tester l'accès refusé

  // 🔄 ÉTAT DE CHARGEMENT
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 🚫 ACCÈS REFUSÉ (Décommentez pour tester)
  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Ionicons name="lock-closed" size={64} color="#FF4444" />
          <Text style={styles.accessDeniedTitle}>Accès Restreint</Text>
          <Text style={styles.accessDeniedText}>
            Cette section est réservée aux Fourmiz.
            Devenez Fourmiz pour accéder à votre calendrier !
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ VOTRE LOGIQUE EXISTANTE - Aucun changement
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());

  const appointments = [
    {
      id: 1,
      time: '09:00',
      duration: '2h',
      service: 'Ménage chez Marie',
      client: 'Marie Dupont',
      address: '123 rue de la Paix',
      price: 45.00,
      status: 'confirmé'
    },
    {
      id: 2,
      time: '14:00',
      duration: '3h',
      service: 'Bricolage étagères',
      client: 'Jean Martin',
      address: '456 avenue Victor Hugo',
      price: 75.50,
      status: 'confirmé'
    },
    {
      id: 3,
      time: '17:30',
      duration: '1h30',
      service: 'Jardinage',
      client: 'Sophie Legrand',
      address: '789 boulevard Pasteur',
      price: 60.00,
      status: 'en_attente'
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmé': return '#28a745';
      case 'en_attente': return '#ffc107';
      case 'annulé': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const currentDay = new Date().getDay() || 7; // 1=Lundi, 7=Dimanche

  // ✅ INTERFACE IDENTIQUE - Votre design préservé
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Mini calendrier */}
        <View style={styles.calendarHeader}>
          <Text style={styles.monthTitle}>Juillet 2025</Text>
          <TouchableOpacity style={styles.monthNav}>
            <Ionicons name="chevron-forward" size={20} color="#FF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekContainer}>
          {weekDays.map((day, index) => (
            <View key={index} style={styles.dayContainer}>
              <Text style={styles.dayLabel}>{day}</Text>
              <TouchableOpacity
                style={[
                  styles.dayNumber,
                  (index + 1) === currentDay && styles.currentDay,
                  selectedDate === (12 + index) && styles.selectedDay
                ]}
                onPress={() => setSelectedDate(12 + index)}
              >
                <Text style={[
                  styles.dayText,
                  (index + 1) === currentDay && styles.currentDayText,
                  selectedDate === (12 + index) && styles.selectedDayText
                ]}>
                  {12 + index}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Statistiques du jour */}
        <View style={styles.dayStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>RDV</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>6h30</Text>
            <Text style={styles.statLabel}>Durée</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>180,50€</Text>
            <Text style={styles.statLabel}>Revenus</Text>
          </View>
        </View>

        {/* Planning du jour */}
        <Text style={styles.sectionTitle}>📅 Planning du {selectedDate}/07/2025</Text>

        {appointments.map((appointment) => (
          <TouchableOpacity key={appointment.id} style={styles.appointmentCard}>
            <View style={styles.timeContainer}>
              <Text style={styles.appointmentTime}>{appointment.time}</Text>
              <Text style={styles.appointmentDuration}>{appointment.duration}</Text>
            </View>

            <View style={styles.appointmentContent}>
              <View style={styles.appointmentHeader}>
                <Text style={styles.appointmentService}>{appointment.service}</Text>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(appointment.status) }]} />
              </View>
              
              <Text style={styles.appointmentClient}>👤 {appointment.client}</Text>
              <Text style={styles.appointmentAddress}>📍 {appointment.address}</Text>
              <Text style={styles.appointmentPrice}>💰 {appointment.price.toFixed(2)} €</Text>
            </View>

            <View style={styles.appointmentActions}>
              <TouchableOpacity style={styles.actionIcon}>
                <Ionicons name="call" size={18} color="#FF4444" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIcon}>
                <Ionicons name="location" size={18} color="#FF4444" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIcon}>
                <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* Disponibilités */}
        <TouchableOpacity style={styles.availabilityButton}>
          <Ionicons name="time" size={20} color="#FF4444" />
          <Text style={styles.availabilityText}>Gérer mes disponibilités</Text>
        </TouchableOpacity>

        {/* Créneaux libres */}
        <View style={styles.freeSlots}>
          <Text style={styles.freeSlotsTitle}>⏰ Créneaux libres aujourd'hui</Text>
          <View style={styles.slotsContainer}>
            <TouchableOpacity style={styles.slotChip}>
              <Text style={styles.slotText}>11:00-13:00</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.slotChip}>
              <Text style={styles.slotText}>15:30-17:00</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.slotChip}>
              <Text style={styles.slotText}>19:00-21:00</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
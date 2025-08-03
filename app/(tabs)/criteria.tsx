// app/(tabs)/criteria.tsx - CRITÈRES FOURMIZ - SÉCURISÉ
// 🔒 VERSION MISE À JOUR : Intégration avec roleManager.ts
// ✅ ACCÈS RESTREINT : Fourmiz uniquement

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoleAccess } from '@/hooks/useRoleAccess'; // 🆕 NOUVEAU IMPORT

export default function CriteriaScreen() {
  // 🔒 CONTRÔLE D'ACCÈS SÉCURISÉ - 3 LIGNES SEULEMENT !
  const { hasAccess, authLoading, AccessDeniedScreen, LoadingScreen } = useRoleAccess('fourmiz');
  
  if (authLoading) return <LoadingScreen />;
  if (!hasAccess) return <AccessDeniedScreen />;

  // ✅ VOTRE LOGIQUE EXISTANTE - Aucun changement
  const [criteria, setCriteria] = useState({
    minPrice: 15,
    maxDistance: 5,
    workWeekends: true,
    workEvenings: false,
    instantBooking: true,
    clientRating: 4.0,
  });

  const [serviceTypes, setServiceTypes] = useState({
    menage: true,
    bricolage: true,
    jardinage: false,
    garde_enfants: false,
    livraison: false,
    cours: false,
  });

  const toggleServiceType = (service: string) => {
    setServiceTypes(prev => ({
      ...prev,
      [service]: !prev[service as keyof typeof prev]
    }));
  };

  const updateCriteria = (key: string, value: any) => {
    setCriteria(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const serviceTypesList = [
    { key: 'menage', label: 'Ménage', icon: '🧹' },
    { key: 'bricolage', label: 'Bricolage', icon: '🔧' },
    { key: 'jardinage', label: 'Jardinage', icon: '🌱' },
    { key: 'garde_enfants', label: 'Garde d\'enfants', icon: '👶' },
    { key: 'livraison', label: 'Livraison', icon: '📦' },
    { key: 'cours', label: 'Cours particuliers', icon: '📚' },
  ];

  // ✅ INTERFACE IDENTIQUE - Votre design préservé
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>⚙️ Mes critères de service</Text>
        <Text style={styles.pageSubtitle}>
          Définissez vos préférences pour recevoir les bonnes missions
        </Text>

        {/* Types de services */}
        <Text style={styles.sectionTitle}>🛠️ Types de services</Text>
        <View style={styles.servicesGrid}>
          {serviceTypesList.map((service) => (
            <TouchableOpacity
              key={service.key}
              style={[
                styles.serviceCard,
                serviceTypes[service.key as keyof typeof serviceTypes] && styles.serviceCardActive
              ]}
              onPress={() => toggleServiceType(service.key)}
            >
              <Text style={styles.serviceIcon}>{service.icon}</Text>
              <Text style={[
                styles.serviceLabel,
                serviceTypes[service.key as keyof typeof serviceTypes] && styles.serviceLabelActive
              ]}>
                {service.label}
              </Text>
              {serviceTypes[service.key as keyof typeof serviceTypes] && (
                <Ionicons name="checkmark-circle" size={16} color="#FF4444" style={styles.checkIcon} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tarifs et distance */}
        <Text style={styles.sectionTitle}>💰 Tarifs et distance</Text>
        
        <View style={styles.criteriaCard}>
          <View style={styles.criteriaRow}>
            <Text style={styles.criteriaLabel}>Prix minimum par heure</Text>
            <View style={styles.priceSelector}>
              <TouchableOpacity
                style={styles.priceButton}
                onPress={() => updateCriteria('minPrice', Math.max(10, criteria.minPrice - 1))}
              >
                <Ionicons name="remove" size={16} color="#FF4444" />
              </TouchableOpacity>
              <Text style={styles.priceValue}>{criteria.minPrice}€</Text>
              <TouchableOpacity
                style={styles.priceButton}
                onPress={() => updateCriteria('minPrice', Math.min(50, criteria.minPrice + 1))}
              >
                <Ionicons name="add" size={16} color="#FF4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.criteriaRow}>
            <Text style={styles.criteriaLabel}>Distance maximum</Text>
            <View style={styles.priceSelector}>
              <TouchableOpacity
                style={styles.priceButton}
                onPress={() => updateCriteria('maxDistance', Math.max(1, criteria.maxDistance - 1))}
              >
                <Ionicons name="remove" size={16} color="#FF4444" />
              </TouchableOpacity>
              <Text style={styles.priceValue}>{criteria.maxDistance}km</Text>
              <TouchableOpacity
                style={styles.priceButton}
                onPress={() => updateCriteria('maxDistance', Math.min(20, criteria.maxDistance + 1))}
              >
                <Ionicons name="add" size={16} color="#FF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Disponibilités */}
        <Text style={styles.sectionTitle}>⏰ Disponibilités</Text>
        <View style={styles.criteriaCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Travailler le week-end</Text>
              <Text style={styles.switchSubtext}>Samedi et dimanche</Text>
            </View>
            <Switch
              value={criteria.workWeekends}
              onValueChange={(value) => updateCriteria('workWeekends', value)}
              trackColor={{ false: '#ddd', true: '#FF4444' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Travailler le soir</Text>
              <Text style={styles.switchSubtext}>Après 18h</Text>
            </View>
            <Switch
              value={criteria.workEvenings}
              onValueChange={(value) => updateCriteria('workEvenings', value)}
              trackColor={{ false: '#ddd', true: '#FF4444' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Réservation instantanée</Text>
              <Text style={styles.switchSubtext}>Accepter les demandes immédiates</Text>
            </View>
            <Switch
              value={criteria.instantBooking}
              onValueChange={(value) => updateCriteria('instantBooking', value)}
              trackColor={{ false: '#ddd', true: '#FF4444' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Exigences clients */}
        <Text style={styles.sectionTitle}>⭐ Exigences clients</Text>
        <View style={styles.criteriaCard}>
          <View style={styles.criteriaRow}>
            <Text style={styles.criteriaLabel}>Note minimum des clients</Text>
            <View style={styles.ratingSelector}>
              {[3.0, 3.5, 4.0, 4.5, 5.0].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    criteria.clientRating === rating && styles.ratingButtonActive
                  ]}
                  onPress={() => updateCriteria('clientRating', rating)}
                >
                  <Text style={[
                    styles.ratingText,
                    criteria.clientRating === rating && styles.ratingTextActive
                  ]}>
                    {rating}⭐
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Bouton sauvegarder */}
        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveButtonText}>💾 Sauvegarder mes critères</Text>
        </TouchableOpacity>

        {/* Résumé */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📊 Résumé de vos critères</Text>
          <Text style={styles.summaryText}>
            • {Object.values(serviceTypes).filter(Boolean).length} types de services
          </Text>
          <Text style={styles.summaryText}>
            • À partir de {criteria.minPrice}€/h dans un rayon de {criteria.maxDistance}km
          </Text>
          <Text style={styles.summaryText}>
            • {criteria.workWeekends ? 'Disponible' : 'Non disponible'} le week-end
          </Text>
          <Text style={styles.summaryText}>
            • Clients avec note ≥ {criteria.clientRating}⭐
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ✅ STYLES IDENTIQUES - Aucune modification
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  pageSubtitle: { fontSize: 16, color: '#666', marginBottom: 24, lineHeight: 22 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, marginTop: 8 },
  
  // Services grid
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  serviceCardActive: {
    backgroundColor: '#fff5f5',
    borderColor: '#FF4444',
  },
  serviceIcon: { fontSize: 32, marginBottom: 8 },
  serviceLabel: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center' },
  serviceLabelActive: { color: '#FF4444' },
  checkIcon: { position: 'absolute', top: 8, right: 8 },

  // Criteria cards
  criteriaCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  criteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  criteriaLabel: { fontSize: 16, color: '#333', flex: 1 },
  
  // Price selector
  priceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
  },
  priceButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
    minWidth: 40,
    textAlign: 'center',
  },

  // Switch rows
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchInfo: { flex: 1 },
  switchLabel: { fontSize: 16, color: '#333', marginBottom: 2 },
  switchSubtext: { fontSize: 14, color: '#666' },

  // Rating selector
  ratingSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  ratingButtonActive: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  ratingText: { fontSize: 12, color: '#666' },
  ratingTextActive: { color: '#fff' },

  // Save button
  saveButton: {
    backgroundColor: '#FF4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },

  // Summary
  summaryCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  summaryText: { fontSize: 14, color: '#666', marginBottom: 4 },
});
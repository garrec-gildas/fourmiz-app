// app/(tabs)/services.tsx - SERVICES - VERSION LIBRE SANS RESTRICTION
// ✅ ACCÈS LIBRE : Tous les utilisateurs connectés
// 🛠️ SUPPRESSION DU CONTRÔLE D'ACCÈS RESTRICTIF

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function ServicesScreen() {
  // ✅ ÉTATS REACT - TOUS DÉCLARÉS EN PREMIER
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 🔒 AUTHENTIFICATION SIMPLE SANS RESTRICTION DE RÔLE
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('❌ Erreur chargement utilisateur:', error);
      } finally {
        setAuthLoading(false);
      }
    };
    loadUser();
  }, []);

  // ✅ CONDITION DE CHARGEMENT SIMPLE
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ Rafraîchir la page
  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // ✅ Navigation CORRIGÉE - VRAIS CHEMINS DE VOTRE PROJET
  const navigateToServicesList = () => {
    console.log('🛍️ Navigation vers liste des services');
    router.push('/(tabs)/services-list');
  };

  // ✅ Navigation CORRIGÉE - VRAIS CHEMINS DE VOTRE PROJET
  const navigateToCustomRequest = () => {
    console.log('📝 Navigation vers demande personnalisée');
    router.push('/orders/create-custom');
  };

  // ✅ Navigation CORRIGÉE - VRAIS CHEMINS DE VOTRE PROJET
  const navigateToSearch = () => {
    console.log('🔍 Navigation vers recherche');
    router.push('/(tabs)/services-list');
  };

  // ✅ INTERFACE IDENTIQUE - Votre design préservé
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Services</Text>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={navigateToSearch}
        >
          <Ionicons name="search-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Section d'introduction */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>
            De quoi avez-vous besoin ? 🤔
          </Text>
          <Text style={styles.introSubtitle}>
            Choisissez un service existant ou créez une demande personnalisée
          </Text>
        </View>

        {/* Options principales - Choisir ou créer */}
        <View style={styles.mainOptionsSection}>
          
          {/* Option 1: Choisir un service existant */}
          <TouchableOpacity
            style={styles.mainOptionCard}
            onPress={navigateToServicesList}
            activeOpacity={0.8}
          >
            <View style={styles.mainOptionIconContainer}>
              <View style={[styles.mainOptionIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="grid-outline" size={32} color="#2196F3" />
              </View>
            </View>
            
            <View style={styles.mainOptionContent}>
              <Text style={styles.mainOptionTitle}>
                Choisir un service
              </Text>
              <Text style={styles.mainOptionDescription}>
                Parcourez nos services organisés par catégories et trouvez celui qui correspond à vos besoins
              </Text>
              
              <View style={styles.mainOptionFeatures}>
                <Text style={styles.mainOptionFeature}>✅ Services vérifiés</Text>
                <Text style={styles.mainOptionFeature}>✅ Tarifs transparents</Text>
                <Text style={styles.mainOptionFeature}>✅ Fourmiz qualifiés</Text>
              </View>
            </View>

            <View style={styles.mainOptionArrow}>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </View>
          </TouchableOpacity>

          {/* Option 2: Créer une demande personnalisée */}
          <TouchableOpacity
            style={styles.mainOptionCard}
            onPress={navigateToCustomRequest}
            activeOpacity={0.8}
          >
            <View style={styles.mainOptionIconContainer}>
              <View style={[styles.mainOptionIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="create-outline" size={32} color="#FF9800" />
              </View>
            </View>
            
            <View style={styles.mainOptionContent}>
              <Text style={styles.mainOptionTitle}>
                Demande personnalisée
              </Text>
              <Text style={styles.mainOptionDescription}>
                Votre besoin est spécifique ? Décrivez-nous ce que vous recherchez et recevez des propositions sur mesure
              </Text>
              
              <View style={styles.mainOptionFeatures}>
                <Text style={styles.mainOptionFeature}>🎯 Solutions sur mesure</Text>
                <Text style={styles.mainOptionFeature}>💬 Communication directe</Text>
                <Text style={styles.mainOptionFeature}>⚡ Réponse rapide</Text>
              </View>
            </View>

            <View style={styles.mainOptionArrow}>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section d'aide */}
        <View style={styles.helpSection}>
          <View style={styles.helpCard}>
            <View style={styles.helpHeader}>
              <Ionicons name="help-circle-outline" size={24} color="#4CAF50" />
              <Text style={styles.helpTitle}>Comment ça marche ?</Text>
            </View>
            
            <View style={styles.helpSteps}>
              <View style={styles.helpStep}>
                <View style={styles.helpStepNumber}>
                  <Text style={styles.helpStepNumberText}>1</Text>
                </View>
                <Text style={styles.helpStepText}>
                  <Text style={styles.helpStepBold}>Choisissez</Text> un service ou créez une demande
                </Text>
              </View>
              
              <View style={styles.helpStep}>
                <View style={styles.helpStepNumber}>
                  <Text style={styles.helpStepNumberText}>2</Text>
                </View>
                <Text style={styles.helpStepText}>
                  <Text style={styles.helpStepBold}>Décrivez</Text> vos besoins et votre budget
                </Text>
              </View>
              
              <View style={styles.helpStep}>
                <View style={styles.helpStepNumber}>
                  <Text style={styles.helpStepNumberText}>3</Text>
                </View>
                <Text style={styles.helpStepText}>
                  <Text style={styles.helpStepBold}>Recevez</Text> des propositions de Fourmiz qualifiés
                </Text>
              </View>
              
              <View style={styles.helpStep}>
                <View style={styles.helpStepNumber}>
                  <Text style={styles.helpStepNumberText}>4</Text>
                </View>
                <Text style={styles.helpStepText}>
                  <Text style={styles.helpStepBold}>Sélectionnez</Text> et planifiez avec votre Fourmiz
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section de contact */}
        <View style={styles.contactSection}>
          <TouchableOpacity 
            style={styles.contactCard}
            onPress={() => {
              Alert.alert(
                'Besoin d\'aide ?',
                'Notre équipe est là pour vous accompagner !',
                [
                  { text: 'Envoyer un message', onPress: () => router.push('/(tabs)/messages') },
                  { text: 'Annuler', style: 'cancel' }
                ]
              );
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FF4444" />
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>Besoin d'aide ?</Text>
              <Text style={styles.contactDescription}>
                Notre équipe vous accompagne dans votre recherche
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ✅ STYLES IDENTIQUES - Aucune modification + AJOUT DU STYLE LOADING
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // ✅ AJOUT : Styles pour le chargement
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },

  // Header
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },

  scrollView: {
    flex: 1,
  },

  // Introduction
  introSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Options principales
  mainOptionsSection: {
    paddingHorizontal: 20,
    gap: 20,
    marginBottom: 24,
  },
  mainOptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mainOptionIconContainer: {
    marginRight: 16,
  },
  mainOptionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainOptionContent: {
    flex: 1,
  },
  mainOptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  mainOptionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  mainOptionFeatures: {
    gap: 4,
  },
  mainOptionFeature: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  mainOptionArrow: {
    marginLeft: 12,
  },

  // Section d'aide
  helpSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  helpCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  helpSteps: {
    gap: 12,
  },
  helpStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  helpStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  helpStepNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  helpStepText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
    flex: 1,
  },
  helpStepBold: {
    fontWeight: 'bold',
  },

  // Section contact
  contactSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  contactContent: {
    flex: 1,
    marginLeft: 16,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 32,
  },
});
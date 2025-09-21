// app/(tabs)/services.tsx - VERSION AVEC STYLE ÉPURÉ COHÉRENT
// ✅ ACCÈS LIBRE : tous les utilisateurs connectés
// 🎨 STYLE ALIGNÉ SUR LE DESIGN ÉPURÉ DES ORDERS
// ❌ HEADER LOGO SUPPRIMÉ

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
  // ⚛️ ÉTATS REACT - TOUS DÉCLARÉS EN PREMIER
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showHelpSteps, setShowHelpSteps] = useState(false); // État pour l'accordéon
  const [showContactOptions, setShowContactOptions] = useState(false); // État pour l'accordéon contact

  // 🔐 AUTHENTIFICATION SIMPLE SANS RESTRICTION DE RÔLE
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

  // ⏳ CONDITION DE CHARGEMENT SIMPLE
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 🔄 Rafraîchir la page
  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // 🧭 Navigation CORRIGÉE - VRAIS CHEMINS DE VOTRE PROJET 
  const navigateToServicesList = () => {
    console.log('📋 Navigation vers liste des services');
    router.push('/(tabs)/services-list');
  };

  const navigateToCustomRequest = () => {
    console.log('✏️ Navigation vers demande personnalisée');
    router.push('/orders/create-custom');
  };

  const navigateToSearch = () => {
    console.log('🔍 Navigation vers recherche');
    router.push('/(tabs)/services-list');
  };

  // 🎨 INTERFACE AVEC STYLE ÉPURÉ
  return (
    <SafeAreaView style={styles.container}>
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
            Chercher un service
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
              <View style={styles.mainOptionIcon}>
                <Ionicons name="grid-outline" size={20} color="#000000" />
              </View>
            </View>
            
            <View style={styles.mainOptionContent}>
              <Text style={styles.mainOptionTitle}>
                Quel service souhaitez-vous ?
              </Text>
              <Text style={styles.mainOptionDescription}>
                Sélectionnez le service qui vous convient
              </Text>
            </View>

            <View style={styles.mainOptionArrow}>
              <Ionicons name="chevron-forward" size={20} color="#333333" />
            </View>
          </TouchableOpacity>

          {/* Option 2: Créer une demande personnalisée */}
          <TouchableOpacity
            style={styles.mainOptionCard}
            onPress={navigateToCustomRequest}
            activeOpacity={0.8}
          >
            <View style={styles.mainOptionIconContainer}>
              <View style={styles.mainOptionIcon}>
                <Ionicons name="create-outline" size={20} color="#000000" />
              </View>
            </View>
            
            <View style={styles.mainOptionContent}>
              <Text style={styles.mainOptionTitle}>
                Avez-vous une demande spécifique ?
              </Text>
              <Text style={styles.mainOptionDescription}>
                Décrivez votre recherche, Fourmiz réalisera la mission
              </Text>
            </View>

            <View style={styles.mainOptionArrow}>
              <Ionicons name="chevron-forward" size={20} color="#333333" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section d'aide avec accordéon */}
        <View style={styles.helpSection}>
          <View style={styles.helpCard}>
            <TouchableOpacity 
              style={styles.helpHeader}
              onPress={() => setShowHelpSteps(!showHelpSteps)}
              activeOpacity={0.7}
            >
              <Ionicons name="help-circle-outline" size={20} color="#000000" />
              <Text style={styles.helpTitle}>Comment ça marche ?</Text>
              <View style={styles.helpExpandButton}>
                <Ionicons 
                  name={showHelpSteps ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#666666" 
                />
              </View>
            </TouchableOpacity>
            
            {showHelpSteps && (
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
            )}
          </View>
        </View>

        {/* Section de contact avec accordéon */}
        <View style={styles.contactSection}>
          <View style={styles.contactCard}>
            <TouchableOpacity 
              style={styles.contactHeader}
              onPress={() => setShowContactOptions(!showContactOptions)}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#000000" />
              <Text style={styles.contactTitle}>Besoin d'aide ?</Text>
              <View style={styles.contactExpandButton}>
                <Ionicons 
                  name={showContactOptions ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#666666" 
                />
              </View>
            </TouchableOpacity>
            
            {showContactOptions && (
              <View style={styles.contactOptions}>
                <TouchableOpacity 
                  style={styles.contactOption}
                  onPress={() => router.push('/(tabs)/messages')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail-outline" size={16} color="#000000" />
                  <View style={styles.contactOptionContent}>
                    <Text style={styles.contactOptionTitle}>Envoyer un message</Text>
                    <Text style={styles.contactOptionDescription}>
                      Contactez notre équipe support
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#666666" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.contactOption}
                  onPress={() => Alert.alert('FAQ', 'Section FAQ disponible prochainement')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="help-circle-outline" size={16} color="#000000" />
                  <View style={styles.contactOptionContent}>
                    <Text style={styles.contactOptionTitle}>Questions fréquentes</Text>
                    <Text style={styles.contactOptionDescription}>
                      Trouvez des réponses rapides
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#666666" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.contactOption}
                  onPress={() => Alert.alert('Support', 'Support téléphonique disponible de 9h à 18h')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={16} color="#000000" />
                  <View style={styles.contactOptionContent}>
                    <Text style={styles.contactOptionTitle}>Appel téléphonique</Text>
                    <Text style={styles.contactOptionDescription}>
                      Support direct 9h-18h
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#666666" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// 🎨 STYLES ÉPURÉS COHÉRENTS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // ⏳ Styles pour le chargement 
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },

  scrollView: {
    flex: 1,
  },

  // Introduction avec style épuré
  introSection: {
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  introSubtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },

  // Options principales avec style épuré
  mainOptionsSection: {
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 20,
  },
  mainOptionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mainOptionIconContainer: {
    marginRight: 16,
  },
  mainOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  mainOptionContent: {
    flex: 1,
  },
  mainOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  mainOptionDescription: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 20,
    fontWeight: '400',
  },
  mainOptionArrow: {
    marginLeft: 12,
  },

  // Section d'aide avec style épuré et accordéon
  helpSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  helpCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0, // Supprimé le margin quand fermé
    gap: 8,
    paddingVertical: 4,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  helpExpandButton: {
    padding: 4,
  },
  helpSteps: {
    gap: 12,
    marginTop: 16, // Ajout d'un margin quand ouvert
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  helpStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  helpStepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  helpStepNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  helpStepText: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 20,
    flex: 1,
    fontWeight: '400',
  },
  helpStepBold: {
    fontWeight: '600',
  },

  // Section contact avec style épuré et accordéon
  contactSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  contactExpandButton: {
    padding: 4,
  },
  contactOptions: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  contactOptionContent: {
    flex: 1,
  },
  contactOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  contactOptionDescription: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    fontWeight: '400',
  },

  bottomSpacer: {
    height: 32,
  },
});
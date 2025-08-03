// components/FourmizValidationView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface PendingValidation {
  assignment_id: number;
  service_title: string;
  client_name: string;
  client_email: string;
  client_code: string;
  proposed_budget: number;
  mission_created_at: string;
  validation_status: string;
}

interface ValidatedMission {
  assignment_id: number;
  service_title: string;
  client_name: string;
  proposed_budget: number;
  validated_at: string;
  payment_triggered: boolean;
}

interface FourmizValidationViewProps {
  fourmizId: string;
}

export const FourmizValidationView: React.FC<FourmizValidationViewProps> = ({
  fourmizId
}) => {
  const [pendingValidations, setPendingValidations] = useState<PendingValidation[]>([]);
  const [validatedMissions, setValidatedMissions] = useState<ValidatedMission[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'validated'>('pending');

  // Récupérer les missions en attente de validation
  const fetchPendingValidations = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_validations')
        .select('*')
        .eq('fourmiz_id', fourmizId)
        .order('mission_created_at', { ascending: false });

      if (error) throw error;
      setPendingValidations(data || []);
    } catch (error) {
      console.error('Erreur récupération validations en attente:', error);
      Alert.alert('Erreur', 'Impossible de charger les missions en attente');
    }
  };

  // Récupérer les missions validées
  const fetchValidatedMissions = async () => {
    try {
      const { data, error } = await supabase
        .from('validated_missions')
        .select('*')
        .eq('fourmiz_id', fourmizId)
        .order('validated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setValidatedMissions(data || []);
    } catch (error) {
      console.error('Erreur récupération missions validées:', error);
      Alert.alert('Erreur', 'Impossible de charger les missions validées');
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchPendingValidations(),
      fetchValidatedMissions()
    ]);
    setLoading(false);
  }, [fourmizId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
    
    // Actualiser toutes les 30 secondes pour les nouveaux paiements
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleContactClient = (clientEmail: string, clientName: string) => {
    Alert.alert(
      'Contacter le client',
      `Voulez-vous contacter ${clientName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Email', 
          onPress: () => {
            // Logique pour ouvrir l'app email
            console.log(`Contacter: ${clientEmail}`);
          }
        }
      ]
    );
  };

  const renderPendingValidations = () => (
    <View style={styles.tabContent}>
      {pendingValidations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>Aucune mission en attente</Text>
          <Text style={styles.emptySubtitle}>
            Les missions terminées apparaîtront ici en attendant la validation du client
          </Text>
        </View>
      ) : (
        pendingValidations.map((validation) => (
          <View key={validation.assignment_id} style={styles.validationCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.serviceTitle}>{validation.service_title}</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>En attente</Text>
              </View>
            </View>
            
            <Text style={styles.clientInfo}>
              👤 Client: {validation.client_name}
            </Text>
            
            <Text style={styles.budgetInfo}>
              💰 Budget: {validation.proposed_budget}€
            </Text>
            
            <Text style={styles.dateInfo}>
              📅 Terminé le: {new Date(validation.mission_created_at).toLocaleDateString('fr-FR')}
            </Text>

            <View style={styles.codeSection}>
              <Text style={styles.codeLabel}>🔐 Code client requis:</Text>
              <Text style={styles.clientCode}>{validation.client_code}</Text>
            </View>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleContactClient(validation.client_email, validation.client_name)}
            >
              <Ionicons name="mail-outline" size={16} color="#007bff" />
              <Text style={styles.contactText}>Contacter le client</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  const renderValidatedMissions = () => (
    <View style={styles.tabContent}>
      {validatedMissions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>Aucune mission validée</Text>
          <Text style={styles.emptySubtitle}>
            Vos missions validées apparaîtront ici
          </Text>
        </View>
      ) : (
        validatedMissions.map((mission) => (
          <View key={mission.assignment_id} style={styles.missionCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.serviceTitle}>{mission.service_title}</Text>
              <View style={[
                styles.statusBadge,
                mission.payment_triggered ? styles.paidBadge : styles.processingBadge
              ]}>
                <Text style={[
                  styles.statusText,
                  mission.payment_triggered ? styles.paidText : styles.processingText
                ]}>
                  {mission.payment_triggered ? 'Payé' : 'En cours'}
                </Text>
              </View>
            </View>
            
            <Text style={styles.clientInfo}>
              👤 Client: {mission.client_name}
            </Text>
            
            <Text style={styles.budgetInfo}>
              💰 Montant: {mission.proposed_budget}€
            </Text>
            
            <Text style={styles.dateInfo}>
              ✅ Validé le: {new Date(mission.validated_at).toLocaleDateString('fr-FR')}
            </Text>

            {mission.payment_triggered && (
              <View style={styles.paymentInfo}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.paymentText}>Paiement effectué</Text>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header avec tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            En attente ({pendingValidations.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'validated' && styles.activeTab]}
          onPress={() => setActiveTab('validated')}
        >
          <Text style={[styles.tabText, activeTab === 'validated' && styles.activeTabText]}>
            Validées ({validatedMissions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4444" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'pending' && renderPendingValidations()}
            {activeTab === 'validated' && renderValidatedMissions()}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FF4444',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  
  // Contenu
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Cards communes
  validationCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  missionCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  
  // Badges
  pendingBadge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paidBadge: {
    backgroundColor: '#28a745',
  },
  processingBadge: {
    backgroundColor: '#17a2b8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  paidText: {
    color: '#fff',
  },
  processingText: {
    color: '#fff',
  },
  
  // Infos mission
  clientInfo: {
    fontSize: 14,
    color: '#007bff',
    marginBottom: 4,
  },
  budgetInfo: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    marginBottom: 4,
  },
  dateInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  
  // Section code
  codeSection: {
    backgroundColor: '#e8f4fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  codeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  clientCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  
  // Boutons
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f4fd',
    padding: 8,
    borderRadius: 6,
  },
  contactText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Info paiement
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  paymentText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    marginLeft: 4,
  },
});
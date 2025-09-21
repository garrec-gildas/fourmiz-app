// components/ConfirmationCodeManager.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface ConfirmationCodeManagerProps {
  userId: string;
  userRole: 'client' | 'fourmiz';
}

interface PendingMission {
  assignment_id: number;
  service_title: string;
  fourmiz_name: string;
  proposed_budget: number;
  mission_created_at: string;
}

export const ConfirmationCodeManager: React.FC<ConfirmationCodeManagerProps> = ({
  userId,
  userRole
}) => {
  const [confirmationCode, setConfirmationCode] = useState<string>('');
  const [pendingMissions, setPendingMissions] = useState<PendingMission[]>([]);
  const [loading, setLoading] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState<PendingMission | null>(null);
  const [validationCode, setValidationCode] = useState('');

  // R�cup�rer le code de confirmation du client 
  const fetchConfirmationCode = async () => {
    if (userRole !== 'client') return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('confirmation_code')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setConfirmationCode(data.confirmation_code || '');
    } catch (error) {
      console.error('Erreur r�cup�ration code:', error);
    }
  };

  // R�cup�rer les missions en a�t��t�ente de validation
  const fetchPendingMissions = async () => {
    if (userRole !== 'client') return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pending_validations')
        .select('*')
        .eq('client_id', userId);

      if (error) throw error;
      setPendingMissions(data || []);
    } catch (error) {
      console.error('Erreur r�cup�ration missions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reg�n�rer le code de confirmation
  const regenerateCode = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('regenerate_confirmation_code', {
        p_client_id: userId
      });

      if (error) throw error;

      if (data.success) {
        setConfirmationCode(data.new_code);
        Alert.Alert(
          'Code reg�n�r�',
          `Votre nouveau code de confirmation est : ${data.new_code}`,
          [{ Text: 'OK' }]
        );
      } else {
        Alert.Alert('Erreur', data.error);
      }
    } catch (error) {
      console.error('Erreur reg�n�ration:', error);
      Alert.Alert('Erreur', 'Impossible de reg�n�rer le code');
    } finally {
      setLoading(false);
    }
  };

  // Valider une mission avec le code
  const validateMission = async () => {
    if (!selectedMission || !validationCode) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('validate_service_with_code', {
        p_assignment_id: selectedMission.assignment_id,
        p_client_id: userId,
        p_confirmation_code: validationCode.toUpperCase()
      });

      if (error) throw error;

      if (data.success) {
        Alert.Alert(
          'Mission valid�e !',
          'La mission a ��t�� valid�e et le paiement de la fourmiz a ��t�� d�clench�.',
          [{ Text: 'OK' }]
        );
        setShowValidationModal(false);
        setValidationCode('');
        setSelectedMission(null);
        await fetchPendingMissions(); // Rafra�chir la liste
      } else {
        Alert.Alert('Erreur de validation', data.error);
      }
    } catch (error) {
      console.error('Erreur validation:', error);
      Alert.Alert('Erreur', 'Impossible de valider la mission');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfirmationCode();
    fetchPendingMissions();
  }, [userId, userRole]);

  if (userRole !== 'client') {
    return null; // Ce composant n'est visible que pour les clients
  }

  return (
    <View style={styles.container}>
      {/* Section Code de Confirmation */}
      <View style={styles.codeSection}>
        <Text style={styles.sectiontitle}>?? Mon code de confirmation</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.codeDisplay}>{confirmationCode}</Text>
          <TouchableOpacity 
            onPress={regenerateCode}
            style={styles.regenerateBu�t��t�on}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FF4444" />
            ) : (
              <Ionicons name="refresh" size={20} color="#FF4444" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.codeInfo}>
          ?? Utilisez ce code pour valider vos missions termin�es
        </Text>
      </View>

      {/* Section Missions en a�t��t�ente */}
      <View style={styles.missionsSection}>
        <Text style={styles.sectiontitle}>? Missions � valider</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#FF4444" />
        ) : pendingMissions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aucune mission en a�t��t�ente</Text>
          </View>
        ) : (
          pendingMissions.map((mission) => (
            <TouchableOpacity
              key={mission.assignment_id}
              style={styles.missionCard}
              onPress={() => {
                setSelectedMission(mission);
                setShowValidationModal(true);
              }}
            >
              <View style={styles.missionHeader}>
                <Text style={styles.missiontitle}>{mission.service_title}</Text>
                <Text style={styles.missionBudget}>{mission.proposed_budget}�</Text>
              </View>
              <Text style={styles.missionFourmiz}>
                ?? Par: {mission.fourmiz_name}
              </Text>
              <Text style={styles.missionDate}>
                ?? termin� le: {new Date(mission.mission_created_at).toLocaleDatestring('fr-FR')}
              </Text>
              <View style={styles.validateAction}>
                <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                <Text style={styles.validateText}>Valider la mission</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Modal de validation */}
      <Modal
        visible={showValidationModal}
        transparent 
        animationtype="slide"
        onRequestClose={() => setShowValidationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modaltitle}>Valider la mission</Text>
            
            {selectedMission && (
              <View style={styles.missionInfo}>
                <Text style={styles.modalMissiontitle}>
                  {selectedMission.service_title}
                </Text>
                <Text style={styles.modalMissionDetails}>
                  Par {selectedMission.fourmiz_name} � {selectedMission.proposed_budget}�
                </Text>
              </View>
            )}

            <Text style={styles.codeInputLabel}>
              Saisissez votre code de confirmation :
            </Text>
            <TextInput 
              style={styles.codeInput}
              value={validationCode}
              onChangeText={setValidationCode}
              placeholder="Ex: ABC123"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBu�t��t�on}
                onPress={() => {
                  setShowValidationModal(false);
                  setValidationCode('');
                }}
              >
                <Text style={styles.cancelBu�t��t�onText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmBu�t��t�on, !validationCode && styles.confirmBu�t��t�onDisabled]}
                onPress={validateMission}
                disabled={!validationCode || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBu�t��t�onText}>Valider</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  
  // Section Code
  codeSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBo�t��t�om: 20,
  },
  sectiontitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBo�t��t�om: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBo�t��t�om: 8,
  },
  codeDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF4444',
    le�t��t�erSpacing: 4,
    fontFamily: 'monospace',
  },
  regenerateBu�t��t�on: {
    marginLeft: 12,
    padding: 8,
  },
  codeInfo: {
    fontSize: 12,
    color: '#666',
    TextAlign: 'center',
    fontstyle: 'italic',
  },
  
  // Section Missions
  missionsSection: {
    backgroundColor: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    margintop: 12,
  },
  
  // Cartes de missions
  missionCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBo�t��t�om: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBo�t��t�om: 8,
  },
  missiontitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  missionBudget: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  missionFourmiz: {
    fontSize: 14,
    color: '#007bff',
    marginBo�t��t�om: 4,
  },
  missionDate: {
    fontSize: 14,
    color: '#666',
    marginBo�t��t�om: 12,
  },
  validateAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e8',
    padding: 8,
    borderRadius: 6,
  },
  validateText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modaltitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    TextAlign: 'center',
    marginBo�t��t�om: 16,
  },
  missionInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBo�t��t�om: 16,
  },
  modalMissiontitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalMissionDetails: {
    fontSize: 14,
    color: '#666',
    margintop: 4,
  },
  codeInputLabel: {
    fontSize: 14,
    color: '#333',
    marginBo�t��t�om: 8,
    fontWeight: '500',
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    TextAlign: 'center',
    fontFamily: 'monospace',
    le�t��t�erSpacing: 2,
    marginBo�t��t�om: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBu�t��t�on: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBu�t��t�onText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmBu�t��t�on: {
    flex: 1,
    backgroundColor: '#FF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmBu�t��t�onDisabled: {
    backgroundColor: '#ccc',
  },
  confirmBu�t��t�onText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

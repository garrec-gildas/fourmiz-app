// components/AccountDeletion.tsx - COMPOSANT DE DÉSACTIVATION DE COMPTE
// Version simplifiée - Désactivation au lieu d'archivage complexe
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

interface AccountDeletionProps {
  userEmail: string;
  userId: string;
  isVisible: boolean;
  onClose?: () => void;
}

export default function AccountDeletion({ userEmail, userId, isVisible, onClose }: AccountDeletionProps) {
  const [step, setStep] = useState<'initial' | 'confirm' | 'password'>('initial');
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [reasonSelected, setReasonSelected] = useState('');
  const [customReason, setCustomReason] = useState('');

  const reasons = [
    'Je n\'utilise plus l\'application',
    'Problèmes de confidentialité',
    'Trop de notifications',
    'Interface peu intuitive',
    'Fonctionnalités manquantes',
    'Autre raison'
  ];

  // Vérification des missions en cours
  const checkActiveMissions = async (): Promise<{canDelete: boolean; fourmizMissions?: any[]; clientMissions?: any[]; error?: string}> => {
    try {
      console.log('Vérification des missions/commandes en cours...');
      
      const activeStatuses = ['en_cours', 'acceptee', 'planifiee', 'confirmee'];
      
      // Vérifier côté FOURMIZ
      let fourmizMissions = [];
      try {
        const { data: fourmizData, error: fourmizError } = await supabase
          .from('orders')
          .select('id, service_title, description, status, client_id, date, proposed_amount')
          .eq('fourmiz_id', userId)
          .in('status', activeStatuses);

        if (fourmizError) {
          console.error('Erreur vérification missions fourmiz:', fourmizError);
        } else if (fourmizData && fourmizData.length > 0) {
          for (const mission of fourmizData) {
            try {
              const { data: clientProfile } = await supabase
                .from('profiles')
                .select('firstname, lastname')
                .eq('user_id', mission.client_id)
                .single();
              
              mission.client_name = clientProfile 
                ? `${clientProfile.firstname} ${clientProfile.lastname}`.trim()
                : 'Client inconnu';
              
              mission.title = mission.service_title || mission.description || 'Mission sans titre';
            } catch {
              mission.client_name = 'Client inconnu';
              mission.title = mission.service_title || mission.description || 'Mission sans titre';
            }
          }
          fourmizMissions = fourmizData;
        }
      } catch (error) {
        console.error('Erreur vérification missions fourmiz:', error);
      }
      
      // Vérifier côté CLIENT
      let clientMissions = [];
      try {
        const { data: clientData, error: clientError } = await supabase
          .from('orders')
          .select('id, service_title, description, status, fourmiz_id, date, proposed_amount')
          .eq('client_id', userId)
          .in('status', activeStatuses);

        if (clientError) {
          console.error('Erreur vérification commandes client:', clientError);
        } else if (clientData && clientData.length > 0) {
          for (const commande of clientData) {
            try {
              const { data: fourmizProfile } = await supabase
                .from('profiles')
                .select('firstname, lastname')
                .eq('user_id', commande.fourmiz_id)
                .single();
              
              commande.fourmiz_name = fourmizProfile 
                ? `${fourmizProfile.firstname} ${fourmizProfile.lastname}`.trim()
                : 'Fourmiz inconnu';
                
              commande.title = commande.service_title || commande.description || 'Commande sans titre';
            } catch {
              commande.fourmiz_name = 'Fourmiz inconnu';
              commande.title = commande.service_title || commande.description || 'Commande sans titre';
            }
          }
          clientMissions = clientData;
        }
      } catch (error) {
        console.error('Erreur vérification commandes client:', error);
      }
      
      const totalActiveMissions = fourmizMissions.length + clientMissions.length;
      const canDelete = totalActiveMissions === 0;
      
      return {
        canDelete,
        fourmizMissions: fourmizMissions.length > 0 ? fourmizMissions : undefined,
        clientMissions: clientMissions.length > 0 ? clientMissions : undefined
      };
      
    } catch (error: any) {
      console.error('Erreur fatale vérification missions:', error);
      return {
        canDelete: false,
        error: `Erreur vérification: ${error.message}`
      };
    }
  };

  // Désactivation simple du compte
  const deactivateAccount = async (): Promise<{success: boolean; error?: string}> => {
    try {
      console.log('Début désactivation compte pour:', userId);
      
      // 1. Marquer le profil comme désactivé
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          compte_desactive: true,
          desactive_at: new Date().toISOString(),
          desactivation_reason: reasonSelected,
          custom_reason: customReason || null
        })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Erreur désactivation profil:', profileError);
        throw new Error('Impossible de désactiver le profil: ' + profileError.message);
      }

      // 2. Modifier l'email Auth pour libérer l'original
      try {
        const timestampSuffix = Date.now();
        const deactivatedEmail = `deactivated_${timestampSuffix}_${userEmail.replace('@', '_at_')}@deactivated.fourmiz.com`;
        
        const { error: authError } = await supabase.auth.updateUser({
          email: deactivatedEmail,
          data: { 
            account_deactivated: true,
            deactivated_at: new Date().toISOString(),
            original_email: userEmail
          }
        });

        if (authError) {
          console.warn('Erreur modification email auth:', authError);
          // Ne pas faire échouer la désactivation pour ça
        }

      } catch (emailError) {
        console.warn('Erreur libération email:', emailError);
        // Ne pas faire échouer la désactivation pour ça
      }

      console.log('Compte désactivé avec succès');
      return { success: true };

    } catch (error: any) {
      console.error('Erreur critique désactivation compte:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur inconnue lors de la désactivation'
      };
    }
  };

  // Vérification du mot de passe
  const verifyPassword = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password
      });
      return !error;
    } catch {
      return false;
    }
  };

  // Processus principal de désactivation
  const handleDeleteAccount = async () => {
    if (step !== 'password') return;

    setLoading(true);

    try {
      // Vérifier le mot de passe
      const passwordValid = await verifyPassword();
      if (!passwordValid) {
        Alert.alert('Erreur', 'Mot de passe incorrect');
        setLoading(false);
        return;
      }

      // Vérifier le texte de confirmation
      const expectedText = 'désactiver mon compte';
      if (confirmText.toLowerCase().trim() !== expectedText) {
        Alert.alert(
          'Erreur', 
          'Veuillez saisir exactement "' + expectedText + '"'
        );
        setLoading(false);
        return;
      }

      // Vérifier les missions en cours
      const missionCheck = await checkActiveMissions();
      
      if (!missionCheck.canDelete) {
        if (missionCheck.error) {
          Alert.alert('Erreur', missionCheck.error);
          setLoading(false);
          return;
        }

        const fourmizMissions = missionCheck.fourmizMissions || [];
        const clientMissions = missionCheck.clientMissions || [];
        const hasFourmizMissions = fourmizMissions.length > 0;
        const hasClientMissions = clientMissions.length > 0;

        let alertTitle = 'Désactivation impossible';
        let alertMessage = '';
        let alertButtons = [];

        if (hasFourmizMissions && hasClientMissions) {
          const fourmizList = fourmizMissions.map(mission => {
            const clientName = mission.client_name || 'Client';
            return '• ' + mission.title + ' (' + mission.status + ') - Client: ' + clientName;
          }).join('\n');

          const clientList = clientMissions.map(mission => {
            const fourmizName = mission.fourmiz_name || 'Fourmiz';
            return '• ' + mission.title + ' (' + mission.status + ') - Fourmiz: ' + fourmizName;
          }).join('\n');

          alertMessage = 'Vous avez des activités en cours dans vos 2 rôles :\n\n' +
            'MISSIONS FOURMIZ (' + fourmizMissions.length + ') :\n' + fourmizList + '\n\n' +
            'COMMANDES CLIENT (' + clientMissions.length + ') :\n' + clientList + '\n\n' +
            'Vous devez d\'abord terminer ou annuler toutes ces activités.';

          alertButtons = [
            { 
              text: 'Mes missions Fourmiz', 
              onPress: () => {
                setLoading(false);
                closeModal();
                router.push('/(tabs)/services-requests');
              }
            },
            { 
              text: 'Mes commandes Client', 
              onPress: () => {
                setLoading(false);
                closeModal();
                router.push('/(tabs)/orders');
              }
            },
            { text: 'Annuler', style: 'cancel', onPress: () => setLoading(false) }
          ];

        } else if (hasFourmizMissions) {
          const missionsList = fourmizMissions.map(mission => {
            const clientName = mission.client_name || 'Client';
            return '• ' + mission.title + ' (' + mission.status + ') - Client: ' + clientName;
          }).join('\n');

          alertMessage = 'Vous avez ' + fourmizMissions.length + ' mission(s) en cours :\n\n' + missionsList + '\n\n' +
            'Vous devez d\'abord terminer ou annuler ces missions.';

          alertButtons = [
            { 
              text: 'Voir mes missions', 
              onPress: () => {
                setLoading(false);
                closeModal();
                router.push('/(tabs)/services-requests');
              }
            },
            { text: 'Annuler', style: 'cancel', onPress: () => setLoading(false) }
          ];

        } else if (hasClientMissions) {
          const missionsList = clientMissions.map(mission => {
            const fourmizName = mission.fourmiz_name || 'Fourmiz';
            return '• ' + mission.title + ' (' + mission.status + ') - Fourmiz: ' + fourmizName;
          }).join('\n');

          alertMessage = 'Vous avez ' + clientMissions.length + ' commande(s) en cours :\n\n' + missionsList + '\n\n' +
            'Vous devez d\'abord terminer ou annuler ces commandes.';

          alertButtons = [
            { 
              text: 'Voir mes commandes', 
              onPress: () => {
                setLoading(false);
                closeModal();
                router.push('/(tabs)/orders');
              }
            },
            { text: 'Annuler', style: 'cancel', onPress: () => setLoading(false) }
          ];
        }

        Alert.alert(alertTitle, alertMessage, alertButtons);
        return;
      }

      // Dernière confirmation
      Alert.alert(
        'DÉSACTIVATION DU COMPTE',
        'Votre compte sera désactivé mais pourra être réactivé en vous reconnectant.\n\nVoulez-vous continuer ?',
        [
          { 
            text: 'Annuler', 
            style: 'cancel',
            onPress: () => setLoading(false)
          },
          {
            text: 'Désactiver',
            style: 'destructive',
            onPress: async () => {
              const result = await deactivateAccount();
              
              if (result.success) {
                closeModal();
                
                Alert.alert(
                  'Compte désactivé',
                  'Votre compte a été désactivé. Vous pouvez le réactiver en vous reconnectant.',
                  [
                    {
                      text: 'Fermer',
                      onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace('/auth/login');
                      }
                    }
                  ]
                );
              } else {
                Alert.alert(
                  'Erreur de désactivation',
                  result.error || 'Une erreur est survenue lors de la désactivation.',
                  [{ 
                    text: 'OK',
                    onPress: () => setLoading(false)
                  }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erreur inattendue:', error);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
      setLoading(false);
    }
  };

  // Navigation entre les étapes
  const nextStep = () => {
    if (step === 'initial') {
      if (!reasonSelected) {
        Alert.alert('Champ requis', 'Veuillez sélectionner une raison');
        return;
      }
      if (reasonSelected === 'Autre raison' && !customReason.trim()) {
        Alert.alert('Champ requis', 'Veuillez préciser la raison');
        return;
      }
      setStep('confirm');
    } else if (step === 'confirm') {
      setStep('password');
    }
  };

  // Fermeture du modal
  const closeModal = () => {
    setStep('initial');
    setPassword('');
    setConfirmText('');
    setReasonSelected('');
    setCustomReason('');
    setLoading(false);
    onClose?.();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={closeModal} disabled={loading} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {step === 'initial' ? 'Désactiver le compte' : 
             step === 'confirm' ? 'Confirmation' : 'Vérification finale'}
          </Text>
          <View style={styles.placeholderView} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {step === 'initial' && (
            <>
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="information-circle" size={24} color="#007AFF" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Désactivation temporaire</Text>
                  <Text style={styles.infoText}>
                    Votre compte sera désactivé mais pourra être réactivé en vous reconnectant
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Pourquoi souhaitez-vous partir ?</Text>
              <Text style={styles.sectionSubtitle}>
                Votre retour nous aide à améliorer notre service
              </Text>
              
              <View style={styles.reasonsList}>
                {reasons.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonOption,
                      reasonSelected === reason && styles.reasonSelected
                    ]}
                    onPress={() => setReasonSelected(reason)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.radioContainer}>
                      <View style={[
                        styles.radioOuter,
                        reasonSelected === reason && styles.radioOuterSelected
                      ]}>
                        {reasonSelected === reason && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                    </View>
                    <Text style={[
                      styles.reasonText,
                      reasonSelected === reason && styles.reasonTextSelected
                    ]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {reasonSelected === 'Autre raison' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Précisez votre raison</Text>
                  <TextInput
                    style={styles.customReasonInput}
                    placeholder="Dites-nous pourquoi..."
                    value={customReason}
                    onChangeText={setCustomReason}
                    multiline
                    maxLength={500}
                    placeholderTextColor="#999999"
                  />
                </View>
              )}
            </>
          )}

          {step === 'confirm' && (
            <>
              <View style={styles.confirmCard}>
                <View style={styles.confirmIconContainer}>
                  <Ionicons name="pause-circle" size={24} color="#007AFF" />
                </View>
                <Text style={styles.confirmTitle}>Ce qui sera désactivé</Text>
              </View>
              
              <View style={styles.deactivationList}>
                <View style={styles.deactivationItem}>
                  <Ionicons name="person" size={16} color="#666666" />
                  <Text style={styles.deactivationText}>Votre profil sera masqué</Text>
                </View>
                <View style={styles.deactivationItem}>
                  <Ionicons name="eye-off" size={16} color="#666666" />
                  <Text style={styles.deactivationText}>Vous n'apparaîtrez plus dans les recherches</Text>
                </View>
                <View style={styles.deactivationItem}>
                  <Ionicons name="notifications-off" size={16} color="#666666" />
                  <Text style={styles.deactivationText}>Plus de notifications</Text>
                </View>
                <View style={styles.deactivationItem}>
                  <Ionicons name="shield-checkmark" size={16} color="#666666" />
                  <Text style={styles.deactivationText}>Vos données sont conservées</Text>
                </View>
              </View>

              <View style={styles.reactivationCard}>
                <Text style={styles.reactivationText}>
                  Vous pourrez réactiver votre compte à tout moment en vous reconnectant avec vos identifiants.
                </Text>
              </View>
            </>
          )}

          {step === 'password' && (
            <>
              <Text style={styles.verificationTitle}>Vérification de sécurité</Text>
              <Text style={styles.verificationSubtitle}>
                Pour confirmer cette action, veuillez saisir vos informations
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Mot de passe</Text>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Saisissez votre mot de passe"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                  placeholderTextColor="#999999"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirmation</Text>
                <TextInput
                  style={styles.confirmInput}
                  placeholder="Tapez 'désactiver mon compte' pour confirmer"
                  value={confirmText}
                  onChangeText={setConfirmText}
                  autoCapitalize="none"
                  editable={!loading}
                  placeholderTextColor="#999999"
                />
                <Text style={styles.confirmHint}>
                  Vous devez taper exactement : "désactiver mon compte"
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={closeModal}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              step === 'password' ? styles.deactivateActionButton : styles.nextButton,
              loading && styles.buttonDisabled
            ]}
            onPress={step === 'password' ? handleDeleteAccount : nextStep}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.loadingText}>Traitement...</Text>
              </View>
            ) : (
              <Text style={[
                step === 'password' ? styles.deactivateActionButtonText : styles.nextButtonText
              ]}>
                {step === 'password' ? 'Désactiver le compte' : 'Suivant'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  closeButton: {
    padding: 4,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  placeholderView: {
    width: 32,
  },
  modalContent: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fafafa',
  },
  
  // Carte d'information (bleu au lieu de rouge)
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
    opacity: 0.8,
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    lineHeight: 20,
  },
  
  reasonsList: {
    gap: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reasonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  radioContainer: {
    marginRight: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  radioOuterSelected: {
    borderColor: '#007AFF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  reasonText: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    lineHeight: 22,
  },
  reasonTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  
  inputContainer: {
    marginTop: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  customReasonInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // Étape de confirmation
  confirmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmIconContainer: {
    marginRight: 12,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  
  deactivationList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    gap: 16,
  },
  deactivationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deactivationText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
    lineHeight: 22,
  },
  
  reactivationCard: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  reactivationText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Étape de vérification
  verificationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 8,
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  
  passwordInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333333',
  },
  confirmInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333333',
  },
  confirmHint: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Footer
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '400',
  },
  deactivateActionButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deactivateActionButtonText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '400',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '400',
  },
});
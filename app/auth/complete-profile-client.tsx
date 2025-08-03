// app/auth/complete-profile-client.tsx - VERSION OPTIMISÉE FOURMIZ → CLIENT
// 🎯 Gestion intelligente : Fourmiz a déjà toutes les infos pour être Client
// ✅ Ajout de rôle instantané si profil Fourmiz complet

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  supabase,
  handleSupabaseError,
  getCurrentUser,
  getCurrentSession,
} from '../../lib/supabase';

interface UserSession {
  user: {
    id: string;
    email: string;
  };
}

interface UiState {
  sessionLoading: boolean;
  updating: boolean;
  checkingProfile: boolean;
}

export default function CompleteClientProfileScreen() {
  const { from } = useLocalSearchParams();

  const [uiState, setUiState] = useState<UiState>({
    sessionLoading: true,
    updating: false,
    checkingProfile: false,
  });

  const [session, setSession] = useState<UserSession | null>(null);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [canInstantUpgrade, setCanInstantUpgrade] = useState(false);

  // 🔄 CHARGEMENT DE LA SESSION
  const loadUserSession = useCallback(async (): Promise<void> => {
    try {
      console.log('🔐 Vérification de la session utilisateur...');
      
      const currentUser = await getCurrentUser();
      const currentSession = await getCurrentSession();
      
      if (!currentUser || !currentSession) {
        console.log('❌ Session invalide, redirection vers login');
        Alert.alert(
          'Session expirée',
          'Veuillez vous reconnecter pour continuer',
          [{ text: 'OK', onPress: () => router.replace('/auth/signin') }]
        );
        return;
      }

      console.log('✅ Session utilisateur validée:', currentUser.email);
      
      setSession({
        user: {
          id: currentUser.id,
          email: currentUser.email
        }
      });

      // Charger et analyser le profil existant
      await loadAndAnalyzeProfile(currentUser.id);

    } catch (error) {
      console.error('❌ Erreur chargement session:', error);
      const { userMessage } = handleSupabaseError(error, 'Session utilisateur');
      
      Alert.alert(
        'Erreur de session',
        userMessage,
        [{ text: 'Réessayer', onPress: () => router.replace('/auth/signin') }]
      );
    } finally {
      setUiState(prev => ({ ...prev, sessionLoading: false }));
    }
  }, []);

  // 📋 CHARGEMENT ET ANALYSE DU PROFIL EXISTANT
  const loadAndAnalyzeProfile = useCallback(async (userId: string): Promise<void> => {
    try {
      setUiState(prev => ({ ...prev, checkingProfile: true }));
      console.log('📋 Analyse du profil existant...');

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          firstname,
          lastname,
          email,
          phone,
          address,
          city,
          postal_code,
          rib,
          id_document_path,
          roles,
          profile_completed
        `)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Erreur récupération profil:', error);
        return;
      }

      if (profileData) {
        console.log('📋 Profil Fourmiz existant trouvé:', profileData.firstname);
        setExistingProfile(profileData);

        // ✅ ANALYSE : Peut-on faire un upgrade instantané ?
        const basicFieldsComplete = !!(
          profileData.firstname &&
          profileData.lastname &&
          profileData.phone &&
          profileData.address &&
          profileData.city &&
          profileData.postal_code
        );

        const isFourmiz = profileData.roles?.includes('fourmiz');
        const isAlreadyClient = profileData.roles?.includes('client');

        console.log('🔍 Analyse profil:', {
          basicFieldsComplete,
          isFourmiz,
          isAlreadyClient,
          roles: profileData.roles
        });

        // CAS 1: Déjà Client → Rediriger vers dashboard
        if (isAlreadyClient) {
          console.log('✅ Utilisateur déjà Client, redirection dashboard');
          Alert.alert(
            'Déjà Client !',
            'Vous avez déjà le rôle Client. Redirection vers l\'application...',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
          );
          return;
        }

        // CAS 2: Fourmiz avec profil complet → Upgrade instantané possible
        if (isFourmiz && basicFieldsComplete) {
          console.log('🚀 Fourmiz avec profil complet → Upgrade instantané possible');
          setCanInstantUpgrade(true);
        } else {
          console.log('⚠️ Profil incomplet, upgrade manuel nécessaire');
          setCanInstantUpgrade(false);
        }
      }
    } catch (error) {
      console.warn('⚠️ Erreur analyse profil existant:', error);
    } finally {
      setUiState(prev => ({ ...prev, checkingProfile: false }));
    }
  }, []);

  // 🚀 AJOUT INSTANTANÉ DU RÔLE CLIENT (POUR FOURMIZ COMPLET)
  const handleInstantClientUpgrade = useCallback(async (): Promise<void> => {
    if (!session?.user) {
      Alert.alert('Session expirée', 'Veuillez vous reconnecter');
      router.replace('/auth/signin');
      return;
    }

    console.log('💾 === AJOUT RÔLE CLIENT INSTANTANÉ ===');
    console.log('📋 Utilisateur Fourmiz:', session.user.email);

    setUiState(prev => ({ ...prev, updating: true }));

    try {
      // Ajouter le rôle 'client' aux rôles existants
      const newRoles = existingProfile?.roles 
        ? [...new Set([...existingProfile.roles, 'client'])]
        : ['fourmiz', 'client'];

      console.log('🔄 Mise à jour rôles:', {
        ancien: existingProfile?.roles,
        nouveau: newRoles
      });

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          roles: newRoles,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id);

      if (profileError) {
        console.error('❌ Erreur ajout rôle Client:', profileError);
        const { userMessage } = handleSupabaseError(profileError, 'Mise à jour profil');
        throw new Error(userMessage);
      }

      console.log('✅ Rôle Client ajouté instantanément !');

      // Message de succès optimisé
      const firstName = existingProfile?.firstname || 'Utilisateur';
      Alert.alert(
        '🎉 Parfait !',
        `Excellent ${firstName} ! Vous êtes maintenant Fourmiz ET Client.\n\n✅ Aucune information supplémentaire n'était nécessaire car votre profil Fourmiz contient déjà tout ce qu'il faut pour être Client !\n\n🛍️ Vous pouvez maintenant commander des services ET en proposer.`,
        [
          { 
            text: 'Découvrir les services', 
            onPress: () => router.replace('/(tabs)')
          }
        ]
      );

    } catch (error: any) {
      console.error('💥 ERREUR AJOUT RÔLE CLIENT INSTANTANÉ:', error);
      
      Alert.alert(
        'Erreur',
        error.message || 'Impossible d\'ajouter le rôle Client. Veuillez réessayer.',
        [
          { text: 'Réessayer' },
          { 
            text: 'Support', 
            onPress: () => Alert.alert('Support', 'Contactez-nous à support@fourmiz.app')
          }
        ]
      );
    } finally {
      setUiState(prev => ({ ...prev, updating: false }));
      console.log('🏁 Fin ajout rôle Client instantané');
    }
  }, [session, existingProfile]);

  // 🚀 REDIRECTION VERS COMPLÉTION MANUELLE (SI PROFIL INCOMPLET)
  const handleManualCompletion = useCallback(() => {
    console.log('➡️ Redirection vers complétion manuelle');
    router.push('/auth/complete-profile?roles=client');
  }, []);

  // 🔄 CHARGEMENT INITIAL
  useEffect(() => {
    loadUserSession();
  }, [loadUserSession]);

  // 📊 ÉTATS DE CHARGEMENT
  if (uiState.sessionLoading || uiState.checkingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>
            {uiState.sessionLoading 
              ? 'Vérification de votre session...' 
              : 'Analyse de votre profil...'
            }
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session || !existingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Erreur de chargement</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.replace('/auth/signin')}
          >
            <Text style={styles.retryButtonText}>Se reconnecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 🎨 RENDU PRINCIPAL
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🛒 Devenir Client</Text>
            <Text style={styles.subtitle}>
              Ajoutez le rôle Client à votre profil Fourmiz
            </Text>
          </View>

          {/* Profil actuel */}
          <View style={styles.profileSection}>
            <Text style={styles.profileTitle}>👤 Votre profil Fourmiz actuel</Text>
            <View style={styles.profileCard}>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {existingProfile.firstname} {existingProfile.lastname}
                </Text>
                <Text style={styles.profileEmail}>{existingProfile.email}</Text>
                <Text style={styles.profileDetails}>
                  📞 {existingProfile.phone || 'Non renseigné'}
                </Text>
                <Text style={styles.profileDetails}>
                  📍 {existingProfile.address ? `${existingProfile.address}, ${existingProfile.city}` : 'Adresse non renseignée'}
                </Text>
                <View style={styles.rolesContainer}>
                  <Text style={styles.rolesLabel}>Rôle actuel :</Text>
                  <View style={styles.roleTag}>
                    <Text style={styles.roleText}>🐜 Fourmiz</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ✅ UPGRADE INSTANTANÉ ou MANUEL selon le cas */}
          {canInstantUpgrade ? (
            <>
              {/* Section upgrade instantané */}
              <View style={styles.instantSection}>
                <Text style={styles.instantTitle}>✨ Bonne nouvelle !</Text>
                <Text style={styles.instantText}>
                  Votre profil Fourmiz contient déjà toutes les informations nécessaires pour devenir Client. 
                  Aucune saisie supplémentaire n'est requise !
                </Text>
              </View>

              {/* Avantages Client */}
              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsTitle}>🛍️ En tant que Client, vous pourrez :</Text>
                <View style={styles.benefitsList}>
                  <Text style={styles.benefitItem}>🔍 Rechercher et commander des services</Text>
                  <Text style={styles.benefitItem}>⭐ Noter et commenter les autres Fourmiz</Text>
                  <Text style={styles.benefitItem}>💬 Communiquer avec les prestataires</Text>
                  <Text style={styles.benefitItem}>📱 Suivre vos commandes en temps réel</Text>
                  <Text style={styles.benefitItem}>🎯 Profiter des deux facettes de Fourmiz</Text>
                </View>
              </View>

              {/* Bouton principal instantané */}
              <TouchableOpacity
                style={[
                  styles.instantButton,
                  uiState.updating && styles.instantButtonDisabled
                ]}
                onPress={handleInstantClientUpgrade}
                disabled={uiState.updating}
                activeOpacity={0.8}
              >
                {uiState.updating ? (
                  <View style={styles.instantButtonLoading}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.instantButtonLoadingText}>Ajout en cours...</Text>
                  </View>
                ) : (
                  <Text style={styles.instantButtonText}>🚀 Devenir Client instantanément</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Section upgrade manuel */}
              <View style={styles.manualSection}>
                <Text style={styles.manualTitle}>📝 Complétion nécessaire</Text>
                <Text style={styles.manualText}>
                  Votre profil nécessite quelques informations supplémentaires pour devenir Client. 
                  Nous allons vous rediriger vers le formulaire de complétion.
                </Text>
              </View>

              {/* Bouton principal manuel */}
              <TouchableOpacity
                style={styles.manualButton}
                onPress={handleManualCompletion}
                activeOpacity={0.8}
              >
                <Text style={styles.manualButtonText}>📝 Compléter mon profil</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Bouton retour */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              if (from) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            disabled={uiState.updating}
          >
            <Text style={styles.cancelButtonText}>Plus tard</Text>
          </TouchableOpacity>

          {/* Informations légales */}
          <Text style={styles.legalText}>
            En devenant Client, vous acceptez nos conditions d'utilisation pour les commandes de services.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // États de chargement
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF4444',
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Contenu principal
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },

  // Profil utilisateur
  profileSection: {
    marginBottom: 32,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  profileCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  profileInfo: {
    gap: 8,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
  },
  profileDetails: {
    fontSize: 14,
    color: '#666',
  },
  rolesContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rolesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  roleTag: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Section instantanée
  instantSection: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  instantTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  instantText: {
    fontSize: 14,
    color: '#388e3c',
    lineHeight: 20,
  },

  // Section manuelle
  manualSection: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  manualTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  manualText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },

  // Section avantages
  benefitsSection: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },

  // Boutons
  instantButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  instantButtonDisabled: {
    backgroundColor: '#ccc',
  },
  instantButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  instantButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instantButtonLoadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },

  manualButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  manualButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },

  cancelButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },

  // Mentions légales
  legalText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});
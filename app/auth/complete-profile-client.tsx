// app/auth/complete-profile-client.tsx - VERSION HARMONISÉE AVEC COMPLETE-PROFILE.TSX
// 🎯 Gestion intelligente : Fourmiz a déjà toutes les infos pour être Client 
// ⚡ Ajout de rôle instantané si profil Fourmiz complet
// 🎨 Style PARFAITEMENT harmonisé avec complete-profile.tsx

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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
      console.log('🔄 Vérification de la session utilisateur...');
      
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

  // 🔍 CHARGEMENT ET ANALYSE DU PROFIL EXISTANT 
  const loadAndAnalyzeProfile = useCallback(async (userId: string): Promise<void> => {
    try {
      setUiState(prev => ({ ...prev, checkingProfile: true }));
      console.log('🔍 Analyse du profil existant...');

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
          avatar_url,
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

        // 🎯 ANALYSE : Peut-on faire un upgrade instantané ?
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

        // CAS 1: Déjà Client ? Rediriger vers dashboard
        if (isAlreadyClient) {
          console.log('✅ Utilisateur déjà Client, redirection dashboard');
          Alert.alert(
            'Déjà Client !',
            'Vous avez déjà le rôle Client. Redirection vers l\'application...',
            [{ text: 'OK', onPress: () => router.replace('/(Tabs)') }]
          );
          return;
        }

        // CAS 2: Fourmiz avec profil complet ? Upgrade instantané possible
        if (isFourmiz && basicFieldsComplete) {
          console.log('⚡ Fourmiz avec profil complet → Upgrade instantané possible');
          setCanInstantUpgrade(true);
        } else {
          console.log('📝 Profil incomplet, upgrade manuel nécessaire');
          setCanInstantUpgrade(false);
        }
      }
    } catch (error) {
      console.warn('⚠️ Erreur analyse profil existant:', error);
    } finally {
      setUiState(prev => ({ ...prev, checkingProfile: false }));
    }
  }, []);

  // ⚡ AJOUT INSTANTANÉ DU RÔLE CLIENT (POUR FOURMIZ COMPLET)
  const handleInstantClientUpgrade = useCallback(async (): Promise<void> => {
    if (!session?.user) {
      Alert.alert('Session expirée', 'Veuillez vous reconnecter');
      router.replace('/auth/signin');
      return;
    }

    console.log('⚡ === AJOUT RÔLE CLIENT INSTANTANÉ ===');
    console.log('👤 Utilisateur Fourmiz:', session.user.email);

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
        `Excellent ${firstName} ! Vous êtes maintenant Fourmiz ET Client.\n\n⚡ Aucune information supplémentaire n'était nécessaire car votre profil Fourmiz contient déjà tout ce qu'il faut pour être Client !\n\n🎯 Vous pouvez maintenant commander des services ET en proposer.`,
        [
          { 
            text: 'Découvrir les services', 
            onPress: () => router.replace('/(Tabs)')
          }
        ]
      );

    } catch (error: any) {
      console.error('❌ ERREUR AJOUT RÔLE CLIENT INSTANTANÉ:', error);
      
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

  // 📝 REDIRECTION VERS COMPLÉTION MANUELLE (SI PROFIL INCOMPLET)
  const handleManualCompletion = useCallback(() => {
    console.log('📝 Redirection vers complétion manuelle');
    router.push('/auth/complete-profile?roles=client');
  }, []);

  // 🔄 CHARGEMENT INITIAL
  useEffect(() => {
    loadUserSession();
  }, [loadUserSession]);

  // 📱 ÉTATS DE CHARGEMENT 
  if (uiState.sessionLoading || uiState.checkingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
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
          {/* Header épuré */}
          <View style={styles.header}>
            <Text style={styles.title}>Devenir Client</Text>
            <Text style={styles.subtitle}>
              Ajoutez le rôle Client à votre profil Fourmiz
            </Text>
          </View>

          {/* Profil actuel avec style épuré */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={16} color="#000000" />
              <Text style={styles.sectionTitle}>Votre profil Fourmiz actuel</Text>
            </View>
            
            <View style={styles.profileContent}>
              <View style={styles.profileInfo}>
                {/* Avatar avec fallback */}
                <View style={styles.avatarContainer}>
                  {existingProfile.avatar_url ? (
                    <Image 
                      source={{ uri: existingProfile.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {existingProfile.firstname ? existingProfile.firstname.charAt(0).toUpperCase() : '👤'}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.profileDetails}>
                  <Text style={styles.profileName}>
                    {existingProfile.firstname} {existingProfile.lastname}
                  </Text>
                  <Text style={styles.profileEmail}>{existingProfile.email}</Text>
                  
                  <View style={styles.profileDetailsRow}>
                    <Ionicons name="call-outline" size={12} color="#666666" />
                    <Text style={styles.profileDetailText}>
                      {existingProfile.phone || 'Non renseigné'}
                    </Text>
                  </View>
                  
                  <View style={styles.profileDetailsRow}>
                    <Ionicons name="location-outline" size={12} color="#666666" />
                    <Text style={styles.profileDetailText}>
                      {existingProfile.address ? `${existingProfile.address}, ${existingProfile.city}` : 'Adresse non renseignée'}
                    </Text>
                  </View>
                  
                  <View style={styles.rolesContainer}>
                    <Text style={styles.rolesLabel}>Rôle actuel :</Text>
                    <View style={styles.roleTag}>
                      <Ionicons name="construct" size={12} color="#ffffff" />
                      <Text style={styles.roleText}>Fourmiz</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ⚡ UPGRADE INSTANTANÉ ou MANUEL selon le cas */}
          {canInstantUpgrade ? (
            <>
              {/* Section upgrade instantané */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="flash-outline" size={16} color="#000000" />
                  <Text style={styles.sectionTitle}>Bonne nouvelle !</Text>
                </View>
                <Text style={styles.sectionText}>
                  Votre profil Fourmiz contient déjà toutes les informations nécessaires pour devenir Client. 
                  Aucune saisie supplémentaire n'est requise !
                </Text>
              </View>

              {/* Avantages Client */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#000000" />
                  <Text style={styles.sectionTitle}>En tant que Client, vous pourrez</Text>
                </View>
                <View style={styles.benefitsList}>
                  <View style={styles.benefitItem}>
                    <Ionicons name="search-outline" size={14} color="#000000" />
                    <Text style={styles.benefitText}>Rechercher et commander des services</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="star-outline" size={14} color="#000000" />
                    <Text style={styles.benefitText}>Noter et commenter les autres Fourmiz</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="chatbubble-outline" size={14} color="#000000" />
                    <Text style={styles.benefitText}>Communiquer avec les prestataires</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="notifications-outline" size={14} color="#000000" />
                    <Text style={styles.benefitText}>Suivre vos commandes en temps réel</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="medal-outline" size={14} color="#000000" />
                    <Text style={styles.benefitText}>Profiter des deux facettes de Fourmiz</Text>
                  </View>
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
                  <>
                    <Ionicons name="flash" size={16} color="#ffffff" />
                    <Text style={styles.instantButtonText}>Devenir Client instantanément</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Section upgrade manuel */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-text-outline" size={16} color="#000000" />
                  <Text style={styles.sectionTitle}>Complétion nécessaire</Text>
                </View>
                <Text style={styles.sectionText}>
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
                <Ionicons name="create-outline" size={16} color="#ffffff" />
                <Text style={styles.manualButtonText}>Compléter mon profil</Text>
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
                router.replace('/(Tabs)');
              }
            }}
            disabled={uiState.updating}
          >
            <Text style={styles.cancelButtonText}>Plus tard</Text>
          </TouchableOpacity>

          {/* Informations légales avec style épuré */}
          <View style={styles.noteSection}>
            <Ionicons name="information-circle-outline" size={14} color="#666666" />
            <Text style={styles.noteText}>
              En devenant Client, vous acceptez nos conditions d'utilisation pour les commandes de services.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ====================================
// 🎨 STYLES HARMONISÉS AVEC COMPLETE-PROFILE.TSX
// ====================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  // États de chargement harmonisés
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,               // Harmonisé (était 16)
    padding: 24,           // Harmonisé (était 20)
  },
  loadingText: {
    fontSize: 13,
    color: '#333333',      // Harmonisé (était #666666)
    fontWeight: '400',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,       // Harmonisé (était 8)
    marginTop: 16,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },

  // Contenu principal harmonisé
  content: {
    paddingHorizontal: 24, // Harmonisé (était padding: 20)
    paddingVertical: 16,   // Ajouté pour cohérence
    paddingBottom: 40,
  },

  // Header harmonisé
  header: {
    alignItems: 'center',
    marginBottom: 20,      // Harmonisé (était 24)
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000000',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    color: '#666666',
    lineHeight: 18,
    fontWeight: '400',
  },

  // Sections harmonisées
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,           // Harmonisé (était 16)
    marginBottom: 20,      // Harmonisé (était 16)
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,      // Harmonisé (était 12)
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  sectionText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    fontWeight: '400',
  },

  // Profil utilisateur harmonisé
  profileContent: {
    marginTop: 8,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarContainer: {
    marginTop: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#000000',
  },
  avatarPlaceholder: {
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  profileDetails: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 6,
  },
  profileDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  profileDetailText: {
    fontSize: 13,          // Harmonisé (était 12)
    color: '#666666',
    flex: 1,
  },
  rolesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  rolesLabel: {
    fontSize: 13,          // Harmonisé (était 12)
    fontWeight: '600',
    color: '#333333',
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,       // Harmonisé (était 12)
    gap: 4,
  },
  roleText: {
    color: '#ffffff',
    fontSize: 13,          // Harmonisé (était 11)
    fontWeight: '600',
  },

  // Avantages harmonisés
  benefitsList: {
    gap: 8,
    marginTop: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
    flex: 1,
  },

  // Boutons harmonisés
  instantButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,   // Harmonisé (était 12)
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,         // Ajouté pour cohérence
    marginBottom: 24,      // Harmonisé (était 12)
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,                // Harmonisé (était 6)
  },
  instantButtonDisabled: {
    backgroundColor: '#cccccc', // Harmonisé (aurait pu être différent)
  },
  instantButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  instantButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,                // Harmonisé (était 6)
  },
  instantButtonLoadingText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '400',
  },

  manualButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,   // Harmonisé (était 12)
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,         // Ajouté pour cohérence
    marginBottom: 24,      // Harmonisé (était 12)
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,                // Harmonisé (était 6)
  },
  manualButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },

  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 24,      // Harmonisé (était 16)
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '400',
  },

  // Note harmonisée
  noteSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,           // Harmonisé (était 12)
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 3,    // Ajouté pour cohérence
    borderLeftColor: '#000000', // Ajouté pour cohérence
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  noteText: {
    fontSize: 13,          // Harmonisé (était 11)
    color: '#333333',      // Harmonisé (était #666666)
    lineHeight: 16,        // Harmonisé (était 14)
    fontWeight: '400',
    flex: 1,
  },
});
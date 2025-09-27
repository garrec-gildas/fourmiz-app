// app/(tabs)/profile.tsx - VERSION FINALE COMPLÈTE
// Modifications appliquées :
// - Bouton suppression avec style identique au bouton déconnexion
// - Icône person-remove pour la suppression de compte
// - Ordre : Se déconnecter → Badge Membre Fourmiz → Supprimer mon compte
// - Toutes les fonctionnalités conservées

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
// 🆕 IMPORT DU COMPOSANT DE SUPPRESSION DE COMPTE
import AccountDeletion from '../../components/AccountDeletion';
// import { useWalletRoleAdapter } from '@/lib/useWalletRoleAdapter'; // DÉSACTIVÉ TEMPORAIREMENT

// ====================================
// CONFIGURATION ADMIN SÉCURISÉE
// ====================================

const AUTHORIZED_ADMIN_EMAILS = ['garrec.gildas@gmail.com'];

// 🛡️ HELPERS DE SÉCURITÉ POUR EMAIL ET ADMIN
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const checkEmailInList = (email: string | null | undefined, authorizedEmails: string[]): boolean => {
  if (!email || typeof email !== 'string') return false;
  return authorizedEmails.includes(email);
};

// ====================================
// INTERFACE POUR LES STATISTIQUES UNIFIÉES
// ====================================

interface UnifiedStats {
  // Stats client
  clientOrders: number;
  clientRating: number | null;
  clientHasRating: boolean;
  clientSpending: number;
  clientCompletionRate: number;
  
  // Stats fourmiz
  fourmizMissions: number;
  fourmizRating: number | null;
  fourmizHasRating: boolean;
  fourmizEarnings: number;
  fourmizCompletionRate: number;
  
  // Wallet
  walletBalance: number;
  walletTotalEarned: number;
}

// TYPES ET HELPERS
const getUserRoles = (profile: any): string[] => {
  if (!profile || !profile.roles || !Array.isArray(profile.roles)) {
    return [];
  }
  return profile.roles;
};

const hasRole = (profile: any, role: string): boolean => {
  if (!profile || !role) return false;
  const roles = getUserRoles(profile);
  return Array.isArray(roles) && roles.includes(role);
};

// COMPOSANT DOCUMENT
const DocumentDisplaySimple = React.memo(({ documentPath }: { documentPath: string | null }) => {
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const imageUrl = useMemo(() => {
    if (!documentPath) return null;
    
    try {
      if (documentPath.startsWith('http')) {
        return documentPath;
      }
      
      const possibleBuckets = ['user-documents', 'documents', 'uploads', 'user_documents'];
      
      for (const bucketName of possibleBuckets) {
        try {
          const { data } = supabase.storage.from(bucketName).getPublicUrl(documentPath);
          if (data?.publicUrl) {
            return data.publicUrl;
          }
        } catch (bucketError) {
          continue;
        }
      }
      
      return null;
      
    } catch (error: any) {
      return null;
    }
  }, [documentPath]);

  const handleUpload = useCallback(() => {
    router.push('/auth/complete-profile?force_edit=true&from=profile&focus=document');
  }, []);

  useEffect(() => {
    if (documentPath && imageUrl) {
      setImageLoading(true);
      setImageError(false);
    } else {
      setImageLoading(false);
      setImageError(false);
    }
  }, [documentPath, imageUrl]);

  if (!documentPath) {
    return (
      <View style={styles.documentContainer}>
        <View style={styles.documentPlaceholder}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#666666" />
          <Text style={styles.documentPlaceholderText}>Aucun document</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
            <Ionicons name="camera" size={16} color="#ffffff" />
            <Text style={styles.uploadButtonText}>Ajouter un document</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!imageUrl) {
    return (
      <View style={styles.documentContainer}>
        <View style={styles.documentPlaceholder}>
          <Ionicons name="document-outline" size={20} color="#666666" />
          <Text style={styles.documentPlaceholderText}>Document non disponible</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
            <Text style={styles.uploadButtonText}>Ajouter un document</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.documentContainer}>
      {imageLoading && !imageError && (
        <View style={styles.documentPlaceholder}>
          <Ionicons name="document-outline" size={20} color="#666666" />
          <Text style={styles.documentPlaceholderText}>Chargement...</Text>
        </View>
      )}
      
      {!imageError && (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.documentImage,
            imageLoading && { opacity: 0 }
          ]}
          onLoadStart={() => {
            setImageLoading(true);
            setImageError(false);
          }}
          onLoadEnd={() => {
            setImageLoading(false);
            setImageError(false);
          }}
          onError={() => {
            setImageLoading(false);
            setImageError(true);
          }}
        />
      )}
      
      {imageError && (
        <View style={styles.documentPlaceholder}>
          <Ionicons name="document-outline" size={20} color="#666666" />
          <Text style={styles.documentPlaceholderText}>Document non disponible</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
            <Text style={styles.uploadButtonText}>Ajouter un document</Text>
          </TouchableOpacity>
        </View>
      )}

      {!imageLoading && !imageError && (
        <View style={styles.documentStatus}>
          <Ionicons name="checkmark-circle" size={16} color="#000000" />
          <Text style={styles.documentStatusText}>Document vérifié</Text>
        </View>
      )}
    </View>
  );
});

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Statistiques unifiées
  const [unifiedStats, setUnifiedStats] = useState<UnifiedStats>({
    clientOrders: 0,
    clientRating: null,
    clientHasRating: false,
    clientSpending: 0,
    clientCompletionRate: 0,
    fourmizMissions: 0,
    fourmizRating: null,
    fourmizHasRating: false,
    fourmizEarnings: 0,
    fourmizCompletionRate: 0,
    walletBalance: 0,
    walletTotalEarned: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualActionInProgress, setManualActionInProgress] = useState(false);

  // États pour les accordéons des sections
  const [showStats, setShowStats] = useState(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);

  // ====================================
  // HOOK WALLET DÉSACTIVÉ - VARIABLES DE REMPLACEMENT
  // ====================================
  /*
  const { 
    currentRole: hookCurrentRole, 
    userProfile, 
    loading: roleLoading, 
    canSwitchRole, 
    switchingRole, 
    switchRole: handleRoleSwitch,
    hasClientRole,
    hasFourmizRole,
    
    walletBalance,
    walletLoading,
    walletError,
    
    canUseWalletAsClient,
    canReceiveInWallet,
    needsClientRoleForWallet,
    
    enableClientRoleForWallet,
    requestPayout,
    refreshWallet,
    
    getContextualMessage
  } = useWalletRoleAdapter(profile);
  */

  // Variables de remplacement simplifiées
  const userProfile = profile;
  const hasClientRole = hasRole(profile, 'client');
  const hasFourmizRole = hasRole(profile, 'fourmiz');
  const canReceiveInWallet = hasFourmizRole;
  const needsClientRoleForWallet = false;
  const walletBalance = { availableBalance: 0, totalEarned: 0 };
  const refreshWallet = async () => {
    console.log('🔄 Refresh wallet simulé (hook désactivé)');
  };
  const enableClientRoleForWallet = async () => {
    Alert.alert('Fonction temporairement désactivée', 'Le hook wallet sera restauré après correction');
  };

  const profileToUse = useMemo(() => userProfile || profile, [userProfile, profile]);

  // ====================================
  // FONCTION : CHARGEMENT STATISTIQUES UNIFIÉES SIMPLIFIÉE
  // ====================================
  const loadUnifiedStats = useCallback(async (userParam: any, profileParam: any) => {
    if (!userParam?.id || !profileParam) return;
    
    try {
      console.log('📊 === CHARGEMENT STATISTIQUES SIMPLIFIÉES ===');
      console.log('🔍 Profile user_id:', profileParam.user_id);
      console.log('🔍 Auth user.id:', userParam?.id);
      
      let newStats: UnifiedStats = {
        clientOrders: 0,
        clientRating: null,
        clientHasRating: false,
        clientSpending: 0,
        clientCompletionRate: 0,
        fourmizMissions: 0,
        fourmizRating: null,
        fourmizHasRating: false,
        fourmizEarnings: 0,
        fourmizCompletionRate: 0,
        walletBalance: 0, // Simplifié
        walletTotalEarned: 0, // Simplifié
      };

      // ====================================
      // 📊 CHARGEMENT STATS CLIENT
      // ====================================
      console.log('👤 Chargement statistiques client...');
      
      try {
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, proposed_amount, status, urgency_surcharge')
          .eq('client_id', profileParam.user_id);

        if (!ordersError && orders) {
          newStats.clientOrders = orders.length;
          
          const paidOrders = orders.filter(order => 
            order.status !== 'annulee' && order.status !== 'refusee' && order.status !== 'cancelled'
          );
          
          newStats.clientSpending = paidOrders.reduce((sum, order) => {
            const baseAmount = parseFloat(order.proposed_amount) || 0;
            const urgencyFee = parseFloat(order.urgency_surcharge) || 0;
            return sum + baseAmount + urgencyFee;
          }, 0);
          
          const completedOrders = orders.filter(order => order.status === 'terminee');
          newStats.clientCompletionRate = newStats.clientOrders > 0 
            ? Math.round((completedOrders.length / newStats.clientOrders) * 100)
            : 0;
        }
      } catch (error: any) {
        console.warn('❌ Erreur stats client:', error.message);
      }

      // Récupérer les ratings client depuis le profil
      if (profileParam.client_has_real_rating && profileParam.client_rating) {
        newStats.clientRating = parseFloat(profileParam.client_rating);
        newStats.clientHasRating = true;
      }

      // ====================================
      // 🐜 CHARGEMENT STATS FOURMIZ
      // ====================================
      console.log('🐜 Chargement statistiques fourmiz...');
      
      try {
        const { data: fourmizOrders, error: fourmizOrdersError } = await supabase
          .from('orders')
          .select('id, proposed_amount, status')
          .eq('fourmiz_id', profileParam.user_id);

        if (!fourmizOrdersError && fourmizOrders) {
          newStats.fourmizMissions = fourmizOrders.length;
          
          const completedMissions = fourmizOrders.filter(order => order.status === 'terminee');
          newStats.fourmizCompletionRate = newStats.fourmizMissions > 0 
            ? Math.round((completedMissions.length / newStats.fourmizMissions) * 100)
            : 0;
        }
      } catch (error: any) {
        console.warn('❌ Erreur stats fourmiz missions:', error.message);
      }

      // Chargement des gains fourmiz
      try {
        const { data: fourmizGains, error: gainsError } = await supabase
          .from('services_gains')
          .select('amount, created_at')
          .eq('fourmiz_id', profileParam.user_id);

        if (!gainsError && fourmizGains) {
          newStats.fourmizEarnings = fourmizGains.reduce((sum, gain) => {
            const amount = parseFloat(gain.amount) || 0;
            return sum + amount;
          }, 0);
        }
      } catch (error: any) {
        console.warn('❌ Erreur stats fourmiz gains:', error.message);
      }

      // Récupérer les ratings fourmiz depuis le profil
      if (profileParam.fourmiz_has_real_rating && profileParam.fourmiz_rating) {
        newStats.fourmizRating = parseFloat(profileParam.fourmiz_rating);
        newStats.fourmizHasRating = true;
      }

      console.log('📊 === STATISTIQUES SIMPLIFIÉES FINALES ===');
      console.log('👤 Client:', {
        commandes: newStats.clientOrders,
        rating: newStats.clientRating,
        dépenses: newStats.clientSpending,
        taux: newStats.clientCompletionRate
      });
      console.log('🐜 Fourmiz:', {
        missions: newStats.fourmizMissions,
        rating: newStats.fourmizRating,
        gains: newStats.fourmizEarnings,
        taux: newStats.fourmizCompletionRate
      });

      setUnifiedStats(newStats);

    } catch (error: any) {
      console.error('❌ Erreur critique chargement stats simplifiées:', error);
      setError('Impossible de charger les statistiques');
    }
  }, []); // Pas de dépendance sur walletBalance

  // CHARGEMENT INITIAL DU PROFIL
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user?.id) {
          console.log('🔍 === CHARGEMENT PROFIL CORRIGÉ ===');
          
          // Vérification admin sécurisée
          const hasAdminAccess = checkEmailInList(user.email, AUTHORIZED_ADMIN_EMAILS);
          setIsAdmin(hasAdminAccess);
          console.log('🛡️ Admin access pour', user.email, ':', hasAdminAccess);
          
          const { data: freshProfile, error } = await supabase
            .from('profiles')
            .select(`
              *,
              missions_completed,
              orders_placed,
              client_rating,
              client_has_real_rating,
              fourmiz_rating,
              fourmiz_has_real_rating
            `)
            .eq('user_id', user.id)
            .single();
          
          if (error) {
            console.error('❌ Erreur chargement profil:', error);
            setError('Erreur de chargement du profil');
            return;
          }
          
          if (freshProfile) {
            setProfile(freshProfile);
          }
        }
      } catch (error) {
        console.error('❌ Erreur critique chargement profil:', error);
        setError('Erreur de chargement du profil');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, []);

  // CHARGEMENT DES STATS UNIFIÉES
  useEffect(() => {
    if (user && profileToUse) {
      console.log('🔄 === DÉCLENCEMENT CHARGEMENT STATS SIMPLIFIÉES ===');
      loadUnifiedStats(user, profileToUse);
    }
  }, [user?.id, profileToUse?.id, loadUnifiedStats]);

  const handleRefresh = useCallback(async () => {
    console.log('🔄 === REFRESH COMPLET CORRIGÉ ===');
    setRefreshing(true);
    await reloadProfile();
    if (user && profileToUse) {
      await loadUnifiedStats(user, profileToUse);
    }
    await refreshWallet();
    setRefreshing(false);
  }, [user?.id, profileToUse?.id, loadUnifiedStats, refreshWallet]);

  const handleClientUpgrade = useCallback(async () => {
    try {
      await enableClientRoleForWallet();
    } catch (error) {
      Alert.alert('Erreur', 'Fonctionnalité temporairement désactivée');
    }
  }, [enableClientRoleForWallet]);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              router.replace('/auth/signin');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          }
        }
      ]
    );
  }, []);

  const handleEditProfile = useCallback(() => {
    router.push('/auth/complete-profile?force_edit=true&from=profile&redirect_to=profile');
  }, []);

  const reloadProfile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      console.log('🔄 === RELOAD PROFILE CORRIGÉ ===');
      const { data: freshProfile, error } = await supabase
        .from('profiles')
        .select(`
          *,
          missions_completed,
          orders_placed,
          client_rating,
          client_has_real_rating,
          fourmiz_rating,
          fourmiz_has_real_rating
        `)
        .eq('user_id', user.id)
        .single();
      
      if (!error && freshProfile) {
        setProfile(freshProfile);
      }
    } catch (error) {
      console.error('❌ Erreur reload profile:', error);
    }
  }, [user?.id]);

  const handleManualDeleteDocument = useCallback(async () => {
    const currentProfile = profileToUse;
    
    if (!currentProfile?.id_document_path || manualActionInProgress) {
      return;
    }
    
    Alert.alert(
      'Supprimer le document',
      'Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setManualActionInProgress(true);
              
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                  id_document_path: null,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', currentProfile.user_id || currentProfile.id);
                
              if (updateError) {
                throw updateError;
              } 
              
              setProfile(prev => prev ? { 
                ...prev, 
                id_document_path: null 
              } : null);
              
              Alert.alert('Succès', 'Document supprimé avec succès. Vous pouvez maintenant en uploader un nouveau.');
              
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le document. Veuillez réessayer.');
            } finally {
              setManualActionInProgress(false);
            }
          }
        }
      ]
    );
  }, [profileToUse?.id_document_path, manualActionInProgress]);

  // ====================================
  // ÉTAT POUR LE COMPOSANT DE SUPPRESSION
  // ====================================
  const [showAccountDeletion, setShowAccountDeletion] = useState(false);

  // ====================================
  // FONCTION POUR OUVRIR LE COMPOSANT DE SUPPRESSION COMPLET
  // ====================================
  const handleDeleteAccount = useCallback(async () => {
    Alert.alert(
      'Désactiver mon compte',
      'Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible et supprimera toutes vos données.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          style: 'destructive',
          onPress: () => {
            // Ouvrir le composant de suppression complet qui gère tout
            setShowAccountDeletion(true);
          }
        }
      ]
    );
  }, []);

  // ====================================
  // FONCTIONS POUR LES REDIRECTIONS
  // ====================================
  const handleGoToEarnings = useCallback(() => {
    console.log('🔀 Redirection vers page earnings');
    router.push('/earnings');
  }, []);

  const handleGoToCriteria = useCallback(() => {
    console.log('🔀 Redirection vers page criteria');
    router.push('/criteria');
  }, []);

  const handleGoToNetwork = useCallback(() => {
    console.log('🔀 Redirection vers page network');
    router.push('/network');
  }, []);

  const handleGoToRewards = useCallback(() => {
    console.log('🔀 Redirection vers page rewards');
    router.push('/rewards');
  }, []);

  const handleGoToAdmin = useCallback(() => {
    console.log('🛡️ Redirection vers admin dashboard');
    router.push('/admin/dashboard');
  }, []);

  const handleGoToFourmizPreview = useCallback(() => {
    console.log('🔀 Redirection vers fiche fourmiz');
    router.push('/fourmiz-preview');
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: 0, marginTop: 0 }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={32} color="#333333" />
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!profileToUse) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={32} color="#666666" />
          <Text style={styles.errorTitle}>Profil non trouvé</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.push('/auth/complete-profile')}>
            <Text style={styles.retryButtonText}>Compléter mon profil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profileToUse?.firstname && profileToUse?.lastname 
    ? `${safeString(profileToUse.firstname)} ${safeString(profileToUse.lastname)}` 
    : safeString(profileToUse?.firstname) || safeString(user?.email) || 'Utilisateur';

  const userRoles = getUserRoles(profileToUse);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon profil</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#000000']}
            tintColor="#000000"
          />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER UTILISATEUR */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profileToUse.avatar_url ? (
              <Image 
                source={{ uri: profileToUse.avatar_url }} 
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {profileToUse.firstname ? profileToUse.firstname.charAt(0).toUpperCase() : '👤'}
                </Text>
              </View>
            )}
            
            {hasRole(profileToUse, 'admin') && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#ffffff" />
              </View>
            )}
          </View>
          
          <Text style={styles.userName}>{displayName}</Text>
        </View>

        {/* SECTION ADMIN */}
        {isAdmin && (
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <TouchableOpacity 
                onPress={handleGoToAdmin}
                activeOpacity={0.7}
              >
                <View style={styles.adminCardContent}>
                  <View style={styles.adminIconContainer}>
                    <Ionicons name="shield-checkmark" size={20} color="#000000" />
                  </View>
                  <View style={styles.adminInfo}>
                    <Text style={styles.adminTitle}>Administration</Text>
                    <Text style={styles.adminDescription}>Gérer l'application et les utilisateurs</Text>
                  </View>
                  <View style={styles.sectionExpandButton}>
                    <Ionicons 
                      name="chevron-forward" 
                      size={16} 
                      color="#666666" 
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECTION STATISTIQUES */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <TouchableOpacity 
              onPress={() => setShowStats(!showStats)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <Ionicons name="analytics-outline" size={20} color="#000000" />
                <Text style={styles.sectionTitle}>Mes statistiques</Text>
                <View style={styles.sectionExpandButton}>
                  <Ionicons 
                    name={showStats ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#666666" 
                  />
                </View>
              </View>
            </TouchableOpacity>
            
            {showStats && (
              <View style={styles.sectionContent}>
                <View style={styles.unifiedStatsGrid}>
                  {/* Section Client */}
                  {(hasRole(profileToUse, 'client') || unifiedStats.clientOrders > 0) && (
                    <>
                      <Text style={styles.statsSubsectionTitle}>👤 En tant que Client</Text>
                      <View style={styles.statsRow}>
                        <StatCard 
                          title="Commandes passées" 
                          value={unifiedStats.clientOrders.toString()} 
                          icon="receipt-outline"
                        />
                        <StatCard 
                          title="Note client" 
                          value={
                            unifiedStats.clientHasRating && unifiedStats.clientRating
                              ? `${unifiedStats.clientRating.toFixed(1)}/5`
                              : 'Pas encore noté'
                          }
                          icon="star"
                        />
                      </View>
                      <View style={styles.statsRow}>
                        <StatCard 
                          title="Total dépensé" 
                          value={`${unifiedStats.clientSpending.toFixed(2)}€`} 
                          icon="cash-outline"
                        />
                        <StatCard 
                          title="Taux de finalisation" 
                          value={`${unifiedStats.clientCompletionRate}%`} 
                          icon="checkmark-circle-outline"
                        />
                      </View>
                    </>
                  )}

                  {/* Section Fourmiz */}
                  {(hasRole(profileToUse, 'fourmiz') || unifiedStats.fourmizMissions > 0) && (
                    <>
                      <Text style={styles.statsSubsectionTitle}>🐜 En tant que Fourmiz</Text>
                      <View style={styles.statsRow}>
                        <StatCard 
                          title="Missions réalisées" 
                          value={unifiedStats.fourmizMissions.toString()} 
                          icon="construct-outline"
                        />
                        <StatCard 
                          title="Note fourmiz" 
                          value={
                            unifiedStats.fourmizHasRating && unifiedStats.fourmizRating
                              ? `${unifiedStats.fourmizRating.toFixed(1)}/5`
                              : 'Pas encore noté'
                          }
                          icon="star"
                        />
                      </View>
                      <View style={styles.statsRow}>
                        <StatCard 
                          title="Total gagné" 
                          value={`${unifiedStats.fourmizEarnings.toFixed(2)}€`} 
                          icon="trending-up-outline"
                        />
                        <StatCard 
                          title="Taux de réussite" 
                          value={`${unifiedStats.fourmizCompletionRate}%`} 
                          icon="trophy-outline"
                        />
                      </View>
                    </>
                  )}

                  {/* Message si aucune activité */}
                  {unifiedStats.clientOrders === 0 && unifiedStats.fourmizMissions === 0 && (
                    <View style={styles.noStatsContainer}>
                      <Ionicons name="analytics-outline" size={24} color="#666666" />
                      <Text style={styles.noStatsText}>
                        Commencez à utiliser Fourmiz pour voir vos statistiques apparaître ici !
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* SECTION MA FICHE DE PRÉSENTATION */}
        {hasRole(profileToUse, 'fourmiz') && (
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <TouchableOpacity 
                onPress={handleGoToFourmizPreview}
                activeOpacity={0.7}
              >
                <View style={styles.sectionHeader}>
                  <Ionicons name="card-outline" size={20} color="#000000" />
                  <Text style={styles.sectionTitle}>Ma fiche de présentation</Text>
                  <View style={styles.sectionExpandButton}>
                    <Ionicons 
                      name="chevron-forward" 
                      size={16} 
                      color="#666666" 
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECTION GÉRER MES RÉFÉRENCES */}
        {hasRole(profileToUse, 'fourmiz') && (
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <TouchableOpacity 
                onPress={() => {
                  console.log('🔀 Redirection vers gestion des références');
                  router.push('/references');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.sectionHeader}>
                  <Ionicons name="images-outline" size={20} color="#000000" />
                  <Text style={styles.sectionTitle}>Gérer mes références</Text>
                  <View style={styles.sectionExpandButton}>
                    <Ionicons 
                      name="chevron-forward" 
                      size={16} 
                      color="#666666" 
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECTION GÉRER MES CRITÈRES - DÉPLACÉ ICI */}
        {hasRole(profileToUse, 'fourmiz') && (
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <TouchableOpacity onPress={handleGoToCriteria} activeOpacity={0.7}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="filter-outline" size={20} color="#000000" />
                  <Text style={styles.sectionTitle}>Gérer mes critères</Text>
                  <Ionicons name="chevron-forward" size={16} color="#666666" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECTION INFORMATIONS PERSONNELLES */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <TouchableOpacity 
              onPress={() => setShowPersonalInfo(!showPersonalInfo)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={20} color="#000000" />
                <Text style={styles.sectionTitle}>Informations personnelles</Text>
                <View style={styles.sectionExpandButton}>
                  <Ionicons 
                    name={showPersonalInfo ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#666666" 
                  />
                </View>
              </View>
            </TouchableOpacity>
            
            {showPersonalInfo && (
              <View style={styles.sectionContent}>
                <InfoRow label="Rôles" value={userRoles.join(', ') || 'Non renseigné'} icon="person" />
                <InfoRow label="Email" value={safeString(profileToUse.email) || safeString(user?.email) || 'Non renseigné'} icon="mail" />
                <InfoRow label="Téléphone" value={safeString(profileToUse.phone || profileToUse.telephone || profileToUse.mobile) || 'Non renseigné'} icon="call" />
                <InfoRow 
                  label="Statut juridique" 
                  value={
                    profileToUse.legal_status === 'particulier' ? 'Particulier' :
                    profileToUse.legal_status === 'travailleur_independant' ? 'Travailleur indépendant' :
                    profileToUse.legal_status === 'entreprise' ? 'Entreprise' :
                    'Non renseigné'
                  } 
                  icon="business" 
                />
                <InfoRow label="Adresse" value={safeString(profileToUse.address) || 'Non renseignée'} icon="location" />
                <InfoRow label="Code postal" value={safeString(profileToUse.postal_code) || 'Non renseigné'} icon="mail" />
                <InfoRow label="Ville" value={safeString(profileToUse.city) || 'Non renseignée'} icon="map" />

                {hasRole(profileToUse, 'fourmiz') && (
                  <>
                    <InfoRow 
                      label="Pièce d'identité" 
                      value={profileToUse.id_document_path ? 'Fournie' : 'Non fournie'} 
                      icon="document-text" 
                      status={profileToUse.id_document_path ? 'success' : 'warning'}
                    />

                    <View style={styles.documentSection}>
                      <Text style={styles.documentLabel}>Pièce d'identité :</Text>
                      <DocumentDisplaySimple documentPath={profileToUse.id_document_path} />
                      
                      {profileToUse.id_document_path && (
                        <TouchableOpacity 
                          style={[styles.uploadButton, { backgroundColor: '#333333', marginTop: 12 }]}
                          onPress={handleManualDeleteDocument}
                          disabled={manualActionInProgress}
                        >
                          {manualActionInProgress ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Ionicons name="trash" size={16} color="#ffffff" />
                          )}
                          <Text style={styles.uploadButtonText}>
                            {manualActionInProgress ? 'Suppression...' : 'Supprimer le document'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}

                <View style={styles.sectionFooter}>
                  <TouchableOpacity 
                    onPress={handleEditProfile} 
                    style={styles.sectionActionButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create" size={16} color="#ffffff" />
                    <Text style={styles.sectionActionButtonText}>Modifier mon profil</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* AUTRES SECTIONS DE NAVIGATION */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <TouchableOpacity onPress={handleGoToRewards} activeOpacity={0.7}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trophy-outline" size={20} color="#000000" />
                <Text style={styles.sectionTitle}>Mes Récompenses</Text>
                <Ionicons name="chevron-forward" size={16} color="#666666" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <TouchableOpacity onPress={handleGoToEarnings} activeOpacity={0.7}>
              <View style={styles.sectionHeader}>
                <Ionicons name="wallet-outline" size={20} color="#000000" />
                <Text style={styles.sectionTitle}>Mes Gains & Portefeuille</Text>
                <Ionicons name="chevron-forward" size={16} color="#666666" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <TouchableOpacity onPress={handleGoToNetwork} activeOpacity={0.7}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={20} color="#000000" />
                <Text style={styles.sectionTitle}>Mon Réseau</Text>
                <Ionicons name="chevron-forward" size={16} color="#666666" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION ACTIONS - BOUTONS AVEC BADGE AU MILIEU */}
        <View style={styles.actionsContainer}>
          {/* 1. BOUTON SE DÉCONNECTER */}
          <TouchableOpacity 
            onPress={handleLogout} 
            style={styles.actionButton}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        {/* BADGE MEMBRE FOURMIZ */}
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            Membre Fourmiz depuis {profileToUse.created_at ? new Date(profileToUse.created_at).getFullYear() : new Date().getFullYear()}
          </Text>
        </View>

        {/* BOUTON SUPPRESSION */}
        <View style={styles.actionsContainer}>
          {/* 2. BOUTON SUPPRIMER MON COMPTE - STYLE IDENTIQUE */}
          <TouchableOpacity 
            onPress={handleDeleteAccount} 
            style={styles.actionButton}
            activeOpacity={0.8}
          >
            <Ionicons name="person-remove" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Désactiver mon compte</Text>
          </TouchableOpacity>
        </View>

        {/* COMPOSANT DE SUPPRESSION COMPLET AVEC COLLECTE DE RAISON */}
        {showAccountDeletion && user && (
          <AccountDeletion 
            userEmail={user.email || ''}
            userId={user.id}
            onClose={() => setShowAccountDeletion(false)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ====================================
// COMPOSANTS HELPER
// ====================================

const InfoRow = ({ label, value, icon, status }: { 
  label: string; 
  value: string; 
  icon: string; 
  status?: 'success' | 'warning' | 'error' 
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLeft}>
      <Ionicons name={icon as any} size={16} color="#666666" />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <View style={styles.infoRight}>
      <Text style={[
        styles.infoValue,
        status === 'success' && styles.infoValueSuccess,
        status === 'warning' && styles.infoValueWarning,
        status === 'error' && styles.infoValueError,
      ]}>
        {value}
      </Text>
      {status === 'success' && <Ionicons name="checkmark-circle" size={16} color="#000000" />}
      {status === 'warning' && <Ionicons name="warning" size={16} color="#666666" />}
      {status === 'error' && <Ionicons name="close-circle" size={16} color="#333333" />}
    </View>
  </View>
);

const StatCard = ({ title, value, icon, subtitle }: { 
  title: string; 
  value: string; 
  icon: string;
  subtitle?: string;
}) => (
  <View style={styles.statCard}>
    <Ionicons name={icon as any} size={18} color="#000000" style={styles.statIcon} />
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={styles.statValue}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// ====================================
// STYLES
// ====================================

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff', 
    marginTop: -40,
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  content: { 
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 300,
    minHeight: '100%',
  },
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
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
  retryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  avatarPlaceholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  adminBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#000000',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  sectionExpandButton: {
    padding: 4,
  },
  sectionContent: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  sectionActionButtonText: {
    color: '#ffffff',
    fontWeight: '400',
    fontSize: 13,
  },
  adminCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    marginRight: 16,
  },
  adminInfo: {
    flex: 1,
  },
  adminTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  adminDescription: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 20,
    fontWeight: '400',
  },
  unifiedStatsGrid: {
    gap: 16,
  },
  statsSubsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginTop: 8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statIcon: {
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },
  noStatsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 12,
  },
  noStatsText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: '#333333',
    marginLeft: 8,
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  infoValue: {
    fontSize: 13,
    color: '#666666',
    marginRight: 8,
    textAlign: 'right',
    flex: 1,
    fontWeight: '400',
  },
  infoValueSuccess: { color: '#000000', fontWeight: '600' },
  infoValueWarning: { color: '#666666', fontWeight: '400' },
  infoValueError: { color: '#333333', fontWeight: '400' },
  infoText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    fontWeight: '400',
  },
  documentSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f8f8f8',
  },
  documentLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: '#333333',
    marginBottom: 12,
  },
  documentContainer: {
    alignItems: 'center',
  },
  documentImage: {
    width: 200,
    height: 120,
    resizeMode: 'contain',
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    marginBottom: 8,
  },
  documentPlaceholder: {
    width: 200,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  documentPlaceholderText: {
    fontSize: 13,
    color: '#666666',
    marginTop: 4,
    fontWeight: '400',
    textAlign: 'center',
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 6,
  },
  documentStatusText: {
    color: '#000000',
    fontWeight: '400',
    fontSize: 13,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 12,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '400',
  },
  // SECTION ACTIONS - BOUTONS IDENTIQUES
  actionsContainer: {
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    // Style exactement identique pour les deux boutons
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    // Style de texte exactement identique
    color: '#ffffff',
    fontWeight: '400',
    fontSize: 13,
  },
  badgeContainer: {
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  badgeText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
    textAlign: 'center',
  },
});
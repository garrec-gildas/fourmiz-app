// app/(tabs)/profile.tsx - VERSION UNIFIÉE avec useRoleManager
// 🚀 CORRIGÉ : Utilise le même système de rôles que index.tsx
// ✅ Synchronisation parfaite avec l'écran d'accueil

import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRoleManager } from '../../lib/roleManager';

// 🛡️ HELPERS SÉCURISÉS pour éviter les erreurs .includes()
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

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

// ✅ TYPES TYPESCRIPT STRICTS
interface ProfileStats {
  commandesCount: number;
  averageRating: number;
  totalEarnings: number;
  completionRate: number;
}

export default function ProfileScreen() {
  // 🚀 UTILISATION DU CONTEXTE AUTH (comme index.tsx)
  const { user, userProfile } = useAuth();
  
  // 🎯 UTILISATION DU MÊME HOOK useRoleManager que index.tsx
  const {
    currentRole,
    availableRoles,
    switchingRole,
    canSwitchRole,
    switchRole: handleRoleSwitch
  } = useRoleManager(userProfile);

  // ✅ ÉTAT LOCAL POUR LES STATS
  const [stats, setStats] = useState<ProfileStats>({
    commandesCount: 0,
    averageRating: 0,
    totalEarnings: 0,
    completionRate: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔄 CHARGEMENT INITIAL
  useEffect(() => {
    if (user && userProfile) {
      loadUserStats();
    }
  }, [user, userProfile, currentRole]); // 🎯 Recharger quand le rôle change

  // 📊 RÉCUPÉRATION DES STATISTIQUES UTILISATEUR
  const loadUserStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Chargement des statistiques pour le rôle:', currentRole);

      let commandesCount = 0;
      let totalEarnings = 0;
      let averageRating = 0;
      let completionRate = 0;

      if (currentRole === 'client') {
        // Statistiques CLIENT
        const { data: clientOrders, error: ordersError } = await supabase
          .from('orders')
          .select('id, proposed_amount, status')
          .eq('client_id', user.id);

        if (ordersError) {
          console.warn('⚠️ Erreur récupération commandes client:', ordersError);
        } else if (clientOrders) {
          commandesCount = clientOrders.length;
          
          // Calculer les dépenses totales (commandes terminées)
          const completedOrders = clientOrders.filter(order => order.status === 'terminee');
          totalEarnings = completedOrders.reduce((sum, order) => sum + (order.proposed_amount || 0), 0);
          
          // Taux de complétion
          completionRate = commandesCount > 0 ? (completedOrders.length / commandesCount) * 100 : 0;
        }

        // Notes reçues comme client
        const { data: clientRatings, error: ratingsError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('client_id', user.id);

        if (ratingsError) {
          console.warn('⚠️ Erreur récupération notes client:', ratingsError);
        } else if (clientRatings && clientRatings.length > 0) {
          const totalRating = clientRatings.reduce((sum, review) => sum + (review.rating || 0), 0);
          averageRating = totalRating / clientRatings.length;
        }
        
      } else if (currentRole === 'fourmiz' || currentRole === 'admin') {
        // Statistiques FOURMIZ
        const { data: fourmizOrders, error: ordersError } = await supabase
          .from('orders')
          .select('id, proposed_amount, status, fourmiz_fee')
          .eq('fourmiz_id', user.id);

        if (ordersError) {
          console.warn('⚠️ Erreur récupération missions fourmiz:', ordersError);
        } else if (fourmizOrders) {
          commandesCount = fourmizOrders.length;
          
          // Calculer les revenus (commission fourmiz)
          const completedOrders = fourmizOrders.filter(order => order.status === 'terminee');
          totalEarnings = completedOrders.reduce((sum, order) => {
            return sum + (order.fourmiz_fee || order.proposed_amount * 0.15);
          }, 0);
          
          // Taux de complétion
          completionRate = commandesCount > 0 ? (completedOrders.length / commandesCount) * 100 : 0;
        }

        // Notes reçues comme fourmiz
        const { data: fourmizRatings, error: ratingsError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('fourmiz_id', user.id);

        if (ratingsError) {
          console.warn('⚠️ Erreur récupération notes fourmiz:', ratingsError);
        } else if (fourmizRatings && fourmizRatings.length > 0) {
          const totalRating = fourmizRatings.reduce((sum, review) => sum + (review.rating || 0), 0);
          averageRating = totalRating / fourmizRatings.length;
        }
      }

      // Mettre à jour les statistiques
      setStats({
        commandesCount,
        averageRating: Math.round(averageRating * 10) / 10,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        completionRate: Math.round(completionRate)
      });

      console.log('✅ Statistiques chargées:', { commandesCount, averageRating, totalEarnings, completionRate });

    } catch (error: any) {
      console.error('💥 ERREUR STATS UTILISATEUR:', error);
      setError('Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  }, [user, currentRole]);

  // 🔄 RAFRAÎCHIR LE PROFIL
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserStats();
    setRefreshing(false);
  }, [loadUserStats]);

  // 🎭 CHANGER DE RÔLE (utilise le même système que index.tsx)
  const handleChangeRole = useCallback(async () => {
    if (!canSwitchRole || switchingRole) return;
    
    // Trouver l'autre rôle disponible
    const otherRole = availableRoles.find(role => role !== currentRole);
    if (!otherRole) return;

    console.log('🔄 Changement de rôle vers:', otherRole);
    
    const result = await handleRoleSwitch(otherRole);
    
    if (result.success) {
      console.log('✅ Rôle changé avec succès vers:', otherRole);
      // Les stats seront rechargées automatiquement via useEffect
    } else {
      console.error('❌ Erreur changement de rôle:', result.error);
      Alert.alert('Erreur', result.error || 'Impossible de changer de rôle');
    }
  }, [canSwitchRole, switchingRole, availableRoles, currentRole, handleRoleSwitch]);

  // 📝 MODIFIER LE PROFIL
  const handleEditProfile = useCallback(() => {
    router.push('/auth/complete-profile');
  }, []);

  // 🚪 DÉCONNEXION SÉCURISÉE
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
              console.error('❌ Erreur déconnexion:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          }
        }
      ]
    );
  }, []);

  // 📱 ÉTAT DE CHARGEMENT
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 📱 ÉTAT D'ERREUR
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={64} color="#FF4444" />
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 📱 PROFIL NON TROUVÉ
  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#ccc" />
          <Text style={styles.errorTitle}>Profil non trouvé</Text>
          <Text style={styles.errorText}>
            Votre profil n'a pas pu être chargé. Veuillez compléter votre inscription.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.push('/auth/complete-profile')}>
            <Text style={styles.retryButtonText}>Compléter mon profil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 🎯 VARIABLES D'AFFICHAGE SÉCURISÉES
  const displayName = userProfile.firstname && userProfile.lastname 
    ? `${safeString(userProfile.firstname)} ${safeString(userProfile.lastname)}` 
    : safeString(userProfile.firstname) || safeString(user?.email) || 'Utilisateur';

  const roleLabel = {
    client: 'Client',
    fourmiz: 'Fourmiz',
    admin: 'Administrateur'
  }[currentRole];

  // ✅ INFORMATIONS SUR LES RÔLES (synchronisées avec index.tsx)
  const userRoles = getUserRoles(userProfile);
  const otherRoles = availableRoles.filter(role => role !== currentRole);

  // 🎨 RENDU PRINCIPAL
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FF4444']}
            tintColor="#FF4444"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 🎨 En-tête du profil */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {userProfile.avatar_url ? (
              <Image source={{ uri: userProfile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person-circle" size={80} color="#FF4444" />
            )}
            {/* ✅ BADGE ADMIN sécurisé */}
            {hasRole(userProfile, 'admin') && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#fff" />
              </View>
            )}
          </View>
          
          <Text style={styles.title}>Mon profil</Text>
          <Text style={styles.userName}>{displayName}</Text>
          
          <View style={styles.roleContainer}>
            <Text style={styles.subtitle}>Statut actuel : {roleLabel}</Text>
            
            {/* 🎯 BOUTON DE CHANGEMENT DE RÔLE (même logique que index.tsx) */}
            {canSwitchRole && otherRoles.length > 0 && (
              <TouchableOpacity 
                onPress={handleChangeRole} 
                style={[
                  styles.switchRoleButton,
                  switchingRole && styles.switchRoleButtonDisabled
                ]}
                disabled={switchingRole}
                activeOpacity={0.8}
              >
                {switchingRole ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="swap-horizontal" size={16} color="#fff" />
                )}
                <Text style={styles.switchRoleText}>
                  {switchingRole 
                    ? 'Changement...' 
                    : `Passer en ${otherRoles[0] === 'admin' ? 'Admin' : otherRoles[0] === 'fourmiz' ? 'Fourmiz' : 'Client'}`
                  }
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 📊 Statistiques en temps réel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Mes statistiques ({roleLabel})</Text>
          
          <View style={styles.statsContainer}>
            <StatCard 
              title={currentRole === 'client' ? 'Commandes' : 'Missions'} 
              value={stats.commandesCount.toString()} 
              icon="receipt-outline"
            />
            <StatCard 
              title="Note moyenne" 
              value={stats.averageRating > 0 ? stats.averageRating.toString() : '—'} 
              icon="star"
              subtitle={stats.averageRating > 0 ? '/5.0' : 'Aucune note'}
            />
            <StatCard 
              title={currentRole === 'client' ? 'Dépenses' : 'Revenus'} 
              value={stats.totalEarnings > 0 ? `€${stats.totalEarnings}` : '€0'} 
              icon="cash-outline"
              subtitle="Total" 
            />
            <StatCard 
              title="Complétion" 
              value={`${stats.completionRate}%`} 
              icon="checkmark-circle-outline"
              subtitle="Taux" 
            />
          </View>
        </View>

        {/* 👤 Informations personnelles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Informations personnelles</Text>
          
          <View style={styles.infoCard}>
            {/* ✅ AFFICHAGE SÉCURISÉ des rôles */}
            <InfoRow label="Rôles" value={userRoles.join(', ') || 'Non renseigné'} icon="person" />
            <InfoRow label="Email" value={safeString(userProfile.email) || safeString(user?.email) || 'Non renseigné'} icon="mail" />
            <InfoRow label="Téléphone" value={safeString(userProfile.phone) || 'Non renseigné'} icon="call" />
            <InfoRow 
              label="Profil" 
              value={userProfile.profile_completed ? 'Complet' : 'À compléter'} 
              icon="checkmark-circle" 
              status={userProfile.profile_completed ? 'success' : 'warning'}
            />
          </View>
        </View>

        {/* 📍 Adresse */}
        {(userProfile.address || userProfile.city) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Adresse</Text>
            
            <View style={styles.infoCard}>
              <InfoRow label="Adresse" value={safeString(userProfile.address) || 'Non renseignée'} icon="location" />
              {userProfile.building && <InfoRow label="Bâtiment" value={safeString(userProfile.building)} icon="business" />}
              {userProfile.floor && <InfoRow label="Étage" value={safeString(userProfile.floor)} icon="layers" />}
              <InfoRow label="Code postal" value={safeString(userProfile.postal_code) || 'Non renseigné'} icon="mail" />
              <InfoRow label="Ville" value={safeString(userProfile.city) || 'Non renseignée'} icon="map" />
            </View>
          </View>
        )}

        {/* 🐜 Informations Fourmiz */}
        {hasRole(userProfile, 'fourmiz') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🐜 Informations Fourmiz</Text>
            
            <View style={styles.infoCard}>
              <InfoRow 
                label="RIB" 
                value={userProfile.rib ? 'Renseigné' : 'Non renseigné'} 
                icon="card" 
                status={userProfile.rib ? 'success' : 'warning'}
              />
              
              <InfoRow 
                label="Pièce d'identité" 
                value={userProfile.id_document_path ? 'Fournie' : 'Non fournie'} 
                icon="document-text" 
                status={userProfile.id_document_path ? 'success' : 'warning'}
              />

              {userProfile.id_document_path && (
                <View style={styles.documentSection}>
                  <Text style={styles.documentLabel}>📄 Pièce d'identité :</Text>
                  <View style={styles.documentContainer}>
                    <Image
                      source={{ 
                        uri: supabase.storage
                          .from('user-documents')
                          .getPublicUrl(userProfile.id_document_path).data.publicUrl
                      }}
                      style={styles.documentImage}
                    />
                    <View style={styles.documentStatus}>
                      <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                      <Text style={styles.documentStatusText}>Document vérifié</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 🔧 Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            onPress={handleEditProfile} 
            style={styles.editButton}
            activeOpacity={0.8}
          >
            <Ionicons name="create" size={20} color="#fff" />
            <Text style={styles.editText}>Modifier mon profil</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleLogout} 
            style={styles.logoutButton}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out" size={20} color="#fff" />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        {/* 🎉 Badge de membre */}
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            🎉 Membre Fourmiz depuis {userProfile.created_at ? new Date(userProfile.created_at).getFullYear() : new Date().getFullYear()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  content: { 
    padding: 20,
    paddingBottom: 100,
  },

  // 📱 États de chargement et erreur
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // 🎨 En-tête profil
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  adminBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#28a745',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#666',
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  roleContainer: {
    alignItems: 'center',
    gap: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  switchRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  switchRoleButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  switchRoleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // 📋 Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // 📄 Lignes d'information
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginLeft: 8,
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
    textAlign: 'right',
    flex: 1,
  },
  infoValueSuccess: { color: '#28a745' },
  infoValueWarning: { color: '#ffc107' },
  infoValueError: { color: '#dc3545' },
  
  // 📄 Document
  documentSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
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
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentStatusText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // 📊 Statistiques
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF4444',
    marginVertical: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  statSubtitle: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  
  // 🔧 Actions
  actionsContainer: {
    marginTop: 20,
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA726',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  
  // 🎉 Badge
  badgeContainer: {
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe6e6',
  },
  badgeText: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: '600',
    textAlign: 'center',
  },
});

// ✅ COMPOSANT LIGNE D'INFORMATION
const InfoRow = ({ label, value, icon, status }: { 
  label: string; 
  value: string; 
  icon: string; 
  status?: 'success' | 'warning' | 'error' 
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLeft}>
      <Ionicons name={icon as any} size={16} color="#666" />
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
      {status === 'success' && <Ionicons name="checkmark-circle" size={16} color="#28a745" />}
      {status === 'warning' && <Ionicons name="warning" size={16} color="#ffc107" />}
      {status === 'error' && <Ionicons name="close-circle" size={16} color="#dc3545" />}
    </View>
  </View>
);

// ✅ COMPOSANT CARTE STATISTIQUE
const StatCard = ({ title, value, icon, subtitle }: { 
  title: string; 
  value: string; 
  icon: string;
  subtitle?: string;
}) => (
  <View style={styles.statCard}>
    <Ionicons name={icon as any} size={24} color="#FF4444" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);
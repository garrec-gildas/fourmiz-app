// app/admin/dashboard/_layout.tsx - LAYOUT ADMIN COMPLET - VERSION ULTRA-SÉCURISÉE
// 🔒 CORRECTION FINALE : Rendu de Texte 100% sécurisé
// ✅ Fonctions helper pour éviter toute erreur de rendu de Texte

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname, Slot } from 'expo-router';
import { 
  ArrowLeft, Settings, Users, BarChart3, DollarSign, 
  LayoutGrid, Award, TrendingUp, Shield, LogOut,
  Bell, RotateCcw, Download, Menu, X
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

// 🛡️ HELPERS DE RENDU SÉCURISÉ
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const safeNumber = (value: any): string => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return String(Math.floor(Number(value)));
};

const SafeText = ({ children, style }: { children: any; style?: any }) => (
  <Text style={style}>{safeString(children)}</Text>
);

// 📊 INTERFACES STRICTES
interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  roles: string[];
}

interface AdminStats {
  totalUsers: number;
  activeServices: number;
  totalEarnings: number;
  pendingReports: number;
  lastUpdate: string;
}

interface NavigationItem {
  key: string;
  label: string;
  icon: any;
  route: string;
  badge?: number;
  color: string;
}

export default function AdminDashboardLayout() {
  // 📋 ÉTATS SELON MODÈLE SERVICESSCREEN/SETTINGSSCREEN
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // États métier
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [notifications, setNotifications] = useState<number>(0);
  
  const pathname = usePathname();

  // 🗂️ NAVIGATION MODULES SELON AUDIT COMPLET 
  const navigationItems: NavigationItem[] = [
    {
      key: 'dashboard',
      label: 'Vue d\'ensemble',
      icon: LayoutGrid,
      route: '/admin/dashboard',
      color: '#4CAF50'
    },
    {
      key: 'services',
      label: 'Services',
      icon: Settings,
      route: '/admin/dashboard/services',
      color: '#2196F3'
    },
    {
      key: 'settings',
      label: 'Badges & Config',
      icon: Award,
      route: '/admin/dashboard/settings',
      color: '#FF9800'
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      route: '/admin/dashboard/analytics',
      color: '#9C27B0'
    },
    {
      key: 'earnings',
      label: 'Finances',
      icon: DollarSign,
      route: '/admin/dashboard/earnings',
      color: '#4CAF50'
    },
    {
      key: 'users',
      label: 'Utilisateurs',
      icon: Users,
      route: '/admin/dashboard/users',
      badge: 3,
      color: '#607D8B'
    },
  ];

  useEffect(() => {
    loadAdminData();
  }, []);

  // 📊 CHARGEMENT DONNÉES SELON MODÈLE EXCELLENCE
  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🚀 Chargement layout admin...');

      await loadCurrentUser();
      
      // Charger les autres données seulement si l'auth réussit 
      await Promise.allSettled([
        loadAdminStats(),
        loadNotifications()
      ]);

    } catch (error) {
      console.error('❌ Erreur chargement admin layout:', error);
      setError('Impossible de charger le dashboard admin');
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔐 FONCTION loadCurrentUser ROBUSTE AVEC CRÉATION AUTOMATIQUE
  const loadCurrentUser = async () => {
    try {
      console.log('🔐 Tentative de connexion admin...');
      
      // 1. Vérifier l'authentification
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ Erreur auth:', userError);
        throw new Error(`Erreur d'authentification: ${userError.message}`);
      }
      
      if (!user) {
        console.error('❌ Utilisateur non authentifié');
        throw new Error('Utilisateur non authentifié');
      }
      
      console.log('✅ Utilisateur authentifié:', user.email);
      
      // 2. Vérifier si l'utilisateur est autorisé comme admin
      const AUTHORIZED_ADMIN_EMAILS = [
        'garrec.gildas@gmail.com',
        // Ajoutez d'autres emails admin autorisés ici
      ];
      
      if (!AUTHORIZED_ADMIN_EMAILS.includes(user.email || '')) {
        console.error('❌ Email non autorisé pour l\'admin:', user.email);
        throw new Error('Accès admin non autorisé');
      }
      
      console.log('✅ Email autorisé pour admin');
      
      // 3. Stratégie de recherche/création du profil
      let profile = null;
      
      // 3a. Chercher d'abord par ID utilisateur (plus fiable)
      console.log('🔍 Recherche profil par ID utilisateur...');
      try {
        const { data: profileById, error: profileByIdError } = await supabase
          .from('profiles')
          .select(`
            id, 
            firstname,
            lastname,
            roles, 
            email
          `)
          .eq('id', user.id)
          .single();
          
        if (!profileByIdError && profileById) {
          console.log('✅ Profil trouvé par ID:', profileById);
          profile = profileById;
        }
      } catch (error) {
        console.log('🔍 Profil non trouvé par ID, continuons...');
      }
      
      // 3b. Si pas trouvé par ID, chercher par email
      if (!profile) {
        console.log('🔍 Recherche profil par email...');
        try {
          const { data: profileByEmail, error: profileByEmailError } = await supabase
            .from('profiles')
            .select(`
              id, 
              firstname,
              lastname,
              roles, 
              email
            `)
            .eq('email', user.email)
            .single();
            
          if (!profileByEmailError && profileByEmail) {
            console.log('✅ Profil trouvé par email:', profileByEmail);
            profile = profileByEmail;
            
            // Mettre à jour l'ID si nécessaire
            if (profile.id !== user.id) {
              console.log('🔄 Mise à jour ID du profil...');
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ id: user.id })
                .eq('email', user.email);
                
              if (updateError) {
                console.warn('⚠️ Impossible de mettre à jour l\'ID:', updateError);
              } else {
                profile.id = user.id;
              }
            }
          }
        } catch (error) {
          console.log('🔍 Profil non trouvé par email, continuons...');
        }
      }
      
      // 3c. Si toujours pas trouvé, créer automatiquement le profil admin
      if (!profile) {
        console.log('🆕 Création automatique du profil admin...');
        
        const newProfile = {
          id: user.id,
          email: user.email,
          firstname: 'Gildas',
          lastname: 'Garrec',
          roles: ['admin', 'user'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select(`
            id, 
            firstname,
            lastname,
            roles, 
            email
          `)
          .single();
          
        if (createError) {
          console.error('❌ Erreur création profil:', createError);
          throw new Error(`Impossible de créer le profil admin: ${createError.message}`);
        }
        
        console.log('✅ Profil admin créé avec succès:', createdProfile);
        profile = createdProfile;
      }
      
      // 4. Vérifier/Ajouter les rôles admin si nécessaire
      if (profile && (!profile.roles || !profile.roles.includes('admin'))) {
        console.log('🔧 Ajout du rôle admin...');
        
        const updatedRoles = [...(profile.roles || [])];
        if (!updatedRoles.includes('admin')) updatedRoles.push('admin');
        if (!updatedRoles.includes('user')) updatedRoles.push('user');
        
        const { data: updatedProfile, error: updateRoleError } = await supabase
          .from('profiles')
          .update({ 
            roles: updatedRoles,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select(`
            id, 
            firstname,
            lastname,
            roles, 
            email
          `)
          .single();
          
        if (updateRoleError) {
          console.warn('⚠️ Impossible de mettre à jour les rôles:', updateRoleError);
        } else {
          console.log('✅ Rôles admin mis à jour');
          profile = updatedProfile;
        }
      }
      
      // 5. Validation finale
      if (!profile) {
        throw new Error('Impossible de charger ou créer le profil admin');
      }
      
      // Vérifier les droits admin (après correction éventuelle)
      if (!profile.roles || !profile.roles.includes('admin')) {
        throw new Error('Droits administrateur manquants');
      }
      
      // 6. Construire full_name à partir de firstname + lastname
      const fullName = profile.firstname && profile.lastname 
        ? `${profile.firstname} ${profile.lastname}`.trim()
        : profile.firstname || profile.lastname || user.email || 'Admin';
      
      console.log('✅ Profil admin chargé avec succès:', {
        id: profile.id,
        email: profile.email,
        name: fullName,
        roles: profile.roles
      });
      
      // 7. Mettre à jour l'état 
      setCurrentUser({
        id: profile.id,
        email: user.email,
        full_name: fullName,
        roles: profile.roles
      });
      setIsAdmin(true);
      
      return profile;
      
    } catch (error: any) {
      console.error('❌ Erreur auth admin:', error);
      setCurrentUser(null);
      setIsAdmin(false);
      
      Alert.alert(
        'Accès refusé', 
        error.message || 'Vous devez être administrateur autorisé pour accéder à cette section.',
        [
          { text: 'Retour', onPress: () => router.replace('/') }
        ]
      );
      throw error;
    }
  };

  // 📊 STATISTIQUES ADMIN TEMPS RÉEL
  const loadAdminStats = async () => {
    try {
      console.log('📊 Chargement des statistiques admin...');
      
      // Requêtes parallèles pour performance
      const [usersCount, servicesCount, earningsSum, reportsCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select('total_amount').eq('status', 'completed'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      const totalEarnings = earningsSum.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      setAdminStats({
        totalUsers: usersCount.count || 0,
        activeServices: servicesCount.count || 0,
        totalEarnings: totalEarnings || 0,
        pendingReports: reportsCount.count || 0,
        lastUpdate: new Date().toISOString()
      });

      console.log('✅ Stats admin chargées');

    } catch (error) {
      console.error('❌ Erreur stats admin:', error);
      // Valeurs par défaut si erreur
      setAdminStats({
        totalUsers: 0,
        activeServices: 0,
        totalEarnings: 0,
        pendingReports: 0,
        lastUpdate: new Date().toISOString()
      });
    }
  };

  // 🔔 NOTIFICATIONS ADMIN CORRIGÉES AVEC GESTION D'ERREUR COMPLÈTE
  const loadNotifications = async () => {
    try {
      const { count, error } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) {
        // Si la table n'existe pas, définir 0 notifications sans erreur
        if (error.code === '42P01' || error.code === 'PGRST204') { 
          console.log('⚠️ Table admin_notifications non trouvée, notifications = 0');
          setNotifications(0);
          return;
        }
        
        // Autres erreurs - log mais ne pas faire planter l'app
        console.warn('⚠️ Erreur notifications (non critique):', error);
        setNotifications(0);
        return;
      }
      
      setNotifications(count || 0);
      console.log('✅ Notifications chargées:', count || 0);

    } catch (error) {
      console.warn('⚠️ Erreur notifications (non critique):', error);
      // En cas d'erreur, définir 0 notifications sans faire planter l'app
      setNotifications(0);
    }
  };

  // 🚪 DÉCONNEXION SÉCURISÉE
  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter de l\'administration ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await supabase.auth.signOut();
              router.replace('/');
            } catch (error) {
              console.error('Erreur déconnexion:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  // 🔄 REFRESH DONNÉES
  const handleRefresh = async () => {
    setSaving(true);
    await loadAdminData();
    setSaving(false);
  };

  // 🗂️ NAVIGATION HELPER
  const isActiveRoute = (route: string) => {
    return pathname === route || pathname.startsWith(route + '/');
  };

  // 🗂️ COMPOSANT NAVIGATION ITEM ULTRA-SÉCURISÉ
  const NavigationItem = ({ item }: { item: NavigationItem }) => {
    const isActive = isActiveRoute(item.route);
    const IconComponent = item.icon;
    const label = safeString(item.label);
    const badgeValue = item.badge && typeof item.badge === 'number' && item.badge > 0 ? safeNumber(item.badge) : null;

    return (
      <TouchableOpacity
        style={[styles.navItem, isActive && styles.navItemActive]}
        onPress={() => {
          router.push(item.route);
          setSidebarOpen(false);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.navItemIcon, isActive && { backgroundColor: item.color + '20' }]}>
          <IconComponent size={20} color={isActive ? item.color : '#666'} />
        </View>
        <SafeText style={[styles.navItemText, isActive && { color: item.color, fontWeight: 'bold' }]}>
          {label}
        </SafeText>
        {badgeValue ? (
          <View style={styles.navItemBadge}>
            <SafeText style={styles.navItemBadgeText}>{badgeValue}</SafeText>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  // ⏳ ÉTATS DE CHARGEMENT SELON MODÈLE
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <SafeText style={styles.loadingText}>Chargement administration...</SafeText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Shield size={64} color="#FF4444" />
          <SafeText style={styles.errorTitle}>Erreur Administration</SafeText>
          <SafeText style={styles.errorText}>{error || 'Erreur inconnue'}</SafeText>
          <TouchableOpacity style={styles.retryButton} onPress={loadAdminData}>
            <SafeText style={styles.retryButtonText}>Réessayer</SafeText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentUser || !isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Shield size={64} color="#FF4444" />
          <SafeText style={styles.errorTitle}>Accès Refusé</SafeText>
          <SafeText style={styles.errorText}>Authentification admin requise</SafeText>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/')}>
            <SafeText style={styles.retryButtonText}>Retour</SafeText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const userName = currentUser?.full_name ? safeString(currentUser.full_name) : 
                   currentUser?.email ? safeString(currentUser.email) : 'Admin';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.layout}>
        {/* Header Admin */}
        <LinearGradient 
          colors={['#FF4444', '#FF6B6B']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                style={styles.menuButton}
                onPress={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X size={24} color="#fff" /> : <Menu size={24} color="#fff" />}
              </TouchableOpacity>
              <View style={styles.headerInfo}>
                <SafeText style={styles.headerTitle}>Administration</SafeText>
                <SafeText style={styles.headerSubtitle}>{userName}</SafeText>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={handleRefresh}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <RotateCcw size={20} color="#fff" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.headerButton}>
                <Bell size={20} color="#fff" />
                {notifications > 0 ? (
                  <View style={styles.headerBadge}>
                    <SafeText style={styles.headerBadgeText}>{safeNumber(notifications)}</SafeText>
                  </View>
                ) : null}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={handleLogout}
              >
                <LogOut size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats rapides */}
          {adminStats ? (
            <View style={styles.quickStats}>
              <View style={styles.quickStat}>
                <SafeText style={styles.quickStatValue}>{safeNumber(adminStats.totalUsers)}</SafeText>
                <SafeText style={styles.quickStatLabel}>Utilisateurs</SafeText>
              </View>
              <View style={styles.quickStat}>
                <SafeText style={styles.quickStatValue}>{safeNumber(adminStats.activeServices)}</SafeText>
                <SafeText style={styles.quickStatLabel}>Services</SafeText>
              </View>
              <View style={styles.quickStat}>
                <SafeText style={styles.quickStatValue}>{safeNumber(adminStats.totalEarnings)}€</SafeText>
                <SafeText style={styles.quickStatLabel}>CA total</SafeText>
              </View>
              <View style={styles.quickStat}>
                <SafeText style={styles.quickStatValue}>{safeNumber(adminStats.pendingReports)}</SafeText>
                <SafeText style={styles.quickStatLabel}>Signalements</SafeText>
              </View>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.content}>
          {/* Sidebar Navigation */}
          {sidebarOpen ? (
            <View style={styles.sidebar}>
              <ScrollView style={styles.navigation} showsVerticalScrollIndicator={false}>
                <SafeText style={styles.navigationTitle}>Navigation</SafeText>
                
                {navigationItems.map((item) => (
                  <NavigationItem key={item.key} item={item} />
                ))}
                
                <View style={styles.navigationDivider} />
                
                {/* Actions rapides */}
                <SafeText style={styles.navigationTitle}>Actions rapides</SafeText>
                
                <TouchableOpacity 
                  style={styles.quickAction}
                  onPress={() => router.push('/admin/dashboard/export')}
                >
                  <Download size={16} color="#666" />
                  <SafeText style={styles.quickActionText}>Exporter données</SafeText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.quickAction}
                  onPress={() => router.push('/admin/dashboard/logs')}
                >
                  <BarChart3 size={16} color="#666" />
                  <SafeText style={styles.quickActionText}>Logs système</SafeText>
                </TouchableOpacity>
              </ScrollView>
            </View>
          ) : null}

          {/* Contenu principal */}
          <View style={[styles.mainContent, sidebarOpen && styles.mainContentWithSidebar]}>
            <Slot />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  // Layout 
  layout: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
  },
  mainContentWithSidebar: {
    marginLeft: 280,
  },
  
  // Loading & Error (modèle settingsScreen)
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Header Admin
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.8,
  },

  // Sidebar
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E5E5',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  navigation: {
    flex: 1,
    padding: 20,
  },
  navigationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navigationDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 16,
  },

  // Navigation Items
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#F8F9FA',
  },
  navItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  navItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  navItemBadge: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navItemBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Quick Actions
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  quickActionText: {
    fontSize: 13,
    color: '#666',
  },
});
// app/admin/dashboard/index.tsx - DASHBOARD ADMIN CONNECTÉ À SUPABASE
// ✅ Combine TOUS les patterns d'excellence + vraies données Supabase
// ✅ Suppression des mocks, connexion temps réel
// ✅ Gestion d'erreur robuste selon SettingsScreen/ServicesScreen
// ✅ Harmonisation complète Lucide + design moderne

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  TrendingUp, Users, Settings, BarChart3, Euro, Award, 
  AlertTriangle, CheckCircle, Clock, Eye, EyeOff, 
  Download, Bell, Shield, Zap, Target, Star,
  ChevronRight, Activity, Calendar, Gift
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

// ✅ INTERFACES STRICTES (Modèle SettingsScreen Excellence)
interface DashboardOverview {
  totalUsers: number;
  activeUsers: number;
  totalServices: number;
  activeServices: number;
  hiddenServices: number;
  totalOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayouts: number;
  activeBadges: number;
  totalBadgesRewards: number;
  pendingReports: number;
  lastUpdate: string;
}

interface RecentActivity {
  id: string;
  type: 'user_signup' | 'service_created' | 'order_completed' | 'badge_earned' | 'report_submitted';
  description: string;
  user_name: string;
  timestamp: string;
  amount?: number;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  is_resolved: boolean;
}

interface QuickAction {
  key: string;
  label: string;
  icon: any;
  route: string;
  color: string;
  badge?: number;
  description: string;
}

export default function AdminDashboardIndex() {
  // ✅ ÉTATS SELON MODÈLE SERVICESSCREEN/SETTINGSSCREEN
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // États métier
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
    getCurrentUser();
    setupRealtimeSubscriptions();
  }, []);

  // ✅ AUTHENTIFICATION SELON MODÈLE SERVICESSCREEN
  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      console.log('✅ Utilisateur admin connecté:', user?.email);
    } catch (error) {
      console.error('❌ Erreur récupération utilisateur:', error);
    }
  };

  // ✅ CHARGEMENT DONNÉES SELON MODÈLE EXCELLENCE
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📊 Chargement dashboard admin...');

      await Promise.allSettled([
        loadOverviewData(),
        loadRecentActivities(),
        loadSystemAlerts()
      ]);

      console.log('✅ Dashboard admin chargé avec succès');
      
    } catch (error) {
      console.error('💥 Erreur chargement dashboard admin:', error);
      setError('Impossible de charger le dashboard admin');
      Alert.alert('Erreur', 'Impossible de charger le dashboard admin');
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ VUE D'ENSEMBLE COMPLÈTE AVEC VRAIES DONNÉES SUPABASE
  const loadOverviewData = async () => {
    try {
      console.log('📈 Chargement vue d\'ensemble depuis Supabase...');

      // ✅ Requêtes parallèles pour performance optimale
      const [
        usersResult,
        servicesResult,
        ordersResult,
        badgesResult,
        reportsResult,
        payoutsResult
      ] = await Promise.allSettled([
        // Utilisateurs avec profils complets
        supabase
          .from('profiles')
          .select('id, created_at')
          .order('created_at', { ascending: false }),
        
        // Services avec statuts
        supabase
          .from('services')
          .select('id, title, user_id, created_at, status')
          .order('created_at', { ascending: false }),
        
        // Commandes avec montants
        supabase
          .from('orders')
          .select('id, total_amount, status, created_at')
          .order('created_at', { ascending: false }),
        
        // Badges du catalogue avec contrôles admin
        supabase
          .from('badges_catalog')
          .select('id, value, currency, is_active, is_visible')
          .eq('is_active', true),
        
        // Signalements en attente
        supabase
          .from('reports')
          .select('id, status, priority, created_at')
          .order('created_at', { ascending: false }),
        
        // Virements en attente
        supabase
          .from('payouts')
          .select('id, amount, status, created_at')
          .eq('status', 'pending')
      ]);

      // ✅ Gestion robuste des erreurs de requêtes
      const usersData = usersResult.status === 'fulfilled' ? usersResult.value.data || [] : [];
      const servicesData = servicesResult.status === 'fulfilled' ? servicesResult.value.data || [] : [];
      const ordersData = ordersResult.status === 'fulfilled' ? ordersResult.value.data || [] : [];
      const badgesData = badgesResult.status === 'fulfilled' ? badgesResult.value.data || [] : [];
      const reportsData = reportsResult.status === 'fulfilled' ? reportsResult.value.data || [] : [];
      const payoutsData = payoutsResult.status === 'fulfilled' ? payoutsResult.value.data || [] : [];

      // ✅ Calculs métier intelligents
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const totalUsers = usersData.length;
      const activeUsers = usersData.filter(u => 
        new Date(u.created_at) >= last30Days
      ).length;

      const totalServices = servicesData.length;
      const activeServices = servicesData.filter(s => 
        s.status === 'active' || s.status === 'published'
      ).length;

      // ✅ Services masqués depuis AsyncStorage (pattern ServicesScreen)
      let hiddenServices = 0;
      try {
        const hiddenServicesData = await AsyncStorage.getItem('hidden_services');
        const hiddenServicesList = hiddenServicesData ? JSON.parse(hiddenServicesData) : [];
        hiddenServices = hiddenServicesList.length;
        console.log(`📋 ${hiddenServices} services masqués détectés`);
      } catch (error) {
        console.error('⚠️ Erreur lecture services masqués:', error);
      }

      // ✅ Calculs financiers précis
      const completedOrders = ordersData.filter(o => o.status === 'completed');
      const totalRevenue = completedOrders.reduce((sum, order) => 
        sum + (parseFloat(order.total_amount) || 0), 0
      );
      const monthlyRevenue = completedOrders
        .filter(o => new Date(o.created_at) >= thisMonth)
        .reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);

      // ✅ Métriques badges (pattern SettingsScreen)
      const activeBadges = badgesData.filter(b => b.is_active && b.is_visible).length;
      const totalBadgesRewards = badgesData.reduce((sum, badge) => 
        sum + (parseFloat(badge.value) || 0), 0
      );

      // ✅ Signalements et paiements
      const pendingReports = reportsData.filter(r => 
        r.status === 'pending' || r.status === 'investigating'
      ).length;
      const pendingPayouts = payoutsData.reduce((sum, p) => 
        sum + (parseFloat(p.amount) || 0), 0
      );

      const overview: DashboardOverview = {
        totalUsers,
        activeUsers,
        totalServices,
        activeServices,
        hiddenServices,
        totalOrders: ordersData.length,
        totalRevenue,
        monthlyRevenue,
        pendingPayouts,
        activeBadges,
        totalBadgesRewards,
        pendingReports,
        lastUpdate: new Date().toISOString()
      };

      setOverview(overview);
      console.log(`✅ Vue d'ensemble: ${totalUsers} users, ${totalServices} services, ${formatCurrency(totalRevenue)} CA`);

    } catch (error) {
      console.error('❌ Erreur vue d\'ensemble Supabase:', error);
      throw error;
    }
  };

  // ✅ ACTIVITÉS RÉCENTES AVEC VRAIES DONNÉES SUPABASE
  const loadRecentActivities = async () => {
    try {
      console.log('🕒 Chargement activités récentes depuis Supabase...');
      
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // ✅ Requêtes parallèles pour toutes les activités récentes
      const [
        newUsersResult,
        newServicesResult,
        completedOrdersResult,
        earnedBadgesResult
      ] = await Promise.allSettled([
        // Nouveaux utilisateurs (dernières 24h)
        supabase
          .from('profiles')
          .select('id, first_name, last_name, created_at')
          .gte('created_at', last24Hours)
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Nouveaux services avec profils
        supabase
          .from('services')
          .select(`
            id, title, created_at, user_id,
            profiles!services_user_id_fkey(first_name, last_name)
          `)
          .gte('created_at', last24Hours)
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Commandes complétées récentes avec clients
        supabase
          .from('orders')
          .select(`
            id, total_amount, created_at, client_id,
            profiles!orders_client_id_fkey(first_name, last_name)
          `)
          .eq('status', 'completed')
          .gte('updated_at', last24Hours)
          .order('updated_at', { ascending: false })
          .limit(5),
        
        // Badges récemment obtenus (si table user_badges existe)
        supabase
          .from('user_badges')
          .select(`
            id, created_at, user_id,
            profiles!user_badges_user_id_fkey(first_name, last_name),
            badges_catalog!user_badges_badge_id_fkey(name, value)
          `)
          .gte('created_at', last24Hours)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const activities: RecentActivity[] = [];

      // ✅ Traitement des nouveaux utilisateurs
      if (newUsersResult.status === 'fulfilled' && newUsersResult.value.data) {
        newUsersResult.value.data.forEach(user => {
          activities.push({
            id: `user_${user.id}`,
            type: 'user_signup',
            description: 'Nouvel utilisateur inscrit',
            user_name: `${user.first_name || 'Utilisateur'} ${user.last_name || ''}`.trim(),
            timestamp: user.created_at
          });
        });
      }

      // ✅ Traitement des nouveaux services
      if (newServicesResult.status === 'fulfilled' && newServicesResult.value.data) {
        newServicesResult.value.data.forEach(service => {
          const profile = service.profiles;
          activities.push({
            id: `service_${service.id}`,
            type: 'service_created',
            description: `Service "${service.title}" créé`,
            user_name: profile 
              ? `${profile.first_name || 'Fourmiz'} ${profile.last_name || ''}`.trim()
              : 'Fourmiz',
            timestamp: service.created_at
          });
        });
      }

      // ✅ Traitement des commandes complétées
      if (completedOrdersResult.status === 'fulfilled' && completedOrdersResult.value.data) {
        completedOrdersResult.value.data.forEach(order => {
          const profile = order.profiles;
          activities.push({
            id: `order_${order.id}`,
            type: 'order_completed',
            description: 'Commande terminée',
            user_name: profile 
              ? `${profile.first_name || 'Client'} ${profile.last_name || ''}`.trim()
              : 'Client',
            timestamp: order.created_at,
            amount: parseFloat(order.total_amount) || 0
          });
        });
      }

      // ✅ Traitement des badges obtenus
      if (earnedBadgesResult.status === 'fulfilled' && earnedBadgesResult.value.data) {
        earnedBadgesResult.value.data.forEach(userBadge => {
          const profile = userBadge.profiles;
          const badge = userBadge.badges_catalog;
          activities.push({
            id: `badge_${userBadge.id}`,
            type: 'badge_earned',
            description: `Badge "${badge?.name || 'Récompense'}" obtenu`,
            user_name: profile 
              ? `${profile.first_name || 'Utilisateur'} ${profile.last_name || ''}`.trim()
              : 'Utilisateur',
            timestamp: userBadge.created_at,
            amount: parseFloat(badge?.value) || 0
          });
        });
      }

      // ✅ Trier par timestamp et garder les plus récentes
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      setRecentActivities(sortedActivities);
      console.log(`✅ ${sortedActivities.length} activités récentes chargées depuis Supabase`);

    } catch (error) {
      console.error('❌ Erreur activités Supabase:', error);
      setRecentActivities([]);
    }
  };

  // ✅ ALERTES SYSTÈME BASÉES SUR VRAIES CONDITIONS SUPABASE
  const loadSystemAlerts = async () => {
    try {
      console.log('🚨 Vérification alertes système depuis Supabase...');
      
      const alerts: SystemAlert[] = [];

      // ✅ Vérifier services en attente de validation
      const { data: pendingServices, error: servicesError } = await supabase
        .from('services')
        .select('id, title')
        .in('status', ['pending', 'review', 'draft']);
      
      if (!servicesError && pendingServices && pendingServices.length > 0) {
        alerts.push({
          id: 'pending_services',
          type: 'warning',
          title: 'Services en attente',
          message: `${pendingServices.length} services attendent validation`,
          priority: 'medium',
          timestamp: new Date().toISOString(),
          is_resolved: false
        });
      }

      // ✅ Vérifier signalements urgents
      const { data: urgentReports, error: reportsError } = await supabase
        .from('reports')
        .select('id, reason, priority')
        .eq('status', 'pending')
        .eq('priority', 'high');
      
      if (!reportsError && urgentReports && urgentReports.length > 0) {
        alerts.push({
          id: 'urgent_reports',
          type: 'error',
          title: 'Signalements urgents',
          message: `${urgentReports.length} signalements prioritaires à traiter`,
          priority: 'high',
          timestamp: new Date().toISOString(),
          is_resolved: false
        });
      }

      // ✅ Vérifier paiements en attente depuis plus de 7 jours
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: oldPayouts, error: payoutsError } = await supabase
        .from('payouts')
        .select('id, amount, created_at')
        .eq('status', 'pending')
        .lt('created_at', weekAgo);
      
      if (!payoutsError && oldPayouts && oldPayouts.length > 0) {
        const totalAmount = oldPayouts.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        alerts.push({
          id: 'old_payouts',
          type: 'warning',
          title: 'Paiements en retard',
          message: `${oldPayouts.length} paiements (${formatCurrency(totalAmount)}) en attente depuis plus de 7 jours`,
          priority: 'medium',
          timestamp: new Date().toISOString(),
          is_resolved: false
        });
      }

      // ✅ Vérifier nouveaux utilisateurs non vérifiés
      const { data: unverifiedUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, email_verified')
        .eq('email_verified', false)
        .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());
      
      if (!usersError && unverifiedUsers && unverifiedUsers.length > 5) {
        alerts.push({
          id: 'unverified_users',
          type: 'info',
          title: 'Utilisateurs non vérifiés',
          message: `${unverifiedUsers.length} nouveaux utilisateurs n'ont pas vérifié leur email`,
          priority: 'low',
          timestamp: new Date().toISOString(),
          is_resolved: false
        });
      }

      setSystemAlerts(alerts);
      console.log(`✅ ${alerts.length} alertes système détectées depuis Supabase`);

    } catch (error) {
      console.error('❌ Erreur alertes système Supabase:', error);
      setSystemAlerts([]);
    }
  };

  // ✅ ABONNEMENTS TEMPS RÉEL SUPABASE
  const setupRealtimeSubscriptions = () => {
    console.log('🔄 Configuration abonnements temps réel Supabase...');

    // ✅ Abonnement nouveaux utilisateurs
    const usersChannel = supabase
      .channel('admin_dashboard_users')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'profiles'
      }, (payload) => {
        console.log('👤 Nouvel utilisateur en temps réel:', payload.new);
        // Recharger seulement les activités et overview
        loadRecentActivities();
        loadOverviewData();
      })
      .subscribe();

    // ✅ Abonnement nouveaux services
    const servicesChannel = supabase
      .channel('admin_dashboard_services')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'services'
      }, (payload) => {
        console.log('🛠️ Changement service en temps réel:', payload);
        loadRecentActivities();
        loadOverviewData();
        loadSystemAlerts(); // Services en attente
      })
      .subscribe();

    // ✅ Abonnement commandes
    const ordersChannel = supabase
      .channel('admin_dashboard_orders')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        console.log('📋 Commande mise à jour en temps réel:', payload.new);
        if (payload.new.status === 'completed') {
          loadRecentActivities();
          loadOverviewData(); // Mettre à jour revenus
        }
      })
      .subscribe();

    // ✅ Abonnement signalements
    const reportsChannel = supabase
      .channel('admin_dashboard_reports')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reports'
      }, (payload) => {
        console.log('🚨 Nouveau signalement en temps réel:', payload.new);
        loadSystemAlerts();
        loadOverviewData();
      })
      .subscribe();

    // ✅ Cleanup function
    return () => {
      console.log('🔄 Nettoyage abonnements temps réel...');
      usersChannel.unsubscribe();
      servicesChannel.unsubscribe();
      ordersChannel.unsubscribe();
      reportsChannel.unsubscribe();
    };
  };

  // ✅ REFRESH SELON MODÈLE
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  // ✅ NAVIGATION SÉCURISÉE
  const navigateToModule = (route: string) => {
    try {
      console.log(`🔄 Navigation vers: ${route}`);
      router.push(route);
    } catch (error) {
      console.error('❌ Erreur navigation:', error);
      Alert.alert('Erreur', 'Impossible de naviguer vers ce module');
    }
  };

  // ✅ ACTIONS RAPIDES ADMIN AVEC BADGES DYNAMIQUES
  const quickActions: QuickAction[] = [
    {
      key: 'services',
      label: 'Gérer Services',
      icon: Settings,
      route: '/admin/dashboard/services',
      color: '#2196F3',
      badge: overview?.hiddenServices || 0,
      description: 'CRUD services, masquage'
    },
    {
      key: 'badges',
      label: 'Badges & Config',
      icon: Award,
      route: '/admin/dashboard/settings',
      color: '#FF9800',
      badge: overview?.activeBadges || 0,
      description: 'Récompenses, parrainage'
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      route: '/admin/dashboard/analytics',
      color: '#9C27B0',
      description: 'KPIs, tendances'
    },
    {
      key: 'finances',
      label: 'Finances',
      icon: Euro,
      route: '/admin/dashboard/earnings',
      color: '#4CAF50',
      badge: overview ? Math.round(overview.pendingPayouts) : 0,
      description: 'Revenus, virements'
    },
    {
      key: 'users',
      label: 'Utilisateurs',
      icon: Users,
      route: '/admin/dashboard/users',
      color: '#607D8B',
      description: 'Gestion comptes'
    },
    {
      key: 'reports',
      label: 'Signalements',
      icon: AlertTriangle,
      route: '/admin/dashboard/reports',
      color: '#F44336',
      badge: overview?.pendingReports || 0,
      description: 'Modération urgente'
    }
  ];

  // ✅ HELPERS UTILITAIRES
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup': return Users;
      case 'service_created': return Settings;
      case 'order_completed': return CheckCircle;
      case 'badge_earned': return Award;
      case 'report_submitted': return AlertTriangle;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_signup': return '#4CAF50';
      case 'service_created': return '#2196F3';
      case 'order_completed': return '#8BC34A';
      case 'badge_earned': return '#FFD700';
      case 'report_submitted': return '#FF4444';
      default: return '#666';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return AlertTriangle;
      case 'warning': return Clock;
      case 'success': return CheckCircle;
      case 'info': return Bell;
      default: return Bell;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    
    return time.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ✅ GESTION LOADING/ERROR SELON MODÈLE EXCELLENCE
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement dashboard admin...</Text>
          <Text style={styles.loadingSubtext}>Connexion à Supabase en cours</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !overview) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Shield size={64} color="#FF4444" />
          <Text style={styles.errorTitle}>Erreur Dashboard</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#FF4444']}
            tintColor="#FF4444"
          />
        }
      >
        {/* Header avec welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>
            Tableau de bord administrateur 👋
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Vue d'ensemble de votre plateforme • Connecté à Supabase
          </Text>
          {overview && (
            <Text style={styles.lastUpdate}>
              Dernière MAJ : {new Date(overview.lastUpdate).toLocaleTimeString('fr-FR')} • Données temps réel
            </Text>
          )}
        </View>

        {/* Alertes système critiques */}
        {systemAlerts.length > 0 && (
          <View style={styles.alertsSection}>
            <Text style={styles.sectionTitle}>🚨 Alertes système</Text>
            {systemAlerts.map((alert) => {
              const AlertIcon = getAlertIcon(alert.type);
              return (
                <TouchableOpacity key={alert.id} style={[
                  styles.alertCard,
                  alert.type === 'error' && styles.alertCardError,
                  alert.type === 'warning' && styles.alertCardWarning
                ]}>
                  <AlertIcon size={20} color={alert.type === 'error' ? '#F44336' : '#FF9800'} />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                  </View>
                  <ChevronRight size={16} color="#666" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Vue d'ensemble KPIs */}
        {overview && (
          <View style={styles.overviewSection}>
            <Text style={styles.sectionTitle}>📊 Vue d'ensemble</Text>
            
            <View style={styles.kpiGrid}>
              {/* Utilisateurs */}
              <LinearGradient colors={['#4CAF50', '#66BB6A']} style={styles.kpiCard}>
                <Users size={24} color="#fff" />
                <Text style={styles.kpiValue}>{overview.totalUsers.toLocaleString('fr-FR')}</Text>
                <Text style={styles.kpiLabel}>Utilisateurs</Text>
                <Text style={styles.kpiSubtext}>+{overview.activeUsers} ce mois</Text>
              </LinearGradient>

              {/* Services */}
              <LinearGradient colors={['#2196F3', '#42A5F5']} style={styles.kpiCard}>
                <Settings size={24} color="#fff" />
                <Text style={styles.kpiValue}>{overview.totalServices}</Text>
                <Text style={styles.kpiLabel}>Services</Text>
                <Text style={styles.kpiSubtext}>
                  {overview.activeServices} actifs{overview.hiddenServices > 0 && ` • ${overview.hiddenServices} masqués`}
                </Text>
              </LinearGradient>

              {/* Revenus */}
              <LinearGradient colors={['#FF9800', '#FFB74D']} style={styles.kpiCard}>
                <Euro size={24} color="#fff" />
                <Text style={styles.kpiValue}>{formatCurrency(overview.totalRevenue).replace('€', '')}</Text>
                <Text style={styles.kpiLabel}>CA Total</Text>
                <Text style={styles.kpiSubtext}>{formatCurrency(overview.monthlyRevenue)} ce mois</Text>
              </LinearGradient>

              {/* Badges */}
              <LinearGradient colors={['#9C27B0', '#BA68C8']} style={styles.kpiCard}>
                <Award size={24} color="#fff" />
                <Text style={styles.kpiValue}>{overview.activeBadges}</Text>
                <Text style={styles.kpiLabel}>Badges actifs</Text>
                <Text style={styles.kpiSubtext}>{formatCurrency(overview.totalBadgesRewards)} total</Text>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* Actions rapides selon audit */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>⚡ Actions rapides</Text>
          
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <TouchableOpacity
                  key={action.key}
                  style={styles.actionCard}
                  onPress={() => navigateToModule(action.route)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                    <ActionIcon size={24} color={action.color} />
                    {action.badge && action.badge > 0 && (
                      <View style={styles.actionBadge}>
                        <Text style={styles.actionBadgeText}>
                          {action.badge > 99 ? '99+' : action.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                  <ChevronRight size={16} color="#999" />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Activités récentes */}
        <View style={styles.activitiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🕒 Activité récente</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          
          {recentActivities.length === 0 ? (
            <View style={styles.emptyState}>
              <Activity size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>Aucune activité récente</Text>
              <Text style={styles.emptyStateSubtext}>Les nouvelles activités apparaîtront ici</Text>
            </View>
          ) : (
            <View style={styles.activitiesList}>
              {recentActivities.map((activity) => {
                const ActivityIcon = getActivityIcon(activity.type);
                const color = getActivityColor(activity.type);
                
                return (
                  <View key={activity.id} style={styles.activityCard}>
                    <View style={[styles.activityIcon, { backgroundColor: color + '15' }]}>
                      <ActivityIcon size={16} color={color} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityDescription}>{activity.description}</Text>
                      <Text style={styles.activityUser}>{activity.user_name}</Text>
                      <Text style={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</Text>
                    </View>
                    {activity.amount && activity.amount > 0 && (
                      <Text style={styles.activityAmount}>+{formatCurrency(activity.amount)}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Actions système */}
        <View style={styles.systemActionsSection}>
          <Text style={styles.sectionTitle}>🔧 Actions système</Text>
          
          <TouchableOpacity style={styles.systemAction}>
            <Download size={20} color="#2196F3" />
            <Text style={styles.systemActionText}>Exporter données</Text>
            <ChevronRight size={16} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.systemAction}>
            <BarChart3 size={20} color="#FF9800" />
            <Text style={styles.systemActionText}>Logs système</Text>
            <ChevronRight size={16} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.systemAction}>
            <Shield size={20} color="#4CAF50" />
            <Text style={styles.systemActionText}>Sauvegardes</Text>
            <ChevronRight size={16} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  // Loading & Error (modèle SettingsScreen)
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
  loadingSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
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

  content: {
    flex: 1,
  },

  // Welcome Section
  welcomeSection: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
  },

  // Sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF4444',
  },

  // Alertes
  alertsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  alertCardError: {
    borderLeftColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  alertCardWarning: {
    borderLeftColor: '#FF9800',
    backgroundColor: '#FFF8E1',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 12,
    color: '#666',
  },

  // Vue d'ensemble
  overviewSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: (width - 76) / 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 2,
  },
  kpiSubtext: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },

  // Actions rapides
  quickActionsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },

  // Activités
  activitiesSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activitiesList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  activityUser: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: '#999',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },

  // Actions système
  systemActionsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  systemAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  systemActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },

  bottomSpacer: {
    height: 32,
  },
});
// app/(tabs)/calendar.tsx - VERSION STYLE ÉPURÉ HARMONISÉ AVEC SERVICES-REQUESTS
// ✅ STYLE EXACT DES CARTES DE SERVICES-REQUESTS APPLIQUÉ
// ✅ PAS D'ICÔNES COLORÉES, PAS DE COULEURS
// ✅ STYLE 100% MINIMALISTE ET COHÉRENT
// ✅ CHIFFRE EN NOIR POUR NOMBRE DE MISSIONS
// ✅ CENTRAGE PARFAITEMENT CORRIGÉ POUR LES DATES DU CALENDRIER

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useRoleManagerAdapter } from '../../hooks/useRoleManagerAdapter';

const { width } = Dimensions.get('window');

// TYPES (conservés exactement)
interface CalendarMission {
  id: number;
  client_id: string;
  fourmiz_id: string | null;
  service_id?: number;
  service_title?: string;
  description: string;
  date: string;
  start_time: string;
  end_time?: string;
  address: string;
  building?: string;
  floor?: string;
  proposed_amount: number;
  status: string;
  urgent?: boolean;
  confirmed_by_fourmiz?: boolean;
  created_at: string;
  
  client_profile?: {
    id: string;
    firstname?: string;
    lastname?: string;
    email?: string;
  };
  fourmiz_profile?: {
    id: string;
    firstname?: string;
    lastname?: string;
    email?: string;
  };
  services?: {
    id: number;
    title: string;
    category?: string;
    categorie?: string;
    description?: string;
  };
  
  isAssigned: boolean;
  clientName: string;
  serviceName: string;
}

interface AdminSettings {
  fourmiz_earning_percentage: number;
}

interface MonthStats {
  totalMissions: number;
  realizedRevenue: number;
  pendingRevenue: number;
  totalHours: number;
  completedMissions: number;
  cancelledMissions: number;
}

interface DayMissions {
  [date: string]: CalendarMission[];
}

// HELPERS (conservés exactement)
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const formatClientName = (client: any): string => {
  if (!client) return 'Client inconnu';
  
  const firstName = safeString(client?.firstname);
  const lastName = safeString(client?.lastname);
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) return firstName;
  if (lastName) return lastName;
  
  return 'Client';
};

const formatServiceName = (service: any, fallbackTitle?: string): string => {
  if (!service && !fallbackTitle) return 'Service';
  return safeString(service?.title || service?.name || fallbackTitle || 'Service');
};

const getCategoryForOrder = (order: CalendarMission): string => {
  if (order.service_id && order.services?.categorie) {
    return order.services.categorie;
  }
  
  if (order.service_id && order.services?.category) {
    return order.services.category;
  }
  
  return order.services?.categorie || order.services?.category || 'Non définie';
};

// HELPERS CALENDRIER (conservés exactement)
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  const firstDay = new Date(year, month, 1).getDay();
  return firstDay === 0 ? 6 : firstDay - 1; // Lundi = 0
};

const formatDateKey = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export default function CalendarScreen() {
  // ÉTATS PRINCIPAUX (conservés exactement)
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [adminSettings, setAdminSettings] = useState<AdminSettings>({ 
    fourmiz_earning_percentage: 0
  });

  // ÉTATS CALENDRIER COMPLET (conservés exactement)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  
  const [monthlyMissions, setMonthlyMissions] = useState<DayMissions>({});
  const [monthStats, setMonthStats] = useState<MonthStats>({
    totalMissions: 0,
    realizedRevenue: 0,
    pendingRevenue: 0,
    totalHours: 0,
    completedMissions: 0,
    cancelledMissions: 0
  });

  // NOUVEAUX ÉTATS POUR ACCORDÉONS (style services.tsx)
  const [showStatsDetails, setShowStatsDetails] = useState(false);
  const [showActiveMissions, setShowActiveMissions] = useState(true);
  const [showCompletedMissions, setShowCompletedMissions] = useState(false);
  const [showCancelledMissions, setShowCancelledMissions] = useState(false);

  // CHARGEMENT INITIAL (conservé exactement)
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        setUser(user);
        
        if (user?.id) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          setProfile(profileData);
        }

        await loadAdminSettings();
        
      } catch (error) {
        console.error('❌ Erreur critique initialisation calendar:', error);
        setError('Impossible de charger votre profil');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  // FONCTION ADMIN SETTINGS (conservée exactement)
  const loadAdminSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'fourmiz_earning_percentage')
        .single();

      if (error) {
        console.warn('❌ Erreur chargement admin_settings calendar:', error.message);
        return;
      }

      if (data?.setting_value && data.setting_value.trim() !== '') {
        const percentage = parseFloat(data.setting_value);
        
        if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
          setAdminSettings({ fourmiz_earning_percentage: percentage });
        }
      }
    } catch (error) {
      console.error('❌ Erreur critique admin_settings calendar:', error);
    }
  };

  // ROLE MANAGER (conservé exactement)
  const roleManager = useRoleManagerAdapter(profile);
  const {
    currentRole,
    userProfile
  } = roleManager || {};

  const isViewingAsFourmiz = useMemo(() => {
    const result = currentRole === 'fourmiz' || currentRole === 'admin';
    console.log('📅 [Calendar] isViewingAsFourmiz:', result, 'currentRole:', currentRole);
    return result;
  }, [currentRole]);

  const screenTitle = useMemo(() => {
    return 'Mon planning Fourmiz';
  }, []);

  // CHARGEMENT DES MISSIONS DU MOIS (conservé exactement)
  const fetchMonthlyMissions = useCallback(async (currentUser: any, year: number, month: number) => {
    try {
      console.log('📅 [Calendar] Chargement missions mois:', year, month + 1);
      setError(null);

      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 2).padStart(2, '0')}-01`;

      if (isViewingAsFourmiz) {
        const { data: assignedData, error: assignedError } = await supabase
          .from('orders')
          .select(`
            *,
            client_profile:profiles!orders_client_id_fkey(
              id, firstname, lastname, avatar_url
            ),
            services(title, description, categorie)
          `)
          .eq('fourmiz_id', currentUser.id)
          .gte('date', startDate)
          .lt('date', endDate)
          .in('status', ['acceptee', 'confirmed', 'en_cours','terminee', 'annulee'])
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });

        if (assignedError) {
          console.error('❌ [Calendar] Erreur missions assignées:', assignedError);
          throw assignedError;
        }

        const assignedMissions = (assignedData || []).map(mission => ({
          ...mission,
          isAssigned: true,
          clientName: formatClientName(mission.client_profile),
          serviceName: formatServiceName(mission.services, mission.service_title),
        }));

        const missionsByDay: DayMissions = {};
        assignedMissions.forEach(mission => {
          const dateKey = mission.date;
          if (!missionsByDay[dateKey]) {
            missionsByDay[dateKey] = [];
          }
          missionsByDay[dateKey].push(mission);
        });

        setMonthlyMissions(missionsByDay);
        
        const stats = calculateMonthStats(assignedMissions);
        setMonthStats(stats);

        console.log('✅ [Calendar] Missions fourmiz assignées chargées:', assignedMissions.length, 'jours:', Object.keys(missionsByDay).length);

      } else {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            fourmiz_profile:profiles!orders_fourmiz_id_fkey(
              id, firstname, lastname, avatar_url
            ),
            services(title, description, categorie)
          `)
          .eq('client_id', currentUser.id)
          .gte('date', startDate)
          .lt('date', endDate)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) {
          console.error('❌ [Calendar] Erreur SQL client:', error);
          throw error;
        }
        
        const clientMissions = (data || []).map(mission => ({
          ...mission,
          isAssigned: !!mission.fourmiz_id,
          clientName: formatClientName(mission.client_profile),
          serviceName: formatServiceName(mission.services, mission.service_title),
        }));

        const missionsByDay: DayMissions = {};
        clientMissions.forEach(mission => {
          const dateKey = mission.date;
          if (!missionsByDay[dateKey]) {
            missionsByDay[dateKey] = [];
          }
          missionsByDay[dateKey].push(mission);
        });

        setMonthlyMissions(missionsByDay);
        
        const stats = calculateMonthStats(clientMissions);
        setMonthStats(stats);

        console.log('✅ [Calendar] Commandes client chargées:', clientMissions.length);
      }

    } catch (error: any) {
      console.error('❌ [Calendar] Erreur lors de la récupération mensuelle:', error);
      setError(`Impossible de charger les données: ${error.message}`);
    }
  }, [isViewingAsFourmiz, currentRole]);

  // CALCUL DES STATISTIQUES MENSUELLES (conservé exactement)
  const calculateMonthStats = useCallback((missions: CalendarMission[]): MonthStats => {
    const completedMissions = missions.filter(mission => 
      mission.status === 'terminee' || mission.status === 'completed'
    );
    
    const cancelledMissions = missions.filter(mission =>
      mission.status === 'annulee' || mission.status === 'cancelled'
    );

    const activeMissions = missions.filter(mission =>
      mission.status === 'acceptee' || mission.status === 'confirmed' || mission.status === 'en_cours'
    );

    const realizedRevenue = completedMissions.reduce((sum, mission) => {
      const baseAmount = mission.proposed_amount || 0;
      if (isViewingAsFourmiz) {
        return sum + (baseAmount * adminSettings.fourmiz_earning_percentage) / 100;
      }
      return sum + baseAmount;
    }, 0);

    const pendingRevenue = activeMissions.reduce((sum, mission) => {
      const baseAmount = mission.proposed_amount || 0;
      if (isViewingAsFourmiz) {
        return sum + (baseAmount * adminSettings.fourmiz_earning_percentage) / 100;
      } else {
        return sum + baseAmount;
      }
    }, 0);
    
    let totalMinutes = 0;
    [...completedMissions, ...activeMissions].forEach(mission => {
      if (mission.start_time && mission.end_time) {
        const [startH, startM] = mission.start_time.split(':').map(Number);
        const [endH, endM] = mission.end_time.split(':').map(Number);
        const startTotalMin = startH * 60 + startM;
        const endTotalMin = endH * 60 + endM;
        totalMinutes += Math.max(0, endTotalMin - startTotalMin);
      }
    });

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    return {
      totalMissions: missions.length,
      realizedRevenue: Math.round(realizedRevenue * 100) / 100,
      pendingRevenue: Math.round(pendingRevenue * 100) / 100,
      totalHours,
      completedMissions: completedMissions.length,
      cancelledMissions: cancelledMissions.length
    };
  }, [isViewingAsFourmiz, adminSettings.fourmiz_earning_percentage]);

  // EFFETS ET HANDLERS (conservés exactement)
  useEffect(() => {
    if (user && (userProfile || profile)) {
      console.log('🔄 [Calendar] Déclenchement fetch mensuel - Rôle:', currentRole);
      fetchMonthlyMissions(user, currentYear, currentMonth);
    }
  }, [user, userProfile, profile, currentRole, currentYear, currentMonth, fetchMonthlyMissions]);

  const handleRefresh = useCallback(async () => {
    console.log('🔄 [Calendar] Pull-to-refresh déclenché');
    
    if (!user) {
      console.log('❌ [Calendar] Pas d\'utilisateur pour le refresh');
      return;
    }
    
    try {
      setRefreshing(true);
      console.log('⏳ [Calendar] Début du refresh...');
      await fetchMonthlyMissions(user, currentYear, currentMonth);
      console.log('✅ [Calendar] Refresh terminé avec succès');
    } catch (error) {
      console.error('❌ [Calendar] Erreur pendant le refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchMonthlyMissions, user, currentYear, currentMonth]);

  // CONSTRUCTION DU CALENDRIER (conservée exactement)
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(currentYear, currentMonth, day);
      const missionsForDay = monthlyMissions[dateKey] || [];
      const hasMissions = missionsForDay.length > 0;
      const isToday = currentYear === today.getFullYear() && 
                     currentMonth === today.getMonth() && 
                     day === today.getDate();
      const isSelected = day === selectedDate;

      days.push({
        day,
        dateKey,
        hasMissions,
        isToday,
        isSelected,
        missionsCount: missionsForDay.length,
        completedCount: missionsForDay.filter(m => m.status === 'terminee' || m.status === 'completed').length,
        cancelledCount: missionsForDay.filter(m => m.status === 'annulee' || m.status === 'cancelled').length,
      });
    }

    return days;
  }, [currentYear, currentMonth, monthlyMissions, selectedDate, today]);

  // MISSIONS DU JOUR SÉLECTIONNÉ (conservé exactement)
  const selectedDateKey = formatDateKey(currentYear, currentMonth, selectedDate);
  const missionsForSelectedDay = monthlyMissions[selectedDateKey] || [];
  
  const activeMissions = missionsForSelectedDay.filter(mission => 
    mission.status === 'acceptee' || mission.status === 'confirmed' || mission.status === 'en_cours'
  );
  const completedMissions = missionsForSelectedDay.filter(mission =>
    mission.status === 'terminee' || mission.status === 'completed'
  );
  const cancelledMissions = missionsForSelectedDay.filter(mission =>
    mission.status === 'annulee' || mission.status === 'cancelled'
  );

  // ACTIONS (conservées exactement)
  const handleChatOrder = useCallback((orderId: number) => {
    router.push(`/chat/${orderId}`);
  }, []);

  const handleOpenMap = useCallback((address: string) => {
    if (!address) {
      Alert.alert('Information', 'Adresse non disponible');
      return;
    }
    
    Alert.alert(
      'Adresse',
      address,
      [
        { text: 'Fermer', style: 'cancel' },
        { 
          text: 'Ouvrir Maps', 
          onPress: () => {
            try {
              const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
              console.log('🗺️ [Calendar] Ouverture Maps:', mapsUrl);
            } catch (error) {
              Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application cartes');
            }
          }
        }
      ]
    );
  }, []);

  const confirmOrder = useCallback(async (orderId: number) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          confirmed_by_fourmiz: true,
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('❌ [Calendar] Erreur confirmation:', error);
        Alert.alert('Erreur', 'Impossible de confirmer la commande');
        return;
      }

      Alert.alert('✅ Confirmé', 'Commande confirmée avec succès');
      await fetchMonthlyMissions(user, currentYear, currentMonth);
    } catch (error) {
      console.error('❌ [Calendar] Erreur confirmation:', error);
      Alert.alert('Erreur', 'Une erreur s\'est produite');
    }
  }, [fetchMonthlyMissions, user, currentYear, currentMonth]);

  const acceptOrder = useCallback(async (orderId: number) => {
    Alert.alert(
      'Accepter cette commande ?',
      'Cette commande sera ajoutée à votre planning.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Accepter', 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('orders')
                .update({ 
                  fourmiz_id: user.id,
                  status: 'acceptee',
                  confirmed_by_fourmiz: true,
                  accepted_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

              if (error) {
                console.error('❌ [Calendar] Erreur acceptation:', error);
                Alert.alert('Erreur', 'Impossible d\'accepter la commande');
                return;
              }

              Alert.alert('✅ Accepté', 'Commande acceptée et ajoutée à votre planning');
              await fetchMonthlyMissions(user, currentYear, currentMonth);
            } catch (error) {
              console.error('❌ [Calendar] Erreur acceptation:', error);
              Alert.alert('Erreur', 'Une erreur s\'est produite');
            }
          }
        }
      ]
    );
  }, [user, fetchMonthlyMissions, currentYear, currentMonth]);

  // NAVIGATION MOIS (conservée exactement)
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // CONSTANTES (conservées exactement)
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // ÉTATS DE CHARGEMENT (adaptés style épuré services-requests)
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.centerText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="warning" size={32} color="#666666" />
          <Text style={styles.centerTitle}>Erreur de chargement</Text>
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleRefresh}>
            <Text style={styles.actionButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile && !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="person-circle-outline" size={48} color="#cccccc" />
          <Text style={styles.centerTitle}>Profil non trouvé</Text>
          <Text style={styles.centerText}>
            Votre profil n'a pas pu être chargé. Veuillez compléter votre inscription.
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/auth/complete-profile')}>
            <Text style={styles.actionButtonText}>Compléter mon profil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // INTERFACE PRINCIPALE AVEC STYLE ÉPURÉ HARMONISÉ
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={['#000000']}
            tintColor="#000000"
          />
        }
      >
        {/* En-tête épuré identique à services-requests */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{screenTitle}</Text>
          <Text style={styles.headerSubtitle}>
            Consultez vos missions
          </Text>
        </View>

        {/* Synthèse mensuelle avec accordéon style services-requests */}
        <View style={styles.statsSection}>
          <View style={styles.statsCard}>
            <TouchableOpacity 
              style={styles.statsHeader}
              onPress={() => setShowStatsDetails(!showStatsDetails)}
              activeOpacity={0.7}
            >
              <Text style={styles.statsTitle}>
                Synthèse {monthNames[currentMonth]} {currentYear}
              </Text>
              <View style={styles.statsExpandButton}>
                <Ionicons 
                  name={showStatsDetails ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#666666" 
                />
              </View>
            </TouchableOpacity>
            
            {showStatsDetails && (
              <View style={styles.statsDetails}>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{monthStats.totalMissions}</Text>
                    <Text style={styles.statLabel}>
                      {isViewingAsFourmiz ? 'Missions' : 'Commandes'}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {monthStats.realizedRevenue}€
                    </Text>
                    <Text style={styles.statLabel}>
                      {isViewingAsFourmiz ? 'Revenus réalisés' : 'Budget payé'}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {monthStats.pendingRevenue}€
                    </Text>
                    <Text style={styles.statLabel}>
                      {isViewingAsFourmiz ? 'Revenus à venir' : 'Budget en cours'}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {monthStats.totalHours}h
                    </Text>
                    <Text style={styles.statLabel}>Durée totale</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {monthStats.completedMissions}
                    </Text>
                    <Text style={styles.statLabel}>Terminées</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {monthStats.cancelledMissions}
                    </Text>
                    <Text style={styles.statLabel}>Annulées</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Calendrier épuré */}
        <View style={styles.calendarSection}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>
                {monthNames[currentMonth]} {currentYear}
              </Text>
              <View style={styles.calendarNav}>
                <TouchableOpacity style={styles.navButton} onPress={goToPreviousMonth}>
                  <Ionicons name="chevron-back" size={20} color="#333333" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navButton} onPress={goToNextMonth}>
                  <Ionicons name="chevron-forward" size={20} color="#333333" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Jours de la semaine */}
            <View style={styles.weekHeader}>
              {weekDays.map((day, index) => (
                <View key={index} style={styles.weekDay}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Grille calendrier épurée avec chiffre des missions - CENTRAGE PARFAITEMENT CORRIGÉ */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((dayData, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    dayData?.isToday && styles.todayDay,
                    dayData?.isSelected && styles.selectedDay,
                    dayData?.hasMissions && styles.dayWithMissions,
                  ]}
                  onPress={() => {
                    if (dayData) {
                      setSelectedDate(dayData.day);
                    }
                  }}
                  disabled={!dayData}
                >
                  {dayData ? (
                    <>
                      <Text style={[
                        styles.calendarDayText,
                        dayData.isToday && styles.todayDayText,
                        dayData.isSelected && styles.selectedDayText,
                      ]}>
                        {dayData.day}
                      </Text>
                      {dayData.hasMissions && (
                        <Text style={styles.missionCount}>{dayData.missionsCount}</Text>
                      )}
                    </>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Missions du jour sélectionné - STYLE ÉPURÉ IDENTIQUE À SERVICES-REQUESTS */}
        <View style={styles.selectedDaySection}>
          <Text style={styles.selectedDayTitle}>
            {selectedDate} {monthNames[currentMonth]} {currentYear}
          </Text>

          {missionsForSelectedDay.length > 0 ? (
            <>
              {/* Missions en cours avec style épuré services-requests */}
              {activeMissions.length > 0 && (
                <View style={styles.missionsGroup}>
                  <TouchableOpacity 
                    style={styles.groupHeader}
                    onPress={() => setShowActiveMissions(!showActiveMissions)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.groupTitle}>
                      {isViewingAsFourmiz 
                        ? `Missions en cours (${activeMissions.length})`
                        : `Commandes en cours (${activeMissions.length})`
                      }
                    </Text>
                    <Ionicons 
                      name={showActiveMissions ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#666666" 
                    />
                  </TouchableOpacity>
                  
                  {showActiveMissions && (
                    <View style={styles.missionsList}>
                      {activeMissions.map((mission) => (
                        <CleanMissionCard
                          key={`active-${mission.id}`}
                          mission={mission}
                          isViewingAsFourmiz={isViewingAsFourmiz}
                          adminSettings={adminSettings}
                          onMap={handleOpenMap}
                          onConfirm={confirmOrder}
                          onAccept={acceptOrder}
                          onChat={handleChatOrder}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Missions terminées avec style épuré services-requests */}
              {completedMissions.length > 0 && (
                <View style={styles.missionsGroup}>
                  <TouchableOpacity 
                    style={styles.groupHeader}
                    onPress={() => setShowCompletedMissions(!showCompletedMissions)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.groupTitle}>
                      {isViewingAsFourmiz 
                        ? `Missions terminées (${completedMissions.length})`
                        : `Commandes terminées (${completedMissions.length})`
                      }
                    </Text>
                    <Ionicons 
                      name={showCompletedMissions ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#666666" 
                    />
                  </TouchableOpacity>
                  
                  {showCompletedMissions && (
                    <View style={styles.missionsList}>
                      {completedMissions.map((mission) => (
                        <CleanMissionCard
                          key={`completed-${mission.id}`}
                          mission={mission}
                          isViewingAsFourmiz={isViewingAsFourmiz}
                          adminSettings={adminSettings}
                          onMap={handleOpenMap}
                          onConfirm={confirmOrder}
                          onAccept={acceptOrder}
                          onChat={handleChatOrder}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Missions annulées avec style épuré services-requests */}
              {cancelledMissions.length > 0 && (
                <View style={styles.missionsGroup}>
                  <TouchableOpacity 
                    style={styles.groupHeader}
                    onPress={() => setShowCancelledMissions(!showCancelledMissions)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.groupTitle}>
                      {isViewingAsFourmiz 
                        ? `Missions annulées (${cancelledMissions.length})`
                        : `Commandes annulées (${cancelledMissions.length})`
                      }
                    </Text>
                    <Ionicons 
                      name={showCancelledMissions ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#666666" 
                    />
                  </TouchableOpacity>
                  
                  {showCancelledMissions && (
                    <View style={styles.missionsList}>
                      {cancelledMissions.map((mission) => (
                        <CleanMissionCard
                          key={`cancelled-${mission.id}`}
                          mission={mission}
                          isViewingAsFourmiz={isViewingAsFourmiz}
                          adminSettings={adminSettings}
                          onMap={handleOpenMap}
                          onConfirm={confirmOrder}
                          onAccept={acceptOrder}
                          onChat={handleChatOrder}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#cccccc" />
              <Text style={styles.emptyTitle}>Aucune mission ce jour</Text>
              <Text style={styles.emptyText}>
                Votre planning est libre pour cette journée
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ✅ COMPOSANT CARTE MISSION - STYLE 100% IDENTIQUE À SERVICES-REQUESTS
const CleanMissionCard = ({ 
  mission, 
  isViewingAsFourmiz, 
  adminSettings,
  onMap,
  onConfirm,
  onAccept,
  onChat
}: {
  mission: CalendarMission;
  isViewingAsFourmiz: boolean;
  adminSettings: AdminSettings;
  onMap: (address: string) => void;
  onConfirm: (orderId: number) => void;
  onAccept: (orderId: number) => void;
  onChat: (orderId: number) => void;
}) => {
  const personProfile = isViewingAsFourmiz ? mission.client_profile : mission.fourmiz_profile;
  const personRole = isViewingAsFourmiz ? 'Client' : 'Fourmiz';
  
  // 🔧 Gestion sécurisée des noms
  const getPersonName = () => {
    if (!personProfile) {
      return isViewingAsFourmiz ? 'Client' : 'Non assigné';
    }
    
    const firstName = personProfile.firstname || '';
    const lastName = personProfile.lastname || '';
    
    return `${firstName} ${lastName}`.trim() || 'Utilisateur';
  };

  // ✅ FONCTION : Récupérer le titre
  const getMissionTitle = () => {
    if (mission.services?.title) {
      return mission.services.title;
    }
    
    if (mission.service_title) {
      return mission.service_title;
    }
    
    if (mission.service_id && !mission.services) {
      return `Service #${mission.service_id}`;
    }
    
    if (mission.description) {
      const words = mission.description.trim().split(/\s+/).filter(word => word.length > 2);
      const title = words.slice(0, 4).join(' ');
      return title || 'Service personnalisé';
    }
    
    return 'Service demandé';
  };

  // ✅ FONCTION DE NORMALISATION DU STATUT
  const normalizeStatus = (status: any): string => {
    const safeStatus = String(status || '').toLowerCase();
    
    if (['en_attente', 'pending', 'created'].includes(safeStatus)) {
      return 'en_attente';
    }
    if (['acceptee', 'accepted', 'confirmed'].includes(safeStatus)) {
      return 'acceptee';
    }
    if (['en_cours', 'in_progress'].includes(safeStatus)) {
      return 'en_cours';
    }
    if (['terminee', 'completed', 'finished'].includes(safeStatus)) {
      return 'terminee';
    }
    if (['annulee', 'cancelled', 'canceled'].includes(safeStatus)) {
      return 'annulee';
    }
    return 'en_attente';
  };

  // 🔐 FONCTION : Vérifier si la mission peut être confirmée
  const canConfirmMission = () => {
    const status = normalizeStatus(mission.status);
    return isViewingAsFourmiz && 
           status === 'acceptee' && 
           !mission.confirmed_by_fourmiz &&
           mission.date && 
           new Date(mission.date) >= new Date();
  };

  const personName = getPersonName();
  const category = getCategoryForOrder(mission);
  const normalizedStatus = normalizeStatus(mission.status);

  // 🔧 CALCUL MONTANT
  const getMissionAmount = useCallback((): string => {
    try {
      const baseAmount = mission.proposed_amount || 0;
      
      if (baseAmount <= 0) {
        return '0.00€';
      }

      if (isViewingAsFourmiz) {
        const fourmizAmount = (baseAmount * adminSettings.fourmiz_earning_percentage) / 100;
        return `${fourmizAmount.toFixed(2)}€`;
      } else {
        return `${baseAmount.toFixed(2)}€`;
      }
    } catch (error) {
      console.error('❌ [calendar] Erreur calcul montant mission:', error);
      return '0.00€';
    }
  }, [mission.proposed_amount, isViewingAsFourmiz, adminSettings.fourmiz_earning_percentage]);

  // 🎯 NAVIGATION VERS DÉTAILS
  const handleCardPress = () => {
    try {
      console.log('🔍 [calendar] Navigation vers détails mission:', mission.id);
      router.push(`/orders/${mission.id}`);
    } catch (error) {
      console.error('❌ [calendar] Erreur navigation vers détails:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder aux détails de cette commande');
    }
  };

  // ✅ HORAIRES FORMATÉS
  const timeDisplay = useMemo(() => {
    if (!mission.start_time) return 'Horaire non défini';
    
    const startTime = mission.start_time.substring(0, 5);
    if (mission.end_time) {
      const endTime = mission.end_time.substring(0, 5);
      return `${startTime} - ${endTime}`;
    }
    return `Dès ${startTime}`;
  }, [mission.start_time, mission.end_time]);

  return (
    <TouchableOpacity 
      style={styles.missionCard}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{getMissionTitle()}</Text>
          <Text style={styles.cardCategory}>{category}</Text>
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(mission.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(mission.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.cardDescription} numberOfLines={2}>
        {mission.description}
      </Text>
      
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaText}>{timeDisplay}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaText}>{getMissionAmount()}</Text>
        </View>
      </View>

      {personProfile && (
        <View style={styles.personContainer}>
          <Text style={styles.personRole}>{personRole}</Text>
          <Text style={styles.personName}>{personName}</Text>
        </View>
      )}

      {/* Actions épurées */}
      <View style={styles.cardActions}>
        {(normalizedStatus === 'acceptee' || normalizedStatus === 'en_cours') && (
          <TouchableOpacity 
            style={styles.actionButtonSecondary}
            onPress={(e) => {
              e.stopPropagation();
              onChat(mission.id);
            }}
          >
            <Text style={styles.actionButtonSecondaryText}>Discuter</Text>
          </TouchableOpacity>
        )}

        {canConfirmMission() && (
          <TouchableOpacity 
            style={styles.actionButtonPrimary}
            onPress={(e) => {
              e.stopPropagation();
              onConfirm(mission.id);
            }}
          >
            <Text style={styles.actionButtonPrimaryText}>Confirmer</Text>
          </TouchableOpacity>
        )}

        {mission.address && (
          <TouchableOpacity 
            style={styles.actionButtonSecondary}
            onPress={(e) => {
              e.stopPropagation();
              let fullAddress = mission.address;
              if (mission.building) fullAddress += `, ${mission.building}`;
              if (mission.floor) fullAddress += `, ${mission.floor}`;
              onMap(fullAddress);
            }}
          >
            <Text style={styles.actionButtonSecondaryText}>Adresse</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// 🎨 FONCTIONS UTILITAIRES ÉPURÉES (sans couleurs)
const getStatusColor = (status: string) => {
  // Toujours noir pour cohérence avec services-requests
  return '#000000';
};

const getStatusLabel = (status: string) => {
  const labels = {
    'en_attente': 'En attente',
    'acceptee': 'Acceptée',
    'confirmed': 'Confirmée', 
    'en_cours': 'En cours',
    'terminee': 'Terminée',
    'annulee': 'Annulée'
  };
  return labels[status as keyof typeof labels] || status;
};

// 🎨 STYLES ÉPURÉS AVEC CENTRAGE PARFAITEMENT CORRIGÉ
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },

  // États centrés identiques à services-requests
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  centerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  centerText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },

  scrollView: {
    flex: 1,
  },

  // En-tête épuré identique à profile avec marges minimales
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },

  // Synthèse épurée
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  statsExpandButton: {
    padding: 4,
  },
  statsDetails: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    width: '31%',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
  },

  // Calendrier épuré
  calendarSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  calendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  calendarNav: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f8f8',
  },

  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '600',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  
  // ✅ CENTRAGE PARFAITEMENT CORRIGÉ
  calendarDay: {
    width: `${100/7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  
  todayDay: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
  },
  
  selectedDay: {
    backgroundColor: '#000000',
    borderRadius: 6,
  },
  
  dayWithMissions: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 6,
  },
  
  // ✅ CHIFFRE DU JOUR PARFAITEMENT CENTRÉ
  calendarDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    lineHeight: 12, // Correspond au fontSize pour centrage vertical parfait
    includeFontPadding: false, // Android: Supprime le padding de police
  },
  
  todayDayText: {
    color: '#000000',
  },
  
  selectedDayText: {
    color: '#ffffff',
  },
  
  // ✅ COMPTEUR MISSIONS REPOSITIONNÉ ET OPTIMISÉ
  missionCount: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 8,
    fontWeight: '700',
    color: '#000000',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 6,
    minWidth: 12,
    height: 12,
    textAlign: 'center',
    lineHeight: 12,
    includeFontPadding: false, // Android: Supprime le padding de police
  },

  // Section jour sélectionné épurée
  selectedDaySection: {
    padding: 20,
  },
  selectedDayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },

  // Groupes de missions épurés
  missionsGroup: {
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  missionsList: {
    gap: 12,
  },

  // État vide épuré identique à services-requests
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Cartes mission épurées IDENTIQUES à services-requests
  missionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 12,
    color: '#666666',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 12,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#666666',
  },

  // Section personne épurée identique à services-requests
  personContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginBottom: 12,
  },
  personRole: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 2,
  },
  personName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333333',
  },

  // Actions épurées IDENTIQUES à services-requests
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButtonPrimary: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionButtonSecondary: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },

  bottomSpacer: {
    height: 32,
  },
});
// app/(tabs)/services-requests.tsx - VERSION STYLE ÉPURÉ HARMONISÉ
// 🎨 STYLE MINIMALISTE ET COHÉRENT POUR TOUTES LES SECTIONS
// ✅ CONSERVATION DE TOUTES LES FONCTIONNALITÉS EXISTANTES
// ✅ HARMONISATION VISUELLE COMPLETE
// 🔧 CORRECTION CLAVIER MODAL NOTATION
// ✅ HEADER IDENTIQUE À PROFILE

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, usePathname } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useRoleManagerAdapter } from '../../hooks/useRoleManagerAdapter';

// 🔒 HELPERS SÉCURISÉS pour éviter les erreurs .includes()
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

// 🔒 HELPER SÉCURISÉ pour vérifier les rôles
const hasRole = (profile: any, role: string): boolean => {
  if (!profile?.roles) return false;
  const roles = Array.isArray(profile.roles) ? profile.roles : [profile.roles];
  return roles.includes(role);
};

// 📊 TYPES TYPESCRIPT STRICTS - STRUCTURE RÉELLE
interface Mission {
  id: number;
  description: string;
  status: string;
  created_at: string;
  proposed_amount: number;
  client_id?: string;
  service_id?: number;
  service_title?: string;
  addresses?: any;
  address?: string;
  postal_code?: string;
  city?: string;
  date?: string;
  start_time?: string;
  duration?: string;
  phone?: string;
  urgent?: boolean;
  urgency_level?: string;
  client_profile?: any;
  fourmiz_profile?: any;
  services?: {
    title: string;
    description: string;
    categorie: string;
  };
}

// 🔧 TYPE POUR LES FILTRES
type FilterType = 'all' | 'en_attente' | 'acceptee' | 'confirmed' | 'en_cours' | 'terminee' | 'annulee';

// 🔧 INTERFACE POUR PARAMÈTRES ADMIN
interface AdminSettings {
  fourmiz_earning_percentage: number;
}

// 🔧 COMPOSANT MODAL DE NOTATION - Style épuré minimaliste + CORRECTION CLAVIER
const RatingModal = ({ 
  visible, 
  onClose, 
  onSubmit, 
  title, 
  targetName,
  loading 
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  title: string;
  targetName: string;
  loading: boolean;
}) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');

  const handleSubmit = () => {
    if (rating < 1 || rating > 5) {
      Alert.alert('Erreur', 'Veuillez sélectionner une note entre 1 et 5 étoiles');
      return;
    }
    // 🔧 CORRECTION CLAVIER : Fermer le clavier avant validation
    Keyboard.dismiss();
    onSubmit(rating, comment.trim());
  };

  const resetForm = () => {
    setRating(5);
    setComment('');
  };

  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* 🔧 CORRECTION CLAVIER : KeyboardAvoidingView */}
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={18} color="#666666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>Évaluer : {targetName}</Text>

          {/* Système d'étoiles épuré */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionLabel}>Note</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={24}
                    color={star <= rating ? "#000000" : "#cccccc"}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingValue}>{rating}/5</Text>
          </View>

          {/* Commentaire épuré */}
          <View style={styles.commentSection}>
            <Text style={styles.sectionLabel}>Commentaire (optionnel)</Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Votre avis..."
              placeholderTextColor="#999999"
              multiline={true}
              numberOfLines={3}
              maxLength={500}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            <Text style={styles.characterCount}>{comment.length}/500</Text>
          </View>

          {/* Actions épurées */}
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Valider</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// 🎯 FONCTION : Récupérer la catégorie
const getCategoryForOrder = (order: Mission): string => {
  // Service standard avec service_id
  if (order.service_id && order.services?.categorie) {
    return order.services.categorie;
  }
  
  // Commande personnalisée avec addresses.categorie
  if (!order.service_id && order.addresses?.categorie) {
    return order.addresses.categorie;
  }
  
  // Fallback
  return order.services?.categorie || 'Non définie';
};

export default function ServicesRequestsScreen() {
  const pathname = usePathname();
  
  // 🔍 DEBUG COMPLET : Logs au démarrage
  console.log('=== 🚀 SERVICES-REQUESTS DEBUG START ===');
  console.log('🎯 Composant services-requests chargé');
  console.log('📍 Pathname actuel:', pathname);
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('🔍 Stack trace:', new Error().stack);
  
  // 🔧 ÉTATS
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterType>('all');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollViewRef = useRef<FlatList>(null);

  // 🔧 NOUVEAU : États pour dropdown de filtre (adapté de orders.tsx)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // 🔧 ÉTATS POUR VALIDATION AVEC NOTATION - SIMPLIFIÉS
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedMissionForRating, setSelectedMissionForRating] = useState<Mission | null>(null);
  const [ratingModalTitle, setRatingModalTitle] = useState('');
  const [ratingTargetName, setRatingTargetName] = useState('');
  const [validatingWithRating, setValidatingWithRating] = useState(false);

  // 🔧 ÉTAT POUR PARAMÈTRES ADMIN
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({ 
    fourmiz_earning_percentage: 0
  });

  // 🔍 DEBUG : Surveiller les changements d'état importants
  useEffect(() => {
    console.log('🔄 État loading changé:', loading);
  }, [loading]);

  useEffect(() => {
    console.log('🔄 État profile changé:', !!profile);
  }, [profile]);

  useEffect(() => {
    console.log('🔄 État user changé:', !!user);
  }, [user]);

  // 🔧 CHARGEMENT INITIAL
  useEffect(() => {
    console.log('🔄 [services-requests] useEffect CHARGEMENT INITIAL déclenché');
    console.log('📍 Pathname dans useEffect initial:', pathname);
    
    const loadProfile = async () => {
      try {
        console.log('⏳ [services-requests] Début chargement profil...');
        setLoading(true);
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('✅ [services-requests] User récupéré:', !!user);
        setUser(user);
        
        if (user?.id) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          console.log('✅ [services-requests] Profile récupéré:', !!profileData);
          setProfile(profileData);
        }

        await loadAdminSettings();
        
      } catch (error) {
        console.error('❌ [services-requests] Erreur critique initialisation:', error);
        setError('Impossible de charger votre profil');
      } finally {
        console.log('✅ [services-requests] Fin chargement initial, setLoading(false)');
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  // 🔧 FONCTION POUR CHARGER PARAMÈTRES ADMIN
  const loadAdminSettings = async () => {
    try {
      console.log('⏳ [services-requests] Chargement admin settings...');
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'fourmiz_earning_percentage')
        .single();

      if (error) {
        console.warn('❌ [services-requests] Erreur chargement admin_settings:', error.message);
        return;
      }

      if (data?.setting_value && data.setting_value.trim() !== '') {
        const percentage = parseFloat(data.setting_value);
        
        if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
          setAdminSettings({ fourmiz_earning_percentage: percentage });
          console.log('✅ [services-requests] Admin settings chargés:', percentage + '%');
        }
      }
    } catch (error) {
      console.error('❌ [services-requests] Erreur critique admin_settings:', error);
    }
  };

  // ✅ FONCTIONS DE GESTION DES BOUTONS (identiques à orders.tsx)
  const handleChatOrder = useCallback((orderId: number) => {
    console.log('🔍 [services-requests] handleChatOrder appelé, orderId:', orderId);
    router.push(`/chat/${orderId}`);
  }, []);

  const handleCancelOrder = useCallback(async (orderId: number) => {
    console.log('🔍 [services-requests] handleCancelOrder appelé, orderId:', orderId);
    Alert.alert(
      'Annuler la commande',
      'Êtes-vous sûr de vouloir annuler cette commande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('orders')
                .update({
                  status: 'annulee',
                  updated_at: new Date().toISOString(),
                  cancelled_at: new Date().toISOString(),
                  cancelled_by: user?.id
                })
                .eq('id', orderId)
                .eq('client_id', user?.id);

              if (error) throw error;
              
              Alert.alert('✅ Commande annulée', 'Votre commande a été annulée avec succès.');
              if (user) {
                await fetchMissionsForUser(user);
              }
              
            } catch (error: any) {
              console.error('❌ [services-requests] Erreur annulation:', error);
              Alert.alert('Erreur', 'Impossible d\'annuler la commande.');
            }
          },
        },
      ]
    );
  }, [user]);

  // ✅ NOUVELLE FONCTION SIMPLIFIÉE : Ouvrir directement le modal de notation
  const handleOpenValidation = useCallback((mission: Mission) => {
    console.log('🔍 [services-requests] handleOpenValidation appelé, missionId:', mission.id);
    const clientName = mission.client_profile 
      ? `${mission.client_profile.firstname} ${mission.client_profile.lastname}`
      : 'Client';

    setSelectedMissionForRating(mission);
    setRatingModalTitle('Valider la Mission');
    setRatingTargetName(clientName);
    setShowRatingModal(true);
  }, []);

  // ✅ FONCTION : Validation finale avec notation (côté Fourmiz) - SIMPLIFIÉE
  const handleSubmitMissionRating = useCallback(async (rating: number, comment: string) => {
    console.log('🔍 [services-requests] handleSubmitMissionRating appelé');
    if (!selectedMissionForRating) return;

    try {
      setValidatingWithRating(true);

      // 1. Valider la mission
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'terminee',
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
          validation_method: 'fourmiz_validation',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMissionForRating.id);

      if (updateError) {
        throw updateError;
      }

      // Traitement du parrainage fourmiz
      try {
        await supabase.rpc('process_referral_for_mission', { 
          mission_id_input: selectedMissionForRating.id,
          fourmiz_id_input: user?.id 
        });
        console.log('✅ [services-requests] Parrainage fourmiz traité pour mission:', selectedMissionForRating.id);
      } catch (referralError) {
        console.error('❌ [services-requests] Erreur traitement parrainage fourmiz:', referralError);
        // Ne pas bloquer la validation pour une erreur de parrainage
      }

      // 2. ✅ AJOUTER LA NOTATION via la fonction SQL existante - PARAMÈTRES CORRECTS
      const { error: ratingError } = await supabase.rpc('add_rating', {
        p_order_id: selectedMissionForRating.id,
        p_rating: rating,
        p_comment: comment || null
      });

      if (ratingError) {
        console.error('❌ [services-requests] Erreur ajout rating:', ratingError);
        throw new Error('Impossible d\'enregistrer votre note');
      }

      Alert.alert(
        '✅ Mission validée et notée',
        `Mission terminée avec succès ! Votre note de ${rating}/5 a été enregistrée.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowRatingModal(false);
              setSelectedMissionForRating(null);
              if (user) {
                fetchMissionsForUser(user);
              }
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('❌ [services-requests] Erreur validation mission avec notation:', error);
      Alert.alert('Erreur', error.message || 'Impossible de valider la mission.');
    } finally {
      setValidatingWithRating(false);
    }
  }, [selectedMissionForRating, user]);

  // ✅ ROLE MANAGER - SIMPLIFIÉ (on garde juste userProfile)
  const roleManager = useRoleManagerAdapter(profile);
  const { userProfile } = roleManager || {};

  // 🔍 DEBUG : Surveiller le roleManager
  useEffect(() => {
    console.log('🔍 [services-requests] RoleManager changé:', {
      hasRoleManager: !!roleManager,
      hasUserProfile: !!userProfile,
      roleManagerKeys: roleManager ? Object.keys(roleManager) : []
    });
  }, [roleManager, userProfile]);

  // ✅ VUE FOURMIZ UNIQUEMENT (pas de switch)
  const isViewingAsFourmiz = true;

  // 🔧 CHARGEMENT DES MISSIONS FOURMIZ UNIQUEMENT
  const fetchMissionsForUser = useCallback(async (currentUser: any) => {
    try {
      console.log('⏳ [services-requests] fetchMissionsForUser appelé');
      console.log('🔍 [services-requests] User ID:', currentUser?.id);
      setError(null);

      // 🐜 VUE FOURMIZ UNIQUEMENT : Missions où l'utilisateur est assigné comme Fourmiz
      console.log('🐜 [services-requests] Chargement missions fourmiz...');
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client_profile:profiles!orders_client_id_fkey(
            id, firstname, lastname, avatar_url
          ),
          services(title, description, categorie)
        `)
        .eq('fourmiz_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [services-requests] Erreur SQL:', error);
        throw error;
      }
      
      console.log('✅ [services-requests] Missions fourmiz chargées:', data?.length || 0);
      setMissions(data || []);

    } catch (error: any) {
      console.error('❌ [services-requests] Erreur lors de la récupération des missions fourmiz:', error);
      setError(`Impossible de charger les données: ${error.message}`);
    }
  }, []);

  // ⚡ CHARGEMENT INITIAL
  useEffect(() => {
    console.log('🔄 [services-requests] useEffect FETCH MISSIONS déclenché');
    console.log('🔍 État:', { 
      hasUser: !!user, 
      hasUserProfile: !!userProfile, 
      hasProfile: !!profile 
    });
    
    if (user && (userProfile || profile)) {
      console.log('✅ [services-requests] Conditions remplies, appel fetchMissionsForUser');
      fetchMissionsForUser(user);
    } else {
      console.log('❌ [services-requests] Conditions non remplies pour fetchMissionsForUser');
    }
  }, [user, userProfile, profile, fetchMissionsForUser]);

  // 🔍 === DEBUG useFocusEffect ===
  useFocusEffect(
    useCallback(() => {
      console.log('🎯 [services-requests] FOCUS EFFECT déclenché');
      console.log('📍 Pathname au focus:', pathname);
      console.log('⏰ Focus timestamp:', new Date().toISOString());
      console.log('🔍 État au focus:', {
        loading,
        hasProfile: !!profile,
        hasUser: !!user,
        missionsCount: missions.length
      });
      
      // ATTENTION : Vérifier s'il y a des redirections ici
      if (pathname !== '/services-requests' && pathname !== '/(tabs)/services-requests') {
        console.log('⚠️  [services-requests] PATHNAME INATTENDU AU FOCUS:', pathname);
      }
      
      return () => {
        console.log('🎯 [services-requests] FOCUS EFFECT - CLEANUP');
        console.log('📍 Pathname au cleanup:', pathname);
      };
    }, [pathname, loading, profile, user, missions.length])
  );

  // 🔄 RAFRAICHIR LES DONNÉES - AVEC DEBUG
  const handleRefresh = useCallback(async () => {
    console.log('🔄 [services-requests] Pull-to-refresh déclenché');
    
    if (!user) {
      console.log('❌ [services-requests] Pas d\'utilisateur pour le refresh');
      return;
    }
    
    try {
      setRefreshing(true);
      console.log('⏳ [services-requests] Début du refresh...');
      await fetchMissionsForUser(user);
      console.log('✅ [services-requests] Refresh terminé avec succès');
    } catch (error) {
      console.error('❌ [services-requests] Erreur pendant le refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchMissionsForUser, user]);

  // Normaliser les statuts pour le filtrage
  const normalizeStatus = (status: any): FilterType => {
    const safeStatus = safeString(status).toLowerCase();
    
    if (['en_attente', 'pending', 'created'].includes(safeStatus)) {
      return 'en_attente';
    }
    if (['acceptee', 'accepted'].includes(safeStatus)) {
      return 'acceptee';
    }
    if (['confirmed'].includes(safeStatus)) {
      return 'confirmed';
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
    
    return safeStatus as FilterType || 'en_attente';
  };

  // Calculer les statistiques pour les filtres
  const missionStats = useMemo(() => {
    const pending = missions.filter(mission => normalizeStatus(mission.status) === 'en_attente');
    const accepted = missions.filter(mission => normalizeStatus(mission.status) === 'acceptee');
    const confirmed = missions.filter(mission => normalizeStatus(mission.status) === 'confirmed');
    const inProgress = missions.filter(mission => normalizeStatus(mission.status) === 'en_cours');
    const completed = missions.filter(mission => normalizeStatus(mission.status) === 'terminee');
    const cancelled = missions.filter(mission => normalizeStatus(mission.status) === 'annulee');

    return {
      total: missions.length,
      pending: pending.length,
      accepted: accepted.length, 
      confirmed: confirmed.length,
      inProgress: inProgress.length,
      completed: completed.length,
      cancelled: cancelled.length
    };
  }, [missions]);

  // Options de filtre avec compteurs
  const filterOptions = useMemo(() => [
    { id: 'all', label: `Toutes (${missionStats.total})`, icon: 'apps' as const },
    { id: 'en_attente', label: `En attente (${missionStats.pending})`, icon: 'time' as const },
    { id: 'acceptee', label: `Acceptées (${missionStats.accepted})`, icon: 'checkmark-circle' as const },
    { id: 'confirmed', label: `Confirmées (${missionStats.confirmed})`, icon: 'shield-checkmark' as const },
    { id: 'en_cours', label: `En cours (${missionStats.inProgress})`, icon: 'play-circle' as const },
    { id: 'terminee', label: `Terminées (${missionStats.completed})`, icon: 'checkmark-done-circle' as const },
    { id: 'annulee', label: `Annulées (${missionStats.cancelled})`, icon: 'close-circle' as const }
  ], [missionStats]);

  // ✅ NOUVEAU : Obtenir le nom du filtre actuel (adapté de orders.tsx)
  const getCurrentFilterName = () => {
    const currentFilter = filterOptions.find(option => option.id === filterStatus);
    return currentFilter?.label || 'toutes';
  };

  // ✅ NOUVEAU : Sélectionner un filtre (adapté de orders.tsx)
  const selectFilter = (filterId: FilterType) => {
    console.log('🔍 [services-requests] Changement de filtre vers:', filterId);
    setFilterStatus(filterId);
    setShowFilterDropdown(false);
  };

  // 📱 FILTRER LES MISSIONS
  const filteredMissions = useMemo(() => {
    if (filterStatus === 'all') {
      return missions;
    }
    
    const filtered = missions.filter(mission => {
      const normalized = normalizeStatus(mission.status);
      return normalized === filterStatus;
    });
    
    console.log('🔍 [services-requests] Missions filtrées:', filtered.length, 'pour le filtre:', filterStatus);
    return filtered;
  }, [missions, filterStatus]);

  // 🔝 GESTION DU SCROLL TO TOP
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // ✅ RENDER ITEM POUR FLATLIST
  const renderMissionItem = ({ item: mission }: { item: Mission }) => (
    <CleanMissionCard 
      mission={mission}
      isViewingAsFourmiz={isViewingAsFourmiz}
      adminSettings={adminSettings}
      onChatPress={handleChatOrder}
      onCancelPress={handleCancelOrder}
      onValidatePress={handleOpenValidation}
    />
  );

  // 🔍 DEBUG : Log avant les renders conditionnels
  console.log('🔍 [services-requests] État avant render:', {
    loading,
    error: !!error,
    hasProfile: !!profile,
    hasUserProfile: !!userProfile,
    missionsCount: missions.length,
    pathname
  });

  // ⏳ ÉTAT DE CHARGEMENT
  if (loading) {
    console.log('⏳ [services-requests] Render LOADING');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.centerText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ❌ ÉTAT D'ERREUR
  if (error) {
    console.log('❌ [services-requests] Render ERROR:', error);
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

  // ❓ PROFIL NON TROUVÉ
  if (!profile && !userProfile) {
    console.log('❓ [services-requests] Render NO PROFILE');
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

  // 🎨 RENDU PRINCIPAL ÉPURÉ
  console.log('✅ [services-requests] Render PRINCIPAL avec', filteredMissions.length, 'missions');
  
  return (
    <SafeAreaView style={styles.container}>
      {/* En-tête épuré identique à profile */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Prestations</Text>
      </View>

      {/* Filtre épuré */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Affichage</Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <Text style={styles.dropdownButtonText}>
              {getCurrentFilterName()}
            </Text>
            <Ionicons 
              name={showFilterDropdown ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#666666" 
            />
          </TouchableOpacity>

          {showFilterDropdown && (
            <>
              <TouchableOpacity 
                style={styles.dropdownOverlay} 
                onPress={() => setShowFilterDropdown(false)}
                activeOpacity={1}
              />
              <View style={styles.dropdownMenu}>
                {filterOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.dropdownOption,
                      filterStatus === option.id && styles.dropdownOptionSelected
                    ]}
                    onPress={() => selectFilter(option.id as FilterType)}
                  >
                    <View style={styles.dropdownOptionContent}>
                      <Ionicons name={option.icon} size={14} color="#666666" />
                      <Text style={[
                        styles.dropdownOptionText,
                        filterStatus === option.id && styles.dropdownOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </View>
                    {filterStatus === option.id && (
                      <Ionicons name="checkmark" size={14} color="#000000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </View>

      <FlatList 
        ref={scrollViewRef}
        data={filteredMissions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMissionItem}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#000000']}
            tintColor="#000000"
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={48} color="#cccccc" />
            <Text style={styles.emptyTitle}>
              {filterStatus === 'all' 
                ? 'Aucune mission' 
                : `Aucune mission ${getStatusLabelForEmpty(filterStatus)}`
              }
            </Text>
            <Text style={styles.emptyText}>
              {filterStatus === 'all' 
                ? 'Vous n\'avez pas encore de mission assignée'
                : `Aucune mission avec le statut "${getStatusLabelForEmpty(filterStatus)}"`
              }
            </Text>
            {filterStatus === 'all' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/available-orders')}
              >
                <Text style={styles.actionButtonText}>
                  Trouver des missions
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          filteredMissions.length === 0 && styles.listContentEmpty
        ]}
      />

      {/* Bouton scroll to top épuré */}
      {showScrollTop && (
        <TouchableOpacity
          style={styles.scrollTopButton}
          onPress={scrollToTop}
        >
          <Ionicons name="chevron-up" size={20} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Modal de notation épurée */}
      <RatingModal
        visible={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          setSelectedMissionForRating(null);
        }}
        onSubmit={handleSubmitMissionRating}
        title={ratingModalTitle}
        targetName={ratingTargetName}
        loading={validatingWithRating}
      />
    </SafeAreaView>
  );
}

// 📋 COMPOSANT CARTE MISSION ÉPURÉE
const CleanMissionCard = ({ 
  mission, 
  isViewingAsFourmiz, 
  adminSettings,
  onChatPress,
  onCancelPress,
  onValidatePress
}: { 
  mission: Mission; 
  isViewingAsFourmiz: boolean;
  adminSettings: AdminSettings;
  onChatPress: (orderId: number) => void;
  onCancelPress: (orderId: number) => void;
  onValidatePress: (mission: Mission) => void;
}) => {
  const personProfile = isViewingAsFourmiz ? mission.client_profile : mission.fourmiz_profile;
  const personRole = isViewingAsFourmiz ? 'Client' : 'Fourmiz';
  
  // 🔧 Gestion sécurisée des noms
  const getPersonName = () => {
    if (!personProfile) {
      return isViewingAsFourmiz ? 'Client' : 'Non assigné';
    }
    
    const firstName = personProfile.firstname || personProfile.first_name || '';
    const lastName = personProfile.lastname || personProfile.last_name || '';
    
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

  // 🔐 FONCTION : Vérifier si la mission peut être validée
  const canValidateMission = () => {
    const status = normalizeStatus(mission.status);
    return isViewingAsFourmiz && 
           (status === 'acceptee' || status === 'en_cours') && 
           mission.date && 
           new Date(mission.date) <= new Date();
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
      console.error('❌ [services-requests] Erreur calcul montant mission:', error);
      return '0.00€';
    }
  }, [mission.proposed_amount, isViewingAsFourmiz, adminSettings.fourmiz_earning_percentage]);

  // 🎯 NAVIGATION VERS DÉTAILS
  const handleCardPress = () => {
    try {
      console.log('🔍 [services-requests] Navigation vers détails mission:', mission.id);
      router.push(`/orders/${mission.id}`);
    } catch (error) {
      console.error('❌ [services-requests] Erreur navigation vers détails:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder aux détails de cette commande');
    }
  };

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
          <Ionicons name="cash-outline" size={14} color="#666666" />
          <Text style={styles.metaText}>{getMissionAmount()}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color="#666666" />
          <Text style={styles.metaText}>
            {new Date(mission.created_at).toLocaleDateString()}
          </Text>
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
              onChatPress(mission.id);
            }}
          >
            <Ionicons name="chatbubble-outline" size={14} color="#666666" />
            <Text style={styles.actionButtonSecondaryText}>Discuter</Text>
          </TouchableOpacity>
        )}

        {canValidateMission() && (
          <TouchableOpacity 
            style={styles.actionButtonPrimary}
            onPress={(e) => {
              e.stopPropagation();
              onValidatePress(mission);
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={14} color="#ffffff" />
            <Text style={styles.actionButtonPrimaryText}>Valider</Text>
          </TouchableOpacity>
        )}

        {(normalizedStatus === 'en_attente' || normalizedStatus === 'acceptee') && (
          <TouchableOpacity 
            style={styles.actionButtonSecondary}
            onPress={(e) => {
              e.stopPropagation();
              onCancelPress(mission.id);
            }}
          >
            <Ionicons name="close-circle-outline" size={14} color="#666666" />
            <Text style={styles.actionButtonSecondaryText}>Annuler</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// 🎨 FONCTIONS UTILITAIRES
const getStatusColor = (status: string) => {
  const colors = {
    'en_attente': '#666666',
    'acceptee': '#000000',
    'confirmed': '#000000',
    'en_cours': '#000000',
    'terminee': '#000000',
    'annulee': '#999999'
  };
  return colors[status as keyof typeof colors] || '#666666';
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

const getStatusLabelForEmpty = (status: string) => {
  const labels = {
    'en_attente': 'en attente',
    'acceptee': 'acceptées',
    'confirmed': 'confirmées',
    'en_cours': 'en cours',
    'terminee': 'terminées',
    'annulee': 'annulées'
  };
  return labels[status as keyof typeof labels] || status;
};

// 🎨 STYLES ÉPURÉS ET MINIMALISTES
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },

  // États centrés minimalistes
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

  // En-tête épuré identique à profile
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

  // Filtre épuré
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterLabel: {
    fontSize: 13,
    color: '#666666',
    minWidth: 60,
  },
  
  // Dropdown épuré
  dropdownContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 9999,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
  },
  dropdownButtonText: {
    fontSize: 13,
    color: '#000000',
    flex: 1,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 9998,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
    maxHeight: 240,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  dropdownOptionSelected: {
    backgroundColor: '#f8f8f8',
  },
  dropdownOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dropdownOptionText: {
    fontSize: 13,
    color: '#333333',
  },
  dropdownOptionTextSelected: {
    color: '#000000',
    fontWeight: '500',
  },

  // Liste épurée
  listContent: {
    paddingBottom: 80,
  },
  listContentEmpty: {
    flex: 1,
  },

  // État vide épuré
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

  // Cartes mission épurées
  missionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
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
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666666',
  },

  // Section personne épurée
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

  // Actions épurées
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    flex: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  actionButtonPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    flex: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  actionButtonSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },

  // Bouton scroll to top épuré
  scrollTopButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  // Modal épurée
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },

  // Section notation épurée
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333333',
  },

  // Section commentaire épurée
  commentSection: {
    marginBottom: 24,
  },
  commentInput: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    color: '#000000',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  characterCount: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'right',
    marginTop: 4,
  },

  // Actions modal épurées
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#000000',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#999999',
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
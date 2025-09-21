// app/(tabs)/rewards.tsx - VERSION SIMPLE QUI FONCTIONNE
// ✅ AFFICHAGE DE TOUS LES BADGES SANS FILTRAGE COMPLEXE

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const rarityConfig = {
  common: { label: 'Commun', color: '#607D8B', stars: 1 },
  rare: { label: 'Rare', color: '#4CAF50', stars: 2 },
  epic: { label: 'Épique', color: '#9C27B0', stars: 3 },
  legendary: { label: 'Légendaire', color: '#FFD700', stars: 4 },
};

interface Badge {
  id: string;
  name: string;
  description: string;
  custom_name: string | null;
  custom_description: string | null;
  category: string;
  icon_name: string;
  value: number;
  currency: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  gradient_start: string;
  gradient_end: string;
  isUnlocked: boolean;
  unlockedDate: string | null;
  isNew: boolean;
}

export default function RewardsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [clientBadges, setClientBadges] = useState<Badge[]>([]);
  const [fourmizBadges, setFourmizBadges] = useState<Badge[]>([]);
  const [userStats, setUserStats] = useState({
    clientUnlocked: 0,
    fourmizUnlocked: 0,
    newBadges: 0,
    totalBadges: 0
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await loadBadges(user.id);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBadges = async (userId: string) => {
    try {
      // Récupérer tous les badges actifs
      const { data: catalog, error: catalogError } = await supabase
        .from('badges_catalog')
        .select('*')
        .eq('is_active', true)
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

      if (catalogError) throw catalogError;

      // Récupérer les badges débloqués par l'utilisateur
      const { data: unlocked, error: unlockedError } = await supabase
        .from('user_badges')
        .select('badge_id, unlocked_date, seen, is_unlocked')
        .eq('user_id', userId);

      if (unlockedError) throw unlockedError;

      // Fusionner les données
      const allBadges: Badge[] = (catalog || []).map((badge) => {
        const unlock = unlocked?.find((ub) => ub.badge_id === badge.id);
        return {
          ...badge,
          name: badge.custom_name || badge.name,
          description: badge.custom_description || badge.description,
          isUnlocked: unlock?.is_unlocked || false,
          unlockedDate: unlock?.unlocked_date || null,
          isNew: unlock ? (unlock.is_unlocked && !unlock.seen) : false,
        };
      });

      // Séparer badges clients et Fourmiz
      const clientCategories = ['spending', 'order', 'timing', 'quality', 'referral'];
      const fourmizCategories = ['missions', 'earnings', 'speed', 'quality', 'reliability', 'availability', 'referral'];

      const clientBadgesList = allBadges.filter(badge => 
        clientCategories.includes(badge.category)
      );
      
      const fourmizBadgesList = allBadges.filter(badge => 
        fourmizCategories.includes(badge.category)
      );

      setClientBadges(clientBadgesList);
      setFourmizBadges(fourmizBadgesList);

      // Calculer les statistiques
      const clientUnlocked = clientBadgesList.filter(b => b.isUnlocked).length;
      const fourmizUnlocked = fourmizBadgesList.filter(b => b.isUnlocked).length;
      const newBadges = allBadges.filter(b => b.isNew).length;
      const totalBadges = allBadges.length;

      setUserStats({
        clientUnlocked,
        fourmizUnlocked,
        newBadges,
        totalBadges
      });

      // Marquer tous les badges comme vus
      await markAllBadgesAsSeen(userId);

    } catch (error) {
      console.error('Erreur chargement badges:', error);
    }
  };

  const markAllBadgesAsSeen = async (userId: string) => {
    try {
      await supabase
        .from('user_badges')
        .update({ seen: true })
        .eq('user_id', userId)
        .eq('is_unlocked', true)
        .eq('seen', false);
    } catch (error) {
      console.error('Erreur marquage badges vus:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await loadBadges(user.id);
    }
    setRefreshing(false);
  };

  const getIconName = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      'trending-up': 'trending-up-outline',
      'people': 'people-outline',
      'time': 'time-outline',
      'list': 'list-outline',
      'star': 'star-outline',
      'flash': 'flash-outline',
      'trophy': 'trophy-outline',
      'checkmark-circle': 'checkmark-circle-outline',
      'shield-checkmark': 'shield-checkmark-outline',
    };
    return iconMap[iconName] || 'trophy-outline';
  };

  const renderBadge = (item: Badge, isSmall: boolean = false) => {
    const gradient = item.isUnlocked
      ? [item.gradient_start || '#4CAF50', item.gradient_end || '#2196F3']
      : ['#E0E0E0', '#BDBDBD'];

    const rarity = rarityConfig[item.rarity] || rarityConfig.common;

    return (
      <View style={[styles.badgeCard, isSmall && styles.badgeCardSmall]}>
        <LinearGradient colors={gradient} style={styles.badgeGradient}>
          {item.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newText}>NOUVEAU!</Text>
            </View>
          )}

          <View style={styles.badgeHeader}>
            <Ionicons 
              name={getIconName(item.icon_name) as any} 
              size={isSmall ? 20 : 24} 
              color={item.isUnlocked ? '#fff' : '#888'} 
            />
            <Text style={[styles.badgeValue, !item.isUnlocked && { color: '#888' }, isSmall && { fontSize: 11 }]}>
              {item.value.toFixed(0)} {item.currency}
            </Text>
          </View>

          <View style={styles.starsContainer}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < rarity.stars ? 'star' : 'star-outline'}
                size={isSmall ? 10 : 12}
                color={item.isUnlocked ? '#FFD700' : '#888'}
              />
            ))}
          </View>

          <Text style={[styles.badgeName, !item.isUnlocked && { color: '#888' }, isSmall && { fontSize: 12 }]}>
            {item.name}
          </Text>
          <Text style={[styles.badgeDesc, !item.isUnlocked && { color: '#666' }, isSmall && { fontSize: 10 }]}>
            {item.description}
          </Text>

          {!item.isUnlocked ? (
            <View style={styles.lockInfo}>
              <Ionicons name="lock-closed" size={12} color="#999" />
              <Text style={[styles.lockText, isSmall && { fontSize: 9 }]}>
                À débloquer
              </Text>
            </View>
          ) : (
            <View style={styles.unlockedInfo}>
              <Ionicons name="checkmark-circle" size={12} color="#fff" />
              <Text style={[styles.unlockedText, isSmall && { fontSize: 9 }]}>
                Débloqué
              </Text>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Section d'introduction */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>
            Vos récompenses et badges
          </Text>
          <Text style={styles.introSubtitle}>
            Découvrez vos accomplissements et débloquez de nouveaux défis
          </Text>
        </View>

        {/* Statistiques rapides */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userStats.clientUnlocked + userStats.fourmizUnlocked}</Text>
              <Text style={styles.statLabel}>Badges débloqués</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userStats.newBadges}</Text>
              <Text style={styles.statLabel}>Nouveaux badges</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userStats.clientUnlocked}</Text>
              <Text style={styles.statLabel}>Badges clients</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userStats.fourmizUnlocked}</Text>
              <Text style={styles.statLabel}>Badges Fourmiz</Text>
            </View>
          </View>
        </View>

        {/* Section badges clients */}
        {clientBadges.length > 0 && (
          <View style={styles.badgesSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy-outline" size={20} color="#000000" />
              <Text style={styles.sectionTitle}>Badges Clients</Text>
            </View>
            <View style={styles.badgesContainer}>
              {clientBadges.map((badge) => (
                <View key={badge.id} style={styles.badgeWrapper}>
                  {renderBadge(badge, true)}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section badges Fourmiz */}
        {fourmizBadges.length > 0 && (
          <View style={styles.badgesSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="construct-outline" size={20} color="#000000" />
              <Text style={styles.sectionTitle}>Badges Fourmiz</Text>
            </View>
            <View style={styles.badgesContainer}>
              {fourmizBadges.map((badge) => (
                <View key={badge.id} style={styles.badgeWrapper}>
                  {renderBadge(badge, true)}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section d'aide */}
        <View style={styles.helpSection}>
          <View style={styles.helpCard}>
            <View style={styles.helpHeader}>
              <Ionicons name="help-circle-outline" size={20} color="#000000" />
              <Text style={styles.helpTitle}>Comment débloquer des badges ?</Text>
            </View>
            
            <View style={styles.helpSteps}>
              <View style={styles.helpStep}>
                <View style={styles.helpStepNumber}>
                  <Text style={styles.helpStepNumberText}>1</Text>
                </View>
                <Text style={styles.helpStepText}>
                  <Text style={styles.helpStepBold}>Utilisez</Text> les services de la plateforme activement
                </Text>
              </View>
              
              <View style={styles.helpStep}>
                <View style={styles.helpStepNumber}>
                  <Text style={styles.helpStepNumberText}>2</Text>
                </View>
                <Text style={styles.helpStepText}>
                  <Text style={styles.helpStepBold}>Accomplissez</Text> des missions avec excellence 
                </Text>
              </View>
              
              <View style={styles.helpStep}>
                <View style={styles.helpStepNumber}>
                  <Text style={styles.helpStepNumberText}>3</Text>
                </View>
                <Text style={styles.helpStepText}>
                  <Text style={styles.helpStepBold}>Parrainez</Text> vos amis pour débloquer des bonus
                </Text>
              </View>
              
              <View style={styles.helpStep}>
                <View style={styles.helpStepNumber}>
                  <Text style={styles.helpStepNumberText}>4</Text>
                </View>
                <Text style={styles.helpStepText}>
                  <Text style={styles.helpStepBold}>Collectez</Text> vos badges et suivez votre progression
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },

  scrollView: {
    flex: 1,
  },

  // Introduction avec style épuré
  introSection: {
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  introSubtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },

  // Section statistiques
  statsSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '400',
    textAlign: 'center',
  },

  // Section badges
  badgesSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  badgeWrapper: {
    width: '48%',
  },

  // Badge cards
  badgeCard: { 
    aspectRatio: 0.85,
    borderRadius: 8, 
    overflow: 'hidden', 
    marginBottom: 8,
  },
  badgeCardSmall: {
    aspectRatio: 1.1,
  },
  badgeGradient: { 
    flex: 1,
    padding: 12,
    position: 'relative',
    justifyContent: 'space-between',
  },
  newBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 10,
  },
  newText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#fff',
  },
  badgeHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8,
  },
  badgeValue: { 
    fontWeight: '600', 
    color: '#fff',
    fontSize: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 1,
    justifyContent: 'center',
  },
  badgeName: { 
    fontSize: 11, 
    fontWeight: '600', 
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 14,
  },
  badgeDesc: { 
    fontSize: 9, 
    color: '#fff', 
    opacity: 0.9, 
    lineHeight: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  lockInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 2,
  },
  lockText: { 
    fontSize: 8, 
    color: '#fff', 
    opacity: 0.8,
    fontWeight: '400',
  },
  unlockedInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 2,
  },
  unlockedText: { 
    fontSize: 8, 
    color: '#fff', 
    opacity: 0.9,
    fontWeight: '400',
  },

  // Section d'aide avec style épuré
  helpSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  helpCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  helpSteps: {
    gap: 12,
  },
  helpStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  helpStepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  helpStepNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  helpStepText: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 20,
    flex: 1,
    fontWeight: '400',
  },
  helpStepBold: {
    fontWeight: '600',
  },

  bottomSpacer: {
    height: 32,
  },
});
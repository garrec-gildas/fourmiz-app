// app/(tabs)/badges-fourmiz.tsx - CODE COMPLET AVEC CONTR?LES ADMIN
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const rarityConfig = {
  common: { label: 'Commun', color: '#607D8B', stars: 1 },
  rare: { label: 'Rare', color: '#4CAF50', stars: 2 },
  epic: { label: '?pique', color: '#9C27B0', stars: 3 },
  legendary: { label: 'L?gendaire', color: '#FFD700', stars: 4 },
};

// ? Cat?gories sp?cifiques aux Fourmiz
const categories = [
  { id: 'all', label: 'tous', icon: 'trophy-outline' },
  { id: 'missions', label: 'Missions', icon: 'checkmark-circle-outline' },
  { id: 'earnings', label: 'Gains', icon: 'trending-up-outline' },
  { id: 'speed', label: 'Rapidit?', icon: 'flash-outline' },
  { id: 'quality', label: 'Qualit?', icon: 'star-outline' },
  { id: 'reliability', label: 'Fiabilit?', icon: 'shield-checkmark-outline' },
  { id: 'availability', label: 'Disponibilit?', icon: 'time-outline' },
  { id: 'referral', label: 'Parrainage', icon: 'people-outline' },
];

interface FourmizBadge {
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
  is_active: boolean;
  is_visible: boolean;
  display_order: number;
  isUnlocked: boolean;
  unlockedDate: string | null;
  isNew: boolean;
}

export default function BadgesFourmizScreen() {
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [badgesCatalog, setBadgesCatalog] = useState<FourmizBadge[]>([]);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/auth/login');

      console.log('?? Chargement badges Fourmiz avec contr?les admin...');

      // ? NOUVEAU - R?cup?rer seulement les badges Fourmiz actifs et visibles
      const { data: catalog, error: catalogError } = await supabase
        .from('badges_catalog')
        .select(`
          id, name, description, custom_name, custom_description,
          category, icon_name, value, currency, rarity,
          gradient_start, gradient_end, is_active, is_visible, display_order
        `)
        .eq('is_active', true)    // ? Seulement les badges actifs
        .eq('is_visible', true)   // ? Seulement les badges visibles
        .in('category', ['missions', 'earnings', 'speed', 'quality', 'reliability', 'availability', 'referral']) // ? Cat?gories Fourmiz
        .order('display_order', { ascending: true })
        .order('category', { ascending: true });

      if (catalogError) {
        console.error('? Erreur catalogue badges Fourmiz:', catalogError);
        Alert.alert('Erreur', `Impossible de charger les badges Fourmiz: ${catalogError.message}`);
        return;
      }

      console.log(`? ${catalog?.length || 0} badges Fourmiz charg?s depuis le catalogue`);

      // R?cup?rer les badges d?bloqu?s par l'utilisateur Fourmiz
      const { data: unlocked, error: unlockedError } = await supabase
        .from('user_badges')
        .select('badge_id, unlocked_date, seen, is_unlocked')
        .eq('user_id', user.id);

      if (unlockedError) {
        console.error('?? Erreur badges utilisateur Fourmiz:', unlockedError);
      }

      console.log(`? ${unlocked?.length || 0} badges utilisateur Fourmiz charg?s`);

      // ? NOUVEAU - Fusionner avec noms/descriptions personnalis?s
      const merged: FourmizBadge[] = (catalog || []).map((badge) => {
        const unlock = unlocked?.find((ub) => ub.badge_id === badge.id);
        return {
          ...badge,
          // ? Utiliser custom_name/custom_description si disponibles
          name: badge.custom_name || badge.name,
          description: badge.custom_description || badge.description,
          isUnlocked: unlock?.is_unlocked || false,
          unlockedDate: unlock?.unlocked_date || null,
          isNew: unlock ? (unlock.is_unlocked && !unlock.seen) : false,
        };
      });

      console.log(`?? ${merged.length} badges Fourmiz finaux apr?s fusion`);
      setBadgesCatalog(merged);
      
      // ? Marquer tous les badges comme vus quand on ouvre la page
      await markAllBadgesAsSeen(user.id);
      
    } catch (error) {
      console.error('?? Erreur chargement badges Fourmiz:', error);
      Alert.alert('Erreur', 'Impossible de charger les r?compenses Fourmiz');
    } finally {
      setLoading(false);
    }
  };

  // ? Marquer tous les badges d?bloqu?s comme vus
  const markAllBadgesAsSeen = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_badges')
        .update({ seen: true })
        .eq('user_id', userId)
        .eq('is_unlocked', true)
        .eq('seen', false);

      if (error) {
        console.error('?? Erreur marquage badges Fourmiz vus:', error);
      } else {
        console.log('? Badges Fourmiz marqu?s comme vus');
      }
    } catch (error) {
      console.error('?? Erreur marquage badges Fourmiz:', error);
    }
  };

  // ? NOUVEAU - Filtrer par cat?gorie avec meilleure logique
  const filteredBadges = selectedCategory === 'all'
    ? badgesCatalog
    : badgesCatalog.filter((b) => b.category === selectedCategory);

  const getIconName = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      'trending-up': 'trending-up-outline',
      'people': 'people-outline',
      'time': 'time-outline',
      'checkmark-circle': 'checkmark-circle-outline',
      'star': 'star-outline',
      'flash': 'flash-outline',
      'trophy': 'trophy-outline',
      'shield-checkmark': 'shield-checkmark-outline',
      'list': 'list-outline',
    };
    return iconMap[iconName] || 'trophy-outline';
  };

  const renderBadge = ({ item }: { item: FourmizBadge }) => {
    // ? D?grad? selon l'?tat d?bloqu?/verrouill?
    const gradient = item.isUnlocked
      ? [item.gradient_start || '#4CAF50', item.gradient_end || '#2196F3']
      : ['#E0E0E0', '#BDBDBD'];

    const rarity = rarityConfig[item.rarity] || rarityConfig.common;

    return (
      <TouchableOpacity style={styles.badgeCard} activeOpacity={0.8}>
        <LinearGradient colors={gradient} style={styles.badgeGradient}>
          {/* Badge nouveau */}
          {item.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newText}>NOUVEAU!</Text>
            </View>
          )}

          {/* Header avec ic?ne et valeur */}
          <View style={styles.badgeHeader}>
            <Ionicons 
              name={getIconName(item.icon_name) as any} 
              size={28} 
              color={item.isUnlocked ? '#fff' : '#888'} 
            />
            <Text style={[styles.badgeValue, !item.isUnlocked && { color: '#888' }]}>
              {item.value.toFixed(2)} {item.currency}
            </Text>
          </View>

          {/* ?toiles de raret? */}
          <View style={styles.starsContainer}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < rarity.stars ? 'star' : 'star-outline'}
                size={12}
                color={item.isUnlocked ? '#FFD700' : '#888'}
              />
            ))}
          </View>

          {/* Nom et description */}
          <Text style={[styles.badgeName, !item.isUnlocked && { color: '#888' }]}>
            {item.name}
          </Text>
          <Text style={[styles.badgeDesc, !item.isUnlocked && { color: '#666' }]}>
            {item.description}
          </Text>

          {/* ?tat du badge */}
          {!item.isUnlocked ? (
            <View style={styles.lockInfo}>
              <Ionicons name="lock-closed" size={14} color="#999" />
              <Text style={styles.lockText}>
                Mission ? accomplir
              </Text>
            </View>
          ) : (
            <View style={styles.unlockedInfo}>
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={styles.unlockedText}>
                D?bloqu? le {new Date(item.unlockedDate!).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}

          {/* Ordre d'affichage (debug) */}
          {__DEV__ && (
            <Text style={styles.debugOrder}>#{item.display_order}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#FF4444" />
        <Text style={styles.loadingText}>Chargement des r?compenses Fourmiz...</Text>
      </SafeAreaView>
    );
  }

  // ? NOUVEAU - Statistiques am?lior?es sp?cifiques Fourmiz
  const unlockedCount = badgesCatalog.filter(b => b.isUnlocked).length;
  const totalCount = badgesCatalog.length;
  const legendaryCount = badgesCatalog.filter(b => b.rarity === 'legendary' && b.isUnlocked).length;
  const newCount = badgesCatalog.filter(b => b.isNew).length;
  const categoryCount = selectedCategory === 'all' 
    ? totalCount 
    : badgesCatalog.filter(b => b.category === selectedCategory).length;
  const missionsBadges = badgesCatalog.filter(b => b.category === 'missions' && b.isUnlocked).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header avec statistiques Fourmiz */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>R?compenses Fourmiz</Text>
        <Text style={styles.headerSubtitle}>
          {unlockedCount}/{totalCount} badges d?bloqu?s
        </Text>
      </View>

      {/* Filtres par cat?gorie Fourmiz */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtersScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.filterButton,
                  selectedCategory === category.id && styles.filterButtonActive
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Ionicons 
                  name={category.icon as any} 
                  size={16} 
                  color={selectedCategory === category.id ? '#fff' : '#666'} 
                />
                <Text style={[
                  styles.filterText,
                  selectedCategory === category.id && styles.filterTextActive
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Statistiques Fourmiz sp?cifiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{unlockedCount}</Text>
          <Text style={styles.statLabel}>D?bloqu?s</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{legendaryCount}</Text>
          <Text style={styles.statLabel}>L?gendaires</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{missionsBadges}</Text>
          <Text style={styles.statLabel}>Missions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{newCount}</Text>
          <Text style={styles.statLabel}>Nouveaux</Text>
        </View>
      </View>

      {/* Liste des badges */}
      {filteredBadges.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={64} color="#DDD" />
          <Text style={styles.emptyText}>Aucun badge Fourmiz dans cette cat?gorie</Text>
          <Text style={styles.emptySubText}>
            {selectedCategory === 'all' 
              ? 'Les badges Fourmiz seront affich?s une fois cr??s par l\'admin'
              : 'Changez de cat?gorie pour voir d\'autres badges Fourmiz'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBadges.sort((a, b) => {
            // Trier par nouveaux d'abord, puis par display_order, puis par valeur
            if (a.isNew && !b.isNew) return -1;
            if (!a.isNew && b.isNew) return 1;
            if (a.display_order !== b.display_order) return a.display_order - b.display_order;
            return b.value - a.value;
          })}
          keyExtractor={(item) => item.id}
          renderItem={renderBadge}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={loadBadges}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9fafb' 
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
  },

  // Header am?lior?
  header: { 
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { 
    fontSize: 24, 
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },

  // Filtres
  filtersContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
  },
  filtersScroll: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
  },

  // Statistiques
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
    textAlign: 'center',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#9ca3af',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#d1d5db',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Liste
  listContent: { 
    paddingHorizontal: 16, 
    paddingVertical: 16,
  },
  row: { 
    justifyContent: 'space-between' 
  },

  // Badge cards am?lior?es
  badgeCard: { 
    width: '48%', 
    aspectRatio: 0.85,
    borderRadius: 16, 
    overflow: 'hidden', 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeGradient: { 
    flex: 1,
    padding: 16,
    position: 'relative',
    justifyContent: 'space-between',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  newText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  badgeHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12,
  },
  badgeValue: { 
    fontFamily: 'Inter-Bold', 
    color: '#fff',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 2,
    justifyContent: 'center',
  },
  badgeName: { 
    fontSize: 16, 
    fontFamily: 'Inter-Bold', 
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  badgeDesc: { 
    fontSize: 11, 
    color: '#fff', 
    opacity: 0.95, 
    lineHeight: 15,
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  lockInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  lockText: { 
    fontSize: 11, 
    color: '#fff', 
    opacity: 0.8,
    fontFamily: 'Inter-Medium',
  },
  unlockedInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  unlockedText: { 
    fontSize: 11, 
    color: '#fff', 
    opacity: 0.9,
    fontFamily: 'Inter-Medium',
  },
  debugOrder: {
    position: 'absolute',
    top: 4,
    left: 4,
    fontSize: 10,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
});


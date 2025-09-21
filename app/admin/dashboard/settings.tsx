// app/admin/dashboard/settings.tsx - CONTRÔLE COMPLET DES BADGES + SYSTÈME DE PARRAINAGE
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Save, Users, Trophy, Settings as SettingsIcon, Edit3, Eye, EyeOff, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

// 🔧 INTERFACES POUR LE SYSTÈME DE PARRAINAGE
interface ReferralConfig {
  key: string;
  value_numeric: number;
  description: string;
  category: 'bonus' | 'commission' | 'limits' | 'general';
  updated_at: string;
}

interface ReferralOverview {
  total_referrals: number;
  active_referrals: number;
  monthly_referrals: number;
  total_paid_commissions: number;
  pending_commissions: number;
  monthly_commissions: number;
  system_enabled: boolean;
  current_bonus_amount: number;
  current_client_commission_rate: number;
  current_fourmiz_commission_rate: number;
  current_min_order_amount: number;
}

interface AdminSettings {
  referral_bonus_amount: number;
  referral_client_commission_rate: number;
  referral_fourmiz_commission_rate: number;
  referral_system_enabled: boolean;
  referral_min_order_amount: number;
  referral_max_commission_per_month: number;
  referral_max_bonus_per_day: number;
}

interface BadgeAdmin {
  id: string;
  name: string;
  description: string;
  custom_name: string | null;
  custom_description: string | null;
  category: string;
  value: number;
  currency: string;
  rarity: string;
  gradient_start: string;
  gradient_end: string;
  icon_name: string;
  is_active: boolean;
  is_visible: boolean;
  display_order: number;
}

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'referral' | 'badges' | 'general'>('referral');
  
  // Paramètres de parrainage
  const [referralSettings, setReferralSettings] = useState<AdminSettings>({
    referral_bonus_amount: 10,
    referral_client_commission_rate: 5.00,
    referral_fourmiz_commission_rate: 3.50,
    referral_system_enabled: true,
    referral_min_order_amount: 20,
    referral_max_commission_per_month: 500,
    referral_max_bonus_per_day: 100,
  });

  // Vue d'ensemble parrainage
  const [referralOverview, setReferralOverview] = useState<ReferralOverview | null>(null);

  // 🏆 Badges avec contrôle complet 
  const [badges, setBadges] = useState<BadgeAdmin[]>([]);
  const [editingBadge, setEditingBadge] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<BadgeAdmin | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadReferralSettings(),
        loadBadges()
      ]);
    } catch (error) {
      console.error('Erreur chargement admin:', error);
      Alert.alert('Erreur', 'Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  };

  // 🔧 CHARGEMENT DES PARAMÈTRES DE PARRAINAGE DEPUIS SUPABASE
  const loadReferralSettings = async () => {
    try {
      console.log('🔧 Chargement paramètres parrainage depuis Supabase...');
      
      // Charger tous les paramètres de configuration
      const { data: configData, error: configError } = await supabase
        .from('referral_config')
        .select('key, value_numeric, description, category, updated_at')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (configError) {
        console.warn('⚠️ Erreur config parrainage:', configError);
        // Continuer avec les valeurs par défaut 
        return;
      }

      // Charger la vue d'ensemble
      const { data: overviewData, error: overviewError } = await supabase
        .from('admin_referral_overview')
        .select('*')
        .single();

      if (overviewError) {
        console.warn('⚠️ Vue d\'ensemble indisponible:', overviewError);
      }

      if (configData && configData.length > 0) {
        // Transformer les données en objet AdminSettings
        const settings: AdminSettings = {
          referral_bonus_amount: configData.find(c => c.key === 'referral_bonus_amount')?.value_numeric || 10,
          referral_client_commission_rate: configData.find(c => c.key === 'referral_client_commission_rate')?.value_numeric || 5,
          referral_fourmiz_commission_rate: configData.find(c => c.key === 'referral_fourmiz_commission_rate')?.value_numeric || 3.5,
          referral_system_enabled: (configData.find(c => c.key === 'referral_system_enabled')?.value_numeric || 0) > 0,
          referral_min_order_amount: configData.find(c => c.key === 'referral_min_order_amount')?.value_numeric || 20,
          referral_max_commission_per_month: configData.find(c => c.key === 'referral_max_commission_per_month')?.value_numeric || 500,
          referral_max_bonus_per_day: configData.find(c => c.key === 'referral_max_bonus_per_day')?.value_numeric || 100,
        };

        setReferralSettings(settings);
        
        // Si vue d'ensemble disponible, l'utiliser pour enrichir l'affichage
        if (overviewData) {
          setReferralOverview(overviewData as ReferralOverview);
          console.log(`✅ Système parrainage: ${overviewData.active_referrals} parrainages actifs, ${overviewData.total_paid_commissions.toFixed(2)}€ payés`);
        }
        
        console.log('✅ Paramètres parrainage chargés depuis Supabase');
      } else {
        console.warn('⚠️ Aucun paramètre de parrainage trouvé, utilisation des valeurs par défaut');
      }

    } catch (error) {
      console.error('❌ Erreur chargement paramètres parrainage:', error);
      // Garder les valeurs par défaut en cas d'erreur
    }
  };

  // 🏆 NOUVEAU - Charger badges avec tous les champs de contrôle
  const loadBadges = async () => {
    try {
      console.log('🏆 Chargement badges avec contrôles admin...');
      
      const { data: badgesData, error } = await supabase
        .from('badges_catalog')
        .select(`
          id, name, description, custom_name, custom_description,
          category, value, currency, rarity, gradient_start, gradient_end,
          icon_name, is_active, is_visible, display_order
        `)
        .order('display_order', { ascending: true })
        .order('category', { ascending: true });

      if (error) throw error;

      if (badgesData && badgesData.length > 0) {
        console.log(`✅ ${badgesData.length} badges chargés avec contrôles`);
        setBadges(badgesData);
      } else {
        setBadges([]);
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement badges:', error);
      setBadges([]);
    }
  };

  // 💾 SAUVEGARDE VIA FONCTION SQL BATCH
  const saveReferralSettings = async () => {
    try {
      setSaving(true);
      console.log('💾 Sauvegarde paramètres parrainage via SQL batch...');
      
      // Récupérer l'utilisateur admin actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Préparer les paramètres au format JSON pour la fonction SQL
      const settingsJson = {
        referral_bonus_amount: referralSettings.referral_bonus_amount.toFixed(2),
        referral_client_commission_rate: referralSettings.referral_client_commission_rate.toFixed(2),
        referral_fourmiz_commission_rate: referralSettings.referral_fourmiz_commission_rate.toFixed(2),
        referral_system_enabled: referralSettings.referral_system_enabled ? '1' : '0',
        referral_min_order_amount: referralSettings.referral_min_order_amount.toFixed(2),
        referral_max_commission_per_month: referralSettings.referral_max_commission_per_month.toFixed(2),
        referral_max_bonus_per_day: referralSettings.referral_max_bonus_per_day.toFixed(2),
      };

      // 🚀 Appeler la fonction SQL batch
      const { data: batchResults, error: batchError } = await supabase
        .rpc('save_referral_settings_batch', {
          p_settings: settingsJson,
          p_admin_id: user.id
        });

      if (batchError) throw batchError;

      // Vérifier les résultats
      const failedUpdates = batchResults?.filter((r: any) => !r.success) || [];
      
      if (failedUpdates.length > 0) {
        console.warn('⚠️ Certains paramètres ont échoué:', failedUpdates);
        Alert.alert(
          'Sauvegarde partielle',
          `${batchResults.length - failedUpdates.length}/${batchResults.length} paramètres sauvegardés`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Succès !',
          `Tous les paramètres de parrainage ont été sauvegardés.`,
          [{ text: 'OK' }]
        );
      }

      console.log('✅ Paramètres de parrainage sauvegardés via SQL batch');

      // Recharger pour confirmer les modifications
      await loadReferralSettings();

    } catch (error) {
      console.error('❌ Erreur sauvegarde paramètres parrainage:', error);
      Alert.alert(
        'Erreur',
        'Impossible de sauvegarder les paramètres. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  // 🔧 NOUVEAU - Basculer l'état actif d'un badge
  const toggleBadgeActive = async (badgeId: string, isActive: boolean) => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('badges_catalog')
        .update({ is_active: isActive })
        .eq('id', badgeId);

      if (error) throw error;

      setBadges(prev => 
        prev.map(badge => 
          badge.id === badgeId ? { ...badge, is_active: isActive } : badge
        )
      );

      console.log(`✅ Badge ${isActive ? 'activé' : 'désactivé'}`);
      
    } catch (error) {
      console.error('Erreur changement état badge:', error);
      Alert.alert('Erreur', 'Impossible de modifier l\'état du badge');
    } finally {
      setSaving(false);
    }
  };

  // 👁️ NOUVEAU - Basculer la visibilité d'un badge
  const toggleBadgeVisibility = async (badgeId: string, isVisible: boolean) => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('badges_catalog')
        .update({ is_visible: isVisible })
        .eq('id', badgeId);

      if (error) throw error;

      setBadges(prev => 
        prev.map(badge => 
          badge.id === badgeId ? { ...badge, is_visible: isVisible } : badge
        )
      );

      console.log(`✅ Badge ${isVisible ? 'visible' : 'masqué'}`);
      
    } catch (error) {
      console.error('Erreur changement visibilité badge:', error);
      Alert.alert('Erreur', 'Impossible de modifier la visibilité du badge');
    } finally {
      setSaving(false);
    }
  };

  // 💾 NOUVEAU - Sauvegarder les modifications complètes d'un badge
  const saveBadgeComplete = async (badge: BadgeAdmin) => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('badges_catalog')
        .update({
          custom_name: badge.custom_name,
          custom_description: badge.custom_description,
          value: parseFloat(badge.value.toFixed(2)),
          is_active: badge.is_active,
          is_visible: badge.is_visible,
          display_order: badge.display_order
        })
        .eq('id', badge.id);

      if (error) throw error;

      setBadges(prev => 
        prev.map(b => b.id === badge.id ? badge : b)
      );

      setEditModal(null);
      Alert.alert('Succès', 'Badge mis à jour avec succès !');
      
    } catch (error) {
      console.error('Erreur sauvegarde badge complet:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le badge');
    } finally {
      setSaving(false);
    }
  };

  // 🗑️ NOUVEAU - Supprimer un badge (désactivation définitive)
  const deleteBadge = async (badgeId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer ce badge ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              
              const { error } = await supabase
                .from('badges_catalog')
                .update({ 
                  is_active: false,
                  is_visible: false,
                  display_order: 9999 
                })
                .eq('id', badgeId);

              if (error) throw error;

              setBadges(prev => prev.filter(b => b.id !== badgeId));
              Alert.alert('Succès', 'Badge supprimé');
              
            } catch (error) {
              console.error('Erreur suppression badge:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le badge');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  // 💰 HELPER POUR FORMATER LA MONNAIE
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Filtrer badges selon les préférences
  const filteredBadges = showInactive 
    ? badges 
    : badges.filter(b => b.is_active);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement des paramètres...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paramètres Admin</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Onglets */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'referral' && styles.activeTab]}
          onPress={() => setActiveTab('referral')}
        >
          <Users size={20} color={activeTab === 'referral' ? '#fff' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'referral' && styles.activeTabText]}>
            Parrainage
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'badges' && styles.activeTab]}
          onPress={() => setActiveTab('badges')}
        >
          <Trophy size={20} color={activeTab === 'badges' ? '#fff' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'badges' && styles.activeTabText]}>
            Badges
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'general' && styles.activeTab]}
          onPress={() => setActiveTab('general')}
        >
          <SettingsIcon size={20} color={activeTab === 'general' ? '#fff' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'general' && styles.activeTabText]}>
            Général
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'referral' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔧 Paramètres de Parrainage</Text>
            
            {/* Vue d'ensemble si disponible */}
            {referralOverview && (
              <View style={styles.overviewCard}>
                <Text style={styles.overviewTitle}>📊 Vue d'ensemble</Text>
                
                <View style={styles.overviewGrid}>
                  <View style={styles.overviewItem}>
                    <Text style={styles.overviewValue}>{referralOverview.active_referrals}</Text>
                    <Text style={styles.overviewLabel}>Parrainages actifs</Text>
                  </View>
                  
                  <View style={styles.overviewItem}>
                    <Text style={styles.overviewValue}>
                      {formatCurrency(referralOverview.monthly_commissions)}
                    </Text>
                    <Text style={styles.overviewLabel}>Commissions ce mois</Text>
                  </View>
                  
                  <View style={styles.overviewItem}>
                    <Text style={styles.overviewValue}>
                      {formatCurrency(referralOverview.pending_commissions)}
                    </Text>
                    <Text style={styles.overviewLabel}>En attente</Text>
                  </View>
                  
                  <View style={styles.overviewItem}>
                    <Text style={styles.overviewValue}>{referralOverview.monthly_referrals}</Text>
                    <Text style={styles.overviewLabel}>Nouveaux ce mois</Text>
                  </View>
                </View>
              </View>
            )}

            {/* État global du système */}
            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <Text style={styles.settingTitle}>🔄 État du Système</Text>
                <Switch
                  value={referralSettings.referral_system_enabled}
                  onValueChange={(value) =>
                    setReferralSettings(prev => ({
                      ...prev,
                      referral_system_enabled: value
                    }))
                  }
                  trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                  thumbColor={referralSettings.referral_system_enabled ? '#fff' : '#f4f3f4'}
                />
              </View>
              <Text style={styles.settingDescription}>
                {referralSettings.referral_system_enabled 
                  ? '✅ Système de parrainage activé - Les nouveaux parrainages sont acceptés' 
                  : '❌ Système de parrainage désactivé - Aucun nouveau parrainage ne sera créé'}
              </Text>
              {referralOverview && (
                <Text style={styles.settingSubText}>
                  Impact sur {referralOverview.total_referrals} parrainages existants
                </Text>
              )}
            </View>

            {/* Bonus de parrainage */}
            <View style={styles.settingCard}>
              <Text style={styles.settingTitle}>🎁 Bonus d'Inscription</Text>
              <Text style={styles.settingDescription}>
                Montant du bonus versé au parrain lors de l'inscription du filleul
              </Text>
              <View style={styles.inputContainer}>
                <TextInput 
                  style={styles.settingInput}
                  value={referralSettings.referral_bonus_amount.toString()}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 0;
                    const maxBonus = referralSettings.referral_max_bonus_per_day || 100;
                    const clampedValue = Math.max(0, Math.min(maxBonus, value));
                    setReferralSettings(prev => ({
                      ...prev,
                      referral_bonus_amount: clampedValue
                    }));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="10.00"
                />
                <Text style={styles.inputSuffix}>€</Text>
              </View>
              <Text style={styles.inputHint}>
                Recommandé: 5-15€ • Maximum: {referralSettings.referral_max_bonus_per_day || 100}€/jour
              </Text>
              {referralOverview && (
                <Text style={styles.inputSubText}>
                  📈 Dernier mois: {referralOverview.monthly_referrals} nouveaux × {referralSettings.referral_bonus_amount}€ = {(referralOverview.monthly_referrals * referralSettings.referral_bonus_amount).toFixed(2)}€
                </Text>
              )}
            </View>

            {/* Commissions clients */}
            <View style={styles.settingCard}>
              <Text style={styles.settingTitle}>👥 Commission Client</Text>
              <Text style={styles.settingDescription}>
                Pourcentage de commission sur chaque commande d'un client parrainé
              </Text>
              <View style={styles.inputContainer}>
                <TextInput 
                  style={styles.settingInput}
                  value={referralSettings.referral_client_commission_rate.toFixed(2)}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 0;
                    const clampedValue = Math.max(0, Math.min(20, value));
                    setReferralSettings(prev => ({
                      ...prev,
                      referral_client_commission_rate: clampedValue
                    }));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="5.00"
                />
                <Text style={styles.inputSuffix}>%</Text>
              </View>
              <Text style={styles.inputHint}>
                Recommandé: 3-8% • Maximum: 20%
              </Text>
            </View>

            {/* Commissions fourmiz */}
            <View style={styles.settingCard}>
              <Text style={styles.settingTitle}>🐜 Commission Fourmiz</Text>
              <Text style={styles.settingDescription}>
                Pourcentage de commission sur chaque service d'un fourmiz parrainé
              </Text>
              <View style={styles.inputContainer}>
                <TextInput 
                  style={styles.settingInput}
                  value={referralSettings.referral_fourmiz_commission_rate.toFixed(2)}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 0;
                    const clampedValue = Math.max(0, Math.min(15, value));
                    setReferralSettings(prev => ({
                      ...prev,
                      referral_fourmiz_commission_rate: clampedValue
                    }));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="3.50"
                />
                <Text style={styles.inputSuffix}>%</Text>
              </View>
              <Text style={styles.inputHint}>
                Recommandé: 2-5% • Maximum: 15%
              </Text>
            </View>

            {/* Montant minimum */}
            <View style={styles.settingCard}>
              <Text style={styles.settingTitle}>💰 Montant Minimum</Text>
              <Text style={styles.settingDescription}>
                Montant minimum d'une commande pour déclencher les commissions
              </Text>
              <View style={styles.inputContainer}>
                <TextInput 
                  style={styles.settingInput}
                  value={referralSettings.referral_min_order_amount.toString()}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 0;
                    const clampedValue = Math.max(0, Math.min(200, value));
                    setReferralSettings(prev => ({
                      ...prev,
                      referral_min_order_amount: clampedValue
                    }));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="20.00"
                />
                <Text style={styles.inputSuffix}>€</Text>
              </View>
              <Text style={styles.inputHint}>
                Recommandé: 15-30€ • Maximum: 200€
              </Text>
            </View>

            {/* Limites de sécurité */}
            <View style={styles.settingCard}>
              <Text style={styles.settingTitle}>🛡️ Limites de Sécurité</Text>
              <Text style={styles.settingDescription}>
                Protections contre les abus du système de parrainage
              </Text>
              
              <View style={styles.limitRow}>
                <Text style={styles.limitLabel}>Commission max/mois par parrain:</Text>
                <View style={styles.limitInputContainer}>
                  <TextInput 
                    style={styles.limitInput}
                    value={referralSettings.referral_max_commission_per_month.toString()}
                    onChangeText={(text) => {
                      const value = parseFloat(text) || 0;
                      const clampedValue = Math.max(0, Math.min(5000, value));
                      setReferralSettings(prev => ({
                        ...prev,
                        referral_max_commission_per_month: clampedValue
                      }));
                    }}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.limitSuffix}>€</Text>
                </View>
              </View>
              
              <View style={styles.limitRow}>
                <Text style={styles.limitLabel}>Bonus max/jour:</Text>
                <View style={styles.limitInputContainer}>
                  <TextInput 
                    style={styles.limitInput}
                    value={referralSettings.referral_max_bonus_per_day.toString()}
                    onChangeText={(text) => {
                      const value = parseFloat(text) || 0;
                      const clampedValue = Math.max(0, Math.min(1000, value));
                      setReferralSettings(prev => ({
                        ...prev,
                        referral_max_bonus_per_day: clampedValue
                      }));
                    }}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.limitSuffix}>€</Text>
                </View>
              </View>
            </View>

            {/* Aperçu des gains avec calculs dynamiques */}
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>💡 Aperçu des Gains</Text>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Client commande 50€:</Text>
                <Text style={styles.previewValue}>
                  {(50 * referralSettings.referral_client_commission_rate / 100).toFixed(2)}€
                </Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Fourmiz service 80€:</Text>
                <Text style={styles.previewValue}>
                  {(80 * referralSettings.referral_fourmiz_commission_rate / 100).toFixed(2)}€
                </Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Bonus inscription:</Text>
                <Text style={[styles.previewValue, styles.bonusValue]}>
                  +{referralSettings.referral_bonus_amount.toFixed(2)}€
                </Text>
              </View>
              
              <View style={styles.previewSeparator} />
              
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, styles.totalLabel]}>Total exemple:</Text>
                <Text style={[styles.previewValue, styles.totalValue]}>
                  {(
                    (50 * referralSettings.referral_client_commission_rate / 100) +
                    (80 * referralSettings.referral_fourmiz_commission_rate / 100) +
                    referralSettings.referral_bonus_amount 
                  ).toFixed(2)}€
                </Text>
              </View>
              
              {referralOverview && (
                <>
                  <View style={styles.previewSeparator} />
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Projection mensuelle:</Text>
                    <Text style={styles.previewProjection}>
                      ~{((referralOverview.monthly_referrals * referralSettings.referral_bonus_amount) + 
                         referralOverview.monthly_commissions).toFixed(2)}€
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Bouton de sauvegarde */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                saving && styles.saveButtonDisabled
              ]}
              onPress={saveReferralSettings}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Sauvegarder via SQL Batch</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Informations importantes enrichies */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>ℹ️ Informations Importantes</Text>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>•</Text>
                <Text style={styles.infoText}>
                  Les paramètres sont <Text style={styles.infoBold}>sauvegardés en base de données</Text> et appliqués automatiquement 
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>•</Text>
                <Text style={styles.infoText}>
                  Le bonus est versé <Text style={styles.infoBold}>une seule fois</Text> lors de la première activité du filleul
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>•</Text>
                <Text style={styles.infoText}>
                  Les commissions sont calculées à <Text style={styles.infoBold}>chaque transaction</Text> via les fonctions SQL
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>•</Text>
                <Text style={styles.infoText}>
                  Montant minimum: {referralSettings.referral_min_order_amount}€ requis pour déclencher les commissions
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>•</Text>
                <Text style={styles.infoText}>
                  Limites de sécurité: {referralSettings.referral_max_commission_per_month}€/mois et {referralSettings.referral_max_bonus_per_day}€/jour maximum
                </Text>
              </View>
              
              {referralOverview && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoBullet}>•</Text>
                  <Text style={styles.infoText}>
                    <Text style={styles.infoBold}>Système actif:</Text> {referralOverview.active_referrals} parrainages en cours, {formatCurrency(referralOverview.total_paid_commissions)} déjà versés
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'badges' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Gestion Complète des Badges</Text>
            
            {/* Contrôles d'affichage */}
            <View style={styles.badgesControls}>
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Afficher badges inactifs</Text>
                <Switch
                  value={showInactive}
                  onValueChange={setShowInactive}
                  trackColor={{ false: '#E5E5E5', true: '#FF4444' }}
                  thumbColor={showInactive ? '#fff' : '#f4f3f4'}
                />
              </View>
              <Text style={styles.badgesInfoText}>
                📊 {filteredBadges.length} badges ({badges.filter(b => b.is_active).length} actifs, {badges.filter(b => !b.is_active).length} inactifs)
              </Text>
            </View>
            
            {filteredBadges.length === 0 ? (
              <View style={styles.placeholderCard}>
                <Text style={styles.placeholderText}>Aucun badge trouvé</Text>
                <Text style={styles.placeholderSubText}>
                  Exécutez le script SQL pour créer les badges.
                </Text>
              </View>
            ) : (
              <>
                {/* Liste des badges avec contrôles complets */}
                {['spending', 'referral', 'timing', 'order', 'quality', 'speed', 'missions', 'earnings', 'reliability', 'availability'].map(category => {
                  const categoryBadges = filteredBadges.filter(b => b.category === category);
                  if (categoryBadges.length === 0) return null;
                  
                  const categoryLabels: Record<string, string> = {
                    spending: '💰 Dépenses Client',
                    referral: '👥 Parrainage',
                    timing: '⏰ Horaires Client',
                    order: '📦 Commandes Client',
                    quality: '⭐ Qualité',
                    speed: '⚡ Rapidité',
                    missions: '🎯 Missions Fourmiz',
                    earnings: '💵 Gains Fourmiz',
                    reliability: '🛡️ Fiabilité Fourmiz',
                    availability: '📅 Disponibilité Fourmiz'
                  };
                  
                  return (
                    <View key={category} style={styles.badgeTypeSection}>
                      <Text style={styles.badgeTypeTitle}>
                        {categoryLabels[category]} ({categoryBadges.length})
                      </Text>
                      {categoryBadges.map((badge) => (
                        <View key={badge.id} style={[
                          styles.badgeCard,
                          !badge.is_active && styles.badgeCardInactive
                        ]}>
                          {/* État du badge */}
                          <View style={styles.badgeStatusRow}>
                            <View style={styles.badgeStatusControls}>
                              <View style={styles.statusControl}>
                                <Text style={styles.statusLabel}>Actif</Text>
                                <Switch
                                  value={badge.is_active}
                                  onValueChange={(value) => toggleBadgeActive(badge.id, value)}
                                  trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                                  thumbColor={badge.is_active ? '#fff' : '#f4f3f4'}
                                  disabled={saving}
                                />
                              </View>
                              <View style={styles.statusControl}>
                                <Text style={styles.statusLabel}>Visible</Text>
                                <Switch
                                  value={badge.is_visible}
                                  onValueChange={(value) => toggleBadgeVisibility(badge.id, value)}
                                  trackColor={{ false: '#E5E5E5', true: '#2196F3' }}
                                  thumbColor={badge.is_visible ? '#fff' : '#f4f3f4'}
                                  disabled={saving}
                                />
                              </View>
                            </View>
                            <View style={styles.badgeActions}>
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => setEditModal(badge)}
                              >
                                <Edit3 size={16} color="#2196F3" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => toggleBadgeVisibility(badge.id, !badge.is_visible)}
                              >
                                {badge.is_visible ? 
                                  <Eye size={16} color="#4CAF50" /> : 
                                  <EyeOff size={16} color="#999" />
                                }
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => deleteBadge(badge.id)}
                              >
                                <Trash2 size={16} color="#F44336" />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Informations du badge */}
                          <View style={styles.badgeInfo}>
                            <Text style={styles.badgeName}>
                              {badge.custom_name || badge.name}
                            </Text>
                            <Text style={styles.badgeDescription}>
                              {badge.custom_description || badge.description}
                            </Text>
                            <Text style={styles.badgeCategory}>
                              {badge.rarity} • {badge.icon_name}
                            </Text>
                          </View>
                          
                          {/* Récompense */}
                          <View style={styles.badgeValue}>
                            <Text style={styles.badgeAmount}>
                              {badge.value.toFixed(2)}{badge.currency}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {activeTab === 'general' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚙️ Paramètres Généraux</Text>
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderText}>
                Autres paramètres généraux à venir...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 🎨 NOUVEAU - Modal d'édition complète */}
      <Modal
        visible={editModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {editModal && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <Text style={styles.modalCancel}>Annuler</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Éditer le badge</Text>
              <TouchableOpacity 
                onPress={() => saveBadgeComplete(editModal)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FF4444" />
                ) : (
                  <Text style={styles.modalSave}>Sauver</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Nom personnalisé */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Nom personnalisé (laissez vide pour utiliser l'original)
                </Text>
                <TextInput 
                  style={styles.modalInput}
                  value={editModal.custom_name || ''}
                  onChangeText={(text) => setEditModal({
                    ...editModal,
                    custom_name: text.trim() === '' ? null : text
                  })}
                  placeholder={editModal.name}
                />
              </View>

              {/* Description personnalisée */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Description personnalisée (laissez vide pour utiliser l'originale)
                </Text>
                <TextInput 
                  style={[styles.modalInput, styles.modalTextArea]}
                  value={editModal.custom_description || ''}
                  onChangeText={(text) => setEditModal({
                    ...editModal,
                    custom_description: text.trim() === '' ? null : text
                  })}
                  placeholder={editModal.description}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Récompense */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Récompense (€)</Text>
                <TextInput 
                  style={styles.modalInput}
                  value={editModal.value.toFixed(2)}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 0;
                    const clampedValue = Math.max(0, Math.min(1000, value));
                    setEditModal({
                      ...editModal,
                      value: clampedValue
                    });
                  }}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Ordre d'affichage */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ordre d'affichage</Text>
                <TextInput 
                  style={styles.modalInput}
                  value={editModal.display_order.toString()}
                  onChangeText={(text) => {
                    const order = parseInt(text) || 0;
                    setEditModal({
                      ...editModal,
                      display_order: Math.max(0, order)
                    });
                  }}
                  keyboardType="number-pad"
                />
              </View>

              {/* Aperçu */}
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>Aperçu :</Text>
                <View style={styles.previewBadgeCard}>
                  <Text style={styles.previewName}>
                    {editModal.custom_name || editModal.name}
                  </Text>
                  <Text style={styles.previewDesc}>
                    {editModal.custom_description || editModal.description}
                  </Text>
                  <Text style={styles.previewBadgeValue}>
                    {editModal.value.toFixed(2)}€
                  </Text>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },

  // Onglets
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#FF4444',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },

  // Contenu
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 20,
  },

  // 🔧 STYLES PARRAINAGE
  overviewCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  overviewTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0369A1',
    marginBottom: 12,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 8,
  },
  overviewValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0369A1',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0369A1',
    textAlign: 'center',
  },

  // Paramètres de parrainage
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  settingSubText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#4CAF50',
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  settingInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  inputSuffix: {
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  inputHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
    marginTop: 4,
  },
  inputSubText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#2196F3',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Limites
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  limitLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
    flex: 1,
  },
  limitInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minWidth: 100,
  },
  limitInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
    textAlign: 'right',
    flex: 1,
  },
  limitSuffix: {
    paddingHorizontal: 8,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },

  // Aperçu
  previewCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  previewTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  previewLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  previewValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
  },
  bonusValue: {
    color: '#FF4444',
  },
  previewSeparator: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 8,
  },
  totalLabel: {
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FF4444',
  },
  previewProjection: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#2196F3',
  },

  // Bouton sauvegarde
  saveButton: {
    backgroundColor: '#FF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },

  // Informations
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold', 
    color: '#1976D2',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoBullet: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#2196F3',
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1565C0',
    lineHeight: 20,
  },
  infoBold: {
    fontFamily: 'Inter-SemiBold',
  },

  // 🏆 NOUVEAUX STYLES - Contrôles badges
  badgesControls: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  badgesInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4CAF50',
  },

  // 🏆 NOUVEAUX STYLES - Cartes badges avancées
  badgeTypeSection: {
    marginBottom: 24,
  },
  badgeTypeTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
    paddingLeft: 8,
  },
  badgeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  badgeCardInactive: {
    opacity: 0.6,
    borderLeftColor: '#999',
  },
  badgeStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeStatusControls: {
    flexDirection: 'row',
    gap: 16,
  },
  statusControl: {
    alignItems: 'center',
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  badgeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
  },
  badgeInfo: {
    flex: 1,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 4,
  },
  badgeCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
  badgeValue: {
    alignItems: 'flex-end',
  },
  badgeAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
  },

  // 🎨 NOUVEAUX STYLES - Modal d'édition
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  modalCancel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  modalSave: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FF4444',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#FFFFFF',
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  previewSection: {
    marginTop: 20,
  },
  previewBadgeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  previewName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  previewDesc: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 8,
  },
  previewBadgeValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
    textAlign: 'right',
  },

  // Placeholder
  placeholderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginBottom: 8,
  },
  placeholderSubText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
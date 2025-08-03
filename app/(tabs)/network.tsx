// app/(tabs)/network.tsx - VERSION CORRIGÉE COMPLÈTE AVEC VRAIS PRÉNOMS
// ✅ Syntaxe corrigée + Jointure profiles pour afficher les vrais prénoms
// 🚀 DOIT AFFICHER LES VRAIS NOMS

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

interface ReferralStats {
  totalReferred: number;
  activeReferrals: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  bonusAmount: number;
  clientCommissionRate: number;
  fourmizCommissionRate: number;
}

interface ReferralHistory {
  id: string;
  referred_user_name: string;
  referred_user_email?: string;
  referred_user_type: 'client' | 'fourmiz';
  bonus_earned: number;
  commission_earned: number;
  status: 'pending' | 'active' | 'inactive';
  created_at: string;
  code_utilise: string;
  first_order_completed: boolean;
}

interface MyReferrer {
  id: string;
  parrain_name: string;
  code_utilise: string;
  created_at: string;
}

export default function NetworkScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [myReferrer, setMyReferrer] = useState<MyReferrer | null>(null);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferred: 0,
    activeReferrals: 0,
    totalEarnings: 0,
    thisMonthEarnings: 0,
    bonusAmount: 50,
    clientCommissionRate: 5,
    fourmizCommissionRate: 3,
  });
  const [referralHistory, setReferralHistory] = useState<ReferralHistory[]>([]);

  useEffect(() => {
    loadNetworkData();
  }, []);

  const loadNetworkData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUser(user);
      console.log('🔄 Chargement réseau pour:', user.id);

      await Promise.all([
        loadUserReferralCode(user.id),
        loadReferralSettings(),
        loadMyReferrer(user.id),
        loadReferralStatsDirect(user.id),
        loadReferralHistoryDirect(user.id) // ✅ Version avec vrais prénoms
      ]);

    } catch (error) {
      console.error('❌ Erreur chargement réseau:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNetworkData();
    setRefreshing(false);
  };

  const loadUserReferralCode = async (userId: string) => {
    try {
      console.log('🔍 Récupération code direct...');
      
      // Chercher un code existant
      const { data: existingCode } = await supabase
        .from('user_referrals')
        .select('referral_code')
        .eq('referrer_user_id', userId)
        .limit(1)
        .single();

      if (existingCode?.referral_code) {
        setReferralCode(existingCode.referral_code);
        console.log('✅ Code existant:', existingCode.referral_code);
      } else {
        // Générer un nouveau code
        const newCode = generateRandomCode();
        setReferralCode(newCode);
        console.log('✅ Code généré:', newCode);
      }
    } catch (error) {
      console.error('❌ Erreur récupération code:', error);
      setReferralCode('FOURMIZ');
    }
  };

  const generateRandomCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const loadReferralStatsDirect = async (userId: string) => {
    try {
      console.log('📊 Stats directes...');
      
      // Stats depuis user_referrals
      const { data: userReferrals, error: userError } = await supabase
        .from('user_referrals')
        .select('status, bonus_earned, total_commission_earned')
        .eq('referrer_user_id', userId);

      // Stats depuis referrals
      const { data: referrals, error: referralError } = await supabase
        .from('referrals')
        .select('is_validated, bonus_amount, total_commission_earned')
        .eq('parrain_id', userId);

      let totalReferrals = 0;
      let successfulReferrals = 0;
      let totalEarnings = 0;

      // Calculer depuis user_referrals
      if (!userError && userReferrals) {
        totalReferrals += userReferrals.length;
        successfulReferrals += userReferrals.filter(r => r.status === 'completed').length;
        totalEarnings += userReferrals.reduce((sum, r) => 
          sum + (r.bonus_earned || 0) + (r.total_commission_earned || 0), 0
        );
      }

      // Ajouter depuis referrals
      if (!referralError && referrals) {
        totalReferrals += referrals.length;
        successfulReferrals += referrals.filter(r => r.is_validated).length;
        totalEarnings += referrals.reduce((sum, r) => 
          sum + (r.bonus_amount || 0) + (r.total_commission_earned || 0), 0
        );
      }

      setStats(prev => ({
        ...prev,
        totalReferred: totalReferrals,
        activeReferrals: successfulReferrals,
        totalEarnings,
        thisMonthEarnings: totalEarnings,
      }));

      console.log('✅ Stats directes:', { totalReferrals, successfulReferrals, totalEarnings });
    } catch (error) {
      console.error('❌ Erreur stats directes:', error);
    }
  };

  // ✅ VERSION CORRIGÉE AVEC VRAIS PRÉNOMS
  const loadReferralHistoryDirect = async (userId: string) => {
    try {
      console.log('📜 🚀 Chargement DIRECT des filleuls avec prénoms pour:', userId);
      
      // ✅ JOINTURE avec la table profiles pour récupérer les prénoms
      const { data: rawReferrals, error } = await supabase
        .from('user_referrals')
        .select(`
          *,
          profiles!user_referrals_referred_user_id_fkey (
            firstname,
            lastname,
            email
          )
        `)
        .eq('referrer_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur requête avec jointure:', error);
        throw error;
      }

      console.log('✅ Filleuls trouvés avec jointure:', rawReferrals?.length || 0);
      console.log('📋 Données brutes avec profiles:', rawReferrals);

      if (!rawReferrals || rawReferrals.length === 0) {
        console.log('ℹ️ Aucun filleul trouvé');
        setReferralHistory([]);
        return;
      }

      // ✅ Mapper avec les vrais prénoms
      const history: ReferralHistory[] = rawReferrals.map((referral: any) => {
        const profile = referral.profiles;
        const firstName = profile?.firstname || 'Utilisateur';
        const lastName = profile?.lastname || '';
        const email = profile?.email || '';
        
        // Construire le nom complet
        const fullName = lastName ? `${firstName} ${lastName}` : firstName;
        
        return {
          id: referral.id,
          referred_user_name: fullName, // ✅ VRAI PRÉNOM !
          referred_user_email: email,
          referred_user_type: 'client' as const,
          bonus_earned: referral.bonus_earned || 0,
          commission_earned: referral.total_commission_earned || 0,
          status: referral.status === 'completed' ? 'active' : 'pending',
          created_at: referral.created_at,
          code_utilise: referral.referral_code || '',
          first_order_completed: referral.first_order_completed || false,
        };
      });

      setReferralHistory(history);
      console.log('✅ Historique avec VRAIS PRÉNOMS chargé:', history.length, 'filleuls');
      console.log('👥 Noms des filleuls RÉELS:', history.map(h => h.referred_user_name));

    } catch (error) {
      console.error('❌ Erreur chargement historique avec prénoms:', error);
      setReferralHistory([]);
    }
  };

  const loadMyReferrer = async (userId: string) => {
    try {
      console.log('👨‍👩‍👧‍👦 Recherche parrain...');
      
      const { data: referrerData, error } = await supabase
        .from('user_referrals')
        .select('id, referral_code, referrer_name, created_at, referrer_user_id')
        .eq('referred_user_id', userId)
        .single();

      if (!error && referrerData) {
        setMyReferrer({
          id: referrerData.id,
          parrain_name: referrerData.referrer_name || 'Utilisateur',
          code_utilise: referrerData.referral_code || '',
          created_at: referrerData.created_at
        });
        console.log('✅ Parrain trouvé:', referrerData.referrer_name);
      } else {
        console.log('ℹ️ Aucun parrain trouvé');
      }
    } catch (error) {
      console.error('❌ Erreur récupération parrain:', error);
    }
  };

  const loadReferralSettings = async () => {
    try {
      const { data: settings, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'referral_bonus_amount',
          'referral_client_commission_rate',
          'referral_fourmiz_commission_rate'
        ]);

      if (!error && settings) {
        const bonusAmount = settings.find(s => s.setting_key === 'referral_bonus_amount')?.setting_value || 50;
        const clientRate = settings.find(s => s.setting_key === 'referral_client_commission_rate')?.setting_value || 5;
        const fourmizRate = settings.find(s => s.setting_key === 'referral_fourmiz_commission_rate')?.setting_value || 3;

        setStats(prev => ({
          ...prev,
          bonusAmount: parseFloat(bonusAmount),
          clientCommissionRate: parseFloat(clientRate),
          fourmizCommissionRate: parseFloat(fourmizRate),
        }));
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    }
  };

  const copyReferralCode = async () => {
    try {
      await Clipboard.setStringAsync(referralCode);
      Alert.alert('Copié !', 'Code de parrainage copié dans le presse-papiers');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de copier le code');
    }
  };

  const shareReferralCode = async () => {
    try {
      const message = `🚀 Rejoignez Fourmiz avec mon code de parrainage : ${referralCode}\n\n✨ Obtenez des services de qualité et gagnez des récompenses !`;
      
      await Share.share({
        message,
        title: 'Rejoignez Fourmiz !',
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const regenerateReferralCode = async () => {
    if (!currentUser) return;
    
    Alert.alert(
      'Régénérer le code ?',
      'Voulez-vous créer un nouveau code de parrainage ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Régénérer', 
          onPress: () => {
            const newCode = generateRandomCode();
            setReferralCode(newCode);
            Alert.alert('✅ Nouveau code !', `Votre nouveau code : ${newCode}`);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Chargement de votre réseau...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>👥 Mon Réseau</Text>
          <Text style={styles.headerSubtitle}>Parrainez et gagnez des récompenses</Text>
        </View>

        {/* ✅ DEBUG FINAL */}
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>🔍 DEBUG FINAL</Text>
          <Text style={styles.debugText}>User: {currentUser?.id?.slice(-8)}</Text>
          <Text style={styles.debugText}>Code: {referralCode}</Text>
          <Text style={styles.debugText}>Stats Total: {stats.totalReferred}</Text>
          <Text style={styles.debugText}>Liste Filleuls: {referralHistory.length}</Text>
          <Text style={styles.debugText}>
            Noms: {referralHistory.map(r => r.referred_user_name).slice(0, 3).join(', ')}
            {referralHistory.length > 3 && '...'}
          </Text>
          <Text style={[styles.debugText, { 
            color: stats.totalReferred === referralHistory.length ? '#10b981' : '#ef4444',
            fontWeight: 'bold'
          }]}>
            Status: {stats.totalReferred === referralHistory.length ? '✅ SYNC' : '❌ DÉSYNC'}
          </Text>
        </View>

        {/* Code de parrainage */}
        <View style={styles.referralCodeSection}>
          <LinearGradient
            colors={['#FF4444', '#FF6B6B']}
            style={styles.referralCodeCard}
          >
            <Text style={styles.referralCodeTitle}>Votre code de parrainage</Text>
            <View style={styles.codeContainer}>
              <Text style={styles.referralCodeText}>{referralCode}</Text>
              <TouchableOpacity onPress={copyReferralCode} style={styles.copyButton}>
                <Ionicons name="copy" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={shareReferralCode} style={styles.shareButton}>
              <Ionicons name="share" size={16} color="#FF4444" />
              <Text style={styles.shareButtonText}>Partager mon code</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={regenerateReferralCode} style={styles.regenerateButton}>
              <Ionicons name="refresh" size={16} color="#666" />
              <Text style={styles.regenerateButtonText}>Régénérer</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Section Mon Parrain */}
        {myReferrer && (
          <View style={styles.referrerSection}>
            <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Mon Parrain</Text>
            <View style={styles.referrerCard}>
              <View style={styles.referrerInfo}>
                <Ionicons name="person-circle" size={24} color="#4CAF50" />
                <View style={styles.referrerDetails}>
                  <Text style={styles.referrerName}>{myReferrer.parrain_name}</Text>
                  <Text style={styles.referrerCode}>Code utilisé : {myReferrer.code_utilise}</Text>
                  <Text style={styles.referrerDate}>
                    Parrainé le {new Date(myReferrer.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </View>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            </View>
          </View>
        )}

        {/* Statistiques */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📊 Mes statistiques</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalReferred}</Text>
              <Text style={styles.statLabel}>Parrainés</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.activeReferrals}</Text>
              <Text style={styles.statLabel}>Actifs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>€{stats.totalEarnings.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total gagné</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>€{stats.thisMonthEarnings.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Ce mois</Text>
            </View>
          </View>
        </View>

        {/* Conditions de rémunération */}
        <View style={styles.conditionsSection}>
          <Text style={styles.sectionTitle}>💰 Vos récompenses</Text>
          <View style={styles.conditionCard}>
            <Ionicons name="gift" size={24} color="#FF4444" />
            <View style={styles.conditionContent}>
              <Text style={styles.conditionTitle}>Bonus de parrainage</Text>
              <Text style={styles.conditionDesc}>{stats.bonusAmount} € à la première commande</Text>
            </View>
          </View>
          <View style={styles.conditionCard}>
            <Ionicons name="trending-up" size={24} color="#4CAF50" />
            <View style={styles.conditionContent}>
              <Text style={styles.conditionTitle}>Commission sur filleul Client</Text>
              <Text style={styles.conditionDesc}>{stats.clientCommissionRate}% sur chaque commande</Text>
            </View>
          </View>
          <View style={styles.conditionCard}>
            <Ionicons name="star" size={24} color="#9C27B0" />
            <View style={styles.conditionContent}>
              <Text style={styles.conditionTitle}>Commission sur filleul Fourmiz</Text>
              <Text style={styles.conditionDesc}>{stats.fourmizCommissionRate}% sur chaque service</Text>
            </View>
          </View>
        </View>

        {/* ✅ SECTION PRINCIPALE : Historique des filleuls avec VRAIS PRÉNOMS */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>📜 Mes filleuls ({referralHistory.length})</Text>
          {referralHistory.length > 0 ? (
            referralHistory.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyUser}>
                    <Ionicons 
                      name="person" 
                      size={20} 
                      color={item.status === 'active' ? '#4CAF50' : '#666'} 
                    />
                    <View style={styles.historyUserInfo}>
                      <Text style={styles.historyUserName}>{item.referred_user_name}</Text>
                      <Text style={styles.historyUserCode}>
                        {item.referred_user_email && `${item.referred_user_email} • `}
                        Code: {item.code_utilise}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'active' ? '#E8F5E8' : '#F5F5F5' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: item.status === 'active' ? '#4CAF50' : '#666' }
                    ]}>
                      {item.status === 'active' ? 'Actif' : 'En attente'}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyFooter}>
                  <Text style={styles.historyType}>👤 Client</Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                {/* Affichage des gains */}
                {(item.bonus_earned > 0 || item.commission_earned > 0) && (
                  <View style={styles.historyEarnings}>
                    <Text style={styles.historyEarningsText}>
                      💰 Bonus: €{item.bonus_earned.toFixed(2)}
                      {item.commission_earned > 0 && ` • Commission: €${item.commission_earned.toFixed(2)}`}
                    </Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>Aucun filleul pour le moment</Text>
              <Text style={styles.emptyDesc}>
                Partagez votre code {referralCode} pour commencer à parrainer !
              </Text>
            </View>
          )}
        </View>

        {/* Comment ça marche */}
        <View style={styles.howToSection}>
          <Text style={styles.sectionTitle}>❓ Comment ça marche ?</Text>
          <View style={styles.howToSteps}>
            <View style={styles.howToStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Partagez votre code {referralCode}</Text>
            </View>
            <View style={styles.howToStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Votre ami s'inscrit avec votre code</Text>
            </View>
            <View style={styles.howToStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Il apparaît dans votre liste de filleuls</Text>
            </View>
            <View style={styles.howToStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>Vous gagnez des récompenses sur ses commandes</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
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
  },

  // DEBUG
  debugSection: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },

  // Code de parrainage
  referralCodeSection: {
    marginBottom: 24,
  },
  referralCodeCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  referralCodeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  referralCodeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    marginRight: 12,
  },
  copyButton: {
    padding: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4444',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginTop: 8,
  },
  regenerateButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },

  // Section Mon Parrain
  referrerSection: {
    marginBottom: 24,
  },
  referrerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  referrerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  referrerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  referrerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  referrerCode: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 2,
  },
  referrerDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },

  // Statistiques
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF4444',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Conditions
  conditionsSection: {
    marginBottom: 24,
  },
  conditionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  conditionContent: {
    marginLeft: 12,
    flex: 1,
  },
  conditionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  conditionDesc: {
    fontSize: 14,
    color: '#6b7280',
  },

  // Historique
  historySection: {
    marginBottom: 24,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyUserInfo: {
    marginLeft: 8,
    flex: 1,
  },
  historyUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  historyUserCode: {
    fontSize: 12,
    color: '#FF4444',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  historyDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  historyEarnings: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  historyEarningsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },

  // Comment faire
  howToSection: {
    marginBottom: 24,
  },
  howToSteps: {
    gap: 12,
  },
  howToStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },

  // État vide
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});
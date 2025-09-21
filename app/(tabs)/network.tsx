// app/(tabs)/network.tsx - VERSION ÉPURÉE COHÉRENTE AVEC SERVICES
// ✅ Utilise ReferralService.getUserReferrals() corrigé
// ✅ Garde toutes les fonctionnalités existantes
// ✅ Récupère enfin les vrais noms des filleuls
// 🎨 STYLE ÉPURÉ : Cohérent avec le design services.tsx et messages.tsx
// ❌ HEADER LOGO SUPPRIMÉ
// 🔧 MODIFIÉ : Email des filleuls supprimé de l'affichage
// 🆕 CORRIGÉ : Affichage correct des rôles fourmiz/client
// 🔍 DEBUG AJOUTÉ : Pour diagnostiquer le problème T19
// 🆕 AJOUTÉ : Pourcentage des commissions par filleul

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
import { ReferralService } from '@/lib/referralService';
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
        loadReferralHistoryWithReferralService(user.id)
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
      console.log('🔍 Récupération code depuis user_referrals...');
      
      const { data: existingReferral } = await supabase
        .from('user_referrals')
        .select('referral_code')
        .eq('referrer_user_id', userId)
        .limit(1)
        .single();

      if (existingReferral?.referral_code) {
        setReferralCode(existingReferral.referral_code);
        console.log('✅ Code existant récupéré:', existingReferral.referral_code);
      } else {
        const code = generateCodeFromUserId(userId);
        setReferralCode(code);
        console.log('✅ Nouveau code généré:', code);
      }
    } catch (error) {
      console.error('❌ Erreur code:', error);
      const fallbackCode = generateCodeFromUserId(userId);
      setReferralCode(fallbackCode);
    }
  };

  const generateCodeFromUserId = (userId: string): string => {
    const cleanId = userId.replace(/-/g, '');
    const code = (cleanId.substring(0, 3) + cleanId.substring(cleanId.length - 3)).toUpperCase();
    return code;
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
      console.log('📊 Stats depuis table user_referrals...');
      
      const { data: referrals, error: referralError } = await supabase
        .from('user_referrals')
        .select('status, bonus_earned, total_commission_earned')
        .eq('referrer_user_id', userId);

      let totalReferrals = 0;
      let successfulReferrals = 0;
      let totalEarnings = 0;

      if (!referralError && referrals) {
        totalReferrals = referrals.length;
        successfulReferrals = referrals.filter(r => r.status === 'active' || r.status === 'completed').length;
        totalEarnings = referrals.reduce((sum, r) => 
          sum + (Number(r.bonus_earned) || 0) + (Number(r.total_commission_earned) || 0), 0
        );
      }

      setStats(prev => ({
        ...prev,
        totalReferred: totalReferrals,
        activeReferrals: successfulReferrals,
        totalEarnings,
        thisMonthEarnings: totalEarnings,
      }));

      console.log('✅ Stats corrigées:', { totalReferrals, successfulReferrals, totalEarnings });
    } catch (error) {
      console.error('❌ Erreur stats:', error);
    }
  };

  const loadReferralHistoryWithReferralService = async (userId: string) => {
    try {
      console.log('🔧 === CHARGEMENT FILLEULS AVEC REFERRALSERVICE ===');
      console.log('🔧 ID utilisateur:', userId);

      const filleulsData = await ReferralService.getUserReferrals(userId);
      
      console.log('🔧 RÉSULTAT REFERRALSERVICE:', {
        nombreFilleuls: filleulsData.length,
        filleulsAvecNoms: filleulsData.filter(f => f.referred_user?.profiles?.firstname).length,
        premierFilleul: filleulsData[0]
      });

      const history: ReferralHistory[] = await Promise.all(filleulsData.map(async (referral) => {
        const profile = referral.referred_user?.profiles;
        
        let displayName = 'Utilisateur';
        let email = referral.referred_user?.email || '';
        
        if (profile?.firstname && profile?.lastname) {
          displayName = `${profile?.firstname.trim()} ${profile?.lastname.trim()}`;
        } else if (profile?.firstname) {
          displayName = profile?.firstname.trim();
        } else if (profile?.lastname) {
          displayName = profile?.lastname.trim();
        } else if (email) {
          displayName = email.split('@')[0];
        } else {
          const idStr = referral.referred_user?.id?.toString() || '';
          displayName = `Utilisateur ${idStr.slice(-4)}`;
        }
        
        // 🆕 SOLUTION : REQUÊTE DIRECTE POUR RÉCUPÉRER LES RÔLES
        let roles: string[] = [];
        if (referral.referred_user?.id) {
          try {
            const { data: fullProfile, error: profileError } = await supabase
              .from('profiles')
              .select('roles')
              .eq('id', referral.referred_user.id)
              .single();
            
            if (!profileError && fullProfile?.roles) {
              roles = fullProfile.roles;
              console.log(`🔧 RÔLES RÉCUPÉRÉS pour ${displayName}:`, roles);
            } else {
              console.log(`⚠️ Erreur récupération rôles pour ${displayName}:`, profileError);
            }
          } catch (roleError) {
            console.error(`❌ Erreur requête rôles pour ${displayName}:`, roleError);
          }
        }
        
        const referred_user_type = roles.includes('fourmiz') ? 'fourmiz' : 'client';
        
        // 🔍 DEBUG DÉTAILLÉ POUR CHAQUE FILLEUL
        console.log(`🔧 DEBUG FILLEUL ${displayName}:`, {
          user_id: referral.referred_user?.id,
          profile_exist: !!profile,
          profile_complet: profile,
          roles_depuis_referral: profile?.roles,
          roles_depuis_requete_directe: roles,
          roles_type: typeof roles,
          roles_array: Array.isArray(roles),
          roles_length: roles?.length,
          includes_fourmiz: roles?.includes('fourmiz'),
          type_final: referred_user_type,
          referral_complet: referral
        });
        
        // 🔍 SPÉCIAL T19 - DEBUG ULTRA DÉTAILLÉ
        if (displayName.includes('T19') || profile?.firstname === 'T19') {
          console.log('🚨 === DEBUG SPÉCIAL T19 ===');
          console.log('🚨 T19 - Données complètes:', JSON.stringify(referral, null, 2));
          console.log('🚨 T19 - Profile:', JSON.stringify(profile, null, 2));
          console.log('🚨 T19 - Rôles depuis ReferralService:', profile?.roles);
          console.log('🚨 T19 - Rôles depuis requête directe:', roles);
          console.log('🚨 T19 - Type final:', referred_user_type);
          console.log('🚨 === FIN DEBUG T19 ===');
        }
        
        console.log(`✅ Filleul traité: ${displayName} (${email}) - Type: ${referred_user_type} - Rôles: ${JSON.stringify(roles)}`);
        
        return {
          id: referral.id?.toString() || '',
          referred_user_name: displayName,
          referred_user_email: email,
          referred_user_type, // 🆕 CORRIGÉ : Utilisation du vrai type depuis requête directe
          bonus_earned: Number(referral.bonus_earned) || 0,
          commission_earned: Number(referral.total_commission_earned) || 0,
          status: (referral.status === 'active' || referral.status === 'completed') ? 'active' : 'pending',
          created_at: referral.created_at || new Date().toISOString(),
          code_utilise: referral.referral_code || generateCodeFromUserId(referral.referred_user?.id || ''),
          first_order_completed: referral.first_order_completed || false,
        };
      }));
      
      setReferralHistory(history);
      
      const realNames = history.filter(h => !h.referred_user_name.startsWith('Utilisateur'));
      console.log('📋 RAPPORT FINAL REFERRALSERVICE:', {
        total_referrals: history.length,
        noms_récupérés: realNames.length,
        taux_succès: `${Math.round(realNames.length / history.length * 100)}%`,
        noms: history.map(h => h.referred_user_name),
        types: history.map(h => ({ nom: h.referred_user_name, type: h.referred_user_type }))
      });
      
    } catch (error) {
      console.error('❌ ERREUR REFERRALSERVICE:', error);
      setReferralHistory([]);
    }
  };

  const loadMyReferrer = async (userId: string) => {
    try {
      console.log('🔍 Recherche parrain...');
      
      const { data: referrerData, error } = await supabase
        .from('user_referrals')
        .select('id, referrer_user_id, referral_code, created_at, referrer_name')
        .eq('referred_user_id', userId)
        .single();

      if (!error && referrerData) {
        let parrainName = referrerData.referrer_name || 'Utilisateur';
        
        if (!referrerData.referrer_name || referrerData.referrer_name === 'Utilisateur') {
          const { data: parrainProfile } = await supabase
            .from('profiles')
            .select('firstname, lastname, email')
            .eq('id', referrerData.referrer_user_id)
            .single();
          
          if (parrainProfile) {
            const firstName = parrainProfile.firstname?.trim();
            const lastName = parrainProfile.lastname?.trim();
            
            if (firstName && lastName) {
              parrainName = firstName + ' ' + lastName;
            } else if (firstName) {
              parrainName = firstName;
            } else if (parrainProfile?.email) {
              parrainName = parrainProfile?.email.split('@')[0];
            }
          }
        }
        
        setMyReferrer({
          id: referrerData.id.toString(),
          parrain_name: parrainName,
          code_utilise: referrerData.referral_code || generateCodeFromUserId(referrerData.referrer_user_id),
          created_at: referrerData.created_at 
        });
        
        console.log('✅ Parrain trouvé:', parrainName);
      } else {
        console.log('⚠️ Aucun parrain trouvé');
      }
    } catch (error) {
      console.error('❌ Erreur recherche parrain:', error);
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
      console.error('❌ Erreur chargement paramètres:', error);
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
      const message = `🐜 Rejoignez Fourmiz avec mon code de parrainage : ${referralCode}\n\n✨ Obtenez des services de qualité et gagnez des récompenses !`;
      
      await Share.share({
        message,
        title: 'Rejoignez Fourmiz !',
      });
    } catch (error) {
      console.error('❌ Erreur partage:', error);
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
            Alert.alert('🔄 Nouveau code !', `Votre nouveau code : ${newCode}`);
          }
        }
      ]
    );
  };

  // 🆕 CALCUL DU TOTAL DES COMMISSIONS DE TOUS LES FILLEULS
  const getTotalCommissions = () => {
    return referralHistory.reduce((total, filleul) => total + filleul.commission_earned, 0);
  };

  // 🆕 CALCUL DU POURCENTAGE POUR UN FILLEUL
  const getCommissionPercentage = (filleulCommission: number) => {
    const totalCommissions = getTotalCommissions();
    if (totalCommissions === 0) return 0;
    return (filleulCommission / totalCommissions) * 100;
  };

  // 🆕 NOUVELLE FONCTION : Récupération icône selon le type
  const getTypeIcon = (type: 'client' | 'fourmiz') => {
    return type === 'fourmiz' ? 'construct-outline' : 'person-outline';
  };

  // 🆕 NOUVELLE FONCTION : Récupération couleur selon le type
  const getTypeColor = (type: 'client' | 'fourmiz') => {
    return type === 'fourmiz' ? '#2563eb' : '#16a34a';
  };

  // 🆕 NOUVELLE FONCTION : Texte affiché selon le type
  const getTypeDisplayText = (type: 'client' | 'fourmiz') => {
    return type === 'fourmiz' ? 'Fourmiz' : 'Client';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement de votre réseau...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
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
      >
        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>
            Mon Réseau
          </Text>
          <Text style={styles.introSubtitle}>
            Parrainez et gagnez des récompenses
          </Text>
        </View>

        {/* Code de parrainage */}
        <View style={styles.referralCodeSection}>
          <View style={styles.referralCodeCard}>
            <View style={styles.referralCodeHeader}>
              <Ionicons name="qr-code-outline" size={20} color="#000000" />
              <Text style={styles.referralCodeTitle}>Votre code de parrainage</Text>
            </View>
            
            <View style={styles.codeContainer}>
              <Text style={styles.referralCodeText}>{referralCode}</Text>
              <TouchableOpacity onPress={copyReferralCode} style={styles.copyButton}>
                <Ionicons name="copy-outline" size={16} color="#666666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.codeActions}>
              <TouchableOpacity onPress={shareReferralCode} style={styles.shareButton}>
                <Ionicons name="share-outline" size={16} color="#000000" />
                <Text style={styles.shareButtonText}>Partager</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={regenerateReferralCode} style={styles.regenerateButton}>
                <Ionicons name="refresh-outline" size={16} color="#666666" />
                <Text style={styles.regenerateButtonText}>Régénérer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Mon Parrain */}
        {myReferrer && (
          <View style={styles.referrerSection}>
            <Text style={styles.sectionTitle}>Mon Parrain</Text>
            <View style={styles.referrerCard}>
              <View style={styles.referrerInfo}>
                <Ionicons name="person-circle-outline" size={20} color="#000000" />
                <View style={styles.referrerDetails}>
                  <Text style={styles.referrerName}>{myReferrer.parrain_name}</Text>
                  <Text style={styles.referrerCode}>Code utilisé : {myReferrer.code_utilise}</Text>
                  <Text style={styles.referrerDate}>
                    Parrainé le {new Date(myReferrer.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </View>
              <Ionicons name="checkmark-circle-outline" size={20} color="#000000" />
            </View>
          </View>
        )}

        {/* Statistiques */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Mes statistiques</Text>
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

        {/* Récompenses */}
        <View style={styles.conditionsSection}>
          <Text style={styles.sectionTitle}>Vos récompenses</Text>
          
          <View style={styles.conditionCard}>
            <Ionicons name="gift-outline" size={20} color="#000000" />
            <View style={styles.conditionContent}>
              <Text style={styles.conditionTitle}>Bonus de parrainage</Text>
              <Text style={styles.conditionDesc}>{stats.bonusAmount} € à la première commande</Text>
            </View>
          </View>
          
          <View style={styles.conditionCard}>
            <Ionicons name="trending-up-outline" size={20} color="#000000" />
            <View style={styles.conditionContent}>
              <Text style={styles.conditionTitle}>Commission sur filleul Client</Text>
              <Text style={styles.conditionDesc}>{stats.clientCommissionRate}% sur chaque commande</Text>
            </View>
          </View>
          
          <View style={styles.conditionCard}>
            <Ionicons name="star-outline" size={20} color="#000000" />
            <View style={styles.conditionContent}>
              <Text style={styles.conditionTitle}>Commission sur filleul Fourmiz</Text>
              <Text style={styles.conditionDesc}>{stats.fourmizCommissionRate}% sur chaque service</Text>
            </View>
          </View>
        </View>

        {/* Liste des filleuls */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Mes filleuls ({referralHistory.length})</Text>
          {referralHistory.length > 0 ? (
            referralHistory.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyUser}>
                    <Ionicons 
                      name={getTypeIcon(item.referred_user_type)} // 🆕 CORRIGÉ : Icône selon le type
                      size={20} 
                      color={item.status === 'active' ? getTypeColor(item.referred_user_type) : '#666666'} // 🆕 CORRIGÉ : Couleur selon le type
                    />
                    <View style={styles.historyUserInfo}>
                      <Text style={styles.historyUserName}>{item.referred_user_name}</Text>
                      <Text style={styles.historyUserCode}>
                        Code: {item.code_utilise}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'active' ? '#f8f8f8' : '#f8f8f8' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: item.status === 'active' ? '#000000' : '#666666' }
                    ]}>
                      {item.status === 'active' ? 'Actif' : 'En attente'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.historyFooter}>
                  <Text style={[
                    styles.historyType,
                    { color: getTypeColor(item.referred_user_type) } // 🆕 CORRIGÉ : Couleur selon le type
                  ]}>
                    {getTypeDisplayText(item.referred_user_type)} {/* 🆕 CORRIGÉ : Texte selon le type */}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                
                {(item.bonus_earned > 0 || item.commission_earned > 0) && (
                  <View style={styles.historyEarnings}>
                    <Text style={styles.historyEarningsText}>
                      Bonus: €{item.bonus_earned.toFixed(2)}
                      {item.commission_earned > 0 && ` • Commission: €${item.commission_earned.toFixed(2)}`}
                    </Text>
                    {/* 🆕 AJOUT DU POURCENTAGE DES COMMISSIONS */}
                    {item.commission_earned > 0 && getTotalCommissions() > 0 && (
                      <Text style={styles.commissionPercentageText}>
                        {getCommissionPercentage(item.commission_earned).toFixed(1)}% des commissions totales
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#cccccc" />
              <Text style={styles.emptyTitle}>Aucun filleul pour le moment</Text>
              <Text style={styles.emptyDesc}>
                Partagez votre code {referralCode} pour commencer à parrainer !
              </Text>
            </View>
          )}
        </View>

        {/* Comment ça marche */}
        <View style={styles.howToSection}>
          <Text style={styles.sectionTitle}>Comment ça marche ?</Text>
          
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

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// 🎨 STYLES ÉPURÉS COHÉRENTS AVEC SERVICES.TSX ET MESSAGES.TSX
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
  loadingText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },

  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },

  // Introduction épurée
  introSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },

  // Code de parrainage épuré
  referralCodeSection: {
    marginBottom: 24,
  },
  referralCodeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
  },
  referralCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  referralCodeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  referralCodeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 2,
    flex: 1,
  },
  copyButton: {
    padding: 4,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  regenerateButtonText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666666',
  },

  // Parrain épuré
  referrerSection: {
    marginBottom: 24,
  },
  referrerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  referrerCode: {
    fontSize: 12,
    color: '#333333',
    marginTop: 2,
    fontWeight: '400',
  },
  referrerDate: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
    fontWeight: '400',
  },

  // Sections
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },

  // Stats épurées
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },

  // Conditions épurées
  conditionsSection: {
    marginBottom: 24,
  },
  conditionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  conditionContent: {
    marginLeft: 12,
    flex: 1,
  },
  conditionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  conditionDesc: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },

  // Historique épuré
  historySection: {
    marginBottom: 24,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  historyUserCode: {
    fontSize: 12,
    color: '#333333',
    marginTop: 2,
    fontWeight: '400',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '400',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyType: {
    fontSize: 13,
    fontWeight: '600', // 🆕 MODIFIÉ : Plus visible
  },
  historyDate: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '400',
  },
  historyEarnings: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  historyEarningsText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#333333',
  },
  // 🆕 STYLE POUR LE POURCENTAGE DES COMMISSIONS
  commissionPercentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 4,
  },

  // Comment ça marche épuré
  howToSection: {
    marginBottom: 24,
  },
  howToStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },

  // État vide épuré
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },

  bottomSpacer: {
    height: 32,
  },
});
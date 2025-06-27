import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Clipboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  ArrowLeft, 
  Users, 
  Gift, 
  Share2, 
  Copy, 
  TrendingUp, 
  Euro,
  UserPlus,
  Crown,
  Star,
  Target,
  Calendar,
  ChartBar as BarChart3,
  ChartPie as PieChart,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Mock data pour les statistiques de parrainage
const mockReferralStats = {
  totalReferrals: 12,
  activeReferrals: 8,
  totalEarnings: 156.50,
  monthlyEarnings: 42.75,
  pendingEarnings: 18.50,
  referralCode: 'JEAN2024',
  commissionRate: {
    direct: 80, // 80% sur les ventes directes
    level1: 2.5, // 2.5% sur les filleuls
    level2: 2.5, // 2.5% sur les petits-filleuls
  },
  bonusPerReferral: 3, // 3€ par parrainage
};

// Mock data pour l'historique des commissions mensuelles
const mockMonthlyCommissions = [
  { month: 'Déc 2024', directEarnings: 89.25, referralEarnings: 31.75, bonusEarnings: 36.00, total: 157.00 },
  { month: 'Nov 2024', directEarnings: 76.40, referralEarnings: 28.50, bonusEarnings: 12.00, total: 116.90 },
  { month: 'Oct 2024', directEarnings: 92.80, referralEarnings: 25.20, bonusEarnings: 9.00, total: 127.00 },
  { month: 'Sep 2024', directEarnings: 65.60, referralEarnings: 18.75, bonusEarnings: 6.00, total: 90.35 },
  { month: 'Août 2024', directEarnings: 82.40, referralEarnings: 22.30, bonusEarnings: 15.00, total: 119.70 },
  { month: 'Juil 2024', directEarnings: 101.20, referralEarnings: 33.80, bonusEarnings: 9.00, total: 144.00 },
  { month: 'Juin 2024', directEarnings: 78.60, referralEarnings: 26.40, bonusEarnings: 3.00, total: 108.00 },
  { month: 'Mai 2024', directEarnings: 68.80, referralEarnings: 19.50, bonusEarnings: 6.00, total: 94.30 },
  { month: 'Avr 2024', directEarnings: 72.40, referralEarnings: 21.60, bonusEarnings: 9.00, total: 103.00 },
  { month: 'Mar 2024', directEarnings: 85.20, referralEarnings: 24.80, bonusEarnings: 12.00, total: 122.00 },
  { month: 'Fév 2024', directEarnings: 62.40, referralEarnings: 16.90, bonusEarnings: 3.00, total: 82.30 },
  { month: 'Jan 2024', directEarnings: 58.80, referralEarnings: 15.20, bonusEarnings: 6.00, total: 80.00 },
];

// Mock data pour l'historique annuel
const mockYearlyCommissions = [
  { year: '2024', totalEarnings: 1344.55, referrals: 12 },
  { year: '2023', totalEarnings: 986.20, referrals: 8 },
  { year: '2022', totalEarnings: 542.75, referrals: 5 },
];

const mockReferralTree = [
  {
    id: '1',
    name: 'Marie D.',
    joinDate: '2024-01-15',
    level: 1,
    earnings: 45.20,
    status: 'active',
    totalOrders: 23,
    subReferrals: [
      {
        id: '1-1',
        name: 'Thomas L.',
        joinDate: '2024-02-01',
        level: 2,
        earnings: 12.30,
        status: 'active',
        totalOrders: 8,
      },
      {
        id: '1-2',
        name: 'Sophie M.',
        joinDate: '2024-02-10',
        level: 2,
        earnings: 8.75,
        status: 'active',
        totalOrders: 5,
      }
    ]
  },
  {
    id: '2',
    name: 'Lucas P.',
    joinDate: '2024-01-20',
    level: 1,
    earnings: 38.90,
    status: 'active',
    totalOrders: 19,
    subReferrals: []
  },
  {
    id: '3',
    name: 'Emma R.',
    joinDate: '2024-02-05',
    level: 1,
    earnings: 25.60,
    status: 'inactive',
    totalOrders: 12,
    subReferrals: [
      {
        id: '3-1',
        name: 'Paul K.',
        joinDate: '2024-02-15',
        level: 2,
        earnings: 6.40,
        status: 'active',
        totalOrders: 3,
      }
    ]
  }
];

export default function ReferralScreen() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tree' | 'share' | 'history'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // Index du mois actuel dans mockMonthlyCommissions

  const handleShare = async () => {
    const shareMessage = `🐜 Rejoins Fourmiz avec mon code de parrainage ${mockReferralStats.referralCode} !

Gagne de l'argent en rendant service dans ta ville :
• 80% de commission sur tes ventes
• Services variés : courses, bricolage, garde d'animaux...
• Paiements sécurisés et rapides

Télécharge l'app Fourmiz et utilise mon code : ${mockReferralStats.referralCode}

https://fourmiz.app/register?ref=${mockReferralStats.referralCode}`;

    try {
      await Share.share({
        message: shareMessage,
        title: 'Rejoins Fourmiz !',
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager le lien');
    }
  };

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(mockReferralStats.referralCode);
      Alert.alert('Copié !', 'Code de parrainage copié dans le presse-papier');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de copier le code');
    }
  };

  const handleCopyLink = async () => {
    const referralLink = `https://fourmiz.app/register?ref=${mockReferralStats.referralCode}`;
    try {
      await Clipboard.setStringAsync(referralLink);
      Alert.alert('Copié !', 'Lien de parrainage copié dans le presse-papier');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de copier le lien');
    }
  };

  const handleDownloadHistory = () => {
    Alert.alert(
      'Téléchargement',
      'L\'historique de vos commissions sera téléchargé au format CSV. Cette fonctionnalité sera disponible dans la version mobile de l\'application.',
      [{ text: 'OK' }]
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedMonth < mockMonthlyCommissions.length - 1) {
      setSelectedMonth(selectedMonth + 1);
    } else if (direction === 'next' && selectedMonth > 0) {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Hero Section */}
      <LinearGradient
        colors={['#FF4444', '#FF6B6B']}
        style={styles.heroCard}
      >
        <View style={styles.heroContent}>
          <Crown size={32} color="#FFFFFF" />
          <Text style={styles.heroTitle}>Fourmiz Friends</Text>
          <Text style={styles.heroSubtitle}>
            Transformez votre réseau en revenus !
          </Text>
        </View>
      </LinearGradient>

      {/* Commission Rates */}
      <View style={styles.commissionSection}>
        <Text style={styles.sectionTitle}>Vos commissions</Text>
        <View style={styles.commissionGrid}>
          <View style={styles.commissionCard}>
            <View style={styles.commissionIcon}>
              <TrendingUp size={24} color="#4CAF50" />
            </View>
            <Text style={styles.commissionRate}>80%</Text>
            <Text style={styles.commissionLabel}>Sur vos ventes</Text>
          </View>
          
          <View style={styles.commissionCard}>
            <View style={styles.commissionIcon}>
              <Users size={24} color="#2196F3" />
            </View>
            <Text style={styles.commissionRate}>2,5%</Text>
            <Text style={styles.commissionLabel}>Filleuls (F-1)</Text>
          </View>
          
          <View style={styles.commissionCard}>
            <View style={styles.commissionIcon}>
              <Target size={24} color="#FF9800" />
            </View>
            <Text style={styles.commissionRate}>2,5%</Text>
            <Text style={styles.commissionLabel}>Petits-filleuls (F-2)</Text>
          </View>
        </View>
        
        <View style={styles.bonusCard}>
          <Gift size={24} color="#FF4444" />
          <View style={styles.bonusContent}>
            <Text style={styles.bonusAmount}>3€</Text>
            <Text style={styles.bonusLabel}>par nouveau filleul</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Vos statistiques</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{mockReferralStats.totalReferrals}</Text>
            <Text style={styles.statLabel}>Filleuls totaux</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{mockReferralStats.activeReferrals}</Text>
            <Text style={styles.statLabel}>Filleuls actifs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{mockReferralStats.totalEarnings.toFixed(2)}€</Text>
            <Text style={styles.statLabel}>Gains totaux</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{mockReferralStats.monthlyEarnings.toFixed(2)}€</Text>
            <Text style={styles.statLabel}>Ce mois-ci</Text>
          </View>
        </View>
      </View>

      {/* Monthly Commission Summary */}
      <View style={styles.monthlyCommissionSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Commissions du mois</Text>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => setActiveTab('history')}
          >
            <Text style={styles.viewAllText}>Historique</Text>
            <BarChart3 size={16} color="#FF4444" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.commissionSummaryCard}>
          <View style={styles.commissionSummaryHeader}>
            <Text style={styles.commissionSummaryTitle}>
              {mockMonthlyCommissions[0].month}
            </Text>
            <Text style={styles.commissionSummaryTotal}>
              {mockMonthlyCommissions[0].total.toFixed(2)}€
            </Text>
          </View>
          
          <View style={styles.commissionBreakdown}>
            <View style={styles.commissionItem}>
              <View style={styles.commissionItemDot} />
              <Text style={styles.commissionItemLabel}>Commissions directes</Text>
              <Text style={styles.commissionItemValue}>
                {mockMonthlyCommissions[0].directEarnings.toFixed(2)}€
              </Text>
            </View>
            
            <View style={styles.commissionItem}>
              <View style={[styles.commissionItemDot, styles.referralDot]} />
              <Text style={styles.commissionItemLabel}>Commissions filleuls</Text>
              <Text style={styles.commissionItemValue}>
                {mockMonthlyCommissions[0].referralEarnings.toFixed(2)}€
              </Text>
            </View>
            
            <View style={styles.commissionItem}>
              <View style={[styles.commissionItemDot, styles.bonusDot]} />
              <Text style={styles.commissionItemLabel}>Bonus parrainage</Text>
              <Text style={styles.commissionItemValue}>
                {mockMonthlyCommissions[0].bonusEarnings.toFixed(2)}€
              </Text>
            </View>
          </View>
          
          <View style={styles.commissionChart}>
            <View style={styles.chartBar}>
              <View 
                style={[
                  styles.chartSegment, 
                  { 
                    width: `${(mockMonthlyCommissions[0].directEarnings / mockMonthlyCommissions[0].total) * 100}%`,
                    backgroundColor: '#4CAF50' 
                  }
                ]} 
              />
              <View 
                style={[
                  styles.chartSegment, 
                  { 
                    width: `${(mockMonthlyCommissions[0].referralEarnings / mockMonthlyCommissions[0].total) * 100}%`,
                    backgroundColor: '#2196F3' 
                  }
                ]} 
              />
              <View 
                style={[
                  styles.chartSegment, 
                  { 
                    width: `${(mockMonthlyCommissions[0].bonusEarnings / mockMonthlyCommissions[0].total) * 100}%`,
                    backgroundColor: '#FF9800' 
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      </View>

      {/* Earnings Breakdown */}
      <View style={styles.earningsSection}>
        <Text style={styles.sectionTitle}>Détail des gains</Text>
        <View style={styles.earningsCard}>
          <View style={styles.earningRow}>
            <View style={styles.earningInfo}>
              <Text style={styles.earningLabel}>Commissions directes (80%)</Text>
              <Text style={styles.earningDescription}>Vos propres services</Text>
            </View>
            <Text style={styles.earningAmount}>89.25€</Text>
          </View>
          
          <View style={styles.earningRow}>
            <View style={styles.earningInfo}>
              <Text style={styles.earningLabel}>Commissions F-1 (2,5%)</Text>
              <Text style={styles.earningDescription}>8 filleuls actifs</Text>
            </View>
            <Text style={styles.earningAmount}>31.75€</Text>
          </View>
          
          <View style={styles.earningRow}>
            <View style={styles.earningInfo}>
              <Text style={styles.earningLabel}>Commissions F-2 (2,5%)</Text>
              <Text style={styles.earningDescription}>3 petits-filleuls</Text>
            </View>
            <Text style={styles.earningAmount}>8.50€</Text>
          </View>
          
          <View style={styles.earningRow}>
            <View style={styles.earningInfo}>
              <Text style={styles.earningLabel}>Bonus parrainage</Text>
              <Text style={styles.earningDescription}>12 × 3€</Text>
            </View>
            <Text style={styles.earningAmount}>36.00€</Text>
          </View>
          
          <View style={[styles.earningRow, styles.totalRow]}>
            <View style={styles.earningInfo}>
              <Text style={styles.totalLabel}>Total</Text>
            </View>
            <Text style={styles.totalAmount}>{mockReferralStats.totalEarnings.toFixed(2)}€</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderReferralTree = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Votre réseau</Text>
      
      {mockReferralTree.map((referral) => (
        <View key={referral.id} style={styles.referralCard}>
          <View style={styles.referralHeader}>
            <View style={styles.referralInfo}>
              <View style={styles.referralAvatar}>
                <Text style={styles.referralInitial}>
                  {referral.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.referralDetails}>
                <Text style={styles.referralName}>{referral.name}</Text>
                <Text style={styles.referralDate}>
                  Rejoint le {new Date(referral.joinDate).toLocaleDateString('fr-FR')}
                </Text>
                <View style={styles.referralStats}>
                  <Text style={styles.referralStat}>
                    {referral.totalOrders} commandes
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    referral.status === 'active' ? styles.statusActive : styles.statusInactive
                  ]}>
                    <Text style={[
                      styles.statusText,
                      referral.status === 'active' ? styles.statusTextActive : styles.statusTextInactive
                    ]}>
                      {referral.status === 'active' ? 'Actif' : 'Inactif'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.referralEarnings}>
              <Text style={styles.earningAmount}>{referral.earnings.toFixed(2)}€</Text>
              <Text style={styles.earningLabel}>Gains générés</Text>
            </View>
          </View>
          
          {referral.subReferrals.length > 0 && (
            <View style={styles.subReferrals}>
              <Text style={styles.subReferralsTitle}>
                Filleuls de {referral.name.split(' ')[0]} ({referral.subReferrals.length})
              </Text>
              {referral.subReferrals.map((subRef) => (
                <View key={subRef.id} style={styles.subReferralCard}>
                  <View style={styles.subReferralInfo}>
                    <View style={styles.subReferralAvatar}>
                      <Text style={styles.subReferralInitial}>
                        {subRef.name.charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.subReferralName}>{subRef.name}</Text>
                      <Text style={styles.subReferralStat}>
                        {subRef.totalOrders} commandes
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.subReferralEarning}>
                    {subRef.earnings.toFixed(2)}€
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const renderShare = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Partagez et gagnez</Text>
      
      {/* Referral Code */}
      <View style={styles.codeSection}>
        <Text style={styles.codeLabel}>Votre code de parrainage</Text>
        <View style={styles.codeCard}>
          <Text style={styles.codeText}>{mockReferralStats.referralCode}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
            <Copy size={20} color="#FF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Share Buttons */}
      <View style={styles.shareSection}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Share2 size={24} color="#FFFFFF" />
          <Text style={styles.shareButtonText}>Partager le lien</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.copyLinkButton} onPress={handleCopyLink}>
          <Copy size={24} color="#FF4444" />
          <Text style={styles.copyLinkButtonText}>Copier le lien</Text>
        </TouchableOpacity>
      </View>

      {/* Share Message Preview */}
      <View style={styles.messagePreview}>
        <Text style={styles.messageTitle}>Aperçu du message</Text>
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>
            🐜 Rejoins Fourmiz avec mon code de parrainage {mockReferralStats.referralCode} !{'\n\n'}
            Gagne de l'argent en rendant service dans ta ville :{'\n'}
            • 80% de commission sur tes ventes{'\n'}
            • Services variés : courses, bricolage, garde d'animaux...{'\n'}
            • Paiements sécurisés et rapides{'\n\n'}
            Télécharge l'app Fourmiz et utilise mon code : {mockReferralStats.referralCode}
          </Text>
        </View>
      </View>

      {/* How it Works */}
      <View style={styles.howItWorksSection}>
        <Text style={styles.sectionTitle}>Comment ça marche ?</Text>
        
        <View style={styles.stepCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Partagez votre code</Text>
            <Text style={styles.stepDescription}>
              Envoyez votre code de parrainage à vos amis via WhatsApp, SMS, email...
            </Text>
          </View>
        </View>
        
        <View style={styles.stepCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Ils s'inscrivent</Text>
            <Text style={styles.stepDescription}>
              Vos amis s'inscrivent avec votre code et deviennent vos filleuls
            </Text>
          </View>
        </View>
        
        <View style={styles.stepCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Vous gagnez</Text>
            <Text style={styles.stepDescription}>
              3€ immédiatement + 2,5% sur toutes leurs commissions à vie !
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderHistory = () => (
    <View style={styles.tabContent}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodTab, selectedPeriod === 'month' && styles.periodTabActive]}
          onPress={() => setSelectedPeriod('month')}
        >
          <Text style={[styles.periodTabText, selectedPeriod === 'month' && styles.periodTabTextActive]}>
            Mensuel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodTab, selectedPeriod === 'year' && styles.periodTabActive]}
          onPress={() => setSelectedPeriod('year')}
        >
          <Text style={[styles.periodTabText, selectedPeriod === 'year' && styles.periodTabTextActive]}>
            Annuel
          </Text>
        </TouchableOpacity>
      </View>

      {/* Header with Download Button */}
      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>
          {selectedPeriod === 'month' ? 'Historique mensuel' : 'Historique annuel'}
        </Text>
        <TouchableOpacity 
          style={styles.downloadButton}
          onPress={handleDownloadHistory}
        >
          <Download size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>

      {selectedPeriod === 'month' ? (
        <>
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => navigateMonth('prev')}
              disabled={selectedMonth >= mockMonthlyCommissions.length - 1}
            >
              <ChevronLeft size={24} color={selectedMonth >= mockMonthlyCommissions.length - 1 ? "#CCC" : "#333"} />
            </TouchableOpacity>
            <Text style={styles.currentMonth}>
              {mockMonthlyCommissions[selectedMonth].month}
            </Text>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => navigateMonth('next')}
              disabled={selectedMonth <= 0}
            >
              <ChevronRight size={24} color={selectedMonth <= 0 ? "#CCC" : "#333"} />
            </TouchableOpacity>
          </View>

          {/* Monthly Detail */}
          <View style={styles.monthDetailCard}>
            <View style={styles.monthTotalSection}>
              <Text style={styles.monthTotalLabel}>Total des commissions</Text>
              <Text style={styles.monthTotalValue}>
                {mockMonthlyCommissions[selectedMonth].total.toFixed(2)}€
              </Text>
            </View>
            
            <View style={styles.monthBreakdown}>
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownHeader}>
                  <View style={[styles.breakdownDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.breakdownLabel}>Commissions directes (80%)</Text>
                </View>
                <Text style={styles.breakdownValue}>
                  {mockMonthlyCommissions[selectedMonth].directEarnings.toFixed(2)}€
                </Text>
              </View>
              
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownHeader}>
                  <View style={[styles.breakdownDot, { backgroundColor: '#2196F3' }]} />
                  <Text style={styles.breakdownLabel}>Commissions filleuls (2,5%)</Text>
                </View>
                <Text style={styles.breakdownValue}>
                  {mockMonthlyCommissions[selectedMonth].referralEarnings.toFixed(2)}€
                </Text>
              </View>
              
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownHeader}>
                  <View style={[styles.breakdownDot, { backgroundColor: '#FF9800' }]} />
                  <Text style={styles.breakdownLabel}>Bonus parrainage (3€/filleul)</Text>
                </View>
                <Text style={styles.breakdownValue}>
                  {mockMonthlyCommissions[selectedMonth].bonusEarnings.toFixed(2)}€
                </Text>
              </View>
            </View>
            
            <View style={styles.monthChart}>
              <PieChart size={24} color="#666" />
              <View style={styles.chartLegend}>
                <Text style={styles.chartTitle}>Répartition des commissions</Text>
                <View style={styles.chartBar}>
                  <View 
                    style={[
                      styles.chartSegment, 
                      { 
                        width: `${(mockMonthlyCommissions[selectedMonth].directEarnings / mockMonthlyCommissions[selectedMonth].total) * 100}%`,
                        backgroundColor: '#4CAF50' 
                      }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.chartSegment, 
                      { 
                        width: `${(mockMonthlyCommissions[selectedMonth].referralEarnings / mockMonthlyCommissions[selectedMonth].total) * 100}%`,
                        backgroundColor: '#2196F3' 
                      }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.chartSegment, 
                      { 
                        width: `${(mockMonthlyCommissions[selectedMonth].bonusEarnings / mockMonthlyCommissions[selectedMonth].total) * 100}%`,
                        backgroundColor: '#FF9800' 
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Monthly History */}
          <View style={styles.monthlyHistorySection}>
            <Text style={styles.sectionTitle}>Historique sur 12 mois</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.monthlyHistoryList}
            >
              {mockMonthlyCommissions.map((month, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.monthHistoryCard,
                    selectedMonth === index && styles.selectedMonthCard
                  ]}
                  onPress={() => setSelectedMonth(index)}
                >
                  <Text style={styles.monthHistoryName}>{month.month.split(' ')[0]}</Text>
                  <Text style={styles.monthHistoryTotal}>{month.total.toFixed(0)}€</Text>
                  <View style={styles.miniChartBar}>
                    <View 
                      style={[
                        styles.miniChartSegment, 
                        { 
                          width: `${(month.directEarnings / month.total) * 100}%`,
                          backgroundColor: '#4CAF50' 
                        }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.miniChartSegment, 
                        { 
                          width: `${(month.referralEarnings / month.total) * 100}%`,
                          backgroundColor: '#2196F3' 
                        }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.miniChartSegment, 
                        { 
                          width: `${(month.bonusEarnings / month.total) * 100}%`,
                          backgroundColor: '#FF9800' 
                        }
                      ]} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      ) : (
        <>
          {/* Yearly History */}
          <View style={styles.yearlyHistorySection}>
            <Text style={styles.sectionSubtitle}>
              Historique depuis la création de votre compte
            </Text>
            
            {mockYearlyCommissions.map((year, index) => (
              <View key={index} style={styles.yearCard}>
                <View style={styles.yearHeader}>
                  <Text style={styles.yearTitle}>{year.year}</Text>
                  <Text style={styles.yearTotal}>{year.totalEarnings.toFixed(2)}€</Text>
                </View>
                
                <View style={styles.yearDetails}>
                  <View style={styles.yearStat}>
                    <Users size={16} color="#666" />
                    <Text style={styles.yearStatText}>
                      {year.referrals} filleuls
                    </Text>
                  </View>
                  
                  <View style={styles.yearProgress}>
                    <View style={styles.yearProgressBar}>
                      <View 
                        style={[
                          styles.yearProgressFill,
                          { 
                            width: `${(year.totalEarnings / mockYearlyCommissions[0].totalEarnings) * 100}%` 
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.yearProgressText}>
                      {Math.round((year.totalEarnings / mockYearlyCommissions[0].totalEarnings) * 100)}% du meilleur an
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
          
          {/* Yearly Growth */}
          <View style={styles.growthSection}>
            <Text style={styles.sectionTitle}>Évolution annuelle</Text>
            
            <View style={styles.growthCard}>
              <View style={styles.growthHeader}>
                <BarChart3 size={24} color="#FF4444" />
                <Text style={styles.growthTitle}>Progression des revenus</Text>
              </View>
              
              <View style={styles.growthChart}>
                {mockYearlyCommissions.map((year, index) => (
                  <View key={index} style={styles.growthBar}>
                    <Text style={styles.growthYear}>{year.year}</Text>
                    <View style={styles.growthBarContainer}>
                      <View 
                        style={[
                          styles.growthBarFill,
                          { 
                            width: `${(year.totalEarnings / mockYearlyCommissions[0].totalEarnings) * 100}%`,
                            backgroundColor: index === 0 ? '#FF4444' : index === 1 ? '#FF9800' : '#2196F3'
                          }
                        ]}
                      />
                      <Text style={styles.growthValue}>
                        {year.totalEarnings.toFixed(0)}€
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              
              {mockYearlyCommissions.length > 1 && (
                <View style={styles.yearlyGrowth}>
                  <Text style={styles.growthLabel}>
                    Croissance {mockYearlyCommissions[0].year} vs {mockYearlyCommissions[1].year}:
                  </Text>
                  <Text style={styles.growthPercentage}>
                    +{Math.round(((mockYearlyCommissions[0].totalEarnings - mockYearlyCommissions[1].totalEarnings) / mockYearlyCommissions[1].totalEarnings) * 100)}%
                  </Text>
                </View>
              )}
            </View>
          </View>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fourmiz Friends</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <TrendingUp size={20} color={activeTab === 'overview' ? '#FF4444' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Vue d'ensemble
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tree' && styles.activeTab]}
          onPress={() => setActiveTab('tree')}
        >
          <Users size={20} color={activeTab === 'tree' ? '#FF4444' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'tree' && styles.activeTabText]}>
            Mon réseau
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Calendar size={20} color={activeTab === 'history' ? '#FF4444' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Historique
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'share' && styles.activeTab]}
          onPress={() => setActiveTab('share')}
        >
          <Share2 size={20} color={activeTab === 'share' ? '#FF4444' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'share' && styles.activeTabText]}>
            Partager
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'tree' && renderReferralTree()}
        {activeTab === 'share' && renderShare()}
        {activeTab === 'history' && renderHistory()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
    borderBottomWidth: 2,
    borderBottomColor: '#FF4444',
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  activeTabText: {
    color: '#FF4444',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  heroCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 16,
  },
  commissionSection: {
    marginBottom: 24,
  },
  commissionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  commissionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commissionIcon: {
    marginBottom: 8,
  },
  commissionRate: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 4,
  },
  commissionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  bonusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bonusContent: {
    marginLeft: 12,
  },
  bonusAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FF4444',
  },
  bonusLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  monthlyCommissionSection: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FF4444',
  },
  commissionSummaryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  commissionSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  commissionSummaryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  commissionSummaryTotal: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FF4444',
  },
  commissionBreakdown: {
    marginBottom: 16,
  },
  commissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commissionItemDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  referralDot: {
    backgroundColor: '#2196F3',
  },
  bonusDot: {
    backgroundColor: '#FF9800',
  },
  commissionItemLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  commissionItemValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  commissionChart: {
    marginTop: 8,
  },
  chartBar: {
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  chartSegment: {
    height: '100%',
  },
  earningsSection: {
    marginBottom: 24,
  },
  earningsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#FF4444',
    marginTop: 8,
    paddingTop: 16,
  },
  earningInfo: {
    flex: 1,
  },
  earningLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  earningDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  earningAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FF4444',
  },
  referralCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  referralInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  referralAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  referralInitial: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  referralDetails: {
    flex: 1,
  },
  referralName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  referralDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 8,
  },
  referralStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referralStat: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#E8F5E8',
  },
  statusInactive: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
  statusTextActive: {
    color: '#4CAF50',
  },
  statusTextInactive: {
    color: '#FF9800',
  },
  referralEarnings: {
    alignItems: 'flex-end',
  },
  subReferrals: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  subReferralsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  subReferralCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  subReferralInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subReferralAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  subReferralInitial: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  subReferralName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  subReferralStat: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  subReferralEarning: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
  },
  codeSection: {
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  codeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FF4444',
  },
  copyButton: {
    padding: 8,
  },
  shareSection: {
    marginBottom: 24,
    gap: 12,
  },
  shareButton: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  copyLinkButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  copyLinkButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FF4444',
  },
  messagePreview: {
    marginBottom: 24,
  },
  messageTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
    lineHeight: 20,
  },
  howItWorksSection: {
    marginBottom: 24,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
  },
  // Styles pour l'onglet Historique
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodTabActive: {
    backgroundColor: '#FF4444',
  },
  periodTabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  periodTabTextActive: {
    color: '#FFFFFF',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  downloadButton: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButton: {
    padding: 8,
  },
  currentMonth: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  monthDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthTotalSection: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  monthTotalLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
    marginBottom: 4,
  },
  monthTotalValue: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FF4444',
  },
  monthBreakdown: {
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  breakdownValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  monthChart: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  chartLegend: {
    flex: 1,
    marginLeft: 12,
  },
  chartTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
    marginBottom: 8,
  },
  monthlyHistorySection: {
    marginBottom: 24,
  },
  monthlyHistoryList: {
    paddingRight: 20,
    gap: 12,
  },
  monthHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedMonthCard: {
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  monthHistoryName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
    marginBottom: 8,
  },
  monthHistoryTotal: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 8,
  },
  miniChartBar: {
    width: 60,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  miniChartSegment: {
    height: '100%',
  },
  yearlyHistorySection: {
    marginBottom: 24,
  },
  yearCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  yearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  yearTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  yearTotal: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FF4444',
  },
  yearDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yearStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  yearStatText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  yearProgress: {
    flex: 1,
    marginLeft: 16,
  },
  yearProgressBar: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    marginBottom: 4,
  },
  yearProgressFill: {
    height: '100%',
    backgroundColor: '#FF4444',
    borderRadius: 3,
  },
  yearProgressText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'right',
  },
  growthSection: {
    marginBottom: 24,
  },
  growthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  growthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  growthTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginLeft: 12,
  },
  growthChart: {
    marginBottom: 16,
  },
  growthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  growthYear: {
    width: 50,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  growthBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    position: 'relative',
  },
  growthBarFill: {
    height: '100%',
    borderRadius: 12,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  growthValue: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  yearlyGrowth: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  growthLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  growthPercentage: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
  },
});
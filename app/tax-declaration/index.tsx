import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, TriangleAlert as AlertTriangle, FileText, Info, Euro, Calculator, Calendar, CircleCheck as CheckCircle, TriangleAlert as Warning, Scale } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function TaxDeclarationInfoScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Obligation de déclaration fiscale</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#FF9800', '#FFB74D']}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <AlertTriangle size={48} color="#FFFFFF" />
            <Text style={styles.heroTitle}>Seuils de déclaration fiscale</Text>
            <Text style={styles.heroSubtitle}>
              Informations importantes sur vos obligations fiscales en tant que Fourmiz
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>3 000€</Text>
                <Text style={styles.heroStatLabel}>seuil de revenus</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>20</Text>
                <Text style={styles.heroStatLabel}>transactions max</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Legal Framework */}
        <View style={styles.legalSection}>
          <Text style={styles.sectionTitle}>Cadre légal</Text>
          
          <View style={styles.legalCard}>
            <Scale size={24} color="#2196F3" />
            <View style={styles.legalContent}>
              <Text style={styles.legalTitle}>Article 242 bis du Code général des impôts (CGI)</Text>
              <Text style={styles.legalText}>
                Le plafond de <Text style={styles.highlight}>3 000 euros</Text> par an de revenus non imposables 
                en France dans le cadre d'une <Text style={styles.highlight}>activité occasionnelle entre particuliers</Text> 
                est régi par l'article 87 de la loi de finances pour 2016, modifié par la loi de finances pour 2019.
              </Text>
            </View>
          </View>
        </View>

        {/* Thresholds */}
        <View style={styles.thresholdsSection}>
          <Text style={styles.sectionTitle}>Seuils de déclaration</Text>
          <Text style={styles.sectionSubtitle}>
            Les plateformes collaboratives doivent transmettre à l'administration fiscale les revenus perçus 
            dès que DEUX seuils sont franchis :
          </Text>
          
          <View style={styles.thresholdCard}>
            <View style={styles.thresholdHeader}>
              <Euro size={24} color="#4CAF50" />
              <Text style={styles.thresholdTitle}>Seuil de revenus</Text>
            </View>
            <Text style={styles.thresholdAmount}>Plus de 3 000 €</Text>
            <Text style={styles.thresholdDescription}>de revenus par année civile</Text>
          </View>

          <View style={styles.thresholdCard}>
            <View style={styles.thresholdHeader}>
              <Calculator size={24} color="#FF9800" />
              <Text style={styles.thresholdTitle}>Seuil de transactions</Text>
            </View>
            <Text style={styles.thresholdAmount}>Plus de 20 transactions</Text>
            <Text style={styles.thresholdDescription}>effectuées sur l'année</Text>
          </View>
        </View>

        {/* What it means */}
        <View style={styles.meaningSection}>
          <Text style={styles.sectionTitle}>Que cela signifie concrètement ?</Text>
          
          <View style={styles.scenarioCard}>
            <CheckCircle size={24} color="#4CAF50" />
            <View style={styles.scenarioContent}>
              <Text style={styles.scenarioTitle}>Pas d'obligation de déclaration</Text>
              <Text style={styles.scenarioText}>
                Si vous percevez <Text style={styles.highlight}>moins de 3 000 € par an</Text> ET 
                effectuez <Text style={styles.highlight}>moins de 20 transactions</Text>, vous n'êtes pas 
                tenu de déclarer vos revenus, sauf cas particuliers (activité régulière ou professionnelle).
              </Text>
            </View>
          </View>

          <View style={styles.scenarioCard}>
            <Warning size={24} color="#FF9800" />
            <View style={styles.scenarioContent}>
              <Text style={styles.scenarioTitle}>Obligation de déclaration</Text>
              <Text style={styles.scenarioText}>
                <Text style={styles.highlight}>Au-delà de ces seuils</Text>, la plateforme doit transmettre 
                un récapitulatif annuel à l'administration fiscale ET vous êtes tenu de déclarer ces revenus 
                (en tant que BNC ou micro-entreprise selon les cas).
              </Text>
            </View>
          </View>
        </View>

        {/* Revenue Types */}
        <View style={styles.revenueSection}>
          <Text style={styles.sectionTitle}>Types de revenus concernés</Text>
          
          <View style={styles.revenueCard}>
            <Text style={styles.revenueTitle}>Revenus pris en compte :</Text>
            <View style={styles.revenueList}>
              <Text style={styles.revenueItem}>• Commissions directes (80% des missions)</Text>
              <Text style={styles.revenueItem}>• Commissions de parrainage (2,5% des filleuls)</Text>
              <Text style={styles.revenueItem}>• Bonus de parrainage (3€ par nouveau membre)</Text>
              <Text style={styles.revenueItem}>• Toutes autres rémunérations liées à l'activité</Text>
            </View>
          </View>
        </View>

        {/* Fourmiz Notifications */}
        <View style={styles.notificationSection}>
          <Text style={styles.sectionTitle}>Notifications Fourmiz</Text>
          
          <View style={styles.notificationCard}>
            <View style={styles.notificationHeader}>
              <AlertTriangle size={24} color="#FF4444" />
              <Text style={styles.notificationTitle}>Suivi automatique</Text>
            </View>
            <Text style={styles.notificationText}>
              Fourmiz surveille automatiquement vos revenus et transactions. Vous recevrez une notification 
              lorsque vous approcherez des seuils :
            </Text>
            <View style={styles.notificationList}>
              <Text style={styles.notificationItem}>📊 À 2 500€ de revenus annuels</Text>
              <Text style={styles.notificationItem}>📈 À 18 transactions dans l'année</Text>
              <Text style={styles.notificationItem}>⚠️ Dès que les deux seuils sont atteints</Text>
            </View>
          </View>
        </View>

        {/* Official Sources */}
        <View style={styles.sourcesSection}>
          <Text style={styles.sectionTitle}>Sources officielles</Text>
          
          <View style={styles.sourceCard}>
            <FileText size={20} color="#2196F3" />
            <View style={styles.sourceContent}>
              <Text style={styles.sourceTitle}>Article 242 bis CGI</Text>
              <Text style={styles.sourceText}>Legifrance - Code général des impôts</Text>
            </View>
          </View>
          
          <View style={styles.sourceCard}>
            <FileText size={20} color="#2196F3" />
            <View style={styles.sourceContent}>
              <Text style={styles.sourceTitle}>BOFiP - BOI-BIC-CHAMP-70-10-50</Text>
              <Text style={styles.sourceText}>Revenus perçus par l'intermédiaire de plateformes</Text>
            </View>
          </View>
          
          <View style={styles.sourceCard}>
            <FileText size={20} color="#2196F3" />
            <View style={styles.sourceContent}>
              <Text style={styles.sourceTitle}>Loi de finances 2019, article 10</Text>
              <Text style={styles.sourceText}>Modification des seuils de déclaration</Text>
            </View>
          </View>
        </View>

        {/* Important Note */}
        <View style={styles.warningSection}>
          <View style={styles.warningCard}>
            <Info size={24} color="#FF9800" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Important</Text>
              <Text style={styles.warningText}>
                Cette information est donnée à titre indicatif. Pour toute question spécifique à votre situation, 
                consultez un conseiller fiscal ou rendez-vous sur le site officiel des impôts (impots.gouv.fr).
              </Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.ctaButtonText}>Voir mes revenus Fourmiz</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
  },
  heroCard: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 20,
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 32,
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  legalSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    lineHeight: 20,
  },
  legalCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
  },
  legalContent: {
    flex: 1,
    marginLeft: 12,
  },
  legalTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
    marginBottom: 8,
  },
  legalText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    lineHeight: 20,
  },
  highlight: {
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
  },
  thresholdsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thresholdCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  thresholdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  thresholdTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginLeft: 12,
  },
  thresholdAmount: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FF9800',
    marginBottom: 4,
  },
  thresholdDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  meaningSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scenarioCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  scenarioContent: {
    flex: 1,
    marginLeft: 12,
  },
  scenarioTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  scenarioText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
  },
  revenueSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  revenueCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  revenueTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  revenueList: {
    gap: 8,
  },
  revenueItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
  },
  notificationSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationCard: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FF4444',
    marginLeft: 12,
  },
  notificationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FF4444',
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationList: {
    gap: 8,
  },
  notificationItem: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FF4444',
    lineHeight: 20,
  },
  sourcesSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sourceContent: {
    flex: 1,
    marginLeft: 12,
  },
  sourceTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  sourceText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  warningSection: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#F57C00',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#F57C00',
    lineHeight: 18,
  },
  ctaSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  ctaButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
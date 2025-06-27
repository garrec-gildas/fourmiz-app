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
import { ArrowLeft, Award, Euro, FileText, Info, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Calculator, Calendar, Chrome as Home, Users, Briefcase, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TaxAttestationBubble from '@/components/TaxAttestationBubble';

// Données des services éligibles
const eligibleServices = [
  {
    category: 'Entretien de la maison',
    icon: '🏠',
    color: '#4CAF50',
    services: [
      'Ménage et travaux ménagers',
      'Repassage à domicile',
      'Nettoyage des vitres',
      'Collecte et livraison de linge repassé'
    ],
    plafond: 'Plafond général',
    note: null
  },
  {
    category: 'Jardinage',
    icon: '🌿',
    color: '#2ECC71',
    services: [
      'Taille de haies et arbustes',
      'Tonte de pelouse',
      'Ramassage de feuilles',
      'Petits travaux de jardinage'
    ],
    plafond: '5 000 € / an',
    note: 'Plafond spécifique jardinage'
  },
  {
    category: 'Petits bricolages',
    icon: '🛠️',
    color: '#FF9800',
    services: [
      'Montage de meubles',
      'Fixation d\'étagères et tringles',
      'Pose de cadres',
      'Petites réparations'
    ],
    plafond: '500 € / an',
    note: 'Maximum 2h par intervention'
  },
  {
    category: 'Garde d\'enfants',
    icon: '👶',
    color: '#E91E63',
    services: [
      'Garde d\'enfants à domicile',
      'Sortie d\'école',
      'Aide aux devoirs',
      'Soutien scolaire à domicile'
    ],
    plafond: 'Plafond général',
    note: 'Tous âges confondus'
  },
  {
    category: 'Assistance aux personnes',
    icon: '🤝',
    color: '#9C27B0',
    services: [
      'Aide aux personnes âgées',
      'Assistance aux personnes dépendantes',
      'Aide à la mobilité',
      'Garde-malade (hors soins médicaux)'
    ],
    plafond: 'Plafond majoré possible',
    note: 'Jusqu\'à 20 000€ selon situation'
  },
  {
    category: 'Transport et livraisons',
    icon: '🚗',
    color: '#2196F3',
    services: [
      'Transport de personnes à mobilité réduite',
      'Livraison de repas à domicile',
      'Livraison de courses (si perte d\'autonomie)',
      'Aide aux déplacements'
    ],
    plafond: 'Plafond général',
    note: 'Selon conditions spécifiques'
  },
  {
    category: 'Services numériques',
    icon: '💻',
    color: '#607D8B',
    services: [
      'Maintenance informatique à domicile',
      'Formation aux outils numériques',
      'Téléassistance',
      'Visio-assistance'
    ],
    plafond: 'Plafond général',
    note: 'Usage courant uniquement'
  }
];

const conditions = [
  {
    title: 'Lieu d\'intervention',
    description: 'Service rendu au domicile du contribuable ou de ses ascendants',
    icon: Home,
    color: '#4CAF50'
  },
  {
    title: 'Prestataire agréé',
    description: 'Association ou entreprise agréée "Services à la personne"',
    icon: Shield,
    color: '#2196F3'
  },
  {
    title: 'Paiement traçable',
    description: 'Virement, chèque, CESU (pas d\'espèces)',
    icon: Euro,
    color: '#FF9800'
  },
  {
    title: 'Justificatif obligatoire',
    description: 'Attestation annuelle délivrée par le prestataire',
    icon: FileText,
    color: '#9C27B0'
  }
];

export default function TaxCreditInfoScreen() {
  const renderServiceCategory = (category: any, index: number) => (
    <View key={index} style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View style={[styles.serviceIcon, { backgroundColor: category.color + '15' }]}>
          <Text style={styles.serviceEmoji}>{category.icon}</Text>
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceTitle}>{category.category}</Text>
          <Text style={[styles.servicePlafond, { color: category.color }]}>
            {category.plafond}
          </Text>
          {category.note && (
            <Text style={styles.serviceNote}>{category.note}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.serviceList}>
        {category.services.map((service: string, serviceIndex: number) => (
          <View key={serviceIndex} style={styles.serviceItem}>
            <CheckCircle size={14} color={category.color} />
            <Text style={styles.serviceItemText}>{service}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderCondition = (condition: any, index: number) => {
    const IconComponent = condition.icon;
    
    return (
      <View key={index} style={styles.conditionCard}>
        <View style={[styles.conditionIcon, { backgroundColor: condition.color + '15' }]}>
          <IconComponent size={24} color={condition.color} />
        </View>
        <View style={styles.conditionContent}>
          <Text style={styles.conditionTitle}>{condition.title}</Text>
          <Text style={styles.conditionDescription}>{condition.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crédit d'Impôt 50%</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#4CAF50', '#66BB6A']}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <Award size={48} color="#FFFFFF" />
            <Text style={styles.heroTitle}>Crédit d'Impôt pour Services à la Personne</Text>
            <Text style={styles.heroSubtitle}>
              Bénéficiez d'un avantage fiscal de 50% sur vos dépenses de services à domicile
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>50%</Text>
                <Text style={styles.heroStatLabel}>de réduction</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>12 000€</Text>
                <Text style={styles.heroStatLabel}>plafond annuel</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Attestation Bubble */}
        <View style={styles.attestationSection}>
          <TaxAttestationBubble />
        </View>

        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={styles.sectionTitle}>Qu'est-ce que le crédit d'impôt ?</Text>
          <Text style={styles.introText}>
            En France, les services à la personne bénéficient d'un crédit d'impôt de 50% des dépenses engagées, 
            dans certaines limites. Cet avantage fiscal est encadré par l'article 199 sexdecies du Code général des impôts.
          </Text>
          
          <View style={styles.importantNote}>
            <Info size={20} color="#2196F3" />
            <View style={styles.noteContent}>
              <Text style={styles.noteTitle}>Crédit d'impôt (et non réduction)</Text>
              <Text style={styles.noteText}>
                Depuis 2017, il s'agit d'un crédit d'impôt : vous êtes remboursé même si vous ne payez pas d'impôt !
              </Text>
            </View>
          </View>
        </View>

        {/* Services éligibles */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Services éligibles au crédit d'impôt</Text>
          <Text style={styles.sectionSubtitle}>
            Découvrez tous les services Fourmiz qui vous permettent de bénéficier de l'avantage fiscal
          </Text>
          
          <View style={styles.servicesList}>
            {eligibleServices.map(renderServiceCategory)}
          </View>
        </View>

        {/* Conditions */}
        <View style={styles.conditionsSection}>
          <Text style={styles.sectionTitle}>Conditions pour bénéficier de l'avantage</Text>
          
          <View style={styles.conditionsList}>
            {conditions.map(renderCondition)}
          </View>
        </View>

        {/* Plafonds */}
        <View style={styles.plafondsSection}>
          <Text style={styles.sectionTitle}>Plafonds et montants</Text>
          
          <View style={styles.plafondCard}>
            <View style={styles.plafondHeader}>
              <Calculator size={24} color="#FF9800" />
              <Text style={styles.plafondTitle}>Plafond général</Text>
            </View>
            <View style={styles.plafondContent}>
              <Text style={styles.plafondAmount}>12 000 € / an</Text>
              <Text style={styles.plafondDescription}>
                Majoré de 1 500 € par enfant ou personne à charge (maximum 15 000 €)
              </Text>
            </View>
          </View>

          <View style={styles.plafondCard}>
            <View style={styles.plafondHeader}>
              <Users size={24} color="#9C27B0" />
              <Text style={styles.plafondTitle}>Plafond majoré</Text>
            </View>
            <View style={styles.plafondContent}>
              <Text style={styles.plafondAmount}>20 000 € / an</Text>
              <Text style={styles.plafondDescription}>
                Pour les personnes invalides ou ayant un enfant handicapé
              </Text>
            </View>
          </View>

          <View style={styles.plafondCard}>
            <View style={styles.plafondHeader}>
              <Calendar size={24} color="#4CAF50" />
              <Text style={styles.plafondTitle}>Plafonds spécifiques</Text>
            </View>
            <View style={styles.plafondContent}>
              <View style={styles.specificPlafond}>
                <Text style={styles.specificAmount}>5 000 € / an</Text>
                <Text style={styles.specificService}>Jardinage</Text>
              </View>
              <View style={styles.specificPlafond}>
                <Text style={styles.specificAmount}>500 € / an</Text>
                <Text style={styles.specificService}>Petits bricolages (max 2h/intervention)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Exemple de calcul */}
        <View style={styles.exampleSection}>
          <Text style={styles.sectionTitle}>Exemple de calcul</Text>
          
          <View style={styles.exampleCard}>
            <Text style={styles.exampleTitle}>Famille avec 2 enfants</Text>
            
            <View style={styles.calculationStep}>
              <Text style={styles.stepLabel}>Dépenses annuelles :</Text>
              <View style={styles.expenseList}>
                <Text style={styles.expenseItem}>• Ménage : 2 400 €</Text>
                <Text style={styles.expenseItem}>• Garde d'enfants : 3 600 €</Text>
                <Text style={styles.expenseItem}>• Jardinage : 1 200 €</Text>
                <Text style={styles.expenseTotal}>Total : 7 200 €</Text>
              </View>
            </View>
            
            <View style={styles.calculationStep}>
              <Text style={styles.stepLabel}>Plafond applicable :</Text>
              <Text style={styles.stepValue}>15 000 € (12 000 + 1 500 × 2 enfants)</Text>
            </View>
            
            <View style={styles.calculationStep}>
              <Text style={styles.stepLabel}>Montant éligible :</Text>
              <Text style={styles.stepValue}>7 200 € (inférieur au plafond)</Text>
            </View>
            
            <View style={styles.calculationResult}>
              <Text style={styles.resultLabel}>Crédit d'impôt :</Text>
              <Text style={styles.resultValue}>3 600 €</Text>
              <Text style={styles.resultNote}>(50% de 7 200 €)</Text>
            </View>
          </View>
        </View>

        {/* Comment ça marche avec Fourmiz */}
        <View style={styles.fourmizSection}>
          <Text style={styles.sectionTitle}>Comment ça marche avec Fourmiz ?</Text>
          
          <View style={styles.processCard}>
            <View style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Commandez votre service</Text>
                <Text style={styles.stepDescription}>
                  Choisissez un service éligible au crédit d'impôt (marqué avec le badge vert)
                </Text>
              </View>
            </View>
            
            <View style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Payez via l'application</Text>
                <Text style={styles.stepDescription}>
                  Le paiement est automatiquement traçable et conforme aux exigences fiscales
                </Text>
              </View>
            </View>
            
            <View style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Recevez votre attestation</Text>
                <Text style={styles.stepDescription}>
                  Fourmiz vous fournit automatiquement l'attestation fiscale annuelle
                </Text>
              </View>
            </View>
            
            <View style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Déclarez vos impôts</Text>
                <Text style={styles.stepDescription}>
                  Reportez le montant sur votre déclaration d'impôt pour bénéficier du crédit
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Avertissement */}
        <View style={styles.warningSection}>
          <View style={styles.warningCard}>
            <AlertTriangle size={24} color="#FF9800" />
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
            onPress={() => router.push('/(tabs)/services')}
          >
            <Text style={styles.ctaButtonText}>Découvrir les services éligibles</Text>
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
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 20,
    lineHeight: 20,
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
  attestationSection: {
    paddingHorizontal: 20,
  },
  introSection: {
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
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  introText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  importantNote: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  noteContent: {
    flex: 1,
    marginLeft: 12,
  },
  noteTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    lineHeight: 18,
  },
  servicesSection: {
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
  servicesList: {
    gap: 16,
  },
  serviceCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceEmoji: {
    fontSize: 20,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  servicePlafond: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  serviceNote: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#666',
    fontStyle: 'italic',
  },
  serviceList: {
    gap: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceItemText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
    flex: 1,
  },
  conditionsSection: {
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
  conditionsList: {
    gap: 16,
  },
  conditionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  conditionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  conditionContent: {
    flex: 1,
  },
  conditionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  conditionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
  },
  plafondsSection: {
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
  plafondCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  plafondHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  plafondTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginLeft: 12,
  },
  plafondContent: {
    marginLeft: 36,
  },
  plafondAmount: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  plafondDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
  },
  specificPlafond: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  specificAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FF9800',
  },
  specificService: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    flex: 1,
    marginLeft: 12,
  },
  exampleSection: {
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
  exampleCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  exampleTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  calculationStep: {
    marginBottom: 16,
  },
  stepLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  stepValue: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  expenseList: {
    marginLeft: 8,
  },
  expenseItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 4,
  },
  expenseTotal: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  calculationResult: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  resultValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
    marginTop: 4,
  },
  resultNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginTop: 4,
  },
  fourmizSection: {
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
  processCard: {
    gap: 16,
  },
  processStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    backgroundColor: '#FF4444',
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
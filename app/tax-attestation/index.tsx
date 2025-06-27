import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, FileText, Download, Mail, User, Chrome as Home, MapPin, Calendar, Euro, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Info, Award } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Mock data pour les services éligibles de l'année précédente
const mockEligibleServices = [
  {
    id: '1',
    serviceName: 'Ménage à domicile',
    fourmizName: 'Marie Dubois',
    date: '2024-03-15',
    amount: 45.00,
    category: 'Entretien de la maison',
    isEligible: true,
  },
  {
    id: '2',
    serviceName: 'Garde d\'enfants',
    fourmizName: 'Sophie Laurent',
    date: '2024-05-22',
    amount: 60.00,
    category: 'Garde d\'enfants',
    isEligible: true,
  },
  {
    id: '3',
    serviceName: 'Montage de meuble',
    fourmizName: 'Thomas Martin',
    date: '2024-07-10',
    amount: 35.00,
    category: 'Petits bricolages',
    isEligible: true,
  },
  {
    id: '4',
    serviceName: 'Tonte de pelouse',
    fourmizName: 'Lucas Petit',
    date: '2024-08-18',
    amount: 25.00,
    category: 'Jardinage',
    isEligible: true,
  },
  {
    id: '5',
    serviceName: 'Aide aux devoirs',
    fourmizName: 'Emma Rousseau',
    date: '2024-09-30',
    amount: 40.00,
    category: 'Soutien scolaire',
    isEligible: true,
  },
  {
    id: '6',
    serviceName: 'Repassage à domicile',
    fourmizName: 'Julie Moreau',
    date: '2024-11-12',
    amount: 30.00,
    category: 'Entretien de la maison',
    isEligible: true,
  },
];

// Mock données utilisateur
const mockUserProfile = {
  firstName: 'Jean',
  lastName: 'Dupont',
  address: '15 rue de la Paix',
  postalCode: '75001',
  city: 'Paris',
  email: 'jean.dupont@email.com',
  isProfileComplete: true,
};

export default function TaxAttestationScreen() {
  const [userProfile, setUserProfile] = useState(mockUserProfile);
  const [isGenerating, setIsGenerating] = useState(false);

  const totalEligibleAmount = mockEligibleServices.reduce((sum, service) => sum + service.amount, 0);
  const creditAmount = totalEligibleAmount * 0.5;
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const handleGenerateAttestation = async () => {
    if (!userProfile.isProfileComplete) {
      Alert.alert(
        'Profil incomplet',
        'Veuillez compléter votre profil (nom, prénom, adresse) pour générer l\'attestation fiscale.',
        [
          { text: 'Compléter le profil', onPress: () => router.push('/(tabs)/profile') },
          { text: 'Annuler', style: 'cancel' }
        ]
      );
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simulation de génération d'attestation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Attestation générée !',
        `Votre attestation fiscale pour l'année ${previousYear} a été générée et envoyée par email à ${userProfile.email}.\n\nMontant total éligible : ${totalEligibleAmount.toFixed(2)}€\nCrédit d'impôt potentiel : ${creditAmount.toFixed(2)}€`,
        [
          { text: 'Télécharger', onPress: () => handleDownloadAttestation() },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue lors de la génération de l\'attestation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAttestation = () => {
    Alert.alert(
      'Téléchargement',
      'L\'attestation sera téléchargée dans vos documents. Cette fonctionnalité sera disponible dans la version mobile de l\'application.',
      [{ text: 'OK' }]
    );
  };

  const renderServiceItem = (service: any) => (
    <View key={service.id} style={styles.serviceItem}>
      <View style={styles.serviceHeader}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{service.serviceName}</Text>
          <Text style={styles.serviceCategory}>{service.category}</Text>
          <Text style={styles.serviceFourmiz}>Réalisé par {service.fourmizName}</Text>
        </View>
        <View style={styles.serviceAmount}>
          <Text style={styles.amountValue}>{service.amount.toFixed(2)}€</Text>
          <Text style={styles.creditValue}>Crédit : {(service.amount * 0.5).toFixed(2)}€</Text>
        </View>
      </View>
      <View style={styles.serviceFooter}>
        <View style={styles.serviceDate}>
          <Calendar size={14} color="#666" />
          <Text style={styles.dateText}>
            {new Date(service.date).toLocaleDateString('fr-FR')}
          </Text>
        </View>
        <View style={styles.eligibleBadge}>
          <CheckCircle size={12} color="#4CAF50" />
          <Text style={styles.eligibleText}>Éligible</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attestation Fiscale</Text>
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
            <Text style={styles.heroTitle}>Attestation Fiscale {previousYear}</Text>
            <Text style={styles.heroSubtitle}>
              Obtenez votre attestation pour bénéficier du crédit d'impôt de 50%
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{totalEligibleAmount.toFixed(2)}€</Text>
                <Text style={styles.heroStatLabel}>Montant éligible</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{creditAmount.toFixed(2)}€</Text>
                <Text style={styles.heroStatLabel}>Crédit d'impôt</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Profile Check */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Vérification du profil</Text>
          
          {userProfile.isProfileComplete ? (
            <View style={styles.profileCompleteCard}>
              <CheckCircle size={24} color="#4CAF50" />
              <View style={styles.profileInfo}>
                <Text style={styles.profileTitle}>Profil complet ✓</Text>
                <Text style={styles.profileDetails}>
                  {userProfile.firstName} {userProfile.lastName}{'\n'}
                  {userProfile.address}{'\n'}
                  {userProfile.postalCode} {userProfile.city}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.profileIncompleteCard}>
              <AlertTriangle size={24} color="#FF9800" />
              <View style={styles.profileInfo}>
                <Text style={styles.profileWarningTitle}>Profil incomplet</Text>
                <Text style={styles.profileWarningText}>
                  Assurez-vous que votre profil est bien renseigné (nom, prénom, adresse) pour la validité de l'attestation.
                </Text>
                <TouchableOpacity 
                  style={styles.completeProfileButton}
                  onPress={() => router.push('/(tabs)/profile')}
                >
                  <Text style={styles.completeProfileButtonText}>Compléter le profil</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Services Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Récapitulatif {previousYear}</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Nombre de services :</Text>
              <Text style={styles.summaryValue}>{mockEligibleServices.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Montant total :</Text>
              <Text style={styles.summaryValue}>{totalEligibleAmount.toFixed(2)}€</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Crédit d'impôt (50%) :</Text>
              <Text style={[styles.summaryValue, styles.creditValue]}>
                {creditAmount.toFixed(2)}€
              </Text>
            </View>
          </View>
        </View>

        {/* Services List */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Détail des prestations éligibles</Text>
          <Text style={styles.sectionSubtitle}>
            Services réalisés en {previousYear} éligibles au crédit d'impôt
          </Text>
          
          <View style={styles.servicesList}>
            {mockEligibleServices.map(renderServiceItem)}
          </View>
        </View>

        {/* Important Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Informations importantes</Text>
          
          <View style={styles.noteCard}>
            <Info size={20} color="#2196F3" />
            <View style={styles.noteContent}>
              <Text style={styles.noteTitle}>Validité de l'attestation</Text>
              <Text style={styles.noteText}>
                Cette attestation est valable pour votre déclaration d'impôt {currentYear} sur les revenus {previousYear}.
              </Text>
            </View>
          </View>
          
          <View style={styles.noteCard}>
            <FileText size={20} color="#FF9800" />
            <View style={styles.noteContent}>
              <Text style={styles.noteTitle}>Conservation</Text>
              <Text style={styles.noteText}>
                Conservez cette attestation avec vos documents fiscaux. Elle peut vous être demandée par l'administration fiscale.
              </Text>
            </View>
          </View>
          
          <View style={styles.noteCard}>
            <Mail size={20} color="#4CAF50" />
            <View style={styles.noteContent}>
              <Text style={styles.noteTitle}>Envoi par email</Text>
              <Text style={styles.noteText}>
                L'attestation sera automatiquement envoyée à votre adresse email : {userProfile.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Generate Button */}
        <View style={styles.generateSection}>
          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={handleGenerateAttestation}
            disabled={isGenerating}
          >
            <FileText size={24} color="#FFFFFF" />
            <Text style={styles.generateButtonText}>
              {isGenerating ? 'Génération en cours...' : 'Générer mon attestation'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.generateNote}>
            L'attestation sera datée du jour de la demande avec le détail des prestations de l'année civile {previousYear}.
          </Text>
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
  profileSection: {
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
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
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
  profileCompleteCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  profileIncompleteCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  profileDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4CAF50',
    lineHeight: 20,
  },
  profileWarningTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F57C00',
    marginBottom: 8,
  },
  profileWarningText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#F57C00',
    lineHeight: 20,
    marginBottom: 12,
  },
  completeProfileButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  completeProfileButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  summarySection: {
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
  summaryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  creditValue: {
    color: '#4CAF50',
    fontSize: 18,
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
    gap: 12,
  },
  serviceItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#4CAF50',
    marginBottom: 4,
  },
  serviceFourmiz: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  serviceAmount: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 2,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  eligibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  eligibleText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#4CAF50',
  },
  notesSection: {
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
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  noteContent: {
    flex: 1,
    marginLeft: 12,
  },
  noteTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 18,
  },
  generateSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  generateButtonDisabled: {
    backgroundColor: '#999',
  },
  generateButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  generateNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});
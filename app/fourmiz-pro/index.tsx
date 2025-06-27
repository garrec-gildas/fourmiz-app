import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Award, Star, TrendingUp, Shield, Zap, Crown, Target, Users, Calendar, Clock, CreditCard, Info, Camera, Upload, CircleCheck as CheckCircle, X, Eye, Trash2, CreditCard as Edit2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Mock data pour l'abonnement Fourmiz PRO
const mockProData = {
  isSubscribed: true, // Changé à true pour montrer l'interface d'abonné
  subscriptionDate: '2024-12-01',
  nextBillingDate: '2025-01-01',
  autoRenew: true,
  price: 10.00,
  logoUrl: 'https://images.pexels.com/photos/1337380/pexels-photo-1337380.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop',
  pendingServices: [
    {
      id: '1',
      name: 'Coaching sportif à domicile',
      description: 'Séances de coaching personnalisées pour tous niveaux',
      status: 'pending',
      submittedDate: '2024-12-15',
    }
  ],
  approvedServices: [
    {
      id: '2',
      name: 'Cours de cuisine italienne',
      description: 'Apprenez à cuisiner des plats italiens authentiques',
      status: 'approved',
      approvedDate: '2024-12-10',
      price: 35,
    },
    {
      id: '3',
      name: 'Assistance informatique premium',
      description: 'Dépannage et formation sur tous vos appareils',
      status: 'approved',
      approvedDate: '2024-12-05',
      price: 45,
    }
  ],
  benefits: [
    {
      title: 'Visibilité prioritaire',
      description: 'Apparaissez en premier dans les résultats de recherche',
      icon: Star,
    },
    {
      title: 'Badge PRO exclusif',
      description: 'Affichez votre statut professionnel sur votre profil',
      icon: Shield,
    },
    {
      title: 'Accès prioritaire aux missions',
      description: 'Recevez les notifications de missions 15 minutes avant les autres',
      icon: Zap,
    },
    {
      title: 'Services personnalisés',
      description: 'Proposez vos propres services spécifiques',
      icon: Target,
    },
    {
      title: 'Logo personnalisé',
      description: 'Affichez votre logo au lieu de votre photo de profil',
      icon: Upload,
    },
    {
      title: 'Statistiques avancées',
      description: 'Accédez à des analyses détaillées de vos performances',
      icon: TrendingUp,
    },
  ],
  stats: {
    visibilityBoost: '+68%',
    missionAcceptanceRate: '+42%',
    averageEarnings: '+35%',
  }
};

export default function FourmizProScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [autoRenew, setAutoRenew] = useState(mockProData.autoRenew);
  const [showLogoOptions, setShowLogoOptions] = useState(false);
  const [showLogoPreview, setShowLogoPreview] = useState(false);

  const handleSubscribe = () => {
    router.push('/fourmiz-pro/subscription');
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Annuler l\'abonnement',
      'Votre abonnement restera actif jusqu\'à la fin de la période en cours, puis ne sera pas renouvelé. Êtes-vous sûr de vouloir annuler ?',
      [
        { text: 'Non', style: 'cancel' },
        { 
          text: 'Oui, annuler', 
          style: 'destructive',
          onPress: () => {
            setIsLoading(true);
            // Simulation d'annulation d'abonnement
            setTimeout(() => {
              Alert.alert(
                'Abonnement annulé',
                'Votre abonnement ne sera pas renouvelé à la fin de la période en cours.',
                [{ text: 'OK' }]
              );
              setIsLoading(false);
            }, 1500);
          }
        }
      ]
    );
  };

  const handleUploadLogo = () => {
    setShowLogoOptions(true);
  };

  const handleRemoveLogo = () => {
    Alert.alert(
      'Supprimer le logo',
      'Êtes-vous sûr de vouloir supprimer votre logo professionnel ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => {
            // Logique de suppression du logo
            Alert.alert('Logo supprimé', 'Votre logo a été supprimé avec succès.');
          }
        }
      ]
    );
  };

  const handleSubmitService = () => {
    Alert.alert(
      'Proposer un service',
      'Votre proposition de service sera examinée par notre équipe. Vous recevrez une notification dès qu\'elle sera approuvée.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Continuer', onPress: () => router.push('/fourmiz-criteria') }
      ]
    );
  };

  const renderServiceItem = (service: any, isApproved: boolean) => (
    <View key={service.id} style={styles.serviceItem}>
      <View style={styles.serviceHeader}>
        <Text style={styles.serviceName}>{service.name}</Text>
        <View style={[
          styles.statusBadge,
          isApproved ? styles.approvedBadge : styles.pendingBadge
        ]}>
          {isApproved ? (
            <CheckCircle size={12} color="#4CAF50" />
          ) : (
            <Clock size={12} color="#FF9800" />
          )}
          <Text style={[
            styles.statusText,
            isApproved ? styles.approvedText : styles.pendingText
          ]}>
            {isApproved ? 'Approuvé' : 'En attente'}
          </Text>
        </View>
      </View>
      <Text style={styles.serviceDescription}>{service.description}</Text>
      
      <View style={styles.serviceFooter}>
        <Text style={styles.serviceDate}>
          {isApproved 
            ? `Approuvé le ${new Date(service.approvedDate).toLocaleDateString('fr-FR')}` 
            : `Soumis le ${new Date(service.submittedDate).toLocaleDateString('fr-FR')}`
          }
        </Text>
        {isApproved && service.price && (
          <Text style={styles.servicePrice}>{service.price}€</Text>
        )}
      </View>
      
      {isApproved && (
        <View style={styles.serviceActions}>
          <TouchableOpacity style={styles.serviceAction}>
            <Edit2 size={16} color="#2196F3" />
            <Text style={styles.serviceActionText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.serviceAction}>
            <Eye size={16} color="#FF9800" />
            <Text style={styles.serviceActionText}>Aperçu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.serviceAction}>
            <Trash2 size={16} color="#F44336" />
            <Text style={styles.serviceActionText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
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
        <Text style={styles.headerTitle}>Fourmiz PRO</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#FFD700', '#FFC107']}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <View style={styles.proBadge}>
              <Crown size={24} color="#FFFFFF" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
            
            <Text style={styles.heroTitle}>Fourmiz PRO</Text>
            <Text style={styles.heroSubtitle}>
              Boostez votre visibilité et vos revenus avec notre abonnement premium
            </Text>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{mockProData.price.toFixed(2)}€/mois</Text>
            </View>
            
            {!mockProData.isSubscribed ? (
              <TouchableOpacity 
                style={styles.subscribeButton}
                onPress={handleSubscribe}
              >
                <Text style={styles.subscribeButtonText}>S'abonner maintenant</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.subscriptionInfo}>
                <View style={styles.subscriptionStatusBadge}>
                  <CheckCircle size={16} color="#FFFFFF" />
                  <Text style={styles.subscriptionStatus}>Abonnement actif</Text>
                </View>
                <Text style={styles.subscriptionDate}>
                  Prochain paiement le {new Date(mockProData.nextBillingDate || '').toLocaleDateString('fr-FR')}
                </Text>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={handleCancelSubscription}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelButtonText}>
                    {isLoading ? 'Traitement...' : 'Annuler l\'abonnement'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Performance Stats */}
        {mockProData.isSubscribed && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Vos performances PRO</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{mockProData.stats.visibilityBoost}</Text>
                <Text style={styles.statLabel}>Visibilité</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{mockProData.stats.missionAcceptanceRate}</Text>
                <Text style={styles.statLabel}>Taux d'acceptation</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{mockProData.stats.averageEarnings}</Text>
                <Text style={styles.statLabel}>Revenus moyens</Text>
              </View>
            </View>
          </View>
        )}

        {/* Logo Upload Section */}
        <View style={styles.logoSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Logo professionnel</Text>
            {mockProData.logoUrl && (
              <TouchableOpacity 
                style={styles.previewButton}
                onPress={() => setShowLogoPreview(true)}
              >
                <Eye size={16} color="#2196F3" />
                <Text style={styles.previewButtonText}>Aperçu</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={styles.sectionDescription}>
            Affichez votre logo au lieu de votre photo de profil pour une image plus professionnelle
          </Text>
          
          <View style={styles.logoContainer}>
            {mockProData.logoUrl ? (
              <View style={styles.logoWrapper}>
                <Image 
                  source={{ uri: mockProData.logoUrl }} 
                  style={styles.logoImage}
                  resizeMode="cover"
                />
                <View style={styles.logoActions}>
                  <TouchableOpacity 
                    style={styles.logoAction}
                    onPress={handleUploadLogo}
                  >
                    <Edit2 size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.logoAction, styles.logoActionDelete]}
                    onPress={handleRemoveLogo}
                  >
                    <Trash2 size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.logoUploadContainer}
                onPress={handleUploadLogo}
              >
                <View style={styles.logoPlaceholder}>
                  <Upload size={32} color="#999" />
                  <Text style={styles.logoPlaceholderText}>Ajouter votre logo</Text>
                  <Text style={styles.logoPlaceholderSubtext}>Format carré recommandé</Text>
                </View>
              </TouchableOpacity>
            )}
            
            <View style={styles.logoInfo}>
              <Text style={styles.logoInfoTitle}>Recommandations pour votre logo</Text>
              <View style={styles.logoInfoItem}>
                <CheckCircle size={16} color="#4CAF50" />
                <Text style={styles.logoInfoText}>Format carré (1:1) pour un affichage optimal</Text>
              </View>
              <View style={styles.logoInfoItem}>
                <CheckCircle size={16} color="#4CAF50" />
                <Text style={styles.logoInfoText}>Taille minimale recommandée : 500x500 pixels</Text>
              </View>
              <View style={styles.logoInfoItem}>
                <CheckCircle size={16} color="#4CAF50" />
                <Text style={styles.logoInfoText}>Formats acceptés : JPG, PNG (avec transparence)</Text>
              </View>
              <View style={styles.logoInfoItem}>
                <CheckCircle size={16} color="#4CAF50" />
                <Text style={styles.logoInfoText}>Taille maximale : 2 Mo</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Custom Services Section */}
        <View style={styles.servicesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Services personnalisés</Text>
            <TouchableOpacity 
              style={styles.addServiceButton}
              onPress={handleSubmitService}
            >
              <Text style={styles.addServiceText}>Proposer un service</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.sectionDescription}>
            Proposez vos propres services spécifiques qui seront validés par notre équipe
          </Text>
          
          {mockProData.pendingServices.length > 0 && (
            <View style={styles.servicesGroup}>
              <Text style={styles.servicesGroupTitle}>En attente de validation</Text>
              {mockProData.pendingServices.map(service => 
                renderServiceItem(service, false)
              )}
            </View>
          )}
          
          {mockProData.approvedServices.length > 0 && (
            <View style={styles.servicesGroup}>
              <Text style={styles.servicesGroupTitle}>Services approuvés</Text>
              {mockProData.approvedServices.map(service => 
                renderServiceItem(service, true)
              )}
            </View>
          )}
          
          {mockProData.pendingServices.length === 0 && mockProData.approvedServices.length === 0 && (
            <View style={styles.emptyServices}>
              <Text style={styles.emptyServicesText}>
                Vous n'avez pas encore proposé de services personnalisés
              </Text>
            </View>
          )}
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Avantages exclusifs</Text>
          
          <View style={styles.benefitsList}>
            {mockProData.benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <View key={index} style={styles.benefitCard}>
                  <View style={styles.benefitIcon}>
                    <IconComponent size={24} color="#FFD700" />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>{benefit.title}</Text>
                    <Text style={styles.benefitDescription}>{benefit.description}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Subscription Details */}
        {mockProData.isSubscribed && (
          <View style={styles.subscriptionDetailsSection}>
            <Text style={styles.sectionTitle}>Détails de l'abonnement</Text>
            
            <View style={styles.subscriptionDetailsCard}>
              <View style={styles.subscriptionDetail}>
                <Text style={styles.detailLabel}>Date d'abonnement</Text>
                <Text style={styles.detailValue}>
                  {new Date(mockProData.subscriptionDate || '').toLocaleDateString('fr-FR')}
                </Text>
              </View>
              
              <View style={styles.subscriptionDetail}>
                <Text style={styles.detailLabel}>Prochain paiement</Text>
                <Text style={styles.detailValue}>
                  {new Date(mockProData.nextBillingDate || '').toLocaleDateString('fr-FR')}
                </Text>
              </View>
              
              <View style={styles.subscriptionDetail}>
                <Text style={styles.detailLabel}>Prix mensuel</Text>
                <Text style={styles.detailValue}>{mockProData.price.toFixed(2)}€/mois</Text>
              </View>
              
              <View style={styles.subscriptionDetail}>
                <Text style={styles.detailLabel}>Renouvellement automatique</Text>
                {Platform.OS !== 'web' ? (
                  <Switch
                    value={autoRenew}
                    onValueChange={setAutoRenew}
                    trackColor={{ false: '#E0E0E0', true: '#FFD70040' }}
                    thumbColor={autoRenew ? '#FFD700' : '#999'}
                  />
                ) : (
                  <TouchableOpacity 
                    style={[
                      styles.webSwitch, 
                      autoRenew ? styles.webSwitchActive : styles.webSwitchInactive
                    ]}
                    onPress={() => setAutoRenew(!autoRenew)}
                  >
                    <View style={[
                      styles.webSwitchThumb, 
                      autoRenew ? styles.webSwitchThumbActive : styles.webSwitchThumbInactive
                    ]} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <View style={styles.termsCard}>
            <Info size={20} color="#2196F3" />
            <View style={styles.termsContent}>
              <Text style={styles.termsTitle}>Conditions d'abonnement</Text>
              <Text style={styles.termsText}>
                • Abonnement mensuel de {mockProData.price.toFixed(2)}€ sans engagement{'\n'}
                • Résiliation possible à tout moment sans frais{'\n'}
                • Tout mois entamé est dû et non remboursable{'\n'}
                • Les services personnalisés proposés sont soumis à validation{'\n'}
                • Le logo doit respecter nos conditions d'utilisation
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Logo Options Modal */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showLogoOptions}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLogoOptions(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ajouter un logo</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowLogoOptions(false)}
                >
                  <X size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity style={styles.modalOption}>
                <Camera size={24} color="#2196F3" />
                <Text style={styles.modalOptionText}>Prendre une photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.modalOption}>
                <Upload size={24} color="#4CAF50" />
                <Text style={styles.modalOptionText}>Choisir dans la galerie</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowLogoOptions(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Logo Preview Modal */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showLogoPreview}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLogoPreview(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.previewModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Aperçu du logo</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowLogoPreview(false)}
                >
                  <X size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.logoPreviewContainer}>
                <Image 
                  source={{ uri: mockProData.logoUrl }} 
                  style={styles.logoPreviewImage}
                  resizeMode="contain"
                />
              </View>
              
              <View style={styles.previewExamples}>
                <Text style={styles.previewExamplesTitle}>Aperçu dans l'application</Text>
                
                <View style={styles.previewExample}>
                  <Text style={styles.previewExampleLabel}>Résultats de recherche</Text>
                  <View style={styles.searchResultPreview}>
                    <Image 
                      source={{ uri: mockProData.logoUrl }} 
                      style={styles.searchResultLogo}
                    />
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>Votre nom</Text>
                      <View style={styles.searchResultMeta}>
                        <Star size={12} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.searchResultRating}>4.9</Text>
                        <View style={styles.proBadgeSmall}>
                          <Text style={styles.proBadgeSmallText}>PRO</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
                
                <View style={styles.previewExample}>
                  <Text style={styles.previewExampleLabel}>Profil</Text>
                  <View style={styles.profilePreview}>
                    <Image 
                      source={{ uri: mockProData.logoUrl }} 
                      style={styles.profileLogo}
                    />
                    <View style={styles.profilePreviewBadge}>
                      <Crown size={12} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.previewCloseButton}
                onPress={() => setShowLogoPreview(false)}
              >
                <Text style={styles.previewCloseButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  proBadgeText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
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
  priceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  priceText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  subscribeButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFD700',
  },
  subscriptionInfo: {
    alignItems: 'center',
  },
  subscriptionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 6,
  },
  subscriptionStatus: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  subscriptionDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 16,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  statsSection: {
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFD700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  logoSection: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  previewButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#2196F3',
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoWrapper: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  logoActions: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    flexDirection: 'row',
    gap: 8,
  },
  logoAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoActionDelete: {
    backgroundColor: '#F44336',
  },
  logoUploadContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoPlaceholder: {
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginTop: 12,
  },
  logoPlaceholderSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
    marginTop: 4,
  },
  logoInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  logoInfoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  logoInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  logoInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    flex: 1,
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
  addServiceButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addServiceText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  servicesGroup: {
    marginBottom: 16,
  },
  servicesGroupTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  serviceItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  approvedBadge: {
    backgroundColor: '#E8F5E8',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  approvedText: {
    color: '#4CAF50',
  },
  pendingText: {
    color: '#FF9800',
  },
  serviceDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
  servicePrice: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#4CAF50',
  },
  serviceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  serviceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceActionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  emptyServices: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyServicesText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  benefitsSection: {
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
  benefitsList: {
    gap: 12,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
  },
  subscriptionDetailsSection: {
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
  subscriptionDetailsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  subscriptionDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  termsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  termsCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  termsContent: {
    flex: 1,
    marginLeft: 12,
  },
  termsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: width - 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 16,
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  modalCancelButton: {
    marginTop: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#F44336',
  },
  previewModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: width - 60,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logoPreviewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoPreviewImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  previewExamples: {
    marginBottom: 20,
  },
  previewExamplesTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  previewExample: {
    marginBottom: 16,
  },
  previewExampleLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
    marginBottom: 8,
  },
  searchResultPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
  },
  searchResultLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  searchResultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchResultRating: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginRight: 8,
  },
  proBadgeSmall: {
    backgroundColor: '#FFD700',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  proBadgeSmallText: {
    fontSize: 8,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  profilePreview: {
    position: 'relative',
    alignSelf: 'center',
  },
  profileLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  profilePreviewBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  previewCloseButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  previewCloseButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  // Web-specific styles for Switch component
  webSwitch: {
    width: 50,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  webSwitchActive: {
    backgroundColor: '#FFD70040',
  },
  webSwitchInactive: {
    backgroundColor: '#E0E0E0',
  },
  webSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  webSwitchThumbActive: {
    backgroundColor: '#FFD700',
    marginLeft: 'auto',
  },
  webSwitchThumbInactive: {
    backgroundColor: '#999',
    marginLeft: 0,
  },
});
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
import { ArrowLeft, Shield, Star, MessageCircle, User, Clock, ThumbsUp, ThumbsDown, Info, Eye, EyeOff, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function RatingInfoScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Système de notation</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#4CAF50', '#66BB6A']}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <Shield size={48} color="#FFFFFF" />
            <Text style={styles.heroTitle}>Système de notation confidentiel</Text>
            <Text style={styles.heroSubtitle}>
              Comment fonctionne le système d'évaluation entre Fourmiz et clients
            </Text>
          </View>
        </LinearGradient>

        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Principes fondamentaux</Text>
          <Text style={styles.paragraph}>
            Chez Fourmiz, nous avons mis en place un système d'évaluation bidirectionnel mais asymétrique, 
            conçu pour favoriser la transparence tout en protégeant la qualité des interactions.
          </Text>
          
          <View style={styles.infoCard}>
            <Info size={20} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Pourquoi ce système ?</Text>
              <Text style={styles.infoText}>
                Notre système de notation est conçu pour encourager les comportements positifs et 
                permettre aux Fourmiz de choisir leurs missions en toute connaissance de cause, 
                tout en évitant les situations de conflit ou de rétorsion.
              </Text>
            </View>
          </View>
        </View>

        {/* Rating Visibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visibilité des notes</Text>
          
          <View style={styles.visibilityCard}>
            <View style={styles.visibilityItem}>
              <View style={styles.visibilityHeader}>
                <Eye size={20} color="#4CAF50" />
                <Text style={styles.visibilityTitle}>Notes des Fourmiz</Text>
              </View>
              <Text style={styles.visibilityDescription}>
                Les notes attribuées aux Fourmiz par les clients sont <Text style={styles.highlight}>visibles par tous</Text>. 
                Elles apparaissent sur le profil public des Fourmiz et aident les clients à faire leur choix.
              </Text>
            </View>
            
            <View style={styles.visibilityItem}>
              <View style={styles.visibilityHeader}>
                <EyeOff size={20} color="#FF4444" />
                <Text style={styles.visibilityTitle}>Notes des clients</Text>
              </View>
              <Text style={styles.visibilityDescription}>
                Les notes attribuées aux clients par les Fourmiz sont <Text style={styles.highlight}>visibles uniquement par les Fourmiz</Text>. 
                Les clients ne peuvent pas voir leur propre note ni savoir qu'ils ont été évalués.
              </Text>
            </View>
          </View>
        </View>

        {/* Rating Criteria */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Critères d'évaluation</Text>
          
          <View style={styles.criteriaCard}>
            <Text style={styles.criteriaSubtitle}>Pour les clients évaluant les Fourmiz :</Text>
            <View style={styles.criteriaList}>
              <View style={styles.criteriaItem}>
                <Star size={20} color="#FFD700" />
                <Text style={styles.criteriaText}>Qualité du service</Text>
              </View>
              <View style={styles.criteriaItem}>
                <Clock size={20} color="#FFD700" />
                <Text style={styles.criteriaText}>Ponctualité</Text>
              </View>
              <View style={styles.criteriaItem}>
                <MessageCircle size={20} color="#FFD700" />
                <Text style={styles.criteriaText}>Communication</Text>
              </View>
              <View style={styles.criteriaItem}>
                <User size={20} color="#FFD700" />
                <Text style={styles.criteriaText}>Professionnalisme</Text>
              </View>
            </View>
            
            <Text style={[styles.criteriaSubtitle, styles.marginTop]}>Pour les Fourmiz évaluant les clients :</Text>
            <View style={styles.criteriaList}>
              <View style={styles.criteriaItem}>
                <MessageCircle size={20} color="#4CAF50" />
                <Text style={styles.criteriaText}>Communication</Text>
              </View>
              <View style={styles.criteriaItem}>
                <Info size={20} color="#4CAF50" />
                <Text style={styles.criteriaText}>Clarté des instructions</Text>
              </View>
              <View style={styles.criteriaItem}>
                <Shield size={20} color="#4CAF50" />
                <Text style={styles.criteriaText}>Respect et courtoisie</Text>
              </View>
              <View style={styles.criteriaItem}>
                <Clock size={20} color="#4CAF50" />
                <Text style={styles.criteriaText}>Ponctualité</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avantages du système</Text>
          
          <View style={styles.benefitsGrid}>
            <View style={styles.benefitCard}>
              <ThumbsUp size={24} color="#4CAF50" />
              <Text style={styles.benefitTitle}>Pour les Fourmiz</Text>
              <Text style={styles.benefitDescription}>
                Permet de choisir les clients avec lesquels travailler en fonction de leur historique
              </Text>
            </View>
            
            <View style={styles.benefitCard}>
              <ThumbsUp size={24} color="#2196F3" />
              <Text style={styles.benefitTitle}>Pour les clients</Text>
              <Text style={styles.benefitDescription}>
                Encourage les Fourmiz à maintenir un service de qualité pour obtenir de bonnes évaluations
              </Text>
            </View>
            
            <View style={styles.benefitCard}>
              <Users size={24} color="#FF9800" />
              <Text style={styles.benefitTitle}>Pour la communauté</Text>
              <Text style={styles.benefitDescription}>
                Améliore la qualité globale des interactions et des services
              </Text>
            </View>
            
            <View style={styles.benefitCard}>
              <Shield size={24} color="#9C27B0" />
              <Text style={styles.benefitTitle}>Pour la plateforme</Text>
              <Text style={styles.benefitDescription}>
                Réduit les conflits et favorise un environnement de confiance
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Questions fréquentes</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              Pourquoi les clients ne peuvent-ils pas voir leur propre note ?
            </Text>
            <Text style={styles.faqAnswer}>
              Ce choix permet aux Fourmiz d'évaluer honnêtement sans craindre de répercussions négatives. 
              Cela évite également les situations où un client pourrait se sentir injustement noté et 
              laisser une mauvaise évaluation en retour.
            </Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              Comment les notes des clients sont-elles utilisées ?
            </Text>
            <Text style={styles.faqAnswer}>
              Les notes des clients aident les Fourmiz à décider s'ils souhaitent accepter une mission. 
              Elles permettent également à notre système de recommander les clients les mieux notés aux 
              Fourmiz les mieux notées, créant ainsi un cercle vertueux.
            </Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              Un client peut-il être exclu de la plateforme en raison de mauvaises notes ?
            </Text>
            <Text style={styles.faqAnswer}>
              Oui, dans des cas extrêmes. Si un client reçoit systématiquement de très mauvaises notes 
              et fait l'objet de signalements répétés, notre équipe peut examiner son compte et prendre 
              des mesures, pouvant aller jusqu'à la suspension temporaire ou définitive.
            </Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              Comment puis-je améliorer ma note en tant que client ?
            </Text>
            <Text style={styles.faqAnswer}>
              Bien que vous ne puissiez pas voir votre note, vous pouvez toujours suivre ces bonnes pratiques : 
              communiquez clairement, soyez respectueux, donnez des instructions précises, soyez ponctuel et 
              préparez votre environnement pour faciliter le travail de la Fourmiz.
            </Text>
          </View>
        </View>

        {/* Conclusion */}
        <View style={styles.conclusionSection}>
          <Text style={styles.conclusionText}>
            Notre système d'évaluation est conçu pour créer une communauté de confiance où chacun est 
            encouragé à donner le meilleur de lui-même. Merci de contribuer à cette vision en évaluant 
            honnêtement vos interactions sur Fourmiz.
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
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 22,
  },
  section: {
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
  paragraph: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    lineHeight: 20,
  },
  visibilityCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    gap: 20,
  },
  visibilityItem: {
    gap: 8,
  },
  visibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visibilityTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  visibilityDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
  },
  highlight: {
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  criteriaCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  criteriaSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  marginTop: {
    marginTop: 20,
  },
  criteriaList: {
    gap: 12,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  criteriaText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  benefitCard: {
    width: '47%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  benefitTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  benefitDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  faqItem: {
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
  },
  conclusionSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  conclusionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#4CAF50',
    lineHeight: 22,
    textAlign: 'center',
  },
});
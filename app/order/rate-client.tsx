import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, Send, User, MessageCircle, Shield, ThumbsUp, ThumbsDown, Info, Clock } from 'lucide-react-native';

export default function RateClientScreen() {
  const { id, clientName } = useLocalSearchParams();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Critères d'évaluation
  const [criteria, setCriteria] = useState({
    communication: 0,
    clarity: 0,
    respect: 0,
    punctuality: 0,
  });
  
  // Feedback positif/négatif
  const [positiveFeedback, setPositiveFeedback] = useState<string[]>([]);
  const [negativeFeedback, setNegativeFeedback] = useState<string[]>([]);
  
  const positiveFeedbackOptions = [
    'Communication claire',
    'Instructions précises',
    'Paiement rapide',
    'Accueil chaleureux',
    'Respect des horaires',
    'Environnement propre',
    'Très courtois',
    'Réactif aux messages'
  ];
  
  const negativeFeedbackOptions = [
    'Communication difficile',
    'Instructions confuses',
    'Retard de paiement',
    'Accueil froid',
    'Non-respect des horaires',
    'Environnement sale',
    'Impoli',
    'Peu réactif aux messages'
  ];

  const updateCriteria = (key: keyof typeof criteria, value: number) => {
    setCriteria(prev => ({ ...prev, [key]: value }));
  };
  
  const togglePositiveFeedback = (item: string) => {
    setPositiveFeedback(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item) 
        : [...prev, item]
    );
  };
  
  const toggleNegativeFeedback = (item: string) => {
    setNegativeFeedback(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item) 
        : [...prev, item]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Erreur', 'Veuillez attribuer une note au client.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulation d'envoi d'évaluation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Calculer la note moyenne des critères
      const criteriaValues = Object.values(criteria);
      const criteriaAverage = criteriaValues.reduce((sum, val) => sum + val, 0) / criteriaValues.length;
      
      // Combiner les feedbacks
      const feedbacks = [...positiveFeedback, ...negativeFeedback];
      
      // Données à envoyer à l'API
      const ratingData = {
        orderId: id,
        clientId: id, // Dans une vraie app, ce serait l'ID du client
        overallRating: rating,
        criteriaRatings: criteria,
        criteriaAverage,
        comment,
        feedbacks,
        timestamp: new Date().toISOString()
      };
      
      console.log('Sending rating data:', ratingData);
      
      Alert.alert(
        'Évaluation envoyée',
        `Merci d'avoir évalué ${clientName || 'ce client'}. Votre avis est important pour la communauté Fourmiz.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'envoi de l\'évaluation.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (currentRating: number, onRatingChange: (rating: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRatingChange(star)}
            style={styles.starButton}
          >
            <Star
              size={32}
              color="#FFD700"
              fill={star <= currentRating ? "#FFD700" : "transparent"}
              strokeWidth={1.5}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderCriteriaItem = (
    title: string,
    key: keyof typeof criteria,
    icon: React.ReactNode
  ) => (
    <View style={styles.criteriaItem}>
      <View style={styles.criteriaHeader}>
        {icon}
        <Text style={styles.criteriaTitle}>{title}</Text>
      </View>
      <View style={styles.criteriaStars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => updateCriteria(key, star)}
            style={styles.smallStarButton}
          >
            <Star
              size={24}
              color="#FFD700"
              fill={star <= criteria[key] ? "#FFD700" : "transparent"}
              strokeWidth={1.5}
            />
          </TouchableOpacity>
        ))}
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
        <Text style={styles.headerTitle}>Évaluer le client</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Client Info */}
        <View style={styles.clientSection}>
          <View style={styles.clientAvatar}>
            <User size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.clientName}>{clientName || 'Client'}</Text>
          <Text style={styles.ratingPrompt}>Comment s'est passée votre expérience avec ce client ?</Text>
        </View>

        {/* Overall Rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>Note globale</Text>
          {renderStars(rating, setRating)}
          <View style={styles.ratingLabels}>
            <Text style={styles.ratingLabelLeft}>Très mauvais</Text>
            <Text style={styles.ratingLabelRight}>Excellent</Text>
          </View>
        </View>

        {/* Criteria Ratings */}
        <View style={styles.criteriaSection}>
          <Text style={styles.sectionTitle}>Critères d'évaluation</Text>
          
          {renderCriteriaItem(
            'Communication',
            'communication',
            <MessageCircle size={20} color="#2196F3" />
          )}
          
          {renderCriteriaItem(
            'Clarté des instructions',
            'clarity',
            <MessageCircle size={20} color="#4CAF50" />
          )}
          
          {renderCriteriaItem(
            'Respect et courtoisie',
            'respect',
            <Shield size={20} color="#9C27B0" />
          )}
          
          {renderCriteriaItem(
            'Ponctualité',
            'punctuality',
            <Clock size={20} color="#FF9800" />
          )}
        </View>

        {/* Feedback Tags */}
        <View style={styles.feedbackSection}>
          <Text style={styles.sectionTitle}>Points positifs</Text>
          <View style={styles.feedbackTags}>
            {positiveFeedbackOptions.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.feedbackTag,
                  positiveFeedback.includes(item) && styles.feedbackTagSelected,
                  { borderColor: '#4CAF50' }
                ]}
                onPress={() => togglePositiveFeedback(item)}
              >
                <ThumbsUp 
                  size={14} 
                  color={positiveFeedback.includes(item) ? '#FFFFFF' : '#4CAF50'} 
                />
                <Text 
                  style={[
                    styles.feedbackTagText,
                    positiveFeedback.includes(item) && styles.feedbackTagTextSelected,
                    { color: positiveFeedback.includes(item) ? '#FFFFFF' : '#4CAF50' }
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Points à améliorer</Text>
          <View style={styles.feedbackTags}>
            {negativeFeedbackOptions.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.feedbackTag,
                  negativeFeedback.includes(item) && styles.feedbackTagSelectedNegative,
                  { borderColor: '#F44336' }
                ]}
                onPress={() => toggleNegativeFeedback(item)}
              >
                <ThumbsDown 
                  size={14} 
                  color={negativeFeedback.includes(item) ? '#FFFFFF' : '#F44336'} 
                />
                <Text 
                  style={[
                    styles.feedbackTagText,
                    negativeFeedback.includes(item) && styles.feedbackTagTextSelected,
                    { color: negativeFeedback.includes(item) ? '#FFFFFF' : '#F44336' }
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Comment */}
        <View style={styles.commentSection}>
          <Text style={styles.sectionTitle}>Commentaire (optionnel)</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Partagez votre expérience avec ce client..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.characterCount}>{comment.length}/500</Text>
        </View>

        {/* Important Note */}
        <View style={styles.noteSection}>
          <View style={styles.noteCard}>
            <Info size={20} color="#2196F3" />
            <View style={styles.noteContent}>
              <Text style={styles.noteTitle}>Note importante</Text>
              <Text style={styles.noteText}>
                Votre évaluation est confidentielle et aide à améliorer la communauté Fourmiz. 
                Le client ne verra pas la note que vous lui attribuez.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Send size={20} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Envoi en cours...' : 'Envoyer l\'évaluation'}
          </Text>
        </TouchableOpacity>
      </View>
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
  clientSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  clientAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientName: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  ratingPrompt: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  ratingSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
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
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingLabelLeft: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
  ratingLabelRight: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
  criteriaSection: {
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
  criteriaItem: {
    marginBottom: 16,
  },
  criteriaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  criteriaTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginLeft: 8,
  },
  criteriaStars: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  smallStarButton: {
    padding: 2,
  },
  feedbackSection: {
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
  feedbackTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  feedbackTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  feedbackTagSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  feedbackTagSelectedNegative: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  feedbackTagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  feedbackTagTextSelected: {
    color: '#FFFFFF',
  },
  commentSection: {
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
  commentInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 16,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  noteSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
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
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  submitButton: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
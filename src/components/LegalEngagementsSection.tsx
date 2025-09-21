// components/LegalEngagementsSection.tsx
// Composant UI pour la section des engagements légaux

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLegalEngagements } from '../hooks/useLegalEngagements';
import { legalEngagementsStyles as styles } from '../styles/legal-engagements.styles';
import type {
  EngagementComponentProps,
  LegalEngagementType,
  EngagementFormData
} from '../types/legal-engagements';

interface LegalEngagementsSectionProps extends EngagementComponentProps {
  onSubmitEngagements?: () => Promise<void>;
  disabled?: boolean;
}

export function LegalEngagementsSection({
  userId,
  isFourmizRole,
  isEditMode = false,
  onValidationChange,
  formData,
  onFormDataChange,
  error,
  onSubmitEngagements,
  disabled = false
}: LegalEngagementsSectionProps) {
  
  const {
    engagementTypes,
    grandfatheredStatus,
    isLoading,
    error: hookError,
    loadEngagements,
    acceptAllEngagements,
    getValidationStatus,
    initializeFormData
  } = useLegalEngagements();

  const [showVoluntaryEngagements, setShowVoluntaryEngagements] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les données au montage
  useEffect(() => {
    if (userId && isFourmizRole) {
      loadEngagements(userId);
    }
  }, [userId, isFourmizRole, loadEngagements]);

  // Initialiser les données du formulaire quand les engagements sont chargés
  useEffect(() => {
    if (engagementTypes.length > 0 && userId) {
      const initialFormData = initializeFormData(engagementTypes, []);
      onFormDataChange(initialFormData);
    }
  }, [engagementTypes, userId, initializeFormData, onFormDataChange]);

  // Notifier les changements de validation
  useEffect(() => {
    if (onValidationChange && !isLoading) {
      const validation = getValidationStatus(formData, isFourmizRole);
      onValidationChange(validation);
    }
  }, [formData, isFourmizRole, isLoading, onValidationChange, getValidationStatus]);

  /**
   * Bascule l'état d'un engagement
   */
  const toggleEngagement = useCallback((engagementCode: string) => {
    const newFormData = {
      ...formData,
      [`${engagementCode}Accepted`]: !formData[`${engagementCode}Accepted`]
    };
    onFormDataChange(newFormData);
  }, [formData, onFormDataChange]);

  /**
   * Accepte tous les engagements automatiquement
   */
  const handleAcceptAllEngagements = useCallback(async () => {
    if (!userId || !engagementTypes.length) return;

    try {
      setIsSubmitting(true);
      
      await acceptAllEngagements({
        userId,
        engagementTypes
      });

      // Mettre à jour le formulaire
      const acceptedFormData: EngagementFormData = {};
      engagementTypes.forEach(type => {
        acceptedFormData[`${type.code}Accepted`] = true;
      });
      onFormDataChange(acceptedFormData);

      // Appeler la fonction de soumission parent si fournie
      if (onSubmitEngagements) {
        await onSubmitEngagements();
      }

      Alert.alert(
        'Engagements acceptés',
        'Tous les engagements légaux ont été acceptés avec succès.',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Erreur acceptation engagements:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'accepter les engagements. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, engagementTypes, acceptAllEngagements, onFormDataChange, onSubmitEngagements]);

  /**
   * Rend un engagement individuel
   */
  const renderEngagementItem = useCallback((
    type: LegalEngagementType, 
    isVoluntary: boolean = false
  ) => {
    const isAccepted = formData[`${type.code}Accepted`] as boolean;
    
    return (
      <TouchableOpacity
        key={type.id}
        style={[
          styles.engagementItem,
          isVoluntary && styles.engagementItemVoluntary,
          disabled && styles.engagementItemDisabled
        ]}
        onPress={() => !disabled && toggleEngagement(type.code)}
        activeOpacity={disabled ? 1 : 0.8}
        disabled={disabled}
      >
        <View style={styles.engagementHeader}>
          <View style={[
            styles.checkboxContainer,
            isAccepted && styles.checkboxContainerChecked,
            isVoluntary && styles.checkboxContainerVoluntary,
            disabled && styles.checkboxContainerDisabled
          ]}>
            {isAccepted && (
              <Ionicons name="checkmark" size={16} color="#ffffff" />
            )}
          </View>
          <View style={styles.engagementContent}>
            <Text style={[
              styles.engagementTitle,
              disabled && styles.engagementTitleDisabled
            ]}>
              {type.title}
              {isVoluntary && <Text style={styles.voluntaryLabel}> (optionnel)</Text>}
            </Text>
            <Text style={[
              styles.engagementDescription,
              disabled && styles.engagementDescriptionDisabled
            ]}>
              {type.description}
            </Text>
            {type.details && (
              <Text style={[
                styles.engagementDetails,
                disabled && styles.engagementDetailsDisabled
              ]}>
                {type.details}
              </Text>
            )}
            <Text style={styles.engagementVersion}>Version {type.version}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [formData, toggleEngagement, disabled]);

  /**
   * Rend la liste des engagements
   */
  const renderEngagementsList = useCallback((isVoluntary: boolean = false) => {
    const acceptedCount = engagementTypes.filter(type => 
      formData[`${type.code}Accepted`]
    ).length;

    return (
      <>
        <View style={styles.engagementsContainer}>
          {engagementTypes.map(type => renderEngagementItem(type, isVoluntary))}
        </View>

        {!isVoluntary && (
          <View style={styles.engagementProgress}>
            <Text style={[
              styles.engagementProgressText,
              acceptedCount === engagementTypes.length && styles.engagementProgressTextComplete
            ]}>
              {acceptedCount === engagementTypes.length 
                ? 'Tous les engagements acceptés' 
                : `${acceptedCount}/${engagementTypes.length} engagements acceptés`
              }
            </Text>
            
            {acceptedCount < engagementTypes.length && !disabled && (
              <TouchableOpacity
                style={[
                  styles.acceptAllButton,
                  isSubmitting && styles.acceptAllButtonDisabled
                ]}
                onPress={handleAcceptAllEngagements}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.acceptAllButtonText}>
                    Accepter tous les engagements
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </>
    );
  }, [engagementTypes, formData, renderEngagementItem, handleAcceptAllEngagements, isSubmitting, disabled]);

  // Ne pas afficher si ce n'est pas un rôle Fourmiz
  if (!isFourmizRole) return null;

  // Affichage pendant le chargement
  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Engagements légaux Fourmiz</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#000000" />
          <Text style={styles.loadingText}>Chargement des engagements...</Text>
        </View>
      </View>
    );
  }

  // Gestion des erreurs
  if (hookError || error) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Engagements légaux Fourmiz</Text>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={16} color="#ff4444" />
          <Text style={styles.errorText}>
            {hookError || error || 'Erreur lors du chargement des engagements'}
          </Text>
        </View>
      </View>
    );
  }

  // Aucun engagement trouvé
  if (engagementTypes.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Engagements légaux Fourmiz</Text>
        <View style={styles.noEngagementsContainer}>
          <Text style={styles.noEngagementsText}>
            Aucun engagement légal requis pour le moment.
          </Text>
        </View>
      </View>
    );
  }

  // Message pour profils grandfathered
  if (grandfatheredStatus.isGrandfathered) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Engagements légaux Fourmiz</Text>
        
        <View style={styles.grandfatheredNotice}>
          <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
          <View style={styles.grandfatheredContent}>
            <Text style={styles.grandfatheredTitle}>Profil Fourmiz existant</Text>
            <Text style={styles.grandfatheredText}>
              Votre profil Fourmiz était déjà actif avant la mise en place des nouveaux engagements légaux. 
              Vous bénéficiez du droit acquis et n'êtes pas tenu d'accepter ces nouveaux engagements.
            </Text>
            <Text style={styles.grandfatheredSubtext}>
              Vous pouvez néanmoins les consulter et les accepter volontairement si vous le souhaitez.
            </Text>
          </View>
        </View>

        {/* Option d'acceptation volontaire */}
        <TouchableOpacity
          style={styles.voluntaryAcceptanceButton}
          onPress={() => setShowVoluntaryEngagements(!showVoluntaryEngagements)}
          activeOpacity={0.8}
          disabled={disabled}
        >
          <Text style={styles.voluntaryAcceptanceText}>
            Consulter les engagements (optionnel)
          </Text>
          <Ionicons 
            name={showVoluntaryEngagements ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#666666" 
          />
        </TouchableOpacity>

        {showVoluntaryEngagements && renderEngagementsList(true)}
      </View>
    );
  }

  // Message pour nouveaux profils (engagements obligatoires)
  if (!grandfatheredStatus.engagementsRequired) {
    return null; // Pas d'engagements requis
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Engagements légaux Fourmiz</Text>
      <Text style={styles.sectionDescription}>
        En tant que nouveau prestataire de services, vous devez accepter ces engagements obligatoires
      </Text>
      
      {(error || hookError) && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={16} color="#ff4444" />
          <Text style={styles.errorText}>{error || hookError}</Text>
        </View>
      )}

      <View style={styles.newProfileNotice}>
        <Ionicons name="information-circle" size={16} color="#2196F3" />
        <Text style={styles.newProfileNoticeText}>
          Ces engagements sont obligatoires pour tous les nouveaux profils Fourmiz.
        </Text>
      </View>

      {renderEngagementsList(false)}

      <View style={styles.legalNotice}>
        <Ionicons name="information-circle-outline" size={16} color="#666666" />
        <Text style={styles.legalNoticeText}>
          Ces engagements sont obligatoires pour exercer en tant que Fourmiz. 
          Ils garantissent la qualité du service et la protection de tous les utilisateurs.
        </Text>
      </View>
    </View>
  );
}

export default LegalEngagementsSection;
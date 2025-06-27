import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, User, Mail, Phone, MapPin, Chrome as Home, Eye, EyeOff, Shield, Search, CircleCheck as CheckCircle, Building, Gift } from 'lucide-react-native';

interface AddressSuggestion {
  id: string;
  label: string;
  address: string;
  city: string;
  postalCode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  address: string;
  city: string;
  postalCode: string;
  building: string;
  floor: string;
  intercom: string;
  additionalInfo: string;
  referralCode: string;
  acceptsTerms: boolean;
  acceptsDataProcessing: boolean;
  wantsNewsletter: boolean;
}

// Mock API pour la recherche d'adresses (remplacer par une vraie API comme l'API Adresse du gouvernement français)
const searchAddresses = async (query: string): Promise<AddressSuggestion[]> => {
  if (query.length < 3) return [];
  
  // Simulation d'un appel API
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Mock data - en production, utiliser l'API Adresse du gouvernement français
  const mockAddresses: AddressSuggestion[] = [
    {
      id: '1',
      label: '15 rue de la Paix, 75001 Paris',
      address: '15 rue de la Paix',
      city: 'Paris',
      postalCode: '75001',
      coordinates: { lat: 48.8566, lng: 2.3522 }
    },
    {
      id: '2',
      label: '42 avenue des Champs-Élysées, 75008 Paris',
      address: '42 avenue des Champs-Élysées',
      city: 'Paris',
      postalCode: '75008',
      coordinates: { lat: 48.8698, lng: 2.3076 }
    },
    {
      id: '3',
      label: '123 boulevard Saint-Germain, 75006 Paris',
      address: '123 boulevard Saint-Germain',
      city: 'Paris',
      postalCode: '75006',
      coordinates: { lat: 48.8534, lng: 2.3488 }
    },
    {
      id: '4',
      label: '89 rue de Rivoli, 75001 Paris',
      address: '89 rue de Rivoli',
      city: 'Paris',
      postalCode: '75001',
      coordinates: { lat: 48.8606, lng: 2.3376 }
    },
    {
      id: '5',
      label: '25 place Vendôme, 75001 Paris',
      address: '25 place Vendôme',
      city: 'Paris',
      postalCode: '75001',
      coordinates: { lat: 48.8677, lng: 2.3281 }
    }
  ].filter(addr => 
    addr.label.toLowerCase().includes(query.toLowerCase())
  );
  
  return mockAddresses;
};

export default function ClientRegisterScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    postalCode: '',
    building: '',
    floor: '',
    intercom: '',
    additionalInfo: '',
    referralCode: '',
    acceptsTerms: false,
    acceptsDataProcessing: false,
    wantsNewsletter: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Recherche d'adresses avec debounce
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (addressQuery.length >= 3) {
        setIsSearchingAddress(true);
        try {
          const suggestions = await searchAddresses(addressQuery);
          setAddressSuggestions(suggestions);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Erreur lors de la recherche d\'adresse:', error);
        } finally {
          setIsSearchingAddress(false);
        }
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [addressQuery]);

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    setAddressQuery(suggestion.label);
    updateFormData('address', suggestion.address);
    updateFormData('city', suggestion.city);
    updateFormData('postalCode', suggestion.postalCode);
    setShowSuggestions(false);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.firstName.trim()) newErrors.firstName = 'Prénom requis';
        if (!formData.lastName.trim()) newErrors.lastName = 'Nom requis';
        if (!formData.email.trim()) {
          newErrors.email = 'Email requis';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Email invalide';
        }
        if (!formData.phone.trim()) {
          newErrors.phone = 'Téléphone requis';
        } else if (!/^(\+33|0)[1-9](\d{8})$/.test(formData.phone.replace(/\s/g, ''))) {
          newErrors.phone = 'Numéro de téléphone invalide';
        }
        break;

      case 2:
        if (!formData.password) {
          newErrors.password = 'Mot de passe requis';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Minimum 8 caractères';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
          newErrors.password = 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre';
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
        }
        break;

      case 3:
        if (!formData.address.trim()) newErrors.address = 'Adresse requise';
        if (!formData.city.trim()) newErrors.city = 'Ville requise';
        if (!formData.postalCode.trim()) {
          newErrors.postalCode = 'Code postal requis';
        } else if (!/^\d{5}$/.test(formData.postalCode)) {
          newErrors.postalCode = 'Code postal invalide';
        }
        break;

      case 4:
        if (!formData.acceptsTerms) {
          newErrors.acceptsTerms = 'Vous devez accepter les conditions';
        }
        if (!formData.acceptsDataProcessing) {
          newErrors.acceptsDataProcessing = 'Vous devez accepter le traitement des données';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Inscription réussie !',
        `Bienvenue ${formData.firstName} ! Votre compte client a été créé avec succès. ${formData.referralCode ? 'Votre code de parrainage a été pris en compte.' : ''} Vous pouvez maintenant commander des services.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive,
            currentStep > step && styles.stepCircleCompleted
          ]}>
            {currentStep > step ? (
              <CheckCircle size={16} color="#FFFFFF" />
            ) : (
              <Text style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive
              ]}>
                {step}
              </Text>
            )}
          </View>
          {step < 4 && (
            <View style={[
              styles.stepLine,
              currentStep > step && styles.stepLineActive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Informations personnelles</Text>
      <Text style={styles.stepDescription}>
        Créez votre compte client pour accéder à tous nos services
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Prénom *</Text>
        <View style={styles.inputContainer}>
          <User size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.firstName}
            onChangeText={(text) => updateFormData('firstName', text)}
            placeholder="Votre prénom"
            placeholderTextColor="#999"
            autoComplete="given-name"
          />
        </View>
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nom *</Text>
        <View style={styles.inputContainer}>
          <User size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.lastName}
            onChangeText={(text) => updateFormData('lastName', text)}
            placeholder="Votre nom"
            placeholderTextColor="#999"
            autoComplete="family-name"
          />
        </View>
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email *</Text>
        <View style={styles.inputContainer}>
          <Mail size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => updateFormData('email', text)}
            placeholder="votre@email.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Téléphone mobile *</Text>
        <View style={styles.inputContainer}>
          <Phone size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => updateFormData('phone', text)}
            placeholder="06 12 34 56 78"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        </View>
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        <Text style={styles.helpText}>
          Votre numéro sera utilisé pour les notifications de commande
        </Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Sécurité du compte</Text>
      <Text style={styles.stepDescription}>
        Choisissez un mot de passe sécurisé pour protéger votre compte
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Mot de passe *</Text>
        <View style={styles.inputContainer}>
          <Shield size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.password}
            onChangeText={(text) => updateFormData('password', text)}
            placeholder="Minimum 8 caractères"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            autoComplete="new-password"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color="#666" />
            ) : (
              <Eye size={20} color="#666" />
            )}
          </TouchableOpacity>
        </View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirmer le mot de passe *</Text>
        <View style={styles.inputContainer}>
          <Shield size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.confirmPassword}
            onChangeText={(text) => updateFormData('confirmPassword', text)}
            placeholder="Confirmez votre mot de passe"
            placeholderTextColor="#999"
            secureTextEntry={!showConfirmPassword}
            autoComplete="new-password"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeOff size={20} color="#666" />
            ) : (
              <Eye size={20} color="#666" />
            )}
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
      </View>

      <View style={styles.passwordRequirements}>
        <Text style={styles.requirementsTitle}>Votre mot de passe doit contenir :</Text>
        <View style={styles.requirementsList}>
          <View style={styles.requirement}>
            <View style={[styles.requirementDot, formData.password.length >= 8 && styles.requirementDotValid]} />
            <Text style={[styles.requirementText, formData.password.length >= 8 && styles.requirementTextValid]}>
              Au moins 8 caractères
            </Text>
          </View>
          <View style={styles.requirement}>
            <View style={[styles.requirementDot, /[A-Z]/.test(formData.password) && styles.requirementDotValid]} />
            <Text style={[styles.requirementText, /[A-Z]/.test(formData.password) && styles.requirementTextValid]}>
              Une lettre majuscule
            </Text>
          </View>
          <View style={styles.requirement}>
            <View style={[styles.requirementDot, /[a-z]/.test(formData.password) && styles.requirementDotValid]} />
            <Text style={[styles.requirementText, /[a-z]/.test(formData.password) && styles.requirementTextValid]}>
              Une lettre minuscule
            </Text>
          </View>
          <View style={styles.requirement}>
            <View style={[styles.requirementDot, /\d/.test(formData.password) && styles.requirementDotValid]} />
            <Text style={[styles.requirementText, /\d/.test(formData.password) && styles.requirementTextValid]}>
              Un chiffre
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Adresse de livraison</Text>
      <Text style={styles.stepDescription}>
        Indiquez votre adresse principale pour la livraison de vos commandes
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Rechercher votre adresse *</Text>
        <View style={styles.addressSearchContainer}>
          <View style={styles.inputContainer}>
            <Search size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={addressQuery}
              onChangeText={setAddressQuery}
              placeholder="Tapez votre adresse..."
              placeholderTextColor="#999"
              autoComplete="street-address"
            />
            {isSearchingAddress && (
              <Text style={styles.searchingText}>...</Text>
            )}
          </View>
          
          {showSuggestions && addressSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={addressSuggestions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => handleAddressSelect(item)}
                  >
                    <MapPin size={16} color="#666" />
                    <Text style={styles.suggestionText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
                style={styles.suggestionsList}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          )}
        </View>
        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.flex2]}>
          <Text style={styles.label}>Ville *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => updateFormData('city', text)}
              placeholder="Paris"
              placeholderTextColor="#999"
              autoComplete="address-level2"
            />
          </View>
          {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
        </View>

        <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
          <Text style={styles.label}>Code postal *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={formData.postalCode}
              onChangeText={(text) => updateFormData('postalCode', text)}
              placeholder="75001"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={5}
              autoComplete="postal-code"
            />
          </View>
          {errors.postalCode && <Text style={styles.errorText}>{errors.postalCode}</Text>}
        </View>
      </View>

      <View style={styles.addressDetailsSection}>
        <Text style={styles.sectionTitle}>Détails de l'adresse</Text>
        
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Bâtiment</Text>
            <View style={styles.inputContainer}>
              <Building size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.building}
                onChangeText={(text) => updateFormData('building', text)}
                placeholder="A, B, C..."
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
            <Text style={styles.label}>Étage</Text>
            <View style={styles.inputContainer}>
              <Home size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.floor}
                onChangeText={(text) => updateFormData('floor', text)}
                placeholder="1er, 2ème..."
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Code interphone</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={formData.intercom}
              onChangeText={(text) => updateFormData('intercom', text)}
              placeholder="Code d'accès à l'immeuble"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Informations complémentaires</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.additionalInfo}
              onChangeText={(text) => updateFormData('additionalInfo', text)}
              placeholder="Porte à gauche, sonnette rouge, digicode..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>
          <Text style={styles.helpText}>
            Ces informations aideront les Fourmiz à vous trouver plus facilement
          </Text>
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Finalisation</Text>
      <Text style={styles.stepDescription}>
        Dernières étapes pour créer votre compte
      </Text>

      {/* Code de parrainage */}
      <View style={styles.referralSection}>
        <Text style={styles.sectionTitle}>Code de parrainage (optionnel)</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Code de parrainage</Text>
          <View style={styles.inputContainer}>
            <Gift size={20} color="#FF4444" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={formData.referralCode}
              onChangeText={(text) => updateFormData('referralCode', text.toUpperCase())}
              placeholder="CODE2024"
              placeholderTextColor="#999"
              autoCapitalize="characters"
            />
          </View>
          <Text style={styles.helpText}>
            Si un ami vous a recommandé Fourmiz, saisissez son code de parrainage
          </Text>
        </View>
      </View>
      
      <View style={styles.termsSection}>
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={[styles.checkbox, formData.acceptsTerms && styles.checkboxChecked]}
            onPress={() => updateFormData('acceptsTerms', !formData.acceptsTerms)}
          >
            {formData.acceptsTerms && <CheckCircle size={16} color="#FFFFFF" />}
          </TouchableOpacity>
          <Text style={styles.checkboxText}>
            J'accepte les{' '}
            <Text style={styles.link}>conditions générales d'utilisation</Text>
            {' '}et la{' '}
            <Text style={styles.link}>politique de confidentialité</Text> *
          </Text>
        </View>
        {errors.acceptsTerms && <Text style={styles.errorText}>{errors.acceptsTerms}</Text>}

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={[styles.checkbox, formData.acceptsDataProcessing && styles.checkboxChecked]}
            onPress={() => updateFormData('acceptsDataProcessing', !formData.acceptsDataProcessing)}
          >
            {formData.acceptsDataProcessing && <CheckCircle size={16} color="#FFFFFF" />}
          </TouchableOpacity>
          <Text style={styles.checkboxText}>
            J'accepte le traitement de mes données personnelles pour la fourniture des services Fourmiz *
          </Text>
        </View>
        {errors.acceptsDataProcessing && <Text style={styles.errorText}>{errors.acceptsDataProcessing}</Text>}

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={[styles.checkbox, formData.wantsNewsletter && styles.checkboxChecked]}
            onPress={() => updateFormData('wantsNewsletter', !formData.wantsNewsletter)}
          >
            {formData.wantsNewsletter && <CheckCircle size={16} color="#FFFFFF" />}
          </TouchableOpacity>
          <Text style={styles.checkboxText}>
            Je souhaite recevoir les actualités et offres Fourmiz par email
          </Text>
        </View>
      </View>

      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Récapitulatif</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Nom complet :</Text>
            <Text style={styles.summaryValue}>
              {formData.firstName} {formData.lastName}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Email :</Text>
            <Text style={styles.summaryValue}>{formData.email}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Téléphone :</Text>
            <Text style={styles.summaryValue}>{formData.phone}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Adresse :</Text>
            <Text style={styles.summaryValue}>
              {formData.address}, {formData.postalCode} {formData.city}
            </Text>
          </View>
          {(formData.building || formData.floor || formData.intercom) && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Détails :</Text>
              <Text style={styles.summaryValue}>
                {[formData.building, formData.floor, formData.intercom].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
          {formData.referralCode && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Code parrainage :</Text>
              <Text style={[styles.summaryValue, styles.referralCodeValue]}>{formData.referralCode}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => currentStep > 1 ? prevStep() : router.back()}
        >
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inscription Client</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {currentStep < 4 ? (
          <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
            <Text style={styles.nextButtonText}>Continuer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Création du compte...' : 'Créer mon compte'}
            </Text>
          </TouchableOpacity>
        )}
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#FF4444',
  },
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepNumber: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#999',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#4CAF50',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#F44336',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
    marginTop: 4,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  marginLeft: {
    marginLeft: 12,
  },
  passwordRequirements: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  requirementsList: {
    gap: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5E5',
    marginRight: 8,
  },
  requirementDotValid: {
    backgroundColor: '#4CAF50',
  },
  requirementText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  requirementTextValid: {
    color: '#4CAF50',
  },
  addressSearchContainer: {
    position: 'relative',
  },
  searchingText: {
    fontSize: 16,
    color: '#FF4444',
    marginRight: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  addressDetailsSection: {
    marginTop: 24,
  },
  referralSection: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  termsSection: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
    lineHeight: 20,
  },
  link: {
    color: '#FF4444',
    textDecorationLine: 'underline',
  },
  summarySection: {
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  referralCodeValue: {
    color: '#FF4444',
    fontFamily: 'Inter-Bold',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  nextButton: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
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
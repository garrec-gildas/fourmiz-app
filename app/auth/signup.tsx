// app/auth/signup.tsx - INSCRIPTION SÉCURISÉE + PARRAINAGE + TÉLÉPHONE FORMATÉ
// ✅ VERSION FINALE : Bouton de test supprimé + Prénom du parrain récupéré
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { ReferralService } from '../../lib/referralService';
import PhoneInput from '../../components/PhoneInput';

// 📋 Types TypeScript 
interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  referralCode: string;
}

export default function SignupScreen() {
  const validateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 📊 État LOCAL
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstname: '',
    lastname: '',
    phone: '',
    referralCode: '',
  });
  
  const [uiState, setUiState] = useState({
    loading: false,
    showPassword: false,
    showConfirmPassword: false,
    validatingReferral: false,
  });

  const [referralInfo, setReferralInfo] = useState({
    isValid: false,
    referrerId: '',
    referrerName: '',
    error: ''
  });

  const params = useLocalSearchParams();
  
  useEffect(() => {
    if (params.ref && typeof params.ref === 'string') {
      setFormData(prev => ({ ...prev, referralCode: params.ref.toUpperCase() }));
      validateReferralCodeInput(params.ref.toUpperCase());
    }
  }, [params.ref]);

  useEffect(() => {
    return () => {
      if (validateTimeoutRef.current) {
        clearTimeout(validateTimeoutRef.current);
      }
    };
  }, []);

  // 🆕 FONCTION POUR RÉCUPÉRER LE PRÉNOM DU PARRAIN
  const getReferrerInfo = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('parrain_id')
        .eq('filleul_id', userId)
        .single();

      if (error || !data) {
        console.log('Aucun parrain trouvé pour cet utilisateur');
        return null;
      }

      // Récupérer les infos du parrain
      const { data: parrainData, error: parrainError } = await supabase
        .from('profiles')
        .select('firstname, lastname')
        .eq('user_id', data.parrain_id)
        .single();

      if (parrainError || !parrainData) {
        console.log('Profil du parrain non trouvé');
        return null;
      }

      return {
        referrerName: parrainData.firstname || 'Utilisateur',
        referrerFullName: `${parrainData.firstname || ''} ${parrainData.lastname || ''}`.trim()
      };
    } catch (error) {
      console.error('Erreur récupération parrain:', error);
      return null;
    }
  };

  // 🔙 NAVIGATION RETOUR
  const handleGoBack = useCallback(() => {
    try {
      if (router.canGoBack && router.canGoBack()) {
        console.log('🔙 Navigation retour - historique disponible');
        router.back();
      } else {
        console.log('🔙 Navigation retour - pas d\'historique, retour à l\'accueil');
        router.replace('/');
      }
    } catch (error) {
      console.warn('⚠️ Erreur navigation retour:', error);
      router.replace('/');
    }
  }, []);

  // ✅ VALIDATION CODE DE PARRAINAGE
  const validateReferralCodeInput = async (code: string): Promise<void> => {
    if (!code.trim()) {
      setReferralInfo({ isValid: false, referrerId: '', referrerName: '', error: '' });
      return;
    }

    setUiState(prev => ({ ...prev, validatingReferral: true }));

    try {
      console.log('🔍 Validation code parrainage:', code);
      
      const result = await ReferralService.validateReferralCode(code);
      
      console.log('📊 Résultat validation:', result);
      
      if (result.isValid) {
        setReferralInfo({
          isValid: true,
          referrerId: result.parrainUserId || '',
          referrerName: result.referrerName || 'Utilisateur',
          error: ''
        });
        console.log('✅ Code valide, parrain:', result.referrerName);
      } else {
        setReferralInfo({ 
          isValid: false, 
          referrerId: '',
          referrerName: '',
          error: result.error || 'Code invalide'
        });
        console.log('❌ Code invalide:', result.error);
      }
    } catch (error) {
      console.error('❌ Erreur validation parrainage:', error);
      setReferralInfo({ 
        isValid: false, 
        referrerId: '',
        referrerName: '',
        error: 'Erreur de validation' 
      });
    } finally {
      setUiState(prev => ({ ...prev, validatingReferral: false }));
    }
  };

  // ✅ VALIDATION DU FORMULAIRE
  const validateForm = (): { isValid: boolean; error?: string } => {
    if (!formData.email.trim()) {
      return { isValid: false, error: 'L\'email est requis' };
    }

    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      return { isValid: false, error: 'Format d\'email invalide' };
    }

    if (!formData.password) {
      return { isValid: false, error: 'Le mot de passe est requis' };
    }

    if (formData.password.length < 6) {
      return { isValid: false, error: 'Le mot de passe doit contenir au moins 6 caractères' };
    }

    if (formData.password !== formData.confirmPassword) {
      return { isValid: false, error: 'Les mots de passe ne correspondent pas' };
    }

    // Validation téléphone
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^0[1-9]\d{8}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        return { isValid: false, error: 'Format de téléphone invalide' };
      }
    }

    // Validation code parrainage
    if (formData.referralCode.trim() && !referralInfo.isValid) {
      return { isValid: false, error: 'Code de parrainage invalide' };
    }

    return { isValid: true };
  };

  // 🚀 FONCTION D'INSCRIPTION PRINCIPALE
  const handleSignup = async (): Promise<void> => {
    // Validation
    const validation = validateForm();
    if (!validation.isValid) {
      Alert.alert('Erreur de validation', validation.error);
      return;
    }

    console.log('🚀 === DÉBUT INSCRIPTION UTILISATEUR ===');
    console.log('📧 Email:', formData.email.trim());
    console.log('📞 Téléphone:', formData.phone?.trim() || 'Non renseigné');
    console.log('🎯 Code parrainage:', formData.referralCode.trim() || 'Aucun');

    setUiState(prev => ({ ...prev, loading: true }));

    try {
      // 🔐 INSCRIPTION SUPABASE
      console.log('🔐 Création du compte...');
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            firstname: formData.firstname?.trim() || '',
            lastname: formData.lastname?.trim() || '',
            phone: formData.phone?.trim() || '',
          }
        }
      });

      if (signUpError) {
        console.error('❌ Erreur inscription:', signUpError);
        const { userMessage } = handleSupabaseError ? handleSupabaseError(signUpError, 'Inscription') : { userMessage: signUpError.message };
        throw new Error(userMessage);
      }

      if (!signUpData.user) {
        throw new Error('Impossible de créer le compte utilisateur');
      }

      console.log('✅ Compte créé avec succès:', signUpData.user.id);

      // 🎯 PARRAINAGE
      if (formData.referralCode.trim() && referralInfo.isValid && referralInfo.referrerId) {
        console.log('🎯 Application du parrainage...');
        
        try {
          const referralApplied = await ReferralService.applyReferral(
            signUpData.user.id, 
            formData.referralCode.trim()
          );
          
          if (referralApplied.success) {
            console.log('✅ Parrainage appliqué avec succès');
          } else {
            console.warn('⚠️ Erreur application parrainage:', referralApplied.error);
          }
        } catch (error) {
          console.error('❌ Erreur parrainage:', error);
          // Ne pas faire échouer l'inscription pour ça
        }
      }

      // 🎯 GESTION SELON LE TYPE DE CONFIRMATION
      if (signUpData.session) {
        // Connexion automatique
        console.log('🎯 Connexion automatique, redirection...');
        
        const hasReferrer = formData.referralCode.trim() && referralInfo.isValid;
        
        // 🆕 RÉCUPÉRER LE PRÉNOM RÉEL DU PARRAIN DEPUIS LA BASE
        let actualReferrerName = referralInfo.referrerName;
        if (hasReferrer) {
          try {
            const referrerData = await getReferrerInfo(signUpData.user.id);
            if (referrerData && referrerData.referrerName !== 'Utilisateur') {
              actualReferrerName = referrerData.referrerName;
            }
          } catch (error) {
            console.error('Erreur récupération nom parrain:', error);
            // Garder le nom du validation si erreur
          }
        }
        
        let message = hasReferrer && actualReferrerName && actualReferrerName !== 'Utilisateur'
          ? `Bienvenue ! 🎉\n\nVotre Parrain ${actualReferrerName} vous souhaite la bienvenue.`
          : `Bienvenue sur Fourmiz ! 🎉`;

        message += `\n\nComplétez votre profil pour accéder à l'application.`;
        
        Alert.alert('Compte créé !', message, [{ 
          text: 'Compléter mon profil', 
          onPress: () => router.replace('/auth/complete-profile') 
        }]);
      } else {
        // Confirmation email requise
        console.log('📧 Confirmation email requise');
        
        let message = `Un email de confirmation a été envoyé à ${formData.email}. Cliquez sur le lien pour activer votre compte.`;
        
        if (formData.referralCode.trim() && referralInfo.isValid && referralInfo.referrerName && referralInfo.referrerName !== 'Utilisateur') {
          message += `\n\n🎯 Parrainage par ${referralInfo.referrerName} enregistré !`;
        }
        
        Alert.alert('📧 Vérifiez votre email', message, [{ 
          text: 'Compris', 
          onPress: () => router.replace('/auth/login') 
        }]);
      }

    } catch (error: any) {
      console.error('❌ ERREUR INSCRIPTION COMPLÈTE:', error);
      
      // Messages d'erreur personnalisés
      let title = 'Erreur d\'inscription';
      let message = error.message || 'Impossible de créer le compte';

      if (error.message?.includes('User already registered')) {
        title = 'Compte existant';
        message = 'Un compte existe déjà avec cet email. Essayez de vous connecter.';
      } else if (error.message?.includes('Password should be at least')) {
        title = 'Mot de passe trop faible';
        message = 'Votre mot de passe doit être plus sécurisé (au moins 6 caractères).';
      } else if (error.message?.includes('Invalid email')) {
        title = 'Email invalide';
        message = 'Veuillez saisir une adresse email valide.';
      } else if (error.message?.includes('signup_disabled')) {
        title = 'Inscription fermée';
        message = 'Les inscriptions sont temporairement fermées.';
      }

      Alert.alert(title, message, [
        { text: 'OK' },
        ...(title === 'Compte existant' ? [
          { 
            text: 'Se connecter', 
            onPress: () => router.replace('/auth/login')
          }
        ] : [])
      ]);

    } finally {
      setUiState(prev => ({ ...prev, loading: false }));
      console.log('🏁 Fin processus d\'inscription');
    }
  };

  // 🔄 FONCTION UPDATE FORM DATA
  const updateFormData = (field: keyof SignupFormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'referralCode') {
      if (validateTimeoutRef.current) {
        clearTimeout(validateTimeoutRef.current);
      }
      
      const cleanCode = value.trim().toUpperCase();
      
      if (cleanCode.length === 0) {
        setReferralInfo({ isValid: false, referrerId: '', referrerName: '', error: '' });
        return;
      }
      
      if (cleanCode.length < 6) {
        setReferralInfo({ isValid: false, referrerId: '', referrerName: '', error: '' });
        return;
      }
      
      if (cleanCode.length === 6) {
        validateTimeoutRef.current = setTimeout(() => {
          validateReferralCodeInput(cleanCode);
        }, 300);
      }
    }
  };

  const updateUiState = (updates: Partial<typeof uiState>): void => {
    setUiState(prev => ({ ...prev, ...updates }));
  };

  // 🗑️ EFFACER LES CHAMPS
  const handleClearFields = (): void => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      firstname: '',
      lastname: '',
      phone: '',
      referralCode: '',
    });
    setReferralInfo({ isValid: false, referrerId: '', referrerName: '', error: '' });
  };

  // 🎨 RENDU PRINCIPAL
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Bouton retour */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleGoBack}
              disabled={uiState.loading}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#FF3C38" />
              <Text style={styles.backText}>Retour</Text>
            </TouchableOpacity>
          </View>

          {/* Section Logo */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/logo-fourmiz.gif')}
              style={styles.logo}
              onError={() => console.log('❌ Erreur chargement logo signup')}
            />
            <Text style={styles.appName}>Fourmiz</Text>
            <Text style={styles.welcome}>Créer un compte</Text>
          </View>

          {/* Champs de nom */}
          <View style={styles.nameContainer}>
            <View style={styles.nameInput}>
              <TextInput 
                style={styles.input}
                placeholder="Prénom"
                placeholderTextColor="#999"
                value={formData.firstname}
                onChangeText={(text) => updateFormData('firstname', text)}
                autoCapitalize="words"
                textContentType="givenName"
                editable={!uiState.loading}
                maxLength={50}
              />
            </View>
            <View style={styles.nameInput}>
              <TextInput 
                style={styles.input}
                placeholder="Nom"
                placeholderTextColor="#999"
                value={formData.lastname}
                onChangeText={(text) => updateFormData('lastname', text)}
                autoCapitalize="words"
                textContentType="familyName"
                editable={!uiState.loading}
                maxLength={50}
              />
            </View>
          </View>

          {/* Champ Email */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.input}
              placeholder="Email *"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={(text) => updateFormData('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
              autoComplete="email"
              editable={!uiState.loading}
              maxLength={100}
            />
            {formData.email.length > 0 && (
              <TouchableOpacity
                onPress={() => updateFormData('email', '')}
                style={styles.clearInputButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* Champ téléphone */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.input}
              placeholder="Téléphone"
              placeholderTextColor="#999"
              value={formData.phone || ''}
              onChangeText={(phone) => updateFormData('phone', phone)}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              editable={!uiState.loading}
              maxLength={15}
            />
            {formData.phone && formData.phone.length > 0 && (
              <TouchableOpacity
                onPress={() => updateFormData('phone', '')}
                style={styles.clearInputButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* Code de parrainage */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={[
                styles.input,
                referralInfo.isValid ? styles.inputValid : 
                (formData.referralCode.trim().length === 6 && !uiState.validatingReferral && !referralInfo.isValid) ? styles.inputError : {}
              ]}
              placeholder="Code de parrainage (optionnel)"
              placeholderTextColor="#999"
              value={formData.referralCode}
              onChangeText={(text) => updateFormData('referralCode', text.toUpperCase())}
              autoCapitalize="characters"
              editable={!uiState.loading}
              maxLength={6}
            />
            
            <View style={styles.referralStatus}>
              {uiState.validatingReferral && (
                <ActivityIndicator size="small" color="#FF3C38" />
              )}
              {!uiState.validatingReferral && formData.referralCode.trim().length === 6 && (
                <Ionicons 
                  name={referralInfo.isValid ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={referralInfo.isValid ? "#28a745" : "#dc3545"} 
                />
              )}
            </View>
          </View>

          {/* Message validation code */}
          {formData.referralCode.trim().length === 6 && !uiState.validatingReferral && (
            <View style={[
              styles.referralMessage,
              referralInfo.isValid ? styles.referralSuccess : styles.referralError
            ]}>
              <Ionicons 
                name={referralInfo.isValid ? "checkmark-circle" : "warning"} 
                size={16} 
                color={referralInfo.isValid ? "#28a745" : "#dc3545"} 
              />
              <Text style={[
                styles.referralMessageText,
                { color: referralInfo.isValid ? "#28a745" : "#dc3545" }
              ]}>
                {referralInfo.isValid 
                  ? `Code valide - Votre Parrain ${referralInfo.referrerName}`
                  : (referralInfo.error || 'Code invalide')
                }
              </Text>
            </View>
          )}

          {/* Champ Mot de passe */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.input}
              placeholder="Mot de passe * (min. 6 caractères)"
              placeholderTextColor="#999"
              value={formData.password}
              onChangeText={(text) => updateFormData('password', text)}
              secureTextEntry={!uiState.showPassword}
              textContentType="newPassword"
              editable={!uiState.loading}
              maxLength={128}
            />
            <TouchableOpacity
              onPress={() => updateUiState({ showPassword: !uiState.showPassword })}
              style={styles.eyeButton}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={uiState.showPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          {/* Confirmation mot de passe */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.input}
              placeholder="Confirmer le mot de passe *"
              placeholderTextColor="#999"
              value={formData.confirmPassword}
              onChangeText={(text) => updateFormData('confirmPassword', text)}
              secureTextEntry={!uiState.showConfirmPassword}
              textContentType="newPassword"
              editable={!uiState.loading}
              maxLength={128}
            />
            <TouchableOpacity
              onPress={() => updateUiState({ showConfirmPassword: !uiState.showConfirmPassword })}
              style={styles.eyeButton}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={uiState.showConfirmPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          {/* Bouton d'inscription */}
          <TouchableOpacity 
            style={[styles.signupButton, uiState.loading && styles.buttonDisabled]} 
            onPress={handleSignup} 
            disabled={uiState.loading}
            activeOpacity={0.8}
          >
            {uiState.loading ? (
              <View style={styles.loadingButtonContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loadingButtonText}>Création...</Text>
              </View>
            ) : (
              <Text style={styles.signupButtonText}>Créer mon compte</Text>
            )}
          </TouchableOpacity>

          {/* Bouton d'effacement */}
          {(formData.email || formData.password || formData.firstname || formData.lastname || formData.phone || formData.referralCode) && (
            <TouchableOpacity 
              onPress={handleClearFields}
              style={styles.clearButton}
              disabled={uiState.loading}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={16} color="#666" />
              <Text style={styles.clearButtonText}>Effacer les champs</Text>
            </TouchableOpacity>
          )}

          {/* Lien vers connexion */}
          <TouchableOpacity 
            onPress={() => router.replace('/auth/login')} 
            style={styles.link}
            disabled={uiState.loading}
            activeOpacity={0.8}
          >
            <Text style={styles.linkText}>Déjà inscrit ? Se connecter</Text>
          </TouchableOpacity>

          {/* Info parrainage */}
          <View style={styles.referralInfo}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.referralInfoText}>
              Saisissez le code de parrainage d'un ami pour recevoir des bonus !
            </Text>
          </View>

          {/* Conditions d'utilisation */}
          <View style={styles.termsContainer}>
            <Ionicons name="document-text" size={16} color="#666" />
            <Text style={styles.termsText}>
              En créant un compte, vous acceptez nos{' '}
              <Text style={styles.termsLink}>conditions d'utilisation</Text>
              {' '}et notre{' '}
              <Text style={styles.termsLink}>politique de confidentialité</Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    padding: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 6,
  },
  backText: {
    fontSize: 16,
    color: '#FF3C38',
    fontWeight: '500',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
    borderRadius: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  welcome: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  nameContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  nameInput: {
    flex: 1,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    paddingRight: 45,
    borderRadius: 12,
    backgroundColor: '#fafafa',
    fontSize: 16,
    color: '#333',
  },
  clearInputButton: {
    position: 'absolute',
    right: 12,
    top: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 16,
  },
  signupButton: {
    backgroundColor: '#FF3C38',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  signupButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 6,
  },
  clearButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  link: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  linkText: {
    color: '#555',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    flex: 1,
  },
  termsLink: {
    color: '#FF3C38',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  inputValid: {
    borderColor: '#28a745',
    backgroundColor: '#f8fff9',
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff8f8',
  },
  referralStatus: {
    position: 'absolute',
    right: 12,
    top: 16,
  },
  referralMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  referralSuccess: {
    backgroundColor: '#f8fff9',
    borderWidth: 1,
    borderColor: '#28a745',
  },
  referralError: {
    backgroundColor: '#fff8f8',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  referralMessageText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  referralInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  referralInfoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    flex: 1,
  },
});
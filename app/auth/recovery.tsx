// app/auth/recovery.tsx - RÉCUPÉRATION MOT DE PASSE ULTRA-AMÉLIORÉE
// 🔧 Version optimisée avec helpers Supabase, validation robuste et UX améliorée

import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  supabase,
  handleSupabaseError,
} from '../../lib/supabase';

// 📝 TYPES TYPESCRIPT STRICTS
interface RecoveryFormData {
  email: string;
}

interface FormErrors {
  email?: string;
}

interface RecoveryState {
  loading: boolean;
  emailSent: boolean;
  canResend: boolean;
  countdown: number;
}

export default function RecoveryScreen() {
  // 📊 ÉTAT LOCAL TYPÉ
  const [formData, setFormData] = useState<RecoveryFormData>({
    email: ''
  });

  const [uiState, setUiState] = useState<RecoveryState>({
    loading: false,
    emailSent: false,
    canResend: true,
    countdown: 0
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // ✅ VALIDATION EMAIL ROBUSTE
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim().toLowerCase());
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Validation email
    if (!formData.email.trim()) {
      newErrors.email = 'L\'adresse email est requise';
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // ⏱️ GESTION DU COUNTDOWN ANTI-SPAM
  const startCountdown = (): void => {
    const COUNTDOWN_DURATION = 60; // 60 secondes
    setUiState(prev => ({ 
      ...prev, 
      canResend: false, 
      countdown: COUNTDOWN_DURATION 
    }));

    const interval = setInterval(() => {
      setUiState(prev => {
        if (prev.countdown <= 1) {
          clearInterval(interval);
          return { ...prev, canResend: true, countdown: 0 };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
  };

  // 🔐 FONCTION DE RÉCUPÉRATION PRINCIPALE
  const handlePasswordReset = async (): Promise<void> => {
    if (!validateForm()) {
      Alert.alert('Formulaire incomplet', 'Veuillez corriger les erreurs avant de continuer');
      return;
    }

    console.log('🔐 === DÉBUT RÉCUPÉRATION MOT DE PASSE ===');
    console.log('📧 Email:', formData.email.trim());

    setUiState(prev => ({ ...prev, loading: true }));

    try {
      // Construire l'URL de redirection dynamiquement 
      const redirectUrl = `${process.env.EXPO_PUBLIC_APP_URL || 'exp://127.0.0.1:8081'}/auth/recovery-redirect`;
      
      console.log('📤 Envoi de l\'email de récupération...');
      console.log('🔗 URL de redirection:', redirectUrl);

      // Envoyer l'email de récupération avec notre config Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(
        formData.email.trim().toLowerCase(),
        {
          redirectTo: redirectUrl,
        }
      );

      if (error) {
        console.error('❌ Erreur envoi email récupération:', error);
        const { userMessage } = handleSupabaseError(error, 'Récupération mot de passe');
        throw new Error(userMessage);
      }

      console.log('✅ Email de récupération envoyé avec succès');

      // Mettre à jour l'état pour afficher le message de succès
      setUiState(prev => ({ 
        ...prev, 
        emailSent: true 
      }));

      // Démarrer le countdown anti-spam
      startCountdown();

      // Message de succès
      Alert.alert(
        '📧 Email envoyé !',
        `Un email de réinitialisation a été envoyé à ${formData.email}.\n\nVérifiez votre boîte mail et suivez les instructions.`,
        [
          { 
            text: 'Ouvrir ma boîte mail', 
            onPress: () => {
              // On peut ajouter une logique pour ouvrir l'app mail
              console.log('Ouverture de l\'app mail...');
            }
          },
          { text: 'OK' }
        ]
      );

    } catch (error: any) {
      console.error('❌ ERREUR RÉCUPÉRATION MOT DE PASSE:', error);
      
      // Messages d'erreur personnalisés
      let title = 'Erreur d\'envoi';
      let message = error.message || 'Impossible d\'envoyer l\'email de récupération';

      if (error.message?.includes('User not found')) {
        title = 'Email non trouvé';
        message = 'Aucun compte n\'est associé à cette adresse email. Vérifiez l\'adresse saisie ou créez un compte.';
      } else if (error.message?.includes('Email rate limit exceeded')) {
        title = 'Trop d\'envois';
        message = 'Vous avez demandé trop d\'emails récemment. Attendez quelques minutes avant de réessayer.';
      } else if (error.message?.includes('Invalid email')) {
        title = 'Email invalide';
        message = 'Le format de l\'adresse email n\'est pas valide.';
      }

      Alert.alert(title, message, [
        { text: 'OK' },
        ...(title === 'Email non trouvé' ? [
          { 
            text: 'Créer un compte', 
            onPress: () => router.push('/auth/signup')
          }
        ] : [])
      ]);

    } finally {
      setUiState(prev => ({ ...prev, loading: false }));
      console.log('🏁 Fin processus récupération mot de passe');
    }
  };

  // 🔄 RENVOYER L'EMAIL
  const handleResendEmail = async (): Promise<void> => {
    if (!uiState.canResend) return;
    
    // Réutiliser la même logique d'envoi
    await handlePasswordReset();
  };

  // 📝 HELPER DE MISE À JOUR
  const updateFormData = (field: keyof RecoveryFormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // 🎨 RENDU PRINCIPAL
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 🏠 Section Logo et titre */}
          <View style={styles.headerSection}>
            <Image
              source={require('../../assets/logo-fourmiz.gif')}
              style={styles.logo}
              onError={() => console.log('❌ Erreur chargement logo recovery')}
            />
            <Text style={styles.title}>Mot de passe oublié ?</Text>
            <Text style={styles.subtitle}>
              Pas de souci ! Saisissez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </Text>
          </View>

          {/* 📧 Champ Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Adresse email *</Text>
            <TextInput 
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Saisissez votre email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              value={formData.email}
              onChangeText={(text) => updateFormData('email', text)}
              editable={!uiState.loading}
              maxLength={100}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* 📤 Bouton d'envoi */}
          <TouchableOpacity
            style={[styles.sendButton, uiState.loading && styles.sendButtonDisabled]}
            onPress={handlePasswordReset}
            disabled={uiState.loading}
            activeOpacity={0.8}
          >
            {uiState.loading ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loadingText}>Envoi en cours...</Text>
              </View>
            ) : (
              <Text style={styles.sendButtonText}>Envoyer le lien de récupération</Text>
            )}
          </TouchableOpacity>

          {/* ✅ Message de succès */}
          {uiState.emailSent && (
            <View style={styles.successContainer}>
              <View style={styles.successContent}>
                <Ionicons name="checkmark-circle" size={24} color="#28A745" />
                <Text style={styles.successTitle}>Email envoyé !</Text>
                <Text style={styles.successText}>
                  Vérifiez votre boîte mail ({formData.email}) et cliquez sur le lien pour réinitialiser votre mot de passe.
                </Text>
              </View>

              {/* 🔄 Bouton de renvoi */}
              {uiState.canResend ? (
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendEmail}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={16} color="#666" />
                  <Text style={styles.resendButtonText}>Renvoyer l'email</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.countdownContainer}>
                  <Ionicons name="time" size={16} color="#999" />
                  <Text style={styles.countdownText}>
                    Nouveau renvoi possible dans {uiState.countdown}s
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 💡 Aide et informations */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>💡 Conseils :</Text>
            <Text style={styles.helpText}>
              • Vérifiez vos spams si vous ne recevez pas l'email{'\n'}
              • L'email peut prendre quelques minutes à arriver{'\n'}
              • Le lien expire après 24 heures pour votre sécurité
            </Text>
          </View>

          {/* 🔗 Liens de navigation */}
          <View style={styles.linksContainer}>
            <TouchableOpacity 
              onPress={() => router.replace('/auth/signin')} 
              style={styles.link}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={16} color="#555" />
              <Text style={styles.linkText}>Retour à la connexion</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push('/auth/signup')} 
              style={styles.link}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={16} color="#555" />
              <Text style={styles.linkText}>Créer un compte</Text>
            </TouchableOpacity>
          </View>

          {/* 🛡️ Information sécurité */}
          <View style={styles.securityInfo}>
            <Ionicons name="shield-checkmark" size={16} color="#28A745" />
            <Text style={styles.securityText}>
              Vos données sont protégées. Le lien de récupération est sécurisé et à usage unique.
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
  content: {
    padding: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },

  // 🏠 Section header
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
    borderRadius: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3C38',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },

  // 📧 Champ de saisie
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  inputError: {
    borderColor: '#FF3C38',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3C38',
    marginTop: 4,
    marginLeft: 4,
  },

  // 📤 Bouton d'envoi
  sendButton: {
    backgroundColor: '#FF3C38',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // ✅ Message de succès
  successContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  successContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28A745',
    marginTop: 8,
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  resendButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  countdownText: {
    fontSize: 12,
    color: '#999',
  },

  // 💡 Aide
  helpContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },

  // 🔗 Liens
  linksContainer: {
    gap: 12,
    marginBottom: 20,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  linkText: {
    color: '#555',
    fontSize: 14,
    textDecorationLine: 'underline',
  },

  // 🛡️ Sécurité
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    flex: 1,
    lineHeight: 16,
  },
});
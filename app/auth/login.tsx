// app/auth/login.tsx - VERSION FINALE QUI FONCTIONNE
import React, { useState, useEffect, useCallback } from 'react';
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
  Switch,
} from 'react-native';
import { supabase, handleSupabaseError } from '../../lib/supabase';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// ✅ CONSTANTES DE STOCKAGE SÉCURISÉ
const STORAGE_KEYS = {
  EMAIL: 'saved_email',
  REMEMBER_ME: 'remember_me',
};

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [credentialsLoading, setCredentialsLoading] = useState(true);

  // ✅ NAVIGATION RETOUR SÉCURISÉE
  const handleGoBack = useCallback(() => {
    try {
      if (router.canGoBack && router.canGoBack()) {
        console.log('📱 Navigation retour - historique disponible');
        router.back();
      } else {
        console.log('📱 Navigation retour - pas d\'historique, retour à l\'accueil');
        router.replace('/');
      }
    } catch (error) {
      console.warn('⚠️ Erreur navigation retour:', error);
      router.replace('/');
    }
  }, []);

  // ✅ CHARGEMENT SÉCURISÉ (EMAIL SEULEMENT)
  const loadSavedCredentials = useCallback(async () => {
    try {
      setCredentialsLoading(true);
      
      const savedRememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
      const shouldRemember = savedRememberMe === 'true';
      setRememberMe(shouldRemember);

      if (shouldRemember) {
        const savedEmail = await AsyncStorage.getItem(STORAGE_KEYS.EMAIL);
        if (savedEmail) {
          setEmail(savedEmail);
          console.log('✅ Email restauré:', savedEmail);
        }
      }
      
      console.log('✅ Préférences chargées');
    } catch (error) {
      console.error('❌ Erreur chargement préférences:', error);
    } finally {
      setCredentialsLoading(false);
    }
  }, []);

  // ✅ SAUVEGARDE SÉCURISÉE (EMAIL SEULEMENT)
  const saveCredentials = useCallback(async (email: string, remember: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, remember.toString());

      if (remember && email.trim()) {
        await AsyncStorage.setItem(STORAGE_KEYS.EMAIL, email.trim());
        console.log('✅ Email sauvegardé');
      } else {
        await clearSavedCredentials();
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
    }
  }, []);

  // ✅ EFFACEMENT SÉCURISÉ
  const clearSavedCredentials = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.EMAIL);
      console.log('✅ Données effacées');
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
    }
  }, []);

  // Charger au démarrage
  useEffect(() => {
    loadSavedCredentials();
  }, [loadSavedCredentials]);

  // ✅ FONCTION DE CONNEXION QUI FONCTIONNE VRAIMENT
  const handleLogin = async () => {
    // Validation
    if (!email.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir votre email');
      return;
    }

    if (!password) {
      Alert.alert('Champ requis', 'Veuillez saisir votre mot de passe');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔐 === DÉBUT CONNEXION UTILISATEUR ===');
      console.log('📧 Email:', email.trim());
      
      // ✅ VRAIE CONNEXION SUPABASE - PAS DE MESSAGE "À IMPLÉMENTER" !
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim().toLowerCase(), 
        password: password 
      });
      
      if (error) {
        console.error('❌ Erreur auth:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('Impossible de récupérer les informations utilisateur');
      }

      console.log('✅ Connexion réussie, vérification session...');
      
      // ✅ VÉRIFICATION SESSION
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.error('❌ Erreur session:', sessionError);
        throw sessionError || new Error('Session utilisateur invalide');
      }

      console.log('👤 Recherche profil utilisateur...');
      
      // ✅ RÉCUPÉRATION PROFIL
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, roles, profile_completed, firstname')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('❌ Erreur profil:', profileError);
        
        if (profileError.code === 'PGRST116') {
          console.log('ℹ️ Aucun profil trouvé, redirection vers complétion...');
          router.replace('/auth/complete-profile');
          return;
        }
        
        throw profileError;
      }
      
      if (!profileData) {
        console.log('ℹ️ Pas de profil trouvé, redirection vers complete-profile');
        router.replace('/auth/complete-profile');
        return;
      }

      console.log('✅ Profil trouvé:', {
        id: profileData.id,
        roles: profileData.roles,
        completed: profileData.profile_completed
      });
      
      // ✅ SAUVEGARDE RÔLE
      const defaultRole = profileData.roles?.[0];
      if (defaultRole) {
        console.log('💾 Sauvegarde statut par défaut:', defaultRole);
        await AsyncStorage.setItem('savedRole', defaultRole);
      }

      // ✅ SAUVEGARDER PRÉFÉRENCES
      await saveCredentials(email.trim(), rememberMe);

      // ✅ REDIRECTIONS QUI FONCTIONNENT VRAIMENT
      if (profileData.profile_completed) {
        console.log('🏠 Profil complet, redirection vers accueil');
        
        Alert.alert(
          '🎉 Connexion réussie !',
          `Bienvenue ${profileData.firstname || 'sur Fourmiz'} !`,
          [{ text: 'Continuer', onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        console.log('📝 Profil incomplet, redirection vers complete-profile');
        
        Alert.alert(
          'Profil à compléter',
          'Merci de compléter votre profil pour continuer',
          [{ text: 'Compléter', onPress: () => router.replace('/auth/complete-profile') }]
        );
      }
      
    } catch (err: any) {
      console.error('💥 ERREUR CONNEXION COMPLÈTE:', err);
      
      // ✅ MESSAGES D'ERREUR PERSONNALISÉS
      let title = 'Erreur de connexion';
      let message = err.message || 'Impossible de se connecter';

      if (err.message?.includes('Invalid login credentials')) {
        title = 'Identifiants incorrects';
        message = 'Email ou mot de passe incorrect. Vérifiez vos informations.';
      } else if (err.message?.includes('Email not confirmed')) {
        title = 'Email non confirmé';
        message = 'Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte mail.';
      } else if (err.message?.includes('Too many requests')) {
        title = 'Trop de tentatives';
        message = 'Trop de tentatives de connexion. Attendez quelques minutes avant de réessayer.';
      } else if (err.message?.includes('Network request failed')) {
        title = 'Problème de connexion';
        message = 'Vérifiez votre connexion internet et réessayez.';
      }

      Alert.alert(title, message, [
        { text: 'OK' },
        ...(title === 'Email non confirmé' ? [
          { 
            text: 'Renvoyer l\'email', 
            onPress: async () => {
              try {
                await supabase.auth.resend({
                  type: 'signup',
                  email: email.trim().toLowerCase()
                });
                Alert.alert('Email envoyé', 'Un nouvel email de confirmation a été envoyé.');
              } catch (resendError) {
                console.error('❌ Erreur renvoi email:', resendError);
              }
            }
          }
        ] : [])
      ]);

    } finally {
      setLoading(false);
      console.log('🏁 Fin processus de connexion');
    }
  };

  // ✅ EFFACEMENT COMPLET
  const handleClearFields = async () => {
    setEmail('');
    setPassword('');
    setRememberMe(false);
    await clearSavedCredentials();
    await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'false');
    console.log('✅ Champs et données effacés');
  };

  if (credentialsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF3C38" />
          <Text style={styles.loadingText}>Initialisation...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          {/* ✅ BOUTON RETOUR SÉCURISÉ */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleGoBack}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#FF3C38" />
              <Text style={styles.backText}>Retour</Text>
            </TouchableOpacity>
          </View>

          {/* Logo et titre */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/logo-fourmiz.gif')}
              style={styles.logo}
              onError={() => console.log('❌ Erreur chargement logo login')}
            />
            <Text style={styles.appName}>Fourmiz</Text>
            <Text style={styles.welcome}>Connexion</Text>
          </View>
          
          {/* Champ Email */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email *"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
              autoComplete="email"
              editable={!loading}
              maxLength={100}
            />
            {email.length > 0 && (
              <TouchableOpacity
                onPress={() => setEmail('')}
                style={styles.clearInputButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Champ Mot de passe */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Mot de passe *"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textContentType="password"
              autoComplete="password"
              editable={!loading}
              maxLength={128}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          {/* Option "Se souvenir de moi" */}
          <View style={styles.rememberMeContainer}>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: '#ccc', true: '#FF3C38' }}
              thumbColor={rememberMe ? '#fff' : '#f4f3f4'}
              disabled={loading}
            />
            <Text style={styles.rememberMeText}>Se souvenir de mon email</Text>
          </View>
          
          {/* Bouton de connexion */}
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin} 
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingButtonContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loadingButtonText}>Connexion...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          {/* Bouton d'effacement */}
          {(email || password) && (
            <TouchableOpacity 
              onPress={handleClearFields}
              style={styles.clearButton}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={16} color="#666" />
              <Text style={styles.clearButtonText}>Effacer les champs</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            onPress={() => router.push('/auth/signup')} 
            style={styles.link}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.linkText}>Pas encore inscrit ? Créer un compte</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/auth/recovery')} 
            style={styles.link}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.linkText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          {/* Information sécurité */}
          <View style={styles.securityInfo}>
            <Ionicons name="shield-checkmark" size={16} color="#28a745" />
            <Text style={styles.securityText}>
              Seul votre email est mémorisé localement pour votre sécurité
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  scroll: { 
    padding: 20, 
    justifyContent: 'center', 
    flexGrow: 1 
  },

  // Header avec bouton retour
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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

  // Champs de saisie
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

  // Option "Se souvenir de moi"
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  rememberMeText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  // Boutons
  button: {
    backgroundColor: '#FF3C38', 
    padding: 16, 
    borderRadius: 12,
    alignItems: 'center', 
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: { 
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
    marginBottom: 12,
    paddingVertical: 8,
  },
  linkText: { 
    color: '#555', 
    textDecorationLine: 'underline',
    fontSize: 14,
  },

  // Sécurité
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginTop: 8,
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    flex: 1,
  },
});
// app/auth/signup.tsx - INSCRIPTION SÉCURISÉE + PARRAINAGE + VALIDATION TÉLÉPHONE UNIQUE + RÉACTIVATION COMPTE
// ✅ VERSION FINALE : Validation unicité téléphone + Messages d'erreur clairs + Vérification post-création + Réactivation compte existant
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

interface VerificationResult {
  success: boolean;
  profile?: any;
  referral?: any;
  error?: string;
  details?: string;
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

  // 🆕 FONCTION DE VÉRIFICATION POST-CRÉATION
  const verifyUserCreation = async (userId: string, email: string, hasReferral: boolean): Promise<VerificationResult> => {
    try {
      console.log('🔍 === DÉBUT VÉRIFICATION POST-CRÉATION ===');
      console.log('👤 User ID:', userId);
      console.log('📧 Email:', email);
      console.log('🎯 Parrainage attendu:', hasReferral);
      
      // Attendre un peu pour laisser les triggers se déclencher
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 1. Vérifier le profil utilisateur
      console.log('🔍 Vérification du profil...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, firstname, lastname, email, phone, created_at')
        .eq('user_id', userId)
        .single();
        
      if (profileError) {
        console.error('❌ ERREUR PROFIL:', profileError);
        return { 
          success: false, 
          error: 'Profil non créé', 
          details: profileError.message 
        };
      }
      
      if (!profile) {
        console.error('❌ PROFIL MANQUANT pour utilisateur:', userId);
        return { 
          success: false, 
          error: 'Profil introuvable',
          details: 'Aucune entrée trouvée dans la table profiles'
        };
      }
      
      console.log('✅ Profil trouvé:', {
        user_id: profile.user_id,
        firstname: profile.firstname,
        lastname: profile.lastname,
        email: profile.email,
        phone: profile.phone
      });
      
      // 2. Vérifier le parrainage si attendu
      let referralData = null;
      if (hasReferral) {
        console.log('🔍 Vérification du parrainage...');
        const { data: referral, error: referralError } = await supabase
          .from('referrals')
          .select(`
            parrain_id,
            filleul_id,
            created_at,
            parrain_profile:profiles!referrals_parrain_id_fkey(firstname, lastname)
          `)
          .eq('filleul_id', userId)
          .single();
          
        if (referralError) {
          console.warn('⚠️ Parrainage non trouvé:', referralError);
          return { 
            success: true, 
            profile,
            error: 'Parrainage non appliqué',
            details: referralError.message
          };
        } else {
          console.log('✅ Parrainage trouvé:', referral);
          referralData = referral;
        }
      }
      
      // 3. Vérification de cohérence des données
      const dataIntegrityChecks = [];
      
      // Vérifier que l'email correspond
      if (profile.email !== email.trim().toLowerCase()) {
        dataIntegrityChecks.push(`Email incohérent: attendu ${email}, trouvé ${profile.email}`);
      }
      
      // Vérifier que les champs requis sont présents
      if (!profile.firstname?.trim()) {
        dataIntegrityChecks.push('Prénom manquant');
      }
      if (!profile.lastname?.trim()) {
        dataIntegrityChecks.push('Nom manquant');
      }
      if (!profile.phone?.trim()) {
        dataIntegrityChecks.push('Téléphone manquant');
      }
      
      if (dataIntegrityChecks.length > 0) {
        console.warn('⚠️ Problèmes d\'intégrité détectés:', dataIntegrityChecks);
        return {
          success: false,
          error: 'Données incomplètes',
          details: dataIntegrityChecks.join(', '),
          profile
        };
      }
      
      console.log('✅ === VÉRIFICATION RÉUSSIE ===');
      return { 
        success: true, 
        profile,
        referral: referralData
      };
      
    } catch (error: any) {
      console.error('❌ ERREUR VÉRIFICATION POST-CRÉATION:', error);
      return { 
        success: false, 
        error: 'Erreur de vérification',
        details: error.message
      };
    }
  };



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

  // 🔄 FONCTION DE RÉACTIVATION AVEC CONFIRMATION UTILISATEUR
  const proceedWithReactivation = async (userId: string): Promise<void> => {
    try {
      console.log('🔄 Début processus de réactivation pour:', userId);
      
      // 1. Mettre à jour le profil avec les nouvelles données
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          firstname: formData.firstname?.trim(),
          lastname: formData.lastname?.trim(),
          phone: formData.phone?.trim().replace(/\s/g, ''),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (updateError) {
        throw new Error('Erreur mise à jour profil: ' + updateError.message);
      }
      
      console.log('✅ Profil mis à jour avec succès');

      // 2. Tentative de connexion avec les identifiants existants
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (signInError) {
        console.error('❌ Erreur connexion profil réactivé:', signInError);
        
        // Si erreur de mot de passe, proposer de se connecter
        if (signInError.message?.includes('Invalid login credentials')) {
          Alert.alert(
            'Mot de passe incorrect',
            'Le profil a été réactivé mais le mot de passe ne correspond pas. Voulez-vous vous connecter avec ce compte ?',
            [
              { text: 'Annuler', style: 'cancel' },
              { 
                text: 'Se connecter', 
                onPress: () => router.replace({
                  pathname: '/auth/login',
                  params: { 
                    email: formData.email,
                    message: 'Profil réactivé - Utilisez votre ancien mot de passe'
                  }
                })
              }
            ]
          );
          return;
        }
        
        throw new Error('Connexion échouée après réactivation: ' + signInError.message);
      }

      if (!signInData.user) {
        throw new Error('Aucun utilisateur retourné après connexion');
      }

      console.log('✅ Connexion réussie après réactivation:', signInData.user.id);

      // 4. Message de succès pour profil réactivé (sans mention de parrainage)
      const message = `Bienvenue de nouveau !\n\nVotre profil a été réactivé avec succès.\n\nVous pouvez maintenant accéder à votre compte.`;
      
      Alert.alert('Profil réactivé !', message, [{ 
        text: 'Continuer', 
        onPress: () => router.replace('/auth/complete-profile') 
      }]);

    } catch (error: any) {
      console.error('❌ Erreur processus réactivation:', error);
      Alert.alert(
        'Erreur de réactivation',
        `Impossible de réactiver le compte: ${error.message}\n\nVous pouvez essayer de vous connecter directement ou contacter le support.`,
        [
          { text: 'OK' },
          { 
            text: 'Se connecter', 
            onPress: () => router.replace({
              pathname: '/auth/login',
              params: { email: formData.email }
            })
          }
        ]
      );
    }
  };

  // 🔧 FONCTION DE CORRECTION COMPTEUR USAGE_COUNT
  const fixReferralUsageCount = async (referralCode: string) => {
    try {
      console.log('🔧 Correction compteur usage_count pour code:', referralCode);
      
      // Récupérer le code pour avoir l'ID
      const { data: codeData } = await supabase
        .from('user_referral_codes')
        .select('id, user_id')
        .eq('code', referralCode)
        .single();
      
      if (!codeData) return;
      
      // Compter les parrainages actifs
      const { data: referrals, count } = await supabase
        .from('referrals')
        .select('filleul_id', { count: 'exact' })
        .eq('parrain_id', codeData.user_id);
      
      const actualCount = count || 0;
      
      // Mettre à jour le compteur réel
      await supabase
        .from('user_referral_codes')
        .update({ usage_count: actualCount })
        .eq('code', referralCode);
      
      console.log(`✅ Compteur corrigé: ${referralCode} = ${actualCount} utilisations réelles`);
      
    } catch (error) {
      console.error('Erreur correction compteur:', error);
    }
  };

  // 🆕 FONCTION DE VÉRIFICATION D'UNICITÉ DU TÉLÉPHONE
  const checkPhoneAvailability = async (phone: string): Promise<{available: boolean; error?: string}> => {
    try {
      const cleanPhone = phone.trim().replace(/\s/g, '');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, firstname')
        .eq('phone', cleanPhone)
        .limit(1);
      
      if (error) {
        console.error('Erreur vérification téléphone:', error);
        return { available: true }; // En cas d'erreur, on laisse passer
      }
      
      if (data && data.length > 0) {
        return { 
          available: false, 
          error: 'Ce numéro de téléphone est déjà associé à un autre compte.' 
        };
      }
      
      return { available: true };
      
    } catch (error) {
      console.error('Erreur validation téléphone:', error);
      return { available: true }; // En cas d'erreur, on laisse passer
    }
  };

  // 🆕 FONCTION DE VÉRIFICATION D'UNICITÉ DE L'EMAIL - AVEC RÉACTIVATION
  const checkEmailAvailability = async (email: string): Promise<{available: boolean; error?: string; reactivable?: boolean}> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // Vérifier dans la table profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, firstname, created_at')
        .eq('email', cleanEmail)
        .limit(1);
      
      if (error) {
        console.error('Erreur vérification email:', error);
        return { available: true }; 
      }
      
      if (data && data.length > 0) {
        const profile = data[0];
        
        try {
          // Vérifier si c'est l'utilisateur actuel
          const { data: sessionTest } = await supabase.auth.getUser();
          
          if (sessionTest?.user?.id === profile.user_id) {
            return { 
              available: false, 
              error: 'Un compte existe déjà avec cet email. Essayez de vous connecter.' 
            };
          }
          
          // Vérifier l'âge du profil pour la réactivation
          const profileCreated = new Date(profile.created_at);
          const now = new Date();
          const hoursSinceCreation = (now.getTime() - profileCreated.getTime()) / (1000 * 60 * 60);
          
          // Profil ancien - réactivation possible
          if (hoursSinceCreation > 0.017) {
            console.log('🔄 Profil ancien détecté, réactivation possible');
            return { 
              available: true, 
              reactivable: true,
              error: 'Ancien compte détecté - réactivation automatique'
            };
          } else {
            // Profil récent
            return { 
              available: false, 
              error: 'Un compte existe déjà avec cet email. Essayez de vous connecter.' 
            };
          }
          
        } catch (authCheckError) {
          console.log('⚠️ Impossible de vérifier l\'auth, considéré comme réactivable:', authCheckError);
          return { 
            available: true, 
            reactivable: true 
          };
        }
      }
      
      return { available: true };
      
    } catch (error) {
      console.error('Erreur validation email:', error);
      return { available: true };
    }
  };

  // ✅ VALIDATION DU FORMULAIRE - ASYNC AVEC VÉRIFICATION UNICITÉ EMAIL ET TÉLÉPHONE - AVEC GESTION ORPHELINS
  const validateForm = async (): Promise<{ isValid: boolean; error?: string }> => {
    // PRÉNOM OBLIGATOIRE
    if (!formData.firstname?.trim() || formData.firstname.trim().length < 2) {
      return { isValid: false, error: 'Le prénom est requis (minimum 2 caractères)' };
    }

    // NOM OBLIGATOIRE  
    if (!formData.lastname?.trim() || formData.lastname.trim().length < 2) {
      return { isValid: false, error: 'Le nom est requis (minimum 2 caractères)' };
    }

    // EMAIL OBLIGATOIRE
    if (!formData.email.trim()) {
      return { isValid: false, error: 'L\'email est requis' };
    }

    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      return { isValid: false, error: 'Format d\'email invalide' };
    }

    // 🆕 VÉRIFICATION UNICITÉ EMAIL - AVEC GESTION RÉACTIVATION
    const emailCheck = await checkEmailAvailability(formData.email);
    if (!emailCheck.available && !emailCheck.reactivable) {
      return { isValid: false, error: emailCheck.error || 'Email non disponible' };
    }

    // TÉLÉPHONE OBLIGATOIRE
    if (!formData.phone?.trim()) {
      return { isValid: false, error: 'Le numéro de téléphone est requis' };
    }

    const phoneRegex = /^0[1-9]\d{8}$/;
    const cleanPhone = formData.phone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return { isValid: false, error: 'Format de téléphone invalide (ex: 0123456789)' };
    }

    // 🆕 VÉRIFICATION UNICITÉ TÉLÉPHONE
    const phoneCheck = await checkPhoneAvailability(formData.phone);
    if (!phoneCheck.available) {
      return { isValid: false, error: phoneCheck.error || 'Numéro de téléphone non disponible' };
    }

    // MOT DE PASSE OBLIGATOIRE
    if (!formData.password) {
      return { isValid: false, error: 'Le mot de passe est requis' };
    }

    if (formData.password.length < 6) {
      return { isValid: false, error: 'Le mot de passe doit contenir au moins 6 caractères' };
    }

    if (formData.password !== formData.confirmPassword) {
      return { isValid: false, error: 'Les mots de passe ne correspondent pas' };
    }

    // Validation code parrainage (optionnel)
    if (formData.referralCode.trim() && !referralInfo.isValid) {
      return { isValid: false, error: 'Code de parrainage invalide' };
    }

    return { isValid: true };
  };

  // 🚀 FONCTION D'INSCRIPTION PRINCIPALE - MISE À JOUR AVEC GESTION UTILISATEUR EXISTANT + NETTOYAGE ORPHELINS
  const handleSignup = async (): Promise<void> => {
    // Validation async renforcée avec nettoyage orphelins
    const validation = await validateForm();
    if (!validation.isValid) {
      Alert.alert('Champ obligatoire manquant', validation.error);
      return;
    }

    // 🔄 VÉRIFICATION PROFIL RÉACTIVABLE ET DEMANDE CONFIRMATION
    console.log('🔄 Vérification profil réactivable...');
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('user_id, created_at, firstname, lastname')
      .or(`email.eq.${formData.email}${formData.phone ? `,phone.eq.${formData.phone}` : ''}`)
      .limit(1);
    
    if (existingProfiles && existingProfiles.length > 0) {
      const profile = existingProfiles[0];
      const profileCreated = new Date(profile.created_at);
      const hoursSinceCreation = (Date.now() - profileCreated.getTime()) / (1000 * 60 * 60);
      
      // Si le profil est ancien (plus de 1 minute), proposer la réactivation
      if (hoursSinceCreation > 0.017) {
        console.log('🔄 Profil réactivable détecté, demande confirmation...');
        
        // Arrêter le loading pendant la confirmation
        setUiState(prev => ({ ...prev, loading: false }));
        
        // Demander confirmation à l'utilisateur
        return new Promise<void>((resolve) => {
          Alert.alert(
            'Compte existant détecté',
            `Un ancien compte avec l'email "${formData.email}" existe déjà.\n\nVoulez-vous réactiver ce compte avec vos nouvelles informations ?\n\n• Nom : ${profile.firstname || 'Non défini'} ${profile.lastname || ''}\n• Créé le : ${profileCreated.toLocaleDateString()}`,
            [
              {
                text: 'Annuler',
                style: 'cancel',
                onPress: () => {
                  console.log('❌ Utilisateur a annulé la réactivation');
                  resolve();
                }
              },
              {
                text: 'Changer d\'email',
                onPress: () => {
                  console.log('🔄 Utilisateur veut changer d\'email');
                  // Vider le champ email pour permettre la saisie d'un nouveau
                  updateFormData('email', '');
                  Alert.alert('Email effacé', 'Vous pouvez maintenant saisir un nouvel email.');
                  resolve();
                }
              },
              {
                text: 'Réactiver',
                onPress: async () => {
                  console.log('✅ Utilisateur accepte la réactivation');
                  setUiState(prev => ({ ...prev, loading: true }));
                  
                  try {
                    // Procéder à la réactivation
                    await proceedWithReactivation(profile.user_id);
                  } catch (error) {
                    console.error('❌ Erreur lors de la réactivation:', error);
                    Alert.alert('Erreur', 'Impossible de réactiver le compte. Veuillez réessayer.');
                  } finally {
                    setUiState(prev => ({ ...prev, loading: false }));
                  }
                  
                  resolve();
                }
              }
            ],
            { cancelable: false }
          );
        });
      }
    }

    // Corriger le compteur du code parrainage si utilisé
    if (formData.referralCode.trim() && referralInfo.isValid) {
      await fixReferralUsageCount(formData.referralCode.trim());
    }

    console.log('🚀 === DÉBUT INSCRIPTION UTILISATEUR ===');
    console.log('📧 Email:', formData.email.trim());
    console.log('📞 Téléphone:', formData.phone?.trim() || 'Non renseigné');
    console.log('👤 Prénom:', formData.firstname?.trim() || 'Non renseigné');
    console.log('👤 Nom:', formData.lastname?.trim() || 'Non renseigné');
    console.log('🎯 Code parrainage:', formData.referralCode.trim() || 'Aucun');

    setUiState(prev => ({ ...prev, loading: true }));
    
    const hasReferralCode = formData.referralCode.trim() && referralInfo.isValid;
    let createdUserId = '';

    try {
      // 🔐 INSCRIPTION SUPABASE - Tous les champs sont maintenant requis et validés
      console.log('🔐 Création du compte...');
      
      const userData = {
        firstname: formData.firstname!.trim(),
        lastname: formData.lastname!.trim(), 
        phone: formData.phone!.trim().replace(/\s/g, ''),  // Nettoyer les espaces
      };
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: userData
        }
      });

      if (signUpError) {
        console.error('❌ Erreur inscription:', signUpError);
        console.error('Erreur Supabase (Inscription):', {
          code: signUpError.status,
          details: signUpError.details,
          hint: signUpError.hint,
          message: signUpError.message,
          timestamp: new Date().toISOString()
        });

        // 🆕 GESTION SPÉCIALE : Utilisateur déjà existant
        if (signUpError.message === 'User already registered' || 
            signUpError.message === 'User already exists' ||
            signUpError.message?.includes('already been registered') ||
            signUpError.status === 422) {
          
          console.log('👤 Utilisateur existant détecté - Proposition de connexion');
          
          Alert.alert(
            'Compte existant',
            `Un compte avec l'email "${formData.email}" existe déjà.\n\nVoulez-vous vous connecter à la place ?`,
            [
              { 
                text: 'Annuler', 
                style: 'cancel',
                onPress: () => {
                  console.log('❌ Utilisateur a annulé');
                }
              },
              { 
                text: 'Se connecter', 
                onPress: () => {
                  console.log('🔄 Redirection vers la connexion');
                  
                  // Redirection vers login avec l'email pré-rempli
                  router.replace({
                    pathname: '/auth/login',
                    params: { 
                      email: formData.email,
                      message: 'Compte existant - Veuillez vous connecter',
                      from: 'signup_existing_user'
                    }
                  });
                }
              }
            ]
          );
          
          return; // Arrêter ici, ne pas continuer le processus
        }

        // Autres erreurs d'inscription
        const { userMessage } = handleSupabaseError ? handleSupabaseError(signUpError, 'Inscription') : { userMessage: signUpError.message };
        throw new Error(userMessage);
      }

      if (!signUpData.user) {
        throw new Error('Impossible de créer le compte utilisateur');
      }

      console.log('✅ Compte créé avec succès:', signUpData.user.id);
      createdUserId = signUpData.user.id;

      // 🎯 PARRAINAGE
      if (hasReferralCode && referralInfo.referrerId) {
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

      // 🆕 VÉRIFICATION POST-CRÉATION
      console.log('🔍 Lancement vérification post-création...');
      const verification = await verifyUserCreation(
        signUpData.user.id, 
        formData.email.trim().toLowerCase(),
        hasReferralCode
      );

      if (!verification.success) {
        console.error('🚨 PROBLÈME POST-CRÉATION DÉTECTÉ:', verification.error);
        console.error('🚨 Détails:', verification.details);
        
        // Alerter l'utilisateur d'un problème technique
        // mais ne pas faire échouer l'inscription si l'auth a réussi
        Alert.alert(
          'Compte créé avec des alertes',
          'Votre compte a été créé mais il y a eu un problème technique. Notre équipe a été alertée. Vous pouvez tout de même continuer.',
          [{ text: 'Continuer' }]
        );
      } else {
        console.log('✅ Vérification post-création réussie');
      }

      // 🎯 GESTION SELON LE TYPE DE CONFIRMATION
      if (signUpData.session) {
        // Connexion automatique
        console.log('🎯 Connexion automatique, redirection...');
        
        // 🆕 RÉCUPÉRER LE PRÉNOM RÉEL DU PARRAIN DEPUIS LA BASE
        let actualReferrerName = referralInfo.referrerName;
        if (hasReferralCode) {
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
        
        let message = hasReferralCode && actualReferrerName && actualReferrerName !== 'Utilisateur'
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
        
        if (hasReferralCode && referralInfo.referrerName && referralInfo.referrerName !== 'Utilisateur') {
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

      // 🆕 GESTION AMÉLIORÉE DES ERREURS (incluant utilisateur existant au niveau catch)
      if (error.message?.includes('User already registered') || error.message?.includes('User already exists')) {
        title = 'Compte existant';
        message = `Un compte existe déjà avec cet email "${formData.email}". Essayez de vous connecter.`;
      } else if (error.message?.includes('Password should be at least')) {
        title = 'Mot de passe trop faible';
        message = 'Votre mot de passe doit être plus sécurisé (au moins 6 caractères).';
      } else if (error.message?.includes('Invalid email')) {
        title = 'Email invalide';
        message = 'Veuillez saisir une adresse email valide.';
      } else if (error.message?.includes('signup_disabled')) {
        title = 'Inscription fermée';
        message = 'Les inscriptions sont temporairement fermées.';
      } else if (error.message?.includes('Database error')) {
        // 🆕 Gestion spécifique erreur téléphone/email duplicate
        title = 'Erreur de validation';
        message = 'Une erreur est survenue. Vérifiez que votre email et numéro de téléphone ne sont pas déjà utilisés.';
        
        // Vérification supplémentaire pour confirmer le type de doublon
        try {
          const phoneCheck = await checkPhoneAvailability(formData.phone || '');
          const emailCheck = await checkEmailAvailability(formData.email);
          
          if (!phoneCheck.available && !emailCheck.available) {
            title = 'Informations déjà utilisées';
            message = 'Cet email ET ce numéro de téléphone sont déjà associés à des comptes existants.';
          } else if (!phoneCheck.available) {
            title = 'Numéro déjà utilisé';
            message = 'Ce numéro de téléphone est déjà associé à un autre compte. Utilisez un autre numéro.';
          } else if (!emailCheck.available) {
            title = 'Email déjà utilisé';
            message = 'Cet email est déjà associé à un compte existant. Essayez de vous connecter.';
          }
        } catch (checkError) {
          console.error('Erreur vérification post-erreur:', checkError);
        }
      }

      Alert.alert(title, message, [
        { text: 'OK' },
        // 🆕 BOUTON "SE CONNECTER" pour les cas d'utilisateur existant
        ...(title === 'Compte existant' || title === 'Email déjà utilisé' ? [
          { 
            text: 'Se connecter', 
            onPress: () => {
              router.replace({
                pathname: '/auth/login',
                params: { 
                  email: formData.email,
                  message: 'Compte existant détecté',
                  from: 'signup_error'
                }
              });
            }
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

  // 🎨 RENDU PRINCIPAL (identique au code original)
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

          {/* Champs de nom - MAINTENANT OBLIGATOIRES */}
          <View style={styles.nameContainer}>
            <View style={styles.nameInput}>
              <TextInput 
                style={styles.input}
                placeholder="Prénom *"
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
                placeholder="Nom *"
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

          {/* Champ téléphone - MAINTENANT OBLIGATOIRE */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.input}
              placeholder="Téléphone *"
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
              Les champs marqués d'une étoile (*) sont obligatoires.{'\n'}
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

// Styles identiques au code original
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
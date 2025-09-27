// utils/profileErrorHandler.ts - Gestionnaire d'erreurs de profil
// Corrige le problème PGRST116 et gère la création automatique de profil

import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

interface ProfileErrorHandlerOptions {
  userId: string;
  userEmail: string;
  userMetadata?: any;
  redirectToCompleteProfile?: boolean;
}

interface ProfileRecoveryResult {
  success: boolean;
  profileExists: boolean;
  needsCompletion: boolean;
  error?: string;
}

export class ProfileErrorHandler {
  
  /**
   * Gère l'erreur PGRST116 et tente de récupérer ou créer le profil
   */
  static async handleMissingProfile(options: ProfileErrorHandlerOptions): Promise<ProfileRecoveryResult> {
    const { userId, userEmail, userMetadata = {} } = options;
    
    console.log('🔧 Gestion erreur profil manquant pour:', userId);

    try {
      // 1. Vérifier si le profil existe vraiment
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, user_id, profile_completed, firstname, lastname')
        .eq('user_id', userId)
        .maybeSingle(); // maybeSingle au lieu de single pour éviter l'erreur

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Erreur vérification profil:', checkError);
        return {
          success: false,
          profileExists: false,
          needsCompletion: false,
          error: 'Erreur de connexion à la base de données'
        };
      }

      // 2. Si le profil existe mais était mal récupéré
      if (existingProfile) {
        console.log('✅ Profil trouvé lors de la vérification:', existingProfile.id);
        return {
          success: true,
          profileExists: true,
          needsCompletion: !existingProfile.profile_completed || !existingProfile.firstname || !existingProfile.lastname
        };
      }

      // 3. Créer un profil minimal si aucun n'existe
      console.log('🔧 Création profil minimal pour:', userId);
      
      const minimalProfile = {
        user_id: userId,
        email: userEmail,
        firstname: userMetadata.firstname || '',
        lastname: userMetadata.lastname || '',
        phone: userMetadata.phone || '',
        address: '',
        postal_code: '',
        city: '',
        roles: ['client'], // Rôle par défaut
        legal_status: 'particulier',
        profile_completed: false,
        criteria_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert(minimalProfile)
        .select('id, user_id')
        .single();

      if (createError) {
        console.error('❌ Erreur création profil minimal:', createError);
        
        // Si erreur de duplication, le profil existe peut-être déjà
        if (createError.code === '23505') {
          return await this.handleMissingProfile(options); // Retry
        }
        
        return {
          success: false,
          profileExists: false,
          needsCompletion: false,
          error: 'Impossible de créer le profil'
        };
      }

      console.log('✅ Profil minimal créé avec succès:', newProfile.id);

      return {
        success: true,
        profileExists: true,
        needsCompletion: true
      };

    } catch (error) {
      console.error('❌ Exception gestion profil manquant:', error);
      return {
        success: false,
        profileExists: false,
        needsCompletion: false,
        error: 'Erreur inattendue lors de la récupération du profil'
      };
    }
  }

  /**
   * Gère les erreurs de connectivité Supabase
   */
  static async handleSupabaseConnectivityError(error: any): Promise<boolean> {
    console.log('🔧 Gestion erreur connectivité Supabase:', error);

    // Vérifier si c'est vraiment un problème de connectivité
    if (
      error?.message?.includes('fetch') ||
      error?.message?.includes('network') ||
      error?.message?.includes('Aborted') ||
      error?.code === ''
    ) {
      
      try {
        // Test de connectivité simple
        const { error: testError } = await supabase
          .from('services')
          .select('id')
          .limit(1);

        if (!testError) {
          console.log('✅ Connectivité Supabase rétablie');
          return true;
        }
      } catch (testError) {
        console.log('❌ Connectivité Supabase toujours problématique');
      }
    }

    return false;
  }

  /**
   * Gestionnaire général pour les erreurs de profil
   */
  static async handleProfileError(error: any, userId: string, userEmail: string): Promise<ProfileRecoveryResult> {
    console.log('🔧 Gestionnaire général erreur profil:', error?.code);

    // Cas 1: Profil manquant (PGRST116)
    if (error?.code === 'PGRST116') {
      return await this.handleMissingProfile({
        userId,
        userEmail
      });
    }

    // Cas 2: Erreur de connectivité
    if (await this.handleSupabaseConnectivityError(error)) {
      // Retry après rétablissement de la connectivité
      return await this.handleMissingProfile({
        userId,
        userEmail
      });
    }

    // Cas 3: Autres erreurs
    return {
      success: false,
      profileExists: false,
      needsCompletion: false,
      error: error?.message || 'Erreur inconnue'
    };
  }
}

/**
 * Hook personnalisé pour gérer les erreurs de profil
 */
export const useProfileErrorRecovery = () => {
  const handleProfileRecovery = async (
    error: any, 
    userId: string, 
    userEmail: string
  ): Promise<ProfileRecoveryResult> => {
    return await ProfileErrorHandler.handleProfileError(error, userId, userEmail);
  };

  return { handleProfileRecovery };
};

/**
 * Utilitaire pour les requêtes de profil sécurisées
 */
export const safeGetProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); // Utiliser maybeSingle au lieu de single

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('❌ Erreur safeGetProfile:', error);
    return { data: null, error };
  }
};

/**
 * Middleware pour wrapper les appels de profil
 */
export const withProfileErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error: any) {
      if (error?.code === 'PGRST116') {
        console.log('🔧 Erreur profil interceptée par middleware');
        // Re-lancer avec gestion d'erreur
        throw error;
      }
      throw error;
    }
  };
};
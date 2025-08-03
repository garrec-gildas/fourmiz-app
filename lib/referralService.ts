// lib/referralService.ts - ADAPTÉ À VOTRE VRAIE STRUCTURE
// ✅ Compatible avec user_referrals ET referrals
// ✅ Utilise referral_code directement (pas user_referral_codes)
// ✅ Gère les deux systèmes de parrainage

import { supabase } from './supabase';

// ✅ INTERFACES ADAPTÉES À VOS TABLES
interface ReferralValidationResult {
  isValid: boolean;
  error?: string;
  parrainUserId?: string;
  referrerName?: string;
  parrainProfile?: any;
}

interface ReferralApplicationResult {
  success: boolean;
  error?: string;
  message?: string;
}

interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  totalEarnings: number;
  pendingReferrals: number;
}

interface UserReferral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code: string;
  status: string;
  bonus_earned: number;
  referrer_name: string;
  created_at: string;
  referred_user?: {
    id: string;
    email: string;
    profiles?: {
      firstname: string;
      lastname: string;
    };
  };
}

export class ReferralService {
  
  // 🔧 CONSTANTES DE CONFIGURATION
  private static readonly DEFAULT_BONUS_AMOUNT = 50;
  private static readonly CODE_LENGTH = 6;
  private static readonly MAX_CODE_GENERATION_ATTEMPTS = 10;

  // 🔍 VALIDATION PRINCIPALE - Utilise les codes stockés dans user_referrals
  static async validateReferralCode(code: string): Promise<ReferralValidationResult> {
    try {
      console.log('🔍 Validation code parrainage:', code);
      
      if (!code || typeof code !== 'string') {
        return { isValid: false, error: 'Code de parrainage requis' };
      }

      const cleanCode = code.trim().toUpperCase();
      if (cleanCode.length !== this.CODE_LENGTH) {
        return { isValid: false, error: `Code invalide (${this.CODE_LENGTH} caractères requis)` };
      }

      // ✅ NOUVEAU : Chercher directement dans user_referrals.referral_code
      console.log('🔄 Recherche code dans user_referrals...');
      const { data: referralData, error: referralError } = await supabase
        .from('user_referrals')
        .select(`
          referrer_user_id,
          referrer_name,
          referral_code,
          status
        `)
        .eq('referral_code', cleanCode)
        .single();

      if (referralError || !referralData) {
        console.error('❌ Code introuvable dans user_referrals:', referralError);
        return { isValid: false, error: 'Code de parrainage invalide' };
      }

      // ✅ Code trouvé, récupérer les infos du parrain
      const { data: profileData } = await supabase
        .from('profiles')
        .select('firstname, lastname, email')
        .eq('user_id', referralData.referrer_user_id)
        .single();

      let referrerName = referralData.referrer_name || 'Utilisateur';
      if (profileData && profileData.firstname) {
        referrerName = `${profileData.firstname} ${profileData.lastname || ''}`.trim();
      }

      console.log('✅ Code valide, parrain:', referrerName);

      return {
        isValid: true,
        parrainUserId: referralData.referrer_user_id,
        referrerName: referrerName,
        parrainProfile: profileData
      };

    } catch (error) {
      console.error('❌ Erreur validation code:', error);
      return { isValid: false, error: 'Erreur lors de la validation du code' };
    }
  }

  // 🎁 APPLICATION DU PARRAINAGE - Version adaptée
  static async applyReferral(
    newUserId: string, 
    referralCode: string,
    referrerName?: string
  ): Promise<ReferralApplicationResult> {
    try {
      console.log('🎁 Application parrainage:', { newUserId, referralCode, referrerName });

      if (!newUserId || !referralCode) {
        return { success: false, error: 'Paramètres manquants' };
      }

      // Re-valider le code
      const validation = await this.validateReferralCode(referralCode);
      if (!validation.isValid || !validation.parrainUserId) {
        return { success: false, error: validation.error || 'Code invalide' };
      }

      // Vérifier auto-parrainage
      if (validation.parrainUserId === newUserId) {
        return { success: false, error: 'Auto-parrainage interdit' };
      }

      // ✅ Vérifier si déjà parrainé (dans user_referrals)
      const { data: existingReferral } = await supabase
        .from('user_referrals')
        .select('referrer_name')
        .eq('referred_user_id', newUserId)
        .single();

      if (existingReferral) {
        return { 
          success: true,
          message: `Déjà parrainé par ${existingReferral.referrer_name}`
        };
      }

      // ✅ Créer le parrainage dans user_referrals
      const { error: insertError } = await supabase
        .from('user_referrals')
        .insert({
          referrer_user_id: validation.parrainUserId,
          referred_user_id: newUserId,
          referral_code: referralCode.toUpperCase(),
          status: 'completed',
          bonus_earned: this.DEFAULT_BONUS_AMOUNT,
          referrer_name: referrerName || validation.referrerName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError && insertError.code !== '23505') {
        console.error('❌ Erreur insertion:', insertError);
        return { success: false, error: 'Erreur enregistrement parrainage' };
      }

      // ✅ BONUS : Créer aussi dans referrals (système français)
      await supabase
        .from('referrals')
        .insert({
          parrain_id: validation.parrainUserId,
          filleul_id: newUserId,
          bonus_amount: this.DEFAULT_BONUS_AMOUNT,
          is_validated: true,
          validated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      console.log('✅ Parrainage appliqué avec succès');
      return { 
        success: true,
        message: `Parrainage réussi ! Parrainé par ${validation.referrerName}`
      };

    } catch (error) {
      console.error('❌ Erreur application parrainage:', error);
      return { success: false, error: 'Erreur application parrainage' };
    }
  }

  // 🔧 CRÉATION DE CODE - Génère un code et le stocke directement
  static async createReferralCode(userId: string): Promise<string | null> {
    try {
      console.log('🔧 Création code pour:', userId);

      // ✅ Vérifier si l'utilisateur a déjà un code dans user_referrals
      const { data: existingCode } = await supabase
        .from('user_referrals')
        .select('referral_code')
        .eq('referrer_user_id', userId)
        .limit(1)
        .single();

      if (existingCode?.referral_code) {
        console.log('✅ Code existant trouvé:', existingCode.referral_code);
        return existingCode.referral_code;
      }

      // Générer un nouveau code unique
      let attempts = 0;
      while (attempts < this.MAX_CODE_GENERATION_ATTEMPTS) {
        const code = this.generateRandomCode();
        
        // Vérifier unicité dans user_referrals
        const { data: codeExists } = await supabase
          .from('user_referrals')
          .select('id')
          .eq('referral_code', code)
          .single();
        
        if (!codeExists) {
          console.log(`✅ Code unique généré: ${code}`);
          return code;
        }
        
        attempts++;
      }
      
      console.error('❌ Impossible de générer un code unique');
      return null;
      
    } catch (error) {
      console.error('❌ Erreur création code:', error);
      return null;
    }
  }

  // 🎲 GÉNÉRATEUR DE CODE ALÉATOIRE
  private static generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  // 📊 STATISTIQUES - Compatible avec vos tables
  static async getReferralStats(userId: string): Promise<ReferralStats> {
    try {
      console.log('📊 Stats parrainage pour:', userId);

      // ✅ Statistiques depuis user_referrals
      const { data: userReferrals, error: userError } = await supabase
        .from('user_referrals')
        .select('status, bonus_earned, total_commission_earned')
        .eq('referrer_user_id', userId);

      // ✅ Statistiques depuis referrals (système français)
      const { data: referrals, error: referralError } = await supabase
        .from('referrals')
        .select('is_validated, bonus_amount, total_commission_earned')
        .eq('parrain_id', userId);

      let totalReferrals = 0;
      let successfulReferrals = 0;
      let totalEarnings = 0;
      let pendingReferrals = 0;

      // Calculer depuis user_referrals
      if (!userError && userReferrals) {
        totalReferrals += userReferrals.length;
        successfulReferrals += userReferrals.filter(r => r.status === 'completed').length;
        pendingReferrals += userReferrals.filter(r => r.status === 'pending').length;
        totalEarnings += userReferrals.reduce((sum, r) => 
          sum + (r.bonus_earned || 0) + (r.total_commission_earned || 0), 0
        );
      }

      // Ajouter depuis referrals
      if (!referralError && referrals) {
        totalReferrals += referrals.length;
        successfulReferrals += referrals.filter(r => r.is_validated).length;
        pendingReferrals += referrals.filter(r => !r.is_validated).length;
        totalEarnings += referrals.reduce((sum, r) => 
          sum + (r.bonus_amount || 0) + (r.total_commission_earned || 0), 0
        );
      }

      console.log('✅ Stats calculées:', { totalReferrals, successfulReferrals, totalEarnings });

      return {
        totalReferrals,
        successfulReferrals,
        totalEarnings,
        pendingReferrals
      };

    } catch (error) {
      console.error('❌ Erreur stats:', error);
      return { totalReferrals: 0, successfulReferrals: 0, totalEarnings: 0, pendingReferrals: 0 };
    }
  }

  // 🔍 RÉCUPÉRER LE CODE D'UN UTILISATEUR
  static async getUserReferralCode(userId: string): Promise<string | null> {
    try {
      console.log('🔍 Récupération code de:', userId);

      // Chercher dans user_referrals où il est le parrain
      const { data: codeData, error } = await supabase
        .from('user_referrals')
        .select('referral_code')
        .eq('referrer_user_id', userId)
        .limit(1)
        .single();

      if (error || !codeData?.referral_code) {
        console.log('⚠️ Aucun code trouvé, génération nécessaire');
        return null;
      }

      console.log('✅ Code trouvé:', codeData.referral_code);
      return codeData.referral_code;

    } catch (error) {
      console.error('❌ Erreur récupération code:', error);
      return null;
    }
  }

  // 📋 RÉCUPÉRER LES FILLEULS - Compatible avec les deux systèmes
  static async getUserReferrals(userId: string): Promise<UserReferral[]> {
    try {
      console.log('📋 Récupération filleuls de:', userId);

      // ✅ Récupérer depuis user_referrals avec les profils
      const { data: userReferrals, error: userError } = await supabase
        .from('user_referrals')
        .select(`
          id,
          referrer_user_id,
          referred_user_id,
          referral_code,
          status,
          bonus_earned,
          referrer_name,
          created_at,
          referred_user:referred_user_id (
            id,
            email,
            profiles (
              firstname,
              lastname
            )
          )
        `)
        .eq('referrer_user_id', userId)
        .order('created_at', { ascending: false });

      if (userError) {
        console.warn('⚠️ Erreur user_referrals:', userError);
        return [];
      }

      console.log('✅ Filleuls trouvés:', userReferrals?.length || 0);
      
      if (userReferrals && userReferrals.length > 0) {
        console.log('👥 Liste des filleuls:', 
          userReferrals.map(r => r.referred_user?.profiles ? 
            `${r.referred_user.profiles.firstname} ${r.referred_user.profiles.lastname}` : 
            r.referred_user?.email || 'Utilisateur'
          )
        );
      }

      return userReferrals || [];

    } catch (error) {
      console.error('❌ Erreur récupération filleuls:', error);
      return [];
    }
  }

  // 📋 ALTERNATIVE : Récupérer filleuls depuis referrals (système français)
  static async getUserReferralsFrench(userId: string): Promise<any[]> {
    try {
      console.log('📋 Récupération filleuls français de:', userId);

      const { data: referrals, error } = await supabase
        .from('referrals')
        .select(`
          id,
          parrain_id,
          filleul_id,
          bonus_amount,
          is_validated,
          created_at,
          filleul:filleul_id (
            id,
            email,
            profiles (
              firstname,
              lastname
            )
          )
        `)
        .eq('parrain_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('⚠️ Erreur referrals français:', error);
        return [];
      }

      console.log('✅ Filleuls français trouvés:', referrals?.length || 0);
      return referrals || [];

    } catch (error) {
      console.error('❌ Erreur récupération filleuls français:', error);
      return [];
    }
  }

  // 🔄 MÉTHODE COMBINÉE : Récupérer depuis les deux systèmes
  static async getAllUserReferrals(userId: string): Promise<any[]> {
    try {
      const [modernReferrals, frenchReferrals] = await Promise.all([
        this.getUserReferrals(userId),
        this.getUserReferralsFrench(userId)
      ]);

      console.log('🔄 Filleuls combinés:', {
        moderne: modernReferrals.length,
        français: frenchReferrals.length,
        total: modernReferrals.length + frenchReferrals.length
      });

      return [...modernReferrals, ...frenchReferrals];
    } catch (error) {
      console.error('❌ Erreur récupération combinée:', error);
      return [];
    }
  }
}
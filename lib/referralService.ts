// lib/referralService.ts - VERSION FINALE NETTOYÉE
// ✅ Code de production avec validation tolérante

import { supabase } from './supabase';

// ✅ INTERFACES
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
  
  // 🧪 CONSTANTES
  private static readonly DEFAULT_BONUS_AMOUNT = 50;
  private static readonly CODE_LENGTH = 6;
  private static readonly MAX_CODE_GENERATION_ATTEMPTS = 10;

  // 🔍 VALIDATION CODE DE PARRAINAGE - ✅ VERSION TOLÉRANTE DÉFINITIVE
  static async validateReferralCode(code: string): Promise<ReferralValidationResult> {
    try {
      console.log('🔍 Validation code parrainage:', code);
      
      if (!code || typeof code !== 'string') {
        console.log('❌ Code manquant ou invalide');
        return { isValid: false, error: 'Code de parrainage requis' };
      }

      const cleanCode = code.trim().toUpperCase();
      console.log('🧹 Code nettoyé:', cleanCode);
      
      if (cleanCode.length !== this.CODE_LENGTH) {
        console.log(`❌ Longueur incorrecte: ${cleanCode.length} (attendu: ${this.CODE_LENGTH})`);
        return { isValid: false, error: `Code invalide (${this.CODE_LENGTH} caractères requis)` };
      }

      // 1. Vérifier le code dans user_referral_codes
      console.log('🔍 Recherche du code dans user_referral_codes...');
      const { data: codeDataArray, error: codeError } = await supabase
        .from('user_referral_codes')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true);

      console.log('📊 Résultat requête codes:', { 
        error: codeError?.message, 
        count: codeDataArray?.length,
        data: codeDataArray 
      });

      if (codeError) {
        console.log('❌ Erreur requête codes:', codeError);
        return { isValid: false, error: 'Erreur recherche code de parrainage' };
      }

      if (!codeDataArray || codeDataArray.length === 0) {
        console.log('❌ Aucun code trouvé dans la base');
        return { isValid: false, error: 'Code de parrainage invalide' };
      }

      const codeData = codeDataArray[0];
      console.log('✅ Code trouvé:', codeData);

      const referrerId = codeData.user_id;
      
      if (!referrerId) {
        console.log('❌ Aucun user_id dans le code');
        return { isValid: false, error: 'Données de parrainage corrompues' };
      }

      console.log('🔍 Recherche profil parrain pour user_id:', referrerId);

      // 2. Essayer de récupérer le profil (VERSION TOLÉRANTE)
      const { data: profilesData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, firstname, lastname, email')
        .eq('user_id', referrerId);

      console.log('📊 Résultat requête profils:', { 
        error: profileError?.message, 
        count: profilesData?.length,
        data: profilesData 
      });

      let profileData = null;
      let referrerName = `Parrain-${cleanCode}`; // Nom par défaut basé sur le code

      if (profileError) {
        console.log('⚠️ Erreur requête profil, mais code reste valide:', profileError);
      } else if (profilesData && profilesData.length > 0) {
        profileData = profilesData[0];
        console.log('✅ Profil parrain trouvé:', profileData);
        
        if (profileData.firstname) {
          referrerName = `${profileData.firstname} ${profileData.lastname || ''}`.trim();
        }
      } else {
        console.log('⚠️ Aucun profil trouvé, mais le CODE RESTE VALIDE avec nom par défaut');
      }

      console.log('✅ Validation réussie même sans profil - Parrain:', referrerName);

      // ✅ TOUJOURS ACCEPTER LE CODE MÊME SANS PROFIL
      return {
        isValid: true,
        parrainUserId: referrerId,
        referrerName: referrerName,
        parrainProfile: profileData // Peut être null, c'est OK
      };

    } catch (error) {
      console.error('💥 Exception validation code:', error);
      return { isValid: false, error: 'Erreur lors de la validation du code' };
    }
  }

  // 🎁 APPLICATION DU PARRAINAGE
  static async applyReferral(newUserId: string, referralCode: string, referrerName?: string): Promise<ReferralApplicationResult> {
    try {
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

      // Vérifier si déjà parrainé
      const { data: existingReferral } = await supabase
        .from('user_referrals')
        .select('referrer_name, user_id, referred_user_id')
        .or(`user_id.eq.${newUserId},referred_user_id.eq.${newUserId}`)
        .single();

      if (existingReferral) {
        return { 
          success: true,
          message: `Déjà parrainé par ${existingReferral.referrer_name}`
        };
      }

      // Insertion du parrainage
      const { error: insertError } = await supabase
        .from('user_referrals')
        .insert({
          referrer_user_id: validation.parrainUserId,
          referred_user_id: newUserId,
          referrer_id: validation.parrainUserId,
          user_id: newUserId,
          referral_code: referralCode.toUpperCase(),
          status: 'completed',
          bonus_earned: this.DEFAULT_BONUS_AMOUNT,
          referrer_name: referrerName || validation.referrerName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError && insertError.code !== '23505') {
        console.error('Erreur insertion parrainage:', insertError);
        return { success: false, error: 'Erreur enregistrement parrainage' };
      }

      // Créer aussi dans referrals (système français)
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

      return { 
        success: true,
        message: `Parrainage réussi ! Parrainé par ${validation.referrerName}`
      };

    } catch (error) {
      console.error('Erreur application parrainage:', error);
      return { success: false, error: 'Erreur application parrainage' };
    }
  }

  // 🔧 CRÉATION DE CODE
  static async createReferralCode(userId: string): Promise<string | null> {
    try {
      // Chercher code existant
      const { data: existingCode } = await supabase
        .from('user_referrals')
        .select('referral_code')
        .or(`referrer_id.eq.${userId},referrer_user_id.eq.${userId}`)
        .limit(1)
        .single();

      if (existingCode?.referral_code) {
        return existingCode.referral_code;
      }

      // Générer un nouveau code unique
      let attempts = 0;
      while (attempts < this.MAX_CODE_GENERATION_ATTEMPTS) {
        const code = this.generateRandomCode();
        
        const { data: codeExists } = await supabase
          .from('user_referrals')
          .select('id')
          .eq('referral_code', code)
          .single();
        
        if (!codeExists) {
          return code;
        }
        
        attempts++;
      }
      
      return null;
      
    } catch (error) {
      console.error('Erreur création code:', error);
      return null;
    }
  }

  // 🎲 GÉNÉRATEUR DE CODE
  private static generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  // 📊 STATISTIQUES
  static async getReferralStats(userId: string): Promise<ReferralStats> {
    try {
      const { data: userReferrals, error: userError } = await supabase
        .from('user_referrals')
        .select('status, bonus_earned, total_commission_earned')
        .or(`referrer_id.eq.${userId},referrer_user_id.eq.${userId}`);

      const { data: referrals, error: referralError } = await supabase
        .from('referrals')
        .select('is_validated, bonus_amount, total_commission_earned')
        .eq('parrain_id', userId);

      let totalReferrals = 0;
      let successfulReferrals = 0;
      let totalEarnings = 0;
      let pendingReferrals = 0;

      if (!userError && userReferrals) {
        totalReferrals += userReferrals.length;
        successfulReferrals += userReferrals.filter(r => r.status === 'completed').length;
        pendingReferrals += userReferrals.filter(r => r.status === 'pending').length;
        totalEarnings += userReferrals.reduce((sum, r) => 
          sum + (r.bonus_earned || 0) + (r.total_commission_earned || 0), 0
        );
      }

      if (!referralError && referrals) {
        totalReferrals += referrals.length;
        successfulReferrals += referrals.filter(r => r.is_validated).length;
        pendingReferrals += referrals.filter(r => !r.is_validated).length;
        totalEarnings += referrals.reduce((sum, r) => 
          sum + (r.bonus_amount || 0) + (r.total_commission_earned || 0), 0
        );
      }

      return {
        totalReferrals,
        successfulReferrals,
        totalEarnings,
        pendingReferrals
      };

    } catch (error) {
      console.error('Erreur stats:', error);
      return { totalReferrals: 0, successfulReferrals: 0, totalEarnings: 0, pendingReferrals: 0 };
    }
  }

  // 🔍 RÉCUPÉRER CODE UTILISATEUR
  static async getUserReferralCode(userId: string): Promise<string | null> {
    try {
      const { data: codeData, error } = await supabase
        .from('user_referrals')
        .select('referral_code')
        .or(`referrer_id.eq.${userId},referrer_user_id.eq.${userId}`)
        .limit(1)
        .single();

      if (error || !codeData?.referral_code) {
        return null;
      }

      return codeData.referral_code;

    } catch (error) {
      console.error('Erreur récupération code:', error);
      return null;
    }
  }

  // 📋 RÉCUPÉRER LES FILLEULS
  static async getUserReferrals(userId: string): Promise<UserReferral[]> {
    try {
      // Récupérer les parrainages
      const { data: referrals, error: referralError } = await supabase
        .from('user_referrals')
        .select('*')
        .or(`referrer_id.eq.${userId},referrer_user_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (referralError || !referrals || referrals.length === 0) {
        return [];
      }

      // Extraire les IDs des filleuls
      const filleulIds = referrals.map(r => r.user_id || r.referred_user_id).filter(Boolean);

      if (filleulIds.length === 0) {
        return [];
      }

      // Récupérer les profils
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, firstname, lastname, email')
        .in('id', filleulIds);

      // Construire le résultat
      return referrals.map(referral => {
        const filleulId = referral.user_id || referral.referred_user_id;
        const profile = profiles?.find(p => p.id === filleulId);

        return {
          ...referral,
          referred_user: {
            id: filleulId,
            email: profile?.email || 'Email inconnu',
            profiles: {
              firstname: profile?.firstname || 'Utilisateur',
              lastname: profile?.lastname || 'inconnu'
            }
          }
        };
      });

    } catch (error) {
      console.error('Erreur getUserReferrals:', error);
      return [];
    }
  }

  // 📋 FILLEULS SYSTÈME FRANÇAIS
  static async getUserReferralsFrench(userId: string): Promise<any[]> {
    try {
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select(`
          id,
          parrain_id,
          filleul_id,
          bonus_amount,
          is_validated,
          created_at
        `)
        .eq('parrain_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return referrals || [];

    } catch (error) {
      console.error('Erreur récupération filleuls français:', error);
      return [];
    }
  }

  // 🔄 MÉTHODE COMBINÉE
  static async getAllUserReferrals(userId: string): Promise<any[]> {
    try {
      const [modernReferrals, frenchReferrals] = await Promise.all([
        this.getUserReferrals(userId),
        this.getUserReferralsFrench(userId)
      ]);

      return [...modernReferrals, ...frenchReferrals];
    } catch (error) {
      console.error('Erreur récupération combinée:', error);
      return [];
    }
  }
}
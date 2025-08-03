// ✅ REFERRAL SYSTEM COMPLET - Version corrigée avec toutes les fonctionnalités
// 🔧 Version modifiée pour corriger les noms de colonnes user_referrals

import { supabase } from './supabase';

// Types corrigés et enrichis
export interface ReferralValidation {
  isValid: boolean;
  referrerId?: string;
  referrerName?: string;
  referrerCode?: string;
  error?: string;
}

export interface ReferralStats {
  totalFilleuls: number;
  filleulesActifs: number;
  filleulesClients: number;
  filleulesFourmiz: number;
  filleulesProfilComplet: number;
  filleulesRecents: number;
  totalBonusEarned: number;
  totalCommissionEarned: number;
  filleulesWithFirstOrder: number;
}

export interface FilleulData {
  id: string;
  filleulId: string;
  name: string;
  email: string;
  roles: string[];
  type: 'client' | 'fourmiz';
  codeUtilise: string;
  statut: string;
  dateParrainage: string;
  dateInscription: string;
  profileCompleted: boolean;
  bonusEarned: number;
  totalCommissionEarned: number;
  firstOrderCompleted: boolean;
  firstOrderDate: string | null;
}

export interface ParrainData {
  id: string;
  name: string;
  codeUtilise: string;
  dateParrainage: string;
  bonusEarned: number;
  totalCommissionEarned: number;
}

// ===== VALIDATION DU CODE DE PARRAINAGE (VERSION DEBUG) =====
export const validateReferralCode = async (code: string): Promise<ReferralValidation> => {
  // ➕ LIGNE DE TEST - POUR VÉRIFIER QUE LE NOUVEAU FICHIER EST UTILISÉ
  console.log('🚀 NOUVEAU FICHIER DÉTECTÉ - Version debug active');
  
  if (!code.trim()) {
    return { isValid: false };
  }

  try {
    console.log('🔍 DEBUG - Validation code:', code);

    // ➕ TEST SQL DIRECT POUR DIAGNOSTIC
    const { data: directTest, error: directError } = await supabase
      .from('user_referral_codes')
      .select('code, user_id, is_active')
      .eq('code', code.toUpperCase())
      .eq('is_active', true);

    console.log('🔍 DEBUG - Test direct SQL:', directTest, 'Error:', directError);

    // Test 1: Vérifier que le code existe
    const { data: codeData, error: codeError } = await supabase
      .from('user_referral_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true);

    console.log('🔍 DEBUG - Code data:', codeData, 'Error:', codeError);

    if (codeError || !codeData || codeData.length === 0) {
      console.log('❌ DEBUG - Code non trouvé');
      return { 
        isValid: false, 
        error: 'Code de parrainage invalide ou inactif' 
      };
    }

    // Test 2: Récupérer les infos du propriétaire
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, firstname, lastname, email')
      .eq('id', codeData[0].user_id)
      .single();

    console.log('🔍 DEBUG - Profile data:', profileData, 'Error:', profileError);

    if (profileError || !profileData) {
      console.log('❌ DEBUG - Profil non trouvé');
      return { 
        isValid: false, 
        error: 'Utilisateur propriétaire du code introuvable' 
      };
    }

    console.log('✅ DEBUG - Validation réussie');
    
    return {
      isValid: true,
      referrerId: profileData.id,
      referrerName: `${profileData.firstname} ${profileData.lastname}`,
      referrerCode: codeData[0].code
    };

  } catch (error) {
    console.error('💥 DEBUG - Erreur validation:', error);
    return { 
      isValid: false, 
      error: 'Erreur lors de la validation: ' + (error?.message || 'Erreur inconnue')
    };
  }
};

// ===== GÉNÉRATION CODE UNIQUE (optimisé) =====
export const generateUniqueCode = async (): Promise<string> => {
  const digits = '0123456789';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    let result = '';
    
    // Format CLCLCL : alternance chiffre-lettre
    for (let i = 0; i < 6; i++) {
      if (i % 2 === 0) {
        result += digits.charAt(Math.floor(Math.random() * digits.length));
      } else {
        result += letters.charAt(Math.floor(Math.random() * letters.length));
      }
    }
    
    // Vérifier unicité
    const { data: existing } = await supabase
      .from('user_referral_codes')
      .select('code')
      .eq('code', result)
      .single();
    
    if (!existing) {
      console.log(`✅ Code unique généré: ${result}`);
      return result;
    }
    
    attempts++;
  }
  
  // Fallback avec timestamp
  const timestamp = Date.now().toString();
  return '9Z' + timestamp.slice(-2) + 'X' + timestamp.slice(-1);
};

// ===== CRÉATION LIEN DE PARRAINAGE (CORRIGÉ ET UNIFIÉ) =====
export const createReferralLink = async (
  parrainId: string, 
  filleulId: string, 
  codeUtilise: string
): Promise<boolean> => {
  try {
    console.log('🔗 Création lien parrainage:', { parrainId, filleulId, codeUtilise });

    // Vérifier si le lien existe déjà pour éviter les doublons
    const { data: existing } = await supabase
      .from('user_referrals')
      .select('id')
      .eq('referred_user_id', filleulId)
      .eq('referrer_user_id', parrainId)
      .single();

    if (existing) {
      console.log('✅ Lien de parrainage existe déjà:', existing.id);
      return true; // Considéré comme succès
    }

    // ✅ COLONNES CORRIGÉES selon votre vraie structure DB
    const { data, error } = await supabase
      .from('user_referrals')
      .insert({
        referrer_user_id: parrainId,        // ✅ Nom correct - PARRAIN
        referred_user_id: filleulId,        // ✅ Nom correct - FILLEUL
        referral_code: codeUtilise,         // ✅ Nom correct
        status: 'active',                   // ✅ Statut actif par défaut
        bonus_earned: 0,                    // ➕ Prêt pour le bonus
        total_commission_earned: 0,         // ➕ Prêt pour les commissions
        first_order_completed: false,       // ➕ Flag première commande
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur création lien:', error);
      return false;
    }

    console.log('✅ Lien de parrainage créé avec succès:', data);

    // ➕ NOUVEAU : Incrémenter le compteur d'usage du code
    const { error: updateError } = await supabase
      .from('user_referral_codes')
      .update({ 
        usage_count: supabase.sql`usage_count + 1`,  // Incrément atomique
        updated_at: new Date().toISOString()
      })
      .eq('code', codeUtilise)
      .eq('is_active', true);

    if (updateError) {
      console.warn('⚠️ Erreur mise à jour compteur usage:', updateError);
      // On ne fait pas échouer le parrainage pour autant
    } else {
      console.log('✅ Compteur d\'usage mis à jour');
    }

    return true;

  } catch (error) {
    console.error('💥 Exception lien parrainage:', error);
    return false;
  }
};

// ===== FONCTION ALTERNATIVE POUR COMPATIBILITÉ (ordre paramètres différent) =====
export const createReferralLinkLegacy = async (
  filleulId: string, 
  parrainId: string, 
  codeUtilise: string
): Promise<boolean> => {
  // Appelle la fonction principale avec les paramètres réordonnés
  return await createReferralLink(parrainId, filleulId, codeUtilise);
};

// ===== APPLICATION COMPLÈTE DU PARRAINAGE =====
export const applyReferral = async (filleulId: string, code: string): Promise<boolean> => {
  console.log('🎯 Application parrainage:', { filleulId, code });
  
  try {
    // 1. Valider le code
    const validation = await validateReferralCode(code);
    if (!validation.isValid || !validation.referrerId) {
      console.log('❌ Code invalide, abandon');
      return false;
    }

    // 2. Vérifier que l'utilisateur peut être parrainé
    const canBeReferred = await canUserBeReferred(filleulId);
    if (!canBeReferred) {
      console.log('❌ Utilisateur déjà parrainé');
      return false;
    }

    // 3. Créer le lien
    const linkCreated = await createReferralLink(
      validation.referrerId,
      filleulId,
      code
    );

    if (!linkCreated) {
      console.log('❌ Échec création lien');
      return false;
    }

    console.log('✅ Parrainage appliqué avec succès !');
    return true;

  } catch (error) {
    console.error('💥 Erreur application parrainage:', error);
    return false;
  }
};

// ===== RÉCUPÉRATION DES FILLEULS (CORRIGÉ) =====
export const getUserReferrals = async (parrainId: string): Promise<FilleulData[]> => {
  try {
    console.log('📋 Récupération filleuls pour:', parrainId);

    // ✅ REQUÊTE CORRIGÉE avec les bons noms de colonnes
    const { data: referrals, error } = await supabase
      .from('user_referrals')
      .select(`
        id,
        referral_code,
        status,
        bonus_earned,
        total_commission_earned,
        first_order_completed,
        first_order_date,
        created_at,
        referred_user:referred_user_id (
          id,
          firstname,
          lastname,
          email,
          roles,
          profile_completed,
          created_at
        )
      `)
      .eq('referrer_user_id', parrainId)  // ✅ Nom correct
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération filleuls:', error);
      return [];
    }

    if (!referrals || referrals.length === 0) {
      console.log('ℹ️ Aucun filleul trouvé');
      return [];
    }

    console.log(`✅ ${referrals.length} filleul(s) trouvé(s)`);
    
    return referrals
      .filter(r => r.referred_user)
      .map(referral => ({
        id: referral.id,
        filleulId: referral.referred_user.id,
        name: `${referral.referred_user.firstname} ${referral.referred_user.lastname}`,
        email: referral.referred_user.email,
        roles: referral.referred_user.roles || [],
        type: (referral.referred_user.roles?.includes('fourmiz')) ? 'fourmiz' : 'client',
        codeUtilise: referral.referral_code,           // ✅ Nom correct
        statut: referral.status,                       // ✅ Nom correct
        dateParrainage: referral.created_at,
        dateInscription: referral.referred_user.created_at,
        profileCompleted: referral.referred_user.profile_completed,
        // ➕ NOUVELLES DONNÉES financières
        bonusEarned: parseFloat(referral.bonus_earned || '0'),
        totalCommissionEarned: parseFloat(referral.total_commission_earned || '0'),
        firstOrderCompleted: referral.first_order_completed || false,
        firstOrderDate: referral.first_order_date
      }));

  } catch (error) {
    console.error('💥 Exception récupération filleuls:', error);
    return [];
  }
};

// ===== CALCUL DES STATISTIQUES (ENRICHI) =====
export const calculateStats = (filleuls: FilleulData[]): ReferralStats => {
  const unMoisAgo = new Date();
  unMoisAgo.setMonth(unMoisAgo.getMonth() - 1);

  return {
    totalFilleuls: filleuls.length,
    filleulesActifs: filleuls.filter(f => f.statut === 'active' || f.statut === 'pending').length,
    filleulesClients: filleuls.filter(f => f.type === 'client').length,
    filleulesFourmiz: filleuls.filter(f => f.type === 'fourmiz').length,
    filleulesProfilComplet: filleuls.filter(f => f.profileCompleted).length,
    filleulesRecents: filleuls.filter(f => new Date(f.dateParrainage) > unMoisAgo).length,
    // ➕ NOUVELLES STATS financières
    totalBonusEarned: filleuls.reduce((sum, f) => sum + f.bonusEarned, 0),
    totalCommissionEarned: filleuls.reduce((sum, f) => sum + f.totalCommissionEarned, 0),
    filleulesWithFirstOrder: filleuls.filter(f => f.firstOrderCompleted).length
  };
};

// ===== CHARGEMENT DONNÉES COMPLÈTES (CORRIGÉ) =====
export const loadReferralData = async (userId: string) => {
  try {
    console.log('🔄 Chargement données complètes pour:', userId);

    // 1. Code de l'utilisateur
    const { data: userCode } = await supabase
      .from('user_referral_codes')
      .select('code, is_active, created_at, usage_count')  // ➕ usage_count
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    // 2. Ses filleuls
    const filleuls = await getUserReferrals(userId);

    // 3. Son parrain (✅ CORRIGÉ)
    const { data: parrainData } = await supabase
      .from('user_referrals')
      .select(`
        id,
        referral_code,
        created_at,
        bonus_earned,
        total_commission_earned,
        referrer_user:referrer_user_id (
          id,
          firstname,
          lastname
        )
      `)
      .eq('referred_user_id', userId)  // ✅ Nom correct
      .single();

    // 4. Statistiques
    const stats = calculateStats(filleuls);

    return {
      userCode: userCode?.code || null,
      codeCreatedAt: userCode?.created_at || null,
      codeUsageCount: userCode?.usage_count || 0,  // ➕ NOUVEAU
      filleuls,
      parrain: parrainData ? {
        id: parrainData.id,
        name: `${parrainData.referrer_user.firstname} ${parrainData.referrer_user.lastname}`,
        codeUtilise: parrainData.referral_code,
        dateParrainage: parrainData.created_at,
        // ➕ NOUVELLES DONNÉES financières du parrainage
        bonusEarned: parseFloat(parrainData.bonus_earned || '0'),
        totalCommissionEarned: parseFloat(parrainData.total_commission_earned || '0')
      } : null,
      stats
    };

  } catch (error) {
    console.error('💥 Erreur chargement données:', error);
    return {
      userCode: null,
      codeCreatedAt: null,
      codeUsageCount: 0,
      filleuls: [],
      parrain: null,
      stats: calculateStats([])
    };
  }
};

// ➕ NOUVELLES FONCTIONS pour gérer les bonus/commissions

// Déclencher le bonus de première commande
export const triggerFirstOrderBonus = async (userId: string, orderId: number, orderAmount: number) => {
  try {
    console.log('🎁 Déclenchement bonus première commande pour:', userId);

    // 1. Trouver le parrainage de cet utilisateur
    const { data: referralData, error: findError } = await supabase
      .from('user_referrals')
      .select('id, referrer_user_id, bonus_earned, first_order_completed')
      .eq('referred_user_id', userId)
      .eq('first_order_completed', false)  // Seulement si pas encore fait
      .single();

    if (findError || !referralData) {
      console.log('ℹ️ Pas de parrainage en attente pour cet utilisateur');
      return { success: false, message: 'Pas de parrainage en attente' };
    }

    // 2. Configuration du bonus (pour l'instant hardcodé, à rendre dynamique plus tard)
    const BONUS_AMOUNT = 10.00;
    
    // 3. Mettre à jour le parrainage avec le bonus
    const { error: updateError } = await supabase
      .from('user_referrals')
      .update({
        bonus_earned: BONUS_AMOUNT,
        first_order_completed: true,
        first_order_date: new Date().toISOString(),
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', referralData.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour bonus:', updateError);
      return { success: false, message: 'Erreur technique' };
    }

    console.log(`✅ Bonus de ${BONUS_AMOUNT}€ attribué au parrain`);
    
    return {
      success: true,
      message: 'Bonus de parrainage attribué',
      bonusAmount: BONUS_AMOUNT,
      referrerId: referralData.referrer_user_id
    };

  } catch (error) {
    console.error('💥 Erreur bonus première commande:', error);
    return { success: false, message: 'Erreur technique' };
  }
};

// Ajouter une commission sur une commande récurrente
export const addCommission = async (userId: string, commissionAmount: number) => {
  try {
    console.log('💰 Ajout commission pour:', userId, 'montant:', commissionAmount);

    const { data: referralData, error: findError } = await supabase
      .from('user_referrals')
      .select('id, total_commission_earned')
      .eq('referred_user_id', userId)
      .single();

    if (findError || !referralData) {
      console.log('ℹ️ Pas de parrainage trouvé pour cet utilisateur');
      return { success: false, message: 'Pas de parrainage trouvé' };
    }

    const newTotal = parseFloat(referralData.total_commission_earned || '0') + commissionAmount;

    const { error: updateError } = await supabase
      .from('user_referrals')
      .update({
        total_commission_earned: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', referralData.id);

    if (updateError) {
      console.error('❌ Erreur ajout commission:', updateError);
      return { success: false, message: 'Erreur technique' };
    }

    console.log(`✅ Commission de ${commissionAmount}€ ajoutée (total: ${newTotal}€)`);
    
    return {
      success: true,
      message: 'Commission ajoutée',
      commissionAmount,
      newTotal
    };

  } catch (error) {
    console.error('💥 Erreur ajout commission:', error);
    return { success: false, message: 'Erreur technique' };
  }
};

// ➕ FONCTION UTILITAIRE pour vérifier si un utilisateur peut être parrainé
export const canUserBeReferred = async (userId: string): Promise<boolean> => {
  try {
    const { data: existingReferral } = await supabase
      .from('user_referrals')
      .select('id')
      .eq('referred_user_id', userId)
      .single();

    // Si aucun parrainage trouvé, l'utilisateur peut être parrainé
    return !existingReferral;

  } catch (error) {
    console.error('Erreur vérification éligibilité parrainage:', error);
    return false;
  }
};

// ➕ FONCTION UTILITAIRE pour obtenir les gains totaux d'un parrain
export const getTotalEarnings = async (parrainId: string) => {
  try {
    const { data: earnings, error } = await supabase
      .from('user_referrals')
      .select('bonus_earned, total_commission_earned')
      .eq('referrer_user_id', parrainId);

    if (error || !earnings) {
      return { totalBonus: 0, totalCommission: 0, totalEarnings: 0 };
    }

    const totalBonus = earnings.reduce((sum, e) => sum + parseFloat(e.bonus_earned || '0'), 0);
    const totalCommission = earnings.reduce((sum, e) => sum + parseFloat(e.total_commission_earned || '0'), 0);

    return {
      totalBonus,
      totalCommission,
      totalEarnings: totalBonus + totalCommission
    };

  } catch (error) {
    console.error('Erreur calcul gains totaux:', error);
    return { totalBonus: 0, totalCommission: 0, totalEarnings: 0 };
  }
};

// ===== EXPORT PAR DÉFAUT AVEC TOUTES LES FONCTIONS =====
export default {
  // Fonctions principales
  validateReferralCode,
  createReferralLink,
  createReferralLinkLegacy,
  applyReferral,
  
  // Génération et codes
  generateUniqueCode,
  
  // Récupération données
  getUserReferrals,
  loadReferralData,
  calculateStats,
  
  // Bonus et commissions
  triggerFirstOrderBonus,
  addCommission,
  getTotalEarnings,
  
  // Utilitaires
  canUserBeReferred
};
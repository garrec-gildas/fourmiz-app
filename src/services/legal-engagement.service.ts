// services/legal-engagement.service.ts
// Service pour gérer les appels API liés aux engagements légaux

import { supabase } from '../../lib/supabase';
import type {
  LegalEngagementType,
  UserLegalEngagement,
  GrandfatheredStatus,
  ComplianceStatus,
  AcceptEngagementParams
} from '../types/legal-engagements';

export class LegalEngagementService {
  
  /**
   * Récupère tous les types d'engagements actifs pour Fourmiz
   */
  static async getFourmizEngagementTypes(): Promise<LegalEngagementType[]> {
    try {
      const { data, error } = await supabase
        .from('legal_engagement_types')
        .select('*')
        .eq('is_active', true)
        .eq('is_required_for_fourmiz', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erreur récupération types engagements:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erreur service getFourmizEngagementTypes:', error);
      return []; // Retourner array vide en cas d'erreur
    }
  }

  /**
   * Récupère les engagements acceptés d'un utilisateur
   */
  static async getUserEngagements(userId: string): Promise<UserLegalEngagement[]> {
    if (!userId) {
      throw new Error('User ID requis');
    }

    try {
      const { data, error } = await supabase
        .from('user_legal_engagements')
        .select('*')
        .eq('user_id', userId)
        .eq('is_accepted', true)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération engagements utilisateur:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erreur service getUserEngagements:', error);
      throw error;
    }
  }

  /**
   * Vérifie le statut grandfathered d'un utilisateur
   */
  static async checkGrandfatheredStatus(userId: string): Promise<GrandfatheredStatus> {
    if (!userId) {
      throw new Error('User ID requis');
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('grandfathered_fourmiz, legal_engagements_required, roles, profile_completed')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur vérification statut grandfathered:', error);
        throw error;
      }

      if (!data) {
        return { 
          isGrandfathered: false, 
          engagementsRequired: true 
        };
      }

      return {
        isGrandfathered: data.grandfathered_fourmiz || false,
        engagementsRequired: data.legal_engagements_required !== false
      };
    } catch (error) {
      console.error('Erreur service checkGrandfatheredStatus:', error);
      return { 
        isGrandfathered: false, 
        engagementsRequired: true 
      };
    }
  }

  /**
   * Vérifie la compliance avec gestion du grandfathering
   */
  static async checkUserFourmizCompliance(userId: string): Promise<ComplianceStatus> {
    if (!userId) {
      throw new Error('User ID requis');
    }

    try {
      const status = await this.checkGrandfatheredStatus(userId);
      
      // Si grandfathered, toujours compliant
      if (status.isGrandfathered) {
        return {
          isCompliant: true,
          isGrandfathered: true,
          reason: 'Profil Fourmiz existant (droit acquis)'
        };
      }

      // Si engagements requis, vérifier la compliance classique
      if (status.engagementsRequired) {
        const { data, error } = await supabase
          .rpc('check_user_fourmiz_engagements', { p_user_id: userId });

        if (error) {
          console.error('Erreur fonction compliance:', error);
          throw error;
        }
        
        return {
          isCompliant: data === true,
          isGrandfathered: false,
          reason: data === true ? 'Engagements acceptés' : 'Engagements manquants'
        };
      }

      return {
        isCompliant: true,
        isGrandfathered: false,
        reason: 'Engagements non requis'
      };
    } catch (error) {
      console.error('Erreur service checkUserFourmizCompliance:', error);
      return {
        isCompliant: false,
        isGrandfathered: false,
        reason: 'Erreur de vérification'
      };
    }
  }

  /**
   * Accepte tous les engagements en une fois
   */
  static async acceptAllEngagements(params: AcceptEngagementParams): Promise<void> {
    const { userId, engagementTypes, ipAddress, userAgent } = params;

    if (!userId || !engagementTypes.length) {
      throw new Error('Paramètres manquants pour accepter les engagements');
    }

    try {
      const engagements = engagementTypes.map(type => ({
        user_id: userId,
        engagement_type_id: type.id,
        is_accepted: true,
        accepted_at: new Date().toISOString(),
        accepted_version: type.version,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('user_legal_engagements')
        .upsert(engagements, {
          onConflict: 'user_id,engagement_type_id,accepted_version'
        });

      if (error) {
        console.error('Erreur acceptation engagements multiples:', error);
        throw error;
      }

      console.log(`✅ ${engagements.length} engagements acceptés pour l'utilisateur ${userId}`);
    } catch (error) {
      console.error('Erreur service acceptAllEngagements:', error);
      throw error;
    }
  }

  /**
   * Révoque un engagement spécifique
   */
  static async revokeEngagement(
    userId: string, 
    engagementTypeId: string, 
    reason?: string
  ): Promise<void> {
    if (!userId || !engagementTypeId) {
      throw new Error('Paramètres manquants pour révoquer l\'engagement');
    }

    try {
      const { error } = await supabase
        .from('user_legal_engagements')
        .update({
          is_accepted: false,
          revoked_at: new Date().toISOString(),
          revoked_reason: reason || 'Révoqué par l\'utilisateur',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('engagement_type_id', engagementTypeId)
        .eq('is_accepted', true)
        .is('revoked_at', null);

      if (error) {
        console.error('Erreur révocation engagement:', error);
        throw error;
      }

      console.log(`✅ Engagement ${engagementTypeId} révoqué pour l'utilisateur ${userId}`);
    } catch (error) {
      console.error('Erreur service revokeEngagement:', error);
      throw error;
    }
  }

  /**
   * Récupère l'historique des engagements d'un utilisateur
   */
  static async getUserEngagementHistory(userId: string): Promise<UserLegalEngagement[]> {
    if (!userId) {
      throw new Error('User ID requis');
    }

    try {
      const { data, error } = await supabase
        .from('user_legal_engagements')
        .select(`
          *,
          legal_engagement_types!inner(
            code,
            title,
            description,
            version
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération historique engagements:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erreur service getUserEngagementHistory:', error);
      throw error;
    }
  }

  /**
   * Vérifie si un engagement spécifique est accepté par l'utilisateur
   */
  static async isEngagementAcceptedByUser(
    userId: string, 
    engagementCode: string
  ): Promise<boolean> {
    if (!userId || !engagementCode) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('user_legal_engagements')
        .select('id')
        .eq('user_id', userId)
        .eq('is_accepted', true)
        .is('revoked_at', null)
        .eq('legal_engagement_types.code', engagementCode)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur vérification engagement spécifique:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Erreur service isEngagementAcceptedByUser:', error);
      return false;
    }
  }

  /**
   * Met à jour le statut grandfathered d'un utilisateur (admin uniquement)
   */
  static async updateGrandfatheredStatus(
    userId: string, 
    isGrandfathered: boolean,
    engagementsRequired: boolean = true
  ): Promise<void> {
    if (!userId) {
      throw new Error('User ID requis');
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          grandfathered_fourmiz: isGrandfathered,
          legal_engagements_required: engagementsRequired,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Erreur mise à jour statut grandfathered:', error);
        throw error;
      }

      console.log(`✅ Statut grandfathered mis à jour: ${isGrandfathered} pour ${userId}`);
    } catch (error) {
      console.error('Erreur service updateGrandfatheredStatus:', error);
      throw error;
    }
  }
}
// lib/services.service.ts - VERSION CORRIGÉE POUR VOTRE STRUCTURE
import { supabase } from './supabase';

export interface ServiceAssignment {
  id: string;
  user_id: string;
  service_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export class ServicesService {
  
  /**
   * Récupérer les services assignés à un utilisateur
   */
  static async getUserServices(userId: string): Promise<ServiceAssignment[]> {
    try {
      console.log('🔄 Récupération des services pour:', userId);

      const { data, error } = await supabase
        .from('service_assignments')
        .select('*')
        .eq('user_id', userId); // ✅ Utilise user_id selon votre structure

      if (error) {
        console.error('❌ Erreur lors de la récupération des services:', error);
        return [];
      }

      console.log('✅ Services récupérés:', data?.length || 0);
      return data || [];

    } catch (error) {
      console.error('❌ Erreur inattendue:', error);
      return [];
    }
  }

  /**
   * Récupérer les services avec détails
   */
  static async getUserServicesWithDetails(userId: string) {
    try {
      console.log('🔄 Récupération des services détaillés pour:', userId);

      const { data, error } = await supabase
        .from('service_assignments')
        .select(`
          *,
          services:service_id (
            id,
            name,
            description,
            category,
            price
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        console.error('❌ Erreur lors de la récupération:', error);
        return [];
      }

      console.log('✅ Services détaillés récupérés:', data?.length || 0);
      return data || [];

    } catch (error) {
      console.error('❌ Erreur inattendue:', error);
      return [];
    }
  }

  /**
   * Créer une nouvelle assignation de service
   */
  static async createServiceAssignment(
    userId: string, 
    serviceId: number, 
    status: string = 'active'
  ): Promise<ServiceAssignment | null> {
    try {
      const { data, error } = await supabase
        .from('service_assignments')
        .insert({
          user_id: userId,
          service_id: serviceId,
          status: status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur création service assignment:', error);
        return null;
      }

      console.log('✅ Service assignment créé:', data);
      return data;

    } catch (error) {
      console.error('❌ Erreur inattendue:', error);
      return null;
    }
  }

  /**
   * Mettre à jour le statut d'un service
   */
  static async updateServiceStatus(
    assignmentId: string, 
    status: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('service_assignments')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) {
        console.error('❌ Erreur mise à jour statut:', error);
        return false;
      }

      console.log('✅ Statut mis à jour:', status);
      return true;

    } catch (error) {
      console.error('❌ Erreur inattendue:', error);
      return false;
    }
  }

  /**
   * Supprimer une assignation de service
   */
  static async deleteServiceAssignment(assignmentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('service_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('❌ Erreur suppression:', error);
        return false;
      }

      console.log('✅ Service assignment supprimé');
      return true;

    } catch (error) {
      console.error('❌ Erreur inattendue:', error);
      return false;
    }
  }

  /**
   * Récupérer tous les services disponibles
   */
  static async getAllServices() {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('❌ Erreur récupération services:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('❌ Erreur inattendue:', error);
      return [];
    }
  }

  /**
   * Rechercher des services par catégorie
   */
  static async getServicesByCategory(category: string) {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('❌ Erreur recherche par catégorie:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('❌ Erreur inattendue:', error);
      return [];
    }
  }

  /**
   * Statistiques des services d'un utilisateur
   */
  static async getUserServiceStats(userId: string) {
    try {
      const services = await this.getUserServices(userId);
      
      const stats = {
        total: services.length,
        active: services.filter(s => s.status === 'active').length,
        inactive: services.filter(s => s.status === 'inactive').length,
        pending: services.filter(s => s.status === 'pending').length,
      };

      return stats;

    } catch (error) {
      console.error('❌ Erreur calcul statistiques:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        pending: 0,
      };
    }
  }
}

export default ServicesService;
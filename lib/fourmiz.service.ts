// lib/fourmiz.service.ts
import { supabase } from './supabase';

export interface FourmizCriteriaAdapted {
  user_id: string;
  
  // RGPD
  rgpd_accepte_cgu: boolean;
  rgpd_accepte_politique_confidentialite: boolean;
  rgpd_accepte_traitement_donnees: boolean;
  rgpd_newsletter_marketing: boolean;
  rgpd_notifications_push_marketing: boolean;
  
  // Services
  categories_completes: string[];
  selected_service_ids: number[];
  
  // Transport
  transport_moyens: string[];
  rayon_deplacement_km: number;
  
  // Disponibilités
  disponibilites_horaires_detaillees: string[];
  
  // Tarifs
  prix_minimum_heure: number;
  note_client_minimum: number;
  
  // Autres
  mots_cles_notifications: string[];
  location?: string;
  is_active: boolean;
  is_available: boolean;
}

export interface FourmizSearchParams {
  categories?: string[];
  service_ids?: number[];
  rayon_max?: number;
  prix_max?: number;
  note_min?: number;
  mots_cles?: string[];
  limit?: number;
}

export interface FourmizSearchResult {
  user_id: string;
  score: number;
  prix_minimum_heure: number;
  rayon_deplacement_km: number;
  nb_categories: number;
}

class FourmizService {
  
  /**
   * Récupérer les critères d'un utilisateur
   */
  async getCriteria(userId: string): Promise<FourmizCriteriaAdapted | null> {
    try {
      const { data, error } = await supabase
        .from('fourmiz_criteria')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erreur récupération critères:', error);
      return null;
    }
  }

  /**
   * Sauvegarder/Mettre à jour les critères (upsert)
   */
  async saveCriteria(criteria: Partial<FourmizCriteriaAdapted>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('fourmiz_criteria')
        .upsert(criteria, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Erreur sauvegarde critères:', error);
      return false;
    }
  }

  /**
   * Recherche avancée de fourmiz
   */
  async searchFourmiz(params: FourmizSearchParams): Promise<FourmizSearchResult[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_fourmiz_simple', {
          p_categories: params.categories || null,
          p_rayon_max: params.rayon_max || 50,
          p_prix_max: params.prix_max || 1000,
          p_limit: params.limit || 20
        });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erreur recherche fourmiz:', error);
      return [];
    }
  }

  /**
   * Obtenir les statistiques des critères
   */
  async getStats(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('fourmiz_criteria_simple')
        .select('*');

      if (error) {
        throw error;
      }

      const stats = {
        total: data.length,
        actifs: data.filter(c => c.is_active).length,
        disponibles: data.filter(c => c.is_available).length,
        completion_moyenne: data.reduce((acc, c) => acc + (c.profil_complet_pourcent || 0), 0) / data.length,
        prix_moyen: data.reduce((acc, c) => acc + (c.prix_minimum_heure || 0), 0) / data.length,
        rayon_moyen: data.reduce((acc, c) => acc + (c.rayon_deplacement_km || 0), 0) / data.length
      };

      return stats;
    } catch (error) {
      console.error('Erreur statistiques:', error);
      return null;
    }
  }

  /**
   * Vérifier si un utilisateur a des critères conformes RGPD
   */
  async isRGPDCompliant(userId: string): Promise<boolean> {
    try {
      const criteria = await this.getCriteria(userId);
      
      return criteria && 
        criteria.rgpd_accepte_cgu && 
        criteria.rgpd_accepte_politique_confidentialite && 
        criteria.rgpd_accepte_traitement_donnees;
    } catch (error) {
      console.error('Erreur vérification RGPD:', error);
      return false;
    }
  }

  /**
   * Obtenir les fourmiz disponibles par catégorie
   */
  async getFourmizByCategory(category: string, limit: number = 10): Promise<FourmizSearchResult[]> {
    return this.searchFourmiz({
      categories: [category],
      limit
    });
  }

  /**
   * Obtenir les fourmiz dans un rayon donné
   */
  async getFourmizByRadius(rayon: number, limit: number = 10): Promise<FourmizSearchResult[]> {
    return this.searchFourmiz({
      rayon_max: rayon,
      limit
    });
  }

  /**
   * Mise à jour du statut de disponibilité
   */
  async updateAvailability(userId: string, isAvailable: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('fourmiz_criteria')
        .update({ 
          is_available: isAvailable,
          derniere_activite: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Erreur mise à jour disponibilité:', error);
      return false;
    }
  }

  /**
   * Supprimer les critères d'un utilisateur
   */
  async deleteCriteria(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('fourmiz_criteria')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Erreur suppression critères:', error);
      return false;
    }
  }

  /**
   * Valider les critères avant sauvegarde
   */
  validateCriteria(criteria: Partial<FourmizCriteriaAdapted>): string[] {
    const errors: string[] = [];

    // RGPD obligatoire
    if (!criteria.rgpd_accepte_cgu || !criteria.rgpd_accepte_politique_confidentialite || !criteria.rgpd_accepte_traitement_donnees) {
      errors.push('Les acceptations RGPD obligatoires doivent être validées');
    }

    // Rayon valide
    if (criteria.rayon_deplacement_km && (criteria.rayon_deplacement_km < 1 || criteria.rayon_deplacement_km > 100)) {
      errors.push('Le rayon doit être entre 1 et 100 km');
    }

    // Prix valide
    if (criteria.prix_minimum_heure && (criteria.prix_minimum_heure < 5 || criteria.prix_minimum_heure > 500)) {
      errors.push('Le prix doit être entre 5 et 500 €/h');
    }

    // Note valide
    if (criteria.note_client_minimum && (criteria.note_client_minimum < 1 || criteria.note_client_minimum > 5)) {
      errors.push('La note doit être entre 1 et 5');
    }

    return errors;
  }

  /**
   * Calculer le pourcentage de completion d'un profil
   */
  calculateCompletionPercent(criteria: Partial<FourmizCriteriaAdapted>): number {
    let points = 0;

    // RGPD (20 points)
    if (criteria.rgpd_accepte_cgu && criteria.rgpd_accepte_politique_confidentialite && criteria.rgpd_accepte_traitement_donnees) {
      points += 20;
    }

    // Services (20 points)
    if ((criteria.categories_completes && criteria.categories_completes.length > 0) || 
        (criteria.selected_service_ids && criteria.selected_service_ids.length > 0)) {
      points += 20;
    }

    // Transport (15 points)
    if (criteria.transport_moyens && criteria.transport_moyens.length > 0 && criteria.rayon_deplacement_km && criteria.rayon_deplacement_km > 0) {
      points += 15;
    }

    // Disponibilités (15 points)
    if (criteria.disponibilites_horaires_detaillees && criteria.disponibilites_horaires_detaillees.length > 0) {
      points += 15;
    }

    // Tarifs (10 points)
    if (criteria.prix_minimum_heure && criteria.prix_minimum_heure > 0) {
      points += 10;
    }

    // Localisation (10 points)
    if (criteria.location && criteria.location.length > 3) {
      points += 10;
    }

    // Mots-clés (10 points)
    if (criteria.mots_cles_notifications && criteria.mots_cles_notifications.length > 0) {
      points += 10;
    }

    return points;
  }
}

// Instance singleton
export const fourmizService = new FourmizService();
export default fourmizService;
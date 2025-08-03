// types/services.types.ts
// Types pour la table services existante

export interface Service {
  id: number;
  user_id?: string;
  created_at: string;
  estimatedDuration?: number;
  isEligibleTaxCredit?: boolean;
  category_id?: string;
  title: string;
  description?: string;
  categorie?: string;
  slug?: string;
  icon?: string;
}

// Interface pour les catégories de services fourmiz
export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  services: Service[];
}

// Mapping entre les critères fourmiz et les services existants
export interface FourmizServiceMapping {
  fourmiz_category_key: string; // clé du FOURMIZ_CRITERIA
  fourmiz_category_label: string;
  fourmiz_category_icon: string;
  mapped_services: {
    service_id?: number;
    category_id?: string;
    categorie?: string;
    title_pattern?: string; // pattern pour matcher les titres
    description_pattern?: string; // pattern pour matcher les descriptions
  }[];
}

// Interface pour les critères fourmiz adaptés
export interface FourmizCriteriaAdapted {
  user_id: string;
  
  // Services sélectionnés (mapping avec table services)
  selected_service_ids?: number[];
  selected_category_ids?: string[];
  selected_categories_text?: string[]; // categorie field
  
  // Critères fourmiz originaux (optionnels)
  categories_completes?: string[];
  services_individuels?: string[];
  flexibilite_services?: string[];
  mots_cles_notifications?: string[];
  mots_cles_options?: string[];
  
  // Transport
  transport_moyens?: string[];
  transport_documents?: string[];
  transport_options?: string[];
  rayon_deplacement_km?: number;
  
  // Équipement
  equipement_fourni?: string[];
  equipement_preferences?: string[];
  
  // Clientèle
  clientele_logement?: string[];
  clientele_preferences?: string[];
  
  // Planning récurrent
  disponibilites_horaires_detaillees?: string[];
  disponibilites_jours_semaine?: string[];
  disponibilites_flexibilite?: string[];
  
  // Conditions
  conditions_environnement?: string[];
  conditions_equipements?: string[];
  
  // Expérience
  experience_niveau?: string;
  experience_certifications?: string[];
  experience_langues?: string[];
  
  // Sécurité
  securite_validations?: string[];
  
  // Communication
  communication_modes?: string[];
  
  // Tarifs
  prix_minimum_heure?: number;
  tarifs_duree?: string[];
  tarifs_facturation?: string[];
  note_client_minimum?: number;
  
  // RGPD
  rgpd_accepte_cgu?: boolean;
  rgpd_accepte_politique_confidentialite?: boolean;
  rgpd_accepte_traitement_donnees?: boolean;
  rgpd_newsletter_marketing?: boolean;
  rgpd_notifications_push_marketing?: boolean;
  rgpd_partage_donnees_partenaires?: boolean;
  rgpd_utilisation_cookies_analytics?: boolean;
  rgpd_geolocalisation_precise?: boolean;
  rgpd_date_acceptation?: string;
  rgpd_ip_acceptation?: string;
  
  // Conformité réglementaire
  regl_respect_code_route?: boolean;
  regl_interdiction_produits_illicites?: boolean;
  regl_verification_age_majorite?: boolean;
  regl_respect_hygiene_alimentaire?: boolean;
  regl_protection_mineurs?: boolean;
  regl_respect_droit_travail?: boolean;
  regl_assurance_responsabilite?: boolean;
  regl_declaration_fiscale?: boolean;
  regl_respect_environnement?: boolean;
  regl_manipulation_donnees_sensibles?: boolean;
  regl_date_acceptation?: string;
  regl_ip_acceptation?: string;
  
  // Métadonnées
  created_at: string;
  updated_at: string;
}

// Interface pour les recherches de services
export interface ServiceSearchParams {
  query?: string;
  category_id?: string;
  categorie?: string;
  isEligibleTaxCredit?: boolean;
  estimatedDurationMin?: number;
  estimatedDurationMax?: number;
  user_id?: string;
  limit?: number;
  offset?: number;
}

// Interface pour les résultats de recherche
export interface ServiceSearchResult {
  services: Service[];
  total: number;
  categories: {
    categorie: string;
    count: number;
  }[];
}

// Interface pour les statistiques des services
export interface ServiceStats {
  total_services: number;
  services_by_category: {
    categorie: string;
    count: number;
    percentage: number;
  }[];
  services_with_tax_credit: number;
  average_duration: number;
  most_popular_category: string;
}
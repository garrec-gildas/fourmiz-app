// types/fourmiz-criteria.types.ts
// Types pour la gestion des critères fourmiz

// Structure pour la base de données
export interface FourmizCriteriaDB {
  user_id: string;
  
  // RGPD - Validations obligatoires et consentements
  rgpd_accepte_cgu: boolean; // OBLIGATOIRE
  rgpd_accepte_politique_confidentialite: boolean; // OBLIGATOIRE  
  rgpd_accepte_traitement_donnees: boolean; // OBLIGATOIRE
  rgpd_date_acceptation: string; // Date/heure de validation
  rgpd_ip_acceptation: string; // IP de l'utilisateur lors de l'acceptation
  rgpd_newsletter_marketing?: boolean; // Consentement optionnel
  rgpd_notifications_push_marketing?: boolean; // Consentement optionnel
  rgpd_partage_donnees_partenaires?: boolean; // Consentement optionnel
  rgpd_utilisation_cookies_analytics?: boolean; // Consentement optionnel
  rgpd_geolocalisation_precise?: boolean; // Consentement optionnel
  
  // CONFORMITÉ RÉGLEMENTAIRE - Déclarations selon services proposés
  regl_respect_code_route?: boolean; // Si transport
  regl_interdiction_produits_illicites?: boolean; // Si livraison
  regl_verification_age_majorite?: boolean; // Si services réglementés
  regl_respect_hygiene_alimentaire?: boolean; // Si cuisine/livraison repas
  regl_protection_mineurs?: boolean; // Si garde enfants
  regl_respect_droit_travail: boolean; // OBLIGATOIRE TOUJOURS
  regl_assurance_responsabilite: boolean; // OBLIGATOIRE TOUJOURS
  regl_declaration_fiscale: boolean; // OBLIGATOIRE TOUJOURS
  regl_respect_environnement?: boolean; // Si jardinage/déchets
  regl_manipulation_donnees_sensibles?: boolean; // Si services admin/IT
  regl_date_acceptation: string; // Date/heure de validation réglementaire
  regl_ip_acceptation: string; // IP lors de l'acceptation réglementaire
  
  // CERTIFICATIONS SPÉCIFIQUES (selon services)
  cert_permis_conduire_valide?: boolean;
  cert_casier_judiciaire_vierge?: boolean;
  cert_formation_premiers_secours?: boolean;
  cert_habilitation_electrique?: boolean;
  
  // Services sélectionnés par catégories
  categories_completes?: string[]; // ['menage_entretien', 'bricolage_reparations']
  services_individuels?: string[]; // services spécifiques si pas toute la catégorie
  
  // Flexibilité services
  flexibilite_services?: string[]; // options de flexibilité cochées
  
  // Mots-clés pour notifications personnalisées
  mots_cles_notifications?: string[]; // ['urgent', 'samedi', 'luxury', 'animaux']
  mots_cles_options?: string[]; // options de recherche cochées
  
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
  
  // Planning récurrent - disponibilités habituelles
  disponibilites_horaires_detaillees?: string[]; // h00_01, h01_02, etc.
  disponibilites_jours_semaine?: string[]; // lundi, mardi, etc.
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
  
  // Métadonnées
  created_at: string;
  updated_at: string;
}

// INDISPONIBILITÉS EXCEPTIONNELLES (exceptions au planning récurrent)
export interface FourmizIndisponibilites {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  type: 'journee_complete' | 'demi_journee_matin' | 'demi_journee_apres_midi' | 'creneaux_specifiques';
  heure_debut?: string; // HH:MM (pour créneaux spécifiques)
  heure_fin?: string; // HH:MM (pour créneaux spécifiques)
  recurrente: boolean;
  recurrence_pattern?: 'weekly' | 'monthly' | 'yearly'; // chaque lundi, chaque 1er du mois, etc.
  recurrence_end_date?: string; // YYYY-MM-DD (fin de la récurrence)
  created_at: string;
  updated_at: string;
}

// DISPONIBILITÉ EFFECTIVE (planning récurrent - indisponibilités + missions en cours)
export interface FourmizDisponibiliteEffective {
  user_id: string;
  date: string; // YYYY-MM-DD
  horaires_theoriques: string[]; // selon planning récurrent ['h09_10', 'h10_11', etc.]
  horaires_indisponibles: string[]; // indisponibilités exceptionnelles
  horaires_occupes: string[]; // missions confirmées
  horaires_libres: string[]; // = théoriques - indisponibles - occupés
  statut_global: 'disponible' | 'partiellement_disponible' | 'indisponible' | 'occupe';
  derniere_maj: string;
}

// Table pour les demandes de services hors catalogue
export interface DemandesServicesSpeciaux {
  id: string;
  client_id: string;
  fourmiz_id?: string; // null si pas encore assigné
  titre_service: string;
  description_detaillee: string;
  categorie_supposee?: string; // si similaire à une catégorie existante
  prix_propose?: number;
  localisation: string;
  date_souhaitee: string;
  statut: 'en_attente' | 'etudie_par_fourmiz' | 'accepte' | 'refuse' | 'expire';
  fourmiz_interesses: string[]; // IDs des fourmiz ayant manifesté leur intérêt
  raison_refus?: string;
  created_at: string;
  updated_at: string;
}

// Notifications mots-clés en temps réel
export interface NotificationMotsCles {
  id: string;
  fourmiz_id: string;
  annonce_id: string;
  mot_cle_trouve: string;
  contexte_phrase: string; // phrase complète où le mot-clé a été trouvé
  zone_detection: 'titre' | 'description' | 'localisation';
  pertinence_score: number; // score de pertinence (1-100)
  notifie_le: string;
  vue_le?: string;
  actionnee_le?: string; // si la fourmiz a cliqué pour voir l'annonce
  created_at: string;
}

// Historique des modifications de consentements RGPD
export interface RgpdConsentementHistory {
  id: string;
  user_id: string;
  type_consentement: string; // 'newsletter_marketing', 'geolocalisation_precise', etc.
  ancien_statut: boolean;
  nouveau_statut: boolean;
  date_modification: string;
  ip_modification: string;
  method_modification: 'interface_web' | 'email_unsubscribe' | 'support_client';
}

// Types pour les formulaires UI
export interface CriteriaFormData {
  services: {
    categories_completes: string[];
    services_individuels: string[];
  };
  transport: {
    moyens: string[];
    documents: string[];
    options: string[];
    rayon_km: number;
  };
  disponibilites: {
    horaires_detaillees: string[];
    jours_semaine: string[];
    flexibilite: string[];
  };
  tarifs: {
    prix_minimum: number;
    duree: string[];
    facturation: string[];
    note_client_minimum: number;
  };
  flexibilite: {
    services: string[];
    mots_cles: string[];
    mots_cles_options: string[];
  };
}

// Types pour les options de critères
export interface CriteriaOption {
  key: string;
  label: string;
  icon: string;
  description?: string;
  applicable_si?: string[];
  applicable_toujours?: boolean;
  type?: 'obligatoire' | 'optionnel';
  lien_document?: string;
}

export interface ServiceCategory {
  label: string;
  icon: string;
  services: CriteriaOption[];
}
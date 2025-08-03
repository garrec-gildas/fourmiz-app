// constants/fourmiz-criteria.ts
// Critères fourmiz complets organisés par sections
// 💡 Information : Remplir ces critères vous permet de ne pas être sollicité 
//    pour des prestations qui ne vous intéressent pas ou à des jours 
//    ou des heures qui ne vous intéressent pas.

export const FOURMIZ_CRITERIA = {
  
  // 📋 CONFORMITÉ RGPD - VALIDATION OBLIGATOIRE LORS DE L'INSCRIPTION
  rgpd_validation: {
    // Validations obligatoires (checkbox requises)
    obligations: [
      {
        key: 'accepte_cgu',
        label: 'J\'accepte les Conditions Générales d\'Utilisation',
        icon: '📋',
        type: 'obligatoire',
        lien_document: '/cgu',
        description: 'Règles d\'utilisation de la plateforme Fourmiz'
      },
      {
        key: 'accepte_politique_confidentialite',
        label: 'J\'accepte la Politique de Confidentialité',
        icon: '🔒',
        type: 'obligatoire',
        lien_document: '/politique-confidentialite',
        description: 'Traitement et protection de vos données personnelles'
      },
      {
        key: 'accepte_traitement_donnees',
        label: 'J\'accepte le traitement de mes données personnelles',
        icon: '🛡️',
        type: 'obligatoire',
        lien_document: '/traitement-donnees',
        description: 'Utilisation des données pour le matching et les notifications'
      }
    ],
    // Consentements optionnels (peuvent être décochés)
    consentements_optionnels: [
      {
        key: 'newsletter_marketing',
        label: 'Je souhaite recevoir la newsletter et les offres promotionnelles',
        icon: '📧',
        type: 'optionnel',
        description: 'Conseils, nouveautés et offres spéciales par email'
      },
      {
        key: 'notifications_push_marketing',
        label: 'J\'autorise les notifications push marketing',
        icon: '🔔',
        type: 'optionnel',
        description: 'Notifications sur nouvelles fonctionnalités et promotions'
      },
      {
        key: 'partage_donnees_partenaires',
        label: 'J\'accepte le partage de données avec les partenaires sélectionnés',
        icon: '🤝',
        type: 'optionnel',
        description: 'Offres personnalisées de nos partenaires de confiance'
      },
      {
        key: 'utilisation_cookies_analytics',
        label: 'J\'accepte l\'utilisation de cookies d\'analyse',
        icon: '🍪',
        type: 'optionnel',
        description: 'Amélioration de l\'expérience utilisateur et statistiques'
      },
      {
        key: 'geolocalisation_precise',
        label: 'J\'autorise la géolocalisation précise',
        icon: '📍',
        type: 'optionnel',
        description: 'Missions plus précises selon votre position exacte'
      }
    ]
  },

  // ⚖️ CONFORMITÉ RÉGLEMENTAIRE - DÉCLARATIONS OBLIGATOIRES
  conformite_reglementaire: {
    // Déclarations obligatoires selon les services proposés
    declarations_obligatoires: [
      {
        key: 'respect_code_route',
        label: 'Je m\'engage à respecter le code de la route et la réglementation routière',
        icon: '🚦',
        type: 'obligatoire',
        applicable_si: ['transport_moyens'],
        description: 'Respect des limitations de vitesse, signalisation, assurance véhicule'
      },
      {
        key: 'interdiction_produits_illicites',
        label: 'Je m\'engage à ne pas transporter ou livrer de produits illicites',
        icon: '🚫',
        type: 'obligatoire',
        applicable_si: ['livraison_transport'],
        description: 'Drogues, armes, produits contrefaçons, substances dangereuses'
      },
      {
        key: 'verification_age_majorite',
        label: 'Je m\'engage à vérifier l\'âge de majorité pour les services le nécessitant',
        icon: '🆔',
        type: 'obligatoire',
        applicable_si: ['services_reglemente_age'],
        description: 'Alcool, tabac, jeux d\'argent, services pour adultes'
      },
      {
        key: 'respect_hygiene_alimentaire',
        label: 'Je respecte les normes d\'hygiène alimentaire (HACCP)',
        icon: '🍽️',
        type: 'obligatoire',
        applicable_si: ['livraison_repas', 'cours_cuisine'],
        description: 'Chaîne du froid, propreté, manipulation des aliments'
      },
      {
        key: 'protection_mineurs',
        label: 'Je m\'engage à respecter la protection des mineurs',
        icon: '👶',
        type: 'obligatoire',
        applicable_si: ['garde_enfants', 'baby_sitting', 'aide_devoirs'],
        description: 'Sécurité, bientraitance, signalement d\'incidents'
      },
      {
        key: 'respect_droit_travail',
        label: 'Je respecte le droit du travail et la réglementation sociale',
        icon: '📋',
        type: 'obligatoire',
        applicable_toujours: true,
        description: 'Horaires, repos, sécurité au travail, non-discrimination'
      },
      {
        key: 'assurance_responsabilite',
        label: 'Je dispose d\'une assurance responsabilité civile professionnelle',
        icon: '🛡️',
        type: 'obligatoire',
        applicable_toujours: true,
        description: 'Couverture des dommages causés dans l\'exercice de l\'activité'
      },
      {
        key: 'declaration_fiscale',
        label: 'Je m\'engage à déclarer mes revenus selon la réglementation fiscale',
        icon: '💰',
        type: 'obligatoire',
        applicable_toujours: true,
        description: 'Auto-entrepreneur, micro-entreprise ou salarié selon le statut'
      },
      {
        key: 'respect_environnement',
        label: 'Je respecte la réglementation environnementale',
        icon: '🌱',
        type: 'obligatoire',
        applicable_si: ['jardinage_exterieur', 'evacuation_encombrants'],
        description: 'Tri des déchets, produits phytosanitaires, élimination'
      },
      {
        key: 'manipulation_donnees_sensibles',
        label: 'Je m\'engage à protéger les données sensibles des clients',
        icon: '🔐',
        type: 'obligatoire',
        applicable_si: ['services_administratifs', 'services_numeriques'],
        description: 'Confidentialité, sécurité, non-divulgation d\'informations'
      }
    ]
  },

  // 🛠️ TYPES DE SERVICES PAR CATÉGORIES
  services_par_categories: {
    // MÉNAGE ET ENTRETIEN
    menage_entretien: {
      label: 'Ménage et entretien',
      icon: '🧹',
      services: [
        { key: 'menage_complet', label: 'Ménage complet', icon: '🏠' },
        { key: 'menage_express', label: 'Ménage express', icon: '⚡' },
        { key: 'nettoyage_vitres', label: 'Nettoyage vitres', icon: '🪟' },
        { key: 'nettoyage_sols', label: 'Nettoyage sols', icon: '🧽' },
        { key: 'aspiration', label: 'Aspiration', icon: '🔌' },
        { key: 'depoussierage', label: 'Dépoussiérage', icon: '✨' },
        { key: 'nettoyage_sanitaires', label: 'Nettoyage sanitaires', icon: '🚿' },
        { key: 'nettoyage_cuisine', label: 'Nettoyage cuisine', icon: '🍽️' },
        { key: 'repassage', label: 'Repassage', icon: '👔' },
        { key: 'rangement', label: 'Rangement', icon: '📦' },
      ]
    },

    // BRICOLAGE ET RÉPARATIONS
    bricolage_reparations: {
      label: 'Bricolage et réparations',
      icon: '🔧',
      services: [
        { key: 'petites_reparations', label: 'Petites réparations', icon: '🔨' },
        { key: 'montage_meubles', label: 'Montage meubles', icon: '🪑' },
        { key: 'installation_etageres', label: 'Installation étagères', icon: '📚' },
        { key: 'changement_ampoules', label: 'Changement ampoules', icon: '💡' },
        { key: 'peinture_retouches', label: 'Peinture retouches', icon: '🎨' },
        { key: 'pose_tableaux', label: 'Pose tableaux', icon: '🖼️' },
        { key: 'reparation_robinetterie', label: 'Réparation robinetterie', icon: '🚰' },
        { key: 'debouchage_canalisations', label: 'Débouchage canalisations', icon: '🚿' },
        { key: 'installation_equipements', label: 'Installation équipements', icon: '📺' },
      ]
    },

    // JARDINAGE ET EXTÉRIEUR
    jardinage_exterieur: {
      label: 'Jardinage et extérieur',
      icon: '🌱',
      services: [
        { key: 'tonte_pelouse', label: 'Tonte pelouse', icon: '🌿' },
        { key: 'taille_haies', label: 'Taille haies', icon: '✂️' },
        { key: 'arrosage_plantes', label: 'Arrosage plantes', icon: '💧' },
        { key: 'plantation', label: 'Plantation', icon: '🌱' },
        { key: 'desherbage', label: 'Désherbage', icon: '🌾' },
        { key: 'ramassage_feuilles', label: 'Ramassage feuilles', icon: '🍂' },
        { key: 'nettoyage_terrasse', label: 'Nettoyage terrasse', icon: '🏡' },
        { key: 'entretien_piscine', label: 'Entretien piscine', icon: '🏊' },
        { key: 'deneigement', label: 'Déneigement', icon: '❄️' },
      ]
    },

    // GARDE ET ACCOMPAGNEMENT
    garde_accompagnement: {
      label: 'Garde et accompagnement',
      icon: '👶',
      services: [
        { key: 'garde_enfants', label: 'Garde d\'enfants', icon: '👦' },
        { key: 'baby_sitting', label: 'Baby-sitting', icon: '👶' },
        { key: 'aide_devoirs', label: 'Aide aux devoirs', icon: '📝' },
        { key: 'garde_animaux', label: 'Garde d\'animaux', icon: '🐕' },
        { key: 'promenade_chien', label: 'Promenade chien', icon: '🦮' },
        { key: 'accompagnement_personnes', label: 'Accompagnement personnes', icon: '👥' },
        { key: 'courses_accompagnees', label: 'Courses accompagnées', icon: '🛒' },
      ]
    },

    // LIVRAISON ET TRANSPORT
    livraison_transport: {
      label: 'Livraison et transport',
      icon: '📦',
      services: [
        { key: 'livraison_courses', label: 'Livraison courses', icon: '🛒' },
        { key: 'livraison_repas', label: 'Livraison repas', icon: '🍽️' },
        { key: 'livraison_colis', label: 'Livraison colis', icon: '📮' },
        { key: 'transport_personnes', label: 'Transport personnes', icon: '🚗' },
        { key: 'demenagement_aide', label: 'Aide déménagement', icon: '📦' },
        { key: 'transport_mobilier', label: 'Transport mobilier', icon: '🪑' },
        { key: 'evacuation_encombrants', label: 'Évacuation encombrants', icon: '🗑️' },
      ]
    },

    // SERVICES NUMÉRIQUES
    services_numeriques: {
      label: 'Services numériques',
      icon: '💻',
      services: [
        { key: 'assistance_informatique', label: 'Assistance informatique', icon: '🖥️' },
        { key: 'installation_logiciels', label: 'Installation logiciels', icon: '💿' },
        { key: 'formation_digital', label: 'Formation digital', icon: '📱' },
        { key: 'sauvegarde_donnees', label: 'Sauvegarde données', icon: '💾' },
        { key: 'depannage_internet', label: 'Dépannage internet', icon: '🌐' },
        { key: 'configuration_wifi', label: 'Configuration WiFi', icon: '📶' },
      ]
    },

    // COURS ET FORMATION
    cours_formation: {
      label: 'Cours et formation',
      icon: '📚',
      services: [
        { key: 'cours_particuliers', label: 'Cours particuliers', icon: '👨‍🏫' },
        { key: 'soutien_scolaire', label: 'Soutien scolaire', icon: '📖' },
        { key: 'cours_langues', label: 'Cours de langues', icon: '🗣️' },
        { key: 'cours_musique', label: 'Cours de musique', icon: '🎵' },
        { key: 'cours_sport', label: 'Cours de sport', icon: '🏃' },
        { key: 'cours_cuisine', label: 'Cours de cuisine', icon: '👨‍🍳' },
        { key: 'formation_bureautique', label: 'Formation bureautique', icon: '💼' },
      ]
    },

    // SERVICES PERSONNELS
    services_personnels: {
      label: 'Services personnels',
      icon: '💄',
      services: [
        { key: 'coiffure_domicile', label: 'Coiffure à domicile', icon: '💇' },
        { key: 'esthetique_domicile', label: 'Esthétique à domicile', icon: '💅' },
        { key: 'massage_domicile', label: 'Massage à domicile', icon: '💆' },
        { key: 'personal_shopping', label: 'Personal shopping', icon: '🛍️' },
        { key: 'organisation_evenements', label: 'Organisation événements', icon: '🎉' },
      ]
    },

    // SERVICES ADMINISTRATIFS
    services_administratifs: {
      label: 'Services administratifs',
      icon: '📋',
      services: [
        { key: 'aide_administrative', label: 'Aide administrative', icon: '📄' },
        { key: 'classement_documents', label: 'Classement documents', icon: '🗂️' },
        { key: 'frappe_documents', label: 'Frappe documents', icon: '⌨️' },
        { key: 'accompagnement_demarches', label: 'Accompagnement démarches', icon: '🏛️' },
        { key: 'gestion_courrier', label: 'Gestion courrier', icon: '📮' },
      ]
    },
  },

  // 🚗 TRANSPORT ET MOBILITÉ
  transport: {
    moyens: [
      { key: 'pied', label: 'À pied', icon: '🚶' },
      { key: 'velo', label: 'Vélo', icon: '🚲' },
      { key: 'trottinette', label: 'Trottinette', icon: '🛴' },
      { key: 'skateboard', label: 'Skateboard', icon: '🛹' },
      { key: 'gyroroue', label: 'Gyroroue', icon: '⚪' },
      { key: 'gyropode', label: 'Gyropode', icon: '🛴' },
      { key: 'hoverboard', label: 'Hoverboard', icon: '🛹' },
      { key: 'moto', label: 'Moto', icon: '🏍️' },
      { key: 'voiture', label: 'Voiture', icon: '🚗' },
      { key: 'camionnette', label: 'Camionnette', icon: '🚐' },
      { key: 'camion', label: 'Camion', icon: '🚚' },
      { key: 'bateau', label: 'Bateau', icon: '⛵' },
      { key: 'avion', label: 'Avion', icon: '✈️' },
      { key: 'helicoptere', label: 'Hélicoptère', icon: '🚁' },
    ],
    documents: [
      { key: 'permis_conduire', label: 'Permis de conduire', icon: '🪪' },
      { key: 'assurance_vehicule', label: 'Assurance véhicule', icon: '📋' },
    ],
    options: [
      { key: 'frais_deplacement_inclus', label: 'Frais déplacement inclus', icon: '💰' },
      { key: 'parking_requis', label: 'Place parking requise', icon: '🅿️' },
    ]
  },

  // ⏰ DISPONIBILITÉS
  disponibilites: {
    // Disponibilités par tranche horaire (24h/24)
    horaires_detaillees: [
      { key: 'h00_01', label: '00h-01h', icon: '🌃' },
      { key: 'h01_02', label: '01h-02h', icon: '🌃' },
      { key: 'h02_03', label: '02h-03h', icon: '🌃' },
      { key: 'h03_04', label: '03h-04h', icon: '🌃' },
      { key: 'h04_05', label: '04h-05h', icon: '🌃' },
      { key: 'h05_06', label: '05h-06h', icon: '🌃' },
      { key: 'h06_07', label: '06h-07h', icon: '🌅' },
      { key: 'h07_08', label: '07h-08h', icon: '🌅' },
      { key: 'h08_09', label: '08h-09h', icon: '🌅' },
      { key: 'h09_10', label: '09h-10h', icon: '☀️' },
      { key: 'h10_11', label: '10h-11h', icon: '☀️' },
      { key: 'h11_12', label: '11h-12h', icon: '☀️' },
      { key: 'h12_13', label: '12h-13h', icon: '☀️' },
      { key: 'h13_14', label: '13h-14h', icon: '☀️' },
      { key: 'h14_15', label: '14h-15h', icon: '☀️' },
      { key: 'h15_16', label: '15h-16h', icon: '☀️' },
      { key: 'h16_17', label: '16h-17h', icon: '☀️' },
      { key: 'h17_18', label: '17h-18h', icon: '☀️' },
      { key: 'h18_19', label: '18h-19h', icon: '🌙' },
      { key: 'h19_20', label: '19h-20h', icon: '🌙' },
      { key: 'h20_21', label: '20h-21h', icon: '🌙' },
      { key: 'h21_22', label: '21h-22h', icon: '🌙' },
      { key: 'h22_23', label: '22h-23h', icon: '🌙' },
      { key: 'h23_00', label: '23h-00h', icon: '🌃' },
    ],
    // Disponibilités par jour de la semaine
    jours_semaine: [
      { key: 'lundi', label: 'Lundi', icon: '📅' },
      { key: 'mardi', label: 'Mardi', icon: '📅' },
      { key: 'mercredi', label: 'Mercredi', icon: '📅' },
      { key: 'jeudi', label: 'Jeudi', icon: '📅' },
      { key: 'vendredi', label: 'Vendredi', icon: '📅' },
      { key: 'samedi', label: 'Samedi', icon: '📅' },
      { key: 'dimanche', label: 'Dimanche', icon: '📅' },
    ],
    // Options de flexibilité
    flexibilite: [
      { key: 'missions_urgentes', label: 'Missions urgentes (< 30min)', icon: '🚨' },
      { key: 'missions_recurrentes', label: 'Missions récurrentes', icon: '🔄' },
      { key: 'travail_feries', label: 'Travail jours fériés', icon: '🎄' },
      { key: 'travail_vacances', label: 'Travail pendant vacances', icon: '🏖️' },
      { key: 'prolongation_possible', label: 'Prolongation mission possible', icon: '⏰' },
      { key: 'modification_derniere_minute', label: 'Modification dernière minute', icon: '🔄' },
    ]
  },

  // 📅 GESTION INDISPONIBILITÉS EXCEPTIONNELLES
  indisponibilites_exceptionnelles: {
    options: [
      { key: 'journee_complete', label: 'Journée complète', icon: '📅' },
      { key: 'demi_journee_matin', label: 'Demi-journée matin', icon: '🌅' },
      { key: 'demi_journee_apres_midi', label: 'Demi-journée après-midi', icon: '☀️' },
      { key: 'creneaux_specifiques', label: 'Créneaux spécifiques', icon: '⏰' },
      { key: 'recurrente', label: 'Récurrente (ex: chaque lundi)', icon: '🔄' },
    ]
  },

  // 🧰 ÉQUIPEMENT ET MATÉRIEL
  equipement: {
    fourni: [
      { key: 'outils_bricolage', label: 'Outils bricolage', icon: '🔨' },
      { key: 'produits_menage', label: 'Produits ménage', icon: '🧽' },
      { key: 'materiel_jardinage', label: 'Matériel jardinage', icon: '🌿' },
      { key: 'aspirateur', label: 'Aspirateur', icon: '🔌' },
      { key: 'nettoyeur_vapeur', label: 'Nettoyeur vapeur', icon: '💨' },
      { key: 'echelle', label: 'Échelle', icon: '🪜' },
      { key: 'perceuse', label: 'Perceuse', icon: '🔧' },
      { key: 'tondeuse', label: 'Tondeuse', icon: '🌱' },
    ],
    preferences: [
      { key: 'produits_ecologiques', label: 'Produits écologiques uniquement', icon: '🌿' },
      { key: 'materiel_client_accepte', label: 'Accepte matériel client', icon: '✅' },
    ]
  },

  // 👥 PRÉFÉRENCES CLIENTÈLE
  clientele: {
    logement: [
      { key: 'appartement', label: 'Appartement', icon: '🏠' },
      { key: 'maison', label: 'Maison', icon: '🏡' },
      { key: 'bureau', label: 'Bureau', icon: '🏢' },
      { key: 'commerce', label: 'Commerce', icon: '🏪' },
      { key: 'entrepot', label: 'Entrepôt', icon: '🏭' },
    ],
    preferences: [
      { key: 'client_present', label: 'Client présent accepté', icon: '👥' },
      { key: 'client_absent', label: 'Client absent accepté', icon: '🚪' },
      { key: 'animaux_domestiques', label: 'Animaux domestiques OK', icon: '🐕' },
      { key: 'enfants_domicile', label: 'Enfants à domicile OK', icon: '👶' },
    ]
  },

  // 💼 CONDITIONS DE TRAVAIL
  conditions: {
    environnement: [
      { key: 'travail_interieur', label: 'Travail intérieur', icon: '🏠' },
      { key: 'travail_exterieur', label: 'Travail extérieur', icon: '🌳' },
      { key: 'travail_hauteur', label: 'Travail en hauteur', icon: '🪜' },
      { key: 'travail_equipe', label: 'Travail en équipe', icon: '👥' },
      { key: 'travail_seul', label: 'Travail seul', icon: '👤' },
    ],
    equipements: [
      { key: 'port_uniforme', label: 'Port uniforme', icon: '👔' },
      { key: 'chaussures_securite', label: 'Chaussures sécurité', icon: '👢' },
      { key: 'gants_protection', label: 'Gants protection', icon: '🧤' },
      { key: 'masque_protection', label: 'Masque protection', icon: '😷' },
    ]
  },

  // 🏆 EXPÉRIENCE ET CERTIFICATIONS
  experience: {
    niveaux: [
      { key: 'debutant', label: 'Débutant (< 1 an)', icon: '🌱' },
      { key: 'intermediaire', label: 'Intermédiaire (1-3 ans)', icon: '📈' },
      { key: 'experimente', label: 'Expérimenté (3-5 ans)', icon: '⭐' },
      { key: 'expert', label: 'Expert (> 5 ans)', icon: '🏆' },
    ],
    certifications: [
      { key: 'premiers_secours', label: 'Premiers secours', icon: '🚑' },
      { key: 'permis_cariste', label: 'Permis cariste', icon: '🏗️' },
      { key: 'habilitation_electrique', label: 'Habilitation électrique', icon: '⚡' },
      { key: 'formation_securite', label: 'Formation sécurité', icon: '🛡️' },
    ],
    langues: [
      { key: 'francais', label: 'Français', icon: '🇫🇷' },
      { key: 'anglais', label: 'Anglais', icon: '🇬🇧' },
      { key: 'espagnol', label: 'Espagnol', icon: '🇪🇸' },
      { key: 'italien', label: 'Italien', icon: '🇮🇹' },
      { key: 'allemand', label: 'Allemand', icon: '🇩🇪' },
      { key: 'arabe', label: 'Arabe', icon: '🇸🇦' },
      { key: 'chinois', label: 'Chinois', icon: '🇨🇳' },
    ]
  },

  // 🔒 SÉCURITÉ ET VÉRIFICATIONS
  securite: [
    { key: 'casier_judiciaire_vierge', label: 'Casier judiciaire vierge', icon: '✅' },
    { key: 'piece_identite_validee', label: 'Pièce identité validée', icon: '🪪' },
    { key: 'assurance_rc', label: 'Assurance responsabilité civile', icon: '🛡️' },
    { key: 'references_verifiees', label: 'Références vérifiées', icon: '📋' },
    { key: 'formation_hygiene', label: 'Formation hygiène', icon: '🧼' },
  ],

  // 📞 COMMUNICATION
  communication: [
    { key: 'contact_sms', label: 'Contact par SMS', icon: '💬' },
    { key: 'contact_appel', label: 'Contact par appel', icon: '📞' },
    { key: 'contact_chat', label: 'Contact par chat app', icon: '💬' },
    { key: 'contact_email', label: 'Contact par email', icon: '📧' },
  ],

  // 💰 TARIFS ET CONDITIONS
  tarifs: {
    duree: [
      { key: 'mission_1h_min', label: 'Mission 1h minimum', icon: '⏰' },
      { key: 'mission_2h_min', label: 'Mission 2h minimum', icon: '⏰' },
      { key: 'mission_4h_min', label: 'Mission 4h minimum', icon: '⏰' },
      { key: 'mission_journee', label: 'Mission journée complète', icon: '🌅' },
    ],
    facturation: [
      { key: 'devis_prealable', label: 'Devis préalable requis', icon: '📋' },
      { key: 'facturation_materiel', label: 'Facturation matériel séparée', icon: '💰' },
      { key: 'facturation_transport', label: 'Facturation transport séparée', icon: '🚗' },
    ]
  },

  // 🔍 FLEXIBILITÉ SERVICES
  flexibilite_services: {
    options: [
      { 
        key: 'accepte_services_non_listes_categorie', 
        label: 'J\'accepte d\'étudier des services non listés dans mes catégories', 
        icon: '🔍',
        description: 'Services similaires à vos catégories mais non présents dans le catalogue'
      },
      { 
        key: 'accepte_services_hors_catalogue', 
        label: 'J\'accepte d\'étudier des services complètement nouveaux', 
        icon: '💡',
        description: 'Services innovants ou rares non présents dans aucune catégorie'
      },
      { 
        key: 'notification_nouvelles_demandes', 
        label: 'Recevoir des notifications pour ces demandes spéciales', 
        icon: '🔔',
        description: 'Être alerté quand un client fait une demande hors catalogue'
      },
      { 
        key: 'evaluation_prealable_requise', 
        label: 'Demander une évaluation préalable avant acceptation', 
        icon: '📋',
        description: 'Pouvoir étudier la demande avant de l\'accepter ou refuser'
      }
    ]
  },

  // 🔤 MOTS-CLÉS PERSONNALISÉS
  mots_cles_notifications: {
    description: 'Recevez des notifications pour toutes les annonces contenant vos mots-clés',
    exemples: [
      'urgent', 'samedi', 'dimanche', 'soir', 'nuit', 'animaux', 'enfants', 
      'écologique', 'bio', 'luxury', 'prestige', 'senior', 'handicap',
      'rénovation', 'déco', 'vintage', 'antique', 'collection', 'art',
      'event', 'mariage', 'anniversaire', 'fête', 'réception',
      'startup', 'bureau', 'coworking', 'télétravail', 'digital',
      'sport', 'fitness', 'yoga', 'massage', 'relaxation',
      'cuisine', 'gastronomie', 'végétarien', 'vegan', 'allergie',
      'anglais', 'espagnol', 'chinois', 'arabe', 'langue',
      'musique', 'piano', 'guitare', 'chant', 'instrument',
      'informatique', 'apple', 'windows', 'android', 'smart',
      'Tesla', 'BMW', 'Mercedes', 'Porsche', 'luxe'
    ],
    options: [
      { 
        key: 'sensible_casse', 
        label: 'Sensible à la casse (différencier majuscules/minuscules)', 
        icon: 'Aa' 
      },
      { 
        key: 'mots_entiers', 
        label: 'Mots entiers uniquement (éviter les correspondances partielles)', 
        icon: '🎯' 
      },
      { 
        key: 'notification_immediate', 
        label: 'Notification immédiate (sinon regroupées par heure)', 
        icon: '⚡' 
      },
      { 
        key: 'inclure_titre_annonce', 
        label: 'Rechercher aussi dans le titre de l\'annonce', 
        icon: '📝' 
      },
      { 
        key: 'inclure_localisation', 
        label: 'Rechercher aussi dans la localisation', 
        icon: '📍' 
      }
    ]
  },
};

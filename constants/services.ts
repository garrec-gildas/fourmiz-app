// Service categories and services data
import { ServiceCategory } from '../../types';

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'animals',
    name: 'Animaux',
    icon: '🐾',
    color: '#FF9800',
    services: [
      {
        id: 'dog-walking',
        categoryId: 'animals',
        name: 'Promenade de chien (GPS en temps réel)',
        description: 'Promenade de votre chien avec suivi GPS en temps réel pour votre tranquillité.',
        basePrice: 15,
        isEligibleTaxCredit: true,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'petName',
            type: 'text',
            label: 'Nom de l\'animal',
            required: true,
          },
          {
            id: 'petBreed',
            type: 'text',
            label: 'Race',
            required: false,
          },
          {
            id: 'walkDuration',
            type: 'select',
            label: 'Durée de la promenade',
            required: true,
            options: ['30 minutes', '45 minutes', '60 minutes', '90 minutes']
          },
          {
            id: 'specialInstructions',
            type: 'textarea',
            label: 'Instructions spéciales',
            required: false,
          }
        ]
      },
      {
        id: 'pet-sitting',
        categoryId: 'animals',
        name: 'Garde d\'animaux à domicile (jour/nuit)',
        description: 'Garde de vos animaux à votre domicile, de jour comme de nuit.',
        basePrice: 25,
        isEligibleTaxCredit: true,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'petType',
            type: 'select',
            label: 'Type d\'animal',
            required: true,
            options: ['Chien', 'Chat', 'Oiseau', 'Rongeur', 'Autre']
          },
          {
            id: 'petCount',
            type: 'number',
            label: 'Nombre d\'animaux',
            required: true,
          },
          {
            id: 'stayDuration',
            type: 'select',
            label: 'Durée de la garde',
            required: true,
            options: ['Quelques heures', 'Journée', 'Nuit', 'Jour et nuit']
          }
        ]
      },
      {
        id: 'pet-visit',
        categoryId: 'animals',
        name: 'Visite à domicile pour nourrir et soigner',
        description: 'Visite à votre domicile pour nourrir, soigner et tenir compagnie à vos animaux.',
        basePrice: 12,
        isEligibleTaxCredit: true,
        estimatedDuration: 30,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'petType',
            type: 'text',
            label: 'Type d\'animal',
            required: true,
          },
          {
            id: 'visitFrequency',
            type: 'select',
            label: 'Fréquence des visites',
            required: true,
            options: ['1 fois par jour', '2 fois par jour', '3 fois par jour']
          }
        ]
      },
      {
        id: 'pet-supplies-delivery',
        categoryId: 'animals',
        name: 'Livraison de croquettes, litière et accessoires',
        description: 'Livraison à domicile de nourriture, litière et accessoires pour vos animaux.',
        basePrice: 10,
        isEligibleTaxCredit: false,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'itemsList',
            type: 'textarea',
            label: 'Liste des articles',
            required: true,
          },
          {
            id: 'store',
            type: 'text',
            label: 'Magasin préféré',
            required: false,
          }
        ]
      },
      {
        id: 'pet-transport',
        categoryId: 'animals',
        name: 'Transport vers vétérinaire ou pension',
        description: 'Transport de votre animal vers le vétérinaire, le toiletteur ou la pension.',
        basePrice: 20,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'destination',
            type: 'text',
            label: 'Adresse de destination',
            required: true,
          },
          {
            id: 'appointmentTime',
            type: 'time',
            label: 'Heure du rendez-vous',
            required: true,
          }
        ]
      },
      {
        id: 'mobile-grooming',
        categoryId: 'animals',
        name: 'Toilettage mobile',
        description: 'Service de toilettage à domicile pour votre animal.',
        basePrice: 35,
        isEligibleTaxCredit: false,
        estimatedDuration: 90,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'petSize',
            type: 'select',
            label: 'Taille de l\'animal',
            required: true,
            options: ['Petit', 'Moyen', 'Grand', 'Très grand']
          },
          {
            id: 'groomingType',
            type: 'select',
            label: 'Type de toilettage',
            required: true,
            options: ['Bain simple', 'Tonte', 'Toilettage complet']
          }
        ]
      },
      {
        id: 'pet-care',
        categoryId: 'animals',
        name: 'Soins simples (médication, surveillance)',
        description: 'Administration de médicaments et surveillance de l\'état de santé de votre animal.',
        basePrice: 15,
        isEligibleTaxCredit: true,
        estimatedDuration: 30,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'careInstructions',
            type: 'textarea',
            label: 'Instructions de soins',
            required: true,
          }
        ]
      },
      {
        id: 'dog-training',
        categoryId: 'animals',
        name: 'Éducation canine',
        description: 'Séances d\'éducation et de dressage pour votre chien.',
        basePrice: 30,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'trainingGoals',
            type: 'textarea',
            label: 'Objectifs d\'éducation',
            required: true,
          }
        ]
      },
      {
        id: 'pet-emergency',
        categoryId: 'animals',
        name: 'Alerte fugue ou blessure (SOS animaux)',
        description: 'Assistance d\'urgence en cas de fugue ou de blessure de votre animal.',
        basePrice: 25,
        isEligibleTaxCredit: false,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'emergencyType',
            type: 'select',
            label: 'Type d\'urgence',
            required: true,
            options: ['Fugue', 'Blessure', 'Autre']
          },
          {
            id: 'petDescription',
            type: 'textarea',
            label: 'Description de l\'animal',
            required: true,
          }
        ]
      }
    ]
  },
  {
    id: 'delivery',
    name: 'Courses, Livraisons & Achats',
    icon: '🛒',
    color: '#4CAF50',
    services: [
      {
        id: 'drive-delivery',
        categoryId: 'delivery',
        name: 'Livraison Drive',
        description: 'Récupération et livraison de vos courses commandées en Drive.',
        basePrice: 10,
        isEligibleTaxCredit: true,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'storeName',
            type: 'text',
            label: 'Nom du magasin',
            required: true,
          },
          {
            id: 'orderNumber',
            type: 'text',
            label: 'Numéro de commande',
            required: true,
          }
        ]
      },
      {
        id: 'urgent-purchases',
        categoryId: 'delivery',
        name: 'Achats urgents (cigarettes, pain, snacks)',
        description: 'Achat et livraison rapide de produits urgents.',
        basePrice: 8,
        isEligibleTaxCredit: false,
        estimatedDuration: 30,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'itemsList',
            type: 'textarea',
            label: 'Liste des articles',
            required: true,
          }
        ]
      },
      {
        id: 'pharmacy-delivery',
        categoryId: 'delivery',
        name: 'Commande et retrait en pharmacie',
        description: 'Récupération et livraison de vos médicaments en pharmacie.',
        basePrice: 12,
        isEligibleTaxCredit: true,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'pharmacyName',
            type: 'text',
            label: 'Nom de la pharmacie',
            required: true,
          },
          {
            id: 'prescriptionDetails',
            type: 'textarea',
            label: 'Détails de l\'ordonnance',
            required: false,
          }
        ]
      },
      {
        id: 'parcel-service',
        categoryId: 'delivery',
        name: 'Récupération/dépôt de colis ou lettres',
        description: 'Service de récupération ou dépôt de colis et courriers.',
        basePrice: 10,
        isEligibleTaxCredit: false,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'serviceType',
            type: 'select',
            label: 'Type de service',
            required: true,
            options: ['Récupération', 'Dépôt', 'Les deux']
          },
          {
            id: 'parcelDetails',
            type: 'textarea',
            label: 'Détails du colis/courrier',
            required: true,
          }
        ]
      },
      {
        id: 'meal-delivery',
        categoryId: 'delivery',
        name: 'Livraison de repas faits maison ou restaurant',
        description: 'Livraison de repas préparés à domicile ou commandés au restaurant.',
        basePrice: 12,
        isEligibleTaxCredit: false,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'mealSource',
            type: 'text',
            label: 'Source du repas',
            required: true,
          },
          {
            id: 'mealDetails',
            type: 'textarea',
            label: 'Détails de la commande',
            required: true,
          }
        ]
      },
      {
        id: 'breakfast-delivery',
        categoryId: 'delivery',
        name: 'Livraison petit-déj, goûter, brunch',
        description: 'Livraison de petit-déjeuner, goûter ou brunch à domicile.',
        basePrice: 15,
        isEligibleTaxCredit: false,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'mealType',
            type: 'select',
            label: 'Type de repas',
            required: true,
            options: ['Petit-déjeuner', 'Goûter', 'Brunch']
          },
          {
            id: 'orderDetails',
            type: 'textarea',
            label: 'Détails de la commande',
            required: true,
          }
        ]
      },
      {
        id: 'fashion-delivery',
        categoryId: 'delivery',
        name: 'Achats et livraison mode & textile',
        description: 'Achat et livraison de vêtements et textiles.',
        basePrice: 20,
        isEligibleTaxCredit: false,
        estimatedDuration: 90,
        requiresDeposit: true,
        requiredFields: [
          {
            id: 'storePreference',
            type: 'text',
            label: 'Magasin préféré',
            required: true,
          },
          {
            id: 'itemsList',
            type: 'textarea',
            label: 'Liste des articles',
            required: true,
          }
        ]
      },
      {
        id: 'gift-delivery',
        categoryId: 'delivery',
        name: 'Livraison de fleurs, cadeaux, chocolats',
        description: 'Achat et livraison de fleurs, cadeaux ou chocolats.',
        basePrice: 15,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: true,
        requiredFields: [
          {
            id: 'giftType',
            type: 'select',
            label: 'Type de cadeau',
            required: true,
            options: ['Fleurs', 'Chocolats', 'Cadeau', 'Autre']
          },
          {
            id: 'giftDetails',
            type: 'textarea',
            label: 'Détails du cadeau',
            required: true,
          }
        ]
      },
      {
        id: 'equipment-delivery',
        categoryId: 'delivery',
        name: 'Livraison de matériel (bricolage, tech…)',
        description: 'Livraison de matériel de bricolage, technologique ou autre.',
        basePrice: 18,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'equipmentType',
            type: 'text',
            label: 'Type de matériel',
            required: true,
          },
          {
            id: 'equipmentDetails',
            type: 'textarea',
            label: 'Détails du matériel',
            required: true,
          }
        ]
      },
      {
        id: 'beverage-delivery',
        categoryId: 'delivery',
        name: 'Livraison de boissons (si autorisé)',
        description: 'Livraison de boissons à domicile (selon réglementation en vigueur).',
        basePrice: 12,
        isEligibleTaxCredit: false,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'beverageList',
            type: 'textarea',
            label: 'Liste des boissons',
            required: true,
          }
        ]
      },
      {
        id: 'ecommerce-returns',
        categoryId: 'delivery',
        name: 'Retours e-commerce ou click & collect',
        description: 'Service de retour de colis e-commerce ou récupération de commandes click & collect.',
        basePrice: 12,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'serviceType',
            type: 'select',
            label: 'Type de service',
            required: true,
            options: ['Retour e-commerce', 'Click & collect']
          },
          {
            id: 'storeDetails',
            type: 'text',
            label: 'Détails du magasin/point relais',
            required: true,
          }
        ]
      },
      {
        id: 'planned-shopping',
        categoryId: 'delivery',
        name: 'Liste de courses planifiée',
        description: 'Service de courses selon une liste prédéfinie.',
        basePrice: 15,
        isEligibleTaxCredit: true,
        estimatedDuration: 90,
        requiresDeposit: true,
        requiredFields: [
          {
            id: 'shoppingList',
            type: 'textarea',
            label: 'Liste de courses',
            required: true,
          },
          {
            id: 'storePreference',
            type: 'text',
            label: 'Magasin préféré',
            required: false,
          }
        ]
      }
    ]
  },
  {
    id: 'personal-assistance',
    name: 'Aide à la Personne',
    icon: '🧑‍🤝‍🧑',
    color: '#9C27B0',
    services: [
      {
        id: 'person-transport',
        categoryId: 'personal-assistance',
        name: 'Conduite de personnes',
        description: 'Service de transport et d\'accompagnement de personnes.',
        basePrice: 20,
        isEligibleTaxCredit: true,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'destination',
            type: 'text',
            label: 'Adresse de destination',
            required: true,
          },
          {
            id: 'specialNeeds',
            type: 'textarea',
            label: 'Besoins spécifiques',
            required: false,
          }
        ]
      },
      {
        id: 'babysitting',
        categoryId: 'personal-assistance',
        name: 'Garde d\'enfants / Baby-sitting ponctuel',
        description: 'Service de garde d\'enfants à domicile pour courte durée.',
        basePrice: 18,
        isEligibleTaxCredit: true,
        estimatedDuration: 180,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'childrenCount',
            type: 'number',
            label: 'Nombre d\'enfants',
            required: true,
          },
          {
            id: 'childrenAges',
            type: 'text',
            label: 'Âge des enfants',
            required: true,
          }
        ]
      },
      {
        id: 'homework-help',
        categoryId: 'personal-assistance',
        name: 'Aide aux devoirs / soutien scolaire',
        description: 'Assistance pour les devoirs et soutien scolaire à domicile.',
        basePrice: 20,
        isEligibleTaxCredit: true,
        estimatedDuration: 90,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'schoolLevel',
            type: 'select',
            label: 'Niveau scolaire',
            required: true,
            options: ['Primaire', 'Collège', 'Lycée']
          },
          {
            id: 'subjects',
            type: 'text',
            label: 'Matières concernées',
            required: true,
          }
        ]
      },
      {
        id: 'short-childcare',
        categoryId: 'personal-assistance',
        name: 'Garde de courte durée (1-2h)',
        description: 'Service de garde d\'enfants pour une courte durée.',
        basePrice: 15,
        isEligibleTaxCredit: true,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'childrenCount',
            type: 'number',
            label: 'Nombre d\'enfants',
            required: true,
          },
          {
            id: 'childrenAges',
            type: 'text',
            label: 'Âge des enfants',
            required: true,
          }
        ]
      },
      {
        id: 'admin-assistance',
        categoryId: 'personal-assistance',
        name: 'Assistance administrative (CAF, impôts, etc.)',
        description: 'Aide pour les démarches administratives et formulaires.',
        basePrice: 25,
        isEligibleTaxCredit: true,
        estimatedDuration: 90,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'assistanceType',
            type: 'textarea',
            label: 'Type d\'assistance requise',
            required: true,
          }
        ]
      },
      {
        id: 'digital-help',
        categoryId: 'personal-assistance',
        name: 'Aide numérique (PC, téléphone, banque en ligne)',
        description: 'Assistance pour l\'utilisation d\'outils numériques et démarches en ligne.',
        basePrice: 20,
        isEligibleTaxCredit: true,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'deviceType',
            type: 'select',
            label: 'Type d\'appareil',
            required: true,
            options: ['Ordinateur', 'Smartphone', 'Tablette', 'Autre']
          },
          {
            id: 'assistanceDetails',
            type: 'textarea',
            label: 'Détails de l\'assistance requise',
            required: true,
          }
        ]
      },
      {
        id: 'companionship',
        categoryId: 'personal-assistance',
        name: 'Visite de compagnie / surveillance passive',
        description: 'Présence et compagnie pour personnes seules ou surveillance passive.',
        basePrice: 18,
        isEligibleTaxCredit: true,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'visitPurpose',
            type: 'textarea',
            label: 'Objectif de la visite',
            required: true,
          }
        ]
      },
      {
        id: 'mobility-assistance',
        categoryId: 'personal-assistance',
        name: 'Assistance à la mobilité (courses, escaliers)',
        description: 'Aide à la mobilité pour les courses, déplacements ou escaliers.',
        basePrice: 20,
        isEligibleTaxCredit: true,
        estimatedDuration: 90,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'assistanceType',
            type: 'textarea',
            label: 'Type d\'assistance requise',
            required: true,
          }
        ]
      },
      {
        id: 'wake-up-service',
        categoryId: 'personal-assistance',
        name: 'Réveil et gestion d\'agenda à domicile',
        description: 'Service de réveil et rappel d\'agenda à domicile.',
        basePrice: 15,
        isEligibleTaxCredit: true,
        estimatedDuration: 30,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'wakeupTime',
            type: 'time',
            label: 'Heure de réveil',
            required: true,
          },
          {
            id: 'scheduleDetails',
            type: 'textarea',
            label: 'Détails de l\'agenda',
            required: false,
          }
        ]
      }
    ]
  },
  {
    id: 'transport',
    name: 'Transport & Logistique',
    icon: '🚗',
    color: '#2196F3',
    services: [
      {
        id: 'local-carpooling',
        categoryId: 'transport',
        name: 'Covoiturage local',
        description: 'Service de covoiturage pour trajets locaux.',
        basePrice: 15,
        isEligibleTaxCredit: false,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'destination',
            type: 'text',
            label: 'Adresse de destination',
            required: true,
          },
          {
            id: 'passengerCount',
            type: 'number',
            label: 'Nombre de passagers',
            required: true,
          }
        ]
      },
      {
        id: 'shuttle-service',
        categoryId: 'transport',
        name: 'Navette (gare, aéroport, soirée)',
        description: 'Service de navette pour gare, aéroport ou soirée.',
        basePrice: 25,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'destination',
            type: 'text',
            label: 'Adresse de destination',
            required: true,
          },
          {
            id: 'passengerCount',
            type: 'number',
            label: 'Nombre de passagers',
            required: true,
          }
        ]
      },
      {
        id: 'parcel-delivery',
        categoryId: 'transport',
        name: 'Livraison de colis ou objets personnels',
        description: 'Livraison de colis ou objets personnels d\'un point à un autre.',
        basePrice: 15,
        isEligibleTaxCredit: false,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'itemDescription',
            type: 'textarea',
            label: 'Description des objets',
            required: true,
          },
          {
            id: 'destination',
            type: 'text',
            label: 'Adresse de destination',
            required: true,
          }
        ]
      },
      {
        id: 'furniture-transport',
        categoryId: 'transport',
        name: 'Transport de meubles ou objets lourds',
        description: 'Transport de meubles ou objets lourds nécessitant 2 personnes.',
        basePrice: 35,
        isEligibleTaxCredit: false,
        estimatedDuration: 90,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'itemDescription',
            type: 'textarea',
            label: 'Description des objets',
            required: true,
          },
          {
            id: 'destination',
            type: 'text',
            label: 'Adresse de destination',
            required: true,
          }
        ]
      },
      {
        id: 'express-delivery',
        categoryId: 'transport',
        name: 'Livraison express pour pros',
        description: 'Service de livraison express pour professionnels.',
        basePrice: 25,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'itemDescription',
            type: 'textarea',
            label: 'Description des objets',
            required: true,
          },
          {
            id: 'destination',
            type: 'text',
            label: 'Adresse de destination',
            required: true,
          }
        ]
      },
      {
        id: 'emergency-delivery',
        categoryId: 'transport',
        name: 'Courses express (urgence médicale, oublis)',
        description: 'Livraison express pour urgences médicales ou objets oubliés.',
        basePrice: 20,
        isEligibleTaxCredit: false,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'itemDescription',
            type: 'textarea',
            label: 'Description des objets',
            required: true,
          },
          {
            id: 'urgencyLevel',
            type: 'select',
            label: 'Niveau d\'urgence',
            required: true,
            options: ['Normal', 'Urgent', 'Très urgent']
          }
        ]
      },
      {
        id: 'sensitive-transport',
        categoryId: 'transport',
        name: 'Transport d\'objets sensibles',
        description: 'Transport sécurisé d\'objets sensibles (instruments, matériel médical).',
        basePrice: 30,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'itemDescription',
            type: 'textarea',
            label: 'Description des objets',
            required: true,
          },
          {
            id: 'specialInstructions',
            type: 'textarea',
            label: 'Instructions spéciales',
            required: true,
          }
        ]
      },
      {
        id: 'light-moving',
        categoryId: 'transport',
        name: 'Déménagement léger ou entraide',
        description: 'Assistance pour petit déménagement ou transport de quelques objets.',
        basePrice: 40,
        isEligibleTaxCredit: false,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'itemsList',
            type: 'textarea',
            label: 'Liste des objets à déménager',
            required: true,
          },
          {
            id: 'destination',
            type: 'text',
            label: 'Adresse de destination',
            required: true,
          }
        ]
      },
      {
        id: 'multipoint-delivery',
        categoryId: 'transport',
        name: 'Organisation de livraisons multipoints',
        description: 'Service de livraison à plusieurs points de destination.',
        basePrice: 35,
        isEligibleTaxCredit: false,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'deliveryPoints',
            type: 'textarea',
            label: 'Points de livraison',
            required: true,
          },
          {
            id: 'itemDescription',
            type: 'textarea',
            label: 'Description des objets',
            required: true,
          }
        ]
      }
    ]
  },
  {
    id: 'handyman',
    name: 'Bricolage, Réparations & Entretien',
    icon: '🛠️',
    color: '#FF5722',
    services: [
      {
        id: 'furniture-assembly',
        categoryId: 'handyman',
        name: 'Montage/démontage de meubles',
        description: 'Montage ou démontage de meubles en kit.',
        basePrice: 35,
        isEligibleTaxCredit: true,
        estimatedDuration: 90,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'furnitureType',
            type: 'text',
            label: 'Type de meuble',
            required: true,
          },
          {
            id: 'furnitureBrand',
            type: 'text',
            label: 'Marque du meuble',
            required: false,
          }
        ]
      },
      {
        id: 'small-repairs',
        categoryId: 'handyman',
        name: 'Petites réparations (plomberie, électricité…)',
        description: 'Petites réparations domestiques (plomberie, électricité, etc.).',
        basePrice: 40,
        isEligibleTaxCredit: true,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'repairType',
            type: 'select',
            label: 'Type de réparation',
            required: true,
            options: ['Plomberie', 'Électricité', 'Menuiserie', 'Autre']
          },
          {
            id: 'repairDetails',
            type: 'textarea',
            label: 'Détails de la réparation',
            required: true,
          }
        ]
      },
      {
        id: 'appliance-installation',
        categoryId: 'handyman',
        name: 'Installation électroménager',
        description: 'Installation d\'appareils électroménagers.',
        basePrice: 30,
        isEligibleTaxCredit: true,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'applianceType',
            type: 'text',
            label: 'Type d\'appareil',
            required: true,
          },
          {
            id: 'installationDetails',
            type: 'textarea',
            label: 'Détails de l\'installation',
            required: true,
          }
        ]
      },
      {
        id: 'hanging-installation',
        categoryId: 'handyman',
        name: 'Pose de cadres, tringles, étagères',
        description: 'Installation de cadres, tringles à rideaux, étagères, etc.',
        basePrice: 25,
        isEligibleTaxCredit: true,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'installationType',
            type: 'select',
            label: 'Type d\'installation',
            required: true,
            options: ['Cadres', 'Tringles', 'Étagères', 'Autre']
          },
          {
            id: 'wallType',
            type: 'select',
            label: 'Type de mur',
            required: true,
            options: ['Plâtre', 'Béton', 'Brique', 'Autre']
          }
        ]
      },
      {
        id: 'small-painting',
        categoryId: 'handyman',
        name: 'Peinture ponctuelle',
        description: 'Travaux de peinture ponctuels et limités.',
        basePrice: 45,
        isEligibleTaxCredit: true,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'surfaceArea',
            type: 'number',
            label: 'Surface approximative (m²)',
            required: true,
          },
          {
            id: 'paintDetails',
            type: 'textarea',
            label: 'Détails de la peinture',
            required: true,
          }
        ]
      },
      {
        id: 'drain-unclogging',
        categoryId: 'handyman',
        name: 'Débouchage (évier, lavabo, douche)',
        description: 'Débouchage d\'évier, lavabo, douche ou baignoire.',
        basePrice: 35,
        isEligibleTaxCredit: true,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'drainType',
            type: 'select',
            label: 'Type de canalisation',
            required: true,
            options: ['Évier', 'Lavabo', 'Douche', 'Baignoire', 'Toilettes', 'Autre']
          }
        ]
      },
      {
        id: 'junk-removal',
        categoryId: 'handyman',
        name: 'Débarras (garage, cave…)',
        description: 'Débarras de garage, cave, grenier ou autre espace.',
        basePrice: 50,
        isEligibleTaxCredit: true,
        estimatedDuration: 180,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'spaceType',
            type: 'select',
            label: 'Type d\'espace',
            required: true,
            options: ['Garage', 'Cave', 'Grenier', 'Autre']
          },
          {
            id: 'volumeEstimate',
            type: 'textarea',
            label: 'Estimation du volume à débarrasser',
            required: true,
          }
        ]
      },
      {
        id: 'moving-cleanup',
        categoryId: 'handyman',
        name: 'Nettoyage après déménagement',
        description: 'Nettoyage complet après déménagement.',
        basePrice: 60,
        isEligibleTaxCredit: true,
        estimatedDuration: 180,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'propertySize',
            type: 'select',
            label: 'Taille du logement',
            required: true,
            options: ['Studio', '2 pièces', '3 pièces', '4 pièces ou plus']
          },
          {
            id: 'cleaningDetails',
            type: 'textarea',
            label: 'Détails du nettoyage',
            required: false,
          }
        ]
      },
      {
        id: 'preventive-maintenance',
        categoryId: 'handyman',
        name: 'Maintenance préventive',
        description: 'Vérification et maintenance préventive (chauffage, joints, etc.).',
        basePrice: 40,
        isEligibleTaxCredit: true,
        estimatedDuration: 90,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'maintenanceType',
            type: 'select',
            label: 'Type de maintenance',
            required: true,
            options: ['Chauffage', 'Plomberie', 'Électricité', 'Autre']
          },
          {
            id: 'maintenanceDetails',
            type: 'textarea',
            label: 'Détails de la maintenance',
            required: true,
          }
        ]
      },
      {
        id: 'home-diagnosis',
        categoryId: 'handyman',
        name: 'Diagnostic rapide du logement',
        description: 'Diagnostic rapide de l\'état général du logement.',
        basePrice: 45,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'propertySize',
            type: 'select',
            label: 'Taille du logement',
            required: true,
            options: ['Studio', '2 pièces', '3 pièces', '4 pièces ou plus']
          },
          {
            id: 'diagnosisAreas',
            type: 'textarea',
            label: 'Zones à diagnostiquer',
            required: true,
          }
        ]
      }
    ]
  },
  {
    id: 'gardening',
    name: 'Jardinage & Extérieur',
    icon: '🌿',
    color: '#8BC34A',
    services: [
      {
        id: 'lawn-mowing',
        categoryId: 'gardening',
        name: 'Tonte de pelouse',
        description: 'Service de tonte de pelouse.',
        basePrice: 30,
        isEligibleTaxCredit: true,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'lawnSize',
            type: 'number',
            label: 'Surface approximative (m²)',
            required: true,
          },
          {
            id: 'equipmentProvided',
            type: 'select',
            label: 'Équipement fourni',
            required: true,
            options: ['Oui', 'Non']
          }
        ]
      },
      {
        id: 'hedge-trimming',
        categoryId: 'gardening',
        name: 'Taille d\'arbustes/haies',
        description: 'Service de taille d\'arbustes et de haies.',
        basePrice: 35,
        isEligibleTaxCredit: true,
        estimatedDuration: 90,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'hedgeLength',
            type: 'number',
            label: 'Longueur approximative (m)',
            required: true,
          },
          {
            id: 'equipmentProvided',
            type: 'select',
            label: 'Équipement fourni',
            required: true,
            options: ['Oui', 'Non']
          }
        ]
      },
      {
        id: 'watering',
        categoryId: 'gardening',
        name: 'Arrosage (vacances ou régulier)',
        description: 'Service d\'arrosage pendant vos vacances ou de façon régulière.',
        basePrice: 20,
        isEligibleTaxCredit: true,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'gardenSize',
            type: 'select',
            label: 'Taille du jardin',
            required: true,
            options: ['Petit', 'Moyen', 'Grand']
          },
          {
            id: 'wateringInstructions',
            type: 'textarea',
            label: 'Instructions d\'arrosage',
            required: true,
          }
        ]
      },
      {
        id: 'leaf-collection',
        categoryId: 'gardening',
        name: 'Ramassage de feuilles',
        description: 'Service de ramassage et évacuation de feuilles mortes.',
        basePrice: 25,
        isEligibleTaxCredit: true,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'gardenSize',
            type: 'select',
            label: 'Taille du jardin',
            required: true,
            options: ['Petit', 'Moyen', 'Grand']
          },
          {
            id: 'equipmentProvided',
            type: 'select',
            label: 'Équipement fourni',
            required: true,
            options: ['Oui', 'Non']
          }
        ]
      },
      {
        id: 'planting',
        categoryId: 'gardening',
        name: 'Plantation / balcon-jardin',
        description: 'Service de plantation pour jardin ou balcon.',
        basePrice: 30,
        isEligibleTaxCredit: true,
        estimatedDuration: 90,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'plantType',
            type: 'textarea',
            label: 'Types de plantes',
            required: true,
          },
          {
            id: 'plantingArea',
            type: 'select',
            label: 'Zone de plantation',
            required: true,
            options: ['Jardin', 'Balcon', 'Terrasse', 'Autre']
          }
        ]
      },
      {
        id: 'snow-removal',
        categoryId: 'gardening',
        name: 'Déneigement trottoir / allée',
        description: 'Service de déneigement de trottoir ou d\'allée.',
        basePrice: 25,
        isEligibleTaxCredit: true,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'areaSize',
            type: 'number',
            label: 'Surface approximative (m²)',
            required: true,
          },
          {
            id: 'equipmentProvided',
            type: 'select',
            label: 'Équipement fourni',
            required: true,
            options: ['Oui', 'Non']
          }
        ]
      },
      {
        id: 'terrace-maintenance',
        categoryId: 'gardening',
        name: 'Entretien de terrasse',
        description: 'Service d\'entretien et nettoyage de terrasse.',
        basePrice: 35,
        isEligibleTaxCredit: true,
        estimatedDuration: 90,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'terraceSize',
            type: 'number',
            label: 'Surface approximative (m²)',
            required: true,
          },
          {
            id: 'terraceType',
            type: 'select',
            label: 'Type de terrasse',
            required: true,
            options: ['Bois', 'Carrelage', 'Pierre', 'Composite', 'Autre']
          }
        ]
      },
      {
        id: 'outdoor-decoration',
        categoryId: 'gardening',
        name: 'Pose déco extérieure',
        description: 'Installation de décoration extérieure (lumières, meubles).',
        basePrice: 30,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'decorationType',
            type: 'textarea',
            label: 'Type de décoration',
            required: true,
          }
        ]
      },
      {
        id: 'vegetable-garden',
        categoryId: 'gardening',
        name: 'Création de potager',
        description: 'Service de création ou entretien de potager.',
        basePrice: 40,
        isEligibleTaxCredit: true,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'gardenSize',
            type: 'number',
            label: 'Surface approximative (m²)',
            required: true,
          },
          {
            id: 'vegetableTypes',
            type: 'textarea',
            label: 'Types de légumes/fruits souhaités',
            required: false,
          }
        ]
      },
      {
        id: 'pest-control',
        categoryId: 'gardening',
        name: 'Lutte naturelle contre nuisibles',
        description: 'Solutions naturelles contre les nuisibles du jardin.',
        basePrice: 35,
        isEligibleTaxCredit: true,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'pestType',
            type: 'textarea',
            label: 'Type de nuisibles',
            required: true,
          },
          {
            id: 'gardenDetails',
            type: 'textarea',
            label: 'Détails du jardin',
            required: true,
          }
        ]
      }
    ]
  },
  {
    id: 'events',
    name: 'Événements & Vie Sociale',
    icon: '🎉',
    color: '#E91E63',
    services: [
      {
        id: 'event-organization',
        categoryId: 'events',
        name: 'Organisation d\'événements',
        description: 'Organisation d\'événements (anniversaire, baby-shower…).',
        basePrice: 50,
        isEligibleTaxCredit: false,
        estimatedDuration: 240,
        requiresDeposit: true,
        requiredFields: [
          {
            id: 'eventType',
            type: 'select',
            label: 'Type d\'événement',
            required: true,
            options: ['Anniversaire', 'Baby-shower', 'Pot de départ', 'Autre']
          },
          {
            id: 'guestCount',
            type: 'number',
            label: 'Nombre d\'invités',
            required: true,
          }
        ]
      },
      {
        id: 'decoration-delivery',
        categoryId: 'events',
        name: 'Livraison de déco, ballons, sono',
        description: 'Livraison de décorations, ballons ou matériel de sonorisation.',
        basePrice: 25,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: true,
        requiredFields: [
          {
            id: 'itemsList',
            type: 'textarea',
            label: 'Liste des articles',
            required: true,
          }
        ]
      },
      {
        id: 'party-companion',
        categoryId: 'events',
        name: 'Accompagnement soirée, fête',
        description: 'Accompagnement et assistance lors de soirées ou fêtes.',
        basePrice: 30,
        isEligibleTaxCredit: false,
        estimatedDuration: 240,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'eventType',
            type: 'text',
            label: 'Type d\'événement',
            required: true,
          },
          {
            id: 'assistanceDetails',
            type: 'textarea',
            label: 'Détails de l\'assistance requise',
            required: true,
          }
        ]
      },
      {
        id: 'event-setup',
        categoryId: 'events',
        name: 'Préparation & rangement salle d\'événement',
        description: 'Préparation et rangement de salle pour événements.',
        basePrice: 40,
        isEligibleTaxCredit: false,
        estimatedDuration: 180,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'venueAddress',
            type: 'text',
            label: 'Adresse du lieu',
            required: true,
          },
          {
            id: 'setupDetails',
            type: 'textarea',
            label: 'Détails de la préparation',
            required: true,
          }
        ]
      },
      {
        id: 'equipment-delivery',
        categoryId: 'events',
        name: 'Livraison de matériel',
        description: 'Livraison de matériel pour événements (vaisselle, jeux, sono…).',
        basePrice: 30,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: true,
        requiredFields: [
          {
            id: 'equipmentList',
            type: 'textarea',
            label: 'Liste du matériel',
            required: true,
          },
          {
            id: 'deliveryAddress',
            type: 'text',
            label: 'Adresse de livraison',
            required: true,
          }
        ]
      },
      {
        id: 'event-photography',
        categoryId: 'events',
        name: 'Photos/vidéos souvenirs',
        description: 'Service de photographie et vidéographie pour événements.',
        basePrice: 45,
        isEligibleTaxCredit: false,
        estimatedDuration: 180,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'eventType',
            type: 'text',
            label: 'Type d\'événement',
            required: true,
          },
          {
            id: 'serviceType',
            type: 'select',
            label: 'Type de service',
            required: true,
            options: ['Photos', 'Vidéos', 'Les deux']
          }
        ]
      },
      {
        id: 'party-driver',
        categoryId: 'events',
        name: 'Chauffeur de soirée',
        description: 'Service de chauffeur pour vos soirées.',
        basePrice: 35,
        isEligibleTaxCredit: false,
        estimatedDuration: 240,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'pickupTime',
            type: 'time',
            label: 'Heure de prise en charge',
            required: true,
          },
          {
            id: 'passengerCount',
            type: 'number',
            label: 'Nombre de passagers',
            required: true,
          }
        ]
      },
      {
        id: 'event-animation',
        categoryId: 'events',
        name: 'Animateur ponctuel, DJ, animateur enfants',
        description: 'Service d\'animation pour événements (DJ, animation enfants).',
        basePrice: 60,
        isEligibleTaxCredit: false,
        estimatedDuration: 180,
        requiresDeposit: true,
        requiredFields: [
          {
            id: 'animationType',
            type: 'select',
            label: 'Type d\'animation',
            required: true,
            options: ['DJ', 'Animation enfants', 'Animation adultes', 'Autre']
          },
          {
            id: 'eventDetails',
            type: 'textarea',
            label: 'Détails de l\'événement',
            required: true,
          }
        ]
      }
    ]
  },
  {
    id: 'emergency',
    name: 'Urgences & Imprévus',
    icon: '🆘',
    color: '#F44336',
    services: [
      {
        id: 'forgotten-items',
        categoryId: 'emergency',
        name: 'Apporter clés, documents ou objets oubliés',
        description: 'Livraison d\'objets, clés ou documents oubliés.',
        basePrice: 15,
        isEligibleTaxCredit: false,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'itemDescription',
            type: 'textarea',
            label: 'Description des objets',
            required: true,
          },
          {
            id: 'deliveryAddress',
            type: 'text',
            label: 'Adresse de livraison',
            required: true,
          }
        ]
      },
      {
        id: 'urgent-documents',
        categoryId: 'emergency',
        name: 'Aller chercher papiers urgents',
        description: 'Récupération de documents urgents (passeport, attestation…).',
        basePrice: 20,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'documentType',
            type: 'text',
            label: 'Type de document',
            required: true,
          },
          {
            id: 'pickupAddress',
            type: 'text',
            label: 'Adresse de récupération',
            required: true,
          }
        ]
      },
      {
        id: 'temporary-replacement',
        categoryId: 'emergency',
        name: 'Remplacement temporaire',
        description: 'Remplacement temporaire (nounou, aidant…).',
        basePrice: 25,
        isEligibleTaxCredit: true,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'replacementType',
            type: 'select',
            label: 'Type de remplacement',
            required: true,
            options: ['Garde d\'enfant', 'Aide à domicile', 'Autre']
          },
          {
            id: 'replacementDetails',
            type: 'textarea',
            label: 'Détails du remplacement',
            required: true,
          }
        ]
      },
      {
        id: 'reassuring-presence',
        categoryId: 'emergency',
        name: 'Présence rassurante',
        description: 'Présence rassurante (nuit, enfant seul…).',
        basePrice: 20,
        isEligibleTaxCredit: true,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'presenceReason',
            type: 'textarea',
            label: 'Raison de la présence',
            required: true,
          },
          {
            id: 'presenceDuration',
            type: 'select',
            label: 'Durée de présence',
            required: true,
            options: ['1-2 heures', '2-4 heures', '4-8 heures', 'Nuit complète']
          }
        ]
      },
      {
        id: 'queue-service',
        categoryId: 'emergency',
        name: 'Faire la queue à votre place',
        description: 'Service pour faire la queue à votre place (préfecture, mairie…).',
        basePrice: 20,
        isEligibleTaxCredit: false,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'queueLocation',
            type: 'text',
            label: 'Lieu de la file d\'attente',
            required: true,
          },
          {
            id: 'queuePurpose',
            type: 'textarea',
            label: 'Objectif de l\'attente',
            required: true,
          }
        ]
      },
      {
        id: 'domestic-issue',
        categoryId: 'emergency',
        name: 'Intervention en cas de souci domestique',
        description: 'Intervention rapide en cas de problème domestique.',
        basePrice: 30,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'issueType',
            type: 'textarea',
            label: 'Description du problème',
            required: true,
          },
          {
            id: 'urgencyLevel',
            type: 'select',
            label: 'Niveau d\'urgence',
            required: true,
            options: ['Normal', 'Urgent', 'Très urgent']
          }
        ]
      },
      {
        id: 'home-check',
        categoryId: 'emergency',
        name: 'Passage de vérification',
        description: 'Vérification de votre domicile en votre absence.',
        basePrice: 15,
        isEligibleTaxCredit: false,
        estimatedDuration: 30,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'checkReason',
            type: 'textarea',
            label: 'Raison de la vérification',
            required: true,
          },
          {
            id: 'checkInstructions',
            type: 'textarea',
            label: 'Instructions spécifiques',
            required: false,
          }
        ]
      }
    ]
  },
  {
    id: 'professional',
    name: 'Services Pro',
    icon: '💼',
    color: '#607D8B',
    services: [
      {
        id: 'pro-delivery',
        categoryId: 'professional',
        name: 'Livraison entre professionnels',
        description: 'Service de livraison entre professionnels (cabinet → tribunal, etc.).',
        basePrice: 25,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'deliveryContent',
            type: 'textarea',
            label: 'Contenu de la livraison',
            required: true,
          },
          {
            id: 'deliveryAddress',
            type: 'text',
            label: 'Adresse de livraison',
            required: true,
          }
        ]
      },
      {
        id: 'remote-secretarial',
        categoryId: 'professional',
        name: 'Secrétariat à distance',
        description: 'Services de secrétariat à distance.',
        basePrice: 30,
        isEligibleTaxCredit: false,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'taskDescription',
            type: 'textarea',
            label: 'Description des tâches',
            required: true,
          }
        ]
      },
      {
        id: 'document-services',
        categoryId: 'professional',
        name: 'Dépôt de documents, reprographie',
        description: 'Service de dépôt de documents et reprographie.',
        basePrice: 20,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'serviceType',
            type: 'select',
            label: 'Type de service',
            required: true,
            options: ['Dépôt de documents', 'Reprographie', 'Les deux']
          },
          {
            id: 'documentDetails',
            type: 'textarea',
            label: 'Détails des documents',
            required: true,
          }
        ]
      },
      {
        id: 'event-logistics',
        categoryId: 'professional',
        name: 'Aide à la logistique de mini-événements pro',
        description: 'Assistance logistique pour petits événements professionnels.',
        basePrice: 40,
        isEligibleTaxCredit: false,
        estimatedDuration: 180,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'eventType',
            type: 'text',
            label: 'Type d\'événement',
            required: true,
          },
          {
            id: 'logisticsDetails',
            type: 'textarea',
            label: 'Détails logistiques',
            required: true,
          }
        ]
      },
      {
        id: 'it-assistance',
        categoryId: 'professional',
        name: 'Assistance informatique',
        description: 'Assistance informatique (configuration simple, messagerie).',
        basePrice: 35,
        isEligibleTaxCredit: false,
        estimatedDuration: 90,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'assistanceType',
            type: 'textarea',
            label: 'Type d\'assistance requise',
            required: true,
          }
        ]
      },
      {
        id: 'temp-reception',
        categoryId: 'professional',
        name: 'Standard ou accueil temporaire',
        description: 'Service de standard téléphonique ou accueil temporaire.',
        basePrice: 25,
        isEligibleTaxCredit: false,
        estimatedDuration: 240,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'serviceType',
            type: 'select',
            label: 'Type de service',
            required: true,
            options: ['Standard téléphonique', 'Accueil physique', 'Les deux']
          },
          {
            id: 'serviceDetails',
            type: 'textarea',
            label: 'Détails du service',
            required: true,
          }
        ]
      },
      {
        id: 'commercial-assistant',
        categoryId: 'professional',
        name: 'Assistant commercial à la demande',
        description: 'Service d\'assistance commerciale ponctuelle.',
        basePrice: 40,
        isEligibleTaxCredit: false,
        estimatedDuration: 180,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'assistanceDetails',
            type: 'textarea',
            label: 'Détails de l\'assistance requise',
            required: true,
          }
        ]
      },
      {
        id: 'equipment-handling',
        categoryId: 'professional',
        name: 'Réception ou remise de matériel sur site',
        description: 'Service de réception ou remise de matériel sur site.',
        basePrice: 25,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'serviceType',
            type: 'select',
            label: 'Type de service',
            required: true,
            options: ['Réception', 'Remise', 'Les deux']
          },
          {
            id: 'equipmentDetails',
            type: 'textarea',
            label: 'Détails du matériel',
            required: true,
          }
        ]
      },
      {
        id: 'intermediation',
        categoryId: 'professional',
        name: 'Commissions d\'intermédiation',
        description: 'Services de mise en relation et d\'apport d\'affaires.',
        basePrice: 50,
        isEligibleTaxCredit: false,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'serviceType',
            type: 'select',
            label: 'Type de service',
            required: true,
            options: ['Mise en relation simple', 'Apport d\'affaire', 'Sourcing clients', 'Mise en relation immobilière', 'Prospection commerciale', 'Mise en relation freelances']
          },
          {
            id: 'serviceDetails',
            type: 'textarea',
            label: 'Détails du service',
            required: true,
          }
        ]
      }
    ]
  },
  {
    id: 'concierge',
    name: 'Domicile & Conciergerie',
    icon: '🏠',
    color: '#795548',
    services: [
      {
        id: 'temp-housesitting',
        categoryId: 'concierge',
        name: 'Gardiennage temporaire',
        description: 'Service de gardiennage temporaire pendant vos absences.',
        basePrice: 25,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'durationNeeded',
            type: 'select',
            label: 'Durée du gardiennage',
            required: true,
            options: ['Quelques heures', 'Une journée', 'Plusieurs jours']
          },
          {
            id: 'housesittingDetails',
            type: 'textarea',
            label: 'Détails du gardiennage',
            required: true,
          }
        ]
      },
      {
        id: 'plant-care',
        categoryId: 'concierge',
        name: 'Arrosage plantes / vérification appartement',
        description: 'Arrosage de plantes et vérification d\'appartement pendant votre absence.',
        basePrice: 20,
        isEligibleTaxCredit: false,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'plantCount',
            type: 'number',
            label: 'Nombre de plantes',
            required: true,
          },
          {
            id: 'careInstructions',
            type: 'textarea',
            label: 'Instructions d\'entretien',
            required: true,
          }
        ]
      },
      {
        id: 'package-reception',
        categoryId: 'concierge',
        name: 'Réception de colis ou visiteurs',
        description: 'Service de réception de colis ou accueil de visiteurs.',
        basePrice: 15,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'serviceType',
            type: 'select',
            label: 'Type de service',
            required: true,
            options: ['Réception de colis', 'Accueil de visiteurs', 'Les deux']
          },
          {
            id: 'serviceDetails',
            type: 'textarea',
            label: 'Détails du service',
            required: true,
          }
        ]
      },
      {
        id: 'home-preparation',
        categoryId: 'concierge',
        name: 'Préparation de logement',
        description: 'Préparation de logement (chauffage, ménage…) avant votre arrivée.',
        basePrice: 30,
        isEligibleTaxCredit: true,
        estimatedDuration: 90,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'preparationDetails',
            type: 'textarea',
            label: 'Détails de la préparation',
            required: true,
          }
        ]
      },
      {
        id: 'property-viewing',
        categoryId: 'concierge',
        name: 'Visite immobilière à votre place',
        description: 'Service de visite immobilière en votre nom.',
        basePrice: 35,
        isEligibleTaxCredit: false,
        estimatedDuration: 60,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'propertyAddress',
            type: 'text',
            label: 'Adresse du bien',
            required: true,
          },
          {
            id: 'viewingDetails',
            type: 'textarea',
            label: 'Détails de la visite',
            required: true,
          }
        ]
      },
      {
        id: 'utility-reading',
        categoryId: 'concierge',
        name: 'Relevé compteurs, état des lieux',
        description: 'Service de relevé de compteurs ou état des lieux.',
        basePrice: 25,
        isEligibleTaxCredit: false,
        estimatedDuration: 45,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'serviceType',
            type: 'select',
            label: 'Type de service',
            required: true,
            options: ['Relevé de compteurs', 'État des lieux', 'Les deux']
          },
          {
            id: 'serviceDetails',
            type: 'textarea',
            label: 'Détails du service',
            required: true,
          }
        ]
      },
      {
        id: 'airbnb-preparation',
        categoryId: 'concierge',
        name: 'Préparation d\'appartement Airbnb',
        description: 'Service de préparation d\'appartement pour location Airbnb.',
        basePrice: 40,
        isEligibleTaxCredit: false,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'propertySize',
            type: 'select',
            label: 'Taille du logement',
            required: true,
            options: ['Studio', '2 pièces', '3 pièces', '4 pièces ou plus']
          },
          {
            id: 'preparationDetails',
            type: 'textarea',
            label: 'Détails de la préparation',
            required: true,
          }
        ]
      },
      {
        id: 'moving-assistance',
        categoryId: 'concierge',
        name: 'Aide à emménagement / installation',
        description: 'Assistance pour emménagement ou installation dans un nouveau logement.',
        basePrice: 45,
        isEligibleTaxCredit: true,
        estimatedDuration: 180,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'assistanceType',
            type: 'textarea',
            label: 'Type d\'assistance requise',
            required: true,
          },
          {
            id: 'propertySize',
            type: 'select',
            label: 'Taille du logement',
            required: true,
            options: ['Studio', '2 pièces', '3 pièces', '4 pièces ou plus']
          }
        ]
      }
    ]
  },
  {
    id: 'premium',
    name: 'Services Premium',
    icon: '💎',
    color: '#9C27B0',
    services: [
      {
        id: 'personal-assistant',
        categoryId: 'premium',
        name: 'Assistant personnel 1 jour',
        description: 'Service d\'assistant personnel pour une journée (courses, ménage, fleurs…).',
        basePrice: 150,
        isEligibleTaxCredit: true,
        estimatedDuration: 480,
        requiresDeposit: true,
        requiredFields: [
          {
            id: 'tasksList',
            type: 'textarea',
            label: 'Liste des tâches',
            required: true,
          }
        ]
      },
      {
        id: 'valet-service',
        categoryId: 'premium',
        name: 'Voiturier ponctuel',
        description: 'Service de voiturier pour événements ou besoins ponctuels.',
        basePrice: 40,
        isEligibleTaxCredit: false,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'serviceDetails',
            type: 'textarea',
            label: 'Détails du service',
            required: true,
          }
        ]
      },
      {
        id: 'express-butler',
        categoryId: 'premium',
        name: 'Majordome express',
        description: 'Service de majordome express multi-tâches.',
        basePrice: 80,
        isEligibleTaxCredit: true,
        estimatedDuration: 240,
        requiresDeposit: true,
        requiredFields: [
          {
            id: 'serviceDetails',
            type: 'textarea',
            label: 'Détails du service',
            required: true,
          }
        ]
      },
      {
        id: 'tech-delivery-setup',
        categoryId: 'premium',
        name: 'Livraison et installation TV, PC, console',
        description: 'Livraison et installation d\'équipements électroniques.',
        basePrice: 60,
        isEligibleTaxCredit: false,
        estimatedDuration: 120,
        requiresDeposit: false,
        requiredFields: [
          {
            id: 'equipmentType',
            type: 'select',
            label: 'Type d\'équipement',
            required: true,
            options: ['TV', 'Ordinateur', 'Console de jeu', 'Autre']
          },
          {
            id: 'installationDetails',
            type: 'textarea',
            label: 'Détails de l\'installation',
            required: true,
          }
        ]
      },
      {
        id: 'secure-transport',
        categoryId: 'premium',
        name: 'Transport sécurisé',
        description: 'Transport sécurisé d\'objets précieux, œuvres d\'art…',
        basePrice: 70,
        isEligibleTaxCredit: false,
        estimatedDuration: 90,
        requiresDeposit: true,
        requiredFields: [
          {
            id: 'itemDescription',
            type: 'textarea',
            label: 'Description des objets',
            required: true,
          },
          {
            id: 'destination',
            type: 'text',
            label: 'Adresse de destination',
            required: true,
          }
        ]
      },
      {
        id: 'luxury-services',
        categoryId: 'premium',
        name: 'Services de luxe à la demande',
        description: 'Services de luxe personnalisés (VIP, événements…).',
        basePrice: 100,
        isEligibleTaxCredit: false,
        estimatedDuration: 240,
        requiresDeposit: true,
        requiredFields: [
          {
            id: 'serviceDetails',
            type: 'textarea',
            label: 'Détails du service',
            required: true,
          }
        ]
      }
    ]
  }
];

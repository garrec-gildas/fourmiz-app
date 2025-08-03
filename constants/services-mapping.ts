// constants/services-mapping.ts
// Mapping entre les critères fourmiz et les services existants dans la table

import type { FourmizServiceMapping } from '@/types/services.types';

// Mapping des catégories fourmiz vers les services existants
export const FOURMIZ_TO_SERVICES_MAPPING: FourmizServiceMapping[] = [
  {
    fourmiz_category_key: 'menage_entretien',
    fourmiz_category_label: 'Ménage et entretien',
    fourmiz_category_icon: '🧹',
    mapped_services: [
      { categorie: 'ménage' },
      { categorie: 'nettoyage' },
      { categorie: 'entretien' },
      { title_pattern: 'ménage|nettoyage|aspirat|repassage|rangement' },
      { description_pattern: 'nettoyer|laver|aspirer|repasser|ranger' }
    ]
  },
  {
    fourmiz_category_key: 'bricolage_reparations',
    fourmiz_category_label: 'Bricolage et réparations',
    fourmiz_category_icon: '🔧',
    mapped_services: [
      { categorie: 'bricolage' },
      { categorie: 'réparation' },
      { categorie: 'maintenance' },
      { title_pattern: 'bricolage|réparation|montage|installation|dépannage' },
      { description_pattern: 'réparer|monter|installer|bricoler|dépanner' }
    ]
  },
  {
    fourmiz_category_key: 'jardinage_exterieur',
    fourmiz_category_label: 'Jardinage et extérieur',
    fourmiz_category_icon: '🌱',
    mapped_services: [
      { categorie: 'jardinage' },
      { categorie: 'paysagisme' },
      { categorie: 'extérieur' },
      { title_pattern: 'jardin|pelouse|plante|tonte|taille|potager' },
      { description_pattern: 'jardiner|planter|tailler|tondre|arroser' }
    ]
  },
  {
    fourmiz_category_key: 'garde_accompagnement',
    fourmiz_category_label: 'Garde et accompagnement',
    fourmiz_category_icon: '👶',
    mapped_services: [
      { categorie: 'garde' },
      { categorie: 'baby-sitting' },
      { categorie: 'accompagnement' },
      { title_pattern: 'garde|baby.?sitting|enfants|animaux|accompagnement' },
      { description_pattern: 'garder|surveiller|accompagner|baby.?sit' }
    ]
  },
  {
    fourmiz_category_key: 'livraison_transport',
    fourmiz_category_label: 'Livraison et transport',
    fourmiz_category_icon: '📦',
    mapped_services: [
      { categorie: 'livraison' },
      { categorie: 'transport' },
      { categorie: 'coursier' },
      { title_pattern: 'livraison|transport|coursier|chauffeur' },
      { description_pattern: 'livrer|transporter|conduire|amener' }
    ]
  },
  {
    fourmiz_category_key: 'services_numeriques',
    fourmiz_category_label: 'Services numériques',
    fourmiz_category_icon: '💻',
    mapped_services: [
      { categorie: 'numérique' },
      { categorie: 'informatique' },
      { categorie: 'digital' },
      { title_pattern: 'informatique|ordinateur|site.?web|développement|numérique' },
      { description_pattern: 'programmer|développer|créer.?site|informatique' }
    ]
  },
  {
    fourmiz_category_key: 'cours_formation',
    fourmiz_category_label: 'Cours et formation',
    fourmiz_category_icon: '📚',
    mapped_services: [
      { categorie: 'cours' },
      { categorie: 'formation' },
      { categorie: 'éducation' },
      { title_pattern: 'cours|formation|apprentissage|enseignement|soutien' },
      { description_pattern: 'enseigner|former|apprendre|éduquer|cours' }
    ]
  },
  {
    fourmiz_category_key: 'services_personnels',
    fourmiz_category_label: 'Services personnels',
    fourmiz_category_icon: '💄',
    mapped_services: [
      { categorie: 'personnel' },
      { categorie: 'bien-être' },
      { categorie: 'beauté' },
      { title_pattern: 'coiffure|massage|esthétique|bien.?être|relaxation' },
      { description_pattern: 'masser|coiffer|relaxer|bien.?être' }
    ]
  },
  {
    fourmiz_category_key: 'services_administratifs',
    fourmiz_category_label: 'Services administratifs',
    fourmiz_category_icon: '📋',
    mapped_services: [
      { categorie: 'administratif' },
      { categorie: 'secrétariat' },
      { categorie: 'gestion' },
      { title_pattern: 'administratif|secrétariat|gestion|documents|démarches' },
      { description_pattern: 'administrer|gérer|classer|rédiger|démarches' }
    ]
  }
];

// Catégories spéciales pour les services hors catalogue
export const SPECIAL_CATEGORIES = {
  urgence: {
    fourmiz_category_key: 'services_urgence',
    fourmiz_category_label: 'Services d\'urgence',
    fourmiz_category_icon: '🚨',
    mapped_services: [
      { categorie: 'urgence' },
      { title_pattern: 'urgence|express|immédiat|dépannage' },
      { description_pattern: 'urgent|immédiat|express|dépanner' }
    ]
  },
  evenementiel: {
    fourmiz_category_key: 'evenementiel',
    fourmiz_category_label: 'Événementiel',
    fourmiz_category_icon: '🎉',
    mapped_services: [
      { categorie: 'événementiel' },
      { title_pattern: 'événement|fête|mariage|animation|spectacle' },
      { description_pattern: 'organiser|animer|célébrer|événement' }
    ]
  },
  confiance: {
    fourmiz_category_key: 'services_confiance',
    fourmiz_category_label: 'Services de confiance',
    fourmiz_category_icon: '🤝',
    mapped_services: [
      { categorie: 'confiance' },
      { title_pattern: 'confiance|discrétion|personnel|privé' },
      { description_pattern: 'confidentiel|discret|personnel|privé' }
    ]
  }
};

// Fonction pour matcher un service avec les critères fourmiz
export function matchServiceToFourmizCategory(service: {
  title: string;
  description?: string;
  categorie?: string;
  category_id?: string;
}): string[] {
  const matches: string[] = [];

  // Vérifier toutes les catégories fourmiz
  const allMappings = [...FOURMIZ_TO_SERVICES_MAPPING, ...Object.values(SPECIAL_CATEGORIES)];

  for (const mapping of allMappings) {
    for (const condition of mapping.mapped_services) {
      let isMatch = false;

      // Match par catégorie exacte
      if (condition.categorie && service.categorie === condition.categorie) {
        isMatch = true;
      }

      // Match par pattern dans le titre
      if (condition.title_pattern && service.title) {
        const regex = new RegExp(condition.title_pattern, 'i');
        if (regex.test(service.title)) {
          isMatch = true;
        }
      }

      // Match par pattern dans la description
      if (condition.description_pattern && service.description) {
        const regex = new RegExp(condition.description_pattern, 'i');
        if (regex.test(service.description)) {
          isMatch = true;
        }
      }

      if (isMatch && !matches.includes(mapping.fourmiz_category_key)) {
        matches.push(mapping.fourmiz_category_key);
        break; // Un seul match par mapping
      }
    }
  }

  return matches;
}

// Fonction pour obtenir les services par catégorie fourmiz
export function getServicesByFourmizCategory(
  services: any[],
  fourmizCategoryKey: string
): any[] {
  return services.filter(service => {
    const matches = matchServiceToFourmizCategory(service);
    return matches.includes(fourmizCategoryKey);
  });
}

// Fonction pour obtenir toutes les catégories fourmiz avec leurs services
export function getFourmizCategoriesWithServices(services: any[]) {
  const allMappings = [...FOURMIZ_TO_SERVICES_MAPPING, ...Object.values(SPECIAL_CATEGORIES)];
  
  return allMappings.map(mapping => ({
    key: mapping.fourmiz_category_key,
    label: mapping.fourmiz_category_label,
    icon: mapping.fourmiz_category_icon,
    services: getServicesByFourmizCategory(services, mapping.fourmiz_category_key),
    serviceCount: getServicesByFourmizCategory(services, mapping.fourmiz_category_key).length
  }));
}

// Fonction pour rechercher des services selon les critères fourmiz
export function searchServicesByCriteria(
  services: any[],
  selectedCategories: string[]
): any[] {
  if (selectedCategories.length === 0) {
    return services;
  }

  return services.filter(service => {
    const matches = matchServiceToFourmizCategory(service);
    return matches.some(match => selectedCategories.includes(match));
  });
}

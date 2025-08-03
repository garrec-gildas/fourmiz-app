// lib/supabase.ts - CONFIGURATION SUPABASE ULTRA-ROBUSTE
// 🚀 Version corrigée pour éliminer l'erreur onAuthStateChange
// ✅ FONCTION UPLOADFILE AJOUTÉE POUR CORRIGER LE BUG

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { Alert } from 'react-native';

// ✅ TYPES DATABASE ÉTENDUS
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          firstname: string | null;
          lastname: string | null;
          avatar_url: string | null;
          roles: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          firstname?: string | null;
          lastname?: string | null;
          avatar_url?: string | null;
          roles?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          firstname?: string | null;
          lastname?: string | null;
          avatar_url?: string | null;
          roles?: string[];
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          price: number;
          is_active: boolean;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          price: number;
          is_active?: boolean;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          price?: number;
          is_active?: boolean;
          user_id?: string;
          updated_at?: string;
        };
      };
      badges_catalog: {
        Row: {
          id: string;
          name: string;
          description: string;
          custom_name: string | null;
          custom_description: string | null;
          category: string;
          value: number;
          currency: string;
          rarity: string;
          gradient_start: string;
          gradient_end: string;
          icon_name: string;
          is_active: boolean;
          is_visible: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          custom_name?: string | null;
          custom_description?: string | null;
          category: string;
          value: number;
          currency?: string;
          rarity: string;
          gradient_start: string;
          gradient_end: string;
          icon_name: string;
          is_active?: boolean;
          is_visible?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          custom_name?: string | null;
          custom_description?: string | null;
          category?: string;
          value?: number;
          currency?: string;
          rarity?: string;
          gradient_start?: string;
          gradient_end?: string;
          icon_name?: string;
          is_active?: boolean;
          is_visible?: boolean;
          display_order?: number;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          service_id: string;
          total_amount: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          service_id: string;
          total_amount: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          service_id?: string;
          total_amount?: number;
          status?: string;
          updated_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          reported_user_id: string;
          reason: string;
          description: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reported_user_id: string;
          reason: string;
          description?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reported_user_id?: string;
          reason?: string;
          description?: string | null;
          status?: string;
          updated_at?: string;
        };
      };
      payouts: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          status?: string;
          updated_at?: string;
        };
      };
      admin_settings: {
        Row: {
          id: string;
          setting_key: string;
          setting_value: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          setting_key: string;
          setting_value: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          setting_key?: string;
          setting_value?: string;
          updated_at?: string;
        };
      };
      admin_notifications: {
        Row: {
          id: string;
          title: string;
          message: string;
          is_read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          message: string;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          message?: string;
          is_read?: boolean;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// 🔧 VARIABLES D'ENVIRONNEMENT AVEC VALIDATION ROBUSTE
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY; // Optionnel pour admin

// ✅ VALIDATION STRICTE AVEC LOGS DÉTAILLÉS
console.log('🔍 Vérification variables Supabase...');
console.log('URL présente:', !!supabaseUrl);
console.log('Anon Key présente:', !!supabaseAnonKey);
console.log('Service Key présente:', !!supabaseServiceKey);

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = `
🚨 ERREUR CONFIGURATION SUPABASE 🚨

Variables manquantes dans .env :
${!supabaseUrl ? '❌ EXPO_PUBLIC_SUPABASE_URL' : '✅ EXPO_PUBLIC_SUPABASE_URL'}
${!supabaseAnonKey ? '❌ EXPO_PUBLIC_SUPABASE_ANON_KEY' : '✅ EXPO_PUBLIC_SUPABASE_ANON_KEY'}

Créez un fichier .env à la racine :
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
`;
  console.error(errorMessage);
  throw new Error('Configuration Supabase incomplète');
}

// Validation du format des URLs
try {
  new URL(supabaseUrl);
  console.log('✅ URL Supabase valide');
} catch {
  console.error('❌ URL Supabase invalide:', supabaseUrl);
  throw new Error(`EXPO_PUBLIC_SUPABASE_URL invalide: ${supabaseUrl}`);
}

// 🚀 CONFIGURATION CLIENT SUPABASE OPTIMISÉE
const supabaseConfig = {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important pour React Native
    flowType: 'pkce' as const,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'fourmiz-app-react-native',
      'X-Client-Version': '1.0.0',
    },
  },
};

// ✅ CRÉATION DU CLIENT PRINCIPAL AVEC VÉRIFICATION
console.log('🔄 Création client Supabase...');

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  supabaseConfig
);

// ✅ VÉRIFICATIONS CRITIQUES POST-CRÉATION
if (!supabase) {
  throw new Error('❌ Impossible de créer le client Supabase');
}

if (!supabase.auth) {
  throw new Error('❌ Supabase.auth non disponible');
}

if (typeof supabase.auth.onAuthStateChange !== 'function') {
  throw new Error('❌ supabase.auth.onAuthStateChange n\'est pas une fonction');
}

if (typeof supabase.auth.getUser !== 'function') {
  throw new Error('❌ supabase.auth.getUser n\'est pas une fonction');
}

if (typeof supabase.auth.getSession !== 'function') {
  throw new Error('❌ supabase.auth.getSession n\'est pas une fonction');
}

console.log('✅ Client Supabase créé avec succès');
console.log('✅ Auth disponible:', !!supabase.auth);
console.log('✅ onAuthStateChange disponible:', typeof supabase.auth.onAuthStateChange);
console.log('✅ getUser disponible:', typeof supabase.auth.getUser);
console.log('✅ getSession disponible:', typeof supabase.auth.getSession);

// 🔐 CLIENT ADMIN (si service key disponible)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'fourmiz-admin-react-native',
        },
      },
    })
  : null;

if (supabaseAdmin) {
  console.log('✅ Client admin Supabase créé');
}

// 📊 ÉTAT DE DEBUG
const IS_DEV = __DEV__;

if (IS_DEV) {
  console.log('🔧 Configuration Supabase:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceKey,
    storage: 'AsyncStorage',
    realtime: 'Activé',
    clientAdmin: !!supabaseAdmin,
  });
}

// 🛠️ HELPERS UTILITAIRES CORE (Version simplifiée et robuste)

/**
 * Récupère l'utilisateur connecté avec cache
 */
let cachedUser: User | null = null;
let userCacheTime = 0;
const USER_CACHE_DURATION = 30000; // 30 secondes

export const getCurrentUser = async (forceRefresh = false): Promise<User | null> => {
  try {
    // Vérifier que supabase.auth est disponible
    if (!supabase?.auth?.getUser) {
      console.error('❌ supabase.auth.getUser non disponible');
      return null;
    }

    // Utiliser le cache si disponible et récent
    if (!forceRefresh && cachedUser && Date.now() - userCacheTime < USER_CACHE_DURATION) {
      return cachedUser;
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      if (error.message?.includes('Auth session missing')) {
        console.log('ℹ️ Aucune session active (normal si pas connecté)');
      } else {
        console.error('❌ Erreur getCurrentUser:', error);
      }
      cachedUser = null;
      return null;
    }
    
    // Mettre à jour le cache
    cachedUser = user;
    userCacheTime = Date.now();
    
    if (IS_DEV && user) {
      console.log('✅ Utilisateur connecté:', user.email);
    }
    
    return user;
  } catch (error) {
    console.error('❌ Exception getCurrentUser:', error);
    cachedUser = null;
    return null;
  }
};

/**
 * Récupère la session active
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  try {
    if (!supabase?.auth?.getSession) {
      console.error('❌ supabase.auth.getSession non disponible');
      return null;
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Erreur getCurrentSession:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('❌ Exception getCurrentSession:', error);
    return null;
  }
};

/**
 * Récupère le profil de l'utilisateur connecté avec cache
 */
let cachedProfile: any = null;
let profileCacheTime = 0;
const PROFILE_CACHE_DURATION = 60000; // 1 minute

export const getCurrentProfile = async (forceRefresh = false) => {
  try {
    // Utiliser le cache si disponible et récent
    if (!forceRefresh && cachedProfile && Date.now() - profileCacheTime < PROFILE_CACHE_DURATION) {
      return cachedProfile;
    }

    const user = await getCurrentUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('❌ Erreur getCurrentProfile:', error);
      cachedProfile = null;
      return null;
    }

    // Mettre à jour le cache
    cachedProfile = profile;
    profileCacheTime = Date.now();

    return profile;
  } catch (error) {
    console.error('❌ Exception getCurrentProfile:', error);
    cachedProfile = null;
    return null;
  }
};

// 🔐 HELPERS ADMIN SPÉCIALISÉS

/**
 * Vérifie si l'utilisateur actuel est admin
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const profile = await getCurrentProfile();
    return profile?.roles?.includes('admin') || false;
  } catch (error) {
    console.error('❌ Erreur isCurrentUserAdmin:', error);
    return false;
  }
};

/**
 * Récupère les statistiques admin optimisées
 */
export const getAdminStats = async () => {
  try {
    const results = await Promise.allSettled([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('services').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('orders').select('total_amount').eq('status', 'completed'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('badges_catalog').select('value, is_active, is_visible'),
    ]);

    // Extraire données avec gestion d'erreur
    const usersCount = results[0].status === 'fulfilled' ? results[0].value.count || 0 : 0;
    const servicesCount = results[1].status === 'fulfilled' ? results[1].value.count || 0 : 0;
    const ordersData = results[2].status === 'fulfilled' ? results[2].value.data || [] : [];
    const reportsCount = results[3].status === 'fulfilled' ? results[3].value.count || 0 : 0;
    const badgesData = results[4].status === 'fulfilled' ? results[4].value.data || [] : [];

    const totalEarnings = ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const activeBadges = badgesData.filter(b => b.is_active && b.is_visible).length;
    const totalBadgesRewards = badgesData.reduce((sum, badge) => sum + (badge.value || 0), 0);

    return {
      totalUsers: usersCount,
      activeServices: servicesCount,
      totalEarnings,
      pendingReports: reportsCount,
      activeBadges,
      totalBadgesRewards,
      lastUpdate: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Exception getAdminStats:', error);
    return {
      totalUsers: 0,
      activeServices: 0,
      totalEarnings: 0,
      pendingReports: 0,
      activeBadges: 0,
      totalBadgesRewards: 0,
      lastUpdate: new Date().toISOString()
    };
  }
};

// 🚨 GESTION D'ERREURS AMÉLIORÉE

/**
 * Gestion centralisée des erreurs Supabase
 */
export const handleSupabaseError = (error: any, context?: string) => {
  const errorMessage = error?.message || 'Erreur inconnue';
  const errorCode = error?.code || 'UNKNOWN';
  
  console.error(`❌ Erreur Supabase${context ? ` (${context})` : ''}:`, {
    code: errorCode,
    message: errorMessage,
    details: error?.details,
    hint: error?.hint,
    timestamp: new Date().toISOString(),
  });

  // Messages d'erreur utilisateur-friendly
  let userMessage = 'Une erreur est survenue';
  
  switch (errorCode) {
    case 'PGRST116':
    case 'PGRST204':
      userMessage = 'Aucun résultat trouvé';
      break;
    case '23505':
      userMessage = 'Cette donnée existe déjà';
      break;
    case '42P01':
      userMessage = 'Table non trouvée';
      break;
    case 'auth/user-not-found':
      userMessage = 'Utilisateur non trouvé';
      break;
    case 'auth/wrong-password':
      userMessage = 'Mot de passe incorrect';
      break;
    case 'auth/email-already-in-use':
      userMessage = 'Cette adresse email est déjà utilisée';
      break;
    case 'auth/weak-password':
      userMessage = 'Le mot de passe est trop faible';
      break;
    case 'auth/invalid-email':
      userMessage = 'Adresse email invalide';
      break;
    default:
      userMessage = errorMessage;
  }

  return {
    code: errorCode,
    message: errorMessage,
    userMessage,
    originalError: error,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Vérifier la connectivité Supabase avec timeout
 */
export const checkSupabaseConnection = async (timeout = 5000): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .abortSignal(controller.signal);
    
    clearTimeout(timeoutId);
    
    if (error && !['PGRST116', 'PGRST204'].includes(error.code)) {
      console.error('❌ Supabase inaccessible:', error);
      return false;
    }
    
    if (IS_DEV) {
      console.log('✅ Connexion Supabase OK');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test connexion Supabase échoué:', error);
    return false;
  }
};

// 🎯 LISTENER D'AUTHENTIFICATION SÉCURISÉ

/**
 * Listener d'authentification avec gestion d'erreur robuste
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  try {
    // Vérification cruciale
    if (!supabase?.auth?.onAuthStateChange) {
      console.error('❌ supabase.auth.onAuthStateChange non disponible');
      return null;
    }

    const { data: { subscription }, error } = supabase.auth.onAuthStateChange((event, session) => {
      if (IS_DEV) {
        console.log('🔄 Auth state changed:', event, session?.user?.email || 'No user');
      }
      
      // Vider le cache utilisateur lors des changements
      cachedUser = session?.user || null;
      cachedProfile = null;
      userCacheTime = Date.now();
      profileCacheTime = 0;
      
      callback(session?.user || null);
    });

    if (error) {
      console.error('❌ Erreur onAuthStateChange:', error);
      return null;
    }

    console.log('✅ Auth listener configuré');
    return subscription;
  } catch (error) {
    console.error('❌ Exception onAuthStateChange:', error);
    return null;
  }
};

// 🧹 NETTOYAGE DES CACHES
export const clearAllCaches = () => {
  cachedUser = null;
  cachedProfile = null;
  userCacheTime = 0;
  profileCacheTime = 0;
  if (IS_DEV) {
    console.log('🧹 Caches Supabase vidés');
  }
};

// ☁️ FONCTION UPLOAD DE FICHIERS (NOUVELLE - CORRECTION DU BUG)
/**
 * Upload un fichier vers Supabase Storage avec gestion d'erreur robuste
 * Cette fonction corrige l'erreur "uploadFile is not a function"
 */
export const uploadFile = async (
  bucket: string, 
  path: string, 
  file: File | Blob, 
  options: { cacheControl?: string; upsert?: boolean } = {}
) => {
  try {
    console.log(`📤 Upload vers ${bucket}/${path}...`);
    
    // Configuration par défaut
    const uploadOptions = {
      cacheControl: '3600',
      upsert: true,
      ...options
    };
    
    // Upload du fichier
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, uploadOptions);
    
    if (error) {
      console.error('❌ Erreur upload:', error);
      throw error;
    }
    
    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    console.log('✅ Upload réussi:', publicUrl);
    
    return { 
      data, 
      publicUrl,
      path: data?.path || path
    };
    
  } catch (error) {
    console.error('💥 Erreur uploadFile:', error);
    const { userMessage } = handleSupabaseError(error, 'Upload fichier');
    throw new Error(userMessage);
  }
};

// 🚀 VÉRIFICATION FINALE AU DÉMARRAGE
if (IS_DEV) {
  // Test de base pour vérifier que tout fonctionne
  setTimeout(() => {
    checkSupabaseConnection(3000).then(isConnected => {
      if (isConnected) {
        console.log('🎉 Supabase complètement prêt !');
      } else {
        console.warn('⚠️ Problème de connexion Supabase détecté');
      }
    }).catch(error => {
      console.warn('⚠️ Timeout connexion Supabase:', error);
    });
  }, 1000);
}

// ✅ EXPORTS MULTIPLES POUR COMPATIBILITÉ
export { supabase as default };

// ✅ LOG FINAL DE SUCCÈS
console.log('🎯 Configuration Supabase terminée avec succès');
// lib/supabase.ts - VERSION COMPLÈTE CORRIGÉE SANS CRASH
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Types Database complets restaurés
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          firstname: string | null;
          lastname: string | null;
          avatar_url: string | null;
          roles: string[];
          criteria_completed: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          firstname?: string | null;
          lastname?: string | null;
          avatar_url?: string | null;
          roles?: string[];
          criteria_completed?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          firstname?: string | null;
          lastname?: string | null;
          avatar_url?: string | null;
          roles?: string[];
          criteria_completed?: boolean | null;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          categorie: string;
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
          categorie: string;
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
          categorie?: string;
          price?: number;
          is_active?: boolean;
          user_id?: string;
          updated_at?: string;
        };
      };
      criteria: {
        Row: {
          id: number;
          user_id: string;
          user_type: string;
          service_types: Record<string, boolean>;
          presentation: string | null;
          accepts_geolocation: boolean | null;
          specialized_equipment: string | null;
          min_price: number;
          max_distance: number;
          vehicle_types: string[];
          has_driving_license: boolean;
          has_vehicle_insurance: boolean;
          max_travel_distance: number;
          travel_cost_included: boolean;
          work_indoor: boolean;
          work_outdoor: boolean;
          accepts_team_work: boolean | null;
          uniform_required: boolean | null;
          safety_shoes_required: boolean | null;
          additional_product_billing: boolean | null;
          quote_required: boolean | null;
          equipment_provided: string[];
          accepts_pets: boolean;
          accepts_children: boolean;
          preferred_client_presence: string;
          urgent_services: boolean;
          accepts_custom_requests: boolean | null;
          min_mission_duration: number | null;
          max_mission_duration: number | null;
          min_booking_notice: number | null;
          availability_schedule: any;
          client_rating: number;
          min_fourmiz_rating: number;
          years_experience: string | null;
          certifications: string | null;
          specialties: string | null;
          spoken_languages: string[] | null;
          has_liability_insurance: boolean | null;
          references_verified: boolean | null;
          identity_verified: boolean | null;
          communication_language: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          user_type: string;
          service_types: Record<string, boolean>;
          presentation?: string | null;
          accepts_geolocation?: boolean | null;
          specialized_equipment?: string | null;
          min_price: number;
          max_distance: number;
          vehicle_types: string[];
          has_driving_license: boolean;
          has_vehicle_insurance: boolean;
          max_travel_distance: number;
          travel_cost_included: boolean;
          work_indoor: boolean;
          work_outdoor: boolean;
          accepts_team_work?: boolean | null;
          uniform_required?: boolean | null;
          safety_shoes_required?: boolean | null;
          additional_product_billing?: boolean | null;
          quote_required?: boolean | null;
          equipment_provided: string[];
          accepts_pets: boolean;
          accepts_children: boolean;
          preferred_client_presence: string;
          urgent_services: boolean;
          accepts_custom_requests?: boolean | null;
          min_mission_duration?: number | null;
          max_mission_duration?: number | null;
          min_booking_notice?: number | null;
          availability_schedule: any;
          client_rating: number;
          min_fourmiz_rating: number;
          years_experience?: string | null;
          certifications?: string | null;
          specialties?: string | null;
          spoken_languages?: string[] | null;
          has_liability_insurance?: boolean | null;
          references_verified?: boolean | null;
          identity_verified?: boolean | null;
          communication_language?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          user_type?: string;
          service_types?: Record<string, boolean>;
          presentation?: string | null;
          accepts_geolocation?: boolean | null;
          specialized_equipment?: string | null;
          min_price?: number;
          max_distance?: number;
          vehicle_types?: string[];
          has_driving_license?: boolean;
          has_vehicle_insurance?: boolean;
          max_travel_distance?: number;
          travel_cost_included?: boolean;
          work_indoor?: boolean;
          work_outdoor?: boolean;
          accepts_team_work?: boolean | null;
          uniform_required?: boolean | null;
          safety_shoes_required?: boolean | null;
          additional_product_billing?: boolean | null;
          quote_required?: boolean | null;
          equipment_provided?: string[];
          accepts_pets?: boolean;
          accepts_children?: boolean;
          preferred_client_presence?: string;
          urgent_services?: boolean;
          accepts_custom_requests?: boolean | null;
          min_mission_duration?: number | null;
          max_mission_duration?: number | null;
          min_booking_notice?: number | null;
          availability_schedule?: any;
          client_rating?: number;
          min_fourmiz_rating?: number;
          years_experience?: string | null;
          certifications?: string | null;
          specialties?: string | null;
          spoken_languages?: string[] | null;
          has_liability_insurance?: boolean | null;
          references_verified?: boolean | null;
          identity_verified?: boolean | null;
          communication_language?: string | null;
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

// DEBUG temporaire
console.log('=== DEBUG SUPABASE ENV ===');
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY présente:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
console.log('=========================');

// Variables avec fallback pour éviter crash
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hsijgsqtqbqevbytgvhm.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzaWpnc3F0cWJxZXZieXRndmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNDE1NjEsImV4cCI6MjA2NTkxNzU2MX0.lAJ-AY36uEUIDVONesEgHPNUhCyiUovdeolxCle-510';
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY;

// Validation avec avertissement (pas de crash)
if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('ATTENTION: Variables Supabase manquantes dans .env');
  console.warn('Utilisation des valeurs par défaut');
}

// Validation URL restaurée
try {
  new URL(supabaseUrl);
  console.log('URL Supabase valide');
} catch {
  console.warn('URL Supabase invalide, utilisation fallback');
}

// Configuration complète restaurée
const supabaseConfig = {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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

// Création client principal
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  supabaseConfig
);

// Client admin restauré
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

// État de debug restauré
const IS_DEV = __DEV__;

if (IS_DEV) {
  console.log('Configuration Supabase:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceKey,
    clientAdmin: !!supabaseAdmin,
  });
}

// Helpers avec cache restaurés
let cachedUser: User | null = null;
let userCacheTime = 0;
const USER_CACHE_DURATION = 30000;

export const getCurrentUser = async (forceRefresh = false): Promise<User | null> => {
  try {
    if (!supabase?.auth?.getUser) {
      console.error('supabase.auth.getUser non disponible');
      return null;
    }

    if (!forceRefresh && cachedUser && Date.now() - userCacheTime < USER_CACHE_DURATION) {
      return cachedUser;
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      if (error.message?.includes('Auth session missing')) {
        console.log('Aucune session active');
      } else {
        console.error('Erreur getCurrentUser:', error);
      }
      cachedUser = null;
      return null;
    }
    
    cachedUser = user;
    userCacheTime = Date.now();
    
    if (IS_DEV && user) {
      console.log('Utilisateur connecté:', user.email);
    }
    
    return user;
  } catch (error) {
    console.error('Exception getCurrentUser:', error);
    cachedUser = null;
    return null;
  }
};

export const getCurrentSession = async (): Promise<Session | null> => {
  try {
    if (!supabase?.auth?.getSession) {
      console.error('supabase.auth.getSession non disponible');
      return null;
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erreur getCurrentSession:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Exception getCurrentSession:', error);
    return null;
  }
};

let cachedProfile: any = null;
let profileCacheTime = 0;
const PROFILE_CACHE_DURATION = 60000;

export const getCurrentProfile = async (forceRefresh = false) => {
  try {
    if (!forceRefresh && cachedProfile && Date.now() - profileCacheTime < PROFILE_CACHE_DURATION) {
      return cachedProfile;
    }

    const user = await getCurrentUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Erreur getCurrentProfile:', error);
      cachedProfile = null;
      return null;
    }

    cachedProfile = profile;
    profileCacheTime = Date.now();

    return profile;
  } catch (error) {
    console.error('Exception getCurrentProfile:', error);
    cachedProfile = null;
    return null;
  }
};

// Fonctions admin restaurées
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const profile = await getCurrentProfile();
    return profile?.roles?.includes('admin') || false;
  } catch (error) {
    console.error('Erreur isCurrentUserAdmin:', error);
    return false;
  }
};

export const getAdminStats = async () => {
  try {
    const results = await Promise.allSettled([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('services').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('orders').select('total_amount').eq('status', 'completed'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('badges_catalog').select('value, is_active, is_visible'),
    ]);

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
    console.error('Exception getAdminStats:', error);
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

// Gestion d'erreurs complète restaurée
export const handleSupabaseError = (error: any, context?: string) => {
  const errorMessage = error?.message || 'Erreur inconnue';
  const errorCode = error?.code || 'UNKNOWN';
  
  console.error(`Erreur Supabase${context ? ` (${context})` : ''}:`, {
    code: errorCode,
    message: errorMessage,
    details: error?.details,
    hint: error?.hint,
    timestamp: new Date().toISOString(),
  });

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

// Test de connectivité restauré
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
      console.error('Supabase inaccessible:', error);
      return false;
    }
    
    if (IS_DEV) {
      console.log('Connexion Supabase OK');
    }
    
    return true;
  } catch (error) {
    console.error('Test connexion Supabase échoué:', error);
    return false;
  }
};

// Listener d'auth restauré
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  try {
    if (!supabase?.auth?.onAuthStateChange) {
      console.error('supabase.auth.onAuthStateChange non disponible');
      return null;
    }

    const { data: { subscription }, error } = supabase.auth.onAuthStateChange((event, session) => {
      if (IS_DEV) {
        console.log('Auth state changed:', event, session?.user?.email || 'No user');
      }
      
      cachedUser = session?.user || null;
      cachedProfile = null;
      userCacheTime = Date.now();
      profileCacheTime = 0;
      
      callback(session?.user || null);
    });

    if (error) {
      console.error('Erreur onAuthStateChange:', error);
      return null;
    }

    console.log('Auth listener configuré');
    return subscription;
  } catch (error) {
    console.error('Exception onAuthStateChange:', error);
    return null;
  }
};

export const clearAllCaches = () => {
  cachedUser = null;
  cachedProfile = null;
  userCacheTime = 0;
  profileCacheTime = 0;
  if (IS_DEV) {
    console.log('Caches Supabase vidés');
  }
};

// Upload restauré
export const uploadFile = async (
  bucket: string, 
  path: string, 
  file: File | Blob, 
  options: { cacheControl?: string; upsert?: boolean } = {}
) => {
  try {
    console.log(`Upload vers ${bucket}/${path}...`);
    
    const uploadOptions = {
      cacheControl: '3600',
      upsert: true,
      ...options
    };
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, uploadOptions);
    
    if (error) {
      console.error('Erreur upload:', error);
      throw error;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    console.log('Upload réussi:', publicUrl);
    
    return { 
      data, 
      publicUrl,
      path: data?.path || path
    };
    
  } catch (error) {
    console.error('Erreur uploadFile:', error);
    const { userMessage } = handleSupabaseError(error, 'Upload fichier');
    throw new Error(userMessage);
  }
};

// Test final restauré
if (IS_DEV) {
  setTimeout(() => {
    checkSupabaseConnection(3000).then(isConnected => {
      if (isConnected) {
        console.log('Supabase complètement prêt !');
      } else {
        console.warn('Problème de connexion Supabase détecté');
      }
    }).catch(error => {
      console.warn('Timeout connexion Supabase:', error);
    });
  }, 1000);
}

// Exports
export { supabase as default };

console.log('Configuration Supabase terminée avec succès');
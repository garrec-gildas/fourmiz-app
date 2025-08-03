import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Récupérer les variables d'environnement
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Valider les variables d'environnement
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY doivent être définies dans le fichier .env'
  );
}

// Initialiser le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // Stockage des sessions avec AsyncStorage pour React Native
    autoRefreshToken: true, // Rafraîchissement automatique des tokens
    persistSession: true, // Persistance des sessions
    detectSessionInUrl: false, // Désactivé pour React Native (pas de redirection URL)
  },
});

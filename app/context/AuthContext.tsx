import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: any | null;
  profile: any | null;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.id);
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserAndProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('👤 Utilisateur trouvé:', session.user.id);
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        console.log('❌ Aucun utilisateur connecté');
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('🚨 Erreur chargement auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      console.log('🔍 Récupération profil pour:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('🚨 Erreur profil:', error);
        return;
      }

      console.log('✅ Profil récupéré:', data);
      setProfile(data);
      
    } catch (error) {
      console.error('🚨 Erreur fetchProfile:', error);
    }
  };

  // Calculer isAdmin depuis les rôles du profil
  const isAdmin = React.useMemo(() => {
    if (!profile?.roles || !Array.isArray(profile.roles)) {
      console.log('❓ Pas de rôles dans le profil:', profile);
      return false;
    }
    
    const adminStatus = profile.roles.includes('admin');
    console.log('👑 Statut admin calculé:', adminStatus, 'depuis rôles:', profile.roles);
    return adminStatus;
  }, [profile]);

  const value = {
    user,
    profile,
    isAdmin,
    loading,
  };

  console.log('🔄 AuthContext value:', { 
    hasUser: !!user, 
    hasProfile: !!profile, 
    roles: profile?.roles,
    isAdmin, 
    loading 
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// ✅ Export par défaut pour satisfaire Expo Router
export default AuthProvider;
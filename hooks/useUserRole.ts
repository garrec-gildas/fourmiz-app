// hooks/useUserRole.ts - VERSION CORRIGÉE POUR ÉVITER LES CHANGEMENTS CONSTANTS
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  id: string;
  email: string;
  roles?: string[];
  firstname?: string;
  lastname?: string;
  profile_completed?: boolean;
}

interface UseUserRoleReturn {
  currentRole: string | null;
  loading: boolean;
  profile: UserProfile | null;
  user: any;
  error: string | null;
  switchRole: (newRole: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const STORAGE_KEY = 'fourmiz_user_role';

export function useUserRole(): UseUserRoleReturn {
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ REFS POUR ÉVITER LES BOUCLES INFINIES
  const mounted = useRef(true);
  const initStarted = useRef(false);
  const lastProfileUpdate = useRef<number>(0);

  // ✅ MAPPING DES RÔLES STABLE
  const mapUserRoles = useMemo(() => {
    return (userRoles: string[]): string[] => {
      if (!userRoles || userRoles.length === 0) return ['client'];
      
      // Si admin, retourner tous les rôles
      if (userRoles.includes('admin')) {
        return ['admin', 'client', 'fourmiz'];
      }
      
      // Sinon, retourner les rôles utilisateur + client par défaut
      const roles = [...userRoles];
      if (!roles.includes('client')) {
        roles.push('client');
      }
      
      return roles;
    };
  }, []);

  // ✅ CHARGEMENT DU PROFIL UTILISATEUR
  const loadUserProfile = useMemo(() => {
    return async (userId: string): Promise<UserProfile | null> => {
      try {
        console.log('👤 Chargement profil utilisateur:', userId);
        
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('👤 Profil non trouvé, création en cours...');
            return null;
          }
          throw error;
        }

        if (profileData) {
          console.log('✅ Profil chargé:', {
            email: profileData.email,
            roles: profileData.roles,
            completed: profileData.profile_completed
          });
          
          return {
            id: profileData.id,
            email: profileData.email,
            roles: profileData.roles || ['user'],
            firstname: profileData.firstname,
            lastname: profileData.lastname,
            profile_completed: profileData.profile_completed
          };
        }

        return null;
      } catch (error) {
        console.error('❌ Erreur chargement profil:', error);
        throw error;
      }
    };
  }, []);

  // ✅ DÉTERMINATION DU RÔLE ACTUEL
  const determineCurrentRole = useMemo(() => {
    return async (availableRoles: string[]): Promise<string> => {
      try {
        // Charger le rôle sauvegardé
        const savedRole = await AsyncStorage.getItem(STORAGE_KEY);
        
        if (savedRole && availableRoles.includes(savedRole)) {
          console.log('🔄 Rôle sauvegardé trouvé:', savedRole);
          return savedRole;
        }
        
        // Priorité des rôles par défaut
        if (availableRoles.includes('admin')) return 'admin';
        if (availableRoles.includes('fourmiz')) return 'fourmiz';
        return 'client';
        
      } catch (error) {
        console.error('❌ Erreur détermination rôle:', error);
        return 'client';
      }
    };
  }, []);

  // ✅ INITIALISATION UNIQUE
  useEffect(() => {
    if (initStarted.current) return;
    
    initStarted.current = true;
    
    const initializeUserRole = async () => {
      try {
        if (!mounted.current) return;
        
        console.log('🔄 Initialisation useUserRole...');
        setLoading(true);
        setError(null);

        // Récupérer l'utilisateur actuel
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !currentUser) {
          console.log('👤 Aucun utilisateur connecté');
          if (mounted.current) {
            setUser(null);
            setProfile(null);
            setCurrentRole(null);
            setLoading(false);
          }
          return;
        }

        if (mounted.current) {
          setUser(currentUser);
        }

        // Charger le profil
        const userProfile = await loadUserProfile(currentUser.id);
        
        if (!mounted.current) return;

        if (userProfile) {
          setProfile(userProfile);
          
          // Mapper les rôles
          const mappedRoles = mapUserRoles(userProfile.roles || ['user']);
          console.log('🔄 Rôles mappés:', mappedRoles);
          
          // Déterminer le rôle actuel
          const role = await determineCurrentRole(mappedRoles);
          console.log('🎯 Rôle actuel déterminé:', role);
          
          setCurrentRole(role);
          lastProfileUpdate.current = Date.now();
        } else {
          setProfile(null);
          setCurrentRole('client');
        }

      } catch (error: any) {
        console.error('❌ Erreur initialisation useUserRole:', error);
        if (mounted.current) {
          setError(error.message || 'Erreur de chargement du profil');
          setCurrentRole('client');
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    };

    initializeUserRole();

    // ✅ LISTENER D'AUTHENTIFICATION
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted.current) return;
      
      console.log('🔔 Auth change dans useUserRole:', event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setCurrentRole(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Éviter les rechargements trop fréquents
        const now = Date.now();
        if (now - lastProfileUpdate.current < 5000) {
          console.log('⏭️ Rechargement trop récent, ignoré');
          return;
        }
        
        setLoading(true);
        try {
          const userProfile = await loadUserProfile(session.user.id);
          if (mounted.current && userProfile) {
            setUser(session.user);
            setProfile(userProfile);
            
            const mappedRoles = mapUserRoles(userProfile.roles || ['user']);
            const role = await determineCurrentRole(mappedRoles);
            
            setCurrentRole(role);
            lastProfileUpdate.current = now;
          }
        } catch (error) {
          console.error('❌ Erreur rechargement profil:', error);
        } finally {
          if (mounted.current) {
            setLoading(false);
          }
        }
      }
    });

    // ✅ CLEANUP
    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile, mapUserRoles, determineCurrentRole]);

  // ✅ CHANGEMENT DE RÔLE
  const switchRole = useMemo(() => {
    return async (newRole: string): Promise<void> => {
      try {
        if (!profile?.roles?.includes(newRole)) {
          throw new Error('Rôle non autorisé');
        }
        
        await AsyncStorage.setItem(STORAGE_KEY, newRole);
        setCurrentRole(newRole);
        
        console.log('✅ Rôle changé vers:', newRole);
      } catch (error) {
        console.error('❌ Erreur changement de rôle:', error);
        throw error;
      }
    };
  }, [profile]);

  // ✅ RAFRAÎCHISSEMENT DU PROFIL
  const refreshProfile = useMemo(() => {
    return async (): Promise<void> => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const userProfile = await loadUserProfile(user.id);
        
        if (mounted.current && userProfile) {
          setProfile(userProfile);
          lastProfileUpdate.current = Date.now();
        }
      } catch (error) {
        console.error('❌ Erreur rafraîchissement profil:', error);
        setError('Erreur de rafraîchissement');
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    };
  }, [user, loadUserProfile]);

  // ✅ CLEANUP AU DÉMONTAGE
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  return {
    currentRole,
    loading,
    profile,
    user,
    error,
    switchRole,
    refreshProfile
  };
}

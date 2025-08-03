// hooks/useRoleAccess.ts - HOOK GÉNÉRIQUE POUR CONTRÔLE D'ACCÈS
// 🔒 Version sans JSX - Compatible avec extension .ts
// ✅ Retourne les données, les composants sont créés côté utilisateur

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRoleManager, AppRole } from '@/lib/roleManager';

// Interface pour les informations de rôle
interface RoleInfo {
  title: string;
  description: string;
  icon: string;
  switchText: string;
  becomeText: string;
  completeProfileRoute: string;
  buttonColor: string;
}

// Hook pour authentification sécurisée
const useSecureAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      setUser(user);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profileError && profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('❌ Erreur chargement utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  return { user, profile, loading, refetch: loadUserData };
};

// Hook principal pour contrôle d'accès par rôle
export const useRoleAccess = (requiredRole: AppRole) => {
  const { user, profile, loading: authLoading } = useSecureAuth();
  const { currentRole, canSwitchRole, availableRoles, canRequestOtherRole } = useRoleManager(profile);

  // 🛡️ CORRECTION : Vérifier si l'utilisateur a accès avec protection .includes()
  const hasAccess = Boolean(user && profile && (
    currentRole === requiredRole || 
    (Array.isArray(availableRoles) && availableRoles.includes(requiredRole))  // ← PROTÉGÉ !
  ));

  // Fonction pour obtenir les infos du rôle
  const getRoleInfo = (): RoleInfo => {
    switch (requiredRole) {
      case 'fourmiz':
        return {
          title: 'Accès restreint aux Fourmiz',
          description: canSwitchRole 
            ? 'Cette section est réservée aux Fourmiz. Basculez en mode Fourmiz pour accéder à cette fonctionnalité.'
            : canRequestOtherRole === 'fourmiz'
              ? 'Cette section est réservée aux Fourmiz. Complétez votre profil pour devenir Fourmiz.'
              : 'Cette section est réservée aux Fourmiz.',
          icon: 'construct-outline',
          switchText: 'Mode Fourmiz',
          becomeText: 'Devenir Fourmiz',
          completeProfileRoute: '/auth/complete-profile-fourmiz',
          buttonColor: '#FF4444'
        };
      case 'client':
        return {
          title: 'Accès restreint aux Clients',
          description: canSwitchRole
            ? 'Cette section est réservée aux Clients. Basculez en mode Client pour accéder à cette fonctionnalité.'
            : canRequestOtherRole === 'client'
              ? 'Cette section est réservée aux Clients. Complétez votre profil pour devenir Client.'
              : 'Cette section est réservée aux Clients.',
          icon: 'person-outline',
          switchText: 'Mode Client',
          becomeText: 'Devenir Client',
          completeProfileRoute: '/auth/complete-profile',
          buttonColor: '#2196F3'
        };
    }
  };

  // Données pour les avantages du rôle
  const getBenefits = () => {
    if (requiredRole === 'fourmiz') {
      return [
        '🔧 Accepter des missions rémunérées',
        '💰 Revenus flexibles selon votre planning',
        '⭐ Développer votre réputation',
        '🎁 Bonus et récompenses fidélité'
      ];
    } else {
      return [
        '🛍️ Créer des demandes de services',
        '⚡ Accès instantané aux Fourmiz',
        '🔒 Paiements sécurisés',
        '🎁 Points fidélité et cashbacks'
      ];
    }
  };

  return {
    // États
    user,
    profile,
    currentRole,
    hasAccess,
    authLoading,
    canSwitchRole,
    canRequestOtherRole,
    availableRoles: Array.isArray(availableRoles) ? availableRoles : [], // 🛡️ PROTECTION SUPPLÉMENTAIRE
    
    // Données pour l'interface
    roleInfo: getRoleInfo(),
    benefits: getBenefits(),
    requiredRole,
    
    // Messages
    loadingMessage: 'Vérification des permissions...',
    benefitsTitle: requiredRole === 'fourmiz' ? 'Pourquoi devenir Fourmiz ?' : 'Pourquoi être Client ?',
  };
};

export default useRoleAccess;
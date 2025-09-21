// app/_layout.tsx - VERSION AVEC REDIRECTION INTELLIGENTE PAR RÔLE + CORRECTION DÉCONNEXION + STRIPE CORRIGÉ
// MODIFICATION : Permettre l'accès aux références pour les clients + FOURMIZ NAVIGATION LIBRE
// 🔧 CORRIGÉ : Utilise useRoleManagerAdapter au lieu du système local de gestion des rôles
// import '@/lib/debugUtils';
// import '@/lib/polyfills'; 
import { Slot, router, useSegments, useRootNavigationState } from 'expo-router';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { ChatNotificationProvider } from '@/components/ChatNotificationProvider';
import { InAppNotification } from '@/components/InAppNotification';
import UltraSafeAreaWrapper from '@/components/SafeAreaWrapper';

// STRIPE IMPORTS AJOUTÉS - CORRIGÉ
import { StripeProvider } from '@stripe/stripe-react-native';

// 🔧 NOUVEAU : Import du useRoleManagerAdapter corrigé
import { useRoleManagerAdapter } from '@/hooks/useRoleManagerAdapter';

// LOGS DEBUG STRIPE
console.log('=== STRIPE DEBUG ===');
console.log('STRIPE_PUBLISHABLE_KEY:', process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);
console.log('Environment:', __DEV__ ? 'development' : 'production');
console.log('===================');

import { 
  initializeNotifications, 
  cleanupNotifications,
  notificationService 
} from '@/lib/notifications';

import { supabase } from '@/lib/supabase';

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Inter: require('@expo-google-fonts/inter/Inter_400Regular.ttf'),
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); 
  const [showAuthPageTime, setShowAuthPageTime] = useState<number | null>(null);
  
  // 🔧 SUPPRIMÉ : États locaux pour la gestion des rôles (remplacés par useRoleManagerAdapter)
  // const [userRole, setUserRole] = useState<string | null>(null);
  // const [roleLoading, setRoleLoading] = useState(false);
  // const [roleManagerData, setRoleManagerData] = useState<any>(null);
  
  // 🔧 NOUVEAU : Utilisation du useRoleManagerAdapter corrigé
  const { 
    currentRole, 
    isLoading: roleLoading,
    criteriaCompleted,
    isFourmiz,
    isClient 
  } = useRoleManagerAdapter();
  
  // REFS DE SÉCURITÉ
  const mounted = useRef(false);
  const authSubscription = useRef<{ unsubscribe: () => void } | null>(null);
  const timeouts = useRef<Set<NodeJS.Timeout>>(new Set());
  const redirectionDone = useRef(false);
  const initStarted = useRef(false);
  // NOUVEAU : Ref pour gérer la déconnexion
  const isLoggingOut = useRef(false);
  
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  // HELPER TIMEOUT SÉCURISÉ
  const safeTimeout = useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      if (mounted.current) {
        timeouts.current.delete(timeout);
        callback();
      }
    }, delay);
    timeouts.current.add(timeout);
    return timeout;
  }, []);

  // 🔧 SUPPRIMÉ : fonction getUserRole locale (remplacée par useRoleManagerAdapter)

  // 🔧 MODIFIÉ : Déterminer la route selon le rôle (utilise currentRole du hook)
  const getTargetRouteByRole = useCallback((role: string | null): string => {
    console.log('getTargetRouteByRole appelé avec rôle:', role);
    
    switch (role) {
      case 'fourmiz':
      case 'admin':
        console.log('Redirection FOURMIZ/ADMIN → Accueil');
        return '/(tabs)'; // Accueil pour Fourmiz/Admin
        
      case 'client':
        console.log('Redirection CLIENT → Services');
        return '/(tabs)/services'; // Services pour Client
        
      default:
        console.log('Rôle non défini, redirection CLIENT par défaut → Services');
        return '/(tabs)/services'; // Services par défaut pour tous les autres cas
    }
  }, []);

  // 🔧 MODIFIÉ : Reset complet de l'état lors de la déconnexion (supprime les états de rôle locaux)
  const resetAuthState = useCallback(() => {
    console.log('Reset complet de l\'état auth...');
    setCurrentUser(null);
    // 🔧 SUPPRIMÉ : setUserRole(null); (géré par useRoleManagerAdapter)
    // 🔧 SUPPRIMÉ : setRoleLoading(false); (géré par useRoleManagerAdapter)
    // 🔧 SUPPRIMÉ : setRoleManagerData(null); (géré par useRoleManagerAdapter)
    redirectionDone.current = false;
    setIsInitialLoad(true);
    setShowAuthPageTime(null);
    isLoggingOut.current = false;
  }, []);

  // MONTAGE SÉCURISÉ AVEC LOGS DÉTAILLÉS
  useEffect(() => {
    console.log('Layout principal - Début du montage...');
    mounted.current = true;
    
    const readyTimeout = safeTimeout(() => {
      if (mounted.current) {
        console.log('Layout principal prêt');
        setIsReady(true);
      }
    }, 300);

    return () => {
      console.log('Layout principal - Début du démontage...');
      mounted.current = false;
      
      // NETTOYAGE COMPLET DES TIMEOUTS
      timeouts.current.forEach(t => clearTimeout(t));
      timeouts.current.clear();
      
      // NETTOYAGE SÉCURISÉ DE LA SUBSCRIPTION
      if (authSubscription.current) {
        try {
          console.log('Nettoyage subscription auth...');
          authSubscription.current.unsubscribe();
        } catch (error) {
          console.warn('Erreur unsubscribe:', error);
        } finally {
          authSubscription.current = null;
        }
      }
      
      console.log('Layout principal - Démontage terminé');
    };
  }, [safeTimeout]);

  // HELPER AUTH ULTRA-SÉCURISÉ AVEC LOGS DÉTAILLÉS
  const getCurrentUser = useCallback(async () => {
    if (!mounted.current) {
      console.log('getCurrentUser: composant non monté');
      return null;
    }

    try {
      // VÉRIFICATION COMPLÈTE DE SUPABASE
      if (!supabase) {
        console.error('Supabase non initialisé');
        return null;
      }

      if (!supabase.auth) {
        console.error('Supabase.auth non disponible');
        return null;
      }

      if (typeof supabase.auth.getUser !== 'function') {
        console.error('supabase.auth.getUser n\'est pas une fonction');
        return null;
      }

      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        if (error.message?.includes('Invalid Refresh Token')) {
          console.log('Token invalide, nettoyage...');
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.warn('Erreur signOut:', signOutError);
          }
          return null;
        }
        
        if (error.message?.includes('Auth session missing')) {
          console.log('Aucune session active');
          return null;
        }
        
        console.error('Erreur auth:', error.message);
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('Exception getCurrentUser:', error);
      return null;
    }
  }, []);

  // 🔧 MODIFIÉ : INITIALISATION AUTH ULTRA-SÉCURISÉE (supprime la gestion locale des rôles)
  useEffect(() => {
    if (!isReady || initStarted.current) return;

    console.log('Configuration de l\'authentification...');
    initStarted.current = true;
    
    const initAuth = async () => {
      try {
        if (!mounted.current) return;

        console.log('Récupération utilisateur initial...');
        const user = await getCurrentUser();
        
        if (mounted.current) {
          console.log('Utilisateur initial:', user ? `Connecté (${user.id})` : 'Non connecté');
          setCurrentUser(user);
          
          // 🔧 SUPPRIMÉ : Récupération locale du rôle (géré par useRoleManagerAdapter)
          
          if (user) {
            await initializeNotificationsSafely(user.id);
          }
          
          setAuthLoading(false);
        }
      } catch (error) {
        console.error('Erreur init auth:', error);
        if (mounted.current) {
          setAuthLoading(false);
        }
      }
    };

    const setupAuthListener = () => {
      if (!mounted.current) return;

      try {
        // VÉRIFICATIONS COMPLÈTES AVANT SETUP
        if (!supabase) {
          console.error('Supabase non disponible pour listener');
          return;
        }

        if (!supabase.auth) {
          console.error('Supabase.auth non disponible pour listener');
          return;
        }

        if (typeof supabase.auth.onAuthStateChange !== 'function') {
          console.error('onAuthStateChange n\'est pas une fonction');
          return;
        }

        // NETTOYAGE DE L'ANCIENNE SUBSCRIPTION
        if (authSubscription.current) {
          try {
            authSubscription.current.unsubscribe();
          } catch (error) {
            console.warn('Erreur nettoyage ancienne subscription:', error);
          }
          authSubscription.current = null;
        }

        // 🔧 MODIFIÉ : CRÉATION SÉCURISÉE DE LA NOUVELLE SUBSCRIPTION (supprime la gestion locale des rôles)
        const authResponse = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted.current) {
            console.log('Auth change ignoré - composant démonté');
            return;
          }
          
          console.log('Auth state changed:', event, session?.user?.id || 'null');
          
          const user = session?.user || null;
          
          if (event === 'SIGNED_OUT') {
            console.log('DÉCONNEXION DÉTECTÉE - Nettoyage complet...');
            isLoggingOut.current = true;
            
            // RESET IMMÉDIAT DE L'ÉTAT
            resetAuthState();
            await cleanupNotificationsSafely();
            
            // REDIRECTION ULTRA-AGRESSIVE IMMÉDIATE
            console.log('DÉCONNEXION - Redirection ULTRA-IMMÉDIATE vers login...');
            
            // Triple tentative de redirection pour être sûr
            const forceRedirect = async () => {
              try {
                if (mounted.current && router) {
                  console.log('Navigation FORCÉE vers login après déconnexion');
                  await router.replace('/auth/login');
                  
                  // Vérifier après 50ms si on est bien sur login
                  setTimeout(() => {
                    if (mounted.current) {
                      console.log('Vérification post-redirection...');
                      // Si pas sur login, forcer encore
                      if (window.location?.pathname !== '/auth/login') {
                        console.log('Redirection supplémentaire nécessaire');
                        router.replace('/auth/login');
                      }
                    }
                  }, 50);
                }
              } catch (error) {
                console.error('Erreur redirection ultra-agressive:', error);
              }
            };
            
            // Exécuter immédiatement
            forceRedirect();
            
            // Backup après 25ms
            setTimeout(forceRedirect, 25);
            
          } else if (event === 'SIGNED_IN' && user && mounted.current) {
            console.log('Connexion réussie, vérification session...');
            isLoggingOut.current = false;
            redirectionDone.current = false;
            setCurrentUser(user);
            setShowAuthPageTime(Date.now());
            
            // 🔧 SUPPRIMÉ : Récupération locale du rôle (géré par useRoleManagerAdapter)
            
            await initializeNotificationsSafely(user.id);
          } else if (event === 'TOKEN_REFRESHED' && mounted.current) {
            console.log('Token rafraîchi');
            // Ne pas changer l'état utilisateur lors du refresh de token
            if (session?.user && !currentUser) {
              setCurrentUser(session.user);
            }
          }
        });

        // VÉRIFICATION QUE LA RESPONSE CONTIENT BIEN data.subscription
        if (authResponse && authResponse.data && authResponse.data.subscription) {
          authSubscription.current = authResponse.data.subscription;
          console.log('Auth listener configuré avec succès');
        } else {
          console.error('Subscription non trouvée dans la réponse:', authResponse);
        }

      } catch (error) {
        console.error('Erreur setup listener:', error);
      }
    };

    initAuth();
    setupAuthListener();

  }, [isReady, getCurrentUser, resetAuthState, safeTimeout]); // 🔧 SUPPRIMÉ : getUserRole

  // NAVIGATION SÉCURISÉE
  const performSafeNavigation = useCallback(async (route: string): Promise<boolean> => {
    if (!mounted.current || !router) {
      return false;
    }

    try {
      console.log(`Navigation vers: ${route}`);
      router.replace(route as any);
      return true;
    } catch (error) {
      console.error(`Exception navigation vers ${route}:`, error);
      return false;
    }
  }, []);

  // 🔧 MODIFIÉ : REDIRECTION INTELLIGENTE PAR RÔLE (utilise currentRole du hook)
  useEffect(() => {
    if (authLoading || redirectionDone.current || !mounted.current || isLoggingOut.current) {
      return;
    }

    // Attendre que le rôle soit chargé pour les utilisateurs connectés
    if (currentUser && roleLoading) {
      console.log('Attente du chargement du rôle...');
      return; // On reviendra ici quand roleLoading sera false
    }

    console.log('Évaluation redirection...');
    console.log('Segments:', segments);
    console.log('Utilisateur:', currentUser ? 'Connecté' : 'Non connecté');
    console.log('Rôle (useRoleManagerAdapter):', currentRole || 'NON DÉFINI'); // 🔧 MODIFIÉ
    console.log('Premier chargement:', isInitialLoad);
    console.log('Temps affichage auth:', showAuthPageTime);

    const inAuth = segments[0] === '(auth)';
    const inTabs = segments[0] === '(tabs)';
    const inAdmin = segments[0] === 'admin';
    const isRoot = segments.length === 0;
    const isNotFound = segments[0] === '+not-found';

    // Calculer le délai d'affichage de la page d'auth
    const AUTH_DISPLAY_DURATION = 2000; // 2 secondes pour voir la page d'auth
    const now = Date.now();
    const authPageShownTime = showAuthPageTime ? (now - showAuthPageTime) : 0;
    const shouldWaitForAuthDisplay = showAuthPageTime && authPageShownTime < AUTH_DISPLAY_DURATION;

    const redirectTimeout = safeTimeout(async () => {
      if (!mounted.current || redirectionDone.current || isLoggingOut.current) return;

      try {
        let needsRedirect = false;
        let targetRoute = '';
        let delayRedirect = 0;

        // NOUVEAU : Priorité absolue pour "+not-found" sans utilisateur
        if (!currentUser && isNotFound) {
          console.log('PRIORITÉ ABSOLUE - Page +not-found sans connexion → redirection immédiate');
          const success = await performSafeNavigation('/auth/login');
          if (success) {
            redirectionDone.current = true;
            console.log('Redirection immédiate depuis +not-found terminée');
          }
          return;
        }

        if (currentUser) {
          // UTILISATEUR CONNECTÉ - Redirection intelligente par rôle
          console.log('UTILISATEUR CONNECTÉ - Analyse redirection...');
          console.log('Rôle utilisateur actuel (useRoleManagerAdapter):', currentRole); // 🔧 MODIFIÉ
          console.log('Segments actuels:', segments);
          console.log('showAuthPageTime:', showAuthPageTime);
          
          // VÉRIFIER SI CONNEXION RÉCENTE (moins de 5 secondes)
          const now = Date.now();
          const isRecentConnection = showAuthPageTime && (now - showAuthPageTime) < 5000;
          console.log('Connexion récente:', isRecentConnection, '(moins de 5s)');
          
          if (inAuth) {
            // CONNEXION EN COURS - Redirection après délai d'affichage
            if (shouldWaitForAuthDisplay) {
              const remainingTime = AUTH_DISPLAY_DURATION - authPageShownTime;
              console.log(`Attente ${remainingTime}ms avant redirection depuis auth...`);
              delayRedirect = remainingTime;
            }
            
            needsRedirect = true;
            targetRoute = getTargetRouteByRole(currentRole); // 🔧 MODIFIÉ
            console.log('APRÈS CONNEXION - Redirection depuis auth selon rôle vers:', targetRoute);
          }
          else if (isNotFound) {
            needsRedirect = true;
            targetRoute = getTargetRouteByRole(currentRole); // 🔧 MODIFIÉ
            console.log('Redirection depuis 404 selon rôle vers:', targetRoute);
          }
          else if (isRoot && isInitialLoad) {
            // PREMIER CHARGEMENT - Redirection selon rôle
            needsRedirect = true;
            targetRoute = getTargetRouteByRole(currentRole); // 🔧 MODIFIÉ
            setIsInitialLoad(false);
            console.log('PREMIER CHARGEMENT - Redirection selon rôle vers:', targetRoute);
          }
          else if (isRoot && isRecentConnection) {
            // NOUVEAU : Connexion récente à la racine → redirection forcée selon rôle
            needsRedirect = true;
            targetRoute = getTargetRouteByRole(currentRole); // 🔧 MODIFIÉ
            console.log('CONNEXION RÉCENTE À LA RACINE - Redirection forcée vers:', targetRoute);
          }
          else if (inTabs && isRecentConnection) {
            // 🔧 MODIFICATION : Vérifier si c'est une route autorisée pour fourmiz/admin AVANT de rediriger
            if ((currentRole === 'fourmiz' || currentRole === 'admin') && segments.length > 1) { // 🔧 MODIFIÉ
              const allowedRoutes = ['profile', 'criteria', 'messages', 'map', 'calendar', 'available-orders'];
              const currentRoute = segments[1];
              
              if (allowedRoutes.includes(currentRoute)) {
                console.log('CONNEXION RÉCENTE mais route autorisée pour fourmiz/admin:', currentRoute);
                // Ne pas rediriger - laisser l'utilisateur sur la page
              } else {
                // Route non autorisée - rediriger
                needsRedirect = true;
                targetRoute = getTargetRouteByRole(currentRole); // 🔧 MODIFIÉ
                console.log('CONNEXION RÉCENTE - Redirection forcée vers:', targetRoute);
              }
            } else {
              // Client ou autre cas - redirection normale
              needsRedirect = true;
              targetRoute = getTargetRouteByRole(currentRole); // 🔧 MODIFIÉ
              console.log('CONNEXION RÉCENTE - Redirection forcée vers:', targetRoute);
            }
          }
          else if (inTabs && currentRole === 'client' && !segments.includes('services') && !segments.includes('references')) { // 🔧 MODIFIÉ
            // MODIFICATION : Client dans les tabs mais pas sur Services ET pas sur Références → rediriger vers Services
            needsRedirect = true;
            targetRoute = '/(tabs)/services';
            console.log('CLIENT dans tabs mais pas sur Services/Références - redirection vers Services');
          }
          else if (inTabs && (currentRole === 'fourmiz' || currentRole === 'admin') && segments.length > 1) { // 🔧 MODIFIÉ
            // 🔧 NOUVEAU : Permettre l'accès au profil et aux critères pour les Fourmiz
            const allowedRoutes = ['profile', 'criteria', 'messages', 'map', 'calendar', 'available-orders'];
            const currentRoute = segments[1]; // Exemple: /(tabs)/profile → segments[1] = 'profile'
            
            if (!allowedRoutes.includes(currentRoute)) {
              // FOURMIZ/ADMIN dans tabs sur une route non autorisée → rediriger vers accueil
              needsRedirect = true;
              targetRoute = '/(tabs)';
              console.log('FOURMIZ/ADMIN sur route non autorisée - redirection vers accueil');
            } else {
              // Route autorisée - laisser passer
              console.log('FOURMIZ/ADMIN sur route autorisée:', currentRoute);
            }
          }
          else if (inTabs) {
            // DÉJÀ DANS LES TABS (connexion ancienne) - Laisser l'utilisateur où il est
            console.log('Utilisateur déjà dans les tabs (connexion ancienne) - pas de redirection forcée');
          }
        } else {
          // UTILISATEUR NON CONNECTÉ - Redirection vers login
          console.log('UTILISATEUR NON CONNECTÉ - Redirection vers login...');
          
          // NOUVEAU : Traitement prioritaire de "+not-found" pour utilisateurs non connectés
          if (isNotFound) {
            needsRedirect = true;
            targetRoute = '/auth/login';
            console.log('Page +not-found sans connexion - redirection immédiate vers login...');
          }
          else if (inTabs || inAdmin) {
            needsRedirect = true;
            targetRoute = '/auth/login';
            console.log('Accès pages protégées refusé - redirection vers login...');
          }
          else if (isRoot && isInitialLoad) {
            needsRedirect = true;
            targetRoute = '/auth/login';
            setIsInitialLoad(false);
            console.log('Premier chargement sans connexion - redirection vers login...');
          }
          else if (!inAuth) {
            needsRedirect = true;
            targetRoute = '/auth/login';
            console.log('Utilisateur non connecté hors auth - redirection vers login...');
          }
        }

        if (needsRedirect && targetRoute) {
          console.log(`Redirection programmée: ${targetRoute} (Rôle: ${currentRole})`); // 🔧 MODIFIÉ
          
          // APPLIQUER LE DÉLAI SI NÉCESSAIRE
          const executeRedirect = async () => {
            if (isLoggingOut.current) {
              console.log('Redirection annulée - déconnexion en cours');
              return;
            }
            
            const success = await performSafeNavigation(targetRoute);
            if (success || !mounted.current) {
              redirectionDone.current = true;
              setIsInitialLoad(false);
              console.log('Redirection terminée vers:', targetRoute);
            }
          };

          if (delayRedirect > 0) {
            console.log(`Délai de ${delayRedirect}ms avant redirection...`);
            safeTimeout(executeRedirect, delayRedirect);
          } else {
            await executeRedirect();
          }
        } else {
          redirectionDone.current = true;
          console.log('Pas de redirection nécessaire - Affichage de la page actuelle');
        }
      } catch (error) {
        console.error('Erreur redirection:', error);
        redirectionDone.current = true;
      }
    }, 200);

    return () => {
      timeouts.current.delete(redirectTimeout);
      clearTimeout(redirectTimeout);
    };

  }, [currentUser, currentRole, roleLoading, segments, authLoading, isInitialLoad, showAuthPageTime, performSafeNavigation, safeTimeout, getTargetRouteByRole]); // 🔧 MODIFIÉ : userRole → currentRole

  // 🔧 MODIFIÉ : EFFET POUR RELANCER LA REDIRECTION QUAND LE RÔLE EST CHARGÉ
  useEffect(() => {
    if (currentUser && currentRole && !roleLoading && !isLoggingOut.current) { // 🔧 MODIFIÉ
      redirectionDone.current = false; // Permettre une nouvelle redirection
      console.log('Rôle chargé - relance possible de la logique de redirection');
    }
  }, [currentRole, roleLoading]); // 🔧 MODIFIÉ

  // FONCTIONS DE NOTIFICATIONS COMPLÈTES RESTAURÉES
  const initializeNotificationsSafely = async (userId: string) => {
    if (!mounted.current) {
      console.log('Initialisation notifications abandonnée - composant démonté');
      return;
    }
    
    try {
      console.log('Initialisation sécurisée des notifications pour:', userId);
      
      // Utiliser le nouveau service unifié
      const success = await initializeNotifications(userId);
      
      if (success) {
        console.log('Notifications initialisées avec succès');
        
        // Afficher le status du service
        if (__DEV__) {
          const status = notificationService.getStatus();
          console.log('Status notifications:', status);
        }
        
        // Test automatique SANS la notification problématique
        // Cette version ne déclenche PAS la notification "Test Fourmiz"
        if (__DEV__) {
          setTimeout(() => {
            if (mounted.current) {
              // Version silencieuse pour vérifier que le service fonctionne
              const status = notificationService.getStatus();
              if (status.isInitialized) {
                console.log('Service de notifications opérationnel');
              } else {
                console.log('Service de notifications non opérationnel');
              }
            }
          }, 3000);
        }
      } else {
        console.log('Échec initialisation notifications');
        
        // Retry automatique après délai
        setTimeout(() => {
          if (mounted.current) {
            console.log('Tentative de réinitialisation des notifications...');
            initializeNotificationsSafely(userId);
          }
        }, 5000); // Retry après 5 secondes
      }
    } catch (error) {
      console.error('Erreur initialisation notifications:', error);
      
      // Diagnostic en cas d'erreur
      if (error.message?.includes('profiles')) {
        console.log('Conseil: Le profil utilisateur semble manquant');
        console.log('Utilisez le hook useAuth corrigé pour créer le profil automatiquement');
      }
    }
  };

  const cleanupNotificationsSafely = async () => {
    try {
      console.log('Nettoyage sécurisé des notifications...');
      
      // Utiliser le nouveau service unifié
      cleanupNotifications();
      
      console.log('Notifications nettoyées');
    } catch (error) {
      console.error('Erreur cleanup notifications:', error);
    }
  };

  // Gestion de l'état de l'app pour les notifications AVEC LOGS
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (!mounted.current || !currentUser) return;

      console.log('État app changé:', nextAppState);
      
      if (nextAppState === 'active') {
        // App devient active - vérifier les notifications
        if (notificationService.getStatus().isInitialized) {
          console.log('App active - vérification des notifications...');
          // Le service gère automatiquement la vérification d'expiration des tokens
        } else if (currentUser?.id) {
          // Réinitialiser si le service n'est pas initialisé
          console.log('Réinitialisation des notifications (app active)...');
          initializeNotificationsSafely(currentUser.id);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [currentUser]);

  // SPLASH SCREEN AVEC LOGS
  useEffect(() => {
    if (fontsLoaded && !authLoading && isReady) {
      safeTimeout(async () => {
        try {
          await SplashScreen.hideAsync();
          console.log('Splash screen masqué');
        } catch (error) {
          console.warn('Erreur splash screen:', error);
        }
      }, 100);
    }
  }, [fontsLoaded, authLoading, isReady, safeTimeout]);

  // 🔧 MODIFIÉ : CONDITIONS DE RENDU (utilise roleLoading du hook)
  if (!isReady || !fontsLoaded || authLoading || (currentUser && roleLoading)) {
    console.log('Chargement... ready:', isReady, 'fonts:', fontsLoaded, 'auth:', !authLoading, 'role:', !roleLoading);
    return null;
  }

  // 🔧 MODIFIÉ : DIAGNOSTIC COMPLET (utilise currentRole du hook)
  console.log('Layout principal rendu - Navigation autorisée');
  console.log('currentUser:', currentUser?.id || 'NON CONNECTÉ', 'segments:', segments);
  console.log('currentRole (useRoleManagerAdapter):', currentRole || 'NON DÉFINI'); // 🔧 MODIFIÉ
  console.log('État final:', {
    user: currentUser ? 'CONNECTÉ' : 'NON CONNECTÉ',
    role: currentRole || 'AUCUN', // 🔧 MODIFIÉ
    segments: segments,
    targetRoute: currentUser ? getTargetRouteByRole(currentRole) : '/auth/login' // 🔧 MODIFIÉ
  });

  return (
    <UltraSafeAreaWrapper>
      <StripeProvider
        publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.garrec.fourmizapp"
      >
        <ChatNotificationProvider currentUserId={currentUser?.id}>
          <Slot />
          <InAppNotification />
        </ChatNotificationProvider>
      </StripeProvider>
    </UltraSafeAreaWrapper>
  );
}
export default Layout;
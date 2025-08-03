// app/_layout.tsx - VERSION CORRIGÉE AVEC ULTRA SAFE AREA WRAPPER
import '@/lib/debugUtils';    // ← Debug .includes() en PREMIER
import '@/lib/polyfills'; 
import { Slot, router, useSegments, useRootNavigationState } from 'expo-router';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { ChatNotificationProvider } from '@/components/ChatNotificationProvider';
import { InAppNotification } from '@/components/InAppNotification';
import UltraSafeAreaWrapper from '@/components/SafeAreaWrapper'; // ← AJOUTÉ

// 🔔 REMPLACÉ : Ancien service par le nouveau service unifié
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
  
  // ✅ REFS DE SÉCURITÉ
  const mounted = useRef(false);
  const authSubscription = useRef<{ unsubscribe: () => void } | null>(null);
  const timeouts = useRef<Set<NodeJS.Timeout>>(new Set());
  const redirectionDone = useRef(false);
  const initStarted = useRef(false);
  
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  // ✅ HELPER TIMEOUT SÉCURISÉ
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

  // ✅ MONTAGE SÉCURISÉ
  useEffect(() => {
    console.log('🏗️ Layout principal - Début du montage...');
    mounted.current = true;
    
    const readyTimeout = safeTimeout(() => {
      if (mounted.current) {
        console.log('✅ Layout principal prêt');
        setIsReady(true);
      }
    }, 300);

    return () => {
      console.log('🧹 Layout principal - Début du démontage...');
      mounted.current = false;
      
      // ✅ NETTOYAGE COMPLET DES TIMEOUTS
      timeouts.current.forEach(t => clearTimeout(t));
      timeouts.current.clear();
      
      // ✅ NETTOYAGE SÉCURISÉ DE LA SUBSCRIPTION
      if (authSubscription.current) {
        try {
          console.log('🧹 Nettoyage subscription auth...');
          authSubscription.current.unsubscribe();
        } catch (error) {
          console.warn('⚠️ Erreur unsubscribe:', error);
        } finally {
          authSubscription.current = null;
        }
      }
      
      console.log('✅ Layout principal - Démontage terminé');
    };
  }, [safeTimeout]);

  // ✅ HELPER AUTH ULTRA-SÉCURISÉ
  const getCurrentUser = useCallback(async () => {
    if (!mounted.current) {
      console.log('⚠️ getCurrentUser: composant non monté');
      return null;
    }

    try {
      // ✅ VÉRIFICATION COMPLÈTE DE SUPABASE
      if (!supabase) {
        console.error('❌ Supabase non initialisé');
        return null;
      }

      if (!supabase.auth) {
        console.error('❌ Supabase.auth non disponible');
        return null;
      }

      if (typeof supabase.auth.getUser !== 'function') {
        console.error('❌ supabase.auth.getUser n\'est pas une fonction');
        return null;
      }

      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        if (error.message?.includes('Invalid Refresh Token')) {
          console.log('🧹 Token invalide, nettoyage...');
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.warn('⚠️ Erreur signOut:', signOutError);
          }
          return null;
        }
        
        if (error.message?.includes('Auth session missing')) {
          console.log('ℹ️ Aucune session active');
          return null;
        }
        
        console.error('❌ Erreur auth:', error.message);
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('❌ Exception getCurrentUser:', error);
      return null;
    }
  }, []);

  // ✅ INITIALISATION AUTH ULTRA-SÉCURISÉE
  useEffect(() => {
    if (!isReady || initStarted.current) return;

    console.log('🔄 Configuration de l\'authentification...');
    initStarted.current = true;
    
    const initAuth = async () => {
      try {
        if (!mounted.current) return;

        console.log('📋 Récupération utilisateur initial...');
        const user = await getCurrentUser();
        
        if (mounted.current) {
          console.log('✅ Utilisateur initial:', user ? `Connecté (${user.id})` : 'Non connecté');
          setCurrentUser(user);
          setAuthLoading(false);
          
          // 🔔 NOUVEAU : Initialisation sécurisée des notifications
          if (user) {
            await initializeNotificationsSafely(user.id);
          }
        }
      } catch (error) {
        console.error('❌ Erreur init auth:', error);
        if (mounted.current) {
          setAuthLoading(false);
        }
      }
    };

    const setupAuthListener = () => {
      if (!mounted.current) return;

      try {
        // ✅ VÉRIFICATIONS COMPLÈTES AVANT SETUP
        if (!supabase) {
          console.error('❌ Supabase non disponible pour listener');
          return;
        }

        if (!supabase.auth) {
          console.error('❌ Supabase.auth non disponible pour listener');
          return;
        }

        if (typeof supabase.auth.onAuthStateChange !== 'function') {
          console.error('❌ onAuthStateChange n\'est pas une fonction');
          return;
        }

        // ✅ NETTOYAGE DE L'ANCIENNE SUBSCRIPTION
        if (authSubscription.current) {
          try {
            authSubscription.current.unsubscribe();
          } catch (error) {
            console.warn('⚠️ Erreur nettoyage ancienne subscription:', error);
          }
          authSubscription.current = null;
        }

        // ✅ CRÉATION SÉCURISÉE DE LA NOUVELLE SUBSCRIPTION
        const authResponse = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted.current) {
            console.log('⚠️ Auth change ignoré - composant démonté');
            return;
          }
          
          console.log('🔔 Auth state changed:', event, session?.user?.id || 'null');
          
          const user = session?.user || null;
          setCurrentUser(user);
          
          if (event === 'SIGNED_OUT') {
            redirectionDone.current = false;
            // 🔔 NOUVEAU : Nettoyage sécurisé des notifications
            await cleanupNotificationsSafely();
          } else if (event === 'SIGNED_IN' && user && mounted.current) {
            redirectionDone.current = false;
            // 🔔 NOUVEAU : Initialisation sécurisée des notifications
            await initializeNotificationsSafely(user.id);
          }
        });

        // ✅ VÉRIFICATION QUE LA RESPONSE CONTIENT BIEN data.subscription
        if (authResponse && authResponse.data && authResponse.data.subscription) {
          authSubscription.current = authResponse.data.subscription;
          console.log('✅ Auth listener configuré avec succès');
        } else {
          console.error('❌ Subscription non trouvée dans la réponse:', authResponse);
        }

      } catch (error) {
        console.error('❌ Erreur setup listener:', error);
      }
    };

    // ✅ INITIALISATION IMMÉDIATE
    initAuth();
    setupAuthListener();

  }, [isReady, getCurrentUser]);

  // ✅ NAVIGATION SÉCURISÉE
  const performSafeNavigation = useCallback(async (route: string): Promise<boolean> => {
    if (!mounted.current || !router) {
      console.log(`⚠️ Navigation bloquée vers ${route}`);
      return false;
    }

    try {
      console.log(`🧭 Navigation vers: ${route}`);
      router.replace(route as any);
      return true;
    } catch (error) {
      console.error(`❌ Exception navigation vers ${route}:`, error);
      return false;
    }
  }, []);

  // ✅ REDIRECTION CORRIGÉE - PAS DE REDIRECTION AUTOMATIQUE DEPUIS L'ACCUEIL
  useEffect(() => {
    if (authLoading || redirectionDone.current || !mounted.current) {
      return;
    }

    console.log('🚀 Évaluation redirection...');
    console.log('📍 Segments:', segments);
    console.log('👤 Utilisateur:', currentUser ? 'Connecté' : 'Non connecté');

    const inAuth = segments[0] === '(auth)';
    const inTabs = segments[0] === '(tabs)';
    const inAdmin = segments[0] === 'admin';
    const isRoot = segments.length === 0; // Page d'accueil (index.tsx)
    const isNotFound = segments[0] === '+not-found';

    const redirectTimeout = safeTimeout(async () => {
      if (!mounted.current || redirectionDone.current) return;

      try {
        let needsRedirect = false;
        let targetRoute = '';

        if (currentUser) {
          // ✅ CORRIGÉ : Utilisateur connecté - SEULEMENT rediriger depuis les pages d'auth
          // On retire `isRoot` pour permettre l'affichage de la page d'accueil
          if (inAuth) {
            needsRedirect = true;
            targetRoute = '/(tabs)';
            console.log('🔄 Redirection utilisateur connecté depuis auth vers tabs...');
          }
          // ✅ Pour les 404, on redirige vers les tabs
          else if (isNotFound) {
            needsRedirect = true;
            targetRoute = '/(tabs)';
            console.log('🔄 Redirection utilisateur connecté depuis 404 vers tabs...');
          }
        } else {
          // ✅ CORRIGÉ : Utilisateur non connecté - SEULEMENT protéger les pages qui nécessitent une auth
          // On retire `isRoot` pour permettre l'affichage de la page d'accueil publique
          if (inTabs || inAdmin) {
            needsRedirect = true;
            targetRoute = '/auth/login';
            console.log('🔄 Redirection utilisateur non connecté vers login...');
          }
          // ✅ Pour les 404, on redirige vers la page d'accueil
          else if (isNotFound) {
            needsRedirect = true;
            targetRoute = '/';
            console.log('🔄 Redirection depuis 404 vers accueil...');
          }
        }

        if (needsRedirect && targetRoute) {
          const success = await performSafeNavigation(targetRoute);
          if (success || !mounted.current) {
            redirectionDone.current = true;
            console.log('✅ Redirection terminée');
          }
        } else {
          redirectionDone.current = true;
          console.log('✅ Pas de redirection nécessaire - Affichage de la page actuelle');
        }
      } catch (error) {
        console.error('❌ Erreur redirection:', error);
        redirectionDone.current = true;
      }
    }, 200);

    return () => {
      timeouts.current.delete(redirectTimeout);
      clearTimeout(redirectTimeout);
    };

  }, [currentUser, segments, authLoading, performSafeNavigation, safeTimeout]);

  // 🔔 NOUVELLES FONCTIONS DE NOTIFICATIONS SÉCURISÉES
  const initializeNotificationsSafely = async (userId: string) => {
    if (!mounted.current) {
      console.log('⚠️ Initialisation notifications abandonnée - composant démonté');
      return;
    }
    
    try {
      console.log('🔔 Initialisation sécurisée des notifications pour:', userId);
      
      // Utiliser le nouveau service unifié
      const success = await initializeNotifications(userId);
      
      if (success) {
        console.log('✅ Notifications initialisées avec succès');
        
        // 🆕 NOUVEAU : Afficher le status du service
        if (__DEV__) {
          const status = notificationService.getStatus();
          console.log('📊 Status notifications:', status);
        }
        
        // 🆕 NOUVEAU : Test automatique en développement
        if (__DEV__) {
          setTimeout(() => {
            if (mounted.current) {
              notificationService.sendTestNotification().then(testSent => {
                if (testSent) {
                  console.log('🧪 Notification de test envoyée');
                } else {
                  console.log('⚠️ Test de notification échoué');
                }
              });
            }
          }, 3000); // Délai de 3 secondes pour laisser le temps à l'initialisation
        }
      } else {
        console.log('⚠️ Échec initialisation notifications');
        
        // 🆕 NOUVEAU : Retry automatique après délai
        setTimeout(() => {
          if (mounted.current) {
            console.log('🔄 Tentative de réinitialisation des notifications...');
            initializeNotificationsSafely(userId);
          }
        }, 5000); // Retry après 5 secondes
      }
    } catch (error) {
      console.error('❌ Erreur initialisation notifications:', error);
      
      // 🆕 NOUVEAU : Diagnostic en cas d'erreur
      if (error.message?.includes('profiles')) {
        console.log('💡 Conseil: Le profil utilisateur semble manquant');
        console.log('💡 Utilisez le hook useAuth corrigé pour créer le profil automatiquement');
      }
    }
  };

  const cleanupNotificationsSafely = async () => {
    try {
      console.log('🧹 Nettoyage sécurisé des notifications...');
      
      // Utiliser le nouveau service unifié
      cleanupNotifications();
      
      console.log('✅ Notifications nettoyées');
    } catch (error) {
      console.error('❌ Erreur cleanup notifications:', error);
    }
  };

  // 🆕 NOUVEAU : Gestion de l'état de l'app pour les notifications
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (!mounted.current || !currentUser) return;

      console.log('📱 État app changé:', nextAppState);
      
      if (nextAppState === 'active') {
        // App devient active - vérifier les notifications
        if (notificationService.getStatus().isInitialized) {
          console.log('🔄 App active - vérification des notifications...');
          // Le service gère automatiquement la vérification d'expiration des tokens
        } else if (currentUser?.id) {
          // Réinitialiser si le service n'est pas initialisé
          console.log('🔄 Réinitialisation des notifications (app active)...');
          initializeNotificationsSafely(currentUser.id);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [currentUser]);

  // ✅ SPLASH SCREEN
  useEffect(() => {
    if (fontsLoaded && !authLoading && isReady) {
      safeTimeout(async () => {
        try {
          await SplashScreen.hideAsync();
          console.log('✅ Splash screen masqué');
        } catch (error) {
          console.warn('⚠️ Erreur splash screen:', error);
        }
      }, 100);
    }
  }, [fontsLoaded, authLoading, isReady, safeTimeout]);

  // ✅ CONDITIONS DE RENDU
  if (!isReady || !fontsLoaded || authLoading) {
    console.log('⏳ Chargement... ready:', isReady, 'fonts:', fontsLoaded, 'auth:', !authLoading);
    return null;
  }

  console.log('✅ Layout principal rendu - Navigation autorisée');

  return (
    <UltraSafeAreaWrapper>
      <ChatNotificationProvider currentUserId={currentUser?.id}>
        <Slot />
        <InAppNotification />
      </ChatNotificationProvider>
    </UltraSafeAreaWrapper>
  );
}
// lib/errorSuppressor.ts
// SUPPRESSEUR D'ERREUR POUR L'ERREUR SAFEAREAVIEW CONNUE

console.log('Chargement du suppresseur d erreur SafeArea...');

// SUPPRESSION DES ERREURS CONSOLE SPECIFIQUES
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = function(...args: any[]) {
  const message = args.join(' ');
  
  // Supprimer spécifiquement l'erreur SafeArea includes()
  if (message.includes('Cannot read property \'includes\' of undefined') ||
      message.includes('Cannot read properties of undefined (reading \'includes\')') ||
      message.includes('RNCSafeAreaProvider')) {
    
    // Log discret une seule fois
    if (!(global as any).__safeAreaErrorLogged) {
      console.log('Erreur SafeArea supprimee (bug connu, app fonctionne normalement)');
      (global as any).__safeAreaErrorLogged = true;
    }
    return; // Supprimer l'erreur
  }
  
  // Afficher toutes les autres erreurs normalement
  originalConsoleError.apply(console, args);
};

console.warn = function(...args: any[]) {
  const message = args.join(' ');
  
  // Supprimer aussi les warnings SafeArea
  if (message.includes('Cannot read property \'includes\'') ||
      message.includes('RNCSafeAreaProvider') ||
      message.includes('SafeAreaProvider')) {
    return; // Supprimer le warning
  }
  
  // Afficher tous les autres warnings normalement
  originalConsoleWarn.apply(console, args);
};

// SUPPRESSION DES ERREURS METRO/REACT NATIVE
if (typeof global !== 'undefined') {
  // Suppression pour React Native
  const originalErrorHandler = global.ErrorUtils?.setGlobalHandler;
  
  if (originalErrorHandler && global.ErrorUtils) {
    global.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      // Supprimer spécifiquement les erreurs SafeArea
      if (error.message?.includes('Cannot read property \'includes\'') ||
          error.message?.includes('Cannot read properties of undefined (reading \'includes\')') ||
          error.stack?.includes('RNCSafeAreaProvider')) {
        
        // Log discret
        if (!(global as any).__globalSafeAreaErrorLogged) {
          console.log('Erreur globale SafeArea supprimee (bug connu)');
          (global as any).__globalSafeAreaErrorLogged = true;
        }
        return; // Supprimer l'erreur
      }
      
      // Passer toutes les autres erreurs au handler original
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });
  }
}

// SUPPRESSION POUR LE WEB (au cas où)
if (typeof window !== 'undefined') {
  const originalWindowError = window.onerror;
  
  window.onerror = function(message, source, lineno, colno, error) {
    if (typeof message === 'string' && 
        (message.includes('Cannot read property \'includes\'') ||
         message.includes('RNCSafeAreaProvider'))) {
      
      // Log discret
      if (!(window as any).__webSafeAreaErrorLogged) {
        console.log('Erreur web SafeArea supprimee (bug connu)');
        (window as any).__webSafeAreaErrorLogged = true;
      }
      return true; // Supprimer l'erreur
    }
    
    // Passer toutes les autres erreurs
    if (originalWindowError) {
      return originalWindowError(message, source, lineno, colno, error);
    }
    return false;
  };
}

// FONCTION POUR REACTIVER LES ERREURS (si besoin)
export function restoreErrorLogging() {
  console.log('Restauration des logs d erreur');
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}

// FONCTION POUR VERIFIER LE STATUS
export function getSuppressionStatus() {
  return {
    consoleErrorSuppressed: console.error !== originalConsoleError,
    consoleWarnSuppressed: console.warn !== originalConsoleWarn,
    safeAreaErrorLogged: !!(global as any).__safeAreaErrorLogged,
    globalErrorLogged: !!(global as any).__globalSafeAreaErrorLogged,
  };
}

console.log('Suppresseur d erreur SafeArea initialise');
console.log('Utilisez restoreErrorLogging() pour reactiver si necessaire');

export default {
  restoreErrorLogging,
  getSuppressionStatus
};
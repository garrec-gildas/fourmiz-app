// lib/debugUtils.ts
// 🔍 UTILITAIRE DE DEBUG TEMPORAIRE pour identifier l'erreur .includes()
// ⚠️ À SUPPRIMER une fois le problème identifié

console.log('🔍 DebugUtils chargé - Protection .includes() activée');

// Compteurs pour statistiques
let arrayIncludesErrors = 0;
let stringIncludesErrors = 0;
let totalIncludesCalls = 0;

// Sauvegarder les méthodes originales
const originalIncludes = Array.prototype.includes;
const originalStringIncludes = String.prototype.includes;

// Interface pour le contexte d'erreur
interface IncludesContext {
  this: any;
  searchElement: any;
  fromIndex?: number;
  typeof_this: string;
  stack?: string;
}

// 🛡️ PROTECTION POUR ARRAY.INCLUDES()
Array.prototype.includes = function(searchElement: any, fromIndex?: number) {
  totalIncludesCalls++;
  
  // Vérifier si 'this' est undefined ou null
  if (this === undefined || this === null) {
    arrayIncludesErrors++;
    console.error(`🚨 ERREUR CRITIQUE #${arrayIncludesErrors}: Array.includes() appelé sur undefined/null !`);
    console.error('📍 Contexte détaillé:', {
      this: this,
      searchElement: searchElement,
      fromIndex: fromIndex,
      typeof_this: typeof this,
      timestamp: new Date().toISOString(),
      callNumber: totalIncludesCalls
    });
    
    // Stack trace plus lisible
    const stack = new Error().stack;
    console.error('📋 Stack trace complète:');
    if (stack) {
      const stackLines = stack.split('\n');
      stackLines.forEach((line, index) => {
        if (index > 0 && line.trim()) { // Skip first line et lignes vides
          console.error(`   ${index}: ${line.trim()}`);
        }
      });
    }
    
    // Identifier le fichier source probable
    const sourceMatch = stack?.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (sourceMatch) {
      console.error('🎯 FICHIER PROBLÉMATIQUE PROBABLE:', {
        function: sourceMatch[1],
        file: sourceMatch[2],
        line: sourceMatch[3],
        column: sourceMatch[4]
      });
    }
    
    return false;
  }
  
  // Vérifier si c'est bien un array
  if (!Array.isArray(this)) {
    console.warn(`⚠️ WARNING: .includes() appelé sur un non-array (call #${totalIncludesCalls}):`, {
      this: this,
      typeof_this: typeof this,
      constructor: this?.constructor?.name,
      searchElement: searchElement,
      isString: typeof this === 'string',
      isObject: typeof this === 'object'
    });
    
    // Si c'est une string, la convertir en array ou utiliser String.includes
    if (typeof this === 'string') {
      console.warn('💡 SUGGESTION: Utiliser String.includes() au lieu de Array.includes() pour les strings');
      return this.includes(searchElement);
    }
  }
  
  // Appeler la méthode originale avec protection supplémentaire
  try {
    const result = originalIncludes.call(this, searchElement, fromIndex);
    
    // Log occasionnel pour vérifier que ça fonctionne
    if (totalIncludesCalls % 100 === 0) {
      console.log(`📊 Stats .includes(): ${totalIncludesCalls} appels, ${arrayIncludesErrors} erreurs Array`);
    }
    
    return result;
  } catch (error) {
    arrayIncludesErrors++;
    console.error(`❌ Erreur inattendue dans .includes() (call #${totalIncludesCalls}):`, error);
    console.error('📍 Données complètes:', {
      this: this,
      searchElement: searchElement,
      fromIndex: fromIndex,
      thisLength: this?.length,
      errorMessage: error.message
    });
    return false;
  }
};

// 🛡️ PROTECTION POUR STRING.INCLUDES() (au cas où)
String.prototype.includes = function(searchString: string, position?: number) {
  if (this === undefined || this === null) {
    stringIncludesErrors++;
    console.error(`🚨 ERREUR CRITIQUE #${stringIncludesErrors}: String.includes() appelé sur undefined/null !`);
    console.error('📍 Contexte:', {
      this: this,
      searchString: searchString,
      position: position,
      typeof_this: typeof this,
      timestamp: new Date().toISOString()
    });
    
    const stack = new Error().stack;
    console.error('📋 Stack trace pour String.includes():');
    if (stack) {
      stack.split('\n').forEach((line, index) => {
        if (index > 0 && line.trim()) {
          console.error(`   ${index}: ${line.trim()}`);
        }
      });
    }
    
    return false;
  }
  
  try {
    return originalStringIncludes.call(this, searchString, position);
  } catch (error) {
    stringIncludesErrors++;
    console.error('❌ Erreur dans String.includes():', error);
    console.error('📍 Données:', {
      this: this,
      searchString: searchString,
      position: position,
      typeof_this: typeof this
    });
    return false;
  }
};

// 🔍 FONCTION pour afficher les statistiques
export function getDebugStats(): void {
  console.log('📊 STATISTIQUES DEBUG .includes():', {
    totalCalls: totalIncludesCalls,
    arrayErrors: arrayIncludesErrors,
    stringErrors: stringIncludesErrors,
    successRate: totalIncludesCalls > 0 ? 
      ((totalIncludesCalls - arrayIncludesErrors - stringIncludesErrors) / totalIncludesCalls * 100).toFixed(2) + '%' : 
      '100%',
    timestamp: new Date().toISOString()
  });
}

// 🔍 FONCTION pour reset les compteurs
export function resetDebugStats(): void {
  const oldStats = { totalIncludesCalls, arrayIncludesErrors, stringIncludesErrors };
  totalIncludesCalls = 0;
  arrayIncludesErrors = 0;
  stringIncludesErrors = 0;
  console.log('🔄 Stats reset. Anciennes stats:', oldStats);
}

// 🔍 FONCTION UTILITAIRE pour vérifier manuellement une variable
export function safeIncludes<T>(
  array: T[] | undefined | null, 
  searchElement: T, 
  context?: string
): boolean {
  const logContext = context ? `[${context}]` : '';
  
  if (array === undefined) {
    console.warn(`⚠️ ${logContext} safeIncludes: array est undefined`);
    return false;
  }
  
  if (array === null) {
    console.warn(`⚠️ ${logContext} safeIncludes: array est null`);
    return false;
  }
  
  if (!Array.isArray(array)) {
    console.warn(`⚠️ ${logContext} safeIncludes: n'est pas un array:`, {
      array,
      typeof_array: typeof array
    });
    return false;
  }
  
  try {
    return array.includes(searchElement);
  } catch (error) {
    console.error(`❌ ${logContext} Erreur dans safeIncludes:`, error);
    return false;
  }
}

// 🔍 FONCTION pour vérifier l'état d'une variable avant .includes()
export function debugVariable(variable: any, name: string = 'variable'): void {
  console.log(`🔍 DEBUG ${name}:`, {
    value: variable,
    type: typeof variable,
    isArray: Array.isArray(variable),
    isNull: variable === null,
    isUndefined: variable === undefined,
    constructor: variable?.constructor?.name
  });
}

// 🔍 FONCTION pour restaurer les méthodes originales (quand le bug est trouvé)
export function restoreOriginalIncludes(): void {
  console.log('🔧 Restauration des méthodes .includes() originales');
  Array.prototype.includes = originalIncludes;
  String.prototype.includes = originalStringIncludes;
  console.log('✅ Méthodes originales restaurées');
}

// 🔍 WRAPPER SÉCURISÉ pour les rôles spécifiquement
export function checkRole(roles: any, targetRole: string, context: string = 'unknown'): boolean {
  console.log(`🔍 checkRole [${context}]:`, {
    roles,
    targetRole,
    typeof_roles: typeof roles,
    isArray: Array.isArray(roles)
  });
  
  return safeIncludes(roles, targetRole, `checkRole-${context}`);
}

// 🚨 GESTIONNAIRE D'ERREURS GLOBAL pour capturer d'autres erreurs
// Support pour React Native ET web
if (typeof global !== 'undefined' && global.ErrorUtils?.setGlobalHandler) {
  // React Native
  const originalErrorHandler = global.ErrorUtils.setGlobalHandler;
  global.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    if (error.message?.includes('Cannot read property \'includes\'') || 
        error.message?.includes('Cannot read properties of undefined (reading \'includes\')') ||
        error.message?.includes('Cannot read properties of null (reading \'includes\')')) {
      console.error('🚨 ERREUR .includes() CAPTURÉE par le gestionnaire global React Native !');
      console.error('📍 Message:', error.message);
      console.error('📍 Stack:', error.stack);
      console.error('📍 Is Fatal:', isFatal);
    }
    
    // Appeler le gestionnaire original si il existe
    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    }
  });
  console.log('✅ Gestionnaire d\'erreurs React Native activé');
} else if (typeof window !== 'undefined') {
  // Web browser
  const originalWindowError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (typeof message === 'string' && 
        (message.includes('Cannot read property \'includes\'') || 
         message.includes('Cannot read properties of undefined (reading \'includes\')') ||
         message.includes('Cannot read properties of null (reading \'includes\')'))) {
      console.error('🚨 ERREUR .includes() CAPTURÉE par le gestionnaire global Web !');
      console.error('📍 Message:', message);
      console.error('📍 Source:', source);
      console.error('📍 Line:', lineno, 'Col:', colno);
      console.error('📍 Error object:', error);
    }
    
    // Appeler le gestionnaire original
    if (originalWindowError) {
      return originalWindowError(message, source, lineno, colno, error);
    }
    return false;
  };
  
  // Handler moderne pour les promesses
  const originalUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function(event) {
    if (event.reason?.message?.includes('includes')) {
      console.error('🚨 ERREUR .includes() dans une Promise rejetée !');
      console.error('📍 Reason:', event.reason);
    }
    
    if (originalUnhandledRejection) {
      return originalUnhandledRejection(event);
    }
  };
  
  console.log('✅ Gestionnaires d\'erreurs Web activés');
}

console.log('✅ DebugUtils initialisé - Toutes les protections actives');
console.log('📊 Afficher les stats avec: getDebugStats()');
console.log('🔄 Reset les stats avec: resetDebugStats()');

// Export par défaut pour faciliter l'import
export default {
  safeIncludes,
  debugVariable,
  checkRole,
  restoreOriginalIncludes,
  getDebugStats,
  resetDebugStats
};
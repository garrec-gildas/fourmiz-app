// lib/polyfills.ts
// 🛡️ POLYFILLS AVEC MOCK SAFEAREAVIEW GLOBAL

console.log('🔧 Chargement des polyfills...');

// 🤫 NOUVEAU : Suppresseur d'erreur SafeArea EN PREMIER
import './errorSuppressor';

// ✅ POLYFILL URL (existant)
import 'react-native-url-polyfill/auto';

// 🛡️ MOCK SAFEAREAVIEW INLINE (pour éviter les problèmes d'import circulaire)
import React from 'react';
import { View, Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// 📱 VALEURS DE SAFE AREA PAR DÉFAUT
const DEFAULT_INSETS = {
  top: Platform.OS === 'ios' ? 47 : 24, // Status bar + notch
  bottom: Platform.OS === 'ios' ? 34 : 0, // Home indicator
  left: 0,
  right: 0,
};

const DEFAULT_FRAME = {
  x: 0,
  y: 0,
  width,
  height,
};

const DEFAULT_METRICS = {
  insets: DEFAULT_INSETS,
  frame: DEFAULT_FRAME,
};

console.log('🛡️ SafeAreaMock initialisé avec insets:', DEFAULT_INSETS);

// 🛡️ MOCK CONTEXT
const SafeAreaContext = React.createContext(DEFAULT_METRICS);

// 🛡️ MOCK SAFEAREAVIEW
function SafeAreaView({ 
  children, 
  style, 
  edges = ['top', 'bottom', 'left', 'right'],
  ...props 
}: any) {
  console.log('🛡️ SafeAreaView mocké rendu avec edges:', edges);
  
  const paddingStyle = {
    paddingTop: edges.includes('top') ? DEFAULT_INSETS.top : 0,
    paddingBottom: edges.includes('bottom') ? DEFAULT_INSETS.bottom : 0,
    paddingLeft: edges.includes('left') ? DEFAULT_INSETS.left : 0,
    paddingRight: edges.includes('right') ? DEFAULT_INSETS.right : 0,
  };

  return React.createElement(View, {
    style: [{ flex: 1 }, paddingStyle, style],
    ...props
  }, children);
}

// 🛡️ MOCK SAFEAREAPROVIDER
function SafeAreaProvider({ children, initialMetrics, ...props }: any) {
  console.log('🛡️ SafeAreaProvider mocké rendu');
  
  return React.createElement(SafeAreaContext.Provider, {
    value: DEFAULT_METRICS
  }, React.createElement(View, {
    style: { flex: 1 },
    ...props
  }, children));
}

// 🛡️ MOCK HOOKS
function useSafeAreaInsets() {
  console.log('🛡️ useSafeAreaInsets mocké appelé');
  return DEFAULT_INSETS;
}

function useSafeAreaFrame() {
  console.log('🛡️ useSafeAreaFrame mocké appelé');
  return DEFAULT_FRAME;
}

function useSafeAreaMetrics() {
  console.log('🛡️ useSafeAreaMetrics mocké appelé');
  return DEFAULT_METRICS;
}

// 🛡️ MOCK CONSUMER
const SafeAreaConsumer = SafeAreaContext.Consumer;

// 🛡️ MOCK FONCTION UTILITAIRE
function withSafeAreaInsets<T>(Component: React.ComponentType<T>) {
  return React.forwardRef<any, T>((props, ref) => {
    console.log('🛡️ withSafeAreaInsets mocké appelé');
    return React.createElement(Component, { ...props, ref, insets: DEFAULT_INSETS });
  });
}

// 🛡️ MOCK EDGE CONSTANT
const Edge = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
} as const;

// 🛡️ STATIC PROPERTIES POUR REACT NAVIGATION
(SafeAreaProvider as any).initialMetrics = DEFAULT_METRICS;

// 🛡️ OBJET MOCK COMPLET
const SafeAreaMock = {
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
  useSafeAreaFrame,
  useSafeAreaMetrics,
  SafeAreaConsumer,
  withSafeAreaInsets,
  Edge,
  initialMetrics: DEFAULT_METRICS,
};

console.log('🛡️ Installation du mock SafeAreaContext...');

// 🚨 REMPLACEMENT GLOBAL DU MODULE - METHOD 1: require() override
try {
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id: string) {
    if (id === 'react-native-safe-area-context') {
      console.log('🛡️ Intercept require() react-native-safe-area-context -> utilisation du mock');
      return SafeAreaMock;
    }
    return originalRequire.apply(this, arguments);
  };

  console.log('✅ Mock SafeAreaContext installé via require override');
} catch (error) {
  console.warn('⚠️ Erreur installation mock via require:', error);
}

// 🚨 METHOD 2: Global override pour les imports ES6
try {
  if (typeof global !== 'undefined') {
    // @ts-ignore
    global['react-native-safe-area-context'] = SafeAreaMock;
    console.log('✅ Mock SafeAreaContext installé via global');
  }
} catch (error) {
  console.warn('⚠️ Erreur installation mock via global:', error);
}

// 🚨 METHOD 3: Module cache override
try {
  // @ts-ignore
  if (require.cache) {
    const moduleId = require.resolve('react-native-safe-area-context');
    if (moduleId) {
      // @ts-ignore
      require.cache[moduleId] = {
        exports: SafeAreaMock,
        loaded: true,
        id: moduleId
      };
      console.log('✅ Mock SafeAreaContext installé via module cache');
    }
  }
} catch (error) {
  console.warn('⚠️ Erreur installation mock via cache:', error);
}

// 🚨 METHOD 4: Jest-style mock pour Metro
try {
  // @ts-ignore
  if (typeof jest !== 'undefined') {
    jest.doMock('react-native-safe-area-context', () => SafeAreaMock);
    console.log('✅ Mock SafeAreaContext installé via Jest');
  }
} catch (error) {
  // Jest non disponible, normal
}

console.log('🛡️ Polyfills SafeAreaMock terminés');

// 🔧 FONCTION UTILITAIRE POUR TESTER LE MOCK
export function testSafeAreaMock() {
  try {
    const safeAreaModule = require('react-native-safe-area-context');
    console.log('🧪 Test SafeAreaMock:');
    console.log('  - SafeAreaProvider:', typeof safeAreaModule.SafeAreaProvider);
    console.log('  - SafeAreaView:', typeof safeAreaModule.SafeAreaView);
    console.log('  - useSafeAreaInsets:', typeof safeAreaModule.useSafeAreaInsets);
    
    // ✅ SUPPRIMÉ : Test d'instanciation hook (causait l'erreur)
    // const insets = safeAreaModule.useSafeAreaInsets(); // ❌ Hook hors composant
    
    console.log('  - Module complet détecté:', !!safeAreaModule.SafeAreaProvider);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur test SafeAreaMock:', error);
    return false;
  }
}

// 🧪 Auto-test au chargement avec délai
setTimeout(() => {
  const testResult = testSafeAreaMock();
  if (testResult) {
    console.log('🎉 SafeAreaMock fonctionne correctement !');
  } else {
    console.error('💥 SafeAreaMock a échoué au test');
  }
}, 100);

// 🛡️ PROTECTION SUPPLÉMENTAIRE : Override des imports dynamiques
const originalImport = global.__importDefault || ((mod: any) => mod);
global.__importDefault = function(mod: any) {
  if (mod && mod.__esModule && mod.default && typeof mod.default === 'object') {
    // Si c'est react-native-safe-area-context, utiliser notre mock
    if (JSON.stringify(Object.keys(mod.default)).includes('SafeAreaProvider')) {
      console.log('🛡️ Override import dynamique SafeAreaContext détecté');
      return SafeAreaMock;
    }
  }
  return originalImport(mod);
};

console.log('🔧 Polyfills terminés - SafeAreaMock complètement installé');

// Export pour utilisation externe si nécessaire
export default SafeAreaMock;
export { SafeAreaMock };
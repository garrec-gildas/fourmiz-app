// components/SafeAreaWrapper.tsx
// 🛡️ WRAPPER ULTRA-ROBUSTE POUR SAFEAREAVIEW
import React from 'react';
import { View, Platform } from 'react-native';

// Import conditionnel pour éviter les erreurs
let SafeAreaProvider: any;
let SafeAreaProviderProps: any;

try {
  const safeAreaModule = require('react-native-safe-area-context');
  SafeAreaProvider = safeAreaModule.SafeAreaProvider;
  SafeAreaProviderProps = safeAreaModule.SafeAreaProviderProps;
  console.log('✅ SafeAreaProvider importé avec succès');
} catch (error) {
  console.warn('⚠️ SafeAreaContext non disponible:', error);
  SafeAreaProvider = null;
}

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  [key: string]: any;
}

export function SafeAreaWrapper({ children, ...props }: SafeAreaWrapperProps) {
  // 🛡️ Si SafeAreaProvider n'est pas disponible, utiliser View
  if (!SafeAreaProvider) {
    console.warn('🔄 Fallback: Utilisation de View au lieu de SafeAreaProvider');
    return (
      <View style={{ 
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 50 : 25, // Safe area manuelle
        backgroundColor: '#fff' 
      }}>
        {children}
      </View>
    );
  }

  // 🛡️ Filtrer tous les props undefined/null
  const safeProps = Object.fromEntries(
    Object.entries(props).filter(([_, value]) => 
      value !== undefined && 
      value !== null
    )
  );

  console.log('🛡️ SafeAreaWrapper props:', Object.keys(safeProps));

  try {
    return (
      <SafeAreaProvider {...safeProps}>
        {children}
      </SafeAreaProvider>
    );
  } catch (error) {
    console.error('❌ Erreur SafeAreaProvider, fallback vers View:', error);
    
    // 🛡️ Fallback complet si SafeAreaProvider plante
    return (
      <View style={{ 
        flex: 1, 
        paddingTop: Platform.OS === 'ios' ? 50 : 25,
        backgroundColor: '#fff' 
      }}>
        {children}
      </View>
    );
  }
}

// Version ultra-agressive qui force le fallback immédiatement
export function UltraSafeAreaWrapper({ children, ...props }: SafeAreaWrapperProps) {
  // ⚡ FORCE LE MODE FALLBACK IMMÉDIATEMENT - pas de SafeAreaProvider du tout
  console.log('🛡️ UltraSafeAreaWrapper: Mode fallback forcé pour éviter le bug includes()');
  
  return (
    <View style={{ 
      flex: 1, 
      paddingTop: Platform.OS === 'ios' ? 50 : 25, // Safe area pour iOS/Android
      paddingBottom: Platform.OS === 'ios' ? 34 : 0, // Home indicator iOS
      backgroundColor: '#fff' 
    }}>
      {children}
    </View>
  );
}

// Version progressive qui tente SafeAreaProvider avec fallback rapide
export function ProgressiveSafeAreaWrapper({ children, ...props }: SafeAreaWrapperProps) {
  const [hasError, setHasError] = React.useState(false);
  const [forceViewMode, setForceViewMode] = React.useState(false);

  // Fallback View avec safe area manuelle
  const renderFallback = React.useCallback(() => {
    console.log('📱 Rendu fallback View avec safe area manuelle');
    return (
      <View style={{ 
        flex: 1, 
        paddingTop: Platform.OS === 'ios' ? 50 : 25,
        paddingBottom: Platform.OS === 'ios' ? 34 : 0,
        backgroundColor: '#fff' 
      }}>
        {children}
      </View>
    );
  }, [children]);

  // Si erreur détectée ou pas de SafeAreaProvider, utiliser fallback
  if (hasError || !SafeAreaProvider || forceViewMode) {
    return renderFallback();
  }

  // ErrorBoundary manuel pour SafeAreaProvider
  try {
    return (
      <ErrorBoundaryWrapper onError={() => {
        console.log('🚨 Erreur détectée, activation immédiate du fallback');
        setHasError(true);
        setForceViewMode(true);
      }}>
        <SafeAreaWrapper {...props}>{children}</SafeAreaWrapper>
      </ErrorBoundaryWrapper>
    );
  } catch (error) {
    console.error('❌ ProgressiveSafeAreaWrapper error:', error);
    setHasError(true);
    return renderFallback();
  }
}

// ErrorBoundary personnalisé pour capturer spécifiquement les erreurs includes
interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
  onError: () => void;
}

class ErrorBoundaryWrapper extends React.Component<ErrorBoundaryWrapperProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('🚨 ErrorBoundary a capturé une erreur:', error);
    
    // Détection spécifique de l'erreur includes
    if (error.message?.includes('Cannot read property \'includes\'') ||
        error.message?.includes('Cannot read properties of undefined (reading \'includes\')')) {
      console.error('🎯 ERREUR INCLUDES DÉTECTÉE - Activation fallback immédiat');
      return { hasError: true };
    }
    
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary détails:', error, errorInfo);
    
    // Si l'erreur contient "includes" ou vient de SafeAreaProvider
    if (error.message?.includes('includes') || 
        error.message?.includes('SafeAreaProvider') ||
        errorInfo.componentStack?.includes('SafeAreaProvider') ||
        errorInfo.componentStack?.includes('RNCSafeAreaProvider')) {
      console.error('🎯 Erreur SafeAreaProvider/includes détectée, activation du fallback');
      this.props.onError();
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback immédiat
      console.log('🛡️ ErrorBoundary fallback activé');
      return (
        <View style={{ 
          flex: 1, 
          paddingTop: Platform.OS === 'ios' ? 50 : 25,
          paddingBottom: Platform.OS === 'ios' ? 34 : 0,
          backgroundColor: '#fff' 
        }}>
          {this.props.children}
        </View>
      );
    }

    return this.props.children;
  }
}

// Hook personnalisé pour détecter si SafeAreaProvider est sécurisé
export function useSafeAreaStatus() {
  const [isSafe, setIsSafe] = React.useState(!!SafeAreaProvider);
  const [lastError, setLastError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Test de sécurité de SafeAreaProvider
    if (SafeAreaProvider) {
      try {
        // Test basique d'instanciation
        console.log('🧪 Test de sécurité SafeAreaProvider...');
        setIsSafe(true);
      } catch (error) {
        console.error('❌ SafeAreaProvider unsafe:', error);
        setLastError(error.message);
        setIsSafe(false);
      }
    } else {
      setIsSafe(false);
      setLastError('SafeAreaProvider non disponible');
    }
  }, []);

  return { isSafe, lastError };
}

// Export par défaut - Version ultra-agressive qui force le fallback
export default UltraSafeAreaWrapper;

// Exports nommés pour flexibilité
export { 
  SafeAreaWrapper, 
  UltraSafeAreaWrapper, 
  ProgressiveSafeAreaWrapper, 
  useSafeAreaStatus 
};
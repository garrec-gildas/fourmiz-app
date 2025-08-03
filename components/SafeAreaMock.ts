// lib/SafeAreaMock.ts
// 🛡️ MOCK COMPLET DE react-native-safe-area-context pour éviter le bug includes()

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

// 🛡️ MOCK SAFEAREAVIEW
export function SafeAreaView({ 
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

  return (
    <View style={[{ flex: 1 }, paddingStyle, style]} {...props}>
      {children}
    </View>
  );
}

// 🛡️ MOCK SAFEAREAPROVIDER
export function SafeAreaProvider({ children, initialMetrics, ...props }: any) {
  console.log('🛡️ SafeAreaProvider mocké rendu');
  
  return (
    <SafeAreaContext.Provider value={DEFAULT_METRICS}>
      <View style={{ flex: 1 }} {...props}>
        {children}
      </View>
    </SafeAreaContext.Provider>
  );
}

// 🛡️ MOCK CONTEXT
const SafeAreaContext = React.createContext(DEFAULT_METRICS);

// 🛡️ MOCK HOOKS
export function useSafeAreaInsets() {
  console.log('🛡️ useSafeAreaInsets mocké appelé');
  return DEFAULT_INSETS;
}

export function useSafeAreaFrame() {
  console.log('🛡️ useSafeAreaFrame mocké appelé');
  return DEFAULT_FRAME;
}

export function useSafeAreaMetrics() {
  console.log('🛡️ useSafeAreaMetrics mocké appelé');
  return DEFAULT_METRICS;
}

// 🛡️ MOCK CONSUMER
export const SafeAreaConsumer = SafeAreaContext.Consumer;

// 🛡️ MOCK FONCTION UTILITAIRE
export function withSafeAreaInsets<T>(Component: React.ComponentType<T>) {
  return React.forwardRef<any, T>((props, ref) => {
    console.log('🛡️ withSafeAreaInsets mocké appelé');
    return <Component {...props} ref={ref} insets={DEFAULT_INSETS} />;
  });
}

// 🛡️ MOCK EDGE CONSTANT
export const Edge = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
} as const;

// 🛡️ STATIC PROPERTIES POUR REACT NAVIGATION
SafeAreaProvider.initialMetrics = DEFAULT_METRICS;

// 🛡️ EXPORT PAR DÉFAUT
export default {
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
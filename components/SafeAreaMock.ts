// lib/SafeAreaMock.ts
// 🛡️ MOCK COMPLET DE react-native-safe-area-context pour éviter le bug includes()

import React from 'react';
import { View, Platform, Dimensions, ViewStyle } from 'react-native';

const { width, height } = Dimensions.get('window');

// 📐 Types pour Safe Area
interface EdgeInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Metrics {
  insets: EdgeInsets;
  frame: Rect;
}

type Edge = 'top' | 'bottom' | 'left' | 'right';

interface SafeAreaViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: Edge[];
  [key: string]: any;
}

interface SafeAreaProviderProps {
  children: React.ReactNode;
  initialMetrics?: Metrics;
  [key: string]: any;
}

// 📏 VALEURS DE SAFE AREA PAR DÉFAUT
const DEFAULT_INSETS: EdgeInsets = {
  top: Platform.OS === 'ios' ? 47 : 24, // Status bar + notch
  bottom: Platform.OS === 'ios' ? 34 : 0, // Home indicator
  left: 0,
  right: 0,
};

const DEFAULT_FRAME: Rect = {
  x: 0,
  y: 0,
  width,
  height,
};

const DEFAULT_METRICS: Metrics = {
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
}: SafeAreaViewProps) {
  console.log('🛡️ SafeAreaView mocké rendu avec edges:', edges);
  
  const paddingStyle: ViewStyle = {
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

// 🔄 MOCK CONTEXT
const SafeAreaContext = React.createContext<Metrics>(DEFAULT_METRICS);

// 🏗️ MOCK SAFEAREAPROVIDER
export function SafeAreaProvider({ 
  children, 
  initialMetrics = DEFAULT_METRICS, 
  ...props 
}: SafeAreaProviderProps) {
  console.log('🏗️ SafeAreaProvider mocké rendu');
  
  return (
    <SafeAreaContext.Provider value={initialMetrics}>
      <View style={{ flex: 1 }} {...props}>
        {children}
      </View>
    </SafeAreaContext.Provider>
  );
}

// 🪝 MOCK HOOKS
export function useSafeAreaInsets(): EdgeInsets {
  console.log('🪝 useSafeAreaInsets mocké appelé');
  return DEFAULT_INSETS;
}

export function useSafeAreaFrame(): Rect {
  console.log('🪝 useSafeAreaFrame mocké appelé');
  return DEFAULT_FRAME;
}

export function useSafeAreaMetrics(): Metrics {
  console.log('🪝 useSafeAreaMetrics mocké appelé');
  return DEFAULT_METRICS;
}

// 📡 MOCK CONSUMER
export const SafeAreaConsumer = SafeAreaContext.Consumer;

// 🔧 MOCK FONCTION UTILITAIRE
export function withSafeAreaInsets<T extends object>(
  Component: React.ComponentType<T & { insets?: EdgeInsets }>
) {
  return React.forwardRef<any, T>((props, ref) => {
    console.log('🔧 withSafeAreaInsets mocké appelé');
    return <Component {...props} ref={ref} insets={DEFAULT_INSETS} />;
  });
}

// 📍 MOCK EDGE CONSTANTS
export const Edge = {
  TOP: 'top' as const,
  BOTTOM: 'bottom' as const,
  LEFT: 'left' as const,
  RIGHT: 'right' as const,
};

// 🎯 STATIC PROPERTIES POUR REACT NAVIGATION
(SafeAreaProvider as any).initialMetrics = DEFAULT_METRICS;

// 📦 EXPORT PAR DÉFAUT
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

// 🔍 TYPES EXPORTS POUR COMPATIBILITÉ
export type { EdgeInsets, Rect, Metrics, Edge as EdgeType };
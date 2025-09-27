// app/(auth)/_layout.tsx - LAYOUT AUTHENTIFICATION FINAL + LOGS DEBUG
// 🐛 DEBUG : Logs ajoutés pour identifier l'erreur useEffect dans AuthLayout

// LOGS DEBUG REACT - VÉRIFICATION AVANT IMPORTS
console.log('🔍 DEBUG auth/_layout.tsx - AVANT IMPORTS');
console.log('🔍 typeof React avant import:', typeof React);
console.log('🔍 typeof useEffect avant import (devrait être undefined):', typeof useEffect);

import React from 'react';

// LOGS DEBUG REACT - VÉRIFICATION APRÈS IMPORT REACT
console.log('🔍 DEBUG auth/_layout.tsx - APRÈS IMPORT REACT');
console.log('🔍 typeof React après import:', typeof React);
console.log('🔍 React.useEffect disponible:', typeof React.useEffect);

import { Stack } from 'expo-router';

// LOGS DEBUG EXPO-ROUTER
console.log('🔍 DEBUG auth/_layout.tsx - APRÈS IMPORTS EXPO-ROUTER');
console.log('🔍 typeof Stack:', typeof Stack);

// Test pour s'assurer qu'on peut accéder aux hooks via React
try {
  console.log('🔍 DEBUG - Test React.useEffect:', typeof React.useEffect);
  console.log('🔍 DEBUG - Test React.useState:', typeof React.useState);
  console.log('🔍 DEBUG - Test React.useCallback:', typeof React.useCallback);
} catch (error) {
  console.error('🚨 DEBUG - Erreur test React hooks:', error);
}

// Test de vérification des globals
console.log('🔍 DEBUG - Vérification globals:');
console.log('🔍 DEBUG - typeof window:', typeof window);
console.log('🔍 DEBUG - typeof global:', typeof global);

export default function AuthLayout() {
  console.log('🔍 DEBUG AuthLayout - DÉBUT DU COMPOSANT');
  console.log('🔍 DEBUG AuthLayout - React disponible:', typeof React);
  console.log('🔍 DEBUG AuthLayout - Stack disponible:', typeof Stack);
  
  // Test si on peut utiliser les hooks React sans les importer directement
  try {
    console.log('🔍 DEBUG AuthLayout - Test disponibilité hooks via React:');
    console.log('🔍 DEBUG - React.useEffect:', typeof React.useEffect);
    console.log('🔍 DEBUG - React.useState:', typeof React.useState);
  } catch (error) {
    console.error('🚨 DEBUG AuthLayout - Erreur test hooks React:', error);
  }
  
  console.log('🔍 DEBUG AuthLayout - Rendu du Stack');
  console.log('🔍 DEBUG AuthLayout - Configuration des écrans');
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        contentStyle: {
          backgroundColor: '#fff',
        },
        presentation: 'card',
      }}
    >
      {/* ✅ Écrans d'authentification qui existent réellement */}
      <Stack.Screen 
        name="login" 
        options={{
          title: 'Connexion',
          gestureEnabled: false, // Éviter le retour par geste
        }} 
      />
      
      <Stack.Screen 
        name="signup" 
        options={{
          title: 'Inscription',
          gestureEnabled: true,
        }} 
      />
      
      <Stack.Screen 
        name="register" 
        options={{
          title: 'Inscription',
          gestureEnabled: true,
        }} 
      />
      
      <Stack.Screen 
        name="client-register" 
        options={{
          title: 'Inscription Client',
          gestureEnabled: true,
        }} 
      />
      
      <Stack.Screen 
        name="fourmiz-register" 
        options={{
          title: 'Inscription Fourmiz',
          gestureEnabled: true,
        }} 
      />
      
      <Stack.Screen 
        name="recovery" 
        options={{
          title: 'Récupération de mot de passe',
          gestureEnabled: true,
        }} 
      />
      
      <Stack.Screen 
        name="recovery-redirect" 
        options={{
          title: 'Redirection Récupération',
          gestureEnabled: false,
        }} 
      />
      
      <Stack.Screen 
        name="forgotPassword" 
        options={{
          title: 'Mot de passe oublié',
          gestureEnabled: true,
        }} 
      />
      
      <Stack.Screen 
        name="updatePassword" 
        options={{
          title: 'Nouveau mot de passe',
          gestureEnabled: false,
        }} 
      />
      
      <Stack.Screen 
        name="complete-profile" 
        options={{
          title: 'Compléter le profil',
          gestureEnabled: false, // Étape obligatoire
        }} 
      />
    </Stack>
  );
}

console.log('🔍 DEBUG AuthLayout - Stack configuré, retour du JSX');
console.log('🔍 DEBUG auth/_layout.tsx - COMPOSANT DÉFINI, export en cours');
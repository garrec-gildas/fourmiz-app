// app/(auth)/_layout.tsx - LAYOUT AUTHENTIFICATION FINAL
import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
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
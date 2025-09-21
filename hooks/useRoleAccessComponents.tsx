// hooks/useRoleAccessComponents.tsx - COMPOSANTS REACT POUR LE CONTRÔLE D'ACCÈS
// 🔐 Composants visuels séparés du hook logique
// 🚀 À utiliser avec useRoleAccess.ts

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRoleAccess, AppRole } from './useRoleAccess';

// Interface pour les props des composants
interface RoleAccessComponentsProps {
  requiredRole: AppRole;
}

// Hook qui combine la logique et les composants
export const useRoleAccessWithComponents = (requiredRole: AppRole) => {
  const roleAccessData = useRoleAccess(requiredRole);

  // Composant d'écran de chargement 
  const LoadingScreen = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4444" />
        <Text style={styles.loadingText}>{roleAccessData.loadingMessage}</Text>
      </View>
    </SafeAreaView>
  );

  // Composant d'écran de restriction
  const AccessDeniedScreen = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.restrictedContainer}>
        <Ionicons name="lock-closed-outline" size={64} color="#ef4444" />
        <Text style={styles.restrictedTitle}>{roleAccessData.roleInfo.title}</Text>
        <Text style={styles.restrictedText}>{roleAccessData.roleInfo.description}</Text>
        
        <View style={styles.restrictedActions}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={16} color="#6b7280" />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>

          {roleAccessData.canSwitchRole ? (
            <TouchableOpacity 
              style={[styles.switchButton, { backgroundColor: roleAccessData.roleInfo.buttonColor }]}
              onPress={() => router.replace('/(Tabs)')}
            >
              <Ionicons name={roleAccessData.roleInfo.icon as any} size={16} color="#fff" />
              <Text style={styles.switchButtonText}>{roleAccessData.roleInfo.switchText}</Text>
            </TouchableOpacity>
          ) : roleAccessData.canRequestOtherRole === requiredRole ? (
            <TouchableOpacity 
              style={[styles.becomeButton, { backgroundColor: '#059669' }]}
              onPress={() => router.push(`${roleAccessData.roleInfo.completeProfileRoute}?from=${encodeURIComponent(router.pathname || '')}`)}
            >
              <Ionicons name="add-circle" size={16} color="#fff" />
              <Text style={styles.becomeButtonText}>{roleAccessData.roleInfo.becomeText}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.homeButton, { backgroundColor: '#6b728020' }]}
              onPress={() => router.replace('/(Tabs)')}
            >
              <Ionicons name="home" size={16} color="#6b7280" />
              <Text style={styles.homeButtonText}>Accueil</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>
            {roleAccessData.benefitsTitle}
          </Text>
          <View style={styles.benefitsList}>
            {roleAccessData.benefits.map((benefit, index) => (
              <Text key={index} style={styles.benefitItem}>{benefit}</Text>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );

  return {
    ...roleAccessData,
    LoadingScreen,
    AccessDeniedScreen,
  };
};

// Styles pour les écrans de contrôle d'accès
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#fff',
  },
  restrictedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  restrictedText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  restrictedActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 300,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  switchButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  switchButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  becomeButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  becomeButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  homeButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  homeButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  benefitsContainer: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    marginTop: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
});

export default useRoleAccessWithComponents;
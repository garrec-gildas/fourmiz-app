import { SafeAreaView, Text, TouchableOpacity, StyleSheet, View, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import React, { useState } from 'react';

export default function RegisterSelectorScreen() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const proceed = () => {
    if (selectedRoles.length === 0) {
      return Alert.alert('Erreur', 'Veuillez sélectionner au moins un rôle.');
    }
    router.push({
      pathname: '/auth/complete-profile',
      params: { roles: selectedRoles.join(',') },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 📱 Logo et titre */}
      <View style={styles.logoSection}>
        <Image
          source={require('../../assets/logo-fourmiz.gif')}
          style={styles.logo}
          onError={() => console.log('❌ Erreur chargement logo register')}
        />
        <Text style={styles.appName}>Fourmiz</Text>
      </View>

      <Text style={styles.title}>Créer un compte</Text>
      <Text style={styles.subtitle}>Choisissez votre ou vos statuts :</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, selectedRoles.includes('client') && styles.selected]}
          onPress={() => toggleRole('client')}
        >
          <Text style={[styles.buttonText, selectedRoles.includes('client') && styles.selectedText]}>
            Devenir Client 🛒
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, selectedRoles.includes('fourmiz') && styles.selectedFourmiz]}
          onPress={() => toggleRole('fourmiz')}
        >
          <Text style={[styles.buttonText, selectedRoles.includes('fourmiz') && styles.selectedText]}>
            Devenir Fourmiz 🐜
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.helpText}>
        💡 Vous pouvez sélectionner les deux rôles
      </Text>

      <TouchableOpacity style={styles.proceedButton} onPress={proceed}>
        <Text style={styles.proceedText}>Continuer</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/auth/login')} style={styles.link}>
        <Text style={styles.linkText}>Déjà inscrit ? Se connecter</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    backgroundColor: '#fff' 
  },
  // 📱 Section logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
    borderRadius: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FF3C38', 
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: { 
    fontSize: 16, 
    color: '#333', 
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: { 
    width: '100%',
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f8f9fa',
  },
  selected: {
    backgroundColor: '#FF3C38',
    borderColor: '#FF3C38',
  },
  selectedFourmiz: {
    backgroundColor: '#FFA500',
    borderColor: '#FFA500',
  },
  buttonText: { 
    color: '#333', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  selectedText: {
    color: '#fff',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  proceedButton: {
    marginTop: 24,
    backgroundColor: '#FF4444',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  proceedText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  link: { 
    marginTop: 30 
  },
  linkText: { 
    color: '#555', 
    textDecorationLine: 'underline' 
  },
});

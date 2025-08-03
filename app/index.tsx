// app/index.tsx - VRAIE PAGE D'ACCUEIL
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function PublicWelcomeScreen() {
  console.log('🏠 Page d\'accueil rendue');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/logo-fourmiz.gif')}
          style={styles.logo}
          onError={() => console.log('❌ Erreur chargement logo index')}
        />
        <Text style={styles.title}>FOURMIZ</Text>
        <Text style={styles.subtitle}>La fourmilière des petits services</Text>
      </View>

      <Text style={styles.description}>
        Des services à portée de clic. Trouvez ou proposez de l'aide en quelques secondes.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          console.log('🚀 Navigation vers login depuis page d\'accueil');
          router.push('/auth/login');
        }}
      >
        <Text style={styles.buttonText}>Entrer dans la fourmilière</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  description: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginVertical: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#FF4444',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
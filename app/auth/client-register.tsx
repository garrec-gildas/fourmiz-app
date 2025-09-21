import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

export default function ClientRegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = useCallback(async () => {
    if (!email.trim() || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      if (error) {
        console.error('❌ Erreur inscription:', error);
        throw error;
      }

      console.log('✅ Inscription réussie');
      Alert.alert('Succès', 'Compte client créé. Veuillez compléter votre profil.');
      router.replace('/auth/complete-profile');
    } catch (err: any) {
      console.error('❌ Erreur:', err);
      
      let errorMessage = "Échec de l'inscription";
      if (err.message?.includes('already registered')) {
        errorMessage = 'Cette adresse email est déjà utilisée';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Inscription Client</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput 
          style={styles.input}
          placeholder="ex: client@mail.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput 
          style={styles.input}
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleRegister} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Créer mon compte</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/auth/login')} style={styles.link}>
          <Text style={styles.linkText}>Déjà inscrit ? Se connecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  label: { marginTop: 16, fontSize: 16, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#FF3C38',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#FFB3B3',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#555', textDecorationLine: 'underline' },
});
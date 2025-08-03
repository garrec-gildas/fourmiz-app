import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  console.log('LoginScreen rendered');

  const handleLogin = async () => {
    setLoading(true);
    console.log('Attempting login with email:', email);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error);
      Alert.alert('Erreur', error.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    console.log('User fetched:', user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
    }

    if (profile?.role === 'client' || profile?.role === 'fourmiz') {
      await AsyncStorage.setItem('savedRole', profile.role);
      console.log('Saved role:', profile.role);
    }

    router.replace('/');
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require('../../assets/logo-fourmiz.gif')}
        style={styles.logo}
        resizeMode="contain"
        onLoad={() => console.log('Logo loaded')}
        onError={(e) => console.error('Logo load error:', e.nativeEvent.error)}
      />
      <Text style={styles.title}>Bienvenue sur Fourmiz</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Se connecter</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/auth/register')}
        style={styles.linkContainer}
      >
        <Text style={styles.linkText}>Pas encore inscrit ? Créez un compte</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async () => {
          await AsyncStorage.multiRemove(['isLoggedIn', 'userSession', 'savedRole']);
          Alert.alert('Session effacée', 'Veuillez réessayer de vous connecter.');
        }}
        style={styles.linkContainer}
      >
        <Text style={styles.linkText}>Effacer la session</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  logo: {
    width: 160,
    height: 80,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
    color: '#FF3C38',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#FF3C38',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#555',
    textDecorationLine: 'underline',
  },
});

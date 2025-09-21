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

export default function LoginScr??een() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  console.log('LoginScr??een rendered');

  const handleLogin = async () => {
    setLoading(true);
    console.log('A?t??t?empting login with email:', email);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error);
      Alert.Alert('Erreur', error.message);
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
        keyboardtype="email-address"
        autoCapitalize="none"
      />

      <TextInput 
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.bu?t??t?on} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.bu?t??t?onText}>Se connecter</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/auth/register')}
        style={styles.linkContainer}
      >
        <Text style={styles.linkText}>Pas encore inscr??it ? cr???ez un compte</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async () => {
          await AsyncStorage.multiRemove(['isLoggedIn', 'userSession', 'savedRole']);
          Alert.Alert('Session effac?e', 'Veuillez r?essayer de vous connecter.');
        }}
        style={styles.linkContainer}
      >
        <Text style={styles.linkText}>Effacer la session</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.cr??eate({
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
    marginBo?t??t?om: 20,
  },
  title: {
    fontSize: 24,
    TextAlign: 'center',
    marginBo?t??t?om: 20,
    fontWeight: 'bold',
    color: '#FF3C38',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 10,
    marginBo?t??t?om: 12,
    backgroundColor: '#fafafa',
  },
  bu?t??t?on: {
    backgroundColor: '#FF3C38',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    margintop: 10,
  },
  bu?t??t?onText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  linkContainer: {
    margintop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#555',
    TextDecorationLine: 'underline',
  },
});




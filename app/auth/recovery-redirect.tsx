import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RecoveryRedirectScreen() {
  const { type, access_token } = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<'verifying' | 'reset' | 'done' | 'error'>('verifying');

  useEffect(() => {
    const restoreSession = async () => {
      if (type === 'recovery' && access_token) {
        const { error } = await supabase.auth.setSession({
          access_token: access_token as string,
          refresh_token: '',
        });
        if (error) {
          setStage('error');
        } else {
          setStage('reset');
        }
        setLoading(false);
      } else {
        setStage('error');
        setLoading(false);
      }
    };
    restoreSession();
  }, [access_token, type]);

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      Alert.alert('Erreur', error.message);
      setLoading(false);
      return;
    }

    Alert.alert('Succès', 'Votre mot de passe a été mis à jour.');
    setStage('done');
    setLoading(false);
    router.replace('/auth/login');
  };

  if (loading || stage === 'verifying') {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF3C38" />
        <Text style={styles.text}>Vérification du lien...</Text>
      </SafeAreaView>
    );
  }

  if (stage === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={[styles.text, { color: 'red' }]}>
          Le lien est invalide ou a expiré.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Définir un nouveau mot de passe</Text>
      <TextInput 
        placeholder="Nouveau mot de passe"
        secureTextEntry
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handlePasswordUpdate} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Mettre à jour</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  text: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#FF3C38',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#FF3C38',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
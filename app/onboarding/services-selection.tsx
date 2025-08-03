import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ServicesSelectionScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🛠️ Sélection des services</Text>
      <Text style={styles.subtitle}>Choisissez vos services...</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center' },
});

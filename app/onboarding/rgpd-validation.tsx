import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RgpdValidationScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>?? Validation RGPD</Text>
      <Text style={styles.subtitle}>Acceptation des conditions...</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center' },
});

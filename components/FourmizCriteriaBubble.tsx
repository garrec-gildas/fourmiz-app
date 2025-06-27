import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Filter } from 'lucide-react-native';
import { router } from 'expo-router';

export default function FourmizCriteriaBubble() {
  const handlePress = () => {
    router.push('/fourmiz-criteria');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Filter size={20} color="#2196F3" />
      <View style={styles.content}>
        <Text style={styles.title}>Mes critères de mission</Text>
        <Text style={styles.description}>
          Définissez vos préférences de services, disponibilités, rayon d'action et tarifs pour recevoir uniquement les demandes qui vous correspondent.{' '}
          <Text style={styles.link}>Personnaliser mes critères</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    lineHeight: 18,
  },
  link: {
    fontFamily: 'Inter-SemiBold',
    textDecorationLine: 'underline',
  },
});
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Shield, Info } from 'lucide-react-native';
import { router } from 'expo-router';

export default function ClientRatingInfo() {
  const handlePress = () => {
    // Naviguer vers une page d'information sur le système de notation
    router.push('/rating-info');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Shield size={20} color="#4CAF50" />
      <View style={styles.content}>
        <Text style={styles.title}>Système de notation confidentiel</Text>
        <Text style={styles.description}>
          En tant que Fourmiz, vous pouvez évaluer vos clients après chaque mission. Ces notes sont visibles uniquement par les Fourmiz et aident à améliorer la qualité de notre communauté.{' '}
          <Text style={styles.link}>En savoir plus</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
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
    color: '#4CAF50',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#4CAF50',
    lineHeight: 18,
  },
  link: {
    fontFamily: 'Inter-SemiBold',
    textDecorationLine: 'underline',
  },
});
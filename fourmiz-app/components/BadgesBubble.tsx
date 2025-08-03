import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Award } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function BadgesBubble() {
  const { mode } = useLocalSearchParams();
  const isFourmizMode = mode === 'fourmiz';

  const handlePress = () => {
    router.push('/badges');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Award size={20} color="#FFD700" />
      <View style={styles.content}>
        <Text style={styles.title}>Mes Badges et Récompenses</Text>
        <Text style={styles.description}>
          Découvrez les badges que vous avez débloqués grâce à votre activité. 
          {isFourmizMode ? (
            ' Gagnez des récompenses en atteignant vos objectifs de missions !'
          ) : (
            ' Gagnez des récompenses en atteignant vos objectifs de commandes !'
          )}{' '}
          <Text style={styles.link}>Voir ma collection</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
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
    color: '#F57C00',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#F57C00',
    lineHeight: 18,
  },
  link: {
    fontFamily: 'Inter-SemiBold',
    textDecorationLine: 'underline',
  },
});


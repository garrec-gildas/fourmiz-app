import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Users, Wallet } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function ReferralBubble() {
  const { mode } = useLocalSearchParams();
  const isFourmizMode = mode === 'fourmiz';

  const handlePress = () => {
    router.push('/referral');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.iconContainer}>
        <Wallet size={20} color="#FF4444" style={styles.walletIcon} />
        <Users size={20} color="#FF4444" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Fourmiz Friends</Text>
        <Text style={styles.description}>
          {isFourmizMode ? (
            <>
              Parrainez vos amis et gagnez 3€ à la première commande ou de service de votre filleul + 2,5% sur toutes leurs commissions à vie ! En tant que Fourmiz, vous gagnez 80% sur chaque vente, 2,5% sur les commissions de vos filleuls et des récompenses mensuelles grâce aux badges !{' '}
            </>
          ) : (
            <>
              Parrainez vos amis et gagnez 3€ à la première commande ou de service de votre filleul + 2,5% sur toutes leurs commissions à vie ! Vous recevrez également 2,5% sur les commissions de vos filleuls et des récompenses mensuelles grâce aux badges !{' '}
            </>
          )}
          <Text style={styles.link}>Cliquez ici pour en savoir plus !</Text>
          {'\n\n'}
          Transformez votre réseau en revenus avec Fourmiz Friends !
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    flexDirection: 'row',
    marginRight: 12,
  },
  walletIcon: {
    marginRight: -8,
    marginTop: -2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FF4444',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 18,
  },
  link: {
    color: '#FF4444',
    fontFamily: 'Inter-SemiBold',
    textDecorationLine: 'underline',
  },
});
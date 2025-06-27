import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FileText } from 'lucide-react-native';
import { router } from 'expo-router';

export default function TaxAttestationBubble() {
  const handlePress = () => {
    router.push('/tax-attestation');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <FileText size={20} color="#4CAF50" />
      <View style={styles.content}>
        <Text style={styles.title}>Attestation Fiscale</Text>
        <Text style={styles.description}>
          Obtenez votre attestation fiscale pour bénéficier du crédit d'impôt de 50% sur vos services à domicile. 
          L'attestation est générée automatiquement avec le détail de vos prestations éligibles de l'année précédente.{' '}
          <Text style={styles.link}>Générer mon attestation</Text>
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
// components/OrderCard.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PaymentModal from '@/components/PaymentModal';

interface OrderCardProps {
  orderId: number;
  amount: number;
  description: string;
  // autres props...
}

export default function OrderCard({ orderId, amount, description }: OrderCardProps) {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <View style={styles.card}>
      <Text>{description}</Text>
      <Text>{amount}€</Text>
      
      <TouchableOpacity 
        style={styles.payButton}
        onPress={() => setShowPayment(true)}
      >
        <Text style={styles.payButtonText}>Payer maintenant</Text>
      </TouchableOpacity>

      <PaymentModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        amount={amount}
        description={description}
        onSuccess={() => {
          setShowPayment(false);
          // Logique après paiement réussi
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  payButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  payButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
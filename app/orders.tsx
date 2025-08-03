
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) setOrders(data || []);
      setLoading(false);
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.orderItem}>
            <Text style={styles.orderText}>Commande #{item.id}</Text>
            <Text style={styles.dateText}>
              {item.created_at ? `Passée le ${new Date(item.created_at).toLocaleDateString()}` : 'Date inconnue'}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  orderItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
  },
  orderText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateText: {
    marginTop: 4,
    fontSize: 12,
    color: '#555',
  },
});

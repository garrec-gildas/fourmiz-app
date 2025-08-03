import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';

export default function ServicesScreen() {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*');
        if (error) throw error;
        setServices(data || []);
      } catch (err) {
        console.error('Erreur lors du chargement des services:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  const renderService = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.serviceItem}
      onPress={() => router.push(/(tabs)/services/)}
    >
      <Text style={styles.serviceTitle}>{item.title}</Text>
      <Text style={styles.serviceDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={services}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderService}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  serviceItem: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  serviceTitle: { fontSize: 18, fontWeight: 'bold' },
  serviceDescription: { fontSize: 14, color: '#666' },
});

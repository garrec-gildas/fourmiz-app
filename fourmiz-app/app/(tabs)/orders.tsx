import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Clock, CheckCircle2, ChevronRight, Plus } from 'lucide-react-native';
import { router } from 'expo-router';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'history'>('ongoing');
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      console.log('OrdersScreen fetchData started');
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error('Error fetching user:', error);
        return;
      }
      setUserId(user.id);
      console.log('User fetched:', user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
      }

      setUserRole(profile?.role || null);

      const { data, error: ordersError } = await supabase
        .from('orders')
        .select('*, steps:order_steps(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Orders error:', ordersError);
      }

      if (data) setOrders(data);
      console.log('Orders fetched:', data);
    };

    fetchData();
  }, []);

  const filteredOrders = orders.filter(order =>
    activeTab === 'ongoing'
      ? order.status !== 'Livré' && order.status !== 'Annulée'
      : order.status === 'Livré' || order.status === 'Annulée'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En attente': return '#FFA500';
      case 'Acceptée':
      case 'En route': return '#2196F3';
      case 'Livré': return '#4CAF50';
      case 'Annulée': return '#F44336';
      default: return '#999';
    }
  };

  const renderStepTimeline = (steps: any[]) => {
    return steps
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((step, index) => (
        <View key={index} style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineLabel}>{step.label}</Text>
            <Text style={styles.timelineDate}>
              {new Date(step.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>
      ));
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.serviceTitle}>{item.service_title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.dateText}>
          Commande passée le {new Date(item.created_at).toLocaleDateString()}
        </Text>

        <View style={styles.timeline}>
          {renderStepTimeline(item.steps || [])}
        </View>

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => {
            console.log('Navigating to order details:', item.id);
            // router.push(/orders/)
          }}
        >
          <Text style={styles.detailsText}>Voir les détails</Text>
          <ChevronRight size={18} color="#666" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ongoing' && styles.tabActive]}
          onPress={() => setActiveTab('ongoing')}
        >
          <Text style={activeTab === 'ongoing' ? styles.tabTextActive : styles.tabText}>
            En cours
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={activeTab === 'history' ? styles.tabTextActive : styles.tabText}>
            Historique
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id.toString()}
        renderItem={renderOrderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            {activeTab === 'ongoing' ? (
              <Clock size={64} color="#CCC" />
            ) : (
              <CheckCircle2 size={64} color="#CCC" />
            )}
            <Text style={{ marginTop: 16, fontSize: 16, color: '#999' }}>
              Aucune commande {activeTab === 'ongoing' ? 'en cours' : 'dans lhistorique'}.
            </Text>
          </View>
        }
      />

      {userRole === 'client' && (
        <TouchableOpacity
          onPress={() => {
            console.log('Navigating to /order/create from OrdersScreen');
            router.push('/order/create');
          }}
          style={styles.floatingButton}
        >
          <Plus color="#fff" size={22} />
          <Text style={styles.buttonLabel}>Créer une commande</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabs: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 12 },
  tab: { paddingHorizontal: 20, paddingVertical: 8, marginHorizontal: 6, borderRadius: 20 },
  tabActive: { backgroundColor: '#FF4444' },
  tabText: { fontSize: 14, color: '#666' },
  tabTextActive: { fontSize: 14, fontWeight: '600', color: '#fff' },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  serviceTitle: { fontSize: 16, fontWeight: '600' },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusText: { color: '#fff', fontSize: 12 },
  dateText: { fontSize: 12, color: '#777', marginBottom: 10 },
  timeline: { borderLeftWidth: 2, borderLeftColor: '#DDD', paddingLeft: 12 },
  timelineItem: { flexDirection: 'row', marginBottom: 12 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4444',
    position: 'absolute',
    left: -6,
    top: 4,
  },
  timelineContent: { marginLeft: 12 },
  timelineLabel: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  timelineDate: { fontSize: 12, color: '#888' },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  detailsText: { fontSize: 14, color: '#666', marginRight: 4 },
  floatingButton: {
    flexDirection: 'row',
    backgroundColor: '#FF4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
  },
  buttonLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
});

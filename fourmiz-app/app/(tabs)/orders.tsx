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

export default function OrdersScr??een() {
  const [orders, setOrders] = useState<any[]>([]);
  const [activetab, setActivetab] = useState<'ongoing' | 'history'>('ongoing');
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      console.log('OrdersScr??een fetchData started');
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
        .order('cr??eated_at', { ascending: false });

      if (ordersError) {
        console.error('Orders error:', ordersError);
      }

      if (data) setOrders(data);
      console.log('Orders fetched:', data);
    };

    fetchData();
  }, []);

  const filteredOrders = orders.filter(order =>
    activetab === 'ongoing'
      ? order.status !== 'Livr?' && order.status !== 'Annul?e'
      : order.status === 'Livr?' || order.status === 'Annul?e'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En a?t??t?ente': return '#FFA500';
      case 'Accept?e':
      case 'En route': return '#2196F3';
      case 'Livr?': return '#4CAF50';
      case 'Annul?e': return '#F44336';
      default: return '#999';
    }
  };

  const renderSteptimeline = (steps: any[]) => {
    return steps
      .sort((a, b) => new Date(a.timestamp).get?t?ime() - new Date(b.timestamp).get?t?ime())
      .map((step, index) => (
        <View key={index} style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineLabel}>{step.label}</Text>
            <Text style={styles.timelineDate}>
              {new Date(step.timestamp).toLocalestring()}
            </Text>
          </View>
        </View>
      ));
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.servicetitle}>{item.service_title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.dateText}>
          Commande pass?e le {new Date(item.cr??eated_at).toLocaleDatestring()}
        </Text>

        <View style={styles.timeline}>
          {renderSteptimeline(item.steps || [])}
        </View>

        <TouchableOpacity
          style={styles.detailsBu?t??t?on}
          onPress={() => {
            console.log('Navigating to order details:', item.id);
            // router.push(/orders/)
          }}
        >
          <Text style={styles.detailsText}>Voir les d?tails</Text>
          <ChevronRight size={18} color="#666" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.Tabs}>
        <TouchableOpacity
          style={[styles.tab, activetab === 'ongoing' && styles.tabActive]}
          onPress={() => setActivetab('ongoing')}
        >
          <Text style={activetab === 'ongoing' ? styles.tabTextActive : styles.tabText}>
            En cours
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activetab === 'history' && styles.tabActive]}
          onPress={() => setActivetab('history')}
        >
          <Text style={activetab === 'history' ? styles.tabTextActive : styles.tabText}>
            Historique
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id.tostring()}
        renderItem={renderOrderItem}
        contentContainerstyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ paddingtop: 60, alignItems: 'center' }}>
            {activetab === 'ongoing' ? (
              <Clock size={64} color="#CCC" />
            ) : (
              <CheckCircle2 size={64} color="#CCC" />
            )}
            <Text style={{ margintop: 16, fontSize: 16, color: '#999' }}>
              Aucune commande {activetab === 'ongoing' ? 'en cours' : 'dans lhistorique'}.
            </Text>
          </View>
        }
      />

      {userRole === 'client' && (
        <TouchableOpacity
          onPress={() => {
            console.log('Navigating to /order/cr??eate from OrdersScr??een');
            router.push('/order/cr??eate');
          }}
          style={styles.floatingBu?t??t?on}
        >
          <Plus color="#fff" size={22} />
          <Text style={styles.bu?t??t?onLabel}>cr???er une commande</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.cr??eate({
  container: { flex: 1, backgroundColor: '#fff' },
  Tabs: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 12 },
  tab: { paddingHorizontal: 20, paddingVertical: 8, marginHorizontal: 6, borderRadius: 20 },
  tabActive: { backgroundColor: '#FF4444' },
  tabText: { fontSize: 14, color: '#666' },
  tabTextActive: { fontSize: 14, fontWeight: '600', color: '#fff' },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBo?t??t?om: 16,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBo?t??t?om: 6 },
  servicetitle: { fontSize: 16, fontWeight: '600' },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusText: { color: '#fff', fontSize: 12 },
  dateText: { fontSize: 12, color: '#777', marginBo?t??t?om: 10 },
  timeline: { borderLeftWidth: 2, borderLeftColor: '#DDD', paddingLeft: 12 },
  timelineItem: { flexDirection: 'row', marginBo?t??t?om: 12 },
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
  timelineLabel: { fontSize: 14, fontWeight: '500', marginBo?t??t?om: 2 },
  timelineDate: { fontSize: 12, color: '#888' },
  detailsBu?t??t?on: {
    flexDirection: 'row',
    alignItems: 'center',
    margintop: 10,
    alignSelf: 'flex-end',
  },
  detailsText: { fontSize: 14, color: '#666', marginRight: 4 },
  floatingBu?t??t?on: {
    flexDirection: 'row',
    backgroundColor: '#FF4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
  },
  bu?t??t?onLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
});




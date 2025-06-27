import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Download, Calendar, TrendingUp, TrendingDown, Plus, Minus, CircleCheck as CheckCircle, Clock, TriangleAlert as AlertTriangle, Euro } from 'lucide-react-native';

// Mock data pour les transactions
const mockTransactions = [
  {
    id: '1',
    type: 'earning',
    description: 'Commission - Livraison de courses',
    amount: 12.50,
    status: 'completed',
    date: '2024-12-20T14:30:00Z',
    reference: 'TXN-001',
  },
  {
    id: '2',
    type: 'withdrawal',
    description: 'Retrait vers compte bancaire',
    amount: -50.00,
    status: 'pending',
    date: '2024-12-19T10:15:00Z',
    reference: 'WTH-002',
  },
  {
    id: '3',
    type: 'earning',
    description: 'Bonus parrainage - Sophie M.',
    amount: 3.00,
    status: 'completed',
    date: '2024-12-18T16:45:00Z',
    reference: 'BON-003',
  },
  {
    id: '4',
    type: 'deposit',
    description: 'Crédit de compte',
    amount: 25.00,
    status: 'completed',
    date: '2024-12-17T09:20:00Z',
    reference: 'DEP-004',
  },
  {
    id: '5',
    type: 'earning',
    description: 'Commission - Montage meuble',
    amount: 28.00,
    status: 'completed',
    date: '2024-12-15T11:30:00Z',
    reference: 'TXN-005',
  },
  {
    id: '6',
    type: 'withdrawal',
    description: 'Retrait vers compte bancaire',
    amount: -75.00,
    status: 'completed',
    date: '2024-12-10T14:20:00Z',
    reference: 'WTH-006',
  },
  {
    id: '7',
    type: 'earning',
    description: 'Commission - Garde d\'enfants',
    amount: 18.50,
    status: 'completed',
    date: '2024-12-08T18:15:00Z',
    reference: 'TXN-007',
  },
  {
    id: '8',
    type: 'deposit',
    description: 'Crédit de compte',
    amount: 50.00,
    status: 'completed',
    date: '2024-12-05T10:45:00Z',
    reference: 'DEP-008',
  },
  {
    id: '9',
    type: 'withdrawal',
    description: 'Retrait vers compte bancaire',
    amount: -30.00,
    status: 'failed',
    date: '2024-12-03T09:10:00Z',
    reference: 'WTH-009',
  },
  {
    id: '10',
    type: 'earning',
    description: 'Commission - Promenade de chien',
    amount: 15.00,
    status: 'completed',
    date: '2024-12-01T16:30:00Z',
    reference: 'TXN-010',
  },
];

const transactionTypeConfig = {
  earning: { 
    label: 'Gain', 
    color: '#4CAF50', 
    icon: TrendingUp,
    bgColor: '#E8F5E8'
  },
  deposit: { 
    label: 'Crédit', 
    color: '#2196F3', 
    icon: Plus,
    bgColor: '#E3F2FD'
  },
  withdrawal: { 
    label: 'Retrait', 
    color: '#FF9800', 
    icon: Minus,
    bgColor: '#FFF3E0'
  },
};

const statusConfig = {
  completed: { label: 'Terminé', color: '#4CAF50', icon: CheckCircle },
  pending: { label: 'En attente', color: '#FF9800', icon: Clock },
  failed: { label: 'Échoué', color: '#F44336', icon: AlertTriangle },
};

export default function TransactionsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Filtrer les transactions
  const filteredTransactions = mockTransactions.filter(transaction => {
    // Filtre par recherche
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          transaction.reference.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filtre par type
    const matchesType = selectedFilter === 'all' || transaction.type === selectedFilter;
    
    // Filtre par statut
    const matchesStatus = selectedStatus === 'all' || transaction.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExport = () => {
    // Logique d'export des transactions
    console.log('Exporting transactions...');
  };

  const renderTransaction = ({ item }: { item: any }) => {
    const typeConfig = transactionTypeConfig[item.type as keyof typeof transactionTypeConfig];
    const statusInfo = statusConfig[item.status as keyof typeof statusConfig];
    const TypeIcon = typeConfig.icon;
    const StatusIcon = statusInfo.icon;

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <View style={[styles.transactionIcon, { backgroundColor: typeConfig.bgColor }]}>
              <TypeIcon size={20} color={typeConfig.color} />
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionDescription}>{item.description}</Text>
              <View style={styles.transactionMeta}>
                <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
                <View style={styles.transactionStatus}>
                  <StatusIcon size={12} color={statusInfo.color} />
                  <Text style={[styles.transactionStatusText, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.transactionReference}>Réf: {item.reference}</Text>
            </View>
          </View>
          <Text style={[
            styles.transactionAmount,
            { color: item.amount > 0 ? '#4CAF50' : '#FF9800' }
          ]}>
            {item.amount > 0 ? '+' : ''}{item.amount.toFixed(2)}€
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historique des transactions</Text>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Download size={24} color="#FF4444" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher une transaction..."
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterTabsContainer}>
            <Text style={styles.filterLabel}>Type:</Text>
            {[
              { key: 'all', label: 'Tout' },
              { key: 'earning', label: 'Gains' },
              { key: 'deposit', label: 'Crédits' },
              { key: 'withdrawal', label: 'Retraits' },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterTab,
                  selectedFilter === filter.key && styles.filterTabActive
                ]}
                onPress={() => setSelectedFilter(filter.key)}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedFilter === filter.key && styles.filterTabTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.statusTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterTabsContainer}>
            <Text style={styles.filterLabel}>Statut:</Text>
            {[
              { key: 'all', label: 'Tout' },
              { key: 'completed', label: 'Terminé' },
              { key: 'pending', label: 'En attente' },
              { key: 'failed', label: 'Échoué' },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterTab,
                  selectedStatus === filter.key && styles.filterTabActive
                ]}
                onPress={() => setSelectedStatus(filter.key)}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedStatus === filter.key && styles.filterTabTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Transactions List */}
      <View style={styles.transactionsContainer}>
        <View style={styles.transactionsHeader}>
          <Text style={styles.transactionsTitle}>
            {filteredTransactions.length} transaction{filteredTransactions.length > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity style={styles.calendarButton}>
            <Calendar size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredTransactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.transactionsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Euro size={64} color="#DDD" />
              <Text style={styles.emptyTitle}>Aucune transaction</Text>
              <Text style={styles.emptySubtitle}>
                Aucune transaction ne correspond à vos critères de recherche
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  exportButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
    marginLeft: 12,
  },
  filterButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  filterTabs: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  statusTabs: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  filterTabActive: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  transactionsContainer: {
    flex: 1,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  transactionsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  calendarButton: {
    padding: 8,
  },
  transactionsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  transactionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionStatusText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  transactionReference: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
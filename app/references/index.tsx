import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface Reference {
  id: string;
  title: string;
  category: string;
  description?: string;
  photo_urls: string[];
  created_at: string;
  user_id: string;
}

const ReferencesIndex = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [isLoadingReferences, setIsLoadingReferences] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && userId) {
        loadReferences();
      }
    }, [isAuthenticated, userId])
  );

  const checkAuthentication = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        setIsAuthenticated(false);
        Alert.alert('Erreur', 'Vous devez être connecté');
        router.replace('/(tabs)/profile');
        return;
      }

      setUserId(user.id);
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
      Alert.alert('Erreur', 'Problème d\'authentification');
      router.replace('/(tabs)/profile');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReferences = async () => {
    if (!userId) return;

    setIsLoadingReferences(true);
    try {
      const { data, error } = await supabase
        .from('user_references')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement références:', error);
        Alert.alert('Erreur', 'Impossible de charger les références');
        return;
      }

      console.log(`📋 [ReferencesIndex] ${data?.length || 0} références chargées`);
      setReferences(data || []);
    } catch (error) {
      console.error('Exception chargement références:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setIsLoadingReferences(false);
    }
  };

  const deleteReference = async (id: string) => {
    Alert.alert(
      'Supprimer la référence',
      'Êtes-vous sûr de vouloir supprimer cette référence ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_references')
                .delete()
                .eq('id', id);

              if (error) {
                Alert.alert('Erreur', 'Impossible de supprimer la référence');
                return;
              }

              loadReferences();
            } catch (error) {
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          }
        }
      ]
    );
  };

  const renderImage = (uri: string, index: number) => {
    console.log(`🖼️ [Image] Tentative affichage:`, uri.substring(0, 50) + '...');
    
    return (
      <Image
        key={index}
        source={{ uri }}
        style={styles.referenceImage}
        onLoad={() => console.log(`✅ [Image] Succès chargement:`, uri.substring(0, 50) + '...')}
        onError={(error) => console.log(`❌ [Image] Erreur chargement:`, error.nativeEvent.error, uri.substring(0, 50) + '...')}
        resizeMode="cover"
      />
    );
  };

  const renderReference = ({ item }: { item: Reference }) => {
    console.log(`🎯 [Reference] Rendu référence "${item.title}" avec ${item.photo_urls?.length || 0} images`);
    
    return (
      <TouchableOpacity 
        style={styles.referenceCard}
        onPress={() => router.push(`/references/edit/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.referenceHeader}>
          <View style={styles.referenceInfo}>
            <Text style={styles.referenceTitle}>{item.title}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            {item.description && (
              <Text style={styles.referenceDescription}>{item.description}</Text>
            )}
          </View>

          <View style={styles.referenceActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/references/edit/${item.id}`);
              }}
            >
              <Text style={styles.editButtonText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                deleteReference(item.id);
              }}
            >
              <Text style={styles.deleteButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AFFICHAGE DE TOUTES LES IMAGES */}
        {item.photo_urls && item.photo_urls.length > 0 && (
          <View style={styles.imagesContainer}>
            <Text style={styles.imagesLabel}>
              Images ({item.photo_urls.length})
            </Text>
            <View style={styles.imagesGrid}>
              {item.photo_urls.map((uri, index) => renderImage(uri, index))}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Non authentifié</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/(tabs)/profile')}>
            <Text style={styles.retryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* BOUTON RETOUR IDENTIQUE À LA PAGE CRITÈRES */}
        <TouchableOpacity 
          onPress={() => router.replace('/(tabs)/profile')}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Mes Références</Text>
        
        {/* BOUTON AJOUTER GRISÉ */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/references/add')}
        >
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {isLoadingReferences ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000000" />
            <Text style={styles.loadingText}>Chargement des références...</Text>
          </View>
        ) : references.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune référence trouvée</Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => router.push('/references/add')}
            >
              <Text style={styles.addFirstButtonText}>Créer votre première référence</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={references}
            renderItem={renderReference}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '400',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  errorText: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '400',
  },
  retryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  // BOUTON AJOUTER GRISÉ (identique au style editButton de criteria.tsx)
  addButton: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 80,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 24,
    gap: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    gap: 24,
  },
  emptyText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },
  addFirstButton: {
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  referenceCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 20,
    gap: 16,
  },
  referenceHeader: {
    gap: 12,
  },
  referenceInfo: {
    gap: 8,
  },
  referenceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  categoryBadge: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666666',
  },
  referenceDescription: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
    lineHeight: 18,
  },
  referenceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deleteButtonText: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '600',
  },
  imagesContainer: {
    gap: 8,
  },
  imagesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  imagesGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  referenceImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  moreImagesOverlay: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ReferencesIndex;
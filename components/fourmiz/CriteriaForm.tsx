// components/fourmiz/CriteriaForm.tsx - VERSION ADAPTÉE
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { FOURMIZ_CRITERIA } from '@/constants/fourmiz-criteria';

// types adaptés à la nouvelle structure
interface FourmizCriteriaAdapted {
  user_id: string;
  
  // RGPD obligatoires
  rgpd_accepte_cgu: boolean;
  rgpd_accepte_politique_confidentialite: boolean;
  rgpd_accepte_traitement_donnees: boolean;
  rgpd_newsletter_marketing: boolean;
  rgpd_notifications_push_marketing: boolean;
  rgpd_date_acceptation?: string;
  rgpd_ip_acceptation?: string;
  
  // Services
  categories_completes: string[];
  selected_service_ids: number[];
  
  // Transport 
  transport_moyens: string[];
  rayon_deplacement_km: number;
  
  // Disponibilités
  disponibilites_horaires_detaillees: string[];
  
  // Tarifs
  prix_minimum_heure: number;
  note_client_minimum: number;
  
  // Mots-clés
  mots_cles_notifications: string[];
  
  // Expérience
  experience_niveau?: string;
  experience_langues: string[];
  
  // Localisation
  location?: string;
  
  // Métadonnées
  is_active: boolean;
  is_available: boolean;
}

interface Props {
  userId?: string;
  onSave?: (data: Partial<FourmizCriteriaAdapted>) => void;
}

interface RgpdState {
  cgu: boolean;
  politique: boolean;
  donnees: boolean;
  newsletter: boolean;
  notifications: boolean;
}

export default function CriteriaForm({ userId, onSave }: Props) {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // États pour les services
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  
  // États pour les autres critères
  const [transportMoyens, setTransportMoyens] = useState<string[]>([]);
  const [disponibilites, setDisponibilites] = useState<string[]>([]);
  const [prixMinimum, setPrixMinimum] = useState(15);
  const [rayonMax, setRayonMax] = useState(5);
  const [motsCles, setMotsCles] = useState('');
  const [noteClientMin, setNoteClientMin] = useState(4.0);
  const [location, setLocation] = useState('');

  // RGPD obligatoires
  const [rgpdAccepte, setRgpdAccepte] = useState<RgpdState>({
    cgu: false,
    politique: false,
    donnees: false,
    newsletter: false,
    notifications: false,
  });

  useEffect(() => {
    loadUserAndCriteria();
  }, []);

  const loadUserAndCriteria = async (): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user) {
        await loadExistingCriteria(user.id);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const loadExistingCriteria = async (userIdParam: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('fourmiz_criteria')
        .select('*')
        .eq('user_id', userIdParam)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Charger les nouveaux champs
        setSelectedCategories(data.categories_completes || []);
        setSelectedServiceIds(data.selected_service_ids || []);
        setTransportMoyens(data.transport_moyens || []);
        setDisponibilites(data.disponibilites_horaires_detaillees || []);
        setPrixMinimum(data.prix_minimum_heure || 15);
        setRayonMax(data.rayon_deplacement_km || 5);
        setMotsCles(data.mots_cles_notifications?.join(', ') || '');
        setNoteClientMin(data.note_client_minimum || 4.0);
        setLocation(data.location || '');
        
        // Charger RGPD
        setRgpdAccepte({
          cgu: data.rgpd_accepte_cgu || false,
          politique: data.rgpd_accepte_politique_confidentialite || false,
          donnees: data.rgpd_accepte_traitement_donnees || false,
          newsletter: data.rgpd_newsletter_marketing || false,
          notifications: data.rgpd_notifications_push_marketing || false,
        });
      }
    } catch (error) {
      console.error('Erreur chargement critères:', error);
    }
  };

  const handleCategoryToggle = (categoryKey: string): void => {
    setSelectedCategories(prev => 
      prev.includes(categoryKey)
        ? prev.filter(c => c !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  const handleServiceToggle = (serviceId: number): void => {
    setSelectedServiceIds(prev => 
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const toggleTransport = (transportKey: string): void => {
    setTransportMoyens(prev => 
      prev.includes(transportKey)
        ? prev.filter(t => t !== transportKey)
        : [...prev, transportKey]
    );
  };

  const toggleDisponibilite = (disponibiliteKey: string): void => {
    setDisponibilites(prev => 
      prev.includes(disponibiliteKey)
        ? prev.filter(d => d !== disponibiliteKey)
        : [...prev, disponibiliteKey]
    );
  };

  const updateRgpdState = (key: keyof RgpdState, value: boolean): void => {
    setRgpdAccepte(prev => ({ ...prev, [key]: value }));
  };

  const saveCriteria = async (): Promise<void> => {
    if (!currentUser) {
      Alert.alert('Erreur', 'Vous devez être connecté pour sauvegarder');
      return;
    }

    // Vérification RGPD obligatoire
    if (!rgpdAccepte.cgu || !rgpdAccepte.politique || !rgpdAccepte.donnees) {
      Alert.alert('RGPD requis', 'Vous devez accepter les conditions obligatoires');
      return;
    }

    setLoading(true);

    try {
      const criteriaData: Partial<FourmizCriteriaAdapted> = {
        user_id: currentUser.id,
        
        // RGPD
        rgpd_accepte_cgu: rgpdAccepte.cgu,
        rgpd_accepte_politique_confidentialite: rgpdAccepte.politique,
        rgpd_accepte_traitement_donnees: rgpdAccepte.donnees,
        rgpd_newsletter_marketing: rgpdAccepte.newsletter,
        rgpd_notifications_push_marketing: rgpdAccepte.notifications,
        rgpd_date_acceptation: new Date().toISOString(),
        rgpd_ip_acceptation: 'mobile-app',
        
        // Services (NOUVEAU : utilise les vrais champs)
        categories_completes: selectedCategories,
        selected_service_ids: selectedServiceIds,
        
        // Transport 
        transport_moyens: transportMoyens,
        rayon_deplacement_km: rayonMax,
        
        // Disponibilités
        disponibilites_horaires_detaillees: disponibilites,
        
        // Tarifs
        prix_minimum_heure: prixMinimum,
        note_client_minimum: noteClientMin,
        
        // Mots-clés
        mots_cles_notifications: motsCles.split(',').map(m => m.trim()).filter(Boolean),
        
        // Localisation
        location: location,
        
        // Status
        is_active: true,
        is_available: true,
      };

      // Utilisation de la contrainte UNIQUE pour upsert 
      const { error } = await supabase
        .from('fourmiz_criteria')
        .upsert(criteriaData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      Alert.alert('Succès', 'Vos critères ont été sauvegardés !');
      onSave?.(criteriaData);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder vos critères');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Configurez vos critères</Text>
          <Text style={styles.subtitle}>
            📝 Définissez vos préférences pour recevoir les missions qui vous correspondent 
          </Text>
        </View>

        {/* RGPD - Section obligatoire */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Acceptation obligatoire (RGPD)</Text>
          
          <View style={styles.checkboxRow}>
            <Switch
              value={rgpdAccepte.cgu}
              onValueChange={(value) => updateRgpdState('cgu', value)}
              trackColor={{ false: '#ddd', true: '#FF4444' }}
            />
            <Text style={styles.checkboxLabel}>J'accepte les CGU *</Text>
          </View>

          <View style={styles.checkboxRow}>
            <Switch
              value={rgpdAccepte.politique}
              onValueChange={(value) => updateRgpdState('politique', value)}
              trackColor={{ false: '#ddd', true: '#FF4444' }}
            />
            <Text style={styles.checkboxLabel}>J'accepte la Politique de Confidentialité *</Text>
          </View>

          <View style={styles.checkboxRow}>
            <Switch
              value={rgpdAccepte.donnees}
              onValueChange={(value) => updateRgpdState('donnees', value)}
              trackColor={{ false: '#ddd', true: '#FF4444' }}
            />
            <Text style={styles.checkboxLabel}>J'accepte le traitement de mes données *</Text>
          </View>

          <View style={styles.checkboxRow}>
            <Switch
              value={rgpdAccepte.newsletter}
              onValueChange={(value) => updateRgpdState('newsletter', value)}
              trackColor={{ false: '#ddd', true: '#FF4444' }}
            />
            <Text style={styles.checkboxLabel}>Newsletter marketing (optionnel)</Text>
          </View>
        </View>

        {/* Localisation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Localisation</Text>
          <TextInput 
            style={styles.textInput}
            placeholder="Paris, Lyon, Marseille..."
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* Services par catégories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛠️ Types de services</Text>
          <View style={styles.categoriesGrid}>
            {Object.entries(FOURMIZ_CRITERIA.services_par_categories).map(([key, category]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.categoryCard,
                  selectedCategories.includes(key) && styles.categoryCardActive
                ]}
                onPress={() => handleCategoryToggle(key)}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={[
                  styles.categoryLabel,
                  selectedCategories.includes(key) && styles.categoryLabelActive
                ]}>
                  {category.label}
                </Text>
                <Text style={styles.serviceCount}>({category.services.length} services)</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transport */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚗 Transport et mobilité</Text>
          <View style={styles.transportGrid}>
            {FOURMIZ_CRITERIA.transport.moyens.slice(0, 8).map((transport) => (
              <TouchableOpacity
                key={transport.key}
                style={[
                  styles.transportItem,
                  transportMoyens.includes(transport.key) && styles.transportItemActive
                ]}
                onPress={() => toggleTransport(transport.key)}
              >
                <Text style={styles.transportIcon}>{transport.icon}</Text>
                <Text style={[
                  styles.transportLabel,
                  transportMoyens.includes(transport.key) && styles.transportLabelActive
                ]}>
                  {transport.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.rangeContainer}>
            <Text style={styles.rangeLabel}>Rayon maximum: {rayonMax}km</Text>
            <View style={styles.rangeButtons}>
              <TouchableOpacity
                style={styles.rangeButton}
                onPress={() => setRayonMax(Math.max(1, rayonMax - 1))}
              >
                <Ionicons name="remove" size={16} color="#FF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rangeButton}
                onPress={() => setRayonMax(Math.min(50, rayonMax + 1))}
              >
                <Ionicons name="add" size={16} color="#FF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Disponibilités */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 Disponibilités</Text>
          <View style={styles.horaireGrid}>
            {FOURMIZ_CRITERIA.disponibilites.horaires_detaillees.slice(6, 22).map((horaire) => (
              <TouchableOpacity
                key={horaire.key}
                style={[
                  styles.horaireItem,
                  disponibilites.includes(horaire.key) && styles.horaireItemActive
                ]}
                onPress={() => toggleDisponibilite(horaire.key)}
              >
                <Text style={[
                  styles.horaireLabel,
                  disponibilites.includes(horaire.key) && styles.horaireLabelActive
                ]}>
                  {horaire.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tarifs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Tarifs et exigences</Text>
          
          <View style={styles.tarifContainer}>
            <Text style={styles.tarifLabel}>Prix minimum: {prixMinimum}€/h</Text>
            <View style={styles.rangeButtons}>
              <TouchableOpacity
                style={styles.rangeButton}
                onPress={() => setPrixMinimum(Math.max(5, prixMinimum - 1))}
              >
                <Ionicons name="remove" size={16} color="#FF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rangeButton}
                onPress={() => setPrixMinimum(Math.min(100, prixMinimum + 1))}
              >
                <Ionicons name="add" size={16} color="#FF4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tarifContainer}>
            <Text style={styles.tarifLabel}>Note client minimum: {noteClientMin}⭐</Text>
            <View style={styles.ratingButtons}>
              {[3.0, 3.5, 4.0, 4.5, 5.0].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    noteClientMin === rating && styles.ratingButtonActive
                  ]}
                  onPress={() => setNoteClientMin(rating)}
                >
                  <Text style={[
                    styles.ratingText,
                    noteClientMin === rating && styles.ratingTextActive
                  ]}>
                    {rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Mots-clés */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Mots-clés notifications</Text>
          <TextInput 
            style={styles.textInput}
            placeholder="urgent, luxury, samedi, anglais..."
            value={motsCles}
            onChangeText={setMotsCles}
            multiline
          />
          <Text style={styles.inputHint}>
            Séparez les mots-clés par des virgules
          </Text>
        </View>

        {/* Bouton sauvegarder */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={saveCriteria}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>💾 Sauvegarder mes critères</Text>
          )}
        </TouchableOpacity>

        {/* Résumé */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>📊 Résumé</Text>
          <Text style={styles.summaryText}>✓ {selectedCategories.length} catégories sélectionnées</Text>
          <Text style={styles.summaryText}>✓ {transportMoyens.length} moyens de transport</Text>
          <Text style={styles.summaryText}>✓ {disponibilites.length} créneaux horaires</Text>
          <Text style={styles.summaryText}>✓ À partir de {prixMinimum}€/h dans un rayon de {rayonMax}km</Text>
          <Text style={styles.summaryText}>✓ Localisation: {location || 'Non définie'}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20 },
  
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxLabel: { marginLeft: 12, fontSize: 14, color: '#333', flex: 1 },
  
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardActive: {
    backgroundColor: '#fff5f5',
    borderColor: '#FF4444',
  },
  categoryIcon: { fontSize: 24, marginBottom: 4 },
  categoryLabel: { fontSize: 12, fontWeight: '600', color: '#333', textAlign: 'center' },
  categoryLabelActive: { color: '#FF4444' },
  serviceCount: { fontSize: 10, color: '#666', marginTop: 2 },
  
  transportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  transportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  transportItemActive: {
    backgroundColor: '#fff5f5',
    borderColor: '#FF4444',
  },
  transportIcon: { marginRight: 4 },
  transportLabel: { fontSize: 12, color: '#333' },
  transportLabelActive: { color: '#FF4444' },
  
  horaireGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  horaireItem: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  horaireItemActive: {
    backgroundColor: '#fff5f5',
    borderColor: '#FF4444',
  },
  horaireLabel: { fontSize: 10, color: '#333' },
  horaireLabelActive: { color: '#FF4444' },
  
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  rangeLabel: { fontSize: 14, color: '#333' },
  rangeButtons: { flexDirection: 'row', gap: 8 },
  rangeButton: {
    width: 32,
    height: 32,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  tarifContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tarifLabel: { fontSize: 14, color: '#333' },
  
  ratingButtons: { flexDirection: 'row', gap: 4 },
  ratingButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  ratingButtonActive: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  ratingText: { fontSize: 10, color: '#666' },
  ratingTextActive: { color: '#fff' },
  
  textInput: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  inputHint: { fontSize: 12, color: '#666', marginTop: 4 },
  
  saveButton: {
    backgroundColor: '#FF4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  saveButtonDisabled: { backgroundColor: '#ccc' },
  saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  
  summary: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  summaryText: { fontSize: 14, color: '#666', marginBottom: 4 },
});
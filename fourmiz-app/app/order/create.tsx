import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { ArrowLeft } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';

const timeSlots = Array.from({ length: 96 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return { label: ${String(hour).padStart(2, '0')}:, value: ${String(hour).padStart(2, '0')}: };
});

export default function CreateOrderScreen() {
  const { serviceId } = useLocalSearchParams();
  const [service, setService] = useState<any>(null);
  const [date, setDate] = useState('');
  const [departureTime, setDepartureTime] = useState('09:00');
  const [arrivalTime, setArrivalTime] = useState('09:15');
  const [urgent, setUrgent] = useState(false);
  const [askInvoice, setAskInvoice] = useState(false);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [alternativePhone, setAlternativePhone] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    console.log('CreateOrderScreen loaded with serviceId:', serviceId);
    const today = new Date();
    setDate(today.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }));

    const fetchInitialData = async () => {
      console.log('Fetching initial data');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error fetching user:', userError);
        return;
      }
      console.log('User fetched:', user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('address,phone,alternative_phone')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
      }

      if (profile) {
        setAddress(profile.address || '');
        setPhone(profile.phone || '');
        setAlternativePhone(profile.alternative_phone || '');
      }

      if (serviceId) {
        console.log('Fetching service data for serviceId:', serviceId);
        const { data: svc, error: svcError } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .single();
        if (svcError) {
          console.error('Service error:', svcError);
        }
        if (svc) setService(svc);
      }
    };

    fetchInitialData();
  }, [serviceId]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    console.log('Submitting order');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError('Utilisateur non connecté');
      setLoading(false);
      console.error('Error fetching user for submit:', userError);
      return;
    }

    const order = {
      user_id: user.id,
      service_id: serviceId,
      date: new Date().toISOString().split('T')[0],
      departure_time: departureTime,
      arrival_time: arrivalTime,
      urgent,
      ask_invoice: askInvoice,
      address,
      phone,
      alternative_phone: alternativePhone || null,
      description,
      status: 'pending',
    };

    const { error: insertError } = await supabase.from('orders').insert(order);
    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      console.error('Insert error:', insertError);
    } else {
      Alert.alert('Succès', 'Commande envoyée');
      router.replace('/(tabs)/orders');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color="#FF4444" />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Créer une commande</Text>

        {service && (
          <View style={styles.serviceBlock}>
            <Text style={styles.serviceTitle}>{service.name}</Text>
            <Text style={styles.serviceDescription}>{service.description}</Text>
          </View>
        )}

        <Text style={styles.label}>Date</Text>
        <TextInput value={date} onChangeText={setDate} style={styles.input} />

        <Text style={styles.label}>Heure de départ</Text>
        <View style={styles.input}>
          <Picker selectedValue={departureTime} onValueChange={setDepartureTime}>
            {timeSlots.map(slot => (
              <Picker.Item key={slot.value} label={slot.label} value={slot.value} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Heure darrivée</Text>
        <View style={styles.input}>
          <Picker selectedValue={arrivalTime} onValueChange={setArrivalTime}>
            {timeSlots.map(slot => (
              <Picker.Item key={slot.value} label={slot.label} value={slot.value} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Description du besoin</Text>
        <TextInput
          multiline
          value={description}
          onChangeText={setDescription}
          style={styles.textArea}
          placeholder="Décrivez votre besoin..."
        />

        <Text style={styles.label}>Adresse</Text>
        <TextInput value={address} onChangeText={setAddress} style={styles.input} />

        <Text style={styles.label}>Téléphone principal</Text>
        <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />

        <Text style={styles.label}>Téléphone complémentaire</Text>
        <TextInput value={alternativePhone} onChangeText={setAlternativePhone} keyboardType="phone-pad" style={styles.input} />

        <View style={styles.switchRow}>
          <Text>Service urgent</Text>
          <Switch value={urgent} onValueChange={setUrgent} />
        </View>

        <View style={styles.switchRow}>
          <Text>Demande de facture</Text>
          <Switch value={askInvoice} onValueChange={setAskInvoice} />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={() => setShowPreview(true)}>
          <Text style={styles.buttonText}>Aperçu de la commande</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showPreview} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Aperçu de la commande</Text>
            <Text>Service : {service?.name}</Text>
            <Text>Date : {date}</Text>
            <Text>Heure départ : {departureTime}</Text>
            <Text>Heure arrivée : {arrivalTime}</Text>
            <Text>Urgent : {urgent ? 'Oui' : 'Non'}</Text>
            <Text>Adresse : {address}</Text>
            <Text>Téléphone : {phone}</Text>
            <Text>Complémentaire : {alternativePhone || '-'}</Text>
            <Text>Demande de facture : {askInvoice ? 'Oui' : 'Non'}</Text>
            <Text>Description : {description || '-'}</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowPreview(false)}>
                <Text style={{ color: '#FF4444' }}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleSubmit}>
                <Text style={{ color: '#2196F3' }}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { marginLeft: 8, color: '#FF4444' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  serviceBlock: { marginBottom: 16 },
  serviceTitle: { fontSize: 18, fontWeight: 'bold' },
  serviceDescription: { fontSize: 14, color: '#777' },
  label: { fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, padding: 8, marginBottom: 16, borderRadius: 4 },
  textArea: { borderWidth: 1, padding: 8, height: 100, marginBottom: 16, borderRadius: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  error: { color: 'red', marginBottom: 16 },
  button: { padding: 16, backgroundColor: '#2196F3', alignItems: 'center', borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 16, margin: 16, borderRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalButton: { padding: 8 },
});

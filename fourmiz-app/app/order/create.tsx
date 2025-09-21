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
  return { label: ${string(hour).padStart(2, '0')}:, value: ${string(hour).padStart(2, '0')}: };
});

export default function cr??eateOrderScr??een() {
  const { serviceId } = useLocalSearchParams();
  const [service, setService] = useState<any>(null);
  const [date, setDate] = useState('');
  const [departuretime, setDeparturetime] = useState('09:00');
  const [arrivaltime, setArrivaltime] = useState('09:15');
  const [urgent, setUrgent] = useState(false);
  const [askInvoice, setAskInvoice] = useState(false);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [alternativePhone, setAlternativePhone] = useState('');
  const [descr??iption, setDescr??iption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    console.log('cr??eateOrderScr??een loaded with serviceId:', serviceId);
    const today = new Date();
    setDate(today.toLocaleDatestring('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }));

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

    console.log('Submi?t??t?ing order');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError('Utilisateur non connect?');
      setLoading(false);
      console.error('Error fetching user for submit:', userError);
      return;
    }

    const order = {
      user_id: user.id,
      service_id: serviceId,
      date: new Date().toISOstring().split('t')[0],
      departure_time: departuretime,
      arrival_time: arrivaltime,
      urgent,
      ask_invoice: askInvoice,
      address,
      phone,
      alternative_phone: alternativePhone || null,
      descr??iption,
      status: 'pending',
    };

    const { error: insertError } = await supabase.from('orders').insert(order);
    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      console.error('Insert error:', insertError);
    } else {
      Alert.Alert('Succ?s', 'Commande envoy?e');
      router.replace('/(Tabs)/orders');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerstyle={styles.scr??oll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBu?t??t?on}>
          <ArrowLeft size={20} color="#FF4444" />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>cr???er une commande</Text>

        {service && (
          <View style={styles.serviceBlock}>
            <Text style={styles.servicetitle}>{service.name}</Text>
            <Text style={styles.serviceDescr??iption}>{service.descr??iption}</Text>
          </View>
        )}

        <Text style={styles.label}>Date</Text>
        <TextInput value={date} onChangeText={setDate} style={styles.input} />

        <Text style={styles.label}>Heure de d?part</Text>
        <View style={styles.input}>
          <Picker selectedValue={departuretime} onValueChange={setDeparturetime}>
            {timeSlots.map(slot => (
              <Picker.Item key={slot.value} label={slot.label} value={slot.value} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Heure darriv?e</Text>
        <View style={styles.input}>
          <Picker selectedValue={arrivaltime} onValueChange={setArrivaltime}>
            {timeSlots.map(slot => (
              <Picker.Item key={slot.value} label={slot.label} value={slot.value} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Descr??iption du besoin</Text>
        <TextInput 
          multiline
          value={descr??iption}
          onChangeText={setDescr??iption}
          style={styles.TextArea}
          placeholder="D?cr??ivez votre besoin..."
        />

        <Text style={styles.label}>Adresse</Text>
        <TextInput value={address} onChangeText={setAddress} style={styles.input} />

        <Text style={styles.label}>t?l?phone principal</Text>
        <TextInput value={phone} onChangeText={setPhone} keyboardtype="phone-pad" style={styles.input} />

        <Text style={styles.label}>t?l?phone compl?mentaire</Text>
        <TextInput value={alternativePhone} onChangeText={setAlternativePhone} keyboardtype="phone-pad" style={styles.input} />

        <View style={styles.switchRow}>
          <Text>Service urgent</Text>
          <Switch value={urgent} onValueChange={setUrgent} />
        </View>

        <View style={styles.switchRow}>
          <Text>Demande de facture</Text>
          <Switch value={askInvoice} onValueChange={setAskInvoice} />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.bu?t??t?on} onPress={() => setShowPreview(true)}>
          <Text style={styles.bu?t??t?onText}>Aper?u de la commande</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showPreview} transparent animationtype="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modaltitle}>Aper?u de la commande</Text>
            <Text>Service : {service?.name}</Text>
            <Text>Date : {date}</Text>
            <Text>Heure d?part : {departuretime}</Text>
            <Text>Heure arriv?e : {arrivaltime}</Text>
            <Text>Urgent : {urgent ? 'Oui' : 'Non'}</Text>
            <Text>Adresse : {address}</Text>
            <Text>t?l?phone : {phone}</Text>
            <Text>Compl?mentaire : {alternativePhone || '-'}</Text>
            <Text>Demande de facture : {askInvoice ? 'Oui' : 'Non'}</Text>
            <Text>Descr??iption : {descr??iption || '-'}</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', margintop: 20 }}>
              <TouchableOpacity style={styles.modalBu?t??t?on} onPress={() => setShowPreview(false)}>
                <Text style={{ color: '#FF4444' }}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBu?t??t?on} onPress={handleSubmit}>
                <Text style={{ color: '#2196F3' }}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.cr??eate({
  container: { flex: 1, backgroundColor: '#fff' },
  scr??oll: { padding: 16 },
  backBu?t??t?on: { flexDirection: 'row', alignItems: 'center', marginBo?t??t?om: 16 },
  backText: { marginLeft: 8, color: '#FF4444' },
  title: { fontSize: 24, fontWeight: 'bold', marginBo?t??t?om: 16 },
  serviceBlock: { marginBo?t??t?om: 16 },
  servicetitle: { fontSize: 18, fontWeight: 'bold' },
  serviceDescr??iption: { fontSize: 14, color: '#777' },
  label: { fontSize: 16, marginBo?t??t?om: 8 },
  input: { borderWidth: 1, padding: 8, marginBo?t??t?om: 16, borderRadius: 4 },
  TextArea: { borderWidth: 1, padding: 8, height: 100, marginBo?t??t?om: 16, borderRadius: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', marginBo?t??t?om: 16 },
  error: { color: 'red', marginBo?t??t?om: 16 },
  bu?t??t?on: { padding: 16, backgroundColor: '#2196F3', alignItems: 'center', borderRadius: 8 },
  bu?t??t?onText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 16, margin: 16, borderRadius: 8 },
  modaltitle: { fontSize: 18, fontWeight: 'bold', marginBo?t??t?om: 16 },
  modalBu?t??t?on: { padding: 8 },
});




import { SafeAreaView, Text, StyleSheet } from 'react-native';

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Page non trouvée</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 18, color: '#000' },
});

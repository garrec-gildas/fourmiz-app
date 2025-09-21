import { SafeAreaView, Text, StyleSheet } from 'react-native';

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Écran Messages</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 18, color: '#000' },
});
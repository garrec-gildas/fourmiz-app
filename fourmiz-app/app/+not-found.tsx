import { SafeAreaView, Text } from 'react-native';

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Page non trouvée</Text>
    </SafeAreaView>
  );
}

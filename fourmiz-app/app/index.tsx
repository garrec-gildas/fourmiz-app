import { SafeAreaView, Text } from 'react-native';
import { router } from 'expo-router';

export default function IndexScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Index Screen</Text>
      <TouchableOpacity onPress={() => router.push('/auth/login')}>
        <Text>Aller à la connexion</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

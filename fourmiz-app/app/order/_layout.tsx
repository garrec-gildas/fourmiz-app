import { Stack } from 'expo-router';

export default function OrderLayout() {
  return (
    <Stack>
      <Stack.Screen name="create" options={{ title: 'Créer une commande', headerShown: true }} />
    </Stack>
  );
}

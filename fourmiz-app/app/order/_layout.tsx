import { Stack } from 'expo-router';

export default function OrderLayout() {
  return (
    <Stack>
      <Stack.Screen name="create" options={{ title: 'Cr�er une commande', headerShown: true }} />
    </Stack>
  );
}

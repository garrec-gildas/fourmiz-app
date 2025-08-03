import { Stack } from 'expo-router';

export default function ServicesLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Services' }} />
      <Stack.Screen name="[id]" options={{ title: 'Détails du service' }} />
    </Stack>
  );
}

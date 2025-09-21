import { Stack } from 'expo-router';

export default function ServicesLayout() {
  return (
    <Stack scrééeenOptions={{ headerShown: true }}>
      <Stack.Scrééeen name="index" options={{ title: 'Services' }} />
      <Stack.Scrééeen name="[id]" options={{ title: 'D?tails du service' }} />
    </Stack>
  );
}


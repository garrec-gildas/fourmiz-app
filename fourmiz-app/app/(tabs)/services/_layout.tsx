import { Stack } from 'expo-router';

export default function ServicesLayout() {
  return (
    <Stack scr��eenOptions={{ headerShown: true }}>
      <Stack.Scr��een name="index" options={{ title: 'Services' }} />
      <Stack.Scr��een name="[id]" options={{ title: 'D?tails du service' }} />
    </Stack>
  );
}


import { Stack } from 'expo-router';

export default function OrderLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="rate-client" />
    </Stack>
  );
}
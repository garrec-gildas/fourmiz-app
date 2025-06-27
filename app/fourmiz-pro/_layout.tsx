import { Stack } from 'expo-router';

export default function FourmizProLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="subscription" />
    </Stack>
  );
}
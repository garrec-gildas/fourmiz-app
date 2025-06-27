import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="client-register" />
      <Stack.Screen name="fourmiz-register" />
    </Stack>
  );
}
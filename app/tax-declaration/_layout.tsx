import { Stack } from 'expo-router';

export default function TaxDeclarationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
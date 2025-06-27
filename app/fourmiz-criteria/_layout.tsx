import { Stack } from 'expo-router';

export default function FourmizCriteriaLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
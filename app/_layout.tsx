import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// i-wrap yung buong app sa <GestureHandlerRootView style={{ flex: 1 }}> ... </GestureHandlerRootView>
// tapos ilagay ito bilang pinaka-huling element bago mag-close ang root:
// <Toast config={toastConfig} />

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(bfp)" />
      </Stack>
    </>
  );
}
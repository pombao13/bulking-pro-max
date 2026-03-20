// ══════════════════════════════════════════════
// Root Layout — App entry point with providers
// ══════════════════════════════════════════════
import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Handle notification clicks when the app is in the background or closed
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (!data) return;
      
      if (data.type === 'meal') {
        router.push('/(tabs)');
      } else if (data.type === 'water') {
        router.push('/(tabs)/water');
      }
    });

    return () => subscription.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0a0a0a' },
            animation: 'fade',
          }}
        />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

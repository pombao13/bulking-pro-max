// ══════════════════════════════════════════════
// Tab Layout — Bottom tab navigation
// ══════════════════════════════════════════════
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';

export default function TabLayout() {
  const { profile, signOut } = useAuth();
  const nome = profile?.nome || '?';

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.bg,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: COLORS.txt,
        headerTitleStyle: { fontWeight: '700', fontSize: 16 },
        tabBarStyle: {
          backgroundColor: COLORS.bg,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.lime,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={signOut}
            className="mr-4 bg-surface2 w-9 h-9 rounded-full items-center justify-center border border-border"
          >
            <Text className="text-lime font-bold text-sm">
              {nome[0]?.toUpperCase() || '?'}
            </Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Refeições',
          headerTitle: '🍽️ BULKING PRO MAX',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="water"
        options={{
          title: 'Água',
          headerTitle: '💧 ÁGUA',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="water" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="supplements"
        options={{
          title: 'Supl',
          headerTitle: '💊 SUPLEMENTOS',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medical" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="costs"
        options={{
          title: 'Custos',
          headerTitle: '🛒 CUSTOS',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progresso',
          headerTitle: '📊 PROGRESSO',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          title: 'Dieta',
          headerTitle: '📋 IMPORTAR DIETA',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

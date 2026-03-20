// ══════════════════════════════════════════════
// Push Notification Service (expo-notifications)
// ══════════════════════════════════════════════
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { dbSaveExpoPushToken, dbDeleteExpoPushToken } from './database';

// Configure notification behavior
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications(userId: string, fase: string, tipo: string): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    console.warn('Push notifications only work on physical native devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meals', {
      name: 'Refeições',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [200, 100, 200],
      lightColor: '#c8ff00',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('water', {
      name: 'Água',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [200, 100, 200],
      lightColor: '#00e5ff',
    });
    await Notifications.setNotificationChannelAsync('supplements', {
      name: 'Suplementos',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [200, 100, 200],
      lightColor: '#c084fc',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Will use expo project ID from app.json
    });
    const token = tokenData.data;
    
    // Save to Supabase
    await dbSaveExpoPushToken(userId, token, fase, tipo);
    
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

export async function unregisterPushNotifications(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await dbDeleteExpoPushToken(userId, tokenData.data);
  } catch (error) {
    console.error('Error unregistering push:', error);
  }
}

// Schedule local notifications for meals
export async function scheduleMealNotifications(meals: { nome: string; hora: string; icon: string; macros: { kcal: number } }[]) {
  if (Platform.OS === 'web') return;
  // Cancel existing meal notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  
  for (const meal of meals) {
    const [h, m] = meal.hora.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) continue;

    const trigger = new Date();
    trigger.setHours(h, m, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (trigger <= now) {
      trigger.setDate(trigger.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🍽️ Hora de comer!',
        body: `${meal.hora} — ${meal.nome} · ${meal.macros.kcal}kcal`,
        sound: 'default',
        data: { type: 'meal', name: meal.nome },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: h,
        minute: m,
      },
    });
  }
}

// Schedule water reminder every 2 hours (8am-10pm)
export async function scheduleWaterReminders() {
  if (Platform.OS === 'web') return;
  for (let hour = 8; hour <= 22; hour += 2) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💧 Beba água!',
        body: 'Mantenha-se hidratado para alcançar sua meta de 3L 🚰',
        sound: 'default',
        data: { type: 'water' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
        channelId: 'water',
      },
    });
  }
}

// Schedule supplement reminder
export async function scheduleSupplementReminder() {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💊 Suplementos pendentes!',
      body: 'Não esqueça de tomar seus suplementos hoje',
      sound: 'default',
      data: { type: 'supplement' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 10,
      minute: 0,
      channelId: 'supplements',
    },
  });
}

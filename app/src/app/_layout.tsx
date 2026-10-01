import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useBoot } from '../boot/useBoot';
import { useTheme } from '../theme/useTheme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const { c } = useTheme();
  const ready = useBoot();
  // The street database is unpacked on first launch; hold the screens until it is readable.
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="confirm" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true, sheetCornerRadius: 40 }} />
        <Stack.Screen name="schedule" options={{ presentation: 'formSheet', sheetAllowedDetents: [1], sheetGrabberVisible: true, sheetCornerRadius: 40 }} />
        <Stack.Screen name="car" options={{ presentation: 'card' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

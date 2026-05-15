import { Stack } from "expo-router";
import "../global.css";
import "react-native-reanimated";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="room/[slug]" options={{ headerLargeTitle: true }} />
      <Stack.Screen name="event/[id]" options={{ headerLargeTitle: true }} />
      <Stack.Screen
        name="sign-up/[eventId]"
        options={{ presentation: "modal", title: "Join Event" }}
      />
      <Stack.Screen name="admin/login" options={{ headerShown: false }} />
      <Stack.Screen
        name="admin/index"
        options={{ title: "Dashboard" }}
      />
    </Stack>
  );
}

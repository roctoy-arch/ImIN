import { Stack } from "expo-router";
import "../global.css";
import "react-native-reanimated";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "I'm IN" }} />
      <Stack.Screen name="room/[slug]" options={{ title: "Room" }} />
      <Stack.Screen name="event/[id]" options={{ title: "Event" }} />
      <Stack.Screen
        name="sign-up/[eventId]"
        options={{ presentation: "modal", title: "Join Event" }}
      />
      <Stack.Screen name="admin/login" options={{ headerShown: false }} />
      <Stack.Screen name="admin/index" options={{ title: "Dashboard" }} />
    </Stack>
  );
}

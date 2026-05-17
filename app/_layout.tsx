import { Stack } from "expo-router";
import Head from "expo-router/head";
import { APP_URL } from "@/constants/config";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import "../global.css";
import "react-native-reanimated";

function OfflineBanner() {
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setConnected(state.isConnected !== false);
    });
  }, []);
  if (connected) return null;
  return (
    <View
      style={{
        backgroundColor: "#ef4444",
        paddingVertical: 6,
        alignItems: "center",
      }}
    >
      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
        No internet connection
      </Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <>
      <Head>
        <meta property="og:site_name" content="I'm IN" />
        <meta property="og:title" content="I'm IN – Gym Event Sign-ups" />
        <meta
          property="og:description"
          content="Sign up for your gym's events in seconds. No account needed."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={APP_URL} />
        <meta name="twitter:card" content="summary" />
      </Head>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#ffffff" },
          headerTitleStyle: { fontWeight: "700", fontSize: 17 },
          headerShadowVisible: true,
          headerTintColor: "#111827",
          headerTitleAlign: "center",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="room/[slug]" options={{ headerLargeTitle: true }} />
        <Stack.Screen name="event/[id]" options={{ headerLargeTitle: true }} />
        <Stack.Screen
          name="sign-up/[eventId]"
          options={{ presentation: "modal", title: "Join Event" }}
        />
        <Stack.Screen name="admin/login" options={{ headerShown: false }} />
        <Stack.Screen name="admin/index" options={{ title: "Dashboard" }} />
      </Stack>
    </>
  );
}

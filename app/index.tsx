import { useRouter } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";

const webRoot = Platform.OS === "web"
  ? ({ minHeight: "100dvh", maxWidth: 480, alignSelf: "center", width: "100%" } as any)
  : undefined;

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "white", ...(webRoot ?? {}) }}>
      {/* Vertically centered title + subtitle */}
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            fontSize: 48,
            fontWeight: "900",
            color: "#0A0A0A",
            textAlign: "center",
            lineHeight: 52,
          }}
        >
          {"I'm IN"}
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#9CA3AF",
            textAlign: "center",
            marginTop: 12,
            lineHeight: 24,
          }}
        >
          Sign up for your gym's events in seconds.{"\n"}No account needed.
        </Text>
      </View>

      {/* Admin link pinned to bottom */}
      <View style={{ paddingBottom: 52, alignItems: "center" }}>
        <Text style={{ color: "#9CA3AF", fontSize: 13 }}>
          Are you an organizer?
        </Text>
        <Pressable
          onPress={() => router.push("/admin")}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginTop: 4, padding: 8 })}
        >
          <Text style={{ color: "#0A0A0A", fontWeight: "600", fontSize: 14 }}>
            Admin Area →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

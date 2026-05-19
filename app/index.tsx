import { C } from "@/constants/design";
import { useRouter } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";

const webRoot = Platform.OS === "web"
  ? ({ minHeight: "100dvh", maxWidth: 480, alignSelf: "center", width: "100%" } as any)
  : undefined;

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: C.BG, ...(webRoot ?? {}) }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <Text
          style={{
            fontSize: 72,
            fontWeight: "900",
            fontStyle: "italic",
            color: C.PRIMARY,
            lineHeight: 76,
            textAlign: "center",
          }}
        >
          {"I'm IN"}
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: C.SECONDARY,
            textAlign: "center",
            marginTop: 16,
            lineHeight: 24,
          }}
        >
          Sign up. Show up.
        </Text>
      </View>

      <View style={{ paddingBottom: 52, alignItems: "center" }}>
        <Text style={{ color: C.MUTED, fontSize: 13 }}>Are you an organizer?</Text>
        <Pressable
          onPress={() => router.push("/admin")}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginTop: 4, padding: 8 })}
        >
          <Text style={{ color: C.PRIMARY, fontWeight: "600", fontSize: 14 }}>
            Admin Area →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

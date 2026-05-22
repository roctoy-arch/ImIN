import { C } from "@/constants/design";
import { useRouter } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";

const webRoot = Platform.OS === "web"
  ? ({ minHeight: "100dvh" as any, maxWidth: 480, alignSelf: "center" as const, width: "100%" as const })
  : {};

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: C.BG, alignItems: "center", justifyContent: "center", ...webRoot }}>
      <Text
        style={{
          fontSize: 72,
          fontWeight: "900",
          fontStyle: "italic",
          color: C.PRIMARY,
          lineHeight: 76,
          textAlign: "center",
          letterSpacing: -2,
        }}
      >
        {"I'm IN"}
      </Text>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "500",
          color: C.SECONDARY,
          textAlign: "center",
          marginTop: 12,
          lineHeight: 24,
        }}
      >
        Sign up. Show up.
      </Text>

      <View style={{ position: "absolute", bottom: 52, alignItems: "center" }}>
        <Text style={{ color: C.MUTED, fontSize: 13, marginBottom: 8 }}>Are you an organizer?</Text>
        <Pressable
          onPress={() => router.push("/admin")}
          style={({ pressed }) => ({
            backgroundColor: C.WHITE,
            borderRadius: 50,
            paddingHorizontal: 24,
            paddingVertical: 12,
            opacity: pressed ? 0.8 : 1,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          })}
        >
          <Text style={{ color: C.PRIMARY, fontWeight: "700", fontSize: 14 }}>
            Organizer Login
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

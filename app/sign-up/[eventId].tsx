import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "@/lib/db";
import { C, PILL_ACCENT } from "@/constants/design";
import { id } from "@instantdb/react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SignUpScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("savedName").then((saved) => {
      if (saved) setName(saved);
    });
  }, []);

  async function handleSignUp() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const signupId = id();
      await db.transact(
        db.tx.signups[signupId]
          .update({ name: trimmed, createdAt: Date.now() })
          .link({ event: eventId })
      );
      await AsyncStorage.setItem(`signup:${eventId}`, signupId);
      await AsyncStorage.setItem("savedName", trimmed);
      setDone(true);
      setTimeout(() => router.back(), 900);
    } catch {
      setError("Couldn't save your signup. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "flex-end",
          ...(Platform.OS === "web" ? ({ minHeight: "100dvh" } as any) : {}),
        }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Tap-away dim area */}
        <Pressable style={{ flex: 1 }} onPress={() => router.back()} />

        {/* Sheet */}
        <View
          style={{
            backgroundColor: C.WHITE,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 48 : 32,
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: C.BORDER,
              borderRadius: 2,
              alignSelf: "center",
              marginBottom: 24,
            }}
          />

          {done ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Text style={{ fontSize: 52, fontWeight: "900", fontStyle: "italic", color: C.PRIMARY, marginBottom: 16 }}>
                I'M IN
              </Text>
              <Text style={{ fontSize: 28, fontWeight: "800", color: C.PRIMARY }}>
                You're IN!
              </Text>
              <Text style={{ fontSize: 16, color: PILL_ACCENT, marginTop: 8 }}>
                See you there, {name.trim()}.
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 22, fontWeight: "900", color: C.PRIMARY, marginBottom: 6 }}>
                Join this event
              </Text>
              <Text style={{ fontSize: 15, color: C.SECONDARY, marginBottom: 24 }}>
                Enter your name to sign up.
              </Text>

              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: C.MUTED,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Your name
              </Text>
              <TextInput
                style={{
                  backgroundColor: C.INPUT,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  fontSize: 16,
                  color: C.PRIMARY,
                  marginBottom: 24,
                }}
                placeholder="e.g. Alex Smith"
                placeholderTextColor={C.MUTED}
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />

              <Pressable
                onPress={handleSignUp}
                disabled={saving || !name.trim()}
                style={({ pressed }) => ({
                  backgroundColor: C.PRIMARY,
                  borderRadius: 50,
                  paddingVertical: 20,
                  alignItems: "center",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: pressed || saving || !name.trim() ? 0.5 : 1,
                })}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "900",
                    fontSize: 16,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {saving ? "Joining..." : "I'M IN"}
                </Text>
              </Pressable>

              {error ? (
                <Text style={{ color: C.ACCENT, fontSize: 14, textAlign: "center", marginTop: 12 }}>
                  {error}
                </Text>
              ) : null}

              <Pressable
                onPress={() => router.back()}
                style={{ alignItems: "center", marginTop: 16, paddingVertical: 8 }}
              >
                <Text style={{ color: C.MUTED, fontSize: 15 }}>Cancel</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "@/lib/db";
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
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Text style={{ fontSize: 16, color: "#0A0A0A", fontWeight: "500" }}>Cancel</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "white" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: "center" }}>
          {done ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 64, marginBottom: 16 }}>🎉</Text>
              <Text style={{ fontSize: 28, fontWeight: "800", color: "#0A0A0A" }}>
                You're IN!
              </Text>
              <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 8 }}>
                See you there, {name.trim()}.
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 28, fontWeight: "800", color: "#0A0A0A", marginBottom: 6 }}>
                Join this event
              </Text>
              <Text style={{ fontSize: 15, color: "#6B7280", marginBottom: 32 }}>
                Enter your name to sign up.
              </Text>

              <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                Your name
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#F5F5F5",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  fontSize: 16,
                  color: "#0A0A0A",
                  marginBottom: 24,
                }}
                placeholder="e.g. Alex Smith"
                placeholderTextColor="#9CA3AF"
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
                  backgroundColor: "#0A0A0A",
                  borderRadius: 50,
                  paddingVertical: 18,
                  alignItems: "center",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: pressed || saving || !name.trim() ? 0.5 : 1,
                })}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 17 }}>
                  {saving ? "Joining..." : "I'm IN"}
                </Text>
              </Pressable>

              {error ? (
                <Text style={{ color: "#EF4444", fontSize: 14, textAlign: "center", marginTop: 12 }}>
                  {error}
                </Text>
              ) : null}

              <Pressable
                onPress={() => router.back()}
                style={{ alignItems: "center", marginTop: 16, paddingVertical: 8 }}
              >
                <Text style={{ color: "#9CA3AF", fontSize: 15 }}>Cancel</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

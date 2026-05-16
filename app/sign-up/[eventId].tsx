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
      setTimeout(() => router.back(), 800);
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
            <Text style={{ fontSize: 16, color: "#6b7280" }}>Cancel</Text>
          </Pressable>
        ),
      }}
    />
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 p-6 justify-center">
        {done ? (
          <View className="items-center py-10">
            <Text className="text-5xl mb-4">🎉</Text>
            <Text className="text-2xl font-bold text-gray-900">You're IN!</Text>
            <Text className="text-gray-500 mt-2">See you there, {name.trim()}.</Text>
          </View>
        ) : (
          <>
            <Text className="text-2xl font-bold text-gray-900 mb-2">Join this event</Text>
            <Text className="text-gray-500 mb-6">Enter your name to sign up.</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-6"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />
            <Pressable
              onPress={handleSignUp}
              disabled={saving || !name.trim()}
              className="bg-black rounded-xl py-4 items-center"
              style={({ pressed }) => ({
                opacity: pressed || saving || !name.trim() ? 0.5 : 1,
              })}
            >
              <Text className="text-white font-bold text-lg">
                {saving ? "Joining..." : "I'm IN"}
              </Text>
            </Pressable>
            {error ? (
              <Text className="text-red-500 text-sm text-center mt-3">
                {error}
              </Text>
            ) : null}
            <Pressable
              onPress={() => router.back()}
              className="items-center mt-4 py-2"
            >
              <Text className="text-gray-400">Cancel</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
    </>
  );
}

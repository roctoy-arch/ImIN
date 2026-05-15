import { db } from "@/lib/db";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export default function AdminLoginScreen() {
  const router = useRouter();
  const { user, isLoading } = db.useAuth();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sentError, setSentError] = useState("");
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/admin");
    }
  }, [user, isLoading]);

  async function handleSendCode() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSending(true);
    setSentError("");
    try {
      await db.auth.sendMagicCode({ email: trimmed });
      setStep("code");
    } catch (e: unknown) {
      setSentError(e instanceof Error ? e.message : "Failed to send code. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;
    setVerifying(true);
    setVerifyError("");
    try {
      await db.auth.signInWithMagicCode({ email: email.trim(), code: trimmedCode });
      // useAuth() will update → useEffect fires → router.replace
    } catch (e: unknown) {
      setVerifyError(e instanceof Error ? e.message : "Invalid code. Try again.");
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 px-6 justify-center">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          {step === "email" ? "Admin Login" : "Enter Code"}
        </Text>
        <Text className="text-gray-500 mb-8">
          {step === "email"
            ? "Enter your email to receive a login code."
            : `We sent a 6-digit code to ${email.trim()}.`}
        </Text>

        {step === "email" ? (
          <>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-2"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleSendCode}
              autoFocus
            />
            {sentError ? (
              <Text className="text-red-500 text-sm mb-3">{sentError}</Text>
            ) : (
              <View className="mb-3" />
            )}
            <Pressable
              onPress={handleSendCode}
              disabled={sending || !email.trim()}
              className="bg-black rounded-xl py-4 items-center"
              style={({ pressed }) => ({
                opacity: pressed || sending || !email.trim() ? 0.5 : 1,
              })}
            >
              <Text className="text-white font-bold text-base">
                {sending ? "Sending..." : "Send Code"}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-2 tracking-widest"
              placeholder="123456"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              autoFocus
            />
            {verifyError ? (
              <Text className="text-red-500 text-sm mb-3">{verifyError}</Text>
            ) : (
              <View className="mb-3" />
            )}
            <Pressable
              onPress={handleVerify}
              disabled={verifying || code.trim().length < 6}
              className="bg-black rounded-xl py-4 items-center mb-3"
              style={({ pressed }) => ({
                opacity: pressed || verifying || code.trim().length < 6 ? 0.5 : 1,
              })}
            >
              <Text className="text-white font-bold text-base">
                {verifying ? "Verifying..." : "Verify"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setStep("email");
                setCode("");
                setVerifyError("");
              }}
              className="items-center py-2"
            >
              <Text className="text-gray-400">← Back</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

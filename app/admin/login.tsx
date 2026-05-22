import { db } from "@/lib/db";
import { C } from "@/constants/design";
import { Stack, useRouter } from "expo-router";
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

const inputStyle = {
  backgroundColor: C.INPUT,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  color: C.PRIMARY,
  marginBottom: 8,
};

const btnStyle = {
  backgroundColor: C.PRIMARY,
  borderRadius: 50,
  paddingVertical: 18,
  alignItems: "center" as const,
  marginTop: 8,
};

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
    } catch (e: unknown) {
      setVerifyError(e instanceof Error ? e.message : "Invalid code. Try again.");
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
        <ActivityIndicator size="large" color={C.PRIMARY} />
      </View>
    );
  }

  const canGoBack = router.canGoBack();

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#1C242B" }}>Admin Login</Text>
          ),
          headerLeft: () => (
            <Pressable
              onPress={() => router.push("/")}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingLeft: 4 })}
            >
              <Text style={{ fontSize: 15, fontWeight: "900", color: C.PRIMARY, fontStyle: "italic" as const }}>I'm IN</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[
        { flex: 1, backgroundColor: "white" },
        Platform.OS === "web"
          ? ({
              minHeight: "100dvh",
              maxWidth: 480,
              alignSelf: "center",
              width: "100%",
            } as any)
          : null,
      ]}
    >
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: "center" }}>
        <Text style={{ fontSize: 28, fontWeight: "900", color: C.PRIMARY, marginBottom: 6 }}>
          {step === "email" ? "Admin Login" : "Enter Code"}
        </Text>
        <Text style={{ fontSize: 15, color: C.SECONDARY, marginBottom: 32 }}>
          {step === "email"
            ? "Enter your email to receive a login code."
            : `We sent a 6-digit code to ${email.trim()}.`}
        </Text>

        {step === "email" ? (
          <>
            <Text style={{ fontSize: 13, fontWeight: "600", color: C.PRIMARY, marginBottom: 6 }}>
              Email address
            </Text>
            <TextInput
              style={inputStyle}
              placeholder="your@email.com"
              placeholderTextColor="#9CA3AF"
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
              <Text style={{ color: C.ACCENT, fontSize: 13, marginBottom: 12 }}>{sentError}</Text>
            ) : (
              <View style={{ marginBottom: 12 }} />
            )}
            <Pressable
              onPress={handleSendCode}
              disabled={sending || !email.trim()}
              style={({ pressed }) => ({
                ...btnStyle,
                opacity: pressed || sending || !email.trim() ? 0.5 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 17 }}>
                {sending ? "Sending..." : "Send Code"}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 13, fontWeight: "600", color: C.PRIMARY, marginBottom: 6 }}>
              6-digit code
            </Text>
            <TextInput
              style={[inputStyle, { letterSpacing: 4, textAlign: "center" }]}
              placeholder="123456"
              placeholderTextColor="#9CA3AF"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              autoFocus
            />
            {verifyError ? (
              <Text style={{ color: C.ACCENT, fontSize: 13, marginBottom: 12 }}>{verifyError}</Text>
            ) : (
              <View style={{ marginBottom: 12 }} />
            )}
            <Pressable
              onPress={handleVerify}
              disabled={verifying || code.trim().length < 6}
              style={({ pressed }) => ({
                ...btnStyle,
                opacity: pressed || verifying || code.trim().length < 6 ? 0.5 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 17 }}>
                {verifying ? "Verifying..." : "Verify"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setStep("email"); setCode(""); setVerifyError(""); }}
              style={{ alignItems: "center", paddingVertical: 12, marginTop: 4 }}
            >
              <Text style={{ color: C.MUTED, fontSize: 15 }}>← Back</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
    </>
  );
}

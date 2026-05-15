import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      {/* Header */}
      <Text className="text-5xl font-bold text-gray-900 mb-3">I'm IN</Text>
      <Text className="text-base text-gray-500 mb-8 leading-relaxed">
        Sign up for your gym's events in seconds.{"\n"}No account needed.
      </Text>

      {/* Admin area */}
      <View className="mt-12 items-center">
        <Text className="text-gray-400 text-sm mb-3">Are you an organizer?</Text>
        <Pressable
          onPress={() => router.push("/admin")}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text className="text-gray-900 font-semibold text-sm underline">
            Admin Area →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      {/* Hero text — bottom-aligned in the top half */}
      <View className="flex-1 px-6 justify-end pb-10">
        <Text
          className="font-black text-gray-900 leading-none mb-4"
          style={{ fontSize: 80 }}
        >
          {"I'm\nIN"}
        </Text>
        <Text className="text-base text-gray-400 leading-relaxed">
          Sign up for your gym's events in seconds.{"\n"}No account needed.
        </Text>
      </View>

      {/* Admin link pinned to bottom */}
      <View className="px-6 pb-14 items-center">
        <Text className="text-gray-400 text-sm mb-2">Are you an organizer?</Text>
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

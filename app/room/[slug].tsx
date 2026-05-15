import { db } from "@/lib/db";
import { AppSchema } from "@/instant.schema";
import { InstaQLEntity } from "@instantdb/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

type Announcement = InstaQLEntity<AppSchema, "announcements">;
type RoomWithEvents = InstaQLEntity<
  AppSchema,
  "rooms",
  { events: { signups: {} }; announcements: {} }
>;
type EventWithSignups = InstaQLEntity<AppSchema, "events", { signups: {} }>;

function formatDate(epoch: number) {
  return new Date(epoch).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventCard({ event }: { event: EventWithSignups }) {
  const router = useRouter();
  const count = event.signups?.length ?? 0;

  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100">
        <Text className="text-lg font-bold text-gray-900">{event.title}</Text>
        <Text className="text-sm text-gray-500 mt-1">{formatDate(event.date)}</Text>
        {event.location ? (
          <Text className="text-sm text-gray-500">{event.location}</Text>
        ) : null}
        <View className="flex-row mt-3">
          <View className="bg-green-100 px-3 py-1 rounded-full">
            <Text className="text-green-700 text-sm font-medium">
              {count} {count === 1 ? "person" : "people"} in
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function RoomScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const { isLoading, error, data } = db.useQuery({
    rooms: {
      events: {
        signups: {},
        $: { order: { date: "asc" } },
      },
      announcements: {},
      $: { where: { slug } },
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="text-red-500 text-center">{error.message}</Text>
      </View>
    );
  }

  const room = data?.rooms?.[0] as RoomWithEvents | undefined;

  if (!room) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Room not found
        </Text>
        <Text className="text-gray-500 text-center mb-6">
          No room with code "{slug}" exists.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-black rounded-xl px-6 py-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const events = (room.events ?? []) as EventWithSignups[];
  const announcements = (room.announcements ?? []) as Announcement[];
  const latestAnn = [...announcements].sort(
    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
  )[0];

  // Show banner again whenever a new announcement arrives
  const showBanner = !!latestAnn && !dismissed;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Room header */}
      <View className="bg-white px-5 pt-4 pb-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">{room.name}</Text>
        <Text className="text-sm text-gray-400 mt-0.5">{slug}</Text>
      </View>

      {/* Announcement banner */}
      {showBanner && (
        <View className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex-row items-start">
          <Text className="text-amber-500 mr-2 mt-0.5">📢</Text>
          <Text className="flex-1 text-amber-800 text-sm leading-relaxed">
            {latestAnn.message}
          </Text>
          <Pressable
            onPress={() => setDismissed(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text className="text-amber-400 ml-2 font-bold text-base">✕</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventCard event={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-gray-400 text-base">No events scheduled yet.</Text>
          </View>
        }
      />
    </View>
  );
}

import { db } from "@/lib/db";
import { AppSchema } from "@/instant.schema";
import { InstaQLEntity } from "@instantdb/react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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

function formatDay(epoch: number) {
  return new Date(epoch).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(epoch: number) {
  return new Date(epoch).toLocaleTimeString("en-US", {
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
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      <View
        className="bg-white rounded-2xl p-4 mb-3"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        {/* Title + count badge */}
        <View className="flex-row items-start justify-between mb-2">
          <Text
            className="text-base font-bold text-gray-900 flex-1 mr-3"
            numberOfLines={2}
          >
            {event.title}
          </Text>
          <View className="bg-black rounded-full px-2.5 py-1 mt-0.5">
            <Text className="text-white text-xs font-semibold">{count}</Text>
          </View>
        </View>

        {/* Date row */}
        <View className="flex-row items-center">
          <Text className="text-sm text-gray-500">{formatDay(event.date)}</Text>
          <Text className="text-gray-300 mx-1.5">·</Text>
          <Text className="text-sm font-medium text-gray-500">
            {formatTime(event.date)}
          </Text>
        </View>

        {event.location ? (
          <Text className="text-xs text-gray-400 mt-1">{event.location}</Text>
        ) : null}
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

  const showBanner = !!latestAnn && !dismissed;

  return (
    <>
      <Stack.Screen
        options={{
          title: room.name,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Text style={{ fontSize: 16, color: "#111827" }}>← Home</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventCard event={item} />}
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: "#f9fafb" }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 40,
        }}
        ListHeaderComponent={
          showBanner ? (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-3 flex-row items-start">
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
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-gray-400 text-base">
              No events scheduled yet.
            </Text>
          </View>
        }
      />
    </>
  );
}

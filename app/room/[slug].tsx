import { db } from "@/lib/db";
import { APP_URL } from "@/constants/config";
import { AppSchema } from "@/instant.schema";
import { InstaQLEntity } from "@instantdb/react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

const webContentStyle =
  Platform.OS === "web"
    ? ({ maxWidth: 768, alignSelf: "center" as const, width: "100%" as const } as const)
    : undefined;

type Announcement = InstaQLEntity<AppSchema, "announcements">;
type RoomWithEvents = InstaQLEntity<
  AppSchema,
  "rooms",
  { events: { signups: {} }; announcements: {}; admin: {} }
>;
type EventWithSignups = InstaQLEntity<AppSchema, "events", { signups: {} }>;

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.07,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
} as const;

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
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.97 : 1 }],
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: 20,
          marginBottom: 12,
          ...CARD_SHADOW,
        }}
      >
        {/* Title + count badge */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
          <Text
            style={{ fontSize: 16, fontWeight: "700", color: "#0A0A0A", flex: 1, marginRight: 12 }}
            numberOfLines={2}
          >
            {event.title}
          </Text>
          <View style={{ backgroundColor: "#0A0A0A", borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 }}>
            <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>{count}</Text>
          </View>
        </View>

        {/* Date row */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: "#6B7280" }}>{formatDay(event.date)}</Text>
          <Text style={{ color: "#D1D5DB", marginHorizontal: 6 }}>·</Text>
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#6B7280" }}>
            {formatTime(event.date)}
          </Text>
        </View>

        {event.location ? (
          <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{event.location}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function RoomScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const { user } = db.useAuth();

  const { isLoading, error, data } = db.useQuery({
    rooms: {
      events: {
        signups: {},
        $: { order: { date: "asc" } },
      },
      announcements: {},
      admin: {},
      $: { where: { slug } },
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0A0A0A" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text style={{ color: "#EF4444", textAlign: "center" }}>{error.message}</Text>
      </View>
    );
  }

  const room = data?.rooms?.[0] as RoomWithEvents | undefined;

  if (!room) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#0A0A0A", marginBottom: 8 }}>
          Room not found
        </Text>
        <Text style={{ color: "#6B7280", textAlign: "center", marginBottom: 24 }}>
          No room with code "{slug}" exists.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            backgroundColor: "#0A0A0A",
            borderRadius: 50,
            paddingHorizontal: 28,
            paddingVertical: 14,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Go Back</Text>
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
  const isAdmin = !!user && (room.admin as any)?.id === user.id;

  return (
    <>
      <Head>
        <meta property="og:title" content={`${room.name} – I'm IN`} />
        <meta
          property="og:description"
          content={`Sign up for events at ${room.name}.`}
        />
        <meta property="og:url" content={`${APP_URL}/room/${room.slug}`} />
      </Head>
      <Stack.Screen
        options={{
          title: room.name,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.5 : 1,
                flexDirection: "row" as const,
                alignItems: "center" as const,
                gap: 4,
              })}
            >
              <Text style={{ fontSize: 20, color: "#0A0A0A" }}>←</Text>
              <Text style={{ fontSize: 16, color: "#0A0A0A", fontWeight: "500" }}>Home</Text>
            </Pressable>
          ),
        }}
      />
      <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard event={item} />}
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 100,
            ...(webContentStyle ?? {}),
          }}
          ListHeaderComponent={
            <>
              {/* Large room name header */}
              <View style={{ paddingTop: 20, paddingBottom: 16 }}>
                <Text
                  style={{ fontSize: 32, fontWeight: "800", color: "#0A0A0A" }}
                >
                  {room.name}
                </Text>
              </View>

              {/* Announcement banner */}
              {showBanner ? (
                <View
                  style={{
                    backgroundColor: "#FFFBEB",
                    borderColor: "#FDE68A",
                    borderWidth: 1,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginBottom: 12,
                    flexDirection: "row",
                    alignItems: "flex-start",
                  }}
                >
                  <Text style={{ marginRight: 8, marginTop: 2 }}>📢</Text>
                  <Text style={{ flex: 1, color: "#92400E", fontSize: 14, lineHeight: 20 }}>
                    {latestAnn.message}
                  </Text>
                  <Pressable
                    onPress={() => setDismissed(true)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text style={{ color: "#B45309", marginLeft: 8, fontWeight: "700", fontSize: 16 }}>✕</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 80 }}>
              <Text style={{ color: "#9CA3AF", fontSize: 16 }}>
                No events scheduled yet.
              </Text>
            </View>
          }
        />

        {/* Admin FAB */}
        {isAdmin && (
          <Pressable
            onPress={() => router.push("/admin")}
            style={({ pressed }) => ({
              position: "absolute",
              bottom: 32,
              right: 24,
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "#0A0A0A",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.8 : 1,
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            })}
          >
            <Text style={{ color: "white", fontSize: 30, lineHeight: 34, fontWeight: "300" }}>+</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

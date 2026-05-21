import { db } from "@/lib/db";
import { APP_URL } from "@/constants/config";
import { C, SHADOW } from "@/constants/design";
import { AppSchema } from "@/instant.schema";
import { InstaQLEntity } from "@instantdb/react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ───────────────────────────────────────────────────────────────────

type Announcement = InstaQLEntity<AppSchema, "announcements">;
type RoomWithAll = InstaQLEntity<
  AppSchema,
  "rooms",
  { events: { signups: {}; photos: {} }; announcements: {}; admin: {}; photos: {} }
>;
type EventWithSignupsAndPhotos = InstaQLEntity<AppSchema, "events", { signups: {}; photos: {} }>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── EventCard ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: EventWithSignupsAndPhotos }) {
  const router = useRouter();
  const count = event.signups?.length ?? 0;
  const coverUrl = (event.photos as any)?.[0]?.url ?? null;
  const category = (event as any).category as string | undefined;

  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}`)}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 })}
    >
      <View style={{ backgroundColor: C.WHITE, borderRadius: 16, marginBottom: 12, overflow: "hidden", ...SHADOW }}>
        <View style={{ height: 160, backgroundColor: C.PLACEHOLDER_BG }}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={{ width: "100%", height: 160 }} contentFit="cover" />
          ) : null}
          {category ? (
            <View style={{ position: "absolute", bottom: 10, left: 12, backgroundColor: C.BG, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.PRIMARY }}>{category}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.PRIMARY }} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={{ fontSize: 13, color: C.SECONDARY, marginTop: 6 }}>
            🕐 {formatDay(event.date)} · {formatTime(event.date)}
          </Text>
          {event.location ? (
            <Text style={{ fontSize: 13, color: C.MUTED, marginTop: 2 }}>📍 {event.location}</Text>
          ) : null}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
            <View style={{ backgroundColor: C.PRIMARY, borderRadius: 50, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>
                {count} {count === 1 ? "person" : "people"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── HomeTab ─────────────────────────────────────────────────────────────────

function HomeTab({
  events,
  announcement,
  bottomInset,
  webStyle,
}: {
  events: EventWithSignupsAndPhotos[];
  announcement: Announcement | null;
  bottomInset: number;
  webStyle: object;
}) {
  const [dismissed, setDismissed] = useState(false);
  const showBanner = !!announcement && !dismissed;

  if (events.length === 0) {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomInset + 16, ...webStyle }}
      >
        {showBanner && (
          <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#FFFBEB", borderColor: "#FDE68A", borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "flex-start" }}>
            <Text style={{ marginRight: 8, marginTop: 2 }}>📢</Text>
            <Text style={{ flex: 1, color: "#92400E", fontSize: 14, lineHeight: 20 }}>{announcement!.message}</Text>
            <Pressable onPress={() => setDismissed(true)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ color: "#B45309", marginLeft: 8, fontWeight: "700", fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>
        )}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 64, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🥋</Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: C.PRIMARY, textAlign: "center" }}>
            No events yet
          </Text>
          <Text style={{ fontSize: 15, color: C.SECONDARY, textAlign: "center", marginTop: 8, lineHeight: 22 }}>
            Your coach hasn't added any events yet.{"\n"}Check back soon!
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <EventCard event={item} />}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: bottomInset + 16, ...webStyle }}
      ListHeaderComponent={
        showBanner ? (
          <View style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A", borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12, flexDirection: "row", alignItems: "flex-start" }}>
            <Text style={{ marginRight: 8, marginTop: 2 }}>📢</Text>
            <Text style={{ flex: 1, color: "#92400E", fontSize: 14, lineHeight: 20 }}>{announcement!.message}</Text>
            <Pressable onPress={() => setDismissed(true)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ color: "#B45309", marginLeft: 8, fontWeight: "700", fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>
        ) : null
      }
    />
  );
}

// ─── RoomScreen ───────────────────────────────────────────────────────────────

export default function RoomScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const canGoBack = router.canGoBack();

  const { user } = db.useAuth();

  const { isLoading, error, data } = db.useQuery({
    rooms: {
      events: {
        signups: {},
        photos: {},
        $: { order: { date: "asc" } },
      },
      announcements: {},
      admin: {},
      photos: {},
      $: { where: { slug } },
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.WHITE }}>
        <ActivityIndicator size="large" color={C.PRIMARY} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.WHITE, padding: 24 }}>
        <Text style={{ color: C.ACCENT, textAlign: "center" }}>{error.message}</Text>
      </View>
    );
  }

  const room = data?.rooms?.[0] as RoomWithAll | undefined;

  if (!room) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.WHITE, padding: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.PRIMARY, marginBottom: 8 }}>Room not found</Text>
        <Text style={{ color: C.SECONDARY, textAlign: "center", marginBottom: 24 }}>
          No room with code "{slug}" exists.
        </Text>
        <Pressable
          onPress={() => router.push("/")}
          style={({ pressed }) => ({ backgroundColor: C.PRIMARY, borderRadius: 50, paddingHorizontal: 28, paddingVertical: 14, opacity: pressed ? 0.8 : 1 })}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Go Home</Text>
        </Pressable>
      </View>
    );
  }

  const events = (room.events ?? []) as EventWithSignupsAndPhotos[];
  const announcements = (room.announcements ?? []) as Announcement[];
  const latestAnn = [...announcements].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0] ?? null;
  const isAdmin = !!user && (room.admin as any)?.id === user.id;
  const coverUrl = (room.photos as any)?.[0]?.url ?? null;

  const webRootStyle = Platform.OS === "web"
    ? ({ maxWidth: 480, alignSelf: "center" as const, width: "100%" as const } as const)
    : {};
  const webContentStyle = Platform.OS === "web"
    ? ({ maxWidth: 480, alignSelf: "center" as const, width: "100%" as const } as const)
    : {};

  const bottomInset = insets.bottom;

  return (
    <>
      <Head>
        <meta property="og:title" content={`${room.name} – I'm IN`} />
        <meta property="og:description" content={`Sign up for events at ${room.name}.`} />
        <meta property="og:url" content={`${APP_URL}/room/${room.slug}`} />
      </Head>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#1C242B" }}>{room.name}</Text>
          ),
          headerLeft: () => (
            <Pressable
              onPress={() => router.push("/")}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, flexDirection: "row" as const, alignItems: "center" as const, gap: 6, paddingLeft: 4 })}
            >
              <Text style={{ fontSize: 18 }}>🏠</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1C242B", fontStyle: "italic" as const }}>I'm IN</Text>
            </Pressable>
          ),
        }}
      />

      <View style={{ flex: 1, backgroundColor: C.WHITE, ...webRootStyle }}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={{ height: 200, width: "100%" }} contentFit="cover" />
        ) : null}

        <HomeTab
          events={events}
          announcement={latestAnn}
          bottomInset={bottomInset}
          webStyle={webContentStyle}
        />

        {isAdmin && (
          <Pressable
            onPress={() => router.push("/admin")}
            style={({ pressed }) => ({
              position: "absolute",
              bottom: bottomInset + 24,
              right: 24,
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: C.PRIMARY,
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
            <Text style={{ color: "white", fontSize: 26, lineHeight: 30, fontWeight: "300" }}>+</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

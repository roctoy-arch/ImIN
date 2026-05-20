import { db } from "@/lib/db";
import { APP_URL } from "@/constants/config";
import { C, SHADOW } from "@/constants/design";
import { AppSchema } from "@/instant.schema";
import { InstaQLEntity } from "@instantdb/react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import * as Linking from "expo-linking";
import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
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

type TabId = "home" | "map" | "whos-in" | "photos";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "home", label: "Events", icon: "🏠" },
  { id: "map", label: "Map", icon: "🗺️" },
  { id: "whos-in", label: "Members", icon: "👥" },
  { id: "photos", label: "Photos", icon: "📸" },
];

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

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const daysToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { weekStart: monday.getTime(), weekEnd: sunday.getTime() };
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

// ─── BottomNav ───────────────────────────────────────────────────────────────

function BottomNav({
  activeTab,
  onSelect,
  bottomInset,
}: {
  activeTab: TabId;
  onSelect: (id: TabId) => void;
  bottomInset: number;
}) {
  const posStyle = Platform.OS === "web"
    ? ({ marginHorizontal: 16, marginBottom: 8 } as const)
    : { position: "absolute" as const, bottom: bottomInset + 8, left: 16, right: 16 };

  return (
    <View
      style={[
        posStyle,
        {
          backgroundColor: C.PRIMARY,
          borderRadius: 40,
          paddingVertical: 6,
          paddingHorizontal: 6,
          flexDirection: "row",
          zIndex: 100,
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        },
      ]}
    >
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onSelect(tab.id)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View
              style={{
                backgroundColor: active ? C.WHITE : "transparent",
                borderRadius: 28,
                paddingHorizontal: 12,
                paddingVertical: 7,
                alignItems: "center",
                gap: 2,
              }}
            >
              <Text style={{ fontSize: 17 }}>{tab.icon}</Text>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: active ? C.PRIMARY : "rgba(255,255,255,0.75)",
                }}
              >
                {tab.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 + bottomInset, ...webStyle }}
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
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 + bottomInset, ...webStyle }}
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

// ─── MapTab ───────────────────────────────────────────────────────────────────

function MapTab({
  events,
  bottomInset,
  webStyle,
}: {
  events: EventWithSignupsAndPhotos[];
  bottomInset: number;
  webStyle: object;
}) {
  const router = useRouter();
  const eventsWithLocation = events.filter((e) => !!e.location);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 + bottomInset, ...webStyle }}
    >
      {eventsWithLocation.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 64, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🗺️</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.PRIMARY }}>No locations yet</Text>
          <Text style={{ fontSize: 14, color: C.SECONDARY, marginTop: 6, textAlign: "center" }}>
            Events with locations will show up here
          </Text>
        </View>
      ) : (
        eventsWithLocation.map((event) => (
          <View key={event.id} style={{ backgroundColor: "#F0F0FF", borderRadius: 16, marginBottom: 12, overflow: "hidden" }}>
            <Pressable
              onPress={() => router.push(`/event/${event.id}`)}
              style={({ pressed }) => ({ padding: 16, opacity: pressed ? 0.85 : 1 })}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: C.PRIMARY }}>{event.title}</Text>
              <Text style={{ fontSize: 13, color: C.SECONDARY, marginTop: 4 }}>
                📅 {formatDay(event.date)} · {formatTime(event.date)}
              </Text>
              <Text style={{ fontSize: 13, color: C.MUTED, marginTop: 4 }}>📍 {event.location}</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(event.location!)}`)}
              style={({ pressed }) => ({
                backgroundColor: C.PRIMARY,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>Open in Google Maps →</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ─── WhosInTab ────────────────────────────────────────────────────────────────

function WhosInTab({
  events,
  bottomInset,
  webStyle,
}: {
  events: EventWithSignupsAndPhotos[];
  bottomInset: number;
  webStyle: object;
}) {
  const { weekStart, weekEnd } = getWeekBounds();
  const thisWeekEvents = events.filter((e) => e.date >= weekStart && e.date <= weekEnd);

  const totalCount = thisWeekEvents.reduce((sum, e) => sum + (e.signups?.length ?? 0), 0);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 + bottomInset, ...webStyle }}
    >
      <View style={{ paddingVertical: 12 }}>
        <Text style={{ fontSize: 15, color: C.SECONDARY }}>
          {totalCount} {totalCount === 1 ? "sign-up" : "sign-ups"} this week
        </Text>
      </View>

      {thisWeekEvents.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 48 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>👥</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.PRIMARY }}>No sign-ups yet</Text>
          <Text style={{ fontSize: 14, color: C.SECONDARY, marginTop: 6 }}>Check back when events are closer</Text>
        </View>
      ) : (
        thisWeekEvents.map((e) => {
          const signups = e.signups ?? [];
          return (
            <View key={e.id} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: C.PRIMARY }}>{e.title}</Text>
                  <Text style={{ fontSize: 12, color: C.MUTED, marginTop: 2 }}>
                    {formatDay(e.date)} · {formatTime(e.date)}
                  </Text>
                </View>
                <View style={{ backgroundColor: C.BG, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.PRIMARY }}>{signups.length}</Text>
                </View>
              </View>
              {signups.length === 0 ? (
                <Text style={{ fontSize: 13, color: C.MUTED, paddingLeft: 4 }}>No sign-ups yet</Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {signups.map((s) => (
                    <View key={s.id} style={{ backgroundColor: C.BG, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: C.PRIMARY }}>{s.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

// ─── PhotosTab ────────────────────────────────────────────────────────────────

type PhotoItem = { id: string; url: string; eventTitle: string };

function PhotosTab({
  events,
  bottomInset,
}: {
  events: EventWithSignupsAndPhotos[];
  bottomInset: number;
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const screenWidth = Math.min(Dimensions.get("window").width, 480);
  const cellSize = Math.floor((screenWidth - 4) / 3);

  const allPhotos: PhotoItem[] = events.flatMap((e) =>
    ((e.photos ?? []) as any[]).map((p: any) => ({ id: p.id, url: p.url, eventTitle: e.title }))
  );

  return (
    <>
      {allPhotos.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📸</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.PRIMARY }}>No photos yet</Text>
          <Text style={{ fontSize: 14, color: C.SECONDARY, marginTop: 6 }}>Photos will appear after events</Text>
        </View>
      ) : (
        <FlatList
          key="photos-grid"
          data={allPhotos}
          keyExtractor={(item) => item.id}
          numColumns={3}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 + bottomInset, gap: 2 }}
          columnWrapperStyle={{ gap: 2 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setLightboxUrl(item.url)}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Image source={{ uri: item.url }} style={{ width: cellSize, height: cellSize, backgroundColor: C.PLACEHOLDER_BG }} contentFit="cover" />
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!lightboxUrl} transparent animationType="fade" onRequestClose={() => setLightboxUrl(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" }}>
          {lightboxUrl && (
            <Image source={{ uri: lightboxUrl }} style={{ width: "100%", height: "80%" }} contentFit="contain" />
          )}
          <Pressable
            onPress={() => setLightboxUrl(null)}
            style={({ pressed }) => ({
              position: "absolute",
              top: 56,
              right: 20,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>✕</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

// ─── RoomScreen ───────────────────────────────────────────────────────────────

export default function RoomScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabId>("home");

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
          onPress={() => router.back()}
          style={({ pressed }) => ({ backgroundColor: C.PRIMARY, borderRadius: 50, paddingHorizontal: 28, paddingVertical: 14, opacity: pressed ? 0.8 : 1 })}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Go Back</Text>
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
    ? ({ maxWidth: 480, alignSelf: "center" as const, width: "100%" as const, height: "100dvh" as any } as const)
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
          title: room.name,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, flexDirection: "row" as const, alignItems: "center" as const, gap: 4 })}
            >
              <Text style={{ fontSize: 20, color: C.PRIMARY }}>←</Text>
              <Text style={{ fontSize: 16, color: C.PRIMARY, fontWeight: "500" }}>Home</Text>
            </Pressable>
          ),
        }}
      />

      <View style={{ flex: 1, backgroundColor: C.WHITE, ...webRootStyle }}>
        {/* Room cover photo */}
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={{ height: 200, width: "100%" }} contentFit="cover" />
        ) : null}

        {/* Tab content */}
        <View style={{ flex: 1, ...(Platform.OS === "web" ? { overflow: "hidden" as const } : {}) }}>
          {activeTab === "home" && (
            <HomeTab
              events={events}
              announcement={latestAnn}
              bottomInset={bottomInset}
              webStyle={webContentStyle}
            />
          )}
          {activeTab === "map" && (
            <MapTab events={events} bottomInset={bottomInset} webStyle={webContentStyle} />
          )}
          {activeTab === "whos-in" && (
            <WhosInTab events={events} bottomInset={bottomInset} webStyle={webContentStyle} />
          )}
          {activeTab === "photos" && (
            <PhotosTab events={events} bottomInset={bottomInset} />
          )}
        </View>

        {/* Bottom navigation */}
        <BottomNav activeTab={activeTab} onSelect={setActiveTab} bottomInset={bottomInset} />

        {/* Admin FAB (above bottom nav) */}
        {isAdmin && (
          <Pressable
            onPress={() => router.push("/admin")}
            style={({ pressed }) => ({
              position: "absolute",
              bottom: 96 + bottomInset,
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

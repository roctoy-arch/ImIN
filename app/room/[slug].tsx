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

type TabId = "home" | "calendar" | "whos-in" | "photos";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "calendar", label: "Calendar", icon: "📅" },
  { id: "whos-in", label: "Who's In", icon: "👥" },
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
  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: C.PRIMARY,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: bottomInset,
        paddingTop: 10,
        paddingHorizontal: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        minHeight: 62,
      }}
    >
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onSelect(tab.id)}
            style={({ pressed }) => ({
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? C.WHITE : "transparent",
              borderRadius: 50,
              paddingHorizontal: active ? 16 : 12,
              paddingVertical: 8,
              flexDirection: "row",
              gap: 6,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 16 }}>{tab.icon}</Text>
            {active && (
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.PRIMARY }}>{tab.label}</Text>
            )}
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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 + bottomInset, ...webStyle }}
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
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80 + bottomInset, ...webStyle }}
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

// ─── CalendarTab ─────────────────────────────────────────────────────────────

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function CalendarTab({
  events,
  bottomInset,
  webStyle,
}: {
  events: EventWithSignupsAndPhotos[];
  bottomInset: number;
  webStyle: object;
}) {
  const router = useRouter();
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  const eventsByDay: Record<number, EventWithSignupsAndPhotos[]> = {};
  for (const e of events) {
    const d = new Date(e.date);
    if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(e);
    }
  }

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  function prevMonth() {
    if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); }
    else setCalMonth(calMonth - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); }
    else setCalMonth(calMonth + 1);
    setSelectedDay(null);
  }

  const isToday = (day: number) =>
    day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80 + bottomInset, ...webStyle }}
    >
      {/* Month nav */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Pressable onPress={prevMonth} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 })}>
          <Text style={{ fontSize: 20, color: C.PRIMARY }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "800", color: C.PRIMARY }}>
          {MONTH_NAMES[calMonth]} {calYear}
        </Text>
        <Pressable onPress={nextMonth} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 })}>
          <Text style={{ fontSize: 20, color: C.PRIMARY }}>›</Text>
        </Pressable>
      </View>

      {/* Day headers */}
      <View style={{ flexDirection: "row", marginBottom: 4 }}>
        {DAY_HEADERS.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: C.MUTED }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", backgroundColor: C.WHITE, borderRadius: 16, ...SHADOW, padding: 4 }}>
        {Array.from({ length: totalCells }, (_, i) => {
          const day = i - firstDayOfWeek + 1;
          const valid = day >= 1 && day <= daysInMonth;
          const hasEvents = valid && !!eventsByDay[day];
          const isSelected = valid && selectedDay === day;
          const today = valid && isToday(day);
          return (
            <Pressable
              key={i}
              onPress={() => valid ? setSelectedDay(isSelected ? null : day) : undefined}
              style={{ width: `${100 / 7}%`, alignItems: "center", paddingVertical: 6 }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected ? C.PRIMARY : today ? C.BG : "transparent",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: today || isSelected ? "700" : "400", color: isSelected ? "white" : valid ? C.PRIMARY : "transparent" }}>
                  {valid ? day : ""}
                </Text>
              </View>
              {hasEvents && (
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isSelected ? C.WHITE : C.PRIMARY, marginTop: 2 }} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Selected day events */}
      <View style={{ marginTop: 20 }}>
        {selectedDay === null ? (
          <Text style={{ color: C.MUTED, textAlign: "center", fontSize: 14 }}>Tap a day to see events</Text>
        ) : selectedEvents.length === 0 ? (
          <Text style={{ color: C.MUTED, textAlign: "center", fontSize: 14 }}>No events on this day</Text>
        ) : (
          <>
            <Text style={{ fontSize: 13, fontWeight: "700", color: C.MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
              {MONTH_NAMES[calMonth]} {selectedDay}
            </Text>
            {selectedEvents.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => router.push(`/event/${e.id}`)}
                style={({ pressed }) => ({
                  backgroundColor: C.WHITE,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 8,
                  ...SHADOW,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: C.PRIMARY }}>{e.title}</Text>
                <Text style={{ fontSize: 13, color: C.SECONDARY, marginTop: 4 }}>
                  🕐 {formatTime(e.date)}{e.location ? ` · 📍 ${e.location}` : ""}
                </Text>
              </Pressable>
            ))}
          </>
        )}
      </View>
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
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80 + bottomInset, ...webStyle }}
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
          contentContainerStyle={{ paddingBottom: 80 + bottomInset, gap: 2 }}
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
    ? ({ maxWidth: 480, alignSelf: "center" as const, width: "100%" as const, minHeight: "100dvh" as any } as const)
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
        <View style={{ flex: 1 }}>
          {activeTab === "home" && (
            <HomeTab
              events={events}
              announcement={latestAnn}
              bottomInset={bottomInset}
              webStyle={webContentStyle}
            />
          )}
          {activeTab === "calendar" && (
            <CalendarTab events={events} bottomInset={bottomInset} webStyle={webContentStyle} />
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
              bottom: 72 + bottomInset + 16,
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

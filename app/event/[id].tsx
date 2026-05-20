import { db } from "@/lib/db";
import { APP_URL } from "@/constants/config";
import { C, CATEGORIES, SHADOW } from "@/constants/design";
import { AppSchema } from "@/instant.schema";
import { InstaQLEntity, id } from "@instantdb/react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Signup = InstaQLEntity<AppSchema, "signups">;
type Photo = InstaQLEntity<AppSchema, "$files">;
type Comment = InstaQLEntity<AppSchema, "comments">;
type EventDetail = InstaQLEntity<
  AppSchema,
  "events",
  { signups: {}; photos: {}; room: { admin: {} }; comments: {} }
>;

const SCREEN_WIDTH = Dimensions.get("window").width;
const EFFECTIVE_WIDTH = Math.min(SCREEN_WIDTH, 768);
const GALLERY_PADDING = 20;
const TILE_GAP = 8;
const TILE_SIZE = Math.floor(
  (EFFECTIVE_WIDTH - GALLERY_PADDING * 2 - TILE_GAP) / 2
);

const webContentStyle =
  Platform.OS === "web"
    ? ({ maxWidth: 768, alignSelf: "center" as const, width: "100%" as const } as const)
    : undefined;

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6",
];

function getAvatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(epoch: number) {
  return new Date(epoch).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortTime(epoch: number) {
  return new Date(epoch).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PhotoLightbox({
  url,
  onClose,
}: {
  url: string | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!url} transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.lightboxBg} onPress={onClose}>
        {url ? (
          <Image
            source={{ uri: url }}
            style={styles.lightboxImage}
            contentFit="contain"
          />
        ) : null}
        <View style={styles.lightboxClose}>
          <Text style={styles.lightboxCloseText}>✕</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

function EditEventModal({
  visible,
  event,
  onClose,
}: {
  visible: boolean;
  event: EventDetail;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [location, setLocation] = useState(event.location);
  const [eventDate, setEventDate] = useState(new Date(event.date));
  const [category, setCategory] = useState<string>((event as any).category ?? "");
  const [saving, setSaving] = useState(false);
  const [androidStep, setAndroidStep] = useState<"date" | "time" | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle(event.title);
      setDescription(event.description);
      setLocation(event.location);
      setEventDate(new Date(event.date));
      setCategory((event as any).category ?? "");
    }
  }, [visible]);

  function onPickerChange(_ev: DateTimePickerEvent, selected?: Date) {
    if (!selected) return;
    if (Platform.OS === "android") {
      if (_ev.type === "dismissed") { setAndroidStep(null); return; }
      if (androidStep === "date") {
        const next = new Date(selected);
        next.setHours(eventDate.getHours(), eventDate.getMinutes(), 0, 0);
        setEventDate(next);
        setAndroidStep("time");
      } else {
        const next = new Date(eventDate);
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        setEventDate(next);
        setAndroidStep(null);
      }
    } else {
      setEventDate(selected);
    }
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await db.transact(
        db.tx.events[event.id].update({
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          date: eventDate.getTime(),
          ...(category ? { category } : {}),
        })
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    backgroundColor: C.INPUT,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.PRIMARY,
    marginBottom: 16,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.kavFlex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetContent}
          >
            <Text style={{ fontSize: 22, fontWeight: "800", color: C.PRIMARY, marginBottom: 24 }}>
              Edit Event
            </Text>

            <Text style={styles.label}>Title</Text>
            <TextInput style={inputStyle} placeholder="Event title" value={title} onChangeText={setTitle} />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[inputStyle, { minHeight: 72 }]} placeholder="Optional description" value={description} onChangeText={setDescription} multiline />

            <Text style={styles.label}>Location</Text>
            <TextInput style={inputStyle} placeholder="Optional location" value={location} onChangeText={setLocation} />

            <Text style={styles.label}>Category</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat === category ? "" : cat)}
                  style={{
                    backgroundColor: category === cat ? C.PRIMARY : C.BG,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: category === cat ? "white" : C.PRIMARY, fontSize: 13, fontWeight: "600" }}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Date & time</Text>
            {Platform.OS === "ios" ? (
              <DateTimePicker
                value={eventDate}
                mode="datetime"
                display="spinner"
                onChange={onPickerChange}
                style={{ marginBottom: 16 }}
                textColor={C.PRIMARY}
              />
            ) : (
              <>
                <Pressable
                  onPress={() => setAndroidStep("date")}
                  style={{ backgroundColor: C.INPUT, borderRadius: 12, padding: 16, marginBottom: 16 }}
                >
                  <Text style={{ fontSize: 16, color: C.PRIMARY }}>{eventDate.toLocaleString()}</Text>
                </Pressable>
                {androidStep !== null && (
                  <DateTimePicker value={eventDate} mode={androidStep} display="default" onChange={onPickerChange} />
                )}
              </>
            )}

            <Pressable
              onPress={handleSave}
              disabled={saving || !title.trim()}
              style={({ pressed }) => ({
                backgroundColor: C.PRIMARY,
                borderRadius: 50,
                paddingVertical: 18,
                alignItems: "center",
                marginTop: 8,
                transform: [{ scale: pressed ? 0.97 : 1 }],
                opacity: pressed || saving || !title.trim() ? 0.5 : 1,
              })}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 17 }}>
                {saving ? "Saving..." : "Save Changes"}
              </Text>
            </Pressable>
            <Pressable onPress={onClose} style={{ alignItems: "center", paddingVertical: 12, marginTop: 4 }}>
              <Text style={{ color: C.SECONDARY, fontSize: 15 }}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── MapPreviewCard ───────────────────────────────────────────────────────────

function MapPreviewCard({ location }: { location: string }) {
  const [mapError, setMapError] = useState(false);
  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${encodeURIComponent(location)}&zoom=15&size=600x200&maptype=mapnik&markers=${encodeURIComponent(location)},red`;

  return (
    <View style={{ backgroundColor: "#F0F0FF", borderRadius: 16, overflow: "hidden", marginTop: 4, marginBottom: 8 }}>
      {!mapError ? (
        <Image
          source={{ uri: mapUrl }}
          style={{ width: "100%", height: 160 }}
          contentFit="cover"
          onError={() => setMapError(true)}
        />
      ) : (
        <View style={{ height: 120, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>📍</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: C.PRIMARY, textAlign: "center" }} numberOfLines={2}>
            {location}
          </Text>
        </View>
      )}
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "#DDD8FF" }}>
        <Pressable
          onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(location)}`)}
          style={({ pressed }) => ({ flex: 1, paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.PRIMARY }}>Open in Maps</Text>
        </Pressable>
        <View style={{ width: 1, backgroundColor: "#DDD8FF" }} />
        <Pressable
          onPress={() => Linking.openURL(`https://maps.google.com/dir/?api=1&destination=${encodeURIComponent(location)}`)}
          style={({ pressed }) => ({ flex: 1, paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.PRIMARY }}>Get Directions</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [mySignupId, setMySignupId] = useState<string | null>(null);
  const [commentName, setCommentName] = useState("");
  const [commentMessage, setCommentMessage] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const { user } = db.useAuth();

  const { isLoading, error, data } = db.useQuery({
    events: {
      signups: { $: { order: { createdAt: "asc" } } },
      photos: {},
      room: { admin: {} },
      comments: { $: { order: { createdAt: "asc" } } },
      $: { where: { id: eventId } },
    },
  });

  useEffect(() => {
    AsyncStorage.getItem(`signup:${eventId}`).then((stored) => {
      if (stored) setMySignupId(stored);
    });
  }, [eventId]);

  const event = data?.events?.[0] as EventDetail | undefined;
  const signups = (event?.signups ?? []) as Signup[];
  const photos = (event?.photos ?? []) as Photo[];
  const comments = (event?.comments ?? []) as Comment[];
  const isAdmin = !!user && event?.room?.admin?.id === user.id;
  const coverUrl = photos[0]?.url ?? null;
  const category = (event as any)?.category as string | undefined;

  useEffect(() => {
    if (!mySignupId || !event) return;
    const still = signups.some((s) => s.id === mySignupId);
    if (!still) {
      setMySignupId(null);
      AsyncStorage.removeItem(`signup:${eventId}`);
    }
  }, [event]);

  async function handleCancelSignup() {
    if (!mySignupId) return;
    await db.transact(db.tx.signups[mySignupId].delete());
    await AsyncStorage.removeItem(`signup:${eventId}`);
    setMySignupId(null);
  }

  async function handleSharePhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const filename = asset.fileName ?? `photo-${Date.now()}.jpg`;
      const file = {
        uri: asset.uri,
        name: filename,
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as File;
      const { data: fileData } = await db.storage.uploadFile(
        `events/${eventId}/${filename}`,
        file
      );
      await db.transact(db.tx.events[eventId].link({ photos: fileData.id }));
    } catch (e: unknown) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  function handleDelete() {
    Alert.alert("Delete Event", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await db.transact(db.tx.events[eventId].delete());
          router.back();
        },
      },
    ]);
  }

  async function handlePostComment() {
    if (!commentName.trim() || !commentMessage.trim()) return;
    setPostingComment(true);
    try {
      await db.transact(
        db.tx.comments[id()]
          .update({
            name: commentName.trim(),
            message: commentMessage.trim(),
            createdAt: Date.now(),
          })
          .link({ event: eventId })
      );
      setCommentMessage("");
    } finally {
      setPostingComment(false);
    }
  }

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

  if (!event) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.WHITE }}>
        <Text style={{ color: C.MUTED }}>Event not found.</Text>
      </View>
    );
  }

  const commentInputStyle = {
    backgroundColor: C.INPUT,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: C.PRIMARY,
    marginBottom: 12,
  };

  return (
    <>
      <Head>
        <meta property="og:title" content={`${event.title} – I'm IN`} />
        <meta
          property="og:description"
          content={event.description ?? `Sign up for ${event.title}.`}
        />
        <meta property="og:url" content={`${APP_URL}/event/${event.id}`} />
      </Head>
      <Stack.Screen
        options={{
          title: event.title,
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
              <Text style={{ fontSize: 20, color: C.PRIMARY }}>←</Text>
              <Text style={{ fontSize: 16, color: C.PRIMARY, fontWeight: "500" }}>Back</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.WHITE }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={webContentStyle}
        >
          {/* Hero image / placeholder */}
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={{ height: 220, width: "100%" }}
              contentFit="cover"
            />
          ) : (
            <View style={{ height: 220, backgroundColor: C.PLACEHOLDER_BG }} />
          )}

          {/* White card overlapping hero */}
          <View
            style={{
              backgroundColor: C.WHITE,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              marginTop: -24,
              paddingHorizontal: 20,
              paddingTop: 24,
            }}
          >
            {/* Title */}
            <Text style={{ fontSize: 24, fontWeight: "800", color: C.PRIMARY, marginBottom: 8 }}>
              {event.title}
            </Text>

            {/* Category pill */}
            {category ? (
              <View style={{ flexDirection: "row", marginBottom: 12 }}>
                <View
                  style={{
                    backgroundColor: C.BG,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.PRIMARY }}>{category}</Text>
                </View>
              </View>
            ) : null}

            {/* Date + location */}
            <Text style={{ fontSize: 15, color: C.SECONDARY, marginBottom: 4 }}>
              📅 {formatDate(event.date)}
            </Text>
            {event.location ? (
              <Pressable
                onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(event.location)}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={{ fontSize: 15, color: C.SECONDARY, marginBottom: 4 }}>
                  📍 {event.location}
                </Text>
              </Pressable>
            ) : null}
            {event.location ? <MapPreviewCard location={event.location} /> : null}
            {event.description ? (
              <Text style={{ fontSize: 15, color: C.PRIMARY, marginTop: 12, lineHeight: 22 }}>
                {event.description}
              </Text>
            ) : null}

            {/* Admin controls */}
            {isAdmin && (
              <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                <Pressable
                  onPress={() => setShowEdit(true)}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: C.INPUT,
                    borderRadius: 16,
                    paddingVertical: 14,
                    alignItems: "center",
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  <Text style={{ color: C.PRIMARY, fontWeight: "600" }}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: "#FEF2F2",
                    borderRadius: 16,
                    paddingVertical: 14,
                    alignItems: "center",
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  <Text style={{ color: C.ACCENT, fontWeight: "600" }}>Delete</Text>
                </Pressable>
              </View>
            )}

            {/* I'M IN / I'M OUT */}
            {mySignupId ? (
              <Pressable
                onPress={handleCancelSignup}
                style={({ pressed }) => ({
                  backgroundColor: C.ACCENT,
                  borderRadius: 50,
                  paddingVertical: 20,
                  alignItems: "center",
                  marginTop: 20,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text style={{ color: "white", fontWeight: "900", fontSize: 18, letterSpacing: 1, textTransform: "uppercase" }}>
                  I'M OUT
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push(`/sign-up/${eventId}`)}
                style={({ pressed }) => ({
                  backgroundColor: C.PRIMARY,
                  borderRadius: 50,
                  paddingVertical: 20,
                  alignItems: "center",
                  marginTop: 20,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text style={{ color: "white", fontWeight: "900", fontSize: 18, letterSpacing: 1, textTransform: "uppercase" }}>
                  I'M IN
                </Text>
              </Pressable>
            )}

            {/* Share Event / QR Code */}
            <View style={{ marginTop: 28, backgroundColor: C.BG, borderRadius: 20, padding: 20, alignItems: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.PRIMARY, marginBottom: 16, letterSpacing: 0.8, textTransform: "uppercase" }}>
                Share Event
              </Text>
              <Image
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${APP_URL}/event/${eventId}`)}&color=1C242B&bgcolor=EEEEFF` }}
                style={{ width: 180, height: 180, borderRadius: 12 }}
                contentFit="contain"
              />
              <Text style={{ fontSize: 12, color: C.MUTED, marginTop: 10, textAlign: "center" }}>
                Scan to view & sign up for this event
              </Text>
              <Pressable
                onPress={() => { try { Share.share({ message: `Join ${event.title} on I'm IN! 👇 ${APP_URL}/event/${eventId}` }); } catch {} }}
                style={({ pressed }) => ({ marginTop: 14, backgroundColor: C.PRIMARY, borderRadius: 50, paddingHorizontal: 28, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>Share Event Link</Text>
              </Pressable>
            </View>

            {/* Who's in */}
            <View style={{ marginTop: 32 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: C.PRIMARY, marginBottom: 12 }}>
                Who's in ({signups.length})
              </Text>
              {signups.length === 0 ? (
                <Text style={{ color: C.MUTED, fontSize: 14 }}>Be the first to sign up!</Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {signups.map((s) => (
                    <View key={s.id} style={{ alignItems: "center", gap: 4 }}>
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: getAvatarColor(s.name),
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: "white", fontSize: 15, fontWeight: "700" }}>
                          {getInitials(s.name)}
                        </Text>
                      </View>
                      <Text
                        style={{ fontSize: 11, color: C.SECONDARY, maxWidth: 52, textAlign: "center" }}
                        numberOfLines={1}
                      >
                        {s.name.split(" ")[0]}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Photo gallery */}
            <View style={{ marginTop: 32 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: C.PRIMARY }}>
                  Photos ({photos.length})
                </Text>
                <Pressable
                  onPress={handleSharePhoto}
                  disabled={uploading}
                  style={({ pressed }) => ({ opacity: pressed || uploading ? 0.5 : 1 })}
                >
                  <Text style={{ color: C.PRIMARY, fontWeight: "600", fontSize: 14 }}>
                    {uploading ? "Uploading..." : "+ Add Photo"}
                  </Text>
                </Pressable>
              </View>

              {photos.length === 0 ? (
                <View
                  style={{
                    paddingVertical: 32,
                    alignItems: "center",
                    backgroundColor: C.INPUT,
                    borderRadius: 16,
                  }}
                >
                  <Text style={{ color: C.MUTED, fontSize: 14 }}>No photos yet.</Text>
                  <Text style={{ color: C.MUTED, fontSize: 13, marginTop: 4 }}>Be the first to share one!</Text>
                </View>
              ) : (
                <View style={styles.grid}>
                  {photos.map((photo) => (
                    <Pressable
                      key={photo.id}
                      onPress={() => setLightboxUrl(photo.url)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                    >
                      <Image source={{ uri: photo.url }} style={styles.tile} contentFit="cover" transition={200} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Comments */}
            <View style={{ marginTop: 32, marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: C.PRIMARY, marginBottom: 12 }}>
                Comments ({comments.length})
              </Text>

              {comments.length === 0 ? (
                <Text style={{ color: C.MUTED, fontSize: 14, marginBottom: 16 }}>No comments yet. Be the first!</Text>
              ) : (
                comments.map((c) => (
                  <View
                    key={c.id}
                    style={{
                      backgroundColor: C.WHITE,
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: 8,
                      ...SHADOW,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: getAvatarColor(c.name),
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: "white", fontSize: 11, fontWeight: "700" }}>{getInitials(c.name)}</Text>
                      </View>
                      <Text style={{ fontWeight: "600", fontSize: 13, color: C.PRIMARY }}>{c.name}</Text>
                      <Text style={{ fontSize: 11, color: C.MUTED, marginLeft: "auto" }}>
                        {formatShortTime(c.createdAt)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: C.PRIMARY, lineHeight: 20, marginLeft: 36 }}>
                      {c.message}
                    </Text>
                  </View>
                ))
              )}

              {/* Comment form */}
              <View style={{ backgroundColor: C.WHITE, borderRadius: 16, padding: 16, marginTop: 8, ...SHADOW }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.PRIMARY, marginBottom: 12 }}>
                  Leave a comment
                </Text>
                <Text style={styles.label}>Your name</Text>
                <TextInput
                  style={commentInputStyle}
                  placeholder="e.g. Alex"
                  placeholderTextColor={C.MUTED}
                  value={commentName}
                  onChangeText={setCommentName}
                  returnKeyType="next"
                />
                <Text style={styles.label}>Message</Text>
                <TextInput
                  style={[commentInputStyle, { minHeight: 64 }]}
                  placeholder="What's on your mind?"
                  placeholderTextColor={C.MUTED}
                  value={commentMessage}
                  onChangeText={setCommentMessage}
                  multiline
                  numberOfLines={2}
                  returnKeyType="send"
                  onSubmitEditing={handlePostComment}
                />
                <Pressable
                  onPress={handlePostComment}
                  disabled={postingComment || !commentName.trim() || !commentMessage.trim()}
                  style={({ pressed }) => ({
                    backgroundColor: C.PRIMARY,
                    borderRadius: 50,
                    paddingVertical: 14,
                    alignItems: "center",
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    opacity:
                      pressed || postingComment || !commentName.trim() || !commentMessage.trim()
                        ? 0.5
                        : 1,
                  })}
                >
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                    {postingComment ? "Posting..." : "Post Comment"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      {showEdit && (
        <EditEventModal visible={showEdit} event={event} onClose={() => setShowEdit(false)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: C.MUTED,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: TILE_GAP },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 12,
    backgroundColor: C.PLACEHOLDER_BG,
  },
  lightboxBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH },
  lightboxClose: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxCloseText: { color: "white", fontSize: 16, fontWeight: "600" },
  kavFlex: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: C.WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetContent: { padding: 24, paddingBottom: 48 },
});

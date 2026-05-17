import { db } from "@/lib/db";
import { APP_URL } from "@/constants/config";
import { AppSchema } from "@/instant.schema";
import { InstaQLEntity, id } from "@instantdb/react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
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
const TILE_GAP = 4;
const TILE_SIZE = Math.floor(
  (EFFECTIVE_WIDTH - GALLERY_PADDING * 2 - TILE_GAP * 2) / 3
);

const webContentStyle =
  Platform.OS === "web"
    ? ({ maxWidth: 768, alignSelf: "center" as const, width: "100%" as const } as const)
    : undefined;

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
  const [saving, setSaving] = useState(false);
  const [androidStep, setAndroidStep] = useState<"date" | "time" | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle(event.title);
      setDescription(event.description);
      setLocation(event.location);
      setEventDate(new Date(event.date));
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
        })
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }

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
            <Text className="text-xl font-bold text-gray-900 mb-4">Edit Event</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-3 mb-3 text-base text-gray-900"
              placeholder="Title *"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-3 mb-3 text-base text-gray-900"
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-3 mb-4 text-base text-gray-900"
              placeholder="Location"
              value={location}
              onChangeText={setLocation}
            />
            <Text className="text-sm font-medium text-gray-700 mb-1">Date & time</Text>
            {Platform.OS === "ios" ? (
              <DateTimePicker
                value={eventDate}
                mode="datetime"
                display="spinner"
                onChange={onPickerChange}
                style={{ marginBottom: 8 }}
                textColor="#111827"
              />
            ) : (
              <>
                <Pressable
                  onPress={() => setAndroidStep("date")}
                  className="border border-gray-200 rounded-lg px-3 py-3 mb-4"
                >
                  <Text className="text-base text-gray-900">
                    {eventDate.toLocaleString()}
                  </Text>
                </Pressable>
                {androidStep !== null && (
                  <DateTimePicker
                    value={eventDate}
                    mode={androidStep}
                    display="default"
                    onChange={onPickerChange}
                  />
                )}
              </>
            )}
            <Pressable
              onPress={handleSave}
              disabled={saving || !title.trim()}
              className="bg-black rounded-xl py-4 items-center mb-3 mt-2"
              style={({ pressed }) => ({
                opacity: pressed || saving || !title.trim() ? 0.5 : 1,
              })}
            >
              <Text className="text-white font-bold text-base">
                {saving ? "Saving..." : "Save Changes"}
              </Text>
            </Pressable>
            <Pressable onPress={onClose} className="items-center py-2">
              <Text className="text-gray-500">Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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

  // Clear stale signup reference if it was deleted externally
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

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400">Event not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Head>
        <meta property="og:title" content={`${event.title} – I'm IN`} />
        <meta
          property="og:description"
          content={event.description ?? `Sign up for ${event.title}.`}
        />
        <meta
          property="og:url"
          content={`${APP_URL}/event/${event.id}`}
        />
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
                gap: 2,
              })}
            >
              <Text style={{ fontSize: 22, color: "#111827", lineHeight: 26 }}>‹</Text>
              <Text style={{ fontSize: 16, color: "#111827", fontWeight: "500" }}>Back</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        className="flex-1 bg-gray-50"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={webContentStyle}
        >
          <View className="p-5">
            {/* Event info */}
            <Text className="text-2xl font-bold text-gray-900">{event.title}</Text>
            <Text className="text-sm text-gray-500 mt-1">{formatDate(event.date)}</Text>
            {event.location ? (
              <Text className="text-sm text-gray-500">{event.location}</Text>
            ) : null}
            {event.description ? (
              <Text className="text-base text-gray-700 mt-3">{event.description}</Text>
            ) : null}

            {/* Admin controls */}
            {isAdmin && (
              <View className="flex-row gap-3 mt-4">
                <Pressable
                  onPress={() => setShowEdit(true)}
                  className="flex-1 border border-gray-200 rounded-xl py-3 items-center bg-white"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Text className="text-gray-900 font-medium">Edit</Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  className="flex-1 border border-red-200 rounded-xl py-3 items-center bg-white"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Text className="text-red-500 font-medium">Delete</Text>
                </Pressable>
              </View>
            )}

            {/* I'm IN / I'm OUT button */}
            {mySignupId ? (
              <Pressable
                onPress={handleCancelSignup}
                className="bg-red-500 rounded-xl py-4 items-center mt-4"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Text className="text-white font-bold text-base">I'm OUT</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push(`/sign-up/${eventId}`)}
                className="bg-black rounded-xl py-4 items-center mt-4"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Text className="text-white font-bold text-base">I'm IN</Text>
              </Pressable>
            )}

            {/* Signups */}
            <View className="mt-6">
              <Text className="text-base font-semibold text-gray-900 mb-2">
                Who's in ({signups.length})
              </Text>
              {signups.length === 0 ? (
                <Text className="text-gray-400 text-sm">Be the first to sign up!</Text>
              ) : (
                signups.map((s) => (
                  <View
                    key={s.id}
                    className="flex-row items-center justify-between py-2 border-b border-gray-100"
                  >
                    <Text className="text-gray-900 font-medium">{s.name}</Text>
                    <Text className="text-gray-400 text-xs">
                      {formatShortTime(s.createdAt)}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Photo gallery */}
            <View className="mt-6 mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-semibold text-gray-900">
                  Photos ({photos.length})
                </Text>
                <Pressable
                  onPress={handleSharePhoto}
                  disabled={uploading}
                  style={({ pressed }) => ({
                    opacity: pressed || uploading ? 0.5 : 1,
                  })}
                >
                  <Text className="text-black font-medium text-sm">
                    {uploading ? "Uploading..." : "+ Share Photo"}
                  </Text>
                </Pressable>
              </View>

              {photos.length === 0 ? (
                <View className="py-8 items-center bg-gray-100 rounded-xl">
                  <Text className="text-gray-400 text-sm">No photos yet.</Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    Be the first to share one!
                  </Text>
                </View>
              ) : (
                <View style={styles.grid}>
                  {photos.map((photo) => (
                    <Pressable
                      key={photo.id}
                      onPress={() => setLightboxUrl(photo.url)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                    >
                      <Image
                        source={{ uri: photo.url }}
                        style={styles.tile}
                        contentFit="cover"
                        transition={200}
                      />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Comments */}
            <View className="mt-2 mb-4">
              <Text className="text-base font-semibold text-gray-900 mb-3">
                Comments ({comments.length})
              </Text>

              {comments.length === 0 ? (
                <Text className="text-gray-400 text-sm mb-4">
                  No comments yet. Be the first!
                </Text>
              ) : (
                comments.map((c) => (
                  <View
                    key={c.id}
                    className="bg-white rounded-xl p-3 mb-2 border border-gray-100"
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-gray-900 font-semibold text-sm">
                        {c.name}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {formatShortTime(c.createdAt)}
                      </Text>
                    </View>
                    <Text className="text-gray-700 text-sm leading-relaxed">
                      {c.message}
                    </Text>
                  </View>
                ))
              )}

              {/* Comment form */}
              <View className="bg-white rounded-xl p-4 border border-gray-100">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Leave a comment
                </Text>
                <TextInput
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 mb-2"
                  placeholder="Your name"
                  value={commentName}
                  onChangeText={setCommentName}
                  returnKeyType="next"
                />
                <TextInput
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 mb-3"
                  placeholder="Your message"
                  value={commentMessage}
                  onChangeText={setCommentMessage}
                  multiline
                  numberOfLines={2}
                  returnKeyType="send"
                  onSubmitEditing={handlePostComment}
                />
                <Pressable
                  onPress={handlePostComment}
                  disabled={
                    postingComment || !commentName.trim() || !commentMessage.trim()
                  }
                  className="bg-black rounded-xl py-3 items-center"
                  style={({ pressed }) => ({
                    opacity:
                      pressed ||
                      postingComment ||
                      !commentName.trim() ||
                      !commentMessage.trim()
                        ? 0.5
                        : 1,
                  })}
                >
                  <Text className="text-white font-bold text-sm">
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
        <EditEventModal
          visible={showEdit}
          event={event}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: TILE_GAP },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
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
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetContent: { padding: 24, paddingBottom: 48 },
});

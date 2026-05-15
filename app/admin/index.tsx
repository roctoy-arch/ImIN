import { db } from "@/lib/db";
import { AppSchema } from "@/instant.schema";
import { id, InstaQLEntity } from "@instantdb/react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";

type RoomWithEvents = InstaQLEntity<
  AppSchema,
  "rooms",
  { events: { signups: {} }; announcements: {} }
>;
type EventWithSignups = InstaQLEntity<AppSchema, "events", { signups: {} }>;
type Announcement = InstaQLEntity<AppSchema, "announcements">;

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function formatDate(epoch: number) {
  return new Date(epoch).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function deriveSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateRecurringDates(start: Date, rule: string, count = 4): Date[] {
  const out: Date[] = [];
  if (rule === "daily") {
    for (let i = 1; i <= count; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
  } else if (rule === "weekly") {
    for (let i = 1; i <= count; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * 7);
      out.push(d);
    }
  } else if (rule.startsWith("weekly:")) {
    const days = rule.slice(7).split(",").map(Number);
    const cur = new Date(start);
    cur.setDate(cur.getDate() + 1);
    while (out.length < count) {
      if (days.includes(cur.getDay())) out.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return out;
}

// ─── Stats section ────────────────────────────────────────────────────────────

function StatsSection({ events }: { events: EventWithSignups[] }) {
  const startOfWeek = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d.getTime();
  })();
  const endOfWeek = startOfWeek + 7 * 86400000;

  const thisWeekSignups = events
    .filter((e) => (e.date ?? 0) >= startOfWeek && (e.date ?? 0) < endOfWeek)
    .reduce((s, e) => s + (e.signups?.length ?? 0), 0);

  const mostPopular = [...events].sort(
    (a, b) => (b.signups?.length ?? 0) - (a.signups?.length ?? 0)
  )[0];

  const eventsWithAny = events.filter((e) => (e.signups?.length ?? 0) > 0);
  const avgAttendance = eventsWithAny.length
    ? Math.round(
        eventsWithAny.reduce((s, e) => s + (e.signups?.length ?? 0), 0) /
          eventsWithAny.length
      )
    : 0;

  return (
    <View className="px-5 pb-4">
      <Text className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Stats
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center border border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">{thisWeekSignups}</Text>
          <Text className="text-xs text-gray-400 text-center mt-0.5">signups{"\n"}this week</Text>
        </View>
        <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center border border-gray-100">
          <Text
            className="text-base font-bold text-gray-900 text-center"
            numberOfLines={2}
          >
            {mostPopular?.title ?? "—"}
          </Text>
          <Text className="text-xs text-gray-400 text-center mt-0.5">most{"\n"}popular</Text>
        </View>
        <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center border border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">{avgAttendance}</Text>
          <Text className="text-xs text-gray-400 text-center mt-0.5">avg{"\n"}attendance</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Event modal (create or edit) ─────────────────────────────────────────────

function EventModal({
  visible,
  roomId,
  editEvent,
  onClose,
}: {
  visible: boolean;
  roomId: string;
  editEvent?: EventWithSignups;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(editEvent?.title ?? "");
  const [description, setDescription] = useState(editEvent?.description ?? "");
  const [location, setLocation] = useState(editEvent?.location ?? "");
  const [eventDate, setEventDate] = useState(
    editEvent ? new Date(editEvent.date) : new Date()
  );
  const [saving, setSaving] = useState(false);
  const [androidStep, setAndroidStep] = useState<"date" | "time" | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "custom">(
    "weekly"
  );
  const [customDays, setCustomDays] = useState<number[]>([]);

  useEffect(() => {
    if (visible) {
      setTitle(editEvent?.title ?? "");
      setDescription(editEvent?.description ?? "");
      setLocation(editEvent?.location ?? "");
      setEventDate(editEvent ? new Date(editEvent.date) : new Date());
      setIsRecurring(false);
      setRecurrenceType("weekly");
      setCustomDays([]);
    }
  }, [visible, editEvent]);

  function onPickerChange(_ev: DateTimePickerEvent, selected?: Date) {
    if (!selected) return;
    if (Platform.OS === "android") {
      if (_ev.type === "dismissed") {
        setAndroidStep(null);
        return;
      }
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

  function toggleCustomDay(day: number) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editEvent) {
        await db.transact(
          db.tx.events[editEvent.id].update({
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            date: eventDate.getTime(),
          })
        );
      } else {
        const rule =
          !isRecurring
            ? "none"
            : recurrenceType === "daily"
            ? "daily"
            : recurrenceType === "weekly"
            ? "weekly"
            : customDays.length > 0
            ? `weekly:${[...customDays].sort().join(",")}`
            : "weekly";

        const baseId = id();
        const steps: ReturnType<typeof db.tx.events[string]["update"]>[] = [
          db.tx.events[baseId]
            .update({
              title: title.trim(),
              description: description.trim(),
              location: location.trim(),
              date: eventDate.getTime(),
              isRecurring,
              recurrenceRule: rule,
            })
            .link({ room: roomId }),
        ];

        if (isRecurring && rule !== "none") {
          for (const d of generateRecurringDates(eventDate, rule)) {
            steps.push(
              db.tx.events[id()]
                .update({
                  title: title.trim(),
                  description: description.trim(),
                  location: location.trim(),
                  date: d.getTime(),
                  isRecurring: true,
                  recurrenceRule: rule,
                })
                .link({ room: roomId })
            );
          }
        }

        await db.transact(steps);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const recurringTypes: { label: string; value: "daily" | "weekly" | "custom" }[] = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Custom", value: "custom" },
  ];

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
            <Text className="text-xl font-bold text-gray-900 mb-4">
              {editEvent ? "Edit Event" : "New Event"}
            </Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-3 mb-3 text-base text-gray-900"
              placeholder="Title *"
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-3 mb-3 text-base text-gray-900"
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-3 mb-4 text-base text-gray-900"
              placeholder="Location"
              value={location}
              onChangeText={setLocation}
              returnKeyType="done"
            />
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Date & time
            </Text>
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
                    {formatDate(eventDate.getTime())}
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

            {/* Recurring toggle — only on create */}
            {!editEvent && (
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Recurring event
                  </Text>
                  <Switch
                    value={isRecurring}
                    onValueChange={setIsRecurring}
                    trackColor={{ false: "#e5e7eb", true: "#111827" }}
                    thumbColor="#ffffff"
                  />
                </View>

                {isRecurring && (
                  <>
                    <View className="flex-row gap-2 mb-3">
                      {recurringTypes.map((rt) => (
                        <Pressable
                          key={rt.value}
                          onPress={() => setRecurrenceType(rt.value)}
                          className={`flex-1 py-2 rounded-lg items-center border ${
                            recurrenceType === rt.value
                              ? "bg-black border-black"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <Text
                            className={`text-sm font-semibold ${
                              recurrenceType === rt.value
                                ? "text-white"
                                : "text-gray-600"
                            }`}
                          >
                            {rt.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {recurrenceType === "custom" && (
                      <View className="flex-row gap-1.5 mb-3">
                        {DAY_LABELS.map((label, idx) => (
                          <Pressable
                            key={idx}
                            onPress={() => toggleCustomDay(idx)}
                            className={`flex-1 py-2 rounded-lg items-center border ${
                              customDays.includes(idx)
                                ? "bg-black border-black"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                customDays.includes(idx)
                                  ? "text-white"
                                  : "text-gray-500"
                              }`}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}

                    <Text className="text-xs text-gray-400">
                      Will create 4 additional occurrences after the first date.
                    </Text>
                  </>
                )}
              </View>
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
                {saving
                  ? "Saving..."
                  : editEvent
                  ? "Save Changes"
                  : isRecurring
                  ? "Create Events"
                  : "Create Event"}
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

// ─── Create room form ──────────────────────────────────────────────────────────

function CreateRoomForm({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(text: string) {
    setName(text);
    if (!slugEdited) setSlug(deriveSlug(text));
  }

  function handleSlugChange(text: string) {
    setSlug(text.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSlugEdited(true);
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) return;
    setSaving(true);
    setError("");
    try {
      const roomId = id();
      await db.transact(
        db.tx.rooms[roomId]
          .update({ name: name.trim(), slug: slug.trim(), createdAt: Date.now() })
          .link({ admin: userId })
      );
    } catch (e: unknown) {
      setError(
        e instanceof Error && e.message.includes("unique")
          ? "That room code is already taken. Try another."
          : "Failed to create room."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="bg-white rounded-2xl p-5 mx-4 mt-4 border border-gray-100">
      <Text className="text-lg font-bold text-gray-900 mb-1">Create Your Room</Text>
      <Text className="text-gray-500 text-sm mb-4">
        Members will use your room link to find your events.
      </Text>
      <TextInput
        className="border border-gray-200 rounded-lg px-3 py-3 mb-3 text-base text-gray-900"
        placeholder="Room name (e.g. GymBox BJJ)"
        value={name}
        onChangeText={handleNameChange}
      />
      <View className="mb-3">
        <TextInput
          className="border border-gray-200 rounded-lg px-3 py-3 text-base text-gray-900"
          placeholder="Room code (e.g. gymbox-bjj)"
          value={slug}
          onChangeText={handleSlugChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {slug ? (
          <Text className="text-gray-400 text-xs mt-1 ml-1">
            Members visit: /room/{slug}
          </Text>
        ) : null}
      </View>
      {error ? <Text className="text-red-500 text-sm mb-3">{error}</Text> : null}
      <Pressable
        onPress={handleCreate}
        disabled={saving || !name.trim() || !slug.trim()}
        className="bg-black rounded-xl py-4 items-center"
        style={({ pressed }) => ({
          opacity: pressed || saving || !name.trim() || !slug.trim() ? 0.5 : 1,
        })}
      >
        <Text className="text-white font-bold text-base">
          {saving ? "Creating..." : "Create Room"}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Event row ────────────────────────────────────────────────────────────────

function EventRow({
  event,
  onEdit,
  onDelete,
  onShare,
}: {
  event: EventWithSignups;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const count = event.signups?.length ?? 0;
  return (
    <View className="border-b border-gray-100 py-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-gray-900 font-semibold">{event.title}</Text>
            {event.isRecurring && (
              <View className="bg-blue-100 px-1.5 py-0.5 rounded">
                <Text className="text-blue-600 text-xs">↺</Text>
              </View>
            )}
          </View>
          <Text className="text-gray-400 text-xs mt-0.5">
            {formatDate(event.date)}
          </Text>
          {event.location ? (
            <Text className="text-gray-400 text-xs">{event.location}</Text>
          ) : null}
          <Text className="text-green-600 text-xs mt-1">
            {count} {count === 1 ? "person" : "people"} in
          </Text>
        </View>
        <View className="flex-row gap-3">
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text className="text-gray-600 text-sm font-medium">Edit</Text>
          </Pressable>
          <Pressable
            onPress={onShare}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text className="text-gray-400 text-sm font-medium">Share</Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text className="text-red-500 text-sm font-medium">Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Room card ────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  userId,
}: {
  room: RoomWithEvents;
  userId: string;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithSignups | undefined>(
    undefined
  );
  const [announcementText, setAnnouncementText] = useState("");
  const [postingAnn, setPostingAnn] = useState(false);
  const [copied, setCopied] = useState(false);

  const roomUrl = `imIN.app/room/${room.slug}`;

  async function handleCopyRoomLink() {
    await Clipboard.setStringAsync(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleShareRoom() {
    try {
      await Share.share({ message: `Join our room on I'm IN! 👇 ${roomUrl}` });
    } catch {}
  }

  async function handleShareEvent(event: EventWithSignups) {
    const eventUrl = `imIN.app/room/${room.slug}/event/${event.id}`;
    try {
      await Share.share({ message: `Join ${event.title} on I'm IN! 👇 ${eventUrl}` });
    } catch {}
  }

  const events = (room.events ?? []).slice().sort(
    (a, b) => (a.date ?? 0) - (b.date ?? 0)
  ) as EventWithSignups[];

  const announcements = (room.announcements ?? [])
    .slice()
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)) as Announcement[];

  function openCreate() {
    setEditingEvent(undefined);
    setShowModal(true);
  }

  function openEdit(event: EventWithSignups) {
    setEditingEvent(event);
    setShowModal(true);
  }

  function handleDelete(eventId: string, title: string) {
    Alert.alert("Delete Event", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => db.transact(db.tx.events[eventId].delete()),
      },
    ]);
  }

  async function handlePostAnnouncement() {
    if (!announcementText.trim()) return;
    setPostingAnn(true);
    try {
      await db.transact(
        db.tx.announcements[id()]
          .update({ message: announcementText.trim(), createdAt: Date.now() })
          .link({ room: room.id })
      );
      setAnnouncementText("");
    } finally {
      setPostingAnn(false);
    }
  }

  function handleDeleteAnnouncement(annId: string) {
    db.transact(db.tx.announcements[annId].delete());
  }

  return (
    <>
      <View className="bg-white rounded-2xl mx-4 mt-4 border border-gray-100 overflow-hidden">
        {/* Room header */}
        <View className="p-5 border-b border-gray-100">
          {/* Name + View row */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">{room.name}</Text>
              <Text className="text-gray-400 text-sm mt-0.5">{room.slug}</Text>
            </View>
            <Pressable
              onPress={() => router.push(`/room/${room.slug}`)}
              className="bg-gray-100 px-3 py-1.5 rounded-lg"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text className="text-gray-700 text-sm font-medium">View →</Text>
            </Pressable>
          </View>

          {/* Share section */}
          <View className="bg-gray-50 rounded-xl px-3 py-2.5">
            <Text className="text-xs text-gray-400 mb-1">Room link</Text>
            <Text className="text-sm font-medium text-gray-700 mb-2" numberOfLines={1}>
              {roomUrl}
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={handleCopyRoomLink}
                className="flex-1 bg-white border border-gray-200 rounded-lg py-2 items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text className="text-gray-700 text-sm font-medium">
                  {copied ? "Copied!" : "Copy Link"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleShareRoom}
                className="flex-1 bg-black rounded-lg py-2 items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text className="text-white text-sm font-medium">Share</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Stats */}
        {events.length > 0 && (
          <View className="border-b border-gray-100 pt-4">
            <StatsSection events={events} />
          </View>
        )}

        {/* Events */}
        <View className="px-5">
          <View className="flex-row items-center justify-between pt-4 pb-2">
            <Text className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Events ({events.length})
            </Text>
            <Pressable
              onPress={openCreate}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text className="text-black font-semibold text-sm">+ New</Text>
            </Pressable>
          </View>

          {events.length === 0 ? (
            <View className="py-6 items-center">
              <Text className="text-gray-400 text-sm">No events yet. Create one!</Text>
            </View>
          ) : (
            events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onEdit={() => openEdit(event)}
                onDelete={() => handleDelete(event.id, event.title)}
                onShare={() => handleShareEvent(event)}
              />
            ))
          )}
        </View>

        {/* Announcements */}
        <View className="px-5 border-t border-gray-100 mt-2">
          <Text className="text-sm font-semibold text-gray-700 uppercase tracking-wide pt-4 pb-3">
            Announcements
          </Text>

          {/* Post form */}
          <View className="flex-row gap-2 mb-3">
            <TextInput
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900"
              placeholder="Post an announcement..."
              value={announcementText}
              onChangeText={setAnnouncementText}
              returnKeyType="send"
              onSubmitEditing={handlePostAnnouncement}
            />
            <Pressable
              onPress={handlePostAnnouncement}
              disabled={postingAnn || !announcementText.trim()}
              className="bg-black rounded-lg px-4 items-center justify-center"
              style={({ pressed }) => ({
                opacity:
                  pressed || postingAnn || !announcementText.trim() ? 0.5 : 1,
              })}
            >
              <Text className="text-white font-semibold text-sm">
                {postingAnn ? "..." : "Post"}
              </Text>
            </Pressable>
          </View>

          {announcements.length === 0 ? (
            <View className="pb-4 items-center">
              <Text className="text-gray-400 text-sm">No announcements yet.</Text>
            </View>
          ) : (
            announcements.map((ann) => (
              <View
                key={ann.id}
                className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-2 flex-row items-start"
              >
                <Text className="flex-1 text-amber-800 text-sm leading-relaxed">
                  {ann.message}
                </Text>
                <Pressable
                  onPress={() => handleDeleteAnnouncement(ann.id)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text className="text-amber-400 ml-2 font-bold">✕</Text>
                </Pressable>
              </View>
            ))
          )}

          <View className="h-4" />
        </View>
      </View>

      <EventModal
        visible={showModal}
        roomId={room.id}
        editEvent={editingEvent}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/admin/login");
    }
  }, [user, authLoading]);

  const { isLoading, data } = db.useQuery(
    user
      ? {
          rooms: {
            events: { signups: {} },
            announcements: {},
            $: { where: { "admin.id": user.id } },
          },
        }
      : null
  );

  async function handleSignOut() {
    await db.auth.signOut();
    router.replace("/admin/login");
  }

  if (authLoading || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const rooms = (data?.rooms ?? []) as RoomWithEvents[];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <Text className="text-sm text-gray-500">{user.email}</Text>
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text className="text-gray-500 text-sm font-medium">Sign Out</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="items-center justify-center py-20">
          <ActivityIndicator color="#000" />
        </View>
      ) : rooms.length === 0 ? (
        <CreateRoomForm userId={user.id} />
      ) : (
        rooms.map((room) => (
          <RoomCard key={room.id} room={room} userId={user.id} />
        ))
      )}

      <View className="h-10" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kavFlex: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "88%",
  },
  sheetContent: { padding: 24, paddingBottom: 48 },
});

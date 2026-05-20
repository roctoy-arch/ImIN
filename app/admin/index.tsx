import { db } from "@/lib/db";
import { AppSchema } from "@/instant.schema";
import { id, InstaQLEntity } from "@instantdb/react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { APP_URL } from "@/constants/config";
import { C, CATEGORIES, SHADOW } from "@/constants/design";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoomWithEvents = InstaQLEntity<
  AppSchema,
  "rooms",
  { events: { signups: {} }; announcements: {}; photos: {} }
>;
type EventWithSignups = InstaQLEntity<AppSchema, "events", { signups: {} }>;
type Announcement = InstaQLEntity<AppSchema, "announcements">;

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const webRoot =
  Platform.OS === "web"
    ? ({
        maxWidth: 480,
        alignSelf: "center" as const,
        width: "100%" as const,
        minHeight: "100dvh" as any,
      } as const)
    : {};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTimeInputValue(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getAdminInitials(email: string) {
  return (email ?? "").split("@")[0].slice(0, 2).toUpperCase() || "AD";
}

async function pickAndUploadImage(path: string, options?: ImagePicker.ImagePickerOptions) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    ...options,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const filename = `img-${Date.now()}.jpg`;
  const resp = await fetch(asset.uri);
  const blob = await resp.blob();
  const file = new File([blob], filename, { type: "image/jpeg" });
  const { data } = await db.storage.uploadFile(path, file);
  return data;
}

// ─── StatsSection ────────────────────────────────────────────────────────────

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

  const statCardStyle = {
    flex: 1,
    backgroundColor: C.BG,
    borderRadius: 16,
    padding: 14,
    alignItems: "center" as const,
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: C.SECONDARY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
        Stats
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={statCardStyle}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: C.PRIMARY }}>{thisWeekSignups}</Text>
          <Text style={{ fontSize: 11, color: C.MUTED, textAlign: "center", marginTop: 2 }}>signups{"\n"}this week</Text>
        </View>
        <View style={statCardStyle}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: C.PRIMARY, textAlign: "center" }} numberOfLines={2}>
            {mostPopular?.title ?? "—"}
          </Text>
          <Text style={{ fontSize: 11, color: C.MUTED, textAlign: "center", marginTop: 2 }}>most{"\n"}popular</Text>
        </View>
        <View style={statCardStyle}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: C.PRIMARY }}>{avgAttendance}</Text>
          <Text style={{ fontSize: 11, color: C.MUTED, textAlign: "center", marginTop: 2 }}>avg{"\n"}attendance</Text>
        </View>
      </View>
    </View>
  );
}

// ─── EventModal ───────────────────────────────────────────────────────────────

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
  const [category, setCategory] = useState<string>((editEvent as any)?.category ?? "");
  const [coverPhotoUri, setCoverPhotoUri] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState(
    editEvent ? new Date(editEvent.date) : new Date()
  );
  const [saving, setSaving] = useState(false);
  const [androidStep, setAndroidStep] = useState<"date" | "time" | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "custom">("weekly");
  const [customDays, setCustomDays] = useState<number[]>([]);

  useEffect(() => {
    if (visible) {
      setTitle(editEvent?.title ?? "");
      setDescription(editEvent?.description ?? "");
      setLocation(editEvent?.location ?? "");
      setCategory((editEvent as any)?.category ?? "");
      setCoverPhotoUri(null);
      setEventDate(editEvent ? new Date(editEvent.date) : new Date());
      setIsRecurring(false);
      setRecurrenceType("weekly");
      setCustomDays([]);
    }
  }, [visible, editEvent]);

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

  function toggleCustomDay(day: number) {
    setCustomDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }

  function handleWebDateChange(dateStr: string) {
    if (!dateStr) return;
    const [y, m, day] = dateStr.split("-").map(Number);
    const next = new Date(eventDate);
    next.setFullYear(y, m - 1, day);
    setEventDate(next);
  }

  function handleWebTimeChange(timeStr: string) {
    if (!timeStr) return;
    const [h, min] = timeStr.split(":").map(Number);
    const next = new Date(eventDate);
    next.setHours(h, min, 0, 0);
    setEventDate(next);
  }

  async function handlePickCoverPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled) setCoverPhotoUri(result.assets[0].uri);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editEvent) {
        let photoLinkStep: ReturnType<typeof db.tx.events[string]["update"]> | null = null;
        if (coverPhotoUri) {
          const fileData = await pickAndUploadImage(`events/${editEvent.id}/cover-${Date.now()}.jpg`);
          if (fileData) {
            photoLinkStep = db.tx.events[editEvent.id].link({ photos: fileData.id });
          }
        }
        const updateStep = db.tx.events[editEvent.id].update({
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          date: eventDate.getTime(),
          ...(category ? { category } : {}),
        });
        const txSteps = photoLinkStep ? [updateStep, photoLinkStep] : [updateStep];
        await db.transact(txSteps);
      } else {
        const rule =
          !isRecurring ? "none"
          : recurrenceType === "daily" ? "daily"
          : recurrenceType === "weekly" ? "weekly"
          : customDays.length > 0 ? `weekly:${[...customDays].sort().join(",")}`
          : "weekly";

        const baseId = id();
        let coverId: string | null = null;
        if (coverPhotoUri) {
          const resp = await fetch(coverPhotoUri);
          const blob = await resp.blob();
          const file = new File([blob], `cover-${Date.now()}.jpg`, { type: "image/jpeg" });
          const { data } = await db.storage.uploadFile(`events/${baseId}/cover-${Date.now()}.jpg`, file);
          coverId = data.id;
        }

        const baseUpdate = {
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          date: eventDate.getTime(),
          isRecurring,
          recurrenceRule: rule,
          ...(category ? { category } : {}),
        };

        const steps: ReturnType<typeof db.tx.events[string]["update"]>[] = [
          db.tx.events[baseId].update(baseUpdate).link({ room: roomId }),
        ];
        if (coverId) steps.push(db.tx.events[baseId].link({ photos: coverId }));

        if (isRecurring && rule !== "none") {
          for (const d of generateRecurringDates(eventDate, rule)) {
            steps.push(
              db.tx.events[id()].update({
                title: title.trim(),
                description: description.trim(),
                location: location.trim(),
                date: d.getTime(),
                isRecurring: true,
                recurrenceRule: rule,
                ...(category ? { category } : {}),
              }).link({ room: roomId })
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

  const modalInputStyle = {
    backgroundColor: C.INPUT,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.PRIMARY,
    marginBottom: 16,
  };

  const modalInputLabel = {
    fontSize: 11,
    fontWeight: "600" as const,
    color: C.MUTED,
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView style={styles.kavFlex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: C.PRIMARY, marginBottom: 24 }}>
              {editEvent ? "Edit Event" : "New Event"}
            </Text>

            <Text style={modalInputLabel}>Title</Text>
            <TextInput
              style={modalInputStyle}
              placeholder="Event title"
              placeholderTextColor={C.MUTED}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />

            <Text style={modalInputLabel}>Cover Photo</Text>
            <Pressable
              onPress={handlePickCoverPhoto}
              style={({ pressed }) => ({
                height: 120,
                backgroundColor: C.BG,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                overflow: "hidden",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              {coverPhotoUri ? (
                <Image source={{ uri: coverPhotoUri }} style={{ width: "100%", height: 120 }} contentFit="cover" />
              ) : (
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 32 }}>📷</Text>
                  <Text style={{ fontSize: 12, color: C.MUTED, marginTop: 4 }}>Tap to add cover photo</Text>
                </View>
              )}
            </Pressable>

            <Text style={modalInputLabel}>Category</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat === category ? "" : cat)}
                  style={{ backgroundColor: category === cat ? C.PRIMARY : C.BG, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}
                >
                  <Text style={{ color: category === cat ? "white" : C.PRIMARY, fontSize: 13, fontWeight: "600" }}>{cat}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={modalInputLabel}>Description</Text>
            <TextInput
              style={[modalInputStyle, { minHeight: 64 }]}
              placeholder="Optional description"
              placeholderTextColor={C.MUTED}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />

            <Text style={modalInputLabel}>Location</Text>
            <TextInput
              style={modalInputStyle}
              placeholder="Optional location"
              placeholderTextColor={C.MUTED}
              value={location}
              onChangeText={setLocation}
              returnKeyType="done"
            />

            <Text style={modalInputLabel}>Date & time</Text>
            {Platform.OS === "web" ? (
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {React.createElement("input", {
                  type: "date",
                  value: toDateInputValue(eventDate),
                  onChange: (e: any) => handleWebDateChange(e.target.value),
                  style: { flex: 1, border: "none", borderRadius: 12, padding: "14px 16px", fontSize: 16, color: C.PRIMARY, backgroundColor: C.INPUT, fontFamily: "inherit", outline: "none", cursor: "pointer", minWidth: 0 },
                })}
                {React.createElement("input", {
                  type: "time",
                  value: toTimeInputValue(eventDate),
                  onChange: (e: any) => handleWebTimeChange(e.target.value),
                  style: { flex: 1, border: "none", borderRadius: 12, padding: "14px 16px", fontSize: 16, color: C.PRIMARY, backgroundColor: C.INPUT, fontFamily: "inherit", outline: "none", cursor: "pointer", minWidth: 0 },
                })}
              </View>
            ) : Platform.OS === "ios" ? (
              <DateTimePicker value={eventDate} mode="datetime" display="spinner" onChange={onPickerChange} style={{ marginBottom: 8 }} textColor={C.PRIMARY} />
            ) : (
              <>
                <Pressable onPress={() => setAndroidStep("date")} style={{ backgroundColor: C.INPUT, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, color: C.PRIMARY }}>{formatDate(eventDate.getTime())}</Text>
                </Pressable>
                {androidStep !== null && (
                  <DateTimePicker value={eventDate} mode={androidStep} display="default" onChange={onPickerChange} />
                )}
              </>
            )}

            {!editEvent && (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: C.PRIMARY }}>Recurring event</Text>
                  <Switch value={isRecurring} onValueChange={setIsRecurring} trackColor={{ false: "#E5E7EB", true: C.PRIMARY }} thumbColor="#ffffff" />
                </View>
                {isRecurring && (
                  <>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                      {recurringTypes.map((rt) => (
                        <Pressable
                          key={rt.value}
                          onPress={() => setRecurrenceType(rt.value)}
                          style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: recurrenceType === rt.value ? C.PRIMARY : C.BG }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: "600", color: recurrenceType === rt.value ? "white" : C.SECONDARY }}>{rt.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {recurrenceType === "custom" && (
                      <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
                        {DAY_LABELS.map((label, idx) => (
                          <Pressable
                            key={idx}
                            onPress={() => toggleCustomDay(idx)}
                            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: customDays.includes(idx) ? C.PRIMARY : C.BG }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: "700", color: customDays.includes(idx) ? "white" : C.MUTED }}>{label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Will create 4 additional occurrences after the first date.</Text>
                  </>
                )}
              </View>
            )}

            <Pressable
              onPress={handleSave}
              disabled={saving || !title.trim()}
              style={({ pressed }) => ({ backgroundColor: C.PRIMARY, borderRadius: 50, paddingVertical: 18, alignItems: "center", marginTop: 8, transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed || saving || !title.trim() ? 0.5 : 1 })}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 17 }}>
                {saving ? "Saving..." : editEvent ? "Save Changes" : isRecurring ? "Create Events" : "Create Event"}
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

// ─── CreateRoomModal ──────────────────────────────────────────────────────────

function CreateRoomModal({
  visible,
  userId,
  onClose,
  onCreated,
}: {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onCreated: (roomId: string) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) { setName(""); setSlug(""); setSlugEdited(false); setError(""); }
  }, [visible]);

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
      onCreated(roomId);
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

  const crInputStyle = {
    backgroundColor: C.INPUT,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.PRIMARY,
    marginBottom: 4,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView style={styles.kavFlex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: C.PRIMARY, marginBottom: 4 }}>Create a Room</Text>
            <Text style={{ fontSize: 14, color: C.SECONDARY, marginBottom: 20 }}>Members will use your room link to find your events.</Text>

            <Text style={{ fontSize: 11, fontWeight: "600", color: C.MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Room name</Text>
            <TextInput
              style={[crInputStyle, { marginBottom: 16 }]}
              placeholder="e.g. GymBox BJJ"
              placeholderTextColor={C.MUTED}
              value={name}
              onChangeText={handleNameChange}
              autoFocus
            />
            <Text style={{ fontSize: 11, fontWeight: "600", color: C.MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Room code</Text>
            <TextInput
              style={crInputStyle}
              placeholder="e.g. gymbox-bjj"
              placeholderTextColor={C.MUTED}
              value={slug}
              onChangeText={handleSlugChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {slug ? (
              <Text style={{ fontSize: 12, color: C.MUTED, marginTop: 4, marginBottom: 4 }}>Members visit: /room/{slug}</Text>
            ) : <View style={{ height: 16 }} />}
            {error ? <Text style={{ color: C.ACCENT, fontSize: 14, marginBottom: 12 }}>{error}</Text> : null}
            <Pressable
              onPress={handleCreate}
              disabled={saving || !name.trim() || !slug.trim()}
              style={({ pressed }) => ({ backgroundColor: C.PRIMARY, borderRadius: 50, paddingVertical: 18, alignItems: "center", marginTop: 8, transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed || saving || !name.trim() || !slug.trim() ? 0.5 : 1 })}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 17 }}>{saving ? "Creating..." : "Create Room"}</Text>
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

// ─── EventRow ─────────────────────────────────────────────────────────────────

function EventRow({
  event,
  onEdit,
  onDelete,
  onShare,
  onQr,
}: {
  event: EventWithSignups;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onQr: () => void;
}) {
  const count = event.signups?.length ?? 0;
  const category = (event as any).category as string | undefined;
  return (
    <View style={{ backgroundColor: C.WHITE, borderRadius: 14, padding: 16, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: C.PRIMARY }}>{event.title}</Text>
            {event.isRecurring && (
              <View style={{ backgroundColor: "#EEF2FF", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: "#6366F1", fontSize: 11 }}>↺</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, color: C.MUTED, marginBottom: 2 }}>{formatDate(event.date)}</Text>
          {event.location ? <Text style={{ fontSize: 12, color: C.MUTED }}>{event.location}</Text> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
            <View style={{ backgroundColor: C.BG, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: C.PRIMARY }}>{count} in</Text>
            </View>
            {category ? (
              <View style={{ backgroundColor: C.BG, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: C.PRIMARY }}>{category}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Pressable onPress={onEdit} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: C.PRIMARY }}>Edit</Text>
          </Pressable>
          <Pressable onPress={onShare} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: C.SECONDARY }}>Share</Text>
          </Pressable>
          <Pressable onPress={onQr} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: C.SECONDARY }}>QR</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: C.ACCENT }}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── QrModal ─────────────────────────────────────────────────────────────────

function QrModal({
  eventId,
  eventTitle,
  onClose,
}: {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}) {
  const eventUrl = `${APP_URL}/event/${eventId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(eventUrl)}&color=1C242B&bgcolor=EEEEFF`;
  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={{ backgroundColor: C.WHITE, borderRadius: 24, padding: 28, alignItems: "center", width: 300, ...SHADOW }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: C.PRIMARY, marginBottom: 4, textAlign: "center" }} numberOfLines={2}>
            {eventTitle}
          </Text>
          <Text style={{ fontSize: 12, color: C.MUTED, marginBottom: 16 }}>Scan to view & sign up</Text>
          <Image source={{ uri: qrUrl }} style={{ width: 200, height: 200, borderRadius: 10 }} contentFit="contain" />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 20, width: "100%" }}>
            <Pressable
              onPress={() => { try { Share.share({ message: `Join ${eventTitle} on I'm IN! 👇 ${eventUrl}` }); } catch {} }}
              style={({ pressed }) => ({ flex: 1, backgroundColor: C.PRIMARY, borderRadius: 50, paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>Share</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({ flex: 1, backgroundColor: C.BG, borderRadius: 50, paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ color: C.PRIMARY, fontWeight: "700", fontSize: 13 }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── AdminAvatar ──────────────────────────────────────────────────────────────

function AdminAvatar({ user, onUpload }: { user: { id: string; email: string | null; imageURL?: string | null }; onUpload: () => void }) {
  return (
    <Pressable
      onPress={onUpload}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: "hidden",
        backgroundColor: C.BG,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {user.imageURL ? (
        <Image source={{ uri: user.imageURL }} style={{ width: 44, height: 44, borderRadius: 22 }} contentFit="cover" />
      ) : (
        <Text style={{ fontSize: 15, fontWeight: "700", color: C.PRIMARY }}>
          {getAdminInitials(user.email ?? "")}
        </Text>
      )}
    </Pressable>
  );
}

// ─── RoomDetailView ───────────────────────────────────────────────────────────

function RoomDetailView({
  room,
  userId,
  onBack,
  onUploadAvatar,
  user,
}: {
  room: RoomWithEvents;
  userId: string;
  onBack: () => void;
  onUploadAvatar: () => void;
  user: { id: string; email: string | null; imageURL?: string | null };
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithSignups | undefined>(undefined);
  const [announcementText, setAnnouncementText] = useState("");
  const [postingAnn, setPostingAnn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showQrEventId, setShowQrEventId] = useState<string | null>(null);
  const [showQrEventTitle, setShowQrEventTitle] = useState("");

  const roomUrl = `${APP_URL}/room/${room.slug}`;
  const coverUrl = (room.photos as any)?.[0]?.url ?? null;

  async function handleCopyRoomLink() {
    await Clipboard.setStringAsync(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleShareRoom() {
    try { await Share.share({ message: `Join our room on I'm IN! 👇 ${roomUrl}` }); } catch {}
  }

  async function handleShareEvent(event: EventWithSignups) {
    const eventUrl = `${APP_URL}/event/${event.id}`;
    try { await Share.share({ message: `Join ${event.title} on I'm IN! 👇 ${eventUrl}` }); } catch {}
  }

  async function handleUploadRoomCover() {
    setUploadingCover(true);
    try {
      const fileData = await pickAndUploadImage(`rooms/${room.id}/cover-${Date.now()}.jpg`);
      if (fileData) {
        await db.transact(db.tx.rooms[room.id].link({ photos: fileData.id }));
      }
    } finally {
      setUploadingCover(false);
    }
  }

  const events = (room.events ?? []).slice().sort((a, b) => (a.date ?? 0) - (b.date ?? 0)) as EventWithSignups[];
  const announcements = (room.announcements ?? []).slice().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)) as Announcement[];

  function openCreate() { setEditingEvent(undefined); setShowModal(true); }
  function openEdit(event: EventWithSignups) { setEditingEvent(event); setShowModal(true); }

  function handleDelete(eventId: string, title: string) {
    Alert.alert("Delete Event", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => db.transact(db.tx.events[eventId].delete()) },
    ]);
  }

  async function handlePostAnnouncement() {
    if (!announcementText.trim()) return;
    setPostingAnn(true);
    try {
      await db.transact(db.tx.announcements[id()].update({ message: announcementText.trim(), createdAt: Date.now() }).link({ room: room.id }));
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
      <ScrollView style={{ flex: 1, backgroundColor: C.WHITE }}>
        {/* Header: back + avatar + sign out */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.BORDER }}>
          <Pressable onPress={onBack} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, flexDirection: "row", alignItems: "center", gap: 4, marginRight: 12 })}>
            <Text style={{ fontSize: 20, color: C.PRIMARY }}>←</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: C.PRIMARY }}>Rooms</Text>
          </Pressable>
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: C.PRIMARY }} numberOfLines={1}>{room.name}</Text>
          <AdminAvatar user={user} onUpload={onUploadAvatar} />
        </View>

        {/* Room cover photo + upload */}
        {coverUrl ? (
          <View style={{ position: "relative" }}>
            <Image source={{ uri: coverUrl }} style={{ height: 180, width: "100%" }} contentFit="cover" />
            <View style={{ position: "absolute", bottom: 12, right: 12 }}>
              <Pressable
                onPress={handleUploadRoomCover}
                disabled={uploadingCover}
                style={({ pressed }) => ({ backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: "white" }}>
                  {uploadingCover ? "Uploading…" : "Change Cover"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <Pressable
              onPress={handleUploadRoomCover}
              disabled={uploadingCover}
              style={({ pressed }) => ({ backgroundColor: C.BG, borderRadius: 14, paddingVertical: 16, alignItems: "center", gap: 6, opacity: pressed ? 0.7 : 1, flexDirection: "row", justifyContent: "center" })}
            >
              <Text style={{ fontSize: 18 }}>🖼️</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: C.PRIMARY }}>
                {uploadingCover ? "Uploading…" : "Upload Cover Photo"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Room info + share */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: C.PRIMARY }}>{room.name}</Text>
              <Text style={{ fontSize: 13, color: C.MUTED, marginTop: 2 }}>@{room.slug}</Text>
            </View>
            <Pressable
              onPress={() => router.push(`/room/${room.slug}`)}
              style={({ pressed }) => ({ backgroundColor: C.BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: C.PRIMARY }}>View →</Text>
            </Pressable>
          </View>

          <View style={{ backgroundColor: C.BG, borderRadius: 14, padding: 14, marginBottom: 20 }}>
            <Text style={{ fontSize: 11, color: C.MUTED, marginBottom: 4, fontWeight: "500" }}>Room link</Text>
            <Text style={{ fontSize: 14, fontWeight: "500", color: C.PRIMARY, marginBottom: 12 }} numberOfLines={1}>{roomUrl}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={handleCopyRoomLink}
                style={({ pressed }) => ({ flex: 1, backgroundColor: C.WHITE, borderRadius: 10, paddingVertical: 10, alignItems: "center", opacity: pressed ? 0.7 : 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 })}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: C.PRIMARY }}>{copied ? "Copied ✓" : "Copy Link"}</Text>
              </Pressable>
              <Pressable
                onPress={handleShareRoom}
                style={({ pressed }) => ({ flex: 1, backgroundColor: C.PRIMARY, borderRadius: 10, paddingVertical: 10, alignItems: "center", opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: "white" }}>Share</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Stats */}
        {events.length > 0 && (
          <View style={{ borderTopWidth: 1, borderTopColor: C.BORDER, paddingTop: 16 }}>
            <StatsSection events={events} />
          </View>
        )}

        {/* Events */}
        <View style={{ paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: C.BORDER }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 16, paddingBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: C.SECONDARY, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Events ({events.length})
            </Text>
            <Pressable onPress={openCreate} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: C.PRIMARY }}>+ New</Text>
            </Pressable>
          </View>

          {events.length === 0 ? (
            <Pressable
              onPress={openCreate}
              style={({ pressed }) => ({ backgroundColor: C.BG, borderRadius: 16, padding: 20, marginBottom: 16, flexDirection: "row", alignItems: "center", opacity: pressed ? 0.8 : 1 })}
            >
              <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: C.PRIMARY }}>Create your first event →</Text>
              <Text style={{ fontSize: 24 }}>📅</Text>
            </Pressable>
          ) : (
            events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onEdit={() => openEdit(event)}
                onDelete={() => handleDelete(event.id, event.title)}
                onShare={() => handleShareEvent(event)}
                onQr={() => { setShowQrEventId(event.id); setShowQrEventTitle(event.title); }}
              />
            ))
          )}
        </View>

        {/* Announcements */}
        <View style={{ paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: C.BORDER, marginTop: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: C.SECONDARY, textTransform: "uppercase", letterSpacing: 0.8, paddingTop: 16, marginBottom: 12 }}>
            Announcements
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <TextInput
              style={{ flex: 1, backgroundColor: C.INPUT, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.PRIMARY }}
              placeholder="Post an announcement..."
              placeholderTextColor={C.MUTED}
              value={announcementText}
              onChangeText={setAnnouncementText}
              returnKeyType="send"
              onSubmitEditing={handlePostAnnouncement}
            />
            <Pressable
              onPress={handlePostAnnouncement}
              disabled={postingAnn || !announcementText.trim()}
              style={({ pressed }) => ({ backgroundColor: C.PRIMARY, borderRadius: 50, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", opacity: pressed || postingAnn || !announcementText.trim() ? 0.5 : 1 })}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>{postingAnn ? "…" : "Post"}</Text>
            </Pressable>
          </View>
          {announcements.length === 0 ? (
            <View style={{ paddingBottom: 16, alignItems: "center" }}>
              <Text style={{ fontSize: 14, color: C.MUTED }}>No announcements yet.</Text>
            </View>
          ) : (
            announcements.map((ann) => (
              <View key={ann.id} style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, flexDirection: "row", alignItems: "flex-start" }}>
                <Text style={{ flex: 1, color: "#92400E", fontSize: 14, lineHeight: 20 }}>{ann.message}</Text>
                <Pressable onPress={() => handleDeleteAnnouncement(ann.id)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                  <Text style={{ color: "#B45309", marginLeft: 8, fontWeight: "700", fontSize: 16 }}>✕</Text>
                </Pressable>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <EventModal visible={showModal} roomId={room.id} editEvent={editingEvent} onClose={() => setShowModal(false)} />
      {showQrEventId && (
        <QrModal
          eventId={showQrEventId}
          eventTitle={showQrEventTitle}
          onClose={() => setShowQrEventId(null)}
        />
      )}
    </>
  );
}

// ─── RoomsListView ────────────────────────────────────────────────────────────

function RoomsListView({
  rooms,
  user,
  onSelectRoom,
  onCreateRoom,
  onUploadAvatar,
  onSignOut,
}: {
  rooms: RoomWithEvents[];
  user: { id: string; email: string | null; imageURL?: string | null };
  onSelectRoom: (id: string) => void;
  onCreateRoom: () => void;
  onUploadAvatar: () => void;
  onSignOut: () => void;
}) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.WHITE }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.BORDER }}>
        <AdminAvatar user={user} onUpload={onUploadAvatar} />
        <Text style={{ flex: 1, fontSize: 20, fontWeight: "800", color: C.PRIMARY, marginLeft: 12 }}>My Rooms</Text>
        <Pressable
          onPress={onSignOut}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: 12 })}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: C.SECONDARY }}>Sign Out</Text>
        </Pressable>
        <Pressable
          onPress={onCreateRoom}
          style={({ pressed }) => ({ backgroundColor: C.PRIMARY, borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10, opacity: pressed ? 0.8 : 1 })}
        >
          <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>+ New Room</Text>
        </Pressable>
      </View>

      {rooms.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 80, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 52 }}>🏟️</Text>
          <Text style={{ fontSize: 22, fontWeight: "800", color: C.PRIMARY, marginTop: 16 }}>Welcome to I'm IN</Text>
          <Text style={{ fontSize: 15, color: C.SECONDARY, marginTop: 8, textAlign: "center", lineHeight: 22 }}>
            Create your first room to get started.{"\n"}Share the link with your members.
          </Text>
          <Pressable
            onPress={onCreateRoom}
            style={({ pressed }) => ({ backgroundColor: C.PRIMARY, borderRadius: 50, paddingHorizontal: 28, paddingVertical: 16, marginTop: 24, opacity: pressed ? 0.8 : 1 })}
          >
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Create a Room →</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          {rooms.map((room) => {
            const eventCount = room.events?.length ?? 0;
            const memberCount = new Set(
              (room.events ?? []).flatMap((e) => (e.signups ?? []).map((s) => s.name))
            ).size;
            const coverUrl = (room.photos as any)?.[0]?.url ?? null;

            return (
              <Pressable
                key={room.id}
                onPress={() => onSelectRoom(room.id)}
                style={({ pressed }) => ({
                  backgroundColor: C.WHITE,
                  borderRadius: 16,
                  ...SHADOW,
                  marginBottom: 12,
                  overflow: "hidden",
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={{ height: 100, width: "100%" }} contentFit="cover" />
                ) : null}
                <View style={{ padding: 20 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: C.PRIMARY }}>{room.name}</Text>
                    <Text style={{ fontSize: 20, color: C.MUTED }}>→</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: C.MUTED, marginTop: 2 }}>@{room.slug}</Text>
                  <Text style={{ fontSize: 13, color: C.SECONDARY, marginTop: 8 }}>
                    {eventCount} event{eventCount !== 1 ? "s" : ""} · {memberCount} member{memberCount !== 1 ? "s" : ""}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

// ─── AdminDashboardScreen ─────────────────────────────────────────────────────

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

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
            photos: {},
            $: { where: { "admin.id": user.id } },
          },
        }
      : null
  );

  async function handleSignOut() {
    await db.auth.signOut();
    router.replace("/admin/login");
  }

  async function handleUploadAvatar() {
    if (!user) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const filename = `avatar-${Date.now()}.jpg`;
      const resp = await fetch(asset.uri);
      const blob = await resp.blob();
      const file = new File([blob], filename, { type: "image/jpeg" });
      const { data: fileData } = await db.storage.uploadFile(`avatars/${user.id}/${filename}`, file);
      await db.transact(db.tx.$users[user.id].update({ imageURL: (fileData as any).url }));
    } catch {}
  }

  if (authLoading || !user) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.WHITE }}>
        <ActivityIndicator size="large" color={C.PRIMARY} />
      </View>
    );
  }

  const rooms = (data?.rooms ?? []) as RoomWithEvents[];
  const selectedRoom = selectedRoomId ? rooms.find((r) => r.id === selectedRoomId) : null;

  const adminUser = { id: user.id, email: user.email ?? null, imageURL: (user as any).imageURL ?? null };

  return (
    <>
      <Stack.Screen
        options={{
          title: selectedRoom ? selectedRoom.name : "Dashboard",
          headerShown: false,
        }}
      />
      <View style={{ flex: 1, backgroundColor: C.WHITE, ...webRoot }}>
        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={C.PRIMARY} />
          </View>
        ) : selectedRoom ? (
          <RoomDetailView
            room={selectedRoom}
            userId={user.id}
            onBack={() => setSelectedRoomId(null)}
            onUploadAvatar={handleUploadAvatar}
            user={adminUser}
          />
        ) : (
          <RoomsListView
            rooms={rooms}
            user={adminUser}
            onSelectRoom={setSelectedRoomId}
            onCreateRoom={() => setShowCreateRoom(true)}
            onUploadAvatar={handleUploadAvatar}
            onSignOut={handleSignOut}
          />
        )}

        <CreateRoomModal
          visible={showCreateRoom}
          userId={user.id}
          onClose={() => setShowCreateRoom(false)}
          onCreated={(roomId) => {
            setShowCreateRoom(false);
            setSelectedRoomId(roomId);
          }}
        />
      </View>
    </>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
  },
  sheetContent: { padding: 24, paddingBottom: 48 },
});

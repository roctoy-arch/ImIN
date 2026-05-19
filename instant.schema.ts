// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react-native";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),
    rooms: i.entity({
      name: i.string(),
      slug: i.string().unique().indexed(),
      createdAt: i.number().indexed(),
    }),
    events: i.entity({
      title: i.string(),
      description: i.string(),
      date: i.number().indexed(),
      location: i.string(),
      isRecurring: i.boolean().optional(),
      recurrenceRule: i.string().optional(),
      category: i.string().optional(),
    }),
    comments: i.entity({
      name: i.string(),
      message: i.string(),
      createdAt: i.number().indexed(),
    }),
    announcements: i.entity({
      message: i.string(),
      createdAt: i.number().indexed(),
    }),
    signups: i.entity({
      name: i.string(),
      createdAt: i.number().indexed(),
    }),
  },
  rooms: {},
  links: {
    $usersLinkedPrimaryUser: {
      forward: {
        on: "$users",
        has: "one",
        label: "linkedPrimaryUser",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "linkedGuestUsers",
      },
    },
    roomAdmin: {
      forward: { on: "rooms", has: "one", label: "admin" },
      reverse: { on: "$users", has: "many", label: "adminRooms" },
    },
    roomEvents: {
      forward: { on: "rooms", has: "many", label: "events" },
      reverse: { on: "events", has: "one", label: "room" },
    },
    eventSignups: {
      forward: { on: "events", has: "many", label: "signups" },
      reverse: { on: "signups", has: "one", label: "event" },
    },
    eventPhotos: {
      forward: { on: "events", has: "many", label: "photos" },
      reverse: { on: "$files", has: "many", label: "events" },
    },
    eventComments: {
      forward: { on: "events", has: "many", label: "comments" },
      reverse: { on: "comments", has: "one", label: "event" },
    },
    roomAnnouncements: {
      forward: { on: "rooms", has: "many", label: "announcements" },
      reverse: { on: "announcements", has: "one", label: "room" },
    },
  },
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;

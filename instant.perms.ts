// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react-native";

const rules = {
  rooms: {
    allow: {
      view: "true",
      create: "auth.id != null",
      update: "auth.id in data.ref('admin.id')",
      delete: "auth.id in data.ref('admin.id')",
    },
  },
  events: {
    allow: {
      view: "true",
      create: "auth.id != null",
      update: "auth.id in data.ref('room.admin.id')",
      delete: "auth.id in data.ref('room.admin.id')",
    },
  },
  signups: {
    allow: {
      view: "true",
      create: "true",
    },
  },
  $files: {
    allow: {
      view: "true",
      create: "true",
    },
  },
  comments: {
    allow: {
      view: "true",
      create: "true",
      delete: "auth.id != null",
    },
  },
  announcements: {
    allow: {
      view: "true",
      create: "auth.id != null",
      delete: "auth.id != null",
    },
  },
} satisfies InstantRules;

export default rules;

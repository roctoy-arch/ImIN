export const C = {
  BG:             "#F0EFFF",
  WHITE:          "#FFFFFF",
  INPUT:          "#F0EFFF",
  PRIMARY:        "#0F0F0F",
  ACCENT:         "#FF4217",
  SECONDARY:      "#6B7280",
  MUTED:          "#9CA3AF",
  BORDER:         "#E8E7FF",
  PLACEHOLDER_BG: "#E2E0FF",
} as const;

export const SHADOW = {
  shadowColor:   "#7C6FCD",
  shadowOpacity: 0.10,
  shadowRadius:  16,
  shadowOffset:  { width: 0, height: 4 },
  elevation:     3,
} as const;

export const PILL_ACCENT = "#7C6FCD";
export const WARM_ANNOUNCE = "#FFFBEB";

export const CATEGORIES = [
  "BJJ", "NoGi", "Gi", "MMA", "Open Mat", "Competition", "Other",
] as const;

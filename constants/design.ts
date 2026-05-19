export const C = {
  BG:             "#EEEEFF",
  WHITE:          "#FFFFFF",
  INPUT:          "#F0F0FF",
  PRIMARY:        "#1C242B",
  ACCENT:         "#FF4217",
  SECONDARY:      "#6B7280",
  MUTED:          "#9CA3AF",
  BORDER:         "#EEEEEE",
  PLACEHOLDER_BG: "#D8D8EE",
} as const;

export const SHADOW = {
  shadowColor:   "#000",
  shadowOpacity: 0.06,
  shadowRadius:  12,
  shadowOffset:  { width: 0, height: 3 },
  elevation:     2,
} as const;

export const CATEGORIES = [
  "BJJ", "NoGi", "Gi", "MMA", "Open Mat", "Competition", "Other",
] as const;

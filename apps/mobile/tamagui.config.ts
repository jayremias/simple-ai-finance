import { defaultConfig, shorthands, themes, tokens } from "@tamagui/config/v5";
import { createTamagui, createTokens } from "tamagui";
import { createInterFont } from "@tamagui/font-inter";
import { createAnimations } from "@tamagui/animations-react-native";

const customTokens = createTokens({
  ...tokens,
  color: {
    // Finance app brand colors
    brandBlue: "#2B7EFF",
    brandPurple: "#7B2FBE",
    brandTeal: "#00C896",
    cardBg: "#1A2235",
    darkBg: "#0D1117",
    navyBg: "#111827",
    surfaceBg: "#1E293B",
    textPrimary: "#FFFFFF",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    success: "#22C55E",
    danger: "#EF4444",
    chartBlue: "#4FC3F7",
    chartPurple: "#7C3AED",
  },
});

const headingFont = createInterFont({
  size: {
    1: 11,
    2: 12,
    3: 13,
    4: 14,
    true: 14,
    5: 15,
    6: 16,
    7: 20,
    8: 23,
    9: 30,
    10: 46,
    11: 55,
    12: 62,
    13: 72,
    14: 92,
    15: 114,
    16: 134,
  },
  weight: {
    1: "300",
    true: "400",
    3: "600",
    4: "700",
    5: "900",
  },
});

const bodyFont = createInterFont(
  {
    weight: {
      1: "300",
      true: "400",
    },
  },
  {
    sizeSize: (size) => Math.round(size * 1),
    sizeLineHeight: (size) => Math.round(size * 1.1 + 8),
  },
);

const animations = createAnimations({
  fast: {
    damping: 20,
    mass: 1.2,
    stiffness: 250,
  },
  medium: {
    damping: 10,
    mass: 0.9,
    stiffness: 100,
  },
  slow: {
    damping: 20,
    mass: 1.2,
    stiffness: 60,
  },
});

export const config = createTamagui({
  ...defaultConfig,
  animations,
  defaultTheme: "dark",
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  themes,
  tokens: customTokens,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  media: {
    ...defaultConfig.media,
    // add your own media queries here, if wanted
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1650 },
    xxl: { minWidth: 1651 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 800 + 1 },
    gtMd: { minWidth: 1020 + 1 },
    gtLg: { minWidth: 1280 + 1 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: "none" },
    pointerCoarse: { pointer: "coarse" },
  },
});

type OurConfig = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends OurConfig {}
}

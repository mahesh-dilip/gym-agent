import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register once at module level
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

// Design system colors from globals.css
export const CHART_COLORS = {
  primary: "#3b82f6",
  primaryHover: "#60a5fa",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  textPrimary: "#ededed",
  textSecondary: "#a1a1aa",
  textTertiary: "#52525b",
  border: "#27272a",
  borderSubtle: "#18181b",
  surface: "#0a0a0a",
  surfaceElevated: "#121212",
};

// Muscle group color palette for analytics charts
export const MUSCLE_COLORS: Record<string, string> = {
  Chest: "#3b82f6",
  Back: "#10b981",
  Legs: "#f59e0b",
  Shoulders: "#8b5cf6",
  Arms: "#ec4899",
  Core: "#06b6d4",
  Other: "#52525b",
};

// Apply dark theme defaults
ChartJS.defaults.color = CHART_COLORS.textTertiary;
ChartJS.defaults.borderColor = CHART_COLORS.borderSubtle;
ChartJS.defaults.font.family = "'Geist', system-ui, sans-serif";
ChartJS.defaults.font.size = 10;

// Shared options for axes
export const darkScaleOptions = {
  grid: {
    color: CHART_COLORS.borderSubtle,
    drawTicks: false,
  },
  border: {
    display: false,
  },
  ticks: {
    color: CHART_COLORS.textTertiary,
    font: { size: 9 },
    padding: 4,
  },
} as const;

// Shared tooltip options — touch-friendly
export const darkTooltipOptions = {
  backgroundColor: CHART_COLORS.surfaceElevated,
  titleColor: CHART_COLORS.textPrimary,
  bodyColor: CHART_COLORS.textSecondary,
  borderColor: CHART_COLORS.border,
  borderWidth: 1,
  cornerRadius: 6,
  padding: 8,
  titleFont: { size: 11, weight: 600 as const },
  bodyFont: { size: 10 },
  displayColors: false,
  // Touch: show on nearest point, not just direct hit
  intersect: false,
  mode: "nearest" as const,
} as const;

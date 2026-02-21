export const MUSCLE_GROUPS: Record<string, string> = {
  bench: "Chest",
  "chest press": "Chest",
  incline: "Chest",
  fly: "Chest",
  squat: "Legs",
  "leg press": "Legs",
  "leg curl": "Legs",
  "leg extension": "Legs",
  lunge: "Legs",
  calf: "Legs",
  deadlift: "Back",
  row: "Back",
  "lat pull": "Back",
  "pull up": "Back",
  "pull-up": "Back",
  pulldown: "Back",
  curl: "Arms",
  bicep: "Arms",
  tricep: "Arms",
  hammer: "Arms",
  shoulder: "Shoulders",
  "overhead press": "Shoulders",
  "lateral raise": "Shoulders",
  "military press": "Shoulders",
  "face pull": "Shoulders",
  "reverse pec": "Shoulders",
  plank: "Core",
  crunch: "Core",
  "ab ": "Core",
};

export function inferMuscleGroup(exerciseName: string): string {
  const lower = exerciseName.toLowerCase();
  for (const [key, group] of Object.entries(MUSCLE_GROUPS)) {
    if (lower.includes(key)) return group;
  }
  return "Other";
}

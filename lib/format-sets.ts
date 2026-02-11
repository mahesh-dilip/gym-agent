import type { SetDetail } from "@/lib/supabase/types";

/**
 * Format set_details into a compact string like "26x15, 30x15, 30x20 kg"
 */
export function formatSetDetails(
  details: SetDetail[],
  weightUnit: string = "kg"
): string {
  if (!details || details.length === 0) return "";
  const parts = details.map((s) => {
    const w = s.weight ?? "?";
    const r = s.reps ?? "?";
    return `${w}x${r}`;
  });
  return `${parts.join(", ")} ${weightUnit}`;
}

/**
 * Calculate total volume from set_details: sum(weight * reps) per set
 */
export function getSetDetailsVolume(details: SetDetail[]): number {
  return details.reduce((sum, s) => {
    if (s.weight && s.reps) return sum + s.weight * s.reps;
    return sum;
  }, 0);
}

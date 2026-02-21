import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SetDetail } from "@/lib/supabase/types";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component context
          }
        },
      },
    }
  );
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const supabase = await getSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all sessions with exercises and recovery
  const { data: sessions, error } = await supabase
    .from("workout_sessions")
    .select("*, exercise_logs(*), recovery_logs(*)")
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  // Build CSV
  const headers = [
    "date",
    "session_status",
    "type",
    "exercise_name",
    "category",
    "sets",
    "reps",
    "weight",
    "weight_unit",
    "rpe",
    "rir",
    "duration_minutes",
    "distance_km",
    "set_details",
    "notes",
  ];

  const rows: string[] = [headers.join(",")];

  for (const session of sessions || []) {
    const exercises = (session.exercise_logs || []) as Array<{
      exercise_name: string;
      category: string;
      sets: number | null;
      reps: number | null;
      weight: number | null;
      weight_unit: string;
      rpe: number | null;
      rir: number | null;
      duration_minutes: number | null;
      distance_km: number | null;
      set_details: SetDetail[] | null;
      notes: string | null;
    }>;

    const recovery = (session.recovery_logs || []) as Array<{
      activity: string;
      body_area: string | null;
      duration_minutes: number | null;
      equipment: string | null;
      notes: string | null;
    }>;

    for (const e of exercises) {
      const setDetailsStr = e.set_details
        ? e.set_details
            .map((s) => `${s.weight ?? "?"}x${s.reps ?? "?"}${s.rpe ? `@${s.rpe}` : ""}`)
            .join("; ")
        : "";

      rows.push(
        [
          session.date,
          session.status,
          "exercise",
          escapeCSV(e.exercise_name),
          e.category,
          e.sets ?? "",
          e.reps ?? "",
          e.weight ?? "",
          e.weight_unit,
          e.rpe ?? "",
          e.rir ?? "",
          e.duration_minutes ?? "",
          e.distance_km ?? "",
          escapeCSV(setDetailsStr),
          escapeCSV(e.notes || ""),
        ].join(",")
      );
    }

    for (const r of recovery) {
      rows.push(
        [
          session.date,
          session.status,
          "recovery",
          escapeCSV(r.activity),
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          r.duration_minutes ?? "",
          "",
          "",
          escapeCSV(r.notes || ""),
        ].join(",")
      );
    }
  }

  const csv = rows.join("\n");
  const filename = `gym-agent-export-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

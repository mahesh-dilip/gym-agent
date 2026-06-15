import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During the build-time prerender pass, client components are rendered once
  // on the server where NEXT_PUBLIC_* env vars may be absent. Returning a stub
  // keeps `next build` from crashing; the real client + queries only run in the
  // browser inside useEffect, where the env vars are present.
  if (typeof window === "undefined" && (!url || !anonKey)) {
    return createBrowserClient(
      "http://localhost:54321",
      "build-time-placeholder-anon-key"
    );
  }

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill in your Supabase credentials."
    );
  }

  return createBrowserClient(url, anonKey);
}

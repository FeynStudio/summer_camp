// Read-only Supabase client for server-side tRPC queries.
// No auth / SSR cookies needed — app is public read-only.
import { createClient } from "@supabase/supabase-js"

export function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

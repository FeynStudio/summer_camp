import { initTRPC } from "@trpc/server"
import { createSupabaseClient } from "../lib/supabase/server"

export function createContext() {
  return { supabase: createSupabaseClient() }
}

export type Context = ReturnType<typeof createContext>

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

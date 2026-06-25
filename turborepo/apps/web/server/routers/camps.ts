import { z } from "zod"
import { publicProcedure, router } from "../trpc"
import { normalizeSessions } from "@repo/core"

export const campsRouter = router({
  /** Fetch all camps from best_camp_sessions view. */
  list: publicProcedure
    .input(
      z.object({
        year: z.number().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from("best_camp_sessions")
        .select("*")
        .order("camp_name", { ascending: true })

      if (input?.year) {
        query = query.eq("year", input.year)
      }

      const { data, error } = await query

      if (error) throw new Error(error.message)

      return normalizeSessions(data ?? [])
    }),

  /** Fetch a single camp by id. */
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("best_camp_sessions")
        .select("*")
        .eq("id", input.id)
        .single()

      if (error) throw new Error(error.message)
      return data
    }),

  /** All distinct years available in best_camp_sessions. */
  years: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .rpc("distinct_camp_years")

    if (error) throw new Error(error.message)

    return (data ?? []) as number[]
  }),
})

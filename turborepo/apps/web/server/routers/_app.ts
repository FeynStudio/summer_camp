import { router } from "../trpc"
import { campsRouter } from "./camps"

export const appRouter = router({
  camps: campsRouter,
})

export type AppRouter = typeof appRouter

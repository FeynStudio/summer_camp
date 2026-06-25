import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// No auth — app is fully public read-only. Pass all requests through.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

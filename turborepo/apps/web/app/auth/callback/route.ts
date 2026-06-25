// Auth removed — redirect to home.
import { NextResponse } from "next/server"
export function GET() {
  return NextResponse.redirect("/")
}

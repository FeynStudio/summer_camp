// Auth removed — app is public read-only.
import { redirect } from "next/navigation"
export default function SignIn() {
  redirect("/")
}

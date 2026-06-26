import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { TRPCProvider } from "../lib/trpc/provider"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
})

export const metadata: Metadata = {
  title: "Camp Planner",
  description: "Find and compare summer camps near Princeton, NJ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Camp Planner",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans bg-slate-50 text-slate-900 antialiased`}>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  )
}

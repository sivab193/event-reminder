import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/lib/theme-context"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Footer } from "@/components/footer"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Event Reminder - Never Miss an Event",
  description: "Track events and get timely reminders across all your devices.",
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Events",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${_geist.className} ${_geistMono.variable} antialiased h-screen w-screen overflow-hidden bg-background`}>
        <ThemeProvider>
          <AuthProvider>
            <div className="flex flex-col h-full overflow-hidden">
              <main className="flex-1 flex flex-col relative overflow-hidden">
                <ThemeToggle />
                {children}
              </main>
              <Footer />
            </div>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}

"use client"

import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { AuthForm } from "@/components/auth-form"
import { Cake, Mail, Zap, Shield, Globe, Clock, MessageSquare, LayoutDashboard } from "lucide-react"
import { Stats } from "@/components/stats"

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false)
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-background to-muted/20">
      <div className="flex-1 flex flex-col justify-center container mx-auto px-4 py-6 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
            <Cake className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 text-balance">The Ultimate Event Reminder</h1>
          <p className="text-base text-muted-foreground text-pretty max-w-xl mx-auto mb-4">
            Track events, birthdays, and anniversaries — get smart reminders across multiple platforms.
          </p>
          <div className="flex gap-3 justify-center">
            {user ? (
              <Link href="/dashboard">
                <Button size="default">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Button size="default" onClick={() => setIsAuthModalOpen(true)}>
                  Get Started
                </Button>
                <Button size="default" variant="outline" onClick={() => setIsAuthModalOpen(true)}>
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 mb-6">
          <div className="flex items-start gap-3 p-3 bg-card/50 rounded-lg border">
            <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
              <Cake className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Track Any Event</h3>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">Birthdays, anniversaries, or custom events with filtering.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-card/50 rounded-lg border">
            <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Multi-Channel Alerts</h3>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">Telegram, Discord, and Email integration.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-card/50 rounded-lg border">
            <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Flexible Timings</h3>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">Custom reminder offsets (5 mins before, 10h after).</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-card/50 rounded-lg border relative overflow-hidden">
            <div className="absolute -right-4 -top-4 h-16 w-16 bg-primary/20 rounded-full blur-xl"></div>
            <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 flex items-center justify-center z-10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="z-10">
              <h3 className="font-semibold text-foreground text-sm">Sync Integrations</h3>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                <a href="https://zh.siv19.dev/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">ZeroHour</a> & WhatsApp coming soon.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-card/50 rounded-lg border border-dashed opacity-60">
            <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Bulk Importing</h3>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5"><span className="text-primary font-medium">Coming soon!</span> CSV & calendar import.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-card/50 rounded-lg border">
            <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Privacy First</h3>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">Secure storage, never shared. No creeping logs.</p>
            </div>
          </div>
        </div>

        <Stats />
      </div>

      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="sm:max-w-md p-0 bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">Authentication</DialogTitle>
          <AuthForm onSuccess={handleAuthSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

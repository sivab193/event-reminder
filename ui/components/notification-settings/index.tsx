"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { getUserProfile, updateUserProfile, createUserProfile, type UserProfile, REMINDER_TIMING_PRESETS } from "@/lib/user-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { onSnapshot, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, Mail, Send, MessageSquare, Calendar, Copy, Clock, CheckCircle2, AlertCircle, Info } from "lucide-react"

export function NotificationSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Verification state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [verifyingChannel, setVerifyingChannel] = useState<"email" | "telegram" | "discord" | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [sendingChannel, setSendingChannel] = useState<string | null>(null)
  const [checkingCode, setCheckingCode] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<string>("idle") // idle, queued, sent, failed

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  // Monitor email job status in real-time
  useEffect(() => {
    if (!currentJobId) return

    const unsubscribe = onSnapshot(doc(db, "email_jobs", currentJobId), (snap) => {
      if (snap.exists()) {
        const status = snap.data().status
        setJobStatus(status)
        
        if (status === "sent") {
          toast({ title: "Code sent!", description: "Check your channel for the verification code." })
        } else if (status === "failed") {
          toast({ title: "Failed to send code", description: "Please try again.", variant: "destructive" })
          setCurrentJobId(null)
          setSendingChannel(null)
        }
      }
    })

    return () => unsubscribe()
  }, [currentJobId, toast])

  const loadProfile = async () => {
    if (!user) return
    let data = await getUserProfile(user.uid)
    if (!data) {
       await createUserProfile(user.uid, user.email || "")
       data = await getUserProfile(user.uid)
    }
    setProfile(data)
    setLoading(false)
  }

  const handleSave = async () => {
    if (!user || !profile) return
    setSaving(true)
    try {
      await updateUserProfile(user.uid, {
        notifications: profile.notifications,
      })
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const sendCode = async (channel: "email" | "telegram" | "discord", identifier: string) => {
    if (!user) return
    setSendingChannel(channel)
    try {
      const res = await fetch("/api/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, channel, identifier })
      })
      const data = await res.json()
      if (data.success) {
        setVerifyingChannel(channel)
        setVerificationCode("")
        setCurrentJobId(data.jobId)
        setJobStatus("pending")
        setVerifyModalOpen(true)
        toast({ title: "Code Sent", description: "Please check your channel for the verification code." })
      } else {
        toast({ title: "Failed to send code", description: data.error, variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" })
    } finally {
      setSendingChannel(null)
    }
  }

  const verifyCode = async () => {
    if (!user || !verifyingChannel) return
    setCheckingCode(true)
    try {
      const identifier = verifyingChannel === "email" ? profile?.notifications?.email.address :
                         verifyingChannel === "telegram" ? profile?.notifications?.telegram.chatId :
                         profile?.notifications?.discord.webhookUrl

      const res = await fetch("/api/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, channel: verifyingChannel, code: verificationCode, identifier })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Verified!", description: "Channel verified successfully." })
        setVerifyModalOpen(false)
        await loadProfile()
      } else {
        toast({ title: "Verification Failed", description: data.error, variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" })
    } finally {
      setCheckingCode(false)
    }
  }

  const testNotification = async (channel: "email" | "telegram" | "discord") => {
    if (!user) return
    toast({ title: "Sending...", description: "Triggering a test notification." })
    try {
      const res = await fetch("/api/test-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          channel,
          birthday: {
            id: "test",
            name: "Test User",
            birthdate: "1992-03-24",
            type: "birthday",
            association: "Demo",
            unknownYear: false,
            meetDate: "2018-06-15",
            timezone: "Asia/Kolkata",
            createdAt: Date.now()
          }
        })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Success", description: "Test notification dispatched." })
      } else {
        toast({ title: "Failed", description: data.error, variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile || !profile.notifications) return null

  const updateNotification = (channel: keyof NonNullable<UserProfile["notifications"]>, field: string, value: any) => {
    if (channel === "reminderTiming") {
      setProfile({
        ...profile,
        notifications: {
          ...profile.notifications!,
          reminderTiming: value,
        },
      })
    } else {
      setProfile({
        ...profile,
        notifications: {
          ...profile.notifications!,
          [channel]: {
            ...(profile.notifications![channel] as any),
            [field]: value,
          },
        },
      })
    }
  }

  const renderChannelControls = (channel: "email" | "telegram" | "discord", identifier: string) => {
    const channelData = profile.notifications![channel] as { verified?: boolean }
    const isVerified = channelData.verified
    
    return (
      <div className="flex flex-col gap-2 mt-4 ml-8">
        <div className="flex items-center gap-2">
           {isVerified ? (
             <div className="flex items-center text-sm text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200">
               <CheckCircle2 className="w-4 h-4 mr-1" /> Verified
             </div>
           ) : (
             <div className="flex items-center text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
               <AlertCircle className="w-4 h-4 mr-1" /> Unverified
             </div>
           )}
           
           {!isVerified && (
             <Button 
               size="sm" 
               variant="outline" 
               onClick={() => sendCode(channel, identifier)}
               disabled={sendingChannel === channel || !identifier}
             >
               {sendingChannel === channel ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Code"}
             </Button>
           )}
           
           {isVerified && (
             <Button 
               size="sm" 
               variant="secondary" 
               onClick={() => testNotification(channel)}
             >
               Test Notification
             </Button>
           )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="sticky top-0 z-20 px-6 py-4 border-b border-gray-800 bg-[#111318] flex items-center justify-between shrink-0">
        <DialogTitle className="text-lg font-semibold text-foreground m-0">Notification Settings</DialogTitle>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Global Reminder Timing */}
          <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <Label className="text-base font-semibold">Reminder Timing</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose when you want to receive reminders relative to the event day (in the event&apos;s timezone).
          </p>
          <div className="grid grid-cols-2 gap-2">
            {REMINDER_TIMING_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => updateNotification("reminderTiming", "", preset.value)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  profile.notifications!.reminderTiming === preset.value
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-gray-700 bg-card/50 hover:border-gray-500"
                }`}
              >
                <div className="font-medium text-sm text-foreground">{preset.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{preset.description}</div>
              </button>
            ))}
          </div>
          <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/20">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Custom reminder timings per individual event coming soon!
            </p>
          </div>
        </div>

        {/* WhatsApp Coming Soon */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center bg-green-500 text-white rounded-full">
                 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </div>
              <div>
                <Label className="text-base line-through">WhatsApp Notifications</Label>
                <p className="text-sm text-primary font-medium">Coming soon!</p>
              </div>
            </div>
            <Switch disabled checked={false} />
          </div>
        </div>

        {/* Calendar Feed Coming Soon */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <Label className="text-base line-through">Calendar Feed (Mobile Push)</Label>
                <p className="text-sm text-primary font-medium">Coming soon!</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              <Copy className="h-4 w-4 mr-2" />
              Copy URL
            </Button>
          </div>
        </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 md:border-l md:border-gray-800 md:pl-8">
        {/* Email Channel */}
        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <Label className="text-base">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive reminders via email</p>
            </div>
          </div>
          <Switch
            checked={profile.notifications.email.enabled}
            onCheckedChange={(checked: boolean) => updateNotification("email", "enabled", checked)}
          />
        </div>
        {profile.notifications.email.enabled && (
          <div className="ml-8 space-y-2">
            <Input
              placeholder="Email address"
              value={profile.notifications.email.address}
              onChange={(e) => {
                updateNotification("email", "address", e.target.value)
                if (profile.notifications!.email.verified && e.target.value !== profile.notifications!.email.address) {
                  updateNotification("email", "verified", false)
                }
              }}
            />
          </div>
        )}
        {profile.notifications.email.enabled && renderChannelControls("email", profile.notifications.email.address)}
      </div>

      {/* Telegram Channel */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-[#0088cc]" />
            <div>
              <Label className="text-base">Telegram Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive reminders via Telegram</p>
            </div>
          </div>
          <Switch
            checked={profile.notifications.telegram.enabled}
            onCheckedChange={(checked: boolean) => updateNotification("telegram", "enabled", checked)}
          />
        </div>
        {profile.notifications.telegram.enabled && (
          <div className="ml-8 space-y-2">
            <Input
              placeholder="Telegram Chat ID"
              value={profile.notifications.telegram.chatId}
              onChange={(e) => {
                updateNotification("telegram", "chatId", e.target.value)
                if (profile.notifications!.telegram.verified && e.target.value !== profile.notifications!.telegram.chatId) {
                  updateNotification("telegram", "verified", false)
                }
              }}
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>To get your Chat ID:</p>
              <ol className="list-decimal list-inside ml-2 space-y-0.5">
                <li>Click the link below to start a chat with our bot</li>
                <li>Send any message (like "hi") to the bot</li>
                <li>Message <code className="bg-muted px-1 rounded">@userinfobot</code> to get your Chat ID</li>
                <li>Paste the Chat ID here</li>
              </ol>
              <p className="mt-2">
                <a 
                  href="https://t.me/your_bot_username" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  💬 Start chat with Event Reminder Bot
                </a>
              </p>
            </div>
          </div>
        )}
        {profile.notifications.telegram.enabled && renderChannelControls("telegram", profile.notifications.telegram.chatId)}
      </div>

      {/* Discord Channel */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-[#5865F2]" />
            <div>
              <Label className="text-base">Discord Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive reminders via Discord Webhook</p>
            </div>
          </div>
          <Switch
            checked={profile.notifications.discord.enabled}
            onCheckedChange={(checked: boolean) => updateNotification("discord", "enabled", checked)}
          />
        </div>
        {profile.notifications.discord.enabled && (
          <div className="ml-8 space-y-2">
            <Input
              placeholder="Discord Webhook URL"
              value={profile.notifications.discord.webhookUrl}
              onChange={(e) => {
                updateNotification("discord", "webhookUrl", e.target.value)
                if (profile.notifications!.discord.verified && e.target.value !== profile.notifications!.discord.webhookUrl) {
                  updateNotification("discord", "verified", false)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Create a webhook in your Discord server settings.
            </p>
          </div>
        )}
        {profile.notifications.discord.enabled && renderChannelControls("discord", profile.notifications.discord.webhookUrl)}
      </div>
      
        {/* ZeroHour Banner */}
      <div className="bg-muted p-4 rounded-lg mt-6 flex items-start gap-3">
        <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground space-y-2">
           <p><strong className="text-foreground">ZeroHour Integration</strong> is coming soon! You&apos;ll be able to sync these events directly to <a href="https://zh.siv19.dev/" target="_blank" rel="noreferrer" className="text-primary hover:underline">zh.siv19.dev</a>.</p>
        </div>
      </div>

      </div>
      </div>

      <div className="sticky bottom-0 z-20 px-6 py-4 border-t border-gray-800 bg-[#111318] shrink-0">
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </div>

      <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Channel</DialogTitle>
            <DialogDescription>
              We&apos;ve sent a 6-digit code to your {verifyingChannel}. Please enter it below to verify this channel and start receiving notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="Enter 6-digit code" 
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
              className="text-center text-lg tracking-widest font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyModalOpen(false)}>Cancel</Button>
            <Button onClick={verifyCode} disabled={checkingCode || verificationCode.length !== 6}>
              {checkingCode ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

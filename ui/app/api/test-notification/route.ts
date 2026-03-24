import { NextResponse } from "next/server"
import { getUserProfile } from "@/lib/user-profile"
import { triggerNotifications } from "@/lib/notifications"
import type { Birthday } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const { userId, birthday, channel }: { userId: string; birthday: Birthday; channel?: string } = await request.json()

    if (!userId || !birthday) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const profile = await getUserProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // If a specific channel is passed, disable the others for the test run
    const testProfile = { ...profile }
    if (channel && testProfile.notifications) {
      if (channel !== "email") testProfile.notifications.email.enabled = false;
      if (channel !== "telegram") testProfile.notifications.telegram.enabled = false;
      if (channel !== "discord") testProfile.notifications.discord.enabled = false;
    }

    await triggerNotifications(testProfile, birthday)

    return NextResponse.json({ success: true, message: "Test notifications sent" })
  } catch (error) {
    console.error("Test Notification Error:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { getAllUserProfiles } from "@/lib/user-profile"
import { getBirthdays } from "@/lib/birthdays"
import { triggerNotifications } from "@/lib/notifications"

function parseTimingOffset(timing: string): number {
  // Handle the "midnight" preset (0 offset)
  if (timing === "midnight") return 0

  const match = timing.match(/^([+-]?)(\d+)([mhd])$/)
  if (!match) return 0
  
  const sign = match[1] === '-' ? -1 : 1
  const value = parseInt(match[2], 10)
  
  let multiplier = 60 * 1000 // default minutes
  if (match[3] === 'h') multiplier = 60 * 60 * 1000
  if (match[3] === 'd') multiplier = 24 * 60 * 60 * 1000
  
  return sign * value * multiplier
}

function getMidnightInTimezone(timezone: string | undefined): number {
  const now = new Date()
  
  // Get "today" in the event's timezone
  const tz = timezone || "UTC"
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(now)
  const year = parseInt(parts.find(p => p.type === "year")!.value, 10)
  const month = parseInt(parts.find(p => p.type === "month")!.value, 10)
  const day = parseInt(parts.find(p => p.type === "day")!.value, 10)

  // Build a Date for midnight in the target timezone by using UTC and adjusting
  // We need offset from UTC for the target timezone at midnight of that day
  const midnightLocal = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`)
  
  // Get the UTC equivalent of midnight in the target timezone
  const utcMidnight = new Date(midnightLocal.toLocaleString("en-US", { timeZone: "UTC" }))
  const tzMidnight = new Date(midnightLocal.toLocaleString("en-US", { timeZone: tz }))
  const offsetMs = utcMidnight.getTime() - tzMidnight.getTime()
  
  return midnightLocal.getTime() + offsetMs
}

function getTodayInTimezone(timezone: string | undefined): { month: number; day: number } {
  const now = new Date()
  const tz = timezone || "UTC"
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(now)
  return {
    month: parseInt(parts.find(p => p.type === "month")!.value, 10),
    day: parseInt(parts.find(p => p.type === "day")!.value, 10),
  }
}

export async function GET(request: Request) {
  // Check authorization (e.g., Vercel Cron Secret)
  const authHeader = request.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const users = await getAllUserProfiles()
    const now = Date.now()

    console.log(`Cron started at ${new Date(now).toISOString()}: checking events for ${users.length} users`)

    for (const user of users) {
      if (!user.notifications) continue;

      const birthdays = await getBirthdays(user.userId)
      const globalTiming = user.notifications.reminderTiming || "midnight"
      const offset = parseTimingOffset(globalTiming)
      
      for (const birthday of birthdays) {
        const [, eventMonth, eventDay] = birthday.birthdate.split("-").map(Number)
        
        // Use the event's timezone (or UTC fallback) to determine if today is the event day
        const eventTz = birthday.timezone || undefined
        const today = getTodayInTimezone(eventTz)
        
        // Check if today matches the event's month and day in the event's timezone
        if (today.month !== eventMonth || today.day !== eventDay) {
          continue
        }

        // Calculate midnight in the event's timezone and apply the global timing offset
        const midnightMs = getMidnightInTimezone(eventTz)
        const targetTime = midnightMs + offset
        
        // Check if 'now' is within a 5-minute window of the target time
        const isDue = now >= targetTime && now < targetTime + (5 * 60 * 1000)

        if (isDue) {
          console.log(`Triggering reminder: ${birthday.name} for user ${user.email} (timing: ${globalTiming}, tz: ${eventTz || 'UTC'})`)
          await triggerNotifications(user, birthday)
        }
      }
    }

    return NextResponse.json({ success: true, message: "Notifications processed" })
  } catch (error) {
    console.error("Cron Error:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}

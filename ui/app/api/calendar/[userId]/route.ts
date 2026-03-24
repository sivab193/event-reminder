import { NextResponse } from "next/server"
import { getBirthdays } from "@/lib/birthdays"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    if (!userId) {
      return new Response("Missing userId", { status: 400 })
    }

    const birthdays = await getBirthdays(userId)

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Event Reminder//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Event Reminders",
      "X-WR-CALDESC:Your tracked events",
      "X-PUBLISHED-TTL:PT1H",
      "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    ]

    for (const birthday of birthdays) {
      // birthday.birthdate is "YYYY-MM-DD"
      // We want to format it as YYYYMMDD for ICS
      const dtstart = birthday.birthdate.replace(/-/g, "")
      const uid = `${birthday.id}@eventreminder.app`
      const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
      icsContent.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `SUMMARY:🎂 ${birthday.name}'s Birthday`,
        `DESCRIPTION:Association: ${birthday.association || birthday.company || 'None'}\\nTimezone: ${birthday.timezone}`,
        `DTSTART;VALUE=DATE:${dtstart}`,
        "RRULE:FREQ=YEARLY",
        "TRANSP:TRANSPARENT",
        "END:VEVENT"
      )
    }

    icsContent.push("END:VCALENDAR")

    return new Response(icsContent.join("\r\n"), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="birthdays.ics"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Error generating ICS:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

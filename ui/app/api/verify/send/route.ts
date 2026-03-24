import { NextResponse } from "next/server"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import nodemailer from "nodemailer"

const smtpPort = parseInt(process.env.SMTP_PORT || "465")
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

const SMTP_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || ""

export async function POST(request: Request) {
  try {
    const { userId, channel, identifier } = await request.json()

    if (!userId || !channel || !identifier) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Store the code in Firestore with a 15-minute expiration
    const expiresAt = Date.now() + 15 * 60 * 1000
    await setDoc(doc(db, "verifications", `${userId}_${channel}`), {
      code,
      identifier,
      expiresAt,
    })

    // Send the code via the requested channel
    if (channel === "email") {
      if (!SMTP_FROM || !process.env.SMTP_USER) {
        return NextResponse.json({ error: "Email SMTP not configured" }, { status: 500 })
      }
      await transporter.sendMail({
        from: SMTP_FROM,
        to: identifier,
        subject: "Event Reminder Verification Code",
        html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code will expire in 15 minutes.</p>`,
      })
    } else if (channel === "telegram") {
      // Basic HTTP request to Telegram API to send the code
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      if (!botToken) {
        return NextResponse.json({ error: "Telegram bot not configured" }, { status: 500 })
      }
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
      const res = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: identifier,
          text: `Your Event Reminder verification code is: ${code}\nThis code will expire in 15 minutes.`,
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        console.error("Telegram API Error:", err)
        return NextResponse.json({ error: "Failed to send Telegram message. Please ensure the chat ID is correct and you have started a chat with the bot (@userinfobot to find ID, and then message your actual bot)." }, { status: 400 })
      }
    } else if (channel === "discord") {
      // Ensure the identifier is a valid discord webhook URL
      if (!identifier.startsWith("https://discord.com/api/webhooks/")) {
        return NextResponse.json({ error: "Invalid Discord Webhook URL" }, { status: 400 })
      }
      const res = await fetch(identifier, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `Your Event Reminder verification code is: **${code}**\nThis code will expire in 15 minutes.`,
        }),
      })
      if (!res.ok) {
        return NextResponse.json({ error: "Failed to send Discord message via webhook" }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: "Unsupported channel" }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Code sent successfully" })
  } catch (error) {
    console.error("Verification Send Error:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}

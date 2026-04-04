import { NextResponse } from "next/server"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { v4 as uuid } from "uuid"

export async function POST(request: Request) {
  try {
    const { userId, channel, identifier } = await request.json()

    if (!userId || !channel || !identifier) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate email format for email channel
    if (channel === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(identifier)) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
      }
    }

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Create email/verification job in Firestore
    // The scheduler will pick this up and push to Redis queue
    const jobId = uuid()
    const expiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes

    await setDoc(doc(db, "email_jobs", jobId), {
      id: jobId,
      userId,
      type: "verification", // "verification" or "reminder"
      channel, // "email", "telegram", "discord"
      identifier,
      code,
      status: "pending", // pending → queued → sent → failed
      createdAt: serverTimestamp(),
      expiresAt,
    })

    return NextResponse.json({
      success: true,
      jobId,
      message: "Verification code queued for sending",
    })
  } catch (error) {
    console.error("Email Job Creation Error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

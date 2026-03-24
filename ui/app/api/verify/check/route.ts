import { NextResponse } from "next/server"
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getUserProfile } from "@/lib/user-profile"

export async function POST(request: Request) {
  try {
    const { userId, channel, code, identifier } = await request.json()

    if (!userId || !channel || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const verificationRef = doc(db, "verifications", `${userId}_${channel}`)
    const verificationSnap = await getDoc(verificationRef)

    if (!verificationSnap.exists()) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 })
    }

    const verificationData = verificationSnap.data()

    if (Date.now() > verificationData.expiresAt) {
      await deleteDoc(verificationRef)
      return NextResponse.json({ error: "Verification code expired" }, { status: 400 })
    }

    if (verificationData.code !== code) {
      return NextResponse.json({ error: "Incorrect verification code" }, { status: 400 })
    }

    // Identifiers must match what was saved when the code was generated
    if (verificationData.identifier !== identifier) {
      return NextResponse.json({ error: "Identifier does not match the code request" }, { status: 400 })
    }

    // Update user profile to set verified: true
    const profile = await getUserProfile(userId)
    if (!profile || !profile.notifications) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    await updateDoc(doc(db, "users", userId), {
      [`notifications.${channel}.verified`]: true,
      [`notifications.${channel}.enabled`]: true,
    })

    // Clean up verification doc
    await deleteDoc(verificationRef)

    return NextResponse.json({ success: true, message: "Channel verified successfully" })
  } catch (error) {
    console.error("Verification Check Error:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}

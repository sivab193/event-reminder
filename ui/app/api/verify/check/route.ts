import { NextResponse } from "next/server"
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getUserProfile } from "@/lib/user-profile"

export async function POST(request: Request) {
  try {
    const { userId, channel, code, identifier } = await request.json()

    if (!userId || !channel || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Find the email_job that matches this code
    const emailJobsRef = collection(db, "email_jobs")
    const q = query(
      emailJobsRef,
      where("userId", "==", userId),
      where("channel", "==", channel),
      where("code", "==", code)
    )
    
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 })
    }

    const jobDoc = querySnapshot.docs[0]
    const jobData = jobDoc.data()

    // Check if code has expired
    if (Date.now() > jobData.expiresAt) {
      await deleteDoc(jobDoc.ref)
      return NextResponse.json({ error: "Verification code expired" }, { status: 400 })
    }

    // Verify identifier matches
    if (jobData.identifier !== identifier) {
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

    // Mark email job as verified
    await updateDoc(jobDoc.ref, {
      status: "verified",
      verifiedAt: Date.now(),
    })

    return NextResponse.json({ success: true, message: "Channel verified successfully" })
  } catch (error) {
    console.error("Verification Check Error:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}

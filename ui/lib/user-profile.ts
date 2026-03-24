import { doc, setDoc, getDoc, updateDoc, collection, getDocs, increment } from "firebase/firestore"
import { db } from "./firebase"

export interface UserProfile {
  email: string
  userId: string
  createdAt: number
  notifications?: {
    reminderTiming: string // global preset: "midnight" | "-15m" | "+15m" | "+1h" | "+6h" | "+10h"
    email: { enabled: boolean; address: string; verified?: boolean }
    telegram: { enabled: boolean; chatId: string; verified?: boolean }
    discord: { enabled: boolean; webhookUrl: string; verified?: boolean }
  }
}

export const REMINDER_TIMING_PRESETS = [
  { value: "midnight", label: "Start of day (12:00 AM)", description: "Exactly midnight in event timezone" },
  { value: "-15m", label: "15 minutes before midnight", description: "11:45 PM the day before" },
  { value: "+15m", label: "15 minutes after midnight", description: "12:15 AM on event day" },
  { value: "+1h", label: "1 hour after midnight", description: "1:00 AM on event day" },
  { value: "+6h", label: "Morning (6:00 AM)", description: "6:00 AM on event day" },
  { value: "+10h", label: "Mid-morning (10:00 AM)", description: "10:00 AM on event day" },
] as const

const DEFAULT_NOTIFICATIONS = {
  reminderTiming: "midnight" as string,
  email: { enabled: true, address: "", verified: false },
  telegram: { enabled: false, chatId: "", verified: false },
  discord: { enabled: false, webhookUrl: "", verified: false },
}

export async function createUserProfile(userId: string, email: string) {
  await setDoc(doc(db, "users", userId), {
    email,
    userId,
    createdAt: Date.now(),
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      email: { enabled: true, address: email, verified: false },
    },
  })

  try {
    const statsRef = doc(db, "stats", "counters")
    await updateDoc(statsRef, { users: increment(1) })
  } catch (e) {
    // Document might not exist yet
    try {
      await setDoc(doc(db, "stats", "counters"), { users: 1, birthdaysTracked: 0, visits: 0 }, { merge: true })
    } catch (err) {
      console.error("Failed to update stats", err)
    }
  }
}

export async function updateUserProfile(userId: string, profile: Partial<UserProfile>) {
  const docRef = doc(db, "users", userId)
  await updateDoc(docRef, profile)
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(doc(db, "users", userId))
  if (docSnap.exists()) {
    const data = docSnap.data() as UserProfile
    // Ensure notifications exist for legacy users
    if (!data.notifications) {
      data.notifications = {
        ...DEFAULT_NOTIFICATIONS,
        email: { enabled: true, address: data.email, verified: false },
      }
    }
    // Migrate legacy per-channel timings to global
    if (!data.notifications.reminderTiming) {
      data.notifications.reminderTiming = "midnight"
    }
    return data
  }
  return null
}

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  const querySnapshot = await getDocs(collection(db, "users"))
  return querySnapshot.docs.map((doc) => {
    const data = doc.data() as UserProfile
    if (!data.notifications) {
      data.notifications = {
        ...DEFAULT_NOTIFICATIONS,
        email: { enabled: true, address: data.email, verified: false },
      }
    }
    if (!data.notifications.reminderTiming) {
      data.notifications.reminderTiming = "midnight"
    }
    return data
  })
}

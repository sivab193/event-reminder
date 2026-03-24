import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getCountFromServer, doc, setDoc } from "firebase/firestore"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const usersSnap = await getCountFromServer(collection(db, "users"))
    const usersCount = usersSnap.data().count

    const bdaySnap = await getCountFromServer(collection(db, "birthdays"))
    const bdayCount = bdaySnap.data().count

    const statsRef = doc(db, "stats", "counters")
    await setDoc(statsRef, {
      users: usersCount,
      birthdaysTracked: bdayCount
    }, { merge: true })

    return NextResponse.json({ success: true, users: usersCount, birthdaysTracked: bdayCount })
  } catch (error) {
    console.error("Failed to sync stats", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// import { NextResponse } from "next/server"
// import { collection, getDocs } from "firebase/firestore"
// import { db } from "@/lib/firebase"
// import { sendBirthdayReminder } from "@/lib/email"
// import type { Birthday } from "@/lib/types"

// export const dynamic = "force-dynamic"

// // This runs every hour to check for upcoming birthdays
// export async function GET(request: Request) {
//   try {
//     // Verify this is a cron job request
//     const authHeader = request.headers.get("authorization")
//     if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
//     }

//   console.log("[birthday-remainder] Starting birthday check...")

//     // Get all birthdays
//     const birthdaysSnapshot = await getDocs(collection(db, "birthdays"))
//     const birthdays = birthdaysSnapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     })) as Birthday[]

//   console.log(`[birthday-remainder] Found ${birthdays.length} birthdays to check`)

//     // Get all users to map userId to email
//     const usersSnapshot = await getDocs(collection(db, "users"))
//     const userEmails = new Map<string, string>()
//     usersSnapshot.docs.forEach((doc) => {
//       const data = doc.data()
//       if (data.email) {
//         userEmails.set(doc.id, data.email)
//       }
//     })

//     const now = new Date()
//     const reminders: Array<{ email: string; person: { name: string; company: string } }> = []

//     // Check each birthday
//     for (const birthday of birthdays) {
//       try {
//         // Parse the birthday date in the person's timezone
//         const birthdayDate = new Date(birthday.birthdate + "T00:00:00")

//         // Get current date in the person's timezone
//         const currentDateInTimezone = new Date(now.toLocaleString("en-US", { timeZone: birthday.timezone }))

//         // Check if today is their birthday (month and day match)
//         const isBirthdayToday =
//           birthdayDate.getMonth() === currentDateInTimezone.getMonth() &&
//           birthdayDate.getDate() === currentDateInTimezone.getDate()

//         if (isBirthdayToday) {
//           // Check if it's 5 minutes before midnight in their timezone (23:55)
//           const hours = currentDateInTimezone.getHours()
//           const minutes = currentDateInTimezone.getMinutes()

//           // Send reminder at 23:55 (5 mins before midnight)
//           if (hours === 23 && minutes >= 55) {
//             const userEmail = userEmails.get(birthday.userId)
//             if (userEmail) {
//               reminders.push({
//                 email: userEmail,
//                 person: {
//                   name: birthday.name,
//                   company: birthday.company,
//                 },
//               })
//             }
//           }
//         }
//       } catch (error) {
//   console.error(`[birthday-remainder] Error processing birthday ${birthday.id}:`, error)
//       }
//     }

//   console.log(`[birthday-remainder] Sending ${reminders.length} reminders...`)

//     // Send all reminders
//     const results = await Promise.all(reminders.map(({ email, person }) => sendBirthdayReminder(email, person)))

//     const successCount = results.filter((r) => r.success).length

//   console.log(`[birthday-remainder] Successfully sent ${successCount}/${reminders.length} reminders`)

//     return NextResponse.json({
//       success: true,
//       checked: birthdays.length,
//       sent: successCount,
//       timestamp: now.toISOString(),
//     })
//   } catch (error) {
//   console.error("[birthday-remainder] Birthday check failed:", error)
//     return NextResponse.json({ error: "Failed to check birthdays" }, { status: 500 })
//   }
// }

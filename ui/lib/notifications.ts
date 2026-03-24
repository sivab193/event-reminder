import { Resend } from "resend"
import type { UserProfile } from "./user-profile"
import type { Birthday } from "./types"

const resend = new Resend(process.env.RESEND_API_KEY)

const PORTAL_URL = "https://er.siv19.dev/dashboard"

function getEventLabel(birthday: Birthday): string {
  if (birthday.type && birthday.type !== 'birthday') {
    return birthday.type.charAt(0).toUpperCase() + birthday.type.slice(1)
  }
  return 'Birthday'
}

function formatDate(dateStr: string, includeYear: boolean): string {
  const [year, month, day] = dateStr.split("-")
  return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`
}

function computeAgeDuration(birthday: Birthday): string | null {
  if (birthday.unknownYear) return null
  const [yearStr] = birthday.birthdate.split("-")
  const birthYear = parseInt(yearStr, 10)
  if (!birthYear || birthYear < 1900) return null

  const now = new Date()
  const age = now.getFullYear() - birthYear

  if (age <= 0) return null

  const eventType = (birthday.type || 'birthday').toLowerCase()
  if (eventType === 'birthday') {
    return `Turning ${age} 🎂`
  } else if (eventType === 'anniversary') {
    return `${age} ${age === 1 ? 'year' : 'years'} together 💍`
  }
  return `${age} ${age === 1 ? 'year' : 'years'} ago`
}

function formatMeetDate(birthday: Birthday): string | null {
  if (!birthday.meetDate) return null
  const [year, month, day] = birthday.meetDate.split("-")
  const meetYear = parseInt(year, 10)
  if (!meetYear || meetYear < 1900) return null
  return `${day}/${month}/${year}`
}

export async function sendEmailNotification(
  email: string,
  birthday: Birthday,
) {
  const formattedDate = formatDate(birthday.birthdate, !birthday.unknownYear)
  const eventName = getEventLabel(birthday)
  const ageDuration = computeAgeDuration(birthday)
  const meetDateFormatted = formatMeetDate(birthday)

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Reminder</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">🎉 ${eventName} Reminder</h1>
          </div>
          <div style="padding: 40px 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hi there! 👋
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Just a friendly reminder — today is <strong>${birthday.name}</strong>'s ${eventName.toLowerCase()}!${ageDuration ? ` <strong>${ageDuration}</strong>` : ''}
            </p>
            <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #667eea;">
              <div style="margin-bottom: 12px;">
                <span style="color: #6b7280; font-size: 14px;">Name:</span>
                <div style="color: #111827; font-size: 18px; font-weight: 600; margin-top: 4px;">${birthday.name}</div>
              </div>
              ${(birthday.association || birthday.company) ? `
              <div style="margin-bottom: 12px;">
                <span style="color: #6b7280; font-size: 14px;">Association:</span>
                <div style="color: #111827; font-size: 16px; margin-top: 4px;">${birthday.association || birthday.company}</div>
              </div>` : ''}
              <div${meetDateFormatted ? ' style="margin-bottom: 12px;"' : ''}>
                <span style="color: #6b7280; font-size: 14px;">Date:</span>
                <div style="color: #111827; font-size: 16px; margin-top: 4px;">${formattedDate}</div>
              </div>
              ${meetDateFormatted ? `
              <div>
                <span style="color: #6b7280; font-size: 14px;">You first met:</span>
                <div style="color: #111827; font-size: 16px; margin-top: 4px;">${meetDateFormatted}</div>
              </div>` : ''}
              ${birthday.timezone ? `
              <div style="margin-top: 12px;">
                <span style="color: #6b7280; font-size: 14px;">Timezone:</span>
                <div style="color: #111827; font-size: 16px; margin-top: 4px;">${birthday.timezone}</div>
              </div>` : ''}
            </div>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
              Don't forget to reach out and make the day special! 🎉
            </p>
          </div>
          <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0; text-align: center;">
              Sent by <a href="${PORTAL_URL}" style="color: #667eea; text-decoration: none; font-weight: 500;">Event Reminder</a> &bull; <a href="${PORTAL_URL}" style="color: #667eea; text-decoration: none;">er.siv19.dev</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  await resend.emails.send({
    from: process.env.FROM_EMAIL || "onboarding@resend.dev",
    to: email,
    subject: `🎉 ${eventName} Reminder: ${birthday.name}${ageDuration ? ` — ${ageDuration}` : ''}`,
    html,
  })
}

export async function sendTelegramNotification(
  chatId: string,
  birthday: Birthday,
) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is missing")
    return
  }

  const eventName = getEventLabel(birthday)
  const ageDuration = computeAgeDuration(birthday)
  const meetDateFormatted = formatMeetDate(birthday)
  const dateFormatted = formatDate(birthday.birthdate, !birthday.unknownYear)

  const lines = [
    `🎉 *${eventName} Reminder*`,
    ``,
    `Today is *${birthday.name}*'s ${eventName.toLowerCase()}!${ageDuration ? ` ${ageDuration}` : ''}`,
  ]

  if (birthday.association || birthday.company) {
    lines.push(`🏢 Association: ${birthday.association || birthday.company}`)
  }
  lines.push(`📅 Date: ${dateFormatted}`)
  if (meetDateFormatted) {
    lines.push(`🤝 First met: ${meetDateFormatted}`)
  }
  if (birthday.timezone) {
    lines.push(`🌍 Timezone: ${birthday.timezone}`)
  }
  lines.push(``, `🔗 [Open Dashboard](${PORTAL_URL})`)

  const message = lines.join('\n')

  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error("Error sending Telegram notification:", errorData)
  }
}

export async function sendDiscordNotification(
  webhookUrl: string,
  birthday: Birthday,
) {
  const eventName = getEventLabel(birthday)
  const ageDuration = computeAgeDuration(birthday)
  const meetDateFormatted = formatMeetDate(birthday)
  const dateFormatted = formatDate(birthday.birthdate, !birthday.unknownYear)

  const fields = []

  if (birthday.association || birthday.company) {
    fields.push({ name: "Association", value: String(birthday.association || birthday.company), inline: true })
  }
  fields.push({ name: "Date", value: dateFormatted, inline: true })
  if (ageDuration) {
    fields.push({ name: "Milestone", value: ageDuration, inline: true })
  }
  if (meetDateFormatted) {
    fields.push({ name: "First Met", value: meetDateFormatted, inline: true })
  }
  if (birthday.timezone) {
    fields.push({ name: "Timezone", value: birthday.timezone, inline: true })
  }

  const message = {
    content: `🎉 **${eventName} Reminder**`,
    embeds: [
      {
        title: `Today is ${birthday.name}'s ${eventName.toLowerCase()}!${ageDuration ? ` ${ageDuration}` : ''} 🎉`,
        url: PORTAL_URL,
        fields,
        color: 0x667eea,
        footer: { text: "Event Reminder • er.siv19.dev" },
      },
    ],
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    console.error("Error sending Discord notification:", response.statusText)
  }
}

export async function triggerNotifications(
  userProfile: UserProfile,
  birthday: Birthday,
) {
  const { notifications } = userProfile
  if (!notifications) return

  const promises: Promise<any>[] = []

  if (notifications.email.enabled && notifications.email.address) {
    promises.push(sendEmailNotification(notifications.email.address, birthday))
  }

  if (notifications.telegram.enabled && notifications.telegram.chatId) {
    promises.push(sendTelegramNotification(notifications.telegram.chatId, birthday))
  }

  if (notifications.discord.enabled && notifications.discord.webhookUrl) {
    promises.push(sendDiscordNotification(notifications.discord.webhookUrl, birthday))
  }

  await Promise.allSettled(promises)
}

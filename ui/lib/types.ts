export interface Birthday {
  id: string
  name: string
  company?: string // Keeping for backward compatibility temporarily, but we use association
  association?: string
  type?: string
  unknownYear?: boolean
  birthdate: string // Format: YYYY-MM-DD
  meetDate?: string // Format: YYYY-MM-DD
  timezone?: string
  userId: string
  createdAt: number
}

export const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (UTC+5:30)", offset: "+5:30" },
  { value: "America/New_York", label: "America/New_York (UTC-5:00)", offset: "-5:00" },
  { value: "America/Chicago", label: "America/Chicago (UTC-6:00)", offset: "-6:00" },
  { value: "America/Denver", label: "America/Denver (UTC-7:00)", offset: "-7:00" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (UTC-8:00)", offset: "-8:00" },
  { value: "America/Anchorage", label: "America/Anchorage (UTC-9:00)", offset: "-9:00" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (UTC-10:00)", offset: "-10:00" },
  { value: "Europe/London", label: "Europe/London (UTC+0:00)", offset: "+0:00" },
  { value: "Europe/Paris", label: "Europe/Paris (UTC+1:00)", offset: "+1:00" },
  { value: "Europe/Berlin", label: "Europe/Berlin (UTC+1:00)", offset: "+1:00" },
  { value: "Europe/Madrid", label: "Europe/Madrid (UTC+1:00)", offset: "+1:00" },
  { value: "Europe/Rome", label: "Europe/Rome (UTC+1:00)", offset: "+1:00" },
  { value: "Europe/Athens", label: "Europe/Athens (UTC+2:00)", offset: "+2:00" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UTC+4:00)", offset: "+4:00" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (UTC+7:00)", offset: "+7:00" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+8:00)", offset: "+8:00" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong (UTC+8:00)", offset: "+8:00" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+9:00)", offset: "+9:00" },
  { value: "Asia/Seoul", label: "Asia/Seoul (UTC+9:00)", offset: "+9:00" },
  { value: "Australia/Sydney", label: "Australia/Sydney (UTC+11:00)", offset: "+11:00" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (UTC+11:00)", offset: "+11:00" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (UTC+13:00)", offset: "+13:00" },
]

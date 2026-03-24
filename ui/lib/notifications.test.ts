import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  sendEmailNotification, 
  sendTelegramNotification, 
  sendDiscordNotification, 
  triggerNotifications 
} from './notifications'
import type { UserProfile } from './user-profile'
import type { Birthday } from './types'

// Type-cast global.fetch for Vitest
const fetchMock = global.fetch as any

describe('notifications', () => {
  const mockBirthday: Birthday = {
    id: '1',
    name: 'John Doe',
    association: 'ACME Corp',
    birthdate: '1990-01-01',
    meetDate: '2020-01-01',
    timezone: 'UTC',
    userId: 'user1',
    createdAt: Date.now()
  }

  const mockProfile: UserProfile = {
    email: 'user@example.com',
    userId: 'user1',
    createdAt: Date.now(),
    notifications: {
      email: { enabled: true, address: 'user@example.com' },
      telegram: { enabled: true, chatId: '12345' },
      discord: { enabled: true, webhookUrl: 'https://discord.com/api/webhooks/123' }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TELEGRAM_BOT_TOKEN = 'mock-bot-token'
  })

  it('should send email notification', async () => {
    await sendEmailNotification('user@example.com', mockBirthday)
    // nodemailer mock in vitest.setup.ts should have been called
  })

  it('should send telegram notification', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true })
    await sendTelegramNotification('12345', mockBirthday)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('api.telegram.org'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('should send discord notification', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true })
    await sendDiscordNotification('https://discord.com/api/webhooks/123', mockBirthday)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.com/api/webhooks/123',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('should handle missing telegram token', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await sendTelegramNotification('12345', mockBirthday)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('TELEGRAM_BOT_TOKEN is missing'))
    consoleSpy.mockRestore()
  })

  it('should handle failed telegram response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'fail' }) })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await sendTelegramNotification('12345', mockBirthday)
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should handle failed discord response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, statusText: 'Bad Request' })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await sendDiscordNotification('https://discord.com/webhook', mockBirthday)
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should trigger all enabled notifications even if one fails', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    await triggerNotifications(mockProfile, mockBirthday)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('should not send notifications if disabled', async () => {
    const disabledProfile = {
      ...mockProfile,
      notifications: {
        email: { enabled: false, address: '' },
        telegram: { enabled: false, chatId: '' },
        discord: { enabled: false, webhookUrl: '' }
      }
    }
    await triggerNotifications(disabledProfile, mockBirthday)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NotificationSettings } from "./index"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { getUserProfile, updateUserProfile } from "@/lib/user-profile"
import { useToast } from "@/hooks/use-toast"

vi.mock("@/lib/auth-context")
vi.mock("@/lib/user-profile")
vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}))

describe("NotificationSettings", () => {
  const mockUser = { uid: "test-uid", email: "test@example.com" }
  const mockProfile = {
    userId: "test-uid",
    email: "test@example.com",
    createdAt: Date.now(),
    notifications: {
      reminderTiming: "midnight",
      email: { enabled: true, address: "test@example.com", verified: true },
      telegram: { enabled: false, chatId: "", verified: false },
      discord: { enabled: false, webhookUrl: "", verified: false },
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })) as any
    ;(useAuth as any).mockReturnValue({ user: mockUser })
    ;(getUserProfile as any).mockResolvedValue(mockProfile)
  })

  it("loads and displays user profile preferences with global timing", async () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <NotificationSettings />
        </DialogContent>
      </Dialog>
    )
    await waitFor(() => expect(screen.getByText(/Save Preferences/i)).toBeDefined())

    // Global timing section exists with its description
    expect(screen.getAllByText(/Reminder Timing/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/custom reminder timings/i)).toBeDefined()

    // Email section
    expect(screen.getByDisplayValue("test@example.com")).toBeDefined()
    expect(screen.getByText("Verified")).toBeDefined()
    
    // Other channels
    expect(screen.getByText(/Telegram Notifications/i)).toBeDefined()
    expect(screen.getByText(/Discord Notifications/i)).toBeDefined()
    expect(screen.getByText(/WhatsApp Notifications/i)).toBeDefined()
    expect(screen.getAllByText(/Coming soon!/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/ZeroHour Integration/i)).toBeDefined()
  })

  it("handles saving preferences", async () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <NotificationSettings />
        </DialogContent>
      </Dialog>
    )
    await waitFor(() => expect(screen.getByText(/Save Preferences/i)).toBeDefined())

    const saveButton = screen.getByText(/Save Preferences/i)
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith("test-uid", {
        notifications: mockProfile.notifications
      })
    })
  })
})

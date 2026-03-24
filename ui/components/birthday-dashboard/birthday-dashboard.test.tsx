import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { BirthdayDashboard } from "./index"
import { useAuth } from "@/lib/auth-context"
import { getBirthdays, addBirthday } from "@/lib/birthdays"

// Mock dependencies
vi.mock("@/lib/auth-context")
vi.mock("@/lib/birthdays")
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() })
}))

// Mock components that might be problematic in unit tests
vi.mock("@/components/birthday-form", () => ({
  BirthdayForm: ({ onSubmit }: any) => (
    <button onClick={() => onSubmit({ name: "New Person", birthdate: "1990-01-01", association: "Test", timezone: "UTC", meetDate: "2020-01-01" })}>
      Submit Form
    </button>
  )
}))

describe("BirthdayDashboard", () => {
  const mockUser = { uid: "user123", email: "test@example.com" }
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({ user: mockUser, logout: mockLogout, loading: false })
  })

  it("renders empty state when no birthdays exist", async () => {
    ;(getBirthdays as any).mockResolvedValue([])
    
    render(<BirthdayDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/No events yet/i)).toBeDefined()
    })
  })

  it("renders list of birthdays after loading", async () => {
    const mockBirthdays = [
      { id: "1", name: "Alice", birthdate: "1990-01-01", userId: "user123", association: "A", timezone: "UTC", meetDate: "2020-01-01" }
    ]
    ;(getBirthdays as any).mockResolvedValue(mockBirthdays)
    
    render(<BirthdayDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeDefined()
    })
  })

  it("updates list after adding a new birthday", async () => {
    ;(getBirthdays as any).mockResolvedValueOnce([]) // Initial empty load
    ;(addBirthday as any).mockResolvedValue("new-id")
    
    render(<BirthdayDashboard />)

    // Wait for initial load
    await waitFor(() => expect(screen.queryByText(/Loading/i)).toBeNull())

    // Click "Add Your First Event" to open dialog (which we mocked to just show a submit button)
    const addButton = screen.getAllByRole("button").find(b => b.textContent?.includes("Add Your First Event"))
    if (addButton) fireEvent.click(addButton)

    // Mock the second load to include the new birthday
    ;(getBirthdays as any).mockResolvedValueOnce([
      { id: "new-id", name: "New Person", birthdate: "1990-01-01", userId: "user123", association: "Test", timezone: "UTC", meetDate: "2020-01-01" }
    ])

    // Click the mocked submit button inside BirthdayForm
    const submitButton = screen.getByText("Submit Form")
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(addBirthday).toHaveBeenCalled()
      expect(screen.getByText("New Person")).toBeDefined()
    })
  })

  it("filters events correctly", async () => {
    const mockBirthdays = [
      { id: "1", name: "Alice", birthdate: "1990-01-01", userId: "u1", association: "BigTech", timezone: "UTC", meetDate: "2020-05-01" },
      { id: "2", name: "Zack", birthdate: "1985-12-15", userId: "u1", association: "StartupInc", timezone: "EST", meetDate: "2022-08-01" },
      { id: "3", name: "Bob", birthdate: "1995-01-20", userId: "u1", association: "BigTech", timezone: "UTC", meetDate: "2020-05-01" }
    ]
    ;(getBirthdays as any).mockResolvedValue(mockBirthdays)
    
    render(<BirthdayDashboard />)

    await waitFor(() => expect(screen.queryByText(/Loading/i)).toBeNull())

    // Open filters
    const filterBtn = screen.getByText(/Filters & Sort/i)
    fireEvent.click(filterBtn)

    // Test Association Filter
    const assocInput = screen.getByPlaceholderText(/Search events.../i)
    fireEvent.change(assocInput, { target: { value: "BigTech" } })
    
    expect(screen.getByText("Alice")).toBeDefined()
    expect(screen.getByText("Bob")).toBeDefined()
    expect(screen.queryByText("Zack")).toBeNull()

    // Reset filters
    const resetBtn = screen.getByText(/Reset Filters/i)
    fireEvent.click(resetBtn)

    expect(screen.getByText("Zack")).toBeDefined()
  })
})

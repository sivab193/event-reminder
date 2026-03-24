import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { BirthdayCard } from "./index"
import { axe, toHaveNoViolations } from "jest-axe"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

expect.extend(toHaveNoViolations)

// Mock hooks
vi.mock("@/lib/auth-context")
vi.mock("@/hooks/use-toast")

// Mock fetch
global.fetch = vi.fn()

describe("BirthdayCard", () => {
  const mockBirthday = {
    id: "1",
    name: "John Doe",
    association: "Acme Corp",
    birthdate: "1990-05-15",
    meetDate: "2010-01-01",
    timezone: "UTC",
    userId: "user123",
    createdAt: new Date().toISOString()
  }

  const mockOnUpdate = vi.fn()
  const mockOnDelete = vi.fn()
  const mockToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({ user: { uid: "user123" } })
    ;(useToast as any).mockReturnValue({ toast: mockToast })
  })

  it("renders birthday information correctly", () => {
    render(<BirthdayCard birthday={mockBirthday} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />)

    expect(screen.getByText("John Doe")).toBeDefined()
    expect(screen.getByText("Acme Corp")).toBeDefined()
    expect(screen.getByText("May 15 1990")).toBeDefined()
    expect(screen.getByText("January 2010")).toBeDefined()
    expect(screen.getByText("UTC")).toBeDefined()
  })

  it("should have no accessibility violations", async () => {
    const { container } = render(<BirthdayCard birthday={mockBirthday} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it("calls onDelete when delete button is clicked", async () => {
    render(<BirthdayCard birthday={mockBirthday} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />)
    
    // The trash icon button
    const deleteButton = screen.getAllByRole("button")[1] 
    fireEvent.click(deleteButton)

    expect(mockOnDelete).toHaveBeenCalledWith("1")
  })

  it("opens edit dialog when edit button is clicked", () => {
    render(<BirthdayCard birthday={mockBirthday} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />)
    
    const editButton = screen.getAllByRole("button")[0]
    fireEvent.click(editButton)

    expect(screen.getByText("Edit Birthday")).toBeDefined()
  })


})

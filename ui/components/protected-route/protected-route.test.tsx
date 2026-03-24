import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ProtectedRoute } from "./index"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

// Mock the hooks
vi.mock("@/lib/auth-context")
vi.mock("next/navigation")

describe("ProtectedRoute", () => {
  const mockPush = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({ push: mockPush })
  })

  it("shows loading state when auth is loading", () => {
    ;(useAuth as any).mockReturnValue({ user: null, loading: true })
    
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText(/loading/i)).toBeDefined()
    expect(screen.queryByText("Protected Content")).toBeNull()
  })

  it("redirects to login when user is not authenticated", () => {
    ;(useAuth as any).mockReturnValue({ user: null, loading: false })
    
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(mockPush).toHaveBeenCalledWith("/")
    expect(screen.queryByText("Protected Content")).toBeNull()
  })

  it("renders children when user is authenticated", () => {
    ;(useAuth as any).mockReturnValue({ user: { uid: "123", emailVerified: true }, loading: false })
    
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText("Protected Content")).toBeDefined()
    expect(mockPush).not.toHaveBeenCalled()
  })
})

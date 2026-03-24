"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { sendEmailVerification } from "firebase/auth"
import { Button } from "@/components/ui/button"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!user.emailVerified) {
    const handleResend = async () => {
      setResending(true)
      try {
        await sendEmailVerification(user)
        setMessage("Verification email sent! Please check your inbox.")
      } catch (error: any) {
        setMessage(error.message || "Failed to resend.")
      } finally {
        setResending(false)
      }
    }

    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-card p-8 rounded-xl border">
          <h2 className="text-2xl font-bold">Verify your email</h2>
          <p className="text-muted-foreground">
            We sent a verification link to <strong>{user.email}</strong>. Please check your inbox (and spam folder) and click the link to activate your account.
          </p>
          {message && <p className="text-sm font-medium text-primary">{message}</p>}
          <div className="flex flex-col gap-3">
            <Button onClick={handleResend} disabled={resending}>
              {resending ? "Sending..." : "Resend Verification Email"}
            </Button>
            <Button variant="ghost" onClick={logout}>Sign Out</Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

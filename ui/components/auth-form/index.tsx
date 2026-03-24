"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

export function AuthForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [isLogin, setIsLogin] = useState(true)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setLoading(true)

    try {
      if (isForgotPassword) {
        await resetPassword(email)
        setSuccessMessage("Password reset email sent! Check your inbox.")
        setEmail("")
      } else if (isLogin) {
        await signIn(email, password)
        onSuccess?.()
      } else {
        await signUp(email, password)
        onSuccess?.()
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    // Temporarily disabled
  }

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword)
    setError("")
    setSuccessMessage("")
    setPassword("")
  }

  return (
    <Card className="w-full max-w-md border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl">
          {isForgotPassword ? "Reset Password" : isLogin ? "Sign In" : "Sign Up"}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {isForgotPassword
            ? "Enter your email to receive a password reset link"
            : isLogin
              ? "Welcome back to Event Reminder"
              : "Create your Event Reminder account"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background"
            />
          </div>
          {!isForgotPassword && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-background"
              />
            </div>
          )}
          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/50">
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-500">{successMessage}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isForgotPassword ? "Send Reset Link" : isLogin ? "Sign In" : "Sign Up"}
          </Button>

          {/* Google Sign-in Temporarily Disabled */}
          {/* {!isForgotPassword && ( ... )} */}

          {isLogin && !isForgotPassword && (
            <Button type="button" variant="link" className="w-full text-sm" onClick={toggleForgotPassword}>
              Forgot Password?
            </Button>
          )}

          {!isForgotPassword && (
            <Button type="button" variant="ghost" className="w-full" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </Button>
          )}

          {isForgotPassword && (
            <Button type="button" variant="ghost" className="w-full" onClick={toggleForgotPassword}>
              Back to Sign In
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

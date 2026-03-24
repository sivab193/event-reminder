"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth"
import { auth } from "./firebase"
import { createUserProfile, getUserProfile } from "./user-profile"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function useAuth() {
  return useContext(AuthContext)
}

function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "auth/user-not-found":
      return "No account exists with this email address. Please sign up to create a new account."
    case "auth/wrong-password":
      return "Incorrect password. Please try again or click 'Forgot Password' to reset it."
    case "auth/invalid-email":
      return "Please enter a valid email address."
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support."
    case "auth/too-many-requests":
      return "Too many failed login attempts. Please try again in a few minutes or reset your password."
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please sign in instead."
    case "auth/weak-password":
      return "Password must be at least 6 characters long."
    case "auth/invalid-credential":
      return "Invalid email or password. Please check your credentials and try again."
    case "auth/popup-closed-by-user":
      return "Sign in popup was closed before completion."
    default:
      return "An error occurred. Please try again."
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code))
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await createUserProfile(result.user.uid, email)
      await sendEmailVerification(result.user)
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code))
    }
  }

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      // Check if user profile exists, if not create it
      const profile = await getUserProfile(result.user.uid)
      if (!profile) {
        await createUserProfile(result.user.uid, result.user.email || "")
      }
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code))
    }
  }

  const logout = async () => {
    await signOut(auth)
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code))
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

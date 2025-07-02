"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, googleProvider, db } from "@/lib/firebase"

interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string
  phone?: string
  createdAt: any
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let mounted = true

    // Set persistence to local storage so users stay logged in
    const initializeAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence)
        console.log("✅ Auth persistence set to local storage")
      } catch (error) {
        console.error("❌ Error setting auth persistence:", error)
      }
    }

    initializeAuth()

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔄 Auth state changed:", user ? `User: ${user.email}` : "No user")

      if (!mounted) return

      try {
        setUser(user)

        if (user) {
          console.log("👤 User authenticated, loading profile...")
          await loadUserProfile(user)
        } else {
          console.log("👤 No user, clearing profile")
          setUserProfile(null)
        }
      } catch (error) {
        console.error("❌ Error in auth state change:", error)
      } finally {
        if (mounted) {
          setLoading(false)
          setInitializing(false)
        }
      }
    })

    // Set a timeout to ensure we don't stay in loading state forever
    const timeout = setTimeout(() => {
      if (mounted) {
        console.log("⏰ Auth initialization timeout")
        setLoading(false)
        setInitializing(false)
      }
    }, 5000)

    return () => {
      mounted = false
      unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const loadUserProfile = async (user: User) => {
    try {
      console.log("📄 Loading user profile for:", user.uid)
      const userDoc = await getDoc(doc(db, "users", user.uid))

      if (userDoc.exists()) {
        const profileData = userDoc.data() as UserProfile
        console.log("✅ User profile loaded:", profileData.displayName)
        setUserProfile(profileData)
      } else {
        // Create new user profile
        console.log("🆕 Creating new user profile")
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          createdAt: serverTimestamp(),
        }
        await setDoc(doc(db, "users", user.uid), newProfile)
        setUserProfile(newProfile)
        console.log("✅ New user profile created")
      }
    } catch (error) {
      console.error("❌ Error loading user profile:", error)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      console.log("🔐 Starting Google sign in...")

      const result = await signInWithPopup(auth, googleProvider)
      console.log("✅ Google sign in successful:", result.user.email)

      // The onAuthStateChanged will handle loading the profile
    } catch (error) {
      console.error("❌ Error signing in with Google:", error)
      setLoading(false)
      throw error
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      console.log("🚪 Signing out...")

      await signOut(auth)

      // Clear state immediately
      setUser(null)
      setUserProfile(null)

      console.log("✅ Sign out successful")
    } catch (error) {
      console.error("❌ Error signing out:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return

    try {
      console.log("📝 Updating user profile:", data)
      const updatedProfile = { ...userProfile, ...data }
      await setDoc(doc(db, "users", user.uid), updatedProfile, { merge: true })
      setUserProfile(updatedProfile as UserProfile)
      console.log("✅ User profile updated")
    } catch (error) {
      console.error("❌ Error updating user profile:", error)
      throw error
    }
  }

  // Don't render children until we've checked authentication state
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signInWithGoogle,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

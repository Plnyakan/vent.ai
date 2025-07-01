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

  useEffect(() => {
    // Set persistence to local storage so users stay logged in
    const initializeAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence)
      } catch (error) {
        console.error("Error setting auth persistence:", error)
      }
    }

    initializeAuth()

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        await loadUserProfile(user)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const loadUserProfile = async (user: User) => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile)
      } else {
        // Create new user profile
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          createdAt: serverTimestamp(),
        }
        await setDoc(doc(db, "users", user.uid), newProfile)
        setUserProfile(newProfile)
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error("Error signing in with Google:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      await signOut(auth)
      // Clear any cached data
      setUser(null)
      setUserProfile(null)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return

    try {
      const updatedProfile = { ...userProfile, ...data }
      await setDoc(doc(db, "users", user.uid), updatedProfile, { merge: true })
      setUserProfile(updatedProfile as UserProfile)
    } catch (error) {
      console.error("Error updating user profile:", error)
      throw error
    }
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

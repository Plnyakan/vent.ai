"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "./auth-context"

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: string
  features: string[]
}

interface UserSubscription {
  planId: string
  status: "active" | "inactive" | "cancelled" | "expired"
  startDate: any
  endDate: any
  paystackCustomerCode?: string
  paystackSubscriptionCode?: string
  lastPaymentDate?: any
  nextPaymentDate?: any
}

interface SubscriptionContextType {
  subscription: UserSubscription | null
  plans: SubscriptionPlan[]
  isSubscribed: boolean
  loading: boolean
  updateSubscription: (subscription: UserSubscription) => Promise<void>
  cancelSubscription: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "vent-ai-monthly",
    name: "Vent-AI Monthly",
    price: 79,
    currency: "ZAR",
    interval: "monthly",
    features: [
      "Unlimited AI conversations",
      "Voice message support",
      "24/7 emotional support",
      "Private & secure chats",
      "Chat history backup",
      "Priority support",
    ],
  },
]

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadUserSubscription()
    } else {
      setSubscription(null)
      setLoading(false)
    }
  }, [user])

  const loadUserSubscription = async () => {
    if (!user) return

    try {
      const subDoc = await getDoc(doc(db, "subscriptions", user.uid))
      if (subDoc.exists()) {
        const subData = subDoc.data() as UserSubscription

        // Check if subscription is still valid
        const now = new Date()
        const endDate = subData.endDate?.toDate()

        if (endDate && endDate < now && subData.status === "active") {
          // Subscription expired
          const expiredSub = { ...subData, status: "expired" as const }
          await setDoc(doc(db, "subscriptions", user.uid), expiredSub, { merge: true })
          setSubscription(expiredSub)
        } else {
          setSubscription(subData)
        }
      } else {
        setSubscription(null)
      }
    } catch (error) {
      console.error("Error loading subscription:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateSubscription = async (newSubscription: UserSubscription) => {
    if (!user) return

    try {
      await setDoc(
        doc(db, "subscriptions", user.uid),
        {
          ...newSubscription,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      setSubscription(newSubscription)
    } catch (error) {
      console.error("Error updating subscription:", error)
      throw error
    }
  }

  const cancelSubscription = async () => {
    if (!user || !subscription) return

    try {
      const cancelledSub = {
        ...subscription,
        status: "cancelled" as const,
        cancelledAt: serverTimestamp(),
      }
      await updateSubscription(cancelledSub)
    } catch (error) {
      console.error("Error cancelling subscription:", error)
      throw error
    }
  }

  const isSubscribed = subscription?.status === "active"

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plans: SUBSCRIPTION_PLANS,
        isSubscribed,
        loading,
        updateSubscription,
        cancelSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider")
  }
  return context
}

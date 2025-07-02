"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useSubscription } from "@/contexts/subscription-context"

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const { isSubscribed, loading: subLoading } = useSubscription()
  const [redirecting, setRedirecting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Don't redirect while still loading
    if (authLoading || subLoading || redirecting) {
      return
    }

    console.log("🏠 Home page routing logic:", {
      user: user?.email || "none",
      isSubscribed,
      authLoading,
      subLoading,
    })

    setRedirecting(true)

    if (!user) {
      console.log("➡️ No user, redirecting to auth")
      router.replace("/auth")
    } else if (!isSubscribed) {
      console.log("➡️ User not subscribed, redirecting to subscription")
      router.replace("/subscription")
    } else {
      console.log("➡️ User subscribed, redirecting to chat")
      router.replace("/chat")
    }
  }, [user, isSubscribed, authLoading, subLoading, redirecting, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{authLoading || subLoading ? "Loading..." : "Redirecting..."}</p>
      </div>
    </div>
  )
}

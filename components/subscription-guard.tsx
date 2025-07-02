"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useSubscription } from "@/contexts/subscription-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, Lock } from "lucide-react"

interface SubscriptionGuardProps {
  children: React.ReactNode
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { isSubscribed, loading } = useSubscription()
  const router = useRouter()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking subscription...</p>
        </div>
      </div>
    )
  }

  if (!isSubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="w-full max-w-md border-purple-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-purple-600" />
            </div>
            <CardTitle className="text-2xl text-purple-800">Subscription Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              To access Vent-AI and get unlimited emotional support, you need an active subscription.
            </p>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-purple-800">Premium Features</span>
              </div>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Unlimited AI conversations</li>
                <li>• Voice message support</li>
                <li>• 24/7 emotional support</li>
                <li>• Private & secure chats</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => router.push("/subscription")}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                Subscribe Now - R79/month
              </Button>
              <Button onClick={() => router.push("/auth")} variant="outline" className="w-full">
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

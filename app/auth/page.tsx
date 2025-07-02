"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { useSubscription } from "@/contexts/subscription-context"
import { Bot, Phone, Heart, Shield, MessageCircle } from "lucide-react"

export default function AuthPage() {
  const [phone, setPhone] = useState("")
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user, signInWithGoogle, updateUserProfile, userProfile } = useAuth()
  const { isSubscribed } = useSubscription()
  const router = useRouter()

  // Redirect if already authenticated
  useEffect(() => {
    if (user && userProfile) {
      console.log("🔄 User already authenticated, checking subscription...")
      if (isSubscribed) {
        console.log("➡️ User subscribed, redirecting to chat")
        router.replace("/chat")
      } else {
        console.log("➡️ User not subscribed, redirecting to subscription")
        router.replace("/subscription")
      }
    }
  }, [user, userProfile, isSubscribed, router])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      console.log("🔐 Starting Google sign in...")
      await signInWithGoogle()
      setShowPhoneInput(true)
    } catch (error) {
      console.error("❌ Sign in failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return

    try {
      setLoading(true)
      await updateUserProfile({ phone })

      // Check subscription status and redirect accordingly
      if (isSubscribed) {
        router.replace("/chat")
      } else {
        router.replace("/subscription")
      }
    } catch (error) {
      console.error("❌ Failed to update profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const skipPhoneNumber = () => {
    if (isSubscribed) {
      router.replace("/chat")
    } else {
      router.replace("/subscription")
    }
  }

  // Don't show anything while checking authentication
  if (user && userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  if (showPhoneInput && userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="w-full max-w-md border-purple-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Phone className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-purple-800">Complete Your Profile</CardTitle>
            <CardDescription>Add your phone number for account security (optional)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+27 (123) 456-7890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border-purple-200 focus:border-purple-400"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700">
                  {loading ? "Saving..." : "Continue"}
                </Button>
                <Button type="button" variant="outline" onClick={skipPhoneNumber}>
                  Skip
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md border-purple-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
            <Bot className="w-10 h-10 text-purple-600" />
          </div>
          <CardTitle className="text-3xl text-purple-800 mb-2">Vent-AI</CardTitle>
          <CardDescription className="text-base">
            Your empathetic AI companion for emotional support and venting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Heart className="w-4 h-4 text-red-400" />
              <span>Judgment-free emotional support</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Shield className="w-4 h-4 text-green-400" />
              <span>Private and secure conversations</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <MessageCircle className="w-4 h-4 text-blue-400" />
              <span>24/7 availability for when you need to talk</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            {loading ? "Signing in..." : "Start Venting with Google"}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy. Your conversations are confidential and
            secure.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

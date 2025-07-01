"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { ArrowLeft, User, Save } from "lucide-react"

export default function ProfilePage() {
  const { userProfile, updateUserProfile, logout } = useAuth()
  const [phone, setPhone] = useState(userProfile?.phone || "")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return

    try {
      setLoading(true)
      await updateUserProfile({ phone })
      router.push("/chat")
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/auth")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  if (!userProfile) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/chat")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-semibold">Profile</h1>
        </div>

        <Card>
          <CardHeader className="text-center">
            <Avatar className="w-20 h-20 mx-auto mb-4">
              <AvatarImage src={userProfile.photoURL || "/placeholder.svg"} />
              <AvatarFallback>
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <CardTitle>{userProfile.displayName}</CardTitle>
            <p className="text-sm text-gray-500">{userProfile.email}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <Button variant="destructive" onClick={handleLogout} className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

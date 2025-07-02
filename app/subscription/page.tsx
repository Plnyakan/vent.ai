"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePaystackPayment } from "react-paystack"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { useSubscription } from "@/contexts/subscription-context"
import { Check, Crown, ArrowLeft, Loader2 } from "lucide-react"

type PaystackMetadata = {
  custom_fields: Array<{ display_name: string; variable_name: string; value: string }>;
  [key: string]: any;
};

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false)
  const { user, userProfile } = useAuth()
  const { plans, subscription, updateSubscription } = useSubscription()
  const router = useRouter()

  const plan = plans[0] // Monthly plan

  const config = {
    reference: `vent-ai-${user?.uid}-${Date.now()}`,
    email: user?.email || "",
    amount: plan.price * 100, // Paystack expects amount in kobo (cents)
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    currency: "ZAR",
    channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
    metadata: {
      userId: user?.uid,
      planId: plan.id,
      userEmail: user?.email,
      userName: userProfile?.displayName,
      custom_fields: [
        {
          display_name: "User ID",
          variable_name: "user_id",
          value: user?.uid || "",
        },
        {
          display_name: "Plan ID",
          variable_name: "plan_id",
          value: plan.id,
        },
        {
          display_name: "User Email",
          variable_name: "user_email",
          value: user?.email || "",
        },
        {
          display_name: "User Name",
          variable_name: "user_name",
          value: userProfile?.displayName || "",
        },
      ],
    },
  }

  const initializePayment = usePaystackPayment(config)

  const handlePayment = () => {
    if (!user) {
      router.push("/auth")
      return
    }

    setLoading(true)

    initializePayment({
      onSuccess: async (reference) => {
        console.log("Payment successful:", reference)

        try {
          // Calculate subscription dates
          const startDate = new Date()
          const endDate = new Date()
          endDate.setMonth(endDate.getMonth() + 1)

          // Update subscription in Firebase
          await updateSubscription({
            planId: plan.id,
            status: "active",
            startDate: startDate,
            endDate: endDate,
            lastPaymentDate: startDate,
            nextPaymentDate: endDate,
            paystackCustomerCode: reference.customer ?? null,
            paystackSubscriptionCode: reference.reference?? null,
          })

          // Redirect to chat
          router.push("/chat")
        } catch (error) {
          console.error("Error updating subscription:", error)
          alert("Payment successful but there was an error activating your subscription. Please contact support.")
        } finally {
          setLoading(false)
        }
      },
      onClose: () => {
        console.log("Payment closed")
        setLoading(false)
      },
    })
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/chat")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">Choose Your Plan</h1>
        </div>

        {/* Current Subscription Status */}
        {subscription && (
          <Card className="mb-6 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Current Subscription</p>
                  <p className="text-sm text-gray-600">
                    Status:{" "}
                    <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                      {subscription.status}
                    </Badge>
                  </p>
                  {subscription.endDate && (
                    <p className="text-sm text-gray-600">
                      {subscription.status === "active" ? "Renews" : "Expires"} on:{" "}
                      {(subscription.endDate.toDate ? subscription.endDate.toDate() : subscription.endDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {subscription.status === "active" && <Crown className="w-8 h-8 text-yellow-500" />}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Plan */}
        <Card className="border-purple-200 shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-t-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="w-6 h-6" />
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
            </div>
            <div className="text-4xl font-bold">
              R{plan.price}
              <span className="text-lg font-normal opacity-90">/month</span>
            </div>
            <p className="opacity-90">Unlimited access to your AI companion</p>
          </CardHeader>

          <CardContent className="p-6">
            <div className="space-y-4 mb-6">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {subscription?.status === "active" ? (
                <div className="text-center">
                  <Badge className="bg-green-100 text-green-800 px-4 py-2">✅ You're subscribed!</Badge>
                  <p className="text-sm text-gray-600 mt-2">Enjoy unlimited access to Vent-AI</p>
                </div>
              ) : (
                <Button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-6"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Subscribe Now - R{plan.price}/month</>
                  )}
                </Button>
              )}

              <div className="text-center">
                <p className="text-xs text-gray-500">Secure payment powered by Paystack</p>
                <p className="text-xs text-gray-500 mt-1">
                  Cancel anytime • No hidden fees • 30-day money-back guarantee
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Why Subscribe */}
        <Card className="mt-6 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-800">Why Subscribe to Vent-AI?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">🧠 Advanced AI Therapy</h4>
                <p>Get personalized emotional support from our advanced AI trained in therapeutic techniques.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">🔒 Complete Privacy</h4>
                <p>Your conversations are encrypted and never shared. Vent freely in a safe space.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">⚡ Instant Support</h4>
                <p>Available 24/7 whenever you need someone to listen. No appointments needed.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">💝 Affordable Care</h4>
                <p>Professional therapy costs R800+ per session. Get unlimited support for just R79/month.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

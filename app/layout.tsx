import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { SubscriptionProvider } from "@/contexts/subscription-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Vent-AI - Your AI Therapy Companion",
  description: "Professional AI therapy and emotional support. Available 24/7 for just R79/month.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SubscriptionProvider>{children}</SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

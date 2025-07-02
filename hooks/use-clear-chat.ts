"use client"

import { useState } from "react"
import { collection, query, where, getDocs, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"

export function useClearChat() {
  const [isClearing, setIsClearing] = useState(false)

  const clearUserMessages = async (userId: string): Promise<boolean> => {
    try {
      setIsClearing(true)

      console.log("🗑️ Clearing messages for user conversation:", userId)

      // 🔧 SIMPLIFIED: Get all messages in this user's conversation
      const conversationQuery = query(collection(db, "messages"), where("conversationId", "==", userId))

      const conversationSnapshot = await getDocs(conversationQuery)

      console.log("📊 Found messages to delete:", conversationSnapshot.docs.length)

      // Use batch to delete all messages efficiently
      const batch = writeBatch(db)

      conversationSnapshot.docs.forEach((doc) => {
        console.log("🗑️ Deleting message:", doc.id)
        batch.delete(doc.ref)
      })

      await batch.commit()

      console.log("✅ Successfully cleared conversation for user:", userId)
      return true
    } catch (error) {
      console.error("❌ Error clearing chat:", error)
      return false
    } finally {
      setIsClearing(false)
    }
  }

  return {
    clearUserMessages,
    isClearing,
  }
}

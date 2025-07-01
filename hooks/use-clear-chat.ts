"use client"

import { useState } from "react"
import { collection, query, where, getDocs, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"

export function useClearChat() {
  const [isClearing, setIsClearing] = useState(false)

  const clearUserMessages = async (userId: string): Promise<boolean> => {
    try {
      setIsClearing(true)

      // Get all messages from this user
      const messagesQuery = query(collection(db, "messages"), where("senderId", "==", userId))

      const userMessagesSnapshot = await getDocs(messagesQuery)

      // Get all AI responses (we'll clear these too for a fresh start)
      const aiMessagesQuery = query(collection(db, "messages"), where("isAI", "==", true))

      const aiMessagesSnapshot = await getDocs(aiMessagesQuery)

      // Use batch to delete all messages efficiently
      const batch = writeBatch(db)

      userMessagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      aiMessagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      await batch.commit()

      return true
    } catch (error) {
      console.error("Error clearing chat:", error)
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

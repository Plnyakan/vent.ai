"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/contexts/auth-context"
import { useVoiceRecorder } from "@/hooks/use-voice-recorder"
import { useClearChat } from "@/hooks/use-clear-chat"
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  Send,
  Mic,
  MicOff,
  Play,
  Pause,
  User,
  Settings,
  LogOut,
  Bot,
  Heart,
  Trash2,
  MoreVertical,
  AlertCircle,
} from "lucide-react"

interface FirebaseMessage {
  id: string
  senderId: string
  senderName: string
  senderPhoto: string
  text?: string
  audioUrl?: string
  audioDuration?: number
  timestamp: any
  isAI?: boolean
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export default function ChatPage() {
  const [firebaseMessages, setFirebaseMessages] = useState<FirebaseMessage[]>([])
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])

  const { user, userProfile, logout } = useAuth()
  const { clearUserMessages, isClearing } = useClearChat()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const { isRecording, audioUrl, duration, startRecording, stopRecording, uploadAudio, resetRecording } =
    useVoiceRecorder()

  useEffect(() => {
    if (!user) {
      router.push("/auth")
      return
    }

    console.log("👤 Setting up Firebase listener for user:", user.uid)

    // Listen to Firebase messages
    const messagesQuery = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(50))

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        console.log("🔥 Firebase snapshot received, docs count:", snapshot.docs.length)

        const newMessages = snapshot.docs.map((doc) => {
          const data = doc.data()
          console.log("📄 Message data:", { id: doc.id, ...data })
          return {
            id: doc.id,
            ...data,
          }
        }) as FirebaseMessage[]

        const sortedMessages = newMessages.reverse()
        console.log("📋 Final messages array:", sortedMessages)
        setFirebaseMessages(sortedMessages)
        setDebugInfo(`Messages loaded: ${sortedMessages.length}`)
      },
      (error) => {
        console.error("❌ Firebase listener error:", error)
        setError(`Firebase error: ${error.message}`)
        setDebugInfo(`Firebase error: ${error.message}`)
      },
    )

    return unsubscribe
  }, [user, router])

  useEffect(() => {
    scrollToBottom()
  }, [firebaseMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !user || !userProfile || isLoading) return

    const userMessage = input.trim()
    setInput("") // Clear input immediately
    setIsLoading(true)
    setError(null)

    console.log("📤 Sending user message:", userMessage)

    try {
      // Save user message to Firebase
      const userDocRef = await addDoc(collection(db, "messages"), {
        senderId: user.uid,
        senderName: userProfile.displayName,
        senderPhoto: userProfile.photoURL ?? null,
        text: userMessage,
        timestamp: serverTimestamp(),
        isAI: false,
      })
      console.log("✅ User message saved with ID:", userDocRef.id)

      // Update chat history
      const newChatHistory = [...chatHistory, { role: "user" as const, content: userMessage }]
      setChatHistory(newChatHistory)

      // Send to AI API
      console.log("🤖 Sending to AI API...")
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newChatHistory,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      console.log("🤖 AI Response received:", data)

      if (data.message) {
        // Save AI response to Firebase
        const aiDocRef = await addDoc(collection(db, "messages"), {
          senderId: "vent-ai",
          senderName: "Vent-AI",
          senderPhoto: "/ai-avatar.png",
          text: data.message,
          timestamp: serverTimestamp(),
          isAI: true,
        })
        console.log("✅ AI message saved with ID:", aiDocRef.id)

        // Update chat history with AI response
        setChatHistory([...newChatHistory, { role: "assistant", content: data.message }])
        setDebugInfo(`AI response saved: ${aiDocRef.id}`)
      } else {
        throw new Error("No message in AI response")
      }
    } catch (error) {
      console.error("❌ Error sending message:", error)
      setError(`Error sending message: ${error}`)
      setDebugInfo(`Error sending message: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const sendVoiceMessage = async () => {
    if (!user || !userProfile || !audioUrl) return

    try {
      const uploadedUrl = await uploadAudio(user.uid)

      if (uploadedUrl) {
        await addDoc(collection(db, "messages"), {
          senderId: user.uid,
          senderName: userProfile.displayName,
          senderPhoto: userProfile.photoURL ?? null,
          audioUrl: uploadedUrl,
          audioDuration: duration,
          timestamp: serverTimestamp(),
          isAI: false,
        })
        resetRecording()
      }
    } catch (error) {
      console.error("Error sending voice message:", error)
      setError(`Error sending voice message: ${error}`)
    }
  }

  const handleClearChat = async () => {
    if (!user) return

    const success = await clearUserMessages(user.uid)
    if (success) {
      setChatHistory([])
      setShowMenu(false)
      console.log("Chat cleared successfully!")
    } else {
      console.error("Failed to clear chat")
    }
  }

  const playAudio = (audioUrl: string, messageId: string) => {
    if (playingAudio === messageId) {
      audioRef.current?.pause()
      setPlayingAudio(null)
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.play()
        setPlayingAudio(messageId)

        audioRef.current.onended = () => {
          setPlayingAudio(null)
        }
      }
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/auth")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your Vent-AI session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border-b px-4 py-2 text-sm text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            ×
          </button>
        </div>
      )}

      {/* Debug Info */}
      {/* {debugInfo && (
        <div className="bg-yellow-100 border-b px-4 py-2 text-sm">
          <strong>Debug:</strong> {debugInfo} | Messages: {firebaseMessages.length} | AI Loading:{" "}
          {isLoading ? "Yes" : "No"}
        </div>
      )} */}

      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="border-2 border-purple-200">
              <AvatarImage src="/ai-avatar.png" />
              <AvatarFallback className="bg-purple-100">
                <Bot className="w-4 h-4 text-purple-600" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <h1 className="font-semibold text-gray-800">Vent-AI</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-400" />
              Your empathetic AI companion
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setShowMenu(!showMenu)}>
              <MoreVertical className="w-4 h-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                <button
                  onClick={() => router.push("/profile")}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Profile Settings
                </button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600">
                      <Trash2 className="w-4 h-4" />
                      Clear Chat History
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Chat History?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all your messages and conversations with Vent-AI. This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearChat}
                        disabled={isClearing}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isClearing ? "Clearing..." : "Clear Chat"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="border-t my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      {firebaseMessages.length === 0 && (
        <div className="p-6 text-center">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-purple-100">
            <Bot className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome back to Vent-AI</h2>
            <p className="text-gray-600 mb-4">
              I'm here to listen without judgment. Share what's on your mind, your feelings, or anything you need to
              vent about. This is a safe space for you to express yourself.
            </p>
            <p className="text-sm text-purple-600">💜 Your conversations are private and secure</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {firebaseMessages.length > 0 ? (
          firebaseMessages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.senderId === user.uid ? "flex-row-reverse" : "flex-row"}`}
            >
              <Avatar className="w-8 h-8">
                {message.isAI || message.senderId === "vent-ai" ? (
                  <AvatarFallback className="bg-purple-100">
                    <Bot className="w-4 h-4 text-purple-600" />
                  </AvatarFallback>
                ) : (
                  <>
                    <AvatarImage src={message.senderPhoto || "/placeholder.svg"} />
                    <AvatarFallback>
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
              <div
                className={`max-w-xs lg:max-w-md rounded-lg p-3 shadow-sm ${
                  message.senderId === user.uid
                    ? "bg-blue-500 text-white"
                    : message.isAI || message.senderId === "vent-ai"
                      ? "bg-purple-100 text-purple-900 border border-purple-200"
                      : "bg-white border"
                }`}
              >
                {message.senderId !== user.uid && !message.isAI && message.senderId !== "vent-ai" && (
                  <p className="text-xs font-medium mb-1 text-gray-600">{message.senderName}</p>
                )}

                {message.text && <p className="leading-relaxed">{message.text}</p>}

                {message.audioUrl && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={message.senderId === user.uid ? "secondary" : "default"}
                      onClick={() => playAudio(message.audioUrl!, message.id)}
                    >
                      {playingAudio === message.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <span className="text-xs">{formatDuration(message.audioDuration || 0)}</span>
                  </div>
                )}

                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp?.toDate?.()?.toLocaleTimeString() || "Sending..."}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500">
            <p>No messages yet. Start a conversation!</p>
          </div>
        )}

        {/* Show AI typing indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-purple-100">
                <Bot className="w-4 h-4 text-purple-600" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-purple-100 text-purple-900 border border-purple-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <span className="text-sm">Vent-AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recording Preview */}
      {audioUrl && (
        <div className="bg-yellow-50 border-t p-4">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.src = audioUrl
                  audioRef.current.play()
                }
              }}
            >
              <Play className="w-4 h-4" />
            </Button>
            <span className="text-sm">Voice message ({formatDuration(duration)})</span>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" onClick={sendVoiceMessage} disabled={isLoading}>
                Send
              </Button>
              <Button size="sm" variant="outline" onClick={resetRecording}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t p-4 shadow-sm">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share what's on your mind... I'm here to listen 💜"
            disabled={isLoading || isRecording}
            className="flex-1 border-purple-200 focus:border-purple-400"
          />
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button type="submit" disabled={isLoading || !input.trim()} className="bg-purple-600 hover:bg-purple-700">
            <Send className="w-4 h-4" />
          </Button>
        </form>
        {isRecording && (
          <p className="text-sm text-red-600 mt-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            Recording your voice message... {formatDuration(duration)}
          </p>
        )}
      </div>

      <audio ref={audioRef} />
    </div>
  )
}

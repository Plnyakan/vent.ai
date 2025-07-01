"use client"

import { useState, useRef, useCallback } from "react"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase"

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startTimeRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      startTimeRef.current = Date.now()

      // Update duration every 100ms
      intervalRef.current = setInterval(() => {
        setDuration(Date.now() - startTimeRef.current)
      }, 100)
    } catch (error) {
      console.error("Error starting recording:", error)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording])

  const uploadAudio = useCallback(
    async (userId: string): Promise<string | null> => {
      if (!audioBlob) return null

      try {
        const filename = `voice_${Date.now()}.webm`
        const storageRef = ref(storage, `voice_notes/${userId}/${filename}`)

        await uploadBytes(storageRef, audioBlob)
        const downloadURL = await getDownloadURL(storageRef)

        return downloadURL
      } catch (error) {
        console.error("Error uploading audio:", error)
        return null
      }
    },
    [audioBlob],
  )

  const resetRecording = useCallback(() => {
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [])

  return {
    isRecording,
    audioBlob,
    audioUrl,
    duration,
    startRecording,
    stopRecording,
    uploadAudio,
    resetRecording,
  }
}

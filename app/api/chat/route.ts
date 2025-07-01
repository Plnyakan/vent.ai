import ModelClient, { isUnexpected } from "@azure-rest/ai-inference"
import { AzureKeyCredential } from "@azure/core-auth"
import type { NextRequest } from "next/server"

const token = process.env.OPENAI_API_KEY!
const endpoint = "https://models.github.ai/inference"
const model = "openai/gpt-4.1";

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    console.log("🔥 API Route - Received messages:", messages)

    // Validate messages array
    if (!messages || !Array.isArray(messages)) {
      console.error("❌ Invalid messages format")
      return new Response(JSON.stringify({ error: "Invalid messages format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // System prompt for Vent-AI
    const systemPrompt = `You are Vent-AI, a compassionate and empathetic AI therapist designed to help people vent their feelings and emotions safely. Your role is to:

1. Listen actively and validate emotions
2. Provide empathetic responses without judgment
3. Ask thoughtful follow-up questions to help users process their feelings
4. Offer gentle guidance and coping strategies when appropriate
5. Maintain a warm, supportive, and understanding tone
6. Never dismiss or minimize someone's feelings
7. Encourage healthy emotional expression
8. Suggest professional help if someone seems in crisis

Keep responses conversational, caring, and focused on emotional support. You're here to help people feel heard and understood.`

    console.log("🤖 Calling GitHub Models API")

    const client = ModelClient(endpoint, new AzureKeyCredential(token))

    const requestBody = {
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((msg: any) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content || msg.text || "",
        })),
      ],
      temperature: 0.7,
      top_p: 1,
      model: model,
    }

    console.log("📤 Request body:", JSON.stringify(requestBody, null, 2))

    const response = await client.path("/chat/completions").post({
      body: requestBody,
    })

    console.log("📡 GitHub Models API response status:", response.status)

    if (isUnexpected(response)) {
      console.error("❌ Unexpected response:", response)
      console.error("❌ Response body:", JSON.stringify(response.body, null, 2))
      console.error("❌ Response status:", response.status)

      return new Response(
        JSON.stringify({
          error: "AI service error",
          details: response.body?.error || response.body || "Unknown API error",
          status: response.status,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const aiMessage = response.body.choices[0]?.message?.content

    if (!aiMessage) {
      console.error("❌ No message content in response")
      return new Response(JSON.stringify({ error: "No response from AI" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("✅ AI Response:", aiMessage)

    return new Response(JSON.stringify({ message: aiMessage }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("❌ API Route Error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

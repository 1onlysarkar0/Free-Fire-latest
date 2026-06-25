// app/api/chatbot/chat/route.ts
// POST — Send a message, get an AI streaming SSE response.
// Supports Gemini and custom OpenAI-compatible endpoints.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getChatbotConfig,
  getSessionByToken,
  moderateInput,
  checkChatbotRateLimit,
  saveMessage,
  buildSystemPrompt,
  getSessionMessages,
  callGeminiStreaming,
  callCustomOpenAIStreaming,
  MAX_INPUT_WORDS,
} from "@/lib/chatbot";
import { db } from "@/db/drizzle";
import { chatbot_session } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const chatSchema = z.object({
  sessionToken: z.string().uuid("Invalid session token"),
  // max 300 words ≈ 1500 chars — also enforced in moderateInput
  message: z.string().min(1, "Message cannot be empty").max(1500, `Message too long (max ${MAX_INPUT_WORDS} words)`),
  pageContext: z.object({
    url: z.string().optional().nullable(),
    path: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    content: z.string().optional().nullable(),
  }).optional().nullable(),
});

export async function POST(request: NextRequest) {
  // 1. Parse and validate input
  const body = await request.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { sessionToken, message, pageContext } = parsed.data;

  // 2. Get chatbot config
  const config = await getChatbotConfig();
  if (!config || !config.enabled) {
    return NextResponse.json(
      { success: false, error: "Chatbot is not available" },
      { status: 503 }
    );
  }
  if (!config.apiKey) {
    return NextResponse.json(
      { success: false, error: "Chatbot is not configured. Please contact admin." },
      { status: 503 }
    );
  }

  // 3. Validate session
  const chatSession = await getSessionByToken(sessionToken);
  if (!chatSession || chatSession.status === "ended") {
    return NextResponse.json(
      { success: false, error: "Session not found or expired. Please start a new chat." },
      { status: 404 }
    );
  }

  // Verify ownership if session belongs to a logged-in user
  const authSession = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (chatSession.userId && authSession?.user?.id !== chatSession.userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: You do not own this chat session." },
      { status: 401 }
    );
  }

  // Update last known page context in session if a new one is sent
  let activePageContext = null;
  if (pageContext) {
    activePageContext = pageContext;
    await db
      .update(chatbot_session)
      .set({ lastPageContext: JSON.stringify(pageContext) })
      .where(eq(chatbot_session.id, chatSession.id));
  } else if (chatSession.lastPageContext) {
    try {
      activePageContext = JSON.parse(chatSession.lastPageContext);
    } catch {
      // ignore
    }
  }

  // 4. Moderate input (word count + injection check)
  const moderation = moderateInput(message);
  if (!moderation.safe) {
    return NextResponse.json(
      { success: false, error: moderation.reason },
      { status: 400 }
    );
  }

  // 5. Rate limit check
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rateCheck = await checkChatbotRateLimit(
    config,
    chatSession.userId ?? undefined,
    chatSession.userId ? undefined : ipAddress
  );

  if (!rateCheck.allowed) {
    await saveMessage({
      sessionId: chatSession.id,
      role: "user",
      content: message,
      status: "rate_limited",
    });
    return NextResponse.json(
      {
        success: false,
        error: `Rate limit exceeded. Try again in an hour. (${config.rateLimitPerHour}/hr limit)`,
      },
      { status: 429 }
    );
  }

  // 6. Save user message
  await saveMessage({
    sessionId: chatSession.id,
    role: "user",
    content: message,
    status: "success",
  });

  // 7. Build message history for AI context
  const systemPrompt = await buildSystemPrompt(config, {
    userId: authSession?.user?.id ?? chatSession.userId ?? undefined,
    userName: authSession?.user?.name ?? chatSession.userName ?? undefined,
    platformUrl: process.env.NEXT_PUBLIC_APP_URL,
    pageContext: activePageContext,
  });

  // Get recent conversation history (limited by contextWindow)
  const history = await getSessionMessages(chatSession.id, config.contextWindow * 2);

  const aiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...history,
  ];

  // 8. Call AI — streaming response (SSE) with instant headers & keep-alive
  const streamingFn = config.aiProvider === "gemini" ? callGeminiStreaming : callCustomOpenAIStreaming;

  const encoder = new TextEncoder();
  let savedContent = "";
  let savedPromptTokens: number | undefined;
  let savedCompletionTokens: number | undefined;
  let saveBuffer = "";

  const clientStream = new ReadableStream({
    async start(controller) {
      // Start sending keep-alive immediately to prevent gateway/proxy timeouts (every 5 seconds)
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          // Stream closed, ignore
        }
      }, 5000);

      try {
        const { stream: aiStream, error: streamError } = await streamingFn(config, aiMessages);

        if (streamError) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: streamError, done: true })}\n\n`));
          await saveMessage({
            sessionId: chatSession.id,
            role: "assistant",
            content: "Sorry, I'm having trouble responding right now. Please try again.",
            status: "error",
            errorMessage: streamError,
          });
          clearInterval(heartbeatInterval);
          controller.close();
          return;
        }

        const reader = aiStream.getReader();
        const decoder = new TextDecoder();
        let upstreamErrorSent = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Check if this chunk contains an image-input error from the upstream.
          // Some APIs (e.g. OllamaSwarm) return error text as content chunks
          // when the model rejects image-like input. Catch it here so it doesn't
          // pollute the response content.
          const text = decoder.decode(value, { stream: true });
          if (!upstreamErrorSent && /does not support image input|image\.png/i.test(text)) {
            upstreamErrorSent = true;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "The AI model is unavailable right now. Please try a different question.", done: true })}\n\n`
              )
            );
            // Drain the rest of the stream without forwarding
            while (true) {
              const { done } = await reader.read();
              if (done) break;
            }
            break;
          }

          // Forward the chunk to the client
          controller.enqueue(value);

          // Accumulate content to save to the database
          saveBuffer += text;
          const events = saveBuffer.split("\n\n");
          saveBuffer = events.pop() ?? "";

          for (const event of events) {
            const dataLine = event.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            try {
              const parsed = JSON.parse(dataLine.slice(5).trim());
              if (parsed.done && parsed.fullContent) {
                savedContent = parsed.fullContent;
                savedPromptTokens = parsed.promptTokens;
                savedCompletionTokens = parsed.completionTokens;
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI stream error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg, done: true })}\n\n`));
      } finally {
        clearInterval(heartbeatInterval);
        controller.close();
        
        // Save the message if we have content
        if (savedContent) {
          saveMessage({
            sessionId: chatSession.id,
            role: "assistant",
            content: savedContent,
            promptTokens: savedPromptTokens,
            completionTokens: savedCompletionTokens,
            status: "success",
          }).catch(() => {});
        }
      }
    }
  });

  return new Response(clientStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Remaining": String(rateCheck.remaining - 1),
    },
  });
}

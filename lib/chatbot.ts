// lib/chatbot.ts
// Core chatbot library — Gemini-only provider with streaming support.
// All chatbot API routes import from here.
import { db } from "@/db/drizzle";
import {
  chatbot_config,
  chatbot_knowledge,
  chatbot_session,
  chatbot_message,
  wallet,
  walletTransaction,
  user,
  account,
  navigationItem,
  tournamentParticipant,
  tournamentSlot,
  tournament,
  customPage,
} from "@/db/schema";
import { eq, and, or, gte, asc, count, desc } from "drizzle-orm";
import { assertSafeOutboundUrl } from "@/lib/security/outbound-url";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

// Max input: ~300 words ≈ 1500 characters
export const MAX_INPUT_CHARS = 1500;
export const MAX_INPUT_WORDS = 300;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

// Only Gemini and Custom (OpenAI-compatible) are supported
export type AIProvider = "gemini" | "custom";

export interface ChatbotConfig {
  enabled: boolean;
  chatbotName: string;
  welcomeMessage: string;
  description: string;
  aiProvider: AIProvider;
  apiKey: string;
  customEndpoint: string | null;
  model: string;
  temperature: number;
  maxResponseTokens: number;
  contextWindow: number;
  systemPrompt: string;
  rateLimitEnabled: boolean;
  rateLimitPerHour: number;
  allowAnonymous: boolean;
  inputPlaceholder: string;
}

export interface PublicChatbotConfig {
  enabled: boolean;
  chatbotName: string;
  welcomeMessage: string;
  inputPlaceholder: string;
  allowAnonymous: boolean;
}

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
  error?: string;
}

// ═══════════════════════════════════════════════════════════
// CONFIG HELPERS
// ═══════════════════════════════════════════════════════════

let cachedConfig: {
  config: ChatbotConfig | null;
  timestamp: number;
} | null = null;
const CONFIG_CACHE_TTL = 10000; // 10 seconds cache TTL

export async function getChatbotConfig(): Promise<ChatbotConfig | null> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.timestamp < CONFIG_CACHE_TTL) {
    return cachedConfig.config;
  }

  const rows = await db
    .select()
    .from(chatbot_config)
    .where(eq(chatbot_config.id, "default"))
    .limit(1);

  let config: ChatbotConfig | null = null;
  if (rows.length) {
    const row = rows[0];
    config = {
      ...row,
      temperature: parseFloat(row.temperature),
      aiProvider: (row.aiProvider === "custom" ? "custom" : "gemini") as AIProvider,
    };
  }

  cachedConfig = { config, timestamp: now };
  return config;
}

export async function getPublicChatbotConfig(): Promise<PublicChatbotConfig | null> {
  const rows = await db
    .select({
      enabled: chatbot_config.enabled,
      chatbotName: chatbot_config.chatbotName,
      welcomeMessage: chatbot_config.welcomeMessage,
      inputPlaceholder: chatbot_config.inputPlaceholder,
      allowAnonymous: chatbot_config.allowAnonymous,
    })
    .from(chatbot_config)
    .where(eq(chatbot_config.id, "default"))
    .limit(1);

  return rows[0] ?? null;
}

// ═══════════════════════════════════════════════════════════
// KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════

export async function getEnabledKnowledge(): Promise<string> {
  const entries = await db
    .select({ title: chatbot_knowledge.title, content: chatbot_knowledge.content })
    .from(chatbot_knowledge)
    .where(eq(chatbot_knowledge.isEnabled, true))
    .orderBy(asc(chatbot_knowledge.priority));

  if (!entries.length) return "No specific knowledge base entries configured.";

  return entries
    .map((e, i) => `### ${i + 1}. ${e.title}\n${e.content}`)
    .join("\n\n");
}

// ═══════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER & STATIC DATA CACHE
// ═══════════════════════════════════════════════════════════

interface StaticCacheData {
  knowledgeBase: string;
  topPlayers: { name: string | null; gameName: string | null; uid: string | null }[];
  navItems: { title: string; url: string; isSocial: boolean; isFooter: boolean }[];
  customPages: { slug: string; title: string }[];
  timestamp: number;
}

let staticCache: StaticCacheData | null = null;
const STATIC_CACHE_TTL = 30000; // 30 seconds cache TTL

export async function buildSystemPrompt(
  config: ChatbotConfig,
  context: {
    userId?: string;
    userName?: string;
    platformName?: string;
    platformUrl?: string;
    pageContext?: {
      url?: string | null;
      path?: string | null;
      title?: string | null;
      content?: string | null;
    } | null;
  }
): Promise<string> {
  const userId = context.userId;
  const now = Date.now();

  let cachedData = staticCache;
  if (!cachedData || now - cachedData.timestamp > STATIC_CACHE_TTL) {
    // Fetch static platform info concurrently
    const [knowledgeBase, topPlayers, navItems, customPages] = await Promise.all([
      getEnabledKnowledge(),
      db
        .select({ name: user.name, gameName: user.gameName, uid: user.uid })
        .from(user)
        .where(eq(user.topPlayer, true))
        .limit(10),
      db
        .select({
          title: navigationItem.title,
          url: navigationItem.url,
          isSocial: navigationItem.isSocial,
          isFooter: navigationItem.isFooter,
        })
        .from(navigationItem)
        .where(
          or(
            eq(navigationItem.isSocial, true),
            eq(navigationItem.isFooter, true)
          )
        )
        .orderBy(asc(navigationItem.order)),
      db
        .select({ slug: customPage.slug, title: customPage.title })
        .from(customPage)
        .where(eq(customPage.status, "published")),
    ]);

    cachedData = {
      knowledgeBase,
      topPlayers,
      navItems,
      customPages,
      timestamp: now,
    };
    staticCache = cachedData;
  }

  const { knowledgeBase, topPlayers, navItems, customPages } = cachedData;

  // Define user-specific queries (only run if user is logged in)
  const walletPromise = userId
    ? db.select({ balance: wallet.balance }).from(wallet).where(eq(wallet.userId, userId)).limit(1)
    : Promise.resolve(null);
  const txsPromise = userId
    ? db.select().from(walletTransaction).where(eq(walletTransaction.userId, userId)).orderBy(desc(walletTransaction.createdAt)).limit(5)
    : Promise.resolve(null);
  const accountPromise = userId
    ? db.select({ id: account.id }).from(account).where(and(eq(account.userId, userId), eq(account.providerId, "google"))).limit(1)
    : Promise.resolve(null);
  const userDataPromise = userId
    ? db.select({ twoFactorEnabled: user.twoFactorEnabled, uid: user.uid }).from(user).where(eq(user.id, userId)).limit(1)
    : Promise.resolve(null);
  const userTournamentsPromise = userId
    ? db.select({
        tournamentName: tournament.name,
        startTime: tournament.startTime,
        status: tournament.status,
        slotNumber: tournamentSlot.slotNumber,
      })
      .from(tournamentParticipant)
      .innerJoin(tournament, eq(tournamentParticipant.tournamentId, tournament.id))
      .innerJoin(tournamentSlot, eq(tournamentParticipant.slotId, tournamentSlot.id))
      .where(eq(tournamentParticipant.userId, userId))
      .orderBy(desc(tournamentParticipant.createdAt))
      .limit(5)
    : Promise.resolve(null);

  // Await user-specific queries concurrently
  const [
    walletResult,
    txsResult,
    accountResult,
    userDataResult,
    userTournamentsResult,
  ] = await Promise.all([
    walletPromise,
    txsPromise,
    accountPromise,
    userDataPromise,
    userTournamentsPromise,
  ]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 1. Fetch user wallet balance
  let userWalletText = "Guest (not logged in)";
  if (userId && walletResult) {
    userWalletText = walletResult.length ? `${walletResult[0].balance} coins` : "0 coins";
  }

  // 2. Fetch user wallet history
  let userWalletHistoryText = "Guest (not logged in)";
  if (userId && txsResult) {
    userWalletHistoryText = txsResult.length
      ? txsResult
        .map(
          (t) =>
            `- ${t.createdAt.toLocaleDateString("en-IN")}: ${t.type} of ${t.amount} coins (${t.status}) - ${t.description ?? "No details"}`
        )
        .join("\n")
      : "No transaction history found.";
  }

  // 3. Fetch top players
  const topPlayersText = topPlayers.length
    ? topPlayers
      .map(
        (p, idx) =>
          `${idx + 1}. Name: ${p.name} (UID: ${p.uid ?? "N/A"})`
      )
      .join("\n")
    : "No top players listed.";

  // 4. Split socials & footer links from navItems
  const socials = navItems.filter((item) => item.isSocial);
  const foots = navItems.filter((item) => item.isFooter && !item.isSocial);

  const footerSocialsText = socials.length
    ? socials.map((s) => `- [${s.title}](${s.url})`).join("\n")
    : "No social links configured.";

  // 5. Fetch google linked status
  let googleLinkedText = "Guest (not logged in)";
  if (userId && accountResult) {
    googleLinkedText = accountResult.length ? "Yes" : "No";
  }

  // 6. Fetch 2fa status
  let twoFactorText = "Guest (not logged in)";
  if (userId && userDataResult) {
    twoFactorText = userDataResult.length && userDataResult[0].twoFactorEnabled ? "Enabled" : "Disabled";
  }

  // 7. Fetch user player uid
  let userPlayerUidText = "Guest (not logged in)";
  if (userId && userDataResult) {
    userPlayerUidText = userDataResult[0]?.uid ?? "Not configured";
  }

  // 8. Fetch user tournaments
  let userTournamentsText = "Guest (not logged in)";
  if (userId && userTournamentsResult) {
    userTournamentsText = userTournamentsResult.length
      ? userTournamentsResult
        .map(
          (t) =>
            `- ${t.tournamentName}: Slot #${t.slotNumber} | Starts: ${t.startTime.toLocaleString("en-IN")} | Status: ${t.status}`
        )
        .join("\n")
      : "You have not joined any tournaments yet.";
  }

  // 9. Fetch footer links
  const footerLinksText = foots.length
    ? foots.map((f) => `- [${f.title}](${f.url})`).join("\n")
    : "No footer links configured.";

  // 10. Fetch custom pages dynamically for sitemap
  let sitemapText = `User Sitemap (Navigation Links):
- [Homepage](/) - View homepage with top players and features.
- [Tournaments Listing](/tournaments) - View all tournaments.
- [User Dashboard](/dashboard) - View profile and wallet balance overview.
- [My Tournaments](/dashboard/my-tournaments) - View tournaments you joined.
- [Account Settings](/dashboard/settings) - Manage profile, IGN, UID, Google link, and Two-Factor authentication.
- [Wallet & Transactions](/dashboard/wallet) - Deposit/withdraw coins and view transaction logs.`;

  if (customPages.length) {
    sitemapText += "\n" + customPages.map((p) => `- [${p.title}](/${p.slug})`).join("\n");
  }

  const sidebarText = `Dashboard Sidebar Navigation:
- [Dashboard Overview](/dashboard)
- [Joined Tournaments](/dashboard/my-tournaments)
- [Wallet & Transactions](/dashboard/wallet)
- [Account Settings](/dashboard/settings)`;

  // 11. Current Page Context
  let currentPageText = "No current page context available.";
  if (context.pageContext) {
    const pc = context.pageContext;
    let contentText = (pc.content ?? "No text content on this page.").trim();
    // Strip any URLs or file paths that look like images to prevent upstream
    // API from trying to process them as image inputs (models like deepseek-v4-pro
    // do not support vision/multimodal). This covers .png, .jpg, .jpeg, .gif,
    // .webp, .svg, .bmp, .ico, and base64 image data URIs, both absolute URLs
    // and relative/root-relative paths.
    contentText = contentText.replace(/\bhttps?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg|bmp|ico)(?:\?\S*)?\b/gi, "[image]");
    contentText = contentText.replace(/\bdata:image\/[a-z+]+;base64,[a-zA-Z0-9+/=]+\b/g, "[base64-image]");
    contentText = contentText.replace(/\b(?:\/[^\s"')\]]+)?\/(?:[^\s"')\]]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp|ico))/gi, " [image-path]");
    contentText = contentText.replace(/\b(?:[A-Za-z]:\\[^\s"')\]]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp|ico))/gi, " [local-image]");
    const words = contentText.split(/\s+/);
    if (words.length > 200) {
      contentText = words.slice(0, 200).join(" ") + "...";
    }
    if (contentText.length > 1000) {
      contentText = contentText.slice(0, 1000) + "...";
    }
    currentPageText = `URL: ${pc.url ?? "Unknown"}
Path: ${pc.path ?? "Unknown"}
Page Title: ${pc.title ?? "Unknown"}
Visible Page Content/Text:
"""
${contentText}
"""`;
  }

  let prompt = config.systemPrompt;

  // Replace all template variables
  prompt = prompt
    .replace(/\{\{chatbot_name\}\}/g, config.chatbotName)
    .replace(/\{\{platform_name\}\}/g, context.platformName ?? "")
    .replace(/\{\{platform_url\}\}/g, context.platformUrl ?? "")
    .replace(/\{\{current_date\}\}/g, today)
    .replace(/\{\{knowledge_base\}\}/g, knowledgeBase)
    .replace(/\{\{user_name\}\}/g, context.userName ?? "Guest")
    .replace(/\{\{user_wallet\}\}/g, userWalletText)
    .replace(/\{\{user_wallet_history\}\}/g, userWalletHistoryText)
    .replace(/\{\{top_players\}\}/g, topPlayersText)
    .replace(/\{\{footer_socials\}\}/g, footerSocialsText)
    .replace(/\{\{google_linked\}\}/g, googleLinkedText)
    .replace(/\{\{two_factor\}\}/g, twoFactorText)
    .replace(/\{\{user_player_uid\}\}/g, userPlayerUidText)
    .replace(/\{\{user_my_tournaments\}\}/g, userTournamentsText)
    .replace(/\{\{footer_links\}\}/g, footerLinksText)
    .replace(/\{\{current_page_details\}\}/g, currentPageText)
    .replace(/\{\{sitemap\}\}/g, sitemapText)
    .replace(/\{\{sidebar\}\}/g, sidebarText);

  // Handle conditional blocks: {{#if user_name}}...{{else}}...{{/if}}
  const ifRegex = /\{\{#if user_name\}\}([\s\S]*?)\{\{\/if\}\}/g;
  prompt = prompt.replace(ifRegex, (_, blockContent) => {
    const parts = blockContent.split(/\{\{else\}\}/);
    const ifPart = parts[0] ?? "";
    const elsePart = parts[1] ?? "";
    
    if (context.userName) {
      return ifPart;
    } else {
      return elsePart;
    }
  });

  return prompt.trim();
}

// ═══════════════════════════════════════════════════════════
// AI PROVIDER — GEMINI (Non-Streaming)
// Used for: admin test-connection, simple responses when streaming is disabled
// ═══════════════════════════════════════════════════════════

async function callGemini(
  config: ChatbotConfig,
  messages: AIMessage[]
): Promise<AIResponse> {
  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const conversationMsgs = messages.filter((m) => m.role !== "system");

  // Gemini uses "user" and "model" roles (not "assistant")
  const geminiMessages = conversationMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const model = config.model || "gemini-2.0-flash-exp";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
      contents: geminiMessages,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxResponseTokens,
      },
    }),
    signal: AbortSignal.timeout(30000), // 30s timeout
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    return { content: "", error: error?.error?.message ?? "Gemini API error" };
  }

  const data = await res.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
    promptTokens: data.usageMetadata?.promptTokenCount,
    completionTokens: data.usageMetadata?.candidatesTokenCount,
  };
}

// ═══════════════════════════════════════════════════════════
// AI PROVIDER — GEMINI STREAMING
// Returns a ReadableStream that yields SSE-formatted chunks.
// Each data event: { chunk: string, done: boolean }
// ═══════════════════════════════════════════════════════════

export async function callGeminiStreaming(
  config: ChatbotConfig,
  messages: AIMessage[]
): Promise<{ stream: ReadableStream<Uint8Array>; error?: string }> {
  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const conversationMsgs = messages.filter((m) => m.role !== "system");

  const geminiMessages = conversationMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const model = config.model || "gemini-2.0-flash-exp";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${config.apiKey}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
        contents: geminiMessages,
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxResponseTokens,
        },
      }),
      signal: AbortSignal.timeout(180000), // 180s for streaming (allows long thinking)
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return {
      stream: new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message, done: true })}\n\n`));
          controller.close();
        },
      }),
      error: message,
    };
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: { message: res.statusText } }));
    let errorMsg = errorData?.error?.message ?? "Gemini streaming error";
    if (/does not support image input|image\.png/i.test(errorMsg)) {
      errorMsg = "The AI model is currently unable to process page content with images. I'll still answer based on what I know. How can I help?";
    }
    return {
      stream: new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg, done: true })}\n\n`));
          controller.close();
        },
      }),
      error: errorMsg,
    };
  }

  // Transform Gemini SSE stream into our format
  const encoder = new TextEncoder();
  let fullContent = "";
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;

  const transformedStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Start keep-alive heartbeat interval
      const heartbeatInterval = setInterval(() => {
        try {
          // SSE standard comments start with a colon and are ignored by standard parsers,
          // but they serve as data traffic to keep HTTP connections alive.
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          // Stream closed or errored, ignore
        }
      }, 15000);

      try {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const part = parsed.candidates?.[0]?.content?.parts?.[0];
              const textChunk = part?.text ?? (part?.thought && typeof part.thought === "string" ? part.thought : "");
              const isThought = !!part?.thought;

              if (parsed.usageMetadata) {
                promptTokens = parsed.usageMetadata.promptTokenCount;
                completionTokens = parsed.usageMetadata.candidatesTokenCount;
              }

              if (textChunk) {
                if (isThought) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ thought: textChunk, done: false })}\n\n`)
                  );
                } else {
                  fullContent += textChunk;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ chunk: textChunk, done: false })}\n\n`)
                  );
                }
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        // Send final done event with metadata
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              chunk: "",
              done: true,
              fullContent,
              promptTokens,
              completionTokens,
            })}\n\n`
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message, done: true })}\n\n`)
        );
      } finally {
        clearInterval(heartbeatInterval);
        controller.close();
      }
    },
  });

  return { stream: transformedStream };
}

// ═══════════════════════════════════════════════════════════
// AI PROVIDER — CUSTOM (OpenAI-Compatible Endpoint)
// ═══════════════════════════════════════════════════════════

async function callCustomOpenAI(
  config: ChatbotConfig,
  messages: AIMessage[]
): Promise<AIResponse> {
  const endpoint = config.customEndpoint ?? "";
  if (!endpoint) {
    return { content: "", error: "Custom endpoint URL is required for 'custom' provider." };
  }

  const safeEndpoint = await assertSafeOutboundUrl(endpoint);
  const res = await fetch(safeEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxResponseTokens,
    }),
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    return { content: "", error: error?.error?.message ?? "Custom API error" };
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
  };
}

// ═══════════════════════════════════════════════════════════
// AI PROVIDER — CUSTOM STREAMING (OpenAI-Compatible SSE)
// Returns a ReadableStream that yields SSE-formatted chunks.
// Compatible with OpenAI streaming API format.
// ═══════════════════════════════════════════════════════════

export async function callCustomOpenAIStreaming(
  config: ChatbotConfig,
  messages: AIMessage[]
): Promise<{ stream: ReadableStream<Uint8Array>; error?: string }> {
  const endpoint = config.customEndpoint ?? "";
  if (!endpoint) {
    return {
      stream: new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Custom endpoint URL is required.", done: true })}\n\n`));
          controller.close();
        },
      }),
      error: "Custom endpoint URL is required for streaming.",
    };
  }

  let res: Response;
  try {
    const safeEndpoint = await assertSafeOutboundUrl(endpoint);
    res = await fetch(safeEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxResponseTokens,
        stream: true,
      }),
      signal: AbortSignal.timeout(180000), // 180s for streaming (allows long thinking)
      redirect: "error",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return {
      stream: new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message, done: true })}\n\n`));
          controller.close();
        },
      }),
      error: message,
    };
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: { message: res.statusText } }));
    let errorMsg = errorData?.error?.message ?? "Custom streaming error";
    // Catch upstream API image-input errors and rewrite to something user-friendly
    if (/does not support image input|image\.png/i.test(errorMsg)) {
      errorMsg = "The AI model is currently unable to process page content with images. I'll still answer based on what I know. How can I help?";
    }
    return {
      stream: new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg, done: true })}\n\n`));
          controller.close();
        },
      }),
      error: errorMsg,
    };
  }

  // Transform OpenAI SSE stream into our uniform format
  const encoder = new TextEncoder();
  let fullContent = "";
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;

  const transformedStream = new ReadableStream<Uint8Array>({
    async start(controller) {
        // Start keep-alive heartbeat interval
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": keep-alive\n\n"));
          } catch {
            // Stream closed or errored, ignore
          }
        }, 15000);

        try {
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const jsonStr = line.slice(5).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const choice = parsed.choices?.[0];
                const textChunk = choice?.delta?.content ?? choice?.text ?? "";
                const thoughtChunk =
                  choice?.delta?.reasoning_content ??
                  choice?.delta?.reasoning ??
                  choice?.delta?.thought ??
                  choice?.delta?.thinking ??
                  "";

                if (parsed.usage) {
                  promptTokens = parsed.usage.prompt_tokens;
                  completionTokens = parsed.usage.completion_tokens;
                }

                if (thoughtChunk) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ thought: thoughtChunk, done: false })}\n\n`)
                  );
                }

                if (textChunk) {
                  fullContent += textChunk;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ chunk: textChunk, done: false })}\n\n`)
                  );
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                chunk: "",
                done: true,
                fullContent,
                promptTokens,
                completionTokens,
              })}\n\n`
            )
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message, done: true })}\n\n`)
          );
        } finally {
          clearInterval(heartbeatInterval);
          controller.close();
        }
    },
  });

  return { stream: transformedStream };
}

// Main provider dispatcher (non-streaming)
export async function callAI(
  config: ChatbotConfig,
  messages: AIMessage[]
): Promise<AIResponse> {
  try {
    switch (config.aiProvider) {
      case "gemini":
        return await callGemini(config, messages);
      case "custom":
        return await callCustomOpenAI(config, messages);
      default:
        return { content: "", error: `Unknown provider: ${config.aiProvider}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("timeout") || message.includes("abort")) {
      return { content: "", error: "AI response timed out. Please try again." };
    }
    return { content: "", error: message };
  }
}

// ═══════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════

export async function checkChatbotRateLimit(
  config: ChatbotConfig,
  userId?: string,
  ipAddress?: string
): Promise<{ allowed: boolean; remaining: number }> {
  if (!config.rateLimitEnabled) return { allowed: true, remaining: 999 };

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  let recentCount = 0;

  if (userId) {
    // Single JOIN + COUNT — eliminates N+1 (one query instead of 1+N)
    const [result] = await db
      .select({ total: count() })
      .from(chatbot_message)
      .innerJoin(chatbot_session, eq(chatbot_message.sessionId, chatbot_session.id))
      .where(
        and(
          eq(chatbot_session.userId, userId),
          eq(chatbot_message.role, "user"),
          gte(chatbot_message.createdAt, oneHourAgo)
        )
      );
    recentCount = Number(result?.total ?? 0);
  } else if (ipAddress) {
    // Single JOIN + COUNT for IP-based rate limiting
    const [result] = await db
      .select({ total: count() })
      .from(chatbot_message)
      .innerJoin(chatbot_session, eq(chatbot_message.sessionId, chatbot_session.id))
      .where(
        and(
          eq(chatbot_session.ipAddress, ipAddress),
          eq(chatbot_message.role, "user"),
          gte(chatbot_message.createdAt, oneHourAgo)
        )
      );
    recentCount = Number(result?.total ?? 0);
  }

  const remaining = Math.max(0, config.rateLimitPerHour - recentCount);
  return {
    allowed: recentCount < config.rateLimitPerHour,
    remaining,
  };
}

// ═══════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════

export async function createChatSession(params: {
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ sessionToken: string; sessionId: string }> {
  const result = await db
    .insert(chatbot_session)
    .values({
      userId: params.userId ?? null,
      userName: params.userName ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent?.slice(0, 500) ?? null,
      status: "active",
    })
    .returning({ id: chatbot_session.id, token: chatbot_session.sessionToken });

  return { sessionId: result[0].id, sessionToken: result[0].token };
}

export async function getSessionByToken(token: string) {
  const rows = await db
    .select()
    .from(chatbot_session)
    .where(eq(chatbot_session.sessionToken, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSessionMessages(
  sessionId: string,
  limit: number = 50
): Promise<AIMessage[]> {
  const messages = await db
    .select({ role: chatbot_message.role, content: chatbot_message.content })
    .from(chatbot_message)
    .where(eq(chatbot_message.sessionId, sessionId))
    .orderBy(asc(chatbot_message.createdAt))
    .limit(limit);

  return messages as AIMessage[];
}

// ═══════════════════════════════════════════════════════════
// MESSAGE PERSISTENCE
// ═══════════════════════════════════════════════════════════

export async function saveMessage(params: {
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  promptTokens?: number;
  completionTokens?: number;
  status?: string;
  errorMessage?: string;
}): Promise<void> {
  await db.insert(chatbot_message).values({
    sessionId: params.sessionId,
    role: params.role,
    content: params.content,
    promptTokens: params.promptTokens,
    completionTokens: params.completionTokens,
    status: params.status ?? "success",
    errorMessage: params.errorMessage,
  });

  // Update session message count and last activity
  await db
    .update(chatbot_session)
    .set({
      messageCount: db.$count(chatbot_message, eq(chatbot_message.sessionId, params.sessionId)),
      lastMessageAt: new Date(),
    })
    .where(eq(chatbot_session.id, params.sessionId));
}

// ═══════════════════════════════════════════════════════════
// CONTENT MODERATION
// ═══════════════════════════════════════════════════════════

// Basic input filter to block prompt injection attempts
const BLOCKED_PATTERNS = [
  /ignore previous instructions/i,
  /ignore your system prompt/i,
  /you are now/i,
  /pretend you are/i,
  /act as if you are/i,
  /forget everything/i,
  /disregard your/i,
  /jailbreak/i,
];

export function moderateInput(content: string): { safe: boolean; reason?: string } {
  if (content.trim().length === 0) {
    return { safe: false, reason: "Message cannot be empty" };
  }

  // Count words
  const wordCount = content.trim().split(/\s+/).length;
  if (wordCount > MAX_INPUT_WORDS) {
    return { safe: false, reason: `Message too long (max ${MAX_INPUT_WORDS} words). Please shorten your message.` };
  }

  // Also check character limit as a secondary guard
  if (content.length > MAX_INPUT_CHARS) {
    return { safe: false, reason: `Message too long (max ${MAX_INPUT_CHARS} characters / ${MAX_INPUT_WORDS} words).` };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      return { safe: false, reason: "Message contains disallowed content." };
    }
  }

  return { safe: true };
}

// ═══════════════════════════════════════════════════════════
// CONNECTION TEST
// ═══════════════════════════════════════════════════════════

export async function testAIConnection(
  provider: AIProvider,
  apiKey: string,
  model: string,
  customEndpoint?: string
): Promise<{ success: boolean; error?: string; responseTime?: number }> {
  const testConfig: ChatbotConfig = {
    enabled: true,
    chatbotName: "Test",
    welcomeMessage: "",
    description: "",
    aiProvider: provider,
    apiKey,
    customEndpoint: customEndpoint ?? null,
    model,
    temperature: 0.5,
    maxResponseTokens: 50,
    contextWindow: 1,
    systemPrompt: "You are a test assistant.",
    rateLimitEnabled: false,
    rateLimitPerHour: 0,
    allowAnonymous: true,
    inputPlaceholder: "",
  };

  const testMessages: AIMessage[] = [
    { role: "system", content: "You are a test assistant." },
    { role: "user", content: "Reply with exactly: OK" },
  ];

  const start = Date.now();
  try {
    const result = await callAI(testConfig, testMessages);
    const responseTime = Date.now() - start;

    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, responseTime };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

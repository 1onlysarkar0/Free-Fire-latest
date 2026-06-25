"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "done" | "streaming" | "error";
  createdAt: number;
  thought?: string;
  isThinking?: boolean;
  thinkingElapsed?: number;
}

export interface ChatbotConfig {
  enabled: boolean;
  chatbotName: string;
  welcomeMessage: string;
  inputPlaceholder: string;
  allowAnonymous: boolean;
}

const SESSION_KEY = "1os_chat_session_token";
const MESSAGES_KEY = "1os_chat_messages";

export function useChatbot() {
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  const { data: session } = authClient.useSession();
  const user = session?.user ?? null;
  const lastSentContextRef = useRef<{ url: string; path: string; title: string; content: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/chatbot/config")
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        if (json.success) setConfig(json.data);
      })
      .catch(() => {})
      .finally(() => mounted && setConfigLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const storedToken = sessionStorage.getItem(SESSION_KEY);
      const storedMessages = sessionStorage.getItem(MESSAGES_KEY);
      if (storedToken) setSessionToken(storedToken);
      if (storedMessages) setMessages(JSON.parse(storedMessages));
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionToken) return sessionToken;

    try {
      const res = await fetch("/api/chatbot/session", { method: "POST" });
      const json = await res.json();

      if (res.status === 401) {
        setRequiresAuth(true);
        setError(json.error ?? "Please sign in to chat.");
        return null;
      }

      if (!json.success) {
        setError(json.error ?? "Could not start chat. Try again.");
        return null;
      }

      const token: string = json.data.sessionToken;
      setSessionToken(token);
      try {
        sessionStorage.setItem(SESSION_KEY, token);
      } catch {
        // ignore
      }

      setMessages((prev) => {
        if (prev.length > 0) return prev;
        return [
          {
            id: "welcome",
            role: "assistant",
            content: json.data.welcomeMessage,
            status: "done",
            createdAt: Date.now(),
          },
        ];
      });

      return token;
    } catch {
      setError("Could not connect. Check your internet and try again.");
      return null;
    }
  }, [sessionToken]);

  // Auto-create session when config loads so everything is ready on panel open
  const initRef = useRef(false);
  useEffect(() => {
    if (!config || !config.enabled || initRef.current) return;
    initRef.current = true;
    void ensureSession();
  }, [config, ensureSession]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      setError(null);
      const token = await ensureSession();
      if (!token) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
        status: "done",
        createdAt: Date.now(),
      };
      const botMsgId = `a-${Date.now()}`;
      const botMsg: ChatMessage = {
        id: botMsgId,
        role: "assistant",
        content: "",
        status: "streaming",
        createdAt: Date.now(),
        thought: "",
        isThinking: true,
        thinkingElapsed: 0,
      };

      setMessages((prev) => [...prev, userMsg, botMsg]);
      setIsSending(true);

      const thinkingTimer = setInterval(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId && m.isThinking
              ? { ...m, thinkingElapsed: (m.thinkingElapsed ?? 0) + 1 }
              : m
          )
        );
      }, 1000);

      try {
        const pageContext = typeof window !== "undefined" ? {
          url: window.location.href,
          path: window.location.pathname,
          title: document.title,
          content: (() => {
            if (window.location.pathname.includes("/chatbot")) {
              return "";
            }
            const mainEl = document.querySelector("main") || document.querySelector("#main-content") || document.querySelector(".main-content");
            let text = "";
            if (mainEl) {
              const clone = mainEl.cloneNode(true) as HTMLElement;
              // Remove any chatbot widget elements
              clone.querySelectorAll("[data-chatbot-widget], #chatbot-widget-trigger, #chatbot-widget-panel, .chatbot-widget, #chatbot-widget").forEach((el) => el.remove());
              
              // 1. Remove Top Players section if present
              const headers = clone.querySelectorAll("h1, h2, h3, h4, h5, h6, div, p");
              headers.forEach((el) => {
                const textVal = el.textContent || "";
                if (textVal.includes("Top Players")) {
                  let parent: HTMLElement | null = el as HTMLElement;
                  while (parent && parent !== clone) {
                    if (parent.tagName === "SECTION" || parent.classList.contains("space-y-4") || parent.classList.contains("bg-accent")) {
                      parent.remove();
                      break;
                    }
                    parent = parent.parentElement;
                  }
                  if (el.parentElement) el.remove();
                }
              });

              // 2. Remove Wallet history / transaction list & balance cards
              const walletElements = clone.querySelectorAll("h1, h2, h3, h4, h5, h6, div, p, span");
              walletElements.forEach((el) => {
                const textVal = el.textContent || "";
                if (
                  textVal.includes("Transaction activity") ||
                  textVal.includes("Available balance") ||
                  textVal.includes("Total earned") ||
                  textVal.includes("Total spent") ||
                  textVal.includes("Review all credits, debits")
                ) {
                  let parent: HTMLElement | null = el as HTMLElement;
                  while (parent && parent !== clone) {
                    if (parent.tagName === "SECTION" || parent.classList.contains("rounded-2xl") || parent.classList.contains("bg-accent/60") || parent.classList.contains("bg-accent/40")) {
                      parent.remove();
                      break;
                    }
                    parent = parent.parentElement;
                  }
                  if (el.parentElement) el.remove();
                }
              });

              // 3. Remove common nav/header/footer elements in case they are inside main
              const navs = clone.querySelectorAll("nav, header, footer, [role='navigation'], [role='menubar'], aside");
              navs.forEach(n => n.remove());

              text = clone.innerText || "";
            } else {
              const clone = document.body.cloneNode(true) as HTMLElement;
              // Remove any chatbot widget elements
              clone.querySelectorAll("[data-chatbot-widget], #chatbot-widget-trigger, #chatbot-widget-panel, .chatbot-widget, #chatbot-widget, [data-chatbot]").forEach((el) => el.remove());
              
              const layoutFrames = clone.querySelectorAll("nav, header, footer, [role='navigation'], [role='menubar'], aside, .app-sidebar");
              layoutFrames.forEach(n => n.remove());

              text = clone.innerText || "";
            }
            const cleaned = text.replace(/\s+/g, " ").trim();
            let truncated = cleaned;
            const words = cleaned.split(" ");
            if (words.length > 200) {
              truncated = words.slice(0, 200).join(" ") + "...";
            }
            if (truncated.length > 1000) {
              truncated = truncated.slice(0, 1000) + "...";
            }
            return truncated;
          })()
        } : null;

        // Determine if page context has changed
        let shouldSendContext = false;
        if (pageContext) {
          if (!lastSentContextRef.current) {
            shouldSendContext = true;
          } else {
            const last = lastSentContextRef.current;
            shouldSendContext =
              last.url !== pageContext.url ||
              last.path !== pageContext.path ||
              last.title !== pageContext.title ||
              last.content !== pageContext.content;
          }
        }

        const res = await fetch("/api/chatbot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            sessionToken: token, 
            message: trimmed, 
            pageContext: shouldSendContext ? pageContext : null 
          }),
        });

        if (res.ok) {
          if (shouldSendContext) {
            lastSentContextRef.current = pageContext;
          }
        }

        if (res.status === 429) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Rate limit reached. Try again later.");
        }

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? `Request failed (${res.status})`);
        }

        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("text/event-stream") && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let accumulatedRaw = "";
          let accumulatedThought = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";

            for (const evt of events) {
              const dataLine = evt
                .split("\n")
                .find((l) => l.startsWith("data:"));
              if (!dataLine) continue;

              const raw = dataLine.slice(5).trim();
              if (raw === "[DONE]" || raw === "") continue;

              try {
                const parsed = JSON.parse(raw);
                if (parsed.error) throw new Error(parsed.error);

                if (parsed.thought) {
                  accumulatedThought += parsed.thought;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === botMsgId
                        ? { ...m, thought: accumulatedThought, isThinking: true }
                        : m
                    )
                  );
                } else {
                  const chunk: string =
                    parsed.chunk ?? parsed.content ?? parsed.delta ?? parsed.text ?? "";
                  if (chunk) {
                    accumulatedRaw += chunk;
                    
                    let parsedContent = accumulatedRaw;
                    let parsedThought = "";
                    let isThinkingActive = false;
                    
                    if (accumulatedRaw.includes("<think>")) {
                      const startIdx = accumulatedRaw.indexOf("<think>");
                      const endIdx = accumulatedRaw.indexOf("</think>");
                      
                      const beforeThink = accumulatedRaw.substring(0, startIdx);
                      
                      if (endIdx !== -1) {
                        parsedThought = accumulatedRaw.substring(startIdx + 7, endIdx);
                        const afterThink = accumulatedRaw.substring(endIdx + 8);
                        parsedContent = beforeThink + afterThink;
                        isThinkingActive = false;
                      } else {
                        parsedThought = accumulatedRaw.substring(startIdx + 7);
                        parsedContent = beforeThink;
                        isThinkingActive = true;
                      }
                    }
                    
                    const combinedThoughts = (accumulatedThought + parsedThought).trim();
                    
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === botMsgId
                          ? {
                              ...m,
                              content: parsedContent,
                              thought: combinedThoughts,
                              isThinking: isThinkingActive || !!parsed.thought || (accumulatedThought.length > 0 && !parsedContent),
                            }
                          : m
                      )
                    );
                  }
                }
                if (typeof parsed.remaining === "number") {
                  setRemaining(parsed.remaining);
                }
              } catch (innerErr) {
                console.error("Error processing stream event:", innerErr);
              }
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId ? { ...m, status: "done", isThinking: false } : m
            )
          );
        } else {
          const json = await res.json();
          if (!json.success) throw new Error(json.error ?? "Something went wrong");

          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId
                ? { ...m, content: json.data.reply, status: "done", isThinking: false }
                : m
            )
          );
          if (typeof json.data.remaining === "number") {
            setRemaining(json.data.remaining);
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong. Try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, content: message, status: "error", isThinking: false } : m
          )
        );
        setError(message);
      } finally {
        clearInterval(thinkingTimer);
        setIsSending(false);
      }
    },
    [ensureSession, isSending]
  );

  const resetConversation = useCallback(async () => {
    if (sessionToken) {
      fetch(`/api/chatbot/session/${sessionToken}/end`, { method: "POST" }).catch(
        () => {}
      );
    }
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(MESSAGES_KEY);
    } catch {
      // ignore
    }
    setSessionToken(null);
    setMessages([]);
    setError(null);
    setRemaining(null);
    setRequiresAuth(false);
    lastSentContextRef.current = null;
  }, [sessionToken]);

  return {
    config,
    configLoading,
    messages,
    isOpen,
    setIsOpen,
    isSending,
    error,
    remaining,
    requiresAuth,
    user,
    sendMessage,
    ensureSession,
    resetConversation,
  };
}

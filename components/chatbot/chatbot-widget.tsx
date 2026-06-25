"use client";

import { useEffect, useRef, useState } from "react";
import { X, SendHorizontal, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import Link from "next/link";
import { useChatbot } from "@/hooks/use-chatbot";
import { ChatbotMessage } from "./chatbot-message";
import { AvatarDisplay } from "@/components/ui/avatar-display";

const BOT_AVATAR = "avatar:4";

export function ChatbotWidget() {
  const {
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
    resetConversation,
  } = useChatbot();

  const [input, setInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, setIsOpen]);

  if (configLoading || !config || !config.enabled) return null;

  const handleSend = () => {
    if (!input.trim() || isSending) return;
    sendMessage(input);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const rateLimitReached = remaining === 0;

  return (
    <>
      {/* Floating button */}
      <button
        data-chatbot-widget="true"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
        className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 flex items-center justify-center hover:scale-105 transition-all duration-200"
      >
        {isOpen ? (
          <div className="w-10 h-10 rounded-full bg-destructive text-destructive-foreground shadow-lg flex items-center justify-center border border-border/20">
            <X size={20} />
          </div>
        ) : (
          <AvatarDisplay image={BOT_AVATAR} name={config.chatbotName} className="w-10 h-10 shadow-lg" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          data-chatbot-widget="true"
          className={`fixed z-50 flex flex-col bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-300 ease-in-out
            ${
              isFullscreen
                ? "inset-0 sm:inset-4 md:inset-6 lg:inset-8 w-full sm:w-auto h-[100dvh] sm:h-auto rounded-none sm:rounded-2xl border-none sm:border sm:border-border/80"
                : "inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:left-auto sm:w-[380px] w-full h-[100dvh] sm:h-[600px] sm:max-h-[calc(100dvh-120px)] rounded-none sm:rounded-2xl border-none sm:border sm:border-border/80"
            }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
            <div className="flex items-center gap-2.5">
              <AvatarDisplay image={BOT_AVATAR} name={config.chatbotName} className="w-9 h-9" />
              <div>
                <p className="text-sm font-semibold text-foreground">{config.chatbotName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                  Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsFullscreen((v) => !v)}
                aria-label={isFullscreen ? "Minimize" : "Fullscreen"}
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors sm:flex hidden"
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              {messages.length > 0 && (
                <button
                  onClick={resetConversation}
                  aria-label="New conversation"
                  className="w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                >
                  <RotateCcw size={15} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 flex flex-col gap-3 bg-background chatbot-messages-container">
            {messages.filter((msg) => msg.id !== "welcome").length === 0 && config.welcomeMessage && !requiresAuth && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8 px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
                  <AvatarDisplay image={BOT_AVATAR} name={config.chatbotName} className="w-9 h-9" />
                </div>
                <div className="space-y-1.5 max-w-[280px]">
                  <h3 className="font-bold text-base text-foreground">
                    Hey! I am {config.chatbotName}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {config.welcomeMessage}
                  </p>
                </div>
              </div>
            )}

            {messages
              .filter((msg) => msg.id !== "welcome")
              .map((msg) => (
                <ChatbotMessage
                  key={msg.id}
                  message={msg}
                  userImage={user?.image}
                  userName={user?.name}
                />
              ))}

            {requiresAuth && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8 px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
                  <AvatarDisplay image={BOT_AVATAR} name={config.chatbotName} className="w-9 h-9" />
                </div>
                <div className="space-y-1.5 max-w-[280px] mb-2">
                  <h3 className="font-bold text-base text-foreground">
                    Hey! I am {config.chatbotName}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Please sign in to start chat.
                  </p>
                </div>
                <Link
                  href="/sign-in"
                  className="btn btn-primary w-full max-w-[200px]"
                  style={{ height: "2.5rem", fontSize: "0.875rem" }}
                >
                  Sign In
                </Link>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error banner */}
          {error && !requiresAuth && (
            <div className="px-4 py-2 bg-background">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Rate limit warning */}
          {remaining !== null && remaining <= 5 && remaining > 0 && !requiresAuth && (
            <div className="px-4 py-1.5 bg-background">
              <p className="text-xs text-warning">
                {remaining} message{remaining === 1 ? "" : "s"} left this hour
              </p>
            </div>
          )}

          {/* Input */}
          {!requiresAuth && (
            <div className="p-3 bg-background border-t border-border/30">
              <div className="flex items-end gap-2 bg-accent/40 hover:bg-accent/60 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 border border-border/10 focus-within:border-primary/30 rounded-xl p-1.5 transition-all duration-200">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    rateLimitReached
                      ? "Rate limit reached — try again later"
                      : config.inputPlaceholder
                  }
                  disabled={rateLimitReached || isSending}
                  rows={1}
                  className="flex-1 resize-none bg-transparent border-none outline-none px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50 max-h-[120px]"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending || rateLimitReached}
                  aria-label="Send message"
                  className="flex-shrink-0 flex items-center justify-center p-2.5 sm:p-2 text-foreground transition-opacity disabled:opacity-40 hover:opacity-70"
                >
                  <SendHorizontal size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

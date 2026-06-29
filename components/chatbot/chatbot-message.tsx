"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { AvatarDisplay } from "@/components/ui/avatar-display";
import { AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import type { ChatMessage } from "@/hooks/use-chatbot";

interface ChatbotMessageProps {
  message: ChatMessage;
  userImage?: string | null;
  userName?: string | null;
}

const BOT_AVATAR = "avatar:4";

function AIThinkingBlock({
  content,
  elapsedSeconds,
  isThinking,
}: {
  content: string;
  elapsedSeconds: number;
  isThinking: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Strip completed/incomplete code blocks, the word "mermaid" (prevents global scanner triggers), and markdown formatting symbols
  const cleanContent = useMemo(() => {
    let text = content;
    
    // Remove code blocks
    text = text.replace(/```mermaid[\s\S]*?```/g, "");
    text = text.replace(/```mermaid[\s\S]*/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*/g, "");
    
    // Completely strip the word "mermaid" (case-insensitive) to prevent any global DOM rendering scripts from triggering
    text = text.replace(/mermaid/gi, "");
    
    // Strip markdown formatting symbols so it is rendered as 100% raw plain text
    text = text.replace(/[`*_~#\-+>]/g, "");
    
    return text.trim();
  }, [content]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || !isThinking || !cleanContent) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const speed = 25; // scroll speed in pixels per second

    const scroll = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll > 0) {
        let nextScroll = el.scrollTop + speed * delta;
        if (nextScroll >= maxScroll) {
          nextScroll = 0;
        }
        el.scrollTop = nextScroll;
      }

      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [cleanContent, isThinking]);

  return (
    <div className="flex flex-col p-1 w-full max-w-full sm:max-w-sm">
      <div className="flex items-center justify-start gap-1.5 mb-2 text-xs font-bold text-foreground/80">
        <motion.span 
          animate={isThinking ? { backgroundPosition: ["100% 0", "-100% 0"] } : {}}
          transition={isThinking ? { repeat: Infinity, duration: 2, ease: "linear" } : {}}
          className={clsx(
            "inline-block",
            isThinking && "bg-[linear-gradient(110deg,#a1a1aa,45%,#1e293b,55%,#a1a1aa)] dark:bg-[linear-gradient(110deg,#a1a1aa,45%,#ffffff,55%,#a1a1aa)] bg-[length:200%_100%] bg-clip-text text-transparent"
          )}
        >
          {isThinking ? "Thinking" : "Thought process"}
        </motion.span>
        <span className="text-muted-foreground/60 font-medium">
          ({elapsedSeconds}s)
        </span>
      </div>
      
      {cleanContent && (
        <div className="relative h-[95px] overflow-hidden p-1.5 bg-transparent border-none">
          {/* Top fade overlay */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none h-4" />

          {/* Bottom fade overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none h-4" />

          {/* Scrolling content */}
          <div
            ref={contentRef}
            className="h-full overflow-hidden px-2 py-0.5 text-muted-foreground/60 font-mono text-[10.5px] leading-normal"
            style={{
              scrollBehavior: "auto",
            }}
          >
            <p className="whitespace-pre-wrap">
              {cleanContent}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChatbotMessage({ message, userImage, userName }: ChatbotMessageProps) {
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const isStreaming = message.status === "streaming";
  const isThinking = message.isThinking;

  const [typedContent, setTypedContent] = useState(() => {
    // If the message is already done or from user/error, just render content directly
    return message.status === "done" || message.role !== "assistant" ? message.content : "";
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (message.role !== "assistant") return;

    const target = message.content;

    // If not streaming and already finished, just set it directly
    if (message.status === "done" && typedContent.length === 0) {
      setTypedContent(target);
      return;
    }

    if (typedContent.length < target.length) {
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTypedContent((prev) => {
          if (prev.length >= target.length) {
            if (timerRef.current) clearInterval(timerRef.current);
            return prev;
          }

          // Auto scroll container as text grows
          const container = document.querySelector(".chatbot-messages-container");
          if (container) {
            container.scrollTop = container.scrollHeight;
          }

          // Adaptive typing speed: if lagging behind, type multiple characters at once
          const diff = target.length - prev.length;
          let step = 1;
          if (diff > 50) step = 8;
          else if (diff > 20) step = 4;
          else if (diff > 5) step = 2;

          return target.substring(0, prev.length + step);
        });
      }, 15);
    } else if (message.status === "done" && typedContent !== target) {
      // Ensure we align with the final content when done
      setTypedContent(target);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [message.content, message.status, message.role, typedContent]);

  if (isUser) {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 bg-primary text-primary-foreground text-sm leading-relaxed shadow-sm">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <div className="flex-shrink-0 mt-0.5">
          <AvatarDisplay
            image={userImage}
            name={userName}
            className="w-7 h-7"
          />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          <AvatarDisplay image={BOT_AVATAR} name="Nemu" className="w-7 h-7" />
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed bg-destructive/5 text-destructive border border-destructive/20 shadow-sm">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} />
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-shrink-0 mt-0.5">
        <AvatarDisplay image={BOT_AVATAR} name="Nemu" className="w-7 h-7" />
      </div>
      <div className="max-w-[80%] text-sm leading-relaxed text-foreground py-1 break-words [word-break:break-word] w-full overflow-hidden">
        {/* Render thinking block ONLY if currently thinking */}
        {isThinking && (
          <div className="mb-2 border-b border-border/20 pb-2">
            <AIThinkingBlock
              content={message.thought ?? ""}
              elapsedSeconds={message.thinkingElapsed ?? 0}
              isThinking={isThinking ?? false}
            />
          </div>
        )}

        {/* Render final response content */}
        <AnimatePresence mode="popLayout">
          {typedContent && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)", y: 5 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="chatbot-widget">
                <MarkdownRenderer
                  content={typedContent}
                  variant="chat"
                  isStreaming={isStreaming}
                  className="prose-chat [&_p]:text-foreground [&_p]:font-medium [&_li]:text-foreground [&_li]:font-medium [&_a]:text-foreground [&_a]:font-medium"
                />
              </div>
              {isStreaming && (
                <span className="chat-streaming-cursor" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

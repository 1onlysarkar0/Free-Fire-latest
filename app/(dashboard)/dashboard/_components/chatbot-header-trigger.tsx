"use client";

import { MessageSquareDot } from "lucide-react";
import { useChatbotControl } from "@/components/chatbot/chatbot-context";

export function ChatbotHeaderTrigger() {
  const control = useChatbotControl();
  if (!control) return null;
  return (
    <button
      type="button"
      onClick={() => control.setIsOpen((v) => !v)}
      aria-label={control.isOpen ? "Close chat" : "Open chat"}
      className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-foreground hover:bg-muted transition-colors shrink-0"
    >
      <MessageSquareDot className="h-5 w-5" />
    </button>
  );
}

"use client";

import { createContext, useContext, useState } from "react";

interface ChatbotControl {
  isOpen: boolean;
  setIsOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
}

const ChatbotContext = createContext<ChatbotControl | null>(null);

export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <ChatbotContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbotControl() {
  return useContext(ChatbotContext);
}

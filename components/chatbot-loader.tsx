"use client";

import { useEffect, useState } from "react";
import { ChatbotWidget } from "@/components/chatbot/chatbot-widget";

export default function ChatbotLoader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-neutral-900 border border-border/20 shadow-lg flex items-center justify-center text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </div>
    );
  }
  return <ChatbotWidget />;
}

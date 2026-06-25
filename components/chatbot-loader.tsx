"use client";

import { useEffect, useState } from "react";
import { ChatbotWidget } from "@/components/chatbot/chatbot-widget";

export default function ChatbotLoader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <ChatbotWidget />;
}

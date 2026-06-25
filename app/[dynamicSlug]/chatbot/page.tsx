import { requirePagePermission } from "@/lib/panel-auth";
import { getChatbotConfig } from "@/lib/chatbot";
import ChatbotAdminClient from "./_components/chatbot-admin-client";

export const dynamic = "force-dynamic";

export default async function ChatbotAdminPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  const authState = await requirePagePermission(dynamicSlug, "chatbot:view");

  const config = await getChatbotConfig();

  // Mask API key before sending to client
  const maskedConfig = config
    ? {
        ...config,
        apiKey: config.apiKey
          ? `${"•".repeat(Math.max(0, config.apiKey.length - 4))}${config.apiKey.slice(-4)}`
          : "",
      }
    : null;

  const canEditConfig = authState.isAdmin || authState.permissions.includes("chatbot:config_edit");
  const canViewKnowledge = authState.isAdmin || authState.permissions.includes("chatbot:knowledge_view");
  const canEditKnowledge = authState.isAdmin || authState.permissions.includes("chatbot:knowledge_edit");
  const canViewConversations = authState.isAdmin || authState.permissions.includes("chatbot:conversations_view");
  const canDeleteConversations = authState.isAdmin || authState.permissions.includes("chatbot:conversations_delete");

  return (
    <ChatbotAdminClient
      initialConfig={maskedConfig}
      canEditConfig={canEditConfig}
      canViewKnowledge={canViewKnowledge}
      canEditKnowledge={canEditKnowledge}
      canViewConversations={canViewConversations}
      canDeleteConversations={canDeleteConversations}
    />
  );
}

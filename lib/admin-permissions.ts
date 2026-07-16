export interface Permission {
  key: string;
  label: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  icon: string;
  href: string;
  permissions: Permission[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "site_config",
    label: "Site Configuration",
    icon: "Settings",
    href: "/admin/site-config",
    permissions: [
      { key: "site_config:view", label: "View Site Config" },
      { key: "site_config:edit_branding", label: "Edit Branding & Logo" },
      { key: "site_config:edit_hero", label: "Edit Hero Section" },
      { key: "site_config:edit_auth", label: "Edit Auth Panel" },
      { key: "site_config:edit_footer", label: "Edit Footer & Copyright" },
      { key: "site_config:edit_dashboard", label: "Edit Dashboard Text" },
      { key: "site_config:edit_contact", label: "Edit Contact Info" },
    ],
  },
  {
    key: "navigation",
    label: "Navigation Items",
    icon: "Menu",
    href: "/admin/navigation",
    permissions: [
      { key: "navigation:view", label: "View Navigation" },
      { key: "navigation:create", label: "Create Items" },
      { key: "navigation:edit", label: "Edit Items" },
      { key: "navigation:delete", label: "Delete Items" },
    ],
  },
  {
    key: "tournaments",
    label: "Tournaments",
    icon: "Trophy",
    href: "/admin/tournaments",
    permissions: [
      { key: "tournaments:view", label: "View Tournaments" },
      { key: "tournaments:create", label: "Create Tournaments" },
      { key: "tournaments:edit", label: "Edit Tournaments" },
      { key: "tournaments:delete", label: "Delete Tournaments" },
      { key: "tournaments:manage_room", label: "Set Room ID & Password" },
      { key: "tournaments:declare_winners", label: "Declare Winners" },
      { key: "tournaments:cancel", label: "Cancel Tournaments" },
      { key: "tournaments:manage_participants", label: "Manage Participants" },
    ],
  },
  {
    key: "wallet",
    label: "Wallet Management",
    icon: "Wallet",
    href: "/admin/users",
    permissions: [
      { key: "wallet:view", label: "View User Wallets" },
      { key: "wallet:adjust", label: "Credit / Debit User Wallets" },
    ],
  },
  {
    key: "content_templates",
    label: "Content Templates",
    icon: "FileTemplate",
    href: "/admin/content-templates",
    permissions: [
      { key: "content_templates:view", label: "View Templates" },
      { key: "content_templates:create", label: "Create Templates" },
      { key: "content_templates:edit", label: "Edit Templates" },
      { key: "content_templates:delete", label: "Delete Templates" },
    ],
  },
  {
    key: "auth_content",
    label: "Auth Page Content",
    icon: "FileText",
    href: "/admin/auth-content",
    permissions: [
      { key: "auth_content:view", label: "View Auth Content" },
      { key: "auth_content:edit", label: "Edit Auth Content" },
    ],
  },
  {
    key: "smtp",
    label: "SMTP Configuration",
    icon: "Mail",
    href: "/admin/smtp",
    permissions: [
      { key: "smtp:view", label: "View SMTP Config" },
      { key: "smtp:edit", label: "Edit SMTP Config" },
    ],
  },
  {
    key: "email_templates",
    label: "Email Templates",
    icon: "MailOpen",
    href: "/admin/email-templates",
    permissions: [
      { key: "email_templates:view", label: "View Templates" },
      { key: "email_templates:create", label: "Create Templates" },
      { key: "email_templates:edit", label: "Edit Templates" },
      { key: "email_templates:delete", label: "Delete Templates" },
    ],
  },
  {
    key: "seo",
    label: "SEO Configuration",
    icon: "SearchIcon",
    href: "/admin/seo",
    permissions: [
      { key: "seo:view", label: "View SEO Config" },
      { key: "seo:create", label: "Create SEO Pages" },
      { key: "seo:edit", label: "Edit SEO Config" },
      { key: "seo:delete", label: "Delete SEO Pages" },
    ],
  },
  {
    key: "users",
    label: "Users",
    icon: "Users",
    href: "/admin/users",
    permissions: [
      { key: "users:view", label: "View Users" },
      { key: "users:edit", label: "Edit User Details" },
      { key: "users:delete", label: "Delete Users" },
      { key: "users:assign_role", label: "Assign Roles to Users" },
      { key: "users:toggle_top_player", label: "Toggle Top Player Status" },
      { key: "users:ban", label: "Ban / Unban Users" },
    ],
  },
  {
    key: "roles",
    label: "Roles & Permissions",
    icon: "Shield",
    href: "/admin/roles",
    permissions: [
      { key: "roles:view", label: "View Roles" },
      { key: "roles:create", label: "Create Roles" },
      { key: "roles:edit", label: "Edit Roles" },
      { key: "roles:delete", label: "Delete Roles" },
    ],
  },
  {
    key: "pages",
    label: "Custom Pages",
    icon: "FileCode",
    href: "/admin/pages",
    permissions: [
      { key: "pages:view", label: "View Custom Pages" },
      { key: "pages:create", label: "Create Custom Pages" },
      { key: "pages:edit", label: "Edit Custom Pages" },
      { key: "pages:delete", label: "Delete Custom Pages" },
    ],
  },
  {
    key: "payment",
    label: "Payment Gateway",
    icon: "CreditCard",
    href: "/admin/payment",
    permissions: [
      { key: "payment:view", label: "View Payment Config" },
      { key: "payment:config_edit", label: "Edit Payment Config" },
      { key: "payment:view_verifications", label: "View Verification Logs" },
    ],
  },
  {
    key: "chatbot",
    label: "AI Chatbot",
    icon: "MessageSquare",
    href: "/admin/chatbot",
    permissions: [
      { key: "chatbot:view", label: "View Chatbot Admin" },
      { key: "chatbot:config_edit", label: "Edit AI Config & System Prompt" },
      { key: "chatbot:knowledge_view", label: "View Knowledge Base" },
      { key: "chatbot:knowledge_edit", label: "Edit Knowledge Base" },
      { key: "chatbot:conversations_view", label: "View Conversations" },
      { key: "chatbot:conversations_delete", label: "Delete Conversations" },
    ],
  },
  {
    key: "withdraw",
    label: "Withdrawal Management",
    icon: "ArrowUpFromLine",
    href: "/admin/withdraw",
    permissions: [
      { key: "withdraw:view", label: "View Withdrawals" },
      { key: "withdraw:config_edit", label: "Edit Withdrawal Config" },
      { key: "withdraw:approve", label: "Approve Withdrawal Requests" },
      { key: "withdraw:cancel", label: "Cancel Withdrawal Requests" },
    ],
  },
  {
    key: "cheater_reports",
    label: "Cheater Reports",
    icon: "AlertTriangle",
    href: "/admin/cheater-reports",
    permissions: [
      { key: "cheater_reports:view", label: "View Cheater Reports" },
      { key: "cheater_reports:edit", label: "Update Report Status & Notes" },
      { key: "cheater_reports:delete", label: "Delete Cheater Reports" },
    ],
  },
  {
    key: "payment_help",
    label: "Payment Help",
    icon: "HelpCircle",
    href: "/admin/payment-help",
    permissions: [
      { key: "payment_help:view", label: "View Payment Help Requests" },
      { key: "payment_help:edit", label: "Update Payment Help Status & Notes" },
      { key: "payment_help:delete", label: "Delete Payment Help Requests" },
    ],
  },
  {
    key: "invitation",
    label: "Invitation System",
    icon: "Share2",
    href: "/admin/invitation",
    permissions: [
      { key: "invitation:view", label: "View Invitation System" },
      { key: "invitation:edit", label: "Configure Invitation Bonuses & Toggle" },
    ],
  },
];

export function hasPermission(
  permissions: string[],
  permission: string,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  return permissions.includes(permission);
}

export function canAccessSection(
  permissions: string[],
  sectionKey: string,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  const group = PERMISSION_GROUPS.find((g) => g.key === sectionKey);
  if (!group) return false;
  return group.permissions.some((p) => permissions.includes(p.key));
}

export function getAllPermissionKeys(): string[] {
  return PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
}

import "server-only";
import { db } from "@/db/drizzle";
import { smtpProviders, smtpConfig, emailTemplate, siteConfig } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  templateName: string;
  variables?: Record<string, string>;
}

export interface SendRawEmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Optional: use a specific smtp_providers ID instead of the default */
  providerId?: string;
}

function renderTemplate(html: string, variables: Record<string, string>): string {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
    rendered = rendered.replaceAll(`{{ ${key} }}`, value);
  }
  return rendered;
}

/**
 * Returns a Nodemailer transporter configured from the smtp_providers table.
 * Falls back to the legacy smtp_config table if no provider is found.
 *
 * @param providerId - Optional specific provider ID to use instead of default
 */
async function getSmtpTransporter(providerId?: string) {
  // Try smtp_providers first (new multi-provider system)
  let provider = null;

  if (providerId) {
    const rows = await db
      .select()
      .from(smtpProviders)
      .where(and(eq(smtpProviders.id, providerId), eq(smtpProviders.isActive, true)))
      .limit(1);
    provider = rows[0] ?? null;
  }

  if (!provider) {
    const rows = await db
      .select()
      .from(smtpProviders)
      .where(and(eq(smtpProviders.isDefault, true), eq(smtpProviders.isActive, true)))
      .limit(1);
    provider = rows[0] ?? null;
  }

  if (provider) {
    const transporter = nodemailer.createTransport({
      host: provider.host,
      port: provider.port,
      secure: provider.secure,
      auth: { user: provider.username, pass: provider.password },
      connectionTimeout: 10000,
    });
    const from = `"${provider.fromName}" <${provider.fromEmail}>`;
    const replyTo = provider.replyTo ?? undefined;
    return { transporter, from, replyTo };
  }

  // Legacy fallback: smtp_config (single-row)
  const configs = await db
    .select()
    .from(smtpConfig)
    .where(eq(smtpConfig.enabled, true))
    .limit(1);

  const config = configs[0];

  if (!config) {
    throw new Error(
      "No active SMTP provider configured. Add one in the admin panel under SMTP Settings."
    );
  }

  if (!config.host || !config.username || !config.password) {
    throw new Error(
      "SMTP configuration is incomplete. Please configure host, username, and password."
    );
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
    connectionTimeout: 10000,
  });

  return { transporter, from: `"${config.fromName}" <${config.fromEmail}>`, replyTo: undefined };
}

export async function sendEmail({ to, templateName, variables = {} }: SendEmailOptions) {
  const templates = await db
    .select()
    .from(emailTemplate)
    .where(eq(emailTemplate.name, templateName))
    .limit(1);

  const template = templates[0];

  if (!template) {
    throw new Error(
      `Email template "${templateName}" not found in the database. Run 'npm run db:seed' to populate templates.`
    );
  }

  // Retrieve site config global fallbacks
  const configs = await db
    .select()
    .from(siteConfig)
    .where(eq(siteConfig.id, "default"))
    .limit(1);
  const config = configs[0];

  const mergedVariables = {
    siteName: config?.logoTitle ?? "",
    siteLogo: config?.logoSrc ?? "/assets/logo.svg",
    copyrightText: config?.copyrightText ?? "",
    contactEmail: config?.contactEmail ?? "",
    companyAddress: config?.companyAddress ?? "",
    ...variables,
  };

  const subject = renderTemplate(template.subject, mergedVariables);
  const html = renderTemplate(template.bodyHtml, mergedVariables);

  const { transporter, from, replyTo } = await getSmtpTransporter();

  await transporter.sendMail({ from, to, subject, html, ...(replyTo ? { replyTo } : {}) });
}

export async function sendRawEmail({ to, subject, html, providerId }: SendRawEmailOptions) {
  const { transporter, from, replyTo } = await getSmtpTransporter(providerId);
  await transporter.sendMail({ from, to, subject, html, ...(replyTo ? { replyTo } : {}) });
}

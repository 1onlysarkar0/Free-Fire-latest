import "server-only";
import { db } from "@/db/drizzle";
import { smtpConfig, emailTemplate } from "@/db/schema";
import { eq } from "drizzle-orm";
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
}

function renderTemplate(html: string, variables: Record<string, string>): string {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
    rendered = rendered.replaceAll(`{{ ${key} }}`, value);
  }
  return rendered;
}

async function getSmtpTransporter() {
  const configs = await db
    .select()
    .from(smtpConfig)
    .where(eq(smtpConfig.enabled, true))
    .limit(1);

  const config = configs[0];

  if (!config) {
    throw new Error(
      "No active SMTP configuration found in the database. Please configure SMTP settings in the smtp_config table and set enabled=true."
    );
  }

  if (!config.host || !config.username || !config.password) {
    throw new Error(
      "SMTP configuration is incomplete. Please set host, username, and password in the smtp_config table."
    );
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    connectionTimeout: 10000,
  });

  return { transporter, from: `"${config.fromName}" <${config.fromEmail}>` };
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

  const subject = renderTemplate(template.subject, variables);
  const html = renderTemplate(template.bodyHtml, variables);

  const { transporter, from } = await getSmtpTransporter();

  await transporter.sendMail({ from, to, subject, html });
}

export async function sendRawEmail({ to, subject, html }: SendRawEmailOptions) {
  const { transporter, from } = await getSmtpTransporter();
  await transporter.sendMail({ from, to, subject, html });
}

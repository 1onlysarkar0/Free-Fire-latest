import React from "react";
import WelcomeEmail from "./templates/welcome";
import PasswordResetEmail from "./templates/password-reset";

export const emailRegistry: Record<string, React.ComponentType<any>> = {
  welcome: WelcomeEmail,
  password_reset: PasswordResetEmail,
};

export async function renderReactEmail(templateKey: string, payload: Record<string, any>): Promise<string> {
  const Component = emailRegistry[templateKey];
  if (!Component) {
    throw new Error(`React email template "${templateKey}" not found in registry.`);
  }

  // Dynamic import react-dom/server to bypass Next.js static analysis check
  const { renderToStaticMarkup } = await import("react-dom/server");
  const element = React.createElement(Component, payload);
  return renderToStaticMarkup(element);
}

import React from "react";

export interface WelcomeEmailProps {
  userName: string;
  gameName?: string;
  dashboardUrl?: string;
  siteName: string;
}

export default function WelcomeEmail({
  userName,
  gameName,
  dashboardUrl = "#",
  siteName,
}: WelcomeEmailProps) {
  return (
    <div style={{
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      backgroundColor: "#f4f4f5",
      padding: "40px 10px",
      margin: 0,
    }}>
      <table align="center" width="560" cellPadding="0" cellSpacing="0" style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
        margin: "0 auto",
      }}>
        <tbody>
          <tr>
            <td style={{
              backgroundColor: "#FF5A1F",
              padding: "32px 40px",
              textAlign: "center",
            }}>
              <span style={{
                color: "#ffffff",
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "-0.5px",
              }}>{siteName}</span>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "40px 40px 20px 40px" }}>
              <h1 style={{
                margin: "0 0 12px 0",
                fontSize: "22px",
                fontWeight: 700,
                color: "#111827",
              }}>Welcome, {userName}! 🎮</h1>
              <p style={{
                margin: "0 0 20px 0",
                fontSize: "15px",
                color: "#4b5563",
                lineHeight: "1.6",
              }}>
                Thank you for joining {siteName}! Your profile is set up and ready.
              </p>
              {gameName && (
                <p style={{
                  margin: "0 0 20px 0",
                  fontSize: "15px",
                  color: "#4b5563",
                  lineHeight: "1.6",
                }}>
                  In-game name: <strong>{gameName}</strong>
                </p>
              )}
              <p style={{
                margin: "0 0 24px 0",
                fontSize: "15px",
                color: "#4b5563",
                lineHeight: "1.6",
              }}>
                Explore daily tournaments, compete with other top players, and withdraw your prize winnings instantly to your UPI wallet.
              </p>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <a href={dashboardUrl} style={{
                  display: "inline-block",
                  backgroundColor: "#FF5A1F",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "14px 32px",
                  borderRadius: "8px",
                }}>
                  Go to Dashboard
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style={{
              padding: "20px 40px 32px 40px",
              borderTop: "1px solid #f3f4f6",
              textAlign: "center",
            }}>
              <p style={{
                margin: 0,
                fontSize: "12px",
                color: "#9ca3af",
              }}>&copy; {siteName} &middot; All rights reserved</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

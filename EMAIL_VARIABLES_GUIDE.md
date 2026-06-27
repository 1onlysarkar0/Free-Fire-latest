# Email Template Variables Guide

You can use any of the variables listed below inside your custom HTML email templates. Placeholders should be formatted like `{{variableName}}` or `{{ variableName }}`.

---

## 1. Global Variables
These variables are fetched automatically from the website's branding configuration (Site Config) and are available in **every** email template.

*   `{{siteName}}` — The name of your site/brand (e.g., `1OnlySarkar`).
*   `{{siteLogo}}` — The URL path to the site logo image.
*   `{{copyrightText}}` — The copyright string (e.g., `© 2026 1OnlySarkar. All rights reserved.`).
*   `{{contactEmail}}` — Your official support email address.
*   `{{companyAddress}}` — Your official physical address or registration details.

---

## 2. Template-Specific Variables

### A. Welcome Email (`welcome`)
Sent to users when they complete their profile registration.
*   `{{userName}}` — User's display name.
*   `{{gameName}}` — User's Free Fire in-game name.
*   `{{dashboardUrl}}` — Direct URL link to the user's dashboard profile page.

### B. Email Verification (`email_verification`)
Sent when a user needs to verify their email address.
*   `{{userName}}` — User's display name.
*   `{{verificationUrl}}` — Direct verification URL link.

### C. Password Reset (`password_reset`)
Sent when a user requests a link to change their password.
*   `{{userName}}` — User's display name.
*   `{{resetUrl}}` — Direct password reset URL link.

### D. Room Credentials Revealed (`room_revealed`)
Sent to participants when an administrator posts the custom room ID and password for their match.
*   `{{userName}}` — User's display name.
*   `{{tournamentName}}` — The title of the Free Fire tournament.
*   `{{roomId}}` — The custom game room ID.
*   `{{roomPassword}}` — The password for the room.
*   `{{startTime}}` — The start time scheduled for the match.
*   `{{tournamentUrl}}` — Direct link to the tournament page.

### E. Tournament Cancelled (`tournament_cancelled`)
Sent when a tournament is cancelled by an administrator.
*   `{{userName}}` — User's display name.
*   `{{tournamentName}}` — The title of the cancelled tournament.
*   `{{reason}}` — The cancellation reason written by the admin.
*   `{{refundAmount}}` — Number of coins refunded to the user's wallet.

### F. Prize Credited (`prize_credited`)
Sent to winning participants when their prize coins are added to their wallet balance.
*   `{{userName}}` — User's display name.
*   `{{tournamentName}}` — The title of the tournament.
*   `{{placement}}` — The user's final standing (e.g., `1st place`, `2nd place`, `Top Fragger`).
*   `{{prizeAmount}}` — Number of coins credited to the wallet.

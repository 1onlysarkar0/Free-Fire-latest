# Security Policy

The team behind this tournament platform takes security seriously. This document describes our security practices, how to report vulnerabilities, and our commitment to resolving security issues.

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it immediately. 

*   **Email**: reply@1onlysarkar.shop
*   **Response SLA**: We will acknowledge receipt of your report within 24 hours and provide status updates every 48 hours until resolved.

Please do **NOT** open public GitHub issues or disclose vulnerabilities publicly until we have had an opportunity to address them.

## Supported Versions

We actively maintain and apply security patches to the latest version of the platform. We recommend always running the latest stable release.

| Version | Supported |
| ------- | --------- |
| v1.0.x  | Yes       |
| < v1.0  | No        |

## Security Architecture & Defenses

This platform implements several defense-in-depth measures to protect player wallets, administrative controls, and system infrastructure:

1.  **Role-Based Access Control (RBAC)**: All administrative actions are protected by strict role validations (`requireAdminOrRole`) in API Route Handlers and server side validations (`verifyPanelAccess`) in components.
2.  **Wallet Integrity & Atomic Transactions**: To prevent double-spending and balance duplication, wallet adjustments use database-level transaction isolation (`db.transaction()`) combined with row-level locking (`FOR UPDATE` / `.forUpdate()`).
3.  **Cross-Site Request Forgery (CSRF)**: CSRF verification checks are enforced on all state-changing endpoints (POST/PUT/DELETE) for both the admin panel and public endpoints (e.g. tournament joining, profile completion, password setting).
4.  **Rate Limiting**: Critical endpoints (such as email checks, chatbot interaction, and payment UTR verification) enforce rate limiting by user ID and IP address to mitigate brute-force and spam vectors.
5.  **Outbound Request Safety (SSRF)**: All outbound HTTP requests generated dynamically (such as business lookup or custom chatbot API connections) are audited through standard DNS lookup filtering to block local IP networks (RFC 1918) and reserved ranges.
6.  **Input Validation**: Strict schema verification via Zod is applied to all incoming request bodies.
7.  **Authentication Security**: We use Better Auth for secure session management with HttpOnly, Secure, and SameSite cookie options configured. TOTP 2FA is supported.
8.  **Obscurity of Administrative Slugs**: The administrative panel operates under a dynamically configured database slug rather than static `/admin` prefixes.

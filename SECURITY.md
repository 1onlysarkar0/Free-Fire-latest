# Security

## Reporting Vulnerabilities
Contact: reply@1onlysarkar.shop

## Security Measures
- All admin routes require authentication and permission checks
- Input validation via Zod on all mutation endpoints
- No hardcoded secrets — all credentials in environment variables or DB
- HTTP security headers enforced via Next.js config
- SMTP credentials stored in database, configured via admin panel
- Wallet transactions are atomic — race conditions prevented
- Admin slug is configurable and non-obvious by default

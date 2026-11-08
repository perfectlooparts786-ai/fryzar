# FRYZAR Ad Brand Safety, UX & Privacy Policy

**Last updated:** 7 November 2026  
**Enforcement layers:** Storefront client (`adRules.ts`, `adSafety.ts`), API server (`platform-modules.ts`), and Playwright E2E regression (`tests/e2e/platform-complete.spec.cjs`).

## 1. Permanently Prohibited Formats

To protect food-ordering trust and Core Web Vitals, the following ad formats are **hard-blocked in both client and server validation** (`HTTP 400 prohibited_intrusive_format`):

- **Popunders & Popups** (`popunder: false` locked)
- **Full-Screen Interstitials** (`interstitial: false` locked)
- **Forced Redirects / Back-Button Hijacking** (`blockAutoRedirects: true` locked)
- **Auto-Play Audio / Sound-On Video Ads** (`soundOffOnly: true` locked)
- **Fake System Alerts / APK Download Deception**

## 2. Permanently Blocked Sensitive Advertiser Categories

All Adsterra publisher zones connected to FRYZAR must exclude:

1. Adult / Explicit content
2. Gambling, Betting & Lotteries
3. Alcohol, Tobacco & Controlled Substances
4. Deceptive Downloads / Malware / Tech-Support Scams
5. High-Risk Financial / Crypto Schemes
6. Sensationalist / Misleading Health Claims

## 3. Strictly Ad-Free Transactional & Trust Routes

Ads are **never** rendered or requested on transactional, account-sensitive, support, or legal policy routes—even when `masterEnabled` is `true`:

- `/basket` (and Basket drawer modal)
- `/checkout` (and Delivery details modal)
- `/order-confirmation` (and Order received modal)
- `/track` and `/track/:token`
- `/support` (Contact & Support)
- `/privacy-policy`
- `/terms`
- `/refund-policy`
- `/delivery-policy`
- Entire FRYZAR Admin & Operations Portal (`fryzar-admin` / `fryzar-admin-preview`)

This invariant is continuously verified in `tests/e2e/platform-complete.spec.cjs`, which enables `masterAdsEnabled: true` and asserts `expect(page.locator("[data-ad-slot]")).toHaveCount(0)` across every restricted route.

## 4. Customer Privacy & Zero-PII Telemetry

- **No Customer PII Shared with Ad Networks:** Customer names, Pakistani mobile numbers, street addresses, order numbers, basket items, and tracking tokens are never appended to ad URLs or exposed to third-party scripts.
- **PII-Rejecting Telemetry Endpoint:** `POST /api/v1/monetization/events` inspects incoming JSON keys and immediately rejects (`400 pii_rejected_in_telemetry`) any payload containing `name`, `phone`, `email`, `address`, `token`, `session`, or `cookie`.
- **Regional Consent Gate:** Visitors in configured consent-required regions (`EEA`, `UK`) do not load third-party ad scripts unless explicit opt-in consent is recorded via `adConsent.ts`.

## 5. Emergency Incident Response

If any upstream advertiser creative violates brand safety or degrades page responsiveness:

1. Open **FRYZAR Admin -> 22. Advertising & Monetization**.
2. Click **Emergency Disable All Ads** (`POST /api/v1/admin/advertising/kill-switch`).
3. All storefronts immediately receive `masterEnabled: false` (`Cache-Control: no-store`) and render zero third-party ad tags without requiring a Worker redeployment.

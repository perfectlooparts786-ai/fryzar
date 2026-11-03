# FRYZAR browser E2E tests

The browser suite uses Playwright with a pinned CI-only test dependency. The app's runtime dependencies and production bundle are unchanged.

## Local run

1. Install the repository's locked dependencies:

   `npm ci --ignore-scripts --no-audit --no-fund`

2. Install the pinned browser-test runner without changing the application lockfile:

   `npm install --no-save --package-lock=false @playwright/test@1.56.1`

3. Install Chromium:

   `npx playwright install chromium`

4. Run:

   `npm run test:e2e`

Playwright starts both Vite development servers on 127.0.0.1 (ports 5173 and 5174) and stops them after the run. Existing servers may be reused outside CI.

## Test isolation

- Customer API responses are intercepted in the browser. Tests do not call Cloudflare preview or production services.
- Admin session checks are intercepted and remain unauthenticated. Tests never bootstrap an owner or submit credentials.
- No D1 database, real order, payment, secret or remote Worker is modified.
- CI installs Chromium with OS dependencies and retains traces, screenshots and video only on failures.

The initial suite is intentionally smoke-level. Product/cart/guest-checkout and authenticated admin workflows require deterministic synthetic fixtures and are tracked separately in P3-09/P3-10.

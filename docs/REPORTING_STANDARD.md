# FRYZAR reporting standard

Use this reporting format for every FRYZAR development session, status request, milestone, blocker, and handoff. Never provide only a generic "continue" or a single percentage.

## Required report sections

1. **Overall progress estimate**
   - State a rounded range, not fake precision.
   - Explain whether the estimate reflects implementation, tested integration, or production readiness.
   - Distinguish code written, CI tested, real integration verified, deployed and production-ready.

2. **Current phase**
   - Name the exact milestone currently being worked on.
   - Identify the latest GitHub branch/commit and latest CI run.

3. **Completed work**
   - Group by infrastructure, database, API, customer web, admin, payments, Android, tests and deployment.
   - Mark each as implemented, CI tested, real integration verified or deployed.

4. **Remaining work**
   - Give actionable tasks in priority order.
   - Distinguish required for next development milestone from required for public launch.

5. **Blockers and risks**
   - State what cannot proceed yet and why.
   - State whether user input, genuine business information, approvals or external account setup is required.

6. **Environment and safety**
   - Confirm which database/Worker/environment is being used.
   - State whether legacy infrastructure, DNS, secrets and production data remain untouched.
   - Never disclose secret values or fabricate data.

7. **Next action**
   - Name the next concrete engineering task and its acceptance criteria.

## Evidence labels

- PLANNED: design/backlog only.
- IMPLEMENTED: source code exists.
- CI TESTED: automated test/build passed.
- INTEGRATION VERIFIED: exercised against a real isolated service/database.
- DEPLOYED: current source version assigned to a service deployment.
- PRODUCTION READY: all release gates and operational checks passed.

Do not promote a task to a stronger evidence label without proof.

## Reporting rules

- Always update docs/PROJECT_STATE.md, docs/TASK_BACKLOG.md and docs/TESTING.md when significant work or test status changes.
- Keep README and draft PR descriptions aligned with current implementation.
- Report the most recent known failed and successful CI runs if both matter.
- Mention when live HTTP, real D1 transactions, browser/device flows or deployment have not been verified.
- Never report production readiness based only on a successful build.
- Do not invent precise completion percentages. Use a transparent weighted estimate and explain major unfinished areas.

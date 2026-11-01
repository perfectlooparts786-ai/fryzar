# FRYZAR release readiness

**Current verdict: NOT READY**

## Blocking release gates
- [ ] Latest combined CI passes for API, all 28 current API tests, customer web and admin web.
- [ ] Current Worker source deployed to isolated development Worker.
- [ ] Live HTTP health/catalog/delivery-zone/admin authentication tests pass.
- [ ] Real D1 rollback, idempotency, oversell and exactly-once cancellation tests pass.
- [ ] Owner bootstrap token configured safely and first owner established through the UI.
- [ ] Staff management, role permissions and password/session lifecycle complete.
- [ ] Product/category/inventory/delivery administration complete.
- [ ] Genuine products, prices, images and delivery areas provided by the owner.
- [ ] Customer website complete and browser-tested in Urdu/English.
- [ ] Admin dashboard operations complete and role-tested.
- [ ] COD collection workflow complete.
- [ ] Manual transfer remains disabled until secure proof storage, review, rejection and audit are complete.
- [ ] Android source, installable APK and device tests complete.
- [ ] Support contact/policies configured with genuine business details.
- [ ] Domain structure approved; DNS/TLS/routes/cookies/CORS verified.
- [ ] Backup/restore and rollback rehearsal recorded.
- [ ] No critical data-integrity, security or privacy issue remains.
- [ ] Final release report contains evidence and known limitations.

Do not set \`launch_ready=true\` or open ordering just to make a dashboard appear complete. Every relevant gate must have evidence.  

-- Bounded operational retention indexes. Financial and audit history is never pruned here.
CREATE INDEX idx_idempotency_expiry
ON idempotency_keys(expires_at, id);

CREATE INDEX idx_auth_attempts_retention
ON auth_login_attempts(attempted_at, id);

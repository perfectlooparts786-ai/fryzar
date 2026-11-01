CREATE TABLE bootstrap_claims (
  claim_key TEXT PRIMARY KEY CHECK (claim_key IN ('first_owner')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

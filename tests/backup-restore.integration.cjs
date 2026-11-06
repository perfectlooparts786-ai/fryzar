"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createLocalD1 } = require("./helpers/local-d1-worker.cjs");

function snapshotManifest(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) {
        const relative = path.relative(root, absolute).split(path.sep).join("/");
        const hash = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
        files.push({ path: relative, sha256: hash });
      }
    }
  }
  walk(root);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function main() {
  const db = await createLocalD1();
  try {
    db.execSql(
      "INSERT INTO store_settings (setting_key, value_json, is_public) " +
      "VALUES ('backup_restore_probe', '\"snapshot-ok\"', 0)"
    );

    const backupPath = path.join(db.tempRoot, "backup-snapshot");
    const restorePath = path.join(db.tempRoot, "restored-state");
    db.snapshotTo(backupPath);

    const backupManifest = snapshotManifest(backupPath);
    assert.ok(backupManifest.length > 0, "Local D1 snapshot must contain persisted files");

    // Restore only into a new disposable local persistence directory.
    fs.cpSync(backupPath, restorePath, { recursive: true, errorOnExist: true, force: false });
    assert.deepEqual(snapshotManifest(restorePath), backupManifest, "Restored snapshot file hashes must match");

    const restoredProbe = db.queryRow(
      "SELECT value_json FROM store_settings WHERE setting_key = 'backup_restore_probe'",
      ["value_json"],
      restorePath
    );
    assert.equal(restoredProbe.value_json, '"snapshot-ok"');

    const restoredLedger = db.queryRow(
      "SELECT COUNT(*) AS migration_count FROM d1_migrations",
      ["migration_count"],
      restorePath
    );
    assert.equal(Number(restoredLedger.migration_count), 9);

    const restoredIntegrity = db.queryRow(
      "SELECT COUNT(*) AS violations FROM pragma_foreign_key_check",
      ["violations"],
      restorePath
    );
    assert.equal(Number(restoredIntegrity.violations), 0);

    console.log(
      "Local D1 snapshot/restore rehearsal passed: " + backupManifest.length +
      " persisted files copied, SHA-256 manifests match, sentinel data and nine-migration ledger restored, zero FK violations."
    );
  } finally {
    await db.cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

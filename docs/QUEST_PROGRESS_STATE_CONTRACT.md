# Quest Progress State Contract

Quest progress is server-authoritative, idempotent by event receipt, and versioned by quest revision.

The quest definition is authoritative for valid objective IDs and objective targets. Persisted state may contain only the schema version, quest ID, quest revision, status, objective progress, and processed event receipts.

A repeated event receipt must never increase progress twice. Restored progress must be clamped to the current objective target. Completion is derived from all objective targets rather than trusting a saved status flag. A revision mismatch must not be silently merged.

This lane must reuse school-day timing from PR #179 and existing attendance, learning-progress, and mastery services from the school-building work rather than create parallel implementations.

The normative v1 cases are in `docs/QUEST_PROGRESS_STATE_TEST_VECTORS.json`. Reward values and other product balancing remain outside this contract.

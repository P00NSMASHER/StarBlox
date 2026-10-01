#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
catalog = (ROOT / "src/ServerScriptService/HighSchool/ActivityCatalog.lua").read_text(encoding="utf-8")
core = (ROOT / "src/ServerScriptService/HighSchool/EducationCore.lua").read_text(encoding="utf-8")
service = (ROOT / "src/ServerScriptService/HighSchool/ClassSessionService.server.lua").read_text(encoding="utf-8")

assert 'correctChoiceId = "c"' in catalog
assert 'prompt = "What is 7 + 5?"' in catalog

public_start = core.index("-- PUBLIC_ACTIVITY_BEGIN")
public_end = core.index("-- PUBLIC_ACTIVITY_END")
public_block = core[public_start:public_end]
assert "correctChoiceId" not in public_block, "client/public activity leaks answer authority"

closed_check = core.index("-- CLOSED_CHECK_BEFORE_RECEIPT_CACHE")
receipt_lookup = core.index("local cached = session.receipts[submissionId]")
assert closed_check < receipt_lookup, "closed/resolved session must be rejected before receipt replay"

assert 'session.closed = true' in core
assert 'session.receipts = {}' in core
assert 'FoundationState.getSnapshot()' in service
assert 'foundation.periodId ~= "math"' in service
assert 'isAtAuthoritativeLocation(player, foundation.locationId)' in service
assert 'EducationCore.closeSession(sessionId)' in service
assert 'sessionsByUserId[player.UserId] = nil' in service
assert 'classCompleted:Fire' in service
assert 'completionId = sessionId' in service

for forbidden in ("DataStoreService", "SetAsync", "UpdateAsync"):
    assert forbidden not in core
    assert forbidden not in service

for forbidden in ("BrookhavenWorldRuntime", "BHW_", "PipsQuest", "MazeWorld"):
    assert forbidden not in catalog
    assert forbidden not in core
    assert forbidden not in service

print("canonical class & education static guard: PASS")

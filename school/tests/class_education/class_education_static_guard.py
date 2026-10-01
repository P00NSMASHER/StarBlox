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

assert 'HttpService:GenerateGUID(false)' in core, "session IDs must survive server restarts without collision"
assert "nextSessionNumber" not in core, "process-local counters are not durable completion IDs"
assert 'sessions[sessionId] = nil' in core, "closed sessions must be removed from server memory"
assert 'and not session.resolved' in core, "resolved sessions must not remain owned/active"
assert 'MAX_UNIQUE_SUBMISSIONS_PER_SESSION = 12' in core
assert '#submissionId > MAX_SUBMISSION_ID_LENGTH' in core
assert '#choiceId > MAX_CHOICE_ID_LENGTH' in core
cap_check = core.index("session.uniqueSubmissionCount >= MAX_UNIQUE_SUBMISSIONS_PER_SESSION")
count_increment = core.index("session.uniqueSubmissionCount += 1")
receipt_write = core.index("session.receipts[submissionId] = response")
assert cap_check < count_increment < receipt_write, "submission cap must precede receipt growth"
assert 'reason = "TOO_MANY_SUBMISSIONS"' in core

assert 'FoundationState.getSnapshot()' in service
assert 'foundation.periodId ~= ACTIVE_CLASS_ID' in service
assert service.count('isAtAuthoritativeLocation(player, foundation.locationId)') >= 2, "location must be checked at start and submit"
assert 'reason = "LEFT_CLASS_LOCATION"' in service
assert 'GetAttributeChangedSignal("PeriodId")' in service
assert 'closeSessionsOutsideActivePeriod' in service
assert 'reason = "CLASS_PERIOD_ENDED"' in service
assert 'player.CharacterAdded:Connect' in service
assert 'closeSessionForUser(player.UserId)' in service
assert 'EducationCore.closeSession(sessionId)' in service
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

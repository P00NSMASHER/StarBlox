#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
catalog = (ROOT / "src/ServerScriptService/HighSchool/ActivityCatalog.lua").read_text(encoding="utf-8")
session = (ROOT / "src/ServerScriptService/HighSchool/EducationSession.lua").read_text(encoding="utf-8")
core = (ROOT / "src/ServerScriptService/HighSchool/EducationCore.lua").read_text(encoding="utf-8")
service = (ROOT / "src/ServerScriptService/HighSchool/ClassSessionService.server.lua").read_text(encoding="utf-8")

assert 'correctChoiceId = "c"' in catalog
assert 'prompt = "What is 7 + 5?"' in catalog

public_block_start = session.index("function EducationSession.getPublicActivity")
public_block_end = session.index("function EducationSession.submit")
public_block = session[public_block_start:public_block_end]
assert "correctChoiceId" not in public_block, "client/public activity leaks answer authority"

assert 'HttpService:GenerateGUID(false)' in core, "session IDs must survive server restarts without collision"
assert 'EducationSession.new' in core
assert 'EducationSession.submit' in core
assert 'EducationSession.close' in core
assert 'sessions[sessionId] = nil' in core, "closed sessions must be removed from server memory"

assert 'MAX_UNIQUE_SUBMISSIONS_PER_SESSION = 12' in session
assert '#submissionId > EducationSession.MAX_SUBMISSION_ID_LENGTH' in session
assert '#choiceId > EducationSession.MAX_CHOICE_ID_LENGTH' in session
cap_check = session.index("session.uniqueSubmissionCount >= EducationSession.MAX_UNIQUE_SUBMISSIONS_PER_SESSION")
count_increment = session.index("session.uniqueSubmissionCount += 1")
receipt_write = session.index("session.receipts[submissionId] = response")
assert cap_check < count_increment < receipt_write, "submission cap must precede receipt growth"
assert 'reason = "TOO_MANY_SUBMISSIONS"' in session
assert 'and not session.resolved' in session

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
    assert forbidden not in session
    assert forbidden not in core
    assert forbidden not in service

for forbidden in ("BrookhavenWorldRuntime", "BHW_", "PipsQuest", "MazeWorld"):
    assert forbidden not in catalog
    assert forbidden not in session
    assert forbidden not in core
    assert forbidden not in service

print("canonical class & education static guard: PASS")

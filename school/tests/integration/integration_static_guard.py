#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
project = json.loads((ROOT / "default.project.json").read_text(encoding="utf-8"))
project_text = json.dumps(project).lower()

assert "highschool/" not in project_text, "canonical project must not map staging root"
for forbidden in ("pipsquest", "maze", "brookhaven", "bhw_", "rhs"):
    assert forbidden not in project_text, f"retired runtime mapped: {forbidden}"

server_root = ROOT / "src/ServerScriptService/HighSchool"
client_root = ROOT / "src/ReplicatedStorage/HighSchool"

clock_service = (server_root / "SchoolClockService.server.lua").read_text(encoding="utf-8")
class_service = (server_root / "ClassSessionService.server.lua").read_text(encoding="utf-8")
progression_service = (server_root / "ProgressionService.server.lua").read_text(encoding="utf-8")
bootstrap = (server_root / "ClientBootstrap.server.lua").read_text(encoding="utf-8")
client = (client_root / "Mobile/SchoolClient.client.lua").read_text(encoding="utf-8")
destination_service = (server_root / "DestinationInteractionService.server.lua").read_text(encoding="utf-8")
destination_feedback = (client_root / "Mobile/DestinationFeedback.client.lua").read_text(encoding="utf-8")
courier = (server_root / "CampusCourierActivity.lua").read_text(encoding="utf-8")
route_layout = (client_root / "CampusRouteLayout.lua").read_text(encoding="utf-8")

assert len(list((ROOT / "src").rglob("SchoolClockService.server.lua"))) == 1
assert len(list((ROOT / "src").rglob("ClassSessionService.server.lua"))) == 1
assert len(list((ROOT / "src").rglob("ProgressionService.server.lua"))) == 1
assert len(list((ROOT / "src").rglob("DestinationInteractionService.server.lua"))) == 1
assert len(list((ROOT / "src").rglob("DestinationFeedback.client.lua"))) == 1
assert len(list((ROOT / "src").rglob("CampusCourierActivity.lua"))) == 1

assert 'FoundationState.getSnapshot()' in class_service
assert 'classCompleted:Fire' in class_service
assert 'classCompleted.Event:Connect' in progression_service
assert 'ProgressionStore.applyCompletion(completion)' in progression_service
assert 'GetProgression' in progression_service
assert 'WaitForChild("BeginClass")' in client
assert 'WaitForChild("SubmitAnswer")' in client
assert 'WaitForChild("LeaveClass")' in client
assert 'WaitForChild("GetProgression")' in client
assert 'WaitForChild("SchoolClient")' in bootstrap
assert 'WaitForChild("DestinationFeedback")' in bootstrap

assert 'for _, location in ipairs(FoundationConfig.LOCATIONS)' in destination_service
assert 'registry:WaitForChild(location.id)' in destination_service
assert 'local function connectDestinationPrompt(marker, location)' in destination_service
assert 'campus:WaitForChild(FoundationConfig.SPAWN_NAME)' in destination_service
assert 'id = "entrance"' in destination_service
assert 'name = "Front Entrance"' in destination_service
assert 'prompt.ActionText = "Check In"' in destination_service
assert 'prompt.HoldDuration = 0' in destination_service
assert 'prompt.MaxActivationDistance = 12' in destination_service
distance_check = destination_service.index('(root.Position - marker.Position).Magnitude > MAX_CHECK_IN_DISTANCE')
courier_payload = destination_service.index('local payload = applyCourierCheckIn(player, location)')
fire_client = destination_service.index('destinationVisited:FireClient(player, payload)')
assert distance_check < courier_payload < fire_client, (
    "server distance validation and courier authority must precede client feedback"
)
assert 'CampusCourierActivity.checkIn(' in destination_service
assert 'CHECK_IN_COOLDOWN_SECONDS = 0.75' in destination_service
assert 'CampusCourierActivity.new(' in destination_service
assert 'FoundationState.getSnapshot()' in destination_service
assert 'local scheduleNamespace = game.JobId' in destination_service
assert 'scheduleNamespace = HttpService:GenerateGUID(false)' in destination_service
assert 'CampusCourierActivity.getDailyInstanceId(' in destination_service
assert 'CampusCourierActivity.ROUTE[1].locationId' in destination_service
assert 'local discoveredCourierByUserId = {}' in destination_service
assert 'local function courierStartCue()' in destination_service
assert 'local firstStop = CampusCourierActivity.ROUTE[1]' in destination_service
assert 'activityId = CampusCourierActivity.ACTIVITY_ID' in destination_service
assert 'remainingStops = #CampusCourierActivity.ROUTE' in destination_service
assert 'progressLabel = string.format("0/%d stops", #CampusCourierActivity.ROUTE)' in destination_service
assert 'nextLocationId = firstStop.locationId' in destination_service
assert 'nextActionLabel = firstStop.actionLabel' in destination_service
assert 'objective = firstStop.objective' in destination_service
assert 'availableRewardPoints = state.rewardPoints' in destination_service
assert 'availableRewardPoints = CampusCourierActivity.REWARD_POINTS' in destination_service
assert 'availableRewardPoints = courierResponse and CampusCourierActivity.REWARD_POINTS or 0' in destination_service
assert 'rewardPoints = 0' in destination_service, (
    "advertised reward must not be confused with earned reward before completion"
)
assert 'rewardPoints = courierResponse and courierResponse.rewardPoints or 0' in destination_service
assert 'courierStartCue()' in destination_service
cue_definition = destination_service.index('local function courierStartCue()')
cue_use = destination_service.index('courierStartCue()', cue_definition + 1)
route_progress = destination_service.index('local response = CampusCourierActivity.checkIn(')
assert cue_definition < cue_use < route_progress, (
    "pre-route lobby guidance must be authored before ordinary route progression"
)
assert 'CampusCourierActivity.buildCompletion(courier, os.time())' in destination_service
assert 'resolved = courierResponse and courierResponse.resolved or false' in destination_service
assert 'remainingStops = state.remainingStops' in destination_service
assert 'remainingStops = courierResponse and courierResponse.remainingStops or nil' in destination_service
assert 'courierResponse.progressLabel or string.format(' in destination_service
assert 'nextLocationName = state.nextLocationName' in destination_service
assert 'nextActionLabel = state.nextActionLabel' in destination_service
assert 'nextLocationName = courierResponse and courierResponse.nextLocationName or nil' in destination_service
assert 'nextActionLabel = courierResponse and courierResponse.nextActionLabel or nil' in destination_service
assert 'objective = courierResponse and courierResponse.objective or nil' in destination_service
assert 'completedCourierByUserId[player.UserId] == courierInstanceId' in destination_service
assert 'local function getCourierInstanceId(player)' in destination_service
assert 'local function getCurrentCourier(player, courierInstanceId)' in destination_service
assert destination_service.count('local courierInstanceId = getCourierInstanceId(player)') == 2, (
    "snapshot restoration and check-ins must use the same current-day route identity"
)
assert destination_service.count('local courier = getCurrentCourier(player, courierInstanceId)') == 2, (
    "snapshot restoration and check-ins must both expire stale routes"
)
active_lookup = destination_service.index('local courier = activeCourierByUserId[player.UserId]')
rollover_check = destination_service.index(
    'if courier and courier.activityInstanceId ~= courierInstanceId then'
)
rollover_close = destination_service.index('CampusCourierActivity.close(courier)', rollover_check)
rollover_clear = destination_service.index(
    'activeCourierByUserId[player.UserId] = nil',
    rollover_check,
)
route_start = destination_service.index(
    'if not courier and location.id == CampusCourierActivity.ROUTE[1].locationId then'
)
route_progress = destination_service.index('local response = CampusCourierActivity.checkIn(')
assert active_lookup < rollover_check < rollover_close < rollover_clear < route_start < route_progress, (
    "a stale daily route must close before current-day start/progress"
)
assert 'runtime:GetAttributeChangedSignal("DayIndex"):Connect(expireStaleCouriers)' in destination_service
assert 'routeExpired = true' in destination_service
expiry_start = destination_service.index('local function expireStaleCouriers()')
expiry_lookup = destination_service.index('Players:GetPlayerByUserId(userId)', expiry_start)
expiry_identity = destination_service.index(
    'courier.activityInstanceId ~= courierInstanceId',
    expiry_start,
)
expiry_close = destination_service.index('CampusCourierActivity.close(courier)', expiry_start)
expiry_clear = destination_service.index('activeCourierByUserId[userId] = nil', expiry_start)
expiry_notify = destination_service.index(
    'destinationVisited:FireClient(player, routeExpiredPayload())',
    expiry_start,
)
day_signal = destination_service.index(
    'runtime:GetAttributeChangedSignal("DayIndex"):Connect(expireStaleCouriers)'
)
assert expiry_start < expiry_lookup < expiry_identity < expiry_close < expiry_clear < expiry_notify < day_signal, (
    "day rollover must close and clear stale routes before notifying the client"
)
discovery_expiry_loop = destination_service.index(
    "for userId, courierInstanceId in pairs(discoveredCourierByUserId) do",
    expiry_notify,
)
discovery_expiry_lookup = destination_service.index(
    "Players:GetPlayerByUserId(userId)",
    discovery_expiry_loop,
)
discovery_expiry_current = destination_service.index(
    "local currentCourierInstanceId = player and getCourierInstanceId(player) or nil",
    discovery_expiry_loop,
)
discovery_expiry_check = destination_service.index(
    "if currentCourierInstanceId and courierInstanceId ~= currentCourierInstanceId then",
    discovery_expiry_loop,
)
discovery_expiry_clear = destination_service.index(
    "discoveredCourierByUserId[userId] = nil",
    discovery_expiry_loop,
)
discovery_expiry_notify = destination_service.index(
    "destinationVisited:FireClient(player, routeExpiredPayload())",
    discovery_expiry_loop,
)
assert (
    expiry_notify
    < discovery_expiry_loop
    < discovery_expiry_lookup
    < discovery_expiry_current
    < discovery_expiry_check
    < discovery_expiry_clear
    < discovery_expiry_notify
    < day_signal
), "day rollover must clear and notify discovery-only courier guidance"
assert destination_service.count(
    "destinationVisited:FireClient(player, routeExpiredPayload())"
) == 2, "active and discovery-only rollover paths must both notify mobile guidance"
assert 'completedCourierByUserId[player.UserId] = courier.activityInstanceId' in destination_service
assert 'classCompleted:Fire(completion)' in destination_service
assert 'activeCourierByUserId[player.UserId] = nil' in destination_service
assert destination_service.count('HttpService:GenerateGUID(false)') == 2, (
    "GUIDs are limited to the Studio schedule fallback and transient check-in receipts"
)
assert 'getDestinationState.Name = "GetDestinationState"' in destination_service
assert 'getDestinationState.OnServerInvoke = function(player)' in destination_service
assert 'discoveredCourierByUserId[player.UserId] == courierInstanceId' in destination_service
assert 'return courierStartCue()' in destination_service
snapshot_start = destination_service.index('getDestinationState.OnServerInvoke = function(player)')
snapshot_instance = destination_service.index(
    'local courierInstanceId = getCourierInstanceId(player)',
    snapshot_start,
)
snapshot_current = destination_service.index(
    'local courier = getCurrentCourier(player, courierInstanceId)',
    snapshot_start,
)
snapshot_discovered = destination_service.index(
    'discoveredCourierByUserId[player.UserId] == courierInstanceId',
    snapshot_start,
)
snapshot_start_cue = destination_service.index('return courierStartCue()', snapshot_start)
snapshot_payload = destination_service.index('return courierStatePayload(courier)', snapshot_start)
assert (
    snapshot_start
    < snapshot_instance
    < snapshot_current
    < snapshot_discovered
    < snapshot_start_cue
    < snapshot_payload
), "late-starting mobile UI must restore discovered and active objectives safely"
assert 'CampusCourierActivity.getPublicState(courier)' in destination_service
discovery_record = destination_service.index(
    'discoveredCourierByUserId[player.UserId] = courierInstanceId'
)
pre_route_payload = destination_service.index(
    '"Checked in at " .. location.name .. ". Visit the Main Lobby to start Campus Courier!"'
)
assert discovery_record < pre_route_payload, (
    "pre-route discovery must be retained before mobile guidance is sent"
)
assert destination_service.count('discoveredCourierByUserId[player.UserId] = nil') == 3, (
    "discovery state must clear on route start, completion, and player removal"
)
assert 'OnServerEvent' not in destination_service
assert 'DataStoreService' not in destination_service

assert 'DestinationVisited")' in destination_feedback
assert 'destinationVisited.OnClientEvent:Connect' in destination_feedback
assert 'constraint.MinSize = Vector2.new(260, 64)' in destination_feedback
assert 'local activeRouteText = nil' in destination_feedback
assert 'payload.activityId ~= COURIER_ACTIVITY_ID' in destination_feedback
assert 'payload.routeExpired == true' in destination_feedback
expiry_ui = destination_feedback.index('if payload.routeExpired == true then')
expiry_ui_clear = destination_feedback.index('activeRouteText = nil', expiry_ui)
expiry_ui_return = destination_feedback.index('return', expiry_ui)
resolved_ui = destination_feedback.index('if payload.resolved == true then')
assert expiry_ui < expiry_ui_clear < expiry_ui_return < resolved_ui, (
    "mobile feedback must clear a stale route before processing ordinary completion state"
)
assert 'payload.resolved == true' in destination_feedback
assert 'type(payload.nextActionLabel) == "string"' in destination_feedback
assert 'type(payload.remainingStops) == "number"' in destination_feedback
assert 'payload.remainingStops % 1 == 0' in destination_feedback
assert 'payload.remainingStops <= MAX_COURIER_STOPS' in destination_feedback
assert 'local function formatRemainingStops(count)' in destination_feedback
assert '.. formatRemainingStops(payload.remainingStops)' in destination_feedback
assert 'activeRouteText = "Campus Courier • "' in destination_feedback
assert '.. payload.nextActionLabel' in destination_feedback
assert 'label.Text = activeRouteText' in destination_feedback
assert 'task.delay(2.5' in destination_feedback
assert 'getDestinationState:InvokeServer()' in destination_feedback
assert 'displaySequence ~= sequenceAtRequest' in destination_feedback
assert destination_feedback.count("InvokeServer") == 1
assert 'local MAX_COURIER_REWARD_POINTS = 10' in destination_feedback
assert 'type(payload.availableRewardPoints) == "number"' in destination_feedback
assert 'payload.availableRewardPoints >= 1' in destination_feedback
assert 'payload.availableRewardPoints % 1 == 0' in destination_feedback
assert 'payload.availableRewardPoints <= MAX_COURIER_REWARD_POINTS' in destination_feedback
assert '.. tostring(payload.availableRewardPoints)' in destination_feedback
assert '.. " pts"' in destination_feedback
for forbidden in ("FireServer", "DataStoreService", "SetAsync", "UpdateAsync"):
    assert forbidden not in destination_feedback, f"destination feedback contains forbidden authority: {forbidden}"

assert 'CampusCourierActivity.REWARD_POINTS = 5' in courier
assert 'description = "Follow a short five-stop delivery loop through Pip High and its entrance."' in courier
assert courier.count('locationId = "lobby"') == 2
assert 'objective = "Return the signed delivery sheet to the Main Lobby."' in courier
courier_location_ids = re.findall(r'locationId\s*=\s*"([^"]+)"', courier)
campus_edges = {
    frozenset((origin, destination))
    for origin, destination in re.findall(
        r'fromId\s*=\s*"([^"]+)",\s*toId\s*=\s*"([^"]+)"',
        route_layout,
    )
}
assert courier_location_ids == ["lobby", "entrance", "cafeteria", "gym", "lobby"], (
    "courier route must use the reviewed connected-campus loop"
)
assert all(
    frozenset((origin, destination)) in campus_edges
    for origin, destination in zip(courier_location_ids, courier_location_ids[1:])
), "every courier leg must follow a directly marked campus route"
assert 'progressLabel = formatProgress(activity)' in courier
assert courier.count('remainingStops = getRemainingStops(activity)') == 2
assert courier.count('nextActionLabel = nextStop and nextStop.actionLabel or nil') == 2
assert 'CampusCourierActivity.MAX_ACTION_LABEL_LENGTH = 10' in courier
for action_label in ("PICK UP", "STAMP", "DELIVER", "DROP OFF", "RETURN"):
    assert courier.count(f'actionLabel = "{action_label}"') == 1
assert 'function CampusCourierActivity.getDailyInstanceId(playerId, scheduleNamespace, dayIndex)' in courier
assert '"player:%d:schedule:%s:day:%d:%s"' in courier
assert 'scheduleNamespace:match("^[%w_%-]+$")' in courier
assert 'CampusCourierActivity.COMPLETION_CLASS_ID = "activity:campus_courier"' in courier
assert 'UpdateAsync' not in client
assert 'DataStoreService' not in client
assert 'correctChoiceId' not in client
assert 'SetAsync' not in progression_service

for text in (
    clock_service,
    class_service,
    progression_service,
    bootstrap,
    client,
    destination_service,
    destination_feedback,
    courier,
):
    for forbidden in ("BrookhavenWorldRuntime", "BHW_", "PipsQuest", "MazeWorld"):
        assert forbidden not in text, f"retired runtime dependency found: {forbidden}"

print("canonical integration static guard: PASS")

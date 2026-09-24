
export const ROBLOX_BACKBONE_VERSION='starblox-roblox-backbone-v1';

export const PROFILE_TEMPLATE=Object.freeze({
  SchemaVersion:1,
  Economy:Object.freeze({Coins:0,XP:0,Stars:0,TransferWins:0}),
  Progress:Object.freeze({Districts:Object.freeze({}),MasteredSkills:Object.freeze([])}),
  Learning:Object.freeze({
    Concepts:Object.freeze({}),
    Ability:Object.freeze({Theta:0,StandardError:1,ResponseCount:0}),
    RecentQuestionIds:Object.freeze([]),
    RecentConceptIds:Object.freeze([]),
    WrongStreak:0
  }),
  Daily:Object.freeze({LastDailyId:'',Completed:Object.freeze({}),Streak:0}),
  Inventory:Object.freeze({Cosmetics:Object.freeze({}),Equipped:Object.freeze({})}),
  Settings:Object.freeze({MusicVolume:0.6,DiagnosticsEnabled:false}),
  Rollout:Object.freeze({Assignments:Object.freeze({})}),
  AiNpc:Object.freeze({
    Memories:Object.freeze({}),
    ProcessedRequestIds:Object.freeze([])
  }),
  Social:Object.freeze({
    Home:Object.freeze({PlotId:'',Placements:Object.freeze({})}),
    NpcAffinity:Object.freeze({}),
    UnlockedSocialItems:Object.freeze({}),
    Stats:Object.freeze({PhotosTaken:0,CoopPhotos:0,MinigameWins:0}),
    CompletedSessionIds:Object.freeze([]),
    AffinityEventIds:Object.freeze([])
  }),
  LiveOps:Object.freeze({
    Counters:Object.freeze({}),
    Missions:Object.freeze({}),
    Seasons:Object.freeze({}),
    Engagement:Object.freeze({
      LastVisitDate:'',
      Streak:0,
      PlaySeconds:0,
      Claimed:Object.freeze({})
    }),
    Bundles:Object.freeze({Purchased:Object.freeze({})}),
    ProcessedEventIds:Object.freeze([])
  })
});

export const NETWORK_CONTRACT=Object.freeze([
  Object.freeze({name:'SubmitQuestionAttempt',from:'Client',type:'Reliable'}),
  Object.freeze({name:'SubmitReplayChunk',from:'Client',type:'Reliable'}),
  Object.freeze({name:'QuestState',from:'Server',type:'Reliable'}),
  Object.freeze({name:'DailyState',from:'Server',type:'Reliable'}),
  Object.freeze({name:'GhostSample',from:'Server',type:'Unreliable'}),
  Object.freeze({name:'ClaimLiveOpsReward',from:'Client',type:'Reliable'}),
  Object.freeze({name:'LiveOpsState',from:'Server',type:'Reliable'}),
  Object.freeze({name:'RequestPlaceItem',from:'Client',type:'Reliable'}),
  Object.freeze({name:'RequestRemoveItem',from:'Client',type:'Reliable'}),
  Object.freeze({name:'RequestSocialMinigame',from:'Client',type:'Reliable'}),
  Object.freeze({name:'SocialWorldState',from:'Server',type:'Reliable'}),
  Object.freeze({name:'RequestNpcTurn',from:'Client',type:'Reliable'}),
  Object.freeze({name:'NpcTurn',from:'Server',type:'Reliable'})
]);

export const REPLICATION_BOUNDARIES=Object.freeze({
  durableServerOnly:Object.freeze([
    'Learning.Concepts',
    'Learning.Ability',
    'Learning.RecentQuestionIds',
    'Learning.RecentConceptIds',
    'Learning.WrongStreak',
    'Daily.Completed',
    'Settings',
    'LiveOps.ProcessedEventIds',
    'Social.CompletedSessionIds',
    'Social.AffinityEventIds',
    'AiNpc.Memories',
    'AiNpc.ProcessedRequestIds'
  ]),
  playerReplica:Object.freeze([
    'SchemaVersion',
    'Economy',
    'Progress',
    'Daily.LastDailyId',
    'Daily.Streak',
    'Inventory',
    'Rollout.Assignments',
    'LiveOps',
    'Social'
  ]),
  ephemeralEcs:Object.freeze([
    'Model','Transform','Velocity','Health','Npc','Interactable',
    'QuestMarker','District','Vehicle','Owner','Replicated','Dirty'
  ])
});

export function validateRobloxBackboneContract(){
  const errors=[];
  if(PROFILE_TEMPLATE.SchemaVersion !== 1) errors.push('profile schema version mismatch');

  const names=new Set();
  for(const event of NETWORK_CONTRACT){
    if(names.has(event.name)) errors.push('duplicate network event: ' + event.name);
    names.add(event.name);
    if(!['Client','Server'].includes(event.from)) errors.push('invalid network direction: ' + event.name);
    if(!['Reliable','Unreliable'].includes(event.type)) errors.push('invalid network reliability: ' + event.name);
  }

  const durable=new Set(REPLICATION_BOUNDARIES.durableServerOnly);
  for(const exposed of REPLICATION_BOUNDARIES.playerReplica){
    if(durable.has(exposed)) errors.push('server-only state exposed by player replica: ' + exposed);
  }

  return {ok:errors.length === 0,errors};
}

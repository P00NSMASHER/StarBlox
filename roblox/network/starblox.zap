event SubmitQuestionAttempt = {
	from: Client,
	type: Reliable,
	call: ManyAsync,
	data: (SessionId: string.utf8, AttemptId: string.utf8, ChoiceIndex: u8)
}

event SubmitReplayChunk = {
	from: Client,
	type: Reliable,
	call: ManyAsync,
	data: (ReplayId: string.utf8, ChunkIndex: u16, Chunk: string.utf8)
}

event QuestState = {
	from: Server,
	type: Reliable,
	call: ManyAsync,
	data: (QuestionId: string.utf8, Version: u16, ContentHash: string.utf8, Retry: boolean)
}

event DailyState = {
	from: Server,
	type: Reliable,
	call: ManyAsync,
	data: (DailyId: string.utf8, ReleaseId: string.utf8, BundleHash: string.utf8)
}

event GhostSample = {
	from: Server,
	type: Unreliable,
	call: ManyAsync,
	data: (ReplayId: string.utf8, Tick: u32, X: f32, Y: f32, Z: f32)
}


event ClaimLiveOpsReward = {
	from: Client,
	type: Reliable,
	call: ManyAsync,
	data: (ClaimType: string.utf8, ClaimId: string.utf8)
}

event LiveOpsState = {
	from: Server,
	type: Reliable,
	call: ManyAsync,
	data: (StateHash: string.utf8)
}


event RequestPlaceItem = {
	from: Client,
	type: Reliable,
	call: ManyAsync,
	data: (ItemId: string.utf8, PlotId: string.utf8, X: f32, Y: f32, Z: f32, RotationY: f32)
}

event RequestRemoveItem = {
	from: Client,
	type: Reliable,
	call: ManyAsync,
	data: (PlacementId: string.utf8)
}

event RequestSocialMinigame = {
	from: Client,
	type: Reliable,
	call: ManyAsync,
	data: (GameId: string.utf8, NpcId: string.utf8)
}

event SocialWorldState = {
	from: Server,
	type: Reliable,
	call: ManyAsync,
	data: (StateHash: string.utf8)
}


event RequestNpcTalk = {
	from: Client,
	type: Reliable,
	call: ManyAsync,
	data: (NpcId: string.utf8, Message: string.utf8)
}

event NpcTalkResponse = {
	from: Server,
	type: Reliable,
	call: ManyAsync,
	data: (NpcId: string.utf8, TurnId: string.utf8, Text: string.utf8)
}


event MovementInput = {
	from: Client,
	type: Unreliable,
	call: ManyAsync,
	data: (Sequence: u32, ClientTime: f64, DeltaTime: f32, MoveX: f32, MoveZ: f32, Jump: boolean, LookYaw: f32, ActionBits: u16)
}

event HitscanIntent = {
	from: Client,
	type: Reliable,
	call: ManyAsync,
	data: (Sequence: u32, ClientShotTime: f64, OriginX: f32, OriginY: f32, OriginZ: f32, DirX: f32, DirY: f32, DirZ: f32, WeaponId: string.utf8)
}

event ActionSnapshot = {
	from: Server,
	type: Unreliable,
	call: ManyAsync,
	data: (LastSequence: u32, ServerTime: f64, X: f32, Y: f32, Z: f32, VelX: f32, VelY: f32, VelZ: f32)
}

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

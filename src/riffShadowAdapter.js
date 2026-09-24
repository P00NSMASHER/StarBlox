export const RIFF_SHADOW_ADAPTER_VERSION = 'starblox-riff-shadow-v1';

export const RIFF_RATING = Object.freeze({
  AGAIN:1,
  HARD:2,
  GOOD:3,
  EASY:4
});

export function learningEventToRiffRating(event){
  if(!event?.correct) return RIFF_RATING.AGAIN;
  if(event?.assisted || !event?.firstAttempt) return RIFF_RATING.HARD;
  return RIFF_RATING.GOOD;
}

export function buildRiffReviewCommands(events){
  const commands = [];
  for(const event of events || []){
    const concepts = Array.isArray(event?.conceptIds) ? event.conceptIds : [];
    for(const conceptId of concepts){
      commands.push({
        adapterVersion:RIFF_SHADOW_ADAPTER_VERSION,
        eventId:String(event.eventId),
        cardId:String(conceptId),
        blockId:String(event.questionId),
        rating:learningEventToRiffRating(event),
        reviewedAt:Number(event.timestamp) || 0,
        masteryEligible:Boolean(event.masteryEligible)
      });
    }
  }
  return commands.sort(
    (a,b) => a.reviewedAt - b.reviewedAt || a.eventId.localeCompare(b.eventId) || a.cardId.localeCompare(b.cardId)
  );
}

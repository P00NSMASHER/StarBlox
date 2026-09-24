import { validateLearningEvent } from './learningContracts.js';

export const LEARNING_LEDGER_VERSION = 'starblox-learning-ledger-v1';
export const DEFAULT_LEDGER_LIMIT = 512;

export function createLearningLedger(value={}){
  return {
    version:LEARNING_LEDGER_VERSION,
    events:Array.isArray(value?.events) ? [...value.events] : []
  };
}

export function appendLearningEvent(ledger,event,{limit=DEFAULT_LEDGER_LIMIT}={}){
  const issues = validateLearningEvent(event);
  if(issues.length){
    throw new Error('invalid learning event: ' + issues.join(','));
  }

  const current = createLearningLedger(ledger);
  const deduped = current.events.filter(row => row.eventId !== event.eventId);
  const events = [...deduped,event]
    .sort((a,b) => a.timestamp - b.timestamp || a.eventId.localeCompare(b.eventId))
    .slice(-Math.max(1,Number(limit) || DEFAULT_LEDGER_LIMIT));

  return {
    version:LEARNING_LEDGER_VERSION,
    events
  };
}

export function learningEventsForSkill(ledger,skill){
  return createLearningLedger(ledger).events.filter(
    event => event.skill === String(skill)
  );
}

export function masteryEvidenceEvents(ledger){
  return createLearningLedger(ledger).events.filter(
    event => event.firstAttempt && !event.assisted && event.masteryEligible
  );
}

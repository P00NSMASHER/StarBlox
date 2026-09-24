export const EDGAMECLAW_SHADOW_ADAPTER_VERSION = 'starblox-edgameclaw-shadow-v1';
export const INTERACTION_CANDIDATE_SCHEMA_VERSION = 'starblox-interaction-candidate-v1';

function slug(value){
  return String(value || 'untitled')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'') || 'untitled';
}

function unique(values){
  return [...new Set((values || []).map(String).filter(Boolean))];
}

export function adaptEdGameClawCourseStructure(payload,{
  contentVersion='shadow-generated-v1',
  sourceIds=[]
}={}){
  const course = payload?.course || {};
  const chunks = Array.isArray(payload?.chunks) ? payload.chunks : [];
  const courseKey = slug(course.id || course.title || 'course');

  return chunks.map((chunk,index) => {
    const title = String(chunk?.title || 'Untitled concept');
    const id = String(chunk?.id || 'chunk-' + (index + 1));
    return {
      schemaVersion:INTERACTION_CANDIDATE_SCHEMA_VERSION,
      adapterVersion:EDGAMECLAW_SHADOW_ADAPTER_VERSION,
      id:'edgameclaw:' + courseKey + ':' + slug(id),
      contentVersion:String(contentVersion),
      title,
      sourceText:String(chunk?.content || ''),
      conceptIds:unique(
        chunk?.conceptIds?.length ? chunk.conceptIds : ['generated:' + slug(title)]
      ),
      sourceIds:unique(sourceIds),
      evidenceSpans:(Array.isArray(chunk?.evidenceSpans)
        ?chunk.evidenceSpans
          .map(span=>({
            sourceId:String(span?.sourceId||''),
            text:String(span?.text||'')
          }))
          .filter(span=>span.sourceId||span.text)
        :[]),
      mechanic:String(chunk?.mechanic || 'custom_simulation'),
      simulationHint:String(chunk?.simulationHint || ''),
      assessment:chunk?.assessment ? {
        subject:String(chunk.assessment.subject || ''),
        district:String(chunk.assessment.district || ''),
        skill:String(chunk.assessment.skill || ''),
        role:String(chunk.assessment.role || ''),
        prompt:String(chunk.assessment.prompt || ''),
        choices:Array.isArray(chunk.assessment.choices)
          ?chunk.assessment.choices.map(String)
          :[],
        answer:String(chunk.assessment.answer || ''),
        explanation:String(chunk.assessment.explanation || ''),
        hint:String(chunk.assessment.hint || ''),
        difficulty:Number(chunk.assessment.difficulty || 0),
        reward:Number(chunk.assessment.reward || 0),
        requestedMasteryEligible:Boolean(chunk.assessment.masteryEligible)
      } : null,
      status:'shadow-candidate',
      generator:{
        system:'edgameclaw',
        stage:'course-structure-adapter'
      }
    };
  });
}

export function validateInteractionCandidate(candidate){
  const issues = [];
  if(candidate?.schemaVersion !== INTERACTION_CANDIDATE_SCHEMA_VERSION) issues.push('schema-version');
  if(!candidate?.id) issues.push('missing-id');
  if(!candidate?.title) issues.push('missing-title');
  if(!candidate?.contentVersion) issues.push('missing-content-version');
  if(!Array.isArray(candidate?.conceptIds) || !candidate.conceptIds.length) issues.push('missing-concepts');
  if(!candidate?.mechanic) issues.push('missing-mechanic');
  if(!['shadow-candidate','evidence-bound-shadow-candidate'].includes(candidate?.status)){
    issues.push('unexpected-status');
  }
  if('html' in (candidate || {}) || 'javascript' in (candidate || {}) || 'code' in (candidate || {})){
    issues.push('executable-payload-not-allowed');
  }
  return issues;
}

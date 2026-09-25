import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createPlaytestRun,
  finalizePlaytestRun,
  recordPlaytestScreen,
  verifyPlaytestReceipt
} from './playtestEvidence.js';

function makeRunId(){
  if(typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'){
    return 'pt-' + crypto.randomUUID();
  }
  return 'pt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
}

function downloadReceipt(receipt){
  const blob=new Blob([JSON.stringify(receipt,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download='starblox-playtest-receipt.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PlaytestPanel({save,screen}){
  const enabled=useMemo(() => {
    if(typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('playtest') === '1';
  },[]);
  const [context,setContext]=useState('adult_external');
  const [consent,setConsent]=useState(false);
  const [run,setRun]=useState(null);
  const [feedback,setFeedback]=useState('positive');
  const [wouldPlayAgain,setWouldPlayAgain]=useState(true);
  const [receipt,setReceipt]=useState(null);
  const lastScreen=useRef(null);

  useEffect(() => {
    if(!enabled || !run || run.endedAt) return;
    if(lastScreen.current === screen) return;
    lastScreen.current=screen;
    setRun(current => current
      ? recordPlaytestScreen(current,{screen,at:new Date().toISOString()})
      : current
    );
  },[enabled,run?.runId,run?.endedAt,screen]);

  if(!enabled) return null;

  const start=() => {
    const startedAt=new Date().toISOString();
    lastScreen.current=null;
    setReceipt(null);
    setRun(createPlaytestRun({
      runId:makeRunId(),
      startedAt,
      testerContext:context,
      consentConfirmed:consent,
      saveSnapshot:save
    }));
  };

  const finish=() => {
    const next=finalizePlaytestRun(run,{
      endedAt:new Date().toISOString(),
      feedback,
      wouldPlayAgain,
      saveSnapshot:save
    });
    const validation=verifyPlaytestReceipt(next);
    if(!validation.ok) throw new Error(validation.errors.join('; '));
    setRun(next);
    setReceipt(next);
  };

  const box={
    position:'fixed',
    right:12,
    bottom:12,
    zIndex:10000,
    width:300,
    maxWidth:'calc(100vw - 24px)',
    background:'#fff',
    color:'#111827',
    border:'2px solid #111827',
    borderRadius:14,
    padding:12,
    boxShadow:'0 12px 36px rgba(0,0,0,.18)',
    fontSize:13
  };

  return (
    <aside style={box} aria-label="Local playtest evidence panel">
      <b>Playtest Evidence Mode</b>
      <div style={{marginTop:6,color:'#4b5563'}}>
        Local only. No names, email, device ID, or background upload.
      </div>

      {!run ? (
        <>
          <label style={{display:'block',marginTop:10}}>
            Tester context
            <select value={context} onChange={e => setContext(e.target.value)} style={{width:'100%',marginTop:4}}>
              <option value="adult_external">External adult tester</option>
              <option value="supervised_minor_external">Supervised external child tester</option>
              <option value="internal_staff">Internal/developer tester</option>
            </select>
          </label>
          <label style={{display:'flex',gap:7,marginTop:10,alignItems:'flex-start'}}>
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
            <span>I confirm this is an opt-in playtest and I will not enter identifying information.</span>
          </label>
          <button onClick={start} disabled={!consent} style={{marginTop:10,width:'100%'}}>Start playtest</button>
        </>
      ) : !receipt ? (
        <>
          <div style={{marginTop:10}}>Session active · current screen: <b>{screen}</b></div>
          <label style={{display:'block',marginTop:10}}>
            Overall feedback
            <select value={feedback} onChange={e => setFeedback(e.target.value)} style={{width:'100%',marginTop:4}}>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral / unclear</option>
              <option value="negative">Negative</option>
            </select>
          </label>
          <label style={{display:'flex',gap:7,marginTop:10,alignItems:'center'}}>
            <input type="checkbox" checked={wouldPlayAgain} onChange={e => setWouldPlayAgain(e.target.checked)} />
            <span>Would play again</span>
          </label>
          <button onClick={finish} style={{marginTop:10,width:'100%'}}>End playtest & create receipt</button>
        </>
      ) : (
        <>
          <div style={{marginTop:10}}>
            Receipt verified locally.
          </div>
          <div style={{marginTop:5}}>
            Outcome: <b>{receipt.outcomeClassification}</b>
          </div>
          <div style={{marginTop:5}}>
            External evidence candidate: <b>{receipt.externalEvidenceEligible ? 'yes' : 'no'}</b>
          </div>
          <div style={{marginTop:5}}>
            Retention claimed: <b>no</b>
          </div>
          <button onClick={() => downloadReceipt(receipt)} style={{marginTop:10,width:'100%'}}>Download JSON receipt</button>
          <button onClick={() => {setRun(null);setReceipt(null);setConsent(false);}} style={{marginTop:6,width:'100%'}}>New playtest</button>
        </>
      )}
    </aside>
  );
}

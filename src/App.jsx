import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Home,
  Map,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  Volume2,
  Zap,
  Download,
  Upload,
  PawPrint
} from 'lucide-react';
import { gameModel } from './gameModel';
import { scoreQuestAttempt } from './questRewardPolicy';
import {
  applyPermanentPurchase,
  applyQuestCompletion,
  beginQuestReceipt
} from './persistenceTransactions';
import {
  exportSave,
  importSave,
  loadLocalSnapshot,
  persistSnapshot,
  readIndexedDbBackup
} from './storage';

const DEFAULT_SAVE = {
  stateVersion: 2,
  coins: 40,
  stars: 0,
  xp: 0,
  starWorth: 0,
  owned: ['tops-1','bottoms-1','shoes-1','beds-1','desks-1','companions-1'],
  equipped: {
    top:'tops-1',
    bottom:'bottoms-1',
    shoes:'shoes-1',
    companion:'companions-1'
  },
  stats: {},
  mastered: [],
  roomDecor: ['beds-1','desks-1'],
  questsCompleted: 0,
  transferWins: 0,
  lastDailyKey: '',
  daily: {quests:0,transfers:0,purchase:0},
  dreamGoalId: 'companions-8',
  districtProgress: {
    'Lantern Lane':0,
    'Story Street':0,
    'Wordwood Garden':0
  },
  companionBond: 0,
  purchaseReceipts: [],
  activeQuestReceipt: '',
  lastCompletedQuestReceipt: ''
};

function migrateSave(raw){
  const value = raw && typeof raw === 'object' ? raw : {};
  const oldOwned = Array.isArray(value.owned) ? value.owned : DEFAULT_SAVE.owned;

  return {
    ...DEFAULT_SAVE,
    ...value,
    stateVersion: 2,
    owned: Array.from(new Set([...oldOwned,'companions-1'])),
    equipped: {...DEFAULT_SAVE.equipped,...(value.equipped || {})},
    daily: {...DEFAULT_SAVE.daily,...(value.daily || {})},
    districtProgress: {...DEFAULT_SAVE.districtProgress,...(value.districtProgress || {})}
  };
}

function dayKey(){
  return new Date().toISOString().slice(0,10);
}

function newQuestReceiptId(){
  if(globalThis.crypto?.randomUUID){
    return 'quest-' + globalThis.crypto.randomUUID();
  }
  return 'quest-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function tierName(tier){
  return ['','Starter','Glow-Up','Epic','Dream','Luxe'][tier] || 'Starter';
}

function skillLabel(id){
  return id.replace(/-/g,' ').replace(/\b\w/g,(c) => c.toUpperCase());
}

function Avatar({equipped}){
  const top = equipped.top || 'tops-1';
  const bottom = equipped.bottom || 'bottoms-1';
  const companion = equipped.companion || 'companions-1';

  return (
    <div className="avatarWrap" aria-label="StarBlox avatar">
      {equipped.aura && <div className="avatarAura">✦ ✧ ✦</div>}
      <div className="avatarHairBack" />
      <div className="avatarHead">
        <div className="avatarHairTop" />
        <span className="eye leftEye" />
        <span className="eye rightEye" />
        <span className="smile" />
        {equipped.face && <span className="faceGear">◇</span>}
        {equipped.head && <span className="headGear">★</span>}
      </div>
      <div className={'avatarBody ' + (top.includes('-10') || top.includes('-11') || top.includes('-12') ? 'dreamTop' : '')}>
        <span>★</span>
      </div>
      <div className="avatarArm leftArm" />
      <div className="avatarArm rightArm" />
      <div className={'avatarLeg leftLeg ' + (bottom.includes('-10') ? 'dreamBottom' : '')} />
      <div className={'avatarLeg rightLeg ' + (bottom.includes('-10') ? 'dreamBottom' : '')} />
      <div className="avatarShoe leftShoe" />
      <div className="avatarShoe rightShoe" />
      {equipped.back && <div className="backGear">✦</div>}
      {equipped.hand && <div className="handGear">◆</div>}
      <div className="buddy">
        <PawPrint size={20} />
        <span>{gameModel.store.find(i => i.id === companion)?.name || 'Sprout Pup'}</span>
      </div>
    </div>
  );
}

function ItemArt({item}){
  const initials = item.name.split(' ').slice(0,2).map(part => part[0]).join('');
  return (
    <div className={'itemArt visual-' + item.collectionId + ' tierVisual' + item.tier} aria-hidden="true">
      {item.image ? <img src={item.image} alt="" loading="lazy" /> : <span>{initials}</span>}
      <i>{item.theme.split(' ')[0]}</i>
    </div>
  );
}

export function App(){
  const [screen,setScreen] = useState('world');
  const [save,setSave] = useState(() => migrateSave(loadLocalSnapshot()));
  const [quest,setQuest] = useState([]);
  const [qIndex,setQIndex] = useState(0);
  const [feedback,setFeedback] = useState(null);
  const [selected,setSelected] = useState('');
  const [wrongRewarded,setWrongRewarded] = useState(false);
  const [marketFilter,setMarketFilter] = useState('all');
  const [marketTier,setMarketTier] = useState(0);
  const [toast,setToast] = useState('');
  const [storyOpen,setStoryOpen] = useState(false);
  const [importMessage,setImportMessage] = useState('');
  const importRef = useRef(null);
  const advanceTimer = useRef(null);
  const questReceiptRef = useRef('');

  useEffect(() => {
    if(loadLocalSnapshot()) return;
    readIndexedDbBackup().then(raw => {
      if(raw) setSave(migrateSave(raw));
    });
  },[]);

  useEffect(() => {
    persistSnapshot(save);
  },[save]);

  useEffect(() => {
    const today = dayKey();
    if(save.lastDailyKey !== today){
      setSave(current => ({
        ...current,
        lastDailyKey: today,
        daily: {quests:0,transfers:0,purchase:0}
      }));
    }
  },[]);

  useEffect(() => () => {
    if(advanceTimer.current) window.clearTimeout(advanceTimer.current);
  },[]);

  const dailyPool = useMemo(() => gameModel.dailyPool(),[save.lastDailyKey]);
  const currentQ = quest[qIndex];

  const level = Math.floor(save.xp / 180) + 1;
  const xpInLevel = save.xp % 180;
  const room = gameModel.roomTier(save.starWorth);
  const nextRoom = gameModel.roomTiers.find(tier => tier.worth > save.starWorth);
  const dreamItem = gameModel.store.find(item => item.id === save.dreamGoalId) || gameModel.store[0];
  const dreamOwned = save.owned.includes(dreamItem.id);
  const dreamPct = dreamOwned ? 100 : Math.min(100,(save.coins / dreamItem.price) * 100);

  const ownedItems = gameModel.store.filter(item => save.owned.includes(item.id));
  const equippedItemIds = Object.values(save.equipped);

  const equippedByCollection = (collectionId) => {
    return gameModel.store.find(item => item.id === save.equipped[
      collectionId === 'tops' ? 'top' :
      collectionId === 'bottoms' ? 'bottom' :
      collectionId === 'headwear' ? 'head' :
      collectionId === 'facegear' ? 'face' :
      collectionId === 'backgear' ? 'back' :
      collectionId === 'handgear' ? 'hand' :
      collectionId === 'auras' ? 'aura' :
      collectionId === 'companions' ? 'companion' :
      collectionId
    ]);
  };

  const companion = equippedByCollection('companions') || gameModel.store.find(i => i.id === 'companions-1');
  const companionStage =
    save.companionBond < 3 ? 'New Friend' :
    save.companionBond < 8 ? 'Trail Buddy' :
    save.companionBond < 15 ? 'Brightside Bestie' :
    'Star Sidekick';

  const skillRows = Object.entries(save.stats).filter(([,stat]) => stat.seen > 0);
  const strongestSkill = [...skillRows].sort((a,b) => (b[1].independentCorrect || 0) - (a[1].independentCorrect || 0))[0];
  const revisitSkill = [...skillRows]
    .filter(([,stat]) => stat.wrong > 0)
    .sort((a,b) => (b[1].wrong / Math.max(1,b[1].seen)) - (a[1].wrong / Math.max(1,a[1].seen)))[0];

  const flash = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''),2200);
  };

  const startQuest = () => {
    if(advanceTimer.current) window.clearTimeout(advanceTimer.current);
    const receiptId = newQuestReceiptId();
    questReceiptRef.current = receiptId;
    setSave(current => beginQuestReceipt(current,receiptId));
    setQuest(gameModel.pickQuest(save.stats,5));
    setQIndex(0);
    setFeedback(null);
    setSelected('');
    setWrongRewarded(false);
    setScreen('quest');
  };

  const finishQuest = () => {
    flash('Quest complete! +30 Coins +30 XP');
    setQuest([]);
    setQIndex(0);
    setFeedback(null);
    setSelected('');
    setWrongRewarded(false);
    setScreen('world');
  };

  const advanceQuestion = () => {
    if(qIndex < quest.length - 1){
      setQIndex(index => index + 1);
      setFeedback(null);
      setSelected('');
      setWrongRewarded(false);
    }else{
      finishQuest();
    }
  };

  const answer = (choice) => {
    if(!currentQ || feedback) return;

    setSelected(choice);
    const ok = choice === currentQ.answer;
    const wasRetry = wrongRewarded;
    const independent = ok && !wasRetry;
    const masteryEligible = currentQ.masteryEligible !== false;
    const snapshot = save.stats[currentQ.skill] || {
      seen:0,
      correct:0,
      wrong:0,
      lastSeen:0,
      independentCorrect:0,
      masteryCorrect:0
    };
    const projectedMasteryCorrect =
      (snapshot.masteryCorrect || 0) + (independent && masteryEligible ? 1 : 0);
    const becomesMasteredPreview =
      independent &&
      masteryEligible &&
      projectedMasteryCorrect >= 4 &&
      !save.mastered.includes(currentQ.skill);
    const previewOutcome = scoreQuestAttempt({
      question:currentQ,
      correct:ok,
      wasRetry,
      becomesMastered:becomesMasteredPreview
    });

    setSave(current => {
      const old = current.stats[currentQ.skill] || {
        seen:0,
        correct:0,
        wrong:0,
        lastSeen:0,
        independentCorrect:0,
        masteryCorrect:0
      };

      const next = {
        ...old,
        seen: old.seen + (wasRetry ? 0 : 1),
        correct: old.correct + (ok ? 1 : 0),
        wrong: old.wrong + (!ok && !wasRetry ? 1 : 0),
        lastSeen: Date.now(),
        independentCorrect: (old.independentCorrect || 0) + (independent ? 1 : 0),
        masteryCorrect: (old.masteryCorrect || 0) + (independent && masteryEligible ? 1 : 0)
      };

      const becomesMastered =
        independent &&
        masteryEligible &&
        next.masteryCorrect >= 4 &&
        !current.mastered.includes(currentQ.skill);
      const outcome = scoreQuestAttempt({
        question:currentQ,
        correct:ok,
        wasRetry,
        becomesMastered
      });

      const nextState = {
        ...current,
        coins: current.coins + outcome.coins,
        stars: current.stars + outcome.stars,
        xp: current.xp + outcome.xp,
        stats: {...current.stats,[currentQ.skill]:next},
        mastered: outcome.masteryAwarded ? [...current.mastered,currentQ.skill] : current.mastered,
        transferWins: current.transferWins + outcome.transferEvidence,
        daily: {
          ...current.daily,
          transfers: current.daily.transfers + outcome.transferEvidence
        },
        districtProgress: outcome.districtProgress ? {
          ...current.districtProgress,
          [currentQ.district]: (current.districtProgress[currentQ.district] || 0) + outcome.districtProgress
        } : current.districtProgress
      };

      if(ok && qIndex === quest.length - 1){
        return applyQuestCompletion(nextState,questReceiptRef.current).state;
      }

      return nextState;
    });

    if(ok){
      setFeedback({
        ok:true,
        text:currentQ.explanation,
        retry:wasRetry,
        rewardCoins:previewOutcome.coins,
        rewardXp:previewOutcome.xp,
        masteryAwarded:previewOutcome.masteryAwarded,
        transferEvidence:previewOutcome.transferEvidence
      });

      advanceTimer.current = window.setTimeout(advanceQuestion,950);
    }else{
      setWrongRewarded(true);
      setFeedback({
        ok:false,
        text:currentQ.hint,
        retry:wasRetry,
        rewardCoins:previewOutcome.coins,
        rewardXp:previewOutcome.xp,
        masteryAwarded:false,
        transferEvidence:0
      });
    }
  };

  const equip = (id) => {
    const item = gameModel.store.find(i => i.id === id);
    if(!item || !save.owned.includes(id)) return;

    if(item.type === 'room'){
      setSave(current => ({
        ...current,
        roomDecor: current.roomDecor.includes(id)
          ? current.roomDecor.filter(value => value !== id)
          : [...current.roomDecor,id]
      }));
      flash(save.roomDecor.includes(id) ? 'Put away from your room.' : 'Placed in your room!');
      return;
    }

    const key =
      item.type === 'companion' ? 'companion' :
      item.collectionId === 'tops' ? 'top' :
      item.collectionId === 'bottoms' ? 'bottom' :
      item.collectionId === 'shoes' ? 'shoes' :
      item.collectionId === 'headwear' ? 'head' :
      item.collectionId === 'facegear' ? 'face' :
      item.collectionId === 'backgear' ? 'back' :
      item.collectionId === 'handgear' ? 'hand' :
      item.collectionId === 'auras' ? 'aura' :
      item.collectionId;

    setSave(current => ({
      ...current,
      equipped: {...current.equipped,[key]:id}
    }));

    flash('Equipped ' + item.name + '!');
  };

  const buy = (id) => {
    const item = gameModel.store.find(i => i.id === id);
    if(!item) return;

    if(save.owned.includes(id)){
      equip(id);
      return;
    }

    if(save.stars < item.starReq){
      flash('Earn ' + item.starReq + ' Mastery Stars to unlock this tier.');
      return;
    }

    if(save.coins < item.price){
      flash('You need ' + (item.price - save.coins) + ' more Coins.');
      return;
    }

    setSave(current => applyPermanentPurchase(current,item).state);

    flash(id === save.dreamGoalId
      ? item.name + ' is yours forever — Dream Goal complete!'
      : item.name + ' is yours forever!'
    );
  };

  const setDreamGoal = (id) => {
    const item = gameModel.store.find(i => i.id === id);
    if(!item) return;
    setSave(current => ({...current,dreamGoalId:id}));
    flash(item.name + ' is your new Dream Goal!');
  };

  const filteredStore = gameModel.store.filter(item =>
    (marketFilter === 'all' || item.collectionId === marketFilter) &&
    (marketTier === 0 || item.tier === marketTier)
  );

  const saveDownload = () => {
    const blob = new Blob([exportSave(save)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'starblox-save.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setImportMessage('Save backup downloaded.');
  };

  const loadSaveFile = async (event) => {
    const file = event.target.files?.[0];
    if(!file) return;

    try{
      const text = await file.text();
      const parsed = migrateSave(importSave(text));
      setSave(parsed);
      setImportMessage('Save imported successfully.');
      flash('StarBlox progress restored!');
    }catch(error){
      setImportMessage(error instanceof Error ? error.message : 'Could not import that save.');
    }

    event.target.value = '';
  };

  const nav = [
    ['world','World',Map],
    ['quest','Quest',BookOpen],
    ['study','Study',Sparkles],
    ['room','Home',Home],
    ['avatar','Avatar',UserRound],
    ['market','Market',ShoppingBag]
  ];

  return (
    <div className="shell">
      {toast && <div className="toast" role="status">{toast}</div>}

      <header className="hud">
        <button className="brand" onClick={() => setScreen('world')} aria-label="Go to Brightside City">
          <span className="logo">STARBLOX★</span>
          <small>Brightside City</small>
        </button>

        <div className="hudStats">
          <div className="currency">Coins <strong>{save.coins}</strong></div>
          <div className="currency">Stars <strong>{save.stars}</strong></div>
          <div className="levelBox">
            <span>LV {level}</span>
            <div className="progress"><i style={{width:(xpInLevel / 180 * 100) + '%'}} /></div>
            <small>{xpInLevel}/180 XP</small>
          </div>
          <div className="mastery"><Trophy size={18}/><b>{save.mastered.length}</b><span>Mastered</span></div>
        </div>
      </header>

      <div className="gameFrame">
        <aside className="sidebar">
          {nav.map(([id,label,Icon]) => (
            <button
              key={id}
              className={'navBtn ' + (screen === id ? 'active' : '')}
              onClick={() => setScreen(id)}
            >
              <Icon size={20}/>
              <span>{label}</span>
            </button>
          ))}

          <div className="sideDream">
            <Star size={27}/>
            <b>Dream Goal</b>
            <small>{dreamItem.name}</small>
            <div className="dreamMeter"><i style={{width:dreamPct + '%'}} /></div>
            <small>{dreamOwned ? 'Owned forever!' : save.coins + '/' + dreamItem.price + ' Coins'}</small>
          </div>
        </aside>

        <main className="main">
          {screen === 'world' && (
            <section className="world">
              <div className="skyBlob skyOne" />
              <div className="skyBlob skyTwo" />

              <div className="worldTitle">
                <span className="kicker">BRIGHTSIDE CITY</span>
                <h1>Learn. Build. Shine.</h1>
                <p>Every smart move releases Star Sparks that make your world brighter.</p>
              </div>

              <button className="district lantern" onClick={startQuest}>
                <span className="districtIcon">Aa</span>
                <b>Lantern Lane</b>
                <small>Phonics & spelling</small>
                <em>✦ {save.districtProgress['Lantern Lane'] || 0}</em>
              </button>

              <button className="district story" onClick={() => setScreen('study')}>
                <span className="districtIcon">📖</span>
                <b>Story Street</b>
                <small>Reading & big ideas</small>
                <em>✦ {save.districtProgress['Story Street'] || 0}</em>
              </button>

              <button className="district wordwood" onClick={startQuest}>
                <span className="districtIcon">✿</span>
                <b>Wordwood Garden</b>
                <small>Religion & real-life choices</small>
                <em>✦ {save.districtProgress['Wordwood Garden'] || 0}</em>
              </button>

              <button className="district marketPin" onClick={() => setScreen('market')}>
                <span className="districtIcon">★</span>
                <b>Star Market</b>
                <small>192 permanent rewards</small>
              </button>

              <button className="district homePin" onClick={() => setScreen('room')}>
                <span className="districtIcon">⌂</span>
                <b>Home Base</b>
                <small>{room.name}</small>
              </button>

              <div className="avatarDock">
                <Avatar equipped={save.equipped}/>
                <div className="avatarSpeech">{companion?.name || 'Sprout Pup'} is ready to explore with you!</div>
              </div>

              <div className="questDock">
                <span className="kicker">TODAY'S STAR MISSIONS</span>
                <h3>Three ways to grow</h3>

                <div className="mission">
                  <span>{save.daily.quests >= 1 ? '✓' : '1'}</span>
                  <div><b>Finish a Quest</b><small>{Math.min(save.daily.quests,1)}/1</small></div>
                </div>

                <div className="mission">
                  <span>{save.daily.transfers >= 2 ? '✓' : '2'}</span>
                  <div><b>Solve 2 Transfer Challenges</b><small>{Math.min(save.daily.transfers,2)}/2</small></div>
                </div>

                <div className="mission">
                  <span>{save.daily.purchase >= 1 ? '✓' : '3'}</span>
                  <div><b>Choose a Reward</b><small>{Math.min(save.daily.purchase,1)}/1</small></div>
                </div>

                <div className="dreamMini">
                  <b>Dream: {dreamItem.name}</b>
                  <div className="dreamMeter dark"><i style={{width:dreamPct + '%'}} /></div>
                  <small>{dreamOwned ? 'You got it!' : Math.max(0,dreamItem.price-save.coins) + ' Coins to go'}</small>
                </div>

                <button className="primaryButton" onClick={startQuest}><Zap size={19}/> Start 5-Action Quest</button>
                <small className="safeCopy">No lives. No streak loss. Mistakes help the game teach you.</small>
              </div>
            </section>
          )}

          {screen === 'quest' && (
            <section className="page questPage">
              {!currentQ ? (
                <div className="emptyQuest">
                  <div className="questHero">5★</div>
                  <h1>Choose today's smartest adventure</h1>
                  <p>Five focused actions mix what you know, what needs practice, what is due for review, and transfer.</p>
                  <div className="facts">
                    <span>200 validated daily questions</span>
                    <span>{dailyPool.filter(q => q.role === 'transfer').length} transfer opportunities</span>
                    <span>{save.mastered.length} skills mastered</span>
                  </div>
                  <button className="primaryButton" onClick={startQuest}><BookOpen size={20}/> Begin Quest</button>
                </div>
              ) : (
                <div className="questBoard">
                  <div className="questTop">
                    <div>
                      <span className="kicker">{currentQ.district.toUpperCase()} · {currentQ.role.toUpperCase()}</span>
                      <h2>{skillLabel(currentQ.skill)}</h2>
                    </div>
                    <div className="qCounter">{qIndex+1}/{quest.length}</div>
                  </div>

                  <div className="progress large"><i style={{width:((qIndex+1)/quest.length*100) + '%'}} /></div>

                  <div className="questionCard">
                    <button
                      className="readAloud"
                      onClick={() => {
                        if('speechSynthesis' in window){
                          window.speechSynthesis.cancel();
                          window.speechSynthesis.speak(new SpeechSynthesisUtterance(currentQ.prompt));
                        }
                      }}
                    >
                      <Volume2 size={20}/> Read aloud
                    </button>

                    <p className="questionText">{currentQ.prompt}</p>

                    <div className="answers">
                      {currentQ.choices.map(choice => (
                        <button
                          key={choice}
                          className={'answerButton ' + (selected === choice ? (feedback?.ok ? 'correctChoice' : 'wrongChoice') : '')}
                          disabled={!!feedback}
                          onClick={() => answer(choice)}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>

                    {feedback && (
                      <div className={feedback.ok ? 'feedback good' : 'feedback learn'}>
                        <b>{feedback.ok ? (feedback.retry ? 'Great comeback!' : 'Awesome thinking!') : 'Good try — use this clue.'}</b>
                        <p>{feedback.text}</p>
                        <small>
                          {feedback.ok
                            ? feedback.retry
                              ? '+' + feedback.rewardXp + ' XP clue-assisted practice · no Coins, Mastery Star, or transfer evidence · ' + currentQ.district + ' gets brighter · moving on…'
                              : '+' + feedback.rewardCoins + ' Coins · +' + feedback.rewardXp + ' XP' + (feedback.masteryAwarded ? ' · +1 Mastery Star' : '') + ' · ' + currentQ.district + ' gets brighter · moving on…'
                            : feedback.rewardCoins > 0
                              ? '+' + feedback.rewardCoins + ' Coins · +' + feedback.rewardXp + ' XP for the learning attempt · nothing was taken away.'
                              : 'No extra Coins or XP on this retry · the clue stays available and nothing is taken away.'}
                        </small>
                      </div>
                    )}

                    {feedback && !feedback.ok && (
                      <button
                        className="primaryButton"
                        onClick={() => {
                          setFeedback(null);
                          setSelected('');
                        }}
                      >
                        Try again with the clue
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {screen === 'study' && (
            <section className="page">
              <div className="heroPanel">
                <div>
                  <span className="kicker">CURRENT SCHOOL POWER</span>
                  <h1>Study Lab</h1>
                  <p>Source-grounded skills from the current StarBlox learning pack.</p>
                </div>
                <div className="heroMark">A+</div>
              </div>

              <div className="studyGrid">
                <article>
                  <span className="articleMark">Aa</span>
                  <h3>Phonics & Spelling</h3>
                  <p>Short vowels, sound changes, rhyme, spelling and word meaning.</p>
                  <div className="wordCloud">{gameModel.spelling.map(word => <b key={word}>{word}</b>)}</div>
                </article>

                <article>
                  <span className="articleMark">V</span>
                  <h3>Vocabulary</h3>
                  <p>Understand current-week meanings, then transfer them to new situations.</p>
                  <div className="wordCloud">{gameModel.vocab.map(([word]) => <b key={word}>{word}</b>)}</div>
                </article>

                <article>
                  <span className="articleMark">R</span>
                  <h3>Reading Thinking</h3>
                  <p>Main idea, inference, evidence, character reasoning, commands and exclamations.</p>
                  <button className="secondaryButton" onClick={() => setStoryOpen(open => !open)}>
                    {storyOpen ? 'Hide mini story' : 'Open a mini story'}
                  </button>
                  {storyOpen && <p className="storyBox">{gameModel.stories[0].text}</p>}
                </article>

                <article>
                  <span className="articleMark">✦</span>
                  <h3>Religion Unit 1</h3>
                  <p>God's gifts, Trinity, creation, grace, thinking, choosing, loving, and applying lessons to real life.</p>
                </article>

                <article className="parentPulse">
                  <span className="articleMark">↗</span>
                  <h3>Grown-Up Learning Pulse</h3>
                  <p>
                    {strongestSkill
                      ? <><b>{skillLabel(strongestSkill[0])}</b> has the strongest independent evidence with {strongestSkill[1].independentCorrect || 0} first-try correct answers.</>
                      : 'Complete a Quest to begin building a learning pulse.'}
                  </p>
                  <p>
                    {revisitSkill
                      ? <><b>{skillLabel(revisitSkill[0])}</b> is the clearest skill to revisit next. The adaptive Quest will keep bringing it back without punishment.</>
                      : 'No clear weak spot yet — the scheduler is still gathering evidence.'}
                  </p>
                  <small>This summarizes learning evidence, not screen time.</small>
                </article>

                <article className="dataCard">
                  <span className="articleMark">↕</span>
                  <h3>Progress Backup</h3>
                  <p>Use this before moving devices or migrating from another StarBlox build.</p>
                  <div className="backupActions">
                    <button className="secondaryButton" onClick={saveDownload}><Download size={18}/> Download save</button>
                    <button className="secondaryButton" onClick={() => importRef.current?.click()}><Upload size={18}/> Import save</button>
                    <input ref={importRef} type="file" accept=".json,application/json" onChange={loadSaveFile} hidden />
                  </div>
                  {importMessage && <small className="importMessage">{importMessage}</small>}
                </article>
              </div>
            </section>
          )}

          {screen === 'room' && (
            <section className="roomPage">
              <div className={'roomStage roomTier' + room.id}>
                <div className="roomHUD">
                  <span className="kicker">HOME BASE · TIER {room.id}</span>
                  <h1>{room.name}</h1>
                  <p>{room.blurb}</p>

                  {nextRoom && (
                    <div className="nextTier">
                      <div className="progress"><i style={{width:Math.max(0,Math.min(100,(save.starWorth-room.worth)/(nextRoom.worth-room.worth)*100)) + '%'}} /></div>
                      <small>{nextRoom.worth-save.starWorth} Star Worth to {nextRoom.name}</small>
                    </div>
                  )}

                  <div className="homeDream">
                    <b>Dream Goal: {dreamItem.name}</b>
                    <small>{dreamOwned ? 'Completed! Pick another in Star Market.' : Math.max(0,dreamItem.price-save.coins) + ' Coins to go'}</small>
                  </div>

                  <div className="buddyStatus">
                    <b><PawPrint size={16}/> {companion?.name || 'Sprout Pup'}</b>
                    <small>{companionStage} · Buddy Bond {save.companionBond}</small>
                  </div>
                </div>

                <div className="roomAvatar"><Avatar equipped={save.equipped}/></div>

                <div className="decorShelf">
                  {save.roomDecor.slice(-6).map(id => {
                    const item = gameModel.store.find(value => value.id === id);
                    return item ? (
                      <button key={id} onClick={() => equip(id)}>
                        <ItemArt item={item}/>
                        <b>{item.name}</b>
                      </button>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="roomInventory">
                <div>
                  <span className="kicker">YOUR COLLECTION</span>
                  <h2>Decorate your world</h2>
                </div>

                <div className="inventoryStrip">
                  {ownedItems.filter(item => item.type === 'room').map(item => (
                    <button
                      key={item.id}
                      className={save.roomDecor.includes(item.id) ? 'placed' : ''}
                      onClick={() => equip(item.id)}
                    >
                      <ItemArt item={item}/>
                      <b>{item.name}</b>
                      <small>{save.roomDecor.includes(item.id) ? 'Placed' : 'Tap to place'}</small>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {screen === 'avatar' && (
            <section className="page avatarPage">
              <div className="avatarShowcase">
                <Avatar equipped={save.equipped}/>
                <h1>My Star Avatar</h1>
                <p>Everything you earn is yours forever.</p>
                <div className="buddyCard">
                  <PawPrint size={22}/>
                  <div><b>{companion?.name || 'Sprout Pup'}</b><small>{companionStage} · Bond {save.companionBond}</small></div>
                </div>
              </div>

              <div className="avatarCloset">
                <span className="kicker">OWNED GEAR</span>
                <h2>Build your look</h2>

                {['tops','bottoms','shoes','headwear','facegear','backgear','handgear','auras','companions'].map(collectionId => (
                  <div className="closetRow" key={collectionId}>
                    <h3>{gameModel.collections.find(collection => collection[0] === collectionId)?.[1]}</h3>
                    <div>
                      {ownedItems.filter(item => item.collectionId === collectionId).map(item => (
                        <button
                          key={item.id}
                          className={equippedItemIds.includes(item.id) ? 'equipped' : ''}
                          onClick={() => equip(item.id)}
                        >
                          <ItemArt item={item}/>
                          <b>{item.name}</b>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {screen === 'market' && (
            <section className="page marketPage">
              <div className="heroPanel marketHero">
                <div>
                  <span className="kicker">STAR MARKET</span>
                  <h1>Earn it. Own it. Make Brightside yours.</h1>
                  <p>192 permanent rewards. No random boxes. No disappearing items.</p>
                </div>
                <div className="heroMark">★</div>
              </div>

              <div className="dreamBanner">
                <div>
                  <span>YOUR DREAM GOAL</span>
                  <b>{dreamItem.name}</b>
                  <small>{dreamOwned ? 'Goal complete — choose your next favorite item.' : 'Save ' + Math.max(0,dreamItem.price-save.coins) + ' more Coins'}</small>
                </div>
                <div className="progress large"><i style={{width:dreamPct + '%'}} /></div>
              </div>

              <div className="filterRow">
                <button className={marketFilter === 'all' ? 'selectedFilter' : ''} onClick={() => setMarketFilter('all')}>All</button>
                {gameModel.collections.map(([id,name]) => (
                  <button key={id} className={marketFilter === id ? 'selectedFilter' : ''} onClick={() => setMarketFilter(id)}>{name}</button>
                ))}
              </div>

              <div className="filterRow tierRow">
                {[0,1,2,3,4,5].map(tier => (
                  <button key={tier} className={marketTier === tier ? 'selectedFilter' : ''} onClick={() => setMarketTier(tier)}>
                    {tier === 0 ? 'All Tiers' : tierName(tier)}
                  </button>
                ))}
              </div>

              <div className="storeGrid">
                {filteredStore.map(item => (
                  <article key={item.id} className={'storeCard tier' + item.tier + (save.dreamGoalId === item.id ? ' dreamCard' : '')}>
                    <ItemArt item={item}/>
                    <div className="itemCopy">
                      <small>{tierName(item.tier)} · {item.theme}</small>
                      <h3>{item.name}</h3>
                      <div className="price">{item.price} Coins {item.starReq > 0 && <span> · {item.starReq} Stars</span>}</div>

                      <div className="storeActions">
                        <button className="primaryButton small" onClick={() => buy(item.id)}>
                          {save.owned.includes(item.id)
                            ? item.type === 'room'
                              ? save.roomDecor.includes(item.id) ? 'Put Away' : 'Place'
                              : equippedItemIds.includes(item.id) ? 'Equipped' : 'Equip'
                            : 'Buy Forever'}
                        </button>

                        <button
                          className={'secondaryButton small ' + (save.dreamGoalId === item.id ? 'goalSet' : '')}
                          onClick={() => setDreamGoal(item.id)}
                        >
                          {save.dreamGoalId === item.id ? '★ Dream Goal' : 'Set Dream Goal'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

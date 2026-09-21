function finiteNonNegative(value){
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function uniqueStrings(value){
  if(!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())));
}

export function applyPermanentPurchase(current,item){
  if(!current || typeof current !== 'object' || !item || typeof item.id !== 'string'){
    return {state:current,status:'INVALID'};
  }

  const id = item.id;
  const owned = uniqueStrings(current.owned);
  const receipts = uniqueStrings(current.purchaseReceipts);
  const price = finiteNonNegative(item.price);
  const starReq = finiteNonNegative(item.starReq);
  const coins = finiteNonNegative(current.coins);
  const stars = finiteNonNegative(current.stars);
  const starWorth = finiteNonNegative(current.starWorth);
  const daily = current.daily && typeof current.daily === 'object' && !Array.isArray(current.daily)
    ? current.daily
    : {};
  const purchaseCount = finiteNonNegative(daily.purchase);

  if(owned.includes(id)){
    return {state:current,status:'ALREADY_OWNED'};
  }

  if(receipts.includes(id)){
    return {
      state:{...current,owned:[...owned,id]},
      status:'RESTORED_FROM_RECEIPT'
    };
  }

  if(stars < starReq){
    return {state:current,status:'LOCKED'};
  }

  if(coins < price){
    return {state:current,status:'INSUFFICIENT_COINS'};
  }

  return {
    state:{
      ...current,
      coins:coins - price,
      starWorth:starWorth + price,
      owned:[...owned,id],
      purchaseReceipts:[...receipts,id],
      daily:{...daily,purchase:purchaseCount + 1}
    },
    status:'PURCHASED'
  };
}

export function beginQuestReceipt(current,receiptId){
  if(!current || typeof current !== 'object') return current;
  const id = typeof receiptId === 'string' ? receiptId.trim() : '';
  if(!id || current.activeQuestReceipt === id) return current;
  return {...current,activeQuestReceipt:id};
}

export function applyQuestCompletion(current,receiptId){
  if(!current || typeof current !== 'object'){
    return {state:current,status:'INVALID'};
  }

  const id = typeof receiptId === 'string' ? receiptId.trim() : '';
  if(!id){
    return {state:current,status:'INVALID_RECEIPT'};
  }

  if(current.lastCompletedQuestReceipt === id){
    return {state:current,status:'ALREADY_COMPLETED'};
  }

  if(current.activeQuestReceipt !== id){
    return {state:current,status:'STALE_RECEIPT'};
  }

  const daily = current.daily && typeof current.daily === 'object' && !Array.isArray(current.daily)
    ? current.daily
    : {};

  return {
    state:{
      ...current,
      coins:finiteNonNegative(current.coins) + 30,
      xp:finiteNonNegative(current.xp) + 30,
      questsCompleted:finiteNonNegative(current.questsCompleted) + 1,
      companionBond:finiteNonNegative(current.companionBond) + 1,
      daily:{...daily,quests:finiteNonNegative(daily.quests) + 1},
      activeQuestReceipt:'',
      lastCompletedQuestReceipt:id
    },
    status:'COMPLETED'
  };
}

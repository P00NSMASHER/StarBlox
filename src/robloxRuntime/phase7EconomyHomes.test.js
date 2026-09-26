import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Phase 7: question economy, store, and player homes',()=>{
  it('makes correct answers the only core-loop coin source',()=>{
    const config=read('roblox/src/shared/CoreLoopConfig.luau');
    const service=read('roblox/src/server/CoreGameLoopService.luau');

    expect(config).toContain('QuestionReward = table.freeze({Coins = 10, XP = 1})');
    expect(config.match(/Reward = table.freeze\(\{Coins = 0, XP = 3, Stars = 0\}\)/g)?.length).toBe(3);
    expect(config).toContain('LoopReward = table.freeze({');
    expect(config).toContain('Coins = 0,');
    expect(service).toContain('profileData.Economy.Coins += Config.QuestionReward.Coins');
    expect(service).toContain('ApplyCorrectQuestionReward');
    expect(service).toContain('stale_question');
    expect(service).toContain('question_station_mismatch');
    expect(service).toContain('local nextQuestion = CoreQuestionBank.Select(activityId, currentCursor + 1)');
    expect(service).toContain('nextQuestionId = if nextQuestion ~= nil then nextQuestion.Id else nil');
    expect(service).not.toContain('nextQuestionId = questionReward.nextQuestionId');
  });

  it('ships seven visible starter items and five sequential home tiers',()=>{
    const catalog=read('roblox/src/shared/StoreCatalog.luau');
    for(const item of [
      'Starter Bed','Floor Cushion','Tiny Homework Desk','Starter Lamp',
      'School Star Poster','Starter Mat','Book Crate'
    ]){
      expect(catalog).toContain(item);
    }
    for(const home of [
      'Tiny Starter Studio','Cozy Loft','Creator Bedroom','Skyline Penthouse','Star Mansion'
    ]){
      expect(catalog).toContain(home);
    }
    expect(catalog.match(/Price = 44/g)?.length).toBe(7);
    expect(catalog).toContain('Tier = 2, Name = "Cozy Loft", Price = 250');
    expect(catalog).toContain('Tier = 5, Name = "Star Mansion", Price = 5000');
  });

  it('persists ownership/home tier and deducts purchases authoritatively',()=>{
    const template=read('roblox/src/shared/ProfileTemplate.luau');
    const replica=read('roblox/src/server/ReplicaStateService.luau');
    const service=read('roblox/src/server/HomeEconomyService.luau');

    expect(template).toContain('OwnedItems = {}');
    expect(template).toContain('Tier = 1');
    expect(replica).toContain('OwnedItems = table.clone(profileData.Inventory.OwnedItems or {})');

    expect(service).toContain('data.Economy.Coins -= item.Price');
    expect(service).toContain('owned[itemId] = true');
    expect(service).toContain('data.Economy.Coins -= homeCatalog.Price');
    expect(service).toContain('home.Tier = tier');
    expect(service).toContain('tier ~= home.Tier + 1');
    expect(service).toContain('not_enough_coins');
  });

  it('renders homes and furniture as runtime-owned geometry outside Brookhaven',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');
    const bootstrap=read('roblox/src/server/Bootstrap.luau');

    expect(service).toContain('HOME_FOLDER_NAME = "StarBloxPlayerHomes"');
    expect(service).toContain('folder.Parent = Workspace');
    expect(service).toContain('folder:SetAttribute("BaselineMutationAllowed", false)');
    expect(service).not.toContain('BrookhavenWorldBaseline');
    expect(service).toContain('addBed');
    expect(service).toContain('addDesk');
    expect(service).toContain('addChair');
    expect(service).toContain('addLamp');
    expect(service).toContain('addRug');
    expect(service).toContain('addPoster');
    expect(service).toContain('addBooks');

    expect(bootstrap).toContain('HomeEconomyService.new(profiles, replicas, coreLoop:GetSpawnCFrame())');
    expect(bootstrap).toContain('homeEconomy:PlayerReady');
    expect(bootstrap).toContain('homeEconomy:PlayerRemoving');
    expect(bootstrap).toContain('HomeEconomy = homeEconomy');
  });

  it('keeps the shop usable on the verified phone viewport',()=>{
    const client=read('roblox/src/client/Shop.client.luau');
    expect(client).toContain('shopButton.Size = UDim2.fromOffset(84, 44)');
    expect(client).toContain('homeButton.Size = UDim2.fromOffset(84, 44)');
    expect(client).toContain('button.Size = UDim2.fromOffset(104, 44)');
    expect(client).toContain('closeButton.Size = UDim2.fromOffset(44, 44)');
    expect(client).toContain('panel.Size = UDim2.new(0.88, 0, 0, 330)');
    expect(client).toContain('Correct answers earn coins.');
    expect(client).toContain('PurchaseItem');
    expect(client).toContain('PurchaseHomeTier');
    expect(client).toContain('VisitHome');
    expect(client).toContain('ReturnWorld');
  });
});

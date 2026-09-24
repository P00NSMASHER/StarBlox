import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  PROFILE_TEMPLATE,
  REPLICATION_BOUNDARIES
} from '../robloxRuntime/backboneContract.js';

function file(path){
  return readFileSync(resolve(process.cwd(),path),'utf8');
}

describe('Repair 6: LiveOps exactly-once reward boundary', () => {
  it('persists claim and marketplace receipts only on the server', () => {
    expect(PROFILE_TEMPLATE).toHaveProperty('LiveOps.ClaimReceipts');
    expect(PROFILE_TEMPLATE).toHaveProperty('LiveOps.MarketplaceReceiptIds');
    expect(REPLICATION_BOUNDARIES.durableServerOnly).toEqual(
      expect.arrayContaining([
        'LiveOps.ClaimReceipts',
        'LiveOps.MarketplaceReceiptIds'
      ])
    );
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('LiveOps.ClaimReceipts');
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('LiveOps.MarketplaceReceiptIds');
  });

  it('deduplicates generic claims before calling a feature-package adapter again', () => {
    const source=file('roblox/src/server/LiveOpsService.luau');
    const claim=source.slice(
      source.indexOf('function LiveOpsService:Claim'),
      source.indexOf('function LiveOpsService:ProcessMarketplaceReceipt')
    );

    expect(claim).toMatch(/ClaimReceipts/);
    expect(claim).toMatch(/state\.ClaimReceipts\[claimKey\] == true/);
    expect(claim).toMatch(/state\.ClaimReceipts\[claimKey\] = true/);
    expect(claim.indexOf('state.ClaimReceipts[claimKey] == true'))
      .toBeLessThan(claim.indexOf('self._featurePackages.Claim'));
  });

  it('requires a stable platform PurchaseId and makes marketplace retries idempotent', () => {
    const source=file('roblox/src/server/LiveOpsService.luau');
    const market=source.slice(source.indexOf('function LiveOpsService:ProcessMarketplaceReceipt'));

    expect(market).toMatch(/receiptInfo\.PurchaseId/);
    expect(market).toMatch(/MarketplaceReceiptIds/);
    expect(market).toMatch(/state\.MarketplaceReceiptIds\[purchaseId\] == true/);
    expect(market).toMatch(/state\.MarketplaceReceiptIds\[purchaseId\] = true/);
    expect(market.indexOf('state.MarketplaceReceiptIds[purchaseId] == true'))
      .toBeLessThan(market.indexOf('self._featurePackages.ProcessMarketplaceReceipt'));
  });

  it('passes adapters copies and rejects private LiveOps patch fields', () => {
    const source=file('roblox/src/server/LiveOpsService.luau');

    expect(source).toMatch(/deepCopy\(profileData\)/);
    expect(source).toMatch(/PATCH_FIELDS/);
    expect(source).toMatch(/liveOpsPatch attempted private or unknown state/);
    expect(source).not.toMatch(/state\[key\] = value/);
  });

  it('validates all reward receipts before mutating player economy or inventory', () => {
    const source=file('roblox/src/server/LiveOpsService.luau');
    expect(source).toMatch(/validateRewards/);
    expect(source).toMatch(/unsupported LiveOps reward type/);

    const claim=source.slice(
      source.indexOf('function LiveOpsService:Claim'),
      source.indexOf('function LiveOpsService:ProcessMarketplaceReceipt')
    );
    expect(claim.indexOf('validateRewards(result.receipts)'))
      .toBeLessThan(claim.indexOf('applyReward(profileData, receipt)'));
  });
});

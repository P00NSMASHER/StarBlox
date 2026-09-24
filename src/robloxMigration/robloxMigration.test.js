
import { describe,expect,it } from 'vitest';
import { buildRobloxCapabilityCatalog } from '../robloxCatalog/capabilityCatalog.js';
import {
  buildRobloxMigrationPlan,
  verifyRobloxMigrationPlan
} from './migrationPlanner.js';
import {
  buildMigrationBundleManifest,
  verifyMigrationBundleManifest
} from './migrationBundle.js';
import { migrationPlanMarkdown } from './migrationReport.js';

function catalog(){
  const dom={
    referent:'referent-0',
    name:'DataModel',
    class:'DataModel',
    properties:{},
    children:[
      {
        referent:'referent-1',
        name:'House System',
        class:'Model',
        properties:{},
        children:[
          {
            referent:'referent-2',
            name:'OpenGarage',
            class:'RemoteEvent',
            properties:{},
            children:[]
          },
          {
            referent:'referent-3',
            name:'HouseServer',
            class:'Script',
            properties:{
              Source:{
                String:[
                  'local DataStoreService = game:GetService("DataStoreService")',
                  'local ReplicatedStorage = game:GetService("ReplicatedStorage")',
                  'local remote = ReplicatedStorage:WaitForChild("OpenGarage")',
                  'remote.OnServerEvent:Connect(function(player)',
                  '  DataStoreService:GetDataStore("Homes"):UpdateAsync("fixture", function(old) return old end)',
                  'end)'
                ].join('\n')
              }
            },
            children:[]
          }
        ]
      },
      {
        referent:'referent-4',
        name:'Vehicle Fleet',
        class:'Model',
        properties:{},
        children:[
          {
            referent:'referent-5',
            name:'Family Car',
            class:'VehicleSeat',
            properties:{
              TextureID:{Content:{uri:'rbxassetid://123456789'}}
            },
            children:[]
          }
        ]
      },
      {
        referent:'referent-6',
        name:'Quest UI',
        class:'ScreenGui',
        properties:{},
        children:[
          {
            referent:'referent-7',
            name:'MissionText',
            class:'TextLabel',
            properties:{},
            children:[]
          }
        ]
      },
      {
        referent:'referent-8',
        name:'Risky Loader',
        class:'Model',
        properties:{},
        children:[
          {
            referent:'referent-9',
            name:'Loader',
            class:'ModuleScript',
            properties:{
              Source:{String:'return loadstring(game:HttpGet("https://example.invalid"))()'}
            },
            children:[]
          }
        ]
      }
    ]
  };

  return buildRobloxCapabilityCatalog([
    {
      sourceId:'licensed-brookhaven:main',
      file:'Brookhaven.rbxl',
      dom
    }
  ]);
}

describe('Step 5: Brookhaven migration planning', () => {
  it('turns catalog systems into staging/refactor/quarantine units with safe targets', () => {
    const plan=buildRobloxMigrationPlan(catalog(),{
      minEngineeringLeverageScore:0
    });

    expect(verifyRobloxMigrationPlan(plan)).toEqual({ok:true,errors:[]});

    const house=plan.units.find(unit => unit.systemName === 'House System');
    const vehicle=plan.units.find(unit => unit.systemName === 'Vehicle Fleet');
    const ui=plan.units.find(unit => unit.systemName === 'Quest UI');
    const risky=plan.units.find(unit => unit.systemName === 'Risky Loader');

    expect(house.selected).toBe(true);
    expect(house.migrationStrategy).toBe('refactor');
    expect(house.exportDisposition).toBe('quarantine');
    expect(house.blockers).toContain('logic-refactor-required');
    expect(house.dependencies.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({type:'service',to:'DataStoreService'}),
      expect.objectContaining({type:'remote-reference',to:'OpenGarage'})
    ]));

    expect(vehicle.selected).toBe(true);
    expect(vehicle.migrationStrategy).toBe('extract');
    expect(vehicle.exportDisposition).toBe('staging');
    expect(vehicle.dependencies.assetIds).toContain('123456789');

    expect(ui.selected).toBe(true);
    expect(ui.exportDisposition).toBe('staging');

    expect(risky.selected).toBe(false);
    expect(risky.migrationStrategy).toBe('quarantine');
    expect(risky.selectionReason).toMatch(/includeRisky/);

    for(const unit of plan.units){
      expect(unit.suggestedTarget).toMatch(/^ServerStorage\/StarBloxMigration\//);
    }
  });

  it('requires explicit opt-in before a risk-flagged system enters the export plan', () => {
    const plan=buildRobloxMigrationPlan(catalog(),{
      minEngineeringLeverageScore:0,
      includeSystems:['Risky Loader'],
      includeRisky:true
    });

    const risky=plan.units.find(unit => unit.systemName === 'Risky Loader');
    expect(risky.selected).toBe(true);
    expect(risky.exportDisposition).toBe('quarantine');
    expect(risky.riskFlags).toContain('dynamic-code');
  });

  it('supports capability and system exclusions without mutating the source catalog', () => {
    const source=catalog();
    const before=JSON.parse(JSON.stringify(source));
    const plan=buildRobloxMigrationPlan(source,{
      minEngineeringLeverageScore:0,
      excludeCapabilities:['vehicles'],
      excludeSystems:['Quest UI']
    });

    expect(plan.units.find(unit => unit.systemName === 'Vehicle Fleet').selected).toBe(false);
    expect(plan.units.find(unit => unit.systemName === 'Quest UI').selected).toBe(false);
    expect(source).toEqual(before);
  });

  it('is deterministic and detects plan tampering', () => {
    const source=catalog();
    const first=buildRobloxMigrationPlan(source,{minEngineeringLeverageScore:0});
    const second=buildRobloxMigrationPlan(source,{minEngineeringLeverageScore:0});

    expect(second).toEqual(first);

    const tampered=JSON.parse(JSON.stringify(first));
    tampered.units[0].suggestedTarget='Workspace/Live';
    expect(verifyRobloxMigrationPlan(tampered).ok).toBe(false);
  });

  it('renders a concise human migration review report', () => {
    const plan=buildRobloxMigrationPlan(catalog(),{minEngineeringLeverageScore:0});
    const markdown=migrationPlanMarkdown(plan);

    expect(markdown).toContain('Brookhaven → StarBlox Migration Plan');
    expect(markdown).toContain('House System');
    expect(markdown).toContain('Vehicle Fleet');
    expect(markdown).toContain(plan.planHash);
    expect(markdown).toContain('staging artifacts only');
  });
});

describe('Step 5: migration bundle integrity', () => {
  it('binds every exported artifact to a selected migration unit and keeps activation disabled', () => {
    const plan=buildRobloxMigrationPlan(catalog(),{minEngineeringLeverageScore:0});
    const artifacts=plan.units
      .filter(unit => unit.selected)
      .map((unit,index) => ({
        unitId:unit.unitId,
        disposition:unit.exportDisposition,
        file:(unit.exportDisposition === 'staging' ? 'staging/' : 'quarantine/') +
          unit.unitId + '.rbxmx',
        sha256:String(index + 1).padStart(64,'0'),
        bytes:1000 + index
      }));

    const manifest=buildMigrationBundleManifest(plan,artifacts);
    expect(verifyMigrationBundleManifest(manifest)).toEqual({ok:true,errors:[]});
    expect(manifest.review.complete).toBe(true);
    expect(manifest.review.liveActivationAllowed).toBe(false);
    expect(manifest.review.requiresHumanReview).toBe(true);
    expect(manifest.summary.exportedUnits).toBe(plan.summary.selectedUnits);
    expect(manifest.artifacts.every(item => item.activation === 'staging-only')).toBe(true);
  });

  it('rejects path traversal, unselected units, and disposition drift', () => {
    const plan=buildRobloxMigrationPlan(catalog(),{minEngineeringLeverageScore:0});
    const selected=plan.units.find(unit => unit.selected);
    const unselected=plan.units.find(unit => !unit.selected);

    expect(() => buildMigrationBundleManifest(plan,[{
      unitId:selected.unitId,
      disposition:selected.exportDisposition,
      file:'../escape.rbxmx',
      sha256:'a'.repeat(64),
      bytes:10
    }])).toThrow(/safe relative path/);

    expect(() => buildMigrationBundleManifest(plan,[{
      unitId:unselected.unitId,
      disposition:unselected.exportDisposition,
      file:'quarantine/x.rbxmx',
      sha256:'a'.repeat(64),
      bytes:10
    }])).toThrow(/selected migration unit/);

    expect(() => buildMigrationBundleManifest(plan,[{
      unitId:selected.unitId,
      disposition:selected.exportDisposition === 'staging' ? 'quarantine' : 'staging',
      file:'staging/x.rbxmx',
      sha256:'a'.repeat(64),
      bytes:10
    }])).toThrow(/disposition/);
  });

  it('detects bundle manifest tampering', () => {
    const plan=buildRobloxMigrationPlan(catalog(),{minEngineeringLeverageScore:0});
    const unit=plan.units.find(item => item.selected);
    const manifest=JSON.parse(JSON.stringify(buildMigrationBundleManifest(plan,[{
      unitId:unit.unitId,
      disposition:unit.exportDisposition,
      file:'staging/' + unit.unitId + '.rbxmx',
      sha256:'b'.repeat(64),
      bytes:42
    }])));

    manifest.artifacts[0].suggestedTarget='Workspace/Live';
    const validation=verifyMigrationBundleManifest(manifest);
    expect(validation.ok).toBe(false);
    expect(validation.errors.join(' ')).toMatch(/staging root|hash mismatch/);
  });
});

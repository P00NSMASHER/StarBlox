
import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

import { studioToolNames } from './studioToolContract.js';
import {
  STARBLOX_STUDIO_CONNECTOR_TOOLS,
  createStarBloxLocalStudioAdapter
} from './localStudioConnector.js';

const CONNECTOR_PATH=new URL(
  '../../roblox/devFactoryPlugin/src/Connector.server.luau',
  import.meta.url
);

describe('Step 2: built-in StarBlox Studio connector contract', () => {
  it('exposes only known factory tools and omits high-risk optional capabilities', () => {
    const known=new Set(studioToolNames());
    expect(STARBLOX_STUDIO_CONNECTOR_TOOLS.every(tool => known.has(tool))).toBe(true);

    for(const forbidden of [
      'run_luau',
      'run_gameplay_assertions',
      'run_playtest_episode',
      'summarize_episode'
    ]){
      expect(STARBLOX_STUDIO_CONNECTOR_TOOLS).not.toContain(forbidden);
    }

    expect(
      STARBLOX_STUDIO_CONNECTOR_TOOLS.some(tool =>
        /publish|purchase|opencloud|marketplace|robux/i.test(tool)
      )
    ).toBe(false);
  });

  it('does not embed publishing, purchasing, Open Cloud, or arbitrary-code handlers', () => {
    const source=readFileSync(CONNECTOR_PATH,'utf8');

    expect(source).not.toMatch(/publish_place|PublishAsync|SavePlaceAsync/i);
    expect(source).not.toMatch(/PromptProductPurchase|PromptGamePassPurchase|PurchasePrompt/i);
    expect(source).not.toMatch(/OpenCloud|ApiKey|ROBLOSECURITY/i);
    expect(source).not.toMatch(/run_luau|loadstring|getfenv|setfenv/i);

    for(const tool of STARBLOX_STUDIO_CONNECTOR_TOOLS){
      expect(source).toContain(tool + ' =');
    }
  });

  it('creates an HTTP adapter that advertises exactly the built-in connector subset', () => {
    const adapter=createStarBloxLocalStudioAdapter();

    for(const tool of STARBLOX_STUDIO_CONNECTOR_TOOLS){
      expect(adapter.has(tool)).toBe(true);
    }

    expect(adapter.has('run_luau')).toBe(false);
    expect(adapter.has('publish_place')).toBe(false);
  });
});

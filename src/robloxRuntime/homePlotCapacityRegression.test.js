import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path) {
  return readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
}

function functionBody(source, name, nextName) {
  const start = source.indexOf(`function HomeEconomyService:${name}`);
  const end = source.indexOf(`\nfunction HomeEconomyService:${nextName}`, start + 1);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('home plot capacity regression', () => {
  const service = read('roblox/src/server/HomeEconomyService.luau');

  it('treats exhausted finite plots as an unavailable result instead of a server exception', () => {
    const reserve = functionBody(service, '_reservePlot', '_homeCFrame');

    expect(reserve).toContain('requestedPlotId: string?): number?');
    expect(reserve).toContain('\treturn nil');
    expect(reserve).not.toContain('error("no Brookhaven house plot available for player")');
  });

  it('keeps profile setup and purchases alive when every plot is occupied', () => {
    const ready = functionBody(service, 'PlayerReady', 'PlayerRemoving');
    const rebuild = functionBody(service, '_rebuildHome', '_plotState');

    expect(ready).toContain('local slot = self:_reservePlot(player, home, home.PlotId)');
    expect(ready).toContain('if slot == nil then');
    expect(ready).toContain('player:SetAttribute("StarBloxHomePlotId", "")');
    expect(rebuild).toContain('if self._slots[player] == nil then');
  });

  it('returns an explicit Go Home failure and exposes authoritative availability', () => {
    const visit = functionBody(service, '_visitHome', '_returnWorld');
    const state = functionBody(service, '_state', '_setDoorsLocked');

    expect(visit).toContain('if self._slots[player] == nil then');
    expect(visit).toContain('{ok = false, code = "home_plot_unavailable"}');
    expect(state).toContain('homePlotAvailable = selectedSlot ~= nil');
    expect(state).toContain(
      'plotId = if selectedSlot ~= nil then WorldPlotBindings.Plots[selectedSlot].Id else ""',
    );
  });
});

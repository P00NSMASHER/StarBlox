import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const catalogDir = join(process.cwd(), 'public', 'assets', 'catalog');
const svgFiles = readdirSync(catalogDir).filter(name => name.endsWith('.svg')).sort();

function scanSvg(name){
  const source = readFileSync(join(catalogDir, name), 'utf8');
  const nonFragmentUrls = [...source.matchAll(/url\(([^)]+)\)/gi)]
    .map(match => match[1].trim().replace(/^['"]|['"]$/g, ''))
    .filter(value => value && !value.startsWith('#'));
  const nonFragmentReferences = [...source.matchAll(/\b(?:href|xlink:href|src)\s*=\s*['"]([^'"]+)['"]/gi)]
    .map(match => match[1].trim())
    .filter(value => value && !value.startsWith('#'));

  return {
    forbiddenTag: /<(?:script|foreignObject|iframe|object|embed)\b/i.test(source),
    eventHandler: /\son[a-z0-9:_-]+\s*=/i.test(source),
    javascriptUri: /javascript\s*:/i.test(source),
    cssImport: /@import\b/i.test(source),
    nonFragmentUrls,
    nonFragmentReferences,
  };
}

describe('catalog SVG safety guard', () => {
  it('keeps every catalog SVG self-contained and free of executable/embed content', () => {
    expect(svgFiles.length).toBeGreaterThan(0);

    const findings = svgFiles.flatMap(name => {
      const scan = scanSvg(name);
      const problems = [];
      if(scan.forbiddenTag) problems.push('executable/embed tag');
      if(scan.eventHandler) problems.push('inline event handler');
      if(scan.javascriptUri) problems.push('javascript URI');
      if(scan.cssImport) problems.push('CSS @import');
      if(scan.nonFragmentUrls.length) problems.push(`external url(): ${scan.nonFragmentUrls.join(', ')}`);
      if(scan.nonFragmentReferences.length) problems.push(`external href/src: ${scan.nonFragmentReferences.join(', ')}`);
      return problems.map(problem => `${name}: ${problem}`);
    });

    expect(findings, findings.join('\n')).toEqual([]);
  });
});

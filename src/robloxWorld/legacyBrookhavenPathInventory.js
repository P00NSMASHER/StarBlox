const ASSET_PROPERTIES = Object.freeze({
  ImageLabel: ['Image'],
  ImageButton: ['Image'],
  Decal: ['Texture'],
  Texture: ['Texture'],
  Sound: ['SoundId'],
  Animation: ['AnimationId'],
  MeshPart: ['MeshId', 'TextureID', 'TextureId'],
  SpecialMesh: ['MeshId', 'TextureId']
});

const classNameOf = node => String(node?.class ?? node?.className ?? 'Unknown');
const nameOf = node => String(node?.name ?? classNameOf(node));
const childrenOf = node => Array.isArray(node?.children) ? node.children : [];

function escapeSegment(value) {
  return encodeURIComponent(String(value)).replaceAll('%2F', '%252F');
}

function scalar(value) {
  if (value == null) return '';
  if (['string', 'number', 'boolean'].includes(typeof value)) return String(value);
  if (Array.isArray(value)) return value.map(scalar).filter(Boolean).join(',');
  if (typeof value === 'object') {
    // rbx_dom_weak's DomViewer preserves the Variant enum wrapper. Legacy
    // asset properties are therefore serialized as ContentId/String variants
    // rather than as bare strings. Keep this unwrapping explicit so geometry
    // values cannot accidentally become asset references.
    for (const key of [
      'value', 'Value', 'content', 'Content', 'ContentId', 'String',
      'uri', 'Uri', 'url', 'Url'
    ]) {
      if (key in value) return scalar(value[key]);
    }
    const entries = Object.entries(value);
    if (entries.length === 1) return scalar(entries[0][1]);
    return '';
  }
  return String(value);
}

function domainFor(row) {
  const value = `${row.className} ${row.name}`.toLowerCase();
  if (/spawnlocation/.test(value)) return 'spawn';
  if (/road|street|highway|bridge|tunnel/.test(value)) return 'area';
  if (/school|hospital|police|fire.?station|store|shop|bank|hotel|motel|church|airport|house|home/.test(value)) return 'building';
  if (/classroom|bedroom|bathroom|kitchen|cafeteria|garage|interior|room/.test(value)) return 'interior';
  if (/imagelabel|imagebutton|decal|texture/.test(value)) return 'image';
  if (/sound/.test(value)) return 'audio';
  if (/animation/.test(value)) return 'animation';
  if (/meshpart|specialmesh/.test(value)) return 'mesh';
  return 'world-instance';
}

function assetKindFor(className, property) {
  if (className === 'Sound' || /sound/i.test(property)) return 'audio';
  if (className === 'Animation' || /animation/i.test(property)) return 'animation';
  if (/mesh/i.test(property) || ['MeshPart', 'SpecialMesh'].includes(className)) return 'mesh';
  return 'image';
}

export function walkLegacyBrookhavenDom(root) {
  const rows = [];
  const visit = (node, parentPath = '', ordinal = 1) => {
    if (!node || typeof node !== 'object') return;
    const segment = `${escapeSegment(nameOf(node))}[${ordinal}]`;
    const sourcePath = parentPath ? `${parentPath}/${segment}` : segment;
    const row = {
      node,
      sourcePath,
      parentPath: parentPath || null,
      name: nameOf(node),
      className: classNameOf(node)
    };
    rows.push(row);
    const seen = new Map();
    for (const child of childrenOf(node)) {
      const key = `${classNameOf(child)}\u0000${nameOf(child)}`;
      const nextOrdinal = (seen.get(key) ?? 0) + 1;
      seen.set(key, nextOrdinal);
      visit(child, sourcePath, nextOrdinal);
    }
  };
  visit(root);
  return rows;
}

export function buildLegacyBrookhavenPathInventory(root) {
  const walked = walkLegacyBrookhavenDom(root);
  const assetRows = [];
  const pathRows = walked.map((row, index) => {
    const properties = row.node?.properties && typeof row.node.properties === 'object'
      ? row.node.properties
      : {};
    const configured = ASSET_PROPERTIES[row.className] ?? [];
    const discovered = Object.keys(properties).filter(key =>
      /^(Image|Texture|TextureId|TextureID|SoundId|AnimationId|MeshId)$/i.test(key)
    );
    const propertyNames = [...new Set([...configured, ...discovered])];
    for (const property of propertyNames) {
      const reference = scalar(properties[property]).trim();
      if (!reference) continue;
      assetRows.push({
        id: `ASSET-${String(assetRows.length + 1).padStart(6, '0')}`,
        sourcePath: row.sourcePath,
        name: row.name,
        className: row.className,
        domain: domainFor(row),
        assetKind: assetKindFor(row.className, property),
        property,
        reference
      });
    }
    return {
      id: `PATH-${String(index + 1).padStart(6, '0')}`,
      sourcePath: row.sourcePath,
      parentPath: row.parentPath,
      name: row.name,
      className: row.className,
      domain: domainFor(row),
      assetReferenceCount: 0
    };
  });

  const assetCounts = new Map();
  for (const asset of assetRows) {
    assetCounts.set(asset.sourcePath, (assetCounts.get(asset.sourcePath) ?? 0) + 1);
  }
  for (const row of pathRows) row.assetReferenceCount = assetCounts.get(row.sourcePath) ?? 0;

  const runtimeRows = pathRows.map(row => ({
    id: `MAP-${row.id.slice(5)}`,
    sourcePath: row.sourcePath,
    domain: row.domain,
    runtimePath: '',
    status: 'unmapped',
    gapReason: 'runtime-binding-not-yet-proven'
  }));
  const countsByDomain = Object.fromEntries([...new Set(pathRows.map(row => row.domain))]
    .sort().map(domain => [domain, pathRows.filter(row => row.domain === domain).length]));
  const countsByAssetKind = Object.fromEntries([...new Set(assetRows.map(row => row.assetKind))]
    .sort().map(kind => [kind, assetRows.filter(row => row.assetKind === kind).length]));

  return {
    pathRows,
    assetRows,
    runtimeRows,
    summary: {
      instanceCount: pathRows.length,
      assetReferenceCount: assetRows.length,
      countsByDomain,
      countsByAssetKind,
      sourceScriptsExecuted: false,
      sourceScriptsEvaluated: false,
      currentLiveBrookhavenVersionPinned: false,
      exactCurrentParityClaimAllowed: false
    }
  };
}

export function csvFromRows(rows, columns) {
  const cell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [columns.join(','), ...rows.map(row => columns.map(column => cell(row[column])).join(','))]
    .join('\n') + '\n';
}

export const ABVM_GRADE2_FALLBACK_SNAPSHOT_VERSION = 'starblox-abvm-fallback-v1';

export const ABVM_GRADE2_FALLBACK_SOURCE = Object.freeze({
  snapshotVersion:ABVM_GRADE2_FALLBACK_SNAPSHOT_VERSION,
  sourceId:'abvm-grade2-current-source-pack',
  snapshotKind:'canonical-in-repo-fallback-representation',
  scope:'The current StarBlox fallback source used by the six grammar/language questions.',
  provenanceNote:'This snapshot represents the exact curriculum claims currently encoded in StarBlox. It is not asserted to be an external original ABVM source file.',
  claims:Object.freeze([
    Object.freeze({
      id:'grammar-plural-x',
      statement:'Words ending in x usually form the plural by adding -es.',
      supports:['grammar-0']
    }),
    Object.freeze({
      id:'grammar-plural-regular',
      statement:'Most regular nouns like dog form the plural by adding -s.',
      supports:['grammar-1']
    }),
    Object.freeze({
      id:'grammar-command',
      statement:'A command is a sentence that tells someone to do something.',
      supports:['grammar-2']
    }),
    Object.freeze({
      id:'grammar-exclamation',
      statement:'An exclamation is a sentence that shows strong feeling.',
      supports:['grammar-3']
    }),
    Object.freeze({
      id:'grammar-show-feeling',
      statement:'Strong writing can show a character feeling through an action instead of naming the feeling directly.',
      supports:['grammar-4']
    }),
    Object.freeze({
      id:'grammar-complete-sentence',
      statement:'A complete sentence expresses a complete thought.',
      supports:['grammar-5']
    })
  ])
});

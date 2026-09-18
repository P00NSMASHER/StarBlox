import { gameModel } from './gameModel';

// Portable, repo-owned catalog artwork. Keep this map explicit so every finished
// asset is attached to the exact stable store item ID rather than inferred from
// card position, tier, or display name.
const portableCatalogArt = Object.freeze({
  'tops-1': '/assets/catalog/tops-1.svg',
  'tops-2': '/assets/catalog/tops-2.svg',
  'tops-3': '/assets/catalog/tops-3.svg',
  'tops-4': '/assets/catalog/tops-4.svg',
  'tops-5': '/assets/catalog/tops-5.svg',
  'tops-6': '/assets/catalog/tops-6.svg',
  'tops-7': '/assets/catalog/tops-7.svg',
  'tops-8': '/assets/catalog/tops-8.svg',
  'tops-9': '/assets/catalog/tops-9.svg',
  'tops-10': '/assets/catalog/tops-10.svg',
  'tops-11': '/assets/catalog/tops-11.svg',
  'tops-12': '/assets/catalog/tops-12.svg'
});

for (const item of gameModel.store) {
  const assetPath = portableCatalogArt[item.id];
  if (assetPath) item.image = assetPath;
}

export { portableCatalogArt };

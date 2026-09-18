import { gameModel } from './gameModel';
import './shoesAvatarRuntime';
import './backgearAvatarRuntime';
import './shoesAvatar.css';
import './backgearAvatar.css';

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
  'tops-12': '/assets/catalog/tops-12.svg',
  'bottoms-1': '/assets/catalog/bottoms-1.svg',
  'bottoms-2': '/assets/catalog/bottoms-2.svg',
  'bottoms-3': '/assets/catalog/bottoms-3.svg',
  'bottoms-4': '/assets/catalog/bottoms-4.svg',
  'bottoms-5': '/assets/catalog/bottoms-5.svg',
  'bottoms-6': '/assets/catalog/bottoms-6.svg',
  'bottoms-7': '/assets/catalog/bottoms-7.svg',
  'bottoms-8': '/assets/catalog/bottoms-8.svg',
  'bottoms-9': '/assets/catalog/bottoms-9.svg',
  'bottoms-10': '/assets/catalog/bottoms-10.svg',
  'bottoms-11': '/assets/catalog/bottoms-11.svg',
  'bottoms-12': '/assets/catalog/bottoms-12.svg',
  'shoes-1': '/assets/catalog/shoes-1.svg',
  'shoes-2': '/assets/catalog/shoes-2.svg',
  'shoes-3': '/assets/catalog/shoes-3.svg',
  'shoes-4': '/assets/catalog/shoes-4.svg',
  'shoes-5': '/assets/catalog/shoes-5.svg',
  'shoes-6': '/assets/catalog/shoes-6.svg',
  'shoes-7': '/assets/catalog/shoes-7.svg',
  'shoes-8': '/assets/catalog/shoes-8.svg',
  'shoes-9': '/assets/catalog/shoes-9.svg',
  'shoes-10': '/assets/catalog/shoes-10.svg',
  'shoes-11': '/assets/catalog/shoes-11.svg',
  'shoes-12': '/assets/catalog/shoes-12.svg',
  'companions-1': '/assets/catalog/companions-1.svg',
  'beds-1': '/assets/catalog/beds-1.svg',
  'desks-1': '/assets/catalog/desks-1.svg',
  'headwear-1': '/assets/catalog/headwear-1.svg',
  'headwear-2': '/assets/catalog/headwear-2.svg',
  'headwear-3': '/assets/catalog/headwear-3.svg',
  'headwear-4': '/assets/catalog/headwear-4.svg',
  'headwear-5': '/assets/catalog/headwear-5.svg',
  'headwear-6': '/assets/catalog/headwear-6.svg',
  'headwear-7': '/assets/catalog/headwear-7.svg',
  'headwear-8': '/assets/catalog/headwear-8.svg',
  'headwear-9': '/assets/catalog/headwear-9.svg',
  'headwear-10': '/assets/catalog/headwear-10.svg',
  'headwear-11': '/assets/catalog/headwear-11.svg',
  'headwear-12': '/assets/catalog/headwear-12.svg',
  'facegear-1': '/assets/catalog/facegear-1.svg',
  'facegear-2': '/assets/catalog/facegear-2.svg',
  'facegear-3': '/assets/catalog/facegear-3.svg',
  'facegear-4': '/assets/catalog/facegear-4.svg',
  'facegear-5': '/assets/catalog/facegear-5.svg',
  'facegear-6': '/assets/catalog/facegear-6.svg',
  'facegear-7': '/assets/catalog/facegear-7.svg',
  'facegear-8': '/assets/catalog/facegear-8.svg',
  'facegear-9': '/assets/catalog/facegear-9.svg',
  'facegear-10': '/assets/catalog/facegear-10.svg',
  'facegear-11': '/assets/catalog/facegear-11.svg',
  'facegear-12': '/assets/catalog/facegear-12.svg',
  'backgear-1': '/assets/catalog/backgear-1.svg',
  'backgear-2': '/assets/catalog/backgear-2.svg'
});

for (const item of gameModel.store) {
  const assetPath = portableCatalogArt[item.id];
  if (assetPath) item.image = assetPath;
}

export { portableCatalogArt };

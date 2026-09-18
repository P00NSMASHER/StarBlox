import React from 'react';
import { createRoot } from 'react-dom/client';
import './catalogArtRuntime';
import './headwearAvatarRuntime';
import './facegearAvatarRuntime';
import './questionQualityRuntime';
import './semanticQuestionGuardRuntime';
import './diagnosticQuestionGuardRuntime';
import './purchaseGuardRuntime';
import { App } from './App';
import './styles.css';
import './release.css';
import './homeHero.css';
import './questVisual.css';
import './questPolish.css';
import './questSceneUpgrade.css';
import './questResponsiveFix.css';
import './headwearAvatar.css';
import './facegearAvatar.css';
import './homeHeroRuntime';
import './questVisualRuntime';
import './questContextArtRuntime';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

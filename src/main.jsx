import React from 'react';
import { createRoot } from 'react-dom/client';
import './catalogArtRuntime';
import './questionQualityRuntime';
import { App } from './App';
import './styles.css';
import './release.css';
import './homeHero.css';
import './questVisual.css';
import './homeHeroRuntime';
import './questVisualRuntime';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

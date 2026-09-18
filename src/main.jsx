import React from 'react';
import { createRoot } from 'react-dom/client';
import './catalogArtRuntime';
import { App } from './App';
import './styles.css';
import './release.css';
import './homeHero.css';
import './homeHeroRuntime';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

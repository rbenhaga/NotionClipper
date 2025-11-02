import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Google Fonts sont importées dans App.css

// Vérifier si on est en mode bulle
const urlParams = new URLSearchParams(window.location.search);
const isBubbleMode = urlParams.get('mode') === 'bubble';

const root = ReactDOM.createRoot(document.getElementById('root'));

if (isBubbleMode) {
  // Mode bulle - charger le composant bulle
  import('./bubble-main.tsx').then((module) => {
    const BubbleApp = module.default;
    root.render(
      <React.StrictMode>
        <BubbleApp />
      </React.StrictMode>
    );
  }).catch(error => {
    console.error('Error loading bubble app:', error);
    // Fallback vers l'app principale
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
} else {
  // Mode normal - charger l'app principale
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
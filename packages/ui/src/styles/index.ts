// packages/ui/src/styles/index.ts
// 🎯 Centralized styles exports

// Import all CSS files to ensure they're included in the build
import './base.css';
import './components.css';
import './utilities.css';
import './themes.css';

// Note: Plate editor styles from @notion-clipper/plate-adapter are NOT imported here
// because plate-adapter is marked as external in vite.config.ts.
// The consuming application (e.g., Electron app) must import them directly:
// import '@notion-clipper/plate-adapter/styles';

// Re-export for explicit imports if needed
export * from './tokens';
export * from './mixins';
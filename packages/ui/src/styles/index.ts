// packages/ui/src/styles/index.ts
// 🎯 Centralized styles exports

// Import all CSS files to ensure they're included in the build
import './base.css';
import './components.css';
import './utilities.css';
import './themes.css';

// Plate editor styles are imported from @notion-clipper/plate-adapter
// No custom overrides needed here - styles are in the plate-adapter package

// Re-export for explicit imports if needed
export * from './tokens';
export * from './mixins';
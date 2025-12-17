// packages/ui/src/contexts/index.ts
// Context exports for global state management

// ============================================
// AUTHENTICATION CONTEXT
// ============================================
export { AuthProvider, useAuth } from './AuthContext';
export type { AuthContextValue, UserProfile, AuthProviderProps } from './AuthContext';

// ============================================
// DENSITY CONTEXT (UI density: comfortable/compact)
// ============================================
export { DensityProvider, useDensity, useDensityOptional } from './DensityContext';
export type { DensityMode, PlatformMode } from './DensityContext';

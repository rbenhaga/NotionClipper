// packages/ui/src/utils/scopedStorage.ts
/**
 * Scoped Storage Utility - DUAL SCOPE ARCHITECTURE
 * 
 * Provides two levels of scoping to prevent data leakage:
 * 
 * 1. USER SCOPE (`user:{userId}`) - For app-level preferences
 *    - theme, density, window preferences
 *    - language/locale
 *    - onboarding state
 *    - auth flags
 * 
 * 2. NOTION SCOPE (`user:{userId}:ws:{workspaceId}`) - For Notion-specific data
 *    - pages cache (all/recent/favorites/suggested)
 *    - selectedSections / TOC preferences
 *    - queue/history (tied to Notion pages)
 *    - favorites, rules, templates
 * 
 * This prevents:
 * - User A seeing User B's data (user scope)
 * - Same user seeing Workspace A data when on Workspace B (notion scope)
 */

// Current scopes
let currentUserScope: string = '';
let currentNotionScope: string = '';
let currentWorkspaceId: string = '';

/**
 * Set the current user scope (called on login/logout)
 * @param userId - The user's unique ID
 */
export function setUserScope(userId: string): void {
  const newScope = userId ? `user:${userId}` : '';
  if (newScope !== currentUserScope) {
    console.log(`[ScopedStorage] 🔄 User scope changed: ${currentUserScope || 'none'} → ${newScope || 'none'}`);
    currentUserScope = newScope;
  }
}

/**
 * Set the Notion workspace scope (called when workspace is known)
 * @param userId - The user's unique ID
 * @param workspaceId - The Notion workspace ID
 */
export function setNotionScope(userId: string, workspaceId: string): void {
  if (!userId || !workspaceId) {
    console.log(`[ScopedStorage] ⚠️ Cannot set Notion scope without userId and workspaceId`);
    return;
  }
  const newScope = `user:${userId}:ws:${workspaceId}`;
  if (newScope !== currentNotionScope) {
    console.log(`[ScopedStorage] 🔄 Notion scope changed: ${currentNotionScope || 'none'} → ${newScope}`);
    currentNotionScope = newScope;
    currentWorkspaceId = workspaceId;
  }
}

/**
 * Set both scopes at once (convenience method)
 * @param userId - The user's unique ID (required)
 * @param workspaceId - The Notion workspace ID (optional - Notion scope only set if provided)
 */
export function setCurrentScope(userId: string, workspaceId?: string): void {
  setUserScope(userId);
  if (workspaceId) {
    setNotionScope(userId, workspaceId);
  }
}

/**
 * Clear all scopes (called on logout)
 */
export function clearCurrentScope(): void {
  console.log(`[ScopedStorage] 🧹 Scopes cleared (user: ${currentUserScope || 'none'}, notion: ${currentNotionScope || 'none'})`);
  currentUserScope = '';
  currentNotionScope = '';
  currentWorkspaceId = '';
}

/**
 * Get the current user scope
 */
export function getUserScope(): string {
  return currentUserScope;
}

/**
 * Get the current Notion scope
 */
export function getNotionScope(): string {
  return currentNotionScope;
}

/**
 * Get the current workspace ID
 */
export function getCurrentWorkspaceId(): string {
  return currentWorkspaceId;
}

/**
 * Check if Notion scope is ready (workspaceId is known)
 */
export function isNotionScopeReady(): boolean {
  return currentNotionScope !== '';
}

/**
 * Legacy compatibility - returns user scope
 * @deprecated Use getUserScope() or getNotionScope() instead
 */
export function getCurrentScope(): string {
  return currentUserScope;
}

/**
 * Keys that are GLOBAL (no scoping)
 */
const GLOBAL_KEYS = new Set([
  'theme',
  'language',
  'locale',
  'analytics_events_debug',
]);

/**
 * Keys that use USER scope (same across workspaces for same user)
 */
const USER_SCOPED_KEYS = new Set([
  'density',
  'windowPreferences',
  'onboarding_progress',
  'resizable-layout', // UI layout preferences
]);

/**
 * Keys that use NOTION scope (per workspace)
 * Everything else defaults to this if not in GLOBAL or USER_SCOPED
 */
const NOTION_SCOPED_KEYS = new Set([
  'selectedSections',
  'clipper-offline-queue',
  'clipper-offline-history',
  'clipper-pending-quotas',
  'favorites',
  'rules',
  'templates',
  // pages cache is handled separately in useInfinitePages (in-memory)
]);

/**
 * Determine the scope type for a key
 */
export type ScopeType = 'global' | 'user' | 'notion';

export function getScopeType(baseKey: string): ScopeType {
  if (GLOBAL_KEYS.has(baseKey)) return 'global';
  if (USER_SCOPED_KEYS.has(baseKey)) return 'user';
  // Default to notion scope for unknown keys (safer)
  return 'notion';
}

/**
 * Get a scoped storage key based on the key's scope type
 * @param baseKey - The base key (e.g., 'selectedSections')
 * @returns Appropriately scoped key
 */
export function getScopedKey(baseKey: string): string {
  const scopeType = getScopeType(baseKey);
  
  switch (scopeType) {
    case 'global':
      return baseKey;
    case 'user':
      if (!currentUserScope) return baseKey; // Fallback to global if no user
      return `${currentUserScope}:${baseKey}`;
    case 'notion':
      if (!currentNotionScope) {
        // Notion scope not ready - use user scope as fallback with warning
        if (currentUserScope) {
          console.warn(`[ScopedStorage] ⚠️ Notion scope not ready for key "${baseKey}", using user scope`);
          return `${currentUserScope}:${baseKey}`;
        }
        return baseKey; // Last resort: global
      }
      return `${currentNotionScope}:${baseKey}`;
  }
}

/**
 * Get the appropriate key (alias for getScopedKey)
 */
export function getStorageKey(baseKey: string): string {
  return getScopedKey(baseKey);
}

/**
 * Check if a key belongs to the current notion scope
 */
export function isCurrentNotionScopeKey(key: string): boolean {
  if (!currentNotionScope) return true; // No scope = accept all
  return key.startsWith(currentNotionScope + ':');
}

/**
 * Check if a key belongs to the current user scope
 */
export function isCurrentUserScopeKey(key: string): boolean {
  if (!currentUserScope) return true;
  return key.startsWith(currentUserScope + ':');
}

/**
 * Legacy compatibility
 * @deprecated Use getScopeType() instead
 */
export function shouldScopeKey(baseKey: string): boolean {
  return getScopeType(baseKey) !== 'global';
}

/**
 * Extract the base key from a scoped key
 */
export function getBaseKey(scopedKey: string): string {
  // Format: user:{userId}:ws:{workspaceId}:{baseKey} or user:{userId}:{baseKey} or {baseKey}
  const parts = scopedKey.split(':');
  if (parts.length >= 5 && parts[0] === 'user' && parts[2] === 'ws') {
    // Notion scope: user:xxx:ws:yyy:baseKey
    return parts.slice(4).join(':');
  }
  if (parts.length >= 3 && parts[0] === 'user') {
    // User scope: user:xxx:baseKey
    return parts.slice(2).join(':');
  }
  return scopedKey;
}

/**
 * Get prefix for current notion scope (for cleanup)
 */
export function getNotionScopePrefix(): string {
  return currentNotionScope ? `${currentNotionScope}:` : '';
}

/**
 * Get prefix for current user scope (for cleanup)
 */
export function getUserScopePrefix(): string {
  return currentUserScope ? `${currentUserScope}:` : '';
}

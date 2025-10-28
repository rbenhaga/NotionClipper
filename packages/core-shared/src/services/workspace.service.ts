// packages/core-shared/src/services/workspace.service.ts

import type {
  IWorkspace,
  NotionWorkspace,
  ISupabaseAdapter,
  IStorage
} from '../interfaces';

/**
 * Generic Workspace Service
 * Uses dependency injection with ISupabaseAdapter and IStorage
 */
export class WorkspaceService implements IWorkspace {
  private adapter: ISupabaseAdapter;
  private storage: IStorage;
  private workspaces: NotionWorkspace[] = [];
  private currentWorkspaceId: string | null = null;
  private workspaceListeners: Array<(workspaces: NotionWorkspace[]) => void> = [];

  constructor(adapter: ISupabaseAdapter, storage: IStorage) {
    this.adapter = adapter;
    this.storage = storage;
  }

  async initialize(userId: string): Promise<void> {
    try {
      // Load workspaces from Supabase
      const workspaces = await this.adapter.fetchWorkspaces(userId);
      this.workspaces = workspaces;

      // Load current workspace from local storage
      const savedWorkspaceId = await this.storage.get('currentWorkspaceId');
      if (savedWorkspaceId && typeof savedWorkspaceId === 'string' && workspaces.find((w: NotionWorkspace) => w.id === savedWorkspaceId)) {
        this.currentWorkspaceId = savedWorkspaceId;
      } else {
        // Use default workspace
        const defaultWorkspace = workspaces.find((w: NotionWorkspace) => w.is_default);
        this.currentWorkspaceId = defaultWorkspace?.id || workspaces[0]?.id || null;
      }

      this.notifyListeners();
    } catch (error) {
      console.error('❌ Failed to initialize workspace service:', error);
      throw error;
    }
  }

  async getWorkspaces(): Promise<NotionWorkspace[]> {
    return this.workspaces;
  }

  async getWorkspace(workspaceId: string): Promise<NotionWorkspace | null> {
    return this.workspaces.find(w => w.id === workspaceId) || null;
  }

  async getDefaultWorkspace(): Promise<NotionWorkspace | null> {
    return this.workspaces.find(w => w.is_default) || this.workspaces[0] || null;
  }

  async getCurrentWorkspace(): Promise<NotionWorkspace | null> {
    if (!this.currentWorkspaceId) return this.getDefaultWorkspace();
    return this.getWorkspace(this.currentWorkspaceId);
  }

  async setDefaultWorkspace(workspaceId: string): Promise<void> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Update in Supabase
      await this.adapter.setDefaultWorkspace(workspace.user_id, workspaceId);

      // Update local state
      this.workspaces = this.workspaces.map((w: NotionWorkspace) => ({
        ...w,
        is_default: w.id === workspaceId
      }));

      this.notifyListeners();
    } catch (error) {
      console.error('❌ Failed to set default workspace:', error);
      throw error;
    }
  }

  async switchWorkspace(workspaceId: string): Promise<void> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Update current workspace
      this.currentWorkspaceId = workspaceId;

      // Save to local storage
      await this.storage.set('currentWorkspaceId', workspaceId);

      // Update last_used_at in Supabase
      await this.adapter.updateWorkspace(workspaceId, {
        last_used_at: new Date().toISOString()
      });

      // Update local state
      const workspaceIndex = this.workspaces.findIndex(w => w.id === workspaceId);
      if (workspaceIndex !== -1) {
        this.workspaces[workspaceIndex].last_used_at = new Date().toISOString();
      }

      this.notifyListeners();
    } catch (error) {
      console.error('❌ Failed to switch workspace:', error);
      throw error;
    }
  }

  async updateWorkspace(workspaceId: string, updates: Partial<NotionWorkspace>): Promise<void> {
    try {
      // Update in Supabase
      await this.adapter.updateWorkspace(workspaceId, updates);

      // Update local state
      const workspaceIndex = this.workspaces.findIndex(w => w.id === workspaceId);
      if (workspaceIndex !== -1) {
        this.workspaces[workspaceIndex] = {
          ...this.workspaces[workspaceIndex],
          ...updates,
          updated_at: new Date().toISOString()
        };
      }

      this.notifyListeners();
    } catch (error) {
      console.error('❌ Failed to update workspace:', error);
      throw error;
    }
  }

  async removeWorkspace(workspaceId: string): Promise<void> {
    try {
      // Delete from Supabase
      await this.adapter.deleteWorkspace(workspaceId);

      // Remove from local state
      this.workspaces = this.workspaces.filter((w: NotionWorkspace) => w.id !== workspaceId);

      // If we removed the current workspace, switch to another
      if (this.currentWorkspaceId === workspaceId) {
        const defaultWorkspace = await this.getDefaultWorkspace();
        this.currentWorkspaceId = defaultWorkspace?.id || null;
        
        if (this.currentWorkspaceId) {
          await this.storage.set('currentWorkspaceId', this.currentWorkspaceId);
        } else {
          await this.storage.remove('currentWorkspaceId');
        }
      }

      this.notifyListeners();
    } catch (error) {
      console.error('❌ Failed to remove workspace:', error);
      throw error;
    }
  }

  async refreshWorkspace(workspaceId: string): Promise<void> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Fetch fresh data from Supabase
      const workspaces = await this.adapter.fetchWorkspaces(workspace.user_id);
      const refreshedWorkspace = workspaces.find(w => w.id === workspaceId);

      if (refreshedWorkspace) {
        const workspaceIndex = this.workspaces.findIndex(w => w.id === workspaceId);
        if (workspaceIndex !== -1) {
          this.workspaces[workspaceIndex] = refreshedWorkspace;
        }
      }

      this.notifyListeners();
    } catch (error) {
      console.error('❌ Failed to refresh workspace:', error);
      throw error;
    }
  }

  async refreshAllWorkspaces(userId: string): Promise<void> {
    try {
      this.workspaces = await this.adapter.fetchWorkspaces(userId);
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Failed to refresh all workspaces:', error);
      throw error;
    }
  }

  onWorkspaceChange(callback: (workspaces: NotionWorkspace[]) => void): () => void {
    this.workspaceListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.workspaceListeners.indexOf(callback);
      if (index > -1) {
        this.workspaceListeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.workspaceListeners.forEach(listener => {
      try {
        listener([...this.workspaces]);
      } catch (error) {
        console.error('❌ Error in workspace listener:', error);
      }
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get workspace by Notion workspace ID (not UUID)
   */
  async getWorkspaceByNotionId(notionWorkspaceId: string): Promise<NotionWorkspace | null> {
    return this.workspaces.find(w => w.workspace_id === notionWorkspaceId) || null;
  }

  /**
   * Check if workspace exists
   */
  async hasWorkspace(workspaceId: string): Promise<boolean> {
    return this.workspaces.some(w => w.id === workspaceId);
  }

  /**
   * Get workspace count
   */
  getWorkspaceCount(): number {
    return this.workspaces.length;
  }

  /**
   * Get active workspaces only
   */
  getActiveWorkspaces(): NotionWorkspace[] {
    return this.workspaces.filter(w => w.is_active);
  }

  /**
   * Sort workspaces by last used
   */
  getWorkspacesSortedByUsage(): NotionWorkspace[] {
    return [...this.workspaces].sort((a: NotionWorkspace, b: NotionWorkspace) => {
      const dateA = new Date(a.last_used_at).getTime();
      const dateB = new Date(b.last_used_at).getTime();
      return dateB - dateA;
    });
  }
}
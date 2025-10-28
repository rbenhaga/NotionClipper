import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

// Dynamic import to avoid circular dependencies
let workspaceService: any = null;

interface WorkspaceData {
  name: string;
  apiKey: string;
  icon?: string;
}

/**
 * Setup Multi-Workspace Internal IPC Handlers
 */
async function setupMultiWorkspaceInternalHandlers(): Promise<void> {
  console.log('🔧 Setting up multi-workspace internal IPC handlers...');

  // Initialize service
  if (!workspaceService) {
    const { MultiWorkspaceInternalService } = require('../services/multi-workspace-internal.service');
    workspaceService = new MultiWorkspaceInternalService();
  }

  // Add workspace with API key
  ipcMain.handle('workspace-internal:add', async (_event: IpcMainInvokeEvent, workspaceData: WorkspaceData) => {
    try {
      const result = await workspaceService.addWorkspace(workspaceData);
      return result;
    } catch (error: any) {
      console.error('❌ Add workspace failed:', error);
      return { 
        success: false, 
        error: error.message,
        code: 'ADD_WORKSPACE_FAILED'
      };
    }
  });

  // Get all workspaces
  ipcMain.handle('workspace-internal:get-all', async (_event: IpcMainInvokeEvent) => {
    try {
      const workspaces = workspaceService.getWorkspaces();
      return { 
        success: true, 
        workspaces,
        count: workspaces.length
      };
    } catch (error: any) {
      console.error('❌ Get workspaces failed:', error);
      return { 
        success: false, 
        error: error.message,
        workspaces: [],
        count: 0
      };
    }
  });

  // Get current workspace
  ipcMain.handle('workspace-internal:get-current', async (_event: IpcMainInvokeEvent) => {
    try {
      const workspace = workspaceService.getCurrentWorkspace();
      return { 
        success: true, 
        workspace,
        hasWorkspace: !!workspace
      };
    } catch (error: any) {
      console.error('❌ Get current workspace failed:', error);
      return { 
        success: false, 
        error: error.message,
        workspace: null,
        hasWorkspace: false
      };
    }
  });

  // Switch workspace
  ipcMain.handle('workspace-internal:switch', async (_event: IpcMainInvokeEvent, workspaceId: string) => {
    try {
      const result = await workspaceService.switchWorkspace(workspaceId);
      return result;
    } catch (error: any) {
      console.error('❌ Switch workspace failed:', error);
      return { 
        success: false, 
        error: error.message,
        code: 'WORKSPACE_SWITCH_FAILED'
      };
    }
  });

  // Set default workspace
  ipcMain.handle('workspace-internal:set-default', async (_event: IpcMainInvokeEvent, workspaceId: string) => {
    try {
      const result = await workspaceService.setDefaultWorkspace(workspaceId);
      return result;
    } catch (error: any) {
      console.error('❌ Set default workspace failed:', error);
      return { 
        success: false, 
        error: error.message,
        code: 'SET_DEFAULT_FAILED'
      };
    }
  });

  // Remove workspace
  ipcMain.handle('workspace-internal:remove', async (_event: IpcMainInvokeEvent, workspaceId: string) => {
    try {
      const result = await workspaceService.removeWorkspace(workspaceId);
      return result;
    } catch (error: any) {
      console.error('❌ Remove workspace failed:', error);
      return { 
        success: false, 
        error: error.message,
        code: 'WORKSPACE_REMOVE_FAILED'
      };
    }
  });

  // Get workspace API key
  ipcMain.handle('workspace-internal:get-api-key', async (_event: IpcMainInvokeEvent, workspaceId: string) => {
    try {
      const apiKey = workspaceService.getWorkspaceApiKey(workspaceId);
      return { 
        success: true, 
        apiKey,
        hasApiKey: !!apiKey
      };
    } catch (error: any) {
      console.error('❌ Get API key failed:', error);
      return { 
        success: false, 
        error: error.message,
        apiKey: null,
        hasApiKey: false
      };
    }
  });

  // Get workspace statistics
  ipcMain.handle('workspace-internal:get-stats', async (_event: IpcMainInvokeEvent) => {
    try {
      const stats = workspaceService.getWorkspaceStats();
      return { 
        success: true, 
        stats
      };
    } catch (error: any) {
      console.error('❌ Get workspace stats failed:', error);
      return { 
        success: false, 
        error: error.message,
        stats: { total: 0, active: 0, hasDefault: false, lastUsed: null }
      };
    }
  });

  // Validate API key
  ipcMain.handle('workspace-internal:validate-api-key', async (_event: IpcMainInvokeEvent, apiKey: string) => {
    try {
      const workspaceInfo = await workspaceService.validateAndGetWorkspaceInfo(apiKey);
      return { 
        success: true, 
        valid: true,
        workspaceInfo
      };
    } catch (error: any) {
      console.error('❌ API key validation failed:', error);
      return { 
        success: false, 
        valid: false,
        error: error.message
      };
    }
  });

  // Clear all data
  ipcMain.handle('workspace-internal:clear-all', async (_event: IpcMainInvokeEvent) => {
    try {
      workspaceService.clearAll();
      return { 
        success: true,
        message: 'All workspace data cleared'
      };
    } catch (error: any) {
      console.error('❌ Clear all failed:', error);
      return { 
        success: false, 
        error: error.message
      };
    }
  });

  console.log('✅ Multi-workspace internal IPC handlers setup complete');
}

export { setupMultiWorkspaceInternalHandlers };
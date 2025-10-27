// apps/notion-clipper-app/src/electron/ipc/multi-workspace-internal.ipc.js

const { ipcMain } = require('electron');
const { MultiWorkspaceInternalService } = require('../services/multi-workspace-internal.service');

let workspaceService = null;

/**
 * Setup Multi-Workspace Internal IPC Handlers
 */
function setupMultiWorkspaceInternalHandlers() {
  console.log('🔧 Setting up multi-workspace internal IPC handlers...');

  // Initialize service
  if (!workspaceService) {
    workspaceService = new MultiWorkspaceInternalService();
  }

  // Add workspace with API key
  ipcMain.handle('workspace-internal:add', async (_, workspaceData) => {
    try {
      const result = await workspaceService.addWorkspace(workspaceData);
      return result;
    } catch (error) {
      console.error('❌ Add workspace failed:', error);
      return { 
        success: false, 
        error: error.message,
        code: 'ADD_WORKSPACE_FAILED'
      };
    }
  });

  // Get all workspaces
  ipcMain.handle('workspace-internal:get-all', async () => {
    try {
      const workspaces = workspaceService.getWorkspaces();
      return { 
        success: true, 
        workspaces,
        count: workspaces.length
      };
    } catch (error) {
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
  ipcMain.handle('workspace-internal:get-current', async () => {
    try {
      const workspace = workspaceService.getCurrentWorkspace();
      return { 
        success: true, 
        workspace,
        hasWorkspace: !!workspace
      };
    } catch (error) {
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
  ipcMain.handle('workspace-internal:switch', async (_, workspaceId) => {
    try {
      const result = await workspaceService.switchWorkspace(workspaceId);
      return result;
    } catch (error) {
      console.error('❌ Switch workspace failed:', error);
      return { 
        success: false, 
        error: error.message,
        code: 'WORKSPACE_SWITCH_FAILED'
      };
    }
  });

  // Set default workspace
  ipcMain.handle('workspace-internal:set-default', async (_, workspaceId) => {
    try {
      const result = await workspaceService.setDefaultWorkspace(workspaceId);
      return result;
    } catch (error) {
      console.error('❌ Set default workspace failed:', error);
      return { 
        success: false, 
        error: error.message,
        code: 'SET_DEFAULT_FAILED'
      };
    }
  });

  // Remove workspace
  ipcMain.handle('workspace-internal:remove', async (_, workspaceId) => {
    try {
      const result = await workspaceService.removeWorkspace(workspaceId);
      return result;
    } catch (error) {
      console.error('❌ Remove workspace failed:', error);
      return { 
        success: false, 
        error: error.message,
        code: 'WORKSPACE_REMOVE_FAILED'
      };
    }
  });

  // Get workspace API key
  ipcMain.handle('workspace-internal:get-api-key', async (_, workspaceId) => {
    try {
      const apiKey = workspaceService.getWorkspaceApiKey(workspaceId);
      return { 
        success: true, 
        apiKey,
        hasApiKey: !!apiKey
      };
    } catch (error) {
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
  ipcMain.handle('workspace-internal:get-stats', async () => {
    try {
      const stats = workspaceService.getWorkspaceStats();
      return { 
        success: true, 
        stats
      };
    } catch (error) {
      console.error('❌ Get workspace stats failed:', error);
      return { 
        success: false, 
        error: error.message,
        stats: { total: 0, active: 0, hasDefault: false, lastUsed: null }
      };
    }
  });

  // Validate API key
  ipcMain.handle('workspace-internal:validate-api-key', async (_, apiKey) => {
    try {
      const workspaceInfo = await workspaceService.validateAndGetWorkspaceInfo(apiKey);
      return { 
        success: true, 
        valid: true,
        workspaceInfo
      };
    } catch (error) {
      console.error('❌ API key validation failed:', error);
      return { 
        success: false, 
        valid: false,
        error: error.message
      };
    }
  });

  // Clear all data
  ipcMain.handle('workspace-internal:clear-all', async () => {
    try {
      workspaceService.clearAll();
      return { 
        success: true,
        message: 'All workspace data cleared'
      };
    } catch (error) {
      console.error('❌ Clear all failed:', error);
      return { 
        success: false, 
        error: error.message
      };
    }
  });

  console.log('✅ Multi-workspace internal IPC handlers setup complete');
}

module.exports = { setupMultiWorkspaceInternalHandlers };
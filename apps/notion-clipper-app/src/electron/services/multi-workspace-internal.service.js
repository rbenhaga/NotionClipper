// apps/notion-clipper-app/src/electron/services/multi-workspace-internal.service.js

const Store = require('electron-store');

/**
 * Multi-Workspace Service avec Intégrations Internes
 * Permet de gérer plusieurs workspaces avec des tokens d'API séparés
 */
class MultiWorkspaceInternalService {
  constructor() {
    this.store = new Store({
      name: 'notion-clipper-workspaces-internal',
      encryptionKey: 'notion-clipper-workspace-internal-2024'
    });
  }

  /**
   * Ajouter un workspace avec son token d'API interne
   */
  async addWorkspace(workspaceData) {
    try {
      const { name, apiKey, isDefault = false } = workspaceData;

      if (!name || !apiKey) {
        throw new Error('Workspace name and API key are required');
      }

      // Valider le token avec l'API Notion
      const workspaceInfo = await this.validateAndGetWorkspaceInfo(apiKey);
      
      const workspace = {
        id: `internal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        notion_workspace_id: workspaceInfo.workspace_id,
        notion_workspace_name: workspaceInfo.workspace_name,
        notion_workspace_icon: workspaceInfo.workspace_icon,
        api_key: apiKey, // Stocké de manière chiffrée par electron-store
        type: 'internal',
        is_default: isDefault,
        is_active: true,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString()
      };

      // Si c'est le workspace par défaut, désactiver les autres
      if (isDefault) {
        this.setAllWorkspacesNonDefault();
      }

      // Sauvegarder
      const workspaces = this.getWorkspaces();
      workspaces.push(workspace);
      this.store.set('workspaces', workspaces);

      console.log('✅ Workspace added:', workspace.name);
      return { success: true, workspace };

    } catch (error) {
      console.error('❌ Failed to add workspace:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Valider un token d'API et récupérer les infos du workspace
   */
  async validateAndGetWorkspaceInfo(apiKey) {
    try {
      // Test avec l'endpoint /users/me pour valider le token
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (!response.ok) {
        throw new Error(`Invalid API key: ${response.status}`);
      }

      const userData = await response.json();

      // Essayer de récupérer des infos sur le workspace via une recherche
      const searchResponse = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          page_size: 1
        })
      });

      let workspaceName = 'Unknown Workspace';
      let workspaceIcon = null;

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        // On ne peut pas vraiment récupérer le nom du workspace avec une intégration interne
        // Mais on peut utiliser le nom de l'utilisateur comme indicateur
        workspaceName = userData.name ? `${userData.name}'s Workspace` : 'Notion Workspace';
      }

      return {
        workspace_id: `internal_${userData.id}`,
        workspace_name: workspaceName,
        workspace_icon: workspaceIcon,
        user: userData
      };

    } catch (error) {
      console.error('❌ API key validation failed:', error);
      throw new Error(`Invalid API key: ${error.message}`);
    }
  }

  /**
   * Obtenir tous les workspaces
   */
  getWorkspaces() {
    return this.store.get('workspaces', []);
  }

  /**
   * Obtenir le workspace actuel
   */
  getCurrentWorkspace() {
    const currentId = this.store.get('currentWorkspaceId');
    if (currentId) {
      return this.getWorkspaces().find(w => w.id === currentId);
    }
    
    // Fallback sur le workspace par défaut
    return this.getDefaultWorkspace();
  }

  /**
   * Obtenir le workspace par défaut
   */
  getDefaultWorkspace() {
    const workspaces = this.getWorkspaces();
    return workspaces.find(w => w.is_default) || workspaces[0] || null;
  }

  /**
   * Changer de workspace
   */
  async switchWorkspace(workspaceId) {
    try {
      const workspace = this.getWorkspaces().find(w => w.id === workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      this.store.set('currentWorkspaceId', workspaceId);
      
      // Mettre à jour last_used_at
      const workspaces = this.getWorkspaces();
      const index = workspaces.findIndex(w => w.id === workspaceId);
      if (index !== -1) {
        workspaces[index].last_used_at = new Date().toISOString();
        this.store.set('workspaces', workspaces);
      }

      console.log('✅ Switched to workspace:', workspace.name);
      return { success: true, workspace };

    } catch (error) {
      console.error('❌ Failed to switch workspace:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Définir un workspace comme défaut
   */
  async setDefaultWorkspace(workspaceId) {
    try {
      const workspaces = this.getWorkspaces();
      const workspace = workspaces.find(w => w.id === workspaceId);
      
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Désactiver tous les autres comme défaut
      workspaces.forEach(w => {
        w.is_default = w.id === workspaceId;
      });

      this.store.set('workspaces', workspaces);
      console.log('✅ Set default workspace:', workspace.name);
      
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to set default workspace:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Supprimer un workspace
   */
  async removeWorkspace(workspaceId) {
    try {
      const workspaces = this.getWorkspaces();
      const workspace = workspaces.find(w => w.id === workspaceId);
      
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Supprimer le workspace
      const updatedWorkspaces = workspaces.filter(w => w.id !== workspaceId);
      this.store.set('workspaces', updatedWorkspaces);

      // Si c'était le workspace actuel, changer vers un autre
      const currentId = this.store.get('currentWorkspaceId');
      if (currentId === workspaceId) {
        const newDefault = updatedWorkspaces.find(w => w.is_default) || updatedWorkspaces[0];
        if (newDefault) {
          this.store.set('currentWorkspaceId', newDefault.id);
        } else {
          this.store.delete('currentWorkspaceId');
        }
      }

      console.log('✅ Removed workspace:', workspace.name);
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to remove workspace:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtenir le token d'API pour un workspace
   */
  getWorkspaceApiKey(workspaceId = null) {
    const workspace = workspaceId ? 
      this.getWorkspaces().find(w => w.id === workspaceId) : 
      this.getCurrentWorkspace();
    
    return workspace ? workspace.api_key : null;
  }

  /**
   * Obtenir les statistiques des workspaces
   */
  getWorkspaceStats() {
    const workspaces = this.getWorkspaces();
    
    return {
      total: workspaces.length,
      active: workspaces.filter(w => w.is_active).length,
      hasDefault: workspaces.some(w => w.is_default),
      lastUsed: workspaces.length > 0 ? 
        Math.max(...workspaces.map(w => new Date(w.last_used_at).getTime())) : null
    };
  }

  /**
   * Désactiver tous les workspaces comme défaut
   */
  setAllWorkspacesNonDefault() {
    const workspaces = this.getWorkspaces();
    workspaces.forEach(w => {
      w.is_default = false;
    });
    this.store.set('workspaces', workspaces);
  }

  /**
   * Nettoyer toutes les données
   */
  clearAll() {
    this.store.clear();
    console.log('🗑️ All workspace data cleared');
  }
}

module.exports = { MultiWorkspaceInternalService };
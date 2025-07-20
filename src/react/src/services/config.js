// src/react/src/services/config.js
/**
 * Service pour la gestion de la configuration
 * Correspond à backend/api/config_routes.py
 */

import api from './api';

class ConfigService {
  async getConfig() {
    const result = await window.electronAPI.getConfig();
    return result.config || {};
  }

  async updateConfig(config) {
    return await window.electronAPI.saveConfig(config);
  }

  async resetConfig() {
    return await window.electronAPI.resetConfig();
  }

  async validateNotionToken(token) {
    const result = await window.electronAPI.initialize(token);
    return result.success;
  }

  async completeOnboarding() {
    return await window.electronAPI.setValue({
      key: 'onboardingCompleted',
      value: true
    });
  }
}

export default new ConfigService();
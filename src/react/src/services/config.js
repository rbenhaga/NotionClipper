// src/react/src/services/config.js
/**
 * Service pour la gestion de la configuration
 * Correspond à backend/api/config_routes.py
 */

import api from './api';

class ConfigService {
  /**
   * Récupère la configuration actuelle
   */
  async getConfig() {
    return await api.get('/config');
  }

  /**
   * Met à jour la configuration
   */
  async updateConfig(config) {
    return await api.post('/config', config);
  }

  /**
   * Réinitialise la configuration
   */
  async resetConfig() {
    return await api.post('/config/reset');
  }

  /**
   * Récupère les préférences utilisateur
   */
  async getPreferences() {
    return await api.get('/config/preferences');
  }

  /**
   * Met à jour les préférences utilisateur
   */
  async updatePreferences(preferences) {
    return await api.post('/config/preferences', preferences);
  }

  /**
   * Vérifie les mises à jour disponibles
   */
  async checkUpdates() {
    return await api.get('/check_updates');
  }

  /**
   * Valide un token Notion
   */
  async validateNotionToken(token) {
    try {
      const result = await this.updateConfig({ notionToken: token });
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Configure la clé ImgBB de manière sécurisée
   */
  async setImgBBKey(key) {
    return await api.post('/config/secure-api-key', { 
      service: 'imgbb', 
      apiKey: key 
    });
  }

  /**
   * Récupère la clé ImgBB de manière sécurisée
   */
  async getImgBBKey() {
    return await api.get('/config/secure-api-key/imgbb');
  }

  /**
   * Marque l'onboarding comme complété
   */
  async completeOnboarding() {
    return await this.updatePreferences({ onboardingCompleted: true });
  }
}

const configService = new ConfigService();
export default configService;
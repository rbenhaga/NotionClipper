// src/react/src/services/api.js
/**
 * Service API principal pour communiquer avec le backend refactorisé
 * Centralise tous les appels HTTP vers le backend Flask
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Méthode générique pour les requêtes HTTP
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      // Gérer les erreurs HTTP
      if (!response.ok) {
        const error = await response.catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      // Retourner la réponse JSON
      return await response;
    } catch (error) {
      // Gérer les erreurs réseau
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Impossible de contacter le serveur. Vérifiez que le backend est démarré.');
      }
      throw error;
    }
  }

  /**
   * Méthodes GET
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET',
    });
  }

  /**
   * Méthodes POST
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Server-Sent Events pour les mises à jour en temps réel
   */
  createEventSource(endpoint) {
    const url = `${this.baseUrl}${endpoint}`;
    return new EventSource(url);
  }

  /**
   * Health check
   */
  async checkHealth() {
    try {
      const response = await this.get('/health');
      return {
        isHealthy: response.status === 'healthy',
        ...response
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: error.message
      };
    }
  }
}

// Instance unique (singleton)
const apiService = new ApiService();

export default apiService;
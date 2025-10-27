// apps/notion-clipper-app/src/electron/services/oauth-server.js

const http = require('http');
const url = require('url');

/**
 * Simple local OAuth callback server
 * Écoute sur localhost:3000 pour recevoir les callbacks OAuth
 */
class LocalOAuthServer {
  constructor() {
    this.server = null;
    this.port = 3000;
    this.callbacks = new Map();
  }

  /**
   * Démarre le serveur local pour les callbacks OAuth
   */
  async start() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        console.log('🌐 OAuth server already running on port', this.port);
        resolve(`http://localhost:${this.port}`);
        return;
      }

      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, 'localhost', (err) => {
        if (err) {
          console.error('❌ Failed to start OAuth server:', err);
          reject(err);
        } else {
          console.log(`✅ OAuth callback server running on http://localhost:${this.port}`);
          resolve(`http://localhost:${this.port}`);
        }
      });

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️ Port ${this.port} in use, trying ${this.port + 1}`);
          this.port++;
          this.server.listen(this.port, 'localhost');
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Arrête le serveur
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 OAuth server stopped');
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Enregistre un callback pour un état OAuth spécifique
   */
  registerCallback(state, callback) {
    this.callbacks.set(state, callback);
    
    // Auto-cleanup après 10 minutes
    setTimeout(() => {
      this.callbacks.delete(state);
    }, 10 * 60 * 1000);
  }

  /**
   * Gère les requêtes HTTP
   */
  handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    
    console.log('🔗 OAuth callback received:', parsedUrl.pathname);

    // CORS headers pour les requêtes cross-origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (parsedUrl.pathname === '/auth/callback') {
      this.handleOAuthCallback(req, res, parsedUrl.query);
    } else if (parsedUrl.pathname === '/health') {
      this.handleHealthCheck(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>Notion Clipper OAuth</title></head>
          <body>
            <h1>🔍 Page non trouvée</h1>
            <p>Endpoints disponibles :</p>
            <ul>
              <li><a href="/auth/callback">/auth/callback</a> - OAuth callback</li>
              <li><a href="/health">/health</a> - Health check</li>
            </ul>
          </body>
        </html>
      `);
    }
  }

  /**
   * Gère le callback OAuth de Notion
   */
  handleOAuthCallback(req, res, query) {
    const { code, state, error } = query;

    console.log('📨 OAuth callback data:', { code: !!code, state, error });

    if (error) {
      console.error('❌ OAuth error:', error);
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>OAuth Error</title></head>
          <body>
            <h1>❌ Erreur OAuth</h1>
            <p>Erreur: ${error}</p>
            <p>Vous pouvez fermer cette fenêtre.</p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `);
      return;
    }

    if (!code || !state) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>OAuth Error</title></head>
          <body>
            <h1>❌ Paramètres manquants</h1>
            <p>Code ou state manquant dans le callback OAuth.</p>
            <p>Vous pouvez fermer cette fenêtre.</p>
          </body>
        </html>
      `);
      return;
    }

    // Chercher le callback enregistré pour cet état
    const callback = this.callbacks.get(state);
    if (callback) {
      console.log('✅ Executing OAuth callback for state:', state);
      
      // Exécuter le callback de manière asynchrone
      setImmediate(() => {
        callback({ code, state });
      });
      
      // Nettoyer le callback
      this.callbacks.delete(state);
    } else {
      console.warn('⚠️ No callback registered for state:', state);
    }

    // Répondre avec une page de succès
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head>
          <title>OAuth Success</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-align: center; padding: 50px; }
            .success { color: #22c55e; font-size: 48px; margin-bottom: 20px; }
            .message { font-size: 18px; color: #374151; margin-bottom: 30px; }
            .info { font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="success">✅</div>
          <div class="message">Authentification réussie !</div>
          <div class="info">
            Vous pouvez fermer cette fenêtre.<br/>
            Retournez à Notion Clipper Pro.
          </div>
          <script>
            // Auto-fermer après 3 secondes
            setTimeout(() => {
              try {
                window.close();
              } catch (e) {
                console.log('Cannot close window automatically');
              }
            }, 3000);
          </script>
        </body>
      </html>
    `);
  }

  /**
   * Health check endpoint
   */
  handleHealthCheck(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      server: 'notion-clipper-oauth',
      port: this.port,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Obtient l'URL de base du serveur
   */
  getBaseUrl() {
    return `http://localhost:${this.port}`;
  }

  /**
   * Obtient l'URL de callback OAuth
   */
  getCallbackUrl() {
    return `${this.getBaseUrl()}/auth/callback`;
  }
}

module.exports = { LocalOAuthServer };
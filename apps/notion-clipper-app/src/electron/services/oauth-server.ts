import http from 'http';
import url from 'url';
import path from 'path';
import fs from 'fs';
import { ParsedUrlQuery } from 'querystring';

interface OAuthCallbackData {
  code: string;
  state: string;
}

type OAuthCallback = (data: OAuthCallbackData) => void;

/**
 * Simple local OAuth callback server
 * Écoute sur localhost:3000 pour recevoir les callbacks OAuth
 */
class LocalOAuthServer {
  private server: http.Server | null = null;
  private port: number = 8080;
  private callbacks: Map<string, OAuthCallback> = new Map();

  /**
   * Démarre le serveur local pour les callbacks OAuth
   */
  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        console.log('🌐 OAuth server already running on port', this.port);
        resolve(`http://localhost:${this.port}`);
        return;
      }

      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, 'localhost', (err?: Error) => {
        if (err) {
          console.error('❌ Failed to start OAuth server:', err);
          reject(err);
        } else {
          console.log(`✅ OAuth callback server running on http://localhost:${this.port}`);
          resolve(`http://localhost:${this.port}`);
        }
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️ Port ${this.port} in use, trying ${this.port + 1}`);
          this.port++;
          this.server!.listen(this.port, 'localhost');
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Arrête le serveur
   */
  async stop(): Promise<void> {
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
  registerCallback(state: string, callback: OAuthCallback): void {
    this.callbacks.set(state, callback);

    // Auto-cleanup après 10 minutes
    setTimeout(() => {
      this.callbacks.delete(state);
    }, 10 * 60 * 1000);
  }

  /**
   * Gère les requêtes HTTP
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const parsedUrl = url.parse(req.url || '', true);

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

    if (parsedUrl.pathname === '/oauth/callback') {
      this.handleOAuthCallback(req, res, parsedUrl.query);
    } else if (parsedUrl.pathname === '/health') {
      this.handleHealthCheck(req, res);
    } else if (parsedUrl.pathname === '/oauth-success.html' || parsedUrl.pathname === '/oauth-error.html') {
      this.serveStaticFile(req, res, parsedUrl.pathname);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>Notion Clipper OAuth</title></head>
          <body>
            <h1>🔍 Page non trouvée</h1>
            <p>Endpoints disponibles :</p>
            <ul>
              <li><a href="/oauth/callback">/oauth/callback</a> - OAuth callback</li>
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
  private handleOAuthCallback(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    query: ParsedUrlQuery
  ): void {
    const { code, state, error } = query;

    console.log('📨 OAuth callback data:', { code: !!code, state, error });

    if (error) {
      console.error('❌ OAuth error:', error);
      const errorMessage = encodeURIComponent(error as string);
      res.writeHead(302, { 'Location': `/oauth-error.html?error=${errorMessage}` });
      res.end();
      return;
    }

    if (!code || !state) {
      const errorMessage = encodeURIComponent('Code ou state manquant dans le callback OAuth');
      res.writeHead(302, { 'Location': `/oauth-error.html?error=${errorMessage}` });
      res.end();
      return;
    }

    // Chercher le callback enregistré pour cet état
    const callback = this.callbacks.get(state as string);
    if (callback) {
      console.log('✅ Executing OAuth callback for state:', state);

      // Exécuter le callback de manière asynchrone
      setImmediate(() => {
        callback({ code: code as string, state: state as string });
      });

      // Nettoyer le callback
      this.callbacks.delete(state as string);
    } else {
      console.warn('⚠️ No callback registered for state:', state);
    }

    // Répondre avec une redirection vers la page de succès
    res.writeHead(302, { 'Location': '/oauth-success.html' });
    res.end();
  }

  /**
   * Serve static HTML files
   */
  private serveStaticFile(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): void {
    // Les fichiers HTML sont dans dist/assets/
    const filePath = path.join(__dirname, '../assets', pathname);

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading file:', filePath, err);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>404 - File Not Found</h1></body></html>');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  }

  /**
   * Health check endpoint
   */
  private handleHealthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
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
  getBaseUrl(): string {
    return `http://localhost:${this.port}`;
  }

  /**
   * Obtient l'URL de callback OAuth
   */
  getCallbackUrl(): string {
    return `${this.getBaseUrl()}/oauth/callback`;
  }
}

export { LocalOAuthServer };
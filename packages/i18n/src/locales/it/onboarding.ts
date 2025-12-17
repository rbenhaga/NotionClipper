export default {
  // Steps
  welcome: 'Benvenuto',
  connection: 'Connessione',
  permissions: 'Permessi',
  notionConnection: 'Autenticazione',

  // Welcome screen
  welcomeTitle: 'Benvenuto in Clipper Pro',
  welcomeSubtitle: 'Cattura istantaneamente le tue idee da qualsiasi pagina web.',
  welcomeDescription: 'Lo strumento definitivo per catturare e organizzare le tue idee in Notion.',

  // Features
  featureQuickCapture: 'Acquisizione rapida',
  featureOrganization: 'Organizzazione',
  featureSync: 'Sincronizzazione',

  // Connection
  connectToNotion: 'Connetti a Notion',
  authorizeAccess: 'Autorizza Clipper ad accedere in modo sicuro al tuo workspace Notion',
  continueWithNotion: 'Continua con Notion',
  securityNote: 'Connessione sicura. Accediamo solo alle pagine che autorizzi esplicitamente.',

  // Permissions
  lastStep: 'Ultimo passo: Permessi',
  allowClipboard: 'Consenti accesso agli appunti per acquisire contenuto',
  clipboardAccess: 'Accesso appunti',
  clipboardRequired: 'Richiesto per acquisire automaticamente il contenuto copiato',
  allowAccess: 'Consenti accesso',
  privacyNote: '🔒 Privacy al primo posto: Clipper Pro raccoglie solo il contenuto che scegli esplicitamente di acquisire. Nessun dato è condiviso con terze parti.',

  // Errors
  tokenRequired: 'Token richiesto',
  invalidToken: 'Token non valido. Controlla il tuo token di integrazione.',
  connectionError: 'Errore di connessione. Riprova.',
  clipboardPermissionRequired: 'Consenti l\'accesso agli appunti',
  notionConnectionIncomplete: 'Connessione Notion non completata',
  oauthTimeout: 'Timeout: connessione OAuth scaduta',
  connectionSuccess: 'Connessione riuscita! Reindirizzamento...',
  authError: 'Errore di autenticazione',
  oauthStartError: 'Errore avvio OAuth',
  apiNotAvailable: 'API Electron non disponibile',
} as const;

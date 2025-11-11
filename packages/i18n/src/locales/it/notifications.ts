export default {
  // Success
  contentSent: 'Contenuto inviato con successo',
  contentQueued: 'Contenuto aggiunto alla coda',
  contentSentToPages: 'Contenuto inviato a {count}/{total} pagina/e',
  configCompleted: 'Configurazione completata con successo',

  // Errors
  noContent: 'Nessun contenuto da inviare',
  noDestination: 'Seleziona una pagina di destinazione',
  sendError: 'Errore durante l\'invio del contenuto',
  errorsOnPages: 'Errori su {count} pagina/e',

  // Init errors
  loadPagesError: 'Impossibile caricare le pagine Notion',
  initError: 'Errore durante l\'inizializzazione dell\'applicazione',
  tokenMissing: 'Errore: Token mancante',
  notionServiceError: 'Errore inizializzazione servizio Notion',
  criticalInitError: 'Errore critico durante l\'inizializzazione',
  criticalConfigError: 'Errore critico durante la configurazione',

  // Content Editor
  characterLimit: 'Il testo non può superare {limit} caratteri',

  // Confirmations
  confirmClearClipboard: 'Cancellare gli appunti?',

  // Placeholders for interpolation
  sentToCount: 'Contenuto inviato a {count}/{total} pagina/e',
  queuedForCount: 'Contenuto in coda per {count} pagina/e',
} as const;

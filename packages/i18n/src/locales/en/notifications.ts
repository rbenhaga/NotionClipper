export default {
  // Success
  contentSent: 'Content sent successfully',
  contentQueued: 'Content added to queue',
  contentSentToPages: 'Content sent to {count}/{total} page(s)',
  configCompleted: 'Configuration completed successfully',

  // Errors
  noContent: 'No content to send',
  noDestination: 'Select a destination page',
  sendError: 'Error sending content',
  errorsOnPages: 'Errors on {count} page(s)',

  // Init errors
  loadPagesError: 'Unable to load Notion pages',
  initError: 'Error during application initialization',
  tokenMissing: 'Error: Missing token',
  notionServiceError: 'Error initializing Notion service',
  criticalInitError: 'Critical error during initialization',
  criticalConfigError: 'Critical error during configuration',

  // Content Editor
  characterLimit: 'Text cannot exceed {limit} characters',

  // Confirmations
  confirmClearClipboard: 'Clear clipboard?',

  // Placeholders for interpolation
  sentToCount: 'Content sent to {count}/{total} page(s)',
  queuedForCount: 'Content queued for {count} page(s)',
} as const;

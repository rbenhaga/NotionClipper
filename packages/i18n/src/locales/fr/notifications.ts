export default {
  // Success
  contentSent: 'Contenu envoyé avec succès',
  contentQueued: 'Contenu ajouté à la file d\'attente',
  contentSentToPages: 'Contenu envoyé à {count}/{total} page(s)',
  configCompleted: 'Configuration terminée avec succès',

  // Errors
  noContent: 'Aucun contenu à envoyer',
  noDestination: 'Sélectionnez une page de destination',
  sendError: 'Erreur lors de l\'envoi',
  errorsOnPages: 'Erreurs sur {count} page(s)',

  // Init errors
  loadPagesError: 'Impossible de charger les pages Notion',
  initError: 'Erreur lors de l\'initialisation de l\'application',
  tokenMissing: 'Erreur: Token manquant',
  notionServiceError: 'Erreur lors de l\'initialisation du service Notion',
  criticalInitError: 'Erreur critique lors de l\'initialisation',
  criticalConfigError: 'Erreur critique lors de la configuration',

  // Content Editor
  characterLimit: 'Le texte ne peut pas dépasser {limit} caractères',

  // Confirmations
  confirmClearClipboard: 'Vider le presse-papiers ?',

  // Placeholders for interpolation
  sentToCount: 'Contenu envoyé à {count}/{total} page(s)',
  queuedForCount: 'Contenu ajouté à la file d\'attente pour {count} page(s)',
} as const;

export default {
  // Steps
  welcome: 'Bienvenue',
  connection: 'Connexion',
  permissions: 'Permissions',
  notionConnection: 'Authentification',

  // Welcome screen
  welcomeTitle: 'Bienvenue dans Clipper Pro',
  welcomeSubtitle: 'Capturez instantanément vos idées depuis n\'importe quelle page web.',
  welcomeDescription: 'L\'outil ultime pour capturer et organiser vos idées dans Notion.',

  // Features
  featureQuickCapture: 'Capture Rapide',
  featureOrganization: 'Organisation',
  featureSync: 'Synchronisation',

  // Connection
  connectToNotion: 'Connectez-vous à Notion',
  authorizeAccess: 'Autorisez Clipper à accéder en toute sécurité à votre espace de travail Notion',
  continueWithNotion: 'Continuer avec Notion',
  securityNote: 'Connexion sécurisée. Nous n\'accédons qu\'aux pages que vous autorisez explicitement.',

  // Permissions
  lastStep: 'Dernière étape : Permissions',
  allowClipboard: 'Autorisez l\'accès au presse-papier pour capturer le contenu',
  clipboardAccess: 'Accès au presse-papier',
  clipboardRequired: 'Nécessaire pour capturer le contenu copié automatiquement',
  allowAccess: 'Autoriser l\'accès',
  privacyNote: '🔒 Respect de votre vie privée : Clipper Pro ne collecte que le contenu que vous choisissez explicitement de capturer. Aucune donnée n\'est partagée avec des tiers.',

  // Errors
  tokenRequired: 'Le token est requis',
  invalidToken: 'Token invalide. Vérifiez votre token d\'intégration.',
  connectionError: 'Erreur de connexion. Veuillez réessayer.',
  clipboardPermissionRequired: 'Veuillez autoriser l\'accès au presse-papier',
  notionConnectionIncomplete: 'Connexion Notion non terminée',
  oauthTimeout: 'Timeout: Connexion OAuth expirée',
  connectionSuccess: 'Connexion réussie ! Redirection...',
  authError: 'Erreur lors de l\'authentification',
  oauthStartError: 'Erreur lors du démarrage OAuth',
  apiNotAvailable: 'API Electron non disponible',
} as const;

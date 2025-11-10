export default {
  // Generic UI
  back: 'Retour',
  continue: 'Continuer',
  start: 'Commencer',
  cancel: 'Annuler',
  confirm: 'Confirmer',
  close: 'Fermer',
  loading: 'Chargement...',
  retry: 'Réessayer',
  previous: 'Précédent',
  next: 'Suivant',

  // Actions
  send: 'Envoyer',
  clear: 'Vider',
  attach: 'Joindre',
  add: 'Ajouter',
  search: 'Rechercher',
  select: 'Sélectionner',
  deselect: 'Désélectionner',

  // Loading states
  loadingPages: 'Chargement des pages...',

  // Search & Selection
  searchPages: 'Rechercher des pages...',
  selectPage: 'Sélectionner une page',
  pagesSelected: '{count} page(s) sélectionnée(s)',

  // Connection status
  offline: 'Hors ligne',
  online: 'En ligne',
  pending: 'en attente',
  error: 'erreur',
  errors: '{count} erreur(s)',

  // Focus Mode
  focusModeDisabled: 'Focus Mode désactivé',
  sendTo: 'Envoyer vers',
  dropToSend: 'Déposer pour envoyer',

  // Editor
  chooseEmoji: 'Choisir un emoji',

  // Page list & results
  loadMore: 'Charger plus',
  noResults: 'Aucun résultat',
  noPages: 'Aucune page',
  noPagesMatch: 'Aucune page ne correspond à "{query}"',
  createPagesInNotion: 'Créez des pages dans Notion pour commencer',
  page: 'page',
  pages: 'pages',
  selected: 'sélectionnée',
  recentPages: 'Pages récentes',
  noPagesFound: 'Aucune page trouvée',
  noRecentPages: 'Aucune page récente',

  // Activity
  recentActivity: 'Activité récente',
  andOthers: 'Et {count} autre(s) élément(s)...',

  // Tabs
  suggested: 'Suggérées',
  favorites: 'Favoris',
  recent: 'Récents',
  all: 'Toutes',
  compose: 'Composer',
  activity: 'Activité',

  // Time & Dates
  now: 'maintenant',
  yesterday: 'hier',
  untitled: 'Sans titre',

  // Sidebar
  showPages: 'Afficher les pages',
  hidePages: 'Masquer les pages',
  settings: 'Paramètres',

  // Window modes
  normalMode: 'Mode normal',
  compactMode: 'Mode compact',
  pin: 'Épingler',
  unpin: 'Désépingler',

  // Search
  searchPlaceholder: 'Rechercher...',
  searchOrCreate: 'Rechercher ou créer...',

  // Destinations
  destination: 'Destination',
  destinations: 'Destinations',
  noPageSelected: 'Aucune page sélectionnée',
  pageSelected: '1 page sélectionnée',
  pagesSelectedCount: '{count} pages sélectionnées',

  // Focus Mode extended
  selectPageToActivateFocusMode: 'Sélectionnez une page pour activer le Mode Focus',
  deactivateFocusMode: 'Désactiver le Mode Focus',
  activateFocusMode: 'Activer le Mode Focus',
  deactivate: 'Désactiver',

  // Sections
  hideSections: 'Masquer sections',
  chooseSection: 'Choisir section',
  selectPagesToStart: 'Sélectionnez des pages pour commencer',

  // Database
  allOptionsSelected: 'Toutes les options sont sélectionnées',
  selectDatabasePage: 'Sélectionnez une page de base de données',
  multiSelectModeNoDatabaseProperties: 'Propriétés de database non disponibles en multi-sélection',
  singleSelectMode: 'Mode sélection simple',
  multiSelectMode: 'Mode sélection multiple',

  // Connection
  connectedToNotion: 'Connecté à Notion - Envoi direct',

  // Images
  unableToLoadImage: 'Impossible de charger l\'image',
  fileMayBeCorrupted: 'Le fichier est peut-être corrompu ou inaccessible',
  verifyFileFormat: 'Vérifiez le format du fichier',
  imageNotAvailable: 'Image non disponible',
  imageCaptured: 'Image capturée',
  copied: 'Copiée',
  enlarge: 'Agrandir',
  copy: 'Copier',
  download: 'Télécharger',
  remove: 'Retirer',
  delete: 'Supprimer',
  validate: 'Valider',
  uploading: 'Upload...',

  // Files
  dropFiles: 'Déposez les fichiers',
  dragOrClick: 'Glissez ou cliquez',
  multipleFiles: 'Plusieurs fichiers',
  oneFile: 'Un fichier',
  addFile: 'Ajouter un fichier',
  attachFile: 'Joindre un fichier',
  dropYourFiles: 'Déposez vos fichiers',
  files: '{count} fichier(s)',
  file: 'fichier',
  tooLargeMax: 'Trop volumineux (max {maxSize})',
  typeNotAllowed: 'Type non autorisé',
  import: 'Importer',
  link: 'Lien',
  pasteLinkPlaceholder: 'Coller le lien...',
  externalFile: 'Fichier externe',

  // Clipboard
  clipboard: 'Presse-papiers',
  characters: 'caractères',
  empty: 'Vide',
  noContentCopied: 'Aucun contenu copié',
  copyTextOrImageToStart: 'Copiez du texte ou une image pour commencer',
  noImageDataFound: 'Aucune donnée d\'image trouvée',

  // Queue & History
  sending: 'Envoi...',
  sent: 'Envoyé',
  contentWithoutText: 'Contenu sans texte',
  justNow: 'À l\'instant',
  minutes: 'min',
  hours: 'h',
  clearAll: 'Tout effacer',
  element: 'élément',
  elements: 'éléments',

  // Connection status
  offlineQueueMessage: 'Hors ligne - Le contenu sera ajouté à la file d\'attente',
  errorsInQueue: '{count} erreur(s) dans la file d\'attente',
  elementsWaiting: '{count} élément(s) en attente d\'envoi',

  // Table of Contents
  tableOfContents: 'Sommaire',
  noSectionFound: 'Aucune section trouvée',
  insertAtEndOfSection: 'Insertion en fin de section',
  insertAtEndOfThisSection: 'Insertion en fin de cette section',

  // Send actions
  selectPages: 'Sélectionnez des pages',
  sendToOnePage: 'Envoyer vers 1 page',
  sendToPages: 'Envoyer vers {count} pages',
  sendToPage: 'Envoyer vers "{title}"',
} as const;

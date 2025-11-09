export default {
  // Generic UI
  back: 'Zurück',
  continue: 'Weiter',
  start: 'Starten',
  cancel: 'Abbrechen',
  confirm: 'Bestätigen',
  close: 'Schließen',
  loading: 'Laden...',
  retry: 'Erneut versuchen',
  previous: 'Zurück',
  next: 'Weiter',

  // Actions
  send: 'Senden',
  clear: 'Leeren',
  attach: 'Anhängen',
  add: 'Hinzufügen',
  search: 'Suchen',
  select: 'Auswählen',
  deselect: 'Abwählen',

  // Loading states
  loadingPages: 'Seiten werden geladen...',

  // Search & Selection
  searchPages: 'Seiten suchen...',
  selectPage: 'Seite auswählen',
  pagesSelected: '{count} Seite(n) ausgewählt',

  offline: 'Offline',
  online: 'Online',
  // Connection status
  pending: 'ausstehend',
  error: 'Fehler',
  errors: '{count} Fehler',

  // Focus Mode
  focusModeDisabled: 'Fokusmodus deaktiviert',
  sendTo: 'Senden an',
  dropToSend: 'Zum Senden ablegen',

  // Editor
  chooseEmoji: 'Emoji auswählen',

  // Page list & results
  loadMore: 'Mehr laden',
  noResults: 'Keine Ergebnisse',
  noPages: 'Keine Seiten',
  noPagesMatch: 'Keine Seiten entsprechen "{query}"',
  createPagesInNotion: 'Erstellen Sie Seiten in Notion, um zu beginnen',
  page: 'Seite',
  pages: 'Seiten',
  selected: 'ausgewählt',
  recentPages: 'Neueste Seiten',
  noPagesFound: 'Keine Seiten gefunden',
  noRecentPages: 'Keine aktuellen Seiten',

  // Activity
  recentActivity: 'Letzte Aktivität',
  andOthers: 'Und {count} weitere(s) Element(e)...',

  // Tabs
  suggested: 'Vorgeschlagen',
  favorites: 'Favoriten',
  recent: 'Kürzlich',
  all: 'Alle',
  compose: 'Verfassen',
  activity: 'Aktivität',

  // Time & Dates
  now: 'jetzt',
  yesterday: 'gestern',
  untitled: 'Ohne Titel',

  // Sidebar
  showPages: 'Seiten anzeigen',
  hidePages: 'Seiten ausblenden',
  settings: 'Einstellungen',

  // Focus Mode extended
  selectPageToActivateFocusMode: 'Seite auswählen, um den Fokusmodus zu aktivieren',
  deactivateFocusMode: 'Fokusmodus deaktivieren',
  activateFocusMode: 'Fokusmodus aktivieren',
  deactivate: 'Deaktivieren',

  // Sections
  hideSections: 'Abschnitte ausblenden',
  chooseSection: 'Abschnitt wählen',
  selectPagesToStart: 'Seiten auswählen um zu beginnen',

  // Database
  allOptionsSelected: 'Alle Optionen sind ausgewählt',
  selectDatabasePage: 'Datenbank-Seite auswählen',
  multiSelectModeNoDatabaseProperties: 'Datenbank-Eigenschaften im Mehrfachauswahl-Modus nicht verfügbar',

  // Connection
  connectedToNotion: 'Mit Notion verbunden - Direktversand',

  // Images
  unableToLoadImage: 'Bild kann nicht geladen werden',
  fileMayBeCorrupted: 'Die Datei ist möglicherweise beschädigt oder nicht zugänglich',
  verifyFileFormat: 'Dateiformat überprüfen',
  imageNotAvailable: 'Bild nicht verfügbar',
  imageCaptured: 'Bild erfasst',
  copied: 'Kopiert',
  enlarge: 'Vergrößern',
  copy: 'Kopieren',
  download: 'Herunterladen',
  remove: 'Entfernen',
  delete: 'Löschen',
  validate: 'Bestätigen',
  uploading: 'Hochladen...',

  // Files
  dropFiles: 'Dateien ablegen',
  dragOrClick: 'Ziehen oder klicken',
  multipleFiles: 'Mehrere Dateien',
  oneFile: 'Eine Datei',
  addFile: 'Datei hinzufügen',
  attachFile: 'Datei anhängen',
  dropYourFiles: 'Dateien ablegen',
  files: '{count} Datei(en)',
  file: 'Datei',
  tooLargeMax: 'Zu groß (max {maxSize})',
  typeNotAllowed: 'Typ nicht erlaubt',
  import: 'Importieren',
  link: 'Link',
  pasteLinkPlaceholder: 'Link einfügen...',
  externalFile: 'Externe Datei',

  // Clipboard
  clipboard: 'Zwischenablage',
  characters: 'Zeichen',
  empty: 'Leer',
  noContentCopied: 'Kein Inhalt kopiert',
  copyTextOrImageToStart: 'Text oder Bild kopieren um zu beginnen',
  noImageDataFound: 'Keine Bilddaten gefunden',

  // Queue & History
  sending: 'Senden...',
  sent: 'Gesendet',
  contentWithoutText: 'Inhalt ohne Text',
  justNow: 'Gerade eben',
  minutes: 'Min',
  hours: 'Std',
  clearAll: 'Alle löschen',
  element: 'Element',
  elements: 'Elemente',

  // Connection status
  offlineQueueMessage: 'Offline - Inhalt wird zur Warteschlange hinzugefügt',
  errorsInQueue: '{count} Fehler in der Warteschlange',
  elementsWaiting: '{count} Element(e) warten auf Versand',

  // Table of Contents
  tableOfContents: 'Inhaltsverzeichnis',
  noSectionFound: 'Keine Abschnitte gefunden',
  insertAtEndOfSection: 'Am Ende des Abschnitts einfügen',
  insertAtEndOfThisSection: 'Am Ende dieses Abschnitts einfügen',

  // Send actions
  selectPages: 'Seiten auswählen',
  sendToOnePage: 'An 1 Seite senden',
  sendToPages: 'An {count} Seiten senden',
  sendToPage: 'An "{title}" senden',
} as const;

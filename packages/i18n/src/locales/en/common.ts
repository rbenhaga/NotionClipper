export default {
  // Generic UI
  back: 'Back',
  continue: 'Continue',
  start: 'Start',
  cancel: 'Cancel',
  confirm: 'Confirm',
  close: 'Close',
  loading: 'Loading...',
  retry: 'Retry',
  previous: 'Previous',
  next: 'Next',

  // Actions
  send: 'Send',
  clear: 'Clear',
  attach: 'Attach',
  add: 'Add',
  search: 'Search',
  select: 'Select',
  deselect: 'Deselect',

  // Loading states
  loadingPages: 'Loading pages...',

  // Search & Selection
  searchPages: 'Search pages...',
  selectPage: 'Select a page',
  pagesSelected: '{count} page(s) selected',

  // Connection status
  offline: 'Offline',
  online: 'Online',
  pending: 'pending',
  error: 'error',
  errors: '{count} error(s)',

  // Focus Mode
  focusModeDisabled: 'Focus Mode disabled',
  sendTo: 'Send to',
  dropToSend: 'Drop to send',

  // Editor
  chooseEmoji: 'Choose an emoji',

  // Page list & results
  loadMore: 'Load more',
  noResults: 'No results',
  noPages: 'No pages',
  noPagesMatch: 'No pages match "{query}"',
  createPagesInNotion: 'Create pages in Notion to get started',
  page: 'page',
  pages: 'pages',
  selected: 'selected',
  recentPages: 'Recent pages',
  noPagesFound: 'No pages found',
  noRecentPages: 'No recent pages',

  // Activity
  recentActivity: 'Recent activity',
  andOthers: 'And {count} other item(s)...',

  // Tabs
  suggested: 'Suggested',
  favorites: 'Favorites',
  recent: 'Recent',
  all: 'All',
  compose: 'Compose',
  activity: 'Activity',

  // Time & Dates
  now: 'now',
  yesterday: 'yesterday',
  untitled: 'Untitled',

  // Sidebar
  showPages: 'Show pages',
  hidePages: 'Hide pages',
  settings: 'Settings',

  // Focus Mode extended
  selectPageToActivateFocusMode: 'Select a page to activate Focus Mode',
  deactivateFocusMode: 'Deactivate Focus Mode',
  activateFocusMode: 'Activate Focus Mode',
  deactivate: 'Deactivate',

  // Sections
  hideSections: 'Hide sections',
  chooseSection: 'Choose section',
  selectPagesToStart: 'Select pages to get started',

  // Database
  allOptionsSelected: 'All options are selected',
  selectDatabasePage: 'Select a database page',
  multiSelectModeNoDatabaseProperties: 'Database properties unavailable in multi-select mode',

  // Connection
  connectedToNotion: 'Connected to Notion - Direct send',

  // Images
  unableToLoadImage: 'Unable to load image',
  fileMayBeCorrupted: 'File may be corrupted or inaccessible',
  verifyFileFormat: 'Verify the file format',
  imageNotAvailable: 'Image not available',
  imageCaptured: 'Image captured',
  copied: 'Copied',
  enlarge: 'Enlarge',
  copy: 'Copy',
  download: 'Download',
  remove: 'Remove',
  delete: 'Delete',
  validate: 'Validate',
  uploading: 'Uploading...',

  // Files
  dropFiles: 'Drop files',
  dragOrClick: 'Drag or click',
  multipleFiles: 'Multiple files',
  oneFile: 'One file',
  addFile: 'Add file',
  attachFile: 'Attach a file',
  dropYourFiles: 'Drop your files',
  files: '{count} file(s)',
  file: 'file',
  tooLargeMax: 'Too large (max {maxSize})',
  typeNotAllowed: 'Type not allowed',
  import: 'Import',
  link: 'Link',
  pasteLinkPlaceholder: 'Paste link...',
  externalFile: 'External file',

  // Clipboard
  clipboard: 'Clipboard',
  characters: 'characters',
  empty: 'Empty',
  noContentCopied: 'No content copied',
  copyTextOrImageToStart: 'Copy text or an image to get started',
  noImageDataFound: 'No image data found',

  // Queue & History
  sending: 'Sending...',
  sent: 'Sent',
  contentWithoutText: 'Content without text',
  justNow: 'Just now',
  minutes: 'min',
  hours: 'h',
  clearAll: 'Clear all',
  element: 'element',
  elements: 'elements',

  // Connection status
  offlineQueueMessage: 'Offline - Content will be added to queue',
  errorsInQueue: '{count} error(s) in queue',
  elementsWaiting: '{count} element(s) waiting to send',

  // Table of Contents
  tableOfContents: 'Table of Contents',
  noSectionFound: 'No section found',
  insertAtEndOfSection: 'Insert at end of section',
  insertAtEndOfThisSection: 'Insert at end of this section',

  // Send actions
  selectPages: 'Select pages',
  sendToOnePage: 'Send to 1 page',
  sendToPages: 'Send to {count} pages',
  sendToPage: 'Send to "{title}"',
} as const;

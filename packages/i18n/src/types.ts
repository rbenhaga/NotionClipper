/**
 * i18n Types - Type-safe internationalization
 * Apple/Notion design: Simple, elegant, extensible
 */

export type Locale = 'en' | 'fr' | 'es' | 'de' | 'pt' | 'ja' | 'ko';

export type InterpolationParams = Record<string, string | number>;

/**
 * Translation namespace structure
 * Organized by feature for maintainability
 */
export interface Translations {
  common: {
    // Generic UI
    back: string;
    continue: string;
    start: string;
    cancel: string;
    confirm: string;
    close: string;
    loading: string;
    retry: string;
    previous: string;
    next: string;

    // Actions
    send: string;
    clear: string;
    attach: string;
    add: string;
    search: string;
    select: string;
    deselect: string;

    // Loading states
    loadingPages: string;

    // Search & Selection
    searchPages: string;
    selectPage: string;
    pagesSelected: string;

    // Connection status
    offline: string;
    online: string;
    pending: string;
    error: string;
    errors: string;

    // Focus Mode
    focusModeDisabled: string;
    sendTo: string;
    dropToSend: string;

    // Editor
    chooseEmoji: string;

    // Page list & results
    loadMore: string;
    noResults: string;
    noPages: string;
    noPagesMatch: string;
    createPagesInNotion: string;
    page: string;
    pages: string;
    selected: string;
    recentPages: string;
    noPagesFound: string;
    noRecentPages: string;

    // Activity
    recentActivity: string;
    andOthers: string;

    // Tabs
    suggested: string;
    favorites: string;
    recent: string;
    all: string;
    compose: string;
    activity: string;

    // Time & Dates
    now: string;
    yesterday: string;
    untitled: string;
    lastModified: string;

    // Sidebar
    showPages: string;
    hidePages: string;
    settings: string;

    // Window modes
    normalMode: string;
    compactMode: string;
    pin: string;
    unpin: string;

    // Search
    searchPlaceholder: string;
    searchOrCreate: string;

    // Destinations
    destination: string;
    destinations: string;
    noPageSelected: string;
    pageSelected: string;
    pagesSelectedCount: string;

    // Focus Mode extended
    selectPageToActivateFocusMode: string;
    deactivateFocusMode: string;
    activateFocusMode: string;
    deactivate: string;

    // Sections
    hideSections: string;
    chooseSection: string;
    selectPagesToStart: string;

    // Database
    allOptionsSelected: string;
    selectDatabasePage: string;
    multiSelectModeNoDatabaseProperties: string;
    singleSelectMode: string;
    multiSelectMode: string;

    // Connection
    connectedToNotion: string;

    // Images
    unableToLoadImage: string;
    fileMayBeCorrupted: string;
    verifyFileFormat: string;
    imageNotAvailable: string;
    imageCaptured: string;
    copied: string;
    enlarge: string;
    copy: string;
    download: string;
    remove: string;
    delete: string;
    validate: string;
    uploading: string;

    // Files
    dropFiles: string;
    dragOrClick: string;
    multipleFiles: string;
    oneFile: string;
    addFile: string;
    attachFile: string;
    dropYourFiles: string;
    files: string;
    file: string;
    tooLargeMax: string;
    typeNotAllowed: string;
    import: string;
    link: string;
    pasteLinkPlaceholder: string;
    externalFile: string;

    // Clipboard
    clipboard: string;
    characters: string;
    empty: string;
    noContentCopied: string;
    copyTextOrImageToStart: string;
    noImageDataFound: string;

    // Queue & History
    sending: string;
    sent: string;
    contentWithoutText: string;
    justNow: string;
    minutes: string;
    hours: string;
    clearAll: string;
    element: string;
    elements: string;

    // Connection status
    offlineQueueMessage: string;
    errorsInQueue: string;
    elementsWaiting: string;

    // Table of Contents
    tableOfContents: string;
    noSectionFound: string;
    insertAtEndOfSection: string;
    insertAtEndOfThisSection: string;

    // Send actions
    selectPages: string;
    sendToOnePage: string;
    sendToPages: string;
    sendToPage: string;

    // Window controls
    minimize: string;
    maximize: string;

    // Queue status
    sendingInProgress: string;
    sentSuccessfully: string;
    errorOccurred: string;
    waitingToSend: string;

    // Queue actions
    retryAction: string;
    deleteAction: string;

    // Queue filters
    allItems: string;
    successfulItems: string;
    errorItems: string;

    // Queue messages
    contentWithoutTextLabel: string;
    noActivity: string;
    noActivityYet: string;

    // Keyboard shortcuts
    sendContentShortcut: string;
    toggleMinimalistMode: string;
    closeWindowShortcut: string;
    toggleSidebar: string;
    togglePreview: string;
    focusSearch: string;
    clearClipboard: string;
    minimizeWindow: string;
    pinUnpin: string;
    showShortcuts: string;

    // Editor actions
    cancelEdits: string;
    cancelModifications: string;

    // Authentication
    authRequired: string;
    sessionExpired: string;
    reconnectWithNotion: string;
    checkAgain: string;
    whyThisHappens: string;
    sessionExpirationExplanation: string;

    // Error messages
    sendError: string;
    unableToLoadImageError: string;
    electronApiUnavailable: string;
    sendToNotionUnavailable: string;
    sendFailed: string;
    queueAddedOffline: string;
    connectionAndQueueFailed: string;
    sendAndQueueFailed: string;

    // Additional image keys
    imageLoading: string;
    imageLoadError: string;
    imageLoadErrorDetails: string;

    // Additional clipboard/editor keys
    words: string;
    copyContent: string;

    // Database additional keys
    schemaLoading: string;
    pleaseWait: string;
    enterField: string;
    selectField: string;
    noOptionsAvailable: string;
    createOption: string;
    noEditableProperties: string;
    addPropertiesInNotion: string;
    enabled: string;
    disabled: string;

    // Table of Contents additional
    sectionsCount: string;

    // Clipboard Permission
    clipboardPermissionTitle: string;
    clipboardPermissionDescription: string;
    whyThisPermission: string;
    smartCapture: string;
    smartCaptureDesc: string;
    timeSaver: string;
    timeSaverDesc: string;
    fullControl: string;
    fullControlDesc: string;
    allowAccess: string;
    later: string;
    privacyNote: string;
    clipboardAccess: string;
    captureIdeasAutomatically: string;
    automaticDetection: string;
    privatePercent: string;
    noDataShared: string;
    disableAnytime: string;
    learnMore: string;
    acceptanceNote: string;

    // Additional utility strings
    unreadableContent: string;
    clearClipboardConfirm: string;
    clearClipboardDescription: string;

    // Keyboard Shortcuts Descriptions
    toggleSidebarDesc: string;
    togglePreviewDesc: string;
    focusSearchDesc: string;
    sendContentDesc: string;
    toggleMinimalistDesc: string;
    attachFileDesc: string;
    closeWindowDesc: string;
    minimizeWindowDesc: string;
    togglePinDesc: string;
    showShortcutsDesc: string;
  };

  onboarding: {
    // Steps
    welcome: string;
    connection: string;
    permissions: string;
    notionConnection: string;

    // Welcome screen
    welcomeTitle: string;
    welcomeSubtitle: string;
    welcomeDescription: string;

    // Features
    featureQuickCapture: string;
    featureOrganization: string;
    featureSync: string;

    // Connection
    connectToNotion: string;
    authorizeAccess: string;
    continueWithNotion: string;
    securityNote: string;

    // Permissions
    lastStep: string;
    allowClipboard: string;
    clipboardAccess: string;
    clipboardRequired: string;
    allowAccess: string;
    privacyNote: string;

    // Errors
    tokenRequired: string;
    invalidToken: string;
    connectionError: string;
    clipboardPermissionRequired: string;
    notionConnectionIncomplete: string;
    oauthTimeout: string;
    connectionSuccess: string;
    authError: string;
    oauthStartError: string;
    apiNotAvailable: string;
  };

  config: {
    // Panel title
    settings: string;

    // Sections
    connection: string;
    appearance: string;
    language: string;

    // Connection status
    notion: string;
    connected: string;
    workspaceAuthorized: string;
    notConnected: string;

    // Theme
    light: string;
    dark: string;
    auto: string;

    // Actions
    clearCache: string;
    clearing: string;
    clearCacheDescription: string;
    disconnect: string;
    disconnecting: string;
    disconnectDescription: string;

    // Footer
    version: string;
    shortcutsHint: string;
    pressKey: string;

    // Errors
    clearCacheError: string;
    disconnectError: string;

    // Language selector
    selectLanguage: string;
    languageChanged: string;
  };

  editor: {
    // Content types
    title: string;
    heading2: string;
    heading3: string;
    paragraph: string;
    todo: string;
    quote: string;
    code: string;

    // Image handling
    imageCaptured: string;
    imageConversionError: string;
    imageFormatUnknown: string;

    // File upload
    attachFile: string;
    dragAndDrop: string;

    // Content Editor
    placeholderText: string;
  };

  shortcuts: {
    // Modal
    keyboardShortcuts: string;
    saveTime: string;
    pressKey: string;
    toShowHelp: string;
    other: string;

    // Categories
    navigation: string;
    actions: string;
    window: string;
    help: string;

    // Descriptions
    toggleSidebar: string;
    togglePreview: string;
    focusSearch: string;
    sendContent: string;
    clearClipboard: string;
    toggleMinimalist: string;
    attachFile: string;
    closeWindow: string;
    minimize: string;
    togglePin: string;
    showShortcuts: string;
  };

  focusMode: {
    // Intro steps
    step1Title: string;
    step1Description: string;
    step2Title: string;
    step2Description: string;
    step3Title: string;
    step3Description: string;
    step4Title: string;
    step4Description: string;

    // Navigation
    keyboardHint: string;
  };

  notifications: {
    // Success
    contentSent: string;
    contentQueued: string;
    contentSentToPages: string;
    configCompleted: string;

    // Errors
    noContent: string;
    noDestination: string;
    sendError: string;
    errorsOnPages: string;
    loadPagesError: string;
    initError: string;
    tokenMissing: string;
    notionServiceError: string;
    criticalInitError: string;
    criticalConfigError: string;
    characterLimit: string;

    // Confirmations
    confirmClearClipboard: string;

    // Placeholders for interpolation
    sentToCount: string; // "Content sent to {count}/{total} page(s)"
    queuedForCount: string; // "Content queued for {count} page(s)"
  };

  errors: {
    // Generic
    unknownError: string;
    errorOccurred: string;
    reloadApp: string;

    // Specific
    invalidToken: string;
    connectionFailed: string;
    retryLater: string;
  };
}

/**
 * Utility type to get nested translation keys
 * Example: TranslationKey = "common.back" | "onboarding.welcome" | etc.
 */
export type TranslationKey = {
  [K in keyof Translations]: {
    [SK in keyof Translations[K]]: `${K}.${SK & string}`;
  }[keyof Translations[K]];
}[keyof Translations];

/**
 * Locale context value
 */
export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: InterpolationParams) => string;
}

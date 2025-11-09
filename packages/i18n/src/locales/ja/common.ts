export default {
  // Generic UI
  back: '戻る',
  continue: '続ける',
  start: '開始',
  cancel: 'キャンセル',
  confirm: '確認',
  close: '閉じる',
  loading: '読み込み中...',
  retry: '再試行',
  previous: '前へ',
  next: '次へ',

  // Actions
  send: '送信',
  clear: 'クリア',
  attach: '添付',
  add: '追加',
  search: '検索',
  select: '選択',
  deselect: '選択解除',

  // Loading states
  loadingPages: 'ページを読み込み中...',

  // Search & Selection
  searchPages: 'ページを検索...',
  selectPage: 'ページを選択',
  pagesSelected: '{count}ページ選択済み',

  offline: 'オフライン',
  online: 'オンライン',
  // Connection status
  pending: '保留中',
  error: 'エラー',
  errors: '{count}件のエラー',

  // Focus Mode
  focusModeDisabled: 'フォーカスモード無効',
  sendTo: '送信先',
  dropToSend: 'ドロップして送信',

  // Editor
  chooseEmoji: '絵文字を選択',

  // Page list & results
  loadMore: 'さらに読み込む',
  noResults: '結果なし',
  noPages: 'ページなし',
  noPagesMatch: '"{query}"に一致するページがありません',
  createPagesInNotion: 'Notionでページを作成して始めましょう',
  page: 'ページ',
  pages: 'ページ',
  selected: '選択済み',
  recentPages: '最近のページ',
  noPagesFound: 'ページが見つかりません',
  noRecentPages: '最近のページなし',

  // Activity
  recentActivity: '最近のアクティビティ',
  andOthers: 'その他{count}項目...',

  // Tabs
  suggested: '提案',
  favorites: 'お気に入り',
  recent: '最近',
  all: 'すべて',
  compose: '作成',
  activity: 'アクティビティ',

  // Time & Dates
  now: '今',
  yesterday: '昨日',
  untitled: '無題',

  // Sidebar
  showPages: 'ページを表示',
  hidePages: 'ページを非表示',
  settings: '設定',

  // Focus Mode extended
  selectPageToActivateFocusMode: 'フォーカスモードを有効にするページを選択',
  deactivateFocusMode: 'フォーカスモードを無効化',
  activateFocusMode: 'フォーカスモードを有効化',
  deactivate: '無効化',

  // Sections
  hideSections: 'セクションを非表示',
  chooseSection: 'セクションを選択',
  selectPagesToStart: 'ページを選択して始める',

  // Database
  allOptionsSelected: 'すべてのオプションが選択されています',
  selectDatabasePage: 'データベースページを選択',
  multiSelectModeNoDatabaseProperties: '複数選択モードではデータベースプロパティは利用できません',

  // Connection
  connectedToNotion: 'Notionに接続 - 直接送信',

  // Images
  unableToLoadImage: '画像を読み込めません',
  fileMayBeCorrupted: 'ファイルが破損しているか、アクセスできない可能性があります',
  verifyFileFormat: 'ファイル形式を確認',
  imageNotAvailable: '画像がありません',
  imageCaptured: '画像キャプチャ完了',
  copied: 'コピー完了',
  enlarge: '拡大',
  copy: 'コピー',
  download: 'ダウンロード',
  remove: '削除',
  delete: '削除',
  validate: '確認',
  uploading: 'アップロード中...',

  // Files
  dropFiles: 'ファイルをドロップ',
  dragOrClick: 'ドラッグまたはクリック',
  multipleFiles: '複数ファイル',
  oneFile: '1ファイル',
  addFile: 'ファイルを追加',
  attachFile: 'ファイルを添付',
  dropYourFiles: 'ファイルをドロップ',
  files: '{count}ファイル',
  file: 'ファイル',
  tooLargeMax: '大きすぎます (最大{maxSize})',
  typeNotAllowed: '許可されていないタイプ',
  import: 'インポート',
  link: 'リンク',
  pasteLinkPlaceholder: 'リンクを貼り付け...',
  externalFile: '外部ファイル',

  // Clipboard
  clipboard: 'クリップボード',
  characters: '文字',
  empty: '空',
  noContentCopied: 'コピーされたコンテンツがありません',
  copyTextOrImageToStart: 'テキストまたは画像をコピーして開始',
  noImageDataFound: '画像データが見つかりません',

  // Queue & History
  sending: '送信中...',
  sent: '送信済み',
  contentWithoutText: 'テキストなしのコンテンツ',
  justNow: '今',
  minutes: '分',
  hours: '時間',
  clearAll: 'すべてクリア',
  element: '要素',
  elements: '要素',

  // Connection status
  offlineQueueMessage: 'オフライン - コンテンツはキューに追加されます',
  errorsInQueue: '{count}件のエラーがキューにあります',
  elementsWaiting: '{count}件の要素が送信待ち',

  // Table of Contents
  tableOfContents: '目次',
  noSectionFound: 'セクションが見つかりません',
  insertAtEndOfSection: 'セクションの最後に挿入',
  insertAtEndOfThisSection: 'このセクションの最後に挿入',

  // Send actions
  selectPages: 'ページを選択',
  sendToOnePage: '1ページに送信',
  sendToPages: '{count}ページに送信',
  sendToPage: '"{title}"に送信',
} as const;

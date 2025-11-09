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
  search: '検索',
  select: '選択',
  deselect: '選択解除',

  // Loading states
  loadingPages: 'ページを読み込み中...',

  // Search & Selection
  searchPages: 'ページを検索...',
  selectPage: 'ページを選択',
  pagesSelected: '{count}ページ選択済み',

  // Connection status
  offline: 'オフライン',
  online: 'オンライン',
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
} as const;

export default {
  // Generic UI
  back: '뒤로',
  continue: '계속',
  start: '시작',
  cancel: '취소',
  confirm: '확인',
  close: '닫기',
  loading: '로딩 중...',
  retry: '다시 시도',
  previous: '이전',
  next: '다음',

  // Actions
  send: '보내기',
  clear: '지우기',
  attach: '첨부',
  search: '검색',
  select: '선택',
  deselect: '선택 해제',

  // Loading states
  loadingPages: '페이지 로딩 중...',

  // Search & Selection
  searchPages: '페이지 검색...',
  selectPage: '페이지 선택',
  pagesSelected: '{count}개 페이지 선택됨',

  // Connection status
  offline: '오프라인',
  online: '온라인',
  pending: '대기 중',
  error: '오류',
  errors: '{count}개 오류',

  // Focus Mode
  focusModeDisabled: '포커스 모드 비활성화',
  sendTo: '보낼 위치',
  dropToSend: '드롭하여 보내기',

  // Editor
  chooseEmoji: '이모지 선택',

  // Page list & results
  loadMore: '더 불러오기',
  noResults: '결과 없음',
  noPages: '페이지 없음',
  noPagesMatch: '"{query}"와 일치하는 페이지 없음',
  createPagesInNotion: 'Notion에서 페이지를 만들어 시작하세요',
  page: '페이지',
  pages: '페이지',
  selected: '선택됨',
  recentPages: '최근 페이지',
  noPagesFound: '페이지를 찾을 수 없음',
  noRecentPages: '최근 페이지 없음',

  // Activity
  recentActivity: '최근 활동',
  andOthers: '외 {count}개 항목...',

  // Tabs
  suggested: '제안됨',
  favorites: '즐겨찾기',
  recent: '최근',
  all: '모두',

  // Time & Dates
  now: '지금',
  yesterday: '어제',
  untitled: '제목 없음',

  // Sidebar
  showPages: '페이지 표시',
  hidePages: '페이지 숨기기',
  settings: '설정',

  // Focus Mode extended
  selectPageToActivateFocusMode: '포커스 모드를 활성화할 페이지 선택',
  deactivateFocusMode: '포커스 모드 비활성화',
  activateFocusMode: '포커스 모드 활성화',
  deactivate: '비활성화',

  // Sections
  hideSections: '섹션 숨기기',
  chooseSection: '섹션 선택',
  selectPagesToStart: '시작하려면 페이지 선택',

  // Database
  allOptionsSelected: '모든 옵션이 선택됨',
  selectDatabasePage: '데이터베이스 페이지 선택',
  multiSelectModeNoDatabaseProperties: '다중 선택 모드에서는 데이터베이스 속성을 사용할 수 없습니다',

  // Connection
  connectedToNotion: 'Notion 연결됨 - 직접 전송',

  // Images
  unableToLoadImage: '이미지를 불러올 수 없음',
  fileMayBeCorrupted: '파일이 손상되었거나 액세스할 수 없습니다',
  verifyFileFormat: '파일 형식 확인',
  imageCaptured: '이미지 캡처 완료',

  // Files
  dropFiles: '파일 드롭',
  dragOrClick: '드래그 또는 클릭',
  multipleFiles: '여러 파일',
  oneFile: '1개 파일',
  addFile: '파일 추가',
  attachFile: '파일 첨부',
  dropYourFiles: '파일을 드롭하세요',
  files: '{count}개 파일',

  // Send actions
  selectPages: '페이지 선택',
  sendToOnePage: '1개 페이지로 보내기',
  sendToPages: '{count}개 페이지로 보내기',
  sendToPage: '"{title}"(으)로 보내기',
} as const;

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
} as const;

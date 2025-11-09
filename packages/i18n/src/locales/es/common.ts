export default {
  // Generic UI
  back: 'Atrás',
  continue: 'Continuar',
  start: 'Comenzar',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
  close: 'Cerrar',
  loading: 'Cargando...',
  retry: 'Reintentar',
  previous: 'Anterior',
  next: 'Siguiente',

  // Actions
  send: 'Enviar',
  clear: 'Limpiar',
  attach: 'Adjuntar',
  search: 'Buscar',
  select: 'Seleccionar',
  deselect: 'Deseleccionar',

  // Loading states
  loadingPages: 'Cargando páginas...',

  // Search & Selection
  searchPages: 'Buscar páginas...',
  selectPage: 'Seleccionar una página',
  pagesSelected: '{count} página(s) seleccionada(s)',

  offline: 'Sin conexión',
  online: 'En línea',
  // Connection status
  pending: 'pendiente',
  errors: '{count} error(es)',
  error: 'error',

  // Focus Mode
  focusModeDisabled: 'Focus Mode desactivado',
  sendTo: 'Enviar a',
  dropToSend: 'Soltar para enviar',

  // Editor
  chooseEmoji: 'Elegir un emoji',

  // Page list & results
  loadMore: 'Cargar más',
  noResults: 'Sin resultados',
  noPages: 'Sin páginas',
  noPagesMatch: 'Ninguna página coincide con "{query}"',
  createPagesInNotion: 'Crea páginas en Notion para empezar',
  page: 'página',
  pages: 'páginas',
  selected: 'seleccionada',
  recentPages: 'Páginas recientes',
  noPagesFound: 'No se encontraron páginas',
  noRecentPages: 'Sin páginas recientes',

  // Activity
  recentActivity: 'Actividad reciente',
  andOthers: 'Y {count} elemento(s) más...',

  // Tabs
  suggested: 'Sugeridas',
  favorites: 'Favoritos',
  recent: 'Recientes',
  all: 'Todas',

  // Time & Dates
  now: 'ahora',
  yesterday: 'ayer',
  untitled: 'Sin título',

  // Sidebar
  showPages: 'Mostrar páginas',
  hidePages: 'Ocultar páginas',
  settings: 'Configuración',

  // Focus Mode extended
  selectPageToActivateFocusMode: 'Selecciona una página para activar el Modo Focus',
  deactivateFocusMode: 'Desactivar Modo Focus',
  activateFocusMode: 'Activar Modo Focus',
  deactivate: 'Desactivar',

  // Sections
  hideSections: 'Ocultar secciones',
  chooseSection: 'Elegir sección',
  selectPagesToStart: 'Selecciona páginas para empezar',

  // Database
  allOptionsSelected: 'Todas las opciones están seleccionadas',
  selectDatabasePage: 'Selecciona una página de base de datos',
  multiSelectModeNoDatabaseProperties: 'Propiedades de base de datos no disponibles en modo multi-selección',

  // Connection
  connectedToNotion: 'Conectado a Notion - Envío directo',

  // Images
  unableToLoadImage: 'No se puede cargar la imagen',
  fileMayBeCorrupted: 'El archivo puede estar corrupto o inaccesible',
  verifyFileFormat: 'Verifica el formato del archivo',
  imageCaptured: 'Imagen capturada',
  copied: 'Copiada',
  enlarge: 'Ampliar',
  copy: 'Copiar',
  download: 'Descargar',
  remove: 'Quitar',
  delete: 'Eliminar',

  // Files
  dropFiles: 'Suelta los archivos',
  dragOrClick: 'Arrastra o haz clic',
  multipleFiles: 'Varios archivos',
  oneFile: 'Un archivo',
  addFile: 'Agregar archivo',
  attachFile: 'Adjuntar archivo',
  dropYourFiles: 'Suelta tus archivos',
  files: '{count} archivo(s)',
  file: 'archivo',
  tooLargeMax: 'Demasiado grande (máx {maxSize})',
  typeNotAllowed: 'Tipo no permitido',
  import: 'Importar',
  link: 'Enlace',
  pasteLinkPlaceholder: 'Pegar enlace...',
  externalFile: 'Archivo externo',

  // Clipboard
  clipboard: 'Portapapeles',
  characters: 'caracteres',
  empty: 'Vacío',
  noContentCopied: 'No hay contenido copiado',
  copyTextOrImageToStart: 'Copia texto o una imagen para empezar',
  noImageDataFound: 'No se encontraron datos de imagen',

  // Queue & History
  sending: 'Enviando...',
  sent: 'Enviado',
  contentWithoutText: 'Contenido sin texto',
  justNow: 'Ahora mismo',
  minutes: 'min',
  hours: 'h',
  clearAll: 'Borrar todo',
  element: 'elemento',
  elements: 'elementos',

  // Connection status
  offlineQueueMessage: 'Sin conexión - El contenido se añadirá a la cola',
  errorsInQueue: '{count} error(es) en la cola',
  elementsWaiting: '{count} elemento(s) esperando envío',

  // Table of Contents
  tableOfContents: 'Tabla de contenidos',
  noSectionFound: 'No se encontró sección',
  insertAtEndOfSection: 'Insertar al final de la sección',
  insertAtEndOfThisSection: 'Insertar al final de esta sección',

  // Send actions
  selectPages: 'Seleccionar páginas',
  sendToOnePage: 'Enviar a 1 página',
  sendToPages: 'Enviar a {count} páginas',
  sendToPage: 'Enviar a "{title}"',
} as const;

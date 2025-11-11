export default {
  // Success
  contentSent: 'تم إرسال المحتوى بنجاح',
  contentQueued: 'تمت إضافة المحتوى إلى قائمة الانتظار',
  contentSentToPages: 'تم إرسال المحتوى إلى {count}/{total} صفحة',
  configCompleted: 'تم إكمال التكوين بنجاح',

  // Errors
  noContent: 'لا يوجد محتوى لإرساله',
  noDestination: 'حدد صفحة وجهة',
  sendError: 'خطأ في إرسال المحتوى',
  errorsOnPages: 'أخطاء في {count} صفحة',

  // Init errors
  loadPagesError: 'تعذر تحميل صفحات Notion',
  initError: 'خطأ أثناء تهيئة التطبيق',
  tokenMissing: 'خطأ: الرمز مفقود',
  notionServiceError: 'خطأ في تهيئة خدمة Notion',
  criticalInitError: 'خطأ حرج أثناء التهيئة',
  criticalConfigError: 'خطأ حرج أثناء التكوين',

  // Content Editor
  characterLimit: 'لا يمكن أن يتجاوز النص {limit} حرفًا',

  // Confirmations
  confirmClearClipboard: 'مسح الحافظة؟',

  // Placeholders for interpolation
  sentToCount: 'تم إرسال المحتوى إلى {count}/{total} صفحة',
  queuedForCount: 'تمت إضافة المحتوى إلى قائمة الانتظار لـ {count} صفحة',
} as const;

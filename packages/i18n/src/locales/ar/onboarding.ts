export default {
  // Steps
  welcome: 'مرحبًا',
  connection: 'الاتصال',
  permissions: 'الأذونات',
  notionConnection: 'اتصال Notion',

  // Welcome screen
  welcomeTitle: 'مرحبًا بك في Clipper Pro',
  welcomeSubtitle: 'التقط أفكارك على الفور من أي صفحة ويب.',
  welcomeDescription: 'الأداة المثالية لالتقاط وتنظيم أفكارك في Notion.',

  // Features
  featureQuickCapture: 'التقاط سريع',
  featureOrganization: 'التنظيم',
  featureSync: 'المزامنة',

  // Connection
  connectToNotion: 'الاتصال بـ Notion',
  authorizeAccess: 'السماح لـ Clipper بالوصول الآمن إلى مساحة عمل Notion الخاصة بك',
  continueWithNotion: 'المتابعة مع Notion',
  securityNote: 'اتصال آمن. نصل فقط إلى الصفحات التي تسمح بها صراحةً.',

  // Permissions
  lastStep: 'الخطوة الأخيرة: الأذونات',
  allowClipboard: 'السماح بالوصول إلى الحافظة لالتقاط المحتوى',
  clipboardAccess: 'الوصول إلى الحافظة',
  clipboardRequired: 'مطلوب لالتقاط المحتوى المنسوخ تلقائيًا',
  allowAccess: 'السماح بالوصول',
  privacyNote: '🔒 الخصوصية أولاً: يجمع Clipper Pro فقط المحتوى الذي تختار التقاطه صراحةً. لا تتم مشاركة أي بيانات مع أطراف ثالثة.',

  // Errors
  tokenRequired: 'الرمز مطلوب',
  invalidToken: 'رمز غير صالح. يرجى التحقق من رمز التكامل الخاص بك.',
  connectionError: 'خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
  clipboardPermissionRequired: 'يرجى السماح بالوصول إلى الحافظة',
  notionConnectionIncomplete: 'لم يكتمل اتصال Notion',
  oauthTimeout: 'انتهت المهلة: انتهت صلاحية اتصال OAuth',
  connectionSuccess: 'نجح الاتصال! جارٍ إعادة التوجيه...',
  authError: 'خطأ في المصادقة',
  oauthStartError: 'خطأ في بدء OAuth',
  apiNotAvailable: 'Electron API غير متوفر',
} as const;

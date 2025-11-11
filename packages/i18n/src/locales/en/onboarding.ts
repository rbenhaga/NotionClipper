export default {
  // Steps
  welcome: 'Welcome',
  connection: 'Connection',
  permissions: 'Permissions',
  notionConnection: 'Notion Connection',

  // Welcome screen
  welcomeTitle: 'Welcome to Clipper Pro',
  welcomeSubtitle: 'Instantly capture your ideas from any web page.',
  welcomeDescription: 'The ultimate tool to capture and organize your ideas in Notion.',

  // Features
  featureQuickCapture: 'Quick Capture',
  featureOrganization: 'Organization',
  featureSync: 'Synchronization',

  // Connection
  connectToNotion: 'Connect to Notion',
  authorizeAccess: 'Authorize Clipper to securely access your Notion workspace',
  continueWithNotion: 'Continue with Notion',
  securityNote: 'Secure connection. We only access the pages you explicitly authorize.',

  // Permissions
  lastStep: 'Last step: Permissions',
  allowClipboard: 'Allow clipboard access to capture content',
  clipboardAccess: 'Clipboard Access',
  clipboardRequired: 'Required to automatically capture copied content',
  allowAccess: 'Allow Access',
  privacyNote: '🔒 Privacy first: Clipper Pro only collects content you explicitly choose to capture. No data is shared with third parties.',

  // Errors
  tokenRequired: 'Token is required',
  invalidToken: 'Invalid token. Please check your integration token.',
  connectionError: 'Connection error. Please try again.',
  clipboardPermissionRequired: 'Please allow clipboard access',
  notionConnectionIncomplete: 'Notion connection not completed',
  oauthTimeout: 'Timeout: OAuth connection expired',
  connectionSuccess: 'Connection successful! Redirecting...',
  authError: 'Authentication error',
  oauthStartError: 'Error starting OAuth',
  apiNotAvailable: 'Electron API not available',
} as const;

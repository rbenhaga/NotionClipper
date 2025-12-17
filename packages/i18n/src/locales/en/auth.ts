export default {
  // Titles
  appName: 'Clipper Pro',
  signIn: 'Sign in',
  signUp: 'Sign up',
  welcome: 'Welcome',
  welcomeBack: 'Welcome back',
  createAccount: 'Create account',
  welcomeTitle: 'Welcome to Clipper Pro',
  webAuthDescription: 'Sign in or create an account on our website to get started.',
  waitingForAuth: 'Waiting for authentication...',
  completeInBrowser: 'Complete the sign-in process in your browser. This window will update automatically.',
  tryAgain: 'Try again',
  signInOnWebsite: 'Sign in on Website',
  securityNote: 'For your security, authentication is handled on our secure website. Your credentials are never stored in the app.',

  // Buttons
  continueWithGoogle: 'Continue with Google',
  continueWithNotion: 'Continue with Notion',
  continueWithEmail: 'Create an account',
  signInButton: 'Sign in',
  signUpButton: 'Create my account',
  or: 'or',

  // Form
  email: 'Email',
  password: 'Password',
  showPassword: 'Show password',
  hidePassword: 'Hide password',

  // Links
  alreadyHaveAccount: 'Already have an account?',
  noAccount: 'No account yet?',

  // Placeholders & hints
  connectToStart: 'Sign in to get started',
  fillInformation: 'Fill in the information below',
  passwordMinLength: 'Minimum 8 characters',

  // Loading states
  signingIn: 'Signing in...',
  signingUp: 'Signing up...',
  creatingAccount: 'Creating...',
  connecting: 'Connecting...',

  // Notion OAuth email step
  notionConnected: 'Notion workspace connected',
  enterEmail: 'Enter your email',
  notionEmailHelp: 'To complete your account',
  continueButton: 'Continue',

  // Errors - Authentication
  invalidCredentials: 'Invalid credentials',
  emailOrPasswordIncorrect: 'Email or password incorrect',
  emailNotConfirmed: 'Please confirm your email',
  userAlreadyRegistered: 'An account already exists with this email',
  databaseError: 'Error creating account. Please try again.',
  passwordTooShort: 'Password must be at least 8 characters',
  passwordRequired: 'Password required',
  emailInvalid: 'Invalid email address',
  emailAndPasswordRequired: 'Email and password required',
  authError: 'Authentication error',
  oauthError: 'Connection error',
} as const;

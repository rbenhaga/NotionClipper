export default {
  // Titles
  appName: 'Notion Clipper',
  signIn: 'Sign in',
  signUp: 'Sign up',
  welcome: 'Welcome',
  welcomeBack: 'Welcome back',
  createAccount: 'Create account',

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

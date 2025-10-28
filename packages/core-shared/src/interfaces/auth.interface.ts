export interface User {
  id: string;
  email: string;
  name?: string;
  full_name?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export interface AuthProvider {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  register(credentials: RegisterCredentials): Promise<AuthResponse>;
  logout(): Promise<void>;
  refreshToken(token: string): Promise<AuthResponse>;
  getCurrentUser(): Promise<User | null>;
  verifyToken(token: string): Promise<boolean>;
}

// OAuth and Workspace interfaces
export interface OAuthState {
  state: 'idle' | 'authorizing' | 'success' | 'error';
  authUrl?: string;
  error?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  message?: string;
}

export interface NotionWorkspace {
  id: string;
  user_id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_icon?: string;
  bot_id: string;
  access_token: string;
  token_type: string;
  is_default: boolean;
  is_active: boolean;
  last_used_at: string;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSelection {
  workspaceId: string;
  workspaceName: string;
  isDefault?: boolean;
}

export type AuthMethod = 'oauth' | 'api_key';

export interface AuthConfig {
  method: AuthMethod;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  notionClientId?: string;
  redirectUri?: string;
}

// Service interfaces
export interface IAuth {
  initialize(config: AuthConfig): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  isAuthenticated(): Promise<boolean>;
  signInWithOAuth(email: string): Promise<OAuthState>;
  signInWithApiKey(apiKey: string): Promise<AuthResult>;
  handleOAuthCallback(code: string, state: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  getNotionAccessToken(workspaceId?: string): Promise<string | null>;
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}

export interface IWorkspace {
  initialize(userId: string): Promise<void>;
  getWorkspaces(): Promise<NotionWorkspace[]>;
  getWorkspace(workspaceId: string): Promise<NotionWorkspace | null>;
  getDefaultWorkspace(): Promise<NotionWorkspace | null>;
  getCurrentWorkspace(): Promise<NotionWorkspace | null>;
  setDefaultWorkspace(workspaceId: string): Promise<void>;
  switchWorkspace(workspaceId: string): Promise<void>;
  updateWorkspace(workspaceId: string, updates: Partial<NotionWorkspace>): Promise<void>;
  removeWorkspace(workspaceId: string): Promise<void>;
  refreshWorkspace(workspaceId: string): Promise<void>;
  refreshAllWorkspaces(userId: string): Promise<void>;
  onWorkspaceChange(callback: (workspaces: NotionWorkspace[]) => void): () => void;
}

export interface ISupabaseAdapter {
  initialize(supabaseUrl: string, supabaseAnonKey: string): Promise<void>;
  getUser(): Promise<User | null>;
  initiateOAuth(email: string): Promise<{ authUrl: string }>;
  handleCallback(code: string, state: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  fetchWorkspaces(userId: string): Promise<NotionWorkspace[]>;
  setDefaultWorkspace(userId: string, workspaceId: string): Promise<void>;
  updateWorkspace(workspaceId: string, updates: Partial<NotionWorkspace>): Promise<void>;
  deleteWorkspace(workspaceId: string): Promise<void>;
  getAccessToken(workspaceId: string): Promise<string | null>;
}
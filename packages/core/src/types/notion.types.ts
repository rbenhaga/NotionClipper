/**
 * Notion API types
 */
export interface NotionPage {
  id: string;
  title: string;
  url: string;
  icon?: NotionIcon;
  cover?: NotionCover;
  parent: NotionParent;
  properties: Record<string, NotionProperty>;
  created_time: string;
  last_edited_time: string;
  archived: boolean;
  in_trash: boolean;
}

export interface NotionDatabase {
  id: string;
  title: string;
  description?: string;
  icon?: NotionIcon;
  cover?: NotionCover;
  properties: Record<string, NotionDatabaseProperty>;
  parent: NotionParent;
  url: string;
  created_time: string;
  last_edited_time: string;
  archived: boolean;
  in_trash: boolean;
}

export interface NotionBlock {
  type: string;
  [key: string]: any;
}

export interface NotionIcon {
  type: 'emoji' | 'external' | 'file';
  emoji?: string;
  external?: { url: string };
  file?: { url: string };
}

export interface NotionCover {
  type: 'external' | 'file';
  external?: { url: string };
  file?: { url: string };
}

export interface NotionParent {
  type: 'database_id' | 'page_id' | 'workspace';
  database_id?: string;
  page_id?: string;
  workspace?: boolean;
}

export interface NotionProperty {
  id: string;
  type: string;
  [key: string]: any;
}

export interface NotionDatabaseProperty {
  id: string;
  name: string;
  type: 'title' | 'rich_text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'email' | 'phone_number' | 'status';
  [key: string]: any;
}

export interface NotionUser {
  id: string;
  name?: string;
  avatar_url?: string;
  type: 'person' | 'bot';
  person?: {
    email: string;
  };
  bot?: {
    owner: NotionUser;
    workspace_name?: string;
  };
}

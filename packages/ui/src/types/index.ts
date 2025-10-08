// packages/ui/src/types/index.ts

/**
 * Notion Page type
 * Simplified version for UI components
 */
export interface NotionPage {
  id: string;
  title: string;
  url?: string;
  icon?: {
    type?: string;
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
  };
  cover?: {
    type?: string;
    external?: { url: string };
    file?: { url: string };
  };
  parent?: any;
  parent_id?: string;
  parent_title?: string;
  parent_type?: string;
  last_edited_time?: string;
  last_edited?: string;
  created_time?: string;
  type?: string;
  object?: string;
  properties?: Record<string, any>;
  
  archived?: boolean;
  in_trash?: boolean;
}
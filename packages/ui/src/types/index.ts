export interface NotionPage {
    id: string;
    title: string;
    icon?: {
      type?: string;
      emoji?: string;
      external?: { url: string };
      file?: { url: string };
    };
    parent?: any;
    parent_title?: string;
    last_edited_time?: string;
    type?: string;
    object?: string;
  }
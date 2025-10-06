export interface NotionPage {
    id: string;
    title: string;
    url: string;
    icon?: NotionIcon;
    parent: NotionParent;
    properties: Record<string, any>;
    created_time: string;
    last_edited_time: string;
}

export interface NotionIcon {
    type: 'emoji' | 'external' | 'file';
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
}

export interface NotionParent {
    type: 'database_id' | 'page_id' | 'workspace';
    database_id?: string;
    page_id?: string;
}

export interface NotionBlock {
    type: string;
    [key: string]: any;
}
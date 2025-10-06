export interface NotionPage {
    id: string;
    title: string;
    url: string;
    icon?: NotionIcon;
    cover?: NotionCover;
    parent: NotionParent;
    properties: Record<string, any>;
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
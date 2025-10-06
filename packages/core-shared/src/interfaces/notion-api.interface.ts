import type { NotionPage, NotionBlock } from '../types';

export interface INotionAPI {
    validateToken(): Promise<boolean>;
    getPages(): Promise<NotionPage[]>;
    appendBlocks(pageId: string, blocks: NotionBlock[]): Promise<void>;
    uploadImage(file: Buffer | Blob): Promise<string>;
}
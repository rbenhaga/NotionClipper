// packages/core-electron/src/services/file.service.ts
import type { INotionAPI, ICacheAdapter, NotionBlock } from '@notion-clipper/core-shared';
import { FileUploadHandler } from '@notion-clipper/notion-parser';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Blob } from 'buffer';

export interface FileUploadConfig {
    type: 'file' | 'image' | 'video' | 'audio' | 'pdf';
    mode: 'upload' | 'embed' | 'external';
    caption?: string;
}

export interface FileUploadResult {
    success: boolean;
    block?: NotionBlock;
    url?: string;
    error?: string;
    metadata?: {
        size: number;
        type: string;
        name: string;
    };
}

export class ElectronFileService {
    private notionAPI: INotionAPI;
    private cache: ICacheAdapter;
    private uploadHandler: FileUploadHandler;

    constructor(notionAPI: INotionAPI, cache: ICacheAdapter, notionToken: string) {
        this.notionAPI = notionAPI;
        this.cache = cache;

        this.uploadHandler = new FileUploadHandler({
            notionToken,
            maxFileSize: 20 * 1024 * 1024, // 20MB
            generateUniqueName: true
        });
    }

    /**
     * Upload a file to Notion
     */
    async uploadFile(
        fileInput: string | { fileName: string; buffer: Buffer },
        config: FileUploadConfig
    ): Promise<FileUploadResult> {
        try {
            let fileBuffer: Buffer;
            let fileName: string;

            // Handle different input types
            if (typeof fileInput === 'string') {
                // File path provided
                console.log(`[FILE] Uploading file from path: ${fileInput}`);
                fileBuffer = await fs.readFile(fileInput);
                fileName = path.basename(fileInput);
            } else {
                // Buffer and filename provided
                console.log(`[FILE] Uploading file from buffer: ${fileInput.fileName}`);
                fileBuffer = fileInput.buffer;
                fileName = fileInput.fileName;
            }

            // Validate
            console.log(`[FILE] Validating file: ${fileName}, size: ${fileBuffer.length} bytes`);
            const validation = this.validateFile(fileBuffer, fileName, config);
            if (!validation.valid) {
                console.log(`[FILE] Validation failed: ${validation.error}`);
                return {
                    success: false,
                    error: validation.error
                };
            }
            console.log(`[FILE] Validation passed`);

            console.log(`[FILE] Config mode: ${config.mode}, type: ${config.type}`);

            // Create File-like object (Node.js compatible)
            const blob = new Blob([fileBuffer], {
                type: this.getMimeType(fileName)
            });

            // Create File-like object with required properties
            const fileObject = Object.assign(blob, {
                name: fileName,
                lastModified: Date.now()
            }) as File;

            // Upload based on mode
            let block: NotionBlock | null = null;
            let url: string | undefined;

            if (config.mode === 'upload') {
                // Upload to Notion
                console.log(`[FILE] Starting upload to Notion...`);
                const uploadResult = await this.uploadHandler.uploadFile(fileObject, fileName);
                console.log(`[FILE] Upload result:`, uploadResult);

                if (!uploadResult.success) {
                    console.log(`[FILE] Upload failed: ${uploadResult.error}`);
                    return {
                        success: false,
                        error: uploadResult.error
                    };
                }

                console.log(`[FILE] Upload successful, creating block...`);
                // Create block
                block = this.uploadHandler.createBlockFromUpload(uploadResult, fileObject);
                url = uploadResult.url;
                console.log(`[FILE] Block created:`, block ? 'success' : 'failed');

            } else if (config.mode === 'external') {
                // Create external link block
                const fileUrl = typeof fileInput === 'string' ? fileInput : fileName;
                block = this.createExternalBlock(
                    fileUrl, // Use file path or filename as URL
                    config.type,
                    config.caption
                );
            }

            // Add caption if provided
            if (block && config.caption) {
                block = this.addCaptionToBlock(block, config.caption);
            }

            // Cache the result
            await this.cacheUpload(fileName, block, url);

            return {
                success: true,
                block: block || undefined,
                url,
                metadata: {
                    size: fileBuffer.length,
                    type: this.getMimeType(fileName),
                    name: fileName
                }
            };

        } catch (error) {
            console.error('[FILE] Upload error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed'
            };
        }
    }

    /**
     * Upload from URL
     */
    async uploadFromUrl(
        url: string,
        config: FileUploadConfig
    ): Promise<FileUploadResult> {
        try {
            console.log(`[FILE] Uploading from URL: ${url}`);

            // Fetch the file
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Get filename from URL or Content-Disposition header
            const fileName = this.extractFileName(url, response.headers);

            // Create temporary file
            const tempPath = path.join(require('os').tmpdir(), fileName);
            await fs.writeFile(tempPath, buffer);

            // Upload the file
            const result = await this.uploadFile(tempPath, config);

            // Clean up
            await fs.unlink(tempPath).catch(() => { });

            return result;

        } catch (error) {
            console.error('[FILE] URL upload error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'URL upload failed'
            };
        }
    }

    /**
     * Validate file before upload
     */
    private validateFile(
        buffer: Buffer,
        fileName: string,
        config: FileUploadConfig
    ): { valid: boolean; error?: string } {
        const MAX_SIZE = 20 * 1024 * 1024; // 20MB

        if (buffer.length > MAX_SIZE) {
            return {
                valid: false,
                error: `File too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max 20MB)`
            };
        }

        const mimeType = this.getMimeType(fileName);
        const expectedType = config.type;

        // Validate MIME type matches config type
        if (expectedType === 'image' && !mimeType.startsWith('image/')) {
            return { valid: false, error: 'File is not an image' };
        }
        if (expectedType === 'video' && !mimeType.startsWith('video/')) {
            return { valid: false, error: 'File is not a video' };
        }
        if (expectedType === 'audio' && !mimeType.startsWith('audio/')) {
            return { valid: false, error: 'File is not an audio file' };
        }

        return { valid: true };
    }

    /**
     * Create external link block
     */
    private createExternalBlock(
        url: string,
        type: string,
        caption?: string
    ): NotionBlock {
        const base: any = {
            object: 'block'
        };

        if (type === 'image') {
            base.type = 'image';
            base.image = {
                type: 'external',
                external: { url },
                caption: caption ? [{ type: 'text', text: { content: caption } }] : []
            };
        } else if (type === 'video') {
            base.type = 'video';
            base.video = {
                type: 'external',
                external: { url },
                caption: caption ? [{ type: 'text', text: { content: caption } }] : []
            };
        } else {
            base.type = 'file';
            base.file = {
                type: 'external',
                external: { url },
                caption: caption ? [{ type: 'text', text: { content: caption } }] : []
            };
        }

        return base as NotionBlock;
    }

    /**
     * Add caption to block
     */
    private addCaptionToBlock(block: NotionBlock, caption: string): NotionBlock {
        const captionArray = [
            {
                type: 'text' as const,
                text: { content: caption }
            }
        ];

        if (block.type === 'image' && block.image) {
            return {
                ...block,
                image: {
                    ...block.image,
                    caption: captionArray
                }
            };
        }

        if (block.type === 'video' && block.video) {
            return {
                ...block,
                video: {
                    ...block.video,
                    caption: captionArray
                }
            };
        }

        if (block.type === 'file' && block.file) {
            return {
                ...block,
                file: {
                    ...block.file,
                    caption: captionArray
                }
            };
        }

        return block;
    }

    /**
     * Cache upload result
     */
    private async cacheUpload(
        fileName: string,
        block: NotionBlock | null,
        url?: string
    ): Promise<void> {
        if (!block) return;

        const cacheKey = `upload:${fileName}:${Date.now()}`;
        await this.cache.set(cacheKey, {
            block,
            url,
            timestamp: Date.now()
        }, 3600000); // 1 hour TTL
    }

    /**
     * Get MIME type from filename
     */
    private getMimeType(fileName: string): string {
        const ext = path.extname(fileName).toLowerCase().substring(1);

        const mimeTypes: Record<string, string> = {
            // Images
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',

            // Videos
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'avi': 'video/x-msvideo',
            'mov': 'video/quicktime',

            // Audio
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',

            // Documents
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

            // Archives
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Extract filename from URL or headers
     */
    private extractFileName(url: string, headers: Headers): string {
        // Try Content-Disposition header first
        const contentDisposition = headers.get('content-disposition');
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?(.+?)"?$/i);
            if (match) return match[1];
        }

        // Extract from URL
        const urlPath = new URL(url).pathname;
        const fileName = path.basename(urlPath);

        return fileName || `download-${Date.now()}`;
    }
}
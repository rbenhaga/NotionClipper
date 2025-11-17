import { Request, Response } from 'express';
import { supabaseService } from '../services/supabase.service';
import { quotaService } from '../services/quota.service';
import logger from '../utils/logger';

export class NotionController {
  /**
   * Send clip to Notion
   * POST /api/notion/send-clip
   *
   * This endpoint acts as a proxy to the Notion API, but enforces quota BEFORE sending
   */
  async sendClip(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { pageId, content, type, notionToken } = req.body;

      // Validate input
      if (!pageId || !content || !notionToken) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: pageId, content, notionToken'
        });
        return;
      }

      // 🔒 SECURITY: Check quota BEFORE sending to Notion
      const subscription = await supabaseService.getSubscription(userId);
      if (!subscription) {
        res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
        return;
      }

      const usage = await supabaseService.getUsageRecord(userId, subscription.id);
      const summary = quotaService.calculateSummary(subscription, usage);
      const canSend = quotaService.canPerformAction(summary, 'clips', 1);

      if (!canSend) {
        logger.warn(`Quota exceeded for user ${userId} - clips`);
        res.status(403).json({
          success: false,
          error: 'Quota exceeded',
          quotaType: 'clips',
          remaining: 0
        });
        return;
      }

      // Send to Notion API
      try {
        const notionResponse = await fetch('https://api.notion.com/v1/blocks/' + pageId + '/children', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({
            children: [content]
          })
        });

        if (!notionResponse.ok) {
          const errorData = await notionResponse.json();
          logger.error('Notion API error:', errorData);
          res.status(notionResponse.status).json({
            success: false,
            error: 'Notion API error',
            details: errorData
          });
          return;
        }

        const notionData = await notionResponse.json() as any;

        // ✅ Track usage AFTER successful send
        await supabaseService.incrementUsage(userId, 'clips', 1);

        logger.info(`Clip sent successfully for user ${userId}`);

        res.json({
          success: true,
          blockId: notionData.results?.[0]?.id,
          data: notionData
        });
      } catch (notionError: any) {
        logger.error('Error calling Notion API:', notionError);
        res.status(500).json({
          success: false,
          error: 'Failed to send to Notion',
          details: notionError.message
        });
      }
    } catch (error: any) {
      logger.error('Error in sendClip:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Upload file to Notion
   * POST /api/notion/upload-file
   *
   * This endpoint acts as a proxy to the Notion API, but enforces quota BEFORE uploading
   */
  async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { pageId, fileUrl, fileName, fileSize, notionToken } = req.body;

      // Validate input
      if (!pageId || !fileUrl || !fileName || !notionToken) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: pageId, fileUrl, fileName, notionToken'
        });
        return;
      }

      // 🔒 SECURITY: Check quota BEFORE uploading to Notion
      const subscription = await supabaseService.getSubscription(userId);
      if (!subscription) {
        res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
        return;
      }

      const usage = await supabaseService.getUsageRecord(userId, subscription.id);
      const summary = quotaService.calculateSummary(subscription, usage);
      const canUpload = quotaService.canPerformAction(summary, 'files', 1);

      if (!canUpload) {
        logger.warn(`Quota exceeded for user ${userId} - files`);
        res.status(403).json({
          success: false,
          error: 'Quota exceeded',
          quotaType: 'files',
          remaining: 0
        });
        return;
      }

      // Upload to Notion API
      try {
        const notionResponse = await fetch('https://api.notion.com/v1/blocks/' + pageId + '/children', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({
            children: [
              {
                object: 'block',
                type: 'file',
                file: {
                  type: 'external',
                  external: {
                    url: fileUrl
                  },
                  caption: [
                    {
                      type: 'text',
                      text: {
                        content: fileName
                      }
                    }
                  ]
                }
              }
            ]
          })
        });

        if (!notionResponse.ok) {
          const errorData = await notionResponse.json();
          logger.error('Notion API error:', errorData);
          res.status(notionResponse.status).json({
            success: false,
            error: 'Notion API error',
            details: errorData
          });
          return;
        }

        const notionData = await notionResponse.json() as any;

        // ✅ Track usage AFTER successful upload
        await supabaseService.incrementUsage(userId, 'files', 1);

        logger.info(`File uploaded successfully for user ${userId}: ${fileName}`);

        res.json({
          success: true,
          blockId: notionData.results?.[0]?.id,
          url: fileUrl,
          data: notionData
        });
      } catch (notionError: any) {
        logger.error('Error calling Notion API:', notionError);
        res.status(500).json({
          success: false,
          error: 'Failed to upload to Notion',
          details: notionError.message
        });
      }
    } catch (error: any) {
      logger.error('Error in uploadFile:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Batch send multiple clips/files
   * POST /api/notion/batch-send
   *
   * This endpoint allows sending multiple clips/files in one request
   * It checks quota for the entire batch BEFORE processing
   */
  async batchSend(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { pageId, items, notionToken } = req.body;

      // Validate input
      if (!pageId || !items || !Array.isArray(items) || items.length === 0 || !notionToken) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: pageId, items (array), notionToken'
        });
        return;
      }

      // Count clips and files
      const clipCount = items.filter((item: any) => item.type !== 'file').length;
      const fileCount = items.filter((item: any) => item.type === 'file').length;

      // 🔒 SECURITY: Check quota for entire batch BEFORE processing
      const subscription = await supabaseService.getSubscription(userId);
      if (!subscription) {
        res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
        return;
      }

      const usage = await supabaseService.getUsageRecord(userId, subscription.id);
      const summary = quotaService.calculateSummary(subscription, usage);

      const canSendClips = clipCount === 0 || quotaService.canPerformAction(summary, 'clips', clipCount);
      const canSendFiles = fileCount === 0 || quotaService.canPerformAction(summary, 'files', fileCount);

      if (!canSendClips) {
        logger.warn(`Quota exceeded for user ${userId} - clips (batch: ${clipCount})`);
        res.status(403).json({
          success: false,
          error: 'Quota exceeded',
          quotaType: 'clips',
          requested: clipCount,
          remaining: 0
        });
        return;
      }

      if (!canSendFiles) {
        logger.warn(`Quota exceeded for user ${userId} - files (batch: ${fileCount})`);
        res.status(403).json({
          success: false,
          error: 'Quota exceeded',
          quotaType: 'files',
          requested: fileCount,
          remaining: 0
        });
        return;
      }

      // Send batch to Notion API
      try {
        const notionResponse = await fetch('https://api.notion.com/v1/blocks/' + pageId + '/children', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({
            children: items.map((item: any) => item.content)
          })
        });

        if (!notionResponse.ok) {
          const errorData = await notionResponse.json();
          logger.error('Notion API error:', errorData);
          res.status(notionResponse.status).json({
            success: false,
            error: 'Notion API error',
            details: errorData
          });
          return;
        }

        const notionData = await notionResponse.json();

        // ✅ Track usage AFTER successful batch send
        if (clipCount > 0) {
          await supabaseService.incrementUsage(userId, 'clips', clipCount);
        }
        if (fileCount > 0) {
          await supabaseService.incrementUsage(userId, 'files', fileCount);
        }

        logger.info(`Batch sent successfully for user ${userId}: ${clipCount} clips, ${fileCount} files`);

        res.json({
          success: true,
          clipsSent: clipCount,
          filesSent: fileCount,
          data: notionData
        });
      } catch (notionError: any) {
        logger.error('Error calling Notion API:', notionError);
        res.status(500).json({
          success: false,
          error: 'Failed to send batch to Notion',
          details: notionError.message
        });
      }
    } catch (error: any) {
      logger.error('Error in batchSend:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const notionController = new NotionController();

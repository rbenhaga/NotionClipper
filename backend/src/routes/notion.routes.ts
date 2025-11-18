import { Router } from 'express';
import { notionController } from '../controllers/notion.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/notion/send-clip
 * Send a clip to Notion (with quota enforcement)
 *
 * Headers:
 * Authorization: Bearer <access_token>
 *
 * Body:
 * {
 *   "pageId": "notion_page_id",
 *   "content": { ...notion block object... },
 *   "type": "paragraph" | "heading" | etc.,
 *   "notionToken": "user_notion_token"
 * }
 */
router.post('/send-clip', authMiddleware, (req, res) => notionController.sendClip(req, res));

/**
 * POST /api/notion/upload-file
 * Upload a file to Notion (with quota enforcement)
 *
 * Headers:
 * Authorization: Bearer <access_token>
 *
 * Body:
 * {
 *   "pageId": "notion_page_id",
 *   "fileUrl": "https://...",
 *   "fileName": "file.png",
 *   "fileSize": 1024,
 *   "notionToken": "user_notion_token"
 * }
 */
router.post('/upload-file', authMiddleware, (req, res) => notionController.uploadFile(req, res));

/**
 * POST /api/notion/batch-send
 * Send multiple clips/files in one request (with quota enforcement)
 *
 * Headers:
 * Authorization: Bearer <access_token>
 *
 * Body:
 * {
 *   "pageId": "notion_page_id",
 *   "items": [
 *     { "type": "clip", "content": {...} },
 *     { "type": "file", "content": {...} },
 *     ...
 *   ],
 *   "notionToken": "user_notion_token"
 * }
 */
router.post('/batch-send', authMiddleware, (req, res) => notionController.batchSend(req, res));

export default router;

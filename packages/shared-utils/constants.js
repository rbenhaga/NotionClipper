/**
 * Shared constants for Notion Clipper
 */

export const APP_NAME = 'Notion Clipper Pro';
export const APP_VERSION = '3.0.0';

export const CONTENT_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  HTML: 'html',
  TABLE: 'table',
  CODE: 'code'
};

export const SHORTCUTS = {
  TOGGLE_APP: process.platform === 'darwin' ? 'Cmd+Shift+C' : 'Ctrl+Shift+C',
  SEND_TO_NOTION: process.platform === 'darwin' ? 'Cmd+Enter' : 'Ctrl+Enter',
  HIDE_WINDOW: 'Escape'
};

export const API_ENDPOINTS = {
  NOTION_BASE: 'https://api.notion.com/v1',
  LOCAL_BACKEND: 'http://localhost:5000'
};

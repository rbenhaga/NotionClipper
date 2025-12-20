// packages/core-shared/src/types/send.types.ts

/**
 * SendPayload - Typed payload for sending content to Notion
 * 
 * Two modes:
 * - 'clipperDoc': Structured ClipperDocument (preferred, preserves structure)
 * - 'raw': Legacy raw clipboard content (fallback)
 */

import type { ClipperDocument } from '@notion-clipper/notion-parser';
import type { InsertionMode } from './toc.types';

/**
 * Options for sending content to Notion
 */
export interface SendOptions {
  /** Content type hint */
  type?: string;
  /** Add as child block */
  asChild?: boolean;
  /** Insert after this specific block ID */
  afterBlockId?: string;
  /** Insertion mode: 'after-heading' or 'end-of-section' */
  insertionMode?: InsertionMode;
}

/**
 * Metadata about the send operation
 */
export interface SendMeta {
  /** Source of the content */
  source?: 'clipboard' | 'paste' | 'template' | 'voice' | 'file';
  /** Original clipboard hash for deduplication */
  clipboardHash?: string;
  /** Timestamp of the operation */
  timestamp?: number;
}

/**
 * ClipperDoc payload - structured content (preferred)
 */
export interface ClipperDocPayload {
  kind: 'clipperDoc';
  clipperDocument: ClipperDocument;
  options?: SendOptions;
  meta?: SendMeta;
}

/**
 * Raw payload - legacy unstructured content (fallback)
 */
export interface RawPayload {
  kind: 'raw';
  clipboard: {
    text?: string;
    content?: string;
    html?: string;
    type?: string;
    data?: unknown;
    images?: unknown[];
    [key: string]: unknown;
  };
  options?: SendOptions;
  meta?: SendMeta;
}

/**
 * Union type for all send payloads
 */
export type SendPayload = ClipperDocPayload | RawPayload;

/**
 * Type guard for ClipperDoc payload
 */
export function isClipperDocPayload(payload: SendPayload): payload is ClipperDocPayload {
  return payload.kind === 'clipperDoc' && 'clipperDocument' in payload;
}

/**
 * Type guard for Raw payload
 */
export function isRawPayload(payload: SendPayload): payload is RawPayload {
  return payload.kind === 'raw' && 'clipboard' in payload;
}

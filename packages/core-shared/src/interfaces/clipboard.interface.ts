import type { ClipboardContent } from '../types';

export interface IClipboard {
  read(): Promise<ClipboardContent | null>;
  write(content: ClipboardContent): Promise<void>;
  hasContent(): Promise<boolean>;
  getAvailableFormats(): Promise<string[]>;
  clear(): Promise<void>;
}
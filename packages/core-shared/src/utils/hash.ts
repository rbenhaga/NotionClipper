import CryptoJS from 'crypto-js';

export function hashContent(content: string): string {
  return CryptoJS.SHA256(content).toString();
}
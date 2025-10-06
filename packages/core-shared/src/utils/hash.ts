import CryptoJS from 'crypto-js';

export function simpleHash(str: string): string {
    return CryptoJS.MD5(str).toString();
}
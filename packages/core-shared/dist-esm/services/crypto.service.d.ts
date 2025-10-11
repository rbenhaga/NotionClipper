/**
 * Browser-safe Crypto Service
 * Uses native Web Crypto API (available in browsers and Node.js 15+)
 * NO external dependencies
 */
export declare class CryptoService {
    /**
     * Generate a simple hash from a string (for cache keys)
     * Uses native crypto.subtle API
     */
    static hash(text: string): Promise<string>;
    /**
     * Encrypt data (for secure storage)
     * Uses AES-GCM with native Web Crypto API
     */
    static encrypt(text: string, password: string): Promise<string>;
    /**
     * Decrypt data
     */
    static decrypt(encryptedBase64: string, password: string): Promise<string>;
    /**
     * Simple synchronous hash for quick operations (not cryptographically secure)
     * Use this for non-sensitive operations like clipboard change detection
     */
    static simpleHash(text: string): string;
    /**
     * Generate random ID
     */
    static generateId(length?: number): string;
}
//# sourceMappingURL=crypto.service.d.ts.map
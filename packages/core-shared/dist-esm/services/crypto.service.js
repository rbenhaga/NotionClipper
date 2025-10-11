/**
 * Browser-safe Crypto Service
 * Uses native Web Crypto API (available in browsers and Node.js 15+)
 * NO external dependencies
 */
export class CryptoService {
    /**
     * Generate a simple hash from a string (for cache keys)
     * Uses native crypto.subtle API
     */
    static async hash(text) {
        // Convert string to Uint8Array
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        // Hash using SHA-256
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        // Convert to hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }
    /**
     * Encrypt data (for secure storage)
     * Uses AES-GCM with native Web Crypto API
     */
    static async encrypt(text, password) {
        const encoder = new TextEncoder();
        // Derive key from password
        const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.deriveKey({
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
        // Encrypt
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));
        // Combine salt + iv + encrypted data
        const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(new Uint8Array(encrypted), salt.length + iv.length);
        // Return as base64
        return btoa(String.fromCharCode(...result));
    }
    /**
     * Decrypt data
     */
    static async decrypt(encryptedBase64, password) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        // Decode from base64
        const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
        // Extract salt, iv, and encrypted data
        const salt = encrypted.slice(0, 16);
        const iv = encrypted.slice(16, 28);
        const data = encrypted.slice(28);
        // Derive key from password
        const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
        const key = await crypto.subtle.deriveKey({
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        // Decrypt
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return decoder.decode(decrypted);
    }
    /**
     * Simple synchronous hash for quick operations (not cryptographically secure)
     * Use this for non-sensitive operations like clipboard change detection
     */
    static simpleHash(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }
    /**
     * Generate random ID
     */
    static generateId(length = 16) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
}

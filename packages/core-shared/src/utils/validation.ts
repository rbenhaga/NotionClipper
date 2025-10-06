export function isValidNotionToken(token: string): boolean {
    return /^secret_[a-zA-Z0-9]{43}$/.test(token);
}

export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}
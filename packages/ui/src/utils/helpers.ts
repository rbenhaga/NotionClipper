/**
 * Récupère l'icône d'une page Notion
 */
export function getPageIcon(page: any) {
    if (!page) return { type: 'default', value: null };

    // Emoji
    if (page.icon?.emoji) {
        return { type: 'emoji', value: page.icon.emoji };
    }

    // URL externe
    if (page.icon?.external?.url) {
        return { type: 'url', value: page.icon.external.url };
    }

    // Fichier Notion
    if (page.icon?.file?.url) {
        return { type: 'url', value: page.icon.file.url };
    }

    return { type: 'default', value: null };
}

/**
 * Tronque un texte avec ellipsis
 */
export function truncate(text: string, maxLength: number = 50): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Formate une date de manière relative (il y a X temps)
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    if (diffInDays < 30) return `Il y a ${Math.floor(diffInDays / 7)} sem`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Classe CSS conditionnelle
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
    return classes.filter(Boolean).join(' ');
}
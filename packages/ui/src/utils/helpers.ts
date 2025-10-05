export function getPageIcon(page: any): { type: 'emoji' | 'url' | 'none'; value: string } {
    if (!page) return { type: 'none', value: '' };
  
    // Emoji icon
    if (page.icon?.type === 'emoji' && page.icon?.emoji) {
      return { type: 'emoji', value: page.icon.emoji };
    }
  
    // External URL icon
    if (page.icon?.type === 'external' && page.icon?.external?.url) {
      return { type: 'url', value: page.icon.external.url };
    }
  
    // File icon
    if (page.icon?.type === 'file' && page.icon?.file?.url) {
      return { type: 'url', value: page.icon.file.url };
    }
  
    return { type: 'none', value: '' };
  }
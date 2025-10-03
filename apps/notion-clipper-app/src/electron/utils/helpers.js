const crypto = require('crypto');
const path = require('path');

// Extraire le titre d'une page Notion
function extractNotionPageTitle(page) {
  if (!page || !page.properties) return 'Sans titre';
  
  // Chercher la propriété title
  for (const [propName, propValue] of Object.entries(page.properties)) {
    if (propValue.type === 'title' && propValue.title && propValue.title.length > 0) {
      return propValue.title.map(t => t.plain_text).join('');
    }
  }
  
  // Fallback : chercher Name, Title, etc.
  const titleKeys = ['Name', 'Title', 'name', 'title', 'Nom', 'Titre'];
  for (const key of titleKeys) {
    const prop = page.properties[key];
    if (prop && prop.title && prop.title.length > 0) {
      return prop.title.map(t => t.plain_text).join('');
    }
  }
  
  return 'Sans titre';
}

// Calculer un hash SHA256
function calculateHash(data) {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Formater la taille de fichier
function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Sanitizer un nom de fichier
function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 255);
}

// Truncate text
function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Détecter si une URL est valide
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry avec backoff exponentiel
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  let delay = initialDelay;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(delay);
        delay *= 2;
      }
    }
  }
  
  throw lastError;
}

module.exports = {
  extractNotionPageTitle,
  calculateHash,
  formatFileSize,
  sanitizeFilename,
  truncateText,
  isValidUrl,
  sleep,
  retryWithBackoff
};
/**
 * Utilitaires pour gérer les favoris de manière sûre
 */

export const loadFavorites = () => {
  try {
    const stored = localStorage.getItem('favorites');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Erreur chargement favoris:', error);
    return [];
  }
};

export const saveFavorites = (favorites) => {
  if (!Array.isArray(favorites)) {
    console.error('saveFavorites: favorites doit être un array');
    return;
  }
  try {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  } catch (error) {
    console.error('Erreur sauvegarde favoris:', error);
  }
};

export const toggleFavorite = (pageId, currentFavorites = []) => {
  const safeFavorites = Array.isArray(currentFavorites) ? currentFavorites : [];
  const index = safeFavorites.indexOf(pageId);
  if (index > -1) {
    return safeFavorites.filter(id => id !== pageId);
  } else {
    return [...safeFavorites, pageId];
  }
}; 
// Système de suggestions intelligent sans dépendances externes

export interface SuggestionOptions {
  text: string;
  maxSuggestions?: number;
  includeContent?: boolean;
}

export interface PageSuggestion {
  pageId: string;
  title: string;
  score: number;
  reasons: string[];
  lastModified?: string;
  isFavorite?: boolean;
}

export interface SuggestionResult {
  suggestions: PageSuggestion[];
  totalScore: number;
}

export class ElectronSuggestionService {
  private notionService: any;
  private cache: Map<string, any> = new Map();

  constructor(notionService: any) {
    this.notionService = notionService;
    console.log('✅ SuggestionService: Système intelligent initialisé');
  }

  /**
   * Obtenir des suggestions de pages basées sur le contenu
   */
  async getSuggestions(options: SuggestionOptions): Promise<SuggestionResult> {
    const { text, maxSuggestions = 10, includeContent = false } = options;

    try {
      // 1. Récupérer toutes les pages
      const pages = await this.notionService.getPages();
      if (!pages || pages.length === 0) {
        return { suggestions: [], totalScore: 0 };
      }

      // 2. Si pas de texte, retourner les suggestions générales (favoris + récents)
      if (!text || text.trim() === '') {
        return this.getGeneralSuggestions(pages, maxSuggestions);
      }

      // 3. Analyser le texte d'entrée
      const inputAnalysis = this.analyzeText(text);

      // 4. Calculer les scores pour chaque page
      const scoredPages = await Promise.all(
        pages.map(async (page: any) => {
          const score = await this.calculatePageScore(page, inputAnalysis, includeContent);
          return {
            pageId: page.id,
            title: page.title || 'Sans titre',
            score: score.total,
            reasons: score.reasons,
            lastModified: page.last_edited_time,
            isFavorite: this.isPageFavorite(page)
          };
        })
      );

      // 5. Trier par score et limiter les résultats
      const suggestions = scoredPages
        .filter(page => page.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSuggestions);

      const totalScore = suggestions.reduce((sum, s) => sum + s.score, 0);

      return { suggestions, totalScore };

    } catch (error) {
      console.error('Erreur lors de la génération de suggestions:', error);
      return { suggestions: [], totalScore: 0 };
    }
  }

  /**
   * Obtenir des suggestions générales (sans texte spécifique)
   */
  private getGeneralSuggestions(pages: any[], maxSuggestions: number): SuggestionResult {
    const scoredPages = pages.map(page => {
      let score = 0;
      const reasons: string[] = [];

      // Favoris (score élevé)
      if (this.isPageFavorite(page)) {
        score += 100;
        reasons.push('Page favorite');
      }

      // Pages récentes (score basé sur la récence)
      const recencyScore = this.calculateRecencyScore(page.last_edited_time);
      score += recencyScore * 0.8; // Poids réduit pour les suggestions générales
      if (recencyScore > 50) {
        reasons.push(`Récemment modifiée (${Math.round(recencyScore)}%)`);
      }

      return {
        pageId: page.id,
        title: page.title || 'Sans titre',
        score: Math.round(score),
        reasons,
        lastModified: page.last_edited_time,
        isFavorite: this.isPageFavorite(page)
      };
    });

    const suggestions = scoredPages
      .filter(page => page.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);

    const totalScore = suggestions.reduce((sum, s) => sum + s.score, 0);

    return { suggestions, totalScore };
  }

  /**
   * Analyser le texte d'entrée pour extraire les mots-clés
   */
  private analyzeText(text: string) {
    const cleanText = text.toLowerCase().trim();

    // Extraire les mots (supprimer ponctuation et mots vides)
    const stopWords = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais', 'donc', 'car', 'ni', 'or', 'à', 'dans', 'par', 'pour', 'en', 'vers', 'avec', 'sans', 'sous', 'sur', 'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

    const words = cleanText
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Extraire les phrases courtes (potentiels titres)
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

    // Détecter le type de contenu
    const contentType = this.detectContentType(text);

    return {
      originalText: text,
      cleanText,
      words,
      sentences,
      contentType,
      wordCount: words.length,
      charCount: text.length
    };
  }

  /**
   * Calculer le score d'une page par rapport au contenu
   */
  private async calculatePageScore(page: any, inputAnalysis: any, includeContent: boolean) {
    let totalScore = 0;
    const reasons: string[] = [];

    // 1. Score basé sur le titre (poids: 40%)
    const titleScore = this.calculateTitleScore(page.title || '', inputAnalysis);
    totalScore += titleScore * 0.4;
    if (titleScore > 0) {
      reasons.push(`Titre similaire (${Math.round(titleScore)}%)`);
    }

    // 2. Score basé sur la récence (poids: 20%)
    const recencyScore = this.calculateRecencyScore(page.last_edited_time);
    totalScore += recencyScore * 0.2;
    if (recencyScore > 50) {
      reasons.push(`Page récente (${Math.round(recencyScore)}%)`);
    }

    // 3. Score basé sur les favoris (poids: 15%)
    const favoriteScore = this.isPageFavorite(page) ? 100 : 0;
    totalScore += favoriteScore * 0.15;
    if (favoriteScore > 0) {
      reasons.push('Page favorite');
    }

    // 4. Score basé sur le type de contenu (poids: 10%)
    const typeScore = this.calculateTypeScore(page, inputAnalysis.contentType);
    totalScore += typeScore * 0.1;
    if (typeScore > 0) {
      reasons.push(`Type compatible (${inputAnalysis.contentType})`);
    }

    // 5. Score basé sur le contenu de la page (poids: 15%) - optionnel
    if (includeContent) {
      const contentScore = await this.calculateContentScore(page, inputAnalysis);
      totalScore += contentScore * 0.15;
      if (contentScore > 0) {
        reasons.push(`Contenu similaire (${Math.round(contentScore)}%)`);
      }
    }

    return {
      total: Math.round(totalScore),
      reasons
    };
  }

  /**
   * Calculer la similarité entre le titre et le contenu
   */
  private calculateTitleScore(title: string, inputAnalysis: any): number {
    if (!title) return 0;

    const titleWords = title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Correspondance exacte de mots
    const matchingWords = titleWords.filter(word =>
      inputAnalysis.words.some((inputWord: string) =>
        word.includes(inputWord) || inputWord.includes(word)
      )
    );

    // Correspondance de phrases
    const phraseMatch = inputAnalysis.sentences.some((sentence: string) =>
      title.toLowerCase().includes(sentence.toLowerCase()) ||
      sentence.toLowerCase().includes(title.toLowerCase())
    );

    let score = 0;

    // Score basé sur les mots correspondants
    if (titleWords.length > 0) {
      score += (matchingWords.length / titleWords.length) * 70;
    }

    // Bonus pour correspondance de phrase
    if (phraseMatch) {
      score += 30;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculer le score de récence
   */
  private calculateRecencyScore(lastEditedTime: string): number {
    if (!lastEditedTime) return 0;

    const now = new Date();
    const editDate = new Date(lastEditedTime);
    const daysDiff = (now.getTime() - editDate.getTime()) / (1000 * 60 * 60 * 24);

    // Score décroissant avec le temps
    if (daysDiff < 1) return 100;      // Aujourd'hui
    if (daysDiff < 7) return 80;       // Cette semaine
    if (daysDiff < 30) return 60;      // Ce mois
    if (daysDiff < 90) return 40;      // Ce trimestre
    if (daysDiff < 365) return 20;     // Cette année
    return 10;                         // Plus ancien
  }

  /**
   * Détecter le type de contenu
   */
  private detectContentType(text: string): string {
    const lowerText = text.toLowerCase();

    if (text.includes('```') || text.includes('function') || text.includes('class ')) {
      return 'code';
    }
    if (text.includes('http') || text.includes('www.')) {
      return 'link';
    }
    if (text.includes('#') && text.includes('\n')) {
      return 'markdown';
    }
    if (text.includes('<') && text.includes('>')) {
      return 'html';
    }
    if (text.length > 500) {
      return 'article';
    }
    if (text.split('\n').length === 1 && text.length < 100) {
      return 'note';
    }

    return 'text';
  }

  /**
   * Calculer le score basé sur le type de contenu
   */
  private calculateTypeScore(page: any, contentType: string): number {
    // Logique basée sur les propriétés de la page Notion
    // À adapter selon la structure de tes pages

    if (contentType === 'code' && page.title?.toLowerCase().includes('code')) return 50;
    if (contentType === 'article' && page.title?.toLowerCase().includes('article')) return 50;
    if (contentType === 'note' && page.title?.toLowerCase().includes('note')) return 50;

    return 0;
  }

  /**
   * Calculer le score basé sur le contenu de la page (optionnel)
   */
  private async calculateContentScore(page: any, inputAnalysis: any): Promise<number> {
    // Cette fonction pourrait récupérer le contenu de la page et le comparer
    // Mais c'est coûteux en API calls, donc on la garde optionnelle

    // Pour l'instant, on retourne 0 pour éviter les appels API inutiles
    return 0;
  }

  /**
   * Vérifier si une page est en favoris
   */
  private isPageFavorite(page: any): boolean {
    // Pour l'instant, utiliser une logique simple basée sur les propriétés
    // TODO: Intégrer avec le service de config pour les vrais favoris
    return page.favorite === true || page.properties?.Favorite?.checkbox === true;
  }

  /**
   * Nettoyer le cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
/**
 * Utilitaires pour l'aplatissement des blocs Notion
 * 
 * L'API Notion n'accepte pas la propriété 'children' dans appendBlocks.
 * Ces fonctions aplatissent récursivement les blocs imbriqués.
 */

/**
 * 🔧 FONCTION CRITIQUE: Aplatir récursivement les blocs imbriqués
 * 
 * L'API Notion NE PERMET PAS la propriété 'children' dans appendBlocks.
 * Les blocs doivent être envoyés de manière PLATE (flat), pas imbriquée.
 * 
 * Cette fonction extrait récursivement tous les children et les met au même niveau,
 * en préservant l'ordre d'apparition logique.
 * 
 * @example
 * ```typescript
 * const nested = [
 *   {
 *     type: 'bulleted_list_item',
 *     bulleted_list_item: { rich_text: [{ text: { content: 'Parent' } }] },
 *     children: [
 *       {
 *         type: 'bulleted_list_item',
 *         bulleted_list_item: { rich_text: [{ text: { content: 'Child' } }] }
 *       }
 *     ]
 *   }
 * ];
 * 
 * const flattened = flattenBlocks(nested);
 * // Résultat: [
 * //   { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [...] } },
 * //   { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [...] } }
 * // ]
 * ```
 * 
 * @param blocks - Blocs potentiellement imbriqués
 * @returns Blocs aplatis sans propriété 'children'
 */
export function flattenBlocks(blocks: any[]): any[] {
  if (!Array.isArray(blocks)) {
    console.warn('[flattenBlocks] Input is not an array:', typeof blocks);
    return [];
  }

  const flattened: any[] = [];
  
  for (const block of blocks) {
    if (!block || typeof block !== 'object') {
      console.warn('[flattenBlocks] Skipping invalid block:', block);
      continue;
    }

    // ✅ Créer une copie du bloc SANS children et has_children
    // En utilisant destructuring, on crée un nouvel objet sans ces propriétés
    const { children, has_children, ...flatBlock } = block;
    
    // ✅ Ajouter le bloc parent (sans children)
    flattened.push(flatBlock);
    
    // ✅ Si le bloc avait des children, les aplatir récursivement
    if (children && Array.isArray(children) && children.length > 0) {
      const flattenedChildren = flattenBlocks(children);
      flattened.push(...flattenedChildren);
    }
  }
  
  return flattened;
}

/**
 * Statistiques sur l'aplatissement des blocs
 */
export interface FlattenStats {
  originalCount: number;
  flattenedCount: number;
  nestedBlocksFound: number;
  maxDepth: number;
}

/**
 * Aplatir les blocs avec statistiques détaillées
 * 
 * @param blocks - Blocs à aplatir
 * @returns Blocs aplatis et statistiques
 */
export function flattenBlocksWithStats(blocks: any[]): { blocks: any[]; stats: FlattenStats } {
  const stats: FlattenStats = {
    originalCount: blocks.length,
    flattenedCount: 0,
    nestedBlocksFound: 0,
    maxDepth: 0
  };
  
  function flattenRecursive(blocks: any[], depth = 0): any[] {
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    
    const flattened: any[] = [];
    
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue;
      
      const { children, has_children, ...flatBlock } = block;
      flattened.push(flatBlock);
      
      if (children && Array.isArray(children) && children.length > 0) {
        stats.nestedBlocksFound++;
        const flattenedChildren = flattenRecursive(children, depth + 1);
        flattened.push(...flattenedChildren);
      }
    }
    
    return flattened;
  }
  
  const flattenedBlocks = flattenRecursive(blocks);
  stats.flattenedCount = flattenedBlocks.length;
  
  return { blocks: flattenedBlocks, stats };
}
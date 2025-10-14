import type { NotionBlock } from '../types';

/**
 * Helper pour gérer la hiérarchie des listes selon l'API Notion 2025
 */
export class ListHierarchyHelper {
  
  /**
   * Génère les métadonnées de hiérarchie pour l'API Notion 2025
   * Utilise les niveaux d'indentation pour construire la hiérarchie correcte
   */
  static generateHierarchyMetadata(blocks: NotionBlock[]): ListHierarchyMetadata {
    const metadata: ListHierarchyMetadata = {
      parentChildMap: new Map(),
      rootBlocks: [],
      childBlocks: []
    };

    const listBlocks: Array<{ index: number; indentLevel: number; block: NotionBlock }> = [];
    
    // Collecter tous les blocs de liste avec leur niveau d'indentation
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      if (!this.isListBlock(block)) {
        continue;
      }

      const indentLevel = (block as any)._indentLevel || 0;
      listBlocks.push({ index: i, indentLevel, block });
    }

    // Construire la hiérarchie basée sur l'indentation
    const stack: Array<{ index: number; indentLevel: number }> = [];
    
    for (const item of listBlocks) {
      // Retirer du stack tous les éléments avec un niveau >= au niveau actuel
      while (stack.length > 0 && stack[stack.length - 1].indentLevel >= item.indentLevel) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Élément racine
        metadata.rootBlocks.push(item.index);
      } else {
        // Élément enfant - l'ajouter au parent le plus proche
        const parentIndex = stack[stack.length - 1].index;
        
        if (!metadata.parentChildMap.has(parentIndex)) {
          metadata.parentChildMap.set(parentIndex, []);
        }
        
        const children = metadata.parentChildMap.get(parentIndex)!;
        children.push(item.index);
        metadata.childBlocks.push(item.index);
      }

      // Ajouter l'élément actuel au stack s'il a des enfants
      if ((item.block as any).has_children) {
        stack.push({ index: item.index, indentLevel: item.indentLevel });
      }
    }

    return metadata;
  }

  /**
   * Génère les instructions pour l'API Notion 2025
   */
  static generateNotionApiInstructions(blocks: NotionBlock[]): NotionApiInstructions {
    const metadata = this.generateHierarchyMetadata(blocks);
    const instructions: NotionApiInstructions = {
      rootBlocks: [],
      childOperations: []
    };

    // Blocs racines à créer en premier (nettoyés)
    for (const rootIndex of metadata.rootBlocks) {
      instructions.rootBlocks.push(this.cleanBlock(blocks[rootIndex]));
    }

    // Opérations pour ajouter les enfants (nettoyées)
    for (const [parentIndex, childIndices] of metadata.parentChildMap.entries()) {
      if (childIndices.length > 0) {
        const childBlocks = childIndices.map(index => this.cleanBlock(blocks[index]));
        instructions.childOperations.push({
          parentBlockIndex: parentIndex,
          childBlocks: childBlocks
        });
      }
    }

    return instructions;
  }

  /**
   * Nettoie un bloc en retirant les propriétés internes
   */
  private static cleanBlock(block: NotionBlock): NotionBlock {
    const cleaned = { ...block };
    
    // Retirer toutes les propriétés qui commencent par _
    Object.keys(cleaned).forEach(key => {
      if (key.startsWith('_')) {
        delete (cleaned as any)[key];
      }
    });
    
    return cleaned;
  }

  /**
   * Vérifie si un bloc est un bloc de liste
   */
  private static isListBlock(block: NotionBlock): boolean {
    return block.type === 'bulleted_list_item' || 
           block.type === 'numbered_list_item' || 
           block.type === 'to_do';
  }
}

/**
 * Métadonnées de hiérarchie des listes
 */
export interface ListHierarchyMetadata {
  parentChildMap: Map<number, number[]>; // Index parent -> indices enfants
  rootBlocks: number[]; // Indices des blocs racines
  childBlocks: number[]; // Indices des blocs enfants
}

/**
 * Instructions pour l'API Notion 2025
 */
export interface NotionApiInstructions {
  rootBlocks: NotionBlock[]; // Blocs à créer en premier
  childOperations: Array<{
    parentBlockIndex: number;
    childBlocks: NotionBlock[];
  }>; // Opérations pour ajouter les enfants
}
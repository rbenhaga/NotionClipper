/**
 * Exemple d'intégration BlockNote ↔ Notion
 * 
 * Ce fichier montre comment utiliser les convertisseurs pour:
 * 1. Importer du contenu Notion dans BlockNote
 * 2. Exporter du contenu BlockNote vers Notion
 * 3. Synchroniser avec diff/patch
 * 
 * @example
 */

import { 
  notionToBlockNote, 
  blockNoteToNotion,
  type BlockNoteBlock,
  type NotionBlockMapping,
} from '../index';
import type { NotionBlock } from '../types/notion';

// ============================================================================
// EXEMPLE 1: Import Notion → BlockNote
// ============================================================================

/**
 * Importe une page Notion dans l'éditeur BlockNote
 */
async function importFromNotion(
  notionApi: any,
  pageId: string,
  editor: any
): Promise<NotionBlockMapping[]> {
  // 1. Récupérer les blocs Notion
  const notionBlocks = await notionApi.blocks.children.list({
    block_id: pageId,
  });

  // 2. Convertir en blocs BlockNote (DIRECT, sans Markdown)
  const { blocks, mapping } = notionToBlockNote(notionBlocks.results);

  // 3. Remplacer le contenu de l'éditeur
  editor.replaceBlocks(editor.document, blocks);

  // 4. Retourner le mapping pour la sync future
  return mapping;
}

// ============================================================================
// EXEMPLE 2: Export BlockNote → Notion
// ============================================================================

/**
 * Exporte le contenu de l'éditeur vers Notion
 */
async function exportToNotion(
  notionApi: any,
  pageId: string,
  editor: any
): Promise<void> {
  // 1. Convertir BlockNote → Notion (DIRECT, sans Markdown)
  const notionBlocks = blockNoteToNotion(editor.document);

  // 2. Envoyer à Notion
  for (const block of notionBlocks) {
    await notionApi.blocks.children.append({
      block_id: pageId,
      children: [block],
    });
  }
}


// ============================================================================
// EXEMPLE 3: Sync avec Diff/Patch (Recommandé)
// ============================================================================

interface SyncState {
  mapping: NotionBlockMapping[];
  lastSyncedAt: Date;
}

/**
 * Synchronise avec diff/patch (pas replace all)
 * C'est la méthode recommandée pour éviter de perdre des données
 */
async function syncWithDiff(
  notionApi: any,
  pageId: string,
  editor: any,
  previousState: SyncState
): Promise<SyncState> {
  // 1. Convertir l'état actuel de l'éditeur
  const currentBlocks = blockNoteToNotion(editor.document);

  // 2. Calculer le diff
  const diff = calculateDiff(previousState.mapping, currentBlocks, editor.document);

  // 3. Appliquer les patches
  await applyPatches(notionApi, pageId, diff);

  // 4. Mettre à jour le mapping
  const newMapping = updateMapping(previousState.mapping, diff, currentBlocks);

  return {
    mapping: newMapping,
    lastSyncedAt: new Date(),
  };
}

interface BlockDiff {
  toCreate: { block: NotionBlock; afterBlockId?: string }[];
  toUpdate: { notionBlockId: string; block: NotionBlock }[];
  toDelete: string[];
  toReorder: { notionBlockId: string; afterBlockId?: string }[];
}

/**
 * Calcule le diff entre l'état précédent et l'état actuel
 */
function calculateDiff(
  previousMapping: NotionBlockMapping[],
  currentNotionBlocks: NotionBlock[],
  currentBlockNoteBlocks: BlockNoteBlock[]
): BlockDiff {
  const diff: BlockDiff = {
    toCreate: [],
    toUpdate: [],
    toDelete: [],
    toReorder: [],
  };

  const previousIds = new Set(previousMapping.map(m => m.blocknoteBlockId));
  const currentIds = new Set(currentBlockNoteBlocks.map(b => b.id));

  // Blocs à créer (nouveaux dans BlockNote)
  for (let i = 0; i < currentBlockNoteBlocks.length; i++) {
    const block = currentBlockNoteBlocks[i];
    if (!previousIds.has(block.id)) {
      const afterBlockId = i > 0 
        ? previousMapping.find(m => m.blocknoteBlockId === currentBlockNoteBlocks[i - 1].id)?.notionBlockId
        : undefined;
      diff.toCreate.push({ block: currentNotionBlocks[i], afterBlockId });
    }
  }

  // Blocs à supprimer (supprimés de BlockNote)
  for (const mapping of previousMapping) {
    if (!currentIds.has(mapping.blocknoteBlockId)) {
      diff.toDelete.push(mapping.notionBlockId);
    }
  }

  // Blocs à mettre à jour (modifiés)
  for (let i = 0; i < currentBlockNoteBlocks.length; i++) {
    const block = currentBlockNoteBlocks[i];
    const mapping = previousMapping.find(m => m.blocknoteBlockId === block.id);
    
    if (mapping) {
      const currentHash = computeBlockHash(currentNotionBlocks[i]);
      if (currentHash !== mapping.hash) {
        diff.toUpdate.push({
          notionBlockId: mapping.notionBlockId,
          block: currentNotionBlocks[i],
        });
      }
    }
  }

  return diff;
}

/**
 * Applique les patches à Notion
 */
async function applyPatches(
  notionApi: any,
  pageId: string,
  diff: BlockDiff
): Promise<void> {
  // 1. Supprimer les blocs
  for (const blockId of diff.toDelete) {
    await notionApi.blocks.delete({ block_id: blockId });
  }

  // 2. Mettre à jour les blocs existants
  for (const { notionBlockId, block } of diff.toUpdate) {
    await notionApi.blocks.update({
      block_id: notionBlockId,
      ...block,
    });
  }

  // 3. Créer les nouveaux blocs
  for (const { block, afterBlockId } of diff.toCreate) {
    await notionApi.blocks.children.append({
      block_id: pageId,
      children: [block],
      after: afterBlockId,
    });
  }
}

/**
 * Met à jour le mapping après sync
 */
function updateMapping(
  previousMapping: NotionBlockMapping[],
  diff: BlockDiff,
  currentBlocks: NotionBlock[]
): NotionBlockMapping[] {
  // Filtrer les blocs supprimés
  let newMapping = previousMapping.filter(
    m => !diff.toDelete.includes(m.notionBlockId)
  );

  // Mettre à jour les hash des blocs modifiés
  for (const { notionBlockId, block } of diff.toUpdate) {
    const mapping = newMapping.find(m => m.notionBlockId === notionBlockId);
    if (mapping) {
      mapping.hash = computeBlockHash(block);
    }
  }

  // Ajouter les nouveaux blocs (les IDs Notion seront mis à jour après création)
  // Note: En production, il faudrait récupérer les IDs retournés par l'API

  return newMapping;
}

/**
 * Calcule un hash pour détecter les changements
 */
function computeBlockHash(block: NotionBlock): string {
  const content = JSON.stringify(block);
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// ============================================================================
// EXEMPLE 4: Stockage du document (JSON, pas Markdown)
// ============================================================================

interface ClipperDocument {
  /** Source de vérité (non-lossy) */
  blocknoteDoc: BlockNoteBlock[];
  /** Mapping pour sync Notion */
  notionMapping: NotionBlockMapping[];
  /** Métadonnées */
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    notionPageId?: string;
    syncStatus: 'synced' | 'pending' | 'conflict';
  };
}

/**
 * Sauvegarde le document (JSON, pas Markdown)
 */
function saveDocument(editor: any, notionPageId?: string): ClipperDocument {
  return {
    blocknoteDoc: editor.document,
    notionMapping: [],
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      notionPageId,
      syncStatus: 'pending',
    },
  };
}

/**
 * Charge le document dans l'éditeur
 */
function loadDocument(editor: any, doc: ClipperDocument): void {
  editor.replaceBlocks(editor.document, doc.blocknoteDoc);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  importFromNotion,
  exportToNotion,
  syncWithDiff,
  saveDocument,
  loadDocument,
  type ClipperDocument,
  type SyncState,
  type BlockDiff,
};

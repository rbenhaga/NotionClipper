// apps/notion-clipper-app/src/electron/ipc/focus-mode.ipc.ts
import { ipcMain, Notification, BrowserWindow } from 'electron';
import Store from 'electron-store';
import type { FocusModeService } from '@notion-clipper/core-electron';
import type { FloatingBubbleWindow } from '../windows/FloatingBubble';
import type {
  ElectronClipboardService,
  ElectronNotionService,
  ElectronFileService,
} from '@notion-clipper/core-electron';

const focusModeStore = new Store({
  name: 'focus-mode-state',
  defaults: {
    hasShownIntro: false,
  },
});

// Backend API URL helper (NotionClipperWeb backend)
// NOTE: BACKEND_API_URL should NOT include /api suffix (e.g., http://localhost:3001)
function getApiUrl(): string {
  const baseUrl = process.env.BACKEND_API_URL || 'http://localhost:3001';
  return `${baseUrl.replace(/\/api\/?$/, '')}/api`;
}

/**
 * 🔥 Helper: Récupérer et recalculer la section TOC pour une page
 */
async function getSectionAfterBlockId(
  pageId: string,
  notionService: ElectronNotionService
): Promise<string | undefined> {
  try {
    const sectionsStore = new Store();
    const selectedSections = sectionsStore.get('selectedSections', []) as Array<{
      pageId: string;
      blockId: string;
      headingText: string;
    }>;

    const selectedSection = selectedSections.find(s => s.pageId === pageId);

    if (!selectedSection) {
      return undefined;
    }

    console.log(`[FOCUS-MODE] 📍 Section TOC found: ${selectedSection.headingText} (${selectedSection.blockId})`);

    // Recalculer le dernier block de la section
    try {
      const blocks = await notionService.getPageBlocks(pageId);

      if (blocks && Array.isArray(blocks)) {
        const headingIndex = blocks.findIndex((b: any) => b.id === selectedSection.blockId);

        if (headingIndex !== -1) {
          const headingBlock = blocks[headingIndex];
          const headingType = headingBlock.type;

          let headingLevel = 1;
          if (headingType.startsWith('heading_')) {
            headingLevel = parseInt(headingType.split('_')[1]);
          }

          let lastBlockId = selectedSection.blockId;

          for (let i = headingIndex + 1; i < blocks.length; i++) {
            const block = blocks[i];
            const blockType = block.type;

            if (blockType.startsWith('heading_')) {
              const blockLevel = parseInt(blockType.split('_')[1]);
              if (blockLevel <= headingLevel) break;
            }

            lastBlockId = block.id;
          }

          console.log(`[FOCUS-MODE] ✅ Last block recalculated: ${lastBlockId}`);
          return lastBlockId;
        }
      }
    } catch (recalcError) {
      console.warn('[FOCUS-MODE] ⚠️ Could not recalculate last block, using heading blockId:', recalcError);
      return selectedSection.blockId;
    }

    return selectedSection.blockId;
  } catch (error) {
    console.warn('[FOCUS-MODE] ⚠️ Could not load sections from store:', error);
    return undefined;
  }
}

export function setupFocusModeIPC(
  focusModeService: FocusModeService,
  floatingBubble: FloatingBubbleWindow,
  clipboardService: ElectronClipboardService,
  notionService: ElectronNotionService,
  fileService: ElectronFileService,
  mainWindow: BrowserWindow
) {
  console.log('[FOCUS-MODE] Registering Focus Mode IPC handlers...');

  // ============================================
  // ÉTAT DU MODE FOCUS
  // ============================================

  ipcMain.handle('focus-mode:get-state', async () => {
    try {
      if (!focusModeService) {
        console.error('[FOCUS-MODE] focusModeService is null!');
        return { success: false, error: 'Focus mode service not initialized' };
      }
      const state = focusModeService.getState();
      return { success: true, state };
    } catch (error) {
      console.error('[FOCUS-MODE] Error getting state:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // ACTIVER / DÉSACTIVER
  // ============================================

  ipcMain.handle('focus-mode:enable', async (_event, page: any, options?: { skipIntro?: boolean }) => {
    try {
      console.log('[FOCUS-MODE] 🎯 Enabling focus mode for page:', page?.title);
      console.log('[FOCUS-MODE] Services available:', {
        focusModeService: !!focusModeService,
        floatingBubble: !!floatingBubble
      });
      
      // ✅ FIX: Vérifier que le service existe avant de l'utiliser
      if (!focusModeService) {
        console.error('[FOCUS-MODE] ❌ FocusModeService not available');
        return { success: false, error: 'FocusModeService not initialized' };
      }
      
      focusModeService.enable(page);

      // Vérifier si l'intro a été montrée en utilisant la même clé que React
      let hasShownIntro = false;
      try {
        const configStore = new Store({ name: 'config' });
        hasShownIntro = configStore.get('focusModeIntroDismissed', false) as boolean;
      } catch (error) {
        console.warn('[FOCUS-MODE] Could not check intro status:', error);
      }

      // 🎯 NOUVELLE LOGIQUE: Toujours afficher la bulle immédiatement
      // L'intro sera juste informative et n'empêchera plus l'utilisation
      
      console.log('[FOCUS-MODE] 🫧 Showing floating bubble...');
      floatingBubble.updateState('active'); // 🔥 FIX: Définir l'état AVANT show() pour éviter le flash idle
      floatingBubble.show();
      console.log('[FOCUS-MODE] ✅ Floating bubble shown and state updated');

      // 🔥 NOUVEAU: Masquer la fenêtre principale pour passer en arrière-plan
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('[FOCUS-MODE] 🙈 Hiding main window...');
        mainWindow.hide();
        console.log('[FOCUS-MODE] ✅ Main window hidden');
      }

      if (Notification.isSupported()) {
        new Notification({
          title: 'Mode Focus activé',
          body: `Clips envoyés vers "${page.title || 'Page'}"`,
          silent: true,
        }).show();
      }
      
      console.log('[FOCUS-MODE] ✅ Bubble shown immediately (new behavior)');
      
      // Si l'intro n'a pas été vue, l'afficher en parallèle (non-bloquant)
      if (!hasShownIntro) {
        console.log('[FOCUS-MODE] 💡 Intro will be shown as informative overlay');
      }

      console.log('[FOCUS-MODE] ✅ Enabled for page:', page.title);
      return { success: true };
    } catch (error) {
      console.error('[FOCUS-MODE] Error enabling:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('focus-mode:disable', async () => {
    try {
      console.log('[FOCUS-MODE] 🔄 Disabling focus mode...');
      
      // ✅ FIX: Vérifier que les services existent
      if (!focusModeService) {
        console.error('[FOCUS-MODE] ❌ FocusModeService not available');
        return { success: false, error: 'FocusModeService not initialized' };
      }
      
      focusModeService.disable();
      
      if (floatingBubble) {
        floatingBubble.hide();
      }

      // 🔥 NOUVEAU: Remonter la fenêtre principale
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('[FOCUS-MODE] 👁️ Showing main window...');
        mainWindow.show();
        mainWindow.focus();
        console.log('[FOCUS-MODE] ✅ Main window restored');
      }

      const state = focusModeService.getState();
      const stats = {
        clipsSent: state.clipsSentCount,
        duration: state.sessionStartTime
          ? Math.round((Date.now() - state.sessionStartTime) / 1000 / 60)
          : 0
      };

      // ✅ NOTE: Time tracking is handled automatically by the 'focus-mode:track-usage'
      // event listener (line ~1097) which tracks every minute + partial minutes.
      // We don't track here to avoid DOUBLE TRACKING.
      console.log(`[FOCUS-MODE] 📊 Session stats: ${stats.duration} minutes, ${stats.clipsSent} clips`);

      if (Notification.isSupported()) {
        new Notification({
          title: 'Mode Focus désactivé',
          body: `${stats.clipsSent} clip(s) envoyé(s)`,
          silent: true,
        }).show();
      }

      console.log('[FOCUS-MODE] ✅ Disabled. Stats:', stats);
      return { success: true, stats };
    } catch (error) {
      console.error('[FOCUS-MODE] Error disabling:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('focus-mode:toggle', async (_event, page: any) => {
    try {
      // ✅ FIX: Vérifier que le service existe
      if (!focusModeService) {
        console.error('[FOCUS-MODE] ❌ FocusModeService not available');
        return { success: false, error: 'FocusModeService not initialized' };
      }
      
      const state = focusModeService.getState();

      if (state.enabled) {
        focusModeService.disable();
        floatingBubble.hide();

        const stats = {
          clipsSent: state.clipsSentCount,
          duration: state.sessionStartTime 
            ? Math.round((Date.now() - state.sessionStartTime) / 1000 / 60) 
            : 0
        };

        return { success: true, stats };
      } else {
        focusModeService.enable(page);

        const hasShownIntro = focusModeStore.get('hasShownIntro', false) as boolean;

        if (hasShownIntro) {
          floatingBubble.show();
          floatingBubble.updateState('active');

          if (Notification.isSupported()) {
            new Notification({
              title: 'Mode Focus activé',
              body: `Clips envoyés vers "${page.title || 'Page'}"`,
              silent: true,
            }).show();
          }
        }

        return { success: true };
      }
    } catch (error) {
      console.error('[FOCUS-MODE] Error toggling:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // QUICK SEND
  // ============================================

  ipcMain.handle('focus-mode:quick-send', async () => {
    try {
      console.log('[FOCUS-MODE] 🚀 Quick send triggered');

      // 🎨 AMÉLIORATION CRITIQUE: Show "preparing" state IMMEDIATELY
      floatingBubble.updateState('preparing');
      console.log('[FOCUS-MODE] ⚡ Preparing state shown (instant feedback)');

      const content = await clipboardService.getContent();
      if (!content || (!content.data)) {
        console.warn('[FOCUS-MODE] No content in clipboard');
        floatingBubble.updateState('error');
        await floatingBubble.showError();
        return { success: false, error: 'No content in clipboard' };
      }

      const state = focusModeService.getState();
      if (!state.enabled || !state.activePageId) {
        console.error('[FOCUS-MODE] Not enabled or no target page');
        floatingBubble.updateState('error');
        await floatingBubble.showError();
        return { success: false, error: 'Focus mode not active' };
      }

      // 🔥 NOUVEAU: Si des fichiers sont copiés, les uploader directement
      if (content.type === 'file' && Array.isArray(content.data)) {
        console.log('[FOCUS-MODE] 📎 Files detected in clipboard, uploading...');
        floatingBubble.updateState('preparing');

        const afterBlockId = await getSectionAfterBlockId(state.activePageId, notionService);

        setTimeout(() => {
          floatingBubble.updateState('sending');
        }, 250);

        const fs = require('fs');
        const path = require('path');
        const uploadResults = await Promise.all(
          (content.data as string[]).map(async (filePath) => {
            try {
              const buffer = fs.readFileSync(filePath);
              const fileName = path.basename(filePath);

              // Déterminer le type de fichier
              const fileExtension = fileName.split('.').pop()?.toLowerCase();
              let fileType: 'file' | 'image' | 'video' | 'audio' | 'pdf' = 'file';

              if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension || '')) {
                fileType = 'image';
              } else if (['mp4', 'mov', 'webm'].includes(fileExtension || '')) {
                fileType = 'video';
              } else if (['mp3', 'wav', 'ogg'].includes(fileExtension || '')) {
                fileType = 'audio';
              } else if (fileExtension === 'pdf') {
                fileType = 'pdf';
              }

              const config = {
                type: fileType,
                mode: 'upload' as const,
              };

              const result = await fileService.uploadFile(
                { fileName, buffer },
                config
              );

              return result;
            } catch (error: any) {
              console.error('[FOCUS-MODE] Error uploading file:', error);
              return { success: false, error: error.message };
            }
          })
        );

        const allSuccess = uploadResults.every((r) => r.success);

        if (allSuccess) {
          console.log('[FOCUS-MODE] ✅ Files uploaded successfully');
          // 🔥 FIX: Pass file data to recordClip
          focusModeService.recordClip({
            content: { type: 'file', files: content.data },
            sectionId: afterBlockId,
            status: 'success'
          });
          // 🔒 SECURITY: Track file uploads for quota
          focusModeService.trackFileUpload((content.data as string[]).length);
          floatingBubble.updateState('success');
          await floatingBubble.showSuccess();
          return { success: true };
        } else {
          console.error('[FOCUS-MODE] ❌ Some files failed to upload');
          floatingBubble.updateState('error');
          await floatingBubble.showError();
          return { success: false, error: 'Some files failed to upload' };
        }
      }

      // 🎨 Show preparing state immediately for instant feedback
      floatingBubble.updateState('preparing');
      console.log('[FOCUS-MODE] 🔄 Preparing...');

      // 🔥 Charger et recalculer la section TOC
      const afterBlockId = await getSectionAfterBlockId(state.activePageId, notionService);

      if (!afterBlockId) {
        console.log('[FOCUS-MODE] 📍 No section selected, sending to end of page');
      }

      // 🎨 Transition to "sending" after 250ms (visible but snappy)
      setTimeout(() => {
        floatingBubble.updateState('sending');
        console.log('[FOCUS-MODE] 📤 Sending...');
      }, 250);

      // Envoyer vers Notion avec afterBlockId si disponible
      const result = await notionService.sendContent(state.activePageId, content.data, {
        type: content.type,
        ...(afterBlockId && { afterBlockId })
      });

      if (result.success) {
        console.log('[FOCUS-MODE] ✅ Quick send successful');
        // 🔥 FIX: Pass clip data to recordClip() so it emits complete event for history
        focusModeService.recordClip({
          content: content.data,
          sectionId: afterBlockId,
          status: 'success'
        });
        floatingBubble.updateState('success');
        await floatingBubble.showSuccess();

        if (Notification.isSupported()) {
          new Notification({
            title: 'Clip envoyé',
            body: `Ajouté à "${state.activePageTitle || 'Page'}"`,
            silent: true,
          }).show();
        }

        return { success: true, result };
      } else {
        console.error('[FOCUS-MODE] ❌ Quick send failed:', result.error);
        floatingBubble.updateState('error');
        await floatingBubble.showError();
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[FOCUS-MODE] Error in quick send:', error);
      floatingBubble.updateState('error');
      await floatingBubble.showError();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // UPLOAD FILES
  // ============================================

  ipcMain.handle('focus-mode:upload-files', async (_event, files: string[]) => {
    try {
      console.log('[FOCUS-MODE] 📎 Uploading files:', files);

      // 🎨 Show preparing state immediately for instant feedback
      floatingBubble.updateState('preparing');
      console.log('[FOCUS-MODE] 🔄 Preparing upload...');

      const state = focusModeService.getState();
      if (!state.enabled || !state.activePageId) {
        floatingBubble.updateState('error');
        await floatingBubble.showError();
        return { success: false, error: 'Focus mode not active' };
      }

      // 🔥 NOUVEAU: Récupérer la section TOC pour l'afterBlockId
      const afterBlockId = await getSectionAfterBlockId(state.activePageId, notionService);

      if (afterBlockId) {
        console.log(`[FOCUS-MODE] 📍 Files will be inserted after block: ${afterBlockId}`);
      } else {
        console.log('[FOCUS-MODE] 📍 Files will be appended to end of page');
      }

      // 🎨 Transition to "sending" after 250ms (consistent with quick-send)
      setTimeout(() => {
        floatingBubble.updateState('sending');
        console.log('[FOCUS-MODE] 📤 Uploading...');
      }, 250);

      // 🔥 MODIFIÉ: Upload via file:upload IPC avec afterBlockId
      const fs = require('fs');
      const uploadResults = await Promise.all(
        files.map(async (filePath) => {
          try {
            const buffer = fs.readFileSync(filePath);
            const fileName = require('path').basename(filePath);

            // Utiliser file:upload IPC qui supporte afterBlockId
            const { ipcMain: ipc } = require('electron');
            const result = await ipc.invoke('file:upload', {
              fileName,
              fileBuffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
              pageId: state.activePageId,
              integrationType: 'upload',
              ...(afterBlockId && { afterBlockId })
            });

            return result;
          } catch (error: any) {
            console.error('[FOCUS-MODE] Error uploading file:', error);
            return { success: false, error: error.message };
          }
        })
      );

      const allSuccess = uploadResults.every((r) => r.success);

      if (allSuccess) {
        console.log('[FOCUS-MODE] ✅ Files uploaded successfully');
        // 🔥 FIX: Record clip with file data
        focusModeService.recordClip({
          content: { type: 'file', files: files },
          sectionId: afterBlockId,
          status: 'success'
        });
        // 🔒 SECURITY: Track file uploads for quota
        focusModeService.trackFileUpload(files.length);
        floatingBubble.updateState('success');
        await floatingBubble.showSuccess();

        if (Notification.isSupported()) {
          new Notification({
            title: 'Fichiers envoyés',
            body: `${files.length} fichier(s) ajouté(s)`,
            silent: true,
          }).show();
        }

        return { success: true, results: uploadResults };
      } else {
        console.error('[FOCUS-MODE] ❌ Some files failed to upload');
        floatingBubble.updateState('error');
        await floatingBubble.showError();
        return { success: false, results: uploadResults };
      }
    } catch (error) {
      console.error('[FOCUS-MODE] Error uploading files:', error);
      floatingBubble.updateState('error');
      await floatingBubble.showError();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // CONFIG
  // ============================================

  ipcMain.handle('focus-mode:update-config', async (_event, config: any) => {
    try {
      focusModeService.updateConfig(config);
      console.log('[FOCUS-MODE] ✅ Config updated');
      return { success: true };
    } catch (error) {
      console.error('[FOCUS-MODE] Error updating config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('focus-mode:update-bubble-position', async (_event, position: { x: number; y: number }) => {
    try {
      focusModeService.updateBubblePosition(position.x, position.y);
      return { success: true };
    } catch (error) {
      console.error('[FOCUS-MODE] Error updating bubble position:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // INTRO STATE
  // ============================================

  ipcMain.handle('focus-mode:get-intro-state', async () => {
    try {
      // Vérifier dans le même store que React utilise
      let hasShownIntro = false;
      try {
        const configStore = new Store({ name: 'config' });
        hasShownIntro = configStore.get('focusModeIntroDismissed', false) as boolean;
      } catch (error) {
        // Fallback vers l'ancien store
        hasShownIntro = focusModeStore.get('hasShownIntro', false) as boolean;
      }
      
      return { success: true, hasShownIntro };
    } catch (error) {
      console.error('[FOCUS-MODE] Error getting intro state:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('focus-mode:save-intro-state', async (_event, hasShown: boolean) => {
    try {
      // Sauvegarder dans le même store que React utilise
      const configStore = new Store({ name: 'config' });
      configStore.set('focusModeIntroDismissed', hasShown);
      
      // Aussi sauvegarder dans le store focus-mode pour compatibilité
      focusModeStore.set('hasShownIntro', hasShown);
      
      console.log('[FOCUS-MODE] ✅ Intro state saved:', hasShown);
      return { success: true };
    } catch (error) {
      console.error('[FOCUS-MODE] Error saving intro state:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('focus-mode:reset-intro', async () => {
    try {
      // Réinitialiser dans les deux stores
      const configStore = new Store({ name: 'config' });
      configStore.set('focusModeIntroDismissed', false);
      focusModeStore.set('hasShownIntro', false);
      
      console.log('[FOCUS-MODE] ✅ Intro state reset');
      return { success: true };
    } catch (error) {
      console.error('[FOCUS-MODE] Error resetting intro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('focus-mode:show-bubble-after-intro', async () => {
    try {
      // Vérifier si le Mode Focus est activé
      const state = focusModeService.getState();
      
      if (state.enabled) {
        floatingBubble.show();
        floatingBubble.updateState('active');
        
        if (Notification.isSupported()) {
          new Notification({
            title: 'Mode Focus activé',
            body: `Clips envoyés vers "${state.activePageTitle || 'Page'}"`,
            silent: true,
          }).show();
        }
        
        console.log('[FOCUS-MODE] ✅ Bubble shown after intro (Focus Mode was active)');
      } else {
        console.log('[FOCUS-MODE] Focus Mode not active, bubble not shown');
      }
      
      return { success: true };
    } catch (error) {
      console.error('[FOCUS-MODE] Error showing bubble after intro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // BUBBLE CONTROLS - NOUVEAUX HANDLERS
  // ============================================

  ipcMain.handle('bubble:expand-menu', async () => {
    try {
      console.log('[BUBBLE] IPC: Expanding to menu...');
      await floatingBubble.expandToMenu();
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error expanding menu:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('bubble:collapse', async () => {
    try {
      console.log('[BUBBLE] IPC: Collapsing to compact...');
      await floatingBubble.collapseToCompact();
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error collapsing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // TEST HANDLERS - Pour tester les animations depuis la console
  // ============================================

  ipcMain.handle('bubble:state-change', async (_, state: string) => {
    try {
      console.log('[BUBBLE] IPC: Changing state to:', state);
      floatingBubble.updateState(state as any);
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error changing state:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('bubble:size-changed', async (_, size: string) => {
    try {
      console.log('[BUBBLE] IPC: Changing size to:', size);
      
      switch (size) {
        case 'compact':
          await floatingBubble.collapseToCompact();
          break;
        case 'menu':
          await floatingBubble.expandToMenu();
          break;
        case 'progress':
          await floatingBubble.expandToProgress();
          break;
        case 'success':
          await floatingBubble.showSuccess();
          break;
        case 'error':
          await floatingBubble.showError();
          break;
      }
      
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error changing size:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('bubble:update-state', async (_, state: string) => {
    try {
      console.log('[BUBBLE] IPC: Updating state to:', state);
      floatingBubble.updateState(state as any);
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Error updating state:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // DRAG HANDLERS - 🔥 SYNCHRONES pour performance maximale
  // ============================================

  // 🔥 CRITIQUE: Utiliser ipcMain.on au lieu de handle pour éviter la latence async
  ipcMain.on('bubble:drag-start', (_event, position: { x: number; y: number }) => {
    try {
      floatingBubble.onDragStart(position);
    } catch (error) {
      console.error('[BUBBLE] Error on drag start:', error);
    }
  });

  ipcMain.on('bubble:drag-move', (_event, position: { x: number; y: number }) => {
    try {
      if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        console.error('[BUBBLE] Invalid drag position:', position);
        return;
      }

      floatingBubble.onDragMove(position);
    } catch (error) {
      console.error('[BUBBLE] Error on drag move:', error);
    }
  });

  ipcMain.on('bubble:drag-end', () => {
    try {
      floatingBubble.onDragEnd();
    } catch (error) {
      console.error('[BUBBLE] Error on drag end:', error);
    }
  });



  // ============================================
  // WINDOW ACTIONS
  // ============================================

  ipcMain.handle('window:show-main', async () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        console.log('[WINDOW] Main window shown');
        return { success: true };
      }
      return { success: false, error: 'Main window not available' };
    } catch (error) {
      console.error('[WINDOW] Error showing main window:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // HANDLER POUR ACTIVER AVEC BULLE IMMÉDIATE
  // ============================================
  
  ipcMain.handle('focus-mode:enable-with-bubble', async (_event, page: any) => {
    try {
      console.log('[FOCUS-MODE] 🎯 Enabling Focus Mode with immediate bubble...');
      
      // Activer le Mode Focus
      focusModeService.enable(page);
      
      // Afficher la bulle immédiatement
      floatingBubble.show();
      floatingBubble.updateState('active');
      
      if (Notification.isSupported()) {
        new Notification({
          title: 'Mode Focus activé',
          body: `Clips envoyés vers "${page.title || 'Page'}"`,
          silent: true,
        }).show();
      }
      
      console.log('[FOCUS-MODE] ✅ Focus Mode enabled with immediate bubble');
      return { success: true };
    } catch (error) {
      console.error('[FOCUS-MODE] Error enabling with bubble:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
  
  ipcMain.handle('focus-mode:force-show-bubble', async () => {
    try {
      console.log('[FOCUS-MODE] 🧪 Force showing bubble for testing...');
      
      // Marquer l'intro comme vue
      const configStore = new Store({ name: 'config' });
      configStore.set('focusModeIntroDismissed', true);
      focusModeStore.set('hasShownIntro', true);
      
      // Afficher la bulle si le Mode Focus est activé
      const state = focusModeService.getState();
      if (state.enabled) {
        floatingBubble.show();
        floatingBubble.updateState('active');
        console.log('[FOCUS-MODE] ✅ Bubble force-shown for testing');
      } else {
        console.log('[FOCUS-MODE] Focus Mode not active, cannot show bubble');
      }
      
      return { success: true };
    } catch (error) {
      console.error('[FOCUS-MODE] Error force-showing bubble:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // NOUVEAUX HANDLERS POUR UX v3.0
  // ============================================
  
  ipcMain.handle('focus-mode:change-page', async (_event, pageId: string) => {
    try {
      console.log('[FOCUS-MODE] 🎯 Changing target page to:', pageId);
      
      // Récupérer les informations de la page
      const pages = await notionService.getPages(false);
      const targetPage = pages?.find(p => p.id === pageId);
      
      if (!targetPage) {
        console.error('[FOCUS-MODE] Page not found:', pageId);
        return { success: false, error: 'Page not found' };
      }
      
      // Changer la page cible dans le service Focus Mode
      focusModeService.enable(targetPage);
      
      console.log('[FOCUS-MODE] ✅ Target page changed to:', targetPage.title);
      return { success: true, page: targetPage };
    } catch (error) {
      console.error('[FOCUS-MODE] Error changing page:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
  
  ipcMain.handle('focus-mode:open-page-selector', async () => {
    try {
      console.log('[FOCUS-MODE] 🎯 Open page selector requested - showing main window');
      
      // Afficher la fenêtre principale
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        
        // Émettre un événement pour que React focus sur le sélecteur de page
        mainWindow.webContents.send('focus-mode:focus-page-selector');
        
        console.log('[FOCUS-MODE] ✅ Main window shown for page selection');
        return { success: true };
      }
      
      return { success: false, error: 'Main window not available' };
    } catch (error) {
      console.error('[FOCUS-MODE] Error opening page selector:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
  
  ipcMain.handle('focus-mode:show-history', async () => {
    try {
      console.log('[FOCUS-MODE] 📜 Show history requested - showing main window');
      
      // Afficher la fenêtre principale
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        
        // Émettre un événement pour que React affiche l'historique
        mainWindow.webContents.send('focus-mode:show-history-tab');
        
        console.log('[FOCUS-MODE] ✅ Main window shown for history view');
        return { success: true };
      }
      
      return { success: false, error: 'Main window not available' };
    } catch (error) {
      console.error('[FOCUS-MODE] Error showing history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // NOTION PAGES - HANDLER POUR PAGES RÉCENTES
  // ============================================
  
  ipcMain.handle('notion:get-recent-pages', async () => {
    try {
      console.log('[NOTION] 🔍 Getting recent pages for bubble menu...');
      console.log('[NOTION] 🔍 NotionService status:', {
        exists: !!notionService,
        hasGetPages: typeof notionService?.getPages === 'function'
      });

      // Utiliser le service Notion pour récupérer les pages récentes
      const pages = await notionService.getPages(false);

      console.log('[NOTION] 🔍 getPages() result:', {
        isArray: Array.isArray(pages),
        length: Array.isArray(pages) ? pages.length : 'N/A',
        type: typeof pages,
        isNull: pages === null,
        isUndefined: pages === undefined
      });

      if (pages && Array.isArray(pages)) {
        // 🔥 CORRECTION ULTRA RIGOUREUSE: Augmenter à 10 pages récentes au lieu de 5
        const recentPages = pages
          .sort((a, b) => new Date(b.last_edited_time || 0).getTime() - new Date(a.last_edited_time || 0).getTime())
          .slice(0, 10) // 🔥 CHANGÉ DE 5 À 10
          .map(page => ({
            id: page.id,
            title: page.title || 'Sans titre',
            lastEditedTime: page.last_edited_time,
            icon: page.icon || null
          }));

        console.log('[NOTION] ✅ Recent pages retrieved:', recentPages.length, 'from total:', pages.length);
        console.log('[NOTION] 📋 Recent pages titles:', recentPages.map(p => p.title));
        return recentPages;
      } else {
        console.warn('[NOTION] ⚠️ No pages returned from service:', {
          pagesValue: pages,
          type: typeof pages
        });
        return [];
      }
    } catch (error) {
      console.error('[NOTION] ❌ Error getting recent pages:', error);
      return [];
    }
  });
  


  // 🚨 FONCTION D'URGENCE - RÉCUPÉRER LA BULLE
  ipcMain.handle('bubble:emergency-reset', async () => {
    try {
      console.log('[BUBBLE] 🚨 EMERGENCY RESET POSITION');
      floatingBubble.resetToDefaultPosition();
      return { success: true };
    } catch (error) {
      console.error('[BUBBLE] Emergency reset failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 🔥 NOUVEAU: Handler pour mettre à jour les pages cibles (mode multi-sélection)
  ipcMain.handle('focus-mode:set-target-pages', async (_event, pages: any[]) => {
    try {
      console.log('[FOCUS-MODE] 🎯 Setting target pages:', pages.map(p => p.title).join(', '));
      
      if (!focusModeService) {
        return { success: false, error: 'Focus mode service not available' };
      }

      (focusModeService as any).setTargetPages(pages);
      
      return { success: true, count: pages.length };
    } catch (error) {
      console.error('[FOCUS-MODE] Error setting target pages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // EVENT LISTENERS - Real-time tracking
  // ============================================

  // 🔒 SECURITY: Listen to focus-mode:track-usage event (emitted every minute)
  // 🔧 MIGRATED: Use NotionClipperWeb backend instead of Supabase Edge Function
  // 🔒 SECURITY FIX P0 #1: Send auth token, backend extracts userId from JWT
  focusModeService.on('focus-mode:track-usage', async (data: any) => {
    try {
      const { minutes, totalMinutes, pageId, pageTitle } = data;
      console.log(`[FOCUS-MODE] 🕐 Tracking ${minutes} minute(s) (total: ${totalMinutes})`);

      const { newConfigService } = require('../main');
      const authToken = await newConfigService?.get('authToken');
      const userId = await newConfigService?.get('userId');
      const apiUrl = getApiUrl();

      if (authToken) {
        const response = await fetch(`${apiUrl}/usage/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            // userId sent for backward compatibility, but backend should use JWT
            userId: userId,
            feature: 'focus_mode_minutes',
            increment: minutes
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[FOCUS-MODE] ❌ Failed to track usage:`, errorText);
        } else {
          console.log(`[FOCUS-MODE] ✅ Tracked ${minutes} minute(s) via backend`);

          // 🔒 SECURITY: Check if quota exceeded after tracking
          const result = await response.json();
          if (result.data?.quotaExceeded) {
            console.warn(`[FOCUS-MODE] ⚠️ Quota exceeded for focus_mode_minutes`);

            // Disable focus mode automatically
            focusModeService.disable();

            // Notify main window
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('quota:exceeded', 'focus_mode_minutes');
            }
          }
        }
      } else {
        console.warn('[FOCUS-MODE] Skipping tracking: missing authToken');
      }
    } catch (error) {
      console.error('[FOCUS-MODE] Error tracking usage:', error);
    }
  });

  // ============================================
  // NOTE: notion:get-page-blocks handler is already defined in notion.ipc.ts
  // ============================================

  console.log('[FOCUS-MODE] ✅ All IPC handlers registered');
}
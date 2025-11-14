// packages/ui/src/utils/sendWithOfflineSupport.ts
// 🎯 Utilitaire pour gérer l'envoi avec support offline et sections

interface SendOptions {
  content: any;
  pageId: string;
  sectionId?: string;
  sectionTitle?: string;
  attachedFiles?: any[];
  isOnline: boolean;
  addToQueue: (content: any, pageId: string, sectionId?: string) => Promise<string | null>;
  addToHistory: (content: any, pageId: string, status: 'success' | 'error', error?: string, sectionId?: string) => Promise<string | null>;
  reportNetworkError?: () => void; // Fonction pour signaler une erreur réseau
  subscriptionTier?: string; // 🆕 Tier for offline queue check
  onUpgradeRequired?: () => void; // 🆕 Callback when FREE user tries offline
}

// Fonction utilitaire pour détecter les erreurs réseau
function isNetworkError(error: any): boolean {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';
  
  return errorMessage.includes('network_error') || 
         errorMessage.includes('enotfound') ||
         errorMessage.includes('fetch failed') ||
         errorMessage.includes('getaddrinfo') ||
         errorMessage.includes('network_offline') ||
         errorCode === 'enotfound' ||
         errorCode === 'network_error';
}

export async function sendWithOfflineSupport({
  content,
  pageId,
  sectionId,
  sectionTitle,
  attachedFiles = [],
  isOnline,
  addToQueue,
  addToHistory,
  reportNetworkError,
  subscriptionTier,
  onUpgradeRequired
}: SendOptions): Promise<{ success: boolean; error?: string; queueId?: string }> {

  // Si hors ligne, ajouter directement à la queue ET à l'historique
  if (!isOnline) {
    console.log('[SendOffline] 📴 Offline mode detected');

    // 🔥 CRITICAL: FREE tier cannot use offline queue (prevent abuse)
    if (subscriptionTier === 'FREE') {
      console.log('[SendOffline] ❌ FREE tier blocked from offline queue');

      // Notify user to upgrade for offline support
      if (onUpgradeRequired) {
        onUpgradeRequired();
      }

      return {
        success: false,
        error: 'Mode offline réservé aux utilisateurs Premium. Connectez-vous à Internet ou passez à Premium.'
      };
    }

    console.log('[SendOffline] ✅ Premium user - adding to queue and history');

    try {
      // Ajouter à la queue pour traitement ultérieur
      const queueId = await addToQueue(content, pageId, sectionId);

      // Ajouter aussi à l'historique avec statut "offline"
      await addToHistory(content, pageId, 'success', undefined, sectionId);

      return {
        success: true,
        queueId: queueId || undefined
      };
    } catch (error: any) {
      console.error('[SendOffline] Error adding to queue/history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Si en ligne, essayer d'envoyer directement
  try {
    console.log('[SendOffline] 🌐 Online mode - sending directly');

    if (!window.electronAPI?.invoke) {
      throw new Error('API Electron non disponible');
    }

    // 🔥 NOUVEAU: Recalculer le dernier block de la section avant envoi
    let actualAfterBlockId = sectionId;

    if (sectionId) {
      try {
        console.log(`[SendOffline] 🔄 Recalculating last block for section: ${sectionTitle} (${sectionId})`);

        // Récupérer les blocks de la page
        const blocks = await window.electronAPI.invoke('notion:get-page-blocks', pageId);

        if (blocks && Array.isArray(blocks)) {
          // Trouver l'index du heading avec cet ID
          const headingIndex = blocks.findIndex((b: any) => b.id === sectionId);

          if (headingIndex !== -1) {
            const headingBlock = blocks[headingIndex];
            const headingType = headingBlock.type;

            // Extraire le level du heading (heading_1 -> 1)
            let headingLevel = 1;
            if (headingType.startsWith('heading_')) {
              headingLevel = parseInt(headingType.split('_')[1]);
            }

            // Parcourir les blocks suivants jusqu'au prochain heading de même niveau ou supérieur
            let lastBlockId = sectionId;

            for (let i = headingIndex + 1; i < blocks.length; i++) {
              const block = blocks[i];
              const blockType = block.type;

              // Si c'est un heading
              if (blockType.startsWith('heading_')) {
                const blockLevel = parseInt(blockType.split('_')[1]);

                // Si c'est un heading de même niveau ou supérieur, on s'arrête
                if (blockLevel <= headingLevel) {
                  break;
                }
              }

              // Sinon, c'est le nouveau dernier block de la section
              lastBlockId = block.id;
            }

            actualAfterBlockId = lastBlockId;
            console.log(`[SendOffline] ✅ Last block recalculated: ${lastBlockId} (was ${sectionId})`);
          } else {
            console.warn(`[SendOffline] ⚠️ Heading block not found, using original sectionId`);
          }
        }
      } catch (error) {
        console.error('[SendOffline] ❌ Error recalculating last block, using original sectionId:', error);
        // Continue avec le sectionId original en cas d'erreur
      }
    }

    // Préparer les données d'envoi
    const sendData: any = {
      pageId,
      content,
      options: {
        type: 'paragraph',
        // 🔥 Utiliser le blockId recalculé
        ...(actualAfterBlockId && { afterBlockId: actualAfterBlockId })
      }
    };

    if (actualAfterBlockId) {
      console.log(`[SendOffline] 📍 Inserting after block: ${sectionTitle} (${actualAfterBlockId})`);
    }

    // Envoyer les fichiers attachés d'abord
    if (attachedFiles.length > 0) {
      console.log(`[SendOffline] 📎 Uploading ${attachedFiles.length} attached files...`);

      for (const file of attachedFiles) {
        if (file.file) {
          try {
            const arrayBuffer = await file.file.arrayBuffer();

            // 🔥 NOUVEAU: Passer afterBlockId aux fichiers pour qu'ils aillent dans la section
            const uploadResult = await window.electronAPI.invoke('file:upload', {
              fileName: file.file.name,
              fileBuffer: arrayBuffer,
              pageId: pageId,
              integrationType: 'upload',
              ...(actualAfterBlockId && { afterBlockId: actualAfterBlockId })
            });
            
            if (!uploadResult.success) {
              console.error('[SendOffline] File upload failed:', uploadResult.error);
              // Continue avec les autres fichiers
            }
          } catch (fileError: any) {
            console.error('[SendOffline] File processing error:', fileError);
            // Continue avec les autres fichiers
          }
        }
      }
    }

    // Envoyer le contenu principal - utiliser le canal existant
    if (!window.electronAPI?.sendToNotion) {
      throw new Error('API Electron sendToNotion non disponible');
    }
    const result = await window.electronAPI.sendToNotion(sendData);
    
    if (result.success) {
      // Ajouter à l'historique avec succès
      await addToHistory(content, pageId, 'success', undefined, sectionId);
      
      return { success: true };
    } else {
      throw new Error(result.error || 'Erreur lors de l\'envoi');
    }
    
  } catch (error: any) {
    console.error('[SendOffline] Direct send failed:', error);
    
    // Détecter les erreurs réseau et passer en mode offline
    if (isNetworkError(error)) {
      console.log('[SendOffline] 📵 Network error detected, treating as offline');
      
      // Signaler l'erreur réseau au hook de statut réseau
      if (reportNetworkError) {
        reportNetworkError();
      }
      
      // Ajouter à la queue pour retry quand on sera en ligne
      try {
        const queueId = await addToQueue(content, pageId, sectionId);
        
        // Ajouter à l'historique avec statut "offline" plutôt qu'erreur
        await addToHistory(content, pageId, 'success', 'Ajouté à la file d\'attente (hors ligne)', sectionId);
        
        return { 
          success: true, // Considérer comme succès car ajouté à la queue
          queueId: queueId || undefined
        };
      } catch (queueError: any) {
        console.error('[SendOffline] Failed to add to queue:', queueError);
        return { 
          success: false, 
          error: `Connexion impossible et échec d'ajout à la file d'attente: ${queueError.message}` 
        };
      }
    }
    
    // Pour les autres erreurs (non réseau), ajouter à la queue avec erreur
    try {
      const queueId = await addToQueue(content, pageId, sectionId);
      
      // Ajouter aussi à l'historique avec l'erreur
      await addToHistory(content, pageId, 'error', error.message, sectionId);
      
      return { 
        success: false, 
        error: error.message,
        queueId: queueId || undefined
      };
    } catch (queueError: any) {
      console.error('[SendOffline] Failed to add to queue:', queueError);
      return { 
        success: false, 
        error: `Envoi échoué et impossible d'ajouter à la queue: ${error.message}` 
      };
    }
  }
}

// Fonction pour envoyer à plusieurs pages avec sections
export async function sendToMultiplePagesWithSections({
  content,
  destinations, // Array<{pageId: string, sectionId?: string, sectionTitle?: string}>
  attachedFiles = [],
  isOnline,
  addToQueue,
  addToHistory,
  reportNetworkError
}: {
  content: any;
  destinations: Array<{pageId: string; sectionId?: string; sectionTitle?: string}>;
  attachedFiles?: any[];
  isOnline: boolean;
  addToQueue: (content: any, pageId: string, sectionId?: string) => Promise<string | null>;
  addToHistory: (content: any, pageId: string, status: 'success' | 'error', error?: string, sectionId?: string) => Promise<string | null>;
  reportNetworkError?: () => void;
}): Promise<{ success: boolean; results: Array<{pageId: string; success: boolean; error?: string}> }> {
  
  console.log(`[SendMultiple] 📤 Sending to ${destinations.length} destinations`);
  
  // Traitement en parallèle pour améliorer les performances
  const sendPromises = destinations.map(async (destination) => {
    try {
      const result = await sendWithOfflineSupport({
        content,
        pageId: destination.pageId,
        sectionId: destination.sectionId,
        sectionTitle: destination.sectionTitle,
        attachedFiles,
        isOnline,
        addToQueue,
        addToHistory,
        reportNetworkError
      });

      return {
        pageId: destination.pageId,
        success: result.success,
        error: result.error
      };
    } catch (error: any) {
      console.error(`[SendMultiple] Error sending to ${destination.pageId}:`, error);
      
      return {
        pageId: destination.pageId,
        success: false,
        error: error.message
      };
    }
  });

  const results = await Promise.all(sendPromises);
  const overallSuccess = results.every(result => result.success);

  return {
    success: overallSuccess,
    results
  };
}
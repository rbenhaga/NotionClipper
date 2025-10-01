const configService = require('./config.service');
const fetch = require('node-fetch');

class ImageService {
  async uploadToNotion(imageBuffer, filename = 'image.png') {
    const token = configService.getNotionToken();
    if (!token) {
      throw new Error('Notion token not configured');
    }

    // 🔥 NOUVEAU : Validation de la taille (limite Notion = 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (imageBuffer.length > MAX_SIZE) {
      throw new Error(
        `Image trop grande: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB (max 5MB)`
      );
    }

    // Log si image volumineuse
    if (imageBuffer.length > 1024 * 1024) {
      console.log(`⚠️ Image volumineuse: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    }

    const mimeType = this.getMimeType(filename);
    
    console.log(`📤 Upload image: ${filename} (${(imageBuffer.length / 1024).toFixed(2)} KB, ${mimeType})`);
    
    // 🔥 NOUVEAU : Retry avec backoff exponentiel
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Étape 1 : Créer l'upload
        console.log(`📡 Tentative ${attempt}/3 - Création upload...`);
        const createUploadResponse = await fetch('https://api.notion.com/v1/file_uploads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Notion-Version': '2025-09-03',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: filename,
            file_size: imageBuffer.length,
            mime_type: mimeType
          })
        });

        if (!createUploadResponse.ok) {
          const error = await createUploadResponse.text();
          throw new Error(`File upload creation failed (${createUploadResponse.status}): ${error}`);
        }

        const uploadData = await createUploadResponse.json();
        const { upload_url, id: fileUploadId } = uploadData;

        console.log(`✅ Upload créé, ID: ${fileUploadId}`);

        // Étape 2 : Upload du fichier vers l'URL signée
        console.log('📤 Upload du fichier...');
        const uploadResponse = await fetch(upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': mimeType,
            'Content-Length': imageBuffer.length.toString()
          },
          body: imageBuffer
        });

        if (!uploadResponse.ok) {
          throw new Error(`File upload failed (${uploadResponse.status}): ${uploadResponse.statusText}`);
        }

        console.log('✅ Fichier uploadé');

        // Étape 3 : Finaliser l'upload
        console.log('🔄 Finalisation...');
        const completeResponse = await fetch(
          `https://api.notion.com/v1/file_uploads/${fileUploadId}/complete`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Notion-Version': '2025-09-03'
            }
          }
        );

        if (!completeResponse.ok) {
          const error = await completeResponse.text();
          throw new Error(`Failed to complete file upload (${completeResponse.status}): ${error}`);
        }

        console.log('✅ Upload finalisé avec succès');
        return fileUploadId;
        
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Tentative ${attempt}/3 échouée:`, error.message);
        
        // Retry seulement si ce n'est pas la dernière tentative
        if (attempt < 3) {
          // Backoff exponentiel : 1s, 2s
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Nouvelle tentative dans ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Si on arrive ici, toutes les tentatives ont échoué
    throw new Error(`Upload échoué après 3 tentatives: ${lastError.message}`);
  }

  getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/png';
  }

  async uploadImage(imageBuffer, filename = 'clipboard-image.png') {
    return await this.uploadToNotion(imageBuffer, filename);
  }

  async processImage(imageBuffer, filename = 'clipboard-image.png') {
    try {
      const fileUploadId = await this.uploadToNotion(imageBuffer, filename);
      return {
        success: true,
        fileUploadId,
        type: 'notion_upload'
      };
    } catch (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }
}

module.exports = new ImageService();

const configService = require('./config.service');
const fetch = require('node-fetch');
const FormData = require('form-data');

class ImageService {
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

  async uploadToNotion(imageBuffer, filename = 'image.png') {
    const token = configService.getNotionToken();
    if (!token) {
      throw new Error('Notion token not configured');
    }

    const MAX_SIZE = 20 * 1024 * 1024; // 20MB (limite Notion)
    if (imageBuffer.length > MAX_SIZE) {
      throw new Error(
        `Image trop grande: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB (max 20MB)`
      );
    }

    const mimeType = this.getMimeType(filename);
    
    console.log(`📤 Upload image: ${filename} (${(imageBuffer.length / 1024).toFixed(2)} KB, ${mimeType})`);
    
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`📡 Tentative ${attempt}/3 - Création upload...`);
        
        // ✅ Étape 1 : Créer l'upload
        const createResponse = await fetch('https://api.notion.com/v1/file_uploads', {
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

        if (!createResponse.ok) {
          const error = await createResponse.text();
          throw new Error(`Create failed (${createResponse.status}): ${error}`);
        }

        const uploadData = await createResponse.json();
        const fileUploadId = uploadData.id; // On n'utilise plus upload_url

        console.log(`✅ Upload créé, ID: ${fileUploadId}`);

        // ✅ Étape 2 : Envoyer le fichier avec FormData
        console.log('📤 Envoi du fichier...');
        
        const form = new FormData();
        form.append('file', imageBuffer, {
          filename: filename,
          contentType: mimeType
        });

        const uploadResponse = await fetch(
          `https://api.notion.com/v1/file_uploads/${fileUploadId}/send`,
          {
            method: 'POST',
            body: form,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Notion-Version': '2025-09-03',
              ...form.getHeaders() // Headers FormData automatiques
            }
          }
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('❌ Erreur upload:', errorText);
          throw new Error(`File send failed (${uploadResponse.status}): ${uploadResponse.statusText}`);
        }

        console.log('✅ Fichier envoyé');

        // ✅ Pas besoin de /complete après /send - le fichier est prêt
        console.log('✅ Upload terminé avec succès');
        return fileUploadId;
        
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Tentative ${attempt}/3 échouée: ${error.message}`);
        
        if (attempt < 3) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Nouvelle tentative dans ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Upload échoué après 3 tentatives: ${lastError.message}`);
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
const sharp = require('sharp');
const FormData = require('form-data');
const fetch = require('node-fetch');
const configService = require('./config.service');

class ImageService {
  constructor() {
    this.apiKey = configService.get('imgbbKey');
  }
  setApiKey(key) {
    this.apiKey = key;
    configService.set('imgbbKey', key);
  }
  async uploadImage(imageData) {
    if (!this.apiKey) {
      throw new Error('Clé ImgBB non configurée');
    }
    try {
      const formData = new FormData();
      // Si c'est un buffer ou base64
      if (typeof imageData === 'string') {
        // Retirer le préfixe data:image si présent
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        formData.append('image', base64Data);
      } else {
        formData.append('image', imageData.toString('base64'));
      }
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${this.apiKey}`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Échec upload');
      }
      return {
        url: data.data.url,
        deleteUrl: data.data.delete_url,
        displayUrl: data.data.display_url
      };
    } catch (error) {
      console.error('Erreur upload ImgBB:', error);
      throw error;
    }
  }

  async processImage(imagePath, maxWidth = 1920) {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      if (metadata.width > maxWidth) {
        return await image
          .resize(maxWidth, null, { withoutEnlargement: true })
          .toBuffer();
      }
      return await image.toBuffer();
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }
}

module.exports = new ImageService(); 
const sharp = require('sharp');
const fetch = require('node-fetch');
const FormData = require('form-data');

class ImageService {
  constructor() {
    this.imgbbKey = null;
    // Charger la clé depuis la config au démarrage
    const configService = require('./config.service');
    this.imgbbKey = configService.get('imgbbKey');
  }

  setApiKey(key) {
    this.imgbbKey = key;
  }

  async uploadImage(imageData, options = {}) {
    if (!this.imgbbKey) {
      throw new Error('ImgBB API key not configured');
    }
    try {
      // Si c'est un buffer, convertir en base64
      let base64Data = imageData;
      if (Buffer.isBuffer(imageData)) {
        base64Data = imageData.toString('base64');
      }
      const formData = new FormData();
      formData.append('key', this.imgbbKey);
      formData.append('image', base64Data);
      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        return {
          url: data.data.url,
          deleteUrl: data.data.delete_url
        };
      } else {
        throw new Error(data.error.message);
      }
    } catch (error) {
      throw new Error(`Image upload failed: ${error.message}`);
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
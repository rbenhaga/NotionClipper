const configService = require('./config.service');
const fetch = require('node-fetch');

class ImageService {
  async uploadToNotion(imageBuffer, filename = 'image.png') {
    const token = configService.getNotionToken();
    if (!token) {
      throw new Error('Notion token not configured');
    }

    const mimeType = this.getMimeType(filename);
    
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
      throw new Error(`File upload creation failed: ${error}`);
    }

    const uploadData = await createUploadResponse.json();
    const { upload_url, id: fileUploadId } = uploadData;

    const uploadResponse = await fetch(upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': imageBuffer.length.toString()
      },
      body: imageBuffer
    });

    if (!uploadResponse.ok) {
      throw new Error(`File upload failed: ${uploadResponse.statusText}`);
    }

    const completeResponse = await fetch(`https://api.notion.com/v1/file_uploads/${fileUploadId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2025-09-03'
      }
    });

    if (!completeResponse.ok) {
      throw new Error('Failed to complete file upload');
    }

    return fileUploadId;
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
const fetch = require('node-fetch');
const FormData = require('form-data');
const { Readable } = require('stream');
const configService = require('./config.service');

class ImageService {
  constructor() {
    this.token = null;
    this.apiVersion = '2025-09-03';
  }

  setToken(token) {
    this.token = token;
  }

  async uploadImage(imageBuffer, filename = 'image.png') {
    if (!this.token) {
      this.token = configService.getNotionToken();
      if (!this.token) {
        throw new Error('Notion token not configured');
      }
    }

    const fileUpload = await this.createFileUpload(filename);
    await this.sendFileContent(fileUpload.id, imageBuffer, filename);
    return fileUpload.id;
  }

  async createFileUpload(filename) {
    const response = await fetch('https://api.notion.com/v1/file_uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Notion-Version': this.apiVersion
      },
      body: JSON.stringify({
        filename: filename,
        mode: 'single_part'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || response.statusText);
    }

    return await response.json();
  }

  async sendFileContent(fileUploadId, buffer, filename) {
    const formData = new FormData();
    const stream = Readable.from(buffer);
    
    formData.append('file', stream, {
      filename: filename,
      contentType: this.getMimeType(filename)
    });

    const response = await fetch(`https://api.notion.com/v1/file_uploads/${fileUploadId}/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Notion-Version': this.apiVersion
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || response.statusText);
    }

    return await response.json();
  }

  getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const types = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    return types[ext] || 'application/octet-stream';
  }
}

module.exports = new ImageService();
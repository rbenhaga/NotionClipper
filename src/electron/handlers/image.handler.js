const FormData = require('form-data');
const fetch = require('node-fetch');

class ImageHandler {
  constructor(imgbbKey) {
    this.imgbbKey = imgbbKey;
  }

  async uploadImage(imageBuffer) {
    if (!this.imgbbKey) throw new Error('ImgBB key not configured');
    const formData = new FormData();
    formData.append('image', imageBuffer.toString('base64'));
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${this.imgbbKey}`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'Upload failed');
    return data.data.url;
  }
}

module.exports = ImageHandler; 
const { ipcMain } = require('electron');
const notionService = require('../services/notion.service');
const parserService = require('../services/parser.service');
const imageService = require('../services/image.service');

function registerContentIPC() {
  // Preview URL
  ipcMain.handle('content:preview-url', async (event, url) => {
    try {
      const preview = await parserService.generateUrlPreview(url);
      return { success: true, preview };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Parse content
  ipcMain.handle('content:parse', async (event, data) => {
    try {
      const { content, type = 'auto', options = {} } = data;
      const blocks = await parserService.parseContent(content, { type, ...options });
      return { success: true, blocks };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Upload image
  ipcMain.handle('content:upload-image', async (event, imageData) => {
    try {
      const result = await imageService.uploadImage(imageData);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = registerContentIPC; 
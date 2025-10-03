class ChunkService {
  constructor() {
    this.NOTION_MAX_CHARS_PER_BLOCK = 2000;
    this.NOTION_MAX_BLOCKS_PER_REQUEST = 100;
    this.SAFE_CHARS_PER_BLOCK = 1950;
  }

  splitTextIntoBlocks(text, preferredBlockSize = this.SAFE_CHARS_PER_BLOCK) {
    if (!text || text.length === 0) return [];
    const blocks = [];
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= preferredBlockSize) {
        blocks.push(remaining);
        break;
      }
      const cutPoint = this.findBestCutPoint(remaining, preferredBlockSize);
      blocks.push(remaining.substring(0, cutPoint));
      remaining = remaining.substring(cutPoint);
    }
    return blocks;
  }

  findBestCutPoint(text, maxLength) {
    if (text.length <= maxLength) return text.length;
    const searchRange = Math.min(100, Math.floor(maxLength / 4));
    const searchStart = Math.max(0, maxLength - searchRange);
    const searchText = text.substring(searchStart, maxLength);

    const doubleNewline = searchText.lastIndexOf('\n\n');
    if (doubleNewline !== -1) return searchStart + doubleNewline + 2;

    const newline = searchText.lastIndexOf('\n');
    if (newline !== -1) return searchStart + newline + 1;

    const sentenceEnds = ['. ', '! ', '? ', '。'];
    for (const end of sentenceEnds) {
      const index = searchText.lastIndexOf(end);
      if (index !== -1) {
        return searchStart + index + end.length;
      }
    }

    const space = searchText.lastIndexOf(' ');
    if (space !== -1) return searchStart + space + 1;

    return maxLength;
  }

  prepareNotionBlocks(text, type = 'paragraph') {
    const textChunks = this.splitTextIntoBlocks(text);
    return textChunks.map(chunk => ({
      object: 'block',
      type,
      [type]: {
        rich_text: [{
          type: 'text',
          text: { content: chunk, link: null }
        }]
      }
    }));
  }

  chunkBlocksForRequests(blocks) {
    const chunks = [];
    for (let i = 0; i < blocks.length; i += this.NOTION_MAX_BLOCKS_PER_REQUEST) {
      chunks.push(blocks.slice(i, i + this.NOTION_MAX_BLOCKS_PER_REQUEST));
    }
    return chunks;
  }
}

module.exports = new ChunkService();




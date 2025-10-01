const { Client } = require('@notionhq/client');
const configService = require('./config.service');
const cacheService = require('./cache.service');
const EventEmitter = require('events');

class NotionService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.token = null;
    this.isInitialized = false;
    this.apiVersion = '2025-09-03';
  }

  async initialize(token = null) {
    this.token = token || configService.getNotionToken();
    
    if (!this.token) {
      throw new Error('Notion token not configured');
    }

    this.client = new Client({
      auth: this.token,
      notionVersion: this.apiVersion
    });

    this.isInitialized = true;
  }

  async getDataSourceId(databaseId) {
    const cached = cacheService.get(`ds:${databaseId}`);
    if (cached) return cached;

    const response = await this.client.databases.retrieve({
      database_id: databaseId
    });

    if (response.data_sources && response.data_sources.length > 0) {
      const dataSourceId = response.data_sources[0].id;
      cacheService.set(`ds:${databaseId}`, dataSourceId, 3600000);
      return dataSourceId;
    }

    throw new Error('No data source found for database');
  }

  async searchPages(query = '') {
    const response = await this.client.search({
      query: query,
      filter: {
        property: 'object',
        value: 'page'
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    });

    return response.results.map(page => this.formatPage(page));
  }

  async queryDataSource(dataSourceId, filter = null) {
    const params = {
      data_source_id: dataSourceId
    };

    if (filter) {
      params.filter = filter;
    }

    const response = await this.client.request({
      path: `data_sources/${dataSourceId}/query`,
      method: 'PATCH',
      body: params
    });

    return response.results;
  }

  async createPage(parentId, properties, children = []) {
    const dataSourceId = await this.getDataSourceId(parentId);

    const response = await this.client.pages.create({
      parent: {
        type: 'data_source_id',
        data_source_id: dataSourceId
      },
      properties: properties,
      children: children
    });

    return response;
  }

  async appendBlocks(pageId, blocks) {
    const response = await this.client.blocks.children.append({
      block_id: pageId,
      children: blocks
    });

    return response;
  }

  async getPage(pageId) {
    const response = await this.client.pages.retrieve({
      page_id: pageId
    });

    return this.formatPage(response);
  }

  async getDataSource(dataSourceId) {
    const response = await this.client.request({
      path: `data_sources/${dataSourceId}`,
      method: 'GET'
    });

    return response;
  }

  formatPage(page) {
    let title = 'Untitled';
    
    if (page.properties) {
      const titleProp = Object.values(page.properties).find(
        prop => prop.type === 'title'
      );
      
      if (titleProp && titleProp.title && titleProp.title.length > 0) {
        title = titleProp.title.map(t => t.plain_text).join('');
      }
    }

    let icon = '📄';
    if (page.icon) {
      if (page.icon.type === 'emoji') {
        icon = page.icon.emoji;
      } else if (page.icon.type === 'external') {
        icon = page.icon.external.url;
      }
    }

    return {
      id: page.id,
      title: title,
      icon: icon,
      url: page.url,
      lastEdited: page.last_edited_time,
      created: page.created_time
    };
  }

  getClient() {
    if (!this.isInitialized) {
      throw new Error('Notion service not initialized');
    }
    return this.client;
  }
}

module.exports = new NotionService();
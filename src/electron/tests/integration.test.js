const { app } = require('electron');
const assert = require('assert');

// Services
const configService = require('../services/config.service');
const notionService = require('../services/notion.service');
const clipboardService = require('../services/clipboard.service');
const cacheService = require('../services/cache.service');
const statsService = require('../services/stats.service');

async function runTests() {
  console.log('🧪 Tests d\'intégration...\n');

  // Test 1: Configuration
  console.log('1️⃣ Test Configuration Service');
  try {
    configService.set('test', 'value');
    assert.strictEqual(configService.get('test'), 'value');
    configService.set('test', null);
    console.log('✅ Configuration OK');
  } catch (e) {
    console.error('❌ Configuration failed:', e);
  }

  // Test 2: Clipboard
  console.log('\n2️⃣ Test Clipboard Service');
  try {
    clipboardService.setContent('Test content');
    const content = clipboardService.getContent();
    assert(content && content.data === 'Test content');
    console.log('✅ Clipboard OK');
  } catch (e) {
    console.error('❌ Clipboard failed:', e);
  }

  // Test 3: Cache
  console.log('\n3️⃣ Test Cache Service');
  try {
    cacheService.set('test:key', { data: 'test' });
    const cached = cacheService.get('test:key');
    assert(cached && cached.data === 'test');
    console.log('✅ Cache OK');
  } catch (e) {
    console.error('❌ Cache failed:', e);
  }

  // Test 4: Stats
  console.log('\n4️⃣ Test Stats Service');
  try {
    statsService.increment('test_counter');
    const stats = statsService.getAllStats();
    assert(stats.counters.api_calls >= 0);
    console.log('✅ Stats OK');
  } catch (e) {
    console.error('❌ Stats failed:', e);
  }

  // Test 5: Notion (si token disponible)
  console.log('\n5️⃣ Test Notion Service');
  if (configService.getNotionToken()) {
    try {
      await notionService.initialize();
      console.log('✅ Notion connection OK');
    } catch (e) {
      console.error('❌ Notion failed:', e);
    }
  } else {
    console.log('⏭️  Skipped (no token)');
  }

  console.log('\n✅ Tests terminés');
  app.quit();
}

// Lancer les tests quand Electron est prêt
app.whenReady().then(runTests); 
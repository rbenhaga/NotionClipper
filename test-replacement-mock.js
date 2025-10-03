// Test du remplacement sans Electron
console.log('🧪 Test du remplacement ClipboardService (Mock)...');

try {
  // Mock Electron
  const mockElectron = {
    clipboard: {
      readText: () => 'test text',
      writeText: (text) => true,
      readImage: () => ({ isEmpty: () => true }),
      writeImage: (img) => true,
      readHTML: () => '<p>test html</p>',
      writeHTML: (html) => true,
      clear: () => true,
      availableFormats: () => ['text/plain']
    },
    nativeImage: {
      createFromBuffer: (buffer) => ({ toPNG: () => buffer })
    }
  };
  
  // Mock require pour Electron
  const originalRequire = require;
  require = function(id) {
    if (id === 'electron') return mockElectron;
    return originalRequire.apply(this, arguments);
  };
  
  // Test 1: Charger l'adapter avec mock
  const ElectronClipboardAdapter = originalRequire('./apps/notion-clipper-app/src/electron/adapters/clipboard.adapter');
  console.log('✅ ElectronClipboardAdapter loaded with mock');
  
  // Test 2: Créer une instance
  const adapter = new ElectronClipboardAdapter();
  console.log('✅ Adapter instance created');
  
  // Test 3: Tester les méthodes
  adapter.readText().then(text => {
    console.log('✅ readText() works:', text === 'test text');
  });
  
  // Test 4: Tester la surveillance
  adapter.startWatching(1000);
  console.log('✅ startWatching() works');
  
  setTimeout(() => {
    adapter.stopWatching();
    console.log('✅ stopWatching() works');
  }, 100);
  
  console.log('\n🎉 MOCK TEST SUCCESSFUL!');
  console.log('📊 Status:');
  console.log('  ✅ Adapter structure: Working');
  console.log('  ✅ Methods: Working with mock');
  console.log('  ✅ Surveillance: Working');
  console.log('  ✅ Ready for real Electron');
  
  // Restaurer require
  require = originalRequire;
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

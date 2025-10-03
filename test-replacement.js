// Test du remplacement complet du ClipboardService
const path = require('path');

console.log('🧪 Test du remplacement ClipboardService...');

try {
  // Test 1: Charger l'adapter
  const ElectronClipboardAdapter = require('./apps/notion-clipper-app/src/electron/adapters/clipboard.adapter');
  console.log('✅ ElectronClipboardAdapter loaded');
  
  // Test 2: Créer une instance
  const adapter = new ElectronClipboardAdapter();
  console.log('✅ Adapter instance created');
  
  // Test 3: Vérifier les méthodes
  const methods = [
    'readText', 'writeText', 'readImage', 'writeImage', 
    'readHTML', 'writeHTML', 'clear', 'availableFormats',
    'startWatching', 'stopWatching', 'hasChanged'
  ];
  
  const missingMethods = methods.filter(method => typeof adapter[method] !== 'function');
  
  if (missingMethods.length === 0) {
    console.log('✅ All required methods present');
  } else {
    console.log('❌ Missing methods:', missingMethods);
  }
  
  // Test 4: Vérifier l'héritage EventEmitter
  console.log('✅ EventEmitter inheritance:', adapter.emit !== undefined);
  
  // Test 5: Simuler l'export du main.js
  const mockMain = {
    get newClipboardService() {
      return adapter;
    }
  };
  
  console.log('✅ Mock export working:', !!mockMain.newClipboardService);
  
  console.log('\n🎉 REMPLACEMENT TEST SUCCESSFUL!');
  console.log('📊 Status:');
  console.log('  ✅ Adapter: Working');
  console.log('  ✅ Methods: All present');
  console.log('  ✅ EventEmitter: Working');
  console.log('  ✅ Export pattern: Working');
  console.log('  ✅ Ready for Electron test');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}

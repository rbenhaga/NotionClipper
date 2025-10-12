const { parseContent } = require('./dist/parseContent.js');

const testContent = `# Test

Texte **gras** et *italique*.

---

> Toggle test
> Contenu toggle

- [ ] Checkbox test
- [x] Checkbox done

| Col1 | Col2 |
|------|------|
| A    | B    |`;

console.log('🧪 Test rapide du parser...');
try {
  const result = parseContent(testContent, { contentType: 'markdown' });
  console.log('✅ Succès:', result.success);
  console.log('📊 Blocs:', result.blocks.length);
  
  result.blocks.forEach((block, i) => {
    console.log(`Bloc ${i}: ${block.type}`);
    
    // Vérifier les problèmes de structure
    const typeProperty = block[block.type];
    if (!typeProperty) {
      console.log(`  ❌ PROBLÈME: Propriété '${block.type}' manquante!`);
    }
    
    if ('children' in block && block.children) {
      console.log(`  - A des children: ${block.children.length}`);
      console.log(`  - Has children flag: ${block.has_children}`);
      
      if (!block.has_children) {
        console.log(`  ❌ PROBLÈME: children présent mais has_children = false`);
      }
    }
    
    if (block.type === 'divider') {
      console.log(`  - Divider content:`, JSON.stringify(block.divider));
      if (!block.divider || Object.keys(block.divider).length !== 0) {
        console.log(`  ❌ PROBLÈME: Divider mal formé`);
      }
    }
    
    // Afficher la structure complète des blocs problématiques
    if (!typeProperty || ('children' in block && block.children && !block.has_children)) {
      console.log(`  📋 Structure complète:`, JSON.stringify(block, null, 2));
    }
  });
  
  if (result.error) {
    console.error('❌ Erreur de parsing:', result.error);
  }
  
} catch (error) {
  console.error('❌ Erreur fatale:', error.message);
  console.error(error.stack);
}
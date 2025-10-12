const { parseContent } = require('./dist/parseContent.js');

// Test spécifique pour les problèmes identifiés
const problematicContent = `# Test

## Section avec listes

- Premier élément
  - Sous-élément niveau 2
    - Sous-élément niveau 3
  - Retour niveau 2
- Retour niveau 1

---

> Toggle principal
> Contenu qui peut être masqué
> Supporte **gras** et *italique*

> [!NOTE]
> Note importante avec formatage **gras** et *italique*

| Col1 | Col2 | Col3 |
|------|------|------|
| A    | B    | C    |
| 1    | 2    | 3    |`;

console.log('🔍 Test spécifique pour identifier les problèmes...\n');

try {
  const result = parseContent(problematicContent, { 
    contentType: 'markdown',
    preserveFormatting: true,
    skipValidation: false
  });
  
  console.log(`✅ Parsing réussi: ${result.success}`);
  console.log(`📊 Nombre de blocs: ${result.blocks.length}\n`);
  
  // Analyser chaque bloc en détail
  result.blocks.forEach((block, index) => {
    console.log(`--- Bloc ${index}: ${block.type} ---`);
    
    // Vérifier la structure de base
    const typeProperty = block[block.type];
    const hasTypeProperty = !!typeProperty;
    const hasChildren = 'children' in block && Array.isArray(block.children);
    const hasChildrenFlag = 'has_children' in block && block.has_children;
    
    console.log(`  Type property exists: ${hasTypeProperty}`);
    console.log(`  Has children array: ${hasChildren}`);
    console.log(`  Has children flag: ${hasChildrenFlag}`);
    
    if (hasChildren) {
      console.log(`  Children count: ${block.children.length}`);
    }
    
    // Identifier les problèmes
    const problems = [];
    
    if (!hasTypeProperty) {
      problems.push(`❌ Propriété '${block.type}' manquante`);
    }
    
    if (hasChildren && !hasChildrenFlag) {
      problems.push(`❌ children présent mais has_children manquant/false`);
    }
    
    if (hasChildren && block.children.length === 0) {
      problems.push(`⚠️ children array vide`);
    }
    
    if (block.type === 'divider') {
      if (!block.divider) {
        problems.push(`❌ divider property manquante`);
      } else if (Object.keys(block.divider).length !== 0) {
        problems.push(`❌ divider doit être un objet vide {}`);
      }
    }
    
    if (problems.length > 0) {
      console.log(`  PROBLÈMES DÉTECTÉS:`);
      problems.forEach(problem => console.log(`    ${problem}`));
      
      // Afficher la structure JSON pour debug
      console.log(`  Structure JSON:`);
      console.log(JSON.stringify(block, null, 4));
    } else {
      console.log(`  ✅ Bloc valide`);
    }
    
    console.log('');
  });
  
  // Test de validation Notion API
  console.log('🧪 Simulation validation Notion API...');
  
  const invalidBlocks = result.blocks.filter((block, index) => {
    // Simuler les vérifications de l'API Notion
    const typeProperty = block[block.type];
    
    if (!typeProperty) {
      console.log(`❌ Bloc ${index}: ${block.type} property manquante`);
      return true;
    }
    
    if ('children' in block && block.children && !('has_children' in block)) {
      console.log(`❌ Bloc ${index}: children présent mais has_children manquant`);
      return true;
    }
    
    return false;
  });
  
  if (invalidBlocks.length === 0) {
    console.log('✅ Tous les blocs passeraient la validation Notion API');
  } else {
    console.log(`❌ ${invalidBlocks.length} blocs échoueraient à la validation Notion API`);
  }
  
} catch (error) {
  console.error('💥 Erreur fatale:', error.message);
  console.error(error.stack);
}
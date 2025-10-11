#!/usr/bin/env node

/**
 * 🔍 DIAGNOSTIC RAPIDE - Notion Parser
 * 
 * Vérifie l'état du projet et la disponibilité des composants
 * avant de lancer les tests exhaustifs.
 */

const fs = require('fs');
const path = require('path');

function log(message, level = 'INFO') {
  const prefix = {
    'INFO': '📝',
    'SUCCESS': '✅', 
    'ERROR': '❌',
    'WARNING': '⚠️',
    'CHECK': '🔍'
  }[level] || '📝';
  
  console.log(`${prefix} ${message}`);
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  log(`${description}: ${exists ? 'Trouvé' : 'MANQUANT'}`, exists ? 'SUCCESS' : 'ERROR');
  return exists;
}

function checkDirectory(dirPath, description) {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  log(`${description}: ${exists ? 'Trouvé' : 'MANQUANT'}`, exists ? 'SUCCESS' : 'ERROR');
  return exists;
}

function checkPackageJson() {
  log('Vérification du package.json...', 'CHECK');
  
  if (!fs.existsSync('package.json')) {
    log('package.json manquant', 'ERROR');
    return false;
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    log(`Nom: ${pkg.name}`, 'INFO');
    log(`Version: ${pkg.version}`, 'INFO');
    log(`Description: ${pkg.description}`, 'INFO');
    
    // Vérifier les scripts
    const requiredScripts = ['build', 'build:cjs', 'build:esm'];
    requiredScripts.forEach(script => {
      if (pkg.scripts && pkg.scripts[script]) {
        log(`Script "${script}": Disponible`, 'SUCCESS');
      } else {
        log(`Script "${script}": MANQUANT`, 'ERROR');
      }
    });
    
    return true;
  } catch (error) {
    log(`Erreur lors de la lecture du package.json: ${error.message}`, 'ERROR');
    return false;
  }
}

function checkSourceStructure() {
  log('Vérification de la structure source...', 'CHECK');
  
  const requiredDirs = [
    'src',
    'src/detectors',
    'src/parsers', 
    'src/converters',
    'src/formatters',
    'src/validators',
    'src/types',
    'src/utils'
  ];
  
  let allPresent = true;
  requiredDirs.forEach(dir => {
    if (!checkDirectory(dir, `Dossier ${dir}`)) {
      allPresent = false;
    }
  });
  
  const requiredFiles = [
    'src/index.ts',
    'src/parseContent.ts'
  ];
  
  requiredFiles.forEach(file => {
    if (!checkFile(file, `Fichier ${file}`)) {
      allPresent = false;
    }
  });
  
  return allPresent;
}

function checkBuildOutput() {
  log('Vérification du build...', 'CHECK');
  
  const buildFiles = [
    'dist/index.js',
    'dist/index.d.ts',
    'dist/parseContent.js',
    'dist/parseContent.d.ts'
  ];
  
  let buildExists = checkDirectory('dist', 'Dossier dist');
  
  buildFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      log(`${file}: ${(stats.size / 1024).toFixed(1)}KB`, 'SUCCESS');
    } else {
      log(`${file}: MANQUANT`, 'WARNING');
      buildExists = false;
    }
  });
  
  return buildExists;
}

function checkTestFiles() {
  log('Vérification des fichiers de test...', 'CHECK');
  
  const testFiles = [
    'test-ultimate-exhaustive.js',
    'run-ultimate-test.js',
    'test-config.json',
    'diagnostic.js'
  ];
  
  let allPresent = true;
  testFiles.forEach(file => {
    if (!checkFile(file, `Test ${file}`)) {
      allPresent = false;
    }
  });
  
  return allPresent;
}

function checkNodeModules() {
  log('Vérification des dépendances...', 'CHECK');
  
  const hasNodeModules = checkDirectory('node_modules', 'node_modules');
  const hasPackageLock = checkFile('package-lock.json', 'package-lock.json') || 
                        checkFile('pnpm-lock.yaml', 'pnpm-lock.yaml') ||
                        checkFile('yarn.lock', 'yarn.lock');
  
  return hasNodeModules && hasPackageLock;
}

function testParserLoading() {
  log('Test de chargement du parser...', 'CHECK');
  
  try {
    // Essayer de charger depuis le build
    if (fs.existsSync('dist/index.js')) {
      const parser = require('./dist/index.js');
      
      if (typeof parser.parseContent === 'function') {
        log('parseContent: Fonction disponible', 'SUCCESS');
      } else {
        log('parseContent: MANQUANT', 'ERROR');
        return false;
      }
      
      // Test rapide
      const result = parser.parseContent('# Test');
      if (Array.isArray(result) || (result && Array.isArray(result.blocks))) {
        log('Test rapide: Succès', 'SUCCESS');
        return true;
      } else {
        log('Test rapide: Échec', 'ERROR');
        return false;
      }
    } else {
      log('Build non disponible - Mode MOCK sera utilisé', 'WARNING');
      return false;
    }
  } catch (error) {
    log(`Erreur de chargement: ${error.message}`, 'ERROR');
    return false;
  }
}

function checkTypeScript() {
  log('Vérification TypeScript...', 'CHECK');
  
  const hasTsConfig = checkFile('tsconfig.json', 'tsconfig.json');
  
  try {
    const { execSync } = require('child_process');
    const tscVersion = execSync('npx tsc --version', { encoding: 'utf8' }).trim();
    log(`TypeScript: ${tscVersion}`, 'SUCCESS');
    return hasTsConfig;
  } catch (error) {
    log('TypeScript: Non disponible', 'WARNING');
    return false;
  }
}

function generateRecommendations(results) {
  log('Génération des recommandations...', 'CHECK');
  
  console.log('\n📋 RECOMMANDATIONS:');
  
  if (!results.packageJson) {
    console.log('❌ Créer ou réparer le package.json');
  }
  
  if (!results.sourceStructure) {
    console.log('❌ Vérifier la structure des dossiers source');
  }
  
  if (!results.dependencies) {
    console.log('❌ Installer les dépendances: npm install');
  }
  
  if (!results.typescript) {
    console.log('⚠️  Installer TypeScript: npm install -g typescript');
  }
  
  if (!results.buildOutput) {
    console.log('🔨 Construire le projet: npm run build');
  }
  
  if (!results.parserLoading) {
    console.log('🔧 Le parser ne fonctionne pas - Vérifier le build');
  }
  
  if (results.allGood) {
    console.log('✅ Tout est prêt! Vous pouvez lancer les tests:');
    console.log('   node run-ultimate-test.js');
    console.log('   node run-ultimate-test.js --quick');
    console.log('   node run-ultimate-test.js --security');
  }
}

function main() {
  console.log('🔍 DIAGNOSTIC RAPIDE - Notion Parser');
  console.log('📦 Vérification de l\'état du projet\n');
  
  const results = {
    packageJson: checkPackageJson(),
    sourceStructure: checkSourceStructure(),
    dependencies: checkNodeModules(),
    typescript: checkTypeScript(),
    buildOutput: checkBuildOutput(),
    testFiles: checkTestFiles(),
    parserLoading: testParserLoading()
  };
  
  // Calcul du score global
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(Boolean).length;
  const score = (passedChecks / totalChecks * 100).toFixed(1);
  
  results.allGood = score >= 80;
  
  console.log('\n🎯 RÉSUMÉ DU DIAGNOSTIC:');
  console.log(`📊 Score: ${passedChecks}/${totalChecks} (${score}%)`);
  
  Object.entries(results).forEach(([check, passed]) => {
    if (check !== 'allGood') {
      const status = passed ? '✅' : '❌';
      const name = check.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`${status} ${name}`);
    }
  });
  
  generateRecommendations(results);
  
  if (results.allGood) {
    console.log('\n🎉 Diagnostic réussi! Le projet est prêt.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Des problèmes ont été détectés. Consultez les recommandations.');
    process.exit(1);
  }
}

// Point d'entrée
if (require.main === module) {
  main();
}

module.exports = { main };
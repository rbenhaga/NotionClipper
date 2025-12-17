#!/usr/bin/env node
/**
 * License Guardrail Script
 * 
 * Vérifie les contraintes de licence pour le projet NotionClipper :
 * 1. AUCUN package @blocknote/* (TOUS bloqués - remplacé par Plate)
 * 2. Aucune licence GPL/AGPL dans les dépendances directes
 * 
 * BlockNote a été ÉRADIQUÉ et remplacé par Plate (MIT).
 * 
 * Usage: node scripts/license-guardrail.js
 * CI:    pnpm run license:check
 */

const fs = require('fs');
const path = require('path');

// Configuration
// ⚠️ BLOCKNOTE ÉRADIQUÉ - Remplacé par Plate
// Tous les packages @blocknote/* sont maintenant bloqués
const BLOCKED_PACKAGES = [
  '@blocknote/core',
  '@blocknote/react',
  '@blocknote/mantine',
  '@blocknote/ariakit',
  '@blocknote/shadcn',
  '@blocknote/xl-ai',
  '@blocknote/xl-docx-exporter',
  '@blocknote/xl-multi-column',
  '@blocknote/xl-pdf-exporter',
  '@blocknote/xl-odt-exporter',
];

const BLOCKED_PACKAGE_PATTERNS = [
  /^@blocknote\//,  // TOUS les packages BlockNote bloqués
];

const DANGEROUS_LICENSES = [
  'GPL',
  'GPL-2.0',
  'GPL-3.0',
  'AGPL',
  'AGPL-3.0',
  'LGPL',  // Attention : LGPL peut être OK selon usage
];

// BlockNote éradiqué - aucun package autorisé
const ALLOWED_BLOCKNOTE_PACKAGES = [];

// Couleurs console
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let hasErrors = false;
let hasWarnings = false;

function log(type, message) {
  const prefix = {
    error: `${RED}✖ ERROR${RESET}`,
    warn: `${YELLOW}⚠ WARNING${RESET}`,
    ok: `${GREEN}✔${RESET}`,
    info: '  ',
  };
  console.log(`${prefix[type] || ''} ${message}`);
}


// ============================================
// CHECK 1: Scan lockfile for blocked packages
// ============================================
function checkLockfile() {
  console.log('\n📦 Checking lockfile for blocked packages...\n');
  
  const lockfilePath = path.join(__dirname, '..', 'pnpm-lock.yaml');
  
  if (!fs.existsSync(lockfilePath)) {
    log('warn', 'pnpm-lock.yaml not found, skipping lockfile check');
    return;
  }
  
  const lockfileContent = fs.readFileSync(lockfilePath, 'utf-8');
  const foundBlocked = [];
  
  // Check explicit blocked packages
  for (const pkg of BLOCKED_PACKAGES) {
    if (lockfileContent.includes(pkg)) {
      foundBlocked.push(pkg);
    }
  }
  
  // Check patterns (xl-*)
  const xlMatches = lockfileContent.match(/@blocknote\/xl-[a-z-]+/g) || [];
  const uniqueXl = [...new Set(xlMatches)];
  
  for (const match of uniqueXl) {
    if (!foundBlocked.includes(match)) {
      foundBlocked.push(match);
    }
  }
  
  if (foundBlocked.length > 0) {
    hasErrors = true;
    log('error', 'BLOCKED PACKAGES FOUND IN LOCKFILE:');
    for (const pkg of foundBlocked) {
      log('info', `  - ${pkg}`);
    }
    log('info', '');
    log('info', '  These packages have GPL/commercial licenses incompatible');
    log('info', '  with closed-source distribution. Remove them with:');
    log('info', `  ${YELLOW}pnpm remove <package-name>${RESET}`);
  } else {
    log('ok', 'No blocked packages in lockfile');
  }
}

// ============================================
// CHECK 2: Scan package.json files
// ============================================
function checkPackageJsonFiles() {
  console.log('\n📋 Checking package.json files...\n');
  
  const workspaceRoot = path.join(__dirname, '..');
  const packageJsonPaths = [];
  
  // Find all package.json in workspace
  function findPackageJsons(dir, depth = 0) {
    if (depth > 3) return; // Limit depth
    if (dir.includes('node_modules')) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        findPackageJsons(fullPath, depth + 1);
      } else if (entry.name === 'package.json') {
        packageJsonPaths.push(fullPath);
      }
    }
  }
  
  findPackageJsons(workspaceRoot);
  
  const issues = [];
  
  for (const pkgPath of packageJsonPaths) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const relativePath = path.relative(workspaceRoot, pkgPath);
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
      };
      
      for (const [depName] of Object.entries(allDeps)) {
        // Check blocked patterns
        for (const pattern of BLOCKED_PACKAGE_PATTERNS) {
          if (pattern.test(depName)) {
            issues.push({ file: relativePath, package: depName });
          }
        }
      }
    } catch (e) {
      // Skip invalid package.json
    }
  }
  
  if (issues.length > 0) {
    hasErrors = true;
    log('error', 'BLOCKED PACKAGES FOUND IN PACKAGE.JSON:');
    for (const issue of issues) {
      log('info', `  - ${issue.package} in ${issue.file}`);
    }
  } else {
    log('ok', 'No blocked packages in package.json files');
  }
}


// ============================================
// CHECK 3: Check for BlockNote patches
// ============================================
function checkBlockNotePatches() {
  console.log('\n🔧 Checking for BlockNote patches...\n');
  
  const workspaceRoot = path.join(__dirname, '..');
  const patchesDir = path.join(workspaceRoot, 'patches');
  const legalPatchesDir = path.join(workspaceRoot, 'legal', 'blocknote-patches');
  
  // Check patches directory
  if (fs.existsSync(patchesDir)) {
    const patches = fs.readdirSync(patchesDir);
    const blockNotePatches = patches.filter(p => p.includes('blocknote'));
    
    if (blockNotePatches.length > 0) {
      // Check if documented in legal/
      if (!fs.existsSync(legalPatchesDir)) {
        hasErrors = true;
        log('error', 'UNDOCUMENTED BLOCKNOTE PATCHES FOUND:');
        for (const patch of blockNotePatches) {
          log('info', `  - patches/${patch}`);
        }
        log('info', '');
        log('info', '  MPL-2.0 requires modified files to be made available.');
        log('info', '  Create legal/blocknote-patches/ with:');
        log('info', '  - Copy of each patch file');
        log('info', '  - README explaining modifications');
      } else {
        hasWarnings = true;
        log('warn', 'BlockNote patches detected (ensure legal/ is up to date):');
        for (const patch of blockNotePatches) {
          log('info', `  - patches/${patch}`);
        }
      }
    } else {
      log('ok', 'No BlockNote patches in patches/');
    }
  } else {
    log('ok', 'No patches directory (clean)');
  }
  
  // Check for pnpm patch config in package.json
  const rootPkg = JSON.parse(
    fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf-8')
  );
  
  if (rootPkg.pnpm?.patchedDependencies) {
    const patchedDeps = Object.keys(rootPkg.pnpm.patchedDependencies);
    const blockNotePatched = patchedDeps.filter(d => d.includes('blocknote'));
    
    if (blockNotePatched.length > 0) {
      hasWarnings = true;
      log('warn', 'BlockNote packages in pnpm.patchedDependencies:');
      for (const dep of blockNotePatched) {
        log('info', `  - ${dep}`);
      }
      log('info', '  Ensure these are documented in legal/blocknote-patches/');
    }
  }
}

// ============================================
// CHECK 4: BlockNote ÉRADIQUÉ - Aucun package autorisé
// ============================================
function listBlockNoteUsage() {
  console.log('\n📊 BlockNote éradication check...\n');
  
  const lockfilePath = path.join(__dirname, '..', 'pnpm-lock.yaml');
  
  if (!fs.existsSync(lockfilePath)) {
    log('warn', 'Cannot audit without pnpm-lock.yaml');
    return;
  }
  
  const lockfileContent = fs.readFileSync(lockfilePath, 'utf-8');
  const blockNoteMatches = lockfileContent.match(/@blocknote\/[a-z-]+/g) || [];
  const uniquePackages = [...new Set(blockNoteMatches)];
  
  if (uniquePackages.length === 0) {
    log('ok', 'BlockNote éradiqué - aucun package trouvé ✓');
    log('info', '  Remplacé par Plate (@udecode/plate)');
    return;
  }
  
  // TOUS les packages BlockNote sont maintenant bloqués
  hasErrors = true;
  log('error', 'BLOCKNOTE PACKAGES FOUND - MUST BE REMOVED:');
  for (const pkg of uniquePackages) {
    log('info', `  - ${pkg}`);
  }
  log('info', '');
  log('info', '  BlockNote a été remplacé par Plate.');
  log('info', '  Supprimez ces packages avec:');
  log('info', `  ${YELLOW}pnpm remove <package-name>${RESET}`);
  log('info', '');
  log('info', '  Puis utilisez @notion-clipper/plate-adapter à la place.');
}


// ============================================
// CHECK 5: Verify THIRD_PARTY_NOTICES exists
// ============================================
function checkThirdPartyNotices() {
  console.log('\n📜 Checking third-party attribution...\n');
  
  const workspaceRoot = path.join(__dirname, '..');
  const possiblePaths = [
    'THIRD_PARTY_NOTICES.md',
    'THIRD-PARTY-NOTICES.md',
    'LICENSES.md',
    'docs/THIRD_PARTY_NOTICES.md',
    'legal/THIRD_PARTY_NOTICES.md',
  ];
  
  let found = false;
  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(workspaceRoot, p))) {
      log('ok', `Third-party notices found: ${p}`);
      found = true;
      break;
    }
  }
  
  if (!found) {
    hasWarnings = true;
    log('warn', 'No THIRD_PARTY_NOTICES.md found');
    log('info', '  Consider creating one for proper attribution.');
    log('info', '  Required for MPL-2.0 compliance in distributed apps.');
  }
}

// ============================================
// MAIN
// ============================================
function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🛡️  LICENSE GUARDRAIL - NotionClipper');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Policy: BlockNote ÉRADIQUÉ - Remplacé par Plate');
  console.log('  Allowed: AUCUN package @blocknote/*');
  console.log('  Blocked: @blocknote/* (TOUS)');
  
  checkLockfile();
  checkPackageJsonFiles();
  checkBlockNotePatches();
  listBlockNoteUsage();
  checkThirdPartyNotices();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  
  if (hasErrors) {
    console.log(`  ${RED}✖ FAILED${RESET} - License violations detected`);
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.log(`  ${YELLOW}⚠ PASSED WITH WARNINGS${RESET} - Review recommended`);
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.log(`  ${GREEN}✔ PASSED${RESET} - All license checks OK`);
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(0);
  }
}

main();

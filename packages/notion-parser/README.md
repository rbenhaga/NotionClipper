# @notion-clipper/notion-parser

Package dédié au parsing et à la conversion de contenu vers les blocs Notion API.

## 🎯 Objectifs

- **Détection intelligente** du type de contenu
- **Parsing multi-format** (Markdown, Code, Tables, LaTeX, HTML)
- **Conversion** vers blocs Notion API valides
- **Validation** des blocs générés
- **Extensibilité** pour nouveaux formats

## 🚀 Installation

```bash
pnpm add @notion-clipper/notion-parser
```

## 📖 Usage

### Usage simple

```typescript
import { parseContent } from '@notion-clipper/notion-parser';

// Détection automatique du type
const blocks = parseContent(content);

// Spécifier le type
const blocks = parseContent(content, {
  contentType: 'markdown'
});
```

### Usage avancé

```typescript
import { parseContent } from '@notion-clipper/notion-parser';

const result = parseContent(content, {
  contentType: 'auto',
  color: 'blue_background',
  maxBlocks: 100,
  
  // Options de détection
  detection: {
    enableMarkdownDetection: true,
    enableCodeDetection: true,
    enableTableDetection: true
  },
  
  // Options de conversion
  conversion: {
    preserveFormatting: true,
    convertLinks: true,
    convertImages: true
  },
  
  // Options de validation
  validation: {
    strictMode: false,
    validateRichText: true
  },
  
  // Options de formatage
  formatting: {
    removeEmptyBlocks: true,
    normalizeWhitespace: true
  },
  
  // Inclure les résultats de validation
  includeValidation: true
});

console.log(result.blocks);
console.log(result.validation);
console.log(result.metadata);
```

### Parsers spécialisés

```typescript
import { 
  parseMarkdown, 
  parseCode, 
  parseTable 
} from '@notion-clipper/notion-parser';

// Markdown
const markdownBlocks = parseMarkdown(`
# Titre
**Texte en gras** avec *italique*
- Liste à puces
`);

// Code
const codeBlocks = parseCode(`
function hello() {
  console.log('Hello World!');
}
`, 'javascript');

// Tableaux
const tableBlocks = parseTable(`
Name,Age,City
John,25,Paris
Jane,30,London
`, 'csv');
```

## 🔄 Pipeline de traitement

```
Contenu brut
     ↓
[ContentDetector] → Détection du type
     ↓
[Parser spécialisé] → AST intermédiaire
     ↓
[NotionConverter] → Blocs Notion
     ↓
[BlockFormatter] → Formatage
     ↓
[NotionValidator] → Validation
     ↓
Blocs Notion valides
```

## 📚 API

### Classes principales

#### `ContentDetector`
Détecte automatiquement le type de contenu.

```typescript
import { ContentDetector } from '@notion-clipper/notion-parser';

const detector = new ContentDetector();
const result = detector.detect(content);
console.log(result.type); // 'markdown' | 'code' | 'table' | etc.
console.log(result.confidence); // 0.0 - 1.0
```

#### `MarkdownParser`
Parse le contenu Markdown en AST.

```typescript
import { MarkdownParser } from '@notion-clipper/notion-parser';

const parser = new MarkdownParser({
  maxBlocks: 100,
  color: 'blue_background'
});
const ast = parser.parse(markdownContent);
```

#### `NotionConverter`
Convertit l'AST en blocs Notion API.

```typescript
import { NotionConverter } from '@notion-clipper/notion-parser';

const converter = new NotionConverter();
const blocks = converter.convert(astNodes, {
  preserveFormatting: true,
  convertLinks: true
});
```

#### `NotionValidator`
Valide les blocs Notion générés.

```typescript
import { NotionValidator } from '@notion-clipper/notion-parser';

const validator = new NotionValidator();
const result = validator.validate(blocks, {
  strictMode: true,
  validateRichText: true
});

if (!result.isValid) {
  console.log('Erreurs:', result.errors);
  console.log('Avertissements:', result.warnings);
}
```

### Types supportés

- **Markdown** : Headers, listes, code, liens, images, tableaux, callouts
- **Code** : Détection automatique du langage, coloration syntaxique
- **Tables** : CSV, TSV, Markdown tables
- **LaTeX** : Équations, environnements mathématiques
- **HTML** : Conversion vers Markdown puis Notion
- **URLs** : Bookmarks, images, vidéos, PDFs

### Formats de sortie

Tous les types de blocs Notion API sont supportés :

- `paragraph`, `heading_1`, `heading_2`, `heading_3`
- `bulleted_list_item`, `numbered_list_item`, `to_do`
- `toggle`, `quote`, `callout`, `divider`
- `code`, `equation`, `table`
- `image`, `video`, `pdf`, `bookmark`
- `embed`, `file`

## ⚙️ Configuration

### Limites par défaut

```typescript
const limits = {
  maxRichTextLength: 2000,
  maxBlocksPerRequest: 100,
  maxCodeLength: 2000,
  maxEquationLength: 1000,
  maxUrlLength: 2000,
  maxCaptionLength: 500
};
```

### Couleurs supportées

```typescript
type NotionColor = 
  | 'default' | 'gray' | 'brown' | 'orange' | 'yellow' 
  | 'green' | 'blue' | 'purple' | 'pink' | 'red'
  | 'gray_background' | 'brown_background' | 'orange_background' 
  | 'yellow_background' | 'green_background' | 'blue_background' 
  | 'purple_background' | 'pink_background' | 'red_background';
```

## 🧪 Tests

```bash
# Tous les tests
pnpm test

# Tests unitaires
pnpm test:unit

# Tests d'intégration
pnpm test:integration

# Couverture de code
pnpm test:coverage
```

## 🔧 Développement

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Clean
pnpm clean
```

## 📝 Exemples

### Markdown complexe

```typescript
const markdown = `
# Documentation API

## Introduction
Cette API permet de **gérer les utilisateurs** et leurs *données*.

### Endpoints disponibles

- \`GET /users\` - Liste des utilisateurs
- \`POST /users\` - Créer un utilisateur
- \`PUT /users/:id\` - Modifier un utilisateur

### Exemple de code

\`\`\`javascript
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John', email: 'john@example.com' })
});
\`\`\`

> [!warning]
> Attention aux limites de taux d'API

| Méthode | Limite | Période |
|---------|--------|---------|
| GET     | 1000   | 1h      |
| POST    | 100    | 1h      |
`;

const blocks = parseContent(markdown, {
  contentType: 'markdown',
  color: 'blue_background',
  conversion: {
    preserveFormatting: true,
    convertLinks: true,
    convertImages: true,
    convertTables: true,
    convertCode: true
  }
});
```

### Validation avec gestion d'erreurs

```typescript
const result = parseContent(content, {
  includeValidation: true,
  validation: {
    strictMode: true,
    validateRichText: true,
    validateBlockStructure: true
  }
});

if (!result.validation?.isValid) {
  console.error('Erreurs de validation:');
  result.validation.errors.forEach(error => {
    console.error(`- ${error.message} (${error.code})`);
  });
}

if (result.validation?.warnings.length > 0) {
  console.warn('Avertissements:');
  result.validation.warnings.forEach(warning => {
    console.warn(`- ${warning.message} (${warning.code})`);
  });
}
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 License

UNLICENSED - Usage interne uniquement.
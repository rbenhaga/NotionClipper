# Toggle Lists (Listes déroulantes)

Ce document explique comment utiliser les toggle lists avec le parser notion-parser et l'API Notion 2025.

## Qu'est-ce qu'une Toggle List ?

Une toggle list est une liste dont les éléments peuvent être repliés/dépliés dans Notion. Contrairement aux listes normales, chaque élément d'une toggle list peut contenir du contenu masquable.

## Syntaxe

Les toggle lists utilisent la syntaxe `>` suivie du type de liste :

### Toggle Lists à puces
```markdown
> - Élément toggle 1
> - Élément toggle 2
>   - Sous-élément toggle
```

### Toggle Lists numérotées
```markdown
> 1. Premier élément toggle
> 2. Deuxième élément toggle
>    1. Sous-élément numéroté
```

### Toggle Lists de tâches
```markdown
> - [ ] Tâche toggle non terminée
> - [x] Tâche toggle terminée
>   - [ ] Sous-tâche toggle
```

## Formatage supporté

Les toggle lists supportent tout le formatage rich text :

```markdown
> - **Gras** et *italique*
> - `Code inline` dans toggle
> - [Lien](https://example.com) dans toggle
> - Texte avec ~~barré~~
```

## Format API Notion 2025

Les toggle lists sont converties en blocs de liste standard avec la propriété `is_toggleable: true` :

### Bulleted Toggle List
```json
{
  "type": "bulleted_list_item",
  "bulleted_list_item": {
    "rich_text": [
      {
        "type": "text",
        "text": { "content": "Élément toggle" },
        "annotations": { ... }
      }
    ],
    "color": "default",
    "is_toggleable": true
  }
}
```

### Numbered Toggle List
```json
{
  "type": "numbered_list_item",
  "numbered_list_item": {
    "rich_text": [...],
    "color": "default",
    "is_toggleable": true
  }
}
```

### Todo Toggle List
```json
{
  "type": "to_do",
  "to_do": {
    "rich_text": [...],
    "checked": false,
    "color": "default",
    "is_toggleable": true
  }
}
```

## Utilisation avec notion-parser

```typescript
import { parseContent } from 'notion-parser';

const markdown = `
> - Toggle élément 1
> - Toggle élément 2
>   - Sous-toggle
`;

const result = parseContent(markdown);

// Vérifier les toggle lists
for (const block of result.blocks) {
  if (block.type === 'bulleted_list_item' && block.bulleted_list_item?.is_toggleable) {
    console.log('Toggle list détectée:', block.bulleted_list_item.rich_text[0].text.content);
  }
}
```

## Hiérarchie et indentation

Les toggle lists supportent l'indentation comme les listes normales. L'indentation est gérée via la hiérarchie parent-enfant de l'API Notion 2025 :

```typescript
import { parseContent, ListHierarchyHelper } from 'notion-parser';

const result = parseContent(markdown);
const instructions = ListHierarchyHelper.generateNotionApiInstructions(result.blocks);

// Les toggle lists sont incluses dans les instructions de hiérarchie
console.log('Blocs racines:', instructions.rootBlocks.length);
console.log('Opérations enfants:', instructions.childOperations.length);
```

## Différence avec les listes normales

| Aspect | Liste normale | Toggle list |
|--------|---------------|-------------|
| Syntaxe | `- Item` | `> - Item` |
| Propriété API | `is_toggleable: false` (ou absente) | `is_toggleable: true` |
| Comportement Notion | Statique | Repliable/dépliable |
| Contenu enfant | Visible | Masquable |

## Exemples complets

### Exemple simple
```markdown
> - Configuration
> - Paramètres avancés
> - Aide
```

### Exemple avec hiérarchie
```markdown
> - 📁 Projet
>   - 📄 Documentation
>     - README.md
>     - API.md
>   - 💻 Code source
>     - src/
>     - tests/
```

### Exemple avec formatage
```markdown
> - **Important**: Configuration requise
> - *Optionnel*: Paramètres avancés
> - `Code`: Exemples d'utilisation
```

## Validation

Le parser valide automatiquement que :
- ✅ La syntaxe `>` est correctement détectée
- ✅ La propriété `is_toggleable: true` est ajoutée
- ✅ Le rich text est préservé
- ✅ L'indentation est gérée correctement
- ✅ Le format est compatible avec l'API Notion 2025

## Limitations

1. **Syntaxe stricte** : La syntaxe `>` doit être suivie d'un espace puis du marqueur de liste
2. **Pas de mélange** : Ne mélangez pas toggle lists et listes normales dans la même hiérarchie
3. **API Notion** : Seule l'API Notion 2025+ supporte les toggle lists

## Migration

Si vous avez des listes existantes que vous voulez convertir en toggle lists :

```diff
- - Élément normal
+ > - Élément toggle

- 1. Élément numéroté
+ > 1. Élément toggle numéroté

- - [ ] Tâche normale
+ > - [ ] Tâche toggle
```
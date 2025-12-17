# @notion-clipper/plate-adapter

Plate adapter for ClipperDoc - Notion-like editor with ClipperDoc as source of truth.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ClipperDoc (Source de Vérité)             │
│                                                              │
│  - Format canonique indépendant                              │
│  - IDs stables (ne changent jamais)                          │
│  - Mapping Notion intégré                                    │
└─────────────────────────────────────────────────────────────┘
                           ↑
                           │
                    plate-adapter
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      Plate Editor                            │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ clipperDocToPlate│    │ plateToClipperDoc│                │
│  │   (import)       │    │   (export)       │                │
│  └─────────────────┘    └─────────────────┘                 │
│                                                              │
│  UI Features:                                                │
│  - + button on hover (left of block)                         │
│  - ⋮⋮ drag handle on hover                                   │
│  - / slash menu for block insertion                          │
│  - Notion-like styling (720px width, proper spacing)         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Why Plate instead of BlockNote?

- **Full control**: No vendor lock-in, no GPL dependencies
- **Slate foundation**: Battle-tested, well-documented
- **Extensible**: Easy to add custom blocks and behaviors
- **AI-ready**: Can implement "chez toi" AI without external dependencies

## Installation

```bash
pnpm add @notion-clipper/plate-adapter
```

## Usage

### Basic Usage

```tsx
import { ClipperPlateEditor } from '@notion-clipper/plate-adapter';
import '@notion-clipper/plate-adapter/styles';

function MyEditor() {
  const [doc, setDoc] = useState<ClipperDocument>(initialDoc);
  
  return (
    <ClipperPlateEditor
      document={doc}
      onChange={(newDoc) => setDoc(newDoc)}
      placeholder="Type '/' for commands..."
      theme="light"
      enableAi={false}
    />
  );
}
```

### With Ref

```tsx
import { ClipperPlateEditor, ClipperPlateEditorRef } from '@notion-clipper/plate-adapter';

function MyEditor() {
  const editorRef = useRef<ClipperPlateEditorRef>(null);
  
  const handleSave = () => {
    const doc = editorRef.current?.getDocument();
    if (doc) {
      saveToServer(doc);
      editorRef.current?.markSaved();
    }
  };
  
  return (
    <>
      <ClipperPlateEditor ref={editorRef} document={doc} />
      <button onClick={handleSave}>Save</button>
    </>
  );
}
```

### Using the Hook

```tsx
import { useClipperPlateEditor } from '@notion-clipper/plate-adapter';

function CustomEditor() {
  const {
    plateValue,
    document,
    state,
    actions,
    handleChange,
  } = useClipperPlateEditor({
    initialDoc: myDoc,
    onChange: (doc) => console.log('Changed:', doc),
    debounceMs: 300,
  });
  
  return (
    <Plate value={plateValue} onChange={handleChange}>
      <PlateContent />
    </Plate>
  );
}
```

## API

### ClipperPlateEditor Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `document` | `ClipperDocument` | - | ClipperDocument to display/edit |
| `onChange` | `(doc: ClipperDocument) => void` | - | Called when document changes |
| `onReady` | `() => void` | - | Called when editor is ready |
| `readOnly` | `boolean` | `false` | Read-only mode |
| `placeholder` | `string` | `"Type '/' for commands..."` | Placeholder text |
| `className` | `string` | - | Additional CSS class |
| `debounceMs` | `number` | `300` | Debounce delay for onChange |
| `theme` | `'light' \| 'dark'` | `'light'` | Theme |
| `enableAi` | `boolean` | `false` | Enable AI features |

### ClipperPlateEditorRef Methods

| Method | Description |
|--------|-------------|
| `getDocument()` | Get current ClipperDocument |
| `setDocument(doc)` | Replace entire document |
| `markSaved()` | Mark document as saved |
| `syncToClipper()` | Force sync from editor to ClipperDoc |
| `focus()` | Focus the editor |
| `getState()` | Get current editor state |

## Supported Block Types

| Block Type | Plate Type | Notes |
|------------|------------|-------|
| paragraph | `p` | Basic text block |
| heading | `h1`, `h2`, `h3` | Based on level prop |
| bulletListItem | `ul > li` | Bulleted list |
| numberedListItem | `ol > li` | Numbered list |
| checkListItem | `action_item` | Todo with checkbox |
| quote | `blockquote` | Quote block |
| codeBlock | `code_block` | Code with language |
| divider | `hr` | Horizontal rule |
| image | `img` | Image with caption |
| callout | `blockquote` | Degraded to quote (V1) |
| toggle | `blockquote` | Degraded to quote (V1) |

## AI Features

AI is **disabled by default** via the `enableAi` flag. This is intentional:

1. No vendor lock-in
2. No external AI dependencies
3. Can implement "chez toi" AI later

To enable AI in the future:

```tsx
<ClipperPlateEditor
  enableAi={true}
  // AI commands will appear in slash menu
/>
```

## License

UNLICENSED - Proprietary

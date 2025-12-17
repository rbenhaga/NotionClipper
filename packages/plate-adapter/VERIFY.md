# Plate Adapter - Verification Guide

## Build Commands

```bash
# 1. Install dependencies
cd NotionClipper
pnpm install

# 2. License check (BlockNote must be eradicated)
pnpm run license:check

# 3. Build plate-adapter
pnpm --filter @notion-clipper/plate-adapter build

# 4. Build UI package
pnpm --filter @notion-clipper/ui build

# 5. Build app frontend
pnpm --filter @notion-clipper/app build:frontend

# 6. Run roundtrip tests
pnpm --filter @notion-clipper/plate-adapter test
```

## Definition of Done (DoD) Checklist

### Core Functionality
- [x] **Plate v49 installed** - Using `@udecode/plate@^49.0.0` with proper plugins
- [x] **BlockNote eradicated** - No `@blocknote/*` packages in repo
- [x] **License check passes** - `pnpm run license:check` ✅
- [x] **All builds pass**:
  - [x] `pnpm --filter @notion-clipper/plate-adapter build` ✅
  - [x] `pnpm --filter @notion-clipper/ui build` ✅
  - [x] `pnpm --filter @notion-clipper/app build:frontend` ✅

### Editor Functionality
- [x] **ClipperDoc as source of truth** - Plate value is derived from ClipperDoc
- [x] **Controlled value** - Editor value updates when clipboard changes
- [x] **Editable** - User can type text (onChange works)
- [ ] **Clipboard visible** - Pasted content appears immediately (needs runtime test)

### Roundtrip Tests (20/20 passing)
- [x] ClipperDoc -> PlateValue preserves structure
- [x] PlateValue -> ClipperDoc preserves structure
- [x] IDs are stable on roundtrip
- [x] Multiple blocks NOT collapsed into one (anti-mono-bloc)
- [x] Headings (h1/h2/h3) preserved
- [x] Inline styles (bold/italic/code) preserved
- [x] Lists (bullet/numbered/todo) preserved
- [x] Special characters and unicode preserved

### UX Notion-like (V1)
- [x] **Slash menu `/`** - Basic implementation (opens on `/` key)
- [ ] **Slash menu actions** - Transform block type (TODO: implement transforms)
- [ ] **Hover `+` button** - Insert block (TODO: implement)
- [ ] **Hover `⋮⋮` drag handle** - Reorder blocks (TODO: implement)
- [ ] **Block selection** - Click margin to select (TODO: implement)

### AI Features
- [x] **`enableAi` flag** - Default `false`, no AI imports when disabled
- [ ] **AI integration** - Placeholder for future backend integration

## Architecture

```
ClipperDoc (Source of Truth)
    ↓ clipperDocToPlate()
PlateValue (Editor State)
    ↓ Plate Editor (view/edit)
PlateValue (Modified)
    ↓ plateToClipperDoc()
ClipperDoc (Updated)
    ↓ Export to Notion API
```

## Key Files

- `src/components/ClipperPlateEditor.tsx` - Main editor component
- `src/hooks/useClipperPlateEditor.ts` - Editor state management hook
- `src/convert/clipperDocToPlate.ts` - ClipperDoc → PlateValue converter
- `src/convert/plateToClipperDoc.ts` - PlateValue → ClipperDoc converter
- `src/types.ts` - Type definitions
- `src/__tests__/roundtrip.test.ts` - Roundtrip tests (20 tests)

## Dependencies (Plate v49)

```json
{
  "@udecode/plate": "^49.0.0",
  "@udecode/plate-basic-marks": "^49.0.0",
  "@udecode/plate-heading": "^49.0.0",
  "@udecode/plate-list": "^49.0.0",
  "@udecode/plate-block-quote": "^49.0.0",
  "@udecode/plate-code-block": "^49.0.0",
  "@udecode/plate-horizontal-rule": "^49.0.0",
  "@udecode/plate-link": "^49.0.0"
}
```

## Known Issues / TODO

1. **Slash menu transforms** - Menu opens but block transforms not yet implemented
2. **Hover affordances** - `+` and `⋮⋮` buttons not yet visible on hover
3. **DnD reorder** - Drag and drop not yet implemented
4. **Block selection** - Click-in-margin selection not yet implemented
5. **Runtime testing** - Need to test clipboard paste in actual app

## Next Steps

1. Implement slash menu block transforms
2. Add hover affordances (`+` button, `⋮⋮` drag handle)
3. Implement DnD block reordering
4. Add block selection via margin click
5. Runtime test clipboard paste functionality

# Third-Party Notices

This document contains licensing information for third-party software used in Clipper Pro.

---

## Plate Editor (Slate-based)

**Package:** `@udecode/plate`, `@udecode/plate-common`, `slate`, `slate-react`, `slate-history`  
**License:** MIT  
**Source:** https://github.com/udecode/plate  
**Copyright:** Ziad Beyens and contributors

The Plate editor is used as the rich-text editing component. All packages are MIT licensed, fully permissive for commercial use.

---

## ~~BlockNote Editor~~ (REMOVED)

**Status:** REMOVED from project (December 2025)

BlockNote has been replaced by Plate for the following reasons:
- Full control over the editor (MIT vs MPL-2.0)
- No vendor lock-in
- AI features can be implemented internally without external dependencies
- Better extensibility via Slate

All `@blocknote/*` packages are now blocked by the license guardrail.

---

## Notion API Client

**Package:** `@notionhq/client`  
**License:** MIT  
**Source:** https://github.com/makenotion/notion-sdk-js  
**Copyright:** Notion Labs, Inc.

---

## Supabase Client

**Package:** `@supabase/supabase-js`  
**License:** MIT  
**Source:** https://github.com/supabase/supabase-js  
**Copyright:** Supabase Inc.

---

## Electron

**Package:** `electron`  
**License:** MIT  
**Source:** https://github.com/electron/electron  
**Copyright:** Electron contributors

---

## React

**Package:** `react`, `react-dom`  
**License:** MIT  
**Source:** https://github.com/facebook/react  
**Copyright:** Meta Platforms, Inc.

---

## License Policy

Clipper Pro follows these licensing guidelines:

1. **Allowed licenses:** MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0
2. **Restricted licenses:** GPL, AGPL, LGPL (case-by-case evaluation)
3. **Blocked packages:** `@blocknote/*` (ALL packages blocked - replaced by Plate)

For questions about licensing, contact: [your-email@example.com]

---

*Last updated: December 2024 - BlockNote replaced by Plate*

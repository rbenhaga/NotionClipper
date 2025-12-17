# License Policy - Clipper Pro

## Overview

This document defines the licensing constraints for the Clipper Pro project to ensure commercial viability and legal compliance.

## Core Principles

1. **No GPL contamination** - The distributed application must remain proprietary
2. **No vendor lock-in** - Architecture allows swapping components
3. **Proper attribution** - All third-party licenses are documented

---

## Editor Library: Plate (Slate-based)

### ✅ Current Stack

```
@udecode/plate (MIT)
@udecode/plate-common (MIT)
slate (MIT)
slate-react (MIT)
slate-history (MIT)
```

All Plate/Slate packages are MIT licensed - fully permissive for commercial use.

### ❌ BlockNote - ÉRADIQUÉ

**BlockNote has been completely removed from the project.**

All `@blocknote/*` packages are now blocked:

```
@blocknote/core       ❌ BLOCKED
@blocknote/react      ❌ BLOCKED
@blocknote/mantine    ❌ BLOCKED
@blocknote/ariakit    ❌ BLOCKED
@blocknote/shadcn     ❌ BLOCKED
@blocknote/xl-*       ❌ BLOCKED
```

**Reason:** Replaced by Plate for full control, no vendor lock-in, and simpler licensing (MIT vs MPL-2.0).

---

## General License Rules

### Allowed Licenses

| License | Notes |
|---------|-------|
| MIT | Fully permissive |
| Apache-2.0 | Permissive with patent grant |
| BSD-2-Clause | Permissive |
| BSD-3-Clause | Permissive |
| ISC | Permissive |
| MPL-2.0 | File-level copyleft only |

### Restricted Licenses (Case-by-case)

| License | Condition |
|---------|-----------|
| LGPL-2.1 | OK if dynamically linked |
| LGPL-3.0 | OK if dynamically linked |
| CC-BY-* | OK for assets, not code |

### Blocked Licenses

| License | Reason |
|---------|--------|
| GPL-2.0 | Copyleft incompatible with proprietary |
| GPL-3.0 | Copyleft incompatible with proprietary |
| AGPL-3.0 | Network copyleft |
| SSPL | Server-side copyleft |
| BSL | Business source restrictions |

---

## CI/CD Enforcement

The `license:check` script runs automatically before builds:

```bash
pnpm run license:check
```

This script:
- Scans `pnpm-lock.yaml` for blocked packages
- Checks all `package.json` files for BlockNote dependencies
- Confirms `THIRD_PARTY_NOTICES.md` is present

**Build will fail if violations are detected.**

---

## Architecture Compliance

The ClipperDoc architecture ensures license safety:

```
┌─────────────────────────────────────────────────────┐
│                    ClipperDoc                       │
│              (Canonical Format - Ours)              │
│                   No dependencies                   │
└─────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Notion    │  │    Plate    │  │  Markdown   │
│   Adapter   │  │   Adapter   │  │   Adapter   │
│  (MIT API)  │  │   (MIT)     │  │   (Ours)    │
└─────────────┘  └─────────────┘  └─────────────┘
```

This design means:
- Plate can be swapped without touching core logic
- Custom blocks implemented in our adapter
- Notion sync is independent of editor choice
- AI features can be implemented "chez nous" without vendor lock-in

---

## Checklist for New Dependencies

Before adding any dependency:

- [ ] Check license on npm/GitHub
- [ ] Verify not in blocked list
- [ ] Run `pnpm run license:check`
- [ ] Update `THIRD_PARTY_NOTICES.md` if significant

---

*Last updated: December 2024 - BlockNote replaced by Plate*

# Manual Testing Checklist - NotionEditor Refactoring

## Overview

This checklist validates that the new NotionEditor component works correctly and maintains feature parity with the legacy NotionClipboardEditor.

**Requirements Validated:** 17.3 (Feature parity when switching between versions)

## Prerequisites

Before testing, ensure:
1. The application is running locally (`pnpm dev` or equivalent)
2. You can access the editor interface

## How to Switch Between Editors

The editor can be switched using URL parameters:
- **New Editor:** Add `?editor=new` to the URL
- **Old Editor:** Add `?editor=old` to the URL

Or via localStorage:
```javascript
// Enable new editor
localStorage.setItem('useNewEditor', 'true');

// Enable old editor
localStorage.setItem('useNewEditor', 'false');
```

---

## Test Checklist

### 1. Basic Text Input
**Test:** Taper du texte → ça marche ?

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.1 | Click in the editor area | Cursor appears, editor is focused | ☐ |
| 1.2 | Type "Hello World" | Text appears as typed | ☐ |
| 1.3 | Press Enter | New line is created | ☐ |
| 1.4 | Type multiple paragraphs | All text is preserved | ☐ |
| 1.5 | Delete text with Backspace | Text is deleted correctly | ☐ |

**Notes:**
```
_________________________________
_________________________________
```

---

### 2. Text Formatting
**Test:** Formater (bold, italic, underline) → ça marche ?

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.1 | Select text | Formatting toolbar appears above selection | ☐ |
| 2.2 | Click Bold (B) button | Selected text becomes bold | ☐ |
| 2.3 | Click Italic (I) button | Selected text becomes italic | ☐ |
| 2.4 | Click Underline (U) button | Selected text becomes underlined | ☐ |
| 2.5 | Click Strikethrough button | Selected text has strikethrough | ☐ |
| 2.6 | Click Code button | Selected text becomes inline code | ☐ |
| 2.7 | Click Link button | Prompt appears for URL, link is created | ☐ |
| 2.8 | Click H1/H2/H3 buttons | Text becomes heading of correct level | ☐ |
| 2.9 | Click outside selection | Formatting toolbar disappears | ☐ |

**Keyboard Shortcuts to Test:**
- ⌘/Ctrl + B → Bold
- ⌘/Ctrl + I → Italic
- ⌘/Ctrl + U → Underline

**Notes:**
```
_________________________________
_________________________________
```

---

### 3. Slash Commands
**Test:** Slash commands (/heading, /bullet) → ça marche ?

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 3.1 | Type "/" at start of line | Slash menu appears | ☐ |
| 3.2 | Type "/h1" | Menu filters to show Heading 1 | ☐ |
| 3.3 | Press Enter on Heading 1 | Text becomes H1 heading | ☐ |
| 3.4 | Type "/bullet" | Menu shows Bullet List option | ☐ |
| 3.5 | Select Bullet List | Bullet list is created | ☐ |
| 3.6 | Type "/numbered" | Menu shows Numbered List | ☐ |
| 3.7 | Select Numbered List | Numbered list is created | ☐ |
| 3.8 | Type "/todo" | Menu shows To-do List | ☐ |
| 3.9 | Select To-do List | Checkbox item is created | ☐ |
| 3.10 | Type "/quote" | Menu shows Quote option | ☐ |
| 3.11 | Select Quote | Blockquote is created | ☐ |
| 3.12 | Type "/code" | Menu shows Code Block | ☐ |
| 3.13 | Select Code Block | Code block is created | ☐ |
| 3.14 | Type "/divider" | Menu shows Divider | ☐ |
| 3.15 | Select Divider | Horizontal rule is inserted | ☐ |
| 3.16 | Press Escape | Slash menu closes without action | ☐ |
| 3.17 | Use Up/Down arrows | Selection moves in menu | ☐ |

**Notes:**
```
_________________________________
_________________________________
```

---

### 4. Image Upload
**Test:** Upload image → ça marche ?

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 4.1 | Drag image file into editor | Image is uploaded/displayed | ☐ |
| 4.2 | Drop multiple images | All images are handled | ☐ |
| 4.3 | Drop non-image file | File is handled appropriately | ☐ |
| 4.4 | Drop oversized file | Error message shown | ☐ |

**Notes:**
```
_________________________________
_________________________________
```

---

### 5. Copy/Paste HTML
**Test:** Copier/coller HTML → ça marche ?

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 5.1 | Copy formatted text from web page | - | - |
| 5.2 | Paste into editor (Ctrl/Cmd+V) | HTML is converted to Markdown | ☐ |
| 5.3 | Copy text with links | Links are preserved | ☐ |
| 5.4 | Copy text with lists | List structure is preserved | ☐ |
| 5.5 | Copy text with headings | Heading levels are preserved | ☐ |
| 5.6 | Copy text with code blocks | Code formatting is preserved | ☐ |
| 5.7 | Copy text with tables | Table structure is preserved | ☐ |

**Test Sources:**
- Copy from: Wikipedia, GitHub README, Google Docs
- Verify: Formatting is maintained after paste

**Notes:**
```
_________________________________
_________________________________
```

---

### 6. Drag & Drop Blocks
**Test:** Drag & drop blocks → ça marche ?

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 6.1 | Hover over a block | Drag handle (⋮⋮) appears on left | ☐ |
| 6.2 | Click and drag the handle | Block becomes draggable | ☐ |
| 6.3 | Drag over other blocks | Drop indicator (blue line) shows | ☐ |
| 6.4 | Drop block in new position | Block moves to new position | ☐ |
| 6.5 | Press Escape while dragging | Drag is cancelled, block returns | ☐ |

**Notes:**
```
_________________________________
_________________________________
```

---

### 7. Reset Button
**Test:** Reset button → ça marche ?

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 7.1 | Edit content in editor | Content changes | ☐ |
| 7.2 | Click Reset button | Content reverts to original clipboard | ☐ |
| 7.3 | Verify original content | All edits are discarded | ☐ |

**Notes:**
```
_________________________________
_________________________________
```

---

## Additional Tests

### 8. Placeholder Text
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 8.1 | View empty editor | Placeholder text is visible | ☐ |
| 8.2 | Start typing | Placeholder disappears | ☐ |
| 8.3 | Delete all text | Placeholder reappears | ☐ |

### 9. Read-Only Mode
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 9.1 | Set readOnly=true | Editor displays content | ☐ |
| 9.2 | Try to edit | Editing is disabled | ☐ |
| 9.3 | Verify no toolbars | Formatting/Slash menus hidden | ☐ |

### 10. Feature Flag Toggle
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 10.1 | Add ?editor=new to URL | New NotionEditor loads | ☐ |
| 10.2 | Add ?editor=old to URL | Old NotionClipboardEditor loads | ☐ |
| 10.3 | Check console log | Correct editor version logged | ☐ |

---

## Regression Tests

Compare behavior between old and new editor:

| Feature | Old Editor | New Editor | Match? |
|---------|------------|------------|--------|
| Basic typing | ☐ | ☐ | ☐ |
| Bold formatting | ☐ | ☐ | ☐ |
| Italic formatting | ☐ | ☐ | ☐ |
| Slash commands | ☐ | ☐ | ☐ |
| HTML paste | ☐ | ☐ | ☐ |
| Image handling | ☐ | ☐ | ☐ |
| Block drag/drop | ☐ | ☐ | ☐ |

---

## Test Results Summary

**Date:** _______________
**Tester:** _______________
**Editor Version:** ☐ New ☐ Old

| Category | Tests Passed | Tests Failed | Notes |
|----------|--------------|--------------|-------|
| Basic Text Input | /5 | | |
| Text Formatting | /9 | | |
| Slash Commands | /17 | | |
| Image Upload | /4 | | |
| Copy/Paste HTML | /7 | | |
| Drag & Drop | /5 | | |
| Reset Button | /3 | | |
| **TOTAL** | **/50** | | |

---

## Bugs Found

| # | Description | Severity | Steps to Reproduce |
|---|-------------|----------|-------------------|
| 1 | | ☐ Critical ☐ Major ☐ Minor | |
| 2 | | ☐ Critical ☐ Major ☐ Minor | |
| 3 | | ☐ Critical ☐ Major ☐ Minor | |

---

## Sign-Off

☐ All critical tests pass
☐ No blocking bugs found
☐ Feature parity confirmed with old editor
☐ Ready for production

**Approved by:** _______________
**Date:** _______________

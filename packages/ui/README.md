# @notion-clipper/ui

🎨 **Professional UI Component Library** for Notion Clipper

A comprehensive, type-safe, and accessible React component library built with modern development practices and senior-level architecture patterns.

## 📦 Installation

```bash
npm install @notion-clipper/ui
# or
yarn add @notion-clipper/ui
# or
pnpm add @notion-clipper/ui
```

## 🚀 Quick Start

```tsx
import { Button, useNotifications, Layout } from '@notion-clipper/ui';
import '@notion-clipper/ui/styles';

function App() {
  const { showNotification } = useNotifications();
  
  return (
    <Layout>
      <Button 
        variant="primary" 
        onClick={() => showNotification('Hello World!', 'success')}
      >
        Click me
      </Button>
    </Layout>
  );
}
```

## 🏗️ Architecture

This package follows enterprise-grade architecture patterns:

### 📁 Structure

```
src/
├── lib/                    # Core business logic
│   ├── constants/         # Application constants
│   ├── types/            # TypeScript definitions
│   ├── utils/            # Utility functions
│   ├── validators/       # Validation schemas
│   ├── errors/           # Error handling
│   └── config/           # Configuration management
├── hooks/                 # React hooks (categorized)
│   ├── core/             # Application state hooks
│   ├── ui/               # UI state hooks
│   ├── data/             # Data management hooks
│   ├── interactions/     # User interaction hooks
│   └── utils/            # Utility hooks
├── components/           # React components (categorized)
│   ├── layout/           # Layout components
│   ├── common/           # Reusable UI components
│   ├── editor/           # Content editing components
│   ├── pages/            # Page-specific components
│   └── ...               # Other specialized components
└── styles/               # CSS and design tokens
    ├── base.css          # Reset and base styles
    ├── components.css    # Component styles
    ├── utilities.css     # Utility classes
    ├── themes.css        # Theme definitions
    ├── tokens.ts         # Design tokens
    └── mixins.ts         # CSS-in-JS mixins
```

### 🎯 Design Principles

- **Separation of Concerns**: Clear boundaries between UI, business logic, and data
- **Type Safety**: Comprehensive TypeScript coverage with strict typing
- **Accessibility**: WCAG 2.1 AA compliant components
- **Performance**: Optimized with React.memo, useMemo, and useCallback
- **Modularity**: Barrel exports with tree-shaking support
- **Consistency**: Design tokens and systematic approach to styling

## 🧩 Components

### Layout Components
- `Layout` - Main application layout
- `Header` - Application header with navigation
- `Sidebar` - Collapsible sidebar navigation
- `ResizableLayout` - Drag-to-resize layout panels
- `MinimalistView` - Compact view mode

### Common Components
- `Button` - Accessible button with variants
- `Modal` - Accessible modal dialogs
- `Tooltip` - Contextual tooltips
- `NotificationManager` - Toast notifications
- `LoadingSpinner` - Loading indicators
- `ErrorBoundary` - Error handling wrapper

### Specialized Components
- `ContentEditor` - Rich content editing
- `PageList` - Notion page browser
- `FileUploadZone` - Drag & drop file uploads
- `ConfigPanel` - Application settings
- `UnifiedWorkspace` - Main workspace interface

## 🪝 Hooks

### Core Hooks
- `useAppState` - Centralized application state
- `useAppInitialization` - App startup logic

### UI Hooks
- `useNotifications` - Toast notification system
- `useTheme` - Theme management (light/dark/system)
- `useWindowPreferences` - Window state management
- `useKeyboardShortcuts` - Keyboard shortcut handling

### Data Hooks
- `useConfig` - Configuration management
- `usePages` - Notion pages data
- `useClipboard` - Clipboard operations
- `useHistory` - Action history tracking
- `useQueue` - Background task queue

### Interaction Hooks
- `useContentHandlers` - Content editing logic
- `usePageHandlers` - Page selection logic
- `useFileUpload` - File upload management

## 🎨 Styling

### Design Tokens

```tsx
import { colors, spacing, typography } from '@notion-clipper/ui/lib';

// Use design tokens in your components
const styles = {
  padding: spacing[4],
  color: colors.primary[500],
  fontSize: typography.fontSize.base,
};
```

### CSS Custom Properties

```css
/* Available CSS variables */
:root {
  --color-primary: #0ea5e9;
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
  --color-muted: #f5f5f5;
  --color-border: #e5e5e5;
  /* ... and many more */
}
```

### Utility Classes

```tsx
// Use utility classes for rapid development
<div className="flex items-center gap-4 p-6 rounded-lg shadow-md">
  <Button className="btn-primary">Primary Action</Button>
</div>
```

## 🔧 Utilities

### Validation

```tsx
import { validators, FormValidator } from '@notion-clipper/ui/lib';

const formValidator = new FormValidator({
  email: validators.email,
  notionToken: validators.notionToken,
});

const result = formValidator.validate(formData);
```

### Error Handling

```tsx
import { errorManager, ClipperError } from '@notion-clipper/ui/lib';

// Register error handlers
errorManager.onError('NETWORK_ERROR', (error) => {
  console.error('Network error:', error);
});

// Throw typed errors
throw new ClipperError('Something went wrong', 'CUSTOM_ERROR');
```

### Utilities

```tsx
import { 
  cn, 
  formatFileSize, 
  debounce, 
  copyToClipboard 
} from '@notion-clipper/ui/lib';

// Combine classes with conflict resolution
const className = cn('btn', 'btn-primary', isLoading && 'opacity-50');

// Format file sizes
const size = formatFileSize(1024 * 1024); // "1.0 MB"

// Debounce functions
const debouncedSearch = debounce(searchFunction, 300);
```

## 🌙 Theming

### Theme Provider

```tsx
import { useTheme } from '@notion-clipper/ui';

function ThemeToggle() {
  const { theme, setTheme, actualTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Current: {actualTheme}
    </button>
  );
}
```

### Custom Themes

```css
/* Define custom theme */
[data-theme="custom"] {
  --color-primary: #your-color;
  --color-background: #your-bg;
  /* ... other variables */
}
```

## ♿ Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and roles
- **Focus Management**: Visible focus indicators
- **Color Contrast**: Meets contrast requirements
- **Reduced Motion**: Respects user preferences

## 🚀 Performance

- **Tree Shaking**: Import only what you need
- **Code Splitting**: Lazy loading support
- **Memoization**: Optimized re-renders
- **Bundle Size**: Minimal footprint

## 📚 API Reference

### Component Props

All components are fully typed with TypeScript. Use your IDE's IntelliSense for complete API documentation.

### Hook Returns

```tsx
// Example hook return type
interface UseNotificationsReturn {
  notifications: Notification[];
  showNotification: (message: string, type: NotificationType) => void;
  closeNotification: (id: string) => void;
}
```

## 🤝 Contributing

1. Follow the established architecture patterns
2. Add comprehensive TypeScript types
3. Include accessibility considerations
4. Write tests for new components/hooks
5. Update documentation

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ for the Notion Clipper project
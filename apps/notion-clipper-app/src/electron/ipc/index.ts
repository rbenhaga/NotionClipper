// Export all IPC handlers
export { default as registerClipboardIPC } from './clipboard.ipc';
export { default as registerConfigIPC } from './config.ipc';
export { default as registerContentIPC } from './content.ipc';
export { default as registerEventsIPC } from './events.ipc';
export { setupMultiWorkspaceInternalHandlers } from './multi-workspace-internal.ipc';
export { default as registerNotionIPC } from './notion.ipc';
export { default as registerPageIPC } from './page.ipc';
export { default as registerWindowIPC } from './window.ipc';
export { setupFocusModeIPC } from './focus-mode.ipc';
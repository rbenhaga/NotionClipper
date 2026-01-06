/**
 * Plate UI Components - Clean implementation using official Plate patterns
 * 
 * This replaces the custom draggable-elements.tsx with proper Plate UI components.
 * NO custom DnD wrappers - we use Plate's built-in DnD system.
 */

// Core blocks
export * from './paragraph-element';
export * from './heading-element';
export * from './blockquote-element';
export * from './code-block-element';
export * from './list-element';
export * from './hr-element';
export * from './link-element';
export * from './todo-element';

// Advanced blocks
export * from './table-element';
export * from './callout-element';
export * from './toggle-element';
export * from './mention-element';
export * from './image-element';

// UI components
export * from './floating-toolbar';
export * from './block-draggable';

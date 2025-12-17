/**
 * EditorArea - contentEditable region component
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 * - 11.1: Display content in a contenteditable div
 * - 11.2: Call onChange with updated content when user types
 * - 11.3: Handle paste events and convert HTML to Markdown
 * - 11.4: Call onDrop with files when files are dropped
 * - 11.5: Display placeholder when content is empty
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useImperativeHandle,
} from 'react';
import type { EditorAreaProps } from '../types';

/**
 * EditorArea - The main contentEditable editing region
 *
 * IMPORTANT: We do NOT use dangerouslySetInnerHTML on every render because
 * it would destroy the cursor position. Instead, we only set innerHTML
 * when the content changes externally (not from user input).
 */
export const EditorArea = forwardRef<HTMLDivElement, EditorAreaProps>(
  function EditorArea(
    { html, onChange, onKeyDown, onPaste, onDrop, placeholder },
    forwardedRef
  ) {
    // Track if the change came from user input
    const isUserInputRef = useRef(false);
    const lastHtmlRef = useRef(html);
    const internalRef = useRef<HTMLDivElement>(null);

    // Forward the internal ref to the parent
    useImperativeHandle(forwardedRef, () => internalRef.current!, []);

    // Handle input events
    const handleInput = useCallback(() => {
      isUserInputRef.current = true;
      onChange();
      // Reset after a tick to allow state updates
      requestAnimationFrame(() => {
        isUserInputRef.current = false;
      });
    }, [onChange]);

    // Only update innerHTML when content changes externally (not from user input)
    // This effect should NEVER run during user typing
    useEffect(() => {
      const element = internalRef.current;
      if (!element) return;

      // CRITICAL: Skip if this is a user input change
      // The isUserInputRef is set to true in handleInput and reset after a frame
      if (isUserInputRef.current) {
        lastHtmlRef.current = html;
        return;
      }

      // Only update if HTML actually changed from external source
      // AND the element doesn't have focus (user is not typing)
      const hasFocus = document.activeElement === element;
      if (html !== lastHtmlRef.current && !hasFocus) {
        element.innerHTML = html;
        lastHtmlRef.current = html;
      } else if (html !== lastHtmlRef.current && hasFocus) {
        // Element has focus but HTML changed - this is likely a race condition
        // Just update the ref to prevent future unnecessary updates
        lastHtmlRef.current = html;
      }
    }, [html]);

    // Set initial content on mount or when html changes and element is empty
    useEffect(() => {
      const element = internalRef.current;
      if (!element) return;

      // Only set initial content if element is empty or has just a <br>
      const isEmpty =
        !element.innerHTML || element.innerHTML === '<br>' || element.innerHTML === '';
      if (isEmpty && html) {
        element.innerHTML = html;
        lastHtmlRef.current = html;
      }
    }, [html]);

    return (
      <div
        ref={internalRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onDrop={onDrop}
        data-placeholder={placeholder}
        className="notion-editor-area"
        role="textbox"
        aria-multiline="true"
        aria-placeholder={placeholder}
        style={{
          minHeight: '100px',
          outline: 'none',
          padding: '16px 16px 16px 0', // No left padding - container handles it
          position: 'relative',
        }}
      />
    );
  }
);

export default EditorArea;

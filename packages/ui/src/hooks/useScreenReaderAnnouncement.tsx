/**
 * useScreenReaderAnnouncement - Hook for announcing messages to screen readers
 * 
 * Creates an ARIA live region for announcing dynamic content changes
 * to assistive technologies.
 * 
 * @module useScreenReaderAnnouncement
 * 
 * Requirements: 12.5
 */

import React, { useCallback, useRef, useEffect } from 'react';

/**
 * Politeness level for announcements
 * - 'polite': Waits for current speech to finish (default)
 * - 'assertive': Interrupts current speech immediately
 */
export type AnnouncementPoliteness = 'polite' | 'assertive';

/**
 * Hook for making screen reader announcements
 * 
 * Creates an invisible ARIA live region that announces messages
 * to screen readers when content changes.
 * 
 * @example
 * ```tsx
 * const { announce, AnnouncementRegion } = useScreenReaderAnnouncement();
 * 
 * // Announce a selection change
 * announce('Selected Notes section in Meeting Notes page');
 * 
 * // Render the announcement region (required)
 * return (
 *   <>
 *     <AnnouncementRegion />
 *     {/* rest of component *\/}
 *   </>
 * );
 * ```
 */
export function useScreenReaderAnnouncement() {
  const politeRef = useRef<HTMLDivElement | null>(null);
  const assertiveRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Announce a message to screen readers
   * 
   * @param message - The message to announce
   * @param politeness - 'polite' (default) or 'assertive'
   */
  const announce = useCallback((
    message: string, 
    politeness: AnnouncementPoliteness = 'polite'
  ) => {
    const ref = politeness === 'assertive' ? assertiveRef : politeRef;
    
    if (ref.current) {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Clear the region first to ensure the new message is announced
      ref.current.textContent = '';
      
      // Set the new message after a brief delay to ensure it's announced
      timeoutRef.current = setTimeout(() => {
        if (ref.current) {
          ref.current.textContent = message;
        }
      }, 100);
    }
  }, []);

  /**
   * Clear any pending announcements
   */
  const clearAnnouncement = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (politeRef.current) {
      politeRef.current.textContent = '';
    }
    if (assertiveRef.current) {
      assertiveRef.current.textContent = '';
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Component that renders the ARIA live regions
   * Must be included in the component tree for announcements to work
   */
  const AnnouncementRegion = useCallback(() => (
    <>
      {/* Polite announcements - waits for current speech */}
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />
      {/* Assertive announcements - interrupts current speech */}
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />
    </>
  ), []);

  return {
    announce,
    clearAnnouncement,
    AnnouncementRegion,
  };
}

export default useScreenReaderAnnouncement;

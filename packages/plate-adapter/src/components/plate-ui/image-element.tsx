/**
 * Image Element - Plate v52 component
 * 
 * Image style Notion avec support caption.
 */

import React from 'react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

interface ImageElementNode {
  type: string;
  url?: string;
  caption?: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  children: unknown[];
  [key: string]: unknown;
}

export function ImageElement(props: PlateElementProps) {
  const imageElement = props.element as ImageElementNode;
  const url = imageElement.url || '';
  const caption = imageElement.caption || '';
  const width = imageElement.width || '100%';
  const align = imageElement.align || 'center';

  const alignStyles: Record<string, React.CSSProperties> = {
    left: { marginRight: 'auto' },
    center: { marginLeft: 'auto', marginRight: 'auto' },
    right: { marginLeft: 'auto' },
  };

  return (
    <PlateElement {...props} as="div">
      <div
        className="slate-selectable"
        style={{
          margin: '16px 0',
          ...alignStyles[align],
          maxWidth: typeof width === 'number' ? `${width}px` : width,
        }}
      >
        <figure style={{ margin: 0 }}>
          {url ? (
            <img
              src={url}
              alt={caption || 'Image'}
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                borderRadius: '4px',
                cursor: 'default',
              }}
              contentEditable={false}
              draggable={false}
            />
          ) : (
            <div
              contentEditable={false}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                backgroundColor: 'rgba(55, 53, 47, 0.04)',
                borderRadius: '4px',
                color: 'rgba(55, 53, 47, 0.4)',
                fontSize: '14px',
              }}
            >
              📷 Add an image
            </div>
          )}
          
          {caption && (
            <figcaption
              style={{
                marginTop: '8px',
                textAlign: 'center',
                fontSize: '14px',
                color: 'rgba(55, 53, 47, 0.6)',
              }}
            >
              {caption}
            </figcaption>
          )}
        </figure>
        
        <span style={{ display: 'none' }}>{props.children}</span>
      </div>
    </PlateElement>
  );
}

/**
 * Media Embed Element - Pour vidéos, iframes, etc.
 */
export function MediaEmbedElement(props: PlateElementProps) {
  const embedElement = props.element as ImageElementNode;
  const url = embedElement.url || '';

  return (
    <PlateElement {...props} as="div">
      <div
        className="slate-selectable"
        style={{
          margin: '16px 0',
          position: 'relative',
          paddingBottom: '56.25%',
          height: 0,
          overflow: 'hidden',
          borderRadius: '4px',
        }}
      >
        {url ? (
          <iframe
            src={url}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            allowFullScreen
            title="Embedded content"
          />
        ) : (
          <div
            contentEditable={false}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(55, 53, 47, 0.04)',
              color: 'rgba(55, 53, 47, 0.4)',
              fontSize: '14px',
            }}
          >
            🎬 Add embed URL
          </div>
        )}
        
        <span style={{ display: 'none' }}>{props.children}</span>
      </div>
    </PlateElement>
  );
}

export default { ImageElement, MediaEmbedElement };

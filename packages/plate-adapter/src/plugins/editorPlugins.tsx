/**
 * Editor Plugins Configuration - Plate v52 (FULL @platejs/*)
 */

import React from 'react';
import { NodeIdPlugin, TrailingBlockPlugin } from 'platejs';
import { ParagraphPlugin } from 'platejs/react';
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
  BlockquotePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  HorizontalRulePlugin as BasicHrPlugin,
} from '@platejs/basic-nodes/react';
import { AutoformatPlugin } from '@platejs/autoformat';
import { ListPlugin } from '@platejs/list/react';
import { CodeBlockPlugin, CodeLinePlugin } from '@platejs/code-block/react';
import { LinkPlugin } from '@platejs/link/react';
import { IndentPlugin } from '@platejs/indent/react';
import { TablePlugin, TableRowPlugin, TableCellPlugin, TableCellHeaderPlugin } from '@platejs/table/react';
import { CalloutPlugin } from '@platejs/callout/react';
import { TogglePlugin } from '@platejs/toggle/react';
import { MentionPlugin, MentionInputPlugin } from '@platejs/mention/react';
import { ImagePlugin, MediaEmbedPlugin } from '@platejs/media/react';
import { DndPlugin } from '@platejs/dnd';
import { BlockSelectionPlugin, BlockSelectionAfterEditable } from '@platejs/selection/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { autoformatRules } from './autoformatRules';
import { ELEMENT_PARAGRAPH } from '../schema/platePlugins';
import { ParagraphElement } from '../components/plate-ui/paragraph-element';
import { Heading1Element, Heading2Element, Heading3Element } from '../components/plate-ui/heading-element';
import { BlockquoteElement } from '../components/plate-ui/blockquote-element';
import { BulletedListElement, NumberedListElement, ListItemElement, ListItemContentElement } from '../components/plate-ui/list-element';
import { CodeBlockElement, CodeLineElement } from '../components/plate-ui/code-block-element';
import { HorizontalRuleElement } from '../components/plate-ui/hr-element';
import { LinkElement } from '../components/plate-ui/link-element';
import { TodoElement } from '../components/plate-ui/todo-element';
import { TableElement, TableRowElement, TableCellElement, TableCellHeaderElement } from '../components/plate-ui/table-element';
import { CalloutElement } from '../components/plate-ui/callout-element';
import { ToggleElement } from '../components/plate-ui/toggle-element';
import { MentionElement, MentionInputElement } from '../components/plate-ui/mention-element';
import { ImageElement, MediaEmbedElement } from '../components/plate-ui/image-element';
import { BlockDraggable } from '../components/plate-ui/block-draggable';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPlugin = any;

export interface EditorPluginsOptions {
  enableAutoformat?: boolean;
  enableTrailingBlock?: boolean;
  enableIndent?: boolean;
  enableBlockSelection?: boolean;
  enableDnd?: boolean;
  enableTable?: boolean;
  enableCallout?: boolean;
  enableToggle?: boolean;
  enableMention?: boolean;
  enableImage?: boolean;
  enableEmbed?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withBlockDraggable = (Component: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function WrappedNode(props: any) {
    const element = props?.element;
    if (!element?.id) return <Component {...props} />;
    return (
      <BlockDraggable element={element}>
        <Component {...props} />
      </BlockDraggable>
    );
  };
};

const aboveSlate = ({ children }: { children: React.ReactNode }) => (
  <DndProvider backend={HTML5Backend}>{children}</DndProvider>
);

/** Map des composants pour createPlateEditor({ override: { components } }) */
export const editorComponents = {
  p: ParagraphElement,
  h1: Heading1Element,
  h2: Heading2Element,
  h3: Heading3Element,
  blockquote: BlockquoteElement,
  ul: BulletedListElement,
  ol: NumberedListElement,
  li: ListItemElement,
  lic: ListItemContentElement,
  code_block: CodeBlockElement,
  code_line: CodeLineElement,
  hr: HorizontalRuleElement,
  a: LinkElement,
  action_item: TodoElement,
  table: TableElement,
  tr: TableRowElement,
  td: TableCellElement,
  th: TableCellHeaderElement,
  callout: CalloutElement,
  toggle: ToggleElement,
  mention: MentionElement,
  mention_input: MentionInputElement,
  img: ImageElement,
  image: ImageElement,
  media_embed: MediaEmbedElement,
};

export function createEditorPlugins(options: EditorPluginsOptions = {}): AnyPlugin[] {
  const {
    enableAutoformat = true,
    enableTrailingBlock = true,
    enableIndent = true,
    enableBlockSelection = false,
    enableDnd = false,
    enableTable = true,
    enableCallout = true,
    enableToggle = true,
    enableMention = true,
    enableImage = true,
    enableEmbed = true,
  } = options;

  return [
    ParagraphPlugin,
    H1Plugin,
    H2Plugin,
    H3Plugin,
    BlockquotePlugin,
    ListPlugin,
    CodeBlockPlugin,
    CodeLinePlugin,
    BasicHrPlugin,
    LinkPlugin,
    ...(enableTable ? [TablePlugin, TableRowPlugin, TableCellPlugin, TableCellHeaderPlugin] : []),
    ...(enableCallout ? [CalloutPlugin] : []),
    ...(enableToggle ? [TogglePlugin] : []),
    ...(enableMention ? [MentionPlugin, MentionInputPlugin] : []),
    ...(enableImage ? [ImagePlugin] : []),
    ...(enableEmbed ? [MediaEmbedPlugin] : []),
    BoldPlugin,
    ItalicPlugin,
    UnderlinePlugin,
    StrikethroughPlugin,
    CodePlugin,
    ...(enableAutoformat ? [AutoformatPlugin.configure({ options: { rules: autoformatRules, enableUndoOnDelete: true } })] : []),
    ...(enableIndent ? [IndentPlugin.configure({ options: { offset: 24, unit: 'px' } })] : []),
    ...(enableTrailingBlock ? [TrailingBlockPlugin.configure({ options: { type: ELEMENT_PARAGRAPH } })] : []),
    NodeIdPlugin.configure({ options: { idKey: 'id', filterInline: true, reuseId: true } }),
    ...(enableBlockSelection ? [BlockSelectionPlugin.configure({ render: { afterEditable: BlockSelectionAfterEditable } })] : []),
    ...(enableDnd ? [DndPlugin.configure({ render: { aboveSlate, aboveNodes: withBlockDraggable }, options: { enableScroller: true } })] : []),
  ];
}

export const defaultEditorPlugins = createEditorPlugins();
export default createEditorPlugins;

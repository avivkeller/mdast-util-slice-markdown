import type { Node, Parent } from 'unist'
import type { Text, Code, InlineCode } from 'mdast'

/**
 * Configuration interface for controlling how AST nodes are sliced when they partially
 * overlap with the slice boundaries. This provides fine-grained control over the behavior
 * of different node types during the slicing process.
 */
export interface SliceConfig {
  /**
   * Configuration for handling nodes that are partially within the slice range.
   * These settings determine what happens when a node starts before the slice start
   * or ends after the slice end, meaning only part of the node's content would be
   * included in the slice.
   */
  partialNodes?: {
    /**
     * How to handle text nodes that cross slice boundaries.
     * - 'truncate': Cut the text at the exact slice boundaries, potentially splitting words
     * - 'include-full': Include the entire text node even if parts extend beyond boundaries
     * - 'exclude-full': Exclude the entire text node if any part extends beyond boundaries
     * @default 'truncate'
     */
    text?: 'truncate' | 'include-full' | 'exclude-full'

    /**
     * How to handle code blocks that cross slice boundaries.
     * Code blocks are typically multi-line and breaking them may destroy syntax.
     * - 'truncate': Cut the code at the exact slice boundaries
     * - 'include-full': Include the entire code block to preserve syntax integrity
     * - 'exclude-full': Exclude the entire code block if any part extends beyond boundaries
     * @default 'truncate'
     */
    code?: 'truncate' | 'include-full' | 'exclude-full'

    /**
     * How to handle inline code spans that cross slice boundaries.
     * Inline code is typically short and can be safely truncated.
     * - 'truncate': Cut the inline code at the exact slice boundaries
     * - 'include-full': Include the entire inline code span
     * - 'exclude-full': Exclude the entire inline code span if any part extends beyond boundaries
     * @default 'truncate'
     */
    inlineCode?: 'truncate' | 'include-full' | 'exclude-full'

    /**
     * How to handle formatting nodes (emphasis, strong, delete, underline) that cross boundaries.
     * - 'strip': Remove the formatting wrapper but keep the content
     * - 'preserve': Keep the formatting wrapper around the sliced content
     * - 'extend': Include the full formatted content even if it extends beyond boundaries
     * @default 'preserve'
     */
    formatting?: 'strip' | 'preserve' | 'extend'

    /**
     * How to handle media nodes (links, images) that cross slice boundaries.
     * - 'strip': Remove the media node entirely
     * - 'preserve': Keep the media node with sliced content
     * - 'content-only': Extract just the content without the media wrapper
     * @default 'preserve'
     */
    media?: 'strip' | 'preserve' | 'content-only'

    /**
     * How to handle block elements (paragraphs, headings, blockquotes, list items) that cross boundaries.
     * - 'include': Keep the block wrapper around the sliced content
     * - 'exclude': Remove the entire block if any part extends beyond boundaries
     * - 'unwrap': Extract the content without the block wrapper
     * @default 'include'
     */
    blocks?: 'include' | 'exclude' | 'unwrap'
  }

  /**
   * Configuration for text processing and normalization during slicing.
   * These options control how text content is cleaned up and formatted.
   */
  textHandling?: {
    /**
     * How to handle whitespace at slice boundaries.
     * When text is sliced, it may create awkward whitespace at the start or end.
     * - 'trim': Remove leading/trailing whitespace from sliced text
     * - 'preserve': Keep all whitespace exactly as it appears in the original
     * - 'normalize': Replace multiple consecutive whitespace characters with single spaces
     * @default 'trim'
     */
    boundaries?: 'trim' | 'preserve' | 'normalize'

    /**
     * Whether to merge adjacent text nodes after slicing.
     * Slicing can create multiple adjacent text nodes that should be combined.
     * For example, if a formatted span is stripped, it might leave two text nodes
     * next to each other that should be merged into one.
     * @default true
     */
    mergeAdjacent?: boolean

    /**
     * Whether to preserve line breaks within sliced text.
     * When text is sliced, line breaks might be at the boundaries.
     * This controls whether those line breaks are maintained.
     * @default true
     */
    preserveLineBreaks?: boolean
  }

  /**
   * Configuration for filtering different types of content during slicing.
   * These options control which auxiliary content is included in the slice.
   */
  content?: {
    /**
     * Whether to include invisible content (HTML comments, etc.).
     * Some content doesn't render visually but may be important for processing.
     * @default false
     */
    includeHidden?: boolean

    /**
     * Whether to include reference definitions.
     * Reference definitions are used by links and images but don't render directly.
     * Including them maintains the ability to resolve references in the sliced content.
     * @default false
     */
    includeReferences?: boolean

    /**
     * Whether to include footnote definitions.
     * Footnote definitions are referenced by footnotes but appear separately.
     * Including them maintains the ability to resolve footnotes in the sliced content.
     * @default false
     */
    includeFootnotes?: boolean
  }
}

/**
 * Result object returned by the slice function containing the sliced AST,
 * metadata about the slicing operation, and information about what was processed.
 */
export interface SliceResult {
  /**
   * The sliced AST node, or null if the slice resulted in no content.
   * This will be a new AST node with the same structure as the original
   * but containing only the content within the specified slice range.
   */
  node: Node | null

  /**
   * The actual character boundaries that were used for slicing.
   * These may differ from the requested boundaries if the end was beyond
   * the content length or if the start was adjusted.
   */
  boundaries: { start: number; end: number }

  /**
   * Metadata about the slicing operation providing insights into what was processed.
   */
  info: {
    /**
     * Total number of characters in the original AST tree before slicing.
     * This includes all text content, code content, and other character-based content.
     */
    originalLength: number

    /**
     * Total number of characters in the sliced result.
     * This will be less than or equal to originalLength.
     */
    slicedLength: number

    /**
     * Whether the slice operation encountered any nodes that were partially
     * within the slice range, requiring special handling based on the configuration.
     */
    hasPartialNodes: boolean

    /**
     * Array of node types that were modified during slicing.
     * This helps identify which types of content were affected by the slice boundaries.
     */
    modifiedNodeTypes: string[]
  }
}

/**
 * Default configuration used when no config is provided or when config properties are missing.
 * These defaults are designed to be safe and preserve content integrity while providing
 * reasonable behavior for most use cases.
 */
const DEFAULT_CONFIG: Required<SliceConfig> = {
  partialNodes: {
    text: 'truncate',
    code: 'truncate',
    inlineCode: 'truncate',
    formatting: 'preserve', // Maintains formatting around sliced content
    media: 'preserve', // Keeps links/images functional
    blocks: 'include', // Maintains document structure
  },
  textHandling: {
    boundaries: 'trim', // Removes awkward whitespace at boundaries
    mergeAdjacent: true, // Cleans up fragmented text nodes
    preserveLineBreaks: true, // Maintains text formatting
  },
  content: {
    includeHidden: false, // Excludes invisible content by default
    includeReferences: false, // Excludes reference definitions
    includeFootnotes: false, // Excludes footnote definitions
  },
}

/**
 * Type guard to check if a node is a Parent node (has children).
 * Parent nodes contain other nodes as children and need recursive processing.
 *
 * @param node - The node to check
 * @returns True if the node is a Parent with children array
 */
const isParent = (node: Node): node is Parent =>
  'children' in node && Array.isArray((node as any).children)

/**
 * Type guard to check if a node is a Text node.
 * Text nodes contain string content that contributes to the character count.
 *
 * @param node - The node to check
 * @returns True if the node is a Text node
 */
const isText = (node: Node): node is Text => node?.type === 'text'

/**
 * Type guard to check if a node is a Code node (code block).
 * Code blocks contain multi-line code content that contributes to the character count.
 *
 * @param node - The node to check
 * @returns True if the node is a Code node
 */
const isCode = (node: Node): node is Code => node?.type === 'code'

/**
 * Type guard to check if a node is an InlineCode node.
 * Inline code nodes contain short code snippets that contribute to the character count.
 *
 * @param node - The node to check
 * @returns True if the node is an InlineCode node
 */
const isInlineCode = (node: Node): node is InlineCode => node?.type === 'inlineCode'

/**
 * Type guard to check if a node is a formatting node.
 * Formatting nodes include emphasis, strong, delete, and underline.
 * These nodes wrap content to apply visual formatting.
 *
 * @param node - The node to check
 * @returns True if the node is a formatting node
 */
const isFormatting = (node: Node): boolean =>
  ['emphasis', 'strong', 'delete', 'underline'].includes(node?.type)

/**
 * Type guard to check if a node is a media node.
 * Media nodes include links, link references, images, and image references.
 * These nodes reference external resources or other parts of the document.
 *
 * @param node - The node to check
 * @returns True if the node is a media node
 */
const isMedia = (node: Node): boolean =>
  ['link', 'linkReference', 'image', 'imageReference'].includes(node?.type)

/**
 * Type guard to check if a node is a block element.
 * Block elements include paragraphs, headings, blockquotes, and list items.
 * These nodes typically create new lines and have semantic meaning.
 *
 * @param node - The node to check
 * @returns True if the node is a block element
 */
const isBlock = (node: Node): boolean =>
  ['paragraph', 'heading', 'blockquote', 'listItem'].includes(node?.type)

/**
 * Calculates the total character length of a node and all its descendants.
 * This is the core function for determining how much text content a node contains.
 * Only Text, Code, and InlineCode nodes contribute to the character count.
 *
 * @param node - The node to calculate length for
 * @returns The total number of characters in the node
 */
const calculateLength = (node: Node): number => {
  if ((node as Text).value) {
    return (node as Text).value.length
  }

  if (isParent(node)) {
    return node.children.reduce((sum, child) => sum + calculateLength(child), 0)
  }

  return 0
}

/**
 * WeakMap cache for storing calculated node lengths to avoid recalculation.
 * Since AST nodes are objects, we can use them as keys in a WeakMap.
 * This provides significant performance improvement for large documents
 * or when slicing multiple times from the same tree.
 */
const lengthCache = new WeakMap<Node, number>()

/**
 * Memoized version of calculateLength that caches results to improve performance.
 * The cache is automatically cleaned up when nodes are garbage collected
 * since we use a WeakMap.
 *
 * @param node - The node to get length for
 * @returns The cached or calculated length of the node
 */
const getLength = (node: Node): number => {
  if (!node) return 0

  if (lengthCache.has(node)) {
    return lengthCache.get(node)!
  }

  const length = calculateLength(node)
  lengthCache.set(node, length)
  return length
}

/**
 * Context object passed through the slicing process to maintain state.
 * This avoids passing multiple parameters to every function and provides
 * a centralized place to track slicing metadata.
 */
interface SliceContext {
  /** The starting character position of the slice */
  start: number

  /** The ending character position of the slice */
  end: number

  /** The resolved configuration with all defaults applied */
  config: Required<SliceConfig>

  /** Metadata collected during the slicing process */
  info: {
    /** Whether any nodes were partially within the slice range */
    hasPartialNodes: boolean

    /** Set of node types that were modified during slicing */
    modifiedNodeTypes: Set<string>
  }
}

/**
 * Slices a Text node according to the slice boundaries and configuration.
 * Text nodes are the most common type to slice since they contain the actual
 * content that users want to extract. This function handles boundary trimming,
 * partial node behavior, and whitespace normalization.
 *
 * @param node - The Text node to slice
 * @param nodeStart - The character position where this node starts in the document
 * @param context - The slicing context containing boundaries and configuration
 * @returns The sliced Text node or null if no content should be included
 */
const sliceNodeWithValue = (node: Text, nodeStart: number, context: SliceContext): Text | null => {
  const { start, end, config } = context
  const nodeEnd = nodeStart + node.value.length

  // Node is completely outside slice range
  if (nodeEnd <= start || nodeStart >= end) {
    return null
  }

  // Node is completely inside slice range
  if (nodeStart >= start && nodeEnd <= end) {
    return { ...node }
  }

  // Node is partially in slice range
  context.info.hasPartialNodes = true
  context.info.modifiedNodeTypes.add(node.type)

  const behavior = config.partialNodes[node.type] ?? config.partialNodes.text

  if (behavior === 'include-full') {
    return { ...node }
  }

  if (behavior === 'exclude-full') {
    return null
  }

  // behavior === 'truncate'
  const sliceStart = Math.max(0, start - nodeStart)
  const sliceEnd = Math.min(node.value.length, end - nodeStart)
  let slicedValue = node.value.slice(sliceStart, sliceEnd)

  const isCodeLike = isInlineCode(node) || isCode(node)

  // Apply boundary handling
  if (!isCodeLike) {
    if (config.textHandling.boundaries === 'trim') {
      const isAtStart = nodeStart === start
      const isAtEnd = nodeEnd === end

      if (!isAtStart && !isAtEnd) {
        slicedValue = slicedValue.trim()
      } else if (!isAtStart) {
        slicedValue = slicedValue.trimStart()
      } else if (!isAtEnd) {
        slicedValue = slicedValue.trimEnd()
      }
    } else if (config.textHandling.boundaries === 'normalize') {
      slicedValue = slicedValue.replace(/\s+/g, ' ')
    }
  }

  return slicedValue.length > 0 ? { ...node, value: slicedValue } : null
}

/**
 * Slices a formatting node (emphasis, strong, delete, underline) according to configuration.
 * Formatting nodes wrap other content to apply visual styling. The behavior depends on
 * the formatting configuration - they can be stripped (removing the formatting but keeping
 * content), preserved (keeping the formatting around sliced content), or extended
 * (including the full formatted content even if it extends beyond boundaries).
 *
 * @param node - The formatting node to slice
 * @param nodeStart - The character position where this node starts in the document
 * @param context - The slicing context containing boundaries and configuration
 * @returns The sliced node, array of nodes (if unwrapped), or null if excluded
 */
const sliceFormatting = (
  node: Node,
  nodeStart: number,
  context: SliceContext
): Node | Node[] | null => {
  const { start, end, config } = context
  const nodeLength = getLength(node)
  const nodeEnd = nodeStart + nodeLength

  // Node is completely outside slice range
  if (nodeEnd <= start || nodeStart >= end) {
    return null
  }

  // Node is completely inside slice range
  if (nodeStart >= start && nodeEnd <= end) {
    return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
  }

  // Node is partially in slice range
  context.info.hasPartialNodes = true
  context.info.modifiedNodeTypes.add(node.type)

  const behavior = config.partialNodes.formatting

  if (behavior === 'strip') {
    // Extract content without formatting
    if (isParent(node)) {
      const slicedParent = sliceParent(node, nodeStart, context)
      return slicedParent ? (slicedParent as Parent).children : null
    }
    return null
  }

  if (behavior === 'extend') {
    // Include the full formatted node
    return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
  }

  // behavior === 'preserve' - slice normally
  return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
}

/**
 * Slices a media node (link, linkReference, image, imageReference) according to configuration.
 * Media nodes reference external resources or other parts of the document. They can be
 * stripped (removed entirely), preserved (kept with sliced content), or converted to
 * content-only (extracting just the content without the media wrapper).
 *
 * @param node - The media node to slice
 * @param nodeStart - The character position where this node starts in the document
 * @param context - The slicing context containing boundaries and configuration
 * @returns The sliced node, array of nodes (if unwrapped), or null if excluded
 */
const sliceMedia = (node: Node, nodeStart: number, context: SliceContext): Node | Node[] | null => {
  const { start, end, config } = context
  const nodeLength = getLength(node)
  const nodeEnd = nodeStart + nodeLength

  // Node is completely outside slice range
  if (nodeEnd <= start || nodeStart >= end) {
    return null
  }

  // Node is completely inside slice range
  if (nodeStart >= start && nodeEnd <= end) {
    return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
  }

  // Node is partially in slice range
  context.info.hasPartialNodes = true
  context.info.modifiedNodeTypes.add(node.type)

  const behavior = config.partialNodes.media

  if (behavior === 'strip') {
    return null
  }

  if (behavior === 'content-only') {
    // Extract just the content, not the link/image wrapper
    if (isParent(node)) {
      const slicedParent = sliceParent(node, nodeStart, context)
      return slicedParent ? (slicedParent as Parent).children : null
    }
    return null
  }

  // behavior === 'preserve'
  return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
}

/**
 * Slices a block element (paragraph, heading, blockquote, listItem) according to configuration.
 * Block elements provide document structure and semantic meaning. They can be included
 * (kept with sliced content), excluded (removed entirely if partial), or unwrapped
 * (content extracted without the block wrapper).
 *
 * @param node - The block node to slice
 * @param nodeStart - The character position where this node starts in the document
 * @param context - The slicing context containing boundaries and configuration
 * @returns The sliced node, array of nodes (if unwrapped), or null if excluded
 */
const sliceBlock = (node: Node, nodeStart: number, context: SliceContext): Node | Node[] | null => {
  const { start, end, config } = context
  const nodeLength = getLength(node)
  const nodeEnd = nodeStart + nodeLength

  // Node is completely outside slice range
  if (nodeEnd <= start || nodeStart >= end) {
    return null
  }

  // Node is completely inside slice range
  if (nodeStart >= start && nodeEnd <= end) {
    return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
  }

  // Node is partially in slice range
  context.info.hasPartialNodes = true
  context.info.modifiedNodeTypes.add(node.type)

  const behavior = config.partialNodes.blocks

  if (behavior === 'exclude') {
    return null
  }

  if (behavior === 'unwrap') {
    // Extract content without block wrapper
    if (isParent(node)) {
      const slicedParent = sliceParent(node, nodeStart, context)
      return slicedParent ? (slicedParent as Parent).children : null
    }
    return null
  }

  // behavior === 'include'
  return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
}

/**
 * Slices a Parent node by recursively slicing all its children and rebuilding the parent.
 * This is the core recursive function that maintains the tree structure while slicing
 * individual nodes. It handles merging adjacent text nodes.
 *
 * @param node - The Parent node to slice
 * @param nodeStart - The character position where this node starts in the document
 * @param context - The slicing context containing boundaries and configuration
 * @returns The sliced Parent node or null if no content remains
 */
const sliceParent = (node: Parent, nodeStart: number, context: SliceContext): Parent | null => {
  const children: Node[] = []
  let childPosition = nodeStart

  for (const child of node.children) {
    const result = sliceNode(child, childPosition, context)
    const childLength = getLength(child)

    if (result) {
      if (Array.isArray(result)) {
        children.push(...result)
      } else {
        children.push(result)
      }
    }

    // Move to next child's position
    childPosition += childLength
  }

  // Merge adjacent text nodes if configured
  const finalChildren = context.config.textHandling.mergeAdjacent
    ? mergeAdjacentText(children)
    : children

  // Return null if no content remains
  if (finalChildren.length === 0) {
    return null
  }

  return { ...node, children: finalChildren }
}

/**
 * Main node slicing dispatcher that routes different node types to their specific handlers.
 * This function examines the node type and calls the appropriate slicing function.
 * It serves as the central routing point for all node types in the AST.
 *
 * @param node - The node to slice
 * @param nodeStart - The character position where this node starts in the document
 * @param context - The slicing context containing boundaries and configuration
 * @returns The sliced node, array of nodes, or null if excluded
 */
const sliceNode = (node: Node, nodeStart: number, context: SliceContext): Node | Node[] | null => {
  if ((node as Text).value) {
    return sliceNodeWithValue(node as Text, nodeStart, context)
  }

  if (isFormatting(node)) {
    return sliceFormatting(node, nodeStart, context)
  }

  if (isMedia(node)) {
    return sliceMedia(node, nodeStart, context)
  }

  if (isBlock(node)) {
    return sliceBlock(node, nodeStart, context)
  }

  if (isParent(node)) {
    return sliceParent(node, nodeStart, context)
  }

  // Default: include if overlaps with slice range
  const nodeLength = getLength(node)
  const nodeEnd = nodeStart + nodeLength
  const overlaps = nodeEnd > context.start && nodeStart < context.end

  return overlaps ? { ...node } : null
}

/**
 * Utility function to merge adjacent text nodes in an array.
 * When nodes are sliced or unwrapped, multiple text nodes may end up adjacent
 * to each other. This function combines them into single text nodes for cleaner
 * output and better performance in subsequent processing.
 *
 * @param nodes - Array of nodes that may contain adjacent text nodes
 * @returns Array of nodes with adjacent text nodes merged
 */
const mergeAdjacentText = (nodes: Node[]): Node[] => {
  const result: Node[] = []

  for (const node of nodes) {
    const last = result[result.length - 1]

    if (last && isText(last) && isText(node)) {
      const merged: Text = {
        ...last,
        value: last.value + node.value,
      }
      result[result.length - 1] = merged
    } else {
      result.push(node)
    }
  }

  return result
}

/**
 * Main slice function that extracts a portion of an AST tree based on character positions.
 * This is the primary entry point for slicing operations. It validates input parameters,
 * applies default configuration, sets up the slicing context, and orchestrates the
 * recursive slicing process.
 *
 * @param tree - The root AST node to slice from
 * @param start - The starting character position (inclusive)
 * @param end - The ending character position (exclusive). If undefined, slices to the end
 * @param config - Optional configuration to customize slicing behavior
 * @returns A SliceResult containing the sliced AST and metadata
 */
export const slice = (
  tree: Node,
  start: number,
  end?: number,
  config: SliceConfig = {}
): SliceResult => {
  if (!tree || start < 0) {
    return {
      node: null,
      boundaries: { start: 0, end: 0 },
      info: {
        originalLength: 0,
        slicedLength: 0,
        hasPartialNodes: false,
        modifiedNodeTypes: [],
      },
    }
  }

  const resolvedConfig = { ...DEFAULT_CONFIG, ...config } as Required<SliceConfig>
  const originalLength = getLength(tree)
  const actualEnd = end !== undefined ? Math.min(end, originalLength) : originalLength

  if (start >= actualEnd) {
    return {
      node: null,
      boundaries: { start, end: actualEnd },
      info: {
        originalLength,
        slicedLength: 0,
        hasPartialNodes: false,
        modifiedNodeTypes: [],
      },
    }
  }

  const context: SliceContext = {
    start,
    end: actualEnd,
    config: resolvedConfig,
    info: {
      hasPartialNodes: false,
      modifiedNodeTypes: new Set(),
    },
  }

  const result = sliceNode(tree, 0, context)
  const finalNode = Array.isArray(result) ? null : result // Flatten arrays at root level

  return {
    node: finalNode,
    boundaries: { start, end: actualEnd },
    info: {
      originalLength,
      slicedLength: finalNode ? getLength(finalNode) : 0,
      hasPartialNodes: context.info.hasPartialNodes,
      modifiedNodeTypes: Array.from(context.info.modifiedNodeTypes),
    },
  }
}

/**
 * Utility function to calculate the total character length of an AST tree.
 * This is a convenience function that wraps the internal getLength function
 * for external use. It calculates the total number of characters that would
 * be present if the tree were rendered as plain text.
 *
 * @param tree - The AST node to calculate length for
 * @returns The total number of characters in the tree
 */
export const length = (tree: Node): number => getLength(tree)

/**
 * Utility function to find all positions where a search string appears in the AST tree.
 * This function traverses the tree and looks for the search string in all text content
 * (text nodes, code blocks, and inline code). It returns an array of character positions
 * where the search string begins.
 *
 * @param tree - The AST node to search in
 * @param searchText - The string to search for
 * @returns Array of character positions where the search string was found
 */
export const findText = (tree: Node, searchText: string): number[] => {
  if (searchText.length < 1) {
    return []
  }

  const positions: number[] = []
  let offset = 0

  const traverse = (node: Node) => {
    if (isText(node)) {
      let index = 0
      while ((index = node.value.indexOf(searchText, index)) !== -1) {
        positions.push(offset + index)
        index++
      }
      offset += node.value.length
    } else if (isCode(node) || isInlineCode(node)) {
      let index = 0
      while ((index = node.value.indexOf(searchText, index)) !== -1) {
        positions.push(offset + index)
        index++
      }
      offset += node.value.length
    } else if (isParent(node)) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  traverse(tree)
  return positions
}

/**
 * Preset configurations for common slicing scenarios.
 * These presets provide pre-configured SliceConfig objects for typical use cases,
 * making it easier to get started with slicing without having to understand all
 * the configuration options.
 */
export const presets = {
  /**
   * Clean text extraction preset - removes all formatting and structure.
   * This preset is ideal for extracting plain text content for search indexing,
   * text analysis, or other scenarios where formatting is not needed.
   * - Strips all formatting nodes (emphasis, strong, etc.)
   * - Extracts content from media nodes without the media wrapper
   * - Unwraps block elements to get just the content
   * - Trims whitespace at boundaries
   * - Merges adjacent text nodes for cleaner output
   */
  textOnly: {
    partialNodes: {
      formatting: 'strip' as const,
      media: 'content-only' as const,
      blocks: 'unwrap' as const,
    },
    textHandling: {
      boundaries: 'trim' as const,
      mergeAdjacent: true,
    },
  },

  /**
   * Structured preservation preset - maintains document structure gracefully.
   * This preset is ideal for creating excerpts or previews while maintaining
   * the semantic structure of the document.
   * - Truncates text at exact boundaries
   * - Preserves formatting around sliced content
   * - Includes block elements with sliced content
   */
  structured: {
    partialNodes: {
      text: 'truncate' as const,
      formatting: 'preserve' as const,
      blocks: 'include' as const,
    },
  },

  /**
   * Inclusive preset - includes full nodes even if they extend beyond boundaries.
   * This preset is ideal when you want to ensure no content is cut off awkwardly
   * and prefer to include complete elements even if they extend beyond the slice.
   * - Includes full text nodes even if they extend beyond boundaries
   * - Includes full code blocks to preserve syntax
   * - Extends formatting to include complete formatted content
   * - Includes block elements with all their content
   */
  inclusive: {
    partialNodes: {
      text: 'include-full' as const,
      code: 'include-full' as const,
      formatting: 'extend' as const,
      blocks: 'include' as const,
    },
  },

  /**
   * Conservative preset - excludes partial content when uncertain.
   * This preset is ideal when you want to be very strict about boundaries
   * and prefer to exclude content rather than include it partially.
   * - Truncates text at exact boundaries
   * - Excludes code blocks that extend beyond boundaries
   * - Strips formatting from partial content
   * - Excludes block elements that extend beyond boundaries
   */
  conservative: {
    partialNodes: {
      text: 'truncate' as const,
      code: 'exclude-full' as const,
      formatting: 'strip' as const,
      blocks: 'exclude' as const,
    },
  },
} as const

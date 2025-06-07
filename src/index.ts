import type { Node, Parent } from 'unist'
import type { RootContent, Text } from 'mdast'

/**
 * Configuration options for slicing markdown AST nodes
 */
export interface SliceOptions {
  /**
   * Defines how different markdown elements should be handled when they're partially included in a slice
   * - preserve: Keep the element with its formatting intact
   * - trim: Trim the text content
   * - exclude: Remove the element entirely from the result
   * - content: Extract only the visible content (for links, references)
   */
  behavior?: {
    link?: 'preserve' | 'trim' | 'exclude' | 'content'
    emphasis?: 'preserve' | 'trim' | 'exclude' | 'content'
    strong?: 'preserve' | 'trim' | 'exclude' | 'content'
    delete?: 'preserve' | 'trim' | 'exclude' | 'content'
    inlineCode?: 'preserve' | 'trim' | 'exclude'
    code?: 'preserve' | 'trim' | 'exclude'
    image?: 'preserve' | 'trim' | 'exclude'
    imageReference?: 'preserve' | 'trim' | 'exclude'
    linkReference?: 'preserve' | 'trim' | 'exclude' | 'content'
  }
  /** Whether to preserve empty block elements after slicing (default: true) */
  preserveBlocks?: boolean
  /** Whether to trim whitespace at slice boundaries (default: true) */
  trimWhitespace?: boolean
}

/**
 * Internal type representing fully resolved options with all defaults applied
 */
interface ResolvedOptions extends Required<Omit<SliceOptions, 'behavior'>> {
  behavior: Required<NonNullable<SliceOptions['behavior']>>
}

/**
 * Default behavior settings for different markdown elements
 * Most formatting elements default to "content" to extract readable text
 * Code and images default to "preserve" to maintain their structure
 */
const DEFAULT_BEHAVIOR = Object.freeze({
  link: 'content' as const,
  emphasis: 'content' as const,
  strong: 'content' as const,
  delete: 'content' as const,
  inlineCode: 'preserve' as const,
  code: 'preserve' as const,
  image: 'preserve' as const,
  imageReference: 'preserve' as const,
  linkReference: 'content' as const,
})

/**
 * Node types that can contain children and should be processed recursively
 */
const PARENT_TYPES = new Set(['root', 'paragraph', 'heading', 'blockquote', 'listItem'])

/**
 * Formatting node types that have configurable behavior options
 */
const FORMATTING_TYPES = new Set(['emphasis', 'strong', 'delete', 'link', 'linkReference'])

/**
 * Node types that represent single characters or line breaks in the text flow
 */
const ATOMIC_TYPES = new Set(['break', 'thematicBreak'])

/**
 * Image node types that are treated as single units
 */
const IMAGE_TYPES = new Set(['image', 'imageReference'])

/**
 * Cache for storing calculated node lengths to avoid repeated calculations
 */
const NODE_LENGTH_CACHE = new WeakMap<Node, number>()

/**
 * Extracts a portion of a markdown AST tree based on character positions
 *
 * @param tree - The root node of the markdown AST to slice
 * @param start - Starting character position (inclusive)
 * @param end - Ending character position (exclusive). If undefined, slices to the end of the tree
 * @param options - Configuration options for slicing behavior
 * @returns The sliced portion of the tree, or null if the slice is empty
 */
export function sliceMarkdown(
  tree: Node,
  start: number,
  end?: number,
  options: SliceOptions = {}
): Node | null {
  // Handle empty tree case
  if (!tree) {
    return null
  }

  const treeLength = getNodeLength(tree)

  // Handle empty tree content
  if (treeLength === 0) {
    return start === 0 ? tree : null
  }

  // Validate and normalize input parameters
  if (start < 0) throw new Error('Start position must be non-negative')
  if (!Number.isInteger(start)) {
    throw new Error('Start position must be an integer')
  }

  // Normalize end position
  const normalizedEnd = end === undefined ? treeLength : end

  if (end !== undefined) {
    if (end < 0) throw new Error('End position must be non-negative')
    if (!Number.isInteger(end)) {
      throw new Error('End position must be an integer')
    }
    if (end <= start) {
      throw new Error('End position must be greater than start')
    }
  }

  // Handle cases where start is beyond the tree length
  if (start >= treeLength) {
    return null
  }

  // Clamp end position to tree length
  const effectiveEnd = Math.min(normalizedEnd, treeLength)

  // Handle empty slice
  if (start >= effectiveEnd) {
    return null
  }

  // Merge user options with defaults
  const resolvedOptions: ResolvedOptions = {
    behavior: Object.assign({}, DEFAULT_BEHAVIOR, options.behavior),
    preserveBlocks: options.preserveBlocks ?? true,
    trimWhitespace: options.trimWhitespace ?? false,
  }

  // Track current position while traversing the tree
  let position = 0

  /**
   * Recursively processes a node and its children, extracting the portion that falls within the slice range
   */
  function slice(node: Node): Node | Node[] | null {
    const nodeStart = position
    const nodeLength = getNodeLength(node)
    const nodeEnd = nodeStart + nodeLength

    // Skip nodes that don't overlap with the slice range
    if (nodeEnd <= start || nodeStart >= effectiveEnd) {
      position = nodeEnd
      return null
    }

    // Process the node based on its type
    const result = sliceByType(node, nodeStart, nodeEnd)
    position = nodeEnd
    return result
  }

  /**
   * Routes nodes to appropriate slicing functions based on their type
   */
  function sliceByType(node: Node, nodeStart: number, nodeEnd: number): Node | Node[] | null {
    const type = node.type

    // Handle text nodes directly
    if (type === 'text') {
      return sliceText(node as Text, nodeStart, nodeEnd)
    }

    // Handle container nodes that can have children
    if (PARENT_TYPES.has(type)) {
      return sliceParent(node as Parent, nodeStart)
    }

    // Lists need special handling to remove empty items
    if (type === 'list') {
      return sliceList(node as Parent, nodeStart)
    }

    // Handle formatting nodes with configurable behavior
    if (FORMATTING_TYPES.has(type)) {
      return sliceFormattingNode(
        node as Parent,
        type as keyof ResolvedOptions['behavior'],
        nodeStart,
        nodeEnd
      )
    }

    // Handle inline code with special behavior
    if (type === 'inlineCode') {
      return sliceInlineCode(node as any, nodeStart, nodeEnd)
    }

    // Handle code blocks with special behavior
    if (type === 'code') {
      return sliceCodeBlock(node as any, nodeStart, nodeEnd)
    }

    // Handle image nodes as atomic units
    if (IMAGE_TYPES.has(type)) {
      return sliceImageNode(node, nodeStart, nodeEnd)
    }

    // Handle line breaks and other atomic elements
    if (ATOMIC_TYPES.has(type)) {
      return sliceAtomicNode(node, nodeStart, nodeEnd)
    }

    // Fallback: treat unknown types as parents if they have children, otherwise ignore
    return isParent(node) ? sliceParent(node, nodeStart) : null
  }

  /**
   * Processes parent nodes by recursively slicing their children
   */
  function sliceParent(node: Parent, nodeStart: number): Parent | null {
    const savedPosition = position
    position = nodeStart

    const children = node.children
    const slicedChildren: RootContent[] = []

    // Process each child node
    for (let i = 0; i < children.length; i++) {
      const result = slice(children[i])
      if (result) {
        // Handle cases where slicing returns multiple nodes
        if (Array.isArray(result)) {
          slicedChildren.push(...(result as RootContent[]))
        } else {
          slicedChildren.push(result as RootContent)
        }
      }
    }

    position = savedPosition

    // Return null for empty blocks if preserveBlocks is false
    if (slicedChildren.length === 0 && !resolvedOptions.preserveBlocks) {
      return null
    }

    // Create a new node with the sliced children
    return Object.assign({}, node, { children: slicedChildren }) as Parent
  }

  /**
   * Processes list nodes, ensuring empty lists are removed
   */
  function sliceList(node: Parent, nodeStart: number): Parent | null {
    const result = sliceParent(node, nodeStart)
    // Only return lists that have remaining children
    return result?.children.length ? result : null
  }

  /**
   * Processes text nodes by extracting the substring within the slice range
   */
  function sliceText(node: Text, nodeStart: number, nodeEnd: number): Text | null {
    // Skip text nodes that don't overlap with the slice
    if (nodeEnd <= start || nodeStart >= effectiveEnd) {
      return null
    }

    const value = node.value

    // Handle empty text nodes
    if (value.length === 0) {
      // Return empty text node if it's within the slice range
      return nodeStart >= start && nodeEnd <= effectiveEnd ? node : null
    }

    // Calculate which part of the text to extract
    const sliceStart = Math.max(0, start - nodeStart)
    const sliceEnd = Math.min(value.length, effectiveEnd - nodeStart)

    let slicedValue = value.slice(sliceStart, sliceEnd)

    // Apply whitespace trimming at slice boundaries
    if (resolvedOptions.trimWhitespace && slicedValue) {
      const isAtStart = nodeStart >= start
      const isAtEnd = nodeEnd <= effectiveEnd

      // Only trim whitespace at actual slice boundaries, not in the middle of text
      if (!isAtStart && !isAtEnd) {
        // Don't trim if this text spans across the slice boundaries
      } else if (!isAtStart) {
        // Trim leading whitespace if we're starting mid-text
        slicedValue = slicedValue.trimStart()
      } else if (!isAtEnd) {
        // Trim trailing whitespace if we're ending mid-text
        slicedValue = slicedValue.trimEnd()
      }
    }

    return slicedValue.length === 0 && value.length > 0
      ? null
      : Object.assign({}, node, { value: slicedValue })
  }

  /**
   * Handles formatting nodes (emphasis, strong, links, etc.) based on configured behavior
   */
  function sliceFormattingNode(
    node: Parent,
    type: keyof ResolvedOptions['behavior'],
    nodeStart: number,
    nodeEnd: number
  ): Node | Node[] | null {
    const behavior = resolvedOptions.behavior[type] as string

    // Check if the slice overlaps with this node
    const overlapsStart = nodeStart < effectiveEnd && nodeEnd > start
    if (!overlapsStart) {
      return null
    }

    // Determine if this is a partial slice (node extends beyond slice boundaries)
    const isPartial = nodeStart < start || nodeEnd > effectiveEnd

    // For complete slices or preserve/content behaviors, process normally
    if (!isPartial || behavior === 'preserve' || behavior === 'content') {
      return sliceParent(node, nodeStart)
    }

    // Handle partial slices based on behavior setting
    switch (behavior) {
      case 'exclude':
        // Remove the entire element
        return null
      case 'trim': {
        // Remove the formatting but keep the content
        const children = sliceParent(node, nodeStart)
        return children?.children ?? null
      }
      default:
        // Fallback to normal processing
        return sliceParent(node, nodeStart)
    }
  }

  /**
   * Handles inline code elements with special behavior for partial slices
   */
  function sliceInlineCode(
    node: { type: 'inlineCode'; value: string },
    nodeStart: number,
    nodeEnd: number
  ): any | null {
    const behavior = resolvedOptions.behavior.inlineCode

    if (nodeEnd <= start || nodeStart >= effectiveEnd) return null

    const isPartial = nodeStart < start || nodeEnd > effectiveEnd

    // For complete slices or preserve behavior, keep the node intact
    if (!isPartial || behavior === 'preserve') return node

    // For exclude behavior, remove the node entirely
    if (behavior === 'exclude') return null

    // For trim behavior, extract just the text content
    const value = node.value

    // Handle empty inline code
    if (value.length === 0) {
      return node
    }

    const sliceStart = Math.max(0, start - nodeStart)
    const sliceEnd = Math.min(value.length, effectiveEnd - nodeStart)
    const slicedValue = value.slice(sliceStart, sliceEnd)

    return Object.assign({}, node, { value: slicedValue })
  }

  /**
   * Handles code block elements with special behavior for partial slices
   */
  function sliceCodeBlock(
    node: { type: 'code'; value: string; lang?: string; meta?: string },
    nodeStart: number,
    nodeEnd: number
  ): any | null {
    const behavior = resolvedOptions.behavior.code

    if (nodeEnd <= start || nodeStart >= effectiveEnd) return null

    const isPartial = nodeStart < start || nodeEnd > effectiveEnd

    // For complete slices or preserve behavior, keep the node intact
    if (!isPartial || behavior === 'preserve') return node

    // For exclude behavior, remove the node entirely
    if (behavior === 'exclude') return null

    // For trim behavior, extract just the code content
    const value = node.value

    // Handle empty code blocks
    if (value.length === 0) {
      return node
    }

    const sliceStart = Math.max(0, start - nodeStart)
    const sliceEnd = Math.min(value.length, effectiveEnd - nodeStart)
    const slicedValue = value.slice(sliceStart, sliceEnd)

    return Object.assign({}, node, { value: slicedValue })
  }

  /**
   * Handles image nodes, which are treated as atomic units
   */
  function sliceImageNode(node: Node, nodeStart: number, nodeEnd: number): Node | null {
    if (nodeEnd <= start || nodeStart >= effectiveEnd) return null

    const behavior = resolvedOptions.behavior[node.type as 'image' | 'imageReference']
    const isPartial = nodeStart < start || nodeEnd > effectiveEnd

    // Images are only included if they're completely within the slice or preserve behavior is set
    return !isPartial || behavior === 'preserve' ? node : null
  }

  /**
   * Handles atomic nodes like line breaks that represent single characters
   */
  function sliceAtomicNode(node: Node, nodeStart: number, nodeEnd: number): Node | null {
    // Include atomic nodes if they overlap with the slice range
    return nodeEnd > start && nodeStart < effectiveEnd ? node : null
  }

  // Start the slicing process from the root
  const result = slice(tree) as Node | null
  return result
}

/**
 * Calculates the character length of a node, including all its children
 * Uses caching to avoid recalculating lengths for the same nodes
 */
function getNodeLength(node: Node): number {
  // Check if we've already calculated this node's length
  let length = NODE_LENGTH_CACHE.get(node)
  if (length !== undefined) return length

  const type = node.type

  // Calculate length based on node type
  if (type === 'text' || type === 'inlineCode') {
    // Text nodes and inline code contribute their string length (including empty strings)
    length = (node as any).value.length
  } else if (type === 'code') {
    // Code blocks contribute their content length (including empty strings)
    length = (node as any).value.length
  } else if (isParent(node)) {
    // For parent nodes, sum the lengths of all children
    const children = (node as Parent).children
    length = 0
    for (let i = 0; i < children.length; i++) {
      length += getNodeLength(children[i])
    }
  } else {
    // Unknown node types contribute 0 length
    length = 0
  }

  // Cache the result for future use
  NODE_LENGTH_CACHE.set(node, length!)
  return length!
}

/**
 * Type guard to check if a node can contain children
 */
function isParent(node: Node): node is Parent {
  return 'children' in node
}

/**
 * Gets the total character length of an entire markdown tree
 */
export function getTreeLength(tree: Node): number {
  return getNodeLength(tree)
}

/**
 * Finds all character positions where a specific text string occurs in the tree
 * Returns an array of starting positions for each occurrence
 */
export function findTextPositions(tree: Node, searchText: string): number[] {
  const positions: number[] = []
  let currentPosition = 0

  // Handle empty search text
  if (searchText.length === 0) {
    return []
  }

  const searchLength = searchText.length

  function traverse(node: Node): void {
    if (node.type === 'text') {
      const text = (node as Text).value

      // Handle empty text nodes
      if (text.length === 0) {
        // Empty text nodes don't contain any searchable content
        return
      }

      let index = 0

      // Find all occurrences of the search text in this text node
      while ((index = text.indexOf(searchText, index)) !== -1) {
        positions.push(currentPosition + index)
        index += searchLength // Move past this occurrence to find the next one
      }
      currentPosition += text.length
    } else if (isParent(node)) {
      // Recursively search in child nodes
      const children = node.children
      for (let i = 0; i < children.length; i++) {
        traverse(children[i])
      }
    } else {
      // Advance position for non-text nodes
      currentPosition += getNodeLength(node)
    }
  }

  traverse(tree)
  return positions
}

/**
 * Finds the character position range of a specific node within the tree
 * Returns null if the node is not found in the tree
 */
export function getNodePosition(
  tree: Node,
  targetNode: Node
): { start: number; end: number } | null {
  let currentPosition = 0

  function traverse(node: Node): { start: number; end: number } | null {
    // Check if this is the node we're looking for
    if (node === targetNode) {
      return {
        start: currentPosition,
        end: currentPosition + getNodeLength(node),
      }
    }

    const nodeStart = currentPosition

    // Search in child nodes if this is a parent
    if (isParent(node)) {
      const children = node.children
      for (let i = 0; i < children.length; i++) {
        const result = traverse(children[i])
        if (result) return result // Found the target node in a child
      }
    }

    // Update position to the end of this node
    currentPosition = nodeStart + getNodeLength(node)
    return null
  }

  return traverse(tree)
}

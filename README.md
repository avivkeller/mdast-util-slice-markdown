# `mdast-util-slice-markdown`

A powerful, highly configurable TypeScript library for slicing markdown Abstract Syntax Trees (AST) by character position.

## Installation

```bash
npm install mdast-util-slice-markdown
```

## Quick Start

```typescript
import { slice } from 'mdast-util-slice-markdown'

// Basic text slicing
const textNode = { type: 'text', value: 'Hello world!' }
const result = slice(textNode, 2, 8)
console.log(result.node.value) // "llo wo"

// Slice with formatting preservation
const paragraph = {
  type: 'paragraph',
  children: [
    { type: 'text', value: 'Start ' },
    { type: 'emphasis', children: [{ type: 'text', value: 'italic' }] },
    { type: 'text', value: ' end' },
  ],
}

const sliced = slice(paragraph, 6, 12)
// Preserves emphasis formatting within the slice
```

## Core API

### `slice(tree, start, end?, config?)`

Slice a markdown AST from start to end position.

```typescript
function slice(tree: Node, start: number, end?: number, config?: SliceConfig): SliceResult
```

**Parameters:**

- `tree`: The markdown AST node to slice
- `start`: Starting character position (inclusive)
- `end`: Ending character position (exclusive). If omitted, slices to end
- `config`: Optional configuration object

**Returns:** A `SliceResult` object with:

- `node`: The sliced AST node (or null)
- `boundaries`: Actual slice boundaries
- `info`: Detailed information about the operation

### `length(tree)`

Calculate the total character length of a markdown tree.

```typescript
function length(tree: Node): number
```

### `findText(tree, searchText)`

Find all character positions where text occurs in the tree.

```typescript
function findText(tree: Node, searchText: string): number[]
```

## Configuration Options

### Partial Node Handling

Control how nodes that cross slice boundaries are handled:

```typescript
const config = {
  partialNodes: {
    text: 'truncate', // 'truncate' | 'include-full' | 'exclude-full'
    code: 'include-full', // 'truncate' | 'include-full' | 'exclude-full'
    inlineCode: 'truncate', // 'truncate' | 'include-full' | 'exclude-full'
    formatting: 'preserve', // 'strip' | 'preserve' | 'extend'
    media: 'preserve', // 'strip' | 'preserve' | 'content-only'
    blocks: 'include', // 'include' | 'exclude' | 'unwrap'
  },
}
```

**Text/Code Options:**

- `truncate`: Cut the text at slice boundaries
- `include-full`: Include the entire node even if partially outside
- `exclude-full`: Exclude the entire node if partially outside

**Formatting Options:**

- `strip`: Remove formatting, keep content
- `preserve`: Keep formatting as-is
- `extend`: Extend formatting to cover slice boundaries

**Media Options:**

- `strip`: Remove links/images entirely
- `preserve`: Keep links/images intact
- `content-only`: Extract link text without the link

**Block Options:**

- `include`: Include the block container
- `exclude`: Exclude blocks that cross boundaries
- `unwrap`: Remove block wrapper, keep content

### Text Handling

Fine-tune text processing:

```typescript
const config = {
  textHandling: {
    boundaries: 'trim', // 'trim' | 'preserve' | 'normalize'
    mergeAdjacent: true, // Merge adjacent text nodes
    preserveLineBreaks: true, // Keep line breaks in text
  },
}
```

### Content Filtering

Control what content to include:

```typescript
const config = {
  content: {
    includeHidden: false, // Include HTML comments, etc.
    includeReferences: false, // Include reference definitions
    includeFootnotes: false, // Include footnote definitions
  },
}
```

## Preset Configurations

### Text-Only Extraction

Extract clean text without any formatting:

```typescript
import { presets } from 'mdast-util-slice-markdown'

const result = slice(tree, 10, 50, presets.textOnly)
```

### Structured Slicing

Preserve structure while handling partials gracefully:

```typescript
const result = slice(tree, 10, 50, presets.structured)
```

### Inclusive Slicing

Include full nodes even if partially outside slice:

```typescript
const result = slice(tree, 10, 50, presets.inclusive)
```

### Conservative Slicing

Exclude partials when in doubt:

```typescript
const result = slice(tree, 10, 50, presets.conservative)
```

## Examples

### Basic Text Slicing

```typescript
const textNode = { type: 'text', value: 'Hello, world!' }
const result = slice(textNode, 7, 12)
console.log(result.node.value) // "world"
```

### Slicing with Formatting

```typescript
const paragraph = {
  type: 'paragraph',
  children: [
    { type: 'text', value: 'This is ' },
    { type: 'emphasis', children: [{ type: 'text', value: 'emphasized' }] },
    { type: 'text', value: ' text.' },
  ],
}

// Preserve emphasis formatting
const result = slice(paragraph, 5, 15, {
  partialNodes: { formatting: 'preserve' },
})

// Strip formatting, keep content only
const textOnly = slice(paragraph, 5, 15, {
  partialNodes: { formatting: 'strip' },
})
```

### Code Block Handling

```typescript
const codeBlock = {
  type: 'code',
  value: 'function hello() {\n  console.log("world");\n}',
  lang: 'javascript',
}

// Include full code block even if partially sliced
const result = slice(codeBlock, 10, 20, {
  partialNodes: { code: 'include-full' },
})

// Truncate code at slice boundaries
const truncated = slice(codeBlock, 10, 20, {
  partialNodes: { code: 'truncate' },
})
```

### Link Handling

```typescript
const linkNode = {
  type: 'link',
  url: 'https://example.com',
  children: [{ type: 'text', value: 'Click here' }],
}

// Preserve link structure
const withLink = slice(linkNode, 2, 8, {
  partialNodes: { media: 'preserve' },
})

// Extract link text only
const textOnly = slice(linkNode, 2, 8, {
  partialNodes: { media: 'content-only' },
})
```

### Complex Document Slicing

```typescript
const document = {
  type: 'root',
  children: [
    {
      type: 'heading',
      depth: 1,
      children: [{ type: 'text', value: 'Introduction' }],
    },
    {
      type: 'paragraph',
      children: [
        { type: 'text', value: 'This document explains ' },
        { type: 'emphasis', children: [{ type: 'text', value: 'markdown slicing' }] },
        { type: 'text', value: ' techniques.' },
      ],
    },
  ],
}

// Slice across multiple elements
const result = slice(document, 10, 40, {
  partialNodes: {
    blocks: 'include',
    formatting: 'preserve',
  },
})
```

### Finding Text Positions

```typescript
const document = {
  type: 'paragraph',
  children: [{ type: 'text', value: 'Search for this word and this word too' }],
}

const positions = findText(document, 'this')
console.log(positions) // [11, 30]

// Use positions for targeted slicing
const firstMatch = slice(document, positions[0], positions[0] + 4)
```

## Result Information

The `SliceResult` object provides detailed information about the operation:

```typescript
const result = slice(tree, 10, 50)

console.log(result.boundaries) // { start: 10, end: 50 }
console.log(result.info.originalLength) // Total characters in original
console.log(result.info.slicedLength) // Characters in result
console.log(result.info.hasPartialNodes) // Were any nodes partially sliced?
console.log(result.info.modifiedNodeTypes) // Which node types were modified?
```

## Working with Different Node Types

### Text Nodes

```typescript
const textNode = { type: 'text', value: 'Hello world' }

// Basic slicing
slice(textNode, 2, 8) // "llo wo"

// Whitespace handling
slice(textNode, 2, 8, {
  textHandling: { boundaries: 'trim' },
})
```

### Code Nodes

```typescript
const codeNode = {
  type: 'code',
  value: 'const x = 1;\nconst y = 2;',
  lang: 'javascript',
}

// Preserve language information
const result = slice(codeNode, 5, 15)
console.log(result.node.lang) // 'javascript'
```

### Formatting Nodes

```typescript
const emphasized = {
  type: 'emphasis',
  children: [{ type: 'text', value: 'italic text' }],
}

// Different formatting strategies
slice(emphasized, 2, 8, { partialNodes: { formatting: 'preserve' } })
slice(emphasized, 2, 8, { partialNodes: { formatting: 'strip' } })
slice(emphasized, 2, 8, { partialNodes: { formatting: 'extend' } })
```

### Lists

```typescript
const list = {
  type: 'list',
  ordered: false,
  children: [
    {
      type: 'listItem',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'First item' }],
        },
      ],
    },
    {
      type: 'listItem',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Second item' }],
        },
      ],
    },
  ],
}

// Slice through list items
const result = slice(list, 5, 15, {
  partialNodes: { blocks: 'include' },
})
```

## Performance Considerations

### Caching

Length calculations are automatically cached for performance:

```typescript
const tree = /* large markdown tree */;

// First call calculates and caches lengths
const length1 = length(tree);

// Subsequent calls use cached values
const length2 = length(tree); // Much faster
```

### Memory Usage

For large documents, consider slicing in chunks:

```typescript
const largeDocument = /* very large markdown tree */;
const chunkSize = 1000;
const totalLength = length(largeDocument);

for (let i = 0; i < totalLength; i += chunkSize) {
  const chunk = slice(largeDocument, i, i + chunkSize);
  // Process chunk
}
```

## Advanced Usage

### Custom Configuration Combinations

```typescript
const customConfig = {
  partialNodes: {
    text: 'truncate',
    code: 'include-full',
    formatting: 'preserve',
    media: 'content-only',
    blocks: 'unwrap',
  },
  textHandling: {
    boundaries: 'trim',
    mergeAdjacent: true,
  },
  content: {
    includeHidden: false,
    includeReferences: false,
  },
}

const result = slice(tree, 10, 50, customConfig)
```

### Building Custom Presets

```typescript
const myPreset = {
  partialNodes: {
    formatting: 'strip',
    media: 'content-only',
    blocks: 'unwrap',
  },
  textHandling: {
    boundaries: 'normalize',
    mergeAdjacent: true,
  },
}

// Use across multiple slicing operations
const result1 = slice(tree1, 0, 50, myPreset)
const result2 = slice(tree2, 10, 60, myPreset)
```

## Error Handling

The library handles various edge cases gracefully:

```typescript
// Invalid inputs
slice(null, 0, 10) // Returns null result
slice(tree, -1, 10) // Returns null result
slice(tree, 10, 5) // Returns null result (start >= end)

// Boundary conditions
slice(tree, 0, 0) // Returns null (empty slice)
slice(tree, 1000, 2000) // Returns null if start > tree length

// Malformed nodes are handled safely
const malformedNode = { type: 'text' } // Missing value
slice(malformedNode, 0, 5) // Handles gracefully
```

## TypeScript Support

Full TypeScript support with proper type definitions:

```typescript
import { slice, SliceConfig, SliceResult } from 'mdast-util-slice-markdown'
import { Node } from 'unist'

const config: SliceConfig = {
  partialNodes: {
    text: 'truncate',
  },
}

const result: SliceResult = slice(tree, 10, 50, config)
```

## License

MIT License - see LICENSE file for details.

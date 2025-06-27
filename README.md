# mdast-util-slice-markdown

Extract portions of Markdown AST trees with configurable behavior for partially included elements.

## Installation

```bash
npm install mdast-util-slice-markdown
```

## API

### `sliceMarkdown(tree, start, end, options?)`

Extracts a portion of a markdown AST based on character positions.

- `tree` - The markdown AST node
- `start` - Starting character position (inclusive)
- `end` - Ending character position (exclusive)
- `options` - Configuration object

## Configuration

### Behavior Options

Control how partially included elements are handled:

```javascript
{
  behavior: {
    // Formatting elements
    emphasis: 'preserve' | 'trim' | 'exclude' | 'content',    // *italic*
    strong: 'preserve' | 'trim' | 'exclude' | 'content',      // **bold**
    link: 'preserve' | 'trim' | 'exclude' | 'content',        // [text](url)
    
    // Code elements  
    inlineCode: 'preserve' | 'trim' | 'exclude',              // `code`
    code: 'preserve' | 'trim' | 'exclude',                    // ```blocks```
    
    // Media elements
    image: 'preserve' | 'trim' | 'exclude'                    // ![alt](src)
  }
}
```

**Behavior Types:**
- `preserve` - Keep the element with its formatting
- `trim` - Keep text content, trim sliced
- `exclude` - Remove the element entirely
- `content` - Extract visible content (for links)

### Other Options

```javascript
{
  preserveBlocks: true,        // Keep empty blocks after slicing
  trimWhitespace: false,       // Trim whitespace at boundaries
}
```
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { slice, length, findText, presets } from '../src/index.ts'
import type {
  Text,
  Code,
  InlineCode,
  Emphasis,
  Strong,
  Link,
  Paragraph,
  Heading,
  List,
  ListItem,
  Blockquote,
  PhrasingContent,
} from 'mdast'

// Test helper functions
const createTextNode = (value: string): Text => ({
  type: 'text',
  value,
})

const createCodeNode = (value: string, lang?: string): Code => ({
  type: 'code',
  value,
  lang,
})

const createInlineCodeNode = (value: string): InlineCode => ({
  type: 'inlineCode',
  value,
})

const createEmphasisNode = (children: Emphasis['children']): Emphasis => ({
  type: 'emphasis',
  children,
})

const createStrongNode = (children: Strong['children']): Strong => ({
  type: 'strong',
  children,
})

const createLinkNode = (children: Link['children'], url: string): Link => ({
  type: 'link',
  children,
  url,
})

const createParagraphNode = (children: Paragraph['children']): Paragraph => ({
  type: 'paragraph',
  children,
})

const createHeadingNode = (children: Heading['children'], depth: Heading['depth']): Heading => ({
  type: 'heading',
  children,
  depth,
})

const createListNode = (children: ListItem[], ordered: boolean = false): List => ({
  type: 'list',
  children,
  ordered,
})

const createListItemNode = (children: ListItem['children']): ListItem => ({
  type: 'listItem',
  children,
})

const createBlockquoteNode = (children: Blockquote['children']) => ({
  type: 'blockquote',
  children,
})

describe('length function', () => {
  it('should return 0 for null or undefined', () => {
    assert.strictEqual(length(null as any), 0)
    assert.strictEqual(length(undefined as any), 0)
  })

  it('should calculate length of text nodes', () => {
    const node = createTextNode('hello world')
    assert.strictEqual(length(node), 11)
  })

  it('should calculate length of empty text nodes', () => {
    const node = createTextNode('')
    assert.strictEqual(length(node), 0)
  })

  it('should calculate length of code nodes', () => {
    const node = createCodeNode('const x = 1;')
    assert.strictEqual(length(node), 12)
  })

  it('should calculate length of inline code nodes', () => {
    const node = createInlineCodeNode('console.log()')
    assert.strictEqual(length(node), 13)
  })

  it('should calculate length of parent nodes', () => {
    const node = createParagraphNode([
      createTextNode('hello '),
      createEmphasisNode([createTextNode('world')]),
      createTextNode('!'),
    ])
    assert.strictEqual(length(node), 12)
  })

  it('should calculate length of nested parent nodes', () => {
    const node = createParagraphNode([
      createTextNode('Start '),
      createStrongNode([
        createTextNode('bold '),
        createEmphasisNode([createTextNode('italic')]),
        createTextNode(' text'),
      ]),
      createTextNode(' end'),
    ])
    assert.strictEqual(length(node), 26)
  })

  it('should handle empty parent nodes', () => {
    const node = createParagraphNode([])
    assert.strictEqual(length(node), 0)
  })

  it('should handle mixed content types', () => {
    const node = createParagraphNode([
      createTextNode('Text: '),
      createInlineCodeNode('code'),
      createTextNode(' and '),
      createLinkNode([createTextNode('link')], 'http://example.com'),
    ])
    assert.strictEqual(length(node), 19)
  })

  it('should handle unicode characters correctly', () => {
    const node = createTextNode('Hello 🌍 World! 中文')
    assert.strictEqual(length(node), 18)
  })
})

describe('findText function', () => {
  it('should find text in simple text nodes', () => {
    const node = createTextNode('hello world hello')
    const positions = findText(node, 'hello')
    assert.deepStrictEqual(positions, [0, 12])
  })

  it('should find text in code nodes', () => {
    const node = createCodeNode('const hello = "hello world";')
    const positions = findText(node, 'hello')
    assert.deepStrictEqual(positions, [6, 15])
  })

  it('should find text in inline code nodes', () => {
    const node = createInlineCodeNode('hello.world()')
    const positions = findText(node, 'hello')
    assert.deepStrictEqual(positions, [0])
  })

  it('should find text across multiple nodes', () => {
    const node = createParagraphNode([
      createTextNode('start hello middle'),
      createTextNode(' hello end'),
    ])
    const positions = findText(node, 'hello')
    assert.deepStrictEqual(positions, [6, 19])
  })

  it('should find text in nested structures', () => {
    const node = createParagraphNode([
      createTextNode('before '),
      createEmphasisNode([createTextNode('hello')]),
      createTextNode(' after hello'),
    ])
    const positions = findText(node, 'hello')
    assert.deepStrictEqual(positions, [7, 19])
  })

  it('should handle empty search text', () => {
    const node = createTextNode('hello')
    const positions = findText(node, '')
    assert.deepStrictEqual(positions, [])
  })

  it('should handle text not found', () => {
    const node = createTextNode('hello world')
    const positions = findText(node, 'xyz')
    assert.deepStrictEqual(positions, [])
  })

  it('should handle overlapping matches', () => {
    const node = createTextNode('aaaa')
    const positions = findText(node, 'aa')
    assert.deepStrictEqual(positions, [0, 1, 2])
  })

  it('should handle case sensitivity', () => {
    const node = createTextNode('Hello hello HELLO')
    const positions = findText(node, 'hello')
    assert.deepStrictEqual(positions, [6])
  })
})

describe('slice function - basic functionality', () => {
  it('should return null for null input', () => {
    const result = slice(null as any, 0, 10)
    assert.strictEqual(result.node, null)
    assert.deepStrictEqual(result.boundaries, { start: 0, end: 0 })
  })

  it('should return null for negative start', () => {
    const node = createTextNode('hello')
    const result = slice(node, -1, 3)
    assert.strictEqual(result.node, null)
  })

  it('should return null for start >= end', () => {
    const node = createTextNode('hello')
    const result = slice(node, 5, 5)
    assert.strictEqual(result.node, null)
  })

  it('should return null for start beyond content', () => {
    const node = createTextNode('hello')
    const result = slice(node, 10, 15)
    assert.strictEqual(result.node, null)
  })

  it('should handle end beyond content length', () => {
    const node = createTextNode('hello')
    const result = slice(node, 1, 100)
    assert.strictEqual((result.node as Text).value, 'ello')
    assert.deepStrictEqual(result.boundaries, { start: 1, end: 5 })
  })

  it('should handle undefined end parameter', () => {
    const node = createTextNode('hello')
    const result = slice(node, 1)
    assert.strictEqual((result.node as Text).value, 'ello')
    assert.deepStrictEqual(result.boundaries, { start: 1, end: 5 })
  })

  it('should provide correct result info', () => {
    const node = createTextNode('hello world')
    const result = slice(node, 2, 8)
    assert.strictEqual(result.info.originalLength, 11)
    assert.strictEqual(result.info.slicedLength, 6)
    assert.strictEqual(result.info.hasPartialNodes, true)
    assert.deepStrictEqual(result.info.modifiedNodeTypes, ['text'])
  })
})

describe('slice function - text nodes', () => {
  it('should slice text nodes correctly', () => {
    const node = createTextNode('hello world')
    const result = slice(node, 2, 8)
    assert.strictEqual((result.node as Text).value, 'llo wo')
  })

  it('should handle complete text node inclusion', () => {
    const node = createTextNode('hello')
    const result = slice(node, 0, 5)
    assert.strictEqual((result.node as Text).value, 'hello')
    assert.strictEqual(result.info.hasPartialNodes, false)
  })

  it('should handle empty text nodes', () => {
    const node = createTextNode('')
    const result = slice(node, 0, 5)
    assert.strictEqual(result.node, null)
  })

  it('should handle text boundary trimming', () => {
    const node = createTextNode('  hello world  ')
    const result = slice(node, 2, 13, {
      textHandling: { boundaries: 'trim' },
    })
    assert.strictEqual((result.node as Text).value, 'hello world')
  })

  it('should handle text boundary preservation', () => {
    const node = createTextNode('  hello world  ')
    const result = slice(node, 2, 13, {
      textHandling: { boundaries: 'preserve' },
    })
    assert.strictEqual((result.node as Text).value, 'hello world')
  })

  it('should handle text boundary normalization', () => {
    const node = createTextNode('hello    world\n\ntest')
    const result = slice(node, 5, 15, {
      textHandling: { boundaries: 'normalize' },
    })

    assert.strictEqual((result.node as Text).value, ' world ')
  })

  it('should handle partial text with include-full behavior', () => {
    const node = createTextNode('hello world')
    const result = slice(node, 2, 8, {
      partialNodes: { text: 'include-full' },
    })
    assert.strictEqual((result.node as Text).value, 'hello world')
    assert.strictEqual(result.info.hasPartialNodes, true)
  })

  it('should handle partial text with exclude-full behavior', () => {
    const node = createTextNode('hello world')
    const result = slice(node, 2, 8, {
      partialNodes: { text: 'exclude-full' },
    })
    assert.strictEqual(result.node, null)
  })

  it('should handle unicode text correctly', () => {
    const node = createTextNode('Hello 🌍 World! 中文')
    const result = slice(node, 6, 15)
    assert.strictEqual((result.node as Text).value, '🌍 World!')
  })
})

describe('slice function - code nodes', () => {
  it('should slice code blocks correctly', () => {
    const node = createCodeNode('const x = 1;\nconst y = 2;')
    const result = slice(node, 5, 15)
    assert.strictEqual((result.node as Code).value, ' x = 1;\nco')
  })

  it('should handle complete code block inclusion', () => {
    const node = createCodeNode('const x = 1;')
    const result = slice(node, 0, 12)
    assert.strictEqual((result.node as Code).value, 'const x = 1;')
    assert.strictEqual(result.info.hasPartialNodes, false)
  })

  it('should handle code block with include-full behavior', () => {
    const node = createCodeNode('const x = 1;')
    const result = slice(node, 2, 8, {
      partialNodes: { code: 'include-full' },
    })
    assert.strictEqual((result.node as Code).value, 'const x = 1;')
    assert.strictEqual(result.info.hasPartialNodes, true)
  })

  it('should handle code block with exclude-full behavior', () => {
    const node = createCodeNode('const x = 1;')
    const result = slice(node, 2, 8, {
      partialNodes: { code: 'exclude-full' },
    })
    assert.strictEqual(result.node, null)
  })

  it('should handle inline code correctly', () => {
    const node = createInlineCodeNode('console.log()')
    const result = slice(node, 2, 10)
    assert.strictEqual((result.node as InlineCode).value, 'nsole.lo')
  })

  it('should handle inline code with include-full behavior', () => {
    const node = createInlineCodeNode('console.log()')
    const result = slice(node, 2, 10, {
      partialNodes: { inlineCode: 'include-full' },
    })
    assert.strictEqual((result.node as InlineCode).value, 'console.log()')
  })

  it('should handle inline code with exclude-full behavior', () => {
    const node = createInlineCodeNode('console.log()')
    const result = slice(node, 2, 10, {
      partialNodes: { inlineCode: 'exclude-full' },
    })
    assert.strictEqual(result.node, null)
  })

  it('should preserve code language attribute', () => {
    const node = createCodeNode('const x = 1;', 'javascript')
    const result = slice(node, 2, 8)
    assert.strictEqual((result.node as Code).lang, 'javascript')
  })
})

describe('slice function - formatting nodes', () => {
  it('should slice emphasis nodes with preserve behavior', () => {
    const node = createEmphasisNode([createTextNode('hello world')])
    const result = slice(node, 2, 8, {
      partialNodes: { formatting: 'preserve' },
    })
    assert.strictEqual(result.node?.type, 'emphasis')
    assert.strictEqual(((result.node as Emphasis).children[0] as Text).value, 'llo wo')
  })

  it('should slice emphasis nodes with strip behavior', () => {
    const node = createEmphasisNode([createTextNode('hello world')])
    const result = slice(node, 2, 8, {
      partialNodes: { formatting: 'strip' },
    })
    assert.strictEqual(result.node, null) // Returns null at root level for arrays
  })

  it('should slice emphasis nodes with extend behavior', () => {
    const node = createEmphasisNode([createTextNode('hello world')])
    const result = slice(node, 2, 8, {
      partialNodes: { formatting: 'extend' },
    })
    assert.strictEqual(result.node?.type, 'emphasis')
    assert.strictEqual(((result.node as Emphasis).children[0] as Text).value, 'llo wo')
  })

  it('should handle strong nodes', () => {
    const node = createStrongNode([createTextNode('bold text')])
    const result = slice(node, 2, 6)
    assert.strictEqual(result.node?.type, 'strong')
    assert.strictEqual(((result.node as Strong).children[0] as Text).value, 'ld t')
  })

  it('should handle nested formatting', () => {
    const node = createStrongNode([
      createTextNode('bold '),
      createEmphasisNode([createTextNode('italic')]),
      createTextNode(' text'),
    ])
    const result = slice(node, 2, 14)
    assert.strictEqual(result.node?.type, 'strong')
    assert.strictEqual((result.node as Strong).children.length, 3)
  })

  it('should handle formatting with complete inclusion', () => {
    const node = createEmphasisNode([createTextNode('hello')])
    const result = slice(node, 0, 5)
    assert.strictEqual(result.info.hasPartialNodes, false)
  })
})

describe('slice function - media nodes', () => {
  it('should slice link nodes with preserve behavior', () => {
    const node = createLinkNode([createTextNode('click here')], 'http://example.com')
    const result = slice(node, 2, 8, {
      partialNodes: { media: 'preserve' },
    })
    assert.strictEqual(result.node?.type, 'link')
    assert.strictEqual((result.node as Link).url, 'http://example.com')
    assert.strictEqual(((result.node as Link).children[0] as Text).value, 'ick he')
  })

  it('should slice link nodes with strip behavior', () => {
    const node = createLinkNode([createTextNode('click here')], 'http://example.com')
    const result = slice(node, 2, 8, {
      partialNodes: { media: 'strip' },
    })
    assert.strictEqual(result.node, null)
  })

  it('should slice link nodes with content-only behavior', () => {
    const node = createLinkNode([createTextNode('click here')], 'http://example.com')
    const result = slice(node, 2, 8, {
      partialNodes: { media: 'content-only' },
    })
    assert.strictEqual(result.node, null) // Returns null at root level for arrays
  })

  it('should handle complete link inclusion', () => {
    const node = createLinkNode([createTextNode('click')], 'http://example.com')
    const result = slice(node, 0, 5)
    assert.strictEqual(result.info.hasPartialNodes, false)
    assert.strictEqual(result.node?.type, 'link')
  })

  it('should handle complex link content', () => {
    const node = createLinkNode(
      [createTextNode('click '), createEmphasisNode([createTextNode('here')])],
      'http://example.com'
    )
    const result = slice(node, 2, 8)
    assert.strictEqual(result.node?.type, 'link')
    assert.strictEqual((result.node as Link).children.length, 2)
  })
})

describe('slice function - block nodes', () => {
  it('should slice paragraph nodes with include behavior', () => {
    const node = createParagraphNode([createTextNode('hello world')])
    const result = slice(node, 2, 8, {
      partialNodes: { blocks: 'include' },
    })
    assert.strictEqual(result.node?.type, 'paragraph')
    assert.strictEqual(((result.node as Paragraph).children[0] as Text).value, 'llo wo')
  })

  it('should slice paragraph nodes with exclude behavior', () => {
    const node = createParagraphNode([createTextNode('hello world')])
    const result = slice(node, 2, 8, {
      partialNodes: { blocks: 'exclude' },
    })
    assert.strictEqual(result.node, null)
  })

  it('should slice paragraph nodes with unwrap behavior', () => {
    const node = createParagraphNode([createTextNode('hello world')])
    const result = slice(node, 2, 8, {
      partialNodes: { blocks: 'unwrap' },
    })
    assert.strictEqual(result.node, null) // Returns null at root level for arrays
  })

  it('should handle heading nodes', () => {
    const node = createHeadingNode([createTextNode('Chapter 1')], 1)
    const result = slice(node, 2, 7)
    assert.strictEqual(result.node?.type, 'heading')
    assert.strictEqual((result.node as Heading).depth, 1)
    assert.strictEqual(((result.node as Heading).children[0] as Text).value, 'apter')
  })

  it('should handle blockquote nodes', () => {
    const node = createBlockquoteNode([createParagraphNode([createTextNode('quoted text')])])
    const result = slice(node, 2, 8)
    assert.strictEqual(result.node?.type, 'blockquote')
    assert.strictEqual((result.node as Blockquote).children.length, 1)
  })

  it('should handle complete block inclusion', () => {
    const node = createParagraphNode([createTextNode('hello')])
    const result = slice(node, 0, 5)
    assert.strictEqual(result.info.hasPartialNodes, false)
  })
})

describe('slice function - list nodes', () => {
  it('should slice list nodes with preserve behavior', () => {
    const node = createListNode([
      createListItemNode([createParagraphNode([createTextNode('item one')])]),
      createListItemNode([createParagraphNode([createTextNode('item two')])]),
    ])
    const result = slice(node, 2, 12)
    assert.strictEqual(result.node?.type, 'list')
    assert.strictEqual((result.node as List).children.length, 2)
  })

  it('should handle ordered lists', () => {
    const node = createListNode(
      [
        createListItemNode([createParagraphNode([createTextNode('first')])]),
        createListItemNode([createParagraphNode([createTextNode('second')])]),
      ],
      true
    )
    const result = slice(node, 2, 10)
    assert.strictEqual(result.node?.type, 'list')
    assert.strictEqual((result.node as List).ordered, true)
  })

  it('should handle complex list content', () => {
    const node = createListNode([
      createListItemNode([
        createParagraphNode([createTextNode('item with ')]),
        createParagraphNode([createTextNode('multiple paragraphs')]),
      ]),
    ])
    const result = slice(node, 5, 20)
    assert.strictEqual(result.node?.type, 'list')
    const listItem = (result.node as List).children[0] as ListItem
    assert.strictEqual(listItem.children.length, 2)
  })
})

describe('slice function - text handling', () => {
  it('should merge adjacent text nodes', () => {
    const node = createParagraphNode([createTextNode('hello '), createTextNode('world')])
    const result = slice(node, 0, 11, {
      textHandling: { mergeAdjacent: true },
    })
    assert.strictEqual((result.node as Paragraph).children.length, 1)
    assert.strictEqual(((result.node as Paragraph).children[0] as Text).value, 'hello world')
  })

  it('should not merge adjacent text nodes when disabled', () => {
    const node = createParagraphNode([createTextNode('hello '), createTextNode('world')])
    const result = slice(node, 0, 11, {
      textHandling: { mergeAdjacent: false },
    })
    assert.strictEqual((result.node as Paragraph).children.length, 2)
  })

  it('should preserve line breaks when configured', () => {
    const node = createTextNode('line1\nline2\nline3')
    const result = slice(node, 0, 17, {
      textHandling: { preserveLineBreaks: true },
    })
    assert.strictEqual((result.node as Text).value, 'line1\nline2\nline3')
  })

  it('should handle complex text merging scenarios', () => {
    const node = createParagraphNode([
      createTextNode('start '),
      createEmphasisNode([createTextNode('middle')]),
      createTextNode(' '),
      createTextNode('end'),
    ])
    const result = slice(node, 0, 20, {
      textHandling: { mergeAdjacent: true },
    })
    // Should merge the two text nodes after emphasis
    const paragraph = result.node as Paragraph
    assert.strictEqual(paragraph.children.length, 3)
    assert.strictEqual(paragraph.children[0].type, 'text')
    assert.strictEqual(paragraph.children[1].type, 'emphasis')
    assert.strictEqual(paragraph.children[2].type, 'text')
    assert.strictEqual((paragraph.children[2] as Text).value, ' end')
  })
})

describe('slice function - content filtering', () => {
  it('should handle content filtering options', () => {
    const node = createParagraphNode([createTextNode('normal text')])
    const result = slice(node, 0, 11, {
      content: {
        includeHidden: true,
        includeReferences: true,
        includeFootnotes: true,
      },
    })
    assert.strictEqual(result.node?.type, 'paragraph')
  })

  it('should exclude hidden content when configured', () => {
    const node = createParagraphNode([createTextNode('visible text')])
    const result = slice(node, 0, 12, {
      content: {
        includeHidden: false,
        includeReferences: false,
        includeFootnotes: false,
      },
    })
    assert.strictEqual(result.node?.type, 'paragraph')
  })
})

describe('slice function - complex scenarios', () => {
  it('should handle deeply nested structures', () => {
    const node = createParagraphNode([
      createTextNode('start '),
      createStrongNode([
        createTextNode('bold '),
        createEmphasisNode([
          createTextNode('italic '),
          createLinkNode([createTextNode('link')], 'http://example.com'),
        ]),
        createTextNode(' more'),
      ]),
      createTextNode(' end'),
    ])
    const result = slice(node, 10, 25)
    assert.strictEqual(result.node?.type, 'paragraph')
    assert.strictEqual(result.info.hasPartialNodes, true)
  })

  it('should handle mixed content types', () => {
    const node = createParagraphNode([
      createTextNode('Text '),
      createInlineCodeNode('code'),
      createTextNode(' and '),
      createEmphasisNode([createTextNode('emphasis')]),
      createTextNode(' final'),
    ])
    const result = slice(node, 2, 20)
    assert.strictEqual(result.node?.type, 'paragraph')
    assert.strictEqual((result.node as Paragraph).children.length, 4)
  })

  it('should handle empty and whitespace-only content', () => {
    const node = createParagraphNode([
      createTextNode(''),
      createTextNode('   '),
      createTextNode('content'),
      createTextNode('   '),
    ])
    const result = slice(node, 0, 15, {
      textHandling: {
        boundaries: 'trim',
        mergeAdjacent: true,
      },
    })
    assert.strictEqual(result.node?.type, 'paragraph')
  })

  it('should handle boundary conditions', () => {
    const node = createParagraphNode([createTextNode('hello world')])

    // Test exact boundaries
    const result1 = slice(node, 0, 0)
    assert.strictEqual(result1.node, null)

    const result2 = slice(node, 11, 11)
    assert.strictEqual(result2.node, null)

    const result3 = slice(node, 0, 1)
    assert.strictEqual(((result3.node as Paragraph).children[0] as Text).value, 'h')

    const result4 = slice(node, 10, 11)
    assert.strictEqual(((result4.node as Paragraph).children[0] as Text).value, 'd')
  })

  it('should handle large content efficiently', () => {
    const largeText = 'a'.repeat(10000)
    const node = createTextNode(largeText)
    const result = slice(node, 1000, 2000)
    assert.strictEqual((result.node as Text).value.length, 1000)
    assert.strictEqual((result.node as Text).value, 'a'.repeat(1000))
  })
})

describe('preset configurations', () => {
  it('should apply textOnly preset correctly', () => {
    const node = createParagraphNode([
      createTextNode('start '),
      createEmphasisNode([createTextNode('italic')]),
      createTextNode(' end'),
    ])
    const result = slice(node, 0, 15, presets.textOnly)
    assert.strictEqual(result.node, null) // Returns null at root level for arrays
  })

  it('should apply structured preset correctly', () => {
    const node = createParagraphNode([
      createTextNode('hello '),
      createEmphasisNode([createTextNode('world')]),
    ])
    const result = slice(node, 2, 8, presets.structured)
    assert.strictEqual(result.node?.type, 'paragraph')
  })

  it('should apply inclusive preset correctly', () => {
    const node = createParagraphNode([createTextNode('hello world')])
    const result = slice(node, 2, 8, presets.inclusive)
    assert.strictEqual(((result.node as Paragraph).children[0] as Text).value, 'hello world')
  })

  it('should apply conservative preset correctly', () => {
    const node = createParagraphNode([createCodeNode('const x = 1;') as unknown as PhrasingContent])
    const result = slice(node, 2, 8, presets.conservative)
    assert.strictEqual(result.node, null)
  })
})

describe('error handling and edge cases', () => {
  it('should handle invalid node types gracefully', () => {
    const invalidNode = { type: 'unknown', value: 'test' } as any
    const result = slice(invalidNode, 0, 2)
    assert.strictEqual(result.node?.type, 'unknown')
    assert.strictEqual((result.node as Text).value, 'te')
  })

  it('should handle very large slice ranges', () => {
    const node = createTextNode('hello')
    const result = slice(node, 0, Number.MAX_SAFE_INTEGER)
    assert.strictEqual((result.node as Text).value, 'hello')
  })

  it('should handle zero-length content', () => {
    const node = createParagraphNode([createTextNode(''), createEmphasisNode([createTextNode('')])])
    const result = slice(node, 0, 5)
    assert.strictEqual(result.info.originalLength, 0)
  })
})

describe('performance and caching', () => {
  it('should cache length calculations', () => {
    const node = createTextNode('hello world')
    const length1 = length(node)
    const length2 = length(node)
    assert.strictEqual(length1, length2)
    assert.strictEqual(length1, 11)
  })

  it('should handle repeated slicing operations', () => {
    const node = createParagraphNode([
      createTextNode('hello '),
      createEmphasisNode([createTextNode('world')]),
      createTextNode('!'),
    ])

    const result1 = slice(node, 0, 5)
    const result2 = slice(node, 3, 8)
    const result3 = slice(node, 6, 12)

    assert.strictEqual(result1.node?.type, 'paragraph')
    assert.strictEqual(result2.node?.type, 'paragraph')
    assert.strictEqual(result3.node?.type, 'paragraph')
  })

  it('should handle memory efficiently with large structures', () => {
    const children: Text[] = []
    for (let i = 0; i < 1000; i++) {
      children.push(createTextNode(`item ${i} `))
    }
    const node = createParagraphNode(children)

    const result = slice(node, 100, 200)
    assert.strictEqual(result.node?.type, 'paragraph')
    assert.strictEqual(result.info.slicedLength, 99)
  })
})

describe('integration with real markdown structures', () => {
  it('should handle typical markdown document structure', () => {
    const document = {
      type: 'root',
      children: [
        createHeadingNode([createTextNode('Title')], 1),
        createParagraphNode([
          createTextNode('This is a paragraph with '),
          createEmphasisNode([createTextNode('emphasis')]),
          createTextNode(' and '),
          createStrongNode([createTextNode('strong')]),
          createTextNode(' text.'),
        ]),
        createListNode([
          createListItemNode([createParagraphNode([createTextNode('First item')])]),
          createListItemNode([createParagraphNode([createTextNode('Second item')])]),
        ]),
      ],
    }

    const result = slice(document, 10, 50)
    assert.strictEqual(result.node?.type, 'root')
    assert.strictEqual(result.info.hasPartialNodes, true)
  })

  it('should handle markdown with code blocks', () => {
    const document = createParagraphNode([
      createTextNode('Here is some code: '),
      createInlineCodeNode('const x = 1;'),
      createTextNode(' and a block:'),
      createCodeNode(
        'function hello() {\n  console.log("world");\n}',
        'javascript'
      ) as unknown as PhrasingContent,
    ])

    const result = slice(document, 15, 60)
    assert.strictEqual(result.node?.type, 'paragraph')
    assert.strictEqual(result.info.hasPartialNodes, true)
  })

  it('should handle markdown with links and images', () => {
    const document = createParagraphNode([
      createTextNode('Check out '),
      createLinkNode([createTextNode('this link')], 'https://example.com'),
      createTextNode(' and '),
      createLinkNode(
        [
          createTextNode('this '),
          createEmphasisNode([createTextNode('emphasized')]),
          createTextNode(' link'),
        ],
        'https://example.org'
      ),
    ])

    const result = slice(document, 5, 35)
    assert.strictEqual(result.node?.type, 'paragraph')
    assert.strictEqual(result.info.hasPartialNodes, true)
  })

  it('should handle complex nested lists', () => {
    const document = createListNode([
      createListItemNode([
        createParagraphNode([createTextNode('First level')]),
        createListNode([
          createListItemNode([createParagraphNode([createTextNode('Second level')])]),
          createListItemNode([createParagraphNode([createTextNode('Another second level')])]),
        ]),
      ]),
      createListItemNode([createParagraphNode([createTextNode('Back to first level')])]),
    ])

    const result = slice(document, 10, 50)
    assert.strictEqual(result.node?.type, 'list')
    assert.strictEqual(result.info.hasPartialNodes, true)
  })
})

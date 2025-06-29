import { test, describe } from "node:test";
import assert from "node:assert";
import { performance } from "node:perf_hooks";

import {
  sliceMarkdown,
  getTreeLength,
  findTextPositions,
  getNodePosition,
} from "../src/index.ts";

// Test data organized by category
const testSuites = {
  "Basic Text Slicing": [
    {
      name: "simple text slice",
      tree: { type: "text", value: "Hello World" },
      slice: [0, 5],
      expected: { type: "text", value: "Hello" },
    },
    {
      name: "middle text slice",
      tree: { type: "text", value: "Hello World" },
      slice: [6, 11],
      expected: { type: "text", value: "World" },
    },
    {
      name: "partial text slice",
      tree: { type: "text", value: "Hello World" },
      slice: [2, 8],
      expected: { type: "text", value: "llo Wo" },
    },
    {
      name: "slice to end (no end position)",
      tree: { type: "text", value: "Hello World" },
      slice: [6],
      expected: { type: "text", value: "World" },
    },
    {
      name: "slice from start to end (no end position)",
      tree: { type: "text", value: "Hello World" },
      slice: [0],
      expected: { type: "text", value: "Hello World" },
    },
    {
      name: "empty slice with same start and end",
      tree: { type: "text", value: "Hello World" },
      slice: [5, 5],
      error: /End position must be greater than start/,
    },
    {
      name: "out of bounds slice",
      tree: { type: "text", value: "Hello" },
      slice: [10, 15],
      expected: null,
    },
    {
      name: "start beyond tree length",
      tree: { type: "text", value: "Hello" },
      slice: [10],
      expected: null,
    },
  ],

  "Empty Content Handling": [
    {
      name: "empty text node - slice with valid range",
      tree: { type: "text", value: "" },
      slice: [0, 1],
      expected: { type: "text", value: "" },
    },
    {
      name: "empty text node - slice from start",
      tree: { type: "text", value: "" },
      slice: [0],
      expected: { type: "text", value: "" },
    },
    {
      name: "empty tree - null input",
      tree: null,
      slice: [0, 1],
      expected: null,
    },
    {
      name: "empty paragraph",
      tree: { type: "paragraph", children: [] },
      slice: [0],
      expected: { type: "paragraph", children: [] },
    },
    {
      name: "paragraph with empty text node",
      tree: {
        type: "paragraph",
        children: [{ type: "text", value: "" }],
      },
      slice: [0],
      expected: {
        type: "paragraph",
        children: [{ type: "text", value: "" }],
      },
    },
    {
      name: "mixed empty and non-empty text nodes",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "" },
          { type: "text", value: "Hello" },
          { type: "text", value: "" },
        ],
      },
      slice: [0],
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "Hello" },
        ],
      },
    },
  ],

  "Paragraph Slicing": [
    {
      name: "simple paragraph slice",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Hello " },
          { type: "text", value: "World" },
        ],
      },
      slice: [0, 11],
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "Hello " },
          { type: "text", value: "World" },
        ],
      },
    },
    {
      name: "paragraph slice to end",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Hello " },
          { type: "text", value: "World" },
        ],
      },
      slice: [6],
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "World" },
        ],
      },
    },
    {
      name: "partial paragraph slice",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Hello " },
          { type: "text", value: "World" },
        ],
      },
      slice: [3, 9],
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "lo " },
          { type: "text", value: "Wor" },
        ],
      },
    },
    {
      name: "empty paragraph after slice",
      tree: {
        type: "paragraph",
        children: [{ type: "text", value: "Hello" }],
      },
      slice: [10, 15],
      options: { preserveBlocks: false },
      expected: null,
    },
  ],

  "Formatting Node Behaviors": [
    {
      name: "emphasis preserve behavior",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Hello " },
          { type: "emphasis", children: [{ type: "text", value: "world" }] },
          { type: "text", value: " test" },
        ],
      },
      slice: [4, 13],
      options: { behavior: { emphasis: "preserve" } },
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "o " },
          { type: "emphasis", children: [{ type: "text", value: "world" }] },
          { type: "text", value: " t" },
        ],
      },
    },
    {
      name: "emphasis trim behavior",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Hello " },
          { type: "emphasis", children: [{ type: "text", value: "world" }] },
          { type: "text", value: " test" },
        ],
      },
      slice: [4, 10],
      options: { behavior: { emphasis: "trim" } },
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "o " },
          { type: "text", value: "worl" },
        ],
      },
    },
    {
      name: "emphasis exclude behavior",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Hello " },
          { type: "emphasis", children: [{ type: "text", value: "world" }] },
          { type: "text", value: " test" },
        ],
      },
      slice: [4, 10],
      options: { behavior: { emphasis: "exclude" } },
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "o " },
        ],
      },
    },
    {
      name: "emphasis content behavior",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Hello " },
          { type: "emphasis", children: [{ type: "text", value: "world" }] },
          { type: "text", value: " test" },
        ],
      },
      slice: [4, 10],
      options: { behavior: { emphasis: "content" } },
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "o " },
          { type: "emphasis", children: [{ type: "text", value: "worl" }] },
        ],
      },
    },
    {
      name: "emphasis slice to end",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Hello " },
          { type: "emphasis", children: [{ type: "text", value: "world" }] },
          { type: "text", value: " test" },
        ],
      },
      slice: [8],
      options: { behavior: { emphasis: "content" } },
      expected: {
        type: "paragraph",
        children: [
          { type: "emphasis", children: [{ type: "text", value: "rld" }] },
          { type: "text", value: " test" },
        ],
      },
    },
  ],

  "Inline Code Behaviors": [
    {
      name: "inline code preserve behavior",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Check " },
          { type: "inlineCode", value: "console.log" },
          { type: "text", value: " here" },
        ],
      },
      slice: [4, 15],
      options: { behavior: { inlineCode: "preserve" } },
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "k " },
          { type: "inlineCode", value: "console.log" },
        ],
      },
    },
    {
      name: "inline code trim behavior",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Check " },
          { type: "inlineCode", value: "console.log" },
          { type: "text", value: " here" },
        ],
      },
      slice: [4, 15],
      options: { behavior: { inlineCode: "trim" } },
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "k " },
          { type: "inlineCode", value: "console.l" },
        ],
      },
    },
    {
      name: "inline code exclude behavior",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Check " },
          { type: "inlineCode", value: "console.log" },
          { type: "text", value: " here" },
        ],
      },
      slice: [4, 15],
      options: { behavior: { inlineCode: "exclude" } },
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "k " },
        ],
      },
    },
    {
      name: "empty inline code",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Check " },
          { type: "inlineCode", value: "" },
          { type: "text", value: " here" },
        ],
      },
      slice: [4],
      options: { behavior: { inlineCode: "trim" } },
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "k " },
          { type: "inlineCode", value: "" },
          { type: "text", value: " here" },
        ],
      },
    },
  ],

  "Code Block Behaviors": [
    {
      name: "code block preserve behavior",
      tree: {
        type: "root",
        children: [
          { type: "text", value: "Before\n" },
          {
            type: "code",
            value: "const x = 1;\nconst y = 2;",
            lang: "javascript",
          },
          { type: "text", value: "\nAfter" },
        ],
      },
      slice: [5, 20],
      options: { behavior: { code: "preserve" } },
      expected: {
        type: "root",
        children: [
          { type: "text", value: "e\n" },
          {
            type: "code",
            value: "const x = 1;\nconst y = 2;",
            lang: "javascript",
          },
        ],
      },
    },
    {
      name: "code block trim behavior",
      tree: {
        type: "root",
        children: [
          { type: "text", value: "Before\n" },
          {
            type: "code",
            value: "const x = 1;\nconst y = 2;",
            lang: "javascript",
          },
          { type: "text", value: "\nAfter" },
        ],
      },
      slice: [5, 20],
      options: { behavior: { code: "trim" } },
      expected: {
        type: "root",
        children: [
          { type: "text", value: "e\n" },
          { type: "code", value: "const x = 1;\n", lang: "javascript" },
        ],
      },
    },
    {
      name: "empty code block",
      tree: {
        type: "root",
        children: [
          { type: "text", value: "Before\n" },
          {
            type: "code",
            value: "",
            lang: "javascript",
          },
          { type: "text", value: "\nAfter" },
        ],
      },
      slice: [5],
      options: { behavior: { code: "trim" } },
      expected: {
        type: "root",
        children: [
          { type: "text", value: "e\n" },
          { type: "code", value: "", lang: "javascript" },
          { type: "text", value: "\nAfter" },
        ],
      },
    },
  ],

  "Whitespace Trimming": [
    {
      name: "trim whitespace at boundaries",
      tree: {
        type: "paragraph",
        children: [{ type: "text", value: "  Hello   World  " }],
      },
      slice: [2, 15],
      options: { trimWhitespace: true },
      expected: {
        type: "paragraph",
        children: [{ type: "text", value: "Hello   World" }],
      },
    },
    {
      name: "no trim whitespace",
      tree: {
        type: "paragraph",
        children: [{ type: "text", value: "  Hello   World  " }],
      },
      slice: [2, 15],
      options: { trimWhitespace: false },
      expected: {
        type: "paragraph",
        children: [{ type: "text", value: "Hello   World" }],
      },
    },
    {
      name: "trim whitespace to end",
      tree: {
        type: "paragraph",
        children: [{ type: "text", value: "  Hello   World  " }],
      },
      slice: [2],
      options: { trimWhitespace: true },
      expected: {
        type: "paragraph",
        children: [{ type: "text", value: "Hello   World  " }],
      },
    },
  ],

  "Complex Structures": [
    {
      name: "nested formatting",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "This is " },
          {
            type: "strong",
            children: [
              { type: "text", value: "bold " },
              {
                type: "emphasis",
                children: [{ type: "text", value: "and italic" }],
              },
            ],
          },
          { type: "text", value: " text." },
        ],
      },
      slice: [5, 20],
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "is " },
          {
            type: "strong",
            children: [
              { type: "text", value: "bold " },
              { type: "emphasis", children: [{ type: "text", value: "and ita" }] },
            ],
          },
        ],
      },
    },
    {
      name: "nested formatting to end",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "This is " },
          {
            type: "strong",
            children: [
              { type: "text", value: "bold " },
              {
                type: "emphasis",
                children: [{ type: "text", value: "and italic" }],
              },
            ],
          },
          { type: "text", value: " text." },
        ],
      },
      slice: [13],
      expected: {
        type: "paragraph",
        children: [
          {
            type: "strong",
            children: [
              { type: "emphasis", children: [{ type: "text", value: "and italic" }] },
            ],
          },
          { type: "text", value: " text." },
        ],
      },
    },
    {
      name: "list slicing",
      tree: {
        type: "list",
        ordered: false,
        children: [
          {
            type: "listItem",
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", value: "First item" }],
              },
            ],
          },
          {
            type: "listItem",
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", value: "Second item" }],
              },
            ],
          },
        ],
      },
      slice: [5, 18],
      expected: {
        type: "list",
        ordered: false,
        children: [
          {
            type: "listItem",
            children: [
              { type: "paragraph", children: [{ type: "text", value: " item" }] },
            ],
          },
          {
            type: "listItem",
            children: [
              { type: "paragraph", children: [{ type: "text", value: "Second i" }] },
            ],
          },
        ],
      },
    },
  ],

  "Atomic Nodes": [
    {
      name: "line break inclusion",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Line one" },
          { type: "break" },
          { type: "text", value: "Line two" },
        ],
      },
      slice: [5, 11],
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "one" },
          { type: "break" },
          { type: "text", value: "Lin" },
        ],
      },
    },
    {
      name: "image node inclusion",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "See " },
          { type: "image", url: "test.jpg", alt: "test" },
          { type: "text", value: " here" },
        ],
      },
      slice: [2, 7],
      expected: {
        type: "paragraph",
        children: [
          { type: "text", value: "e " },
          { type: "image", url: "test.jpg", alt: "test" },
          { type: "text", value: " he" },
        ],
      },
    },
  ],

  "Edge Cases": [
    {
      name: "negative start position",
      tree: { type: "text", value: "Hello" },
      slice: [-1, 3],
      error: /Start position must be non-negative/,
    },
    {
      name: "negative end position",
      tree: { type: "text", value: "Hello" },
      slice: [0, -1],
      error: /End position must be non-negative/,
    },
    {
      name: "zero length slice attempt",
      tree: { type: "text", value: "Hello" },
      slice: [2, 2],
      error: /End position must be greater than start/,
    },
    {
      name: "empty text node slice beyond bounds",
      tree: { type: "text", value: "" },
      slice: [1, 2],
      expected: null,
    },
    {
      name: "unknown node type",
      tree: { type: "unknownType", customProp: "value" },
      slice: [0, 1],
      expected: { type: "unknownType", customProp: "value" },
    },
    {
      name: "floating point start position",
      tree: { type: "text", value: "Hello" },
      slice: [1.5, 3],
      error: /Start position must be an integer/,
    },
    {
      name: "floating point end position",
      tree: { type: "text", value: "Hello" },
      slice: [1, 3.5],
      error: /End position must be an integer/,
    },
    {
      name: "deep nesting",
      tree: {
        type: "paragraph",
        children: [
          {
            type: "strong",
            children: [
              {
                type: "emphasis",
                children: [
                  {
                    type: "link",
                    url: "test.com",
                    children: [{ type: "text", value: "deep text" }],
                  },
                ],
              },
            ],
          },
        ],
      },
      slice: [2, 7],
      expected: {
        type: "paragraph",
        children: [
          {
            type: "strong",
            children: [
              {
                type: "emphasis",
                children: [
                  {
                    type: "link",
                    url: "test.com",
                    children: [{ type: "text", value: "ep te" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],

  "Boundary Conditions": [
    {
      name: "slice at exact node boundaries",
      tree: {
        type: "paragraph",
        children: [
          { type: "text", value: "Hello" },
          { type: "text", value: " " },
          { type: "text", value: "World" },
        ],
      },
      slice: [5, 6],
      expected: {
        type: "paragraph",
        children: [{ type: "text", value: " " }],
      },
    },
    {
      name: "slice with floating point positions should fail",
      tree: { type: "text", value: "Hello" },
      slice: [1.5, 3.7],
      error: /.*integer.*/,
    },
    {
      name: "very large position numbers",
      tree: { type: "text", value: "Hello" },
      slice: [1000000, 2000000],
      expected: null,
    },
    {
      name: "very large start position only",
      tree: { type: "text", value: "Hello" },
      slice: [1000000],
      expected: null,
    },
    {
      name: "end position beyond tree length",
      tree: { type: "text", value: "Hello" },
      slice: [0, 1000000],
      expected: { type: "text", value: "Hello" },
    },
  ],
};

const utilityTests = [
  {
    name: "tree length calculation",
    tree: {
      type: "paragraph",
      children: [
        { type: "text", value: "Hello " },
        { type: "inlineCode", value: "world" },
        { type: "break" },
        { type: "text", value: "!" },
      ],
    },
    expectedLength: 12,
  },
  {
    name: "tree length with empty nodes",
    tree: {
      type: "paragraph",
      children: [
        { type: "text", value: "" },
        { type: "text", value: "Hello" },
        { type: "inlineCode", value: "" },
        { type: "text", value: "World" },
      ],
    },
    expectedLength: 10,
  },
  {
    name: "find text positions",
    tree: {
      type: "paragraph",
      children: [{ type: "text", value: "Hello world Hello" }],
    },
    searchText: "Hello",
    expectedPositions: [0, 12],
  },
  {
    name: "find text positions with empty search",
    tree: {
      type: "paragraph",
      children: [{ type: "text", value: "Hello world" }],
    },
    searchText: "",
    expectedPositions: [],
  },
  {
    name: "find text positions in empty tree",
    tree: {
      type: "paragraph",
      children: [{ type: "text", value: "" }],
    },
    searchText: "Hello",
    expectedPositions: [],
  },
  {
    name: "node position finding",
    tree: {
      type: "paragraph",
      children: [
        { type: "text", value: "Hello " },
        { type: "text", value: "world" },
      ],
    },
    targetNodeIndex: 1,
    expectedPosition: { start: 6, end: 11 },
  },
];

// Helper functions
function runSliceTest(testCase) {
  test(testCase.name, () => {
    const { tree, slice, options, expected, error } = testCase;
    
    if (error) {
      assert.throws(() => {
        const [start, end] = slice;
        sliceMarkdown(tree, start, end, options);
      }, error);
    } else {
      const [start, end] = slice;
      const result = sliceMarkdown(tree, start, end, options);
      assert.deepStrictEqual(result, expected);
    }
  });
}

function runTestSuite(suiteName, tests) {
  describe(suiteName, () => {
    tests.forEach(runSliceTest);
  });
}

// Main test execution
describe("Markdown Slicing Tests", () => {
  Object.entries(testSuites).forEach(([suiteName, tests]) => {
    runTestSuite(suiteName, tests);
  });
});

describe("Utility Functions Tests", () => {
  describe("getTreeLength", () => {
    utilityTests
      .filter(test => test.expectedLength !== undefined)
      .forEach(({ name, tree, expectedLength }) => {
        test(name, () => {
          const result = getTreeLength(tree);
          assert.strictEqual(result, expectedLength);
        });
      });
  });

  describe("findTextPositions", () => {
    utilityTests
      .filter(test => test.searchText !== undefined)
      .forEach(({ name, tree, searchText, expectedPositions }) => {
        test(name, () => {
          const result = findTextPositions(tree, searchText);
          assert.deepStrictEqual(result, expectedPositions);
        });
      });
  });

  describe("getNodePosition", () => {
    utilityTests
      .filter(test => test.targetNodeIndex !== undefined)
      .forEach(({ name, tree, targetNodeIndex, expectedPosition }) => {
        test(name, () => {
          const targetNode = tree.children[targetNodeIndex];
          const result = getNodePosition(tree, targetNode);
          assert.deepStrictEqual(result, expectedPosition);
        });
      });
  });
});

describe("Performance Tests", () => {
  test("large document slicing performance", () => {
    const largeDoc = {
      type: "root",
      children: Array.from({ length: 1000 }, (_, i) => ({
        type: "paragraph",
        children: [
          {
            type: "text",
            value: `This is paragraph ${i} with some text content. `,
          },
        ],
      })),
    };

    const start = performance.now();
    const result = sliceMarkdown(largeDoc, 1000, 5000);
    const end = performance.now();

    assert.notStrictEqual(result, null);
    assert.ok(
      end - start < 100,
      `Performance should be under 100ms, took ${end - start}ms`,
    );
  });

  test("large document slicing to end performance", () => {
    const largeDoc = {
      type: "root",
      children: Array.from({ length: 1000 }, (_, i) => ({
        type: "paragraph",
        children: [
          {
            type: "text",
            value: `This is paragraph ${i} with some text content. `,
          },
        ],
      })),
    };

    const start = performance.now();
    const result = sliceMarkdown(largeDoc, 1000);
    const end = performance.now();

    assert.notStrictEqual(result, null);
    assert.ok(
      end - start < 100,
      `Performance should be under 100ms, took ${end - start}ms`,
    );
  });

  test("repeated slicing with caching", () => {
    const doc = {
      type: "paragraph",
      children: [
        {
          type: "text",
          value: "Hello world, this is a test document for caching.",
        },
      ],
    };

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      sliceMarkdown(doc, i % 40, (i % 40) + 10);
    }

    const end = performance.now();

    assert.ok(
      end - start < 50,
      `Repeated slicing should be fast due to caching, took ${end - start}ms`,
    );
  });
});

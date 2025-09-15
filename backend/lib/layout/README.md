# Advanced Layout and Formatting System

A comprehensive layout engine for generating print-optimized cheat sheets with dynamic page sizing, responsive text scaling, multi-column layouts, and intelligent overflow detection.

## Features

- **Dynamic Page Configuration**: Support for multiple paper sizes (A4, Letter, Legal, A3) and orientations
- **Responsive Text Sizing**: Automatic font scaling with readability validation
- **Multi-Column Layout Engine**: Intelligent content distribution across columns
- **Overflow Detection**: Advanced analysis with actionable suggestions
- **Print Optimization**: CSS generation for high-quality print output
- **React Integration**: Hooks and utilities for seamless React integration

## Quick Start

```typescript
import { createLayoutEngine, createContentBlocks } from '@/lib/layout';

// Create a layout engine
const layoutEngine = createLayoutEngine({
  page: {
    paperSize: 'a4',
    orientation: 'portrait',
    columns: 2,
  },
  text: {
    size: 'medium',
  },
  maxPages: 2,
});

// Create content blocks
const blocks = createContentBlocks([
  { id: '1', content: 'Main Heading', type: 'heading', priority: 8 },
  { id: '2', content: 'Important content here...', type: 'paragraph', priority: 6 },
  { id: '3', content: 'List item 1\nList item 2', type: 'list', priority: 5 },
]);

// Calculate layout
const layout = layoutEngine.calculateLayout(blocks);
console.log('Layout calculated:', layout);

// Check for overflow
const overflow = layoutEngine.analyzeOverflow(blocks);
if (overflow.hasOverflow) {
  console.log('Suggestions:', overflow.suggestions);
}

// Generate CSS for styling
const cssVariables = layoutEngine.generateCSSVariables();
const printCSS = layoutEngine.generatePrintCSS();
```

## Core Components

### LayoutEngine

The main class that coordinates all layout operations:

```typescript
const engine = new LayoutEngine({
  page: {
    paperSize: 'a4',
    orientation: 'portrait',
    columns: 2,
    margins: { top: 20, right: 15, bottom: 20, left: 15 },
    columnGap: 10,
  },
  text: {
    size: 'medium',
    lineHeight: 1.3,
    fontFamily: 'system-ui, sans-serif',
    baseFontSize: 12,
  },
  maxPages: 2,
});

// Update configuration
engine.updatePageConfig('letter', 'landscape', 3);
engine.updateTextConfig('large');

// Analyze content
const layout = engine.calculateLayout(contentBlocks);
const overflow = engine.analyzeOverflow(contentBlocks);
const warnings = engine.generateWarnings(contentBlocks);
```

### Content Blocks

Structured content representation for layout calculation:

```typescript
interface ContentBlock {
  id: string;
  content: string;
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'image';
  priority: number; // 1-10, higher = more important
  estimatedHeight: number; // Optional, calculated automatically
}

// Create blocks
const block = createContentBlock('id', 'content', 'paragraph', 7);
const blocks = createContentBlocks([
  { id: '1', content: 'Title', type: 'heading', priority: 9 },
  { id: '2', content: 'Body text', type: 'paragraph', priority: 5 },
]);
```

### Page Configuration

Flexible page setup with multiple paper sizes and orientations:

```typescript
import { getPageDimensions, getContentArea, generatePageCSSVariables } from '@/lib/layout';

// Get page dimensions
const dimensions = getPageDimensions('a4', 'portrait');
// { width: 210, height: 297, unit: 'mm' }

// Calculate content area after margins
const contentArea = getContentArea(pageConfig);

// Generate CSS variables
const cssVars = generatePageCSSVariables(pageConfig);
// { '--page-width': '794px', '--page-height': '1123px', ... }
```

### Text Configuration

Responsive text sizing with readability validation:

```typescript
import { getTextConfig, calculateFontSizes, validateTextReadability } from '@/lib/layout';

// Get text configuration
const textConfig = getTextConfig('medium');
// { size: 'medium', baseFontSize: 12, lineHeight: 1.3, ... }

// Calculate font sizes for different elements
const fontSizes = calculateFontSizes(textConfig);
// { h1: 16, h2: 14, h3: 13, body: 12, small: 10, caption: 9 }

// Validate readability
const warnings = validateTextReadability(textConfig);
```

### Overflow Detection

Intelligent analysis of content overflow with actionable suggestions:

```typescript
import { OverflowDetector } from '@/lib/layout';

const detector = new OverflowDetector(layoutConfig);
const analysis = detector.analyzeOverflow(contentBlocks);

if (analysis.hasOverflow) {
  console.log(`Overflow: ${analysis.overflowAmount}px`);
  console.log('Affected blocks:', analysis.affectedBlocks);
  
  analysis.suggestions.forEach(suggestion => {
    console.log(`${suggestion.type}: ${suggestion.description}`);
    console.log(`Impact: ${suggestion.impact}, Reduction: ${suggestion.estimatedReduction}px`);
  });
}
```

## React Integration

### Hooks

```typescript
import { useLayoutEngine, useContentBlocks, useLayoutCSS } from '@/lib/layout';

function CheatSheetEditor() {
  // Layout engine management
  const layoutEngine = useLayoutEngine({
    page: { paperSize: 'a4', orientation: 'portrait', columns: 2 },
    text: { size: 'medium' },
    maxPages: 2,
  });

  // Content block utilities
  const { createBlocksFromContent, createBlockFromHTML } = useContentBlocks();

  // CSS variable management
  const { cssVariables, applyCSSVariables } = useLayoutCSS(layoutEngine);

  const handleContentChange = (content: string[]) => {
    const blocks = createBlocksFromContent(
      content.map((text, i) => ({ id: `block-${i}`, text }))
    );
    
    const layout = layoutEngine.calculateLayout(blocks);
    const overflow = layoutEngine.analyzeOverflow(blocks);
    
    // Handle layout updates...
  };

  return (
    <div style={cssVariables}>
      {/* Your component JSX */}
    </div>
  );
}
```

### Higher-Order Component

```typescript
import { withLayoutAwareness, LayoutAwareProps } from '@/lib/layout';

interface MyComponentProps {
  content: string[];
}

function MyComponent({ content, layoutEngine }: MyComponentProps & LayoutAwareProps) {
  // Component has access to layoutEngine
  const blocks = content.map((text, i) => 
    createContentBlock(`block-${i}`, text, 'paragraph', 5)
  );
  
  const layout = layoutEngine?.calculateLayout(blocks);
  
  return <div>{/* Component JSX */}</div>;
}

export default withLayoutAwareness(MyComponent);
```

## CSS Integration

### Generated CSS Variables

The layout engine generates CSS custom properties for dynamic styling:

```css
:root {
  --page-width: 794px;
  --page-height: 1123px;
  --margin-top: 76px;
  --margin-right: 57px;
  --margin-bottom: 76px;
  --margin-left: 57px;
  --content-width: 680px;
  --content-height: 971px;
  --column-count: 2;
  --column-gap: 38px;
  --column-width: 321px;
  --font-family: system-ui, -apple-system, sans-serif;
  --line-height: 1.3;
  --font-size-h1: 16px;
  --font-size-h2: 14px;
  --font-size-h3: 13px;
  --font-size-body: 12px;
  --font-size-small: 10px;
  --font-size-caption: 9px;
}
```

### Print Styles

```css
@media print {
  @page {
    size: var(--page-width) var(--page-height);
    margin: var(--margin-top) var(--margin-right) var(--margin-bottom) var(--margin-left);
  }
  
  .cheat-sheet {
    column-count: var(--column-count);
    column-gap: var(--column-gap);
    font-size: var(--font-size-body);
    line-height: var(--line-height);
  }
}
```

## Configuration Options

### Paper Sizes

- `a4`: 210mm × 297mm
- `letter`: 216mm × 279mm (8.5" × 11")
- `legal`: 216mm × 356mm (8.5" × 14")
- `a3`: 297mm × 420mm

### Text Sizes

- `small`: 10px base font size, 1.2 line height
- `medium`: 12px base font size, 1.3 line height
- `large`: 14px base font size, 1.4 line height

### Column Options

- 1-3 columns supported
- Automatic column width calculation
- Configurable column gaps

## Advanced Features

### Content Optimization

```typescript
// Automatically optimize content for available space
const optimizedBlocks = layoutEngine.optimizeLayout(contentBlocks);

// Prioritizes high-priority content when space is limited
// Removes low-priority content that doesn't fit
```

### Layout Warnings

```typescript
const warnings = layoutEngine.generateWarnings(contentBlocks);

warnings.forEach(warning => {
  console.log(`${warning.type} (${warning.severity}): ${warning.message}`);
  console.log('Affected elements:', warning.affectedElements);
});
```

### Custom Measurements

```typescript
import { mmToPx, pxToMm } from '@/lib/layout';

// Convert between units
const pixels = mmToPx(210); // A4 width in pixels
const millimeters = pxToMm(794); // Convert back to mm
```

## Testing

The layout system includes comprehensive tests:

```bash
npm test lib/layout/__tests__
```

Test coverage includes:
- Page configuration and unit conversion
- Text sizing and readability validation
- Overflow detection and suggestion generation
- Layout calculation and optimization
- CSS variable generation
- React hook functionality

## Performance Considerations

- Layout calculations are optimized for real-time feedback
- Content blocks are processed incrementally
- CSS generation is memoized to prevent unnecessary recalculation
- Large content sets are handled efficiently with streaming algorithms

## Browser Compatibility

- Modern browsers with CSS Grid and Flexbox support
- Print functionality requires CSS `@page` support
- CSS custom properties (CSS variables) required
- React integration requires React 16.8+ (hooks)

## Contributing

When extending the layout system:

1. Add comprehensive tests for new features
2. Update type definitions in `types.ts`
3. Document new APIs in this README
4. Ensure print compatibility for new CSS features
5. Validate accessibility compliance

## License

This layout system is part of the cheat sheet generator project and follows the same license terms.
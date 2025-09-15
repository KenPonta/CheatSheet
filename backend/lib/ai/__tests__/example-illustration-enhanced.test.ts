/**
 * Enhanced Example Illustration System Tests
 * Tests for the new step-by-step visual breakdown, templates, and annotation system
 */

import { SimpleImageGenerator, ExampleData, FlatLineStyle, ImageDimensions } from '../simple-image-generator';

describe('Enhanced Example Illustration System', () => {
  let generator: SimpleImageGenerator;
  const defaultStyle: FlatLineStyle = {
    lineWeight: 'medium',
    colorScheme: 'monochrome',
    layout: 'horizontal',
    annotations: true
  };
  const defaultDimensions: ImageDimensions = { width: 600, height: 400 };

  beforeEach(() => {
    generator = new SimpleImageGenerator();
  });

  describe('Step-by-Step Visual Breakdown', () => {
    test('should create step-by-step layout for mathematics problems', () => {
      const exampleData: ExampleData = {
        problem: 'Solve the quadratic equation: x² + 5x + 6 = 0',
        solution: 'x = -2 or x = -3',
        steps: [
          {
            id: 'step_1',
            description: 'Factor the quadratic expression',
            formula: 'x² + 5x + 6 = (x + 2)(x + 3)',
            annotations: []
          },
          {
            id: 'step_2',
            description: 'Set each factor equal to zero',
            calculation: 'x + 2 = 0 or x + 3 = 0',
            annotations: []
          },
          {
            id: 'step_3',
            description: 'Solve for x',
            result: 'x = -2 or x = -3',
            annotations: []
          }
        ],
        visualElements: [],
        subjectArea: 'mathematics',
        template: 'step-by-step',
        annotations: []
      };

      const result = generator.createExampleIllustration(exampleData, defaultStyle, defaultDimensions);

      expect(result).toContain('<svg');
      expect(result).toContain('Step-by-Step Solution');
      expect(result).toContain('Problem:');
      expect(result).toContain('Step 1');
      expect(result).toContain('Step 2');
      expect(result).toContain('Step 3');
      expect(result).toContain('Final Answer');
      expect(result).toContain('Factor the quadratic');
      expect(result).toContain('x² + 5x + 6 = (x + 2)(x + 3)');
      expect(result).toContain('</svg>');
    });

    test('should create proof layout for mathematical proofs', () => {
      const exampleData: ExampleData = {
        problem: 'Prove that the sum of two even numbers is even',
        solution: 'Therefore, the sum of two even numbers is always even',
        steps: [
          {
            id: 'step_1',
            description: 'Let a and b be two even numbers',
            formula: 'a = 2m, b = 2n for integers m, n',
            annotations: []
          },
          {
            id: 'step_2',
            description: 'Calculate their sum',
            calculation: 'a + b = 2m + 2n = 2(m + n)',
            annotations: []
          },
          {
            id: 'step_3',
            description: 'Since (m + n) is an integer, 2(m + n) is even',
            annotations: []
          }
        ],
        visualElements: [],
        subjectArea: 'mathematics',
        template: 'proof',
        annotations: []
      };

      const result = generator.createExampleIllustration(exampleData, defaultStyle, defaultDimensions);

      expect(result).toContain('Mathematical Proof');
      expect(result).toContain('Given:');
      expect(result).toContain('∎'); // QED symbol
      expect(result).toContain('Let a and b be two even numbers');
      expect(result).toContain('a = 2m, b = 2n');
    });

    test('should create calculation layout for physics problems', () => {
      const exampleData: ExampleData = {
        problem: 'A car travels 100 km in 2 hours. Find its average speed.',
        solution: 'Average speed = 50 km/h',
        steps: [
          {
            id: 'step_1',
            description: 'Use the formula for average speed',
            formula: 'v = d/t',
            calculation: 'v = 100 km / 2 h = 50 km/h',
            annotations: []
          }
        ],
        visualElements: [],
        subjectArea: 'physics',
        template: 'calculation',
        annotations: []
      };

      const result = generator.createExampleIllustration(exampleData, defaultStyle, defaultDimensions);

      expect(result).toContain('Given');
      expect(result).toContain('Calculations:');
      expect(result).toContain('Result');
      expect(result).toContain('v = 100 km / 2 h = 50 km/h');
    });
  });

  describe('Subject Area Templates', () => {
    test('should apply mathematics template enhancements', async () => {
      const content = `subject: mathematics
template: step-by-step
problem: Solve x + 5 = 10
step 1: Subtract 5 from both sides
step 2: x = 5
solution: x = 5`;

      const result = await generator.generateFlatLineImage({
        type: 'example',
        content,
        context: 'algebra problem',
        style: defaultStyle,
        dimensions: defaultDimensions
      });

      expect(result).toBeDefined();
      expect(result.metadata.type).toBe('example');
      expect(result.svgContent).toContain('Step-by-Step Solution');
    });

    test('should apply physics template with given/find annotations', async () => {
      const content = `subject: physics
template: problem-solution
problem: Find the force when mass = 10 kg and acceleration = 5 m/s²
step 1: Use Newton's second law F = ma
step 2: F = 10 × 5 = 50 N
solution: F = 50 N`;

      const result = await generator.generateFlatLineImage({
        type: 'example',
        content,
        context: 'Newton\'s laws',
        style: defaultStyle,
        dimensions: defaultDimensions
      });

      expect(result).toBeDefined();
      expect(result.svgContent).toContain('Problem:');
      expect(result.svgContent).toContain('Solution Steps');
    });

    test('should apply chemistry experiment template', async () => {
      const content = `subject: chemistry
template: experiment
problem: Determine the pH of a solution
step 1: Prepare the pH indicator
step 2: Add indicator to solution
step 3: Compare color with pH chart
solution: pH = 7.2 (slightly basic)`;

      const result = await generator.generateFlatLineImage({
        type: 'example',
        content,
        context: 'acid-base chemistry',
        style: defaultStyle,
        dimensions: defaultDimensions
      });

      expect(result).toBeDefined();
      expect(result.svgContent).toContain('Problem:');
    });
  });

  describe('Enhanced Visual Elements', () => {
    test('should render enhanced visual elements with styles', () => {
      const exampleData: ExampleData = {
        problem: 'Test problem',
        solution: 'Test solution',
        steps: [],
        visualElements: [
          {
            type: 'highlight',
            content: 'Important',
            position: { x: 100, y: 50 },
            size: { width: 120, height: 25 },
            style: { color: '#FFD700', opacity: 0.5 }
          },
          {
            type: 'circle',
            content: 'Focus',
            position: { x: 200, y: 100 },
            size: { width: 60, height: 60 },
            style: { color: '#FF6B6B', strokeWidth: 3 }
          },
          {
            type: 'underline',
            content: 'Key term',
            position: { x: 150, y: 150 },
            size: { width: 80, height: 5 },
            style: { color: '#4ECDC4', dashArray: '5,5' }
          },
          {
            type: 'bracket',
            content: 'Group',
            position: { x: 300, y: 200 },
            size: { width: 10, height: 40 },
            style: { color: '#45B7D1' }
          }
        ],
        subjectArea: 'generic',
        template: 'problem-solution',
        annotations: []
      };

      const result = generator.createExampleIllustration(exampleData, defaultStyle, defaultDimensions);

      expect(result).toContain('fill="#FFD700"');
      expect(result).toContain('opacity="0.3"');
      expect(result).toContain('stroke="#FF6B6B"');
      expect(result).toContain('stroke-width="3"');
      expect(result).toContain('stroke="#4ECDC4"');
      expect(result).toContain('stroke-dasharray="5,5"');
      expect(result).toContain('stroke="#45B7D1"');
    });
  });

  describe('Annotation and Labeling System', () => {
    test('should render example annotations with custom styles', () => {
      const exampleData: ExampleData = {
        problem: 'Test problem',
        solution: 'Test solution',
        steps: [],
        visualElements: [],
        subjectArea: 'mathematics',
        template: 'problem-solution',
        annotations: [
          {
            id: 'def1',
            type: 'definition',
            content: 'Variable definition',
            position: { x: 50, y: 100 },
            style: {
              backgroundColor: '#E8F4FD',
              borderColor: '#2196F3',
              textColor: '#1976D2',
              fontSize: 11,
              fontWeight: 'bold'
            }
          },
          {
            id: 'tip1',
            type: 'tip',
            content: 'Helpful tip',
            position: { x: 200, y: 150 },
            style: {
              backgroundColor: '#FFF3E0',
              textColor: '#F57C00'
            }
          }
        ]
      };

      const result = generator.createExampleIllustration(exampleData, defaultStyle, defaultDimensions);

      expect(result).toContain('Variable definition');
      expect(result).toContain('Helpful tip');
      expect(result).toContain('fill="#E8F4FD"');
      expect(result).toContain('fill="#1976D2"');
      expect(result).toContain('font-size="11"');
    });

    test('should render step annotations with type-specific colors', () => {
      const exampleData: ExampleData = {
        problem: 'Test problem',
        solution: 'Test solution',
        steps: [
          {
            id: 'step_1',
            description: 'First step',
            annotations: [
              { type: 'variable', content: 'x is the unknown', target: 'x' },
              { type: 'operation', content: 'Addition operation', target: '+' },
              { type: 'result', content: 'Final result', target: 'result' }
            ]
          },
          {
            id: 'step_2',
            description: 'Second step',
            annotations: []
          },
          {
            id: 'step_3',
            description: 'Third step',
            annotations: []
          }
        ],
        visualElements: [],
        subjectArea: 'mathematics',
        template: 'step-by-step',
        annotations: []
      };

      const result = generator.createExampleIllustration(exampleData, defaultStyle, defaultDimensions);

      expect(result).toContain('x is the unknown');
      expect(result).toContain('Addition operation');
      expect(result).toContain('Final result');
      // Should contain different colors for different annotation types
      expect(result).toContain('#4A90E2'); // variable color
      expect(result).toContain('#E24A4A'); // operation color
      expect(result).toContain('#7ED321'); // result color
    });
  });

  describe('Content Parsing', () => {
    test('should parse complex example content with metadata', async () => {
      const content = `subject: mathematics
template: step-by-step
problem: Solve the system of equations: x + y = 5, 2x - y = 1
steps:
step 1: Add the equations to eliminate y $(x + y) + (2x - y) = 5 + 1$
step 2: Simplify to get 3x = 6, so x = 2
step 3: Substitute x = 2 into first equation: 2 + y = 5, so y = 3
solution: x = 2, y = 3`;

      const result = await generator.generateFlatLineImage({
        type: 'example',
        content,
        context: 'system of linear equations',
        style: defaultStyle,
        dimensions: defaultDimensions
      });

      expect(result).toBeDefined();
      expect(result.svgContent).toContain('Step-by-Step Solution');
      expect(result.svgContent).toContain('system of equations');
      expect(result.svgContent).toContain('Add the equations');
      expect(result.svgContent).toContain('x = 2, y = 3');
    });

    test('should handle fallback parsing for simple content', async () => {
      const content = `Find the area of a circle with radius 5 cm.

Use the formula A = πr²

A = π × 5² = 25π cm²

The area is 25π cm² ≈ 78.54 cm²`;

      const result = await generator.generateFlatLineImage({
        type: 'example',
        content,
        context: 'geometry',
        style: defaultStyle,
        dimensions: defaultDimensions
      });

      expect(result).toBeDefined();
      expect(result.svgContent).toContain('Problem:');
      expect(result.svgContent).toContain('Solution Steps');
      expect(result.svgContent).toContain('Answer');
    });
  });

  describe('Layout Determination', () => {
    test('should choose step-by-step layout for multiple steps', () => {
      const exampleData: ExampleData = {
        problem: 'Multi-step problem',
        solution: 'Final answer',
        steps: [
          { id: 'step_1', description: 'Step 1', annotations: [] },
          { id: 'step_2', description: 'Step 2', annotations: [] },
          { id: 'step_3', description: 'Step 3', annotations: [] }
        ],
        visualElements: [],
        subjectArea: 'mathematics',
        template: 'step-by-step',
        annotations: []
      };

      const result = generator.createExampleIllustration(exampleData, defaultStyle, defaultDimensions);

      expect(result).toContain('Step-by-Step Solution');
      expect(result).toContain('Step 1');
      expect(result).toContain('Step 2');
      expect(result).toContain('Step 3');
    });

    test('should choose calculation layout for formula-heavy content', () => {
      const exampleData: ExampleData = {
        problem: 'Physics calculation',
        solution: 'Final result',
        steps: [
          {
            id: 'step_1',
            description: 'Apply formula',
            formula: 'F = ma',
            calculation: 'F = 10 × 2 = 20 N',
            annotations: []
          }
        ],
        visualElements: [],
        subjectArea: 'physics',
        template: 'calculation',
        annotations: []
      };

      const result = generator.createExampleIllustration(exampleData, defaultStyle, defaultDimensions);

      expect(result).toContain('Given');
      expect(result).toContain('Calculations:');
      expect(result).toContain('F = 10 × 2 = 20 N');
    });
  });

  describe('Error Handling', () => {
    test('should handle empty example data gracefully', () => {
      const exampleData: ExampleData = {
        problem: '',
        solution: '',
        steps: [],
        visualElements: [],
        annotations: []
      };

      const result = generator.createExampleIllustration(exampleData, defaultStyle, defaultDimensions);

      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
      expect(result).toContain('Problem:');
    });

    test('should handle invalid subject area and template', async () => {
      const content = `subject: invalid-subject
template: invalid-template
problem: Test problem
solution: Test solution`;

      const result = await generator.generateFlatLineImage({
        type: 'example',
        content,
        context: 'test',
        style: defaultStyle,
        dimensions: defaultDimensions
      });

      expect(result).toBeDefined();
      expect(result.svgContent).toContain('Problem:');
    });
  });
});
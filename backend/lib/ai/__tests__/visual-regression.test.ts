/**
 * Visual Regression Tests for Generated Images
 * Task 14: Create unit tests for new components
 * Requirements: 2.1, 2.2, 2.3
 */

import { SimpleImageGenerator, FlatLineImageRequest, FlatLineStyle } from '../simple-image-generator';
import { createHash } from 'crypto';

describe('Visual Regression Tests for SimpleImageGenerator', () => {
  let generator: SimpleImageGenerator;

  beforeEach(() => {
    generator = new SimpleImageGenerator();
  });

  // Helper function to create a hash of SVG content for comparison
  const createSVGHash = (svgContent: string): string => {
    // Normalize SVG content by removing timestamps and random IDs
    const normalizedSVG = svgContent
      .replace(/id="[^"]*"/g, 'id="normalized"')
      .replace(/img_\d+_[a-z0-9]+/g, 'img_normalized')
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, 'normalized-timestamp');
    
    return createHash('md5').update(normalizedSVG).digest('hex');
  };

  // Helper function to extract key visual elements from SVG
  const extractVisualElements = (svgContent: string) => {
    return {
      hasText: svgContent.includes('<text'),
      hasLines: svgContent.includes('<line'),
      hasRects: svgContent.includes('<rect'),
      hasCircles: svgContent.includes('<circle'),
      hasPolygons: svgContent.includes('<polygon'),
      hasPaths: svgContent.includes('<path'),
      textCount: (svgContent.match(/<text/g) || []).length,
      shapeCount: (svgContent.match(/<(rect|circle|polygon|path|line)/g) || []).length
    };
  };

  describe('Equation Visualization Consistency', () => {
    const baseEquationRequest: FlatLineImageRequest = {
      type: 'equation',
      content: 'E = mc²',
      context: 'Einstein mass-energy equivalence',
      style: {
        lineWeight: 'medium',
        colorScheme: 'monochrome',
        layout: 'horizontal',
        annotations: true
      },
      dimensions: { width: 400, height: 300 }
    };

    it('should generate consistent SVG structure for same equation', async () => {
      const results = await Promise.all([
        generator.generateFlatLineImage(baseEquationRequest),
        generator.generateFlatLineImage(baseEquationRequest),
        generator.generateFlatLineImage(baseEquationRequest)
      ]);

      // Extract visual elements from each result
      const visualElements = results.map(r => extractVisualElements(r.svgContent));

      // All results should have the same visual structure
      expect(visualElements[0]).toEqual(visualElements[1]);
      expect(visualElements[1]).toEqual(visualElements[2]);

      // Should contain expected elements for equation
      visualElements.forEach(elements => {
        expect(elements.hasText).toBe(true);
        expect(elements.textCount).toBeGreaterThan(0);
      });
    });

    it('should maintain visual consistency across different mathematical notations', async () => {
      const equations = [
        'x² + 2x + 1 = 0',
        'f(x) = sin(θ) + cos(φ)',
        '∫₀¹ x dx = ½',
        'lim(x→∞) 1/x = 0',
        '∇²φ = ρ/ε₀'
      ];

      const results = await Promise.all(
        equations.map(equation => 
          generator.generateFlatLineImage({
            ...baseEquationRequest,
            content: equation
          })
        )
      );

      results.forEach((result, index) => {
        const elements = extractVisualElements(result.svgContent);
        
        // Each equation should have text elements
        expect(elements.hasText).toBe(true);
        expect(elements.textCount).toBeGreaterThan(0);
        
        // Should contain the original equation content
        expect(result.svgContent).toContain(equations[index].replace(/[²³¹⁰∞₀₁]/g, match => {
          // Handle special characters that might be converted
          return match;
        }));
        
        // Should have consistent SVG structure
        expect(result.svgContent).toMatch(/^<svg[^>]*>/);
        expect(result.svgContent).toMatch(/<\/svg>$/);
      });
    });

    it('should produce different visual output for different styles', async () => {
      const styles: FlatLineStyle[] = [
        { lineWeight: 'thin', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        { lineWeight: 'thick', colorScheme: 'monochrome', layout: 'horizontal', annotations: true },
        { lineWeight: 'medium', colorScheme: 'minimal-color', layout: 'horizontal', annotations: true },
        { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'vertical', annotations: true },
        { lineWeight: 'medium', colorScheme: 'monochrome', layout: 'horizontal', annotations: false }
      ];

      const results = await Promise.all(
        styles.map(style => 
          generator.generateFlatLineImage({
            ...baseEquationRequest,
            style
          })
        )
      );

      // Each style should produce different visual output
      const hashes = results.map(r => createSVGHash(r.svgContent));
      const uniqueHashes = new Set(hashes);
      
      // Should have different visual representations for different styles
      expect(uniqueHashes.size).toBeGreaterThan(1);

      // But all should contain the equation content
      results.forEach(result => {
        expect(result.svgContent).toContain('E = mc²');
      });
    });
  });

  describe('Concept Diagram Visual Consistency', () => {
    const baseConceptRequest: FlatLineImageRequest = {
      type: 'concept',
      content: `Simple Process Flow
      title: Basic Workflow
      elements:
      - id: start, label: Start, type: start
      - id: process, label: Process Data, type: process
      - id: decision, label: Valid?, type: decision
      - id: end, label: End, type: end
      relationships:
      - from: start, to: process, type: arrow
      - from: process, to: decision, type: arrow
      - from: decision, to: end, type: arrow`,
      context: 'Basic workflow diagram',
      style: {
        lineWeight: 'medium',
        colorScheme: 'monochrome',
        layout: 'vertical',
        annotations: true
      },
      dimensions: { width: 500, height: 400 }
    };

    it('should generate consistent flowchart elements', async () => {
      const result = await generator.generateFlatLineImage(baseConceptRequest);
      const elements = extractVisualElements(result.svgContent);

      // Should contain expected flowchart elements
      expect(elements.hasText).toBe(true);
      expect(elements.hasCircles).toBe(true); // start/end nodes
      expect(elements.hasRects).toBe(true); // process nodes
      expect(elements.hasPolygons).toBe(true); // decision nodes
      expect(elements.hasLines).toBe(true); // connections

      // Should contain expected labels
      expect(result.svgContent).toContain('Start');
      expect(result.svgContent).toContain('Process Data');
      expect(result.svgContent).toContain('Valid?');
      expect(result.svgContent).toContain('End');
    });

    it('should maintain consistent layout for different diagram types', async () => {
      const diagramTypes = [
        'flowchart',
        'hierarchy',
        'network',
        'timeline'
      ];

      const results = await Promise.all(
        diagramTypes.map(type => 
          generator.generateFlatLineImage({
            ...baseConceptRequest,
            content: `${baseConceptRequest.content}\ndiagramType: ${type}`
          })
        )
      );

      results.forEach((result, index) => {
        const elements = extractVisualElements(result.svgContent);
        
        // All should have basic structural elements
        expect(elements.hasText).toBe(true);
        expect(elements.textCount).toBeGreaterThan(0);
        
        // Should contain title
        expect(result.svgContent).toContain('Basic Workflow');
      });
    });

    it('should handle complex hierarchical structures consistently', async () => {
      const hierarchyRequest: FlatLineImageRequest = {
        ...baseConceptRequest,
        content: `Organization Structure
        title: Company Hierarchy
        elements:
        - id: ceo, label: CEO, type: node, level: 0
        - id: cto, label: CTO, type: node, level: 1
        - id: cfo, label: CFO, type: node, level: 1
        - id: dev1, label: Dev Team 1, type: node, level: 2
        - id: dev2, label: Dev Team 2, type: node, level: 2
        - id: finance, label: Finance Team, type: node, level: 2
        relationships:
        - from: ceo, to: cto, type: arrow
        - from: ceo, to: cfo, type: arrow
        - from: cto, to: dev1, type: arrow
        - from: cto, to: dev2, type: arrow
        - from: cfo, to: finance, type: arrow`,
        dimensions: { width: 600, height: 500 }
      };

      const result = await generator.generateFlatLineImage(hierarchyRequest);
      const elements = extractVisualElements(result.svgContent);

      // Should have hierarchical structure
      expect(elements.hasText).toBe(true);
      expect(elements.textCount).toBeGreaterThanOrEqual(6); // All nodes
      expect(elements.hasLines).toBe(true); // Connections
      
      // Should contain all hierarchy levels
      expect(result.svgContent).toContain('CEO');
      expect(result.svgContent).toContain('CTO');
      expect(result.svgContent).toContain('CFO');
      expect(result.svgContent).toContain('Dev Team');
      expect(result.svgContent).toContain('Finance Team');
    });
  });

  describe('Example Illustration Visual Consistency', () => {
    const baseExampleRequest: FlatLineImageRequest = {
      type: 'example',
      content: `subject: mathematics
      template: step-by-step
      problem: Solve 2x + 4 = 10
      solution: x = 3
      steps:
      step 1: Subtract 4 from both sides
      description: 2x + 4 - 4 = 10 - 4
      result: 2x = 6
      step 2: Divide both sides by 2
      description: 2x ÷ 2 = 6 ÷ 2
      result: x = 3`,
      context: 'Linear equation solving',
      style: {
        lineWeight: 'medium',
        colorScheme: 'monochrome',
        layout: 'vertical',
        annotations: true
      },
      dimensions: { width: 500, height: 600 }
    };

    it('should generate consistent step-by-step layout', async () => {
      const result = await generator.generateFlatLineImage(baseExampleRequest);
      const elements = extractVisualElements(result.svgContent);

      // Should have structured layout
      expect(elements.hasText).toBe(true);
      expect(elements.hasRects).toBe(true); // Section boxes
      expect(elements.textCount).toBeGreaterThan(5); // Problem, steps, solution

      // Should contain expected content
      expect(result.svgContent).toContain('Step-by-Step Solution');
      expect(result.svgContent).toContain('Problem:');
      expect(result.svgContent).toContain('2x + 4 = 10');
      expect(result.svgContent).toContain('x = 3');
      expect(result.svgContent).toContain('Step 1');
      expect(result.svgContent).toContain('Step 2');
    });

    it('should maintain consistency across different subject areas', async () => {
      const subjects = [
        { area: 'mathematics', problem: 'Find derivative of x²', solution: '2x' },
        { area: 'physics', problem: 'Calculate force F = ma', solution: 'F = 10N' },
        { area: 'chemistry', problem: 'Balance H₂ + O₂ → H₂O', solution: '2H₂ + O₂ → 2H₂O' }
      ];

      const results = await Promise.all(
        subjects.map(subject => 
          generator.generateFlatLineImage({
            ...baseExampleRequest,
            content: `subject: ${subject.area}
            template: problem-solution
            problem: ${subject.problem}
            solution: ${subject.solution}
            steps:
            step 1: Apply relevant principles
            description: Use ${subject.area} concepts`
          })
        )
      );

      results.forEach((result, index) => {
        const elements = extractVisualElements(result.svgContent);
        const subject = subjects[index];
        
        // Should have consistent structure
        expect(elements.hasText).toBe(true);
        expect(elements.hasRects).toBe(true);
        
        // Should contain subject-specific content
        expect(result.svgContent).toContain(subject.problem);
        expect(result.svgContent).toContain(subject.solution);
      });
    });

    it('should handle different template layouts consistently', async () => {
      const templates = ['step-by-step', 'problem-solution', 'proof', 'calculation'];

      const results = await Promise.all(
        templates.map(template => 
          generator.generateFlatLineImage({
            ...baseExampleRequest,
            content: `${baseExampleRequest.content.replace('step-by-step', template)}`
          })
        )
      );

      results.forEach((result, index) => {
        const elements = extractVisualElements(result.svgContent);
        const template = templates[index];
        
        // All should have text and structure
        expect(elements.hasText).toBe(true);
        expect(elements.textCount).toBeGreaterThan(0);
        
        // Should contain problem content
        expect(result.svgContent).toContain('2x + 4 = 10');
        
        // Different templates should have different layouts
        if (template === 'proof') {
          expect(result.svgContent).toContain('Mathematical Proof');
        } else if (template === 'step-by-step') {
          expect(result.svgContent).toContain('Step-by-Step Solution');
        }
      });
    });
  });

  describe('Cross-Browser and Rendering Consistency', () => {
    it('should generate SVG compatible with different renderers', async () => {
      const request: FlatLineImageRequest = {
        type: 'equation',
        content: 'Complex equation: ∫₀^∞ e^(-x²) dx = √π/2',
        context: 'Gaussian integral',
        style: {
          lineWeight: 'medium',
          colorScheme: 'monochrome',
          layout: 'horizontal',
          annotations: true
        },
        dimensions: { width: 600, height: 200 }
      };

      const result = await generator.generateFlatLineImage(request);

      // Should have proper SVG structure
      expect(result.svgContent).toMatch(/^<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*>/);
      expect(result.svgContent).toMatch(/<\/svg>$/);
      
      // Should have proper viewBox
      expect(result.svgContent).toMatch(/viewBox="0 0 \d+ \d+"/);
      
      // Should use standard SVG elements
      const validElements = ['svg', 'text', 'rect', 'circle', 'line', 'path', 'polygon', 'g', 'defs', 'marker'];
      const usedElements = result.svgContent.match(/<(\w+)/g)?.map(match => match.substring(1)) || [];
      
      usedElements.forEach(element => {
        expect(validElements).toContain(element);
      });
    });

    it('should handle special characters and Unicode consistently', async () => {
      const specialCharacters = [
        'α β γ δ ε ζ η θ',
        '∑ ∏ ∫ ∂ ∇ ∞',
        '≤ ≥ ≠ ≈ ± ∓',
        '√ ∛ ∜ ² ³ ⁴',
        '₀ ₁ ₂ ₃ ₄ ₅'
      ];

      const results = await Promise.all(
        specialCharacters.map(chars => 
          generator.generateFlatLineImage({
            type: 'equation',
            content: `Special characters: ${chars}`,
            context: 'Unicode test',
            style: {
              lineWeight: 'medium',
              colorScheme: 'monochrome',
              layout: 'horizontal',
              annotations: false
            },
            dimensions: { width: 500, height: 150 }
          })
        )
      );

      results.forEach((result, index) => {
        // Should contain the special characters (possibly converted)
        expect(result.svgContent).toContain('Special characters');
        
        // Should be valid SVG
        expect(result.svgContent).toMatch(/^<svg[^>]*>/);
        expect(result.svgContent).toMatch(/<\/svg>$/);
        
        // Should properly escape XML characters
        expect(result.svgContent).not.toMatch(/[<>&"'](?![^<]*>)/);
      });
    });
  });

  describe('Performance and Memory Consistency', () => {
    it('should generate images with consistent performance characteristics', async () => {
      const requests = Array(10).fill(null).map((_, i) => ({
        type: 'concept' as const,
        content: `Performance Test ${i}
        title: Test Diagram ${i}
        elements: ${Array(5).fill(null).map((_, j) => 
          `- id: node${j}, label: Node ${j}, type: node`
        ).join('\n')}
        relationships: ${Array(4).fill(null).map((_, j) => 
          `- from: node${j}, to: node${j+1}, type: arrow`
        ).join('\n')}`,
        context: `Performance test ${i}`,
        style: {
          lineWeight: 'medium' as const,
          colorScheme: 'monochrome' as const,
          layout: 'horizontal' as const,
          annotations: true
        },
        dimensions: { width: 400, height: 300 }
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(request => generator.generateFlatLineImage(request))
      );
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);

      // All results should be valid
      results.forEach((result, i) => {
        expect(result).toBeDefined();
        expect(result.svgContent).toContain(`Test Diagram ${i}`);
        expect(result.dimensions.width).toBe(400);
        expect(result.dimensions.height).toBe(300);
      });

      // Should have consistent structure
      const elementCounts = results.map(r => extractVisualElements(r.svgContent));
      elementCounts.forEach(elements => {
        expect(elements.hasText).toBe(true);
        expect(elements.textCount).toBeGreaterThan(5); // Title + nodes
      });
    });

    it('should maintain consistent output size for similar content', async () => {
      const similarRequests = Array(5).fill(null).map((_, i) => ({
        type: 'equation' as const,
        content: `y = ${i}x + ${i}`,
        context: 'Linear equation',
        style: {
          lineWeight: 'medium' as const,
          colorScheme: 'monochrome' as const,
          layout: 'horizontal' as const,
          annotations: true
        },
        dimensions: { width: 400, height: 200 }
      }));

      const results = await Promise.all(
        similarRequests.map(request => generator.generateFlatLineImage(request))
      );

      // Should have similar SVG sizes
      const sizes = results.map(r => r.svgContent.length);
      const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
      
      sizes.forEach(size => {
        // Should be within 20% of average size
        expect(Math.abs(size - avgSize) / avgSize).toBeLessThan(0.2);
      });

      // Should all have same dimensions
      results.forEach(result => {
        expect(result.dimensions.width).toBe(400);
        expect(result.dimensions.height).toBe(200);
      });
    });
  });
});
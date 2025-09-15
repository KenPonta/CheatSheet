/**
 * Test suite for enhanced concept diagram generator
 */

import { SimpleImageGenerator, ConceptData, FlatLineStyle, ImageDimensions } from '../simple-image-generator';

describe('Enhanced Concept Diagram Generator', () => {
  let generator: SimpleImageGenerator;
  let defaultStyle: FlatLineStyle;
  let defaultDimensions: ImageDimensions;

  beforeEach(() => {
    generator = new SimpleImageGenerator();
    defaultStyle = {
      lineWeight: 'medium',
      colorScheme: 'monochrome',
      layout: 'horizontal',
      annotations: true
    };
    defaultDimensions = {
      width: 600,
      height: 400
    };
  });

  describe('Basic Concept Diagram Creation', () => {
    it('should create a simple concept diagram', async () => {
      const conceptData: ConceptData = {
        title: 'Simple Process',
        elements: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'process', label: 'Process', type: 'process' },
          { id: 'end', label: 'End', type: 'end' }
        ],
        relationships: [
          { from: 'start', to: 'process', type: 'arrow' },
          { from: 'process', to: 'end', type: 'arrow' }
        ]
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('<svg');
      expect(result).toContain('Simple Process');
      expect(result).toContain('Start');
      expect(result).toContain('Process');
      expect(result).toContain('End');
      expect(result).toContain('</svg>');
    });

    it('should handle different element types', async () => {
      const conceptData: ConceptData = {
        title: 'Element Types Demo',
        elements: [
          { id: 'node', label: 'Node', type: 'node' },
          { id: 'process', label: 'Process', type: 'process' },
          { id: 'decision', label: 'Decision', type: 'decision' },
          { id: 'data', label: 'Data', type: 'data' },
          { id: 'connector', label: 'Connector', type: 'connector' }
        ],
        relationships: []
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('<circle'); // node
      expect(result).toContain('<rect'); // process
      expect(result).toContain('<polygon'); // decision and data
    });
  });

  describe('Flowchart Layout', () => {
    it('should create a flowchart with proper top-to-bottom flow', async () => {
      const conceptData: ConceptData = {
        title: 'Decision Flowchart',
        diagramType: 'flowchart',
        elements: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'input', label: 'Get Input', type: 'process' },
          { id: 'check', label: 'Valid?', type: 'decision' },
          { id: 'process', label: 'Process Data', type: 'process' },
          { id: 'error', label: 'Show Error', type: 'process' },
          { id: 'end', label: 'End', type: 'end' }
        ],
        relationships: [
          { from: 'start', to: 'input', type: 'arrow' },
          { from: 'input', to: 'check', type: 'arrow' },
          { from: 'check', to: 'process', type: 'arrow', label: 'Yes' },
          { from: 'check', to: 'error', type: 'arrow', label: 'No' },
          { from: 'process', to: 'end', type: 'arrow' },
          { from: 'error', to: 'input', type: 'arrow' }
        ]
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('Decision Flowchart');
      expect(result).toContain('Valid?');
      expect(result).toContain('Yes');
      expect(result).toContain('No');
    });
  });

  describe('Hierarchy Layout', () => {
    it('should create a hierarchical diagram with levels', async () => {
      const conceptData: ConceptData = {
        title: 'Organizational Hierarchy',
        diagramType: 'hierarchy',
        elements: [
          { id: 'ceo', label: 'CEO', type: 'node', level: 0 },
          { id: 'cto', label: 'CTO', type: 'node', level: 1 },
          { id: 'cfo', label: 'CFO', type: 'node', level: 1 },
          { id: 'dev1', label: 'Developer 1', type: 'node', level: 2 },
          { id: 'dev2', label: 'Developer 2', type: 'node', level: 2 }
        ],
        relationships: [
          { from: 'ceo', to: 'cto', type: 'arrow' },
          { from: 'ceo', to: 'cfo', type: 'arrow' },
          { from: 'cto', to: 'dev1', type: 'arrow' },
          { from: 'cto', to: 'dev2', type: 'arrow' }
        ]
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('Organizational Hierarchy');
      expect(result).toContain('CEO');
      expect(result).toContain('CTO');
      expect(result).toContain('Developer 1');
    });
  });

  describe('Timeline Layout', () => {
    it('should create a timeline with horizontal sequence', async () => {
      const conceptData: ConceptData = {
        title: 'Project Timeline',
        diagramType: 'timeline',
        elements: [
          { id: 'planning', label: 'Planning', type: 'process' },
          { id: 'design', label: 'Design', type: 'process' },
          { id: 'development', label: 'Development', type: 'process' },
          { id: 'testing', label: 'Testing', type: 'process' },
          { id: 'deployment', label: 'Deployment', type: 'process' }
        ],
        relationships: [
          { from: 'planning', to: 'design', type: 'arrow' },
          { from: 'design', to: 'development', type: 'arrow' },
          { from: 'development', to: 'testing', type: 'arrow' },
          { from: 'testing', to: 'deployment', type: 'arrow' }
        ]
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('Project Timeline');
      expect(result).toContain('Planning');
      expect(result).toContain('Deployment');
    });
  });

  describe('Cycle Layout', () => {
    it('should create a circular cycle diagram', async () => {
      const conceptData: ConceptData = {
        title: 'PDCA Cycle',
        diagramType: 'cycle',
        elements: [
          { id: 'plan', label: 'Plan', type: 'process' },
          { id: 'do', label: 'Do', type: 'process' },
          { id: 'check', label: 'Check', type: 'process' },
          { id: 'act', label: 'Act', type: 'process' }
        ],
        relationships: [
          { from: 'plan', to: 'do', type: 'arrow' },
          { from: 'do', to: 'check', type: 'arrow' },
          { from: 'check', to: 'act', type: 'arrow' },
          { from: 'act', to: 'plan', type: 'arrow' }
        ]
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('PDCA Cycle');
      expect(result).toContain('Plan');
      expect(result).toContain('Check');
    });
  });

  describe('Predefined Templates', () => {
    it('should apply scientific method template', async () => {
      const conceptData: ConceptData = {
        title: 'Scientific Method',
        template: 'scientific-method',
        elements: [],
        relationships: []
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('Scientific Method');
      expect(result).toContain('Observation');
      expect(result).toContain('Hypothesis');
      expect(result).toContain('Experiment');
      expect(result).toContain('Analysis');
      expect(result).toContain('Conclusion');
    });

    it('should apply learning hierarchy template', async () => {
      const conceptData: ConceptData = {
        title: 'Bloom\'s Taxonomy',
        template: 'learning-hierarchy',
        elements: [],
        relationships: []
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('Bloom&#39;s Taxonomy');
      expect(result).toContain('Knowledge');
      expect(result).toContain('Comprehension');
      expect(result).toContain('Application');
      expect(result).toContain('Evaluation');
    });

    it('should apply problem solving template', async () => {
      const conceptData: ConceptData = {
        title: 'Problem Solving Process',
        template: 'problem-solving',
        elements: [],
        relationships: []
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('Problem Solving Process');
      expect(result).toContain('Identify');
      expect(result).toContain('Generate');
      expect(result).toContain('Evaluate');
    });
  });

  describe('Enhanced Relationships', () => {
    it('should handle bidirectional relationships', async () => {
      const conceptData: ConceptData = {
        title: 'Bidirectional Flow',
        elements: [
          { id: 'client', label: 'Client', type: 'node' },
          { id: 'server', label: 'Server', type: 'node' }
        ],
        relationships: [
          { from: 'client', to: 'server', type: 'bidirectional', label: 'HTTP' }
        ]
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('Client');
      expect(result).toContain('Server');
      expect(result).toContain('HTTP');
    });

    it('should handle curved relationships', async () => {
      const conceptData: ConceptData = {
        title: 'Curved Connections',
        elements: [
          { id: 'a', label: 'A', type: 'node' },
          { id: 'b', label: 'B', type: 'node' }
        ],
        relationships: [
          { from: 'a', to: 'b', type: 'curved', label: 'feedback' }
        ]
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('<path'); // Curved path
      expect(result).toContain('feedback');
    });

    it('should handle dashed relationships', async () => {
      const conceptData: ConceptData = {
        title: 'Dashed Connections',
        elements: [
          { id: 'a', label: 'A', type: 'node' },
          { id: 'b', label: 'B', type: 'node' }
        ],
        relationships: [
          { from: 'a', to: 'b', type: 'dashed', label: 'optional' }
        ]
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('stroke-dasharray');
      expect(result).toContain('optional');
    });
  });

  describe('Grouping and Background Elements', () => {
    it('should draw group containers', async () => {
      const conceptData: ConceptData = {
        title: 'Grouped Elements',
        elements: [
          { id: 'a', label: 'A', type: 'node', group: 'frontend' },
          { id: 'b', label: 'B', type: 'node', group: 'frontend' },
          { id: 'c', label: 'C', type: 'node', group: 'backend' },
          { id: 'd', label: 'D', type: 'node', group: 'backend' }
        ],
        relationships: []
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('frontend');
      expect(result).toContain('backend');
      expect(result).toContain('stroke-dasharray="3,3"'); // Group container styling
    });
  });

  describe('Legend Generation', () => {
    it('should show legend when multiple element types are present', async () => {
      const conceptData: ConceptData = {
        title: 'Multi-Type Diagram',
        elements: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'process', label: 'Process', type: 'process' },
          { id: 'decision', label: 'Decision', type: 'decision' },
          { id: 'data', label: 'Data', type: 'data' }
        ],
        relationships: []
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('Legend');
      expect(result).toContain('start');
      expect(result).toContain('process');
      expect(result).toContain('decision');
      expect(result).toContain('data');
    });
  });

  describe('Content Parsing', () => {
    it('should parse concept data from string with metadata', async () => {
      const content = `title: Advanced Flowchart
type: flowchart
template: scientific-method
Start [type:start]
Process Data [type:process] [group:main]
Make Decision [type:decision]
End [type:end]
Start -> Process Data
Process Data -> Make Decision [label:evaluate]
Make Decision -> End [label:yes]
Make Decision -> Start [label:no]`;

      const request = {
        type: 'concept' as const,
        content,
        context: 'academic diagram',
        style: defaultStyle,
        dimensions: defaultDimensions
      };

      const result = await generator.generateFlatLineImage(request);
      
      expect(result.svgContent).toContain('Advanced Flowchart');
      expect(result.svgContent).toContain('Start');
      expect(result.svgContent).toContain('Process Data');
      expect(result.svgContent).toContain('Make');
      expect(result.svgContent).toContain('evaluate');
      expect(result.metadata.type).toBe('concept');
    });

    it('should parse different relationship types', async () => {
      const content = `Simple Relationships
A
B
C
D [bidirectional]
E
F [simple line]
G
H [explicit arrow]
A -> B
C <-> D
E -- F
G --> H`;

      const request = {
        type: 'concept' as const,
        content,
        context: 'relationship demo',
        style: defaultStyle,
        dimensions: defaultDimensions
      };

      const result = await generator.generateFlatLineImage(request);
      
      expect(result.svgContent).toContain('Simple Relationships');
      expect(result.svgContent).toContain('A');
      expect(result.svgContent).toContain('B');
      expect(result.svgContent).toContain('C');
      expect(result.svgContent).toContain('D');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty concept data gracefully', async () => {
      const conceptData: ConceptData = {
        title: 'Empty Diagram',
        elements: [],
        relationships: []
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('<svg');
      expect(result).toContain('Empty Diagram');
      expect(result).toContain('</svg>');
    });

    it('should handle invalid relationships gracefully', async () => {
      const conceptData: ConceptData = {
        title: 'Invalid Relationships',
        elements: [
          { id: 'a', label: 'A', type: 'node' }
        ],
        relationships: [
          { from: 'a', to: 'nonexistent', type: 'arrow' },
          { from: 'nonexistent', to: 'a', type: 'arrow' }
        ]
      };

      const result = generator.createConceptDiagram(conceptData, defaultStyle, defaultDimensions);
      
      expect(result).toContain('<svg');
      expect(result).toContain('Invalid Relationships');
      expect(result).toContain('</svg>');
    });
  });

  describe('Style Variations', () => {
    it('should handle different line weights', async () => {
      const conceptData: ConceptData = {
        title: 'Style Test',
        elements: [{ id: 'test', label: 'Test', type: 'node' }],
        relationships: []
      };

      const thickStyle = { ...defaultStyle, lineWeight: 'thick' as const };
      const result = generator.createConceptDiagram(conceptData, thickStyle, defaultDimensions);
      
      expect(result).toContain('stroke-width="3"');
    });

    it('should handle different color schemes', async () => {
      const conceptData: ConceptData = {
        title: 'Color Test',
        elements: [{ id: 'test', label: 'Test', type: 'node' }],
        relationships: []
      };

      const colorStyle = { ...defaultStyle, colorScheme: 'minimal-color' as const };
      const result = generator.createConceptDiagram(conceptData, colorStyle, defaultDimensions);
      
      expect(result).toContain('fill="#333"');
    });
  });
});
// Tests for Academic Structure Organizer

import {
  AcademicStructureOrganizer,
  getAcademicStructureOrganizer,
  AcademicStructureConfig
} from '../academic-structure-organizer';
import {
  EnhancedExtractedContent,
  MathematicalContent,
  Formula,
  WorkedExample,
  SolutionStep,
  AcademicDocument
} from '../types';

describe('AcademicStructureOrganizer', () => {
  let organizer: AcademicStructureOrganizer;
  let mockProbabilityContent: EnhancedExtractedContent;
  let mockRelationsContent: EnhancedExtractedContent;

  beforeEach(() => {
    organizer = new AcademicStructureOrganizer();

    // Mock probability content
    const probabilityFormulas: Formula[] = [
      {
        id: 'f1',
        latex: 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)',
        context: 'probability union formula',
        type: 'display',
        sourceLocation: { fileId: 'prob1', page: 1 },
        isKeyFormula: true,
        confidence: 0.95
      },
      {
        id: 'f2',
        latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
        context: 'conditional probability formula',
        type: 'display',
        sourceLocation: { fileId: 'prob1', page: 2 },
        isKeyFormula: true,
        confidence: 0.98
      }
    ];

    const probabilityExamples: WorkedExample[] = [
      {
        id: 'ex1',
        title: 'Conditional Probability Example',
        problem: 'Find P(A|B) given P(A∩B) = 0.3 and P(B) = 0.6',
        solution: [
          {
            stepNumber: 1,
            description: 'Apply conditional probability formula',
            formula: 'P(A|B) = P(A∩B)/P(B)',
            explanation: 'Use the definition of conditional probability'
          },
          {
            stepNumber: 2,
            description: 'Substitute values',
            formula: 'P(A|B) = 0.3/0.6 = 0.5',
            explanation: 'Calculate the result'
          }
        ],
        sourceLocation: { fileId: 'prob1', page: 2 },
        subtopic: 'conditional probability',
        confidence: 0.92,
        isComplete: true
      }
    ];

    const probabilityMathContent: MathematicalContent = {
      formulas: probabilityFormulas,
      workedExamples: probabilityExamples,
      definitions: [],
      theorems: []
    };

    mockProbabilityContent = {
      text: 'This document covers probability basics, conditional probability, and Bayes theorem. The probability of the union of two events A and B is given by P(A ∪ B) = P(A) + P(B) - P(A ∩ B). Conditional probability is defined as P(A|B) = P(A ∩ B)/P(B).',
      images: [],
      tables: [],
      metadata: {
        name: 'probability.pdf',
        size: 1000,
        type: 'application/pdf',
        lastModified: new Date(),
        pageCount: 5
      },
      structure: {
        headings: [],
        sections: [],
        hierarchy: 2
      },
      mathematicalContent: probabilityMathContent,
      contentPreservation: {
        totalFormulasFound: 2,
        formulasPreserved: 2,
        totalExamplesFound: 1,
        examplesPreserved: 1,
        preservationScore: 1.0,
        issues: [],
        validationResults: []
      }
    };

    // Mock relations content
    const relationsFormulas: Formula[] = [
      {
        id: 'r1',
        latex: 'R \\subseteq A \\times B',
        context: 'relation definition',
        type: 'inline',
        sourceLocation: { fileId: 'rel1', page: 1 },
        isKeyFormula: true,
        confidence: 0.90
      }
    ];

    const relationsExamples: WorkedExample[] = [
      {
        id: 'rex1',
        title: 'Reflexive Relation Check',
        problem: 'Determine if relation R = {(1,1), (2,2), (3,3)} on set {1,2,3} is reflexive',
        solution: [
          {
            stepNumber: 1,
            description: 'Check if (a,a) ∈ R for all a in the set',
            explanation: 'A relation is reflexive if every element is related to itself'
          }
        ],
        sourceLocation: { fileId: 'rel1', page: 3 },
        subtopic: 'reflexive relations',
        confidence: 0.88,
        isComplete: true
      }
    ];

    const relationsMathContent: MathematicalContent = {
      formulas: relationsFormulas,
      workedExamples: relationsExamples,
      definitions: [],
      theorems: []
    };

    mockRelationsContent = {
      text: 'Relations are subsets of cartesian products. A relation R on set A is reflexive if for every element a in A, (a,a) is in R. Relations can be symmetric, antisymmetric, or transitive.',
      images: [],
      tables: [],
      metadata: {
        name: 'relations.pdf',
        size: 800,
        type: 'application/pdf',
        lastModified: new Date(),
        pageCount: 3
      },
      structure: {
        headings: [],
        sections: [],
        hierarchy: 2
      },
      mathematicalContent: relationsMathContent,
      contentPreservation: {
        totalFormulasFound: 1,
        formulasPreserved: 1,
        totalExamplesFound: 1,
        examplesPreserved: 1,
        preservationScore: 1.0,
        issues: [],
        validationResults: []
      }
    };
  });

  describe('constructor', () => {
    it('should create organizer with default config', () => {
      expect(organizer).toBeInstanceOf(AcademicStructureOrganizer);
    });

    it('should create organizer with custom config', () => {
      const customConfig: Partial<AcademicStructureConfig> = {
        enableCrossReferences: false,
        partTitles: {
          part1: 'Custom Probability',
          part2: 'Custom Relations'
        }
      };

      const customOrganizer = new AcademicStructureOrganizer(customConfig);
      expect(customOrganizer).toBeInstanceOf(AcademicStructureOrganizer);
    });
  });

  describe('organizeContent', () => {
    it('should organize content into academic document structure', () => {
      const extractedContents = [mockProbabilityContent, mockRelationsContent];
      const result = organizer.organizeContent(extractedContents, 'Test Study Guide');

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Study Guide');
      expect(result.parts).toHaveLength(2);
      expect(result.tableOfContents).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should create Part I for Discrete Probability', () => {
      const extractedContents = [mockProbabilityContent, mockRelationsContent];
      const result = organizer.organizeContent(extractedContents);

      const part1 = result.parts[0];
      expect(part1.partNumber).toBe(1);
      expect(part1.title).toBe('Discrete Probability');
      expect(part1.sections).toHaveLength(8); // 8 probability sections
    });

    it('should create Part II for Relations', () => {
      const extractedContents = [mockProbabilityContent, mockRelationsContent];
      const result = organizer.organizeContent(extractedContents);

      const part2 = result.parts[1];
      expect(part2.partNumber).toBe(2);
      expect(part2.title).toBe('Relations');
      expect(part2.sections).toHaveLength(5); // 5 relations sections
    });

    it('should generate proper section numbering', () => {
      const extractedContents = [mockProbabilityContent, mockRelationsContent];
      const result = organizer.organizeContent(extractedContents);

      // Check Part I section numbering
      const part1Sections = result.parts[0].sections;
      expect(part1Sections[0].sectionNumber).toBe('1.1');
      expect(part1Sections[1].sectionNumber).toBe('1.2');
      expect(part1Sections[7].sectionNumber).toBe('1.8');

      // Check Part II section numbering
      const part2Sections = result.parts[1].sections;
      expect(part2Sections[0].sectionNumber).toBe('2.1');
      expect(part2Sections[1].sectionNumber).toBe('2.2');
      expect(part2Sections[4].sectionNumber).toBe('2.5');
    });

    it('should number formulas with section-based IDs', () => {
      const extractedContents = [mockProbabilityContent];
      const result = organizer.organizeContent(extractedContents);

      // Find section with formulas
      const sectionsWithFormulas = result.parts[0].sections.filter(s => s.formulas.length > 0);
      expect(sectionsWithFormulas.length).toBeGreaterThan(0);

      const firstSection = sectionsWithFormulas[0];
      expect(firstSection.formulas[0].id).toMatch(/^\d+\.\d+\.\d+$/); // e.g., "1.1.1"
    });

    it('should number examples with Ex. prefix', () => {
      const extractedContents = [mockProbabilityContent];
      const result = organizer.organizeContent(extractedContents);

      // Find section with examples
      const sectionsWithExamples = result.parts[0].sections.filter(s => s.examples.length > 0);
      expect(sectionsWithExamples.length).toBeGreaterThan(0);

      const firstSection = sectionsWithExamples[0];
      expect(firstSection.examples[0].id).toMatch(/^Ex\.\d+\.\d+\.\d+$/); // e.g., "Ex.1.1.1"
    });
  });

  describe('table of contents generation', () => {
    it('should generate table of contents with proper structure', () => {
      const extractedContents = [mockProbabilityContent, mockRelationsContent];
      const result = organizer.organizeContent(extractedContents);

      expect(result.tableOfContents).toHaveLength(2); // 2 parts

      const part1TOC = result.tableOfContents[0];
      expect(part1TOC.level).toBe(1);
      expect(part1TOC.title).toBe('Part 1: Discrete Probability');
      expect(part1TOC.pageAnchor).toBe('part-1');
      expect(part1TOC.children).toHaveLength(8); // 8 sections

      const part2TOC = result.tableOfContents[1];
      expect(part2TOC.level).toBe(1);
      expect(part2TOC.title).toBe('Part 2: Relations');
      expect(part2TOC.pageAnchor).toBe('part-2');
      expect(part2TOC.children).toHaveLength(5); // 5 sections
    });

    it('should generate page anchors for sections', () => {
      const extractedContents = [mockProbabilityContent, mockRelationsContent];
      const result = organizer.organizeContent(extractedContents);

      const firstSectionTOC = result.tableOfContents[0].children[0];
      expect(firstSectionTOC.level).toBe(2);
      expect(firstSectionTOC.sectionNumber).toBe('1.1');
      expect(firstSectionTOC.pageAnchor).toBe('section-1-1');
    });
  });

  describe('cross-reference generation', () => {
    it('should generate cross-references when enabled', () => {
      const extractedContents = [mockProbabilityContent, mockRelationsContent];
      const result = organizer.organizeContent(extractedContents);

      expect(result.crossReferences).toBeDefined();
      expect(Array.isArray(result.crossReferences)).toBe(true);
    });

    it('should not generate cross-references when disabled', () => {
      const config: Partial<AcademicStructureConfig> = {
        enableCrossReferences: false
      };
      const organizerNoCrossRef = new AcademicStructureOrganizer(config);
      
      const extractedContents = [mockProbabilityContent, mockRelationsContent];
      const result = organizerNoCrossRef.organizeContent(extractedContents);

      expect(result.crossReferences).toHaveLength(0);
    });
  });

  describe('metadata generation', () => {
    it('should generate accurate document metadata', () => {
      const extractedContents = [mockProbabilityContent, mockRelationsContent];
      const result = organizer.organizeContent(extractedContents);

      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
      expect(result.metadata.sourceFiles).toEqual(['probability.pdf', 'relations.pdf']);
      expect(result.metadata.totalSections).toBe(13); // 8 + 5 sections
      expect(result.metadata.preservationScore).toBe(1.0);
    });

    it('should count formulas and examples correctly', () => {
      const extractedContents = [mockProbabilityContent, mockRelationsContent];
      const result = organizer.organizeContent(extractedContents);

      expect(result.metadata.totalFormulas).toBeGreaterThan(0);
      expect(result.metadata.totalExamples).toBeGreaterThan(0);
    });
  });

  describe('factory function', () => {
    it('should create organizer instance', () => {
      const organizer = getAcademicStructureOrganizer();
      expect(organizer).toBeInstanceOf(AcademicStructureOrganizer);
    });

    it('should create organizer with custom config', () => {
      const config: Partial<AcademicStructureConfig> = {
        enableCrossReferences: false
      };
      const organizer = getAcademicStructureOrganizer(config);
      expect(organizer).toBeInstanceOf(AcademicStructureOrganizer);
    });
  });

  describe('content filtering', () => {
    it('should filter probability content correctly', () => {
      const extractedContents = [mockProbabilityContent, mockRelationsContent];
      const result = organizer.organizeContent(extractedContents);

      // Probability content should be in Part I
      const part1 = result.parts[0];
      expect(part1.title).toBe('Discrete Probability');
      
      // Should have content in relevant sections
      const sectionsWithContent = part1.sections.filter(s => s.content.length > 0);
      expect(sectionsWithContent.length).toBeGreaterThan(0);
    });

    it('should filter relations content correctly', () => {
      const extractedContents = [mockProbabilityContent, mockRelationsContent];
      const result = organizer.organizeContent(extractedContents);

      // Relations content should be in Part II
      const part2 = result.parts[1];
      expect(part2.title).toBe('Relations');
      
      // Should have content in relevant sections
      const sectionsWithContent = part2.sections.filter(s => s.content.length > 0);
      expect(sectionsWithContent.length).toBeGreaterThan(0);
    });
  });

  describe('section titles', () => {
    it('should use correct probability section titles', () => {
      const extractedContents = [mockProbabilityContent];
      const result = organizer.organizeContent(extractedContents);

      const part1 = result.parts[0];
      const expectedTitles = [
        'Probability Basics',
        'Complements and Unions',
        'Conditional Probability',
        'Bayes\' Theorem',
        'Independence',
        'Bernoulli Trials',
        'Random Variables',
        'Expected Value, Variance, and Standard Deviation'
      ];

      part1.sections.forEach((section, index) => {
        expect(section.title).toBe(expectedTitles[index]);
      });
    });

    it('should use correct relations section titles', () => {
      const extractedContents = [mockRelationsContent];
      const result = organizer.organizeContent(extractedContents);

      const part2 = result.parts[1];
      const expectedTitles = [
        'Relation Definitions and Properties',
        'Reflexive, Irreflexive, Symmetric, Antisymmetric, Transitive',
        'Combining Relations',
        'N-ary Relations',
        'SQL-style Operations'
      ];

      part2.sections.forEach((section, index) => {
        expect(section.title).toBe(expectedTitles[index]);
      });
    });
  });
});
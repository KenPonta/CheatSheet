// Integration test for Academic Structure Organizer

import { CompactStudyGenerator } from '../index';
import {
  EnhancedExtractedContent,
  MathematicalContent,
  Formula,
  WorkedExample
} from '../types';

describe('Academic Structure Integration', () => {
  it('should organize content through the main CompactStudyGenerator interface', () => {
    // Create sample content
    const sampleContent: EnhancedExtractedContent = {
      text: 'Probability basics and conditional probability concepts. Relations are subsets of cartesian products.',
      images: [],
      tables: [],
      metadata: {
        name: 'test.pdf',
        size: 1000,
        type: 'application/pdf',
        lastModified: new Date()
      },
      structure: {
        headings: [],
        sections: [],
        hierarchy: 1
      },
      mathematicalContent: {
        formulas: [
          {
            id: 'test-formula',
            latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
            context: 'conditional probability',
            type: 'display',
            sourceLocation: { fileId: 'test', page: 1 },
            isKeyFormula: true,
            confidence: 0.95
          }
        ],
        workedExamples: [
          {
            id: 'test-example',
            title: 'Test Example',
            problem: 'Calculate conditional probability',
            solution: [
              {
                stepNumber: 1,
                description: 'Apply formula',
                explanation: 'Use the definition'
              }
            ],
            sourceLocation: { fileId: 'test', page: 1 },
            subtopic: 'probability',
            confidence: 0.90,
            isComplete: true
          }
        ],
        definitions: [],
        theorems: []
      },
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

    // Test organizing content through main interface
    const result = CompactStudyGenerator.organizeContent([sampleContent], 'Test Study Guide');

    expect(result).toBeDefined();
    expect(result.title).toBe('Test Study Guide');
    expect(result.parts).toHaveLength(2);
    expect(result.tableOfContents).toBeDefined();
    expect(result.metadata).toBeDefined();

    // Verify Part I (Discrete Probability)
    const part1 = result.parts[0];
    expect(part1.partNumber).toBe(1);
    expect(part1.title).toBe('Discrete Probability');
    expect(part1.sections).toHaveLength(8);

    // Verify Part II (Relations)
    const part2 = result.parts[1];
    expect(part2.partNumber).toBe(2);
    expect(part2.title).toBe('Relations');
    expect(part2.sections).toHaveLength(5);

    // Verify section numbering
    expect(part1.sections[0].sectionNumber).toBe('1.1');
    expect(part1.sections[1].sectionNumber).toBe('1.2');
    expect(part2.sections[0].sectionNumber).toBe('2.1');
    expect(part2.sections[1].sectionNumber).toBe('2.2');
  });

  it('should create academic organizer with custom config through main interface', () => {
    const customConfig = {
      enableCrossReferences: false,
      partTitles: {
        part1: 'Custom Probability',
        part2: 'Custom Relations'
      }
    };

    const organizer = CompactStudyGenerator.createAcademicOrganizer(customConfig);
    expect(organizer).toBeDefined();

    // Test with the custom organizer
    const sampleContent: EnhancedExtractedContent = {
      text: 'Test content',
      images: [],
      tables: [],
      metadata: {
        name: 'test.pdf',
        size: 1000,
        type: 'application/pdf',
        lastModified: new Date()
      },
      structure: {
        headings: [],
        sections: [],
        hierarchy: 1
      },
      mathematicalContent: {
        formulas: [],
        workedExamples: [],
        definitions: [],
        theorems: []
      },
      contentPreservation: {
        totalFormulasFound: 0,
        formulasPreserved: 0,
        totalExamplesFound: 0,
        examplesPreserved: 0,
        preservationScore: 1.0,
        issues: [],
        validationResults: []
      }
    };

    const result = organizer.organizeContent([sampleContent], 'Custom Test');
    expect(result.parts[0].title).toBe('Custom Probability');
    expect(result.parts[1].title).toBe('Custom Relations');
    expect(result.crossReferences).toHaveLength(0); // Disabled in config
  });

  it('should handle empty content gracefully', () => {
    const result = CompactStudyGenerator.organizeContent([], 'Empty Study Guide');

    expect(result).toBeDefined();
    expect(result.title).toBe('Empty Study Guide');
    expect(result.parts).toHaveLength(2);
    expect(result.metadata.totalFormulas).toBe(0);
    expect(result.metadata.totalExamples).toBe(0);
    expect(result.metadata.sourceFiles).toHaveLength(0);
  });

  it('should generate proper table of contents structure', () => {
    const sampleContent: EnhancedExtractedContent = {
      text: 'probability and relations content',
      images: [],
      tables: [],
      metadata: {
        name: 'sample.pdf',
        size: 1000,
        type: 'application/pdf',
        lastModified: new Date()
      },
      structure: {
        headings: [],
        sections: [],
        hierarchy: 1
      },
      mathematicalContent: {
        formulas: [],
        workedExamples: [],
        definitions: [],
        theorems: []
      },
      contentPreservation: {
        totalFormulasFound: 0,
        formulasPreserved: 0,
        totalExamplesFound: 0,
        examplesPreserved: 0,
        preservationScore: 1.0,
        issues: [],
        validationResults: []
      }
    };

    const result = CompactStudyGenerator.organizeContent([sampleContent]);

    // Verify TOC structure
    expect(result.tableOfContents).toHaveLength(2);
    
    const part1TOC = result.tableOfContents[0];
    expect(part1TOC.level).toBe(1);
    expect(part1TOC.title).toBe('Part 1: Discrete Probability');
    expect(part1TOC.pageAnchor).toBe('part-1');
    expect(part1TOC.children).toHaveLength(8);

    const part2TOC = result.tableOfContents[1];
    expect(part2TOC.level).toBe(1);
    expect(part2TOC.title).toBe('Part 2: Relations');
    expect(part2TOC.pageAnchor).toBe('part-2');
    expect(part2TOC.children).toHaveLength(5);

    // Verify section TOC entries
    const firstSection = part1TOC.children[0];
    expect(firstSection.level).toBe(2);
    expect(firstSection.sectionNumber).toBe('1.1');
    expect(firstSection.title).toBe('Probability Basics');
    expect(firstSection.pageAnchor).toBe('section-1-1');
  });

  it('should preserve mathematical content with proper numbering', () => {
    const contentWithMath: EnhancedExtractedContent = {
      text: 'Probability formulas and conditional probability examples',
      images: [],
      tables: [],
      metadata: {
        name: 'math.pdf',
        size: 2000,
        type: 'application/pdf',
        lastModified: new Date()
      },
      structure: {
        headings: [],
        sections: [],
        hierarchy: 1
      },
      mathematicalContent: {
        formulas: [
          {
            id: 'original-1',
            latex: 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)',
            context: 'probability union',
            type: 'display',
            sourceLocation: { fileId: 'math', page: 1 },
            isKeyFormula: true,
            confidence: 0.98
          },
          {
            id: 'original-2',
            latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}',
            context: 'conditional probability',
            type: 'display',
            sourceLocation: { fileId: 'math', page: 2 },
            isKeyFormula: true,
            confidence: 0.97
          }
        ],
        workedExamples: [
          {
            id: 'original-ex1',
            title: 'Union Probability Example',
            problem: 'Calculate P(A ∪ B)',
            solution: [
              {
                stepNumber: 1,
                description: 'Apply union formula',
                explanation: 'Use the inclusion-exclusion principle'
              }
            ],
            sourceLocation: { fileId: 'math', page: 1 },
            subtopic: 'probability',
            confidence: 0.95,
            isComplete: true
          }
        ],
        definitions: [],
        theorems: []
      },
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

    const result = CompactStudyGenerator.organizeContent([contentWithMath]);

    // Find sections with mathematical content
    const allSections = result.parts.flatMap(part => part.sections);
    const sectionsWithFormulas = allSections.filter(section => section.formulas.length > 0);
    const sectionsWithExamples = allSections.filter(section => section.examples.length > 0);

    expect(sectionsWithFormulas.length).toBeGreaterThan(0);
    expect(sectionsWithExamples.length).toBeGreaterThan(0);

    // Verify formula numbering
    const firstFormulaSection = sectionsWithFormulas[0];
    const firstFormula = firstFormulaSection.formulas[0];
    expect(firstFormula.id).toMatch(/^\d+\.\d+\.\d+$/); // e.g., "1.1.1"

    // Verify example numbering
    const firstExampleSection = sectionsWithExamples[0];
    const firstExample = firstExampleSection.examples[0];
    expect(firstExample.id).toMatch(/^Ex\.\d+\.\d+\.\d+$/); // e.g., "Ex.1.1.1"

    // Verify metadata counts
    expect(result.metadata.totalFormulas).toBeGreaterThan(0);
    expect(result.metadata.totalExamples).toBeGreaterThan(0);
  });
});
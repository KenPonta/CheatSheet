// Cross-Reference System for Compact Study Generator
// Implements automatic cross-reference generation, tracking, and validation

import {
  CrossReference,
  AcademicDocument,
  DocumentPart,
  AcademicSection,
  Formula,
  WorkedExample,
  Definition,
  Theorem,
  SourceLocation
} from './types';

export interface CrossReferenceConfig {
  enableAutoGeneration: boolean;
  referenceFormats: ReferenceFormats;
  validationEnabled: boolean;
  maxDistance: number; // Maximum sections apart for auto-linking
  confidenceThreshold: number; // Minimum confidence for auto-linking
}

export interface ReferenceFormats {
  example: string; // e.g., "see Ex. {id}"
  formula: string; // e.g., "see Formula {id}"
  section: string; // e.g., "see Section {id}"
  theorem: string; // e.g., "see Theorem {id}"
  definition: string; // e.g., "see Definition {id}"
}

export interface ReferenceTracker {
  references: Map<string, CrossReference>;
  reverseIndex: Map<string, string[]>; // targetId -> sourceIds
  validationResults: ValidationResult[];
}

export interface ValidationResult {
  referenceId: string;
  isValid: boolean;
  errorType?: 'broken_link' | 'circular_reference' | 'invalid_format' | 'missing_target';
  message: string;
  confidence: number;
}

export interface ReferenceCandidate {
  sourceId: string;
  targetId: string;
  type: CrossReference['type'];
  confidence: number;
  context: string;
  distance: number; // Sections apart
}

export class CrossReferenceSystem {
  private config: CrossReferenceConfig;
  private tracker: ReferenceTracker;

  constructor(config?: Partial<CrossReferenceConfig>) {
    this.config = {
      enableAutoGeneration: true,
      referenceFormats: {
        example: 'see Ex. {id}',
        formula: 'see Formula {id}',
        section: 'see Section {id}',
        theorem: 'see Theorem {id}',
        definition: 'see Definition {id}'
      },
      validationEnabled: true,
      maxDistance: 3,
      confidenceThreshold: 0.7,
      ...config
    };

    this.tracker = {
      references: new Map(),
      reverseIndex: new Map(),
      validationResults: []
    };
  }

  /**
   * Generates cross-references for an academic document
   */
  public generateCrossReferences(document: AcademicDocument): CrossReference[] {
    this.resetTracker();

    if (!this.config.enableAutoGeneration) {
      return [];
    }

    // Find all referenceable items
    const referenceableItems = this.extractReferenceableItems(document);

    // Generate reference candidates
    const candidates = this.findReferenceCandidates(referenceableItems, document);

    // Filter and create cross-references
    const crossReferences = this.createCrossReferences(candidates);

    // Validate references if enabled
    if (this.config.validationEnabled) {
      this.validateReferences(crossReferences, referenceableItems);
    }

    return crossReferences;
  }

  /**
   * Formats a cross-reference display text
   */
  public formatReference(reference: CrossReference): string {
    const format = this.config.referenceFormats[reference.type];
    return format.replace('{id}', this.extractDisplayId(reference.targetId));
  }

  /**
   * Validates reference integrity
   */
  public validateReferences(
    references: CrossReference[],
    referenceableItems: Map<string, ReferenceableItem>
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    references.forEach(ref => {
      const result = this.validateSingleReference(ref, referenceableItems);
      results.push(result);
    });

    this.tracker.validationResults = results;
    return results;
  }

  /**
   * Gets validation results for the current document
   */
  public getValidationResults(): ValidationResult[] {
    return this.tracker.validationResults;
  }

  /**
   * Checks if a reference target exists
   */
  public isValidTarget(targetId: string, referenceableItems: Map<string, ReferenceableItem>): boolean {
    return referenceableItems.has(targetId);
  }

  /**
   * Finds references pointing to a specific target
   */
  public findReferencesToTarget(targetId: string): CrossReference[] {
    const referenceIds = this.tracker.reverseIndex.get(targetId) || [];
    return referenceIds.map(refId => this.tracker.references.get(refId)).filter(Boolean) as CrossReference[];
  }

  private resetTracker(): void {
    this.tracker.references.clear();
    this.tracker.reverseIndex.clear();
    this.tracker.validationResults = [];
  }

  private extractReferenceableItems(document: AcademicDocument): Map<string, ReferenceableItem> {
    const items = new Map<string, ReferenceableItem>();

    document.parts.forEach((part, partIndex) => {
      // Add part as referenceable
      items.set(`part-${part.partNumber}`, {
        id: `part-${part.partNumber}`,
        type: 'section',
        title: part.title,
        content: '',
        location: { partIndex, sectionIndex: -1 },
        sectionNumber: part.partNumber.toString()
      });

      part.sections.forEach((section, sectionIndex) => {
        // Add section as referenceable
        items.set(section.sectionNumber, {
          id: section.sectionNumber,
          type: 'section',
          title: section.title,
          content: section.content,
          location: { partIndex, sectionIndex },
          sectionNumber: section.sectionNumber
        });

        // Add formulas
        section.formulas.forEach(formula => {
          items.set(formula.id, {
            id: formula.id,
            type: 'formula',
            title: formula.context,
            content: formula.latex,
            location: { partIndex, sectionIndex },
            sectionNumber: section.sectionNumber
          });
        });

        // Add examples
        section.examples.forEach(example => {
          items.set(example.id, {
            id: example.id,
            type: 'example',
            title: example.title,
            content: example.problem,
            location: { partIndex, sectionIndex },
            sectionNumber: section.sectionNumber
          });
        });
      });
    });

    return items;
  }

  private findReferenceCandidates(
    referenceableItems: Map<string, ReferenceableItem>,
    document: AcademicDocument
  ): ReferenceCandidate[] {
    const candidates: ReferenceCandidate[] = [];

    document.parts.forEach((part, partIndex) => {
      part.sections.forEach((section, sectionIndex) => {
        // Find candidates within section content
        const sectionCandidates = this.findCandidatesInText(
          section.content,
          section.sectionNumber,
          referenceableItems,
          { partIndex, sectionIndex }
        );
        candidates.push(...sectionCandidates);

        // Find candidates in examples
        section.examples.forEach(example => {
          const exampleText = example.problem + ' ' + example.solution.map(s => s.description).join(' ');
          const exampleCandidates = this.findCandidatesInText(
            exampleText,
            example.id,
            referenceableItems,
            { partIndex, sectionIndex }
          );
          candidates.push(...exampleCandidates);
        });
      });
    });

    return candidates;
  }

  private findCandidatesInText(
    text: string,
    sourceId: string,
    referenceableItems: Map<string, ReferenceableItem>,
    sourceLocation: ItemLocation
  ): ReferenceCandidate[] {
    const candidates: ReferenceCandidate[] = [];
    const lowerText = text.toLowerCase();

    referenceableItems.forEach((item, itemId) => {
      if (itemId === sourceId) return; // Don't reference self

      const confidence = this.calculateReferenceConfidence(text, item);
      if (confidence < this.config.confidenceThreshold) return;

      const distance = this.calculateDistance(sourceLocation, item.location);
      if (distance > this.config.maxDistance) return;

      candidates.push({
        sourceId,
        targetId: itemId,
        type: item.type,
        confidence,
        context: this.extractContext(text, item),
        distance
      });
    });

    return candidates;
  } 
 private calculateReferenceConfidence(text: string, item: ReferenceableItem): number {
    const lowerText = text.toLowerCase();
    const lowerTitle = item.title.toLowerCase();
    const lowerContent = item.content.toLowerCase();

    let confidence = 0;

    // Direct title match
    if (lowerText.includes(lowerTitle)) {
      confidence += 0.8;
    }

    // Partial title match
    const titleWords = lowerTitle.split(' ').filter(word => word.length > 3);
    const matchingWords = titleWords.filter(word => lowerText.includes(word));
    confidence += (matchingWords.length / titleWords.length) * 0.4;

    // Content similarity (simplified)
    if (item.type === 'formula' && lowerText.includes('formula')) {
      confidence += 0.3;
    }
    if (item.type === 'example' && lowerText.includes('example')) {
      confidence += 0.3;
    }
    if (item.type === 'section' && lowerText.includes('section')) {
      confidence += 0.2;
    }

    // Mathematical content indicators
    if (item.type === 'formula' && /\b(equation|formula|identity|law)\b/.test(lowerText)) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  private calculateDistance(source: ItemLocation, target: ItemLocation): number {
    const partDistance = Math.abs(source.partIndex - target.partIndex);
    const sectionDistance = source.partIndex === target.partIndex 
      ? Math.abs(source.sectionIndex - target.sectionIndex)
      : 0;

    return partDistance * 10 + sectionDistance;
  }

  private extractContext(text: string, item: ReferenceableItem): string {
    const lowerText = text.toLowerCase();
    const lowerTitle = item.title.toLowerCase();

    // Find the sentence containing the reference
    const sentences = text.split(/[.!?]+/);
    const relevantSentence = sentences.find(sentence => 
      sentence.toLowerCase().includes(lowerTitle)
    );

    return relevantSentence?.trim() || text.substring(0, 100);
  }

  private createCrossReferences(candidates: ReferenceCandidate[]): CrossReference[] {
    const references: CrossReference[] = [];
    let referenceCounter = 1;

    // Sort candidates by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);

    // Remove duplicates and create references
    const seen = new Set<string>();

    candidates.forEach(candidate => {
      const key = `${candidate.sourceId}->${candidate.targetId}`;
      if (seen.has(key)) return;
      seen.add(key);

      const reference: CrossReference = {
        id: `ref-${referenceCounter++}`,
        type: candidate.type,
        sourceId: candidate.sourceId,
        targetId: candidate.targetId,
        displayText: this.formatReferenceText(candidate)
      };

      references.push(reference);
      this.addToTracker(reference);
    });

    return references;
  }

  private formatReferenceText(candidate: ReferenceCandidate): string {
    const format = this.config.referenceFormats[candidate.type];
    const displayId = this.extractDisplayId(candidate.targetId);
    return format.replace('{id}', displayId);
  }

  private extractDisplayId(targetId: string): string {
    // Extract display-friendly ID from full ID
    if (targetId.startsWith('Ex.')) {
      return targetId.substring(3); // Remove "Ex." prefix, return just "1.1.1"
    }
    if (targetId.startsWith('part-')) {
      return targetId.substring(5); // Remove "part-" prefix, return just the number
    }
    if (targetId.includes('.')) {
      return targetId; // Section numbers like "1.1"
    }
    return targetId;
  }

  private addToTracker(reference: CrossReference): void {
    this.tracker.references.set(reference.id, reference);

    // Update reverse index
    const existingSources = this.tracker.reverseIndex.get(reference.targetId) || [];
    existingSources.push(reference.id);
    this.tracker.reverseIndex.set(reference.targetId, existingSources);
  }

  private validateSingleReference(
    reference: CrossReference,
    referenceableItems: Map<string, ReferenceableItem>
  ): ValidationResult {
    // Check if target exists
    if (!referenceableItems.has(reference.targetId)) {
      return {
        referenceId: reference.id,
        isValid: false,
        errorType: 'missing_target',
        message: `Reference target '${reference.targetId}' not found`,
        confidence: 1.0
      };
    }

    // Check for circular references
    if (this.hasCircularReference(reference, referenceableItems)) {
      return {
        referenceId: reference.id,
        isValid: false,
        errorType: 'circular_reference',
        message: `Circular reference detected between '${reference.sourceId}' and '${reference.targetId}'`,
        confidence: 0.9
      };
    }

    // Check format validity
    if (!this.isValidFormat(reference)) {
      return {
        referenceId: reference.id,
        isValid: false,
        errorType: 'invalid_format',
        message: `Invalid reference format: '${reference.displayText}'`,
        confidence: 0.8
      };
    }

    return {
      referenceId: reference.id,
      isValid: true,
      message: 'Reference is valid',
      confidence: 1.0
    };
  }

  private hasCircularReference(
    reference: CrossReference,
    referenceableItems: Map<string, ReferenceableItem>
  ): boolean {
    // Simple circular reference check - can be enhanced for deeper cycles
    const reverseReferences = this.findReferencesToTarget(reference.sourceId);
    return reverseReferences.some(ref => ref.targetId === reference.targetId);
  }

  private isValidFormat(reference: CrossReference): boolean {
    const expectedFormat = this.config.referenceFormats[reference.type];
    const pattern = expectedFormat.replace('{id}', '.*');
    const regex = new RegExp(pattern);
    return regex.test(reference.displayText);
  }
}

// Supporting interfaces
interface ReferenceableItem {
  id: string;
  type: CrossReference['type'];
  title: string;
  content: string;
  location: ItemLocation;
  sectionNumber: string;
}

interface ItemLocation {
  partIndex: number;
  sectionIndex: number;
}

// Factory function
export function createCrossReferenceSystem(config?: Partial<CrossReferenceConfig>): CrossReferenceSystem {
  return new CrossReferenceSystem(config);
}

// Default export
export default CrossReferenceSystem;
import {
  StudyMaterial,
  ContentSection,
  GeneratedImage,
  ContentOperation,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  DependencyCheck,
  ContentModificationError,
  AddSectionOperation,
  EditSectionOperation,
  RemoveSectionOperation,
  ReorderSectionsOperation,
  AddImageOperation,
  RemoveImageOperation,
  RegenerateImageOperation
} from './types';

export class ContentValidationService {
  /**
   * Validates a content modification operation
   */
  async validateOperation(
    material: StudyMaterial,
    operation: ContentOperation
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Basic operation validation
      const basicValidation = this.validateBasicOperation(operation);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);

      // Operation-specific validation
      switch (operation.type) {
        case 'add_section':
          const addValidation = await this.validateAddSection(material, operation as AddSectionOperation);
          errors.push(...addValidation.errors);
          warnings.push(...addValidation.warnings);
          break;

        case 'remove_section':
          const removeValidation = await this.validateRemoveSection(material, operation as RemoveSectionOperation);
          errors.push(...removeValidation.errors);
          warnings.push(...removeValidation.warnings);
          break;

        case 'edit_section':
          const editValidation = await this.validateEditSection(material, operation as EditSectionOperation);
          errors.push(...editValidation.errors);
          warnings.push(...editValidation.warnings);
          break;

        case 'reorder_sections':
          const reorderValidation = await this.validateReorderSections(material, operation as ReorderSectionsOperation);
          errors.push(...reorderValidation.errors);
          warnings.push(...reorderValidation.warnings);
          break;

        case 'add_image':
          const addImageValidation = await this.validateAddImage(material, operation as AddImageOperation);
          errors.push(...addImageValidation.errors);
          warnings.push(...addImageValidation.warnings);
          break;

        case 'remove_image':
          const removeImageValidation = await this.validateRemoveImage(material, operation as RemoveImageOperation);
          errors.push(...removeImageValidation.errors);
          warnings.push(...removeImageValidation.warnings);
          break;

        case 'regenerate_image':
          const regenValidation = await this.validateRegenerateImage(material, operation as RegenerateImageOperation);
          errors.push(...regenValidation.errors);
          warnings.push(...regenValidation.warnings);
          break;

        default:
          errors.push({
            code: 'UNKNOWN_OPERATION',
            message: `Unknown operation type: ${operation.type}`,
            severity: 'error'
          });
      }

      return {
        valid: errors.filter(e => e.severity === 'error').length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }],
        warnings
      };
    }
  }

  /**
   * Validates basic operation structure
   */
  private validateBasicOperation(operation: ContentOperation): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!operation.type) {
      errors.push({
        code: 'MISSING_OPERATION_TYPE',
        message: 'Operation type is required',
        field: 'type',
        severity: 'error'
      });
    }

    if (!operation.data && operation.type !== 'remove_section' && operation.type !== 'remove_image') {
      errors.push({
        code: 'MISSING_OPERATION_DATA',
        message: 'Operation data is required for this operation type',
        field: 'data',
        severity: 'error'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates add section operation
   */
  private async validateAddSection(
    material: StudyMaterial,
    operation: AddSectionOperation
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const { section, position } = operation.data;

    // Validate section content
    if (!section.content || section.content.trim().length === 0) {
      errors.push({
        code: 'EMPTY_SECTION_CONTENT',
        message: 'Section content cannot be empty',
        field: 'content',
        severity: 'error'
      });
    }

    // Validate section type
    const validTypes = ['text', 'equation', 'example', 'list', 'heading'];
    if (!validTypes.includes(section.type)) {
      errors.push({
        code: 'INVALID_SECTION_TYPE',
        message: `Invalid section type: ${section.type}. Must be one of: ${validTypes.join(', ')}`,
        field: 'type',
        severity: 'error'
      });
    }

    // Validate position
    if (position < 0 || position > material.sections.length) {
      errors.push({
        code: 'INVALID_POSITION',
        message: `Invalid position: ${position}. Must be between 0 and ${material.sections.length}`,
        field: 'position',
        severity: 'error'
      });
    }

    // Validate dependencies
    if (section.dependencies && section.dependencies.length > 0) {
      const dependencyValidation = await this.validateDependencies(material, section.dependencies);
      errors.push(...dependencyValidation.errors);
      warnings.push(...dependencyValidation.warnings);
    }

    // Content-specific validation
    if (section.type === 'equation') {
      const equationValidation = this.validateEquationContent(section.content);
      errors.push(...equationValidation.errors);
      warnings.push(...equationValidation.warnings);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates remove section operation
   */
  private async validateRemoveSection(
    material: StudyMaterial,
    operation: RemoveSectionOperation
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!operation.targetId) {
      errors.push({
        code: 'MISSING_TARGET_ID',
        message: 'Target section ID is required for remove operation',
        field: 'targetId',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    // Check if section exists
    const section = material.sections.find(s => s.id === operation.targetId);
    if (!section) {
      errors.push({
        code: 'SECTION_NOT_FOUND',
        message: `Section with ID ${operation.targetId} not found`,
        field: 'targetId',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    // Check if section is editable
    if (!section.editable) {
      errors.push({
        code: 'SECTION_NOT_EDITABLE',
        message: 'Cannot remove a non-editable section',
        field: 'targetId',
        severity: 'error'
      });
    }

    // Check dependencies
    const dependencyCheck = await this.checkDependencies(material, operation.targetId);
    if (!dependencyCheck.canRemove) {
      errors.push({
        code: 'DEPENDENCY_CONFLICT',
        message: `Cannot remove section due to dependencies: ${dependencyCheck.removalImpact.join(', ')}`,
        field: 'targetId',
        severity: 'error'
      });
    }

    if (dependencyCheck.dependents.length > 0) {
      warnings.push({
        code: 'DEPENDENT_SECTIONS',
        message: `Removing this section will affect ${dependencyCheck.dependents.length} dependent sections`,
        suggestion: 'Consider updating dependent sections before removal'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates edit section operation
   */
  private async validateEditSection(
    material: StudyMaterial,
    operation: EditSectionOperation
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!operation.targetId) {
      errors.push({
        code: 'MISSING_TARGET_ID',
        message: 'Target section ID is required for edit operation',
        field: 'targetId',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    // Check if section exists
    const section = material.sections.find(s => s.id === operation.targetId);
    if (!section) {
      errors.push({
        code: 'SECTION_NOT_FOUND',
        message: `Section with ID ${operation.targetId} not found`,
        field: 'targetId',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    // Check if section is editable
    if (!section.editable) {
      errors.push({
        code: 'SECTION_NOT_EDITABLE',
        message: 'Cannot edit a non-editable section',
        field: 'targetId',
        severity: 'error'
      });
    }

    // Validate new content if provided
    if (operation.data.content !== undefined) {
      if (!operation.data.content || operation.data.content.trim().length === 0) {
        errors.push({
          code: 'EMPTY_SECTION_CONTENT',
          message: 'Section content cannot be empty',
          field: 'content',
          severity: 'error'
        });
      }

      // Content-specific validation based on type
      const sectionType = operation.data.type || section.type;
      if (sectionType === 'equation') {
        const equationValidation = this.validateEquationContent(operation.data.content);
        errors.push(...equationValidation.errors);
        warnings.push(...equationValidation.warnings);
      }
    }

    // Validate type change if provided
    if (operation.data.type !== undefined) {
      const validTypes = ['text', 'equation', 'example', 'list', 'heading'];
      if (!validTypes.includes(operation.data.type)) {
        errors.push({
          code: 'INVALID_SECTION_TYPE',
          message: `Invalid section type: ${operation.data.type}. Must be one of: ${validTypes.join(', ')}`,
          field: 'type',
          severity: 'error'
        });
      }

      // Warn about type change implications
      if (operation.data.type !== section.type) {
        warnings.push({
          code: 'TYPE_CHANGE_WARNING',
          message: `Changing section type from ${section.type} to ${operation.data.type} may affect formatting`,
          suggestion: 'Review the section after type change to ensure proper formatting'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates reorder sections operation
   */
  private async validateReorderSections(
    material: StudyMaterial,
    operation: ReorderSectionsOperation
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const { sectionIds } = operation.data;

    // Check if all section IDs are provided
    if (!sectionIds || !Array.isArray(sectionIds)) {
      errors.push({
        code: 'INVALID_SECTION_IDS',
        message: 'Section IDs must be provided as an array',
        field: 'sectionIds',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    // Check if count matches
    if (sectionIds.length !== material.sections.length) {
      errors.push({
        code: 'SECTION_COUNT_MISMATCH',
        message: `Expected ${material.sections.length} section IDs, got ${sectionIds.length}`,
        field: 'sectionIds',
        severity: 'error'
      });
    }

    // Check if all sections exist and are unique
    const existingSectionIds = new Set(material.sections.map(s => s.id));
    const providedSectionIds = new Set(sectionIds);

    for (const sectionId of sectionIds) {
      if (!existingSectionIds.has(sectionId)) {
        errors.push({
          code: 'SECTION_NOT_FOUND',
          message: `Section with ID ${sectionId} not found`,
          field: 'sectionIds',
          severity: 'error'
        });
      }
    }

    // Check for duplicates
    if (providedSectionIds.size !== sectionIds.length) {
      errors.push({
        code: 'DUPLICATE_SECTION_IDS',
        message: 'Duplicate section IDs found in reorder operation',
        field: 'sectionIds',
        severity: 'error'
      });
    }

    // Check dependency constraints
    const dependencyValidation = await this.validateReorderDependencies(material, sectionIds);
    errors.push(...dependencyValidation.errors);
    warnings.push(...dependencyValidation.warnings);

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates add image operation
   */
  private async validateAddImage(
    material: StudyMaterial,
    operation: AddImageOperation
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const { image, position } = operation.data;

    // Validate image data
    if (!image.base64Data || image.base64Data.trim().length === 0) {
      errors.push({
        code: 'MISSING_IMAGE_DATA',
        message: 'Image data is required',
        field: 'base64Data',
        severity: 'error'
      });
    }

    // Validate image metadata
    if (!image.metadata) {
      errors.push({
        code: 'MISSING_IMAGE_METADATA',
        message: 'Image metadata is required',
        field: 'metadata',
        severity: 'error'
      });
    } else {
      if (!image.metadata.format || !['svg', 'png', 'jpg'].includes(image.metadata.format)) {
        errors.push({
          code: 'INVALID_IMAGE_FORMAT',
          message: 'Image format must be svg, png, or jpg',
          field: 'format',
          severity: 'error'
        });
      }

      if (!image.metadata.width || !image.metadata.height || 
          image.metadata.width <= 0 || image.metadata.height <= 0) {
        errors.push({
          code: 'INVALID_IMAGE_DIMENSIONS',
          message: 'Image dimensions must be positive numbers',
          field: 'dimensions',
          severity: 'error'
        });
      }
    }

    // Validate position
    if (position < 0 || position > material.images.length) {
      errors.push({
        code: 'INVALID_POSITION',
        message: `Invalid position: ${position}. Must be between 0 and ${material.images.length}`,
        field: 'position',
        severity: 'error'
      });
    }

    // Validate section reference if provided
    if (operation.data.sectionId) {
      const section = material.sections.find(s => s.id === operation.data.sectionId);
      if (!section) {
        errors.push({
          code: 'SECTION_NOT_FOUND',
          message: `Referenced section with ID ${operation.data.sectionId} not found`,
          field: 'sectionId',
          severity: 'error'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates remove image operation
   */
  private async validateRemoveImage(
    material: StudyMaterial,
    operation: RemoveImageOperation
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!operation.targetId) {
      errors.push({
        code: 'MISSING_TARGET_ID',
        message: 'Target image ID is required for remove operation',
        field: 'targetId',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    // Check if image exists
    const image = material.images.find(i => i.id === operation.targetId);
    if (!image) {
      errors.push({
        code: 'IMAGE_NOT_FOUND',
        message: `Image with ID ${operation.targetId} not found`,
        field: 'targetId',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    // Check if image is editable
    if (!image.editable) {
      errors.push({
        code: 'IMAGE_NOT_EDITABLE',
        message: 'Cannot remove a non-editable image',
        field: 'targetId',
        severity: 'error'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates regenerate image operation
   */
  private async validateRegenerateImage(
    material: StudyMaterial,
    operation: RegenerateImageOperation
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!operation.targetId) {
      errors.push({
        code: 'MISSING_TARGET_ID',
        message: 'Target image ID is required for regenerate operation',
        field: 'targetId',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    // Check if image exists
    const image = material.images.find(i => i.id === operation.targetId);
    if (!image) {
      errors.push({
        code: 'IMAGE_NOT_FOUND',
        message: `Image with ID ${operation.targetId} not found`,
        field: 'targetId',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    // Check if image is editable
    if (!image.editable) {
      errors.push({
        code: 'IMAGE_NOT_EDITABLE',
        message: 'Cannot regenerate a non-editable image',
        field: 'targetId',
        severity: 'error'
      });
    }

    // Check if image supports regeneration
    if (!image.regenerationOptions) {
      warnings.push({
        code: 'NO_REGENERATION_OPTIONS',
        message: 'Image does not have regeneration options available',
        suggestion: 'Consider removing and adding a new image instead'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates dependencies for a section
   */
  private async validateDependencies(
    material: StudyMaterial,
    dependencies: string[]
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const depId of dependencies) {
      const depSection = material.sections.find(s => s.id === depId);
      if (!depSection) {
        errors.push({
          code: 'DEPENDENCY_NOT_FOUND',
          message: `Dependency section with ID ${depId} not found`,
          field: 'dependencies',
          severity: 'error'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates equation content
   */
  private validateEquationContent(content: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic LaTeX validation
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push({
        code: 'UNMATCHED_BRACES',
        message: 'Unmatched braces in equation content',
        field: 'content',
        severity: 'error'
      });
    }

    // Check for common LaTeX commands
    const hasLatexCommands = /\\[a-zA-Z]+/.test(content);
    if (!hasLatexCommands && content.includes('$')) {
      warnings.push({
        code: 'POSSIBLE_LATEX_ISSUE',
        message: 'Content contains $ symbols but no LaTeX commands',
        suggestion: 'Ensure proper LaTeX formatting for equations'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Checks dependencies for section removal
   */
  private async checkDependencies(
    material: StudyMaterial,
    sectionId: string
  ): Promise<DependencyCheck> {
    const section = material.sections.find(s => s.id === sectionId);
    if (!section) {
      return {
        sectionId,
        dependencies: [],
        dependents: [],
        canRemove: false,
        removalImpact: ['Section not found']
      };
    }

    // Find sections that depend on this section
    const dependents = material.sections
      .filter(s => s.dependencies.includes(sectionId))
      .map(s => s.id);

    // Check if removal would break critical dependencies
    const criticalDependents = dependents.filter(depId => {
      const depSection = material.sections.find(s => s.id === depId);
      return depSection && !depSection.editable;
    });

    const canRemove = criticalDependents.length === 0;
    const removalImpact = dependents.map(depId => {
      const depSection = material.sections.find(s => s.id === depId);
      return depSection ? `Section "${depSection.content.substring(0, 50)}..."` : depId;
    });

    return {
      sectionId,
      dependencies: section.dependencies,
      dependents,
      canRemove,
      removalImpact
    };
  }

  /**
   * Validates dependencies for section reordering
   */
  private async validateReorderDependencies(
    material: StudyMaterial,
    newOrder: string[]
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Create position map for new order
    const positionMap = new Map<string, number>();
    newOrder.forEach((id, index) => positionMap.set(id, index));

    // Check each section's dependencies
    for (const section of material.sections) {
      const sectionPosition = positionMap.get(section.id);
      if (sectionPosition === undefined) continue;

      for (const depId of section.dependencies) {
        const depPosition = positionMap.get(depId);
        if (depPosition === undefined) continue;

        // Dependency should come before the section that depends on it
        if (depPosition >= sectionPosition) {
          errors.push({
            code: 'DEPENDENCY_ORDER_VIOLATION',
            message: `Section ${section.id} depends on ${depId} but would be ordered before it`,
            field: 'sectionIds',
            severity: 'error'
          });
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
/**
 * Simple Image Generator - Creates flat-line visual representations
 * for equations, concepts, and examples in study materials
 */

export interface FlatLineStyle {
  lineWeight: 'thin' | 'medium' | 'thick';
  colorScheme: 'monochrome' | 'minimal-color';
  layout: 'horizontal' | 'vertical' | 'grid';
  annotations: boolean;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface GeneratedImage {
  id: string;
  svgContent: string;
  base64: string;
  dimensions: ImageDimensions;
  metadata: ImageMetadata;
}

export interface ImageMetadata {
  type: 'equation' | 'concept' | 'example' | 'diagram';
  content: string;
  style: FlatLineStyle;
  generatedAt: Date;
}

export interface FlatLineImageRequest {
  type: 'equation' | 'concept' | 'example' | 'diagram';
  content: string;
  context: string;
  style: FlatLineStyle;
  dimensions: ImageDimensions;
}

export interface EquationVisualizationData {
  originalEquation: string;
  equationType: string;
  variables: string[];
  constants: string[];
  operations: string[];
  explanation: string;
  derivationSteps: string[];
  context: string;
}

export interface ConceptData {
  title: string;
  elements: ConceptElement[];
  relationships: Relationship[];
  diagramType?: 'flowchart' | 'hierarchy' | 'network' | 'timeline' | 'cycle';
  template?: string;
}

export interface ConceptElement {
  id: string;
  label: string;
  type: 'node' | 'process' | 'decision' | 'start' | 'end' | 'data' | 'connector';
  position?: { x: number; y: number };
  level?: number; // For hierarchical layouts
  group?: string; // For grouping related elements
  metadata?: { [key: string]: any };
}

export interface Relationship {
  from: string;
  to: string;
  label?: string;
  type: 'arrow' | 'line' | 'dashed' | 'bidirectional' | 'curved';
  weight?: number; // For layout algorithms
}

export interface ExampleData {
  problem: string;
  solution: string;
  steps: ExampleStep[];
  visualElements: VisualElement[];
  subjectArea?: SubjectArea;
  template?: ExampleTemplate;
  annotations?: ExampleAnnotation[];
}

export interface ExampleStep {
  id: string;
  description: string;
  formula?: string;
  calculation?: string;
  result?: string;
  visualHints?: string[];
  annotations?: StepAnnotation[];
}

export interface StepAnnotation {
  type: 'variable' | 'operation' | 'result' | 'note' | 'warning';
  content: string;
  target?: string; // What this annotation points to
  position?: { x: number; y: number };
}

export interface ExampleAnnotation {
  id: string;
  type: 'definition' | 'formula' | 'concept' | 'tip' | 'warning';
  content: string;
  position: { x: number; y: number };
  target?: string;
  style?: AnnotationStyle;
}

export interface AnnotationStyle {
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
}

export interface VisualElement {
  type: 'highlight' | 'annotation' | 'arrow' | 'box' | 'circle' | 'underline' | 'bracket';
  content: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  style?: VisualElementStyle;
}

export interface VisualElementStyle {
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  dashArray?: string;
}

export type SubjectArea = 'mathematics' | 'physics' | 'chemistry' | 'biology' | 'engineering' | 'computer-science' | 'statistics' | 'economics' | 'generic';

export type ExampleTemplate = 'problem-solution' | 'step-by-step' | 'proof' | 'derivation' | 'calculation' | 'analysis' | 'comparison' | 'experiment';

/**
 * SimpleImageGenerator - Core class for generating flat-line visual representations
 */
export class SimpleImageGenerator {
  private defaultStyle: FlatLineStyle = {
    lineWeight: 'medium',
    colorScheme: 'monochrome',
    layout: 'horizontal',
    annotations: true
  };

  private defaultDimensions: ImageDimensions = {
    width: 400,
    height: 300
  };

  /**
   * Generate a flat-line image based on the request
   */
  async generateFlatLineImage(request: FlatLineImageRequest, sessionId?: string): Promise<GeneratedImage> {
    const { imageErrorHandler } = await import('./image-generation-error-handler');
    const { comprehensiveLogger } = await import('../monitoring/comprehensive-logger');
    
    const trackingId = comprehensiveLogger.startPerformanceTracking(
      'generate-flat-line-image',
      { type: request.type, sessionId }
    );

    try {
      // Validate request
      this.validateImageRequest(request);
      
      const style = { ...this.defaultStyle, ...request.style };
      const dimensions = { ...this.defaultDimensions, ...request.dimensions };

      let svgContent: string;

      switch (request.type) {
        case 'equation':
          svgContent = this.createEquationVisualization(request.content, request.context, style, dimensions);
          break;
        case 'concept':
          svgContent = this.createConceptDiagram(this.parseConceptData(request.content), style, dimensions);
          break;
        case 'example':
          svgContent = this.createExampleIllustration(this.parseExampleData(request.content), style, dimensions);
          break;
        case 'diagram':
          svgContent = this.createGenericDiagram(request.content, style, dimensions);
          break;
        default:
          throw new Error(`Unsupported image type: ${request.type}`);
      }

      const id = this.generateId();
      const base64 = this.svgToBase64(svgContent);

      const result = {
        id,
        svgContent,
        base64,
        dimensions,
        metadata: {
          type: request.type,
          content: request.content,
          style,
          generatedAt: new Date()
        }
      };

      comprehensiveLogger.logImageGeneration(
        'info',
        'Image generated successfully',
        'generate-flat-line-image',
        true,
        undefined,
        undefined,
        { type: request.type, imageId: id },
        sessionId
      );

      comprehensiveLogger.endPerformanceTracking(trackingId, true, 0, {
        imageId: id,
        imageType: request.type
      });

      return result;

    } catch (error) {
      comprehensiveLogger.logImageGeneration(
        'error',
        `Image generation failed: ${error.message}`,
        'generate-flat-line-image',
        false,
        undefined,
        error.name,
        { type: request.type, error: error.message },
        sessionId
      );

      comprehensiveLogger.endPerformanceTracking(trackingId, false, 1);

      // Use error handler for fallback
      const context = {
        request,
        sessionId,
        attemptNumber: 1,
        previousErrors: [],
        fallbacksUsed: []
      };

      return await imageErrorHandler.handleGenerationFailure(error, context, sessionId);
    }
  }

  /**
   * Validate image generation request
   */
  private validateImageRequest(request: FlatLineImageRequest): void {
    if (!request.type) {
      throw new Error('Image type is required');
    }

    if (!request.content || request.content.trim().length === 0) {
      throw new Error('Content is required for image generation');
    }

    if (request.content.length > 5000) {
      throw new Error('Content too large for image generation');
    }

    if (!request.dimensions || request.dimensions.width <= 0 || request.dimensions.height <= 0) {
      throw new Error('Valid dimensions are required');
    }

    if (request.dimensions.width > 2000 || request.dimensions.height > 2000) {
      throw new Error('Dimensions too large (max 2000x2000)');
    }
  }

  /**
   * Create comprehensive equation visualization with derivation and explanation
   */
  createEquationVisualization(equation: string, context: string, style: FlatLineStyle, dimensions: ImageDimensions): string {
    const strokeWidth = this.getStrokeWidth(style.lineWeight);
    const color = this.getColor(style.colorScheme);
    
    let svg = this.createSVGHeader(dimensions);
    
    // Parse equation and context to create educational visualization
    const equationData = this.parseEquationForVisualization(equation, context);
    
    // Create comprehensive equation visualization
    svg += this.renderEquationWithDerivation(equationData, style, dimensions, color, strokeWidth);
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Parse equation and context to extract educational components
   */
  private parseEquationForVisualization(equation: string, context: string): EquationVisualizationData {
    // Extract variables, constants, and operations from the equation
    const variables = this.extractVariables(equation);
    const operations = this.extractOperations(equation);
    const constants = this.extractConstants(equation);
    
    // Determine equation type and create appropriate explanation
    const equationType = this.determineEquationType(equation);
    const explanation = this.generateEquationExplanation(equation, equationType, context);
    const derivationSteps = this.generateDerivationSteps(equation, equationType);
    
    return {
      originalEquation: equation,
      equationType,
      variables,
      constants,
      operations,
      explanation,
      derivationSteps,
      context
    };
  }

  /**
   * Render equation with complete derivation and explanation
   */
  private renderEquationWithDerivation(
    equationData: EquationVisualizationData, 
    style: FlatLineStyle, 
    dimensions: ImageDimensions, 
    color: string, 
    strokeWidth: number
  ): string {
    let svg = '';
    const margin = 20;
    const sectionHeight = dimensions.height / 4;
    
    // Title and context
    svg += `<text x="${dimensions.width / 2}" y="20" font-family="sans-serif" font-size="14" font-weight="bold" fill="${color}" text-anchor="middle">Mathematical Equation Analysis</text>`;
    svg += `<text x="${dimensions.width / 2}" y="35" font-family="sans-serif" font-size="10" fill="${color}" text-anchor="middle" opacity="0.7">${this.escapeXML(equationData.context)}</text>`;
    
    let currentY = 50;
    
    // Main equation with highlighting
    svg += `<rect x="${margin}" y="${currentY}" width="${dimensions.width - 2 * margin}" height="${sectionHeight - 10}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    svg += `<text x="${margin + 10}" y="${currentY + 20}" font-family="sans-serif" font-size="12" font-weight="bold" fill="${color}">Equation:</text>`;
    svg += `<text x="${margin + 10}" y="${currentY + 45}" font-family="serif" font-size="16" fill="${color}">${this.escapeXML(equationData.originalEquation)}</text>`;
    
    // Variable definitions
    if (equationData.variables.length > 0) {
      svg += `<text x="${margin + 10}" y="${currentY + 65}" font-family="sans-serif" font-size="10" fill="${color}" opacity="0.8">Variables: ${equationData.variables.join(', ')}</text>`;
    }
    
    currentY += sectionHeight;
    
    // Explanation section
    svg += `<rect x="${margin}" y="${currentY}" width="${dimensions.width - 2 * margin}" height="${sectionHeight - 10}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    svg += `<text x="${margin + 10}" y="${currentY + 20}" font-family="sans-serif" font-size="12" font-weight="bold" fill="${color}">Explanation:</text>`;
    svg += this.addWrappedText(equationData.explanation, margin + 10, currentY + 35, dimensions.width - 2 * margin - 20, 11, color);
    
    currentY += sectionHeight;
    
    // Derivation steps
    if (equationData.derivationSteps.length > 0) {
      svg += `<rect x="${margin}" y="${currentY}" width="${dimensions.width - 2 * margin}" height="${sectionHeight - 10}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
      svg += `<text x="${margin + 10}" y="${currentY + 20}" font-family="sans-serif" font-size="12" font-weight="bold" fill="${color}">Derivation Steps:</text>`;
      
      let stepY = currentY + 35;
      equationData.derivationSteps.forEach((step, index) => {
        if (stepY < currentY + sectionHeight - 20) {
          svg += `<text x="${margin + 15}" y="${stepY}" font-family="sans-serif" font-size="10" fill="${color}">${index + 1}. ${this.escapeXML(step)}</text>`;
          stepY += 15;
        }
      });
    }
    
    currentY += sectionHeight;
    
    // Applications or examples
    svg += `<rect x="${margin}" y="${currentY}" width="${dimensions.width - 2 * margin}" height="${dimensions.height - currentY - margin}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    svg += `<text x="${margin + 10}" y="${currentY + 20}" font-family="sans-serif" font-size="12" font-weight="bold" fill="${color}">When to Use:</text>`;
    
    const applications = this.generateEquationApplications(equationData.equationType);
    svg += this.addWrappedText(applications, margin + 10, currentY + 35, dimensions.width - 2 * margin - 20, 11, color);
    
    return svg;
  }

  /**
   * Extract variables from equation
   */
  private extractVariables(equation: string): string[] {
    const variables = equation.match(/[a-zA-Z][a-zA-Z0-9_]*(?!\()/g) || [];
    return [...new Set(variables)].filter(v => !['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'sqrt'].includes(v));
  }

  /**
   * Extract mathematical operations from equation
   */
  private extractOperations(equation: string): string[] {
    const operations: string[] = [];
    if (equation.includes('+')) operations.push('addition');
    if (equation.includes('-')) operations.push('subtraction');
    if (equation.includes('*') || equation.includes('×')) operations.push('multiplication');
    if (equation.includes('/') || equation.includes('÷')) operations.push('division');
    if (equation.includes('^') || equation.includes('**')) operations.push('exponentiation');
    if (equation.includes('√')) operations.push('square root');
    if (equation.includes('∫')) operations.push('integration');
    if (equation.includes('∑')) operations.push('summation');
    return operations;
  }

  /**
   * Extract constants from equation
   */
  private extractConstants(equation: string): string[] {
    const constants = equation.match(/\b\d+\.?\d*\b/g) || [];
    const specialConstants: string[] = [];
    if (equation.includes('π') || equation.includes('pi')) specialConstants.push('π');
    if (equation.includes('e')) specialConstants.push('e');
    return [...constants, ...specialConstants];
  }

  /**
   * Determine equation type for appropriate explanation
   */
  private determineEquationType(equation: string): string {
    if (equation.includes('=') && equation.includes('x²') || equation.includes('x^2')) return 'quadratic';
    if (equation.includes('=') && equation.match(/[a-z]\s*=\s*[a-z]/)) return 'linear';
    if (equation.includes('sin') || equation.includes('cos') || equation.includes('tan')) return 'trigonometric';
    if (equation.includes('∫') || equation.includes('integral')) return 'integral';
    if (equation.includes('d/dx') || equation.includes('derivative')) return 'derivative';
    if (equation.includes('P(') || equation.includes('probability')) return 'probability';
    if (equation.includes('∑') || equation.includes('sum')) return 'summation';
    if (equation.includes('log') || equation.includes('ln')) return 'logarithmic';
    if (equation.includes('^') || equation.includes('**')) return 'exponential';
    return 'algebraic';
  }

  /**
   * Generate explanation for equation type
   */
  private generateEquationExplanation(equation: string, type: string, context: string): string {
    const explanations: Record<string, string> = {
      'quadratic': 'This is a quadratic equation in the form ax² + bx + c = 0. It represents a parabola and can be solved using the quadratic formula, factoring, or completing the square.',
      'linear': 'This is a linear equation representing a straight line. The solution shows the relationship between variables with a constant rate of change.',
      'trigonometric': 'This equation involves trigonometric functions (sin, cos, tan) which relate angles to ratios in right triangles and periodic phenomena.',
      'integral': 'This integral calculates the area under a curve or the accumulation of a quantity over an interval.',
      'derivative': 'This derivative shows the rate of change or slope of a function at any given point.',
      'probability': 'This probability equation calculates the likelihood of an event occurring, with values between 0 and 1.',
      'summation': 'This summation adds up a series of terms according to a specific pattern or formula.',
      'logarithmic': 'This logarithmic equation involves the inverse of exponential functions, useful for solving exponential growth/decay problems.',
      'exponential': 'This exponential equation shows rapid growth or decay, where the variable appears in the exponent.',
      'algebraic': 'This algebraic equation shows the relationship between variables using basic mathematical operations.'
    };
    
    return explanations[type] || 'This mathematical equation expresses a relationship between variables and constants.';
  }

  /**
   * Generate derivation steps for equation
   */
  private generateDerivationSteps(equation: string, type: string): string[] {
    const steps: Record<string, string[]> = {
      'quadratic': [
        'Start with the general form: ax² + bx + c = 0',
        'Apply the quadratic formula: x = (-b ± √(b² - 4ac)) / 2a',
        'Calculate the discriminant: b² - 4ac',
        'Solve for both possible values of x'
      ],
      'linear': [
        'Isolate the variable on one side',
        'Perform inverse operations',
        'Simplify to get the solution'
      ],
      'trigonometric': [
        'Identify the trigonometric function',
        'Use trigonometric identities if needed',
        'Solve within the given domain',
        'Check for additional solutions'
      ],
      'probability': [
        'Identify the sample space',
        'Count favorable outcomes',
        'Apply probability formula: P(E) = favorable/total',
        'Express as fraction, decimal, or percentage'
      ]
    };
    
    return steps[type] || ['Identify known values', 'Apply appropriate formula', 'Solve step by step', 'Verify the solution'];
  }

  /**
   * Generate applications for equation type
   */
  private generateEquationApplications(type: string): string {
    const applications: Record<string, string> = {
      'quadratic': 'Used in physics for projectile motion, economics for profit optimization, and engineering for structural analysis.',
      'linear': 'Applied in business for cost analysis, physics for uniform motion, and everyday calculations.',
      'trigonometric': 'Essential in engineering, physics wave analysis, navigation, and periodic phenomena modeling.',
      'integral': 'Used to find areas, volumes, work done, and in probability for continuous distributions.',
      'derivative': 'Applied in optimization problems, physics for velocity/acceleration, and rate of change analysis.',
      'probability': 'Used in statistics, risk analysis, quality control, and decision-making processes.',
      'summation': 'Applied in series analysis, financial calculations, and discrete mathematics.',
      'logarithmic': 'Used in exponential growth/decay, pH calculations, decibel measurements, and data analysis.',
      'exponential': 'Applied in population growth, radioactive decay, compound interest, and bacterial growth.',
      'algebraic': 'Fundamental for solving real-world problems involving unknown quantities and relationships.'
    };
    
    return applications[type] || 'This equation type has various applications in mathematics, science, and engineering.';
  }

  /**
   * Create concept diagram with nodes and relationships
   */
  createConceptDiagram(conceptData: ConceptData, style: FlatLineStyle, dimensions: ImageDimensions): string {
    const strokeWidth = this.getStrokeWidth(style.lineWeight);
    const color = this.getColor(style.colorScheme);
    
    let svg = this.createSVGHeader(dimensions);
    
    // Calculate positions for elements
    const positionedElements = this.calculateElementPositions(conceptData.elements, style.layout, dimensions);
    
    // Draw relationships first (so they appear behind nodes)
    for (const relationship of conceptData.relationships) {
      const fromElement = positionedElements.find(el => el.id === relationship.from);
      const toElement = positionedElements.find(el => el.id === relationship.to);
      
      if (fromElement && toElement) {
        svg += this.drawRelationship(fromElement, toElement, relationship, style, color, strokeWidth);
      }
    }
    
    // Draw concept elements
    for (const element of positionedElements) {
      svg += this.drawConceptElement(element, style, color, strokeWidth);
    }
    
    // Add title
    svg += `<text x="${dimensions.width / 2}" y="25" font-family="sans-serif" font-size="16" font-weight="bold" fill="${color}" text-anchor="middle">`;
    svg += this.escapeXML(conceptData.title);
    svg += `</text>`;
    
    svg += `</svg>`;
    return svg;
  }  /**
   
* Create example illustration with step-by-step breakdown
   */
  createExampleIllustration(exampleData: ExampleData, style: FlatLineStyle, dimensions: ImageDimensions): string {
    const strokeWidth = this.getStrokeWidth(style.lineWeight);
    const color = this.getColor(style.colorScheme);
    
    let svg = this.createSVGHeader(dimensions);
    
    // Apply subject area template if specified
    const processedData = this.applyExampleTemplate(exampleData);
    
    // Choose layout based on template and content
    const layout = this.determineExampleLayout(processedData, dimensions);
    
    switch (layout.type) {
      case 'step-by-step':
        svg += this.renderStepByStepLayout(processedData, style, dimensions, color, strokeWidth);
        break;
      case 'problem-solution':
        svg += this.renderProblemSolutionLayout(processedData, style, dimensions, color, strokeWidth);
        break;
      case 'proof':
        svg += this.renderProofLayout(processedData, style, dimensions, color, strokeWidth);
        break;
      case 'calculation':
        svg += this.renderCalculationLayout(processedData, style, dimensions, color, strokeWidth);
        break;
      default:
        svg += this.renderDefaultExampleLayout(processedData, style, dimensions, color, strokeWidth);
        break;
    }
    
    // Add annotations and labels
    svg += this.renderExampleAnnotations(processedData, style, dimensions, color);
    
    // Add visual elements
    for (const visualElement of processedData.visualElements) {
      svg += this.drawEnhancedVisualElement(visualElement, style, color, strokeWidth);
    }
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Apply example template based on subject area and template type
   */
  private applyExampleTemplate(exampleData: ExampleData): ExampleData {
    const templates = this.getExampleTemplates();
    const templateKey = `${exampleData.subjectArea || 'generic'}_${exampleData.template || 'problem-solution'}`;
    const template = templates[templateKey] || templates[`generic_${exampleData.template || 'problem-solution'}`];
    
    if (!template) {
      return exampleData;
    }
    
    const processedData = { ...exampleData };
    
    // Apply template enhancements
    if (template.enhanceSteps && processedData.steps.length > 0) {
      processedData.steps = processedData.steps.map(step => ({
        ...step,
        annotations: [...(step.annotations || []), ...(template.defaultStepAnnotations || [])]
      }));
    }
    
    // Add template-specific visual elements
    if (template.defaultVisualElements) {
      processedData.visualElements = [...processedData.visualElements, ...template.defaultVisualElements];
    }
    
    // Add template-specific annotations
    if (template.defaultAnnotations) {
      processedData.annotations = [...(processedData.annotations || []), ...template.defaultAnnotations];
    }
    
    return processedData;
  }

  /**
   * Get example templates for different subject areas and types
   */
  private getExampleTemplates(): { [key: string]: ExampleTemplateConfig } {
    return {
      'mathematics_step-by-step': {
        enhanceSteps: true,
        defaultStepAnnotations: [
          { type: 'operation', content: 'Mathematical operation', target: 'formula' }
        ],
        defaultVisualElements: [
          { type: 'arrow', content: '', position: { x: 50, y: 100 }, size: { width: 30, height: 5 } }
        ]
      },
      'mathematics_calculation': {
        enhanceSteps: true,
        defaultStepAnnotations: [
          { type: 'variable', content: 'Variable', target: 'variable' },
          { type: 'result', content: 'Result', target: 'result' }
        ],
        defaultVisualElements: [
          { type: 'box', content: '', position: { x: 100, y: 150 }, size: { width: 80, height: 25 } }
        ]
      },
      'physics_problem-solution': {
        enhanceSteps: true,
        defaultAnnotations: [
          { id: 'given', type: 'definition', content: 'Given values', position: { x: 20, y: 50 } },
          { id: 'find', type: 'definition', content: 'Find', position: { x: 20, y: 70 } }
        ],
        defaultVisualElements: [
          { type: 'highlight', content: '', position: { x: 100, y: 60 }, size: { width: 120, height: 20 } }
        ]
      },
      'chemistry_experiment': {
        enhanceSteps: true,
        defaultAnnotations: [
          { id: 'materials', type: 'definition', content: 'Materials', position: { x: 20, y: 40 } },
          { id: 'procedure', type: 'definition', content: 'Procedure', position: { x: 20, y: 120 } }
        ],
        defaultVisualElements: [
          { type: 'circle', content: '', position: { x: 80, y: 200 }, size: { width: 40, height: 40 } }
        ]
      },
      'generic_problem-solution': {
        enhanceSteps: false,
        defaultVisualElements: [
          { type: 'arrow', content: '', position: { x: 50, y: 100 }, size: { width: 25, height: 5 } }
        ]
      }
    };
  }

  /**
   * Determine appropriate layout for example illustration
   */
  private determineExampleLayout(exampleData: ExampleData, dimensions: ImageDimensions): ExampleLayout {
    const { template, steps } = exampleData;
    
    if (template === 'step-by-step' && steps.length >= 2) {
      return { type: 'step-by-step', sections: steps.length + 2 }; // +2 for problem and solution
    }
    
    if (template === 'proof' || template === 'derivation') {
      return { type: 'proof', sections: Math.max(3, steps.length) };
    }
    
    if (template === 'calculation' && steps.some(s => s.formula || s.calculation)) {
      return { type: 'calculation', sections: 3 };
    }
    
    return { type: 'problem-solution', sections: 3 };
  }

  /**
   * Render step-by-step layout
   */
  private renderStepByStepLayout(exampleData: ExampleData, style: FlatLineStyle, dimensions: ImageDimensions, color: string, strokeWidth: number): string {
    let svg = '';
    const margin = 15;
    const headerHeight = 40;
    const availableHeight = dimensions.height - headerHeight - margin * 2;
    const sectionHeight = availableHeight / (exampleData.steps.length + 2); // +2 for problem and solution
    
    // Title
    svg += `<text x="${dimensions.width / 2}" y="25" font-family="sans-serif" font-size="14" font-weight="bold" fill="${color}" text-anchor="middle">Step-by-Step Solution</text>`;
    
    let currentY = headerHeight + margin;
    
    // Problem section
    svg += this.renderExampleSection('Problem', exampleData.problem, margin, currentY, dimensions.width - 2 * margin, sectionHeight - 5, color, strokeWidth);
    currentY += sectionHeight;
    
    // Steps sections
    exampleData.steps.forEach((step, index) => {
      const stepTitle = `Step ${index + 1}`;
      let stepContent = step.description;
      
      if (step.formula) {
        stepContent += `\nFormula: ${step.formula}`;
      }
      if (step.calculation) {
        stepContent += `\nCalculation: ${step.calculation}`;
      }
      if (step.result) {
        stepContent += `\nResult: ${step.result}`;
      }
      
      svg += this.renderExampleSection(stepTitle, stepContent, margin, currentY, dimensions.width - 2 * margin, sectionHeight - 5, color, strokeWidth);
      
      // Add step annotations
      if (step.annotations) {
        svg += this.renderStepAnnotations(step.annotations, margin, currentY, sectionHeight, color);
      }
      
      currentY += sectionHeight;
    });
    
    // Solution section
    svg += this.renderExampleSection('Final Answer', exampleData.solution, margin, currentY, dimensions.width - 2 * margin, sectionHeight - 5, color, strokeWidth);
    
    return svg;
  }

  /**
   * Render problem-solution layout
   */
  private renderProblemSolutionLayout(exampleData: ExampleData, style: FlatLineStyle, dimensions: ImageDimensions, color: string, strokeWidth: number): string {
    let svg = '';
    const sectionHeight = dimensions.height / 3;
    
    // Problem section
    svg += this.renderExampleSection('Problem', exampleData.problem, 10, 10, dimensions.width - 20, sectionHeight - 10, color, strokeWidth);
    
    // Steps section (condensed)
    const stepsY = sectionHeight + 10;
    let stepsContent = '';
    exampleData.steps.forEach((step, i) => {
      stepsContent += `${i + 1}. ${step.description}`;
      if (step.formula) stepsContent += ` (${step.formula})`;
      if (i < exampleData.steps.length - 1) stepsContent += '\n';
    });
    
    svg += this.renderExampleSection('Solution Steps', stepsContent, 10, stepsY, dimensions.width - 20, sectionHeight - 10, color, strokeWidth);
    
    // Solution section
    const solutionY = sectionHeight * 2 + 10;
    svg += this.renderExampleSection('Answer', exampleData.solution, 10, solutionY, dimensions.width - 20, sectionHeight - 20, color, strokeWidth);
    
    return svg;
  }

  /**
   * Render proof layout
   */
  private renderProofLayout(exampleData: ExampleData, style: FlatLineStyle, dimensions: ImageDimensions, color: string, strokeWidth: number): string {
    let svg = '';
    const margin = 20;
    const headerHeight = 50;
    const availableHeight = dimensions.height - headerHeight - margin * 2;
    
    // Title
    svg += `<text x="${dimensions.width / 2}" y="25" font-family="sans-serif" font-size="14" font-weight="bold" fill="${color}" text-anchor="middle">Mathematical Proof</text>`;
    svg += `<text x="${dimensions.width / 2}" y="40" font-family="sans-serif" font-size="11" fill="${color}" text-anchor="middle" opacity="0.7">Given: ${exampleData.problem}</text>`;
    
    let currentY = headerHeight + margin;
    const stepHeight = availableHeight / Math.max(1, exampleData.steps.length);
    
    // Proof steps
    exampleData.steps.forEach((step, index) => {
      // Step number and description
      svg += `<text x="${margin}" y="${currentY + 15}" font-family="sans-serif" font-size="12" font-weight="bold" fill="${color}">${index + 1}.</text>`;
      svg += this.addWrappedText(step.description, margin + 25, currentY + 15, dimensions.width - margin * 2 - 25, 11, color);
      
      // Formula if present
      if (step.formula) {
        svg += `<text x="${margin + 40}" y="${currentY + 35}" font-family="serif" font-size="13" fill="${color}" font-style="italic">${this.escapeXML(step.formula)}</text>`;
      }
      
      // Justification line
      svg += `<line x1="${margin + 20}" y1="${currentY + stepHeight - 10}" x2="${dimensions.width - margin}" y2="${currentY + stepHeight - 10}" stroke="${color}" stroke-width="1" opacity="0.3"/>`;
      
      currentY += stepHeight;
    });
    
    // QED symbol
    svg += `<text x="${dimensions.width - margin - 20}" y="${currentY - 5}" font-family="serif" font-size="12" font-weight="bold" fill="${color}">∎</text>`;
    
    return svg;
  }

  /**
   * Render calculation layout
   */
  private renderCalculationLayout(exampleData: ExampleData, style: FlatLineStyle, dimensions: ImageDimensions, color: string, strokeWidth: number): string {
    let svg = '';
    const margin = 20;
    const sectionHeight = dimensions.height / 3;
    
    // Given section
    svg += this.renderExampleSection('Given', exampleData.problem, margin, 10, dimensions.width - 2 * margin, sectionHeight - 10, color, strokeWidth);
    
    // Calculations section
    const calcY = sectionHeight + 10;
    svg += `<rect x="${margin}" y="${calcY}" width="${dimensions.width - 2 * margin}" height="${sectionHeight - 10}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    svg += `<text x="${margin + 10}" y="${calcY + 20}" font-family="sans-serif" font-size="12" font-weight="bold" fill="${color}">Calculations:</text>`;
    
    let calcCurrentY = calcY + 35;
    exampleData.steps.forEach((step, index) => {
      if (step.calculation) {
        svg += `<text x="${margin + 15}" y="${calcCurrentY}" font-family="serif" font-size="12" fill="${color}">${this.escapeXML(step.calculation)}</text>`;
        calcCurrentY += 20;
      }
    });
    
    // Result section
    const resultY = sectionHeight * 2 + 10;
    svg += this.renderExampleSection('Result', exampleData.solution, margin, resultY, dimensions.width - 2 * margin, sectionHeight - 20, color, strokeWidth);
    
    return svg;
  }

  /**
   * Render default example layout
   */
  private renderDefaultExampleLayout(exampleData: ExampleData, style: FlatLineStyle, dimensions: ImageDimensions, color: string, strokeWidth: number): string {
    return this.renderProblemSolutionLayout(exampleData, style, dimensions, color, strokeWidth);
  }

  /**
   * Render individual example section
   */
  private renderExampleSection(title: string, content: string, x: number, y: number, width: number, height: number, color: string, strokeWidth: number): string {
    let svg = '';
    
    // Section border
    svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    
    // Section title
    svg += `<text x="${x + 10}" y="${y + 18}" font-family="sans-serif" font-size="12" font-weight="bold" fill="${color}">${this.escapeXML(title)}:</text>`;
    
    // Section content
    svg += this.addWrappedText(content, x + 10, y + 35, width - 20, 11, color);
    
    return svg;
  }

  /**
   * Render example annotations
   */
  private renderExampleAnnotations(exampleData: ExampleData, style: FlatLineStyle, dimensions: ImageDimensions, color: string): string {
    if (!exampleData.annotations || exampleData.annotations.length === 0) {
      return '';
    }
    
    let svg = '';
    
    exampleData.annotations.forEach(annotation => {
      const annotationColor = annotation.style?.textColor || color;
      const backgroundColor = annotation.style?.backgroundColor;
      const borderColor = annotation.style?.borderColor || annotationColor;
      const fontSize = annotation.style?.fontSize || 10;
      
      // Background if specified
      if (backgroundColor) {
        svg += `<rect x="${annotation.position.x - 5}" y="${annotation.position.y - 12}" width="100" height="16" fill="${backgroundColor}" opacity="0.8"/>`;
      }
      
      // Annotation text
      svg += `<text x="${annotation.position.x}" y="${annotation.position.y}" font-family="sans-serif" font-size="${fontSize}" fill="${annotationColor}">${this.escapeXML(annotation.content)}</text>`;
      
      // Border if specified
      if (borderColor && borderColor !== annotationColor) {
        svg += `<rect x="${annotation.position.x - 5}" y="${annotation.position.y - 12}" width="100" height="16" fill="none" stroke="${borderColor}" stroke-width="1"/>`;
      }
    });
    
    return svg;
  }

  /**
   * Render step annotations
   */
  private renderStepAnnotations(annotations: StepAnnotation[], x: number, y: number, height: number, color: string): string {
    let svg = '';
    
    annotations.forEach((annotation, index) => {
      const annotationY = y + 20 + (index * 15);
      const annotationColor = this.getAnnotationColor(annotation.type, color);
      
      svg += `<text x="${x + 5}" y="${annotationY}" font-family="sans-serif" font-size="9" fill="${annotationColor}" opacity="0.8">${this.escapeXML(annotation.content)}</text>`;
    });
    
    return svg;
  }

  /**
   * Get color for annotation type
   */
  private getAnnotationColor(type: string, defaultColor: string): string {
    const colorMap: Record<string, string> = {
      'variable': '#4A90E2',
      'operation': '#E24A4A',
      'result': '#7ED321',
      'note': '#F5A623',
      'warning': '#D0021B'
    };
    
    return colorMap[type] || defaultColor;
  }

  /**
   * Draw enhanced visual element with support for new types and styles
   */
  private drawEnhancedVisualElement(element: VisualElement, style: FlatLineStyle, color: string, strokeWidth: number): string {
    const { x, y } = element.position;
    const elementColor = element.style?.color || color;
    const elementStrokeWidth = element.style?.strokeWidth || strokeWidth;
    const opacity = element.style?.opacity || 1;
    const dashArray = element.style?.dashArray || '';
    
    let svg = '';
    
    switch (element.type) {
      case 'highlight':
        const width = element.size?.width || 100;
        const height = element.size?.height || 20;
        svg += `<rect x="${x - width/2}" y="${y - height/2}" width="${width}" height="${height}" fill="${elementColor}" opacity="0.3"/>`;
        break;
        
      case 'annotation':
        svg += `<text x="${x}" y="${y}" font-family="sans-serif" font-size="10" fill="${elementColor}" opacity="${opacity}">${this.escapeXML(element.content)}</text>`;
        break;
        
      case 'arrow':
        const arrowLength = element.size?.width || 30;
        svg += `<line x1="${x}" y1="${y}" x2="${x + arrowLength}" y2="${y}" stroke="${elementColor}" stroke-width="${elementStrokeWidth}" stroke-dasharray="${dashArray}" opacity="${opacity}" marker-end="url(#arrowhead)"/>`;
        break;
        
      case 'box':
        const boxWidth = element.size?.width || 80;
        const boxHeight = element.size?.height || 20;
        svg += `<rect x="${x - boxWidth/2}" y="${y - boxHeight/2}" width="${boxWidth}" height="${boxHeight}" fill="none" stroke="${elementColor}" stroke-width="${elementStrokeWidth}" stroke-dasharray="${dashArray}" opacity="${opacity}"/>`;
        break;
        
      case 'circle':
        const radius = (element.size?.width || 40) / 2;
        svg += `<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${elementColor}" stroke-width="${elementStrokeWidth}" stroke-dasharray="${dashArray}" opacity="${opacity}"/>`;
        break;
        
      case 'underline':
        const underlineWidth = element.size?.width || 60;
        svg += `<line x1="${x - underlineWidth/2}" y1="${y + 5}" x2="${x + underlineWidth/2}" y2="${y + 5}" stroke="${elementColor}" stroke-width="${elementStrokeWidth}" stroke-dasharray="${dashArray}" opacity="${opacity}"/>`;
        break;
        
      case 'bracket':
        const bracketHeight = element.size?.height || 30;
        const bracketWidth = 8;
        svg += `<path d="M ${x - bracketWidth} ${y - bracketHeight/2} L ${x} ${y - bracketHeight/2} L ${x} ${y + bracketHeight/2} L ${x - bracketWidth} ${y + bracketHeight/2}" fill="none" stroke="${elementColor}" stroke-width="${elementStrokeWidth}" opacity="${opacity}"/>`;
        break;
    }
    
    return svg;
  }

  /**
   * Parse example data from string with enhanced structure support
   */
  private parseExampleData(content: string): ExampleData {
    const lines = content.split('\n').filter(line => line.trim());
    
    let problem = '';
    let solution = '';
    const steps: ExampleStep[] = [];
    const visualElements: VisualElement[] = [];
    const annotations: ExampleAnnotation[] = [];
    let subjectArea: SubjectArea = 'generic';
    let template: ExampleTemplate = 'problem-solution';
    
    let currentSection = 'metadata';
    let stepCounter = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Parse metadata
      if (line.startsWith('subject:')) {
        const subject = line.substring(8).trim() as SubjectArea;
        if (['mathematics', 'physics', 'chemistry', 'biology', 'engineering', 'computer-science', 'statistics', 'economics'].includes(subject)) {
          subjectArea = subject;
        }
        continue;
      }
      
      if (line.startsWith('template:')) {
        const templateValue = line.substring(9).trim() as ExampleTemplate;
        if (['problem-solution', 'step-by-step', 'proof', 'derivation', 'calculation', 'analysis', 'comparison', 'experiment'].includes(templateValue)) {
          template = templateValue;
        }
        continue;
      }
      
      // Parse sections
      if (line.toLowerCase().startsWith('problem:')) {
        currentSection = 'problem';
        problem = line.substring(8).trim();
        continue;
      }
      
      if (line.toLowerCase().startsWith('solution:')) {
        currentSection = 'solution';
        solution = line.substring(9).trim();
        continue;
      }
      
      if (line.toLowerCase().startsWith('steps:') || line.toLowerCase().startsWith('step ')) {
        currentSection = 'steps';
        if (line.toLowerCase().startsWith('step ')) {
          const step = this.parseExampleStep(line, stepCounter++);
          if (step) steps.push(step);
        }
        continue;
      }
      
      // Parse content based on current section
      switch (currentSection) {
        case 'problem':
          problem += (problem ? ' ' : '') + line;
          break;
        case 'solution':
          solution += (solution ? ' ' : '') + line;
          break;
        case 'steps':
          if (line.toLowerCase().startsWith('step ') || /^\d+\./.test(line)) {
            const step = this.parseExampleStep(line, stepCounter++);
            if (step) steps.push(step);
          }
          break;
      }
    }
    
    // Fallback parsing if no explicit sections found
    if (!problem && !solution && steps.length === 0) {
      const sections = content.split('\n\n');
      problem = sections[0] || 'Problem statement';
      solution = sections[sections.length - 1] || 'Solution';
      
      const stepSections = sections.slice(1, -1);
      stepSections.forEach((stepText, i) => {
        steps.push({
          id: `step_${i + 1}`,
          description: stepText.trim(),
          annotations: []
        });
      });
    }
    
    return {
      problem: problem || 'Problem statement',
      solution: solution || 'Solution',
      steps,
      visualElements,
      subjectArea,
      template,
      annotations
    };
  }

  /**
   * Parse individual example step with enhanced structure
   */
  private parseExampleStep(stepText: string, index: number): ExampleStep | null {
    if (!stepText.trim()) return null;
    
    // Remove step numbering
    let description = stepText.replace(/^(step\s*\d+[:.]\s*|\d+[:.]\s*)/i, '').trim();
    
    // Extract formula if present (text between $ symbols or in parentheses)
    let formula: string | undefined;
    const formulaMatch = description.match(/\$([^$]+)\$|\(([^)]+)\)/);
    if (formulaMatch) {
      formula = formulaMatch[1] || formulaMatch[2];
    }
    
    // Extract calculation if present (text with = sign)
    let calculation: string | undefined;
    const calcMatch = description.match(/([^=]+=\s*[^,.\n]+)/);
    if (calcMatch) {
      calculation = calcMatch[1].trim();
    }
    
    // Extract result if present (text after "result:" or "answer:")
    let result: string | undefined;
    const resultMatch = description.match(/(result|answer):\s*([^,.\n]+)/i);
    if (resultMatch) {
      result = resultMatch[2].trim();
    }
    
    return {
      id: `step_${index + 1}`,
      description,
      formula,
      calculation,
      result,
      visualHints: [],
      annotations: []
    };
  }

  /**
   * Parse concept data from string
   */
  private parseConceptData(content: string): ConceptData {
    const lines = content.split('\n').filter(line => line.trim());
    
    return {
      title: lines[0] || 'Concept Diagram',
      elements: [
        { id: 'concept1', label: 'Concept 1', type: 'node' },
        { id: 'concept2', label: 'Concept 2', type: 'node' }
      ],
      relationships: [
        { from: 'concept1', to: 'concept2', type: 'arrow' }
      ]
    };
  }

  /**
   * Create generic diagram
   */
  private createGenericDiagram(content: string, style: FlatLineStyle, dimensions: ImageDimensions): string {
    const color = this.getColor(style.colorScheme);
    
    let svg = this.createSVGHeader(dimensions);
    
    // Simple text-based diagram
    svg += this.addWrappedText(content, 20, 40, dimensions.width - 40, 14, color);
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Calculate positions for concept elements
   */
  private calculateElementPositions(elements: ConceptElement[], layout: string, dimensions: ImageDimensions): ConceptElement[] {
    const positioned = [...elements];
    const margin = 50;
    const usableWidth = dimensions.width - 2 * margin;
    const usableHeight = dimensions.height - 2 * margin - 50; // Reserve space for title
    
    if (layout === 'horizontal') {
      const spacing = usableWidth / Math.max(1, elements.length - 1);
      positioned.forEach((element, i) => {
        element.position = {
          x: margin + (i * spacing),
          y: margin + 50 + usableHeight / 2
        };
      });
    } else if (layout === 'vertical') {
      const spacing = usableHeight / Math.max(1, elements.length - 1);
      positioned.forEach((element, i) => {
        element.position = {
          x: margin + usableWidth / 2,
          y: margin + 50 + (i * spacing)
        };
      });
    } else { // grid
      const cols = Math.ceil(Math.sqrt(elements.length));
      const rows = Math.ceil(elements.length / cols);
      const colSpacing = usableWidth / Math.max(1, cols - 1);
      const rowSpacing = usableHeight / Math.max(1, rows - 1);
      
      positioned.forEach((element, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        element.position = {
          x: margin + (col * colSpacing),
          y: margin + 50 + (row * rowSpacing)
        };
      });
    }
    
    return positioned;
  }

  /**
   * Draw relationship between elements
   */
  private drawRelationship(from: ConceptElement, to: ConceptElement, relationship: Relationship, style: FlatLineStyle, color: string, strokeWidth: number): string {
    if (!from.position || !to.position) return '';
    
    const strokeDashArray = relationship.type === 'dashed' ? 'stroke-dasharray="5,5"' : '';
    
    let svg = `<line x1="${from.position.x}" y1="${from.position.y}" x2="${to.position.x}" y2="${to.position.y}" stroke="${color}" stroke-width="${strokeWidth}" ${strokeDashArray}/>`;
    
    // Add arrowhead for arrow type
    if (relationship.type === 'arrow') {
      const angle = Math.atan2(to.position.y - from.position.y, to.position.x - from.position.x);
      const arrowLength = 10;
      const arrowAngle = Math.PI / 6;
      
      const x1 = to.position.x - arrowLength * Math.cos(angle - arrowAngle);
      const y1 = to.position.y - arrowLength * Math.sin(angle - arrowAngle);
      const x2 = to.position.x - arrowLength * Math.cos(angle + arrowAngle);
      const y2 = to.position.y - arrowLength * Math.sin(angle + arrowAngle);
      
      svg += `<line x1="${to.position.x}" y1="${to.position.y}" x2="${x1}" y2="${y1}" stroke="${color}" stroke-width="${strokeWidth}"/>`;
      svg += `<line x1="${to.position.x}" y1="${to.position.y}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    }
    
    // Add label if present
    if (relationship.label) {
      const midX = (from.position.x + to.position.x) / 2;
      const midY = (from.position.y + to.position.y) / 2;
      svg += `<text x="${midX}" y="${midY - 5}" font-family="sans-serif" font-size="10" fill="${color}" text-anchor="middle">${this.escapeXML(relationship.label)}</text>`;
    }
    
    return svg;
  }

  /**
   * Draw concept element
   */
  private drawConceptElement(element: ConceptElement, style: FlatLineStyle, color: string, strokeWidth: number): string {
    if (!element.position) return '';
    
    const { x, y } = element.position;
    let svg = '';
    
    if (element.type === 'decision') {
      // Diamond shape for decisions
      const size = 30;
      svg += `<polygon points="${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    } else if (element.type === 'process') {
      // Rectangle for processes
      const width = 60;
      const height = 30;
      svg += `<rect x="${x - width/2}" y="${y - height/2}" width="${width}" height="${height}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    } else {
      // Circle for nodes
      const radius = 25;
      svg += `<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    }
    
    // Add label
    svg += `<text x="${x}" y="${y + 4}" font-family="sans-serif" font-size="11" fill="${color}" text-anchor="middle">${this.escapeXML(element.label)}</text>`;
    
    return svg;
  }

  /**
   * Utility methods
   */
  private createSVGHeader(dimensions: ImageDimensions): string {
    return `<svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
        </marker>
      </defs>`;
  }

  private getStrokeWidth(lineWeight: string): number {
    switch (lineWeight) {
      case 'thin': return 1;
      case 'medium': return 2;
      case 'thick': return 3;
      default: return 2;
    }
  }

  private getColor(colorScheme: string): string {
    return colorScheme === 'minimal-color' ? '#333' : '#000';
  }

  private addWrappedText(text: string, x: number, y: number, maxWidth: number, fontSize: number, color: string): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    // Simple word wrapping (approximate)
    const avgCharWidth = fontSize * 0.6;
    const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    let svg = '';
    lines.forEach((line, i) => {
      svg += `<text x="${x}" y="${y + i * (fontSize + 4)}" font-family="sans-serif" font-size="${fontSize}" fill="${color}">${this.escapeXML(line)}</text>`;
    });
    
    return svg;
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private svgToBase64(svgContent: string): string {
    return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
  }

  private generateId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface ExampleTemplateConfig {
  enhanceSteps: boolean;
  defaultStepAnnotations?: StepAnnotation[];
  defaultVisualElements?: VisualElement[];
  defaultAnnotations?: ExampleAnnotation[];
}

interface ExampleLayout {
  type: 'step-by-step' | 'problem-solution' | 'proof' | 'calculation';
  sections: number;
}

// Export default instance
export const simpleImageGenerator = new SimpleImageGenerator();
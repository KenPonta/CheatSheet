// LaTeX/MathJax pattern recognition for mathematical content extraction

export interface MathPattern {
  pattern: RegExp;
  type: 'formula' | 'equation' | 'expression' | 'function' | 'symbol';
  priority: 'high' | 'medium' | 'low';
  description: string;
  latexTemplate?: string;
}

export interface MathMatch {
  text: string;
  type: string;
  priority: string;
  startIndex: number;
  endIndex: number;
  latexSuggestion?: string;
  confidence: number;
}

export class MathPatternRecognizer {
  private patterns: MathPattern[] = [
    // LaTeX delimiters
    {
      pattern: /\$\$([^$]+)\$\$/g,
      type: 'equation',
      priority: 'high',
      description: 'Display math in $$ delimiters',
      latexTemplate: '$$\\1$$'
    },
    {
      pattern: /\$([^$\n]+)\$/g,
      type: 'formula',
      priority: 'high',
      description: 'Inline math in $ delimiters',
      latexTemplate: '$\\1$'
    },
    {
      pattern: /\\\[([^\]]+)\\\]/g,
      type: 'equation',
      priority: 'high',
      description: 'Display math in \\[ \\] delimiters',
      latexTemplate: '\\[\\1\\]'
    },
    {
      pattern: /\\\(([^)]+)\\\)/g,
      type: 'formula',
      priority: 'high',
      description: 'Inline math in \\( \\) delimiters',
      latexTemplate: '\\(\\1\\)'
    },

    // Mathematical symbols and operators
    {
      pattern: /[∑∏∫∮∯∰]/g,
      type: 'symbol',
      priority: 'high',
      description: 'Integral and summation symbols'
    },
    {
      pattern: /[√∛∜]/g,
      type: 'symbol',
      priority: 'high',
      description: 'Root symbols'
    },
    {
      pattern: /[±∓×÷]/g,
      type: 'symbol',
      priority: 'medium',
      description: 'Basic arithmetic symbols'
    },
    {
      pattern: /[≤≥≠≈≡∝∞]/g,
      type: 'symbol',
      priority: 'medium',
      description: 'Comparison and relation symbols'
    },
    {
      pattern: /[∈∉⊂⊃⊆⊇∪∩∅]/g,
      type: 'symbol',
      priority: 'medium',
      description: 'Set theory symbols'
    },
    {
      pattern: /[∀∃∄∧∨¬→↔]/g,
      type: 'symbol',
      priority: 'medium',
      description: 'Logic symbols'
    },
    {
      pattern: /[αβγδεζηθικλμνξοπρστυφχψω]/g,
      type: 'symbol',
      priority: 'low',
      description: 'Greek letters'
    },
    {
      pattern: /[ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ]/g,
      type: 'symbol',
      priority: 'low',
      description: 'Capital Greek letters'
    },

    // Probability and statistics patterns
    {
      pattern: /P\s*\(\s*[^)]+\s*\)/g,
      type: 'formula',
      priority: 'high',
      description: 'Probability notation',
      latexTemplate: 'P(\\text{event})'
    },
    {
      pattern: /E\s*\[\s*[^\]]+\s*\]/g,
      type: 'formula',
      priority: 'high',
      description: 'Expected value notation',
      latexTemplate: 'E[X]'
    },
    {
      pattern: /Var\s*\(\s*[^)]+\s*\)/g,
      type: 'formula',
      priority: 'high',
      description: 'Variance notation',
      latexTemplate: 'Var(X)'
    },
    {
      pattern: /\bσ²?\b/g,
      type: 'symbol',
      priority: 'medium',
      description: 'Standard deviation/variance symbol'
    },
    {
      pattern: /\bμ\b/g,
      type: 'symbol',
      priority: 'medium',
      description: 'Mean symbol'
    },

    // Relations and set theory patterns
    {
      pattern: /R\s*:\s*[A-Z]\s*[×x]\s*[A-Z]\s*→\s*[A-Z]/g,
      type: 'formula',
      priority: 'high',
      description: 'Relation definition',
      latexTemplate: 'R: A \\times B \\to C'
    },
    {
      pattern: /\{[^}]*\|[^}]*\}/g,
      type: 'formula',
      priority: 'medium',
      description: 'Set builder notation',
      latexTemplate: '\\{x | P(x)\\}'
    },
    {
      pattern: /\{[^}]*,[^}]*\}/g,
      type: 'formula',
      priority: 'low',
      description: 'Set enumeration',
      latexTemplate: '\\{a, b, c\\}'
    },

    // Function notation
    {
      pattern: /\b[a-zA-Z]\s*\(\s*[^)]+\s*\)\s*=\s*[^,\n]+/g,
      type: 'formula',
      priority: 'high',
      description: 'Function definition',
      latexTemplate: 'f(x) = expression'
    },
    {
      pattern: /\b(sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|sinh|cosh|tanh)\s*\([^)]+\)/g,
      type: 'formula',
      priority: 'medium',
      description: 'Trigonometric functions'
    },
    {
      pattern: /\b(log|ln|exp|sqrt|abs|floor|ceil)\s*\([^)]+\)/g,
      type: 'function',
      priority: 'medium',
      description: 'Mathematical functions'
    },

    // Equations and expressions
    {
      pattern: /\b[a-zA-Z]\s*=\s*[^,\n=]+(?:\s*[+\-]\s*[^,\n=]+)*/g,
      type: 'equation',
      priority: 'medium',
      description: 'Variable assignment or equation'
    },
    {
      pattern: /\d+\s*[+\-*/^]\s*\d+(?:\s*[+\-*/^]\s*\d+)*/g,
      type: 'expression',
      priority: 'low',
      description: 'Arithmetic expression'
    },
    {
      pattern: /\b\d+\s*\/\s*\d+\b/g,
      type: 'expression',
      priority: 'low',
      description: 'Fraction notation'
    },
    {
      pattern: /\b\d+\^\d+\b/g,
      type: 'expression',
      priority: 'low',
      description: 'Exponentiation'
    },

    // Matrix and vector notation
    {
      pattern: /\[\s*\d+(?:\s+\d+)*\s*\]/g,
      type: 'formula',
      priority: 'medium',
      description: 'Vector notation'
    },
    {
      pattern: /\|\s*[^|]+\s*\|/g,
      type: 'formula',
      priority: 'medium',
      description: 'Absolute value or determinant'
    },

    // Limits and calculus
    {
      pattern: /lim\s*_{[^}]+}\s*[^,\n]+/g,
      type: 'formula',
      priority: 'high',
      description: 'Limit notation',
      latexTemplate: '\\lim_{x \\to a} f(x)'
    },
    {
      pattern: /\b(d|∂)\s*[a-zA-Z]\s*\/\s*(d|∂)\s*[a-zA-Z]/g,
      type: 'formula',
      priority: 'high',
      description: 'Derivative notation',
      latexTemplate: '\\frac{df}{dx}'
    },

    // Summation and product notation
    {
      pattern: /∑\s*_{[^}]+}\s*\^{[^}]+}\s*[^,\n]+/g,
      type: 'equation',
      priority: 'high',
      description: 'Summation with bounds',
      latexTemplate: '\\sum_{i=1}^{n} a_i'
    },
    {
      pattern: /∏\s*_{[^}]+}\s*\^{[^}]+}\s*[^,\n]+/g,
      type: 'equation',
      priority: 'high',
      description: 'Product with bounds',
      latexTemplate: '\\prod_{i=1}^{n} a_i'
    }
  ];

  /**
   * Find all mathematical patterns in text
   */
  findMathPatterns(text: string): MathMatch[] {
    const matches: MathMatch[] = [];
    
    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        const mathMatch: MathMatch = {
          text: match[0],
          type: pattern.type,
          priority: pattern.priority,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: this.calculateConfidence(match[0], pattern),
          latexSuggestion: this.generateLatexSuggestion(match[0], pattern)
        };
        
        matches.push(mathMatch);
        
        // Prevent infinite loops with zero-width matches
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    }
    
    // Sort by priority and position
    return matches.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - 
                          priorityOrder[a.priority as keyof typeof priorityOrder];
      
      if (priorityDiff !== 0) return priorityDiff;
      return a.startIndex - b.startIndex;
    });
  }

  /**
   * Extract formulas with LaTeX conversion
   */
  extractFormulasWithLatex(text: string): Array<{
    original: string;
    latex: string;
    type: 'inline' | 'display';
    confidence: number;
    position: { start: number; end: number };
  }> {
    const matches = this.findMathPatterns(text);
    const formulas: Array<{
      original: string;
      latex: string;
      type: 'inline' | 'display';
      confidence: number;
      position: { start: number; end: number };
    }> = [];
    
    for (const match of matches) {
      if (match.type === 'formula' || match.type === 'equation') {
        const latex = this.convertToLatex(match.text, match.type);
        const type = match.type === 'equation' ? 'display' : 'inline';
        
        formulas.push({
          original: match.text,
          latex,
          type,
          confidence: match.confidence,
          position: {
            start: match.startIndex,
            end: match.endIndex
          }
        });
      }
    }
    
    return formulas;
  }

  /**
   * Detect worked examples in text
   */
  detectWorkedExamples(text: string): Array<{
    text: string;
    type: 'example' | 'problem' | 'solution';
    position: { start: number; end: number };
    confidence: number;
  }> {
    const examplePatterns = [
      {
        pattern: /Example\s+\d+[:.]\s*([^]*?)(?=Example\s+\d+|Problem\s+\d+|$)/gi,
        type: 'example' as const,
        priority: 'high' as const
      },
      {
        pattern: /Problem\s+\d+[:.]\s*([^]*?)(?=Problem\s+\d+|Example\s+\d+|Solution:|$)/gi,
        type: 'problem' as const,
        priority: 'high' as const
      },
      {
        pattern: /Solution[:.]\s*([^]*?)(?=Example\s+\d+|Problem\s+\d+|Solution:|$)/gi,
        type: 'solution' as const,
        priority: 'high' as const
      },
      {
        pattern: /Step\s+\d+[:.]\s*([^]*?)(?=Step\s+\d+|Example\s+\d+|Problem\s+\d+|$)/gi,
        type: 'solution' as const,
        priority: 'medium' as const
      }
    ];
    
    const examples: Array<{
      text: string;
      type: 'example' | 'problem' | 'solution';
      position: { start: number; end: number };
      confidence: number;
    }> = [];
    
    for (const examplePattern of examplePatterns) {
      const regex = new RegExp(examplePattern.pattern.source, examplePattern.pattern.flags);
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        const confidence = this.calculateExampleConfidence(match[0], examplePattern.type);
        
        examples.push({
          text: match[0],
          type: examplePattern.type,
          position: {
            start: match.index,
            end: match.index + match[0].length
          },
          confidence
        });
        
        // Prevent infinite loops
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    }
    
    return examples.sort((a, b) => a.position.start - b.position.start);
  }

  /**
   * Calculate confidence score for a mathematical match
   */
  private calculateConfidence(text: string, pattern: MathPattern): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for explicit LaTeX delimiters
    if (pattern.description.includes('delimiters')) {
      confidence += 0.3;
    }
    
    // Higher confidence for high-priority patterns
    if (pattern.priority === 'high') {
      confidence += 0.2;
    } else if (pattern.priority === 'medium') {
      confidence += 0.1;
    }
    
    // Higher confidence for longer matches (more context)
    if (text.length > 10) {
      confidence += 0.1;
    }
    
    // Higher confidence if it contains multiple mathematical elements
    const mathSymbolCount = (text.match(/[∑∏∫√±≤≥≠∞αβγδεζηθικλμνξοπρστυφχψω]/g) || []).length;
    confidence += Math.min(0.2, mathSymbolCount * 0.05);
    
    return Math.min(1.0, confidence);
  }

  /**
   * Calculate confidence for worked examples
   */
  private calculateExampleConfidence(text: string, type: string): number {
    let confidence = 0.6; // Base confidence for examples
    
    // Higher confidence for explicit example markers
    if (text.toLowerCase().includes('example') || text.toLowerCase().includes('problem')) {
      confidence += 0.2;
    }
    
    // Higher confidence if it contains mathematical content
    const mathMatches = this.findMathPatterns(text);
    if (mathMatches.length > 0) {
      confidence += Math.min(0.2, mathMatches.length * 0.05);
    }
    
    // Higher confidence for step-by-step solutions
    if (text.toLowerCase().includes('step') && type === 'solution') {
      confidence += 0.1;
    }
    
    // Higher confidence for longer, more detailed examples
    if (text.length > 200) {
      confidence += 0.1;
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * Generate LaTeX suggestion for a mathematical expression
   */
  private generateLatexSuggestion(text: string, pattern: MathPattern): string | undefined {
    if (pattern.latexTemplate) {
      return pattern.latexTemplate;
    }
    
    // Basic LaTeX conversion for common patterns
    return this.convertToLatex(text, pattern.type);
  }

  /**
   * Convert mathematical text to LaTeX format
   */
  private convertToLatex(text: string, type: string): string {
    let latex = text;
    
    // If already in LaTeX format, return as-is
    if (text.includes('\\') || text.startsWith('$')) {
      return text;
    }
    
    // Basic conversions
    const conversions = [
      // Greek letters
      { from: /\balpha\b/g, to: '\\alpha' },
      { from: /\bbeta\b/g, to: '\\beta' },
      { from: /\bgamma\b/g, to: '\\gamma' },
      { from: /\bdelta\b/g, to: '\\delta' },
      { from: /\bepsilon\b/g, to: '\\epsilon' },
      { from: /\btheta\b/g, to: '\\theta' },
      { from: /\blambda\b/g, to: '\\lambda' },
      { from: /\bmu\b/g, to: '\\mu' },
      { from: /\bpi\b/g, to: '\\pi' },
      { from: /\bsigma\b/g, to: '\\sigma' },
      { from: /\bomega\b/g, to: '\\omega' },
      
      // Mathematical operators
      { from: /\+\/-/g, to: '\\pm' },
      { from: /-\+/g, to: '\\mp' },
      { from: /\*/g, to: '\\cdot' },
      { from: /!=/g, to: '\\neq' },
      { from: /<=/g, to: '\\leq' },
      { from: />=/g, to: '\\geq' },
      { from: /~=/g, to: '\\approx' },
      { from: /infinity/g, to: '\\infty' },
      
      // Functions
      { from: /\bsqrt\(/g, to: '\\sqrt{' },
      { from: /\bsin\(/g, to: '\\sin(' },
      { from: /\bcos\(/g, to: '\\cos(' },
      { from: /\btan\(/g, to: '\\tan(' },
      { from: /\blog\(/g, to: '\\log(' },
      { from: /\bln\(/g, to: '\\ln(' },
      
      // Fractions (simple case)
      { from: /(\d+)\/(\d+)/g, to: '\\frac{$1}{$2}' },
      
      // Superscripts and subscripts (basic)
      { from: /\^(\d+)/g, to: '^{$1}' },
      { from: /_(\d+)/g, to: '_{$1}' }
    ];
    
    for (const conversion of conversions) {
      latex = latex.replace(conversion.from, conversion.to);
    }
    
    // Wrap in appropriate delimiters based on type
    if (type === 'equation') {
      return `\\[${latex}\\]`;
    } else if (type === 'formula') {
      return `$${latex}$`;
    }
    
    return latex;
  }

  /**
   * Validate LaTeX syntax
   */
  validateLatex(latex: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for balanced delimiters
    const delimiters = [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' }
    ];
    
    for (const delimiter of delimiters) {
      const openCount = (latex.match(new RegExp('\\' + delimiter.open, 'g')) || []).length;
      const closeCount = (latex.match(new RegExp('\\' + delimiter.close, 'g')) || []).length;
      
      if (openCount !== closeCount) {
        errors.push(`Unbalanced ${delimiter.open}${delimiter.close} delimiters`);
      }
    }
    
    // Check for common LaTeX errors
    if (latex.includes('\\\\') && !latex.includes('\\\\[') && !latex.includes('\\\\]')) {
      errors.push('Potential double backslash issue');
    }
    
    // Check for undefined commands (basic check)
    const commands = latex.match(/\\[a-zA-Z]+/g) || [];
    const knownCommands = [
      'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'theta', 'lambda', 'mu', 'pi', 'sigma', 'omega',
      'sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'frac', 'sum', 'prod', 'int', 'lim',
      'pm', 'mp', 'cdot', 'neq', 'leq', 'geq', 'approx', 'infty', 'partial', 'cap'
    ];
    
    for (const command of commands) {
      const commandName = command.substring(1); // Remove backslash
      if (!knownCommands.includes(commandName)) {
        errors.push(`Unknown command: ${command}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
let mathPatternRecognizer: MathPatternRecognizer | null = null;

export function getMathPatternRecognizer(): MathPatternRecognizer {
  if (!mathPatternRecognizer) {
    mathPatternRecognizer = new MathPatternRecognizer();
  }
  return mathPatternRecognizer;
}
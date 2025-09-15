// CLI Configuration System for Compact Study Generator

import { CompactLayoutConfig, TypographyConfig, SpacingConfig, MarginConfig, MathRenderingConfig } from './types';
import * as fs from 'fs';
import * as path from 'path';

// CLI Configuration Interface
export interface CLIConfig {
  layout: 'compact' | 'standard';
  columns: 1 | 2 | 3;
  equations: 'all' | 'key' | 'minimal';
  examples: 'full' | 'summary' | 'references';
  answers: 'inline' | 'appendix' | 'separate';
  fontSize: string; // '10pt', '11pt', etc.
  margins: 'narrow' | 'normal' | 'wide';
  outputFormat: 'html' | 'pdf' | 'markdown' | 'all';
  configFile?: string;
  outputDir?: string;
  verbose?: boolean;
}

// Validation Result Interface
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config?: CLIConfig;
}

// Configuration File Interface
export interface ConfigFile {
  defaults: Partial<CLIConfig>;
  profiles: Record<string, Partial<CLIConfig>>;
  metadata: {
    version: string;
    createdAt: string;
    lastModified: string;
  };
}

// Default Configuration
export const DEFAULT_CLI_CONFIG: CLIConfig = {
  layout: 'compact',
  columns: 2,
  equations: 'all',
  examples: 'full',
  answers: 'inline',
  fontSize: '10pt',
  margins: 'narrow',
  outputFormat: 'pdf',
  verbose: false,
};

// Configuration Validator Class
export class ConfigValidator {
  private static readonly VALID_FONT_SIZES = ['8pt', '9pt', '10pt', '11pt', '12pt'];
  private static readonly VALID_LAYOUTS = ['compact', 'standard'];
  private static readonly VALID_COLUMNS = [1, 2, 3];
  private static readonly VALID_EQUATIONS = ['all', 'key', 'minimal'];
  private static readonly VALID_EXAMPLES = ['full', 'summary', 'references'];
  private static readonly VALID_ANSWERS = ['inline', 'appendix', 'separate'];
  private static readonly VALID_MARGINS = ['narrow', 'normal', 'wide'];
  private static readonly VALID_OUTPUT_FORMATS = ['html', 'pdf', 'markdown', 'all'];

  /**
   * Validates CLI configuration and returns validation result
   */
  static validate(config: Partial<CLIConfig>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate layout
    if (config.layout && !this.VALID_LAYOUTS.includes(config.layout)) {
      errors.push(`Invalid layout: ${config.layout}. Must be one of: ${this.VALID_LAYOUTS.join(', ')}`);
    }

    // Validate columns
    if (config.columns && !this.VALID_COLUMNS.includes(config.columns)) {
      errors.push(`Invalid columns: ${config.columns}. Must be one of: ${this.VALID_COLUMNS.join(', ')}`);
    }

    // Validate equations
    if (config.equations && !this.VALID_EQUATIONS.includes(config.equations)) {
      errors.push(`Invalid equations: ${config.equations}. Must be one of: ${this.VALID_EQUATIONS.join(', ')}`);
    }

    // Validate examples
    if (config.examples && !this.VALID_EXAMPLES.includes(config.examples)) {
      errors.push(`Invalid examples: ${config.examples}. Must be one of: ${this.VALID_EXAMPLES.join(', ')}`);
    }

    // Validate answers
    if (config.answers && !this.VALID_ANSWERS.includes(config.answers)) {
      errors.push(`Invalid answers: ${config.answers}. Must be one of: ${this.VALID_ANSWERS.join(', ')}`);
    }

    // Validate fontSize
    if (config.fontSize && !this.VALID_FONT_SIZES.includes(config.fontSize)) {
      errors.push(`Invalid fontSize: ${config.fontSize}. Must be one of: ${this.VALID_FONT_SIZES.join(', ')}`);
    }

    // Validate margins
    if (config.margins && !this.VALID_MARGINS.includes(config.margins)) {
      errors.push(`Invalid margins: ${config.margins}. Must be one of: ${this.VALID_MARGINS.join(', ')}`);
    }

    // Validate outputFormat
    if (config.outputFormat && !this.VALID_OUTPUT_FORMATS.includes(config.outputFormat)) {
      errors.push(`Invalid outputFormat: ${config.outputFormat}. Must be one of: ${this.VALID_OUTPUT_FORMATS.join(', ')}`);
    }

    // Validate configFile path if provided
    if (config.configFile && !fs.existsSync(config.configFile)) {
      errors.push(`Configuration file not found: ${config.configFile}`);
    }

    // Validate outputDir if provided
    if (config.outputDir && !fs.existsSync(config.outputDir)) {
      warnings.push(`Output directory does not exist: ${config.outputDir}. It will be created.`);
    }

    // Layout-specific warnings
    if (config.layout === 'compact' && config.columns === 1) {
      warnings.push('Single column layout may not provide optimal compactness. Consider using 2 columns.');
    }

    if (config.fontSize === '12pt' && config.layout === 'compact') {
      warnings.push('12pt font size may reduce compactness. Consider using 10pt or 11pt for better density.');
    }

    const validatedConfig = this.applyDefaults(config);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      config: validatedConfig,
    };
  }

  /**
   * Applies default values to partial configuration
   */
  static applyDefaults(config: Partial<CLIConfig>): CLIConfig {
    return {
      ...DEFAULT_CLI_CONFIG,
      ...config,
    };
  }

  /**
   * Converts CLI config to CompactLayoutConfig for the layout engine
   */
  static toLayoutConfig(cliConfig: CLIConfig): CompactLayoutConfig {
    const fontSize = this.parseFontSize(cliConfig.fontSize);
    const margins = this.parseMargins(cliConfig.margins);
    
    const typography: TypographyConfig = {
      fontSize,
      lineHeight: cliConfig.layout === 'compact' ? 1.15 : 1.25,
      fontFamily: {
        body: 'Times, "Times New Roman", serif',
        heading: 'Arial, sans-serif',
        math: 'Computer Modern, "Latin Modern Math", serif',
        code: 'Consolas, "Courier New", monospace',
      },
    };

    const spacing: SpacingConfig = {
      paragraphSpacing: cliConfig.layout === 'compact' ? 0.25 : 0.35,
      listSpacing: cliConfig.layout === 'compact' ? 0.15 : 0.25,
      sectionSpacing: cliConfig.layout === 'compact' ? 0.5 : 0.75,
      headingMargins: {
        top: cliConfig.layout === 'compact' ? 0.5 : 0.75,
        bottom: cliConfig.layout === 'compact' ? 0.25 : 0.5,
      },
    };

    const mathRendering: MathRenderingConfig = {
      displayEquations: {
        centered: true,
        numbered: cliConfig.equations === 'all',
        fullWidth: true,
      },
      inlineEquations: {
        preserveInline: true,
        maxHeight: fontSize * 1.2,
      },
    };

    return {
      paperSize: 'a4',
      columns: cliConfig.columns,
      typography,
      spacing,
      margins,
      mathRendering,
    };
  }

  private static parseFontSize(fontSize: string): number {
    const match = fontSize.match(/(\d+)pt/);
    return match ? parseInt(match[1], 10) : 10;
  }

  private static parseMargins(margins: string): MarginConfig {
    switch (margins) {
      case 'narrow':
        return { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5, columnGap: 0.25 };
      case 'normal':
        return { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0, columnGap: 0.5 };
      case 'wide':
        return { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5, columnGap: 0.75 };
      default:
        return { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5, columnGap: 0.25 };
    }
  }
}

// Command Line Argument Parser
export class CLIArgumentParser {
  /**
   * Parses command line arguments into CLI configuration
   */
  static parse(args: string[]): Partial<CLIConfig> {
    const config: Partial<CLIConfig> = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];

      switch (arg) {
        case '--layout':
          if (nextArg && ['compact', 'standard'].includes(nextArg)) {
            config.layout = nextArg as 'compact' | 'standard';
            i++;
          }
          break;

        case '--columns':
          if (nextArg && ['1', '2', '3'].includes(nextArg)) {
            config.columns = parseInt(nextArg, 10) as 1 | 2 | 3;
            i++;
          }
          break;

        case '--equations':
          if (nextArg && ['all', 'key', 'minimal'].includes(nextArg)) {
            config.equations = nextArg as 'all' | 'key' | 'minimal';
            i++;
          }
          break;

        case '--examples':
          if (nextArg && ['full', 'summary', 'references'].includes(nextArg)) {
            config.examples = nextArg as 'full' | 'summary' | 'references';
            i++;
          }
          break;

        case '--answers':
          if (nextArg && ['inline', 'appendix', 'separate'].includes(nextArg)) {
            config.answers = nextArg as 'inline' | 'appendix' | 'separate';
            i++;
          }
          break;

        case '--font-size':
          if (nextArg && /^\d+pt$/.test(nextArg)) {
            config.fontSize = nextArg;
            i++;
          }
          break;

        case '--margins':
          if (nextArg && ['narrow', 'normal', 'wide'].includes(nextArg)) {
            config.margins = nextArg as 'narrow' | 'normal' | 'wide';
            i++;
          }
          break;

        case '--output-format':
          if (nextArg && ['html', 'pdf', 'markdown', 'all'].includes(nextArg)) {
            config.outputFormat = nextArg as 'html' | 'pdf' | 'markdown' | 'all';
            i++;
          }
          break;

        case '--config':
          if (nextArg) {
            config.configFile = nextArg;
            i++;
          }
          break;

        case '--output-dir':
          if (nextArg) {
            config.outputDir = nextArg;
            i++;
          }
          break;

        case '--verbose':
          config.verbose = true;
          break;

        default:
          // Ignore unknown arguments
          break;
      }
    }

    return config;
  }

  /**
   * Generates help text for CLI usage
   */
  static getHelpText(): string {
    return `
Compact Study Generator CLI

Usage: compact-study [options] <input-files>

Options:
  --layout <compact|standard>           Layout style (default: compact)
  --columns <1|2|3>                     Number of columns (default: 2)
  --equations <all|key|minimal>         Equation inclusion level (default: all)
  --examples <full|summary|references>  Example detail level (default: full)
  --answers <inline|appendix|separate>  Answer placement (default: inline)
  --font-size <8pt|9pt|10pt|11pt|12pt>  Font size (default: 10pt)
  --margins <narrow|normal|wide>        Margin size (default: narrow)
  --output-format <html|pdf|markdown|all> Output format (default: pdf)
  --config <file>                       Configuration file path
  --output-dir <directory>              Output directory
  --verbose                             Enable verbose logging
  --help                                Show this help message

Examples:
  compact-study --layout compact --columns 2 probability.pdf relations.pdf
  compact-study --config my-config.json --output-format all input.pdf
  compact-study --font-size 11pt --margins normal --examples summary *.pdf
`;
  }
}
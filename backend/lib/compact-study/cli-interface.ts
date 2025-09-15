// Main CLI Interface for Compact Study Generator

import { CLIConfig, CLIArgumentParser, ConfigValidator, ValidationResult } from './cli-config';
import { ConfigFileManager } from './config-file-manager';
import * as path from 'path';
import * as fs from 'fs';

export interface CLIOptions {
  inputFiles: string[];
  config: CLIConfig;
  profileName?: string;
  showHelp: boolean;
  showVersion: boolean;
  createConfig: boolean;
  validateConfig: boolean;
  listProfiles: boolean;
}

export class CompactStudyCLI {
  private static readonly VERSION = '1.0.0';

  /**
   * Main entry point for CLI processing
   */
  static async run(args: string[]): Promise<CLIOptions> {
    // Check for help, version, or special commands first
    if (args.includes('--help') || args.includes('-h')) {
      return {
        inputFiles: [],
        config: ConfigValidator.applyDefaults({}),
        showHelp: true,
        showVersion: false,
        createConfig: false,
        validateConfig: false,
        listProfiles: false,
      };
    }

    if (args.includes('--version') || args.includes('-v')) {
      return {
        inputFiles: [],
        config: ConfigValidator.applyDefaults({}),
        showHelp: false,
        showVersion: true,
        createConfig: false,
        validateConfig: false,
        listProfiles: false,
      };
    }

    if (args.includes('--create-config')) {
      return {
        inputFiles: [],
        config: ConfigValidator.applyDefaults({}),
        showHelp: false,
        showVersion: false,
        createConfig: true,
        validateConfig: false,
        listProfiles: false,
      };
    }

    if (args.includes('--validate-config')) {
      return {
        inputFiles: [],
        config: ConfigValidator.applyDefaults({}),
        showHelp: false,
        showVersion: false,
        createConfig: false,
        validateConfig: true,
        listProfiles: false,
      };
    }

    if (args.includes('--list-profiles')) {
      return {
        inputFiles: [],
        config: ConfigValidator.applyDefaults({}),
        showHelp: false,
        showVersion: false,
        createConfig: false,
        validateConfig: false,
        listProfiles: true,
      };
    }

    // Parse CLI arguments
    const cliArgs = CLIArgumentParser.parse(args);
    
    // Extract profile name if specified
    const profileIndex = args.indexOf('--profile');
    const profileName = profileIndex !== -1 && args[profileIndex + 1] ? args[profileIndex + 1] : undefined;

    // Merge with configuration file
    const config = await ConfigFileManager.mergeWithConfigFile(
      cliArgs,
      cliArgs.configFile,
      profileName
    );

    // Extract input files (non-flag arguments)
    const inputFiles = this.extractInputFiles(args);

    return {
      inputFiles,
      config,
      profileName,
      showHelp: false,
      showVersion: false,
      createConfig: false,
      validateConfig: false,
      listProfiles: false,
    };
  }

  /**
   * Handles special CLI commands
   */
  static async handleSpecialCommands(options: CLIOptions): Promise<void> {
    if (options.showHelp) {
      console.log(CLIArgumentParser.getHelpText());
      return;
    }

    if (options.showVersion) {
      console.log(`Compact Study Generator v${this.VERSION}`);
      return;
    }

    if (options.createConfig) {
      try {
        const configPath = await ConfigFileManager.createDefaultConfig();
        console.log(`Default configuration file created: ${configPath}`);
      } catch (error) {
        console.error(`Failed to create configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
      return;
    }

    if (options.validateConfig) {
      try {
        const configPath = options.config.configFile || 'compact-study.config.json';
        const validation = await ConfigFileManager.validateConfigFile(configPath);
        
        if (validation.valid) {
          console.log('✓ Configuration file is valid');
        } else {
          console.error('✗ Configuration file validation failed:');
          validation.errors.forEach(error => console.error(`  - ${error}`));
        }

        if (validation.warnings.length > 0) {
          console.warn('Warnings:');
          validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
        }
      } catch (error) {
        console.error(`Failed to validate configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
      return;
    }

    if (options.listProfiles) {
      try {
        const profiles = await ConfigFileManager.listProfiles(options.config.configFile);
        
        if (profiles.length === 0) {
          console.log('No profiles found in configuration file');
        } else {
          console.log('Available profiles:');
          profiles.forEach(profile => console.log(`  - ${profile}`));
        }
      } catch (error) {
        console.error(`Failed to list profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
      return;
    }
  }

  /**
   * Validates input files
   */
  static validateInputFiles(inputFiles: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (inputFiles.length === 0) {
      errors.push('No input files specified');
      return { valid: false, errors, warnings };
    }

    for (const file of inputFiles) {
      if (!fs.existsSync(file)) {
        errors.push(`Input file not found: ${file}`);
        continue;
      }

      const ext = path.extname(file).toLowerCase();
      if (!['.pdf', '.docx', '.doc', '.txt'].includes(ext)) {
        warnings.push(`Unsupported file type: ${file}. Supported types: PDF, DOCX, DOC, TXT`);
      }

      const stats = fs.statSync(file);
      if (stats.size === 0) {
        warnings.push(`Empty file: ${file}`);
      }

      // Check for very large files (>100MB)
      if (stats.size > 100 * 1024 * 1024) {
        warnings.push(`Large file detected: ${file} (${Math.round(stats.size / 1024 / 1024)}MB). Processing may be slow.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Creates output directory if it doesn't exist
   */
  static async ensureOutputDirectory(outputDir: string): Promise<void> {
    try {
      await fs.promises.mkdir(outputDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create output directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates output filename based on configuration
   */
  static generateOutputFilename(inputFiles: string[], config: CLIConfig): string {
    const baseName = inputFiles.length === 1 
      ? path.basename(inputFiles[0], path.extname(inputFiles[0]))
      : 'study_compact';

    const suffix = config.layout === 'compact' ? '_compact' : '_standard';
    
    switch (config.outputFormat) {
      case 'html':
        return `${baseName}${suffix}.html`;
      case 'pdf':
        return `${baseName}${suffix}.pdf`;
      case 'markdown':
        return `${baseName}${suffix}.md`;
      case 'all':
        return baseName + suffix; // Will be used as base for multiple formats
      default:
        return `${baseName}${suffix}.pdf`;
    }
  }

  /**
   * Prints configuration summary
   */
  static printConfigSummary(config: CLIConfig, verbose: boolean = false): void {
    if (!verbose) return;

    console.log('\nConfiguration Summary:');
    console.log(`  Layout: ${config.layout}`);
    console.log(`  Columns: ${config.columns}`);
    console.log(`  Equations: ${config.equations}`);
    console.log(`  Examples: ${config.examples}`);
    console.log(`  Answers: ${config.answers}`);
    console.log(`  Font Size: ${config.fontSize}`);
    console.log(`  Margins: ${config.margins}`);
    console.log(`  Output Format: ${config.outputFormat}`);
    
    if (config.outputDir) {
      console.log(`  Output Directory: ${config.outputDir}`);
    }
    
    console.log('');
  }

  /**
   * Extracts input files from command line arguments
   */
  private static extractInputFiles(args: string[]): string[] {
    const inputFiles: string[] = [];
    const flagsWithValues = new Set([
      '--layout', '--columns', '--equations', '--examples', '--answers',
      '--font-size', '--margins', '--output-format', '--config', '--output-dir',
      '--profile'
    ]);
    const flagsWithoutValues = new Set([
      '--verbose', '--help', '--version', '--create-config',
      '--validate-config', '--list-profiles', '-h', '-v'
    ]);

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      // Skip flags with values
      if (flagsWithValues.has(arg)) {
        // Skip the flag and its value
        i++; // Skip the next argument (the value)
        continue;
      }

      // Skip flags without values
      if (flagsWithoutValues.has(arg)) {
        continue;
      }

      // If it's not a flag and doesn't start with --, treat it as an input file
      if (!arg.startsWith('--') && !arg.startsWith('-')) {
        inputFiles.push(arg);
      }
    }

    return inputFiles;
  }
}

// Extended CLI argument parser with profile support
export class ExtendedCLIArgumentParser extends CLIArgumentParser {
  /**
   * Enhanced parse method with profile support
   */
  static parse(args: string[]): Partial<CLIConfig> & { profileName?: string } {
    const config = super.parse(args);
    
    // Extract profile name
    const profileIndex = args.indexOf('--profile');
    if (profileIndex !== -1 && args[profileIndex + 1]) {
      return {
        ...config,
        profileName: args[profileIndex + 1],
      };
    }

    return config;
  }

  /**
   * Enhanced help text with profile support
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
  --profile <name>                      Use configuration profile
  --output-dir <directory>              Output directory
  --verbose                             Enable verbose logging

Configuration Commands:
  --create-config                       Create default configuration file
  --validate-config                     Validate configuration file
  --list-profiles                       List available configuration profiles

General Commands:
  --help, -h                            Show this help message
  --version, -v                         Show version information

Examples:
  compact-study --layout compact --columns 2 probability.pdf relations.pdf
  compact-study --config my-config.json --output-format all input.pdf
  compact-study --profile ultra-compact --output-dir ./output *.pdf
  compact-study --create-config
  compact-study --list-profiles

Configuration File:
  The CLI looks for 'compact-study.config.json' in the current directory or parent directories.
  Use --create-config to generate a default configuration file with example profiles.
`;
  }
}
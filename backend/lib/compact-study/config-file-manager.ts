// Configuration File Manager for Compact Study Generator

import * as fs from 'fs';
import * as path from 'path';
import { CLIConfig, ConfigFile, ValidationResult, ConfigValidator } from './cli-config';

export class ConfigFileManager {
  private static readonly DEFAULT_CONFIG_NAME = 'compact-study.config.json';
  private static readonly CONFIG_VERSION = '1.0.0';

  /**
   * Loads configuration from file
   */
  static async loadConfig(configPath?: string): Promise<Partial<CLIConfig>> {
    const filePath = configPath || this.findDefaultConfigFile();
    
    if (!filePath || !fs.existsSync(filePath)) {
      return {};
    }

    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      const configFile: ConfigFile = JSON.parse(fileContent);
      
      // Validate config file structure
      if (!this.isValidConfigFile(configFile)) {
        throw new Error('Invalid configuration file structure');
      }

      return configFile.defaults || {};
    } catch (error) {
      throw new Error(`Failed to load configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Saves configuration to file
   */
  static async saveConfig(config: CLIConfig, configPath?: string): Promise<void> {
    const filePath = configPath || path.join(process.cwd(), this.DEFAULT_CONFIG_NAME);
    
    const configFile: ConfigFile = {
      defaults: config,
      profiles: {},
      metadata: {
        version: this.CONFIG_VERSION,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    };

    try {
      await fs.promises.writeFile(filePath, JSON.stringify(configFile, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a default configuration file
   */
  static async createDefaultConfig(configPath?: string): Promise<string> {
    const filePath = configPath || path.join(process.cwd(), this.DEFAULT_CONFIG_NAME);
    
    const defaultConfigFile: ConfigFile = {
      defaults: {
        layout: 'compact',
        columns: 2,
        equations: 'all',
        examples: 'full',
        answers: 'inline',
        fontSize: '10pt',
        margins: 'narrow',
        outputFormat: 'pdf',
      },
      profiles: {
        'ultra-compact': {
          layout: 'compact',
          columns: 3,
          fontSize: '8pt',
          margins: 'narrow',
          equations: 'key',
          examples: 'summary',
        },
        'readable': {
          layout: 'standard',
          columns: 2,
          fontSize: '11pt',
          margins: 'normal',
          equations: 'all',
          examples: 'full',
        },
        'print-friendly': {
          layout: 'compact',
          columns: 2,
          fontSize: '10pt',
          margins: 'narrow',
          outputFormat: 'pdf',
          equations: 'all',
          examples: 'full',
        },
      },
      metadata: {
        version: this.CONFIG_VERSION,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    };

    try {
      await fs.promises.writeFile(filePath, JSON.stringify(defaultConfigFile, null, 2), 'utf-8');
      return filePath;
    } catch (error) {
      throw new Error(`Failed to create default configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Loads a specific profile from configuration file
   */
  static async loadProfile(profileName: string, configPath?: string): Promise<Partial<CLIConfig>> {
    const filePath = configPath || this.findDefaultConfigFile();
    
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Configuration file not found');
    }

    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      const configFile: ConfigFile = JSON.parse(fileContent);
      
      if (!configFile.profiles || !configFile.profiles[profileName]) {
        throw new Error(`Profile '${profileName}' not found in configuration file`);
      }

      // Merge profile with defaults
      return {
        ...configFile.defaults,
        ...configFile.profiles[profileName],
      };
    } catch (error) {
      throw new Error(`Failed to load profile '${profileName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Saves a profile to configuration file
   */
  static async saveProfile(profileName: string, config: Partial<CLIConfig>, configPath?: string): Promise<void> {
    const filePath = configPath || this.findDefaultConfigFile();
    
    if (!filePath || !fs.existsSync(filePath)) {
      // Create new config file if it doesn't exist
      await this.createDefaultConfig(filePath);
    }

    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      const configFile: ConfigFile = JSON.parse(fileContent);
      
      // Update profile
      configFile.profiles = configFile.profiles || {};
      configFile.profiles[profileName] = config;
      configFile.metadata.lastModified = new Date().toISOString();

      await fs.promises.writeFile(filePath, JSON.stringify(configFile, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save profile '${profileName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lists available profiles from configuration file
   */
  static async listProfiles(configPath?: string): Promise<string[]> {
    const filePath = configPath || this.findDefaultConfigFile();
    
    if (!filePath || !fs.existsSync(filePath)) {
      return [];
    }

    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      const configFile: ConfigFile = JSON.parse(fileContent);
      
      return Object.keys(configFile.profiles || {});
    } catch (error) {
      return [];
    }
  }

  /**
   * Merges CLI arguments with configuration file
   */
  static async mergeWithConfigFile(
    cliArgs: Partial<CLIConfig>,
    configPath?: string,
    profileName?: string
  ): Promise<CLIConfig> {
    let fileConfig: Partial<CLIConfig> = {};

    try {
      if (profileName) {
        fileConfig = await this.loadProfile(profileName, configPath);
      } else {
        fileConfig = await this.loadConfig(configPath);
      }
    } catch (error) {
      // If config file loading fails, continue with CLI args only
      console.warn(`Warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // CLI arguments take precedence over config file
    const mergedConfig = {
      ...fileConfig,
      ...cliArgs,
    };

    // Validate and apply defaults
    const validation = ConfigValidator.validate(mergedConfig);
    
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    return validation.config!;
  }

  /**
   * Finds default configuration file in current directory or parent directories
   */
  private static findDefaultConfigFile(): string | null {
    let currentDir = process.cwd();
    const maxDepth = 5; // Limit search depth
    let depth = 0;

    while (depth < maxDepth) {
      const configPath = path.join(currentDir, this.DEFAULT_CONFIG_NAME);
      
      if (fs.existsSync(configPath)) {
        return configPath;
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        // Reached root directory
        break;
      }

      currentDir = parentDir;
      depth++;
    }

    return null;
  }

  /**
   * Validates configuration file structure
   */
  private static isValidConfigFile(configFile: any): configFile is ConfigFile {
    return (
      typeof configFile === 'object' &&
      configFile !== null &&
      typeof configFile.metadata === 'object' &&
      typeof configFile.metadata.version === 'string' &&
      (configFile.defaults === undefined || typeof configFile.defaults === 'object') &&
      (configFile.profiles === undefined || typeof configFile.profiles === 'object')
    );
  }

  /**
   * Validates configuration file compatibility
   */
  static async validateConfigFile(configPath: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!fs.existsSync(configPath)) {
        errors.push('Configuration file does not exist');
        return { valid: false, errors, warnings };
      }

      const fileContent = await fs.promises.readFile(configPath, 'utf-8');
      const configFile: ConfigFile = JSON.parse(fileContent);

      if (!this.isValidConfigFile(configFile)) {
        errors.push('Invalid configuration file structure');
        return { valid: false, errors, warnings };
      }

      // Check version compatibility
      if (configFile.metadata.version !== this.CONFIG_VERSION) {
        warnings.push(`Configuration file version (${configFile.metadata.version}) differs from current version (${this.CONFIG_VERSION})`);
      }

      // Validate defaults
      if (configFile.defaults) {
        const defaultsValidation = ConfigValidator.validate(configFile.defaults);
        errors.push(...defaultsValidation.errors);
        warnings.push(...defaultsValidation.warnings);
      }

      // Validate profiles
      if (configFile.profiles) {
        for (const [profileName, profileConfig] of Object.entries(configFile.profiles)) {
          const profileValidation = ConfigValidator.validate(profileConfig);
          if (!profileValidation.valid) {
            errors.push(`Profile '${profileName}': ${profileValidation.errors.join(', ')}`);
          }
          warnings.push(...profileValidation.warnings.map(w => `Profile '${profileName}': ${w}`));
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Failed to validate configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, errors, warnings };
    }
  }
}